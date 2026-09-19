import { Database, Server, HardDrive, CheckCircle2, XCircle, Clock, AlertTriangle, Gauge } from 'lucide-react';
import { useSystemHealth, useStorageHealth } from '../queries.js';
import PageHeader from '../components/PageHeader.jsx';
import { Panel } from '../components/_ui.jsx';
import { SkeletonKpis } from '../components/Skeleton.jsx';

function formatBytes(n) {
  if (!n) return '0 МБ';
  const mb = n / 1_000_000;
  return mb >= 1000 ? `${(mb / 1000).toFixed(2)} ГБ` : `${mb.toFixed(1)} МБ`;
}

/**
 * Здоровье инфраструктуры (Karis 26.08.2026).
 *
 * Раньше публичный /health отвечал 200, пока жив сам процесс — 25.08.2026
 * это доказало себя вредным: Redis (Upstash) упёрся в лимит запросов, а
 * /health продолжал бодро отвечать «ok». Здесь — три настоящие проверки
 * (backend/src/modules/health/health.service.js), и любой сбой ОДНОВРЕМЕННО
 * появляется критическим сигналом в Центре контроля — сюда идут за деталями
 * и историей задержки, а не за первым узнаванием о проблеме.
 */

const SERVICES = [
  { key: 'database', label: 'База данных', hint: 'PostgreSQL (Neon)', Icon: Database },
  { key: 'redis', label: 'Redis', hint: 'Кэш, лимитер, очереди уведомлений', Icon: Server },
  { key: 'storage', label: 'Файловое хранилище', hint: 'S3 / Storj — видео, документы', Icon: HardDrive },
];

function ServiceCard({ label, hint, Icon, check }) {
  const ok = check?.ok;
  return (
    <div className={`card border shadow-sm ${ok ? 'bg-base-100 border-base-200/60' : 'bg-error/5 border-error/30'}`}>
      <div className="card-body p-5">
        <div className="flex items-center gap-2.5">
          <span className={`w-9 h-9 rounded-md grid place-items-center shrink-0 ${ok ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
            <Icon size={16} strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-bold truncate">{label}</div>
            <div className="text-xs text-base-content/45 truncate">{hint}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-3">
          {ok ? <CheckCircle2 size={15} className="text-success" /> : <XCircle size={15} className="text-error" />}
          <span className={`text-sm font-bold ${ok ? 'text-success' : 'text-error'}`}>{ok ? 'Работает' : 'Недоступен'}</span>
        </div>

        <div className="flex items-center gap-1 text-xs text-base-content/45 mt-1.5">
          <Clock size={11} /> {check?.latencyMs ?? '—'} мс
        </div>

        {!ok && check?.error && (
          <p className="text-xs text-error/80 mt-2 bg-error/10 rounded-md px-2.5 py-1.5 break-words font-mono">
            {check.error}
          </p>
        )}
      </div>
    </div>
  );
}

function StorageBar({ label, hint, bytes, limitBytes, percent, objectCount }) {
  const tone = percent == null ? 'bg-primary' : percent >= 95 ? 'bg-error' : percent >= 80 ? 'bg-warning' : 'bg-success';
  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <div>
          <div className="text-sm font-semibold">{label}</div>
          <div className="text-xs text-base-content/40">{hint}{objectCount != null ? ` · ${objectCount} объектов` : ''}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-bold tabular-nums">{formatBytes(bytes)}</div>
          {percent != null && <div className="text-xs text-base-content/45">{percent}% от {formatBytes(limitBytes)}</div>}
        </div>
      </div>
      {percent != null ? (
        <div className="h-1.5 rounded-full bg-base-200 overflow-hidden">
          <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, percent)}%` }} />
        </div>
      ) : (
        <div className="text-[11px] text-base-content/35">
          Лимит не задан в .env — показан только фактический объём, без процента.
        </div>
      )}
    </div>
  );
}

function StoragePanel() {
  const { data, isLoading } = useStorageHealth();
  if (isLoading || !data) return null;
  return (
    <Panel title="Объём хранилища" icon={Gauge}>
      <div className="divide-y divide-base-200">
        <StorageBar
          label="База данных" hint="PostgreSQL (Neon)"
          bytes={data.database.bytes} limitBytes={data.database.limitBytes} percent={data.database.percent}
        />
        <StorageBar
          label="Файлы" hint="S3 / Storj"
          bytes={data.storage.bytes} limitBytes={data.storage.limitBytes} percent={data.storage.percent}
          objectCount={data.storage.objectCount}
        />
      </div>
    </Panel>
  );
}

export default function SystemHealth() {
  const { data, isLoading, error, dataUpdatedAt } = useSystemHealth();

  if (error && error.status !== 401) {
    return <div className="alert alert-error text-sm"><span>{error.message}</span></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Здоровье системы"
        subtitle="Настоящие проверки — не «процесс жив», а реальный ответ базы, Redis и хранилища"
      />

      {isLoading ? (
        <SkeletonKpis count={3} />
      ) : (
        <>
          {!data.ok && (
            <div className="alert bg-error/10 border border-error/30 text-sm">
              <AlertTriangle size={18} className="text-error shrink-0" />
              <span className="text-base-content/70">
                Хотя бы один сервис не отвечает — часть платформы прямо сейчас работает в ограниченном режиме.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SERVICES.map((s) => (
              <ServiceCard key={s.key} {...s} check={data.services[s.key]} />
            ))}
          </div>

          <StoragePanel />

          <Panel title="Как читать эту страницу">
            <ul className="text-sm text-base-content/60 space-y-2 list-disc pl-5">
              <li>Проверка идёт напрямую к сервису с коротким таймаутом (4с) — деградация одного не тормозит проверку остальных.</li>
              <li>Обновляется само каждые 30 секунд, пока страница открыта.</li>
              <li>Любой сбой сразу становится критическим сигналом в «Центре контроля» — не нужно держать эту страницу открытой специально.</li>
            </ul>
          </Panel>

          <p className="text-[11px] text-base-content/35 text-center">
            Последняя проверка: {new Date(dataUpdatedAt).toLocaleString('ru-RU')}
          </p>
        </>
      )}
    </div>
  );
}
