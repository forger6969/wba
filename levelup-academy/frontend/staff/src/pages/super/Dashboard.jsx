import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, GraduationCap, Users, Presentation, Wallet, TriangleAlert, RefreshCw } from 'lucide-react';
import { fmt } from '../../format.js';
import { useSuperDashboard } from '../../queries.js';
import PageHeader from '../../components/PageHeader.jsx';
import { SkeletonKpisStrict } from '../../components/Skeleton.jsx';
import {
  DashboardPanel,
  KpiCard,
  BranchesTable,
  AnalyticsCTA,
} from '../../components/ui.jsx';

export default function SuperDashboard() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useSuperDashboard();
  const navigate = useNavigate();

  if (error) {
    if (error.status === 401) {
      return <div className="alert alert-warning text-sm"><span>{t('super.common.sessionExpired')}</span></div>;
    }
    return (
      <div className="alert alert-error text-sm flex items-center justify-between">
        <span>{error.message}</span>
        <button className="btn btn-sm btn-ghost gap-1" onClick={() => refetch()}>
          <RefreshCw size={14} /> {t('super.common.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title={t('super.dash.title')} subtitle={t('super.dash.subtitle')} />

      {isLoading || !data ? (
        <SkeletonKpisStrict count={6} />
      ) : (
        <Loaded data={data} />
      )}
    </div>
  );
}

function Loaded({ data }) {
  const { t } = useTranslation();
  const totals = data.totals;
  const cur = totals.currency;
  const branches = data.branches || [];

  return (
    <>
      {/* KPI Grid — 6 карточек с stagger */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
        <KpiCard Icon={Building2} tone="info" label={t('super.dash.kpiBranches')} value={fmt(totals.branches)} unit={t('super.dash.unitTotal')} to="/branches" />
        <KpiCard Icon={GraduationCap} tone="primary" label={t('super.dash.kpiStudents')} value={fmt(totals.activeStudents)} unit={t('super.dash.unitActive')} to="/students" />
        <KpiCard Icon={Users} tone="success" label={t('super.dash.kpiAdmins')} value={fmt(totals.admins)} unit={t('super.dash.unitStaff')} to="/admins" />
        <KpiCard Icon={Presentation} tone="neutral" label={t('super.dash.kpiMentors')} value={fmt(totals.mentors)} unit={t('super.dash.unitTeachers')} to="/admins" />
        <KpiCard Icon={Wallet} tone="warning" label={t('super.dash.kpiRevenue')} value={fmt(totals.revenue)} unit={cur} to="/stats" />
        <KpiCard Icon={TriangleAlert} tone="danger" label={t('super.dash.kpiDebt')} value={fmt(totals.outstandingDebt)} unit={cur} to="/stats" />
      </div>

      {/* Филиалы — строгая таблица в панели */}
      <DashboardPanel title={t('super.dash.kpiBranches')} icon={Building2} bodyClass="p-0 mt-6" action={
        <Link to="/branches" className="text-sm font-medium text-[var(--primary)] hover:underline">{t('super.dash.allBranches')}</Link>
      }>
        <BranchesTable branches={branches} fmt={fmt} />
      </DashboardPanel>

      {/* CTA → Статистика */}
      <AnalyticsCTA onClick={() => navigate('/stats')} className="mt-6" />
    </>
  );
}
