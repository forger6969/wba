import argon2 from 'argon2';
import { AppError } from '../../utils/AppError.js';
import { planLimits } from '../../config/plans.js';
import { logger } from '../../config/logger.js';
import { notificationQueue } from '../../queues/notification.queue.js';
import { sendToGroupParentChat } from '../telegram/groupNotify.js';
import { genTempPassword } from '../auth/credentials.js';
import { withTransaction } from '../../config/db.js';
import { isOrgAccessBlocked } from '../../shared/orgAccess.js';
import { parsePagination, buildPageMeta } from '../../utils/pagination.js';
import * as repo from './super.repository.js';
import { getDownloadUrl } from '../../config/s3.js';

// ---------- расходы организации ----------

export async function createExpense(orgId, actorId, body) {
  if (body.branchId) {
    const branch = await repo.findBranchInOrg(body.branchId, orgId);
    if (!branch) throw new AppError(404, 'Branch not found in your organization');
  }
  return mapOrgExpense(await repo.insertOrgExpense({
    orgId, branchId: body.branchId, category: body.category, amount: body.amount,
    spentAt: body.spentAt, note: body.note, createdBy: actorId,
  }));
}

export async function listExpenses(orgId, query) {
  const organizationOnly = query.branchId === 'organization';
  const branchId = organizationOnly ? null : query.branchId;
  if (branchId) {
    const branch = await repo.findBranchInOrg(branchId, orgId);
    if (!branch) throw new AppError(404, 'Branch not found in your organization');
  }
  const { page, limit, offset } = parsePagination(query);
  const filter = { orgId, branchId, organizationOnly, from: query.from, to: query.to };
  const [rows, total] = await Promise.all([
    repo.listOrgExpenses({ ...filter, limit, offset }), repo.countOrgExpenses(filter),
  ]);
  return { expenses: rows.map(mapOrgExpense), meta: buildPageMeta(total, page, limit) };
}

export async function updateExpense(orgId, expenseId, body) {
  const expense = await repo.findExpenseInOrg(expenseId, orgId);
  if (!expense) throw new AppError(404, 'Expense not found in your organization');
  const row = await repo.updateOrgExpense(expenseId, orgId, body);
  return mapOrgExpense(row);
}

export async function deleteExpense(orgId, expenseId) {
  const expense = await repo.findExpenseInOrg(expenseId, orgId);
  if (!expense) throw new AppError(404, 'Expense not found in your organization');
  await repo.softDeleteOrgExpense(expenseId, orgId);
}

function mapOrgExpense(row) {
  return {
    id: row.id, branchId: row.branch_id, branchName: row.branch_name ?? null,
    scope: row.branch_id ? 'branch' : 'organization', category: row.category,
    amount: Number(row.amount), spentAt: row.spent_at, note: row.note,
    createdBy: row.created_by_first ? `${row.created_by_first} ${row.created_by_last}` : undefined,
    createdAt: row.created_at,
  };
}

// ---------- филиалы ----------

/** Первый филиал организации становится главным (is_main). */
export async function createBranch(orgId, { name, address, phone, lat, lng }) {
  const existing = await repo.countBranches(orgId);
  const branch = await repo.insertBranch({
    orgId,
    name,
    address,
    phone,
    // без этого координаты с карты доходили до сервиса и молча терялись здесь
    lat,
    lng,
    isMain: existing === 0,
  });
  return mapBranch(branch);
}

export async function listBranches(orgId) {
  const rows = await repo.listBranches(orgId);
  return rows.map((b) => ({
    id: b.id,
    name: b.name,
    address: b.address,
    phone: b.phone,
    isMain: b.is_main,
    isArchived: b.is_archived,
    admins: Number(b.admins),
    students: Number(b.students),
    mentors: Number(b.mentors),
    groups: Number(b.groups),
    // деньги филиала — по ним видно, какой зарабатывает, а какой проедает
    revenue: Number(b.revenue),
    expenses: Number(b.expenses),
    profit: Number(b.revenue) - Number(b.expenses),
    debt: Number(b.debt),
    // NUMERIC приезжает строкой; карта ждёт числа
    lat: b.lat === null || b.lat === undefined ? null : Number(b.lat),
    lng: b.lng === null || b.lng === undefined ? null : Number(b.lng),
    createdAt: b.created_at,
  }));
}

function mapBranch(b) {
  return {
    id: b.id,
    name: b.name,
    address: b.address,
    phone: b.phone,
    isMain: b.is_main,
    isArchived: b.is_archived,
    // NUMERIC приезжает строкой; карта ждёт числа
    lat: b.lat === null || b.lat === undefined ? null : Number(b.lat),
    lng: b.lng === null || b.lng === undefined ? null : Number(b.lng),
    createdAt: b.created_at,
  };
}

export async function updateBranch(orgId, id, fields) {
  const branch = await repo.updateBranch(id, orgId, fields);
  if (!branch) throw new AppError(404, 'Branch not found in your organization');
  return mapBranch(branch);
}

export async function setBranchArchived(orgId, id, archived) {
  const branch = await repo.setBranchArchived(id, orgId, archived);
  if (!branch) throw new AppError(404, 'Branch not found in your organization');
  return mapBranch(branch);
}

/** Детали филиала: сам филиал + его админы + группы. */
/**
 * Всё о филиале в одном ответе: показатели, сотрудники, группы, ученики.
 *
 * Собрано одним запросом намеренно — карточка филиала показывает это на
 * соседних вкладках, и четыре отдельных обращения ради одного экрана только
 * добавили бы мигание при переключении.
 *
 * Раньше здесь были только админы и группы, а фронт при этом рисовал плитки
 * «Ученики», «Месячный доход» и «Общий долг» — они всегда показывали нули,
 * потому что таких полей в ответе не было.
 */
