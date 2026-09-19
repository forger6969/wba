import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown, ChevronRight, CheckCircle, XCircle,
  LogIn, LogOut, Plus, Pencil, Trash2, Archive,
  ShieldAlert, Eye, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../auth.jsx';
import { api } from '../../api.js';
import PageHeader from '../../components/PageHeader.jsx';
import { SkeletonTable } from '../../components/Skeleton.jsx';
import { Card, SearchInput, StatusBadge } from './_ui.jsx';

const LOCALE_OF = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };

// ---- Constants ----

const actionMetaFor = (t) => ({
  'auth.login':          { label: t('super.audit.actionAuthLogin'),          Icon: LogIn,       color: 'text-success' },
  'auth.logout':         { label: t('super.audit.actionAuthLogout'),         Icon: LogOut,      color: 'text-base-content/50' },
  'auth.login.failed':   { label: t('super.audit.actionAuthLoginFailed'),    Icon: ShieldAlert, color: 'text-error' },
  'student.create':      { label: t('super.audit.actionStudentCreate'),      Icon: Plus,        color: 'text-info' },
  'student.update':      { label: t('super.audit.actionStudentUpdate'),      Icon: Pencil,      color: 'text-warning' },
  'student.delete':      { label: t('super.audit.actionStudentDelete'),      Icon: Trash2,      color: 'text-error' },
  'student.freeze':      { label: t('super.audit.actionStudentFreeze'),      Icon: ShieldAlert, color: 'text-warning' },
  'student.unfreeze':    { label: t('super.audit.actionStudentUnfreeze'),    Icon: CheckCircle, color: 'text-success' },
  'admin.create':        { label: t('super.audit.actionAdminCreate'),        Icon: Plus,        color: 'text-info' },
  'admin.update':        { label: t('super.audit.actionAdminUpdate'),        Icon: Pencil,      color: 'text-warning' },
  'admin.freeze':        { label: t('super.audit.actionAdminFreeze'),        Icon: ShieldAlert, color: 'text-warning' },
  'branch.create':       { label: t('super.audit.actionBranchCreate'),       Icon: Plus,        color: 'text-info' },
  'branch.update':       { label: t('super.audit.actionBranchUpdate'),       Icon: Pencil,      color: 'text-warning' },
  'branch.archive':      { label: t('super.audit.actionBranchArchive'),      Icon: Archive,     color: 'text-warning' },
  'branch.unarchive':    { label: t('super.audit.actionBranchUnarchive'),    Icon: RefreshCw,   color: 'text-success' },
  'group.create':        { label: t('super.audit.actionGroupCreate'),        Icon: Plus,        color: 'text-info' },
  'group.update':        { label: t('super.audit.actionGroupUpdate'),        Icon: Pencil,      color: 'text-warning' },
  'group.archive':       { label: t('super.audit.actionGroupArchive'),       Icon: Archive,     color: 'text-warning' },
  'payment.create':      { label: t('super.audit.actionPaymentCreate'),      Icon: Plus,        color: 'text-success' },
  'payment.refund':      { label: t('super.audit.actionPaymentRefund'),      Icon: XCircle,     color: 'text-error' },
  'settings.update':     { label: t('super.audit.actionSettingsUpdate'),     Icon: Pencil,      color: 'text-base-content/60' },
  'announcement.create': { label: t('super.audit.actionAnnouncementCreate'), Icon: Plus,        color: 'text-info' },
  'announcement.delete': { label: t('super.audit.actionAnnouncementDelete'), Icon: Trash2,      color: 'text-error' },
});

const roleLabelFor = (t) => ({
  ceo:         t('super.audit.roleCeo'),
  admin:       t('super.audit.roleAdmin'),
  mentor:      t('super.audit.roleMentor'),
  methodist:   t('super.audit.roleMethodist'),
  student:     t('super.audit.roleStudent'),
  parent:      t('super.audit.roleParent'),
  main_admin:  t('super.audit.roleMainAdmin'),
});

const ROLE_TONE = {
  ceo: 'primary',
  admin:      'info',
  mentor:     'success',
  methodist:  'warning',
  student:    'neutral',
  parent:     'neutral',
  main_admin: 'neutral',
};

// ---- Helpers ----

function timeAgo(iso, t) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return t('super.audit.secondsAgo', { n: s });
  const m = Math.floor(s / 60);
  if (m < 60) return t('super.audit.minutesAgo', { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('super.audit.hoursAgo', { n: h });
  const d = Math.floor(h / 24);
  return t('super.audit.daysAgo', { n: d });
}

function formatFull(iso, locale) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(iso));
}

function describeMeta(meta) {
  if (!meta) return null;
  if (typeof meta === 'string') {
    try { meta = JSON.parse(meta); } catch (_) { return meta; }
  }
  return JSON.stringify(meta, null, 2);
}

// ---- Query ----

function useAuditQuery() {
  const { token, logout } = useAuth();
  const q = useQuery({
    queryKey: ['super-audit'],
    queryFn: () => api.superAudit(token),
    enabled: !!token,
    refetchInterval: 5000,
  });
  useEffect(() => {
    if (q.error?.status === 401) logout();
  }, [q.error, logout]);
  return q;
}

// ---- Component ----

