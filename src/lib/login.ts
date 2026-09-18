/**
 * Login — odam uchun oddiy so'z ("aziza", "s001"), tizim uchun email.
 *
 * Supabase kirishni email bilan qiladi, lekin o'quvchi va ustozga
 * "aziza@wba.uz" ni eslab qolish qiyin. Shuning uchun @ bo'lmasa,
 * markaz domeni o'zi qo'shiladi. Haqiqiy email yozilsa — o'zgarishsiz.
 * Bu pochtalar haqiqiy bo'lishi shart emas: xat yuborilmaydi.
 */

export const LOGIN_DOMENI = 'wba.uz'

/** "Aziza" → "aziza@wba.uz" · "aziza@gmail.com" → o'zgarishsiz · noto'g'ri → null */
export function loginEmail(xom: FormDataEntryValue | string | null | undefined): string | null {
  const s = String(xom ?? '').trim().toLowerCase()
  if (!s) return null
  if (s.includes('@')) {
    return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(s) ? s : null
  }
  return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(s) ? `${s}@${LOGIN_DOMENI}` : null
}

/** Ko'rsatish uchun: "aziza@wba.uz" → "aziza", boshqa email — to'liq. */
export function loginNomi(email: string | null | undefined): string {
  if (!email) return ''
  const qoshimcha = `@${LOGIN_DOMENI}`
  return email.endsWith(qoshimcha) ? email.slice(0, -qoshimcha.length) : email
}

export const LOGIN_QOIDASI = 'Kamida 3 belgi: lotin harf, raqam, nuqta, tire. Masalan: aziza yoki aziza.k'