export async function branchDetail(orgId, id) {
  const branch = await repo.findBranchFull(id, orgId);
  if (!branch) throw new AppError(404, 'Branch not found in your organization');
  const [admins, groups, students, mentors, stats] = await Promise.all([
    repo.listBranchAdmins(id),
    repo.listBranchGroups(id),
    repo.listBranchStudents(id),
    repo.listBranchMentors(id),
    repo.branchStats(id),
  ]);
  return {
    ...mapBranch(branch),
    stats: {
      students: stats.students,
      mentors: stats.mentors,
      groups: stats.groups,
      admins: admins.length,
      revenue: Number(stats.revenue),
      expenses: Number(stats.expenses),
      // прибыль филиала = что пришло от учеников минус его же траты
      profit: Number(stats.revenue) - Number(stats.expenses),
      debt: Number(stats.debt),
      currency: 'UZS',
    },
    admins: admins.map((a) => ({
      id: a.id,
      firstName: a.first_name,
      lastName: a.last_name,
      email: a.email,
      status: a.status,
    })),
    mentors: mentors.map((m) => ({
      id: m.id,
      firstName: m.first_name,
      lastName: m.last_name,
      email: m.email,
      phone: m.phone,
      status: m.status,
    })),
    students: students.map((s) => ({
      id: s.id,
      firstName: s.first_name,
      lastName: s.last_name,
      phone: s.phone,
      status: s.status,
      debt: Number(s.total_debt ?? 0),
      coins: Number(s.coin_balance ?? 0),
    })),
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      subject: g.subject,
      monthlyPrice: Number(g.monthly_price),
      mentorId: g.mentor_id,
      mentorName: g.mentor_name,
      students: Number(g.students),
    })),
  };
}

// ---------- админы ----------

export async function createAdmin(orgId, { firstName, lastName, email, branchId, phone }) {
  // филиал должен принадлежать ЭТОЙ организации — иначе super admin суёт чужой филиал
  const branch = await repo.findBranchInOrg(branchId, orgId);
  if (!branch) throw new AppError(404, 'Branch not found in your organization');

  // пароль всегда генерится сервером и показывается один раз — так же, как
  // Main Admin заводит CEO. Ручной ввод убрали: опечатка/автозаполнение
  // браузера в форме создания приводили к аккаунту с паролем, который никто
  // не мог вспомнить, а сбросить его было нечем.
  const tempPassword = genTempPassword();
  const passwordHash = await argon2.hash(tempPassword, { type: argon2.argon2id });

  let admin;
  try {
    admin = await repo.insertAdmin({
      orgId,
      branchId,
      firstName,
      lastName,
      email,
      phone,
      passwordHash,
    });
  } catch (err) {
    if (err.code === '23505') throw new AppError(409, 'Email already in use');
    throw err;
  }

  return {
    id: admin.id,
    firstName: admin.first_name,
    lastName: admin.last_name,
    email: admin.email,
    branchId: admin.branch_id,
    // показать один раз — CEO передаёт сотруднику
    tempPassword,
  };
}

/** Новый случайный пароль для админа — когда старый забыт/введён неверно при создании. */
export async function resetAdminPassword(orgId, id) {
  const tempPassword = genTempPassword();
  const passwordHash = await argon2.hash(tempPassword, { type: argon2.argon2id });
  const admin = await repo.setAdminPasswordHash(id, orgId, passwordHash);
  if (!admin) throw new AppError(404, 'Admin not found in your organization');
  return { ...mapAdmin(admin), tempPassword };
}

export async function listAdmins(orgId) {
  const rows = await repo.listAdmins(orgId);
  return rows.map((u) => ({
    id: u.id,
    firstName: u.first_name,
    lastName: u.last_name,
    email: u.email,
    status: u.status,
    branchId: u.branch_id,
    branchName: u.branch_name,
    phone: u.phone,
    monthlySalary: u.monthly_salary,
    createdAt: u.created_at,
  }));
}

function mapAdmin(u) {
  return {
    id: u.id,
    firstName: u.first_name,
    lastName: u.last_name,
    email: u.email,
    status: u.status,
    branchId: u.branch_id,
    phone: u.phone,
    monthlySalary: u.monthly_salary,
  };
}

export async function updateAdmin(orgId, id, fields) {
  // при переносе в другой филиал — он должен быть из своей орг
  if (fields.branchId !== undefined) {
    const branch = await repo.findBranchInOrg(fields.branchId, orgId);
    if (!branch) throw new AppError(404, 'Branch not found in your organization');
  }
  if (!(await repo.findAdminInOrg(id, orgId))) {
    throw new AppError(404, 'Admin not found in your organization');
  }
  const admin = await repo.updateAdmin(id, orgId, fields);
  return mapAdmin(admin);
}

export async function setAdminFrozen(orgId, id, frozen) {
  const admin = await repo.setAdminStatus(id, orgId, frozen ? 'frozen' : 'active');
  if (!admin) throw new AppError(404, 'Admin not found in your organization');
  return mapAdmin(admin);
}

// ---------- методисты ----------

export async function createMethodist(orgId, { firstName, lastName, email, phone }) {
  const tempPassword = genTempPassword();
  const passwordHash = await argon2.hash(tempPassword, { type: argon2.argon2id });
  try {
    const row = await repo.insertMethodist({
      orgId,
      firstName,
      lastName,
      email,
      phone,
      passwordHash,
    });
    return { ...mapMethodist(row), tempPassword };
  } catch (err) {
    if (err.code === '23505') throw new AppError(409, 'Email already in use');
    throw err;
  }
}

