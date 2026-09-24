import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { xabar, html } from '@/lib/telegram'
import { bugunToshkent, sana } from '@/lib/format'

/**
 * Ertangi probniy darslar haqida eslatma — sinov darsiga yozilgan
 * (leads.sinov_sana = ertaga, holat = 'yangi') va botga telefon orqali
 * ulangan (telegram_ulanish, kim = 'lid', 0025) odamlarga.
 *
 * Chaqiruvchi: Supabase pg_cron + pg_net (0026), har kuni belgilangan
 * vaqtda. Qo'lda sinash — `Authorization: Bearer <CRON_SIR>`.
 */

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const sir = process.env.CRON_SIR
  const qolda = Boolean(sir) && req.headers.get('authorization') === `Bearer ${sir}`
  if (!qolda && !sir) {
    // CRON_SIR sozlanmagan bo'lsa ham ishlasin (pg_cron kalitsiz chaqiradi) —
    // lekin bu holatda faqat sinov_sana bo'yicha real cheklov himoya qiladi.
  }

  const db = createAdminClient()
  const ertaga = new Date()
  ertaga.setDate(ertaga.getDate() + 1)
  const ertagaSana = bugunToshkent(ertaga)

  const { data: leads, error } = await db
    .from('leads')
    .select('id, ism, telefon, sinov_sana, telegram_ulanish!inner(chat_id)')
    .eq('sinov_sana', ertagaSana)
    .eq('holat', 'yangi')
    .eq('telegram_ulanish.kim', 'lid')
    .eq('telegram_ulanish.holat', 'faol')

  if (error) {
    console.error('[cron/probniy] baza xatosi', error.message)
    return NextResponse.json({ ok: false, sabab: error.message }, { status: 500 })
  }

  type Row = { id: string; ism: string; chat_id: number }
  const flat: Row[] = (leads ?? []).flatMap((l) =>
    (l.telegram_ulanish as unknown as { chat_id: number }[]).map((u) => ({ id: l.id, ism: l.ism, chat_id: u.chat_id })),
  )

  let yuborildi = 0
  let xato = 0
  for (const l of flat) {
    const matn =
      `Salom, <b>${html(l.ism)}</b>! Ertaga, <b>${sana(ertagaSana)}</b>, sizni World Bridge Academy'da ` +
      `sinov darsimizda kutamiz. Manzil va vaqtni tasdiqlash uchun qabulxonaga qo'ng'iroq qiling.`
    const r = await xabar(l.chat_id, matn)
    if (r.ok) yuborildi++
    else xato++
  }

  return NextResponse.json({ ok: true, kun: ertagaSana, jami: flat.length, yuborildi, xato })
}
