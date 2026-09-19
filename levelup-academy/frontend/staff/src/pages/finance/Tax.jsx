import { useState } from 'react';
import { Landmark, Coins, Percent, Receipt, Download } from 'lucide-react';
import PageHeader from '../../components/PageHeader.jsx';
import { money } from '../../format.js';
import { Metric, Card, MonthSelect } from './_ui.jsx';
import { useTranslation } from 'react-i18next';
// _data.js was removed when the finance pages moved to the real API (this
// page never followed and is not routed in App.jsx — dead code, left as-is).
import { BRANCHES, MONTHS, CURRENT_MONTH, monthRow, MONTH_LABEL, taxCalc } from './_data.js';

const rowFor = (b, mk) => {
  const r = monthRow(b.id, mk);
  if (!r) return null;
  return taxCalc(r, b);
};

const generateCSV = (monthKey, rows, totals) => {
  const header = ['Филиал', 'Доход', 'Расход', 'Зарплаты', 'Чистая прибыль', 'НДС 20%', 'Соцналог 10%', 'Оборотный 1.5%', 'Итого'];
  const data = rows.map(({ branch, tax }) => [
    branch.name,
    tax?.income ?? 0,
    tax?.expenses ?? 0,
    tax?.salaries ?? 0,
    tax?.net ?? 0,
    tax?.ndss ?? 0,
    tax?.soc_nalog ?? 0,
    tax?.otzyvnoy_nalog ?? 0,
    tax?.total ?? 0,
  ]);
  const totalRow = [
    'ОРГАНИЗАЦИЯ', totals.income, totals.expenses, totals.salaries, totals.net,
    totals.ndss, totals.soc_nalog, totals.otzyvnoy_nalog, totals.total,
  ];
  const csv = [header, ...data, totalRow].map((row) => row.map((v) => `"${v}"`).join(',')).join('\n');
  return '\uFEFF' + csv; // BOM for Excel
};

export default function FinanceTax() {
  const { t } = useTranslation();
  const [monthKey, setMonthKey] = useState(CURRENT_MONTH);

  const rows = BRANCHES.map((b) => ({ branch: b, tax: rowFor(b, monthKey) }));

  const totals = rows.reduce(
    (acc, { tax }) => tax ? {
      income: acc.income + tax.income,
      expenses: acc.expenses + tax.expenses,
      salaries: acc.salaries + tax.salaries,
      net: acc.net + tax.net,
      ndss: acc.ndss + tax.ndss,
      soc_nalog: acc.soc_nalog + tax.soc_nalog,
      otzyvnoy_nalog: acc.otzyvnoy_nalog + tax.otzyvnoy_nalog,
      total: acc.total + tax.total,
    } : acc,
    { income: 0, expenses: 0, salaries: 0, net: 0, ndss: 0, soc_nalog: 0, otzyvnoy_nalog: 0, total: 0 },
  );

  const handleExport = () => {
    const csv = generateCSV(monthKey, rows, totals);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finance-tax-${MONTH_LABEL[monthKey].replace(/\s+/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-8 animate-page-enter">
      <PageHeader title={t('tax.title')} subtitle={t('tax.subtitle')}>
        <div className="flex flex-wrap items-center gap-3">
          <MonthSelect value={monthKey} onChange={setMonthKey} months={MONTHS} />
          <button onClick={handleExport} className="btn btn-outline gap-2">
            <Download size={16} /> {t('tax.export')}
          </button>
        </div>
      </PageHeader>

      {/* ── Налоги организации за выбранный месяц ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Metric Icon={Landmark} label={t('finance.nav.taxNdss')} value={money(totals.ndss)} sub={MONTH_LABEL[monthKey]} tone="warning" />
        <Metric Icon={Coins} label={t('finance.nav.taxSocNalog')} value={money(totals.soc_nalog)} tone="info" />
        <Metric Icon={Percent} label={t('finance.nav.taxOtzyvnoyNalog')} value={money(totals.otzyvnoy_nalog)} tone="neutral" />
        <Metric Icon={Receipt} label={t('tax.due')} value={money(totals.total)} sub={`${t('finance.common.total')} · ${MONTH_LABEL[monthKey]}`} tone="success" />
      </div>

      {/* ── Начисление налогов по филиалам ── */}
      <Card title={`${t('tax.tableTitle')} · ${MONTH_LABEL[monthKey]}`} bodyClass="p-0">
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-[12px] uppercase tracking-wider text-base-content/50">
                <th>{t('finance.common.branch')}</th>
                <th className="text-right">{t('finance.nav.income')}</th>
                <th className="text-right">{t('finance.nav.expenses')}</th>
                <th className="text-right">{t('finance.nav.salaries')}</th>
                <th className="text-right">{t('tax.netProfit')}</th>
                <th className="text-right">{t('finance.nav.taxNdss')}</th>
                <th className="text-right">{t('finance.nav.taxSocNalog')}</th>
                <th className="text-right">{t('finance.nav.taxOtzyvnoyNalog')}</th>
                <th className="text-right">{t('finance.nav.taxTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ branch, tax }) => (
                <tr key={branch.id} className="text-sm">
                  <td className="font-medium">{branch.name}</td>
                  <td className="text-right tabular-nums text-success">{tax ? money(tax.income) : '—'}</td>
                  <td className="text-right tabular-nums text-warning">{tax ? money(tax.expenses) : '—'}</td>
                  <td className="text-right tabular-nums text-info">{tax ? money(tax.salaries) : '—'}</td>
                  <td className="text-right tabular-nums">{tax ? money(tax.net) : '—'}</td>
                  <td className="text-right tabular-nums">{tax ? money(tax.ndss) : '—'}</td>
                  <td className="text-right tabular-nums">{tax ? money(tax.soc_nalog) : '—'}</td>
                  <td className="text-right tabular-nums">{tax ? money(tax.otzyvnoy_nalog) : '—'}</td>
                  <td className="text-right tabular-nums font-bold text-error">{tax ? money(tax.total) : '—'}</td>
                </tr>
              ))}
              <tr className="border-t border-base-300 bg-base-200/50 font-bold text-sm">
                <td>{t('finance.nav.taxOrg')}</td>
                <td className="text-right tabular-nums text-success">{money(totals.income)}</td>
                <td className="text-right tabular-nums text-warning">{money(totals.expenses)}</td>
                <td className="text-right tabular-nums text-info">{money(totals.salaries)}</td>
                <td className="text-right tabular-nums">{money(totals.net)}</td>
                <td className="text-right tabular-nums">{money(totals.ndss)}</td>
                <td className="text-right tabular-nums">{money(totals.soc_nalog)}</td>
                <td className="text-right tabular-nums">{money(totals.otzyvnoy_nalog)}</td>
                <td className="text-right tabular-nums text-error">{money(totals.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