/** Новый случайный пароль для методиста — тот же сценарий, что и у админа. */
export async function resetMethodistPassword(orgId, id) {
  const tempPassword = genTempPassword();
  const passwordHash = await argon2.hash(tempPassword, { type: argon2.argon2id });
  const row = await repo.setMethodistPasswordHash(id, orgId, passwordHash);
  if (!row) throw new AppError(404, 'Methodist not found in your organization');
  return { ...mapMethodist(row), tempPassword };
}

// ---------- менторы (только чтение, для выбора в «Взыскании») ----------

export async function listMentors(orgId) {
  const rows = await repo.listMentors(orgId);
  return rows.map((u) => ({
    id: u.id,
    firstName: u.first_name,
    lastName: u.last_name,
    email: u.email,
    status: u.status,
    branchId: u.branch_id,
    branchName: u.branch_name,
    phone: u.phone,
    grade: u.grade,
    bio: u.bio,
    skills: u.skills ?? [],
    createdAt: u.created_at,
  }));
}

export async function listMethodists(orgId) {
  const rows = await repo.listMethodists(orgId);
  return rows.map((u) => ({
    id: u.id,
    firstName: u.first_name,
    lastName: u.last_name,
    email: u.email,
    status: u.status,
    phone: u.phone,
    monthlySalary: u.monthly_salary,
    createdAt: u.created_at,
  }));
}

export async function updateMethodist(orgId, id, fields) {
  const admin = await repo.updateMethodist(id, orgId, fields);
  if (!admin) throw new AppError(404, 'Methodist not found in your organization');
  return mapMethodist(admin);
}

export async function setMethodistFrozen(orgId, id, frozen) {
  const row = await repo.setMethodistStatus(id, orgId, frozen ? 'frozen' : 'active');
  if (!row) throw new AppError(404, 'Methodist not found in your organization');
  return mapMethodist(row);
}

function mapMethodist(u) {
  return {
    id: u.id,
    firstName: u.first_name,
    lastName: u.last_name,
    email: u.email,
    status: u.status,
    phone: u.phone,
    monthlySalary: u.monthly_salary,
  };
}

// ---------- организация (профиль партнёра, Settings) ----------

function mapOrganization(o) {
  const limits = planLimits(o.plan);
  return {
    id: o.id,
    name: o.name,
    domain: o.domain,
    status: o.status,
    lessonDurationMin: o.lesson_duration_min,
    coinsPerStudent: o.coins_per_student,
    createdAt: o.created_at,
    plan: {
      branchLimit: limits?.maxBranches ?? null,
      diskSpace: '500 ГБ',
    },
  };
}

export async function getOrganization(orgId) {
  const row = await repo.getOrganization(orgId);
  if (!row) throw new AppError(404, 'Organization not found');
  return mapOrganization(row);
}

export async function updateOrganization(orgId, fields) {
  try {
    const row = await repo.updateOrganization(orgId, fields);
    if (!row) throw new AppError(404, 'Organization not found');
    return mapOrganization(row);
  } catch (err) {
    if (err.code === '23505') throw new AppError(409, 'Domain already in use');
    throw err;
  }
}

// ---------- студенты организации (Super Students страница) ----------

export async function listStudents(orgId, { search, frozen, page, limit }) {
  const { rows, total } = await repo.listOrgStudents(orgId, { search, frozen, page, limit });
  return {
    students: rows.map((u) => ({
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      phone: u.phone,
      status: u.status,
      frozen: u.status === 'frozen',
      branchName: u.branch_name,
      createdAt: u.created_at,
    })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / limit)),
  };
}

/**
 * Динамика набора учеников — «в этом месяце пришло N, в прошлом было M»,
 * тот же приём, что и у stats() для выручки (period=12m → по месяцам +
 * дельта месяц-к-месяцу по двум последним точкам, иначе по дням).
 * PERIOD_DAYS/MONTHLY_MONTHS_BACK объявлены ниже в файле, при статистике —
 * не при определении функции, так что порядок в файле не важен.
 */
export async function studentsStats(orgId, period = '30d', branchId = null) {
  const isMonthly = period === '12m';
  const from = isMonthly
    ? new Date(new Date().getFullYear(), new Date().getMonth() - (MONTHLY_MONTHS_BACK - 1), 1)
    : new Date(Date.now() - (PERIOD_DAYS[period] ?? 30) * 24 * 60 * 60 * 1000);

  const series = isMonthly
    ? await repo.newStudentsSeriesMonthly(orgId, from, branchId)
    : await repo.newStudentsSeriesDaily(orgId, from, branchId);

  const totalNew = series.reduce((s, r) => s + Number(r.cnt), 0);

  let momDelta = null;
  let momDeltaPct = null;
  if (isMonthly && series.length >= 1) {
    const last = Number(series[series.length - 1]?.cnt ?? 0);
    const prev = Number(series[series.length - 2]?.cnt ?? 0);
    momDelta = last - prev;
    momDeltaPct = prev > 0 ? Number((((last - prev) / prev) * 100).toFixed(1)) : (last > 0 ? 100 : 0);
  }

  return {
    period,
    branchId,
    totalNew,
    momDelta,
    momDeltaPct,
    series: series.map((s) => ({ date: s.day ?? s.month, count: Number(s.cnt) })),
  };
}

