import argon2 from 'argon2';
import { withTransaction, pool } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { parsePagination, buildPageMeta } from '../../utils/pagination.js';
import { genLoginCode, genNumericPassword } from '../auth/credentials.js';
import { encryptPassword, decryptPassword } from '../../utils/credentialCrypto.js';
import { notificationQueue } from '../../queues/notification.queue.js';
import { getOrCreateQrToken, regenerateQrToken } from '../auth/qr-login.service.js';
import { isFeatureEnabledForOrg } from '../../shared/orgFeatures.js';
import * as repo from './admin.repository.js';
import { createProratedInvoice } from '../billing/billing.service.js';
import * as roomsRepo from './rooms/rooms.repository.js';

// Reuse: davomat и ДЗ живут в общих таблицах (attendance / homework), админская
// GroupDetail работает с тем же data-layer, что и mentor — единая точка правды,
// новых таблиц под них не заводим (решение команды 2026-07-19).
import * as attendanceRepo from '../mentor/attendance/attendance.repository.js';
import * as homeworkRepo from '../homework/homework.repository.js';
import { emitTo } from '../../sockets/io.js';
import { attendanceRoom } from '../../sockets/attendance.js';
import { GroupBindTokenService } from '../telegram/group-bind-token.service.js';
import { sendToGroupParentChat } from '../telegram/groupNotify.js';
import { redis } from '../../config/redis.js';
import { env } from '../../config/env.js';

const groupBindTokens = new GroupBindTokenService({ redis });
const attendanceCorrectionTimers = new Map();
const ATTENDANCE_NOTIFY_DELAY_MS = 2 * 60 * 1000;
const ATTENDANCE_STATUS_LABELS = {
  present: '✅ keldi',
  late: '✅ kechikib keldi',
  absent: '❌ kelmadi',
  excused: '❌ sababli kelmadi',
};

function scheduleAttendanceCorrectionNotify(branchId, groupId, lessonDate) {
  const key = `${groupId}:${lessonDate}`;
  clearTimeout(attendanceCorrectionTimers.get(key));
  const timer = setTimeout(async () => {
    attendanceCorrectionTimers.delete(key);
    try {
      const finalRows = await getGroupAttendance(branchId, groupId, lessonDate);
      const lines = finalRows.map((r) =>
        `${ATTENDANCE_STATUS_LABELS[r.status] || '❌ belgilanmagan'} — ${r.studentName}`).join('\n');
      await sendToGroupParentChat(groupId, `<b>📋 Davomat o'zgartirildi — ${lessonDate}</b>\n\n${lines}`);
    } catch {
      // Attendance stays saved even when Telegram is temporarily unavailable.
    }
  }, ATTENDANCE_NOTIFY_DELAY_MS);
  timer.unref?.();
  attendanceCorrectionTimers.set(key, timer);
}

const hash = (pwd) => argon2.hash(pwd, { type: argon2.argon2id });

// ==================== ДАШБОРД ====================

export async function dashboard(branchId) {
  const d = await repo.branchDashboard(branchId);
  const revenueTotal = Number(d.revenue_total);
  const expensesTotal = Number(d.expenses_total);
  const revenueMonth = Number(d.revenue_month);
  const expensesMonth = Number(d.expenses_month);
  return {
    totals: {
      revenue: revenueTotal,
      expenses: expensesTotal,
      profit: revenueTotal - expensesTotal,
      outstandingDebt: Number(d.outstanding_debt),
      activeStudents: Number(d.active_students),
      groups: Number(d.groups),
      overdueInvoices: Number(d.overdue_invoices),
      currency: 'UZS',
    },
    thisMonth: {
      revenue: revenueMonth,
      expenses: expensesMonth,
      profit: revenueMonth - expensesMonth,
      newStudents: Number(d.new_students_month),
      droppedStudents: Number(d.dropped_students_month),
      netStudents: Number(d.new_students_month) - Number(d.dropped_students_month),
    },
  };
}

// ==================== РАСХОДЫ ====================

export async function createExpense(scope, actorId, body) {
  const row = await repo.insertExpense({
    orgId: scope.organizationId,
    branchId: scope.branchId,
    category: body.category,
    amount: body.amount,
    spentAt: body.spentAt,
    note: body.note,
    createdBy: actorId,
  });
  return mapExpense(row);
}

export async function listExpenses(branchId, query) {
  const { page, limit, offset } = parsePagination(query);
  const filter = { branchId, from: query.from, to: query.to };
  const [rows, total] = await Promise.all([
    repo.listExpenses({ ...filter, limit, offset }),
    repo.countExpenses(filter),
  ]);
  return {
    expenses: rows.map((e) => ({
      ...mapExpense(e),
      createdBy: `${e.created_by_first} ${e.created_by_last}`,
    })),
    meta: buildPageMeta(total, page, limit),
  };
}

export async function updateExpense(branchId, id, body) {
  const row = await repo.updateExpense(id, branchId, body);
  if (!row) throw new AppError(404, 'Expense not found');
  return mapExpense(row);
}

