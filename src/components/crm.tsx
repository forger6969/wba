import Link from 'next/link'
import { Card, Empty } from '@/components/ui'
import { SUPABASE_YOQ } from '@/lib/supabase/env'

/** Sahifa sarlavhasi — hamma CRM sahifasida bir xil turadi. */
export function Sarlavha({
  nom,
  izoh,
  amal,
}: {
  nom: string
  izoh?: React.ReactNode
  amal?: React.ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="h-display text-[25px]">{nom}</h1>
        {izoh && <p className="lbl">{izoh}</p>}
      </div>
      {amal}
    </header>
  )
}

/** Baza ulanmaganda — sahifa buzilmasin, sababi aytilsin. */
export function Ulanmagan({ nom }: { nom: string }) {
  return (
    <div className="flex flex-col gap-4 px-5 py-5 lg:px-7">
      <Sarlavha nom={nom} izoh="baza ulanmagan" />
      <Card className="p-5">
        <Empty>
          {SUPABASE_YOQ}
          <br />
          Kalitlar qo‘yilgach bu sahifa haqiqiy ma’lumot bilan to‘ladi.
        </Empty>
      </Card>
    </div>
  )
}

/**
 * Sahifalash. Havola bo'lgani uchun JavaScriptsiz ham ishlaydi va
 * orqaga qaytish tugmasi kutilganidek yuradi.
 */
export function Sahifalash({
  yol,
  sorov,
  sahifa,
  jami,
  soni,
}: {
  yol: string
  sorov: Record<string, string | undefined>
  sahifa: number
  jami: number
  soni: number
}) {
  const oxirgi = Math.max(1, Math.ceil(jami / soni))
  if (oxirgi <= 1) return null

  const havola = (p: number) => {
    const s = new URLSearchParams()
    Object.entries(sorov).forEach(([k, v]) => {
      if (v) s.set(k, v)
    })
    if (p > 1) s.set('sahifa', String(p))
    const q = s.toString()
    return q ? `${yol}?${q}` : yol
  }

  const tugma =
    'flex min-h-11 items-center rounded-[9px] border border-line px-4 text-[13px] transition hover:border-ink-3 hover:text-ink'

  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Sahifalar">
      {sahifa > 1 ? (
        <Link href={havola(sahifa - 1)} className={`${tugma} text-ink-2`}>
          ← Oldingi
        </Link>
      ) : (
        <span className={`${tugma} cursor-not-allowed text-ink-4`}>← Oldingi</span>
      )}

      <span className="lbl">
        {sahifa} / {oxirgi} · jami {jami}
      </span>

      {sahifa < oxirgi ? (
        <Link href={havola(sahifa + 1)} className={`${tugma} text-ink-2`}>
          Keyingi →
        </Link>
      ) : (
        <span className={`${tugma} cursor-not-allowed text-ink-4`}>Keyingi →</span>
      )}
    </nav>
  )
}
