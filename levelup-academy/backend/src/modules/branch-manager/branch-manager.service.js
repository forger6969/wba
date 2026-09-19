import * as adminService from '../admin/admin.service.js';
import * as repo from './branch-manager.repository.js';
import * as reportsRepo from '../admin/reports/reports.repository.js';
import { parsePagination, buildPageMeta } from '../../utils/pagination.js';
import { AppError } from '../../utils/AppError.js';
import { BranchBindTokenService } from '../telegram/branch-bind-token.service.js';
import { env } from '../../config/env.js';
import { redis } from '../../config/redis.js';

const branchBindTokens = new BranchBindTokenService({ redis });

export async function telegramGroupStatus(branchId) {
  const row = await repo.getTelegramGroupStatus(branchId);
  return {
    configured: Boolean(env.TELEGRAM_BOT_USERNAME),
    linked: Boolean(row?.parent_tg_chat_id),
    boundAt: row?.parent_tg_bound_at ?? null,
  };
}

/** Код вводится вручную командой /bindbranch <код> ПРЯМО В ГРУППЕ (не deep-link —
 * см. bot.handlers.js). botUsername нужен только чтобы подсказать в кабинете,
 * какого бота искать/добавлять в группу. */
export async function createTelegramBindToken(branchId) {
  if (!env.TELEGRAM_BOT_USERNAME) throw new AppError(503, 'Telegram is not configured on this server');
  const payload = await branchBindTokens.createForBranch(branchId);
  return { ...payload, botUsername: env.TELEGRAM_BOT_USERNAME };
}

export async function unlinkTelegramGroup(branchId) {
  const removed = await repo.unlinkTelegramGroup(branchId);
  return { unlinked: removed };
}

/**
 * Раньше просто проксировал adminService.dashboard(branchId), но тот отдаёт
 * { totals, thisMonth } — фронт (Dashboard.jsx) ждёт плоскую форму с самим
 * филиалом (branch.name/address/phone) и счётчиками верхнего уровня. Формы
 * разошлись изначально, поэтому дашборд был пуст даже при живых данных.
 */
export async function dashboard(branchId) {
  const [info, stats] = await Promise.all([
    repo.branchInfo(branchId),
    repo.branchStats(branchId),
  ]);
  if (!info) throw new AppError(404, 'Branch not found');

  return {
    branch: {
      name: info.name,
      address: info.address,
      phone: info.phone,
      // рабочих часов в схеме branches нет — колонки не существует
      workHours: null,
      isMain: info.is_main,
    },
    totalStudents: Number(stats?.students ?? 0),
    totalGroups: Number(stats?.groups ?? 0),
    totalMentors: Number(stats?.mentors ?? 0),
    outstandingDebt: Number(stats?.debt ?? 0),
  };
}

export async function branch(branchId) {
  const [info, stats] = await Promise.all([
    repo.branchInfo(branchId),
    repo.branchStats(branchId),
  ]);
  if (!info || !stats) throw new AppError(404, 'Branch not found');
  return {
    name: info.name,
    address: info.address,
    phone: info.phone,
    isMain: info.is_main,
    stats: {
      students: stats.students,
      mentors: stats.mentors,
      groups: stats.groups,
      admins: stats.admins,
      revenue: Number(stats.revenue),
      expenses: Number(stats.expenses),
      profit: Number(stats.revenue) - Number(stats.expenses),
      debt: Number(stats.debt),
      currency: 'UZS',
    },
  };
}

export async function income(branchId, query) {
  const month = query.month;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    throw new AppError(422, 'Invalid month format, expected YYYY-MM');
  }
  const { page, limit, offset } = parsePagination(query);
  const from = `${month}-01`;
  const to = new Date(new Date(from).getFullYear(), new Date(from).getMonth() + 1, 0);
  const toDate = to.toISOString().slice(0, 10);

  const [rows, total] = await Promise.all([
    repo.listBranchPayments(branchId, { from, to: toDate }),
    repo.countBranchPayments(branchId, { from, to: toDate }),
  ]);

  const payments = rows.map((inv) => ({
    id: inv.id,
    date: inv.created_at ? new Date(inv.created_at).toISOString().slice(0, 10) : '',
    student: `${inv.student_first ?? ''} ${inv.student_last ?? ''}`.trim() || '—',
    group: inv.group_name ?? null,
    amount: Number(inv.total_amount),
    method: inv.paid_amount > 0 ? 'Karta' : 'Naqd',
    status: inv.status === 'paid' ? 'paid' : inv.status === 'partially_paid' ? 'pending' : 'overdue',
  }));

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const paidCount = payments.filter((p) => p.status === 'paid').length;
  const overdueCount = payments.filter((p) => p.status === 'overdue').length;

  // qarzdorlik — filial bo'yicha umumiy (shu oyning to'lovlari emas), branch()
  // bilan bir xil manba, ikkalasi ham bitta haqiqiy raqamni ko'rsatishi kerak
  const stats = await repo.branchStats(branchId);

  return {
    payments,
    meta: buildPageMeta(total, page, limit),
    total: totalAmount,
    paidCount,
    overdueCount,
    debt: Number(stats?.debt ?? 0),
  };
}

/**
 * adminService.listExpenses ждёт query.from/to, а страница шлёт query.month
 * (тот же picker, что у income/reports) — конвертируем, иначе месяц-фильтр
 * молча не работал (from/to оставались undefined).
 */
export async function expenses(branchId, query) {
  const month = query.month;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    throw new AppError(422, 'Invalid month format, expected YYYY-MM');
  }
  const from = `${month}-01`;
  const to = new Date(new Date(from).getFullYear(), new Date(from).getMonth() + 1, 0);
  const toDate = to.toISOString().slice(0, 10);

  const result = await adminService.listExpenses(branchId, { ...query, from, to: toDate });
  const totalAmount = result.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  return { ...result, totalAmount };
}

/**
 * Раньше читал query.range ('3m'/'6m'/'12m'), а страница шлёт query.months
 * (число из переключателя «3 oy / 6 oy») — фильтр молча не работал, всегда
 * падал на дефолт 6. И `expenses` в ряду брался из branchTotals().debt
 * (непогашенный долг), а не из таблицы expenses — совсем другая цифра.
 */
export async function reports(branchId, query) {
  const monthsBack = Number(query.months) === 3 || Number(query.months) === 12
    ? Number(query.months)
    : 6;
  const now = new Date();
  const series = [];

  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1 + i, 1);
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('uz-UZ', { month: 'short', year: 'numeric' });
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const from = d.toISOString().slice(0, 10);
    const to = monthEnd.toISOString().slice(0, 10);

    const [totals, expenses, payments] = await Promise.all([
      reportsRepo.branchTotals(branchId, { from, to }),
      repo.monthExpenses(branchId, { from, to }),
      repo.monthPaymentsCount(branchId, { from, to }),
    ]);

    const revenue = Number(totals.revenue);
    series.push({
      key,
      label,
      income: revenue,
      expenses,
      profit: revenue - expenses,
      payments,
    });
  }

  const totals = series.reduce((acc, m) => ({
    totalIncome: acc.totalIncome + m.income,
    totalExpenses: acc.totalExpenses + m.expenses,
    totalProfit: acc.totalProfit + m.profit,
    totalPayments: acc.totalPayments + m.payments,
  }), { totalIncome: 0, totalExpenses: 0, totalProfit: 0, totalPayments: 0 });

  return { monthlySeries: series, totals };
}