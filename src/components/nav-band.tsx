'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * Yon menyudagi bitta band — joriy sahifa yoritilishi uchun klient
 * komponent (usePathname server komponentda yo'q). Layout.tsx o'zi
 * async server komponent bo'lib qolaveradi, faqat shu bo'lak klient.
 *
 * MUHIM: server komponentdan klientga xom `Icon` funksiyasini (yoki
 * butun MenyuBand obyektini) uzatib bo'lmaydi — React "Functions
 * cannot be passed directly to Client Components" bilan yiqiladi.
 * Shuning uchun ikonka SERVERDA already-rendered ReactNode sifatida
 * tayyorlanib keladi (`icon` prop), faqat serializable maydonlar
 * (href/nom/tayyor) xom holda o'tadi.
 */
export function NavBand({
  href,
  nom,
  icon,
  tayyor,
  nishon,
}: {
  href: string
  nom: string
  icon: ReactNode
  tayyor: boolean
  nishon?: number
}) {
  const pathname = usePathname()
  const faol = pathname === href || pathname.startsWith(`${href}/`)

  const ichi = (
    <>
      {icon}
      <span className="flex-1">{nom}</span>
      {tayyor ? (
        nishon ? (
          <span className={`tnum font-[family-name:var(--font-mono)] text-[11px] ${faol ? 'text-white' : 'text-brand'}`}>
            {nishon}
          </span>
        ) : null
      ) : (
        <span className="lbl text-[8.5px]">tez orada</span>
      )}
    </>
  )

  if (!tayyor) {
    return (
      <span
        aria-disabled="true"
        title="Bu sahifa prototipda hali yo‘q"
        className="flex min-h-11 cursor-not-allowed items-center gap-3 rounded-lg px-3 text-[13.5px] text-ink-4"
      >
        {ichi}
      </span>
    )
  }

  return (
    <Link
      href={href}
      aria-current={faol ? 'page' : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-[13.5px] transition-colors ${
        faol ? 'bg-brand text-white' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
      }`}
    >
      {ichi}
    </Link>
  )
}
