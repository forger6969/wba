/**
 * Formalar uchun umumiy bo'laklar.
 *
 * Formalar server action bilan ishlaydi va JavaScriptsiz ham yuboriladi.
 * Natija manzil orqali qaytadi (?ok=... / ?xato=...) — sahifa uni
 * <Xabar> bilan ko'rsatadi. Shunday qilib har forma uchun alohida
 * klient holati yozish shart emas.
 */

import type { ReactNode } from 'react'

/** Matn maydoni, tanlov va sana uchun bitta ko'rinish. */
export const kirishKlass =
  'min-h-11 w-full rounded-[9px] border border-line bg-surface px-3 text-[13.5px] text-ink placeholder:text-ink-4'

export function Maydon({
  nom,
  izoh,
  children,
  className = '',
}: {
  nom: string
  izoh?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="lbl">{nom}</span>
      {children}
      {izoh && <span className="text-[11.5px] leading-snug text-ink-3">{izoh}</span>}
    </label>
  )
}

/** Amal natijasi. Xato — qizil, muvaffaqiyat — yashil. */
export function Xabar({ ok, xato }: { ok?: string; xato?: string }) {
  if (!ok && !xato) return null
  return (
    <p
      role={xato ? 'alert' : 'status'}
      className={`rounded-[10px] border px-4 py-3 text-[13px] ${
        xato ? 'border-brand bg-brand-soft text-ink' : 'border-ok bg-ok-soft text-ok'
      }`}
    >
      {xato ?? ok}
    </p>
  )
}

/** Forma bo'limi — sarlavha va ichki maydonlar. */
export function FormaBolim({ nom, children }: { nom: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-[12px] border border-line bg-surface p-4">
      <legend className="px-1 font-[family-name:var(--font-display)] text-[14px] font-bold">{nom}</legend>
      {children}
    </fieldset>
  )
}
