import Link from 'next/link'
import { notFound } from 'next/navigation'
import { talabRol } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { supabaseSozlanganmi } from '@/lib/supabase/env'
import { Card, Empty } from '@/components/ui'
import { Sarlavha, Ulanmagan } from '@/components/crm'
import { IconArrowLeft } from '@/components/icons'
import { sana, vaqt, bugunToshkent } from '@/lib/format'
import { DavomatForma, type Qatnashuvchi } from './forma'
import type { AttendanceStatus, DayType } from '@/lib/types'

export const metadata = { title: 'Dars davomati' }
export const dynamic = 'force-dynamic'

export default async function DarsDavomati({ params }: { params: Promise<{ guruh: string }> }) {
  const { guruh } = await params
  await talabRol('admin', 'direktor', 'qabulxona', 'ustoz')
  if (!supabaseSozlanganmi()) return <Ulanmagan nom="Davomat" />

  const supabase = await createClient()
  const bugun = bugunToshkent()

  const { data: g } = await supabase
    .from('groups')
    .select('id, nom, boshlanish, tugash, kun_turi, teachers(ism)')
    .eq('id', guruh)
    .maybeSingle()

  if (!g) notFound()

  const guruhi = g as unknown as {
    id: string
    nom: string
    boshlanish: string
    tugash: string
    kun_turi: DayType
    teachers: { ism: string } | null
  }

  /* Guruh o'quvchilari + bugungi dars (bo'lsa) bir vaqtda olinadi. */
  const [{ data: yozilishlar }, { data: dars }] = await Promise.all([
    supabase
      .from('enrollments')
      .select('student_id, students(fish)')
      .eq('group_id', guruh)
      .neq('holat', 'tugagan'),
    supabase
      .from('lessons')
      .select('id, otkazildi')
      .eq('group_id', guruh)
      .eq('sana', bugun)
      .maybeSingle(),
  ])

  type Yozilish = { student_id: string; students: { fish: string } | null }
  const yList = (yozilishlar ?? []) as unknown as Yozilish[]

  /* Avval belgilangan bo'lsa — o'sha holat ochiladi, aks holda
     hamma KELDI bo'lib turadi va ustoz faqat kelmaganini bosadi
     (botdagi bilan bir xil: BOT_Davomat.js). */
  let belgilar = new Map<string, AttendanceStatus>()
  let ballar = new Map<string, number>()

  if (dars?.id) {
    const [{ data: a }, { data: w }] = await Promise.all([
      supabase.from('attendance').select('student_id, holat').eq('lesson_id', dars.id),
      supabase.from('woblr').select('student_id, ball').eq('lesson_id', dars.id),
    ])
    belgilar = new Map(
      ((a ?? []) as { student_id: string; holat: AttendanceStatus }[]).map((x) => [x.student_id, x.holat]),
    )
    ballar = new Map(
      ((w ?? []) as { student_id: string; ball: number }[]).map((x) => [x.student_id, Number(x.ball) || 0]),
    )
  }

  const qatnashuvchilar: Qatnashuvchi[] = yList
    .map((y) => ({
      student_id: y.student_id,
      fish: y.students?.fish ?? y.student_id,
      holat: belgilar.get(y.student_id) ?? ('keldi' as AttendanceStatus),
      ball: ballar.get(y.student_id) ?? 0,
    }))
    .sort((a, b) => a.fish.localeCompare(b.fish, 'uz'))

  return (
    <div className="flex flex-col gap-4 px-5 py-5 lg:px-7">
      <Link
        href="/crm/davomat"
        className="flex items-center gap-2 text-[13px] text-ink-3 transition hover:text-ink"
      >
        <IconArrowLeft size={15} />
        Bugungi darslar
      </Link>

      <Sarlavha
        nom={guruhi.nom}
        izoh={
          <>
            {sana(bugun)} · {vaqt(guruhi.boshlanish)}–{vaqt(guruhi.tugash)} ·{' '}
            {guruhi.teachers?.ism ?? '[ANIQLANMAGAN]'}
          </>
        }
      />

      {qatnashuvchilar.length === 0 ? (
        <Card className="p-5">
          <Empty>Bu guruhga o‘quvchi biriktirilmagan — davomat qo‘yishga hech kim yo‘q.</Empty>
        </Card>
      ) : (
        <DavomatForma
          guruhId={guruh}
          sana={bugun}
          boshlangich={qatnashuvchilar}
          belgilanganmi={Boolean(dars?.otkazildi)}
        />
      )}

      <p className="lbl leading-relaxed">
        Davomat majburiy, woblar ixtiyoriy. Qayta saqlasangiz woblar ikkilanmaydi —
        o‘sha darsning woblari qaytadan yoziladi. Keyinroq berish uchun:{' '}
        <Link href={`/crm/woblr?guruh=${guruh}`} className="text-accent hover:text-brand">Woblar bo‘limi</Link>.
      </p>
    </div>
  )
}
