import Link from 'next/link'
import { talabRol } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { supabaseSozlanganmi } from '@/lib/supabase/env'
import { Card, CardHeader, Empty } from '@/components/ui'
import { Sarlavha, Ulanmagan } from '@/components/crm'
import { Maydon, Xabar, kirishKlass } from '@/components/forma'
import { Select } from '@/components/select'
import { Yuborish } from '@/components/yuborish'
import { IconPhone } from '@/components/icons'
import { sana, telefon, bugunToshkent } from '@/lib/format'
import { probniyHolat, probniyGuruh, probniyDoimiy } from '../probniylar/actions'
import { AmalGuruhi } from '@/components/amal-guruhi'
import type { LeadStatus } from '@/lib/types'

export const metadata = { title: 'Lidlar' }
export const dynamic = 'force-dynamic'

/**
 * Faqat saytdagi ariza formasidan kelganlar (manba='sayt') — Probniylar
 * esa QOLGAN hammasi (qo'lda kiritilgan, tavsiya, boshqa manbalar ham).
 * Ikkalasi ham bitta `leads` jadvalini o'qiydi/yozadi, shuning uchun
 * amallar ham probniylar/actions.ts'dan olingan — ikki joyda bir xil
 * mantiq yozilmasin.
 */
const BOLIMLAR = {
  yangi: { nom: 'Yangi', holatlar: ['yangi', 'qongiroq', 'keldi'] as LeadStatus[] },
  doimiy: { nom: 'Doimiy bo‘ldi', holatlar: ['yozildi'] as LeadStatus[] },
  kelmadi: { nom: 'Kelmadi', holatlar: ['kelmadi'] as LeadStatus[] },
  rad: { nom: 'Rad etdi', holatlar: ['rad'] as LeadStatus[] },
} as const

type Bolim = keyof typeof BOLIMLAR

type Lid = {
  id: string
  ism: string
  telefon: string
  holat: LeadStatus
  izoh: string | null
  student_id: string | null
  group_id: string | null
  sinov_sana: string | null
  created_at: string
  subjects: { nom: string } | null
  groups: { nom: string } | null
}

