import argon2 from 'argon2';
import { withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { computeBill, tierForUsers, TIERS } from '../../config/plans.js';
import { genTempPassword } from '../auth/credentials.js';
import { computeProrationCredit } from '../../shared/proration.js';
import { invalidateOrgAccessCache } from '../../middlewares/orgAccessGate.js';
import { logger } from '../../config/logger.js';
import { isOrgAccessBlocked } from '../../shared/orgAccess.js';
import { invalidateBannedWordsCache } from '../../shared/chatModeration.js';
import { systemHealth } from '../health/health.service.js';
import { countRecentUnresolved } from '../health/errorLog.service.js';
import { queuesHealth } from '../health/queueHealth.service.js';
import { storageHealth } from '../health/storageHealth.service.js';
import { linkPaymentToInvoice } from '../platformBilling/platformBilling.service.js';
import * as repo from './main.repository.js';

// Бесплатные тумблеры — не в каталоге platform_addon_prices, поэтому и не
// платные, и без про-рейта при отключении (просто открывают/закрывают вход).
const FREE_FEATURE_KEYS = new Set(['student_panel', 'parent_panel']);

/**
 * Онбординг партнёра: создаём организацию + её CEO (бывш. Super Admin) одной транзакцией.
 * CEO получает временный пароль (показывается Main Admin'у один раз;
 * дальше партнёр меняет через forgot-password по email).
 */
export async function onboardPartner({ organizationName, domain, admin, leadId }) {
  return withTransaction(async (client) => {
    if (domain && (await repo.findOrgByDomain(domain, client))) {
      throw new AppError(409, 'Domain already taken');
    }

    // план pro/max убран: цена считается по общему числу активных аккаунтов, не по плану
    const org = await repo.insertOrganization(
      { name: organizationName, domain },
      client,
    );

    const tempPassword = genTempPassword();
    const passwordHash = await argon2.hash(tempPassword, { type: argon2.argon2id });

    let ceo;
    try {
      ceo = await repo.insertCeo(
        { orgId: org.id, ...admin, passwordHash },
        client,
      );
    } catch (err) {
      if (err.code === '23505') throw new AppError(409, 'Email already in use');
      throw err;
    }

    await repo.setOrgOwner(org.id, ceo.id, client);

    // если онбордим из заявки — помечаем её onboarded и связываем с орг
    if (leadId) await repo.markLeadOnboarded(leadId, org.id, client);

    return {
      organization: org,
      ceo: {
        id: ceo.id,
        firstName: ceo.first_name,
        lastName: ceo.last_name,
        email: ceo.email,
      },
      // показать один раз — Main Admin передаёт партнёру
      tempPassword,
    };
  });
}

/**
 * Что владелец платформы знает о партнёре.
 *
 * Граница простая: нам видно то, из чего считается НАШ счёт, и не видно то,
 * как партнёр зарабатывает. Общее число пользователей (ученики+родители+
 * сотрудники) — основание тарифа (пересчитано с "только учеников" на "все
 * пользователи" 11.08.2026, по просьбе Karis), поэтому оно здесь. Оборот,
 * расходы и прибыль партнёра убраны: это деньги чужого бизнеса, и платформе
 * они не нужны ни для биллинга, ни для поддержки.
 */
function decoratePartner(row) {
  const students = Number(row.students);
  const parents = Number(row.parents);
  const staff = Number(row.staff);
  const totalUsers = students + parents + staff;
  const branches = Number(row.branches);
  const tier = tierForUsers(totalUsers);
  return {
    id: row.id,
    name: row.name,
    plan: row.plan,
    domain: row.domain,
    status: row.status,
    accessUntil: row.access_until,
    createdAt: row.created_at,
    branches,
    students,
    parents,
    staff,
    totalUsers,
    tier: tier.label, // тариф по общему числу пользователей (Free/Start/…)
    monthlyBill: computeBill({ users: totalUsers }), // сколько партнёр платит нам (сумы), филиалы не влияют
  };
}

// ---------- цены платформы ----------

export function getPricing() {
  // Тарифы теперь в config/plans.js (TIERS). Редактирование через БД — v2.
  return { tiers: TIERS, currency: 'UZS' };
}

export async function updatePricing() {
  // Цены зашиты в config (TIERS) — правка через API отключена (v2: сделать DB-editable).
  return getPricing();
}

export async function listPartners() {
  const rows = await repo.listPartners();
  return rows.map((row) => decoratePartner(row));
}

/** Платформенный дашборд: наш доход = сумма счетов партнёров. */
export async function platformDashboard() {
  const partners = await listPartners();
  // сводных partnersRevenue/Expenses/Profit здесь больше нет — см. decoratePartner
  const totals = partners.reduce(
    (acc, p) => {
      acc.students += p.students;
      acc.parents += p.parents;
      acc.staff += p.staff;
      acc.totalUsers += p.totalUsers;
      acc.branches += p.branches;
      acc.ourMonthlyIncome += p.monthlyBill;
      return acc;
    },
    {
      partners: partners.length,
      students: 0,
      parents: 0,
      staff: 0,
      totalUsers: 0,
      branches: 0,
      ourMonthlyIncome: 0,
    },
  );
  totals.currency = 'UZS';
  return { totals, pricing: getPricing(), partners };
}

/**
 * Выручка платформы (наш доход). Наш доход = сумма месячных счетов партнёров
 * (computeBill по числу учеников). Отдельный от дашборда endpoint, ориентированный
 * на деньги. Только чтение денежных данных — ничего не пишет.
 */
export async function platformRevenue() {
  const partners = await listPartners();
  const totals = partners.reduce(
    (acc, p) => {
      acc.ourMonthlyIncome += p.monthlyBill;
      acc.students += p.students;
      acc.branches += p.branches;
      if (p.status === 'active') acc.activePartners += 1;
      return acc;
    },
    {
      partners: partners.length,
      activePartners: 0,
      students: 0,
      branches: 0,
      ourMonthlyIncome: 0,
    },
  );
  totals.currency = 'UZS';
  return {
    totals,
    partners: partners.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      tier: p.tier,
      students: p.students,
      branches: p.branches,
      monthlyBill: p.monthlyBill,
      // createdAt нужен карточке партнёра («активен N дней»). Без него фронт
      // считал дни от Invalid Date и печатал «Активен NaN дн.» — поймано
      // при живой проверке 2026-07-26, когда Revenue.jsx перевели с дашборда сюда.
      createdAt: p.createdAt,
    })),
    pricing: getPricing(),
  };
}

