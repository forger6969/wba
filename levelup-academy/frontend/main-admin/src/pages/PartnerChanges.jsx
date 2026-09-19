import { useState } from 'react';
import { Link } from 'react-router-dom';
import { History, Building2, Clock } from 'lucide-react';
import { usePartnerChanges } from '../queries.js';
import { dateTime } from '../format.js';
import PageHeader from '../components/PageHeader.jsx';
import { Panel, EmptyState, FilterPills } from '../components/_ui.jsx';
import { SkeletonList } from '../components/Skeleton.jsx';

/**
 * Свод «что изменилось» по партнёрам (Karis 26.08.2026, пункт #10).
 *
 * Не новая телеметрия — тот же audit_log, что питает «Историю изменений»
 * (Audit.jsx), только сгруппированный по партнёру и отсортированный по
 * свежести: кому что поменяли за последнее время, без ручного перебора
 * общего журнала по одному партнёру за раз.
 */

const PERIODS = [
  { key: 7, label: '7 дней' },
  { key: 30, label: '30 дней' },
];

// Та же читаемая подпись, что в Audit.jsx (ACTION_META) — короткое
// дублирование ради независимости страниц, не выносим ради двух мест.
const ACTION_LABEL = {
  'partner.onboarded': 'Партнёр подключён',
  'partner.status_changed': 'Статус изменён',
  'partner.payment_recorded': 'Платёж зафиксирован',
  'partner.bonus_granted': 'Бонусные месяцы начислены',
  'partner.feature_enabled': 'Фича включена',
  'partner.feature_disabled': 'Фича отключена',
  'partner.feature_request_approve': 'Заявка на фичу одобрена',
  'partner.feature_request_reject': 'Заявка на фичу отклонена',
  'platform_invoice.generated': 'Счёт выставлен',
  'platform_invoice.cancelled': 'Счёт отменён',
};

function EventRow({ event }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-xs">
      <div className="min-w-0">
        <span className="font-semibold">{ACTION_LABEL[event.action] || event.action}</span>
        {event.entityLabel && <span className="text-base-content/50"> · {event.entityLabel}</span>}
        {event.reason && <span className="text-base-content/40 italic"> — {event.reason}</span>}
      </div>
      <span className="shrink-0 text-base-content/35">{dateTime(event.createdAt)}</span>
    </div>
  );
}

function OrgDigestCard({ item }) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <Link to={`/organizations/${item.organizationId}`} className="font-semibold text-sm hover:underline flex items-center gap-1.5">
          <Building2 size={13} className="text-base-content/40" /> {item.organizationName}
        </Link>
        <span className="text-xs text-base-content/45 inline-flex items-center gap-1">
          <Clock size={11} /> {item.changesCount} {item.changesCount === 1 ? 'изменение' : 'изменений'}
        </span>
      </div>
      <div className="divide-y divide-base-200/70 rounded-md bg-base-200/30 px-3">
        {item.events.map((e, i) => <EventRow key={i} event={e} />)}
      </div>
      {item.changesCount > item.events.length && (
        <div className="mt-1.5 text-[11px] text-base-content/35">
          и ещё {item.changesCount - item.events.length} — полный список в «Истории изменений»
        </div>
      )}
    </div>
  );
}

export default function PartnerChanges() {
  const [days, setDays] = useState(7);
  const { data, isLoading } = usePartnerChanges(days);
  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Что изменилось у партнёров"
        subtitle="Статусы, платежи, бонусы, фичи, счета — сгруппировано по партнёру, самые свежие изменения первыми"
      >
        <FilterPills options={PERIODS} value={days} onChange={setDays} />
      </PageHeader>

      <Panel bodyClass="p-0">
        {isLoading ? (
          <div className="p-5"><SkeletonList rows={4} /></div>
        ) : !items.length ? (
          <div className="p-6">
            <EmptyState icon={History} title={`За ${days} дн. изменений не было`} />
          </div>
        ) : (
          <div className="divide-y divide-base-200">
            {items.map((item) => <OrgDigestCard key={item.organizationId} item={item} />)}
          </div>
        )}
      </Panel>
    </div>
  );
}
