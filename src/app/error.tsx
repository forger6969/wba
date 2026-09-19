'use client'

import { useEffect } from 'react'

/**
 * Kutilmagan xato — oq ekran o'rniga tushunarli sahifa (o'zbekcha).
 * Server komponentida istisno chiqsa shu ko'rinadi. Batafsil xato
 * konsolga yoziladi; foydalanuvchiga texnik matn ko'rsatilmaydi.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-16 text-center">
      <p className="lbl text-brand">Xatolik</p>
      <h1 className="h-display text-[26px]">Nimadir noto‘g‘ri ketdi</h1>
      <p className="max-w-[420px] text-[14.5px] leading-relaxed text-ink-2 text-pretty">
        Sahifani ochib bo‘lmadi. Qaytadan urinib ko‘ring — takrorlansa, admin bilan bog‘laning.
      </p>
      <button
        onClick={reset}
        className="inline-flex min-h-12 items-center rounded-[10px] bg-brand px-6 text-[14.5px] font-bold transition hover:brightness-110"
      >
        Qaytadan urinib ko‘rish
      </button>
    </div>
  )
}