export async function deleteExpense(branchId, id) {
  const row = await repo.softDeleteExpense(id, branchId);
  if (!row) throw new AppError(404, 'Expense not found');
}

function mapExpense(e) {
  return {
    id: e.id,
    category: e.category,
    amount: Number(e.amount),
    spentAt: e.spent_at,
    note: e.note,
    createdAt: e.created_at,
  };
}

// ==================== СТУДЕНТЫ ====================

const MAX_CODE_TRIES = 5;

/** Вставка code-юзера с ретраем логин-кода при коллизии; телефон-дубль → 409. */
async function insertCodeUserWithCode(client, base) {
  for (let attempt = 0; attempt < MAX_CODE_TRIES; attempt += 1) {
    const loginCode = genLoginCode(8);
    try {
      const row = await repo.insertCodeUser({ ...base, loginCode }, client);
      return row;
    } catch (err) {
      if (err.code === '23505' && err.constraint === 'uq_users_login_code') continue; // коллизия кода → регенерим
      if (err.code === '23505' && err.constraint === 'uq_users_phone') {
        throw new AppError(409, 'Phone already in use');
      }
      throw err;
    }
  }
  throw new AppError(409, 'Could not generate a unique login code, retry');
}

export async function createStudent(scope, body) {
  const { organizationId: orgId, branchId } = scope;

  // если сразу в группу — проверяем принадлежность филиалу и что не архив
  if (body.groupId) {
    const group = await repo.findGroupInBranch(body.groupId, branchId);
    if (!group) throw new AppError(404, 'Group not found in your branch');
    if (group.is_archived) throw new AppError(409, 'Group is archived');
  }

  // Main Admin включает "кабинет родителя" организации отдельным тумблером
  // (parent_panel, см. auth.service.js:assertOrgAccessible). Karis 20.08.2026:
  // когда фича включена, родитель заводится ВСЕГДА вместе со студентом —
  // это не опциональная галочка админа, а обязательная часть формы (телефон
  // родителя всё равно нужен для QR/уведомлений). Когда фича выключена,
  // родителя не заводим вообще, даже если body.parent зачем-то пришёл —
  // otish iloji bolmasin: не просто прячем вход, физически не создаём.
  const parentPanelEnabled = await isFeatureEnabledForOrg(orgId, 'parent_panel');
  if (parentPanelEnabled && !body.parent) {
    throw new AppError(400, 'Parent name and phone are required — parent panel is enabled for your organization');
  }

  return withTransaction(async (client) => {
    let parentOut;
    let parentId = null;

    if (parentPanelEnabled && body.parent) {
      const parentPassword = genNumericPassword(6);
      const parentUser = await insertCodeUserWithCode(client, {
        orgId,
        branchId,
        role: 'parent',
        firstName: body.parent.firstName,
        lastName: body.parent.lastName,
        phone: body.parent.phone,
        passwordHash: await hash(parentPassword),
        passwordEncrypted: encryptPassword(parentPassword),
      });
      parentId = parentUser.id;
      parentOut = {
        id: parentUser.id,
        firstName: parentUser.first_name,
        lastName: parentUser.last_name,
        loginCode: parentUser.login_code,
        password: parentPassword,
      };
    }

    const studentPassword = genNumericPassword(6);
    const studentUser = await insertCodeUserWithCode(client, {
      orgId,
      branchId,
      role: 'student',
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      passwordHash: await hash(studentPassword),
    });

    await repo.insertStudentProfile(
      {
        userId: studentUser.id, branchId, parentId, birthDate: body.birthDate,
        gender: body.gender, address: body.address, school: body.school,
        leadSource: body.leadSource, hasLaptop: body.hasLaptop, offerSigned: body.offerSigned,
        passwordEncrypted: encryptPassword(studentPassword),
      },
      client,
    );

    if (body.groupId) {
      await repo.addStudentToGroupRaw({ groupId: body.groupId, studentId: studentUser.id }, client);
    }

    return {
      student: {
        id: studentUser.id,
        firstName: studentUser.first_name,
        lastName: studentUser.last_name,
        loginCode: studentUser.login_code,
        password: studentPassword,
      },
      parent: parentOut,
    };
  });
}

export async function listStudents(branchId, query) {
  const { page, limit, offset } = parsePagination(query);
  const filter = { branchId, search: query.search, groupId: query.groupId };
  const [rows, total] = await Promise.all([
    repo.listStudents({ ...filter, limit, offset }),
    repo.countStudents(filter),
  ]);
  return {
    students: rows.map((s) => ({
      id: s.id,
      firstName: s.first_name,
      lastName: s.last_name,
      phone: s.phone,
      status: s.status,
      loginCode: s.login_code,
      coinBalance: s.coin_balance,
      totalDebt: Number(s.total_debt),
      hasOverdueInvoice: Boolean(s.has_overdue_invoice),
      hasParent: Boolean(s.parent_id),
      groups: s.groups,
      createdAt: s.created_at,
    })),
    meta: buildPageMeta(total, page, limit),
  };
}

