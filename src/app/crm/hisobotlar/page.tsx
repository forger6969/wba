import Link from 'next/link'
import { talabRol } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { supabaseSozlanganmi } from '@/lib/supabase/env'
import { Card, CardHeader, Stat, BarRow, Empty } from '@/components/ui'
import { Sarlavha, Ulanmagan } from '@/components/crm'
import { Maydon, kirishKlass } from '@/components/forma'
import { pul, sana, davrNomi, bugunToshkent } from '@/lib/format'
import type { Hisobot, MonthlyIncome } from '@/lib/types'

export const metadata = { title: 'Hisobotlar' }
export const dynamic = 'force-dynamic'

const USUL_NOMI: Record<string, string> = {
  naqd: 'Naqd',
  karta: 'Karta',
  click: 'Click',
  payme: 'Payme',
  aniqlanmagan: '[ANIQLANMAGAN]',
}

/** "2026-09-17" dan n kun oldin/keyin. */
function kunQosh(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/**
 * Oraliq — botdagi tugmalar: "Bugun", "Shu oy", "Hisobot (sana oralig'i)".
 * Hafta dushanbadan boshlanadi.
 */
function oraliq(tur: string, dan?: string, gacha?: string): { tur: string; dan: string; gacha: string } {
  const bugun = bugunToshkent()
  if (tur === 'bugun') return { tur, dan: bugun, gacha: bugun }
  if (tur === 'hafta') {
    const haftaKuni = (new Date(`${bugun}T00:00:00Z`).getUTCDay() + 6) % 7 // dushanba = 0
    return { tur, dan: kunQosh(bugun, -haftaKuni), gacha: bugun }
  }
  if (tur === 'oraliq' && dan && gacha && /^\d{4}-\d{2}-\d{2}$/.test(dan) && /^\d{4}-\d{2}-\d{2}$/.test(gacha)) {
    return dan <= gacha ? { tur, dan, gacha } : { tur, dan: gacha, gacha: dan }
  }
  return { tur: 'oy', dan: `${bugun.slice(0, 7)}-01`, gacha: bugun }
}

export default async function Hisobotlar({
  searchParams,
}: {
  searchParams: Promise<{ tur?: string; dan?: string; gacha?: string }>
}) {
  await talabRol('admin', 'direktor', 'qabulxona')
  if (!supabaseSozlanganmi()) return <Ulanmagan nom="Hisobotlar" />

  const s = await searchParams
  const o = oraliq(s.tur ?? 'oy', s.dan, s.gacha)

  const supabase = await createClient()
  const [{ data: hisobot, error }, { data: oylik }] = await Promise.all([
    supabase.rpc('tushum_hisobot', { p_dan: o.dan, p_gacha: o.gacha }),
    supabase.from('v_monthly_income').select('*').order('davr', { ascending: false }).limit(12),
  ])

  const h = hisobot as Hisobot | null
  const oylar = ((oylik ?? []) as MonthlyIncome[]).slice().reverse()

  const tugma = (tur: string, nom: string) => (
    <Link
      href={`/crm/hisobotlar?tur=${tur}`}
      className={`flex min-h-11 items-center rounded-[9px] border px-4 text-[13px] transition ${
        o.tur === tur ? 'border-brand bg-brand-soft text-ink' : 'border-line text-ink-3 hover:text-ink'
      }`}
    >
      {nom}
    </Link>
  )

  const davomatFoiz =
    h && h.davomat.belgilar > 0 ? Math.round((h.davomat.kelgan * 100) / h.davomat.belgilar) : null

  /* Qilinmagan darslar — ustoz bo'yicha guruhlab (botdagi kabi) */
  const qilinmagan = new Map<string, { nom: string; sana: string }[]>()
  for (const q of h?.qilinmagan ?? []) {
    const r = qilinmagan.get(q.ustoz) ?? []
    r.push({ nom: q.nom, sana: q.sana })
    qilinmagan.set(q.ustoz, r)
  }

  const maxOf = (r: { summa: number }[]) => Math.max(1, ...r.map((x) => Number(x.summa)))

  return (
    <div className="flex flex-col gap-4 px-5 py-5 lg:px-7">
      <Sarlavha
        nom="Hisobotlar"
        izoh={o.dan === o.gacha ? sana(o.dan) : `${sana(o.dan)} — ${sana(o.gacha)}`}
      />

      <div className="flex flex-wrap items-end gap-2">
        {tugma('bugun', 'Bugun')}
        {tugma('hafta', 'Shu hafta')}
        {tugma('oy', 'Shu oy')}
        <form className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="tur" value="oraliq" />
          <Maydon nom="Dan">
            <input type="date" name="dan" defaultValue={o.dan} className={kirishKlass} />
          </Maydon>
          <Maydon nom="Gacha">
            <input type="date" name="gacha" defaultValue={o.gacha} className={kirishKlass} />
          </Maydon>
          <button type="submit" className="min-h-11 rounded-[9px] border border-line px-4 text-[13px] text-ink-2 hover:text-ink">
            Ko‘rsatish
          </button>
        </form>
      </div>

      {error || !h ? (
        <Card className="p-5">
          <Empty>Hisobotni olib bo‘lmadi{error ? `: ${error.message}` : ''}.</Empty>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
            <Stat label="Tushum" value={Number(h.tushum)} sub={`${h.soni} ta to‘lov · ${h.odam} kishi`} />
            <Stat
              label="Tasdiq kutmoqda"
              value={Number(h.tasdiqlanmagan)}
              sub="shu oraliqda"
              ton={Number(h.tasdiqlanmagan) > 0 ? 'accent' : 'ok'}
            />
            <Stat
              label="Davomat"
              value={davomatFoiz === null ? '—' : `${davomatFoiz}%`}
              sub={`${h.davomat.kelgan} keldi · ${h.davomat.kelmadi} kelmadi · ${h.davomat.sababli} sababli`}
              ton={davomatFoiz !== null && davomatFoiz >= 80 ? 'ok' : 'neytral'}
            />
            <Stat
              label="Davomat qilinmagan"
              value={h.darslar.qilinmagan}
              sub={`${h.darslar.kutilgan} ta darsdan`}
              ton={h.darslar.qilinmagan > 0 ? 'brand' : 'ok'}
              border={h.darslar.qilinmagan > 0 ? 'brand' : undefined}
            />
          </div>

          <div className="grid gap-3.5 lg:grid-cols-3">
            {(
              [
                ['Usul bo‘yicha', h.usul.map((x) => ({ ...x, nom: USUL_NOMI[x.nom] ?? x.nom }))],
                ['Ustoz bo‘yicha', h.ustoz],
                ['Yo‘nalish bo‘yicha', h.yonalish],
              ] as const
            ).map(([sarlavha, qatorlar]) => (
              <Card key={sarlavha} className="flex flex-col">
                <CardHeader title={sarlavha} meta="so‘m" />
                <div className="flex flex-col px-5 pb-4">
                  {qatorlar.length === 0 ? (
                    <Empty>Bu oraliqda to‘lov yo‘q.</Empty>
                  ) : (
                    qatorlar.map((q) => <BarRow key={q.nom} label={q.nom} value={Number(q.summa)} max={maxOf(qatorlar)} />)
                  )}
                </div>
              </Card>
            ))}
          </div>

          <div className="grid gap-3.5 lg:grid-cols-2">
            <Card className="flex flex-col">
              <CardHeader title="Davomat qilinmagan darslar" meta="jadval bo‘yicha dars bor, belgi yo‘q" />
              <div className="flex flex-col gap-3 px-5 pb-4">
                {qilinmagan.size === 0 ? (
                  <Empty>Hamma darsga davomat qo‘yilgan.</Empty>
                ) : (
                  [...qilinmagan.entries()].map(([ustoz, darslar]) => (
                    <div key={ustoz} className="flex flex-col gap-1">
                      <span className="text-[13px] font-semibold">
                        {ustoz} <span className="text-ink-3">— {darslar.length} ta</span>
                      </span>
                      <span className="text-[12px] leading-relaxed text-ink-3">
                        {darslar.slice(0, 8).map((d) => `${d.nom.split(' · ')[0]} ${d.sana.slice(8, 10)}.${d.sana.slice(5, 7)}`).join(', ')}
                        {darslar.length > 8 ? ' …' : ''}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="flex flex-col">
              <CardHeader title="Probniylar" meta="shu oraliqda yozilgan" />
              <div className="grid grid-cols-2 gap-3 px-5 pb-4 sm:grid-cols-4">
                {(
                  [
                    ['Jami', h.probniy.jami],
                    ['Doimiy', h.probniy.yozildi],
                    ['Kelmadi', h.probniy.kelmadi],
                    ['Rad etdi', h.probniy.rad],
                  ] as const
                ).map(([nom, son]) => (
                  <span key={nom} className="flex flex-col gap-1">
                    <span className="lbl">{nom}</span>
                    <span className="tnum font-[family-name:var(--font-display)] text-[22px] font-bold">{son}</span>
                  </span>
                ))}
              </div>
              <p className="px-5 pb-4 text-[12px] text-ink-3">{h.probniy.kutilmoqda} tasi hali kutilmoqda.</p>
            </Card>
          </div>

          <div className="grid gap-3.5 lg:grid-cols-2">
            <Card className="flex flex-col">
              <CardHeader title="Kunlar bo‘yicha tushum" meta="so‘m" />
              <div className="flex flex-col px-5 pb-4">
                {h.kunlar.length === 0 ? (
                  <Empty>Bu oraliqda to‘lov yo‘q.</Empty>
                ) : (
                  h.kunlar.map((k) => (
                    <BarRow key={k.sana} label={`${k.sana.slice(8, 10)}.${k.sana.slice(5, 7)} · ${k.soni} ta`} value={Number(k.summa)} max={maxOf(h.kunlar)} />
                  ))
                )}
              </div>
            </Card>

            <Card className="flex flex-col">
              <CardHeader title="Oylar bo‘yicha tushum" meta="oxirgi 12 oy" />
              <div className="flex flex-col px-5 pb-4">
                {oylar.length === 0 ? (
                  <Empty>Hali to‘lov yo‘q.</Empty>
                ) : (
                  oylar.map((m) => (
                    <BarRow key={m.davr} label={davrNomi(m.davr)} value={Number(m.tushum)} max={Math.max(1, ...oylar.map((x) => Number(x.tushum)))} />
                  ))
                )}
                {oylar.length > 0 && (
                  <p className="mt-2 text-[11.5px] text-ink-3">
                    Oy — to‘lov qaysi oy uchun qilingan (davr), sana emas. Jami: {pul(oylar.reduce((a, m) => a + Number(m.tushum), 0))} so‘m
                  </p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
