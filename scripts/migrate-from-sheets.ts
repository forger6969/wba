/**
 * Faza 0 — Google Sheets → Postgres ko'chirish.
 *
 *   npm run migrate -- --dry-run     faqat ko'rsatadi, hech narsa yozmaydi
 *   npm run migrate                  bazaga yozadi
 *
 * Qoidalar:
 *   · Varaqlar NOMI bo'yicha emas, SARLAVHASI bo'yicha topiladi — nomi
 *     o'zgarsa ham ishlayveradi.
 *   · Narx guruhga yoziladi. Odam 550 000 to'lagani — chegirma, boshqa narx emas.
 *   · Axlat qatorlar (namuna, "Dars Soati: 19:30-21:00" kabi) tashlanadi.
 *   · Skript qayta ishga tushirilsa dublikat yaratmaydi (upsert).
 */

import { config } from 'dotenv'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import {
  pulga, telefonga, sanaga, davrga, usulga, bosqichNormal,
  guruhParse, guruhlarniAjrat, ismVaId, axlatmi,
  type GuruhTavsifi,
} from './lib/parse'

config({ path: '.env.local' })

const DRY = process.argv.includes('--dry-run')
const SHEETS_ID = process.env.SHEETS_ID
const STANDART_NARX = 650_000

type Qator = Record<string, unknown>
type Varaq = { nom: string; sarlavha: string[]; qatorlar: Qator[] }

/* ------------------------------------------------------------------ */
/*  1. Sheets'dan o'qish                                               */
/* ------------------------------------------------------------------ */

async function varaqlarniOqi(): Promise<Varaq[]> {
  if (!SHEETS_ID) throw new Error('SHEETS_ID topilmadi (.env.local)')

  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() as never })

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEETS_ID })
  const nomlar = (meta.data.sheets ?? [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => Boolean(t))

  const javob = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: SHEETS_ID,
    ranges: nomlar.map((n) => `'${n}'!A1:AZ2000`),
    valueRenderOption: 'UNFORMATTED_VALUE',
  })

  const natija: Varaq[] = []

  ;(javob.data.valueRanges ?? []).forEach((vr, i) => {
    const qatorlar = (vr.values ?? []) as unknown[][]
    if (qatorlar.length < 2) return

    // Sarlavha — eng ko'p to'ldirilgan katakli dastlabki 15 qatordan biri
    let sIdx = 0
    let eng = 0
    for (let r = 0; r < Math.min(15, qatorlar.length); r++) {
      const soni = qatorlar[r].filter((c) => String(c ?? '').trim()).length
      if (soni > eng) {
        eng = soni
        sIdx = r
      }
    }

    const sarlavha = qatorlar[sIdx].map((c) => String(c ?? '').trim())
    const satrlar: Qator[] = []

    for (let r = sIdx + 1; r < qatorlar.length; r++) {
      const q: Qator = {}
      let bor = false
      sarlavha.forEach((k, c) => {
        if (!k) return
        const v = qatorlar[r][c]
        q[k] = v ?? ''
        if (String(v ?? '').trim()) bor = true
      })
      if (bor) satrlar.push(q)
    }

    natija.push({ nom: nomlar[i], sarlavha, qatorlar: satrlar })
  })

  return natija
}

