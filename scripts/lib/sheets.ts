/**
 * Students_wba dan o'qish qatlami.
 *
 * Jadval allaqachon normalizatsiya qilingan: har varaqning 1-qatori —
 * sarlavha, qolgani ma'lumot. Shuning uchun bu yerda taxmin qiladigan
 * joy yo'q, faqat ikkita nozik narsa bor:
 *
 *   1. VARAQLAR "UZUN". Formulalar 300 (Tolovlar 1500) qatorgacha
 *      oldindan qo'yilgan, ya'ni oxirgi qator doim to'ldirilgan bo'lib
 *      ko'rinadi. Haqiqiy oxir KALIT USTUNI bo'yicha topiladi —
 *      Apps Script ham shunday qiladi (BOT_Baza.js:82).
 *
 *   2. APOSTROF. Sarlavhalarda "O'quvchi" turli apostroflar bilan
 *      yozilishi mumkin (' ’ ʻ ʼ `). Kalitlar solishtirilganda
 *      apostrof umuman hisobga olinmaydi.
 */

import { google } from 'googleapis'

export type Qator = Record<string, unknown> & { _qator: number }

/**
 * `qatorlar` — sarlavha bo'yicha nomlangan qatorlar (oddiy varaqlar uchun).
 * `xom` — varaqning o'zi, hech narsa talqin qilinmagan holda. Davomat
 * jurnallari blok-blok qurilgan (Q_Jurnal.js), ya'ni ularda sarlavha
 * qatori umuman yo'q — ular faqat `xom` orqali o'qiladi.
 */
export type Varaq = { nom: string; sarlavha: string[]; qatorlar: Qator[]; xom: unknown[][] }

/** Varaq nomi → kalit ustunining SARLAVHASI (shu katak bo'sh bo'lsa qator ham bo'sh). */
const KALIT: Record<string, string> = {
  "O'quvchilar": 'ID',
  Guruhlar: 'Guruh ID',
  Ustozlar: "O'qituvchi",
  Qatnashuv: "O'quvchi",
  Tolovlar: "O'quvchi",
  Narxlar: 'Guruh',
  Probniylar: 'F.I.Sh',
}

/**
 * Apostrof va harf kattaligini e'tiborsiz qoldiradigan kalit.
 * Apostroflar kodi bilan yozilgan — ular ko'zga bir xil ko'rinadi,
 * shuning uchun qaysi biri ro'yxatda borligini faqat shunday bilish mumkin:
 *   ' U+0027 · ‘ U+2018 · ’ U+2019 · ʻ U+02BB · ʼ U+02BC · ` U+0060 · ´ U+00B4 · ′ U+2032
 */
export function normKalit(s: unknown): string {
  return String(s ?? '')
    .replace(/['‘’ʻʼ`´′]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Qatordan ustunni nomi bo'yicha oladi. Bir nechta nom berilsa — birinchi topilgani. */
export function qiymat(q: Qator, ...nomlar: string[]): unknown {
  for (const nom of nomlar) {
    const kerak = normKalit(nom)
    for (const [kalit, qiy] of Object.entries(q)) {
      if (kalit !== '_qator' && normKalit(kalit) === kerak) return qiy
    }
  }
  return ''
}

/** Matnli qiymat, chetidagi bo'shliqsiz. */
export function matn(q: Qator, ...nomlar: string[]): string {
  return String(qiymat(q, ...nomlar) ?? '').trim()
}

/** Sheets'ning TRUE/FALSE katagi. */
export function belgi(q: Qator, ...nomlar: string[]): boolean {
  const v = qiymat(q, ...nomlar)
  if (typeof v === 'boolean') return v
  return /^(true|ha|1)$/i.test(String(v ?? '').trim())
}

/**
 * Kalit ustuni bo'yicha haqiqiy oxirgi qator (1-asosli).
 * Pastdan yuqoriga qaraydi — birinchi to'ldirilgan katak topilgan joy oxir.
 */
function oxirgiQator(qatorlar: unknown[][], kalitIdx: number): number {
  for (let r = qatorlar.length - 1; r >= 1; r--) {
    if (String(qatorlar[r]?.[kalitIdx] ?? '').trim() !== '') return r + 1
  }
  return 1
}

/** Bitta varaqni sarlavha nomlari bo'yicha obyektlar ro'yxatiga aylantiradi. */
export function varaqQur(nom: string, xom: unknown[][]): Varaq {
  if (xom.length < 2) return { nom, sarlavha: [], qatorlar: [], xom }

  const sarlavha = (xom[0] ?? []).map((c) => String(c ?? '').trim())

  const kalitNomi = KALIT[nom]
  let kalitIdx = 0
  if (kalitNomi) {
    const topildi = sarlavha.findIndex((s) => normKalit(s) === normKalit(kalitNomi))
    if (topildi >= 0) kalitIdx = topildi
  }

  const oxir = oxirgiQator(xom, kalitIdx)
  const qatorlar: Qator[] = []

  for (let r = 1; r < oxir; r++) {
    const xatR = xom[r] ?? []
    if (String(xatR[kalitIdx] ?? '').trim() === '') continue

    const q = { _qator: r + 1 } as Qator
    sarlavha.forEach((k, c) => {
      if (k) q[k] = xatR[c] ?? ''
    })
    qatorlar.push(q)
  }

  return { nom, sarlavha, qatorlar, xom }
}

/** Butun kitobni o'qiydi. Kalit: varaq nomi. */
export async function kitobniOqi(sheetsId: string): Promise<Map<string, Varaq>> {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  const sheets = google.sheets({ version: 'v4', auth: (await auth.getClient()) as never })

  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetsId })
  const nomlar = (meta.data.sheets ?? [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => Boolean(t))

  const javob = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: sheetsId,
    ranges: nomlar.map((n) => `'${n.replace(/'/g, "''")}'!A1:BA2000`),
    /* Sana SERIYA raqami bo'lib keladi — Sheets'ning ko'rsatish formati
       (dd.MM.yyyy, "2-Sen" va h.k.) hisobga ta'sir qilmasin. `sanaga`
       seriyani ham, matnni ham tushunadi. */
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'SERIAL_NUMBER',
  })

  const kitob = new Map<string, Varaq>()
  ;(javob.data.valueRanges ?? []).forEach((vr, i) => {
    kitob.set(nomlar[i], varaqQur(nomlar[i], (vr.values ?? []) as unknown[][]))
  })
  return kitob
}

/** Varaqni nomi bo'yicha oladi. Yo'q bo'lsa — nima borligini aytadi. */
export function varaq(kitob: Map<string, Varaq>, nom: string): Varaq {
  const topildi = kitob.get(nom) ?? [...kitob.values()].find((v) => normKalit(v.nom) === normKalit(nom))
  if (!topildi) {
    throw new Error(
      `Varaq topilmadi: "${nom}". Jadvalda bor varaqlar: ${[...kitob.keys()].join(', ')}`,
    )
  }
  return topildi
}

/** Varaq bor bo'lsa qaytaradi, yo'q bo'lsa null (ixtiyoriy varaqlar uchun). */
export function varaqBormi(kitob: Map<string, Varaq>, nom: string): Varaq | null {
  try {
    return varaq(kitob, nom)
  } catch {
    return null
  }
}
