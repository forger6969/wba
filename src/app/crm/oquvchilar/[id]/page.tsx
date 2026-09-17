import Link from 'next/link'
import { notFound } from 'next/navigation'
import { talabProfil, staffmi } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { supabaseSozlanganmi } from '@/lib/supabase/env'
import { Card, CardHeader, Stat, Badge, Empty } from '@/components/ui'
import { Sarlavha, Ulanmagan } from '@/components/crm'
import { IconArrowLeft, IconPhone } from '@/components/icons'
import { pul, sana, telefon, jadval, davrNomi, joriyDavr } from '@/lib/format'
import type { StudentStatus, DayType, PaymentMethod, AttendanceStatus } from '@/lib/types'

export const metadata = { title: 'O‘quvchi profili' }
export const dynamic = 'force-dynamic'

const HOLAT_NOMI: Record<StudentStatus, string> = {
  faol: 'Faol',
  tanaffus: 'Tanaffus',
  ketgan: 'Ketgan',
}

const USUL_NOMI: Record<PaymentMethod, string> = {
  naqd: 'Naqd',
  karta: 'Karta',
  click: 'Click',
  payme: 'Payme',
}

const DAVOMAT_NOMI: Record<AttendanceStatus, string> = {
  keldi: 'Keldi',
  kechikdi: 'Kechikdi',
  sababli: 'Sababli',
  kelmadi: 'Kelmadi',
}

