import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Inbox, X, ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';

/**
 * Общие кирпичики панели CEO.
 *
 * Card, Panel, Metric — оставлены для обратной совместимости с другими страницами super/.
 * Новые строгие компоненты (DashboardPanel, KpiCard, BranchesTable, AnalyticsCTA)
 * находятся в src/components/ui.jsx.
 */

/* ── Карточка — тот же плоский DaisyUI-паттерн, что в Main Admin
   (card bg-base-100 border shadow-sm; радиус — токен темы --rounded-box,
   уже выровненный с main-admin в tailwind.config.js, Karis 13.08.2026) ── */
export function Card({ className = '', children }) {
  return <div className={`card bg-base-100 border border-base-300 shadow-sm ${className}`}>{children}</div>;
}

/* ── Карточка с заголовком-секцией ──────────────────────────────────────
   Совместима по API с Panel из ../mentor/_ui.jsx — BranchDetail.jsx,
   Discipline.jsx и StaffDetail.jsx переезжают на неё без переписывания
   вызовов, меняется только импорт. */
export function Panel({ title, icon: Icon, action, children, bodyClass = 'p-4' }) {
  return (
    <Card>
      {title && (
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-base-300">
          <h2 className="text-sm font-bold flex items-center gap-2 text-base-content/80">
            {Icon && <Icon size={15} className="text-primary shrink-0" />}
            {title}
          </h2>
          {action}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </Card>
  );
}

/* ── Заголовок страницы с хлебными крошками и аватаром ──────────────────
   Обычный components/PageHeader.jsx не трогаем — он общий (13 внешних
   импортов вне super). Этот вариант нужен там, где в заголовке нужен ещё
   Avatar/breadcrumbs (StaffDetail.jsx сейчас копирует эту разметку inline
   в трёх местах — loading/not-found/loaded). */
export function PageHead({ breadcrumbs, avatar, title, subtitle, children }) {
  return (
    <div className="space-y-1.5">
      {breadcrumbs && (
        <div className="text-xs breadcrumbs text-base-content/50">
          <ul>
            {breadcrumbs.map((b, i) => (
              <li key={i}>
                {b.to ? (
                  <Link to={b.to} className="hover:text-base-content font-medium">{b.label}</Link>
                ) : (
                  <span className="font-semibold text-base-content">{b.label}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3 animate-page-enter">
        <div className="flex items-center gap-3.5">
          {avatar}
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight leading-tight text-base-content">{title}</h1>
            {subtitle && <p className="text-[13px] text-base-content/70 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}

/* ── Метрика (legacy) ────────────────────────────────────────────────────
   Используется в других страницах super/. Новый строгий KpiCard — в components/ui.jsx. */
const METRIC_TONES = {
  primary: 'bg-primary/10 text-primary',
  info: 'bg-info/10 text-info',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-error/10 text-error',
  neutral: 'bg-base-200 text-base-content/60',
};

export function Metric({ Icon, tone = 'primary', label, value, unit, to, delta, size = 'md' }) {
  const toneCls = METRIC_TONES[tone] ?? METRIC_TONES.primary;

  const deltaEl = delta != null && (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold shrink-0 ${delta >= 0 ? 'text-success' : 'text-error'}`}>
      {delta >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {delta >= 0 ? '+' : ''}{typeof delta === 'number' ? delta.toFixed(1) : delta}%
    </span>
  );

  const body = size === 'sm' ? (
    <div className="flex items-center gap-2.5 px-4 py-2.5">
      <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${toneCls}`}>
        <Icon size={16} strokeWidth={2.2} />
      </span>
      <span className="text-sm font-semibold whitespace-nowrap">{label}: {value}</span>
      {deltaEl}
    </div>
  ) : (
    <div className="p-4">
      <div className="flex items-center gap-2.5">
        <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${toneCls}`}>
          <Icon size={16} strokeWidth={2.2} />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/45">
          {label}
        </span>
        {to && <ArrowRight size={14} className="ml-auto text-base-content/25 shrink-0" />}
      </div>
      <div className="flex items-end justify-between gap-2 mt-3">
        <div className="text-3xl font-extrabold leading-none tabular-nums">{value}</div>
        {deltaEl}
      </div>
      {unit && <div className="text-xs text-base-content/45 mt-1">{unit}</div>}
    </div>
  );

  // Тот же плоский паттерн, что в Main Admin (card bg-base-100 border shadow-sm,
  // радиус — токен темы) — Karis, 13.08.2026: "main admin desingiga o'hshasin".
  const cls = `card bg-base-100 border border-base-300 shadow-sm${
    to ? ' transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40' : ''
  }`;

  if (to) return <Link to={to} className={cls}>{body}</Link>;
  return <div className={cls}>{body}</div>;
}

/* ── Поиск ────────────────────────────────────────────────────────────
   `placeholder` обязателен и без дефолта — дефолтный плейсхолдер это
   дефолтный язык, а панель здесь русская (в отличие от ../mentor/_ui.jsx,
   родившегося в узбекоязычной панели ментора). */
export function SearchInput({ value, onChange, placeholder, className = '' }) {
  return (
    <label className={`input input-bordered flex items-center gap-2 ${className}`}>
      <Search size={16} className="text-base-content/40 shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="grow bg-transparent outline-none text-base sm:text-sm"
      />
    </label>
  );
}

/* ── Фильтр-пилюли ───────────────────────────────────────────────────── */
export function FilterPills({ options, value, onChange }) {
  return (
    <div className="join">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          className={`join-item btn btn-sm ${value === opt.key ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ── Статус-бейдж ─────────────────────────────────────────────────────── */
const BADGE_TONES = {
  neutral: 'badge-ghost',
  primary: 'badge-primary',
  info: 'badge-info',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-error',
};

export function StatusBadge({ tone = 'neutral', outline = false, children }) {
  const base = BADGE_TONES[tone] ?? BADGE_TONES.neutral;
  return (
    <span className={`badge badge-sm font-semibold ${outline ? 'badge-outline ' : ''}${base}`}>
      {children}
    </span>
  );
}

/* ── Пустое состояние ─────────────────────────────────────────────────── */
export function EmptyState({ icon: Icon = Inbox, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-14">
      <span className="w-14 h-14 rounded-lg bg-base-200 text-base-content/35 grid place-items-center mb-4">
        <Icon size={26} />
      </span>
      <p className="text-sm font-semibold text-base-content/70">{title}</p>
      {hint && <p className="text-xs text-base-content/45 mt-1 max-w-xs">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ── Modal ────────────────────────────────────────────────────────────
   Портал в document.body — раньше сырые `<dialog className="modal modal-open">`
   рендерились прямо в дереве страницы, и `position:fixed` ловил чужой
   containing block, если у ЛЮБОГО предка был transform (см. тот же фикс
   в ../mentor/_ui.jsx, откуда взят приём). `className` уходит на modal-box —
   так ConfirmDialog ниже и BranchFormModal (max-w-6xl/max-w-md) не нуждаются
   в собственной обёртке. */
export function Modal({ isOpen, onClose, title, children, actions, className = 'border border-base-300' }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isOpen) el.showModal?.(); else el.close?.();
  }, [isOpen]);

  if (!isOpen) return null;
  return createPortal(
    <dialog ref={ref} className="modal modal-open" onClose={onClose}>
      <div className={`modal-box ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg grid place-items-center text-base-content/50 hover:bg-base-200 hover:text-base-content transition-colors"
            aria-label={t('super.ui.close')}
          >
            <X size={16} />
          </button>
        </div>
        {children}
        {actions && <div className="modal-action">{actions}</div>}
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>,
    document.body,
  );
}

/* ── Диалог подтверждения ─────────────────────────────────────────────
   Groups.jsx и Students.jsx заводили байт-в-байт одинаковый диалог
   удаления — сведено в один. */
export function ConfirmDialog({ open, onClose, title, text, confirmLabel, onConfirm, pending, error }) {
  const { t } = useTranslation();
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={title}
      className="max-w-sm border border-base-300"
      actions={
        <>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={pending}>{t('super.ui.cancel')}</button>
          <button className="btn btn-error btn-sm" onClick={onConfirm} disabled={pending}>
            {pending ? <span className="loading loading-spinner loading-xs" /> : (confirmLabel ?? t('super.ui.delete'))}
          </button>
        </>
      }
    >
      <p className="text-sm text-base-content/70">{text}</p>
      {error && (
        <div className="alert alert-error text-xs mt-3">
          <span>{error.message}</span>
        </div>
      )}
    </Modal>
  );
}

/* ── Дропдаун (клик вне закрывает) ────────────────────────────────────
   Снято как есть из Admins.jsx — там это был единственный экземпляр,
   аналога в mentor-ките нет. */
export function Dropdown({ trigger, children, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative z-[70]" onClick={(e) => e.stopPropagation()}>
      {trigger(() => setOpen((v) => !v))}
      {open && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-2 z-[80] min-w-[220px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-xl py-1.5 animate-scale-in origin-top-right`}
        >
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ icon: Icon, danger, disabled, onClick, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        danger ? 'text-error hover:bg-error/10' : 'text-base-content/70 hover:text-base-content hover:bg-base-200'
      }`}
    >
      <span className="w-5 h-5 flex items-center justify-center shrink-0">{Icon && <Icon size={15} />}</span>
      {children}
    </button>
  );
}

/* ── Аватар ───────────────────────────────────────────────────────────
   Раньше в super/ жили два несовместимых Avatar разом: components/Avatar.jsx
   (число, size=36) и ../mentor/_ui.jsx (строка 'sm'|'md'|'lg') — отсюда живой
   баг в BranchDetail.jsx (size="sm" на числовом компоненте). Здесь один:
   строковые размеры снаружи, hash-палитра (лучше читается в таблицах,
   потому что у каждого человека свой цвет) — внутри. */
const AVATAR_PALETTE = [
  ['#DCFCE7', '#166534'], ['#E0F2FE', '#075985'], ['#FEF9C3', '#854D0E'],
  ['#FCE7F3', '#9D174D'], ['#EDE9FE', '#5B21B6'], ['#FFEDD5', '#9A3412'],
  ['#E6F4D7', '#3F6212'], ['#E0E7FF', '#3730A3'],
];
const AVATAR_SIZES = { sm: 28, md: 32, lg: 44 };

export function Avatar({ name = '?', size = 'md' }) {
  const letter = (name.trim()[0] || '?').toUpperCase();
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_PALETTE.length;
  const [bg, fg] = AVATAR_PALETTE[h];
  const px = AVATAR_SIZES[size] ?? AVATAR_SIZES.md;
  return (
    <span
      style={{ width: px, height: px, background: bg, color: fg }}
      className="inline-flex items-center justify-center rounded-full font-bold shrink-0"
    >
      <span style={{ fontSize: px * 0.42 }}>{letter}</span>
    </span>
  );
}

/* ── Скелет строки ────────────────────────────────────────────────────── */
export function RowSkeleton({ count = 3, height = 'h-14' }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`skeleton ${height} w-full rounded-xl`} />
      ))}
    </div>
  );
}

/* ── Тултип ───────────────────────────────────────────────────────────── */
export function Tip({ text, position = 'top', children, className = '' }) {
  if (!text) return children;
  return (
    <div className={`tooltip tooltip-${position} ${className}`} data-tip={text}>
      {children}
    </div>
  );
}

/* ── Палитра графиков ─────────────────────────────────────────────────
   Раньше Stats.jsx (hex PRIMARY/SERIES), BranchDetail.jsx (oklch в ATT_META)
   и Discipline.jsx (discipline-meta.jsx) заводили цвет каждый по-своему.
   Значения самого Stats.jsx — они уже были верны, просто локальны. */
export const CHART_PRIMARY = '#dc2626';
export const CHART_SERIES = ['#dc2626', '#7BB661', '#B7D9A0', '#35702f', '#A3C48B', '#5C8F4E'];