// ---------- управление партнёром ----------

export async function setPartnerStatus(id, status, reason = null, auditBase = null) {
  const org = await withTransaction(async (client) => {
    const before = await repo.findOrgById(id, client);
    if (!before) throw new AppError(404, 'Partner not found');
    const updated = await repo.setOrgStatus(id, status, client);
    if (auditBase) await repo.insertPlatformAudit({ ...auditBase, orgId: id, action: 'partner.status_changed', entityType: 'organization', entityId: id, entityLabel: updated.name, before: { status: before.status, accessUntil: before.access_until }, after: { status: updated.status }, reason }, client);
    return updated;
  });
  await invalidateOrgAccessCache(id); // 'frozen' — независимый override гейта доступа
  return { id: org.id, name: org.name, status: org.status };
}

// ---------- каталог платных фич ----------

export async function listAddonPrices() {
  return repo.listAddonPrices();
}

export async function createAddonFeature({ label, price }, actorId) {
  return repo.insertAddonPrice({ label, price, createdBy: actorId });
}

export async function updateAddonFeature(key, { label, price }) {
  const row = await repo.updateAddonPrice(key, { label, price });
  if (!row) throw new AppError(404, 'Feature not found');
  return row;
}

export async function deactivateAddonFeature(key) {
  const row = await repo.deactivateAddonPrice(key);
  if (!row) throw new AppError(404, 'Feature not found');
  return row;
}

// ---------- фичи партнёра (тумблеры + про-рейт при досрочном отключении) ----------

export async function getPartnerFeatures(orgId) {
  const [catalog, flags] = await Promise.all([
    repo.listAddonPrices(),
    repo.getOrgFeatureFlags(orgId),
  ]);
  const flagByKey = new Map(flags.map((f) => [f.feature_key, f]));
  const paid = catalog
    .filter((c) => c.is_active)
    .map((c) => ({
      key: c.feature_key,
      label: c.label,
      price: c.price,
      enabled: flagByKey.get(c.feature_key)?.enabled ?? false,
    }));
  const free = [...FREE_FEATURE_KEYS].map((key) => ({
    key,
    enabled: flagByKey.get(key)?.enabled ?? false,
  }));
  return { paid, free };
}

/**
 * Включить/выключить фичу партнёру. Платная (есть в каталоге) + выключаем +
 * уже была включена → считаем про-рейт-кредит за неиспользованные дни
 * текущего месяца и пишем его в журнал (виден партнёру в его биллинге).
 * Бесплатные (student_panel/parent_panel) — без про-рейта, просто тумблер.
 */
export async function setFeatureFlag(orgId, key, enabled, actorId) {
  const isFree = FREE_FEATURE_KEYS.has(key);
  // Независимые запросы (разные таблицы, разные условия) — параллельно,
  // а не одно за другим: на Neon один такой круговой рейс ~150-250мс,
  // последовательно это удваивалось без всякой причины.
  const [addon, current] = await Promise.all([
    isFree ? null : repo.findAddonPrice(key),
    repo.getOrgFeatureFlag(orgId, key),
  ]);
  if (!isFree && !addon) throw new AppError(404, 'Feature not found in catalog');

  if (!enabled && addon && current?.enabled) {
    const credit = computeProrationCredit({ price: addon.price, enabledAt: current.enabled_at });
    if (credit.amount > 0) {
      await repo.insertOrgPayment({
        orgId,
        type: 'addon_credit',
        amount: credit.amount,
        featureKey: key,
        note: `Про-рейт-кредит за отключение "${addon.label}" (${credit.daysRemaining}/${credit.totalDays} дн.)`,
        createdBy: actorId,
      });
    }
  }

  // invalidateOrgAccessCache здесь НЕ нужен: тот кэш (org:access:<orgId>)
  // хранит только status/access_until (см. orgAccessGate.js) — флаги фич
  // читаются отдельным прямым запросом к БД (auth.service.js:33,
  // repo.findOrgFeatureFlag) и через этот кэш вообще не проходят. Вызов
  // был лишним Redis round-trip'ом на каждый клик тумблера — при
  // деградировавшем Upstash (11.08.2026) это и ощущалось как "долго думает".
  const flag = await repo.upsertOrgFeatureFlag(orgId, key, enabled, actorId);
  return flag;
}

