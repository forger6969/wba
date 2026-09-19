import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CircleCheck, CircleAlert, CircleX, Receipt } from 'lucide-react';
import { useAuth } from '../../auth.jsx';
import { api } from '../../api.js';
import { money, dateShort } from '../../format.js';
import PageHeader from '../../components/PageHeader.jsx';
import { SkeletonList } from '../../components/Skeleton.jsx';
import { Card, EmptyState, StatusBadge } from './_ui.jsx';

const reasonLabelFor = (t) => ({
  frozen: t('super.billing.reasonFrozen'),
  no_payment: t('super.billing.reasonNoPayment'),
  grace_period: t('super.billing.reasonGracePeriod'),
  payment_overdue: t('super.billing.reasonPaymentOverdue'),
});

const ledgerTypeFor = (t) => ({
  payment: { label: t('super.billing.ledgerPayment'), tone: 'success' },
  bonus: { label: t('super.billing.ledgerBonus'), tone: 'info' },
  addon_credit: { label: t('super.billing.ledgerAddonCredit'), tone: 'warning' },
});

function useBilling() {
  const { token, logout } = useAuth();
  const q = useQuery({
    queryKey: ['super-billing'],
    queryFn: () => api.superBilling(token),
    enabled: !!token,
  });
  useEffect(() => { if (q.error?.status === 401) logout(); }, [q.error, logout]);
  return q;
}

function useLedger() {
  const { token, logout } = useAuth();
  const q = useQuery({
    queryKey: ['super-billing-ledger'],
    queryFn: () => api.superBillingLedger(token),
    enabled: !!token,
  });
  useEffect(() => { if (q.error?.status === 401) logout(); }, [q.error, logout]);
  return q;
}

const STATUS_TONE_CLS = {
  error: { card: 'border-error/30 bg-error/5', icon: 'text-error' },
  warning: { card: 'border-warning/30 bg-warning/5', icon: 'text-warning' },
  success: { card: 'border-success/30 bg-success/5', icon: 'text-success' },
};

function StatusCard({ billing }) {
  const { t } = useTranslation();
  const REASON_LABEL = reasonLabelFor(t);
  if (!billing) return null;
  const { blocked, reason, accessUntil } = billing;

  const Icon = blocked ? CircleX : reason === 'grace_period' ? CircleAlert : CircleCheck;
  const tone = blocked ? 'error' : reason === 'grace_period' ? 'warning' : 'success';
  const cls = STATUS_TONE_CLS[tone];

  return (
    <Card className={`p-5 ${cls.card}`}>
      <div className="flex items-center gap-3">
        <Icon size={22} className={cls.icon} />
        <div>
          <div className="font-bold text-sm">
            {blocked ? t('super.billing.accessBlocked') : reason === 'grace_period' ? t('super.billing.gracePeriod') : t('super.billing.accessActive')}
          </div>
          <div className="text-xs text-base-content/55 mt-0.5">
            {accessUntil ? t('super.billing.paidUntil', { date: dateShort(accessUntil) }) : t('super.billing.paymentNotRecorded')}
            {reason && REASON_LABEL[reason] && ` · ${REASON_LABEL[reason]}`}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function SuperBilling() {
  const { t } = useTranslation();
  const LEDGER_TYPE = ledgerTypeFor(t);
  const { data: billing, isLoading: billingLoading } = useBilling();
  const { data: ledger, isLoading: ledgerLoading } = useLedger();
  const items = ledger?.items ?? [];

  return (
    <div className="space-y-8">
      <PageHeader title={t('super.billing.title')} subtitle={t('super.billing.subtitle')} />

      {billingLoading ? <SkeletonList rows={1} /> : <StatusCard billing={billing} />}

      <section className="space-y-3">
        <h2 className="font-bold text-sm flex items-center gap-2"><Receipt size={15} className="text-primary" /> {t('super.billing.journal')}</h2>
        {ledgerLoading ? (
          <SkeletonList rows={3} />
        ) : items.length === 0 ? (
          <Card><EmptyState icon={Receipt} title={t('super.billing.noEntriesYet')} /></Card>
        ) : (
          <div className="space-y-2">
            {items.map((row) => {
              const meta = LEDGER_TYPE[row.type] ?? { label: row.type, tone: 'neutral' };
              return (
                <Card key={row.id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-2">
                      <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                      {row.feature_label && <span className="text-base-content/60">{row.feature_label}</span>}
                    </div>
                    <div className="text-xs text-base-content/45 mt-0.5">
                      {dateShort(row.created_at)}
                      {row.period_covered && t('super.billing.periodSuffix', { period: row.period_covered })}
                      {row.months_granted && t('super.billing.monthsGrantedSuffix', { months: row.months_granted })}
                      {row.method && ` · ${row.method}`}
                    </div>
                  </div>
                  <div className="font-bold text-sm tabular-nums shrink-0">
                    {row.type === 'addon_credit' ? '−' : ''}{money(row.amount)}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
