import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseSozlanganmi } from '@/lib/supabase/env'
import type { Profile, UserRole } from '@/lib/types'

/**
 * Joriy foydalanuvchi profili. Bitta render ichida bir marta so'raladi.
 *
 * ID — middleware'dan (u allaqachon auth.getUser() bilan tasdiqlagan,
 * `x-wba-user-id` header orqali uzatgan) — shu yerda QAYTA getUser()
 * chaqirib, Supabase Auth'ga ikkinchi tarmoq so'rovi yubormaymiz.
 * Header'ga faqat middleware yozadi, mijozdan kelgan qiymatga u yerda
 * ishonilmaydi (supabase/middleware.ts).
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  // Kalitlar yo'q — kirish ham, profil ham bo'lmaydi (xato tashlamaymiz)
  if (!supabaseSozlanganmi()) return null

  const h = await headers()
  const userId = h.get('x-wba-user-id')
  if (!userId) return null

  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()

  return data ?? null
})

/**
 * Shu odam ustozmi.
 *
 * Botdagi bilan bir xil qoida: "ustoz" degani rol emas, BIRIKTIRILISH —
 * Ustozlar varag'ida Telegram ID si bor odam ustoz (BOT_Menyu.js:
 * botRol). Bu yerda ham shunday: teachers.profile_id kimga tegishli
 * bo'lsa, o'sha ustoz. Shuning uchun Farrux (direktor) va Jamshid
 * (admin) ham ustoz panelini ko'radi.
 */
export const getUstoz = cache(async (): Promise<{ id: string; ism: string } | null> => {
  if (!supabaseSozlanganmi()) return null

  const profil = await getProfile()
  if (!profil) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('teachers')
    .select('id, ism')
    .eq('profile_id', profil.id)
    .maybeSingle()

  return data ?? null
})

/** Login shart bo'lgan sahifalar uchun. */
export async function talabProfil(): Promise<Profile> {
  const profil = await getProfile()
  if (!profil) redirect('/kirish')
  if (profil.holat === 'bloklangan') redirect('/kirish?xato=bloklangan')
  return profil
}

/**
 * Kim qayerdan boshlaydi: har rol o'z paneliga tushadi.
 * Ustozmi yoki yo'qmi — bu yerda so'rov qilmaymiz (arzon bo'lsin):
 * ustoz roli davomatga, o'quvchi o'z sahifasiga, xodim boshqaruvga.
 */
export function panelYoli(rol: UserRole): string {
  if (rol === 'oquvchi') return '/crm/men'
  if (rol === 'ota_ona') return '/crm/farzand'
  if (rol === 'ustoz') return '/crm/davomat'
  return '/crm/dashboard'
}

/**
 * Rol talab qiladigan sahifalar uchun.
 * Huquq yetmasa — odam O'Z paneliga qaytariladi. Hammani dashboardga
 * yuborish aylanma yo'naltirishga olib kelardi: dashboard ham faqat
 * xodimga ochiq.
 */
export async function talabRol(...rollar: UserRole[]): Promise<Profile> {
  const profil = await talabProfil()
  if (!rollar.includes(profil.rol)) redirect(`${panelYoli(profil.rol)}?xato=huquq`)
  return profil
}

export const ROL_NOMI: Record<UserRole, string> = {
  admin: 'Admin',
  direktor: 'Direktor',
  qabulxona: 'Qabulxona',
  ustoz: 'O‘qituvchi',
  oquvchi: 'O‘quvchi',
  ota_ona: 'Ota-ona',
}

/** Boshqaruv huquqi. Direktor bu yerda admin bilan teng. */
export function adminmi(rol: UserRole): boolean {
  return rol === 'admin' || rol === 'direktor'
}

/** Pul ko'radigan xodimlar. */
export function staffmi(rol: UserRole): boolean {
  return adminmi(rol) || rol === 'qabulxona'
}

/**
 * To'lovni tasdiqlash — faqat direktorda. Qog'ozdagi imzo o'rnida
 * turadi, shuning uchun admin ham bosa olmaydi. Bazada ham shunday:
 * 0006_direktor_huquq.sql dagi payments_tasdiq triggeri to'sadi.
 */
export function tasdiqlaydimi(rol: UserRole): boolean {
  return rol === 'direktor'
}
