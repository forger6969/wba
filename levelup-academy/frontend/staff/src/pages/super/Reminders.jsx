import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Bell, Trash2, ChevronDown, ChevronRight,
  CheckCircle, XCircle, Clock, RefreshCw,
  ListOrdered, History,
} from 'lucide-react';
import { useAuth } from '../../auth.jsx';
import { api } from '../../api.js';
import PageHeader from '../../components/PageHeader.jsx';
import { SkeletonTable } from '../../components/Skeleton.jsx';
import { dateShort } from '../../format.js';
import { Card, Metric, FilterPills, StatusBadge, EmptyState } from './_ui.jsx';

// ---- Query ----

function useRemindersQuery() {
  const { token, logout } = useAuth();
  const q = useQuery({
    queryKey: ['super-reminders'],
    queryFn: () => api.superReminders(token),
    enabled: !!token,
    refetchInterval: 2000,
  });
  useEffect(() => {
    if (q.error?.status === 401) logout();
  }, [q.error, logout]);
  return q;
}

// ---- Status helpers ----

function statusBadge(status, t) {
  if (status === 'sent') return <StatusBadge tone="success">{t('super.reminders.statusSent')}</StatusBadge>;
  if (status === 'failed') return <StatusBadge tone="danger">{t('super.reminders.statusFailed')}</StatusBadge>;
  if (status === 'pending') return <StatusBadge tone="warning">{t('super.reminders.statusPending')}</StatusBadge>;
  return <StatusBadge>{status}</StatusBadge>;
}

function statusIcon(status) {
  if (status === 'sent') return <CheckCircle size={15} className="text-success" />;
  if (status === 'failed') return <XCircle size={15} className="text-error" />;
  return <Clock size={15} className="text-warning" />;
}

// ---- Main Component ----

export default function SuperReminders() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, error } = useRemindersQuery();
  const items = data?.items ?? data?.reminders ?? [];

  const [tab, setTab] = useState('history'); // 'rules' | 'history'
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded] = useState({});

  const deleteMutation = useMutation({
    mutationFn: (id) => api.superDeleteReminder(token, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['super-reminders'] }),
  });

  const resendMutation = useMutation({
    mutationFn: (id) => api.superResendReminder(token, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['super-reminders'] }),
  });

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = items.filter((item) => {
    return statusFilter === 'all' || item.status === statusFilter;
  });

  const totalCount   = items.length;
  const sentCount    = items.filter((i) => i.status === 'sent').length;
  const failedCount  = items.filter((i) => i.status === 'failed').length;
  const pendingCount = items.filter((i) => i.status === 'pending').length;

  return (
    <div className="space-y-6">
      <PageHeader title={t('super.reminders.title')} subtitle={t('super.reminders.subtitle')} />

      {/* Tabs */}
      <FilterPills
        options={[
          { key: 'rules', label: <span className="flex items-center gap-2"><ListOrdered size={14} /> {t('super.reminders.tabRules')}</span> },
          { key: 'history', label: <span className="flex items-center gap-2"><History size={14} /> {t('super.reminders.tabHistory')}</span> },
        ]}
        value={tab}
        onChange={setTab}
      />

      {/* Rules tab */}
      {tab === 'rules' && (
        <Card>
          <EmptyState
            icon={Bell}
            title={t('super.reminders.rulesComingSoonTitle')}
            hint={t('super.reminders.rulesComingSoonHint')}
          />
        </Card>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <Metric Icon={Bell} tone="neutral" label={t('super.reminders.total')} value={totalCount} />
            <Metric Icon={CheckCircle} tone="success" label={t('super.reminders.statusSent')} value={sentCount} />
            <Metric Icon={XCircle} tone="danger" label={t('super.reminders.statusFailed')} value={failedCount} />
            <Metric Icon={Clock} tone="warning" label={t('super.reminders.statusPending')} value={pendingCount} />
          </div>

          {/* Filter buttons */}
          <FilterPills
            options={[
              { key: 'all', label: t('super.reminders.filterAll') },
              { key: 'sent', label: t('super.reminders.statusSent') },
              { key: 'failed', label: t('super.reminders.statusFailed') },
              { key: 'pending', label: t('super.reminders.statusPending') },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />

          {/* Table */}
          {isLoading ? (
            <SkeletonTable rows={6} cols={5} />
          ) : error && error.status !== 401 ? (
            <div className="alert alert-error text-sm"><span>{error.message}</span></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-base-content/40 text-sm">
              {t('super.reminders.noneFound')}
            </div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th className="w-8" />
                      <th>{t('super.reminders.colStudent')}</th>
                      <th>{t('super.reminders.colParent')}</th>
                      <th>{t('super.reminders.colMessage')}</th>
                      <th>{t('super.reminders.colStatus')}</th>
                      <th>{t('super.reminders.colSent')}</th>
                      <th className="text-right">{t('super.reminders.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => {
                      const isExpanded = !!expanded[item.id];
                      const studentName = item.studentName ?? item.student_name ?? '—';
                      const parentName  = item.parentName  ?? item.parent_name  ?? '—';
                      const message     = item.message     ?? item.text         ?? '';
                      const sentAt      = item.sentAt      ?? item.sent_at      ?? item.createdAt ?? item.created_at;

                      return [
                        <tr key={item.id} className="hover">
                          <td>
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => toggleExpand(item.id)}
                            >
                              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            </button>
                          </td>
                          <td className="text-sm font-medium">{studentName}</td>
                          <td className="text-sm text-base-content/70">{parentName}</td>
                          <td className="max-w-xs">
                            <p className="text-sm text-base-content/70 truncate">{message}</p>
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              {statusIcon(item.status)}
                              {statusBadge(item.status, t)}
                            </div>
                          </td>
                          <td className="text-xs text-base-content/50">
                            {sentAt ? dateShort(sentAt) : '—'}
                          </td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {item.status === 'failed' && (
                                <button
                                  className="btn btn-ghost btn-xs text-info"
                                  title={t('super.reminders.resend')}
                                  onClick={() => resendMutation.mutate(item.id)}
                                  disabled={resendMutation.isPending}
                                >
                                  <RefreshCw size={13} />
                                </button>
                              )}
                              <button
                                className="btn btn-ghost btn-xs text-error"
                                title={t('super.reminders.delete')}
                                onClick={() => deleteMutation.mutate(item.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>,
                        isExpanded && (
                          <tr key={`${item.id}-exp`} className="bg-base-200/40">
                            <td colSpan={7} className="px-6 py-4">
                              <p className="text-sm text-base-content/80 whitespace-pre-wrap leading-relaxed">
                                {message || t('super.reminders.noText')}
                              </p>
                            </td>
                          </tr>
                        ),
                      ];
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
