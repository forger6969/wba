import { CheckCircle2, XCircle, Layers } from 'lucide-react';
import { useQueueHealth } from '../queries.js';
import PageHeader from '../components/PageHeader.jsx';
import { Panel, RowSkeleton } from '../components/_ui.jsx';

/**
 * Очереди BullMQ (Karis 26.08.2026).
 *
 * Все 7 очередей работают через тот же Redis, что упирался в лимит запросов
 * 25.08.2026 — если он снова недоступен, уведомления родителям об оплате,
 * просрочка, ежедневный дайджест и AI-проверка ДЗ тихо перестают работать,
 * и раньше это было бы незаметно, пока кто-то не спросит «почему не пришло».
 *
 * Недоступность самой очереди (Redis лежит) НЕ дублируется отдельным
 * предупреждением в Центре контроля — для этого уже есть сигнал
 * «Redis недоступен» из «Здоровья системы». Здесь появляется предупреждение
 * только когда очередь ДОСТУПНА, но задачи в ней реально проваливаются
 * после всех попыток — это другая, самостоятельная проблема.
 */

const QUEUE_LABEL = {
  notifications: 'Уведомления (Telegram/SMS/email)',
  'ai-review': 'AI-проверка домашних заданий',
  billing: 'Биллинг — начисление счетов',
  'chat-retention': 'Очистка старых сообщений чата',
  'daily-digest': 'Ежедневный дайджест',
  'due-soon': 'Напоминания о скором платеже',
  overdue: 'Просрочка платежей',
};

function CountPill({ label, value, tone = 'neutral' }) {
  const toneCls = {
    neutral: 'bg-base-200 text-base-content/60',
    danger: 'bg-error/10 text-error',
    warning: 'bg-warning/10 text-warning',
  }[tone];
  return (
    <div className={`rounded-md px-2.5 py-1 text-center ${toneCls}`}>
      <div className="text-sm font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
    </div>
  );
}

function QueueRow({ q }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`w-9 h-9 rounded-md grid place-items-center shrink-0 ${q.ok ? 'bg-ink/[0.06] text-ink' : 'bg-error/10 text-error'}`}>
          <Layers size={15} strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{QUEUE_LABEL[q.name] ?? q.name}</div>
          <div className="text-xs text-base-content/40 font-mono truncate">{q.name}</div>
        </div>
      </div>

      {q.ok ? (
        <div className="flex items-center gap-2 shrink-0">
          <CountPill label="Ждут" value={q.counts.waiting} />
          <CountPill label="В работе" value={q.counts.active} />
          <CountPill label="Отложено" value={q.counts.delayed} />
          <CountPill label="Провалено" value={q.counts.failed} tone={q.counts.failed > 0 ? 'danger' : 'neutral'} />
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-error text-sm font-semibold shrink-0">
          <XCircle size={15} /> Недоступна
        </div>
      )}
    </div>
  );
}

export default function QueueHealth() {
  const { data, isLoading, error } = useQueueHealth();

  if (error && error.status !== 401) {
    return <div className="alert alert-error text-sm"><span>{error.message}</span></div>;
  }

  const queues = data?.queues ?? [];
  const allOk = queues.length > 0 && queues.every((q) => q.ok);
  const anyFailed = queues.some((q) => q.ok && q.counts.failed > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Очереди"
        subtitle="Уведомления, биллинг, напоминания и AI-проверка — всё через BullMQ/Redis"
      />

      {isLoading ? (
        <div className="p-5"><RowSkeleton count={4} height="h-16" /></div>
      ) : (
        <>
          {!allOk && (
            <div className="alert bg-error/10 border border-error/30 text-sm">
              <XCircle size={18} className="text-error shrink-0" />
              <span className="text-base-content/70">Часть очередей недоступна — обычно это значит, что недоступен сам Redis (см. «Здоровье системы»).</span>
            </div>
          )}
          {allOk && anyFailed && (
            <div className="alert bg-warning/10 border border-warning/30 text-sm">
              <XCircle size={18} className="text-warning shrink-0" />
              <span className="text-base-content/70">Очереди доступны, но в некоторых есть проваленные задачи — стоит посмотреть, что не прошло.</span>
            </div>
          )}
          {allOk && !anyFailed && (
            <div className="alert bg-success/10 border border-success/30 text-sm">
              <CheckCircle2 size={18} className="text-success shrink-0" />
              <span className="text-base-content/70">Все очереди работают, проваленных задач нет.</span>
            </div>
          )}

          <Panel bodyClass="p-0">
            <div className="divide-y divide-base-200">
              {queues.map((q) => <QueueRow key={q.name} q={q} />)}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
