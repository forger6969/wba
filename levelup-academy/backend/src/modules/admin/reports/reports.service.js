import * as repo from './reports.repository.js';

export async function branchReport(branchId, { from, to }) {
  const [totals, byGroup] = await Promise.all([
    repo.branchTotals(branchId, { from, to }),
    repo.revenueDebtByGroup(branchId, { from, to }),
  ]);

  return {
    period: { from: from ?? null, to: to ?? null },
    totals: {
      revenue: Number(totals.revenue),
      debt: Number(totals.debt),
      currency: 'UZS',
    },
    byGroup: byGroup.map((g) => ({
      groupId: g.group_id,
      groupName: g.group_name,
      revenue: Number(g.revenue),
      debt: Number(g.debt),
      students: Number(g.students),
    })),
  };
}
