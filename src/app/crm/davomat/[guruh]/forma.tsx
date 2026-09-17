'use client'

import { useState, useTransition } from 'react'
import { davomatniSaqla } from './actions'
import type { AttendanceStatus } from '@/lib/types'

export type Qatnashuvchi = {
  student_id: string
  fish: string
  holat: AttendanceStatus
  ball: number
}

const HOLATLAR: { kalit: AttendanceStatus; nom: string; qisqa: string }[] = [
  { kalit: 'keldi', nom: 'Keldi', qisqa: 'K' },
  { kalit: 'kechikdi', nom: 'Kechikdi', qisqa: 'Kch' },
  { kalit: 'sababli', nom: 'Sababli', qisqa: 'S' },
  { kalit: 'kelmadi', nom: 'Yo‘q', qisqa: 'Y' },
]

const TON: Record<AttendanceStatus, string> = {
  keldi: 'bg-ok-soft text-ok border-ok',
  kechikdi: 'bg-accent-soft text-accent border-accent-line',
  sababli: 'bg-surface-2 text-ink-2 border-line',
  kelmadi: 'bg-brand-soft text-brand border-brand-line',
}

/** Bir darsning davomati va ballari. Saqlash — bitta tugma. */
export function DavomatForma({
  guruhId,
  sana,
  boshlangich,
  belgilanganmi,
}: {
  guruhId: string
  sana: string
  boshlangich: Qatnashuvchi[]
  belgilanganmi: boolean
}) {
  const [qatorlar, setQatorlar] = useState(boshlangich)
  const [saqlangan, setSaqlangan] = useState(boshlangich)
  const [xato, setXato] = useState<string | null>(null)
  const [xabar, setXabar] = useState<string | null>(belgilanganmi ? 'Avval saqlangan' : null)
  const [kutilmoqda, boshla] = useTransition()

  const ozgargan = JSON.stringify(qatorlar) !== JSON.stringify(saqlangan)

  const holatQoy = (id: string, holat: AttendanceStatus) =>
    setQatorlar((q) => q.map((x) => (x.student_id === id ? { ...x, holat } : x)))

  const ballQoy = (id: string, delta: number) =>
    setQatorlar((q) =>
      q.map((x) =>
        x.student_id === id ? { ...x, ball: Math.max(-10, Math.min(10, x.ball + delta)) } : x,
      ),
    )

  function saqla() {
    setXato(null)

    // Optimistik: ekran darhol "saqlandi" holatiga o'tadi
    const yuborilgan = qatorlar
    const oldingi = saqlangan
    setSaqlangan(yuborilgan)
    setXabar('Saqlanmoqda…')

    boshla(async () => {
      const belgilar: Record<string, AttendanceStatus> = {}
      const ballar: Record<string, number> = {}
      yuborilgan.forEach((q) => {
        belgilar[q.student_id] = q.holat
        if (q.ball !== 0) ballar[q.student_id] = q.ball
      })

      const javob = await davomatniSaqla(guruhId, sana, belgilar, ballar)

      if (!javob.ok) {
        // Xato — ekran oldingi holatiga qaytadi
        setSaqlangan(oldingi)
        setXabar(null)
        setXato(javob.xato)
        return
      }

      setXabar(`Saqlandi — ${javob.natija.davomat} ta belgi, ${javob.natija.ball} ta ball`)
    })
  }

  const kelgan = qatorlar.filter((q) => q.holat === 'keldi' || q.holat === 'kechikdi').length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="lbl">
          {kelgan} / {qatorlar.length} kelgan
        </span>
        {xabar && !xato && <span className="text-[12.5px] text-ok">{xabar}</span>}
        {xato && (
          <span role="alert" className="text-[12.5px] text-brand">
            Saqlanmadi: {xato}
          </span>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {qatorlar.map((q) => (
          <li
            key={q.student_id}
            className="flex flex-wrap items-center gap-3 rounded-[11px] border border-line bg-surface px-4 py-3"
          >
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{q.fish}</span>

            {/* Davomat */}
            <span className="flex gap-1.5">
              {HOLATLAR.map((h) => {
                const tanlangan = q.holat === h.kalit
                return (
                  <button
                    key={h.kalit}
                    type="button"
                    onClick={() => holatQoy(q.student_id, h.kalit)}
                    aria-pressed={tanlangan}
                    title={h.nom}
                    className={`min-h-11 min-w-11 rounded-[9px] border px-2.5 text-[12.5px] font-semibold transition ${
                      tanlangan ? TON[h.kalit] : 'border-line text-ink-3 hover:text-ink'
                    }`}
                  >
                    <span className="max-sm:hidden">{h.nom}</span>
                    <span className="sm:hidden">{h.qisqa}</span>
                  </button>
                )
              })}
            </span>

            {/* WOBLR */}
            <span className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => ballQoy(q.student_id, -1)}
                aria-label={`${q.fish}: ball kamaytirish`}
                className="min-h-11 min-w-11 rounded-[9px] border border-line text-[15px] text-ink-3 transition hover:text-ink"
              >
                −
              </button>
              <span
                className={`tnum w-10 text-center font-[family-name:var(--font-mono)] text-[13px] ${
                  q.ball > 0 ? 'text-accent' : q.ball < 0 ? 'text-brand' : 'text-ink-4'
                }`}
              >
                {q.ball > 0 ? `+${q.ball}` : q.ball}
              </span>
              <button
                type="button"
                onClick={() => ballQoy(q.student_id, 1)}
                aria-label={`${q.fish}: ball qo‘shish`}
                className="min-h-11 min-w-11 rounded-[9px] border border-line text-[15px] text-ink-3 transition hover:text-ink"
              >
                +
              </button>
            </span>
          </li>
        ))}
      </ul>

      <div className="sticky bottom-16 z-10 flex items-center justify-between gap-3 rounded-[11px] border border-line bg-surface px-4 py-3 lg:bottom-4">
        <span className="lbl">
          {ozgargan ? 'Saqlanmagan o‘zgarish bor' : 'Hammasi saqlangan'}
        </span>
        <button
          type="button"
          onClick={saqla}
          disabled={kutilmoqda || !ozgargan}
          className="min-h-11 rounded-[9px] bg-brand px-6 text-[14px] font-bold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {kutilmoqda ? 'Saqlanmoqda…' : 'Saqlash'}
        </button>
      </div>
    </div>
  )
}