export default async function OquvchiProfil({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profil = await talabProfil()
  if (!supabaseSozlanganmi()) return <Ulanmagan nom="O‘quvchi profili" />

  const supabase = await createClient()
  const pulKoradi = staffmi(profil.rol)

  const { data: oquvchi } = await supabase
    .from('students')
    .select('id, fish, tugilgan_sana, ota_tel, ona_tel, shaxsiy_tel, qoshilgan_sana, holat, izoh')
    .eq('id', id)
    .maybeSingle()

  if (!oquvchi) notFound()

  const davr = joriyDavr()

  const [
    { data: yozilishlar },
    { data: balans },
    { data: tolovlar },
    { data: davomat },
    { data: woblr },
  ] = await Promise.all([
    supabase
      .from('enrollments')
      .select(
        'id, group_id, boshlandi, tugadi, holat, chegirma_summa, chegirma_oy, chegirma2_summa, chegirma2_oy, chegirma_sabab, groups(nom, boshlanish, tugash, kun_turi, oylik_narx, teachers(ism))',
      )
      .eq('student_id', id)
      .order('boshlandi', { ascending: false }),
    supabase.from('v_enrollment_balance').select('enrollment_id, hisoblangan, tolangan, qarz').eq('student_id', id),
    pulKoradi
      ? supabase
          .from('payments')
          .select('id, sana, davr, summa, usul, tasdiqlangan, bekor, izoh, manba')
          .eq('student_id', id)
          .order('sana', { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [] }),
    supabase.from('v_attendance_monthly').select('davr, group_id, darslar, kelgan, foiz').eq('student_id', id).order('davr', { ascending: false }).limit(6),
    supabase.from('v_woblr_balance').select('jami_ball, sarflangan, balans').eq('student_id', id).maybeSingle(),
  ])

  type Yozilish = {
    id: string
    group_id: string
    boshlandi: string
    tugadi: string | null
    holat: string
    chegirma_summa: number
    chegirma_oy: number | null
    chegirma2_summa: number
    chegirma2_oy: number | null
    chegirma_sabab: string | null
    groups: {
      nom: string
      boshlanish: string
      tugash: string
      kun_turi: DayType
      oylik_narx: number
      teachers: { ism: string } | null
    } | null
  }

  const yList = (yozilishlar ?? []) as unknown as Yozilish[]
  const bMap = new Map(
    ((balans ?? []) as { enrollment_id: string; hisoblangan: number; tolangan: number; qarz: number }[]).map(
      (b) => [b.enrollment_id, b],
    ),
  )

  const jamiQarz = [...bMap.values()].reduce((a, b) => a + (Number(b.qarz) || 0), 0)
  const jamiTolangan = [...bMap.values()].reduce((a, b) => a + (Number(b.tolangan) || 0), 0)

  type Tolov = {
    id: number
    sana: string
    davr: string
    summa: number
    usul: PaymentMethod | null
    tasdiqlangan: boolean
    bekor: boolean
    izoh: string | null
    manba: string
  }
  const tList = (tolovlar ?? []) as unknown as Tolov[]

  type Davomat = { davr: string; group_id: string; darslar: number; kelgan: number; foiz: number }
  const dList = (davomat ?? []) as unknown as Davomat[]

  const w = (woblr ?? null) as { jami_ball: number; sarflangan: number; balans: number } | null

  const telefonlar = [
    oquvchi.shaxsiy_tel ? { nom: 'Shaxsiy', raqam: oquvchi.shaxsiy_tel } : null,
    oquvchi.ota_tel ? { nom: 'Ota', raqam: oquvchi.ota_tel } : null,
    oquvchi.ona_tel ? { nom: 'Ona', raqam: oquvchi.ona_tel } : null,
  ].filter((x): x is { nom: string; raqam: string } => Boolean(x))

  return (
    <div className="flex flex-col gap-4 px-5 py-5 lg:px-7">
      <Link
        href="/crm/oquvchilar"
        className="flex items-center gap-2 text-[13px] text-ink-3 transition hover:text-ink"
      >
        <IconArrowLeft size={15} />
        O‘quvchilar
      </Link>

      <Sarlavha
        nom={oquvchi.fish}
        izoh={
          <>
            {oquvchi.id} · qo‘shilgan {sana(oquvchi.qoshilgan_sana)}
            {oquvchi.tugilgan_sana ? ` · tug‘ilgan ${sana(oquvchi.tugilgan_sana)}` : ''}
          </>
        }
        amal={
          <Badge ton={oquvchi.holat === 'faol' ? 'ok' : oquvchi.holat === 'tanaffus' ? 'accent' : 'jim'}>
            {HOLAT_NOMI[oquvchi.holat as StudentStatus]}
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        {pulKoradi && (
          <>
            <Stat label="Qarz" value={jamiQarz} sub="so‘m" ton={jamiQarz > 0 ? 'brand' : 'ok'} border={jamiQarz > 0 ? 'brand' : undefined} />
            <Stat label="Jami to‘langan" value={jamiTolangan} sub="so‘m" />
          </>
        )}
        <Stat
          label="Guruhlari"
          value={yList.filter((y) => y.holat !== 'tugagan').length}
          sub={`jami ${yList.length} ta yozilish`}
        />
        <Stat
          label="WOBLR balansi"
          value={w ? Number(w.balans) : 0}
          sub={w ? `${Number(w.jami_ball)} ball berilgan` : 'hali ball berilmagan'}
          ton="accent"
        />
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* ── Guruhlari ── */}
        <Card className="flex flex-col">
          <CardHeader title="Guruhlari" meta={`${yList.length} ta`} />
          <div className="flex flex-col gap-2.5 px-5 pb-4">
            {yList.length === 0 ? (
              <Empty>Hech qaysi guruhga yozilmagan.</Empty>
            ) : (
              yList.map((y) => {
                const b = bMap.get(y.id)
                const qarz = Number(b?.qarz ?? 0)
                return (
                  <div
                    key={y.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-[10px] border border-line px-4 py-3"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-[13.5px] font-semibold">{y.groups?.nom ?? '—'}</span>
                      <span className="text-[12px] text-ink-3">
                        {y.groups?.teachers?.ism ?? '[ANIQLANMAGAN]'} ·{' '}
                        {jadval(y.groups?.boshlanish ?? null, y.groups?.tugash ?? null, y.groups?.kun_turi ?? null)}
                      </span>
                      <span className="text-[12px] text-ink-3">
                        {sana(y.boshlandi)} dan {y.tugadi ? `${sana(y.tugadi)} gacha` : 'hozirgacha'}
                        {y.chegirma_summa > 0 && (
                          <>
                            {' · chegirma '}
                            {pul(y.chegirma_summa)}
                            {y.chegirma_oy === null ? ' (doimiy)' : ` (${y.chegirma_oy} oy)`}
                            {y.chegirma2_summa > 0 &&
                              ` → ${pul(y.chegirma2_summa)}${y.chegirma2_oy === null ? ' (doimiy)' : ` (${y.chegirma2_oy} oy)`}`}
                          </>
                        )}
                      </span>
                    </div>

                    {pulKoradi && (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="lbl">oyiga {pul(y.groups?.oylik_narx ?? 0)}</span>
                        <span
                          className={`tnum font-[family-name:var(--font-mono)] text-[13px] ${
                            qarz > 0 ? 'text-brand' : 'text-ok'
                          }`}
                        >
                          {qarz > 0 ? `qarz ${pul(qarz)}` : 'qarzi yo‘q'}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </Card>

        {/* ── Aloqa ── */}
        <Card className="flex flex-col">
          <CardHeader title="Aloqa" />
          <div className="flex flex-col gap-2 px-5 pb-4">
            {telefonlar.length === 0 ? (
              <Empty>Telefon raqami yozilmagan.</Empty>
            ) : (
              telefonlar.map((t) => (
                <a
                  key={t.nom}
                  href={`tel:${t.raqam}`}
                  className="flex min-h-11 items-center gap-3 rounded-[10px] border border-line px-4 transition hover:border-ink-3"
                >
                  <IconPhone size={15} />
                  <span className="flex-1 font-[family-name:var(--font-mono)] text-[13px]">
                    {telefon(t.raqam)}
                  </span>
                  <span className="lbl">{t.nom}</span>
                </a>
              ))
            )}
            {oquvchi.izoh && (
              <p className="rounded-[10px] border border-dashed border-line px-4 py-3 text-[12.5px] leading-relaxed text-ink-2">
                {oquvchi.izoh}
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* ── To'lov tarixi ── */}
        {pulKoradi && (
          <Card className="flex flex-col">
            <CardHeader title="To‘lov tarixi" meta="oxirgi 12 ta" />
            <div className="flex flex-col px-5 pb-4">
              {tList.length === 0 ? (
                <Empty>Hali to‘lov yo‘q.</Empty>
              ) : (
                tList.map((t) => (
                  <div
                    key={t.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-line-soft py-2.5 last:border-0"
                  >
                    <span className="tnum font-[family-name:var(--font-mono)] text-[11.5px] text-ink-3">
                      {sana(t.sana)}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-[12.5px]">
                        {davrNomi(t.davr)} uchun
                        {t.usul ? ` · ${USUL_NOMI[t.usul]}` : ' · usul [ANIQLANMAGAN]'}
                      </span>
                      {(t.bekor || !t.tasdiqlangan) && (
                        <span className="text-[11px] text-ink-3">
                          {t.bekor ? 'bekor qilingan' : 'direktor tasdig‘i kutilmoqda'}
                        </span>
                      )}
                    </span>
                    <span
                      className={`tnum font-[family-name:var(--font-mono)] text-[13px] ${
                        t.bekor ? 'text-ink-4 line-through' : t.tasdiqlangan ? 'text-ok' : 'text-accent'
                      }`}
                    >
                      {pul(t.summa)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

        {/* ── Davomat ── */}
        <Card className="flex flex-col">
          <CardHeader title="Davomat" meta={davrNomi(davr)} />
          <div className="flex flex-col gap-2 px-5 pb-4">
            {dList.length === 0 ? (
              <Empty>Hali davomat belgilanmagan.</Empty>
            ) : (
              dList.map((d) => (
                <div
                  key={`${d.davr}-${d.group_id}`}
                  className="flex items-center justify-between gap-3 border-b border-line-soft py-2 last:border-0"
                >
                  <span className="text-[12.5px]">{davrNomi(d.davr)}</span>
                  <span className="flex items-center gap-2.5">
                    <span className="text-[11.5px] text-ink-3">
                      {d.kelgan} / {d.darslar} dars
                    </span>
                    <Badge ton={d.foiz >= 80 ? 'ok' : d.foiz >= 60 ? 'accent' : 'brand'}>
                      {d.foiz}%
                    </Badge>
                  </span>
                </div>
              ))
            )}
            <p className="lbl pt-1">
              {DAVOMAT_NOMI.keldi} va {DAVOMAT_NOMI.kechikdi} — kelgan deb sanaladi
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
