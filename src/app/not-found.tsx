import Link from 'next/link'
import { Logo } from '@/components/ui'

export const metadata = { title: 'Sahifa topilmadi' }

/** 404 — sayt uslubida, o'zbekcha. Standart Next ekrani o'rniga. */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-16 text-center">
      <Logo size="lg" />
      <p className="lbl text-brand">404</p>
      <h1 className="h-display text-[28px]">Bunday sahifa yo‘q</h1>
      <p className="max-w-[420px] text-[14.5px] leading-relaxed text-ink-2 text-pretty">
        Havola eskirgan yoki manzil noto‘g‘ri yozilgan bo‘lishi mumkin.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-12 items-center rounded-[10px] bg-brand px-6 text-[14.5px] font-bold transition hover:brightness-110"
      >
        Bosh sahifaga
      </Link>
    </div>
  )
}
