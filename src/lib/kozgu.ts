import 'server-only'
import { google } from 'googleapis'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * BAZA → GOOGLE SHEETS KO'ZGUSI.
 *
 * Qaror (20.09): sayt asosiy manba, Sheets esa faqat ko'rish va
 * "to'liq ma'lumotni yuklab olish" uchun. Shuning uchun yo'nalish
 * BITTA: bazadan jadvalga. Jadvalga yozilgan narsa bazaga qaytmaydi.
 *
 * Har varaq to'liq qayta yoziladi (avval tozalanadi) — jadvalda
 * formula yo'q, faqat qiymat. Eski `Students_wba` ga TEGILMAYDI:
 * ko'zgu alohida jadvalda (KOZGU_SHEETS_ID).
 */

type Varaq = { nom: string; qatorlar: (string | number)[][] }

const som = (n: unknown) => Number(n ?? 0)
const matn = (v: unknown) => (v == null ? '' : String(v))

/** Bazadan hamma bo'limni o'qiydi va varaqlarga aylantiradi. */
export async function kozguVaraqlari(): Promise<Varaq[]> {
  const db = createAdminClient()

  const [oquvchilar, guruhlar, ustozlar, yozilishlar, tolovlar, hisoblar, davomat, qarzdorlar, balans] = await Promise.all([
    db.from('students').select('id, fish, tugilgan_sana, ota_tel, ona_tel, shaxsiy_tel, qoshilgan_sana, holat, izoh').order('id'),
    db.from('groups').select('id, nom, subject_id, teacher_id, boshlanish, tugash, kun_turi, oylik_narx, sigim, holat').order('id'),
    db.from('teachers').select('id, ism, telefon, telegram_id, holat').order('id'),
    db.from('enrollments').select('id, sheets_id, student_id, group_id, boshlandi, tugadi, chegirma_summa, chegirma_oy, chegirma2_summa, chegirma2_oy, chegirma_sabab, holat').order('sheets_id'),
    db.from('payments').select('id, sheets_id, sana, student_id, enrollment_id, davr, summa, usul, tasdiqlangan, bekor, izoh, manba').order('sana'),
    db.from('invoices').select('enrollment_id, davr, summa, chegirma, holat').order('davr'),
    db.from('attendance').select('student_id, holat, lessons(sana, group_id)').order('created_at'),
    db.from('v_qarzdorlar').select('student_id, fish, qarz, ota_tel, ona_tel, shaxsiy_tel, guruhlar').order('qarz', { ascending: false }),
    db.from('v_enrollment_balance').select('enrollment_id, hisoblangan, chegirma, tolangan, qarz'),
  ])

  const gNomi = new Map((guruhlar.data ?? []).map((g) => [g.id, g.nom]))
  const oNomi = new Map((oquvchilar.data ?? []).map((o) => [o.id, o.fish]))
  const uNomi = new Map((ustozlar.data ?? []).map((u) => [u.id, u.ism]))
  const bal = new Map((balans.data ?? []).map((b) => [b.enrollment_id, b]))
  const yozilish = new Map((yozilishlar.data ?? []).map((y) => [y.id, y]))

  const vaqt = new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })

  return [
    {
      nom: 'Ma’lumot',
      qatorlar: [
        ['WBA — bazadan ko‘zgu'],
        ['Oxirgi yangilanish', vaqt],
        [''],
        ['Bu jadval SAYTDAGI bazadan avtomatik to‘ldiriladi.'],
        ['Bu yerga yozilgan narsa bazaga QAYTMAYDI — ish sayt orqali qilinadi.'],
        ['Har varaq har safar to‘liq qayta yoziladi.'],
        [''],
        ['O‘quvchilar', (oquvchilar.data ?? []).length],
        ['Guruhlar', (guruhlar.data ?? []).length],
        ['Ustozlar', (ustozlar.data ?? []).length],
        ['Qatnashuv', (yozilishlar.data ?? []).length],
        ['To‘lovlar', (tolovlar.data ?? []).length],
        ['Davomat belgilari', (davomat.data ?? []).length],
      ],
    },
    {
      nom: 'O‘quvchilar',
      qatorlar: [
        ['ID', 'F.I.Sh', 'Tug‘ilgan sana', 'Ota tel', 'Ona tel', 'Shaxsiy tel', 'Qo‘shilgan', 'Holat', 'Izoh'],
        ...(oquvchilar.data ?? []).map((o) => [o.id, o.fish, matn(o.tugilgan_sana), matn(o.ota_tel), matn(o.ona_tel), matn(o.shaxsiy_tel), matn(o.qoshilgan_sana), o.holat, matn(o.izoh)]),
      ],
    },
    {
      nom: 'Guruhlar',
      qatorlar: [
        ['ID', 'Nom', 'Fan', 'Ustoz', 'Boshlanish', 'Tugash', 'Kun turi', 'Oylik narx', 'Sig‘im', 'Holat'],
        ...(guruhlar.data ?? []).map((g) => [g.id, g.nom, matn(g.subject_id), uNomi.get(g.teacher_id ?? '') ?? '', matn(g.boshlanish), matn(g.tugash), g.kun_turi, som(g.oylik_narx), g.sigim, g.holat]),
      ],
    },
    {
      nom: 'Ustozlar',
      qatorlar: [
        ['ID', 'Ism', 'Telefon', 'Telegram ID', 'Holat'],
        ...(ustozlar.data ?? []).map((u) => [u.id, u.ism, matn(u.telefon), matn(u.telegram_id), u.holat]),
      ],
    },
    {
      nom: 'Qatnashuv',
      qatorlar: [
        ['Sheets ID', 'O‘quvchi ID', 'O‘quvchi', 'Guruh', 'Boshlandi', 'Tugadi', '1-chegirma', '1-necha oy', '2-chegirma', '2-necha oy', 'Sabab', 'Holat', 'Hisoblangan', 'To‘langan', 'Qarz'],
        ...(yozilishlar.data ?? []).map((y) => {
          const b = bal.get(y.id)
          return [matn(y.sheets_id), y.student_id, oNomi.get(y.student_id) ?? '', gNomi.get(y.group_id) ?? y.group_id, matn(y.boshlandi), matn(y.tugadi), som(y.chegirma_summa), matn(y.chegirma_oy), som(y.chegirma2_summa), matn(y.chegirma2_oy), matn(y.chegirma_sabab), y.holat, som(b?.hisoblangan), som(b?.tolangan), som(b?.qarz)]
        }),
      ],
    },
    {
      nom: 'To‘lovlar',
      qatorlar: [
        ['ID', 'Sheets ID', 'Sana', 'O‘quvchi ID', 'O‘quvchi', 'Guruh', 'Davr', 'Summa', 'Usul', 'Tasdiqlangan', 'Bekor', 'Manba', 'Izoh'],
        ...(tolovlar.data ?? []).map((t) => {
          const y = t.enrollment_id ? yozilish.get(t.enrollment_id) : null
          return [t.id, matn(t.sheets_id), matn(t.sana), t.student_id, oNomi.get(t.student_id) ?? '', y ? (gNomi.get(y.group_id) ?? y.group_id) : '', t.davr, som(t.summa), matn(t.usul), t.tasdiqlangan ? 'ha' : '', t.bekor ? 'ha' : '', matn(t.manba), matn(t.izoh)]
        }),
      ],
    },
    {
      nom: 'Hisoblar',
      qatorlar: [
        ['Davr', 'O‘quvchi', 'Guruh', 'Summa', 'Chegirma', 'Holat'],
        ...(hisoblar.data ?? []).map((h) => {
          const y = yozilish.get(h.enrollment_id)
          return [h.davr, y ? (oNomi.get(y.student_id) ?? y.student_id) : '', y ? (gNomi.get(y.group_id) ?? y.group_id) : '', som(h.summa), som(h.chegirma), h.holat]
        }),
      ],
    },
    {
      nom: 'Davomat',
      qatorlar: [
        ['Sana', 'Guruh', 'O‘quvchi ID', 'O‘quvchi', 'Holat'],
        ...((davomat.data ?? []) as unknown as { student_id: string; holat: string; lessons: { sana: string; group_id: string } | null }[])
          .map((a) => [matn(a.lessons?.sana), gNomi.get(a.lessons?.group_id ?? '') ?? matn(a.lessons?.group_id), a.student_id, oNomi.get(a.student_id) ?? '', a.holat])
          .sort((x, y) => String(x[0]).localeCompare(String(y[0]))),
      ],
    },
    {
      nom: 'Qarzdorlar',
      qatorlar: [
        ['O‘quvchi ID', 'F.I.Sh', 'Qarz', 'Ota tel', 'Ona tel', 'Shaxsiy tel', 'Guruhlar'],
        ...(qarzdorlar.data ?? []).map((q) => [q.student_id, q.fish, som(q.qarz), matn(q.ota_tel), matn(q.ona_tel), matn(q.shaxsiy_tel), matn(q.guruhlar)]),
      ],
    },
  ]
}