export async function studentDetail(branchId, id) {
  const s = await repo.findStudentInBranch(id, branchId);
  if (!s) throw new AppError(404, 'Student not found in your branch');
  const groups = await repo.studentGroups(id);
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
    parent: s.parent_id
      ? { id: s.parent_id, firstName: s.parent_first, lastName: s.parent_last, phone: s.parent_phone }
      : null,
    gender: s.gender,
    address: s.address,
    school: s.school,
    leadSource: s.lead_source,
    hasLaptop: s.has_laptop,
    offerSigned: s.offer_signed,
    createdAt: s.created_at,
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      subject: g.subject,
      monthlyPrice: Number(g.monthly_price),
      mentor: `${g.mentor_first} ${g.mentor_last}`,
    })),
  };
}

export async function updateStudent(branchId, id, body) {
  const exists = await repo.findStudentInBranch(id, branchId);
  if (!exists) throw new AppError(404, 'Student not found in your branch');

  return withTransaction(async (client) => {
    let updated = exists;
    const userFields = {};
    for (const k of ['firstName', 'lastName', 'phone']) {
      if (body[k] !== undefined) userFields[k] = body[k];
    }
    if (Object.keys(userFields).length) {
      try {
        updated = await repo.updateStudent(id, branchId, userFields, client);
      } catch (err) {
        if (err.code === '23505' && err.constraint === 'uq_users_phone') {
          throw new AppError(409, 'Phone already in use');
        }
        throw err;
      }
    }
    await repo.updateStudentProfile(id, {
      birthDate: body.birthDate, gender: body.gender, address: body.address, school: body.school,
      leadSource: body.leadSource, hasLaptop: body.hasLaptop, offerSigned: body.offerSigned,
    }, client);
    return {
      id: updated.id,
      firstName: updated.first_name,
      lastName: updated.last_name,
      phone: updated.phone,
      status: updated.status,
    };
  });
}

export async function setStudentFrozen(branchId, id, frozen, reason) {
  const row = await repo.setStudentFrozen(id, branchId, frozen, reason);
  if (!row) throw new AppError(404, 'Student not found in your branch');
  return { id: row.id, status: row.status };
}

/** Admin перевыдаёт пароль ученику (у code-ролей нет forgot-password). */
export async function regenerateStudentPassword(branchId, id) {
  const password = genNumericPassword(6);
  const row = await repo.setStudentPassword(id, branchId, await hash(password));
  if (!row) throw new AppError(404, 'Student not found in your branch');
  await repo.setStudentPasswordEncrypted(id, encryptPassword(password));
  return { id, password };
}

/** Логин+пароль студента для QR-модалки — расшифровываем на сервере, наружу
 * никогда не отдаём password_encrypted как есть. */
export async function getStudentCredentials(branchId, id) {
  const row = await repo.findStudentCredentials(id, branchId);
  if (!row) throw new AppError(404, 'Student not found in your branch');
  let password = null;
  if (row.password_encrypted) {
    try { password = decryptPassword(row.password_encrypted); }
    catch { password = null; } // JWT_ACCESS_SECRET сменился — старые записи не расшифровать, не 500
  }
  return { loginCode: row.login_code, password };
}

/** Родитель студента, проверенный на принадлежность филиалу admin'а — общий
 * помощник для всех parent-credential эндпоинтов ниже. */
async function resolveStudentParent(branchId, studentId) {
  const row = await repo.findStudentParentInBranch(studentId, branchId);
  if (!row) throw new AppError(404, 'Parent not found for this student in your branch');
  return row;
}

/** Admin перевыдаёт пароль родителю — тот же принцип, что и у студента (нет forgot-password). */
export async function regenerateParentPassword(branchId, studentId) {
  const parent = await resolveStudentParent(branchId, studentId);
  const password = genNumericPassword(6);
  await repo.setParentPassword(parent.id, await hash(password));
  await repo.setParentPasswordEncrypted(parent.id, encryptPassword(password));
  return { id: parent.id, password };
}

/** Логин+пароль родителя для QR-модалки — расшифровываем на сервере, наружу
 * password_encrypted как есть никогда не отдаём. */
export async function getParentCredentials(branchId, studentId) {
  const parent = await resolveStudentParent(branchId, studentId);
  let password = null;
  if (parent.password_encrypted) {
    try { password = decryptPassword(parent.password_encrypted); }
    catch { password = null; } // JWT_ACCESS_SECRET сменился — старые записи не расшифровать, не 500
  }
  return { loginCode: parent.login_code, password };
}

export async function createParentQrToken(branchId, studentId) {
  const parent = await resolveStudentParent(branchId, studentId);
  const token = await getOrCreateQrToken(parent.id);
  return { token };
}

/** Перевыпуск — старый QR (сфотканный/переданный) сразу перестаёт работать. */
export async function regenerateParentQrToken(branchId, studentId) {
  const parent = await resolveStudentParent(branchId, studentId);
  const token = await regenerateQrToken(parent.id);
  return { token };
}

