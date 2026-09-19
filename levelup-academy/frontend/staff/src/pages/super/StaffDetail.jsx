import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Mail, Phone, Building2, Wallet, Calendar, MapPin, UserCog, Award,
  ShieldAlert, Ban, TriangleAlert, ScrollText,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fmt, dateShort, money, ADMIN_STATUS, ROLE_LABELS } from '../../format.js';
import { useSuperAdmins, useSuperMentors, useSuperMethodists, useSuperBranches, useSuperBranchManagers } from '../../queries.js';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { SkeletonKpis, SkeletonTable, SkeletonList } from '../../components/Skeleton.jsx';
import { phoneDisplay } from '../../components/PhoneInput.jsx';
import { Metric, Panel, EmptyState, PageHead, StatusBadge, Avatar } from './_ui.jsx';
import { TYPE_META, LevelBadge } from '../../discipline-meta.jsx';

const STATUS_CLS_TONE = { 'badge-success': 'success', 'badge-error': 'danger' };

/**
 * Полная карточка сотрудника (Admin/Methodist) — отдельная страница, а не
 * модалка: список нарушений и контактные данные не помещались в диалог без
 * скролла внутри скролла, а Karis прямо попросил full page.
 *
 * Вёрстка сознательно повторяет язык SuperBranchDetail.jsx (хлебные крошки →
 * заголовок → KPI-плитки → панель с иконка+текст строками вместо кучи мелких
 * рамочных карточек) — это уже устоявшийся «серьёзный» стиль остальной
 * CEO панели, а не новый визуальный диалект для одной страницы.
 *
 * Данные не тянут новый endpoint — берутся из уже загруженных списков
 * /super/admins, /super/methodists, /super/branches (react-query отдаёт их
 * из кэша, если страница открыта переходом со списка) плюс существующий
 * фильтр /super/penalties?targetUserId=.
 */

// Те же цвета, что и в GradePicker админа филиала (pages/admin/Mentors.jsx) —
// грейд здесь read-only (меняет только Admin филиала), но цвет должен
// совпадать, а не изобретаться заново для одной страницы.
const GRADE_META = {
  junior: { label: 'Junior', color: '#2563eb' },
  middle: { label: 'Middle', color: '#b45309' },
  senior: { label: 'Senior', color: '#15803d' },
};

const LOCALE_OF = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };

function dateTime(iso, locale) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function StaffDetail() {
  const { t, i18n } = useTranslation();
  const locale = LOCALE_OF[i18n.language] || 'ru-RU';
  const { role, id } = useParams();
  const { token } = useAuth();
  const [gradeBusy, setGradeBusy] = useState(false);
  const [branchBusy, setBranchBusy] = useState(false);

  const admins = useSuperAdmins();
  const mentors = useSuperMentors();
  const methodists = useSuperMethodists();
  const branchManagers = useSuperBranchManagers();
  const branches = useSuperBranches();

  const loading = role === 'admin' ? admins.isLoading
    : role === 'mentor' ? mentors.isLoading
    : role === 'branch_manager' ? branchManagers.isLoading
    : methodists.isLoading;

  const person = useMemo(() => {
    if (role === 'admin') return (admins.data?.admins ?? []).find((a) => a.id === id) ?? null;
    if (role === 'mentor') return (mentors.data?.mentors ?? []).find((m) => m.id === id) ?? null;
    if (role === 'methodist') return (methodists.data?.methodists ?? []).find((m) => m.id === id) ?? null;
    if (role === 'branch_manager') return (branchManagers.data?.managers ?? []).find((m) => m.id === id) ?? null;
    return null;
  }, [role, id, admins.data, mentors.data, methodists.data, branchManagers.data]);

  const branch = useMemo(
    () => (branches.data?.branches ?? []).find((b) => b.id === person?.branchId) ?? null,
    [branches.data, person],
  );

  const penalties = useQuery({
    queryKey: ['super-penalties', id],
    queryFn: () => api.superPenalties(token, `?targetUserId=${id}`),
    enabled: !!token && !!id,
  });
  const items = penalties.data?.data ?? [];

  const totals = useMemo(() => {
    const acc = {};
    for (const key of Object.keys(TYPE_META)) acc[key] = 0;
    for (const p of items) acc[p.type] = (acc[p.type] ?? 0) + 1;
    return acc;
  }, [items]);

  if (loading) {
    return (
      <div>
        <div className="text-xs breadcrumbs text-base-content/50">
          <ul><li><Link to="/admins" className="hover:text-base-content font-medium">{t('super.staffDetail.breadcrumbStaff')}</Link></li></ul>
        </div>
        <SkeletonList rows={8} />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="space-y-4">
        <div className="text-xs breadcrumbs text-base-content/50">
          <ul>
            <li><Link to="/admins" className="hover:text-base-content font-medium">{t('super.staffDetail.breadcrumbStaff')}</Link></li>
            <li className="font-semibold text-base-content">{t('super.staffDetail.notFound')}</li>
          </ul>
        </div>
        <EmptyState
          icon={ShieldAlert}
          title={t('super.staffDetail.staffNotFoundTitle')}
          hint={t('super.staffDetail.staffNotFoundHint')}
        />
      </div>
    );
  }

  const status = ADMIN_STATUS(t)[person.status === 'frozen' ? 'frozen' : 'active'] || { label: person.status, cls: 'badge-ghost' };
  const lastViolation = items[0] ?? null;
  const fullName = `${person.firstName} ${person.lastName}`;

  const changeGrade = async (grade) => {
    setGradeBusy(true);
    try {
      await api.superUpdateMentorGrade(token, person.id, grade || null);
      await mentors.refetch();
    } catch (err) {
      alert(err.message || t('super.staffDetail.gradeChangeError'));
    } finally {
      setGradeBusy(false);
    }
  };

  const changeMentorBranch = async (branchId) => {
    if (!branchId || branchId === person.branchId) return;
    const next = (branches.data?.branches ?? []).find((b) => b.id === branchId);
    if (!window.confirm(t('super.staffDetail.confirmMentorBranchChange', { name: fullName, branch: next?.name || t('super.staffDetail.otherBranchFallback') }))) return;
    setBranchBusy(true);
    try {
      const result = await api.superUpdateMentorBranch(token, person.id, branchId);
      await mentors.refetch();
      if (result.mentor?.detachedGroups) alert(t('super.staffDetail.detachedGroupsAlert', { count: result.mentor.detachedGroups }));
    } catch (err) {
      alert(err.message || t('super.staffDetail.mentorBranchChangeError'));
    } finally {
      setBranchBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHead
        breadcrumbs={[{ label: t('super.staffDetail.breadcrumbStaff'), to: '/admins' }, { label: fullName }]}
        avatar={<Avatar name={fullName} size="lg" />}
        title={fullName}
        subtitle={ROLE_LABELS(t)[role] ?? role}
      >
        {role === 'mentor' && (
          <label className="flex items-center gap-1.5">
            <Building2 size={13} className="text-base-content/50" />
            <select className="select select-bordered select-xs font-semibold" value={person.branchId || ''} disabled={branchBusy} onChange={(e) => changeMentorBranch(e.target.value)} title={t('super.staffDetail.changeMentorBranchTooltip')}>
              {(branches.data?.branches ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
        )}
        {role === 'mentor' && (
          <label className="flex items-center gap-1.5">
            <Award size={12} className="text-base-content/50" />
            <select
              className="select select-bordered select-xs font-semibold"
              value={person.grade || ''}
              disabled={gradeBusy}
              onChange={(e) => changeGrade(e.target.value)}
              title={t('super.staffDetail.changeMentorGradeTooltip')}
            >
              <option value="">{t('super.staffDetail.gradeNotSet')}</option>
              {Object.entries(GRADE_META).map(([value, meta]) => (
                <option key={value} value={value}>{meta.label}</option>
              ))}
            </select>
          </label>
        )}
        {lastViolation && (
          <span className="badge badge-ghost badge-sm gap-1.5">
            <ScrollText size={11} /> {t('super.staffDetail.lastViolationLabel', { date: dateShort(lastViolation.created_at ?? lastViolation.createdAt) })}
          </span>
        )}
        <StatusBadge tone={STATUS_CLS_TONE[status.cls] ?? 'neutral'}>{status.label}</StatusBadge>
      </PageHead>

      {penalties.isLoading ? (
        <SkeletonKpis count={3} className="grid-cols-1 sm:grid-cols-3" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Metric Icon={TriangleAlert} tone="warning" label={t('super.staffDetail.kpiYellow')} value={fmt(totals.sariq)} unit={t('super.staffDetail.kpiWarningsUnit')} />
          <Metric Icon={ShieldAlert} tone="danger" label={t('super.staffDetail.kpiRed')} value={fmt(totals.qizil)} unit={t('super.staffDetail.kpiWarningsUnit')} />
          <Metric Icon={Ban} tone="danger" label={t('super.staffDetail.kpiFirings')} value={fmt(totals.qora)} unit={t('super.staffDetail.kpiRecordsUnit')} />
        </div>
      )}

      <Panel title={t('super.staffDetail.profileTitle')} icon={UserCog}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm">
            <span className="flex items-center gap-2">
              <Mail size={14} className="text-base-content/40 shrink-0" />
              <span className="font-mono">{person.email}</span>
            </span>
            <span className="flex items-center gap-2">
              <Phone size={14} className="text-base-content/40 shrink-0" />
              {person.phone ? phoneDisplay(person.phone) : t('super.staffDetail.phoneNotSpecified')}
            </span>
            <span className="flex items-center gap-2">
              <Calendar size={14} className="text-base-content/40 shrink-0" />
              {t('super.staffDetail.inSystemSince', { date: dateShort(person.createdAt) })}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm pt-3 border-t border-base-200">
            <span className="flex items-center gap-2">
              <Wallet size={14} className="text-base-content/40 shrink-0" />
              {t('super.staffDetail.salaryLabel')} <span className="font-semibold">
                {person.monthlySalary != null ? money(person.monthlySalary) : t('super.staffDetail.notSpecified')}
              </span>
            </span>
            {role !== 'methodist' && (
              <>
                <span className="flex items-center gap-2">
                  <Building2 size={14} className="text-base-content/40 shrink-0" />
                  {person.branchName || t('super.staffDetail.branchNotSpecified')}
                </span>
                {branch?.address && (
                  <span className="flex items-center gap-2 text-base-content/60">
                    <MapPin size={14} className="text-base-content/40 shrink-0" />
                    {branch.address}
                  </span>
                )}
                {branch?.phone && (
                  <span className="flex items-center gap-2 text-base-content/60">
                    <Phone size={14} className="text-base-content/40 shrink-0" />
                    {phoneDisplay(branch.phone)} {t('super.staffDetail.branchSuffix')}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </Panel>

      {role === 'mentor' && (
        <Panel title={t('super.staffDetail.aboutMentorTitle')} icon={Award}>
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-base-content/45 mb-2">
                {t('super.staffDetail.skillsLabel')}
              </div>
              {person.skills?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {person.skills.map((s) => (
                    <span
                      key={s}
                      className="text-xs font-medium px-2.5 py-1 rounded-full border border-base-300 text-base-content/70"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-base-content/45">{t('super.staffDetail.notSpecifiedPl')}</p>
              )}
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-base-content/45 mb-2">
                {t('super.staffDetail.aboutMeLabel')}
              </div>
              {person.bio ? (
                <p className="text-sm text-base-content/75 leading-relaxed border-l-2 border-base-300 pl-3 whitespace-pre-wrap">
                  {person.bio}
                </p>
              ) : (
                <p className="text-sm text-base-content/45">{t('super.staffDetail.notFilled')}</p>
              )}
            </div>
          </div>
        </Panel>
      )}

      <Panel title={t('super.staffDetail.disciplineHistoryTitle')} icon={ScrollText} bodyClass="p-0">
        {penalties.isLoading ? (
          <div className="p-4"><SkeletonTable /></div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={t('super.staffDetail.noViolationsTitle')}
            hint={t('super.staffDetail.noViolationsHint')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>{t('super.staffDetail.colType')}</th>
                  <th className="text-right">{t('super.staffDetail.colSalaryPercent')}</th>
                  <th>{t('super.staffDetail.colReason')}</th>
                  <th>{t('super.staffDetail.colIssuedBy')}</th>
                  <th>{t('super.staffDetail.colWhen')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td><LevelBadge type={p.type} size="sm" /></td>
                    <td className="text-right tabular-nums font-semibold">
                      {p.amount == null ? '—' : `−${Number(p.amount)}%`}
                    </td>
                    <td className="max-w-sm"><span className="text-sm">{p.reason}</span></td>
                    <td className="text-sm">
                      {p.issued_by_name ?? p.issuedByName ?? '—'}
                      <div className="text-xs text-base-content/45">
                        {ROLE_LABELS(t)[p.issuer_role] ?? p.issuer_role}
                      </div>
                    </td>
                    <td className="text-xs text-base-content/55 whitespace-nowrap">
                      {dateTime(p.created_at ?? p.createdAt, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