// ---------- заявки CEO на подключение/отключение фичи ----------

export async function listFeatureRequests(status) {
  return repo.listFeatureRequests(status);
}

/** Approve — тот же путь, что и прямое включение/отключение Main Admin'ом
 * (включая про-рейт-кредит при approve на remove), только с привязкой к
 * заявке. Reject — просто закрывает заявку, ничего не переключает. */
export async function decideFeatureRequest(id, decision, actorId) {
  const request = await repo.findFeatureRequest(id);
  if (!request) throw new AppError(404, 'Request not found');
  if (request.status !== 'pending') throw new AppError(409, 'Request already reviewed');

  if (decision === 'approve') {
    await setFeatureFlag(request.organization_id, request.feature_key, request.type === 'add', actorId);
  }

  const status = decision === 'approve' ? 'approved' : 'rejected';
  return repo.reviewFeatureRequest(id, status, actorId);
}

// ---------- биллинг: оплата / бонус / журнал ----------

/** Последний календарный день периода 'YYYY-MM'. */
function endOfPeriod(periodCovered) {
  const [year, month] = periodCovered.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)); // day=0 следующего месяца = последний день этого
}

/**
 * Main Admin вручную фиксирует, что партнёр заплатил (наличные/карта/перевод,
 * вне системы) за конкретный месяц ('YYYY-MM'). access_until сдвигается до
 * конца этого месяца — не накопительно поверх текущего значения, в отличие
 * от бонуса: оплата это "плачу конкретно за такой-то месяц", а не "продли
 * ещё на N". Если период раньше уже оплаченного — access_until не двигаем
 * назад (может быть доплата задним числом за про-рейт первого периода).
 */
export async function recordPayment(orgId, { amount, method, periodCovered, note }, actorId, auditBase = null) {
  const payment = await withTransaction(async (client) => {
    const org = await repo.findOrgById(orgId, client);
    if (!org) throw new AppError(404, 'Partner not found');
    const row = await repo.insertOrgPayment({ orgId, type: 'payment', amount, method, periodCovered, note, createdBy: actorId }, client);
    const newUntil = endOfPeriod(periodCovered);
    if (!org.access_until || newUntil > new Date(org.access_until)) {
      await repo.setAccessUntil(orgId, newUntil.toISOString().slice(0, 10), client);
    }
    // Закрывает счёт за этот период (создаёт по снимку, если ещё не
    // выставлен — например, оплата вперёд до генерации) — в той же
    // транзакции, платёж и счёт меняются атомарно (Karis 26.08.2026).
    const invoice = await linkPaymentToInvoice({ organizationId: orgId, periodCovered, amount, paymentId: row.id }, client);
    // row уже вставлен до линковки — RETURNING не видел invoice_id;
    // проставляем на объекте, иначе вызывающий получит устаревший null,
    // хотя в базе связь уже стоит.
    if (invoice) row.invoice_id = invoice.id;
    if (auditBase) await repo.insertPlatformAudit({ ...auditBase, orgId, action: 'partner.payment_recorded', entityType: 'org_payment', entityId: row.id, entityLabel: `${row.amount} UZS · ${row.period_covered ?? '—'}`, after: { amount: row.amount, method: row.method, periodCovered: row.period_covered }, reason: note || null }, client);
    return row;
  });
  await invalidateOrgAccessCache(orgId);
  return payment;
}

export async function grantBonus(orgId, months, actorId, note = null, auditBase = null) {
  const accessUntil = await withTransaction(async (client) => {
    const org = await repo.findOrgById(orgId, client);
    if (!org) throw new AppError(404, 'Partner not found');
    await repo.insertOrgPayment({ orgId, type: 'bonus', monthsGranted: months, note: note || `Бонус ${months} мес.`, createdBy: actorId }, client);
    const until = await repo.extendAccessUntil(orgId, months, client);
    if (auditBase) await repo.insertPlatformAudit({ ...auditBase, orgId, action: 'partner.bonus_granted', entityType: 'organization', entityId: orgId, entityLabel: `+${months} мес.`, before: { accessUntil: org.access_until }, after: { monthsGranted: months, accessUntil: until }, reason: note || null }, client);
    return until;
  });
  await invalidateOrgAccessCache(orgId);
  return { accessUntil };
}

export async function listOrgLedger(orgId) {
  return repo.listOrgPayments(orgId);
}

// ---------- собственные расходы платформы + P&L ----------

export async function listExpenses() {
  return repo.listExpenses();
}