/** Логин-код/пароль/QR всех активных студентов группы — раздаточный PDF для admin/branch_manager. */
export async function groupCredentials(branchId, groupId) {
  const group = await repo.findGroupInBranch(groupId, branchId);
  if (!group) throw new AppError(404, 'Group not found in your branch');

  const rows = await repo.groupStudentCredentials(groupId, branchId);
  const students = await Promise.all(rows.map(async (r) => {
    let password = null;
    if (r.password_encrypted) {
      try { password = decryptPassword(r.password_encrypted); }
      catch { password = null; }
    }
    const qrToken = r.qr_token || await getOrCreateQrToken(r.id);
    return {
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      loginCode: r.login_code,
      password,
      qrToken,
    };
  }));

  return {
    group: { id: group.id, name: group.name },
    mentor: { name: `${group.mentor_first} ${group.mentor_last}` },
    students,
  };
}

/** Мягкое удаление ученика + выход из всех групп. Причина — необязательная. */
export async function deleteStudent(branchId, id, reason) {
  return withTransaction(async (client) => {
    const row = await repo.softDeleteStudent(id, branchId, reason, client);
    if (!row) throw new AppError(404, 'Student not found in your branch');
    await repo.leaveAllGroups(id, client);
  });
}

const PERIOD_DAYS = { '7d': 7, '30d': 30, '90d': 90 };
const MONTHLY_MONTHS_BACK = 12;

/** Динамика прихода/оттока учеников филиала — «в этом месяце пришло N, ушло M,
 * чистый прирост N-M», тот же приём, что у super.service.js:studentsStats, только
 * по одному филиалу (Admin видит только свой) и с обеими сериями сразу. */
export async function studentsStats(branchId, period = '30d') {
  const isMonthly = period === '12m';
  const from = isMonthly
    ? new Date(new Date().getFullYear(), new Date().getMonth() - (MONTHLY_MONTHS_BACK - 1), 1)
    : new Date(Date.now() - (PERIOD_DAYS[period] ?? 30) * 24 * 60 * 60 * 1000);

  const [newSeries, droppedSeries] = await Promise.all([
    isMonthly ? repo.newStudentsSeriesMonthly(branchId, from) : repo.newStudentsSeriesDaily(branchId, from),
    isMonthly ? repo.droppedStudentsSeriesMonthly(branchId, from) : repo.droppedStudentsSeriesDaily(branchId, from),
  ]);

  const totalNew = newSeries.reduce((s, r) => s + Number(r.cnt), 0);
  const totalDropped = droppedSeries.reduce((s, r) => s + Number(r.cnt), 0);

  // Обе серии сводим по одной оси дат — точки, где было только одно из двух событий,
  // не должны выпасть молча (например, месяц без единого оттока).
  const byKey = new Map();
  for (const r of newSeries) {
    const key = String(r.month ?? r.day);
    byKey.set(key, { date: key, newCount: Number(r.cnt), droppedCount: 0 });
  }
  for (const r of droppedSeries) {
    const key = String(r.month ?? r.day);
    const point = byKey.get(key) ?? { date: key, newCount: 0, droppedCount: 0 };
    point.droppedCount = Number(r.cnt);
    byKey.set(key, point);
  }
  const series = [...byKey.values()]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((p) => ({ ...p, net: p.newCount - p.droppedCount }));

  return {
    period,
    branchId,
    totalNew,
    totalDropped,
    net: totalNew - totalDropped,
    series,
  };
}

// ==================== МЕНТОРЫ ====================

export async function createMentor(scope, body) {
  // password не пришёл от клиента — как у студента/родителя, генерируем сами
  // и возвращаем один раз, чтобы admin мог передать его ментору.
  const password = body.password || genNumericPassword(8);
  let row;
  try {
    row = await repo.insertMentor({
      orgId: scope.organizationId,
      branchId: scope.branchId,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      passwordHash: await hash(password),
    });
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'uq_users_email') {
      throw new AppError(409, 'Email already in use');
    }
    if (err.code === '23505' && err.constraint === 'uq_users_phone') {
      throw new AppError(409, 'Phone already in use');
    }
    throw err;
  }
  return { ...mapMentor(row), password: body.password ? undefined : password };
}

export async function listMentors(branchId) {
  const rows = await repo.listMentors(branchId);
  return {
    mentors: rows.map((m) => ({ ...mapMentor(m), groups: Number(m.groups), createdAt: m.created_at })),
  };
}

export async function setMentorFrozen(branchId, id, frozen) {
  const row = await repo.setMentorStatus(id, branchId, frozen ? 'frozen' : 'active');
  if (!row) throw new AppError(404, 'Mentor not found in your branch');
  return mapMentor(row);
}

/**
 * Обновление ментора админом. Поля лежат в двух таблицах: имя/телефон в
 * `users`, грейд в `mentor_profiles`. Обе записи в одной транзакции — иначе
 * при падении второго запроса ментор остался бы с новым именем и старым
 * уровнем, и понять это по ответу было бы нельзя.
 */
