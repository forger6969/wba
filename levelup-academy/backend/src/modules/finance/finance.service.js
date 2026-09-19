import { parsePagination, buildPageMeta } from '../../utils/pagination.js';
import * as repo from './finance.repository.js';

export async function listBranches(orgId) {
  const rows = await repo.listBranches(orgId);
  return rows.map((b) => ({ id: b.id, name: b.name, isMain: b.is_main }));
}

/** period_month в БД — DATE (первое число месяца); 'YYYY-MM' с фронта приводим сюда. */
function toPeriodMonth(periodMonth) {
  return periodMonth ? `${periodMonth}-01` : null;
}

export async function listIncome(orgId, query) {
  const { page, limit, offset } = parsePagination(query);
  const filter = { orgId, branchId: query.branchId ?? null, from: query.from, to: query.to };
  const [rows, totals] = await Promise.all([
    repo.listIncome({ ...filter, limit, offset }),
    repo.incomeTotals(filter),
  ]);
  return {
    income: rows.map((r) => ({
      id: r.id,
      amount: Number(r.amount),
      method: r.method,
      createdAt: r.created_at,
      branchId: r.branch_id,
      branchName: r.branch_name,
      // invoice/студент может отсутствовать (прямой платёж без привязки) —
      // не выдумываем имя, просто null, фронт сам решает как показать.
      studentName: r.student_first ? `${r.student_first} ${r.student_last}` : null,
      groupName: r.group_name,
    })),
    total: Number(totals.total),
    meta: buildPageMeta(Number(totals.n), page, limit),
  };
}

/** Зарплаты пустые, если mentor_salaries пуст для периода — честно, без выдумки. */
export async function listSalaries(orgId, query) {
  const rows = await repo.listSalaries({
    orgId,
    branchId: query.branchId ?? null,
    periodMonth: toPeriodMonth(query.periodMonth),
  });
  const salaries = rows.map((s) => ({
    id: s.id,
    branchId: s.branch_id,
    branchName: s.branch_name,
    mentorName: `${s.first_name} ${s.last_name}`,
    periodMonth: s.period_month,
    baseAmount: Number(s.base_amount),
    bonusAmount: Number(s.bonus_amount),
    totalAmount: Number(s.total_amount),
    status: s.status,
  }));
  const total = salaries.reduce((sum, s) => sum + s.totalAmount, 0);
  return { salaries, total };
}
