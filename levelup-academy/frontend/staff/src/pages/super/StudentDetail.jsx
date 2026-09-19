import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Coins, Wallet, KeyRound, Phone, Cake, AlertTriangle, ArrowRight,
  BookOpen, Snowflake, Users2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fmt, money, dateShort, USER_STATUS } from '../../format.js';
import { useSuperStudentDetail } from '../../queries.js';
import PageHeader from '../../components/PageHeader.jsx';
import { SkeletonList } from '../../components/Skeleton.jsx';
import { phoneDisplay } from '../../components/PhoneInput.jsx';
import {
  Card, Metric, Panel, EmptyState, StatusBadge, Avatar,
} from './_ui.jsx';

const STATUS_CLS_TONE = { 'badge-success': 'success', 'badge-error': 'danger', 'badge-ghost': 'neutral' };

export default function SuperStudentDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useSuperStudentDetail(id);
  const s = data?.student;
  const fullName = s ? `${s.firstName} ${s.lastName}` : '';

  useEffect(() => {
    if (fullName) document.title = `${fullName} | ${t('super.studentDetail.breadcrumbStudents')} | LevelUp Academy`;
  }, [fullName, t]);

  if (error && error.status !== 401) {
    return (
      <div className="space-y-6">
        <Breadcrumbs name={t('super.studentDetail.error')} />
        <Card className="max-w-lg mx-auto mt-6">
          <EmptyState
            icon={AlertTriangle}
            title={t('super.studentDetail.loadErrorTitle')}
            hint={error.message || t('super.studentDetail.loadErrorHint')}
            action={<button className="btn btn-primary btn-sm px-6" onClick={() => refetch()}>{t('super.studentDetail.retry')}</button>}
          />
        </Card>
      </div>
    );
  }

  if (isLoading || !s) {
    return (<div><PageHeader title={t('super.studentDetail.studentFallback')} /><SkeletonList rows={8} /></div>);
  }

  return (
    <div className="space-y-5">
      <Breadcrumbs name={fullName} />

      <PageHeader title={fullName} subtitle={s.branchName || t('super.studentDetail.branchNotSpecified')}>
        <StatusBadge tone={STATUS_CLS_TONE[USER_STATUS(t)[s.status]?.cls] ?? 'neutral'}>
          {USER_STATUS(t)[s.status]?.label ?? s.status}
        </StatusBadge>
        {s.hasOverdueInvoice && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-error">
            <AlertTriangle size={13} /> {t('super.studentDetail.overdueInvoice')}
          </span>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="animate-scale-in stagger-1">
          <Metric Icon={Wallet} label={t('super.studentDetail.metaDebt')} value={money(s.totalDebt)} tone={s.totalDebt > 0 ? 'danger' : 'neutral'} />
        </div>
        <div className="animate-scale-in stagger-2">
          <Metric Icon={Coins} label={t('super.studentDetail.metaCoins')} value={fmt(s.coinBalance)} tone="warning" />
        </div>
        <div className="animate-scale-in stagger-3">
          <Metric Icon={BookOpen} label={t('super.studentDetail.metaGroups')} value={fmt(s.groups.length)} tone="info" />
        </div>
        <div className="animate-scale-in stagger-4">
          <Metric Icon={KeyRound} label={t('super.studentDetail.metaLoginCode')} value={s.loginCode || '—'} tone="neutral" />
        </div>
      </div>

      {s.status === 'frozen' && (
        <div className="alert alert-warning text-sm">
          <Snowflake size={16} />
          <span>{t('super.studentDetail.frozenLabel')}{s.frozenAt ? ` ${dateShort(s.frozenAt)}` : ''}{s.frozenReason ? ` — ${s.frozenReason}` : ''}</span>
        </div>
      )}

      <Panel title={t('super.studentDetail.contactsTitle')} icon={Phone}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm">
          <span className="flex items-center gap-2">
            <Phone size={14} className="text-base-content/40 shrink-0" />
            {s.phone ? phoneDisplay(s.phone) : t('super.studentDetail.phoneNotSpecified')}
          </span>
          <span className="flex items-center gap-2">
            <Cake size={14} className="text-base-content/40 shrink-0" />
            {s.birthDate ? dateShort(s.birthDate) : t('super.studentDetail.birthDateNotSpecified')}
          </span>
          <span className="flex items-center gap-2">
            <Users2 size={14} className="text-base-content/40 shrink-0" />
            {s.hasParent ? t('super.studentDetail.parentLinked') : t('super.studentDetail.parentNotLinked')}
          </span>
          <span className="text-xs text-base-content/40 ml-auto">
            {t('super.studentDetail.inSystemSince', { date: dateShort(s.createdAt) })}
          </span>
        </div>
      </Panel>

      <Panel title={t('super.studentDetail.studentGroupsTitle')} icon={BookOpen} bodyClass="p-0">
        {s.groups.length === 0 ? (
          <EmptyState icon={BookOpen} title={t('super.studentDetail.noGroups')} />
        ) : (
          <ul className="divide-y divide-base-200">
            {s.groups.map((g) => (
              <li
                key={g.id}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-base-200/50 transition-colors"
                onClick={() => navigate(`/groups/${g.id}`)}
              >
                <Avatar name={g.name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {g.name} {g.subject && <span className="text-base-content/40 font-normal">· {g.subject}</span>}
                  </div>
                  <div className="text-xs text-base-content/50 truncate">
                    {g.mentor ? t('super.studentDetail.mentorLabel', { name: g.mentor }) : t('super.studentDetail.mentorNotAssigned')}
                  </div>
                </div>
                <span className="text-sm font-semibold tabular-nums shrink-0">{money(g.monthlyPrice)}</span>
                <ArrowRight size={14} className="text-base-content/25 shrink-0" />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Breadcrumbs({ name }) {
  const { t } = useTranslation();
  return (
    <div className="text-xs breadcrumbs text-base-content/50">
      <ul>
        <li><Link to="/students" className="hover:text-base-content font-medium">{t('super.studentDetail.breadcrumbStudents')}</Link></li>
        <li className="font-semibold text-base-content">{name}</li>
      </ul>
    </div>
  );
}
