import Link from 'next/link'
import Image from 'next/image'
import { pul } from '@/lib/format'

/* ---------------- Logo ---------------- */

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const w = size === 'sm' ? 28 : size === 'lg' ? 44 : 34
  const nomi = size === 'sm' ? 'text-[15px]' : size === 'lg' ? 'text-xl' : 'text-[17px]'

  return (
    <span className="flex items-center gap-2.5">
      {/* Haqiqiy logotip — qizil belgi ikkala temada ham ko'rinadi */}
      <Image
        src="/logo-qizil.png"
        alt="World Bridge Academy"
        width={w}
        height={w}
        style={{ width: w, height: w }}
        className="shrink-0 object-contain"
        priority
      />
      <span className="flex flex-col leading-tight">
        <span className={`font-[family-name:var(--font-display)] font-extrabold tracking-[0.05em] ${nomi}`}>
          WBA
        </span>
        {size !== 'sm' && (
          <span className="font-[family-name:var(--font-mono)] text-[8.5px] uppercase tracking-[0.1em] text-ink-3">
            World Bridge Academy
          </span>
        )}
      </span>
    </span>
  )
}

/* ---------------- Karta ---------------- */

export function Card({
  children,
  className = '',
  as: As = 'div',
}: {
  children: React.ReactNode
  className?: string
  as?: 'div' | 'section' | 'article'
}) {
  return (
    <As
      className={`rounded-[14px] bg-surface shadow-[0_8px_24px_-18px_rgba(26,38,22,0.28)] ${className}`}
    >
      {children}
    </As>
  )
}

export function CardHeader({
  title,
  meta,
  action,
}: {
  title: string
  meta?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line-soft px-5 pt-5 pb-4">
      <h2 className="font-[family-name:var(--font-display)] text-[15px] font-bold">{title}</h2>
      {meta && <span className="lbl">{meta}</span>}
      {action}
    </div>
  )
}

/* ---------------- KPI plitkasi ---------------- */

const TON = {
  neytral: 'text-ink',
  brand: 'text-brand',
  accent: 'text-accent',
  ok: 'text-ok',
} as const

export function Stat({
  label,
  value,
  sub,
  ton = 'neytral',
  border,
}: {
  label: string
  value: string | number
  sub?: string
  ton?: keyof typeof TON
  border?: 'brand' | 'accent'
}) {
  const urgu = border === 'brand' ? 'text-brand' : border === 'accent' ? 'text-accent' : 'text-ink-3'

  return (
    <div
      className="relative flex min-h-36 flex-col justify-end gap-1.5 overflow-hidden rounded-[13px] bg-surface px-5 py-4 shadow-[0_8px_24px_-18px_rgba(26,38,22,0.28)]"
    >
      <span className={`absolute left-5 top-4 flex size-9 items-center justify-center rounded-[10px] bg-brand-soft ${urgu}`} aria-hidden="true">
        <span className="grid grid-cols-2 gap-0.5">
          <span className="size-1.5 rounded-sm bg-current" />
          <span className="size-1.5 rounded-sm bg-current opacity-70" />
          <span className="size-1.5 rounded-sm bg-current opacity-70" />
          <span className="size-1.5 rounded-sm bg-current" />
        </span>
      </span>
      <span className="absolute right-5 top-5 text-lg leading-none text-ink-3" aria-hidden="true">›</span>
      <span className="lbl">{label}</span>
      <span
        className={`tnum font-[family-name:var(--font-display)] text-[26px] leading-none font-extrabold tracking-[-0.02em] ${TON[ton]}`}
      >
        {typeof value === 'number' ? pul(value) : value}
      </span>
      {sub && <span className="text-xs text-ink-3">{sub}</span>}
    </div>
  )
}

/* ---------------- Nishon ---------------- */

const NISHON = {
  ok: 'bg-ok-soft text-ok',
  brand: 'bg-brand-soft text-brand',
  accent: 'bg-accent-soft text-accent',
  jim: 'bg-surface-2 text-ink-2',
} as const

export function Badge({
  children,
  ton = 'jim',
  nuqta = false,
}: {
  children: React.ReactNode
  ton?: keyof typeof NISHON
  nuqta?: boolean
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-[11.5px] font-semibold ${NISHON[ton]}`}
    >
      {nuqta && <span className="block size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

/* ---------------- Tugma ---------------- */

const TUGMA = {
  // Qizil fonda matn DOIM oq — yorug' temada text-ink qora bo'lib, qizilda o'qilmasdi.
  asosiy:
    'bg-brand text-white shadow-[0_6px_16px_-6px_var(--color-brand)] hover:brightness-110 hover:-translate-y-px active:translate-y-0 active:brightness-95',
  ikkilamchi:
    'bg-surface text-ink-2 shadow-[inset_0_0_0_1px_var(--color-line)] hover:text-ink hover:bg-surface-2',
  ogohlantirish:
    'bg-accent text-bg font-bold shadow-[0_6px_16px_-6px_var(--color-accent)] hover:brightness-110 hover:-translate-y-px active:translate-y-0 active:brightness-95',
} as const

type TugmaProps = {
  children: React.ReactNode
  variant?: keyof typeof TUGMA
  href?: string
  /** Fayl yuklab beradigan manzil (masalan Excel). Oddiy <a> bo'ladi:
      Next <Link> uni oldindan yuklab (prefetch) har safar faylni behuda yasardi. */
  yuklab?: boolean
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
  name?: string
  value?: string
}

export function Button({
  children,
  variant = 'asosiy',
  href,
  yuklab,
  type = 'button',
  disabled,
  className = '',
  ...rest
}: TugmaProps) {
  const cls = `inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-5 text-[13.5px] font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${TUGMA[variant]} ${className}`

  if (href && yuklab) {
    return (
      <a href={href} download className={cls}>
        {children}
      </a>
    )
  }
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    )
  }
  return (
    <button type={type} disabled={disabled} className={cls} {...rest}>
      {children}
    </button>
  )
}

/* ---------------- Bo'sh holat ---------------- */

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] bg-surface-2 px-4 py-4 text-[12.5px] leading-relaxed text-ink-2">
      {children}
    </div>
  )
}

/* ---------------- Gorizontal ustun (chart) ---------------- */

export function BarRow({
  label,
  value,
  max,
  format = pul,
}: {
  label: string
  value: number
  max: number
  format?: (n: number) => string
}) {
  const w = max > 0 ? Math.max(0, (value / max) * 100) : 0
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-center gap-3 py-1">
      <span className="truncate text-[12.5px]">{label}</span>
      <span className="h-2.5 overflow-hidden rounded-full bg-surface-2">
        <span
          className="block h-2.5 rounded-full bg-brand transition-[width] duration-500 ease-out"
          style={{ width: `${w}%` }}
        />
      </span>
      <span className={`tnum w-24 text-right font-[family-name:var(--font-mono)] text-xs ${value > 0 ? 'text-ink-2' : 'text-ink-4'}`}>
        {format(value)}
      </span>
    </div>
  )
}
