import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  Building2, Users, Phone, MapPin, AlertTriangle, TrendingUp, Wallet,
  UserCog, GraduationCap, BookOpen, ArrowLeft, CalendarCheck, Coins,
  Settings, ExternalLink,
} from 'lucide-react';
import { fmt, money } from '../../format.js';
import { useSuperBranchDetail } from '../../queries.js';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { SkeletonList } from '../../components/Skeleton.jsx';
import YMapPicker from '../../components/YMapPicker.jsx';
import { phoneDisplay } from '../../components/PhoneInput.jsx';
import { Metric, Panel, EmptyState, Avatar, Card } from './_ui.jsx';
import BranchFormModal from './BranchFormModal.jsx';

/**
 * Филиал — единственная точка входа во всё, что в нём происходит.
 *
 * Раньше ученики, группы и посещаемость жили отдельными пунктами меню, и
 * каждый начинался с вопроса «а какой филиал смотрим?». Теперь филиал
 * выбирается один раз — в сайдбаре, — а внутри вкладки. Та же логика, что у
 * ментора с группами.
 *
 * Состояние экрана — в адресной строке (`?tab=`, `?group=`), а не в useState:
 * ссылку на вкладку «Ученики» нужного филиала можно отправить сообщением, и
 * кнопка «назад» работает как ожидается.
 */

const tabsFor = (t) => [
  { key: 'overview', label: t('super.branchDetail.tabOverview'), Icon: Building2 },
  { key: 'students', label: t('super.branchDetail.tabStudents'), Icon: GraduationCap },
  { key: 'groups',   label: t('super.branchDetail.tabGroups'),   Icon: BookOpen },
  { key: 'staff',    label: t('super.branchDetail.tabStaff'),    Icon: UserCog },
];

const attMetaFor = (t) => ({
  present: { label: t('super.branchDetail.attPresent'), color: 'oklch(70% 0.17 145)' },
  late:    { label: t('super.branchDetail.attLate'),    color: 'oklch(75% 0.15 85)' },
  excused: { label: t('super.branchDetail.attExcused'), color: 'oklch(62% 0.10 250)' },
  absent:  { label: t('super.branchDetail.attAbsent'),  color: 'oklch(62% 0.24 25)' },
});

const statusLabelFor = (t) => ({
  active: t('super.branchDetail.statusActive'), frozen: t('super.branchDetail.statusFrozen'), fired: t('super.branchDetail.statusFired'),
  graduated: t('super.branchDetail.statusGraduated'), dropped: t('super.branchDetail.statusDropped'),
});