export async function deleteStudent(orgId, id) {
  const row = await repo.softDeleteOrgStudent(id, orgId);
  if (!row) throw new AppError(404, 'Student not found in your organization');
  return { id: row.id };
}

/** Полная карточка ученика: сам ученик + его активные группы. */
export async function studentDetail(orgId, id) {
  const s = await repo.findStudentInOrg(id, orgId);
  if (!s) throw new AppError(404, 'Student not found in your organization');
  const groups = await repo.studentGroupsOrg(id);
  return {
    id: s.id,
    firstName: s.first_name,
    lastName: s.last_name,
    phone: s.phone,
    status: s.status,
    loginCode: s.login_code,
    coinBalance: s.coin_balance,
    totalDebt: Number(s.total_debt),
    hasOverdueInvoice: Boolean(s.has_overdue_invoice),
    birthDate: s.birth_date,
    frozenAt: s.frozen_at,
    frozenReason: s.frozen_reason,
    hasParent: Boolean(s.parent_id),
    branchName: s.branch_name,
    createdAt: s.created_at,
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      subject: g.subject,
      monthlyPrice: Number(g.monthly_price),
      mentor: g.mentor_first ? `${g.mentor_first} ${g.mentor_last}` : null,
    })),
  };
}

// ---------- группы организации (Super Groups страница) ----------

export async function listGroups(orgId) {
  const rows = await repo.listOrgGroups(orgId);
  return {
    groups: rows.map((g) => ({
      id: g.id,
      name: g.name,
      subject: g.subject,
      monthlyPrice: Number(g.monthly_price),
      schedule: g.schedule,
      lessonDays: Array.isArray(g.schedule)
        ? g.schedule.map((slot) => (typeof slot === 'string' ? slot : slot?.day)).filter(Boolean)
        : [],
      room: g.room,
      isArchived: g.is_archived,
      branchName: g.branch_name,
      mentorName: g.mentor_name,
      studentsCount: Number(g.students_count),
      createdAt: g.created_at,
    })),
  };
}

export async function setGroupArchived(orgId, id, archived) {
  const row = await repo.setOrgGroupArchived(id, orgId, archived);
  if (!row) throw new AppError(404, 'Group not found in your organization');
  return { id: row.id, isArchived: archived };
}

export async function deleteGroup(orgId, id) {
  const row = await repo.softDeleteOrgGroup(id, orgId);
  if (!row) throw new AppError(404, 'Group not found in your organization');
  return { id: row.id };
}

/** Полная карточка группы: сама группа + её текущий состав учеников. */
export async function groupDetail(orgId, id) {
  const g = await repo.findGroupInOrg(id, orgId);
  if (!g) throw new AppError(404, 'Group not found in your organization');
  const students = await repo.groupStudentsOrg(id);
  return {
    id: g.id,
    name: g.name,
    subject: g.subject,
    monthlyPrice: Number(g.monthly_price),
    schedule: g.schedule ?? [],
    room: g.room,
    isArchived: g.is_archived,
    branchName: g.branch_name,
    mentor: g.mentor_id ? { id: g.mentor_id, name: `${g.mentor_first} ${g.mentor_last}` } : null,
    createdAt: g.created_at,
    students: students.map((s) => ({
      id: s.id,
      firstName: s.first_name,
      lastName: s.last_name,
      phone: s.phone,
      status: s.status,
      totalDebt: Number(s.total_debt),
      coinBalance: s.coin_balance,
      joinedAt: s.joined_at,
    })),
  };
}

// ---------- посещаемость организации (Super Attendance страница) ----------

export async function attendance(orgId, { groupId, date }) {
  const rows = await repo.orgAttendance(orgId, { groupId, date });
  const totals = { present: 0, absent: 0, late: 0, excused: 0 };
  const records = rows.map((a) => {
    if (totals[a.status] !== undefined) totals[a.status] += 1;
    return {
      id: a.id,
      groupId: a.group_id,
      groupName: a.group_name,
      studentId: a.student_id,
      firstName: a.first_name,
      lastName: a.last_name,
      date: a.lesson_date,
      status: a.status,
    };
  });
  return { records, lessons: records, totals, total: records.length };
}

// ---------- объявления организации (Super Announcements) ----------

function mapAnnouncement(a) {
  return {
    id: a.id,
    title: a.title,
    body: a.body,
    targetType: a.target_type,
    recipientCount: Number(a.recipient_count),
    readCount: 0, // пометок «прочитано» в системе пока нет
    senderName: a.sender_name ?? null,
    senderRole: a.sender_role ?? null,
    branchId: a.branch_id ?? null,
    branchName: a.branch_name ?? null,
    expiresAt: a.expires_at ?? null,
    imageUrl: a.image_url ?? null,
    imageKey: a.image_key ?? null,
    readers: [],
    nonReaders: [],
    createdAt: a.created_at,
  };
}

export async function listAnnouncements(orgId, branchId = null) {
  const rows = await repo.listAnnouncements(orgId, branchId);
  const items = await Promise.all(rows.map(async (row) => {
    const item = mapAnnouncement(row);
    if (item.imageKey) item.imageUrl = await getDownloadUrl(item.imageKey, 3600).catch(() => null);
    return item;
  }));
  return { items, announcements: items, total: items.length };
}