export async function createExpense({ label, amount, category, expenseDate }, actorId, auditBase = null) {
  return withTransaction(async (client) => {
    const expense = await repo.insertExpense({ label, amount, category, expenseDate, createdBy: actorId }, client);
    if (auditBase) await repo.insertPlatformAudit({ ...auditBase, action: 'platform_expense.created', entityType: 'platform_expense', entityId: expense.id, entityLabel: expense.label, after: { label: expense.label, amount: expense.amount, category: expense.category } }, client);
    return expense;
  });
}

export async function deleteExpense(id, reason = null, auditBase = null) {
  return withTransaction(async (client) => {
    const row = await repo.softDeleteExpense(id, client);
    if (!row) throw new AppError(404, 'Expense not found');
    if (auditBase) await repo.insertPlatformAudit({ ...auditBase, action: 'platform_expense.deleted', entityType: 'platform_expense', entityId: id, entityLabel: row.label, before: { label: row.label, amount: row.amount, category: row.category }, reason }, client);
    return row;
  });
}

/**
 * Темы с видео-файлом на Storj + суммарный текущий расход. costPerViewUsd —
 * цена ОДНОГО просмотра, не входит в totalStorageCostUsdPerMonth (это только
 * хранение) — сколько раз посмотрят, заранее не известно (см. pricing.js).
 */
export async function videoStorageCosts() {
  const items = await repo.listVideoStorageCosts();
  const totalStorageCostUsdPerMonth = Number(
    items.reduce((sum, r) => sum + Number(r.video_storage_cost_usd ?? 0), 0).toFixed(4),
  );
  const totalSizeBytes = items.reduce((sum, r) => sum + Number(r.video_size_bytes ?? 0), 0);
  return { items, totals: { totalStorageCostUsdPerMonth, totalSizeBytes, count: items.length } };
}

function currentMonthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function previousMonthKey(date = new Date()) {
  const prev = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
  return currentMonthKey(prev);
}

/** Баланс платформы = вся реальная выручка (payment) минус все расходы;
 * может уйти в минус, если расходов записано больше, чем оплат партнёров. */
export async function platformFinance() {
  const [revenueRows, expenseRows, totalRev, totalExp] = await Promise.all([
    repo.monthlyRevenueTrend(),
    repo.monthlyExpenseTrend(),
    repo.totalRevenue(),
    repo.totalExpenses(),
  ]);

  const revenueByMonth = new Map(revenueRows.map((r) => [r.month, r.revenue]));
  const expenseByMonth = new Map(expenseRows.map((r) => [r.month, r.expense]));
  const months = [...new Set([...revenueByMonth.keys(), ...expenseByMonth.keys()])].sort();
  const trend = months.map((month) => ({
    month,
    revenue: revenueByMonth.get(month) ?? 0,
    expense: expenseByMonth.get(month) ?? 0,
    net: (revenueByMonth.get(month) ?? 0) - (expenseByMonth.get(month) ?? 0),
  }));

  const thisMonth = currentMonthKey();
  const lastMonth = previousMonthKey();
  const thisMonthNet = trend.find((t) => t.month === thisMonth) ?? { revenue: 0, expense: 0, net: 0 };
  const lastMonthNet = trend.find((t) => t.month === lastMonth) ?? { revenue: 0, expense: 0, net: 0 };

  return {
    balance: totalRev - totalExp,
    totalRevenue: totalRev,
    totalExpenses: totalExp,
    thisMonth: thisMonthNet,
    lastMonth: lastMonthNet,
    trend,
    currency: 'UZS',
  };
}

// ---------- заявки с лендинга (leads) ----------

function mapLead(l) {
  return {
    id: l.id,
    name: l.name,
    phone: l.phone,
    centerName: l.center_name,
    centerSize: l.center_size,
    message: l.message,
    status: l.status,
    notes: l.notes,
    organizationId: l.organization_id,
    createdAt: l.created_at,
  };
}

/** Публичный приём заявки с лендинга. */
export async function submitLead(data) {
  const lead = await repo.insertLead(data);
  return { id: lead.id }; // наружу отдаём минимум (без утечки внутренних полей)
}

export async function listLeads(status) {
  const rows = await repo.listLeads(status);
  return rows.map(mapLead);
}

export async function updateLead(id, fields) {
  const lead = await repo.updateLead(id, fields);
  if (!lead) throw new AppError(404, 'Lead not found');
  return mapLead(lead);
}

// ---------- объявления платформы (Main Admin → «Анонсы») ----------

function mapAnnouncement(a) {
  return {
    id: a.id,
    title: a.title,
    body: a.body,
    targetType: a.target_type,
    recipientCount: Number(a.recipient_count),
    readCount: 0, // пометок «прочитано» в системе нет — то же, что в super
    senderName: a.sender_name ?? null,
    readers: [],
    nonReaders: [],
    createdAt: a.created_at,
  };
}

export async function listAnnouncements() {
  const items = (await repo.listAnnouncements()).map(mapAnnouncement);
  return { items, announcements: items, total: items.length };
}

