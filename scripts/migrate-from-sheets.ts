/**
 * Faza 0 — Students_wba (Google Sheets) → Postgres.
 *
 *   npm run migrate:dry      faqat ko'rsatadi va solishtiradi, yozmaydi
 *   npm run migrate          bazaga yozadi
 *   npm run migrate -- --davomat    davomat jurnallarini ham ko'chiradi
 *
 * Jadval allaqachon normalizatsiya qilingan, shuning uchun bu skript
 * taxmin qilmaydi: varaq nomi bo'yicha olinadi, ustun sarlavhasi
 * bo'yicha o'qiladi. Ikkita joyda hisob bor va ikkalasi ham Sheets
 * formulasini AYNAN takrorlaydi:
 *
 *   · hisob-faktura  — Qatnashuvda `invoices` ga mos varaq yo'q. Har oy
 *     uchun summa = o'sha oydagi narx (Narxlar tarixi) − o'sha oyda
 *     amal qiladigan chegirma bosqichi (U_Qatnashuv.js:100-133).
 *   · qarz           — Σ hisob-faktura − Σ to'lov.
 *
 * Shuning uchun --dry-run oxirida SOLISHTIRUV chiqadi: hisoblangan
 * summa Qatnashuvning "To'lashi kerak" / "To'langan" / "Qarz"
 * ustunlariga mos kelmasa, ko'chirishni boshlamaslik kerak.
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import {
  kitobniOqi, varaq, varaqBormi, matn, qiymat, belgi,
  type Qator,
} from './lib/sheets'
import {
  pulga, telefonga, sanaga, davrga, usulga, bosqichNormal, yonalishAniqla,
  axlatmi, kunTuriga, vaqtAjrat, kalitAjrat, oyRaqami, davrdan, oylarSoni,
  chegirmaOyda, narxTarixi, narxOyda,
  type KunTuri, type NarxQator,
} from './lib/parse'
import { jurnallarniOqi, type Dars, type Davomat, type JurnalNatija } from './lib/jurnal'

config({ path: '.env.local' })

const DRY = process.argv.includes('--dry-run')
const DAVOMAT = process.argv.includes('--davomat')
const SHEETS_ID = process.env.SHEETS_ID

/* ------------------------------------------------------------------ */
/*  Ogohlantirishlar                                                    */
/* ------------------------------------------------------------------ */

const ogohlantirishlar: string[] = []
const ogoh = (m: string) => {
  if (ogohlantirishlar.length < 300) ogohlantirishlar.push(m)
}

/* ------------------------------------------------------------------ */
/*  Tiplar                                                             */
/* ------------------------------------------------------------------ */

type Ustoz = {
  id: string
  ism: string
  telefon: string | null
  telegram_id: number | null
  holat: 'faol' | 'bloklangan'
}

type Guruh = {
  id: string
  nom: string
  subject_id: string | null
  bosqich: string | null
  teacher_id: string | null
  boshlanish: string
  tugash: string
  kun_turi: KunTuri
  oylik_narx: number
  holat: 'faol' | 'yopilgan'
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
  kalit: string                 // "S001|N01"
  student_id: string
  group_id: string
  guruhNomi: string
  boshlandi: string
  tugadi: string | null
  chegirma_summa: number
  chegirma_oy: number | null
  chegirma2_summa: number
  chegirma2_oy: number | null
  chegirma_sabab: string | null
  holat: 'faol' | 'tugagan'
  // solishtiruv uchun — Sheets o'zi hisoblagan qiymatlar
  sheetKerak: number
  sheetTolangan: number
  sheetQarz: number
  sheetOylar: number
}

type Hisob = { kalit: string; davr: string; summa: number; chegirma: number }

type Tolov = {
  student_id: string
  kalit: string | null
  sana: string
  davr: string
  summa: number
  usul: 'naqd' | 'karta' | 'click' | 'payme' | null
  izoh: string | null
  tasdiqlangan: boolean
  tasdiqlangan_vaqt: string | null
}

/* ------------------------------------------------------------------ */
/*  Yordamchilar                                                       */
/* ------------------------------------------------------------------ */

/**
 * "12.09.2026 14:30" yoki Sheets seriyasi (46276.6) → ISO, Toshkent vaqti.
 * Vaqti bo'lmasa kun boshi.
 */
