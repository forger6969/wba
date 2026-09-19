import Icon from './Icons.jsx';
import { useI18n } from '../i18n/index.jsx';

export function EmptyState({ icon = 'inbox', title, message }) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t.common.empty;
  const resolvedMessage = message ?? t.common.noData;
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-base-200 flex items-center justify-center mb-4">
        <Icon name={icon} className="w-8 h-8 text-base-content/25" />
      </div>
      <h3 className="text-lg font-bold mb-1">{resolvedTitle}</h3>
      <p className="text-sm text-base-content/50 max-w-xs">{resolvedMessage}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center mb-4">
        <Icon name="exclamation-circle" className="w-8 h-8 text-error" />
      </div>
      <h3 className="text-lg font-bold mb-1">{t.common.error}</h3>
      <p className="text-sm text-base-content/50 max-w-xs mb-4">{message ?? t.common.errorMsg}</p>
      {onRetry && (
        <button className="btn btn-primary btn-sm rounded-xl gap-2" onClick={onRetry}>
          <Icon name="arrow-trending-up" className="w-4 h-4" />
          {t.common.retry}
        </button>
      )}
    </div>
  );
}

export function ProgressRing({ value = 0, size = 80, stroke = 6, color = '#dc2626', bg = '#e7eede' }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(value, 100) / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bg} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

export function ProgressBar({ value = 0, color = '#dc2626', height = 6 }) {
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: '#e7eede' }}>
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${Math.min(value, 100)}%`, background: color }}
      />
    </div>
  );
}

export function StatCard({ icon, label, value, sub, color, className = '' }) {
  return (
    <div className={`card bg-base-100 ${className}`}>
      <div className="card-body p-4">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded border border-base-300 flex items-center justify-center shrink-0 bg-base-200/40"
          >
            <Icon name={icon} className="w-[18px] h-[18px] text-base-content/60" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-base-content/50 truncate">{label}</p>
            <p className="text-lg font-semibold tracking-tight leading-tight tabular-nums" style={{ color }}>{value}</p>
            {sub && <p className="text-[11px] text-base-content/40 mt-0.5">{sub}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
