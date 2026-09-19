import { isOrgAccessBlocked } from '../../shared/orgAccess.js';
import * as mainRepo from '../main/main.repository.js';
import { getOrgDebt } from '../platformBilling/platformBilling.service.js';

/**
 * Health Score партнёра — 0-100 (Karis 26.08.2026, пункт #5 из списка
 * мониторинга). Раньше Центр контроля видел только крайние состояния
 * («ни разу не заходил», «доступ заблокирован») — не было ответа на вопрос
 * «кто из ПОКА-нормальных партнёров медленно затухает».
 *
 * Сознательно два фактора, не пять: платёж+доступ (0-50) и активность входов
 * (0-50). Score, который нельзя пересчитать в уме за 10 секунд, никто не
 * будет доверять — сложная формула из многих слабо связанных сигналов хуже
 * простой и понятной. Оба фактора уже посчитаны в системе:
 *   - платёж/доступ — та же isOrgAccessBlocked, что реально решает, пускать
 *     ли партнёра, + долг по platform_invoices (SCC-BILLING);
 *   - активность — users.last_login_at, тот же столбец, что в Центре
 *     контроля (main.repository.js → actionCenterOrgSignals).
 * Никакой новой телеметрии не заводится — только то, чему уже верит
 * остальная платформа.
 */

const MS_PER_DAY = 86_400_000;

function paymentScore(org, debt) {
  const access = isOrgAccessBlocked(org);
  if (access.blocked) return { score: 0, reason: `Заблокирован (${access.reason})` };
  if (access.reason === 'grace_period') return { score: 20, reason: 'Грейс-период — оплата просрочена' };
  if (debt?.overdueCount >= 2) return { score: 0, reason: `${debt.overdueCount} просроченных счетов` };
  if (debt?.overdueCount === 1) return { score: 20, reason: '1 просроченный счёт' };
  if (debt?.debt > 0) return { score: 35, reason: 'Есть долг, но срок ещё не прошёл' };
  return { score: 50, reason: 'Доступ активен, долгов нет' };
}

function activityScore(lastLoginAt, now) {
  if (!lastLoginAt) return { score: 0, days: null, reason: 'Ни разу не заходил' };
  const parsed = new Date(lastLoginAt);
  if (Number.isNaN(parsed.getTime())) return { score: 0, days: null, reason: 'Дата входа повреждена' };
  // DB and API hosts can differ by a few seconds. A future timestamp must not
  // leak a negative number of days into the UI.
  const days = Math.max(0, Math.floor((now - parsed) / MS_PER_DAY));
  if (days <= 3) return { score: 50, days, reason: `Заходил ${days} дн. назад` };
  if (days <= 7) return { score: 40, days, reason: `Заходил ${days} дн. назад` };
  if (days <= 14) return { score: 25, days, reason: `Не заходил ${days} дн.` };
  if (days <= 30) return { score: 10, days, reason: `Не заходил ${days} дн.` };
  return { score: 0, days, reason: `Не заходил ${days} дн.` };
}

function band(total) {
  if (total >= 80) return { label: 'Здоров', tone: 'success' };
  if (total >= 50) return { label: 'Требует внимания', tone: 'warning' };
  return { label: 'Риск ухода', tone: 'danger' };
}

function nextAction({ payment, activity }, debt) {
  if (payment.score === 0) return debt?.overdueCount ? 'Связаться по просроченной оплате' : 'Проверить доступ и оплату';
  if (payment.score < 50) return 'Уточнить дату оплаты';
  if (activity.score === 0) return 'Связаться и помочь начать работу';
  if (activity.score <= 25) return 'Уточнить причину низкой активности';
  return 'Действий не требуется';
}

export async function partnerHealthScores() {
  const now = new Date();
  const [orgs, debts] = await Promise.all([mainRepo.actionCenterOrgSignals(), getOrgDebt()]);
  const debtByOrg = new Map(debts.map((d) => [d.organizationId, d]));

  const items = orgs.map((o) => {
    const debt = debtByOrg.get(o.id);
    const payment = paymentScore(o, debt);
    const activity = activityScore(o.last_login_at, now);
    const total = payment.score + activity.score;
    return {
      organizationId: o.id,
      organizationName: o.name,
      organizationStatus: o.status,
      students: o.students,
      accessUntil: o.access_until,
      createdAt: o.created_at,
      score: total,
      band: band(total),
      payment: { score: payment.score, max: 50, reason: payment.reason },
      activity: { score: activity.score, max: 50, reason: activity.reason, lastLoginAt: o.last_login_at },
      debt: debt?.debt ?? 0,
      overdueCount: debt?.overdueCount ?? 0,
      nextAction: nextAction({ payment, activity }, debt),
    };
  });

  items.sort((a, b) => a.score - b.score || a.organizationName.localeCompare(b.organizationName));
  return items;
}