/* ── Группа внутри филиала: состав и посещаемость ─────────────────────── */
function GroupPanel({ group, onBack }) {
  const { t } = useTranslation();
  const ATT_META = attMetaFor(t);
  const { token } = useAuth();

  // тот же эндпоинт, что и у сводки посещаемости организации, но с фильтром
  // по группе — отдельного «журнала группы» для CEO на бэкенде нет
  const att = useQuery({
    queryKey: ['super-attendance', group.id],
    queryFn: () => api.superAttendance(token, `?groupId=${group.id}`),
    enabled: !!token,
  });

  const totals = att.data?.totals ?? { present: 0, absent: 0, late: 0, excused: 0 };
  const total = Object.values(totals).reduce((a, b) => a + b, 0);

  const pie = useMemo(
    () => Object.entries(totals)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ key: k, name: ATT_META[k]?.label ?? k, value: v })),
    [totals],
  );

  // доля присутствия — то, ради чего в журнал и заходят
  const rate = total ? Math.round(((totals.present + totals.late) / total) * 100) : null;

  return (
    <div className="space-y-4">
      <button className="btn btn-ghost btn-xs gap-1" onClick={onBack}>
        <ArrowLeft size={13} /> {t('super.branchDetail.allGroups')}
      </button>

      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-bold">{group.name}</h3>
        {group.subject && <span className="badge badge-ghost badge-sm">{group.subject}</span>}
        <span className="text-sm text-base-content/50">
          {group.mentorName ? t('super.branchDetail.mentorLabel', { name: group.mentorName }) : t('super.branchDetail.mentorNotAssigned')}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric Icon={Users} label={t('super.branchDetail.metaStudents')} value={fmt(group.students)} />
        <Metric Icon={Wallet} label={t('super.branchDetail.metaPricePerMonth')} value={money(group.monthlyPrice)} />
        <Metric Icon={CalendarCheck} label={t('super.branchDetail.metaMarks')} value={fmt(total)} unit={t('super.branchDetail.inJournal')} />
        <Metric
          Icon={TrendingUp}
          label={t('super.branchDetail.metaAttendance')}
          value={rate === null ? '—' : `${rate}%`}
          tone={rate === null ? 'neutral' : rate >= 80 ? 'success' : rate >= 60 ? 'warning' : 'danger'}
          unit={rate === null ? t('super.branchDetail.noMarks') : t('super.branchDetail.wasOrLate')}
        />
      </div>

      <Panel title={t('super.branchDetail.attendanceTitle')} icon={CalendarCheck}>
        {att.isLoading ? (
          <SkeletonList rows={3} />
        ) : total === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title={t('super.branchDetail.journalEmptyTitle')}
            hint={t('super.branchDetail.journalEmptyHint')}
          />
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-full sm:w-52 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                    {pie.map((d) => <Cell key={d.key} fill={ATT_META[d.key]?.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2 w-full">
              {Object.entries(ATT_META).map(([key, meta]) => (
                <div key={key} className="flex items-center gap-2.5 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: meta.color }} />
                  <span className="flex-1">{meta.label}</span>
                  <span className="font-bold tabular-nums">{fmt(totals[key] ?? 0)}</span>
                  <span className="text-xs text-base-content/40 w-12 text-right tabular-nums">
                    {total ? `${Math.round(((totals[key] ?? 0) / total) * 100)}%` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

export default function SuperBranchDetail() {
  const { t } = useTranslation();
  const TABS = tabsFor(t);
  const STATUS_LABEL = statusLabelFor(t);
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { data, isLoading, error, refetch } = useSuperBranchDetail(id);
  // всё управление филиалом — здесь, под шестерёнкой, а не на общем списке
  const [settingsOpen, setSettingsOpen] = useState(false);

  const tab = TABS.some((tb) => tb.key === params.get('tab')) ? params.get('tab') : 'overview';
  const groupId = params.get('group');

  const branch = data?.branch || data;
  const branchName = branch?.name;

  useEffect(() => {
    if (branchName) document.title = `${branchName} | ${t('super.branchDetail.breadcrumbBranches')} | LevelUp Academy`;
  }, [branchName, t]);

  const setTab = (key) => {
    const next = new URLSearchParams(params);
    next.set('tab', key);
    next.delete('group');
    setParams(next, { replace: true });
  };

  const openGroup = (gid) => {
    const next = new URLSearchParams(params);
    next.set('tab', 'groups');
    next.set('group', gid);
    setParams(next);
  };

  const closeGroup = () => {
    const next = new URLSearchParams(params);
    next.delete('group');
    setParams(next);
  };

  if (error && error.status !== 401) {
    return (
      <div className="space-y-6">
        <div className="text-xs breadcrumbs text-base-content/50">
          <ul>
            <li><Link to="/branches" className="hover:text-base-content font-medium">{t('super.branchDetail.breadcrumbBranches')}</Link></li>
            <li className="font-semibold text-base-content">{t('super.branchDetail.breadcrumbError')}</li>
          </ul>
        </div>
        <Card className="max-w-lg mx-auto mt-6">
          <EmptyState
            icon={AlertTriangle}
            title={t('super.branchDetail.loadErrorTitle')}
            hint={error.message || t('super.branchDetail.loadErrorHint')}
            action={<button className="btn btn-primary btn-sm px-6" onClick={() => refetch()}>{t('super.branchDetail.retry')}</button>}
          />
        </Card>
      </div>
    );
  }

  if (isLoading || !data) {
    return (<div><PageHeader title={t('super.branchDetail.branchFallback')} /><SkeletonList rows={8} /></div>);
  }

  const stats = branch.stats ?? {};
  const students = branch.students ?? [];
  const groups = branch.groups ?? [];
  const admins = branch.admins ?? [];
  const mentors = branch.mentors ?? [];
  const openedGroup = groups.find((g) => g.id === groupId) ?? null;
  const hasPoint = branch.lat != null && branch.lng != null;

  return (
    <div className="space-y-5">
      <div className="text-xs breadcrumbs text-base-content/50">
        <ul>
          <li><Link to="/branches" className="hover:text-base-content font-medium">{t('super.branchDetail.breadcrumbBranches')}</Link></li>
          <li className="font-semibold text-base-content">{branch.name}</li>
        </ul>
      </div>

      <PageHeader
        title={branch.name}
        subtitle={branch.address || t('super.branchDetail.addressNotSpecified')}
      >
        {branch.isMain && <span className="badge badge-primary badge-sm">{t('super.branchDetail.mainBadge')}</span>}
        {branch.isArchived && <span className="badge badge-ghost badge-sm">{t('super.branchDetail.archivedBadge')}</span>}
        <button
          className="btn btn-ghost btn-sm gap-1.5"
          onClick={() => setSettingsOpen(true)}
          title={t('super.branchDetail.settingsTooltip')}
        >
          <Settings size={16} /> {t('super.branchDetail.settings')}
        </button>
      </PageHeader>

      {/* Вкладки. Состояние в адресе, поэтому ссылку можно переслать. */}
      <div className="tabs tabs-boxed bg-base-200/50 w-fit">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            className={`tab gap-1.5 ${tab === tb.key ? 'tab-active' : ''}`}
            onClick={() => setTab(tb.key)}
          >
            <tb.Icon size={14} />
            {tb.label}
            {tb.key === 'students' && students.length > 0 && (
              <span className="text-[10px] opacity-60 tabular-nums">{students.length}</span>
            )}
            {tb.key === 'groups' && groups.length > 0 && (
              <span className="text-[10px] opacity-60 tabular-nums">{groups.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Metric Icon={GraduationCap} label={t('super.branchDetail.metaStudents')} value={fmt(stats.students ?? 0)} unit={t('super.branchDetail.activeUnit')} />
            <Metric Icon={BookOpen} label={t('super.branchDetail.tabGroups')} value={fmt(stats.groups ?? 0)} />
            <Metric Icon={UserCog} label={t('super.branchDetail.metaStaff')} value={fmt((stats.admins ?? 0) + (stats.mentors ?? 0))}
                 unit={t('super.branchDetail.staffUnit', { admins: fmt(stats.admins ?? 0), mentors: fmt(stats.mentors ?? 0) })} />
            <Metric Icon={Wallet} label={t('super.branchDetail.metaStudentDebt')} value={money(stats.debt ?? 0)}
                 tone={(stats.debt ?? 0) > 0 ? 'danger' : 'neutral'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Metric Icon={TrendingUp} label={t('super.branchDetail.metaRevenue')} value={money(stats.revenue ?? 0)} tone="success" />
            <Metric Icon={Wallet} label={t('super.branchDetail.metaExpenses')} value={money(stats.expenses ?? 0)} unit={t('super.branchDetail.branchSpendUnit')} />
            <Metric
              Icon={Coins}
              label={t('super.branchDetail.metaProfit')}
              value={money(stats.profit ?? 0)}
              tone={(stats.profit ?? 0) >= 0 ? 'success' : 'danger'}
              unit={t('super.branchDetail.profitUnit')}
            />
          </div>

          {/* Где филиал — показываем картой, а не строкой координат: пять
              знаков после запятой человеку ничего не говорят, а карта отвечает
              на настоящий вопрос «это вообще где». */}
          <Panel title={t('super.branchDetail.contactsAndAddressTitle')} icon={Building2}>
            {/* Контакты строкой сверху, карта под ними во всю ширину: рядом с
                текстом ей доставалась половина панели, а половина оставалась
                пустой — читать на такой карте нечего. */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm">
                <span className="flex items-center gap-2">
                  <MapPin size={14} className="text-base-content/40 shrink-0" />
                  {branch.address || t('super.branchDetail.addressNotSpecified')}
                </span>
                <span className="flex items-center gap-2">
                  <Phone size={14} className="text-base-content/40 shrink-0" />
                  {/* тем же видом, что и в поле ввода: +998 90 123 45 67,
                      а не слитной строкой из базы */}
                  {branch.phone ? phoneDisplay(branch.phone) : t('super.branchDetail.phoneNotSpecified')}
                </span>
                {hasPoint && (
                  <span className="flex items-center gap-3">
                    <span className="text-xs font-mono text-base-content/50 tabular-nums">
                      {Number(branch.lat).toFixed(6)}, {Number(branch.lng).toFixed(6)}
                    </span>
                    <a
                      href={`https://yandex.uz/maps/?pt=${branch.lng},${branch.lat}&z=17&l=map`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-base-content/45 hover:text-base-content inline-flex items-center gap-1"
                    >
                      {t('super.branchDetail.openInMaps')} <ExternalLink size={11} />
                    </a>
                  </span>
                )}
              </div>

              {hasPoint ? (
                <YMapPicker
                  value={{ lat: Number(branch.lat), lng: Number(branch.lng) }}
                  height="min(46vh, 380px)"
                  readOnly
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-base-300 text-center p-10">
                  <MapPin size={22} className="text-base-content/25" />
                  <p className="text-xs text-base-content/50">{t('super.branchDetail.noMapPoint')}</p>
                  <button className="btn btn-ghost btn-xs" onClick={() => setSettingsOpen(true)}>
                    {t('super.branchDetail.markOnMap')}
                  </button>
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}

      {tab === 'students' && (
        <Panel title={t('super.branchDetail.studentsOfBranchTitle')} icon={GraduationCap} bodyClass="p-0">
          {students.length === 0 ? (
            <EmptyState icon={GraduationCap} title={t('super.branchDetail.noStudentsYetTitle')}
                        hint={t('super.branchDetail.noStudentsYetHint')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr><th>{t('super.branchDetail.colStudent')}</th><th>{t('super.branchDetail.colPhone')}</th><th>{t('super.branchDetail.colStatus')}</th><th className="text-right">{t('super.branchDetail.colDebt')}</th><th className="text-right">{t('super.branchDetail.colCoins')}</th></tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <Avatar name={`${s.firstName} ${s.lastName}`} size="md" />
                          <span className="font-semibold">{s.firstName} {s.lastName}</span>
                        </div>
                      </td>
                      <td className="text-sm">{s.phone || '—'}</td>
                      <td><span className="badge badge-ghost badge-sm">{STATUS_LABEL[s.status] ?? s.status}</span></td>
                      <td className={`text-right tabular-nums font-semibold ${s.debt > 0 ? 'text-error' : 'text-base-content/40'}`}>
                        {money(s.debt)}
                      </td>
                      <td className="text-right tabular-nums">{fmt(s.coins)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {tab === 'groups' && (
        openedGroup ? (
          <GroupPanel group={openedGroup} onBack={closeGroup} />
        ) : (
          <Panel title={t('super.branchDetail.groupsOfBranchTitle')} icon={BookOpen} bodyClass="p-0">
            {groups.length === 0 ? (
              <EmptyState icon={BookOpen} title={t('super.branchDetail.noGroupsYetTitle')}
                          hint={t('super.branchDetail.noGroupsYetHint')} />
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr><th>{t('super.branchDetail.colGroup')}</th><th>{t('super.branchDetail.colSubject')}</th><th>{t('super.branchDetail.colMentor')}</th><th className="text-right">{t('super.branchDetail.colStudents')}</th><th className="text-right">{t('super.branchDetail.colPrice')}</th></tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => (
                      <tr key={g.id} className="hover cursor-pointer" onClick={() => openGroup(g.id)}>
                        <td className="font-semibold">{g.name}</td>
                        <td className="text-sm text-base-content/60">{g.subject || '—'}</td>
                        <td className="text-sm">{g.mentorName || <span className="text-warning">{t('super.branchDetail.notAssigned')}</span>}</td>
                        <td className="text-right tabular-nums">{fmt(g.students)}</td>
                        <td className="text-right tabular-nums">{money(g.monthlyPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )
      )}

      {tab === 'staff' && (
        <div className="space-y-4">
          <Panel
            title={t('super.branchDetail.adminsTitle')}
            icon={UserCog}
            bodyClass="p-0"
            action={
              <Link to="/admins" className="btn btn-primary btn-xs">{t('super.branchDetail.add')}</Link>
            }
          >
            {admins.length === 0 ? (
              <EmptyState icon={UserCog} title={t('super.branchDetail.noAdminsTitle')}
                          hint={t('super.branchDetail.noAdminsHint')} />
            ) : (
              <ul className="divide-y divide-base-200">
                {admins.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Avatar name={`${a.firstName} ${a.lastName}`} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{a.firstName} {a.lastName}</div>
                      <div className="text-xs text-base-content/50 truncate">{a.email}</div>
                    </div>
                    <span className="badge badge-ghost badge-sm">{STATUS_LABEL[a.status] ?? a.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t('super.branchDetail.mentorsTitle')} icon={Users} bodyClass="p-0">
            {mentors.length === 0 ? (
              <EmptyState icon={Users} title={t('super.branchDetail.noMentorsTitle')}
                          hint={t('super.branchDetail.noMentorsHint')} />
            ) : (
              <ul className="divide-y divide-base-200">
                {mentors.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Avatar name={`${m.firstName} ${m.lastName}`} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{m.firstName} {m.lastName}</div>
                      <div className="text-xs text-base-content/50 truncate">{m.email || m.phone || '—'}</div>
                    </div>
                    <span className="badge badge-ghost badge-sm">{STATUS_LABEL[m.status] ?? m.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      <BranchFormModal
        open={settingsOpen}
        mode="edit"
        branch={branch}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
