import { Download, Wallet, TriangleAlert, Users, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PageHeader from '../../components/PageHeader.jsx';
import { money } from '../../format.js';
import { useSuperStats } from '../../queries.js';
import { Metric, Card, compactMoney, paymentMethodLabel } from './_ui.jsx';
import { useTranslation } from 'react-i18next';

export default function FinanceReports() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useSuperStats('30d');

  if (error) {
    return <button className="btn btn-error" onClick={() => refetch()}>{error.message}</button>;
  }
  if (isLoading || !data) return <div className="loading loading-spinner loading-lg" />;

  const totals = data.totals;
  const branches = data.branches || [];
  const chartData = branches.map((branch) => ({
    name: branch.name,
    revenue: Number(branch.revenue || 0),
    debt: Number(branch.debt || 0),
  }));
  const methods = (data.paymentMethods || []).map((row) => ({
    name: paymentMethodLabel(row.method, t),
    amount: Number(row.amount || 0),
  }));

  const handleExport = () => {
    const rows = [
      [t('finance.common.branch'), t('finance.common.students'), t('finance.reports.incomeLabel'), t('finance.reports.debtLabel')],
      ...branches.map((branch) => [branch.name, branch.students, branch.revenue, branch.debt]),
      [t('finance.reports.orgRow'), totals.activeStudents, totals.periodRevenue, totals.outstandingDebt],
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((value) => `"${value}"`).join(',')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `finance-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-8 animate-page-enter">
      <PageHeader title={t('finance.reports.title')} subtitle={t('finance.reports.subtitleLive')}>
        <button onClick={handleExport} className="btn btn-outline gap-2">
          <Download size={16} /> {t('finance.reports.export')}
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        <Metric Icon={Wallet} label={t('finance.reports.incomeLabel')} value={money(totals.periodRevenue)} tone="success" />
        <Metric Icon={TriangleAlert} label={t('finance.reports.debtLabel')} value={money(totals.outstandingDebt)} tone="warning" />
        <Metric Icon={Users} label={t('finance.reports.activeStudents')} value={totals.activeStudents} tone="info" />
        <Metric Icon={Building2} label={t('finance.dash.branches')} value={totals.branches} tone="neutral" />
      </div>

      <Card title={t('finance.reports.incomeDebtByBranch')} subtitle={t('finance.reports.last30days')} bodyClass="p-4 h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-300)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis width={64} tickFormatter={(value) => compactMoney(value)} />
            <Tooltip formatter={(value) => money(value)} />
            <Bar dataKey="revenue" name={t('finance.reports.incomeLabel')} fill="#16a34a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="debt" name={t('finance.reports.debtLabel')} fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
        <Card title={t('finance.reports.branchDetail')} className="xl:col-span-2" bodyClass="p-0">
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead><tr><th>{t('finance.common.branch')}</th><th>{t('finance.common.students')}</th><th className="text-right">{t('finance.reports.incomeLabel')}</th><th className="text-right">{t('finance.reports.debtLabel')}</th><th className="text-right">{t('finance.common.share')}</th></tr></thead>
              <tbody>
                {branches.map((branch) => (
                  <tr key={branch.id}>
                    <td className="font-medium">{branch.name}</td>
                    <td>{branch.students}</td>
                    <td className="text-right text-success tabular-nums">{money(branch.revenue)}</td>
                    <td className="text-right text-error tabular-nums">{money(branch.debt)}</td>
                    <td className="text-right">{Number(branch.share || 0).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={t('finance.reports.byMethod')} subtitle={t('finance.reports.methodsSubtitle')} bodyClass="p-4">
          {methods.length ? methods.map((method) => (
            <div key={method.name} className="flex justify-between gap-3 py-2 border-b border-base-200 last:border-0">
              <span>{method.name}</span><span className="font-bold tabular-nums">{money(method.amount)}</span>
            </div>
          )) : <p className="text-sm text-base-content/50">{t('finance.reports.noCompletedPayments')}</p>}
        </Card>
      </div>
    </div>
  );
}
