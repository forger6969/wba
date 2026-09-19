import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Receipt, Sparkles, CalendarDays, Wallet } from 'lucide-react';
import { fmt, money } from '../../format.js';
import PageHeader from '../../components/PageHeader.jsx';
import { Panel, Kpi } from '../mentor/_ui.jsx';
import { FinanceBars } from './_ui.jsx';
import { useBranchManagerReports } from '../../queries.js';

export default function BranchManagerReports() {
  const { t } = useTranslation();
  const [monthsCount, setMonthsCount] = useState(6);
  const { data, isLoading, error } = useBranchManagerReports(monthsCount);

  if (isLoading) {
    return (
      <div className="space-y-6 pb-8 animate-page-enter">
        <PageHeader title={t('branchManager.reports.title')} subtitle={t('branchManager.reports.loadingSubtitle')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-2xl bg-base-200/60 animate-pulse h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="rounded-2xl bg-base-200/60 animate-pulse h-64" />
          <div className="rounded-2xl bg-base-200/60 animate-pulse h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex flex-col items-center gap-3 text-error">
          <span className="text-4xl">⚠</span>
          <span className="text-lg font-semibold">{t('branchManager.reports.loadErrorMessage')}</span>
          <button
            className="btn btn-sm btn-error btn-outline mt-2"
            onClick={() => window.location.reload()}
          >
            {t('branchManager.reports.retry')}
          </button>
        </div>
      </div>
    );
  }

  const summary = data?.monthlySeries || [];
  const totals = data?.totals || {};

  const totalIncome = totals.totalIncome || 0;
  const totalExpenses = totals.totalExpenses || 0;
  const totalProfit = totals.totalProfit || 0;

  const maxMonth = [...summary].sort((a, b) => b.income - a.income)[0];
  const avgProfit = summary.length ? Math.round(totalProfit / summary.length) : 0;

  return (
    <div className="space-y-6 pb-8 animate-page-enter">
      <PageHeader
        title={t('branchManager.reports.title')}
        subtitle={t('branchManager.reports.subtitle', { count: monthsCount })}
      >
        <div className="join">
          {[3, 6, 12].map((n) => (
            <button
              key={n}
              onClick={() => setMonthsCount(n)}
              className={`btn btn-sm join-item ${monthsCount === n ? 'btn-primary' : 'btn-ghost border border-base-200'}`}
            >
              {t('branchManager.reports.monthsShort', { n })}
            </button>
          ))}
        </div>
      </PageHeader>

      {/* ── KPI ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi Icon={TrendingUp} title={t('branchManager.reports.kpiTotalIncome')} value={money(totalIncome)} unit={t('branchManager.reports.perMonths', { count: monthsCount })} tone="success" />
        <Kpi Icon={Receipt} title={t('branchManager.reports.kpiTotalExpenses')} value={money(totalExpenses)} unit={t('branchManager.reports.perMonths', { count: monthsCount })} tone="danger" />
        <Kpi Icon={Sparkles} title={t('branchManager.reports.kpiTotalProfit')} value={money(totalProfit)} unit={t('branchManager.reports.avgPerMonth', { amount: money(avgProfit) })} tone="neutral" />
        <Kpi
          Icon={Wallet}
          title={t('branchManager.reports.kpiMargin')}
          value={totalIncome > 0 ? `${Math.round((totalProfit / totalIncome) * 100)}%` : '—'}
          unit={t('branchManager.reports.marginUnit')}
          tone={totalProfit >= 0 ? 'success' : 'danger'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* ── График ── */}
        <Panel title={t('branchManager.reports.incomeVsExpenseTitle')} icon={CalendarDays} bodyClass="p-5">
          <FinanceBars months={summary} />
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-base-200 text-[11px] text-base-content/45">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-success/70" /> {t('branchManager.reports.income')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-error/60" /> {t('branchManager.reports.expense')}
            </span>
          </div>
        </Panel>

        {/* ── Лучший месяц ── */}
        <Panel title={t('branchManager.reports.bestMonthTitle')} icon={TrendingUp} bodyClass="p-5">
          {maxMonth ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">{maxMonth.label}</span>
                <span className="badge badge-success badge-sm">{t('branchManager.reports.highestIncomeBadge')}</span>
              </div>
              <dl className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-base-200 p-3">
                  <dt className="text-[11px] text-base-content/45">{t('branchManager.reports.income')}</dt>
                  <dd className="font-extrabold tabular-nums text-success">{money(maxMonth.income)}</dd>
                </div>
                <div className="rounded-xl border border-base-200 p-3">
                  <dt className="text-[11px] text-base-content/45">{t('branchManager.reports.expense')}</dt>
                  <dd className="font-extrabold tabular-nums">{money(maxMonth.expenses)}</dd>
                </div>
                <div className="rounded-xl border border-base-200 p-3">
                  <dt className="text-[11px] text-base-content/45">{t('branchManager.reports.profit')}</dt>
                  <dd className="font-extrabold tabular-nums text-primary">{money(maxMonth.profit)}</dd>
                </div>
              </dl>
              <div className="text-[12px] text-base-content/45">
                {t('branchManager.reports.paymentsReceived', { count: maxMonth.payments })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-base-content/45">
              <TrendingUp size={32} className="mb-2 opacity-40" />
              <p className="text-[13px]">{t('branchManager.reports.noDataForPeriod')}</p>
            </div>
          )}
        </Panel>
      </div>

      {/* ── Ежемесячная таблица ── */}
      <Panel title={t('branchManager.reports.monthlyReportTitle')} icon={CalendarDays} bodyClass="p-0">
        {summary.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-base-content/45">
            <CalendarDays size={32} className="mb-2 opacity-40" />
            <p className="text-[13px]">{t('branchManager.reports.noDataForPeriod')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-base-content/45">
                  <th className="pl-5">{t('branchManager.reports.colMonth')}</th>
                  <th className="text-right">{t('branchManager.reports.colIncome')}</th>
                  <th className="text-right">{t('branchManager.reports.colExpense')}</th>
                  <th className="text-right">{t('branchManager.reports.colProfit')}</th>
                  <th className="pr-5 text-right">{t('branchManager.reports.colPayments')}</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((m) => (
                  <tr key={m.month || m.key} className="hover:bg-base-200/50 transition-colors">
                    <td className="pl-5 text-[13px] font-semibold">{m.label}</td>
                    <td className="text-right text-[13px] font-semibold tabular-nums text-success">{money(m.income)}</td>
                    <td className="text-right text-[13px] tabular-nums">{money(m.expenses)}</td>
                    <td className={`text-right text-[13px] font-bold tabular-nums ${m.profit >= 0 ? 'text-primary' : 'text-error'}`}>
                      {money(m.profit)}
                    </td>
                    <td className="pr-5 text-right text-[13px] tabular-nums text-base-content/70">{fmt(m.payments)}</td>
                  </tr>
                ))}
              </tbody>
              {/* Итоги */}
              <tfoot>
                <tr className="border-t-2 border-base-200 font-bold">
                  <td className="pl-5 text-[12px] text-base-content/60">{t('branchManager.reports.total')}</td>
                  <td className="text-right text-[13px] tabular-nums text-success">{money(totalIncome)}</td>
                  <td className="text-right text-[13px] tabular-nums">{money(totalExpenses)}</td>
                  <td className={`text-right text-[13px] tabular-nums ${totalProfit >= 0 ? 'text-primary' : 'text-error'}`}>{money(totalProfit)}</td>
                  <td className="pr-5 text-right text-[13px] tabular-nums text-base-content/70">{fmt(totals.totalPayments || 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
