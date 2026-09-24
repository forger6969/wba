'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { MenyuBand } from '@/lib/menyu'

/**
 * Yon menyudagi bitta band — joriy sahifa yoritilishi uchun klient
 * komponent (usePathname server komponentda yo'q). Layout.tsx o'zi
 * async server komponent bo'lib qolaveradi, faqat shu bo'lak klient.
 */
export function NavBand({ band, nishon }: { band: MenyuBand; nishon?: number }) {
  const pathname = usePathname()
  const faol = pathname === band.href || pathname.startsWith(`${band.href}/`)

  const ichi = (
    <>
      <band.Icon size={17} />
      <span className="flex-1">{band.nom}</span>
      {band.tayyor ? (
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

  if (!band.tayyor) {
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
      href={band.href}
      aria-current={faol ? 'page' : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-[13.5px] transition-colors ${
        faol ? 'bg-brand text-white' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
      }`}
    >
      {ichi}
    </Link>
  )
}
