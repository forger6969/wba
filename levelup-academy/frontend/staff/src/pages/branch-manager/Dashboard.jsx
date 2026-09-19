import { Link } from 'react-router-dom';
import {
  Wallet, TrendingUp, Receipt, Sparkles, MapPin, Phone, Clock,
  ChevronRight, CreditCard, Coins, CalendarDays, Building2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fmt, money } from '../../format.js';
import PageHeader from '../../components/PageHeader.jsx';
import { Panel, Kpi } from '../mentor/_ui.jsx';
import { FinanceBars, PaymentStatusBadge } from './_ui.jsx';
import { useBranchManagerDashboard, useBranchManagerIncome, useBranchManagerReports, useBranchManagerInfo } from '../../queries.js';

/** Текущий месяц в формате YYYY-MM */
function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function BranchManagerDashboard() {
  const { t } = useTranslation();
  const month = currentMonth();
  const dashQ = useBranchManagerDashboard();
  const incomeQ = useBranchManagerIncome(month);
  const reportsQ = useBranchManagerReports(6);
  const branchQ = useBranchManagerInfo();

  const dash = dashQ.data;
  const dashData = dash?.dashboard || dash;
  const income = incomeQ.data;
  const reports = reportsQ.data;
  const branchInfo = branchQ.data?.branch || branchQ.data;

  const cur = reports?.monthlySeries?.[reports.monthlySeries.length - 1];
  const prev = reports?.monthlySeries?.[reports.monthlySeries.length - 2] || cur;

  const trend = (key) => {
    if (!prev?.[key]) return 0;
    return Math.round(((cur?.[key] - prev[key]) / prev[key]) * 100);
  };

  const recent = income?.payments?.slice(0, 5) || [];

  const monthLabel = (key) => {
    if (!key) return '';
    const [y, m] = key.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString(undefined, { month: 'long' });
  };

  /* ── Состояние загрузки ── */
  if (dashQ.isLoading || incomeQ.isLoading || reportsQ.isLoading || branchQ.isLoading) {
    return (
      <div className="space-y-6 pb-8 animate-page-enter">
        <PageHeader title={t('dash.title')} subtitle={t('common.loading')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-2xl bg-base-200/60 animate-pulse h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-2xl bg-base-200/60 animate-pulse h-64" />
          <div className="rounded-2xl bg-base-200/60 animate-pulse h-64" />
        </div>
      </div>
    );
  }

  if (dashQ.error || incomeQ.error || reportsQ.error || branchQ.error) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex flex-col items-center gap-3 text-error">
          <span className="text-4xl">⚠</span>
          <span className="text-lg font-semibold">{t('common.error')}</span>
          <button
            className="btn btn-sm btn-error btn-outline mt-2"
            onClick={() => window.location.reload()}
          >
            {t('common.reload')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 animate-page-enter">
      <PageHeader
        title={t('dash.title')}
        subtitle={`${branchInfo?.name || t('common.branch')} · ${t('dash.bmSubtitle')}`}
      />

      {/* ── Финансовые KPI ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi
          Icon={TrendingUp}
          title={t('dash.incomeThisMonth')}
          value={money(cur?.income)}
          unit={`${monthLabel(month)}`}
          tone="success"
          trend={trend('income')}
          trendLabel={t('dash.vsPrevMonth')}
          to="/income"
        />
        <Kpi
          Icon={Receipt}
          title={t('dash.expensesThisMonth')}
          value={money(cur?.expenses)}
          unit={`${monthLabel(month)}`}
          tone="danger"
          trend={trend('expenses')}
          trendLabel={t('dash.vsPrevMonth')}
          to="/expenses"
        />
        <Kpi
          Icon={Sparkles}
          title={t('dash.profit')}
          value={money(cur?.profit)}
          unit={t('dash.profitFormula')}
          tone="neutral"
          trend={trend('profit')}
          trendLabel={t('dash.vsPrevMonth')}
          to="/reports"
        />
        <Kpi
          Icon={Wallet}
          title={t('kpi.debt')}
          value={money(dashData?.outstandingDebt || 0)}
          unit={t('dash.debtDesc')}
          tone="danger"
          to="/income"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Информация о филиале ── */}
        <Panel title={t('common.branch')} icon={Building2} bodyClass="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-bold text-[15px] text-base-content truncate">{branchInfo?.name || t('common.branch')}</h3>
              {branchInfo?.isMain && (
                <span className="inline-block mt-1 text-[10px] font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                  {t('dash.mainBranch')}
                </span>
              )}
            </div>
            <Link to="/branch" className="btn btn-ghost btn-xs gap-1 text-primary">
              {t('common.details')} <ChevronRight size={13} />
            </Link>
          </div>

          <div className="mt-4 space-y-2.5 text-[13px] text-base-content/70">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg grid place-items-center bg-primary/10 text-primary shrink-0">
                <MapPin size={14} />
              </span>
              <span className="truncate">{branchInfo?.address || t('dash.addressNotSet')}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg grid place-items-center bg-primary/10 text-primary shrink-0">
                <Phone size={14} />
              </span>
              <span>{branchInfo?.phone || t('dash.phoneNotSet')}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg grid place-items-center bg-primary/10 text-primary shrink-0">
                <Clock size={14} />
              </span>
              <span>{branchInfo?.workHours || t('dash.workHoursNotSet')}</span>
            </div>
          </div>

          {/* Краткая статистика */}
          <dl className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-base-200">
            <div>
              <dt className="text-[11px] text-base-content/45">{t('dash.activeStudents')}</dt>
              <dd className="font-bold tabular-nums">{fmt(dashData?.totalStudents || 0)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-base-content/45">{t('dash.groups')}</dt>
              <dd className="font-bold tabular-nums">{fmt(dashData?.totalGroups || 0)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-base-content/45">{t('dash.staff')}</dt>
              <dd className="font-bold tabular-nums">{fmt(dashData?.totalMentors || 0)}</dd>
            </div>
          </dl>
        </Panel>

        {/* ── Последние платежи ── */}
        <Panel title={t('dash.recentBranchPayments')} icon={CreditCard} bodyClass="p-4">
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-base-content/45">
              <CreditCard size={32} className="mb-2 opacity-40" />
              <p className="text-[13px]">{t('dash.noPaymentsYet')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((p) => (
                <Link
                  key={p.id}
                  to="/income"
                  className="flex items-center justify-between rounded-xl px-3.5 py-3 border border-base-200 hover:border-primary/40 hover:bg-primary/[0.03] transition-colors"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-lg grid place-items-center bg-success/10 text-success shrink-0">
                      <Coins size={14} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-base-content truncate">{p.student}</span>
                      <span className="block text-[11px] text-base-content/45 truncate">{p.group}</span>
                    </span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <PaymentStatusBadge status={p.status} />
                    <span className="text-[14px] font-extrabold tabular-nums text-success">{money(p.amount)}</span>
                    <ChevronRight size={15} className="text-base-content/30" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* ── 6-месячный финансовый график ── */}
      <Panel
        title={t('dash.last6Months')}
        icon={CalendarDays}
        bodyClass="p-5"
        action={
          <Link to="/reports" className="btn btn-ghost btn-xs gap-1 text-primary">
            {t('nav.reports')} <ChevronRight size={13} />
          </Link>
        }
      >
        <FinanceBars months={reports?.monthlySeries || []} />
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-base-200 text-[11px] text-base-content/45">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-success/70" /> {t('dash.income')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-error/60" /> {t('dash.expenses')}
          </span>
        </div>
      </Panel>
    </div>
  );
}

