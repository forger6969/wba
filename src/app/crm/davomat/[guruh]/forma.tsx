'use client'

import { useState, useTransition } from 'react'
import { davomatniSaqla } from './actions'
import type { AttendanceStatus } from '@/lib/types'

export type Qatnashuvchi = {
  student_id: string
  fish: string
  holat: AttendanceStatus
  /** Shu darsda berilgan woblar (0 — berilmagan) */
  ball: number
}

const HOLATLAR: { kalit: AttendanceStatus; nom: string }[] = [
  { kalit: 'keldi', nom: 'Keldi' },
  { kalit: 'kechikdi', nom: 'Kechikdi' },
  { kalit: 'sababli', nom: 'Sababli' },
  { kalit: 'kelmadi', nom: 'Kelmadi' },
]

const TON: Record<AttendanceStatus, string> = {
  keldi: 'bg-ok-soft text-ok border-ok',
  kechikdi: 'bg-accent-soft text-accent border-accent-line',
  sababli: 'bg-surface-2 text-ink border-ink-3',
  kelmadi: 'bg-brand-soft text-brand border-brand',
}

/**
 * Bir darsning davomati — va xohlasa woblar.
 *
 * DAVOMAT MAJBURIY, WOBLAR IXTIYORIY: saqlash uchun woblar berish shart
 * emas. Woblar bo'limi yopiq turadi va ustoz o'zi ochadi. Keyinroq
 * berishni istasa — Woblar bo'limidan beradi.
 *
 * Yangi ochilgan darsda hamma "Keldi" bo'lib turadi (botdagi kabi) va
 * hech narsa o'zgartirmasa ham saqlash MUMKIN — hamma kelgan kun ham
 * davomat.
 */
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
  const [saqlangan, setSaqlangan] = useState(belgilanganmi ? boshlangich : null)
  const [woblarOchiq, setWoblarOchiq] = useState(boshlangich.some((q) => q.ball !== 0))
  const [xato, setXato] = useState<string | null>(null)
  const [xabar, setXabar] = useState<string | null>(belgilanganmi ? 'Bu darsning davomati avval saqlangan' : null)
  const [kutilmoqda, boshla] = useTransition()

  // Hali saqlanmagan dars — o'zgarish bo'lmasa ham saqlash mumkin
  const saqlashKerak = saqlangan === null || JSON.stringify(qatorlar) !== JSON.stringify(saqlangan)

  const holatQoy = (id: string, holat: AttendanceStatus) =>
    setQatorlar((q) => q.map((x) => (x.student_id === id ? { ...x, holat } : x)))

  const woblarQoy = (id: string, delta: number) =>
    setQatorlar((q) =>
      q.map((x) =>
        x.student_id === id ? { ...x, ball: Math.max(-10, Math.min(10, x.ball + delta)) } : x,
      ),
    )

  const hammasi = (holat: AttendanceStatus) => setQatorlar((q) => q.map((x) => ({ ...x, holat })))

  function saqla() {
    setXato(null)

    // Optimistik: ekran darhol "saqlandi" holatiga o'tadi, xato bo'lsa qaytadi
    const yuborilgan = qatorlar
    const oldingi = saqlangan
    setSaqlangan(yuborilgan)
    setXabar('Saqlanmoqda…')

    boshla(async () => {
      const belgilar: Record<string, AttendanceStatus> = {}
      const woblar: Record<string, number> = {}
      yuborilgan.forEach((q) => {
        belgilar[q.student_id] = q.holat
        if (q.ball !== 0) woblar[q.student_id] = q.ball
      })

      const javob = await davomatniSaqla(guruhId, sana, belgilar, woblar)

      if (!javob.ok) {
        setSaqlangan(oldingi)
        setXabar(null)
        setXato(javob.xato)
        return
      }

      setXabar(
        `Davomat saqlandi — ${javob.natija.davomat} ta o‘quvchi` +
          (javob.natija.ball ? `, ${javob.natija.ball} kishiga woblar` : ''),
      )
    })
  }

  const son = (h: AttendanceStatus) => qatorlar.filter((q) => q.holat === h).length

  return (
    <div className="flex flex-col gap-3">
      {/* Xulosa: kim keldi, kim kelmadi — bir qarashda */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-ok-soft px-2.5 py-1 text-[12.5px] font-semibold text-ok">{son('keldi')} keldi</span>
        <span className="rounded-md bg-accent-soft px-2.5 py-1 text-[12.5px] font-semibold text-accent">{son('kechikdi')} kechikdi</span>
        <span className="rounded-md bg-surface-2 px-2.5 py-1 text-[12.5px] font-semibold text-ink-2">{son('sababli')} sababli</span>
        <span className="rounded-md bg-brand-soft px-2.5 py-1 text-[12.5px] font-semibold text-brand">{son('kelmadi')} kelmadi</span>
        <span className="ml-auto flex gap-2">
          <button type="button" onClick={() => hammasi('keldi')} className="min-h-11 rounded-[9px] border border-line px-3 text-[12px] text-ink-3 hover:text-ink">
            Hammasi keldi
          </button>
          <button
            type="button"
            onClick={() => setWoblarOchiq((v) => !v)}
            aria-pressed={woblarOchiq}
            className={`min-h-11 rounded-[9px] border px-3 text-[12px] ${woblarOchiq ? 'border-accent-line bg-accent-soft text-accent' : 'border-line text-ink-3 hover:text-ink'}`}
          >
            {woblarOchiq ? 'Woblarni yashirish' : 'Woblar ham berish'}
          </button>
        </span>
      </div>

      {xabar && !xato && <p role="status" className="text-[12.5px] text-ok">{xabar}</p>}
      {xato && (
        <p role="alert" className="rounded-[10px] border border-brand bg-brand-soft px-4 py-3 text-[13px]">
          Saqlanmadi: {xato}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {qatorlar.map((q) => (
          <li key={q.student_id} className="flex flex-col gap-2.5 rounded-[11px] border border-line bg-surface px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-[14px] font-semibold">{q.fish}</span>
              <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11.5px] font-semibold ${TON[q.holat]}`}>
                {HOLATLAR.find((h) => h.kalit === q.holat)?.nom}
              </span>
            </div>

            {/* Davomat — to'liq so'z bilan, telefonda ham */}
            <div className="grid grid-cols-4 gap-1.5">
              {HOLATLAR.map((h) => {
                const tanlangan = q.holat === h.kalit
                return (
                  <button
                    key={h.kalit}
                    type="button"
                    onClick={() => holatQoy(q.student_id, h.kalit)}
                    aria-pressed={tanlangan}
                    className={`min-h-11 rounded-[9px] border px-1 text-[12.5px] font-semibold transition ${
                      tanlangan ? TON[h.kalit] : 'border-line text-ink-3 hover:text-ink'
                    }`}
                  >
                    {h.nom}
                  </button>
                )
              })}
            </div>

            {/* Woblar — ixtiyoriy */}
            {woblarOchiq && (
              <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-2.5">
                <span className="text-[12px] text-ink-3">Woblar (ixtiyoriy)</span>
                <span className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => woblarQoy(q.student_id, -1)}
                    aria-label={`${q.fish}: woblar kamaytirish`}
                    className="min-h-11 min-w-11 rounded-[9px] border border-line text-[15px] text-ink-3 transition hover:text-ink"
                  >
                    −
                  </button>
                  <span
                    className={`tnum w-16 text-center font-[family-name:var(--font-mono)] text-[13px] ${
                      q.ball > 0 ? 'text-accent' : q.ball < 0 ? 'text-brand' : 'text-ink-4'
                    }`}
                  >
                    {q.ball > 0 ? `+${q.ball}` : q.ball} W
                  </span>
                  <button
                    type="button"
                    onClick={() => woblarQoy(q.student_id, 1)}
                    aria-label={`${q.fish}: woblar qo‘shish`}
                    className="min-h-11 min-w-11 rounded-[9px] border border-line text-[15px] text-ink-3 transition hover:text-ink"
                  >
                    +
                  </button>
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="sticky bottom-16 z-10 flex items-center justify-between gap-3 rounded-[11px] border border-line bg-surface px-4 py-3 lg:bottom-4">
        <span className="lbl">
          {saqlangan === null ? 'Davomat hali saqlanmagan' : saqlashKerak ? 'Saqlanmagan o‘zgarish bor' : 'Hammasi saqlangan'}
        </span>
        <button
          type="button"
          onClick={saqla}
          disabled={kutilmoqda || !saqlashKerak}
          className="min-h-11 rounded-[9px] bg-brand text-white px-6 text-[14px] font-bold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {kutilmoqda ? 'Saqlanmoqda…' : 'Davomatni saqlash'}
        </button>
      </div>
    </div>
  )
}
