import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Inbox, AlertTriangle, Flame, Sparkles, UploadCloud, Paperclip } from 'lucide-react';
import { fmtFileSize } from '../format.js';
import { useI18n } from '../../i18n/index.jsx';

/**
 * UI-кит кабинета ученика (7-15 лет).
 *
 * 2026-08-01, версия 2 — версия 1 («Adventure Camp»: золото, маскот-смайлик,
 * объёмные игровые кнопки, сплошные цветные значки-«стикеры») отклонена
 * прямым фидбеком Karis: выглядело слишком по-детски/AI-сгенерированно,
 * серьёзности не было. Правки по конкретным пунктам:
 *   · маскот убран целиком (не понравился конкретный скриншот с ним)
 *   · палитра — приглушённый лайм (не неон), тона глубже/спокойнее
 *   · значки категорий — тонированный фон + цветная иконка (стиль Apple
 *     Health), а не сплошная плашка с бликом и «игровой» тенью
 *   · скругления заметно меньше везде (карточки/кнопки/значки)
 *   · кнопки — Apple-нажатие (scale 0.97 на :active), без «проседающей»
 *     3D-тени как в играх
 *   · вход карточек — чистый ease-out без пружинного нахлёста
 *
 * Экспортируемые имена и props оставлены как раньше (C, HUES, IconTile,
 * Ring, Button, Pill, Tabs, Skeleton, RowSkeleton, EmptyState, ErrorState,
 * Avatar, PageHeader, Panel, Modal, StreakFlame, LevelBar, levelFromCoins,
 * CountUp, ConfettiBurst, SurpriseCard) — их дёргают все страницы кабинета.
 * Убран только Mascot (по прямому запросу, использований больше нет).
 */

/* v5 «Grove» (2026-08-30, Abduloh) — зеркалит токены :root / :root
   [data-kid-theme="dark"] из index.css. Значения — CSS-переменные, а не
   hex: инлайновые стили тогда сами переключаются между light/dark, без
   второго объекта палитры и ре-рендера. Бренд — зелёный: тёмный лес
   якорь, рабочий лайм действие, тёплый мёд награда. */
export const C = {
  bg: 'var(--k-bg)',
  bgTint: 'var(--k-bg-tint)',
  card: 'var(--k-card)',
  text: 'var(--k-text)',
  muted: 'var(--k-muted)',
  line: 'var(--k-line)',
  hair: 'var(--k-hair)',

  lime: 'var(--k-lime)',        // действие — кнопки, активная навигация
  limeDk: 'var(--k-lime-dk)',   // акцентный текст (тёмный лайм / светлый в dark)
  limeSoft: 'var(--k-lime-soft)',
  limeLine: 'var(--k-lime-line)',

  forest: 'var(--k-heading)',   // заголовки, активная навигация, HUD-подписи
  forest2: 'var(--k-hero-2)',   // (совместимость — герой красит сам)
  forestSoft: 'var(--k-forest-soft)',
  hero1: 'var(--k-hero-1)',
  hero2: 'var(--k-hero-2)',
  header1: 'var(--k-header-1)',
  header2: 'var(--k-header-2)',

  honey: 'var(--k-honey)',      // награда — коины, монеты, звёзды
  honeyDk: 'var(--k-honey-dk)',
  honeySoft: 'var(--k-honey-soft)',

  ink: 'var(--k-ink)',
  violet: 'var(--k-violet)',
  blue: 'var(--k-blue)',
  coral: 'var(--k-coral)',
  amber: 'var(--k-amber)',      // = honey, обратная совместимость страниц
  teal: 'var(--k-teal)',
  pink: 'var(--k-pink)',
  gold: 'var(--k-gold)',
  goldDk: 'var(--k-gold-dk)',

  // ── Семантика статусов ──
  danger: 'var(--k-danger)',
  dangerSoft: 'var(--k-danger-soft)',
  info: 'var(--k-info)',
  infoSoft: 'var(--k-info-soft)',
  success: 'var(--k-success)',
  successSoft: 'var(--k-success-soft)',
  onAccent: 'var(--k-on-accent)',
  scrim: 'var(--k-scrim)',

  // ── Семантическая тройка: цвет = значение с одного взгляда ──
  action: 'var(--k-lime)', // действие — кнопки, активное меню (= lime)
  learn: 'var(--k-violet)', // учёба — уроки, тесты, задания, видео (= violet)
  warn: 'var(--k-honey)',   // внимание — оплата, сроки, награды (= honey)
};