/**
 * Адресаты — партнёры и их владельцы, то есть сотрудники. Привязки к Telegram
 * у сотрудников нет (`telegram_accounts` заполняется только для student/parent),
 * поэтому в очередь уведомлений НЕ кладём: воркер всё равно не нашёл бы chat_id
 * и задание молча пропало бы. Объявление живёт как запись в панели.
 */
export async function createAnnouncement(senderId, { title, body, targetType, organizationIds }) {
  const recipientCount = await repo.countAnnouncementRecipients(targetType, organizationIds);
  const row = await repo.insertAnnouncement({ senderId, title, body, targetType, recipientCount, organizationIds });
  return mapAnnouncement(row);
}

export async function deleteAnnouncement(id) {
  const row = await repo.softDeleteAnnouncement(id);
  if (!row) throw new AppError(404, 'Announcement not found');
  return { id: row.id };
}

// ---------- профиль main_admin ----------

function mapProfile(u) {
  return {
    id: u.id,
    firstName: u.first_name,
    lastName: u.last_name,
    email: u.email,
    phone: u.phone,
    role: u.role,
  };
}

export async function getProfile(userId) {
  const user = await repo.findUserById(userId);
  if (!user) throw new AppError(404, 'User not found');
  return mapProfile(user);
}

export async function updateProfile(userId, fields) {
  if (fields.email !== undefined && (await repo.emailTakenByOther(fields.email, userId))) {
    throw new AppError(409, 'Email already in use');
  }
  if (fields.phone !== undefined && (await repo.phoneTakenByOther(fields.phone, userId))) {
    throw new AppError(409, 'Phone already in use');
  }
  const user = await repo.updateProfile(userId, fields);
  if (!user) throw new AppError(404, 'User not found');
  return mapProfile(user);
}

/* Обзор штрафов по всем партнёрам убран намеренно.
 *
 * Он показывал, кого из сотрудников партнёра наказали, за что, на какую сумму
 * и кто выписал — то есть внутреннюю кадровую историю чужой организации.
 * Платформе это не нужно: по матрице CAN_ISSUE (discipline.service.js)
 * main_admin не выписывает штрафы никому, а дисциплина сотрудников — дело
 * CEO филиала. Соответствующий экран живёт в панели CEO,
 * где есть и просмотр, и выписывание: GET/POST /api/super/penalties. */

// ---------- Audit Log платформы (Karis 25.08.2026) ----------

/**
 * Запись в журнал — побочный эффект: её сбой НЕ должен ронять саму операцию
 * (тот же принцип, что в super-модуле). Партнёра заморозили, а журнал не
 * записался — это плохо, но откатывать заморозку из-за этого хуже.
 */
export async function recordPlatformAudit(entry) {
  try {
    return await repo.insertPlatformAudit(entry);
  } catch (err) {
    logger.error({ err, action: entry.action }, 'platform audit: не удалось записать');
    return null;
  }
}

export async function listPlatformAudit(query) {
  const limit = query.limit;
  const offset = query.offset;
  const rows = await repo.listPlatformAudit({
    scope: query.scope ?? 'platform',
    action: query.action || null,
    actorId: query.actorId || null,
    organizationId: query.organizationId || null,
    search: query.search || null,
    limit,
    offset,
  });
  // count(*) OVER() едет в каждой строке — вынимаем его один раз и убираем из выдачи
  let total = rows[0]?.total_count ?? 0;
  if (rows.length === 0 && offset > 0) {
    const first = await repo.listPlatformAudit({
      scope: query.scope, action: query.action || null, actorId: query.actorId || null,
      organizationId: query.organizationId || null, search: query.search || null, limit: 1, offset: 0,
    });
    total = first[0]?.total_count ?? 0;
  }
  const items = rows.map(({ total_count, ...r }) => ({
    id: r.id,
    organizationId: r.organization_id,
    organizationName: r.organization_name,
    actorId: r.actor_id,
    actorName: r.actor_name,
    actorRole: r.actor_role,
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    entityLabel: r.entity_label,
    success: r.success,
    ip: r.ip,
    userAgent: r.user_agent,
    before: r.before_data,
    after: r.after_data,
    reason: r.reason,
    meta: r.meta,
    createdAt: r.created_at,
  }));
  return { items, total, limit, offset, actions: await repo.listAuditActions(query.scope ?? 'platform') };
}

/**
 * Снимок партнёра ДО изменения — для поля `before` в журнале.
 * Отдельная функция, а не переиспользование listPartners(): там тяжёлый
 * запрос со счётчиками по всем организациям, а здесь нужна одна строка.
 * Партнёра могли уже удалить — тогда null, аудит просто без `before`.
 */
export async function getPartnerSnapshot(id) {
  const org = await repo.findOrgById(id);
  return org ? { status: org.status, accessUntil: org.access_until } : null;
}

// ---------- Action Center (Karis 25.08.2026) ----------

/** Через сколько дней «скоро истечёт» становится поводом для предупреждения. */
const ACCESS_EXPIRING_DAYS = 7;
/** Сколько дней тишины считаем тревожным сигналом (партнёр перестал заходить). */
const INACTIVE_DAYS = 14;
/** Со скольких дней необработанная заявка/запрос становится просроченной. */
const STALE_LEAD_DAYS = 3;
const STALE_REQUEST_DAYS = 2;

