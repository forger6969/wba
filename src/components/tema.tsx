'use client'

import { useEffect, useState } from 'react'
import { IconSun, IconMoon } from '@/components/icons'

type Tema = 'light' | 'dark'

/** localStorage kaliti — no-FOUC skript (layout) ham shu nomni o'qiydi. */
const KALIT = 'wba-tema'

/** Hozir amalda qaysi tema ko'rinayotganini aniqlaydi. */
function joriyTema(): Tema {
  if (typeof document === 'undefined') return 'dark'
  const belgi = document.documentElement.getAttribute('data-theme')
  if (belgi === 'light' || belgi === 'dark') return belgi
  // Belgilanmagan — tizim sozlamasi
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

/**
 * Yorug'/qorong'i almashtirgich. Tanlov localStorage'da saqlanadi,
 * <html data-theme> orqali qo'llanadi (globals.css shunga qarab rang beradi).
 */
export function TemaTugma({ className = '' }: { className?: string }) {
  const [tema, setTema] = useState<Tema>('dark')
  const [tayyor, setTayyor] = useState(false)

  useEffect(() => {
    setTema(joriyTema())
    setTayyor(true)
  }, [])

  function almashtir() {
    const yangi: Tema = tema === 'dark' ? 'light' : 'dark'
    setTema(yangi)
    document.documentElement.setAttribute('data-theme', yangi)
    try {
      localStorage.setItem(KALIT, yangi)
    } catch {
      // localStorage yopiq bo'lsa — jim o'tamiz, tema baribir qo'llandi
    }
  }

  // Server va mijoz bir xil chizsin (hydration): tayyor bo'lgunча neytral
  const nom = tema === 'dark' ? 'Yorug‘ rejim' : 'Qorong‘i rejim'

  return (
    <button
      type="button"
      onClick={almashtir}
      aria-label={nom}
      title={nom}
      className={`inline-flex size-9 items-center justify-center rounded-[9px] border border-line text-ink-2 transition hover:border-ink-3 hover:text-ink ${className}`}
    >
      {tayyor && tema === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
    </button>
  )
}
