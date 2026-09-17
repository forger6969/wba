import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseSozlanganmi } from '@/lib/supabase/env'
import type { Profile, UserRole } from '@/lib/types'

/** Joriy foydalanuvchi profili. Bitta render ichida bir marta so'raladi. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  // Kalitlar yo'q — kirish ham, profil ham bo'lmaydi (xato tashlamaymiz)
  if (!supabaseSozlanganmi()) return null

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  return data ?? null
})

/** Login shart bo'lgan sahifalar uchun. */
export async function talabProfil(): Promise<Profile> {
  const profil = await getProfile()
  if (!profil) redirect('/kirish')
  if (profil.holat === 'bloklangan') redirect('/kirish?xato=bloklangan')
  return profil
}

/** Rol talab qiladigan sahifalar uchun. */
export async function talabRol(...rollar: UserRole[]): Promise<Profile> {
  const profil = await talabProfil()
  if (!rollar.includes(profil.rol)) redirect('/crm/dashboard?xato=huquq')
  return profil
}

export const ROL_NOMI: Record<UserRole, string> = {
  admin: 'Admin',
  direktor: 'Direktor',
  qabulxona: 'Qabulxona',
  ustoz: 'O‘qituvchi',
  oquvchi: 'O‘quvchi',
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