function vaqtIso(v: unknown): string | null {
  const kun = sanaga(v)
  if (!kun) return null

  let soat = '00:00'
  if (typeof v === 'number') {
    const daqiqa = Math.round((v - Math.floor(v)) * 24 * 60)
    soat = `${String(Math.floor(daqiqa / 60)).padStart(2, '0')}:${String(daqiqa % 60).padStart(2, '0')}`
  } else {
    const m = String(v ?? '').match(/(\d{1,2}):(\d{2})/)
    if (m) soat = `${m[1].padStart(2, '0')}:${m[2]}`
  }
  return `${kun}T${soat}:00+05:00`   // Asia/Tashkent
}

function oquvchiHolati(v: string): 'faol' | 'tanaffus' | 'ketgan' {
  const s = v.toLowerCase()
  if (s.includes('tanaffus')) return 'tanaffus'
  if (/ketgan|chiqqan|to'?xtat/.test(s)) return 'ketgan'
  return 'faol'
}

/** "Necha oy" katagi: bo'sh — muddatsiz (null), 0 yoki manfiy — chegirma yo'q. */
function chegirmaOylari(q: Qator, ...nomlar: string[]): number | null {
  const xom = matn(q, ...nomlar)
  if (!xom) return null
  const n = pulga(xom)
  return n > 0 ? n : null
}

/* ------------------------------------------------------------------ */
/*  1. Ustozlar, guruhlar, o'quvchilar                                  */
/* ------------------------------------------------------------------ */

function ustozlarniQur(qatorlar: Qator[]): Ustoz[] {
  const natija: Ustoz[] = []

  for (const q of qatorlar) {
    const ism = matn(q, "O'qituvchi", 'Ism')
    if (!ism || axlatmi(ism)) continue

    const id = matn(q, 'ID') || `U${String(natija.length + 1).padStart(2, '0')}`
    const tg = pulga(qiymat(q, 'Telegram ID'))

    natija.push({
      id,
      ism,
      telefon: telefonga(qiymat(q, 'Telefon')),
      telegram_id: tg > 0 ? tg : null,
      holat: /ishdan|bloklangan/i.test(matn(q, 'Holat')) ? 'bloklangan' : 'faol',
    })
  }
  return natija
}

function guruhlarniQur(qatorlar: Qator[], ustozlar: Ustoz[]): Guruh[] {
  const ustozId = new Map(ustozlar.map((u) => [u.ism.toLowerCase(), u.id]))
  const natija: Guruh[] = []

  for (const q of qatorlar) {
    const nom = matn(q, 'Guruh nomi')
    const yonalishXom = matn(q, "Yo'nalish")
    if (!nom || axlatmi(nom)) {
      if (nom) ogoh(`Guruh tashlandi (nomi tushunarsiz): "${nom}"`)
      continue
    }

    const id = matn(q, 'Guruh ID') || `G${String(natija.length + 1).padStart(2, '0')}`
    const ustozIsm = matn(q, "O'qituvchi")
    const teacher = ustozIsm ? (ustozId.get(ustozIsm.toLowerCase()) ?? null) : null
    if (ustozIsm && !teacher) ogoh(`Ustoz topilmadi: "${ustozIsm}" (guruh: ${nom})`)

    const vaqt = vaqtAjrat(qiymat(q, 'Dars vaqti'))
    if (!vaqt) ogoh(`Dars vaqti o'qilmadi: "${nom}" — [ANIQLANMAGAN]`)

    const kun = kunTuriga(qiymat(q, 'Kun'))
    if (!kun) ogoh(`Kun turi o'qilmadi: "${nom}" — [ANIQLANMAGAN]`)

    const narx = pulga(qiymat(q, 'Oylik narx'))
    if (narx <= 0) ogoh(`Guruh narxi yo'q: "${nom}" — [ANIQLANMAGAN]`)

    const subject = yonalishAniqla(yonalishXom)
    if (!subject) ogoh(`Yo'nalish tanilmadi: "${yonalishXom}" (guruh: ${nom})`)

    natija.push({
      id,
      nom,
      subject_id: subject,
      bosqich: subject === 'ingliz-tili' || subject === 'matematika' ? bosqichNormal(yonalishXom) : null,
      teacher_id: teacher,
      boshlanish: vaqt?.boshlanish ?? '00:00',
      tugash: vaqt?.tugash ?? '00:00',
      kun_turi: kun ?? 'toq',
      oylik_narx: narx,
      holat: /yopilgan|tugagan/i.test(matn(q, 'Holat')) ? 'yopilgan' : 'faol',
    })
  }
  return natija
}

function oquvchilarniQur(qatorlar: Qator[]): Oquvchi[] {
  const natija: Oquvchi[] = []
  const korilgan = new Set<string>()

  for (const q of qatorlar) {
    const fish = matn(q, 'Ism familya', 'F.I.Sh')
    if (axlatmi(fish)) {
      if (fish) ogoh(`O'quvchi tashlandi (axlat qator): "${fish}"`)
      continue
    }

    const id = matn(q, 'ID').toUpperCase()
    if (!/^S\d+$/.test(id)) {
      ogoh(`O'quvchi tashlandi (ID noto'g'ri): "${fish}" — "${id}"`)
      continue
    }
    if (korilgan.has(id)) {
      ogoh(`ID takrorlandi, tashlandi: ${id} — ${fish}`)
      continue
    }
    korilgan.add(id)

    natija.push({
      id,
      fish,
      tugilgan_sana: sanaga(qiymat(q, "Tug'ilgan sana")),
      ota_tel: telefonga(qiymat(q, 'Ota telefoni')),
      ona_tel: telefonga(qiymat(q, 'Ona telefoni')),
      shaxsiy_tel: telefonga(qiymat(q, 'Shaxsiy telefon')),
      qoshilgan_sana: sanaga(qiymat(q, "Qo'shilgan sana")) ?? '2026-09-01',
      holat: oquvchiHolati(matn(q, 'Holat')),
      izoh: matn(q, 'Izoh') || null,
    })
  }
  return natija
}

/* ------------------------------------------------------------------ */
/*  2. Qatnashuv → yozilish + hisob-faktura                            */
/* ------------------------------------------------------------------ */

function yozilishlarniQur(
  qatorlar: Qator[],
  guruhlar: Guruh[],
  oquvchilar: Oquvchi[],
): Yozilish[] {
  const guruhId = new Map(guruhlar.map((g) => [g.nom, g.id]))
  const oquvchiBor = new Set(oquvchilar.map((o) => o.id))
  const natija: Yozilish[] = []

  for (const q of qatorlar) {
    const { fish, id } = kalitAjrat(qiymat(q, "O'quvchi"))
    const guruhNomi = matn(q, 'Guruh')

    if (!id || !oquvchiBor.has(id)) {
      ogoh(`Qatnashuv ${q._qator}-qator: o'quvchi topilmadi — "${fish}"`)
      continue
    }
    const gid = guruhId.get(guruhNomi)
    if (!gid) {
      ogoh(`Qatnashuv ${q._qator}-qator: guruh topilmadi — "${guruhNomi}" (${fish})`)
      continue
    }

    const boshlandi = sanaga(qiymat(q, 'Boshlandi'))
    if (!boshlandi) {
      ogoh(`Qatnashuv ${q._qator}-qator: boshlanish sanasi yo'q — ${fish} · ${guruhNomi}`)
      continue
    }
    const tugadi = sanaga(qiymat(q, 'Tugadi'))

    const cheg1 = pulga(qiymat(q, '1-chegirma'))
    const cheg2 = pulga(qiymat(q, '2-chegirma'))

    natija.push({
      kalit: `${id}|${gid}`,
      student_id: id,
      group_id: gid,
      guruhNomi,
      boshlandi,
      tugadi,
      chegirma_summa: cheg1,
      chegirma_oy: cheg1 > 0 ? chegirmaOylari(q, '1-necha oy') : 0,
      chegirma2_summa: cheg2,
      chegirma2_oy: cheg2 > 0 ? chegirmaOylari(q, '2-necha oy') : 0,
      chegirma_sabab: matn(q, 'Izoh') || null,
      holat: tugadi ? 'tugagan' : 'faol',
      sheetKerak: pulga(qiymat(q, "To'lashi kerak")),
      sheetTolangan: pulga(qiymat(q, "To'langan")),
      sheetQarz: pulga(qiymat(q, 'Qarz')),
      sheetOylar: pulga(qiymat(q, 'Oylar')),
    })
  }
  return natija
}

/**
 * Har yozilish uchun oy-oy hisob-faktura.
 * Formulaning o'zi: oylar boshlanish oyidan boshlab ketma-ket sanaladi,
 * har oyning narxi Narxlar tarixidan, chegirma esa o'sha oyning
 * BOSQICHIDAN olinadi.
 */
function hisoblarniQur(
  yozilishlar: Yozilish[],
  guruhlar: Guruh[],
  tarix: Map<string, NarxQator[]>,
  bugun = new Date(),
): Hisob[] {
  const guruhNarxi = new Map(guruhlar.map((g) => [g.id, g.oylik_narx]))
  const natija: Hisob[] = []

  for (const y of yozilishlar) {
    const oylar = oylarSoni(y.boshlandi, y.tugadi, bugun)
    if (oylar <= 0) continue
    if (y.sheetOylar > 0 && y.sheetOylar !== oylar) {
      ogoh(
        `Oylar soni farq qiladi: ${y.student_id} · ${y.guruhNomi} — ` +
          `Sheets ${y.sheetOylar}, hisoblangan ${oylar}`,
      )
    }

    const boshOy = oyRaqami(y.boshlandi.slice(0, 7))
    const zaxira = guruhNarxi.get(y.group_id) ?? 0

    for (let i = 1; i <= oylar; i++) {
      const oy = boshOy + i - 1
      const narx = narxOyda(tarix.get(y.guruhNomi), oy, zaxira)
      const chegirma = chegirmaOyda(
        i,
        { summa: y.chegirma_summa, oylar: y.chegirma_oy },
        { summa: y.chegirma2_summa, oylar: y.chegirma2_oy },
      )
      natija.push({
        kalit: y.kalit,
        davr: davrdan(oy),
        summa: Math.max(narx - chegirma, 0),
        chegirma: Math.min(chegirma, narx),
      })
    }
  }
  return natija
}

/* ------------------------------------------------------------------ */
/*  3. To'lovlar                                                       */
/* ------------------------------------------------------------------ */

function tolovlarniQur(qatorlar: Qator[], guruhlar: Guruh[], oquvchilar: Oquvchi[]): Tolov[] {
  const guruhId = new Map(guruhlar.map((g) => [g.nom, g.id]))
  const oquvchiBor = new Set(oquvchilar.map((o) => o.id))
  const natija: Tolov[] = []

  for (const q of qatorlar) {
    const summa = pulga(qiymat(q, 'Summa'))
    if (summa <= 0) continue

    const { fish, id, guruh } = kalitAjrat(qiymat(q, "O'quvchi"))
    const sid = id ?? matn(q, "O'quvchi ID").toUpperCase()
    if (!sid || !oquvchiBor.has(sid)) {
      ogoh(`To'lov ${q._qator}-qator: o'quvchi topilmadi — "${fish}" (${summa})`)
      continue
    }

    const gid = guruh ? guruhId.get(guruh) : undefined
    if (guruh && !gid) {
      ogoh(`To'lov ${q._qator}-qator: guruh topilmadi — "${guruh}" (${fish})`)
    }

    const sana = sanaga(qiymat(q, 'Sana'))
    const davr = davrga(qiymat(q, 'Davr')) ?? (sana ? sana.slice(0, 7) : null)
    if (!sana || !davr) {
      ogoh(`To'lov ${q._qator}-qator: sana yoki davr yo'q — ${fish} (${summa})`)
      continue
    }

    const usul = usulga(qiymat(q, 'Usul'))
    if (!usul) ogoh(`To'lov ${q._qator}-qator: usul manbada yo'q — ${fish} (${summa}) [ANIQLANMAGAN]`)

    const tasdiqlangan = belgi(q, 'Tasdiq')

    natija.push({
      student_id: sid,
      kalit: gid ? `${sid}|${gid}` : null,
      sana,
      davr,
      summa,
      usul,
      izoh: matn(q, 'Izoh') || null,
      tasdiqlangan,
      tasdiqlangan_vaqt: tasdiqlangan ? vaqtIso(qiymat(q, 'Tasdiqlangan')) : null,
    })
  }
  return natija
}

/* ------------------------------------------------------------------ */
/*  3b. Davomat jurnallari                                             */
/* ------------------------------------------------------------------ */

const JURNAL_VARAQLAR = ['Davomat toq', 'Davomat juft', 'Davomat dam olish']

function davomatniQur(
  kitob: Map<string, ReturnType<typeof varaq>>,
  guruhlar: Guruh[],
  oquvchilar: Oquvchi[],
): JurnalNatija {
  const varaqlar: [string, unknown[][]][] = []
  for (const nom of JURNAL_VARAQLAR) {
    const v = varaqBormi(kitob, nom)
    if (v) varaqlar.push([v.nom, v.xom])
    else ogoh(`Jurnal varag'i topilmadi: "${nom}"`)
  }

  return jurnallarniOqi(varaqlar, {
    guruhId: new Map(guruhlar.map((g) => [g.nom, g.id])),
    oquvchiBor: new Set(oquvchilar.map((o) => o.id)),
    ogoh,
  })
}

/* ------------------------------------------------------------------ */
/*  4. Hammasini yig'ish                                               */
/* ------------------------------------------------------------------ */

function malumotniQur(kitob: Map<string, ReturnType<typeof varaq>>) {
  const ustozlar = ustozlarniQur(varaq(kitob, 'Ustozlar').qatorlar)
  const guruhlar = guruhlarniQur(varaq(kitob, 'Guruhlar').qatorlar, ustozlar)
  const oquvchilar = oquvchilarniQur(varaq(kitob, "O'quvchilar").qatorlar)
  const yozilishlar = yozilishlarniQur(varaq(kitob, 'Qatnashuv').qatorlar, guruhlar, oquvchilar)

  const narxVaraq = varaqBormi(kitob, 'Narxlar')
  const tarix = narxTarixi(
    (narxVaraq?.qatorlar ?? []).map((q) => ({
      guruh: matn(q, 'Guruh'),
      narx: pulga(qiymat(q, 'Narx')),
      oydan: qiymat(q, 'Qaysi oydan'),
    })),
  )
  if (!narxVaraq || tarix.size === 0) {
    ogoh("Narxlar varag'i bo'sh — har oy guruhning joriy narxidan hisoblanadi.")
  }

  const hisoblar = hisoblarniQur(yozilishlar, guruhlar, tarix)
  const tolovlar = tolovlarniQur(varaq(kitob, 'Tolovlar').qatorlar, guruhlar, oquvchilar)

  const davomat = DAVOMAT
    ? davomatniQur(kitob, guruhlar, oquvchilar)
    : { darslar: [] as Dars[], belgilar: [] as Davomat[] }

  return { ustozlar, guruhlar, oquvchilar, yozilishlar, hisoblar, tolovlar, davomat }
}

type Tayyor = ReturnType<typeof malumotniQur>

/* ------------------------------------------------------------------ */
/*  5. Solishtiruv — hisob Sheets bilan mos keladimi                    */
/* ------------------------------------------------------------------ */

function solishtir(d: Tayyor) {
  const hisobJami = new Map<string, number>()
  for (const h of d.hisoblar) {
    hisobJami.set(h.kalit, (hisobJami.get(h.kalit) ?? 0) + h.summa)
  }

  const tolovJami = new Map<string, number>()
  for (const t of d.tolovlar) {
    if (!t.kalit) continue
    tolovJami.set(t.kalit, (tolovJami.get(t.kalit) ?? 0) + t.summa)
  }

  const farqlar: string[] = []
  let jamiKerak = 0, jamiKerakSheets = 0
  let jamiTolangan = 0, jamiTolanganSheets = 0

  for (const y of d.yozilishlar) {
    const kerak = hisobJami.get(y.kalit) ?? 0
    const tolangan = tolovJami.get(y.kalit) ?? 0

    jamiKerak += kerak
    jamiKerakSheets += y.sheetKerak
    jamiTolangan += tolangan
    jamiTolanganSheets += y.sheetTolangan

    if (kerak !== y.sheetKerak || tolangan !== y.sheetTolangan) {
      farqlar.push(
        `${y.student_id} · ${y.guruhNomi}: kerak ${pul(kerak)} (Sheets ${pul(y.sheetKerak)}) · ` +
          `to'langan ${pul(tolangan)} (Sheets ${pul(y.sheetTolangan)})`,
      )
    }
  }

  return {
    farqlar,
    jamiKerak, jamiKerakSheets,
    jamiTolangan, jamiTolanganSheets,
    qarz: jamiKerak - jamiTolangan,
    qarzSheets: d.yozilishlar.reduce((a, y) => a + y.sheetQarz, 0),
  }
}

const pul = (n: number) => n.toLocaleString('uz-UZ')

/* ------------------------------------------------------------------ */
/*  6. Bazaga yozish                                                   */
/* ------------------------------------------------------------------ */

async function yoz(d: Tayyor) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase kalitlari topilmadi (.env.local)')

  const db = createClient(url, key, { auth: { persistSession: false } })
  const xato = (nom: string, e: { message: string } | null) => {
    if (e) throw new Error(`${nom}: ${e.message}`)
  }

  xato('teachers', (await db.from('teachers').upsert(d.ustozlar)).error)

  // Bosqich (level) — yo'nalish ichidagi nom bo'yicha topiladi
  const { data: bosqichlar } = await db.from('levels').select('id, subject_id, nom')
  const bosqichId = new Map(
    (bosqichlar ?? []).map((b) => [`${b.subject_id}|${b.nom.toLowerCase()}`, b.id as number]),
  )

  xato('groups', (await db.from('groups').upsert(
    d.guruhlar.map(({ bosqich, ...g }) => ({
      ...g,
      level_id: bosqich && g.subject_id
        ? (bosqichId.get(`${g.subject_id}|${bosqich.toLowerCase()}`) ?? null)
        : null,
    })),
  )).error)

  xato('students', (await db.from('students').upsert(d.oquvchilar)).error)

  xato('enrollments', (await db.from('enrollments').upsert(
    d.yozilishlar.map((y) => ({
      student_id: y.student_id,
      group_id: y.group_id,
      boshlandi: y.boshlandi,
      tugadi: y.tugadi,
      chegirma_summa: y.chegirma_summa,
      chegirma_oy: y.chegirma_oy,
      chegirma2_summa: y.chegirma2_summa,
      chegirma2_oy: y.chegirma2_oy,
      chegirma_sabab: y.chegirma_sabab,
      holat: y.holat,
    })),
    { onConflict: 'student_id,group_id' },
  )).error)

  // Yozilish ID'lari — hisob-faktura va to'lov shularga bog'lanadi
  const { data: bazada } = await db.from('enrollments').select('id, student_id, group_id')
  const yId = new Map((bazada ?? []).map((y) => [`${y.student_id}|${y.group_id}`, y.id as string]))

  const hisobRows = d.hisoblar
    .map((h) => {
      const id = yId.get(h.kalit)
      return id ? { enrollment_id: id, davr: h.davr, summa: h.summa, chegirma: h.chegirma } : null
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  xato('invoices', (await db.from('invoices').upsert(hisobRows, {
    onConflict: 'enrollment_id,davr',
  })).error)

  // To'lovlar o'chirilmaydi, ya'ni ikki marta yozilsa tushum ikkilanadi.
  const { count } = await db
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('manba', 'sheets')

  let tolovSoni = 0
  if ((count ?? 0) > 0) {
    ogoh(
      `Bazada Sheets'dan kelgan ${count} ta to'lov allaqachon bor — ` +
        `to'lovlar QAYTA YOZILMADI (tushum ikkilanmasin).`,
    )
  } else {
    const tolovRows = d.tolovlar.map((t) => ({
      student_id: t.student_id,
      enrollment_id: t.kalit ? (yId.get(t.kalit) ?? null) : null,
      sana: t.sana,
      davr: t.davr,
      summa: t.summa,
      usul: t.usul,
      tasdiqlangan: t.tasdiqlangan,
      tasdiqlangan_vaqt: t.tasdiqlangan_vaqt,
      izoh: t.izoh,
      manba: 'sheets',
    }))
    if (tolovRows.length) {
      xato('payments', (await db.from('payments').insert(tolovRows)).error)
      tolovSoni = tolovRows.length
    }
  }

  /* ── Davomat ── */
  let darsSoni = 0, belgiSoni = 0
  if (DAVOMAT && d.davomat.darslar.length) {
    xato('lessons', (await db.from('lessons').upsert(
      d.davomat.darslar.map((l) => ({ group_id: l.group_id, sana: l.sana, otkazildi: true })),
      { onConflict: 'group_id,sana' },
    )).error)
    darsSoni = d.davomat.darslar.length

    const { data: darsRows } = await db.from('lessons').select('id, group_id, sana')
    const darsId = new Map((darsRows ?? []).map((l) => [`${l.group_id}|${l.sana}`, l.id as string]))

    const belgiRows = d.davomat.belgilar
      .map((b) => {
        const id = darsId.get(`${b.group_id}|${b.sana}`)
        return id ? { lesson_id: id, student_id: b.student_id, holat: b.holat } : null
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)

    xato('attendance', (await db.from('attendance').upsert(belgiRows, {
      onConflict: 'lesson_id,student_id',
    })).error)
    belgiSoni = belgiRows.length
  }

  return { hisoblar: hisobRows.length, tolovlar: tolovSoni, darslar: darsSoni, davomat: belgiSoni }
}

/* ------------------------------------------------------------------ */

async function ishga() {
  if (!SHEETS_ID) throw new Error('SHEETS_ID topilmadi (.env.local)')
  console.log(DRY ? '— QURUQ YURISH: hech narsa yozilmaydi —\n' : '— KO‘CHIRISH —\n')

  const kitob = await kitobniOqi(SHEETS_ID)
  console.log(
    'Varaqlar:',
    [...kitob.values()].map((v) => `${v.nom} (${v.qatorlar.length})`).join(', '),
    '\n',
  )

  const d = malumotniQur(kitob)

  console.log('Tayyorlandi:')
  console.log(`  ustozlar        ${d.ustozlar.length}`)
  console.log(`  guruhlar        ${d.guruhlar.length}`)
  console.log(`  o‘quvchilar     ${d.oquvchilar.length}`)
  console.log(`  qatnashuvlar    ${d.yozilishlar.length}`)
  console.log(`  hisob-faktura   ${d.hisoblar.length}`)
  console.log(`  to‘lovlar       ${d.tolovlar.length}  (${pul(d.tolovlar.reduce((a, t) => a + t.summa, 0))} so‘m)`)

  const usulsiz = d.tolovlar.filter((t) => !t.usul).length
  if (usulsiz) console.log(`  · shundan ${usulsiz} tasining USULI [ANIQLANMAGAN]`)

  if (DAVOMAT) {
    const kelgan = d.davomat.belgilar.filter((b) => b.holat === 'keldi').length
    console.log(`  darslar         ${d.davomat.darslar.length}`)
    console.log(`  davomat belgisi ${d.davomat.belgilar.length}  (${kelgan} keldi)`)
  }

  const s = solishtir(d)
  console.log('\nSOLISHTIRUV — hisoblangan / Sheets:')
  console.log(`  to‘lashi kerak  ${pul(s.jamiKerak)} / ${pul(s.jamiKerakSheets)}`)
  console.log(`  to‘langan       ${pul(s.jamiTolangan)} / ${pul(s.jamiTolanganSheets)}`)
  console.log(`  qarz            ${pul(s.qarz)} / ${pul(s.qarzSheets)}`)
  console.log(
    s.farqlar.length === 0
      ? '  ✓ hamma qatnashuv mos keladi'
      : `  ✗ ${s.farqlar.length} ta qatnashuvda farq bor:`,
  )
  s.farqlar.slice(0, 20).forEach((f) => console.log('     ·', f))
  if (s.farqlar.length > 20) console.log(`     … yana ${s.farqlar.length - 20} ta`)

  if (ogohlantirishlar.length) {
    console.log(`\nOgohlantirishlar (${ogohlantirishlar.length}):`)
    ogohlantirishlar.slice(0, 40).forEach((m) => console.log('  ·', m))
    if (ogohlantirishlar.length > 40) console.log(`  … yana ${ogohlantirishlar.length - 40} ta`)
  }

  if (DRY) {
    console.log('\nQuruq yurish tugadi. Yozish uchun --dry-run siz ishga tushiring.')
    return
  }

  if (s.farqlar.length > 0) {
    throw new Error(
      `Solishtiruvda ${s.farqlar.length} ta farq bor — yozilmadi. ` +
        `Avval farqni tushunib oling (--dry-run bilan ko‘ring).`,
    )
  }

  const natija = await yoz(d)
  console.log('\nYozildi:', natija)

  if (!DAVOMAT) {
    console.log('\nDavomat jurnallari ko‘chirilmadi. Kerak bo‘lsa: npm run migrate -- --davomat')
  }
}

ishga().catch((e) => {
  console.error('\nXATO:', e instanceof Error ? e.message : e)
  process.exit(1)
})