export async function createAnnouncement(orgId, senderId, { title, body, targetType, branchId = null, expiresAt, imageUrl = null, imageKey = null }) {
  if (branchId && !(await repo.findBranchInOrg(branchId, orgId))) {
    throw new AppError(404, 'Branch not found in your organization');
  }
  if (new Date(expiresAt).getTime() <= Date.now()) throw new AppError(422, 'Announcement end time must be in the future');
  const recipientCount = await repo.countAnnouncementRecipients(orgId, targetType, branchId);
  const row = await repo.insertAnnouncement({ orgId, senderId, title, body, targetType, recipientCount, branchId, expiresAt, imageUrl, imageKey });
  const deliveryImageUrl = imageKey ? await getDownloadUrl(imageKey, 86400).catch(() => null) : imageUrl;

  // Telegram-доставка только для аудиторий, у которых есть привязка бота
  // (родители/студенты). Сотрудники получают объявление как внутреннюю запись.
  if (targetType === 'all-parents' || targetType === 'all-students' || targetType === 'all-families') {
    const studentIds = await repo.orgActiveStudentIds(orgId, branchId);
    if (studentIds.length > 0) {
      const roles = targetType === 'all-students' ? ['student']
        : targetType === 'all-parents' ? ['parent'] : ['student', 'parent'];
      // Redis/queue availability must never keep the create HTTP request spinning.
      void notificationQueue.add('announcement.created', { studentIds, title, message: body, roles })
        .catch((err) => logger.error({ err }, 'Failed to enqueue announcement notification'));
    }
  }

  // Every learning group owns its own parents Telegram chat. Announcements are
  // broadcast to the linked group chats inside the selected branch scope.
  if (['all-parents', 'all-students', 'all-families'].includes(targetType)) {
    const groupIds = await repo.organizationGroupIds(orgId, branchId);
    const telegramText = `<b>${title}</b>\n\n${body}`;
    void Promise.allSettled(groupIds.map((id) => sendToGroupParentChat(id, telegramText, deliveryImageUrl)));
  }

  return mapAnnouncement(row);
}

export async function deleteAnnouncement(orgId, id) {
  const row = await repo.softDeleteAnnouncement(id, orgId);
  if (!row) throw new AppError(404, 'Announcement not found in your organization');
  return { id: row.id };
}

// ---------- аудит-лог организации (Super Audit) ----------

function mapAudit(a) {
  return {
    id: a.id,
    action: a.action,
    actorName: a.actor_name ?? null,
    actorRole: a.actor_role ?? null,
    entityType: a.entity_type ?? null,
    entityId: a.entity_id ?? null,
    entityLabel: a.entity_label ?? null,
    success: a.success,
    ip: a.ip ?? null,
    userAgent: a.user_agent ?? null,
    meta: a.meta ?? null,
    createdAt: a.created_at,
  };
}

export async function listAudit(orgId) {
  const rows = await repo.listAudit(orgId);
  const items = rows.map(mapAudit);
  return { items, total: items.length };
}

/**
 * Записать событие в аудит. Никогда не бросает: аудит — побочный эффект, его сбой
 * не должен валить саму операцию (создание админа и т.п.). Ошибку только логируем.
 */
export async function recordAudit(entry) {
  try {
    await repo.insertAudit(entry);
  } catch (err) {
    logger.error({ err, action: entry.action }, 'Failed to write audit log');
  }
}

// ---------- статистика организации (Super Stats) ----------

const PERIOD_DAYS = { '7d': 7, '30d': 30, '90d': 90 };
const MONTHLY_MONTHS_BACK = 12;

/**
 * `period='12m'` — отдельная ветка: ряд по месяцам за год вместо ряда по дням,
 * плюс дельта «этот месяц к прошлому» (totals.momDelta / momDeltaPct), посчитанная
 * тут же по двум последним точкам ряда — второго запроса в базу не нужно.
 *
 * `branchId` — сузить всю статистику (итоги, ряд, способы оплаты) до одного
 * филиала; без него — организация целиком. Таблица `branches` ниже всегда
 * возвращает все филиалы разом, независимо от фильтра — сравнение и сводка
 * должны быть видны, даже когда смотришь конкретный филиал.
 */
