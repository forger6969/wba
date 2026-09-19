'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { talabRol } from '@/lib/auth'
import { xabarliYol, xatoMatni } from '@/lib/kiritish'
import { elonYubor, html, toplamlab } from '@/lib/telegram'
import { elonFormadan, shaxsiyMatn, SARLAVHA } from '@/lib/elon'

const YOL = '/crm/xabarlar'

/**
 * E'lonni bot orqali yuborish.
 *
 * Hammasi admin nomidan, RLS bilan (service_role kerak emas): e'lon va
 * yetkazish qatorlari elonlar_admin_write / elon_yetkazish_admin_write
 * siyosatlari bilan yoziladi, oluvchilar elon_oluvchilar() dan keladi.
 * Telegram'ga faqat server murojaat qiladi (token brauzerga chiqmaydi).
 *
 * Markaz hajmida (bir necha yuz chat) yuborish shu so'rov ichida
 * tugaydi: 25 tadan parallel, sekundiga ~25 xabar (page.tsx: maxDuration).
 */
export async function elonYuborish(fd: FormData) {
  await talabRol('admin', 'direktor')

  const e = elonFormadan(fd)
  if (!e.matn) redirect(xabarliYol(YOL, { xato: 'Xabar matni bo‘sh.' }))
  if (!e.kimga.length) redirect(xabarliYol(YOL, { xato: 'Kimga yuborilishini tanlang.' }))

  const supabase = await createClient()

  const { data: elon, error: xatoElon } = await supabase
    .from('elonlar')
    .insert({ turi: e.turi, matn: e.matn, kimga: e.kimga, filtr: e.filtr })
    .select('id')
    .single()
  if (xatoElon || !elon) redirect(xabarliYol(YOL, { xato: xatoMatni(xatoElon) }))

  const { data: auditoriya, error: xatoAud } = await supabase.rpc('elon_oluvchilar', { p_kimga: e.kimga, p_filtr: e.filtr })
  if (xatoAud) redirect(xabarliYol(YOL, { xato: xatoMatni(xatoAud) }))

  // Bir chatga bitta o'quvchi haqida bir marta (ota-ona ikki farzand — ikki xabar)
  const oluvchilar = new Map<string, NonNullable<typeof auditoriya>[number]>()
  for (const a of auditoriya ?? []) {
    if (a.chat_id) oluvchilar.set(`${a.chat_id}|${a.student_id ?? ''}`, a)
  }

  if (!oluvchilar.size) {
    await supabase.from('elonlar').update({ yuborildi_at: new Date().toISOString() }).eq('id', elon.id)
    redirect(xabarliYol(YOL, { xato: 'Tanlanganlardan hech kim botga ulanmagan — xabar yuborilmadi.' }))
  }

  const { data: qatorlar, error: xatoQator } = await supabase
    .from('elon_yetkazish')
    .insert([...oluvchilar.values()].map((a) => ({ elon_id: elon.id, chat_id: a.chat_id!, kim: a.kim, student_id: a.student_id })))
    .select('id, chat_id, student_id')
  if (xatoQator || !qatorlar) redirect(xabarliYol(YOL, { xato: xatoMatni(xatoQator) }))

  const natija = await toplamlab(qatorlar, async (q) => {
    const a = oluvchilar.get(`${q.chat_id}|${q.student_id ?? ''}`)!
    const n = await elonYubor(q.chat_id, `<b>${SARLAVHA[e.turi]}</b>\n\n${html(shaxsiyMatn(e.matn, a))}`)
    return { ...n, id: q.id, chat: q.chat_id }
  })

  const vaqt = new Date().toISOString()
  const yetdi = natija.filter((n) => n.holat === 'yetkazildi')
  if (yetdi.length) {
    await supabase.from('elon_yetkazish').update({ holat: 'yetkazildi', yuborildi_at: vaqt }).in('id', yetdi.map((n) => n.id))
  }
  for (const n of natija.filter((x) => x.holat !== 'yetkazildi')) {
    await supabase.from('elon_yetkazish').update({ holat: n.holat, xato_matn: n.xato ?? null, yuborildi_at: vaqt }).eq('id', n.id)
    if (n.holat === 'bloklagan') await supabase.rpc('telegram_bloklagan', { p_chat: n.chat })
  }

  const xato = natija.length - yetdi.length
  await supabase
    .from('elonlar')
    .update({ yuborildi_at: vaqt, jami: natija.length, yetkazildi: yetdi.length, xato })
    .eq('id', elon.id)

  revalidatePath(YOL)
  redirect(
    xabarliYol(YOL, {
      ok: `${yetdi.length} ta chatga yetkazildi${xato ? ` · ${xato} tasiga yetmadi (botni bloklagan yoki xato)` : ''}.`,
    }),
  )
}
