/**
 * Formadan kelgan matnni tekshirish va toza qiymatga aylantirish.
 * Bu yerdagi qoidalar botdagi bilan bir xil — admin qaysi joyda
 * yozmasin, natija bir xil chiqsin.
 */

import { telefonNormal } from '@/lib/format'

/**
 * Summa — botdagi qoida (Kod.js: oddiyTahlil):
 *   "550"      → 550 000   (3000 dan kichik raqam — minglarda yozilgan)
 *   "650 000"  → 650 000
 *   "1.2 mln"  → 1 200 000
 *   "600 ming" → 600 000
 * Tushunarsiz yoki musbat bo'lmasa — null.
 */
export function summaOqi(xom: FormDataEntryValue | string | null | undefined): number | null {
  const s = String(xom ?? '').trim().toLowerCase()
  const m = s.match(/(\d[\d\s,]*(?:\.\d+)?)\s*(mln|million|ming)?/)
  if (!m) return null

  let n = parseFloat(m[1].replace(/[\s,]/g, ''))
  if (!Number.isFinite(n) || n <= 0) return null

  const birlik = m[2] ?? ''
  if (birlik.startsWith('ml')) n *= 1_000_000
  else if (birlik === 'ming') n *= 1_000
  else if (n < 3000) n *= 1_000

  return Math.round(n)
}

/** Matn — bo'sh bo'lsa null. */
export function matn(v: FormDataEntryValue | null | undefined): string | null {
  const s = String(v ?? '').trim()
  return s ? s : null
}

/**
 * Telefon. Bo'sh — null (xato emas), noto'g'ri — undefined (xato).
 * Z_Telefon.js dagi kabi: qanday yozilsa ham +998XXXXXXXXX ga keladi.
 */
export function telefonOqi(v: FormDataEntryValue | null | undefined): string | null | undefined {
  const s = matn(v)
  if (!s) return null
  return telefonNormal(s) ?? undefined
}

/** "2026-09-17" — faqat shu ko'rinish qabul qilinadi (input type=date beradi). */
export function sanaOqi(v: FormDataEntryValue | null | undefined): string | null {
  const s = matn(v)
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

/** "2026-09" — input type=month beradi. */
export function davrOqi(v: FormDataEntryValue | null | undefined): string | null {
  const s = matn(v)
  return s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s) ? s : null
}

/** Butun son. Bo'sh — null. */
export function sonOqi(v: FormDataEntryValue | null | undefined): number | null {
  const s = matn(v)
  if (!s) return null
  const n = Number(s.replace(/\s/g, ''))
  return Number.isInteger(n) ? n : null
}

/** Natija bilan qaytish uchun manzil: /crm/x?ok=... yoki ?xato=... */
export function xabarliYol(yol: string, xabar: { ok?: string; xato?: string }): string {
  const [asos, sorov = ''] = yol.split('?')
  const q = new URLSearchParams(sorov)
  q.delete('ok')
  q.delete('xato')
  if (xabar.ok) q.set('ok', xabar.ok)
  if (xabar.xato) q.set('xato', xabar.xato)
  const qs = q.toString()
  return qs ? `${asos}?${qs}` : asos
}

/**
 * Bazadan kelgan xatoni odam tushunadigan qilib beradi.
 * Bizning funksiyalar o'zbekcha xabar tashlaydi — shuni o'zgarishsiz
 * qoldiramiz; texnik xatolarni esa umumiy tilga o'giramiz.
 */
export function xatoMatni(e: { message?: string; code?: string } | null): string {
  if (!e) return 'Nimadir noto‘g‘ri ketdi.'
  if (e.code === '42501') return 'Bu amal uchun huquqingiz yo‘q.'
  if (e.code === '23505') return 'Bunday yozuv allaqachon bor.'
  if (e.code === '23514') return 'Kiritilgan qiymat qoidaga to‘g‘ri kelmaydi.'
  return e.message ?? 'Nimadir noto‘g‘ri ketdi.'
}
