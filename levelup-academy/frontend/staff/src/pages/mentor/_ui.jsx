import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Search, Inbox, X, ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Общие кирпичики панели ментора.
 *
 * До этого файла каждая страница ментора заводила свой `StudentAvatar`, свою
 * обёртку поиска и свою «пустоту» — с разными размерами, радиусами и цветами.
 * Отличия были не задуманы, а накоплены: три страницы — три вида одного и того
 * же элемента. Здесь один источник правды.
 */

/* ── Аватар ──────────────────────────────────────────────────────────────
   Было `bg-primary/20 text-primary-content`: primary-content — БЕЛЫЙ, то есть
   белая буква на бледно-зелёной заливке (контраст ~1.3:1, инициал не читался).
   Теперь буква — сам primary на его же светлой подложке. */
export function Avatar({ name, size = 'md', onPrimary = false }) {
  const letter = (name?.trim()?.[0] || '?').toUpperCase();
  const cls = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  }[size];
  // `onPrimary` — аватар лежит на заливке primary (выделенная строка списка).
  // Без него зелёная буква на зелёном фоне сливается ровно так же, как раньше
  // сливалась белая на светло-зелёном.
  const tone = onPrimary
    ? 'bg-primary-content/20 text-primary-content'
    : 'bg-primary/15 text-primary';
  return (
    <span
      className={`${cls} ${tone} rounded-full grid place-items-center font-bold shrink-0`}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}

/* ── Поиск ────────────────────────────────────────────────────────────── */
export function SearchInput({ value, onChange, placeholder, className = '' }) {
  const { t } = useTranslation();
  const finalPlaceholder = placeholder ?? t('mentor.search');
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
        placeholder={finalPlaceholder}
        aria-label={finalPlaceholder}
        // text-base до sm — иначе iOS Safari зумит страницу при фокусе
        // в поле со шрифтом мельче 16px и обратно уже не отпускает.
        className="input input-bordered input-sm w-full pl-9 rounded-lg text-base sm:text-sm"
      />
    </div>
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

/* ── Выбор группы ──────────────────────────────────────────────────────
   Один и тот же селект был скопирован в Тесты и Коины с разной разметкой. */
export function GroupSelect({ groups, value, onChange, label }) {
  const { t } = useTranslation();
  return (
    <label className="form-control w-full max-w-xs">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/45 mb-1.5">
        {label ?? t('mentor.selectGroup')}
      </span>
      <select
        className="select select-bordered select-sm rounded-lg"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{t('mentor.chooseGroup')}</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}{g.subject ? ` — ${g.subject}` : ''}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ── Карточка-панель ──────────────────────────────────────────────────── */
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

/* ── Modal (overlay + box + backdrop) ────────────────────────────────────
   Везде в админке/менторе были сырые `<dialog className="modal modal-open">`.
   Теперь одна точка сборки: открытие через `isOpen`, закрытие по X / backdrop /
   Escape (браузерный `<dialog>` сам ловит Escape, но для единообразия
   прописано и здесь).

   Портал в document.body — раньше <dialog> рендерился прямо в дереве страницы.
   position:fixed у него ловил чужой containing block, если у ЛЮБОГО предка
   был transform (анимация входа страницы, коллапс сайдбара и т.п.) — тогда
   backdrop не докрывал экран сверху/слева (см. Discipline.jsx: «tepa va yon
   tomonida blur yoq»). Портал прямо в body убирает эту зависимость целиком —
   не нужно искать, у какого именно предка transform. */
export function Modal({ isOpen, onClose, title, children, actions }) {
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
      <div className="modal-box glass-strong border border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg grid place-items-center text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] transition-colors"
            aria-label={t('mentor.close')}
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

/* ── KPI-плитка ───────────────────────────────────────────────────────────
   Плитка жила в ШЕСТИ копиях: `StatCard` в Students / Groups / Mentors /
   Payments (байт-в-байт, отличались только пробелами) и почти такой же
   `KpiCard` в Dashboard / Reports. Каждая копия принимала сырой hex и
   градиент — в сумме 13 захардкоженных цветов, часть из них дублировалась
   в разном регистре (`#8B5CF6` и `#8b5cf6`, `#3B82F6` и `#3b82f6`).

   Здесь цвет задаётся СМЫСЛОМ, а не пикселем: `tone` → токен темы. Разница
   с прежним подходом не косметическая: «Просрочено» остаётся тревожным при
   любой смене темы, а «Всего» перестаёт притворяться особенным только
   потому, что кому-то был симпатичен синий. Плитки различает иконка и
   подпись — как в панели ментора, откуда эта форма и взята. */
const KPI_TONES = {
  neutral: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-error/10 text-error',
};

export function Kpi({ Icon, title, value, unit, tone = 'neutral', trend, trendLabel, to }) {
  const body = (
    <div className="p-4">
      <div className="flex items-center gap-2.5">
        <span
          className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${KPI_TONES[tone] ?? KPI_TONES.neutral}`}
        >
          <Icon size={16} strokeWidth={2.2} />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/45">
          {title}
        </span>
        {to && <ArrowRight size={14} className="ml-auto text-base-content/25 shrink-0" />}
      </div>
      <div className="text-3xl font-extrabold mt-3 leading-none tabular-nums">{value}</div>
      {unit && <div className="text-xs text-base-content/45 mt-1">{unit}</div>}
      {trend != null && (
        <div className="flex items-center gap-1.5 mt-2">
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${
              trend >= 0 ? 'text-success' : 'text-error'
            }`}
          >
            {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend >= 0 ? '+' : ''}
            {typeof trend === 'number' ? trend.toFixed(1) : trend}%
          </span>
          {trendLabel && <span className="text-[10px] text-base-content/40">{trendLabel}</span>}
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="card bg-base-100 border border-base-200/60 shadow-sm card-hover-premium hover:border-primary/40 block">
        {body}
      </Link>
    );
  }
  return <div className="card bg-base-100 border border-base-200/60 shadow-sm">{body}</div>;
}

/* ── Скелет строки списка ─────────────────────────────────────────────── */
export function RowSkeleton({ count = 3, height = 'h-14' }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`skeleton ${height} w-full rounded-xl`} />
      ))}
    </div>
  );
}

/* ── Тултип ────────────────────────────────────────────────────────────
   DaisyUI `tooltip` — нативный CSS, без JS-библиотек. Обёртка добавляет
   `data-tip` и класс позиционирования. Позиция: по умолчанию сверху.

   Использование:
     <Tip text="Сохранить"><button className="btn">OK</button></Tip>
     <Tip text="Удалить" position="bottom"><Trash2 size={16}/></Tip> */
export function Tip({ text, position = 'top', children, className = '' }) {
  if (!text) return children;
  return (
    <div className={`tooltip tooltip-${position} ${className}`} data-tip={text}>
      {children}
    </div>
  );
}
