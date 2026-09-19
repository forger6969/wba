import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Puzzle, Send, XCircle, Clock3, CheckCircle2, History } from 'lucide-react';
import { useAuth } from '../../auth.jsx';
import { api } from '../../api.js';
import PageHeader from '../../components/PageHeader.jsx';
import { SkeletonList } from '../../components/Skeleton.jsx';
import { Card, EmptyState, StatusBadge } from './_ui.jsx';

const LOCALE_OF = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };
const money = (n, locale) => `${Number(n || 0).toLocaleString(locale)} UZS`;

const STATUS_TONE = { pending: 'warning', approved: 'success', rejected: 'danger' };
const statusLabelFor = (t) => ({ pending: t('super.features.statusPending'), approved: t('super.features.statusApproved'), rejected: t('super.features.statusRejected') });
const typeLabelFor = (t) => ({ add: t('super.features.typeAdd'), remove: t('super.features.typeRemove') });

function useCatalogQuery() {
  const { token, logout } = useAuth();
  const q = useQuery({
    queryKey: ['super-feature-catalog'],
    queryFn: () => api.superFeatureCatalog(token),
    enabled: !!token,
  });
  useEffect(() => { if (q.error?.status === 401) logout(); }, [q.error, logout]);
  return q;
}

function useRequestsQuery() {
  const { token, logout } = useAuth();
  const q = useQuery({
    queryKey: ['super-feature-requests'],
    queryFn: () => api.superFeatureRequests(token),
    enabled: !!token,
  });
  useEffect(() => { if (q.error?.status === 401) logout(); }, [q.error, logout]);
  return q;
}

/**
 * Тумблера здесь нет — CEO не переключает фичу сам, только просит.
 * Main Admin рассматривает заявку на своей стороне (Main Admin → Фичи).
 */
function FeatureRow({ feature, pendingByKey, onRequest, busy }) {
  const { t, i18n } = useTranslation();
  const locale = LOCALE_OF[i18n.language] || 'ru-RU';
  const TYPE_LABEL = typeLabelFor(t);
  const enabled = !!feature.enabled;
  const pending = pendingByKey.get(feature.feature_key);

  return (
    <div className="flex items-center justify-between p-4 border border-base-200 rounded-xl">
      <div>
        <div className="font-semibold text-sm flex items-center gap-2">
          {feature.label}
          {enabled && <StatusBadge tone="success">{t('super.features.enabled')}</StatusBadge>}
        </div>
        <div className="text-xs text-base-content/45 mt-0.5">{t('super.features.perMonth', { price: money(feature.price, locale) })}</div>
      </div>

      {pending ? (
        <StatusBadge tone="warning">
          {t('super.features.requestPendingLabel', { type: TYPE_LABEL[pending.type] })}
        </StatusBadge>
      ) : enabled ? (
        <button
          className="btn btn-xs btn-ghost text-error gap-1"
          disabled={busy === feature.feature_key}
          onClick={() => onRequest(feature.feature_key, 'remove')}
        >
          <XCircle size={13} /> {t('super.features.requestDisable')}
        </button>
      ) : (
        <button
          className="btn btn-xs btn-primary gap-1"
          disabled={busy === feature.feature_key}
          onClick={() => onRequest(feature.feature_key, 'add')}
        >
          {busy === feature.feature_key
            ? <span className="loading loading-spinner loading-xs" />
            : <><Send size={13} /> {t('super.features.requestEnable')}</>}
        </button>
      )}
    </div>
  );
}

export default function SuperFeatures() {
  const { t, i18n } = useTranslation();
  const locale = LOCALE_OF[i18n.language] || 'ru-RU';
  const STATUS_LABEL = statusLabelFor(t);
  const TYPE_LABEL = typeLabelFor(t);
  const { token } = useAuth();
  const qc = useQueryClient();
  const { data: catalog, isLoading: catalogLoading } = useCatalogQuery();
  const { data: requests, isLoading: requestsLoading } = useRequestsQuery();
  const [busyKey, setBusyKey] = useState(null);
  const [err, setErr] = useState('');

  // Бэкенд отдаёт { catalog: [...] } и { requests: [...] } (super.controller.js
  // getFeatureCatalog/listOwnFeatureRequests) — не { items }, отсюда и был баг
  // "items.map is not a function" (fallback ловил весь объект-обёртку целиком).
  const items = catalog?.catalog ?? [];
  const requestList = requests?.requests ?? [];
  const pendingByKey = new Map(
    requestList.filter((r) => r.status === 'pending').map((r) => [r.feature_key, r]),
  );

  const requestMutation = useMutation({
    mutationFn: ({ featureKey, type }) => api.superCreateFeatureRequest(token, { featureKey, type }),
    onMutate: ({ featureKey }) => setBusyKey(featureKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super-feature-requests'] });
      setErr('');
    },
    onError: (e) => setErr(e.message),
    onSettled: () => setBusyKey(null),
  });

  const handleRequest = (featureKey, type) => {
    setErr('');
    requestMutation.mutate({ featureKey, type });
  };

  return (
    <div className="space-y-8">
      <PageHeader title={t('super.features.title')} subtitle={t('super.features.subtitle')} />

      {err && <div className="alert alert-error text-sm"><span>{err}</span></div>}

      <section className="space-y-3">
        <h2 className="font-bold text-sm flex items-center gap-2"><Puzzle size={15} className="text-primary" /> {t('super.features.availableFeatures')}</h2>
        {catalogLoading ? (
          <SkeletonList rows={3} />
        ) : items.length === 0 ? (
          <Card><EmptyState icon={Puzzle} title={t('super.features.catalogEmpty')} /></Card>
        ) : (
          <div className="space-y-2">
            {items.map((f) => (
              <FeatureRow
                key={f.feature_key}
                feature={f}
                pendingByKey={pendingByKey}
                onRequest={handleRequest}
                busy={busyKey}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-sm flex items-center gap-2"><History size={15} className="text-primary" /> {t('super.features.myRequests')}</h2>
        {requestsLoading ? (
          <SkeletonList rows={2} />
        ) : requestList.length === 0 ? (
          <Card><EmptyState icon={Clock3} title={t('super.features.noRequestsYet')} /></Card>
        ) : (
          <div className="space-y-2">
            {requestList.map((r) => (
              <Card key={r.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-sm">
                    {TYPE_LABEL[r.type]} — {r.feature_label ?? r.feature_key}
                  </div>
                  <div className="text-xs text-base-content/45">
                    {new Date(r.created_at ?? r.createdAt).toLocaleDateString(locale)}
                  </div>
                </div>
                <StatusBadge tone={STATUS_TONE[r.status]}>
                  {r.status === 'approved' && <CheckCircle2 size={12} className="inline mr-1" />}
                  {STATUS_LABEL[r.status] ?? r.status}
                </StatusBadge>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