const daysBetween = (a, b) => Math.floor((a - b) / 86_400_000);

/**
 * Центр проблем: что требует вмешательства владельца платформы ПРЯМО СЕЙЧАС.
 *
 * Всё считается из уже существующих данных — новых таблиц не заводим.
 * Блокировку доступа НЕ пересчитываем своей формулой, а зовём
 * isOrgAccessBlocked из shared/orgAccess.js: это та же функция, по которой
 * партнёра реально не пускают на вход. Иначе панель показывала бы одно, а
 * система вела себя иначе.
 *
 * Каждое предупреждение несёт href — куда идти чинить, иначе это не центр
 * действий, а просто список жалоб.
 */
const SERVICE_LABEL = { database: 'База данных', redis: 'Redis', storage: 'Файловое хранилище' };

export async function actionCenter() {
  const now = new Date();
  const [orgs, leads, requests, health, unresolvedErrors, queues, flaggedMessages, bruteForce, storage] = await Promise.all([
    repo.actionCenterOrgSignals(),
    repo.actionCenterLeads(),
    repo.actionCenterFeatureRequests(),
    // Инфраструктура — намеренно не await'ится отдельно и не роняет весь
    // Центр контроля, если сама проверка вдруг упадёт: тогда сигнала просто
    // не будет в этой сборке, а не 500 на всю страницу (Karis 26.08.2026).
    systemHealth().catch((err) => { logger.error({ err }, 'action-center: system health check failed'); return null; }),
    countRecentUnresolved().catch((err) => { logger.error({ err }, 'action-center: error log count failed'); return 0; }),
    queuesHealth().catch((err) => { logger.error({ err }, 'action-center: queue health check failed'); return null; }),
    repo.countRecentFlaggedMessages().catch((err) => { logger.error({ err }, 'action-center: flagged messages count failed'); return 0; }),
    repo.detectBruteForceLogins().catch((err) => { logger.error({ err }, 'action-center: brute force check failed'); return []; }),
    storageHealth().catch((err) => { logger.error({ err }, 'action-center: storage health check failed'); return null; }),
  ]);

  const alerts = [];

  // Инфраструктура — единственный тип сигнала не про партнёров, а про саму
  // платформу: реальный сбой БД/Redis/хранилища важнее любого предупреждения
  // про партнёра, поэтому идёт первым и всегда critical.
  if (health && !health.ok) {
    for (const [key, check] of Object.entries(health.services)) {
      if (check.ok) continue;
      alerts.push({
        type: 'system_degraded',
        severity: 'critical',
        title: `${SERVICE_LABEL[key] ?? key} недоступен`,
        description: check.error ?? 'Проверка не прошла',
        entityType: 'system',
        entityId: key,
        entityLabel: SERVICE_LABEL[key] ?? key,
        href: '/system-health',
        meta: { latencyMs: check.latencyMs },
      });
    }
  }

  for (const o of orgs) {
    const access = isOrgAccessBlocked(o, now);

    if (access.blocked && access.reason !== 'frozen') {
      alerts.push({
        type: 'partner_access_blocked',
        severity: 'critical',
        title: 'Партнёр заблокирован',
        description: access.reason === 'no_payment'
          ? 'Ни одной оплаты — доступ закрыт с момента создания'
          : 'Оплата просрочена, грейс-период закончился — партнёр не может войти',
        entityType: 'organization',
        entityId: o.id,
        entityLabel: o.name,
        href: `/organizations/${o.id}`,
        meta: { accessUntil: o.access_until, students: o.students, reason: access.reason },
      });
    } else if (access.reason === 'grace_period') {
      alerts.push({
        type: 'partner_grace_period',
        severity: 'critical',
        title: 'Грейс-период заканчивается',
        description: 'Срок оплаты прошёл, партнёр работает на отсрочке — после неё вход закроется',
        entityType: 'organization',
        entityId: o.id,
        entityLabel: o.name,
        href: `/organizations/${o.id}`,
        meta: { accessUntil: o.access_until, students: o.students },
      });
    } else if (o.access_until) {
      const left = daysBetween(new Date(o.access_until), now);
      if (left >= 0 && left <= ACCESS_EXPIRING_DAYS) {
        alerts.push({
          type: 'partner_access_expiring',
          severity: 'warning',
          title: `Доступ истекает через ${left} дн.`,
          description: 'Оплата не зафиксирована — стоит напомнить партнёру',
          entityType: 'organization',
          entityId: o.id,
          entityLabel: o.name,
          href: `/organizations/${o.id}`,
          meta: { accessUntil: o.access_until, daysLeft: left, students: o.students },
        });
      }
    }

    if (o.status === 'frozen') {
      alerts.push({
        type: 'partner_frozen',
        severity: 'warning',
        title: 'Партнёр заморожен вручную',
        description: 'Заморозку снимает только Main Admin — проверьте, актуальна ли она',
        entityType: 'organization',
        entityId: o.id,
        entityLabel: o.name,
        href: `/organizations/${o.id}`,
        meta: { students: o.students },
      });
    }

    // Тишина: партнёр платит, но им не пользуются — ранний признак ухода.
    // Замороженных не считаем: они не заходят по нашей же вине, это не сигнал.
    if (o.status !== 'frozen') {
      const silent = o.last_login_at ? daysBetween(now, new Date(o.last_login_at)) : null;
      const orgAge = daysBetween(now, new Date(o.created_at));
      if (silent === null && orgAge >= 1) {
        alerts.push({
          type: 'partner_never_logged_in',
          severity: 'warning',
          title: 'Партнёр ни разу не заходил',
          description: 'Организация создана, но входов нет — онбординг не начался',
          entityType: 'organization',
          entityId: o.id,
          entityLabel: o.name,
          href: `/organizations/${o.id}`,
          meta: { students: o.students },
        });
      } else if (silent >= INACTIVE_DAYS) {
        alerts.push({
          type: 'partner_inactive',
          severity: 'warning',
          title: `Нет входов ${silent} дн.`,
          description: 'Партнёр перестал пользоваться платформой — риск ухода',
          entityType: 'organization',
          entityId: o.id,
          entityLabel: o.name,
          href: `/organizations/${o.id}`,
          meta: { lastLoginAt: o.last_login_at, silentDays: silent, students: o.students },
        });
      }
    }
  }

  if (unresolvedErrors > 0) {
    alerts.push({
      type: 'backend_errors_open',
      severity: 'warning',
      title: `Ошибок бэкенда за сутки: ${unresolvedErrors}`,
      description: 'Непогашенные записи в журнале ошибок — стоит посмотреть, не пропущен ли реальный баг',
      entityType: 'system',
      entityId: 'error-log',
      entityLabel: 'Журнал ошибок',
      href: '/error-log',
      meta: { count: unresolvedErrors },
    });
  }

  // Скользящее окно 24ч, не «непрочитанные»: у сообщений чата нет статуса
  // «просмотрено» ради одного счётчика — сигнал сам угасает через сутки без
  // нового срабатывания. severity warning, не critical: само по себе слово
  // в списке ещё не значит, что что-то серьёзное — решает Main Admin,
  // открыв «Модерацию чата» (Karis 26.08.2026).
  if (flaggedMessages > 0) {
    alerts.push({
      type: 'chat_word_flagged',
      severity: 'warning',
      title: `Сработавших сообщений в чате за сутки: ${flaggedMessages}`,
      description: 'Кто-то написал слово из списка модерации — стоит посмотреть',
      entityType: 'system',
      entityId: 'chat-moderation',
      entityLabel: 'Модерация чата',
      href: '/chat-moderation',
      meta: { count: flaggedMessages },
    });
  }

  // Подбор пароля — критично: это единственный сигнал во всём Центре
  // контроля про действующую атаку, а не про состояние платформы. Группируем
  // по введённому логину (не по IP) — это то, что реально можно предупредить:
  // "твой аккаунт X сейчас подбирают" (Karis 26.08.2026).
  for (const b of bruteForce) {
    alerts.push({
      type: 'login_brute_force',
      severity: 'critical',
      title: `Подбор пароля: ${b.attempts} попыток за час`,
      description: `Логин «${b.actor_name}» — похоже на попытку взлома`,
      entityType: 'security',
      entityId: b.actor_name,
      entityLabel: b.actor_name,
      href: '/audit?scope=security',
      meta: { attempts: b.attempts, lastAttemptAt: b.last_attempt_at },
    });
  }

  // Сигналим только когда лимит РЕАЛЬНО задан (NEON_STORAGE_LIMIT_GB /
  // STORJ_STORAGE_LIMIT_GB) — без него percent:null, и предупреждать не о
  // чем: сравнивать факт не с чем (Karis 26.08.2026).
  if (storage) {
    for (const [key, label, href] of [
      ['database', 'База данных (Neon)', '/system-health'],
      ['storage', 'Файловое хранилище (Storj)', '/system-health'],
    ]) {
      const s = storage[key];
      if (s.percent == null) continue;
      if (s.percent >= 95) {
        alerts.push({
          type: 'storage_limit', severity: 'critical',
          title: `${label}: ${s.percent}% от лимита`,
          description: 'Почти упёрлись в лимит — запись может остановиться',
          entityType: 'system', entityId: key, entityLabel: label, href,
          meta: { percent: s.percent, bytes: s.bytes, limitBytes: s.limitBytes },
        });
      } else if (s.percent >= 80) {
        alerts.push({
          type: 'storage_limit', severity: 'warning',
          title: `${label}: ${s.percent}% от лимита`,
          description: 'Стоит спланировать апгрейд плана заранее',
          entityType: 'system', entityId: key, entityLabel: label, href,
          meta: { percent: s.percent, bytes: s.bytes, limitBytes: s.limitBytes },
        });
      }
    }
  }

  // Только про НАСТОЯЩИЕ проваленные джобы (очередь доступна, но задача
  // сама не прошла после всех попыток) — недоступность самого Redis уже
  // покрыта сигналом system_degraded выше, второй раз про то же не сигналим.
  if (queues) {
    for (const q of queues.queues) {
      if (q.ok && q.counts.failed > 0) {
        alerts.push({
          type: 'queue_jobs_failed',
          severity: 'warning',
          title: `Очередь «${q.name}»: ${q.counts.failed} проваленных задач`,
          description: 'Задачи не прошли после всех повторных попыток — уведомления/платежи могли не дойти',
          entityType: 'queue',
          entityId: q.name,
          entityLabel: q.name,
          href: '/queue-health',
          meta: q.counts,
        });
      }
    }
  }

  for (const l of leads) {
    const stale = l.age_days >= STALE_LEAD_DAYS;
    const leadLabel = l.center_name || l.name || l.phone || 'Заявка без названия';
    alerts.push({
      type: 'lead_unprocessed',
      severity: stale ? 'critical' : 'warning',
      title: stale ? `Заявка без ответа ${l.age_days} дн.` : 'Новая заявка',
      description: [l.center_name, l.name, l.phone].filter(Boolean).join(' · ') || leadLabel,
      entityType: 'lead',
      entityId: l.id,
      entityLabel: leadLabel,
      href: '/leads',
      meta: { ageDays: l.age_days, createdAt: l.created_at },
    });
  }

  for (const r of requests) {
    const stale = r.age_days >= STALE_REQUEST_DAYS;
    alerts.push({
      type: 'feature_request_pending',
      severity: stale ? 'critical' : 'warning',
      title: stale ? `Заявка на фичу ждёт ${r.age_days} дн.` : 'Заявка на фичу',
      description: `${r.organization_name} · ${r.type === 'add' ? 'подключить' : 'отключить'} «${r.feature_key}»`,
      entityType: 'feature_request',
      entityId: r.id,
      entityLabel: r.feature_key,
      href: '/features',
      meta: { ageDays: r.age_days, organizationId: r.organization_id },
    });
  }

  const order = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => order[a.severity] - order[b.severity]);

  const counts = alerts.reduce(
    (acc, a) => { acc[a.severity] += 1; acc.total += 1; return acc; },
    { critical: 0, warning: 0, info: 0, total: 0 },
  );

  return { alerts, counts, generatedAt: now.toISOString() };
}

