import { AppError } from '../../../utils/AppError.js';
import * as repo from './salary.repository.js';

// admin/ceo/main_admin видят зарплаты любого ментора своего филиала;
// сам ментор — только свою запись.
const PRIVILEGED_ROLES = new Set(['admin', 'ceo', 'main_admin']);

function assertAdmin(requester) {
  if (requester.role !== 'admin') {
    throw new AppError(403, 'Only admin can manage mentor salaries');
  }
}

/** GET /salary/mentors/:mentorId?year= */
export async function getMentorSalaries({ requester, mentorId, year }) {
  const isSelf = requester.role === 'mentor' && requester.id === mentorId;
  if (!isSelf && !PRIVILEGED_ROLES.has(requester.role)) {
    throw new AppError(403, 'Forbidden');
  }

  const rows = await repo.findByMentorAndYear(mentorId, year);

  if (requester.role === 'admin' && rows.some((r) => r.branch_id !== requester.branchId)) {
    throw new AppError(403, 'Mentor belongs to another branch');
  }

  return rows;
}

/**
 * GET /salary/mentors/:mentorId/suggestion?month=YYYY-MM — чистый decision-support
 * расчёт (groupRevenue = monthlyPrice × activeStudents), ничего не пишет в БД.
 *
 * Владение как в getMentorSalaries: ментор — только свою запись; admin — только
 * менторов своего филиала; ceo/main_admin — шире. Иначе чужая выручка утекает.
 */
export async function getSalarySuggestion({ requester, mentorId, month }) {
  const isSelf = requester.role === 'mentor' && requester.id === mentorId;
  if (!isSelf && !PRIVILEGED_ROLES.has(requester.role)) {
    throw new AppError(403, 'Forbidden');
  }
  if (requester.role === 'admin') {
    const mentorUser = await repo.findMentorUser(mentorId);
    if (!mentorUser || mentorUser.role !== 'mentor' || mentorUser.branch_id !== requester.branchId) {
      throw new AppError(404, 'Mentor not found'); // чужой филиал неотличим от несуществующего
    }
  }

  const periodStart = new Date(`${month}-01T00:00:00.000Z`);
  const periodEnd = new Date(periodStart);
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

  const groups = await repo.getGroupsSuggestion(mentorId, periodStart, periodEnd);

  const shaped = groups.map((g) => ({
    groupId: g.group_id,
    name: g.name,
    activeStudents: g.active_students,
    monthlyPrice: Number(g.monthly_price),
    groupRevenue: Number(g.monthly_price) * g.active_students,
  }));

  return {
    groups: shaped,
    totalStudents: shaped.reduce((sum, g) => sum + g.activeStudents, 0),
    totalRevenue: shaped.reduce((sum, g) => sum + g.groupRevenue, 0),
  };
}

/** POST /salary — upsert, admin only. */
export async function upsertSalary({ requester, mentorId, periodMonth, baseAmount, bonusAmount, note }) {
  assertAdmin(requester);

  const mentorUser = await repo.findMentorUser(mentorId);
  if (!mentorUser || mentorUser.role !== 'mentor') {
    throw new AppError(404, 'Mentor not found');
  }
  if (mentorUser.branch_id !== requester.branchId) {
    throw new AppError(403, 'Mentor belongs to another branch');
  }

  const row = await repo.upsert({
    organizationId: mentorUser.organization_id,
    branchId: mentorUser.branch_id,
    mentorId,
    periodMonth,
    baseAmount,
    bonusAmount,
    note,
    createdBy: requester.id,
  });
  if (!row) {
    throw new AppError(409, 'Salary record is already approved/paid and cannot be edited');
  }
  return row;
}

// Допустимые переходы статуса: paid → approved — осознанный откат ошибочной
// отметки о выплате (paid_at при этом очищается).
const STATUS_TRANSITIONS = {
  draft: ['approved'],
  approved: ['paid'],
  paid: ['approved'],
};

/** PATCH /salary/:id/status — admin only; paid_at живёт только в статусе 'paid'. */
export async function updateStatus({ requester, id, status }) {
  assertAdmin(requester);

  const record = await repo.findById(id);
  if (!record) throw new AppError(404, 'Salary record not found');
  if (record.branch_id !== requester.branchId) {
    throw new AppError(403, 'Salary record belongs to another branch');
  }
  if (!STATUS_TRANSITIONS[record.status]?.includes(status)) {
    throw new AppError(409, `Cannot transition salary from '${record.status}' to '${status}'`);
  }

  const paidAt = status === 'paid' ? new Date() : null;
  return repo.updateStatus(id, status, paidAt);
}
