import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile, UserRole } from '@/lib/types'

/** Joriy foydalanuvchi profili. Bitta render ichida bir marta so'raladi. */
export const getProfile = cache(async (): Promise<Profile | null> => {
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
  qabulxona: 'Qabulxona',
  ustoz: 'O‘qituvchi',
  oquvchi: 'O‘quvchi',
}

export function staffmi(rol: UserRole): boolean {
  return rol === 'admin' || rol === 'qabulxona'
}