/* alpha() — прозрачная версия цвета-переменной. Инлайновый стиль не может
   склеить var(--k-x) с hex-суффиксом (`${C.violet}1c`), поэтому идём через
   color-mix (поддержан всеми актуальными браузерами). pct — процент
   непрозрачности (0..100). */
export const alpha = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
/* shade() — чуть затемнить цвет (для нижней точки градиента кнопки и т.п.) */
export const shade = (color, pct) => `color-mix(in srgb, ${color}, #000 ${pct}%)`;

/* Цвета категорий — чтобы разделы и типы заданий различались с одного взгляда */
export const HUES = {
  lime: C.lime,
  violet: C.violet,
  blue: C.blue,
  coral: C.coral,
  amber: C.amber,
  honey: C.honey,
  teal: C.teal,
  pink: C.pink,
  forest: C.forest,
};

/* ── Значок категории — тонированный фон + цветная иконка ────────────────
   Раньше был сплошной цветной блок с бликом и цветной тенью ("стикер") —
   слишком по-детски. Теперь как в Apple Health/Notion: лёгкая тонировка
   цвета на фоне, сама иконка — в цвете, без заливки. Серьёзнее, но цвет
   категории всё ещё считывается мгновенно. */
export function IconTile({ icon: Icon, hue = 'violet', size = 50, radius, className = '' }) {
  const fill = HUES[hue] ?? C.violet;
  return (
    <span
      className={`shrink-0 grid place-items-center transition-transform duration-150 ${className}`}
      style={{
        width: size,
        height: size,
        background: alpha(fill, 12),
        borderRadius: radius ?? Math.round(size * 0.3),
      }}
    >
      <Icon size={Math.round(size * 0.46)} strokeWidth={2.2} color={fill} />
    </span>
  );
}

/* ── Кольцо прогресса (percent+children) — как в Apple Fitness/Activity.
   centerBg: цвет «дырки» кольца. По умолчанию белый (кольцо на карточке),
   на тёмном герое передают forest — иначе внутри белый блин и текст тонет. */
export function Ring({ percent = 0, size = 76, thickness = 7, color = C.lime, track = C.line, centerBg = C.card, children }) {
  return (
    <span
      className="k-ring shrink-0"
      style={{ width: size, height: size, background: `conic-gradient(${color} ${percent}%, ${track} 0)` }}
    >
      <i style={{ width: size - thickness * 2, height: size - thickness * 2, background: centerBg }}>{children}</i>
    </span>
  );
}

/* ── Кнопка — Apple-нажатие: scale(0.97) на :active. Заливка с едва
   заметным вертикальным градиентом (объём без «игровой» тени) + тонкий
   внутренний блик сверху. */
const BSIZE = {
  sm: 'px-4 py-2 text-[13.5px] rounded-[10px]',
  md: 'px-5 py-2.5 text-[14.5px] rounded-xl',
  lg: 'px-7 py-3.5 text-[15.5px] rounded-xl',
};

export function Button({ hue = 'lime', size = 'md', className = '', disabled, children, ...props }) {
  const fill = disabled ? C.line : HUES[hue] ?? C.lime;
  const fg = disabled ? C.muted : '#fff';
  return (
    <button
      {...props}
      disabled={disabled}
      className={`k-press inline-flex items-center justify-center gap-2 font-bold whitespace-nowrap disabled:cursor-not-allowed ${BSIZE[size] ?? BSIZE.md} ${className}`}
      style={{
        background: disabled ? fill : `linear-gradient(180deg, ${fill}, ${shade(fill, 9)})`,
        color: fg,
        boxShadow: disabled
          ? 'none'
          : `inset 0 1px 0 rgba(255,255,255,0.22), 0 1px 2px rgba(14,22,12,0.10), 0 6px 16px ${alpha(fill, 22)}`,
      }}
    >
      {children}
    </button>
  );
}

/* ── Заголовок страницы — крупный, с цветной иконкой раздела ──
   Иконка = ребёнок узнаёт раздел по картинке, не читая название. */
