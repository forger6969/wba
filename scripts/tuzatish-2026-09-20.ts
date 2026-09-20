/**
 * BIR MARTALIK TUZATISH — 2026-09-20, Jamshid tasdig'i bilan.
 *
 * Sheets (Students_wba) va bulutdagi baza solishtirilganda topilgan
 * farqlar. Har biri Jamshid bilan alohida kelishilgan:
 *
 *   1. G15  — vaqt bazada teskari (17:00–16:30) → 15:30–17:00 (Sheets)
 *   2. G12  — nom "English" → "Elementary" (Sheets)
 *   3. S076 — Oybek aslida 11-sentabrdan kelgan (Sheets'da ikki qator:
 *             Q083 01.09, Q086 16.09) → boshlandi = 2026-09-11,
 *             hisob-fakturalar qayta hisoblanadi
 *   4. S080 — saytda sinov uchun qo'shilgan "Muhammad" (to'lovi ham,
 *             davomati ham yo'q) → o'chiriladi
 *   5. S064, S066, S068 — Sheets'da "Ota telefoni" katagida IKKITA raqam
 *             ("… / …"), shuning uchun ko'chirishda telefon umuman
 *             yozilmagan → birinchisi ota, ikkinchisi ona telefoni
 *
 * Standart holatda hech narsa yozmaydi (quruq yurish):
 *   npx tsx scripts/tuzatish-2026-09-20.ts
 *   npx tsx scripts/tuzatish-2026-09-20.ts --tasdiq     (yozadi)
 *
 * Bulut kalitlari `.secrets/bulut.env` dan (git'ga tushmaydi).
 */
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/lib/types'

config({ path: '.secrets/bulut.env' })
config({ path: '.env.local' })

const YOZ = process.argv.includes('--tasdiq')
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) throw new Error('Supabase kalitlari topilmadi (.secrets/bulut.env)')

const db = createClient<Database>(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const log = (ok: boolean, m: string) => console.log(`${ok ? '  ✓' : '  ·'} ${m}`)
const xato = (e: { message: string } | null, joy: string) => {
  if (e) throw new Error(`${joy}: ${e.message}`)
}

async function main() {
  console.log(YOZ ? '— YOZISH rejimi —\n' : '— QURUQ YURISH (yozilmaydi). Yozish uchun: --tasdiq —\n')

  /* 1 — G15 vaqti */
  const { data: g15 } = await db.from('groups').select('id, nom, boshlanish, tugash').eq('id', 'G15').single()
  console.log(`G15: ${g15?.nom} (${g15?.boshlanish}–${g15?.tugash})`)
  const g15Nom = 'Matematika · Shohjahon Shuhratov · 15:30-17:00, Toq kun'
  if (YOZ) {
    xato((await db.from('groups').update({ boshlanish: '15:30', tugash: '17:00', nom: g15Nom }).eq('id', 'G15')).error, 'G15')
  }
  log(YOZ, `G15 → 15:30–17:00, nom "${g15Nom}"`)

  /* 2 — G12 nomi */
  const { data: g12 } = await db.from('groups').select('nom').eq('id', 'G12').single()
  const g12Nom = (g12?.nom ?? '').replace(/^English\b/, 'Elementary')
  if (YOZ) xato((await db.from('groups').update({ nom: g12Nom }).eq('id', 'G12')).error, 'G12')
  log(YOZ, `G12 → "${g12Nom}"`)

  /* 3 — S076 (Oybek) 11-sentabrdan */
  const { data: q083 } = await db.from('enrollments').select('id, boshlandi').eq('sheets_id', 'Q083').single()
  if (q083) {
    if (YOZ) {
      xato((await db.from('enrollments').update({ boshlandi: '2026-09-11' }).eq('id', q083.id)).error, 'Q083')
      const { data: soni, error } = await db.rpc('yozilish_hisoblari', { p_enrollment: q083.id })
      xato(error, 'yozilish_hisoblari')
      log(true, `S076 boshlandi ${q083.boshlandi} → 2026-09-11, hisob-faktura qayta hisoblandi (${soni})`)
    } else {
      log(false, `S076 boshlandi ${q083.boshlandi} → 2026-09-11 (+ hisob-faktura qayta hisoblanadi)`)
    }
  }

  /* 4 — S080 sinov yozuvi */
  const [{ count: tolov }, { count: davomat }] = await Promise.all([
    db.from('payments').select('id', { count: 'exact', head: true }).eq('student_id', 'S080'),
    db.from('attendance').select('id', { count: 'exact', head: true }).eq('student_id', 'S080'),
  ])
  if ((tolov ?? 0) > 0 || (davomat ?? 0) > 0) {
    log(false, `S080 O'CHIRILMADI — to'lov ${tolov}, davomat ${davomat} (kutilgani 0/0)`)
  } else {
    if (YOZ) xato((await db.from('students').delete().eq('id', 'S080')).error, 'S080')
    log(YOZ, 'S080 "Muhammad" (sinov) o‘chirildi — yozilishi bilan birga')
  }

  /* 5 — ikki raqamli telefonlar */
  const telefonlar: Record<string, [string, string]> = {
    S064: ['+998949779667', '+998903208683'],
    S066: ['+998901236013', '+998998042403'],
    S068: ['+998701228520', '+998998011914'],
  }
  for (const [id, [ota, ona]] of Object.entries(telefonlar)) {
    const { data: o } = await db.from('students').select('fish, ota_tel, ona_tel').eq('id', id).single()
    if (o?.ota_tel || o?.ona_tel) {
      log(false, `${id} ${o?.fish} — telefoni allaqachon bor (${o?.ota_tel ?? ''} ${o?.ona_tel ?? ''}), tegilmadi`)
      continue
    }
    if (YOZ) xato((await db.from('students').update({ ota_tel: ota, ona_tel: ona }).eq('id', id)).error, id)
    log(YOZ, `${id} ${o?.fish} → ota ${ota}, ona ${ona}`)
  }

  console.log(YOZ ? '\nTayyor.' : '\nHech narsa yozilmadi.')
}

main().catch((e) => {
  console.error('\nXATO:', e instanceof Error ? e.message : e)
  process.exit(1)
})