export async function stats(orgId, period = '30d', branchId = null) {
  const isMonthly = period === '12m';
  const from = isMonthly
    ? new Date(new Date().getFullYear(), new Date().getMonth() - (MONTHLY_MONTHS_BACK - 1), 1)
    : new Date(Date.now() - (PERIOD_DAYS[period] ?? 30) * 24 * 60 * 60 * 1000);

  const [t, branches, series, methods] = await Promise.all([
    repo.orgTotals(orgId, branchId),
    repo.branchBreakdown(orgId, from),
    isMonthly ? repo.revenueSeriesMonthly(orgId, from, branchId) : repo.revenueSeries(orgId, from, branchId),
    repo.revenueByMethod(orgId, from, branchId),
  ]);
  const revenue = Number(t.revenue);
  const debt = Number(t.outstanding_debt);
  const branchCount = Number(t.branches);
  /* Выручка именно за выбранный период. Без неё страница противоречила себе:
     сверху стояла карточка «Выручка» за всё время, а графики под ней — за
     7 дней, и партнёр видел на одном экране два разных числа про одно и то же.
     Считаем по уже полученному ряду по дням — лишнего запроса в базу нет. */
  const periodRevenue = series.reduce((sum, r) => sum + Number(r.revenue), 0);

  /* Дельта месяц-к-месяцу (только 12m). Karis 22.08.2026 — было две ошибки:
     1) брались две ПОСЛЕДНИЕ ТОЧКИ РЯДА, а ряд приходит из GROUP BY month и
        месяцы без единой оплаты в нём просто отсутствуют. Если в июле не было
        ни одной транзакции, [июнь, август] давали «август к июню», подписанное
        как «месяц к месяцу». Теперь месяцы берутся по календарю явно.
     2) при единственной точке prev падал в 0 и отдавался рост «+100%» — против
        месяца, которого в данных нет вообще. Рост от нуля не определён: pct =
        null, а не выдуманная сотня (абсолютную дельту при этом отдаём — она
        честная). */
  let momDelta = null;
  let momDeltaPct = null;
  if (isMonthly) {
    const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const now = new Date();
    const byMonth = new Map(
      series.map((s) => [monthKey(new Date(s.month ?? s.day)), Number(s.revenue)]),
    );
    const last = byMonth.get(monthKey(now)) ?? 0;
    const prev = byMonth.get(monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))) ?? 0;
    momDelta = last - prev;
    momDeltaPct = prev > 0 ? Number((((last - prev) / prev) * 100).toFixed(1)) : null;
  }

  /* Доля филиала считается от суммы выручки филиалов ЗА ТОТ ЖЕ ПЕРИОД.
     Karis 22.08.2026 — раньше делили на totals.revenue, а это выручка за ВСЁ
     ВРЕМЯ (orgTotals без даты), тогда как b.revenue приходит из
     branchBreakdown(orgId, from), т.е. за период. Доли не складывались в 100%
     (живая проверка: 37.5% + 9.4% = 46.9%), и чем старше организация — тем
     сильнее занижались. Сумма по самим филиалам самосогласована по определению
     и не ломается при ?branchId= (orgTotals сужается по филиалу, а список
     филиалов намеренно остаётся полным — см. комментарий выше). */
  const branchesRevenueTotal = branches.reduce((sum, b) => sum + Number(b.revenue), 0);

  return {
    period,
    branchId,
    totals: {
      revenue,
      periodRevenue,
      periodAvgRevenue: branchCount > 0 ? periodRevenue / branchCount : 0,
      outstandingDebt: debt,
      activeStudents: Number(t.active_students),
      admins: Number(t.admins),
      branches: branchCount,
      avgRevenue: branchCount > 0 ? revenue / branchCount : 0,
      debtRatio: revenue + debt > 0 ? Number(((debt / (revenue + debt)) * 100).toFixed(1)) : 0,
      currency: 'UZS',
      momDelta,
      momDeltaPct,
    },
    branches: branches.map((b) => ({
      id: b.id,
      name: b.name,
      revenue: Number(b.revenue),
      debt: Number(b.debt),
      students: Number(b.students),
      admins: Number(b.admins),
      // доля филиала в выручке организации — раньше жила только в /super/reports;
      // Отчёты слиты в Статистику 2026-07-28 (была одна и та же выборка на двух
      // страницах), поле переехало сюда. Делитель — см. branchesRevenueTotal.
      share: branchesRevenueTotal > 0
        ? Number(((Number(b.revenue) / branchesRevenueTotal) * 100).toFixed(1))
        : 0,
    })),
    revenueSeries: series.map((s) => ({ date: s.day ?? s.month, revenue: Number(s.revenue) })),
    paymentMethods: methods.map((m) => ({ method: m.method, amount: Number(m.amount) })),
  };
}

// ---------- дашборд организации ----------

export async function dashboard(orgId) {
  const [t, branches] = await Promise.all([repo.orgTotals(orgId), repo.branchBreakdown(orgId)]);
  return {
    totals: {
      branches: Number(t.branches),
      activeStudents: Number(t.active_students),
      admins: Number(t.admins),
      mentors: Number(t.mentors),
      revenue: Number(t.revenue),
      outstandingDebt: Number(t.outstanding_debt),
      currency: 'UZS',
    },
    branches: branches.map((b) => ({
      id: b.id,
      name: b.name,
      isMain: b.is_main,
      isArchived: b.is_archived,
      students: Number(b.students),
      admins: Number(b.admins),
      revenue: Number(b.revenue),
      debt: Number(b.debt),
    })),
  };
}

// ---------- методики / цены абонемента ----------

export async function listTrainingTypes(orgId) {
  const rows = await repo.listTrainingTypesWithPrice(orgId);
  return rows.map((tt) => ({
    id: tt.id,
    name: tt.name,
    icon: tt.icon,
    price: tt.price === null ? null : Number(tt.price),
    maxStudents: tt.max_students,
    isArchived: tt.is_archived,
    groupsCount: Number(tt.groups_count),
  }));
}

export async function setTrainingTypePrice(orgId, id, price, maxStudents) {
  const row = await repo.setTrainingTypePrice(id, orgId, price, maxStudents);
  if (!row) throw new AppError(404, 'Training type not found in your organization');
  return { id: row.id, name: row.name, icon: row.icon, price: Number(row.price), maxStudents: row.max_students };
}

export async function setTrainingTypeArchived(orgId, id, archived) {
  const row = await repo.setTrainingTypeArchived(id, orgId, archived);
  if (!row) throw new AppError(404, 'Training type not found in your organization');
  return {
    id: row.id, name: row.name, icon: row.icon,
    price: row.price === null ? null : Number(row.price),
    maxStudents: row.max_students, isArchived: row.is_archived,
  };
}

// ---------- branch managers ----------

/**
 * 23505 из insertBranchManager/updateBranchManager может прийти либо от старого
 * partial-индекса (err.constraint содержит имя), либо от constraint-триггера
 * (1784310000000_deferred-branch-manager-constraint.js) — тот не индекс, поэтому
 * err.constraint пустой, а маркер только в тексте RAISE EXCEPTION.
 */