export function PageHeader({ title, subtitle, actions, icon: Icon, hue = 'violet' }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && <IconTile icon={Icon} hue={hue} size={44} />}
        <div className="min-w-0">
          <h1 className="k-display text-[23px] sm:text-[27px]" style={{ color: C.forest }}>
            {title}
          </h1>
          {subtitle && <p className="text-[13.5px] mt-1 font-semibold" style={{ color: C.muted }}>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/* ── Аватар ─────────────────────────────────────────────────────────── */
export function Avatar({ name, size = 38 }) {
  const letter = (name?.trim()?.[0] || '?').toUpperCase();
  return (
    <span
      className="rounded-full grid place-items-center font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42, background: C.lime, color: '#fff' }}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}

/* ── Панель ─────────────────────────────────────────────────────────── */
export function Panel({ title, icon: Icon, hue = 'violet', action, children, bodyClass = 'p-4 sm:p-5' }) {
  return (
    <section className="k-card overflow-hidden">
      {title && (
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4 pb-3">
          <h2 className="text-[16px] font-extrabold flex items-center gap-2.5" style={{ color: C.text }}>
            {Icon && <IconTile icon={Icon} hue={hue} size={34} />}
            {title}
          </h2>
          {action}
        </header>
      )}
      <div className={bodyClass} style={title ? { paddingTop: 0 } : undefined}>{children}</div>
    </section>
  );
}

/* ── Ярлык ──────────────────────────────────────────────────────────── */
export function Pill({ hue = 'muted', children, className = '' }) {
  /* Подложка — прозрачный акцент (сам подстраивается под тему), текст —
     тёмный лайм/мёд там, где он есть, иначе сам акцент. */
  const map = {
    lime: { bg: alpha(C.lime, 15), fg: C.limeDk },
    teal: { bg: alpha(C.teal, 15), fg: C.teal },
    coral: { bg: alpha(C.coral, 15), fg: C.coral },
    amber: { bg: C.honeySoft, fg: C.honeyDk },
    honey: { bg: C.honeySoft, fg: C.honeyDk },
    blue: { bg: alpha(C.blue, 15), fg: C.blue },
    violet: { bg: alpha(C.violet, 15), fg: C.violet },
    pink: { bg: alpha(C.pink, 15), fg: C.pink },
    forest: { bg: C.forestSoft, fg: C.forest },
    muted: { bg: alpha(C.muted, 14), fg: C.muted },
  };
  const s = map[hue] ?? map.muted;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[12px] font-extrabold whitespace-nowrap px-2.5 py-1 rounded-full ${className}`}
      style={{ background: s.bg, color: s.fg }}
    >
      {children}
    </span>
  );
}

/* ── Вкладки ────────────────────────────────────────────────────────── */
export function Tabs({ value, onChange, items }) {
  return (
    <div
      className="inline-flex gap-0.5 p-1 rounded-full"
      style={{ background: C.bg, border: `1px solid ${C.line}` }}
    >
      {items.map((it) => {
        const on = it.value === value;
        return (
          <button
            key={it.value}
            onClick={() => onChange(it.value)}
            className="k-press-sm px-3.5 py-1.5 rounded-full text-[13px] font-extrabold transition-colors"
            style={on
              ? { background: C.card, color: C.forest, border: `1px solid ${C.line}`, boxShadow: 'var(--k-e1)' }
              : { background: 'transparent', color: C.muted, border: '1px solid transparent' }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Скелеты ────────────────────────────────────────────────────────── */
export function Skeleton({ h = 108, count = 3 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse" style={{ height: h, background: C.line, borderRadius: 16 }} />
      ))}
    </div>
  );
}

export function RowSkeleton({ count = 3, height = 62 }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse" style={{ height, background: C.line, borderRadius: 12 }} />
      ))}
    </div>
  );
}

/* ── Пустое состояние ───────────────────────────────────────────────── */
export function EmptyState({ icon: Icon = Inbox, title, text, action, hue = 'violet' }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12">
      <IconTile icon={Icon} hue={hue} size={60} />
      <p className="text-[16px] font-extrabold mt-4" style={{ color: C.text }}>{title}</p>
      {text && <p className="text-[13.5px] font-semibold mt-1.5 max-w-xs" style={{ color: C.muted }}>{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  const { t } = useI18n();
  return (
    <EmptyState
      icon={AlertTriangle}
      hue="coral"
      title={t.ui.loadFailed}
      text={message}
      action={onRetry ? <Button onClick={onRetry}>{t.ui.retry}</Button> : null}
    />
  );
}

/* ── Модалка ──────────────────────────────────────────────────────────
   Рендерится через createPortal в document.body, а не на месте вызова:
   внутри кабинета есть обёртка с CSS transform (sidebar/контент), и при
   нём position:fixed прилипает к этому контейнеру — фон модалки тогда
   не накрывает сайдбар. Portal поднимает модалку на весь экран всегда. */
export function Modal({ title, onClose, children }) {
  const { t } = useI18n();
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  return createPortal(
    <div className="kid fixed inset-0 z-[70] grid place-items-center p-4" role="dialog" aria-modal="true" style={{ background: 'transparent' }}>
      <button
        className="absolute inset-0 cursor-default"
        style={{ background: C.scrim, backdropFilter: 'blur(3px)' }}
        onClick={onClose}
        aria-label={t.ui.close}
        tabIndex={-1}
      />
      {/* Токены (--k-*) теперь на :root, поэтому var() резолвится и в portal.
          Класс .kid на обёртке — ради шрифта; фон обёртки прозрачный, чтобы
          сетка-текстура .kid не легла поверх затемнения. */}
      <div
        className="relative w-full max-w-md p-6 k-pop-in"
        style={{
          background: C.card,
          border: `1px solid ${C.line}`,
          borderRadius: 'var(--k-r-md)',
          boxShadow: 'var(--k-e3)',
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <h3 className="text-[19px] font-extrabold leading-tight" style={{ color: C.text }}>{title}</h3>
          <button
            onClick={onClose}
            className="k-press-sm w-9 h-9 rounded-xl grid place-items-center shrink-0"
            style={{ background: C.bg, color: C.muted }}
            aria-label={t.ui.close}
          >
            <X size={17} strokeWidth={2.6} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

/* ── Загрузка файла — drag&drop зона + клик-выбор ──────────────────────
   Раньше был голый браузерный <input type=file>, выбивался из дизайна и
   не принимал перетаскивание. Пунктирная лайм-рамка вместо оранжевой —
   в тон остальному кабинету, не копия чужого референса. */
export function Dropzone({ file, onFileChange, disabled, accept }) {
  const { t } = useI18n();
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const pick = () => !disabled && inputRef.current?.click();
  const take = (files) => { const f = files?.[0]; if (f) onFileChange(f); };

  if (file) {
    return (
      <div className="k-card flex items-center gap-3 px-4 py-3">
        <IconTile icon={Paperclip} hue="lime" size={38} />
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-extrabold truncate" style={{ color: C.text }}>{file.name}</div>
          <div className="text-[12px] font-semibold" style={{ color: C.muted }}>{fmtFileSize(file.size)}</div>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => onFileChange(null)}
            className="k-press-sm shrink-0 w-8 h-8 rounded-full grid place-items-center"
            style={{ background: C.bg, color: C.muted }}
            aria-label={t.ui.removeFile}
          >
            <X size={15} strokeWidth={2.8} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={pick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') pick(); }}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); if (!disabled) take(e.dataTransfer.files); }}
      className={`flex flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed transition-colors px-5 py-8 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      style={{ borderColor: dragOver ? C.lime : C.line, background: dragOver ? alpha(C.lime, 9) : C.bg }}
    >
      <IconTile icon={UploadCloud} hue="lime" size={48} />
      <p className="text-[13.5px] font-bold mt-3" style={{ color: C.text }}>
        {t.ui.dropTitle} <span style={{ color: C.limeDk }}>{t.ui.dropChoose}</span>
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => take(e.target.files)}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Геймификация — только честные данные (реальные coins/рейтинг/группы)
   или явно подписанные локальные механики. Ничего не выдумываем как
   "настоящее", если бэкенд этого не считает.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Streak — визиты подряд. Считается ЛОКАЛЬНО на устройстве
   (useDailyStreak), поэтому подпись честно говорит "на этом устройстве" —
   это НЕ синхронизированное с сервером достижение. */
export function StreakFlame({ days, hue = 'coral' }) {
  const { t } = useI18n();
  const fill = HUES[hue] ?? C.coral;
  const lit = days > 0;
  return (
    <span
      className="inline-flex items-center gap-2 h-10 pl-1.5 pr-3.5 rounded-full"
      style={{ background: 'rgba(0,0,0,0.2)' }}
      title={t.ui.streakTitle(days)}
    >
      <span className="w-7 h-7 rounded-full grid place-items-center shrink-0" style={{ background: lit ? alpha(fill, 25) : 'transparent' }}>
        <Flame size={14} strokeWidth={2.4} color={lit ? fill : 'rgba(255,255,255,0.5)'} fill={lit ? fill : 'transparent'} />
      </span>
      <span className="k-num text-[15px]" style={{ color: lit ? '#fff' : 'rgba(255,255,255,0.5)' }}>{days}</span>
    </span>
  );
}

/* ── LevelBar — уровень и прогресс, посчитанные из НАСТОЯЩИХ coins.
   level = 1 + floor(coins/100); прогресс = остаток до следующего уровня.
   Формула — просто способ показать реальное число, не выдумка. */
export function levelFromCoins(coins) {
  const c = Math.max(0, Number(coins) || 0);
  const level = 1 + Math.floor(c / 100);
  const progress = (c % 100) / 100;
  return { level, progress, toNext: 100 - (c % 100) };
}

export function LevelBar({ level, progress, hue = 'lime', size = 'md' }) {
  const fill = HUES[hue] ?? C.lime;
  const h = size === 'lg' ? 10 : 7;
  return (
    <div className="flex items-center gap-3 w-full">
      <span
        className="shrink-0 grid place-items-center rounded-lg k-num text-[12px]"
        style={{ width: 28, height: 28, background: alpha(fill, 12), color: fill }}
      >
        {level}
      </span>
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: h, background: C.line }}>
        <div
          className="h-full rounded-full k-levelbar-fill"
          style={{ width: `${Math.round(progress * 100)}%`, background: fill }}
        />
      </div>
    </div>
  );
}

/* ── CountUp — число "докручивается" до значения вместо мгновенной смены.
   Уважает prefers-reduced-motion (тогда просто показывает целевое число). */
export function CountUp({ value, duration = 600, className = '', style }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const reduceMotion = useRef(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const from = prev.current;
    const to = Number(value) || 0;
    prev.current = to;
    if (reduceMotion.current || from === to) { setDisplay(to); return; }
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span className={`k-num tabular-nums ${className}`} style={style}>{display.toLocaleString('ru-RU')}</span>;
}

/* ── ConfettiBurst — короткий, сдержанный залп при смене `fireKey`.
   Немного частиц, приглушённые цвета — подтверждение момента, не шоу.
   Под prefers-reduced-motion ничего не рендерит. */
const CONFETTI_COLORS = [C.lime, C.blue, C.amber, C.teal];
export function ConfettiBurst({ fireKey }) {
  const [pieces, setPieces] = useState([]);
  const prevKey = useRef(fireKey);

  useEffect(() => {
    if (fireKey === prevKey.current || !fireKey) return;
    prevKey.current = fireKey;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const next = Array.from({ length: 10 }, (_, i) => ({
      id: `${fireKey}-${i}`,
      left: 45 + (Math.random() - 0.5) * 50,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      rotate: Math.round(Math.random() * 360),
      delay: Math.random() * 100,
      drift: Math.round((Math.random() - 0.5) * 100),
    }));
    setPieces(next);
    const t = setTimeout(() => setPieces([]), 850);
    return () => clearTimeout(t);
  }, [fireKey]);

  if (!pieces.length) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-10" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="k-confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}ms`,
            '--drift': `${p.drift}px`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}

/* ── SurpriseCard — факт дня: переворот по тапу, меняется раз в день
   (по дню года), не при каждом заходе — даёт причину вернуться завтра,
   ничего не обещая про награду. Спокойная тонировка вместо яркого градиента.
   Факты — из словаря (ui.facts), чтобы меняться вместе с языком. */
export function SurpriseCard() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const facts = t.ui.facts ?? [];
  const dayIndex = facts.length ? Math.floor(Date.now() / 86400000) % facts.length : 0;
  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="k-card k-press w-full text-left p-4 flex items-center gap-4"
      style={{ background: open ? alpha(C.violet, 6) : C.card }}
    >
      <IconTile icon={Sparkles} hue="violet" size={44} />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.08em]" style={{ color: C.muted }}>
          {t.ui.factOfDay}
        </div>
        <div className="text-[14px] font-semibold mt-1 leading-snug" style={{ color: C.text }}>
          {open ? facts[dayIndex] : t.ui.tapToKnow}
        </div>
      </div>
    </button>
  );
}
