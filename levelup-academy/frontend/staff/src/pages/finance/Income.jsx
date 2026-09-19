import { useState } from 'react';
import { Wallet, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '../../components/PageHeader.jsx';
import { money } from '../../format.js';
import { Metric, Card, BranchSelect, MonthSelect, monthOptions, monthRange, paymentMethodLabel } from './_ui.jsx';
import { useTranslation } from 'react-i18next';
import { useFinanceBranches, useFinanceIncome } from '../../queries.js';

export default function FinanceIncome() {
  const { t, i18n } = useTranslation(); const lang = i18n.language;
  const [branchId, setBranchId] = useState('all');
  const months = monthOptions(lang);
  const [monthKey, setMonthKey] = useState(months[0].key);
  const [page, setPage] = useState(1);

  const { data: branches } = useFinanceBranches();
  const { from, to } = monthRange(monthKey);
  const prevMonthKey = months[months.findIndex((m) => m.key === monthKey) + 1]?.key;
  const prevRange = prevMonthKey ? monthRange(prevMonthKey) : null;

  const params = { branchId: branchId === 'all' ? '' : branchId, from, to, page, limit: 20 };
  const { data, isLoading } = useFinanceIncome(params);
  // Предыдущий месяц — только для тренда, детальный список не нужен (limit=1
  // с точки зрения бэка не экономит much, но лишние 19 строк каждый раз
  // качать ради одного числа не нужно).
  const { data: prevData } = useFinanceIncome(
    prevRange ? { branchId: params.branchId, from: prevRange.from, to: prevRange.to, page: 1, limit: 1 } : null,
  );

  const total = data?.total ?? 0;
  const prevTotal = prevData?.total ?? null;
  // Рост от нуля/от "нет данных за прошлый месяц" не определён — не выдумываем 0%.
  const trend = prevTotal ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;

  const label = branchId === 'all'
    ? t('finance.common.allBranches')
    : (branches ?? []).find((b) => b.id === branchId)?.name ?? '';

  const rows = data?.income ?? [];
  const meta = data?.meta ?? { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-6 pb-8 animate-page-enter">
      <PageHeader title={t('finance.income.title')} subtitle={t('finance.income.subtitle')} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        <Metric
          Icon={Wallet}
          label={t('finance.kpi.income')}
          value={money(total)}
          sub={`${label} · ${months.find((m) => m.key === monthKey)?.label}`}
          tone="success"
          trend={trend ?? undefined}
          trendLabel={t('finance.common.vsPrev')}
        />
        <Metric
          Icon={TrendingUp}
          label={t('finance.common.total')}
          value={`${meta.total}`}
          sub={t('finance.income.tableTitle')}
          tone="info"
        />
      </div>

      <Card
        title={t('finance.income.tableTitle')}
        action={
          <div className="flex items-center gap-2">
            <BranchSelect
              value={branchId}
              onChange={(v) => { setBranchId(v); setPage(1); }}
              allLabel={t('finance.common.allBranches')}
              branches={branches ?? []}
            />
            <MonthSelect value={monthKey} onChange={(v) => { setMonthKey(v); setPage(1); }} months={months} />
          </div>
        }
        bodyClass="p-0"
      >
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-[12px] uppercase tracking-wider text-base-content/50">
                <th>{t('finance.common.date')}</th>
                {branchId === 'all' && <th>{t('finance.common.branch')}</th>}
                <th>{t('finance.income.student')}</th>
                <th>{t('finance.income.group')}</th>
                <th>{t('finance.common.method')}</th>
                <th className="text-right">{t('finance.common.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-6 text-base-content/50">{t('finance.common.loading')}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-6 text-base-content/50">{t('finance.common.noData')}</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="text-sm">
                  <td className="tabular-nums whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString()}</td>
                  {branchId === 'all' && <td className="text-base-content/70">{r.branchName}</td>}
                  <td className="font-medium">{r.studentName ?? '—'}</td>
                  <td className="text-base-content/70">{r.groupName ?? '—'}</td>
                  <td>{paymentMethodLabel(r.method, t)}</td>
                  <td className="text-right tabular-nums font-semibold text-success">{money(r.amount)}</td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t border-base-300 bg-base-200/50 font-bold text-sm">
                  <td colSpan={branchId === 'all' ? 5 : 4}>{t('finance.common.total')}</td>
                  <td className="text-right tabular-nums">{money(total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-base-200">
            <span className="text-xs text-base-content/50">{t('finance.common.page')} {meta.page} / {meta.totalPages}</span>
            <div className="flex gap-1.5">
              <button className="btn btn-ghost btn-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft size={14} />
              </button>
              <button className="btn btn-ghost btn-xs" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
