import {
  Wallet, TriangleAlert, Users, Building2, TrendingUp,
} from 'lucide-react';
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/PageHeader.jsx';
import { money } from '../../format.js';
import { Metric, Card, compactMoney } from './_ui.jsx';
import { useTranslation } from 'react-i18next';
import { useSuperStats } from '../../queries.js';

const BRANCH_COLORS = ['#16a34a', '#f59e0b', '#0ea5e9'];
const LOCALE_OF = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };

export default function FinanceDashboard() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { data, isLoading, error, refetch } = useSuperStats('30d');

  if (error) return <button className="btn btn-error" onClick={() => refetch()}>{error.message}</button>;
  if (isLoading || !data) return <div className="loading loading-spinner loading-lg" />;

  const totals = data.totals;
  const chartData = (data.revenueSeries || []).map((row) => ({
    name: new Date(row.date).toLocaleDateString(LOCALE_OF[lang] || 'ru-RU', { day: '2-digit', month: '2-digit' }),
    income: Number(row.revenue || 0),
  }));

  const branchIncome = (data.branches || []).map((b) => ({
    name: b.name,
    value: Number(b.revenue || 0),
  })).filter((b) => b.value > 0);

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      <PageHeader title={t('finance.dash.title')} subtitle={t('finance.dash.subtitle')} />

      {/* ── KPI организации за текущий месяц ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        <Metric
          Icon={Wallet}
          label={t('finance.kpi.income')}
          value={money(totals.periodRevenue)}
          sub={t('finance.dash.days30Org')}
          tone="success"
        />
        <Metric
          Icon={TriangleAlert}
          label={t('kpi.debt')}
          value={money(totals.outstandingDebt)}
          tone="warning"
        />
        <Metric
          Icon={Users}
          label={t('kpi.students')}
          value={totals.activeStudents}
          tone="info"
        />
        <Metric
          Icon={Building2}
          label={t('finance.dash.branches')}
          value={totals.branches}
          tone="neutral"
        />
      </div>

      {/* ── Тренд по месяцам + доля филиалов ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
        <Card title={t('finance.dash.trendChart')} subtitle={t('finance.dash.chartSub')} className="xl:col-span-2" bodyClass="p-4 h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-300)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(v) => compactMoney(v).replace(' mln', 'M').replace(' ming', 'K')}
              />
              <Tooltip formatter={(v) => money(v)} labelStyle={{ fontWeight: 600 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" name={t('nav.income')} fill="#16a34a" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card title={t('finance.dash.branchShare')} bodyClass="p-4 h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={branchIncome} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3}>
                {branchIncome.map((_, i) => (
                  <Cell key={i} fill={BRANCH_COLORS[i % BRANCH_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => money(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Быстрые действия ── */}
      <div className="flex gap-3">
        <Link to="/finance/reports" className="btn btn-primary gap-2">
          <TrendingUp size={16} /> {t('finance.dash.viewReports')}
        </Link>
      </div>
    </div>
  );
}