// ---------- Модерация чата (Karis 26.08.2026) ----------

/**
 * Список ОДИН на всю платформу — Main Admin настраивает его один раз, и он
 * действует во всех чатах всех партнёров и филиалов сразу, без привязки к
 * organization_id. Проверку слова на живом сообщении делает
 * shared/chatModeration.js — здесь только управление списком.
 */
export async function listBannedWords() {
  return repo.listBannedWords();
}

/**
 * words — массив строк (одна на строку с фронта). Кэш совпадений сбрасываем
 * сразу: слово должно ловиться со следующего же сообщения, не через TTL-окно.
 */
export async function addBannedWords(words, createdBy) {
  const cleaned = [...new Set(
    (words ?? []).map((w) => String(w ?? '').trim()).filter(Boolean),
  )];
  if (cleaned.length === 0) throw new AppError(422, 'Список слов пуст');
  const rows = await repo.addBannedWords(cleaned, createdBy);
  invalidateBannedWordsCache();
  return rows;
}

export async function setBannedWordActive(id, isActive) {
  const row = await repo.setBannedWordActive(id, isActive);
  if (!row) throw new AppError(404, 'Слово не найдено');
  invalidateBannedWordsCache();
  return row;
}

/**
 * Включает/выключает авто-замену слова на **** прямо в чате. Меняет только
 * ЭТО слово — остальные из списка остаются в прежнем режиме (тихий флаг).
 */
