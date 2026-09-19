import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Trash2, Users, UserCheck } from 'lucide-react';
import { useInvalidate } from '../../queries.js';
import { useAuth } from '../../auth.jsx';
import { api } from '../../api.js';
import PageHeader from '../../components/PageHeader.jsx';
import { SkeletonTable } from '../../components/Skeleton.jsx';
import { dateShort } from '../../format.js';
import { useQuery } from '@tanstack/react-query';
import { Card, Metric, SearchInput, FilterPills, StatusBadge, ConfirmDialog, Avatar } from './_ui.jsx';

function useStudentsQuery(search, statusFilter, page) {
  const { token, logout } = useAuth();
  const qs =
    `?page=${page}&limit=20` +
    (search ? `&search=${encodeURIComponent(search)}` : '') +
    (statusFilter !== 'all' ? `&frozen=${statusFilter === 'frozen'}` : '');

  const q = useQuery({
    queryKey: ['super-students', search, statusFilter, page],
    queryFn: () => api.superStudents(token, qs),
    enabled: !!token,
  });

  useEffect(() => {
    if (q.error?.status === 401) logout();
  }, [q.error, logout]);

  return q;
}

export default function SuperStudents() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = useAuth();
  const invalidate = useInvalidate();
  const qc = useQueryClient();

  const [rawSearch, setRawSearch] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(rawSearch.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [rawSearch]);

  const { data, isLoading, error } = useStudentsQuery(search, statusFilter, page);

  const items = data?.students ?? data?.items ?? [];
  const pageCount = data?.pageCount ?? 1;
  const total = data?.total ?? items.length;
  const activeCount = items.filter((s) => s.status === 'active' || !s.frozen).length;

  const deleteMutation = useMutation({
    mutationFn: (id) => api.superDeleteStudent(token, id),
    onSuccess: () => {
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['super-students'] });
    },
  });

  const handleFilterChange = (f) => {
    setStatusFilter(f);
    setPage(1);
  };

  const statusBadge = (student) => {
    const frozen = student.frozen || student.status === 'frozen';
    return frozen
      ? <StatusBadge tone="danger">{t('super.students.frozen')}</StatusBadge>
      : <StatusBadge tone="success">{t('super.students.active')}</StatusBadge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('super.students.title')} subtitle={t('super.students.subtitle')} />

      {/* Stat pills */}
      <div className="flex flex-wrap gap-3">
        <Metric size="sm" Icon={Users} tone="primary" label={t('super.students.total')} value={total} />
        <Metric size="sm" Icon={UserCheck} tone="success" label={t('super.students.onPage')} value={items.length} />
        <Metric size="sm" Icon={UserCheck} tone="info" label={t('super.students.activeCount')} value={activeCount} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={rawSearch}
          onChange={setRawSearch}
          placeholder={t('super.students.searchPlaceholder')}
          className="flex-1 max-w-sm"
        />
        <FilterPills
          options={[
            { key: 'all', label: t('super.students.filterAll') },
            { key: 'active', label: t('super.students.filterActive') },
            { key: 'frozen', label: t('super.students.filterFrozen') },
          ]}
          value={statusFilter}
          onChange={handleFilterChange}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <SkeletonTable rows={8} cols={5} />
      ) : error && error.status !== 401 ? (
        <div className="alert alert-error text-sm">
          <span>{error.message}</span>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-base-content/40 text-sm">
          {t('super.students.noneFound')}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>{t('super.students.colFullName')}</th>
                  <th>{t('super.students.colPhone')}</th>
                  <th>{t('super.students.colStatus')}</th>
                  <th>{t('super.students.colCreated')}</th>
                  <th className="text-right">{t('super.students.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((student) => {
                  const fullName = `${student.firstName ?? student.first_name ?? ''} ${student.lastName ?? student.last_name ?? ''}`.trim();
                  return (
                    <tr
                      key={student.id}
                      className="hover cursor-pointer"
                      onClick={() => navigate(`/students/${student.id}`)}
                    >
                      <td>
                        <div className="flex items-center gap-2">
                          <Avatar name={fullName || 'S'} size="md" />
                          <span className="font-medium text-sm">{fullName || '—'}</span>
                        </div>
                      </td>
                      <td className="text-sm text-base-content/70">
                        {student.phone || '—'}
                      </td>
                      <td>{statusBadge(student)}</td>
                      <td className="text-sm text-base-content/50">
                        {dateShort(student.createdAt ?? student.created_at)}
                      </td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => setDeleteTarget(student)}
                          title={t('super.students.delete')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-base-200">
              <span className="text-xs text-base-content/50">
                {t('super.students.pageOf', { page, pageCount })}
              </span>
              <div className="join">
                <button
                  className="join-item btn btn-xs"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  «
                </button>
                <button
                  className="join-item btn btn-xs"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => p + 1)}
                >
                  »
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Delete confirm modal */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('super.students.deleteStudentTitle')}
        text={
          <>
            {t('super.students.deleteConfirmPrefix')}{' '}
            <strong>
              {`${deleteTarget?.firstName ?? deleteTarget?.first_name ?? ''} ${deleteTarget?.lastName ?? deleteTarget?.last_name ?? ''}`.trim()}
            </strong>
            {t('super.students.deleteConfirmSuffix')}
          </>
        }
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        pending={deleteMutation.isPending}
        error={deleteMutation.error}
      />
    </div>
  );
}