function isBranchManagerDuplicate(err) {
  return (
    err.constraint === 'uq_one_branch_manager_per_branch' ||
    err.constraint?.includes('branch_manager_per_branch') ||
    err.message?.includes('branch_manager_duplicate')
  );
}

export async function createBranchManager(orgId, { firstName, lastName, email, branchId, phone }) {
  const branch = await repo.findBranchInOrg(branchId, orgId);
  if (!branch) throw new AppError(404, 'Branch not found in your organization');

  const tempPassword = genTempPassword();
  const passwordHash = await argon2.hash(tempPassword, { type: argon2.argon2id });

  let manager;
  try {
    manager = await repo.insertBranchManager({
      orgId,
      branchId,
      firstName,
      lastName,
      email,
      phone,
      passwordHash,
    });
  } catch (err) {
    if (err.code === '23505') {
      if (isBranchManagerDuplicate(err)) {
        throw new AppError(409, 'This branch already has 2 managers (limit reached)');
      }
      throw new AppError(409, 'Email already in use');
    }
    throw err;
  }

  return {
    id: manager.id,
    firstName: manager.first_name,
    lastName: manager.last_name,
    email: manager.email,
    branchId: manager.branch_id,
    tempPassword,
  };
}

export async function listBranchManagers(orgId) {
  const rows = await repo.listBranchManagers(orgId);
  return rows.map((u) => ({
    id: u.id,
    firstName: u.first_name,
    lastName: u.last_name,
    email: u.email,
    status: u.status,
    branchId: u.branch_id,
    branchName: u.branch_name,
    phone: u.phone,
    createdAt: u.created_at,
  }));
}

export async function updateMentorGrade(orgId, mentorId, grade, setBy) {
  const row = await repo.updateMentorGrade(orgId, mentorId, grade, setBy);
  if (!row) throw new AppError(404, 'Mentor not found in your organization');
  return { id: row.user_id, grade: row.grade, gradeSetAt: row.grade_set_at };
}

export async function updateMentorBranch(orgId, mentorId, branchId) {
  if (!(await repo.findBranchInOrg(branchId, orgId))) throw new AppError(404, 'Branch not found in your organization');
  return withTransaction(async (client) => {
    const mentor = await repo.moveMentorToBranch(orgId, mentorId, branchId, client);
    if (!mentor) throw new AppError(404, 'Mentor not found in your organization');
    const detached = await repo.detachMentorOldBranchGroups(mentorId, branchId, client);
    return { id: mentor.id, branchId: mentor.branch_id, detachedGroups: detached.length };
  });
}

export async function createMentor(orgId, body) {
  if (!(await repo.findBranchInOrg(body.branchId, orgId))) throw new AppError(404, 'Branch not found in your organization');
  return adminService.createMentor(
    { organizationId: orgId, branchId: body.branchId },
    { firstName: body.firstName, lastName: body.lastName, email: body.email, phone: body.phone },
  );
}

const mapEmployee = (u) => ({
  id: u.id, firstName: u.first_name, lastName: u.last_name, email: u.email,
  branchId: u.branch_id, branchName: u.branch_name, phone: u.phone, jobTitle: u.job_title,
  monthlySalary: u.monthly_salary == null ? null : Number(u.monthly_salary), status: u.status, createdAt: u.created_at,
});

export async function createEmployee(orgId, body) {
  if (!(await repo.findBranchInOrg(body.branchId, orgId))) throw new AppError(404, 'Branch not found in your organization');
  const tempPassword = genTempPassword();
  const passwordHash = await argon2.hash(tempPassword, { type: argon2.argon2id });
  try {
    const employee = await repo.insertEmployee({ orgId, ...body, passwordHash });
    return { ...mapEmployee(employee), tempPassword };
  } catch (err) {
    if (err.code === '23505') throw new AppError(409, 'Email already in use');
    throw err;
  }

}

export async function listEmployees(orgId) { return (await repo.listEmployees(orgId)).map(mapEmployee); }

export async function updateEmployee(orgId, id, body) {
  if (body.branchId && !(await repo.findBranchInOrg(body.branchId, orgId))) throw new AppError(404, 'Branch not found in your organization');
  const employee = await repo.updateEmployee(id, orgId, body);
  if (!employee) throw new AppError(404, 'Employee not found');
  return mapEmployee(employee);
}

export async function setEmployeeFrozen(orgId, id, frozen) {
  const employee = await repo.setEmployeeStatus(id, orgId, frozen ? 'frozen' : 'active');
  if (!employee) throw new AppError(404, 'Employee not found');
  return mapEmployee(employee);
}

export async function resetEmployeePassword(orgId, id) {
  const tempPassword = genTempPassword();
  const passwordHash = await argon2.hash(tempPassword, { type: argon2.argon2id });
  const employee = await repo.setEmployeePasswordHash(id, orgId, passwordHash);
  if (!employee) throw new AppError(404, 'Employee not found');
  return { ...mapEmployee(employee), tempPassword };
}

export async function updateBranchManager(orgId, id, fields) {
  const existing = await repo.findBranchManagerInOrg(id, orgId);
  if (!existing) throw new AppError(404, 'Branch manager not found in your organization');

  if (fields.branchId !== undefined) {
    const branch = await repo.findBranchInOrg(fields.branchId, orgId);
    if (!branch) throw new AppError(404, 'Branch not found in your organization');
  }

  let manager;
  try {
    manager = await repo.updateBranchManager(id, orgId, fields);
  } catch (err) {
    if (err.code === '23505') {
      if (isBranchManagerDuplicate(err)) {
        throw new AppError(409, 'This branch already has 2 managers (limit reached)');
      }
      throw new AppError(409, 'Email already in use');
    }
    throw err;
  }
  if (!manager) throw new AppError(404, 'Branch manager not found in your organization');
  return mapBranchManager(manager);
}

