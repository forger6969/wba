import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ArrowRight } from 'lucide-react';

/* ── DashboardPanel — strict card with optional header ─────────────────── */
export function DashboardPanel({ title, icon: Icon, action, children, bodyClass = 'p-4' }) {
  return (
    <section className="
      bg-white 
      border border-[var(--border-subtle)] 
      rounded-[var(--radius-card)]
      shadow-[var(--shadow-card)]
      transition: box-shadow var(--dur-normal) var(--ease-snappy), 
                  border-color var(--dur-normal) var(--ease-snappy)
      hover:shadow-[var(--shadow-card-hover)] 
      hover:border-[var(--border-hairline)]
    ">
      {title && (
        <header className="px-4 py-3 border-b border-[var(--border-faint)]">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
            {Icon && <Icon size={14} className="text-[var(--primary)] shrink-0" />}
            {title}
          </h2>
          {action}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

/* ── KpiCard — strict KPI metric card ───────────────────────────────────── */
const TONE_MAP = {
  primary: 'bg-[var(--bg-primary)] text-[var(--primary)]',
  success: 'bg-[var(--bg-success)] text-[var(--success)]',
  warning: 'bg-[var(--bg-warning)] text-[var(--warning)]',
  danger: 'bg-[var(--bg-danger)] text-[var(--danger)]',
  info: 'bg-[var(--bg-info)] text-[var(--info)]',
  neutral: 'bg-[var(--border-faint)] text-[var(--text-muted)]',
};

export function KpiCard({ Icon, tone = 'primary', label, value, unit, to, children }) {
  const toneClass = TONE_MAP[tone] ?? TONE_MAP.primary;

  const Content = (
    <article className="
      kpi-card
      bg-white 
      border border-[var(--border-subtle)] 
      rounded-[var(--radius-card)]
      p-4 md:p-5
      shadow-[var(--shadow-card)]
      transition: all var(--dur-normal) var(--ease-snappy)
      hover:shadow-[var(--shadow-card-hover)] 
      hover:border-[var(--border-hairline)]
      hover:-translate-y-[1px]
      data-[clickable=true]:cursor-pointer
      data-[clickable=true]:active:scale-[0.99]
      data-[clickable=true]:active:translate-y-0
      data-[clickable=true]:active:bg-[var(--bg-primary)]
    ">
      <div className="flex items-center justify-between gap-3">
        <span className="
          w-10 h-10 rounded-[var(--radius-tight)] 
          grid place-items-center shrink-0
          ${toneClass}
        ">
          <Icon size={18} strokeWidth={2.2} />
        </span>
        {to && <ChevronRight size={14} className="text-[var(--text-muted)] shrink-0" />}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mt-3">
        {label}
      </p>
      <div className="flex items-end justify-between gap-2 mt-1">
        <span className="text-2xl font-extrabold leading-none tabular-nums text-[var(--text)]">
          {value}
        </span>
      </div>
      {unit && <p className="text-xs text-[var(--text-muted)] mt-1">{unit}</p>}
      {children}
    </article>
  );

  if (to) return <Link to={to} className="block">{Content}</Link>;
  return Content;
}

/* ── BranchesTable — strict data table ──────────────────────────────────── */
export function BranchesTable({ branches, fmt }) {
  const { t } = useTranslation();
  if (!branches?.length) {
    return <p className="text-[var(--text-muted)] text-sm py-6 text-center">{t('components.ui.noBranchesYet')}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="branches-table w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border-faint)]">
            <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{t('components.ui.colBranch')}</th>
            <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{t('components.ui.colStudents')}</th>
            <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{t('components.ui.colAdmins')}</th>
            <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{t('components.ui.colRevenue')}</th>
            <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{t('components.ui.colDebt')}</th>
          </tr>
        </thead>
        <tbody>
          {branches.map((b, i) => (
            <tr key={b.id} className="
              border-b border-[var(--border-faint)] 
              transition: background-color var(--dur-fast) var(--ease-snappy)
              hover:bg-[var(--surface-1)]
              animate-slide-up stagger-${i + 1}
            ">
              <td className="px-3 py-2.5">
                <Link to={`/branches/${b.id}`} className="font-medium text-[var(--text)] hover:text-[var(--primary)]">
                  {b.name}
                </Link>
                <span className="
                  ml-2 px-1.5 py-0.5 text-[10px] font-semibold rounded-[var(--radius-pill)]
                  ${b.isMain 
                    ? 'bg-[var(--bg-primary)] text-[var(--primary)]' 
                    : b.isArchived 
                      ? 'bg-[var(--border-faint)] text-[var(--text-muted)]'
                      : 'bg-[var(--bg-success)] text-[var(--success)]'}
                ">
                  {b.isMain ? t('components.ui.mainBadge') : b.isArchived ? t('components.ui.archivedBadge') : t('components.ui.branchBadge')}
                </span>
              </td>
              <td className="text-right px-3 py-2.5 text-[var(--text)] tabular-nums">{fmt(b.students)}</td>
              <td className="text-right px-3 py-2.5 text-[var(--text)] tabular-nums">{fmt(b.admins)}</td>
              <td className="text-right px-3 py-2.5 font-medium text-[var(--text)] tabular-nums">{fmt(b.revenue)}</td>
              <td className="text-right px-3 py-2.5 text-[var(--danger)] tabular-nums">{fmt(b.debt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── AnalyticsCTA — prominent call-to-action button ────────────────────── */
export function AnalyticsCTA({ onClick, className = '' }) {
  const { t } = useTranslation();
  return (
    <button 
      onClick={onClick}
      className="
        analytics-cta
        flex items-center justify-between gap-4
        w-full
        px-4 py-3
        rounded-[var(--radius-card)]
        bg-white
        border border-[var(--border-subtle)]
        shadow-[var(--shadow-card)]
        transition: all var(--dur-normal) var(--ease-snappy)
        hover:shadow-[var(--shadow-card-hover)] 
        hover:border-[var(--border-hairline)]
        hover:-translate-y-[1px]
        active:scale-[0.99] active:translate-y-0
        text-left
        ${className}
      "
    >
      <span className="text-sm font-medium text-[var(--text)]">{t('components.ui.analyticsCta')}</span>
      <ArrowRight size={16} className="text-[var(--primary)] shrink-0" />
    </button>
  );
}

/* ── SkeletonKpisStrict — skeleton matching KpiCard ────────────────────── */
export function SkeletonKpisStrict({ count = 6 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="
          animate-scale-in stagger-${i + 1}
          bg-white 
          border border-[var(--border-subtle)] 
          rounded-[var(--radius-card)]
          p-4 md:p-5
          shadow-[var(--shadow-card)]
        ">
          <div className="flex items-center justify-between">
            <div className="skeleton w-10 h-10 rounded-[var(--radius-tight)]" />
          </div>
          <div className="skeleton h-3 w-20 mt-3" />
          <div className="skeleton h-8 w-24 mt-1" />
          <div className="skeleton h-3 w-16 mt-1" />
        </div>
      ))}
    </div>
  );
}