export async function setBannedWordAutoMask(id, autoMask) {
  const row = await repo.setBannedWordAutoMask(id, autoMask);
  if (!row) throw new AppError(404, 'Слово не найдено');
  invalidateBannedWordsCache();
  return row;
}

export async function deleteBannedWord(id) {
  const row = await repo.deleteBannedWord(id);
  if (!row) throw new AppError(404, 'Слово не найдено');
  invalidateBannedWordsCache();
  return row;
}

/**
 * Сообщения, сработавшие на список — единственный кусок переписки, который
 * видит Main Admin. Обычная переписка сюда не попадает (см. репозиторий).
 */
export async function listFlaggedMessages({ limit = 50, offset = 0 } = {}) {
  const rows = await repo.listFlaggedMessages({ limit, offset });
  const total = rows[0]?.total_count ?? 0;
  const items = rows.map(({ total_count, ...r }) => ({
    id: r.id,
    chatType: r.chat_type,
    roomKey: r.room_key,
    body: r.body,
    flaggedWord: r.flagged_word,
    createdAt: r.created_at,
    sender: {
      id: r.sender_id,
      firstName: r.sender_first_name,
      lastName: r.sender_last_name,
      role: r.sender_role,
    },
    branch: r.branch_id ? { id: r.branch_id, name: r.branch_name } : null,
    organization: r.organization_id ? { id: r.organization_id, name: r.organization_name } : null,
  }));
  return { items, total, limit, offset };
}