export async function updateMentor(branchId, id, body) {

  try {
    await withTransaction(async (client) => {
      // Принадлежность филиалу проверяем до записи: патч может состоять из
      // одного грейда, и тогда UPDATE по users со своим WHERE не выполнится,
      // а значит и чужого ментора никто бы не отсёк.
      const mentor = await repo.findMentorInBranch(id, branchId, client);
      if (!mentor) throw new AppError(404, 'Mentor not found in your branch');

      await repo.updateMentor(id, branchId, body, client);
    });
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'uq_users_phone') {
      throw new AppError(409, 'Phone already in use');
    }
    throw err;
  }

  const row = await repo.findMentorWithProfile(id, branchId);
  if (!row) throw new AppError(404, 'Mentor not found in your branch');
  return mapMentor(row);
}

/** Удалить ментора можно, только если он не ведёт активных групп. */
export async function deleteMentor(branchId, id) {
  const active = await repo.countMentorActiveGroups(id, branchId);
  if (active > 0) {
    throw new AppError(409, 'Mentor still leads active groups — reassign or archive them first');
  }
  const row = await repo.softDeleteMentor(id, branchId);
  if (!row) throw new AppError(404, 'Mentor not found in your branch');
}

function mapMentor(m) {
  return {
    id: m.id,
    firstName: m.first_name,
    lastName: m.last_name,
    email: m.email,
    phone: m.phone,
    status: m.status,
    // Карточка: у ментора, который её не заполнял, строки в mentor_profiles
    // нет вовсе — отдаём предсказуемые пустые значения, а не undefined.
    grade: m.grade ?? null,
    bio: m.bio ?? null,
    skills: m.skills ?? [],
    groups: m.groups !== undefined ? Number(m.groups) : undefined,
  };
}

// ==================== ГРУППЫ ====================

// start ("15:00") + длительность (мин) → end ("16:20"). Оборачивается на 24ч.
function addMinutes(hhmm, minutes) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// Вариант B: admin даёт дни + время начала, конец считает бэкенд из
// длительности урока организации (её задаёт CEO).
async function buildSchedule(branchId, days, startTime) {
  const durationMin = await repo.getOrgLessonDuration(branchId);
  const end = addMinutes(startTime, durationMin);
  return days.map((day) => ({ day, start: startTime, end }));
}

export async function createGroup(branchId, body) {
  const mentor = await repo.findMentorInBranch(body.mentorId, branchId);
  if (!mentor) throw new AppError(404, 'Mentor not found in your branch');

  let { subject, monthlyPrice } = body;
  if (body.trainingTypeId) {
    // Цену и название направления назначает только CEO (см. super.setTrainingTypePrice) —
    // клиенту не доверяем, даже если он прислал свои subject/monthlyPrice.
    const tt = await repo.findPricedTrainingType(body.trainingTypeId, branchId);
    if (!tt) throw new AppError(404, 'Training type not found or not priced yet');
    subject = tt.name;
    monthlyPrice = Number(tt.price);
  }

  if (body.roomId) {
    const room = await roomsRepo.findRoomInBranch(body.roomId, branchId);
    if (!room) throw new AppError(404, 'Room not found in your branch');
  }

  const schedule = await buildSchedule(branchId, body.days, body.startTime);
  const row = await repo.insertGroup({
    branchId,
    mentorId: body.mentorId,
    name: body.name,
    room: body.room,
    roomId: body.roomId,
    trainingTypeId: body.trainingTypeId,
    subject,
    monthlyPrice,
    schedule,
  });
  return mapGroup(row);
}

/** Кабинеты + активные группы с расписанием — сетка "Расписание" (rooms × дни/время). */
export async function schedule(branchId) {
  const [rooms, groups] = await Promise.all([
    roomsRepo.listRoomsByBranch(branchId),
    repo.listGroupsForSchedule(branchId),
  ]);
  return {
    rooms: rooms.map((r) => ({ id: r.id, name: r.name, capacity: r.capacity })),
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      subject: g.subject,
      schedule: g.schedule ?? [],
      roomId: g.room_id,
      roomName: g.room_name,
      studentCount: Number(g.student_count),
      createdAt: g.created_at,
      mentor: { id: g.mentor_id, name: `${g.mentor_first} ${g.mentor_last}` },
    })),
  };
}

/** Постоянный QR-токен студента — только для своего филиала (та же проверка,
 * что и у остальных student-эндпоинтов). Один и тот же токен при повторных
 * открытиях модалки, пока admin не перевыпустит его явно. */
export async function createStudentQrToken(branchId, studentId) {
  const s = await repo.findStudentInBranch(studentId, branchId);
  if (!s) throw new AppError(404, 'Student not found in your branch');
  const token = await getOrCreateQrToken(studentId);
  return { token };
}

/** Перевыпуск — старый QR (сфотканный/переданный) сразу перестаёт работать. */
export async function regenerateStudentQrToken(branchId, studentId) {
  const s = await repo.findStudentInBranch(studentId, branchId);
  if (!s) throw new AppError(404, 'Student not found in your branch');
  const token = await regenerateQrToken(studentId);
  return { token };
}

