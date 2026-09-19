import { useMemo, useState } from 'react';
import { Calendar, ChevronRight, Filter, BookOpen, CheckCircle2, XCircle, Percent } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth.jsx';
import { api } from '../../api.js';
import PageHeader from '../../components/PageHeader.jsx';
import { Card, Metric, FilterPills } from './_ui.jsx';

function toDateInput(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBack(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateInput(d);
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const PRESET_DAYS = { '7d': 7, '14d': 14, '30d': 30 };

function useAttendanceQuery() {
  const { token, logout } = useAuth();
  const q = useQuery({
    queryKey: ['super-attendance'],
    queryFn: () => api.superAttendance(token),
    enabled: !!token,
  });
  useEffect(() => {
    if (q.error?.status === 401) logout();
  }, [q.error, logout]);
  return q;
}

function useGroupsQuery() {
  const { token, logout } = useAuth();
  const q = useQuery({
    queryKey: ['super-groups'],
    queryFn: () => api.superGroups(token),
    enabled: !!token,
  });
  useEffect(() => {
    if (q.error?.status === 401) logout();
  }, [q.error, logout]);
  return q;
}

function LessonRow({ lesson }) {
  const marked = lesson.present + lesson.absent;
  const pct = marked > 0 ? Math.round((lesson.present / marked) * 100) : 0;
  const barColor = pct >= 85 ? 'bg-success' : pct >= 70 ? 'bg-warning' : 'bg-error';

  return (
    <tr className="hover">
      <td className="font-mono text-xs">{formatDateTime(lesson.startsAt)}</td>
      <td className="font-medium">{lesson.groupName}</td>
      <td className="text-right tabular-nums">{lesson.totalStudents}</td>
      <td>
        <div className="flex items-center gap-2 text-xs tabular-nums">
          <span className="text-success font-semibold">{lesson.present}</span>
          <span className="text-base-content/30">·</span>
          <span className="text-error">{lesson.absent}</span>
          {lesson.unknown > 0 && (
            <>
              <span className="text-base-content/30">·</span>
              <span className="text-base-content/50">?{lesson.unknown}</span>
            </>
          )}
        </div>
      </td>
      <td>
        <div className="flex items-center gap-2 justify-end">
          <div className="w-20 h-1.5 bg-base-200 rounded overflow-hidden">
            <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-medium w-8 text-right">{pct}%</span>
          <ChevronRight size={14} className="text-base-content/30" />
        </div>
      </td>
    </tr>
  );
}

export default function SuperAttendance() {
  const { t } = useTranslation();
  const [groupFilter, setGroupFilter] = useState('all');
  const [preset, setPreset] = useState('14d');
  const [from, setFrom] = useState(daysBack(14));
  const [to, setTo] = useState(toDateInput(new Date()));

  const { data: attData, isLoading, error } = useAttendanceQuery();
  const { data: groupsData } = useGroupsQuery();

  const lessons = attData?.lessons || [];
  const groups = groupsData?.groups || [];
  const activeGroups = groups.filter((g) => !g.isArchived);

  const activeFrom = preset === 'custom' ? from : daysBack(PRESET_DAYS[preset]);
  const activeTo = preset === 'custom' ? to : toDateInput(new Date());

  const filtered = useMemo(() => {
    return lessons.filter((l) => {
      if (!l.startsAt) return false;
      const dateIso = l.startsAt.slice(0, 10);
      if (dateIso < activeFrom || dateIso > activeTo) return false;
      if (groupFilter !== 'all' && l.groupId !== groupFilter) return false;
      return true;
    });
  }, [lessons, groupFilter, activeFrom, activeTo]);

  const totalPresent = filtered.reduce((s, l) => s + (l.present || 0), 0);
  const totalAbsent = filtered.reduce((s, l) => s + (l.absent || 0), 0);
  const totalUnknown = filtered.reduce((s, l) => s + (l.unknown || 0), 0);
  const totalMarked = totalPresent + totalAbsent;
  const attendanceRate = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;

  return (
    <div className="space-y-5">
      <PageHeader title={t('super.attendance.title')} subtitle={t('super.attendance.subtitle')} />

      {error && error.status !== 401 && (
        <div className="alert alert-error text-sm"><span>{error.message}</span></div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <FilterPills
          options={[
            { key: '7d', label: t('super.attendance.days7') },
            { key: '14d', label: t('super.attendance.days14') },
            { key: '30d', label: t('super.attendance.days30') },
            { key: 'custom', label: <span className="flex items-center gap-1"><Calendar size={13} /> {t('super.attendance.period')}</span> },
          ]}
          value={preset}
          onChange={setPreset}
        />

        {preset === 'custom' && (
          <div className="flex items-center gap-2 bg-base-100 border border-base-300 rounded-lg px-2 py-1">
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="input input-xs bg-transparent border-0 focus:outline-none w-32"
            />
            <span className="text-base-content/40 text-xs">→</span>
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="input input-xs bg-transparent border-0 focus:outline-none w-32"
            />
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Filter size={15} className="text-base-content/50" />
          <select
            className="select select-bordered select-sm"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            <option value="all">{t('super.attendance.allGroups')}</option>
            {activeGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <Metric Icon={BookOpen} tone="neutral" label={t('super.attendance.kpiLessons')} value={filtered.length} />
        <Metric Icon={CheckCircle2} tone="success" label={t('super.attendance.kpiPresent')} value={totalPresent} />
        <Metric Icon={XCircle} tone="danger" label={t('super.attendance.kpiAbsent')} value={totalAbsent} />
        <Metric Icon={Percent} tone="primary" label={t('super.attendance.kpiRate')} value={`${attendanceRate}%`} />
      </div>

      {totalUnknown > 0 && (
        <p className="text-xs text-base-content/50">
          {t('super.attendance.unmarked')} <span className="font-medium">{totalUnknown}</span>
        </p>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-10 text-center text-base-content/40 text-sm">{t('super.attendance.loading')}</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-base-content/40 text-sm">
              {t('super.attendance.emptyPeriod')}
            </div>
          ) : (
            <table className="table table-sm">
              <thead className="bg-base-200/60">
                <tr>
                  <th>{t('super.attendance.colDateTime')}</th>
                  <th>{t('super.attendance.colGroup')}</th>
                  <th className="text-right">{t('super.attendance.colTotal')}</th>
                  <th>{t('super.attendance.colPresence')}</th>
                  <th className="text-right w-36">{t('super.attendance.colPercent')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <LessonRow key={l.id} lesson={l} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