export default async function Lidlar({
  searchParams,
}: {
  searchParams: Promise<{ bolim?: string; ok?: string; xato?: string }>
}) {
  await talabRol('admin', 'direktor', 'qabulxona')
  if (!supabaseSozlanganmi()) return <Ulanmagan nom="Lidlar" />

  const s = await searchParams
  const bolim: Bolim = (Object.keys(BOLIMLAR) as Bolim[]).find((b) => b === s.bolim) ?? 'yangi'
  const yol = bolim === 'yangi' ? '/crm/lidlar' : `/crm/lidlar?bolim=${bolim}`
  const bugun = bugunToshkent()

  const supabase = await createClient()
  const [{ data }, { data: guruhlar }, { data: sonlar }] = await Promise.all([
    supabase
      .from('leads')
      .select(
        'id, ism, telefon, holat, izoh, student_id, group_id, sinov_sana, created_at, subjects(nom), groups(nom)',
      )
      .eq('manba', 'sayt')
      .in('holat', BOLIMLAR[bolim].holatlar)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('groups').select('id, nom').eq('holat', 'faol').order('nom'),
    supabase.from('leads').select('holat').eq('manba', 'sayt'),
  ])

  const royxat = (data ?? []) as unknown as Lid[]
  const gList = guruhlar ?? []
  const soni = (b: Bolim) =>
    ((sonlar ?? []) as { holat: LeadStatus }[]).filter((x) => BOLIMLAR[b].holatlar.includes(x.holat)).length

  return (
    <div className="flex flex-col gap-4 px-5 py-5 lg:px-7">
      <Sarlavha nom="Lidlar" izoh="saytdagi ariza formasidan kelganlar" />
      <Xabar ok={s.ok} xato={s.xato} />

      <div className="flex flex-wrap gap-2">
        {(Object.keys(BOLIMLAR) as Bolim[]).map((b) => (
          <Link
            key={b}
            href={b === 'yangi' ? '/crm/lidlar' : `/crm/lidlar?bolim=${b}`}
            className={`flex min-h-11 items-center gap-2 rounded-[9px] border px-4 text-[13px] transition ${
              bolim === b ? 'border-brand bg-brand-soft text-ink' : 'border-line text-ink-3 hover:text-ink'
            }`}
          >
            {BOLIMLAR[b].nom}
            <span className="tnum font-[family-name:var(--font-mono)] text-[11px] text-ink-3">{soni(b)}</span>
          </Link>
        ))}
      </div>

      <Card className="flex flex-col">
        <CardHeader title={BOLIMLAR[bolim].nom} meta={`${royxat.length} ta`} />
        {royxat.length === 0 ? (
          <div className="px-5 pb-5">
            <Empty>Bu bo‘limda hech kim yo‘q.</Empty>
          </div>
        ) : (
          <ul>
            {royxat.map((l) => (
              <li key={l.id} className="flex flex-col gap-2.5 border-t border-line-soft px-5 py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[13.5px] font-semibold">{l.ism}</span>
                    <span className="text-[12px] text-ink-3">
                      {sana(l.created_at)}
                      {l.subjects?.nom ? ` · ${l.subjects.nom}` : ''}
                      {l.groups?.nom ? ` · ${l.groups.nom}` : ''}
                    </span>
                    {l.izoh && <span className="text-[12px] text-ink-3">{l.izoh}</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    {l.student_id && (
                      <Link href={`/crm/oquvchilar/${l.student_id}`} className="text-[12.5px] text-accent hover:text-brand">
                        {l.student_id} →
                      </Link>
                    )}
                    <a
                      href={`tel:${l.telefon}`}
                      title={telefon(l.telefon)}
                      aria-label={`${l.ism}ga qo‘ng‘iroq`}
                      className="flex size-11 items-center justify-center rounded-[9px] border border-line text-ink-3 hover:text-ink"
                    >
                      <IconPhone size={16} />
                    </a>
                  </span>
                </div>

                {!l.student_id && (
                  <AmalGuruhi>
                  <div className="flex flex-wrap items-center gap-2">
                    {l.group_id ? (
                      <details>
                        <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-[9px] border border-ok bg-ok-soft px-4 text-[13px] font-semibold text-ok">
                          Doimiy qilish
                        </summary>
                        <form action={probniyDoimiy} className="mt-2 flex flex-wrap items-end gap-2">
                          <input type="hidden" name="id" value={l.id} />
                          <input type="hidden" name="qaytish" value={yol} />
                          <Maydon nom="Boshlagan sana">
                            <input type="date" name="boshlandi" defaultValue={bugun} className={kirishKlass} />
                          </Maydon>
                          <Yuborish tur="ok" kutish="…">O‘quvchi qilish</Yuborish>
                        </form>
                      </details>
                    ) : null}

                    <details>
                      <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-[9px] border border-line px-4 text-[13px] text-ink-3 hover:text-ink">
                        {l.group_id ? 'Guruhni o‘zgartirish' : 'Sinov darsiga yozish'}
                      </summary>
                      <form action={probniyGuruh} className="mt-2 flex flex-wrap items-end gap-2">
                        <input type="hidden" name="id" value={l.id} />
                        <input type="hidden" name="qaytish" value={yol} />
                        <Maydon nom="Guruh">
                          <Select name="group_id" defaultValue={l.group_id ?? ''}>
                            <option value="">—</option>
                            {gList.map((g) => (
                              <option key={g.id} value={g.id}>{g.nom}</option>
                            ))}
                          </Select>
                        </Maydon>
                        <Maydon nom="Sinov kuni">
                          <input type="date" name="sinov_sana" defaultValue={l.sinov_sana ?? bugun} className={kirishKlass} />
                        </Maydon>
                        <Yuborish tur="ikkilamchi" kutish="…">Saqlash</Yuborish>
                      </form>
                    </details>

                    {(['kelmadi', 'rad', 'yangi'] as const)
                      .filter((h) => !BOLIMLAR[bolim].holatlar.includes(h))
                      .map((h) => (
                        <form key={h} action={probniyHolat}>
                          <input type="hidden" name="id" value={l.id} />
                          <input type="hidden" name="holat" value={h} />
                          <input type="hidden" name="qaytish" value={yol} />
                          <Yuborish tur={h === 'yangi' ? 'ikkilamchi' : 'xavfli'} kutish="…">
                            {h === 'kelmadi' ? 'Kelmadi' : h === 'rad' ? 'Rad etdi' : 'Qaytadan kutish'}
                          </Yuborish>
                        </form>
                      ))}
                  </div>
                  </AmalGuruhi>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
