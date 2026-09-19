import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Wallet, CheckCircle2, CalendarDays, CreditCard, Info, Plus } from 'lucide-react';
import { money } from '../../format.js';
import PageHeader from '../../components/PageHeader.jsx';
import { Panel, Kpi, SearchInput, EmptyState } from '../mentor/_ui.jsx';
import { PaymentStatusBadge } from './_ui.jsx';
import { useBranchManagerIncome } from '../../queries.js';

const LOCALE_OF = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };

/** Генерирует последние 6 месяцев в формате {key, label} */
function monthNamesFor(locale) {
  return Array.from({ length: 12 }, (_, i) => new Date(2024, i, 1).toLocaleDateString(locale, { month: 'long' }));
}

function generateMonths(count, locale) {
  const MONTH_NAMES = monthNamesFor(locale);
  const result = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    result.push({ key, label: MONTH_NAMES[d.getMonth()] });
  }
  return result;
}

export default function BranchManagerIncome() {
  const { t, i18n } = useTranslation();
  const locale = LOCALE_OF[i18n.language] || 'ru-RU';
  const MONTHS = useMemo(() => generateMonths(6, locale), [locale]);
  const [monthKey, setMonthKey] = useState(MONTHS[MONTHS.length - 1].key);
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useBranchManagerIncome(monthKey);

  const month = MONTHS.find((m) => m.key === monthKey) ?? MONTHS[MONTHS.length - 1];

  if (isLoading) {
    return (
      <div className="space-y-6 pb-8 animate-page-enter">
        <PageHeader title={t('branchManager.income.title')} subtitle={t('branchManager.income.loadingSubtitle')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-2xl bg-base-200/60 animate-pulse h-28" />
          ))}
        </div>
        <div className="rounded-2xl bg-base-200/60 animate-pulse h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex flex-col items-center gap-3 text-error">
          <span className="text-4xl">⚠</span>
          <span className="text-lg font-semibold">{t('branchManager.income.loadErrorMessage')}</span>
          <button
            className="btn btn-sm btn-error btn-outline mt-2"
            onClick={() => window.location.reload()}
          >
            {t('branchManager.income.retry')}
          </button>
        </div>
      </div>
    );
  }

  const allRows = data?.payments || [];
  const rows = search
    ? allRows.filter(p =>
        p.student?.toLowerCase().includes(search.toLowerCase()) ||
        p.group?.toLowerCase().includes(search.toLowerCase())
      )
    : allRows;
  const total = data?.total || 0;
  const paid = data?.paidCount || 0;
  const overdue = data?.overdueCount || 0;
  const debt = data?.debt || 0;

  return (
    <div className="space-y-6 pb-8 animate-page-enter">
      <PageHeader
        title={t('branchManager.income.title')}
        subtitle={t('branchManager.income.subtitle')}
      />

      {/* ── Подсказка: доход создаётся через «Платежи» ── */}
      <div className="alert bg-primary/5 border border-primary/15 rounded-2xl p-4">
        <Info size={20} className="text-primary shrink-0" />
        <div className="flex flex-1 flex-wrap items-center justify-between gap-2 min-w-0">
          <div>
            <p className="text-[13px] font-semibold">{t('branchManager.income.hintTitle')}</p>
            <p className="text-[12px] text-base-content/55">{t('branchManager.income.hintText')}</p>
          </div>
          <Link to="/payments" className="btn btn-sm btn-primary rounded-lg shrink-0">
            <Plus size={16} /> {t('branchManager.income.makePayment')}
          </Link>
        </div>
      </div>

      {/* ── Выбор месяца ── */}
      <div className="flex flex-wrap gap-2">
        {MONTHS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMonthKey(m.key)}
            className={`btn btn-sm rounded-lg transition-all ${
              m.key === monthKey
                ? 'btn-primary'
                : 'btn-ghost border border-base-200 text-base-content/60 hover:border-primary/40'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* ── KPI ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi Icon={TrendingUp} title={t('branchManager.income.kpiMonthRevenue')} value={money(total)} unit={`${month.label}`} tone="success" />
        <Kpi Icon={CheckCircle2} title={t('branchManager.income.kpiPaid')} value={paid} unit={t('branchManager.income.kpiPaidUnit', { count: allRows.length })} tone="neutral" />
        <Kpi Icon={Wallet} title={t('branchManager.income.kpiOverdue')} value={overdue} unit={t('branchManager.income.kpiOverdueUnit')} tone="danger" />
        <Kpi Icon={CalendarDays} title={t('branchManager.income.kpiTotalDebt')} value={money(debt)} unit={t('branchManager.income.kpiTotalDebtUnit')} tone="danger" />
      </div>

      {/* ── Таблица платежей ── */}
      <Panel title={t('branchManager.income.paymentsPanelTitle', { month: month.label })} icon={CreditCard} bodyClass="p-0">
        {/* Поиск */}
        {allRows.length > 0 && (
          <div className="px-5 pt-4 pb-2">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('branchManager.income.searchPlaceholder')}
              className="max-w-sm"
            />
          </div>
        )}

        {rows.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title={search ? t('branchManager.income.nothingFoundTitle') : t('branchManager.income.emptyMonthTitle')}
            hint={search
              ? t('branchManager.income.searchHint')
              : t('branchManager.income.emptyMonthHint')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-base-content/45">
                  <th className="pl-5">{t('branchManager.income.colDate')}</th>
                  <th>{t('branchManager.income.colStudent')}</th>
                  <th>{t('branchManager.income.colGroup')}</th>
                  <th className="hidden md:table-cell">{t('branchManager.income.colMethod')}</th>
                  <th className="text-right">{t('branchManager.income.colAmount')}</th>
                  <th className="pr-5 text-right">{t('branchManager.income.colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-base-200/50 transition-colors">
                    <td className="pl-5 text-[13px] text-base-content/60 tabular-nums whitespace-nowrap">
                      {new Date(p.date).toLocaleDateString(locale, { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="text-[13px] font-semibold">{p.student}</td>
                    <td className="text-[13px] text-base-content/70">{p.group}</td>
                    <td className="hidden md:table-cell text-[13px] text-base-content/60">{p.method}</td>
                    <td className="text-right text-[14px] font-extrabold tabular-nums">{money(p.amount)}</td>
                    <td className="pr-5 text-right"><PaymentStatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-base-200">
                  <td colSpan={4} className="pl-5 text-[12px] font-semibold text-base-content/60">{t('branchManager.income.total')}</td>
                  <td className="text-right text-[15px] font-extrabold tabular-nums text-success">{money(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
