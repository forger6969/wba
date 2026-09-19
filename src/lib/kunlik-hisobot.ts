import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { html } from '@/lib/telegram'
import { pul, sana, vaqt, bugunToshkent } from '@/lib/format'
import type { Hisobot } from '@/lib/types'

/**
 * KUNLIK HISOBOT — bugun uchun, bazadan.
 *
 * Eski botdagi hisobotMatn (BOT_Hisobot.js, bir kunlik) bilan bir xil
 * bo'limlar: davomat, belgilanmagan darslar (ustoz kesimida), probniylar,
 * to'lov, qarz. Faqat endi Sheets emas — baza, ya'ni saytda qo'yilgan
 * davomat va kiritilgan to'lov darhol ko'rinadi.
 *
 * Guruhga 19:40 da (/api/cron/kunlik) va xodimga botdagi "Bugungi
 * hisobot" tugmasida yuboriladi. service_role — sessiyasiz ishlaydi,
 * faqat umumiy raqamlar chiqadi (telefon, ism-sharif yo'q).
 */
export async function kunlikHisobotMatn(): Promise<string> {
  const db = createAdminClient()
  const kun = bugunToshkent()

  const [{ data: bugungi }, { data: belgilar }, { data: probniy }, { data: tushum }, { data: qarzlar }, { data: ustozlar }] =
    await Promise.all([
      db.from('v_bugungi_darslar').select('nom, boshlanish, belgilangan, teacher_id, oquvchilar'),
      db.from('attendance').select('holat, lessons!inner(sana)').eq('lessons.sana', kun),
      db.from('leads').select('holat').eq('sinov_sana', kun),
      db.rpc('tushum_hisobot', { p_dan: kun, p_gacha: kun }),
      db.from('v_qarzdorlar').select('qarz'),
      db.from('teachers').select('id, ism'),
    ])

  const darslar = (bugungi ?? []).filter((d) => Number(d.oquvchilar) > 0)
  const b = (belgilar ?? []) as { holat: string }[]
  const keldi = b.filter((x) => x.holat === 'keldi' || x.holat === 'kechikdi').length
  const kelmadi = b.filter((x) => x.holat === 'kelmadi').length
  const sababli = b.filter((x) => x.holat === 'sababli').length
  const foiz = keldi + kelmadi + sababli ? Math.round((keldi * 100) / (keldi + kelmadi + sababli)) : null

  /* Belgilanmagan darslar — ustoz kesimida, "Beginner 08:30" ko'rinishida */
  const ustozIsmi = new Map((ustozlar ?? []).map((u) => [u.id, u.ism]))
  const qilinmagan = new Map<string, string[]>()
  for (const d of darslar.filter((x) => !x.belgilangan)) {
    const u = ustozIsmi.get(d.teacher_id ?? '') ?? '—'
    qilinmagan.set(u, [...(qilinmagan.get(u) ?? []), `${d.nom.split(' · ')[0]} ${vaqt(d.boshlanish)}`])
  }
  const jamiQ = [...qilinmagan.values()].reduce((a, x) => a + x.length, 0)

  const p = (probniy ?? []) as { holat: string }[]
  const ps = (h: string[]) => p.filter((x) => h.includes(x.holat)).length

  const h = tushum as Hisobot | null
  const q = (qarzlar ?? []).map((x) => Number(x.qarz)).filter((x) => x > 0)

  const t: string[] = []
  t.push(`<b>KUNLIK HISOBOT</b>\n${sana(kun)}\n`)

  t.push('<b>DAVOMAT</b>')
  t.push(`Darslar: <b>${darslar.length}</b> ta`)
  t.push(`Keldi: <b>${keldi}</b> · kelmadi: <b>${kelmadi}</b>${sababli ? ` · sababli: <b>${sababli}</b>` : ''}${foiz === null ? '' : `  (${foiz}%)`}\n`)

  t.push('<b>DAVOMAT QO‘YILMAGAN DARSLAR</b>')
  if (!jamiQ) {
    t.push('Yo‘q — hamma dars belgilangan\n')
  } else {
    t.push(`Jami: <b>${jamiQ}</b> ta dars`)
    for (const [u, royxat] of qilinmagan) {
      t.push(`  · ${html(u)} — ${royxat.length} ta: ${html(royxat.slice(0, 6).join(', '))}${royxat.length > 6 ? ' …' : ''}`)
    }
    t.push('')
  }

  t.push('<b>PROBNIYLAR</b> (bugungi sinov darsi)')
  t.push(`Jami: <b>${p.length}</b> · keldi: <b>${ps(['keldi', 'yozildi'])}</b> · kelmadi: <b>${ps(['kelmadi'])}</b>`)
  t.push(`Doimiyga o‘tdi: <b>${ps(['yozildi'])}</b> · rad: <b>${ps(['rad'])}</b>${ps(['yangi', 'qongiroq']) ? ` · kutilmoqda: ${ps(['yangi', 'qongiroq'])}` : ''}\n`)

  t.push('<b>TO‘LOV</b>')
  t.push(`To‘lov: <b>${h?.soni ?? 0}</b> ta · <b>${pul(h?.tushum ?? 0)} so‘m</b>`)
  t.push(`To‘lagan o‘quvchi: <b>${h?.odam ?? 0}</b>\n`)

  t.push('<b>QARZ</b> (bugungi holat)')
  t.push(`Qarzdor: <b>${q.length}</b> ta · <b>${pul(q.reduce((a, x) => a + x, 0))} so‘m</b>`)

  return t.join('\n')
}
