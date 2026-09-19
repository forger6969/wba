import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Search, Inbox, ArrowRight, ArrowUpRight, ArrowDownRight, X, Minus } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

/**
 * Общие кирпичики панели Main Admin.
 *
 * Цвет задаётся СМЫСЛОМ (tone), а не пикселем. Лаймовый акцент бренда живёт
 * в токене темы `primary`, а не в каждом файле. Все `lime-*` классы убраны.
 */

const TONES = {
  neutral: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-error/10 text-error',
};

const BADGE_TONES = {
  neutral: 'badge-ghost',
  primary: 'badge-primary',
  info: 'badge-info',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-error',
};

const AVATAR_PALETTE = [
  ['#DCFCE7', '#166534'], ['#E0F2FE', '#075985'], ['#FEF9C3', '#854D0E'],
  ['#FCE7F3', '#9D174D'], ['#EDE9FE', '#5B21B6'], ['#FFEDD5', '#9A3412'],
  ['#E6F4D7', '#3F6212'], ['#E0E7FF', '#3730A3'],
];
const AVATAR_SIZES = { sm: 28, md: 32, lg: 44 };

/** Мини-график в углу KPI-плитки — форма тренда без осей и подписей. */
function KpiSparkline({ data, positive }) {
  if (!data || data.length < 2) return null;
  const rows = data.map((v, i) => ({ i, v }));
  // Тот же success/error, что и у стрелки тренда рядом (было #65a30d/#dc2626 —
  // близко, но не ровно тема DaisyUI: success #22c55e / error #ef4444
  // из tailwind.config.js). SVG fill/stroke не берёт Tailwind-классы
  // напрямую, поэтому здесь литерал, но теперь тот же самый.
  const stroke = positive ? '#22c55e' : '#ef4444';
  return (
    <div className="absolute inset-x-0 bottom-0 h-9 opacity-70 pointer-events-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${positive ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={stroke} strokeWidth={1.5}
            fill={`url(#spark-${positive ? 'up' : 'down'})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * KPI-плитка. По панели гуляет четыре чуть разных копии этого компонента
 * (Revenue, Billing, OrgDetail — своя версия в каждом; плюс Dashboard.jsx
 * держит родственные, но не идентичные MetricCell/StatusTile/PillMetric
 * для других раскладок — плоская лента-стрип и горизонтальные плашки,
 * не карточки). 30.08.2026 сюда добавлены спарклайн/тренд/`tint`, и
 * Dashboard.jsx — первый, кто реально использует их (карточка «Собрано
 * за месяц»). Revenue/Billing/OrgDetail на эту версию ЕЩЁ НЕ переведены —
 * следующий шаг, не выдавать желаемое за сделанное. Алиасы полей
 * (`title`/`label`, `unit`/`sub`, `tone`/`tint`) уже готовы под их старые
 * вызовы, чтобы миграция не требовала переписывать пропы.
 *
 * `sparkline` — реальный числовой ряд (например месяцы дохода), не
 * выдумывать данные под красивую линию, если бэкенд их не отдаёт — тогда
 * просто не передавать проп.
 */
export function Kpi({
  Icon, title, label, value, unit, sub, tone = 'neutral', tint, accent,
  trend, trendLabel, sparkline, dense, to, onClick, cardClassName,
}) {
  const heading = title ?? label;
  const caption = unit ?? sub;
  const iconStyle = tint ? { background: tint.bg, color: tint.fg } : undefined;
  const iconCls = tint ? '' : (TONES[tone] ?? TONES.neutral);
  const pad = dense ? 'p-3.5' : 'p-4';

  const body = (
    <div className={`relative overflow-hidden ${pad} text-left w-full`}>
      <div className="flex items-center gap-2.5">
        <span style={iconStyle} className={`w-8 h-8 rounded-md grid place-items-center shrink-0 ${iconCls}`}>
          <Icon size={16} strokeWidth={2.2} />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/45 truncate">
          {heading}
        </span>
        {(to || onClick) && <ArrowRight size={14} className="ml-auto text-base-content/25 shrink-0" />}
      </div>
      <div className={`font-extrabold mt-3 leading-none tabular-nums ${dense ? 'text-2xl' : 'text-3xl'}`}>{value}</div>
      {caption && <div className="text-xs text-base-content/45 mt-1">{caption}</div>}
      {trend != null && (
        <div className="flex items-center gap-1.5 mt-2">
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${
            trend > 0 ? 'text-success' : trend < 0 ? 'text-error' : 'text-base-content/40'
          }`}>
            {trend > 0 ? <ArrowUpRight size={12} /> : trend < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />}
            {trend > 0 ? '+' : ''}{typeof trend === 'number' ? trend.toFixed(1) : trend}%
          </span>
          {trendLabel && <span className="text-[10px] text-base-content/40">{trendLabel}</span>}
        </div>
      )}
      <KpiSparkline data={sparkline} positive={(trend ?? 0) >= 0} />
    </div>
  );

  // cardClassName ЗАМЕНЯЕТ, а не дописывает, дефолтный "скин" (border/
  // shadow/bg) — для страниц вроде Dashboard, где рядом стоят карточки
  // с другим языком (толще тень, свой border-base-300). Дописывать
  // конфликтующий border-*/shadow-* утилити-класс поверх уже заданного
  // нельзя: у Tailwind порядок в скомпилированном CSS не совпадает
  // с порядком классов в JSX, итоговый вид зависел бы от сборки, не от
  // пропа — ровно та же ловушка, что уже чинили на лендинге.
  const card = accent
    ? 'card border shadow-sm bg-gradient-to-br from-primary to-primary/85 border-primary text-primary-content'
    : `card border ${cardClassName ?? 'shadow-sm bg-base-100 border-base-200/60'}`;
  const interactive =
    'hover:border-primary/40 hover:shadow-md transition-[border-color,box-shadow,transform] duration-150 active:scale-[0.98]';
  if (to) return <Link to={to} className={`${card} ${interactive} block`}>{body}</Link>;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${card} ${interactive}`}>
        {body}
      </button>
    );
  }
  return <div className={card}>{body}</div>;
}

/** Карточка-панель с заголовком и опциональным действием справа. */
export function Panel({ title, icon: Icon, action, children, bodyClass = 'p-4' }) {
  return (
    <section className="card bg-base-100 border border-base-200/60 shadow-sm">
      {title && (
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-base-200">
          <h2 className="text-sm font-bold flex items-center gap-2 text-base-content/80">
            {Icon && <Icon size={15} className="text-primary shrink-0" />}
            {title}
          </h2>
          {action}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

/** Пустое состояние — вместо голой строки «нет данных». */
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

/** Поиск. text-base до sm — иначе iOS Safari зумит страницу при фокусе. */
export function SearchInput({ value, onChange, placeholder = 'Поиск...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={15}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 pointer-events-none"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="input input-bordered input-sm w-full pl-9 rounded-md text-base sm:text-sm"
      />
    </div>
  );
}

/**
 * Аватар с хеш-палитрой (как в super/_ui.jsx).
 *
 * `size` принимает И именованный размер ('sm'/'md'/'lg'), И число (px)
 * напрямую — 16 из 17 вызовов в панели передавали число (28, 32, 40, 44,
 * 46, 56, 68...), а компонент понимал только строку, так что все они молча
 * откатывались на один и тот же дефолт 32px (25→30.08.2026, найдено при
 * редизайне Dashboard).
 */
export function Avatar({ name = '?', size = 'md' }) {
  // Дефолт параметра ловит только undefined — вызовы вида `name={a || b}`,
  // где оба поля пришли из API как null (не отсутствуют, а именно null —
  // частая форма пустого имени в этой базе), давали name=null и падение
  // на .trim() ниже.
  name = name || '?';
  const letter = (name.trim()[0] || '?').toUpperCase();
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_PALETTE.length;
  const [bg, fg] = AVATAR_PALETTE[h];
  const px = typeof size === 'number' ? size : (AVATAR_SIZES[size] ?? AVATAR_SIZES.md);
  return (
    <span
      style={{ width: px, height: px, background: bg, color: fg }}
      className="inline-flex items-center justify-center rounded-full font-bold shrink-0"
    >
      <span style={{ fontSize: px * 0.42 }}>{letter}</span>
    </span>
  );
}

/** Статус-бейдж по tone. */
export function StatusBadge({ tone = 'neutral', outline = false, children }) {
  const base = BADGE_TONES[tone] ?? BADGE_TONES.neutral;
  return (
    <span className={`badge badge-sm font-semibold ${outline ? 'badge-outline ' : ''}${base}`}>
      {children}
    </span>
  );
}

/** Фильтр-пилюли (как в super/_ui.jsx). */
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

/** Скелет строки таблицы. */
export function RowSkeleton({ count = 3, height = 'h-14' }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`skeleton ${height} w-full rounded-md`} />
      ))}
    </div>
  );
}

/** Modal через портал в body (исправляет z-index проблемы с transform). */
export function Modal({ isOpen, onClose, title, children, actions, className = 'border border-base-200', size = 'md' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isOpen) el.showModal?.(); else el.close?.();
  }, [isOpen]);

  if (!isOpen) return null;
  const w = size === 'lg' ? 'max-w-2xl' : size === 'xl' ? 'max-w-3xl' : size === 'sm' ? 'max-w-md' : 'max-w-xl';
  return createPortal(
    <dialog ref={ref} className="modal modal-open" onClose={onClose}>
      <div className={`modal-box ${w} ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md grid place-items-center text-base-content/50 hover:bg-base-200 hover:text-base-content transition-colors"
            aria-label="Закрыть"
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