/** Google auth — Vercel'da JSON muhit o'zgaruvchisi, lokalda fayl. */
function auth() {
  const xom = process.env.GOOGLE_SA_JSON
  const scopes = ['https://www.googleapis.com/auth/spreadsheets']
  if (xom) return new google.auth.GoogleAuth({ credentials: JSON.parse(xom), scopes })
  return new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes })
}

/** Ko'zguni yozadi. Yo'q varaqlar ochiladi, borlari tozalanib qayta yoziladi. */
export async function kozguniYoz(): Promise<{ varaq: string; qatorlar: number }[]> {
  const id = process.env.KOZGU_SHEETS_ID
  if (!id) throw new Error('KOZGU_SHEETS_ID sozlanmagan')

  const sheets = google.sheets({ version: 'v4', auth: auth() })
  const varaqlar = await kozguVaraqlari()

  const kitob = await sheets.spreadsheets.get({ spreadsheetId: id })
  const bor = new Set((kitob.data.sheets ?? []).map((s) => s.properties?.title))
  const yangi = varaqlar.filter((v) => !bor.has(v.nom))
  if (yangi.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: id,
      requestBody: { requests: yangi.map((v) => ({ addSheet: { properties: { title: v.nom } } })) },
    })
  }

  await sheets.spreadsheets.values.batchClear({
    spreadsheetId: id,
    requestBody: { ranges: varaqlar.map((v) => `'${v.nom}'`) },
  })
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: id,
    requestBody: {
      valueInputOption: 'RAW',
      data: varaqlar.map((v) => ({ range: `'${v.nom}'!A1`, values: v.qatorlar })),
    },
  })

  return varaqlar.map((v) => ({ varaq: v.nom, qatorlar: Math.max(v.qatorlar.length - 1, 0) }))
}