/** Sarlavhada shu ustunlar borligi bo'yicha varaqni topadi */
function varaqTop(varaqlar: Varaq[], ...kerak: string[]): Varaq | null {
  const past = (s: string) => s.toLowerCase().replace(/[^a-z']/g, '')
  for (const v of varaqlar) {
    const s = v.sarlavha.map(past)
    if (kerak.every((k) => s.some((x) => x.includes(past(k))))) return v
  }
  return null
}

function ol(q: Qator, ...kalitlar: string[]): unknown {
  for (const k of kalitlar) {
    for (const [key, val] of Object.entries(q)) {
      if (key.toLowerCase().includes(k.toLowerCase())) return val
    }
  }
  return ''
}

/* ------------------------------------------------------------------ */
/*  2. Qurish                                                          */
/* ------------------------------------------------------------------ */

type Ustoz = { id: string; ism: string; telegram_id: number | null }
type Guruh = {
  id: string
  nom: string
  subject_id: string | null
  teacher_id: string | null
  boshlanish: string
  tugash: string
  kun_turi: 'toq' | 'juft' | 'har_kuni'
  oylik_narx: number
  xom: string
}
type Oquvchi = {
  id: string
  fish: string
  tugilgan_sana: string | null
  ota_tel: string | null
  ona_tel: string | null
  shaxsiy_tel: string | null
  qoshilgan_sana: string
  holat: 'faol' | 'tanaffus' | 'ketgan'
  izoh: string | null
}
type Yozilish = {
  student_id: string
  guruhXom: string
  boshlandi: string
  chegirma_summa: number
  chegirma_oy: number
  chegirma_sabab: string | null
}
type Tolov = {
  student_id: string
  guruhXom: string | null
  sana: string
  davr: string
  summa: number
  usul: 'naqd' | 'karta' | 'click' | 'payme'
  izoh: string | null
}

const ogohlantirishlar: string[] = []
const ogoh = (m: string) => {
  if (ogohlantirishlar.length < 200) ogohlantirishlar.push(m)
}

function ustozlarniQur(varaqlar: Varaq[]): Ustoz[] {
  const v = varaqTop(varaqlar, "o'qituvchi", 'guruhlari')
  if (!v) {
    ogoh('Ustozlar varag‘i topilmadi — guruhlardagi ismlardan tiklanadi.')
    return []
  }

  const natija: Ustoz[] = []
  for (const q of v.qatorlar) {
    const ism = String(ol(q, "o'qituvchi", 'ism') ?? '').trim()
    if (!ism || axlatmi(ism)) continue
    const id = String(ol(q, 'id') ?? '').trim() || `U${String(natija.length + 1).padStart(2, '0')}`
    const tg = pulga(ol(q, 'telegram'))
    natija.push({ id, ism, telegram_id: tg > 0 ? tg : null })
  }
  return natija
}

function narxlarniOqi(varaqlar: Varaq[]): Map<string, number> {
  const xarita = new Map<string, number>()
  const v = varaqTop(varaqlar, 'guruh', 'narx')
  if (!v) return xarita

  for (const q of v.qatorlar) {
    const guruh = String(ol(q, 'guruh') ?? '').trim()
    const narx = pulga(ol(q, 'narx'))
    if (!guruh || narx <= 0) continue
    if (axlatmi(guruh.split('·')[0] ?? '')) continue
    xarita.set(guruh, narx)
  }
  return xarita
}

function guruhlarniQur(
  xomNomlar: Set<string>,
  ustozlar: Ustoz[],
  narxlar: Map<string, number>,
): Guruh[] {
  const ustozId = new Map(ustozlar.map((u) => [u.ism.toLowerCase(), u.id]))
  const natija: Guruh[] = []
  let n = 0

  for (const xom of [...xomNomlar].sort()) {
    const g: GuruhTavsifi | null = guruhParse(xom)
    if (!g || axlatmi(g.nom)) {
      ogoh(`Guruh tushunarsiz, tashlandi: "${xom}"`)
      continue
    }

    n += 1
    let teacher: string | null = null
    if (g.ustoz) {
      teacher = ustozId.get(g.ustoz.toLowerCase()) ?? null
      if (!teacher) {
        // Qisman moslik: "Jamshid" → "Jamshid Abdialimov"
        const topildi = ustozlar.find(
          (u) =>
            u.ism.toLowerCase().startsWith(g.ustoz!.toLowerCase()) ||
            g.ustoz!.toLowerCase().startsWith(u.ism.toLowerCase().split(' ')[0]),
        )
        teacher = topildi?.id ?? null
        if (!teacher) ogoh(`Ustoz topilmadi: "${g.ustoz}" (guruh: ${g.nom})`)
      }
    }

    natija.push({
      id: `N${String(n).padStart(2, '0')}`,
      nom: g.nom,
      subject_id: g.yonalish,
      teacher_id: teacher,
      boshlanish: g.boshlanish ?? '09:00',
      tugash: g.tugash ?? '10:30',
      kun_turi: g.kunTuri,
      oylik_narx: narxlar.get(xom) ?? (/ielts/i.test(g.nom) ? 800_000 : STANDART_NARX),
      xom,
    })

    if (!g.boshlanish) ogoh(`Dars vaqti yo‘q, 09:00–10:30 qo‘yildi: "${xom}"`)
    if (!narxlar.has(xom)) {
      ogoh(`Narx varaqda yo‘q, standart qo‘yildi (${natija.at(-1)!.oylik_narx}): "${g.nom}"`)
    }
  }

  return natija
}

/* ------------------------------------------------------------------ */
/*  3. Ma'lumotni qurish                                               */
/* ------------------------------------------------------------------ */

function malumotniQur(varaqlar: Varaq[]) {
  /* ---------- ustozlar ---------- */
  const ustozlar = ustozlarniQur(varaqlar)

  /* ---------- o'quvchilar ---------- */
  const oVaraq =
    varaqTop(varaqlar, 'id', 'f.i.sh', 'guruh') ?? varaqTop(varaqlar, 'id', 'ism familya', 'guruh')
  if (!oVaraq) throw new Error('O‘quvchilar varag‘i topilmadi')

  const oquvchilar: Oquvchi[] = []
  const guruhXomlar = new Set<string>()
  const korilgan = new Set<string>()

  for (const q of oVaraq.qatorlar) {
    const fish = String(ol(q, 'f.i.sh', 'ism familya', 'ism') ?? '').trim()
    if (axlatmi(fish)) {
      if (fish) ogoh(`Axlat qator tashlandi: "${fish}"`)
      continue
    }

    let id = String(ol(q, 'id') ?? '').trim().toUpperCase()
    if (!/^S\d+$/.test(id)) id = `S${String(oquvchilar.length + 1).padStart(3, '0')}`
    if (korilgan.has(id)) {
      ogoh(`ID takrorlandi, tashlandi: ${id} — ${fish}`)
      continue
    }
    korilgan.add(id)

    const holatXom = String(ol(q, 'holat') ?? '').toLowerCase()
    const holat = /tanaffus/.test(holatXom) ? 'tanaffus' : /ketgan|chiqqan/.test(holatXom) ? 'ketgan' : 'faol'

    oquvchilar.push({
      id,
      fish,
      tugilgan_sana: sanaga(ol(q, "tug'ilgan")),
      ota_tel: telefonga(ol(q, 'ota')),
      ona_tel: telefonga(ol(q, 'ona')),
      shaxsiy_tel: telefonga(ol(q, 'shaxsiy')),
      qoshilgan_sana: sanaga(ol(q, "qo'shilgan")) ?? '2026-09-01',
      holat,
      izoh: String(ol(q, 'izoh') ?? '').trim() || null,
    })

    guruhlarniAjrat(ol(q, 'guruh')).forEach((g) => guruhXomlar.add(g))
  }

  /* ---------- yozilishlar ---------- */
  const yVaraq = varaqTop(varaqlar, "o'quvchi", 'guruh', 'boshlandi')
  const yozilishlar: Yozilish[] = []

  if (yVaraq) {
    for (const q of yVaraq.qatorlar) {
      const { id, fish } = ismVaId(ol(q, "o'quvchi"))
      if (axlatmi(fish)) continue

      const sid = id ?? oquvchilar.find((o) => o.fish === fish)?.id
      if (!sid) {
        ogoh(`Yozilish: o‘quvchi topilmadi — "${fish}"`)
        continue
      }

      for (const g of guruhlarniAjrat(ol(q, 'guruh'))) {
        guruhXomlar.add(g)
        const chegirma = pulga(ol(q, '1-chegirma', 'chegirma'))
        yozilishlar.push({
          student_id: sid,
          guruhXom: g,
          boshlandi: sanaga(ol(q, 'boshlandi')) ?? '2026-09-01',
          chegirma_summa: chegirma,
          chegirma_oy: chegirma > 0 ? Math.max(1, pulga(ol(q, '1-necha oy', 'necha oy'))) : 0,
          chegirma_sabab: chegirma > 0 ? 'Sheets’dan ko‘chirildi' : null,
        })
      }
    }
  } else {
    ogoh('Yozilishlar varag‘i topilmadi — o‘quvchilar varag‘idagi guruhlardan quriladi.')
    for (const q of oVaraq.qatorlar) {
      const fish = String(ol(q, 'f.i.sh', 'ism familya') ?? '').trim()
      if (axlatmi(fish)) continue
      const o = oquvchilar.find((x) => x.fish === fish)
      if (!o) continue
      for (const g of guruhlarniAjrat(ol(q, 'guruh'))) {
        yozilishlar.push({
          student_id: o.id,
          guruhXom: g,
          boshlandi: o.qoshilgan_sana,
          chegirma_summa: 0,
          chegirma_oy: 0,
          chegirma_sabab: null,
        })
      }
    }
  }

  /* ---------- guruhlar ---------- */
  const guruhlar = guruhlarniQur(guruhXomlar, ustozlar, narxlarniOqi(varaqlar))
  const guruhId = new Map(guruhlar.map((g) => [g.xom, g.id]))

  /* ---------- to'lovlar ---------- */
  const tVaraq = varaqTop(varaqlar, 'sana', 'davr', 'summa', 'usul')
  const tolovlar: Tolov[] = []

  if (tVaraq) {
    for (const q of tVaraq.qatorlar) {
      const summa = pulga(ol(q, 'summa'))
      if (summa <= 0) continue

      const { id, fish } = ismVaId(ol(q, "o'quvchi"))
      const sid =
        (String(ol(q, "o'quvchi id") ?? '').trim().toUpperCase().match(/^S\d+$/)?.[0]) ??
        id ??
        oquvchilar.find((o) => o.fish === fish)?.id

      if (!sid) {
        ogoh(`To‘lov: o‘quvchi topilmadi — "${fish}" (${summa})`)
        continue
      }

      const sana = sanaga(ol(q, 'sana'))
      const davr = davrga(ol(q, 'davr')) ?? (sana ? sana.slice(0, 7) : null)
      if (!sana || !davr) {
        ogoh(`To‘lov: sana yo‘q — ${fish} (${summa}). 01.09.2026 qo‘yildi.`)
      }

      const usul = usulga(ol(q, 'usul'))
      if (!usul) ogoh(`To‘lov: usul yozilmagan — ${fish} (${summa}). "naqd" qo‘yildi.`)

      const guruhlarQ = guruhlarniAjrat(ol(q, 'guruh'))

      tolovlar.push({
        student_id: sid,
        guruhXom: guruhlarQ[0] ?? null,
        sana: sana ?? '2026-09-01',
        davr: davr ?? '2026-09',
        summa,
        usul: usul ?? 'naqd',
        izoh: String(ol(q, 'izoh') ?? '').trim() || null,
      })
    }
  } else {
    ogoh('To‘lovlar varag‘i topilmadi.')
  }

  return { ustozlar, oquvchilar, guruhlar, yozilishlar, tolovlar, guruhId }
}

/* ------------------------------------------------------------------ */
/*  4. Bazaga yozish                                                   */
/* ------------------------------------------------------------------ */

type Tayyor = ReturnType<typeof malumotniQur>

async function yoz(d: Tayyor) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase kalitlari topilmadi (.env.local)')

  const db = createClient(url, key, { auth: { persistSession: false } })
  const xato = (nom: string, e: { message: string } | null) => {
    if (e) throw new Error(`${nom}: ${e.message}`)
  }

  xato('teachers', (await db.from('teachers').upsert(
    d.ustozlar.map((u) => ({ id: u.id, ism: u.ism, telegram_id: u.telegram_id })),
  )).error)

  xato('groups', (await db.from('groups').upsert(
    d.guruhlar.map(({ xom: _xom, ...g }) => g),
  )).error)

  xato('students', (await db.from('students').upsert(d.oquvchilar)).error)

  const yozilishRows = d.yozilishlar
    .map((y) => {
      const gid = d.guruhId.get(y.guruhXom)
      if (!gid) return null
      return {
        student_id: y.student_id,
        group_id: gid,
        boshlandi: y.boshlandi,
        chegirma_summa: y.chegirma_summa,
        chegirma_oy: y.chegirma_oy,
        chegirma_sabab: y.chegirma_sabab,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  xato('enrollments', (await db.from('enrollments').upsert(yozilishRows, {
    onConflict: 'student_id,group_id',
    ignoreDuplicates: true,
  })).error)

  // Hisob-fakturalar — eng erta yozilishdan bugungacha har oy uchun
  const eng = yozilishRows.map((y) => y.boshlandi).sort()[0] ?? '2026-09-01'
  const boshi = new Date(`${eng.slice(0, 7)}-01T00:00:00Z`)
  const bugun = new Date()
  for (let d0 = boshi; d0 <= bugun; d0.setUTCMonth(d0.getUTCMonth() + 1)) {
    const davr = d0.toISOString().slice(0, 7)
    const { data, error } = await db.rpc('create_monthly_invoices', { p_davr: davr })
    xato(`invoices ${davr}`, error)
    console.log(`  hisob-faktura ${davr}: ${data ?? 0} ta`)
  }

  // To'lovlar — enrollment'ga bog'lab
  const { data: yozilishBazada } = await db.from('enrollments').select('id, student_id, group_id')
  const yKalit = new Map((yozilishBazada ?? []).map((y) => [`${y.student_id}|${y.group_id}`, y.id]))

  const tolovRows = d.tolovlar.map((t) => {
    const gid = t.guruhXom ? d.guruhId.get(t.guruhXom) : undefined
    return {
      student_id: t.student_id,
      enrollment_id: gid ? (yKalit.get(`${t.student_id}|${gid}`) ?? null) : null,
      sana: t.sana,
      davr: t.davr,
      summa: t.summa,
      usul: t.usul,
      tasdiqlangan: false,
      izoh: t.izoh,
    }
  })

  if (tolovRows.length) {
    xato('payments', (await db.from('payments').insert(tolovRows)).error)
  }

  return { yozilishlar: yozilishRows.length, tolovlar: tolovRows.length }
}

/* ------------------------------------------------------------------ */

async function ishga() {
  console.log(DRY ? '— QURUQ YURISH: hech narsa yozilmaydi —\n' : '— KO‘CHIRISH —\n')

  const varaqlar = await varaqlarniOqi()
  console.log('Varaqlar:', varaqlar.map((v) => `${v.nom} (${v.qatorlar.length})`).join(', '), '\n')

  const d = malumotniQur(varaqlar)

  console.log('Tayyorlandi:')
  console.log(`  ustozlar    ${d.ustozlar.length}`)
  console.log(`  guruhlar    ${d.guruhlar.length}`)
  console.log(`  o‘quvchilar ${d.oquvchilar.length}`)
  console.log(`  yozilishlar ${d.yozilishlar.length}`)
  console.log(`  to‘lovlar   ${d.tolovlar.length}  (${d.tolovlar.reduce((a, t) => a + t.summa, 0).toLocaleString('uz-UZ')} so‘m)\n`)

  if (ogohlantirishlar.length) {
    console.log(`Ogohlantirishlar (${ogohlantirishlar.length}):`)
    ogohlantirishlar.slice(0, 40).forEach((m) => console.log('  ·', m))
    if (ogohlantirishlar.length > 40) console.log(`  … yana ${ogohlantirishlar.length - 40} ta`)
    console.log()
  }

  if (DRY) {
    console.log('Quruq yurish tugadi. Yozish uchun --dry-run siz ishga tushiring.')
    return
  }

  const natija = await yoz(d)
  console.log('\nYozildi:', natija)
  console.log('\nESLATMA: davomat tarixi ko‘chirilmadi — manba varaqda faqat oylik')
  console.log('jamlanma bor, har bir darsning o‘zi yo‘q. Davomat yangi tizimda')
  console.log('birinchi darsdan boshlab yig‘iladi.')
}

ishga().catch((e) => {
  console.error('\nXATO:', e instanceof Error ? e.message : e)
  process.exit(1)
})