export default function SuperAudit() {
  const { t, i18n } = useTranslation();
  const locale = LOCALE_OF[i18n.language] || 'ru-RU';
  const ACTION_META = actionMetaFor(t);
  const ROLE_LABEL = roleLabelFor(t);
  const { data, isLoading, error } = useAuditQuery();
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [expanded, setExpanded] = useState({});

  const items = data?.items ?? [];

  // Derive unique entity types
  const entityTypes = ['all', ...new Set(
    items.map((item) => item.entityType ?? item.entity_type ?? '').filter(Boolean)
  )];

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = items.filter((item) => {
    const action = item.action ?? '';
    const actorName = item.actorName ?? item.actor_name ?? '';
    const entityLabel = item.entityLabel ?? item.entity_label ?? item.entityType ?? item.entity_type ?? '';
    const ip = item.ip ?? '';
    const actionMeta = ACTION_META[action];
    const actionLabel = actionMeta?.label ?? action;

    const matchSearch =
      !search ||
      actorName.toLowerCase().includes(search.toLowerCase()) ||
      entityLabel.toLowerCase().includes(search.toLowerCase()) ||
      actionLabel.toLowerCase().includes(search.toLowerCase()) ||
      ip.includes(search);

    const entityType = item.entityType ?? item.entity_type ?? '';
    const matchEntity = entityFilter === 'all' || entityType === entityFilter;

    return matchSearch && matchEntity;
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t('super.audit.title')} subtitle={t('super.audit.subtitle')} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('super.audit.searchPlaceholder')}
          className="flex-1 max-w-sm"
        />
        <select
          className="select select-bordered select-sm"
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
        >
          {entityTypes.map((et) => (
            <option key={et} value={et}>{et === 'all' ? t('super.audit.allEntities') : et}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <SkeletonTable rows={8} cols={5} />
      ) : error && error.status !== 401 ? (
        <div className="alert alert-error text-sm"><span>{error.message}</span></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-base-content/40 text-sm">{t('super.audit.noneFound')}</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th className="w-8" />
                  <th>{t('super.audit.colAction')}</th>
                  <th>{t('super.audit.colWho')}</th>
                  <th>{t('super.audit.colEntity')}</th>
                  <th>{t('super.audit.colIp')}</th>
                  <th>{t('super.audit.colTime')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const action = item.action ?? '';
                  const meta = ACTION_META[action] ?? { label: action, Icon: Eye, color: 'text-base-content/60' };
                  const { label, Icon, color } = meta;
                  const success = item.success ?? item.ok ?? true;
                  const actorName = item.actorName ?? item.actor_name ?? '—';
                  const actorRole = item.actorRole ?? item.actor_role ?? '';
                  const entityLabel = item.entityLabel ?? item.entity_label ?? item.entityType ?? item.entity_type ?? '—';
                  const ip = item.ip ?? '—';
                  const createdAt = item.createdAt ?? item.created_at;
                  const isExpanded = !!expanded[item.id];
                  const userAgent = item.userAgent ?? item.user_agent ?? '—';
                  const metaStr = describeMeta(item.meta);

                  return [
                    <tr key={item.id} className="hover">
                      <td>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => toggleExpand(item.id)}
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                      <td>
                        <div className={`flex items-center gap-2 ${color}`}>
                          <Icon size={15} />
                          <span className="font-medium text-sm">{label}</span>
                          {success
                            ? <CheckCircle size={12} className="text-success" />
                            : <XCircle size={12} className="text-error" />
                          }
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium">{actorName}</span>
                          {actorRole && (
                            <StatusBadge tone={ROLE_TONE[actorRole] ?? 'neutral'}>
                              {ROLE_LABEL[actorRole] ?? actorRole}
                            </StatusBadge>
                          )}
                        </div>
                      </td>
                      <td className="text-sm text-base-content/70">{entityLabel}</td>
                      <td className="text-xs font-mono text-base-content/50">{ip}</td>
                      <td className="text-xs text-base-content/50 whitespace-nowrap">
                        {timeAgo(createdAt, t)}
                      </td>
                    </tr>,
                    isExpanded && (
                      <tr key={`${item.id}-exp`} className="bg-base-200/40">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2 text-xs">
                            <div>
                              <div className="font-semibold text-base-content/50 mb-0.5">{t('super.audit.exactTime')}</div>
                              <div>{formatFull(createdAt, locale)}</div>
                            </div>
                            <div>
                              <div className="font-semibold text-base-content/50 mb-0.5">{t('super.audit.who')}</div>
                              <div>{actorName} ({ROLE_LABEL[actorRole] ?? actorRole})</div>
                            </div>
                            <div>
                              <div className="font-semibold text-base-content/50 mb-0.5">{t('super.audit.action')}</div>
                              <div className="font-mono">{action}</div>
                            </div>
                            <div>
                              <div className="font-semibold text-base-content/50 mb-0.5">{t('super.audit.entity')}</div>
                              <div>{entityLabel}</div>
                            </div>
                            <div>
                              <div className="font-semibold text-base-content/50 mb-0.5">{t('super.audit.ip')}</div>
                              <div className="font-mono">{ip}</div>
                            </div>
                            <div>
                              <div className="font-semibold text-base-content/50 mb-0.5">{t('super.audit.userAgent')}</div>
                              <div className="truncate max-w-xs">{userAgent}</div>
                            </div>
                            {metaStr && (
                              <div className="col-span-2 md:col-span-3">
                                <div className="font-semibold text-base-content/50 mb-0.5">{t('super.audit.meta')}</div>
                                <pre className="bg-base-300 rounded p-2 text-xs overflow-x-auto max-h-32">
                                  {metaStr}
                                </pre>
                              </div>
                            )}
                          </div>
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
    </div>
  );
}