export async function studentTelegramStatus(branchId, studentId) {
  const row = await repo.studentTelegramBindings(studentId, branchId);
  if (!row) throw new AppError(404, 'Student not found in your branch');
  return {
    student: { linked: row.student_linked, username: row.student_tg_username, firstName: row.student_tg_first_name },
    parent: row.parent_id
      ? { linked: row.parent_linked, username: row.parent_tg_username, firstName: row.parent_tg_first_name }
      : null,
  };
}

/** Синхронно проверяем привязку до постановки в очередь — иначе admin не узнает,
 * что сообщение уйти некому (BullMQ-джоба асинхронна и результат не возвращает). */
export async function sendStudentTelegramMessage(branchId, studentId, { text, toParent }) {
  const status = await studentTelegramStatus(branchId, studentId);
  const target = toParent ? status.parent : status.student;
  if (!target?.linked) {
    throw new AppError(409, toParent ? 'Родитель не привязан к Telegram' : 'Студент не привязан к Telegram');
  }
  await notificationQueue.add('admin.message', { studentId, text, toParent: Boolean(toParent) });
}

export async function studentAttendance(branchId, studentId, query) {
  const to = query.to ?? new Date();
  const from = query.from ?? new Date(new Date(to).setDate(new Date(to).getDate() - 30));
  const rows = await repo.studentAttendance(studentId, branchId, from, to);
  return {
    days: rows.map((r) => ({
      date: r.lesson_date,
      status: r.status,
      groupId: r.group_id,
      groupName: r.group_name,
    })),
  };
}

export async function listTrainingTypes(branchId) {
  const rows = await repo.listPricedTrainingTypes(branchId);
  return rows.map((tt) => ({
    id: tt.id,
    name: tt.name,
    icon: tt.icon,
    price: Number(tt.price),
    maxStudents: tt.max_students,
  }));
}

export async function getSettings(branchId) {
  return { lessonDurationMin: await repo.getOrgLessonDuration(branchId) };
}

export async function listGroups(branchId, query) {
  const { page, limit, offset } = parsePagination(query);
  const [rows, total] = await Promise.all([
    repo.listGroups({ branchId, limit, offset }),
    repo.countGroups({ branchId }),
  ]);
  return {
    groups: rows.map((g) => ({
      id: g.id,
      name: g.name,
      subject: g.subject,
      trainingTypeId: g.training_type_id,
      monthlyPrice: Number(g.monthly_price),
      room: g.room,
      roomId: g.room_id,
      roomName: g.room_name,
      isArchived: g.is_archived,
      students: Number(g.students),
      mentor: { id: g.mentor_id, name: `${g.mentor_first} ${g.mentor_last}` },
      createdAt: g.created_at,
    })),
    meta: buildPageMeta(total, page, limit),
  };
}

export async function groupDetail(branchId, id) {
  const g = await repo.findGroupInBranch(id, branchId);
  if (!g) throw new AppError(404, 'Group not found in your branch');
  const students = await repo.groupStudents(id);
  return {
    ...mapGroup(g),
    mentor: { id: g.mentor_id, name: `${g.mentor_first} ${g.mentor_last}` },
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

export async function updateGroup(branchId, id, body) {
  const group = await repo.findGroupInBranch(id, branchId);
  if (!group) throw new AppError(404, 'Group not found in your branch');
  if (body.mentorId !== undefined) {
    const mentor = await repo.findMentorInBranch(body.mentorId, branchId);
    if (!mentor) throw new AppError(404, 'Mentor not found in your branch');
  }
  const { days, startTime, ...patch } = body;
  if (patch.trainingTypeId !== undefined) {
    const tt = await repo.findPricedTrainingType(patch.trainingTypeId, branchId);
    if (!tt) throw new AppError(404, 'Training type not found or not priced yet');
    patch.subject = tt.name;
    patch.monthlyPrice = Number(tt.price);
  }
  if (patch.roomId) {
    const room = await roomsRepo.findRoomInBranch(patch.roomId, branchId);
    if (!room) throw new AppError(404, 'Room not found in your branch');
  }
  if (days !== undefined && startTime !== undefined) {
    patch.schedule = await buildSchedule(branchId, days, startTime);
  }
  const row = await repo.updateGroup(id, branchId, patch);
  return mapGroup(row);
}

export async function setGroupArchived(branchId, id, archived) {
  const row = await repo.setGroupArchived(id, branchId, archived);
  if (!row) throw new AppError(404, 'Group not found in your branch');
  return mapGroup(row);
}

export async function addGroupStudent(branchId, groupId, studentId) {
  const group = await repo.findGroupInBranch(groupId, branchId);
  if (!group) throw new AppError(404, 'Group not found in your branch');
  if (group.is_archived) throw new AppError(409, 'Group is archived');
  const student = await repo.findStudentInBranch(studentId, branchId);
  if (!student) throw new AppError(404, 'Student not found in your branch');
  await repo.addStudentToGroupRaw({ groupId, studentId });
  const invoice = await createProratedInvoice({ branchId, groupId, studentId });
  return { groupId, studentId, invoice: invoice ? {
    id: invoice.id, amount: Number(invoice.total_amount), paidAmount: Number(invoice.paid_amount),
    lessonsInMonth: invoice.lessons_in_month, billableLessons: invoice.billable_lessons,
    paymentDate: invoice.payment_date, dueDate: invoice.due_date,
  } : null };
}

export async function removeGroupStudent(branchId, groupId, studentId) {
  const group = await repo.findGroupInBranch(groupId, branchId);
  if (!group) throw new AppError(404, 'Group not found in your branch');
  const row = await repo.removeStudentFromGroup(groupId, studentId);
  if (!row) throw new AppError(404, 'Student is not an active member of this group');
}

function mapGroup(g) {
  const schedule = g.schedule ?? [];
  return {
    id: g.id,
    name: g.name,
    subject: g.subject,
    trainingTypeId: g.training_type_id,
    monthlyPrice: Number(g.monthly_price),
    schedule,
    // производные поля для фронта: дни группы + единое время начала/конца
    days: schedule.map((s) => s.day),
    startTime: schedule[0]?.start ?? null,
    endTime: schedule[0]?.end ?? null,
    room: g.room,
    roomId: g.room_id,
    roomName: g.room_name,
    isArchived: g.is_archived,
    createdAt: g.created_at,
  };
}

// ==================== РАБОЧЕЕ ПРОСТРАНСТВО ГРУППЫ ====================

const TZ = 'Asia/Tashkent';
// en-CA даёт ровно YYYY-MM-DD — тот же формат, в котором приходит lessonDate.
const todayLocal = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });

const fullName = (first, last) => `${first ?? ''} ${last ?? ''}`.trim();

/** Группа строго в филиале админа — общий guard для всех операций рабочего пространства. */
async function requireGroup(branchId, groupId) {
  const group = await repo.findGroupInBranch(groupId, branchId);
  if (!group) throw new AppError(404, 'Group not found in your branch');
  return group;
}

// -------- davomat --------

/**
 * Полный ростер группы на дату урока: каждый активный ученик + его статус
 * (null, если не отмечен). Именно ростер, а не только отмеченные строки, — иначе
 * в свежий день журнал был бы пустым и отмечать было бы некого.
 */
// Роли, чья отметка считается «исправлением администратора»: всё, что выше
// ментора. Клетка с такой отметкой сохраняет цвет статуса, но помечается как
// поправленная админом — это видят и ментор, и админ.
const ADMIN_MARK_ROLES = new Set(['admin', 'ceo', 'main_admin']);

export async function getGroupAttendance(branchId, groupId, date) {
  await requireGroup(branchId, groupId);
  const [students, marks] = await Promise.all([
    repo.groupStudents(groupId),
    attendanceRepo.findByGroupAndDate(groupId, date),
  ]);
  const byStudent = new Map(marks.map((m) => [m.student_id, m]));
  return students.map((s) => {
    const m = byStudent.get(s.id);
    const correctedByAdmin = !!m && ADMIN_MARK_ROLES.has(m.marked_by_role);
    return {
      id: m?.id ?? null,
      studentId: s.id,
      studentName: fullName(s.first_name, s.last_name),
      status: m?.status ?? null,
      correctedByAdmin,
      markedByName: m?.marked_by_first_name
        ? fullName(m.marked_by_first_name, m.marked_by_last_name)
        : null,
    };
  });
}

/**
 * Отметить/снять davomat группы на дату урока. Ученики с непустым статусом —
 * upsert, с null — снятие отметки (см. attendanceRepo.deleteMarks). Админ вправе
 * править журнал за прошлые уроки (корректировка), но не за будущий: отмечать
 * посещаемость ещё не состоявшегося занятия нельзя.
 */
export async function markGroupAttendance(branchId, groupId, adminId, { lessonDate, records }) {
  if (lessonDate > todayLocal()) {
    throw new AppError(422, 'Cannot mark attendance for a future lesson');
  }
  const group = await requireGroup(branchId, groupId);

  const toUpsert = records.filter((r) => r.status);
  const toClear = records.filter((r) => !r.status).map((r) => r.studentId);

  if (toUpsert.length > 0) {
    await attendanceRepo.upsertMany({
      branchId,
      groupId,
      markedBy: adminId,
      lessonDate,
      records: toUpsert.map((r) => ({ studentId: r.studentId, status: r.status, comment: null })),
    });
  }
  if (toClear.length > 0) {
    await attendanceRepo.deleteMarks(groupId, lessonDate, toClear);
  }

  const result = await getGroupAttendance(branchId, groupId, lessonDate);

  // Живое обновление журнала: если у ментора этой группы открыта вкладка
  // davomat, правка админа появляется у него сразу (с пометкой «исправлено
  // администратором»), а не после перезагрузки. Событие то же, что шлёт
  // ментор — обе панели слушают attendanceRoom(groupId). `byAdmin` говорит
  // клиенту пометить эти клетки как исправленные админом; `records` в форме,
  // которую панель ментора применяет к таблице напрямую (student_id + status,
  // status=null у снятых отметок).
  emitTo(attendanceRoom(groupId), 'attendance:updated', {
    groupId,
    lessonDate,
    markedBy: adminId,
    byAdmin: true,
    records: records.map((r) => ({ student_id: r.studentId, status: r.status ?? null })),
  });

  // Autosave calls this endpoint repeatedly. Send one final roster two minutes
  // after the last Admin/Branch Manager edit instead of one message per student.
  scheduleAttendanceCorrectionNotify(branchId, groupId, lessonDate);

  return result;
}