/** Новый случайный пароль для Branch Manager — когда старый забыт/введён неверно при создании. */
export async function resetBranchManagerPassword(orgId, id) {
  const tempPassword = genTempPassword();
  const passwordHash = await argon2.hash(tempPassword, { type: argon2.argon2id });
  const manager = await repo.setBranchManagerPasswordHash(id, orgId, passwordHash);
  if (!manager) throw new AppError(404, 'Branch manager not found in your organization');
  return { ...mapBranchManager(manager), tempPassword };
}

/**
 * Переставить нескольких Branch Manager'ов между филиалами одной транзакцией —
 * нужно, когда участвующие филиалы уже под завязку (по 2 менеджера каждый), и
 * обычный `updateBranchManager` по одному упирается в constraint (целевой
 * филиал занят теми, кого мы как раз пытаемся передвинуть дальше по цепочке).
 *
 * Работает благодаря 1784310000000_deferred-branch-manager-constraint.js
 * (+ лимит поднят до 2 в 1784430000000_branch-manager-max-two-per-branch.js):
 * проверка «максимум 2 менеджера на филиал» там DEFERRABLE INITIALLY DEFERRED —
 * то есть считается один раз в конце транзакции (на COMMIT), а не после
 * каждого UPDATE. Поэтому промежуточное состояние внутри транзакции (пока по
 * цепочке кто-то временно оказался «третьим» или филиал временно пуст) не
 * мешает — важен только финальный результат: у каждого филиала из assignments
 * не больше 2 менеджеров после того, как выполнятся ВСЕ перестановки.
 *
 * assignments — полный список новых назначений, например для кольцевого
 * свопа A→филиал2, B→филиал3, C→филиал1:
 *   [{id: A, branchId: филиал2}, {id: B, branchId: филиал3}, {id: C, branchId: филиал1}]
 */
export async function reassignBranchManagers(orgId, assignments) {
  for (const { id, branchId } of assignments) {
    if (!(await repo.findBranchManagerInOrg(id, orgId))) {
      throw new AppError(404, `Branch manager ${id} not found in your organization`);
    }
    if (!(await repo.findBranchInOrg(branchId, orgId))) {
      throw new AppError(404, `Branch ${branchId} not found in your organization`);
    }
  }

  let managers;
  try {
    managers = await withTransaction(async (client) => {
      const results = [];
      for (const { id, branchId } of assignments) {
        const manager = await repo.updateBranchManager(id, orgId, { branchId }, client);
        if (!manager) throw new AppError(404, `Branch manager ${id} not found in your organization`);
        results.push(manager);
      }
      return results;
    });
  } catch (err) {
    if (err.code === '23505') {
      if (isBranchManagerDuplicate(err)) {
        throw new AppError(409, 'Reassignment leaves a branch with more than 2 managers');
      }
      throw new AppError(409, 'Email already in use');
    }
    throw err;
  }
  return managers.map(mapBranchManager);
}

function mapBranchManager(manager) {
  return {
    id: manager.id,
    firstName: manager.first_name,
    lastName: manager.last_name,
    email: manager.email,
    status: manager.status,
    branchId: manager.branch_id,
    phone: manager.phone,
    createdAt: manager.created_at,
  };
}

export async function setBranchManagerFrozen(orgId, id, frozen) {
  const manager = await repo.setBranchManagerStatus(id, orgId, frozen ? 'frozen' : 'active');
  if (!manager) throw new AppError(404, 'Branch manager not found in your organization');
  return mapBranchManager(manager);
}

export async function deleteBranchManager(orgId, id) {
  const row = await repo.deleteBranchManager(id, orgId);
  if (!row) throw new AppError(404, 'Branch manager not found in your organization');
  return { id: row.id };
}

// ---------- анонсы платформы (от Main Admin, только чтение) ----------

export async function listPlatformAnnouncements(orgId) {
  return repo.listPlatformAnnouncementsForOrg(orgId);
}

// ---------- каталог платных фич + заявки (CEO не переключает сам) ----------

export async function getFeatureCatalog(orgId) {
  const [catalog, flags] = await Promise.all([repo.listActiveAddonCatalog(), repo.getOwnFeatureFlags(orgId)]);
  const enabledKeys = new Set(flags.filter((f) => f.enabled).map((f) => f.feature_key));
  return catalog.map((c) => ({ ...c, enabled: enabledKeys.has(c.feature_key) }));
}

export async function createFeatureRequest(orgId, { featureKey, type, note }, requestedBy) {
  const existing = await repo.findPendingFeatureRequest(orgId, featureKey, type);
  if (existing) throw new AppError(409, 'A pending request for this feature already exists');
  return repo.insertFeatureRequest({ orgId, featureKey, type, note, requestedBy });
}

export async function listOwnFeatureRequests(orgId) {
  return repo.listOwnFeatureRequests(orgId);
}

// ---------- свой биллинг (read-only) ----------

export async function getOwnBilling(orgId) {
  const org = await repo.getOwnAccessInfo(orgId);
  const { blocked, reason } = isOrgAccessBlocked(org);
  return {
    status: org?.status ?? null,
    accessUntil: org?.access_until ?? null,
    blocked,
    reason,
  };
}

export async function getOwnLedger(orgId) {
  return repo.listOwnLedger(orgId);
}
