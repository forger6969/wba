import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Archive, ArchiveRestore, Trash2, Users, Layers, Banknote } from 'lucide-react';
import { useAuth } from '../../auth.jsx';
import { api } from '../../api.js';
import PageHeader from '../../components/PageHeader.jsx';
import { SkeletonTable } from '../../components/Skeleton.jsx';
import { fmt, money } from '../../format.js';
import { Card, Metric, SearchInput, FilterPills, ConfirmDialog, Avatar } from './_ui.jsx';

const LOCALE_OF = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const dayLabelsFor = (locale) => Object.fromEntries(
  DAYS.map((key, i) => [key, new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' })]),
);

function useSuperGroups() {
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

export default function SuperGroups() {
  const { t, i18n } = useTranslation();
  const locale = LOCALE_OF[i18n.language] || 'ru-RU';
  const DAY_LABEL = dayLabelsFor(locale);
  const { token } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('active');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading, error } = useSuperGroups();

  const allGroups = data?.groups ?? data?.items ?? [];

  const archiveMutation = useMutation({
    mutationFn: (id) => api.superArchiveGroup(token, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['super-groups'] }),
  });

  const unarchiveMutation = useMutation({
    mutationFn: (id) => api.superUnarchiveGroup(token, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['super-groups'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.superDeleteGroup(token, id),
    onSuccess: () => {
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['super-groups'] });
    },
  });

  const filtered = allGroups.filter((g) => {
    const matchSearch = !search ||
      (g.name ?? '').toLowerCase().includes(search.toLowerCase());
    const archived = g.isArchived ?? g.is_archived ?? false;
    const matchFilter =
      filter === 'all' ||
      (filter === 'active' && !archived) ||
      (filter === 'archived' && archived);
    return matchSearch && matchFilter;
  });

  const totalStudents = allGroups.reduce((s, g) => s + (g.studentsCount ?? g.students_count ?? g.students ?? 0), 0);
  const activeCount = allGroups.filter((g) => !(g.isArchived ?? g.is_archived)).length;
  const totalRevenue = allGroups.reduce((s, g) => s + Number(g.monthlyPrice ?? g.monthly_price ?? 0), 0);

  const formatSchedule = (g) => {
    const schedule = g.schedule ?? g.lessonDays ?? g.lesson_days ?? [];
    if (!Array.isArray(schedule) || !schedule.length) return '—';

    // Старые записи хранят только коды дней, новые — объекты
    // { day, start, end }. Никогда не отдаём объект прямо в JSX.
    if (schedule.every((item) => typeof item === 'string')) {
      return schedule.map((day) => DAY_LABEL[day] ?? day).join(', ');
    }

    const slots = schedule.map((item) => {
      if (!item || typeof item !== 'object') return null;
      const day = item.day ?? item.dayCode ?? item.weekday;
      const start = item.start ?? item.startTime ?? item.start_time;
      const end = item.end ?? item.endTime ?? item.end_time;
      const time = start ? `${start}${end ? `–${end}` : ''}` : '';
      return { day: DAY_LABEL[day] ?? day ?? '—', time };
    }).filter(Boolean);

    if (!slots.length) return '—';
    const sameTime = slots.every((slot) => slot.time === slots[0].time);
    if (sameTime) {
      return `${slots.map((slot) => slot.day).join(', ')}${slots[0].time ? ` · ${slots[0].time}` : ''}`;
    }
    return slots.map((slot) => `${slot.day}${slot.time ? ` ${slot.time}` : ''}`).join(' · ');
  };

  const formatPrice = (g) => {
    const price = g.monthlyPrice ?? g.monthly_price;
    return price ? money(price) : '—';
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('super.groupsList.title')} subtitle={t('super.groupsList.subtitle')} />

      {/* Stat pills */}
      <div className="flex flex-wrap gap-3">
        <Metric size="sm" Icon={Layers} tone="primary" label={t('super.groupsList.total')} value={allGroups.length} />
        <Metric size="sm" Icon={Layers} tone="success" label={t('super.groupsList.activeCount')} value={activeCount} />
        <Metric size="sm" Icon={Users} tone="info" label={t('super.groupsList.studentsCount')} value={totalStudents} />
        <Metric size="sm" Icon={Banknote} tone="warning" label={t('super.groupsList.subscriptionSum')} value={money(totalRevenue)} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('super.groupsList.searchPlaceholder')}
          className="flex-1 max-w-sm"
        />
        <FilterPills
          options={[
            { key: 'active', label: t('super.groupsList.filterActive') },
            { key: 'archived', label: t('super.groupsList.filterArchived') },
            { key: 'all', label: t('super.groupsList.filterAll') },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : error && error.status !== 401 ? (
        <div className="alert alert-error text-sm">
          <span>{error.message}</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-base-content/40 text-sm">
          {t('super.groupsList.noneFound')}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>{t('super.groupsList.colGroup')}</th>
                  <th>{t('super.groupsList.colMentor')}</th>
                  <th>{t('super.groupsList.colSchedule')}</th>
                  <th className="text-right">{t('super.groupsList.colStudents')}</th>
                  <th className="text-right">{t('super.groupsList.colSubscription')}</th>
                  <th>{t('super.groupsList.colStatus')}</th>
                  <th className="text-right">{t('super.groupsList.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => {
                  const archived = g.isArchived ?? g.is_archived ?? false;
                  const mentorName = g.mentorName ?? g.mentor_name ?? g.mentor ?? '—';
                  const studentCount = g.studentsCount ?? g.students_count ?? g.students ?? 0;

                  return (
                    <tr key={g.id} className="hover">
                      <td>
                        <span className="font-medium text-sm">{g.name}</span>
                        {g.subject && (
                          <div className="text-xs text-base-content/50">{g.subject}</div>
                        )}
                      </td>
                      <td>
                        {mentorName !== '—' ? (
                          <div className="flex items-center gap-2">
                            <Avatar name={mentorName} size="sm" />
                            <span className="text-sm">{mentorName}</span>
                          </div>
                        ) : (
                          <span className="text-base-content/40 text-sm">—</span>
                        )}
                      </td>
                      <td className="text-sm text-base-content/70">{formatSchedule(g)}</td>
                      <td className="text-right text-sm tabular-nums">{fmt(studentCount)}</td>
                      <td className="text-right text-sm tabular-nums">{formatPrice(g)}</td>
                      <td>
                        {archived
                          ? <span className="badge badge-ghost badge-sm">{t('super.groupsList.archived')}</span>
                          : <span className="badge badge-success badge-sm">{t('super.groupsList.active')}</span>
                        }
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {archived ? (
                            <button
                              className="btn btn-ghost btn-xs text-success"
                              title={t('super.groupsList.unarchive')}
                              onClick={() => unarchiveMutation.mutate(g.id)}
                              disabled={unarchiveMutation.isPending}
                            >
                              <ArchiveRestore size={14} />
                            </button>
                          ) : (
                            <button
                              className="btn btn-ghost btn-xs text-warning"
                              title={t('super.groupsList.archive')}
                              onClick={() => archiveMutation.mutate(g.id)}
                              disabled={archiveMutation.isPending}
                            >
                              <Archive size={14} />
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-xs text-error"
                            title={t('super.groupsList.delete')}
                            onClick={() => setDeleteTarget(g)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Delete confirm modal */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('super.groupsList.deleteGroupTitle')}
        text={<>{t('super.groupsList.deleteConfirmPrefix')} <strong>{deleteTarget?.name}</strong>{t('super.groupsList.deleteConfirmSuffix')}</>}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        pending={deleteMutation.isPending}
        error={deleteMutation.error}
      />
    </div>
  );
}