/** Диалог подтверждения (удалить/архивировать/разморозить). */
export function ConfirmDialog({ open, onClose, title, text, confirmLabel = 'Удалить', onConfirm, pending, error }) {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={title}
      size="sm"
      // Раньше className нёс свой max-w-sm поверх Modal-евского max-w-xl по
      // умолчанию (size не передавался) — какой из двух max-w-* побеждал,
      // зависело от порядка правил в собранном Tailwind CSS, не от JSX.
      // size="sm" даёт Modal's max-w-md напрямую, конфликта нет.
      className="border border-base-200"
      actions={
        <>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={pending}>Отмена</button>
          <button className="btn btn-error btn-sm" onClick={onConfirm} disabled={pending}>
            {pending ? <span className="loading loading-spinner loading-xs" /> : confirmLabel}
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

/** Дропдаун (клик вне закрывает). */
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
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      {trigger(() => setOpen((v) => !v))}
      {open && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1 z-50 min-w-[190px] rounded-[12px] border border-base-300 bg-base-100 shadow-lg py-1.5 animate-scale-in origin-top-right`}
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

/** Тултип. */
export function Tip({ text, position = 'top', children, className = '' }) {
  if (!text) return children;
  return (
    <div className={`tooltip tooltip-${position} ${className}`} data-tip={text}>
      {children}
    </div>
  );
}

export const CHART_PRIMARY = 'var(--chart-primary, #dc2626)';
export const CHART_SERIES = [
  'var(--chart-primary, #dc2626)',
  'var(--chart-2, #7BB661)',
  'var(--chart-3, #B7D9A0)',
  'var(--chart-4, #35702f)',
  'var(--chart-5, #A3C48B)',
  'var(--chart-6, #5C8F4E)',
];