export async function groupTelegramStatus(branchId, groupId) {
  await requireGroup(branchId, groupId);
  const { rows: [row] } = await pool.query(
    'SELECT parent_tg_chat_id, parent_tg_bound_at, parent_tg_title FROM groups WHERE id = $1', [groupId],
  );
  return { configured: Boolean(env.TELEGRAM_BOT_USERNAME), linked: Boolean(row?.parent_tg_chat_id),
    title: row?.parent_tg_title ?? null, boundAt: row?.parent_tg_bound_at ?? null };
}

export async function createGroupTelegramBindToken(branchId, groupId) {
  await requireGroup(branchId, groupId);
  if (!env.TELEGRAM_BOT_USERNAME) throw new AppError(503, 'Telegram is not configured on this server');
  return { ...(await groupBindTokens.create(groupId)), botUsername: env.TELEGRAM_BOT_USERNAME };
}

export async function unlinkGroupTelegram(branchId, groupId) {
  await requireGroup(branchId, groupId);
  const { rowCount } = await pool.query(
    `UPDATE groups SET parent_tg_chat_id = NULL, parent_tg_bound_at = NULL, parent_tg_title = NULL
      WHERE id = $1 AND branch_id = $2`, [groupId, branchId],
  );
  return { unlinked: rowCount > 0 };
}

// -------- ДЗ --------

function mapHomework(h, totalStudents) {
  const submissions = Number(h.submissions_count ?? 0);
  const graded = Number(h.graded_count ?? 0);
  const overdue = h.deadline && new Date(h.deadline) < new Date();
  let status = 'active';
  if (totalStudents > 0 && graded >= totalStudents) status = 'completed';
  else if (overdue) status = 'overdue';
  return {
    id: h.id,
    title: h.title,
    description: h.description ?? null,
    dueDate: h.deadline ? new Date(h.deadline).toISOString().slice(0, 10) : null,
    status,
    submissions,
    totalStudents,
  };
}

export async function listGroupHomework(branchId, groupId) {
  await requireGroup(branchId, groupId);
  const [rows, totalStudents] = await Promise.all([
    homeworkRepo.listHomeworkForGroup(groupId),
    repo.countActiveGroupStudents(groupId),
  ]);
  return rows.map((h) => mapHomework(h, totalStudents));
}

export async function createGroupHomework(branchId, groupId, adminId, body) {
  const group = await requireGroup(branchId, groupId);
  if (group.is_archived) throw new AppError(409, 'Group is archived');

  // deadline — NOT NULL в схеме. Форма админа даёт только дату (или ничего):
  // берём конец указанного дня, а без даты — срок через неделю.
  const deadline = body.dueDate
    ? new Date(`${body.dueDate}T23:59:59`)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const hw = await homeworkRepo.createHomework({
    branchId,
    groupId,
    createdBy: adminId,
    title: body.title,
    description: body.description,
    maxScore: 100,
    coinReward: 0,
    deadline,
  });

  const totalStudents = await repo.countActiveGroupStudents(groupId);
  return mapHomework({ ...hw, submissions_count: 0, graded_count: 0 }, totalStudents);
}

// -------- фикр-мулоҳоза --------

function mapFeedback(f) {
  return {
    id: f.id,
    type: f.type,
    authorName: f.author_name ?? null,
    content: f.content,
    rating: f.rating,
    createdAt: f.created_at,
  };
}

export async function listGroupFeedback(branchId, groupId) {
  await requireGroup(branchId, groupId);
  const rows = await repo.listGroupFeedback(groupId);
  return rows.map(mapFeedback);
}

export async function createGroupFeedback(branchId, groupId, adminId, body) {
  const group = await requireGroup(branchId, groupId);
  const row = await repo.insertGroupFeedback({
    branchId,
    groupId,
    type: body.type,
    authorName: body.authorName,
    content: body.content,
    rating: body.rating,
    createdBy: adminId,
  });
  return mapFeedback(row);
}

// ==================== ОБЪЯВЛЕНИЯ ====================

export async function createAnnouncement(branchId, body) {
  if (body.groupId) {
    const group = await repo.findGroupInBranch(body.groupId, branchId);
    if (!group) throw new AppError(404, 'Group not found in your branch');
  }

  const studentIds = await repo.listActiveStudentIds({ branchId, groupId: body.groupId ?? null });
  if (studentIds.length > 0) {
    await notificationQueue.add('announcement.created', {
      studentIds,
      title: body.title,
      message: body.message,
    });
  }

  return { recipients: studentIds.length };
}
