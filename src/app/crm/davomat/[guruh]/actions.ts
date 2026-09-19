'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/auth'
import type { AttendanceStatus, DavomatNatija } from '@/lib/types'

export type SaqlashNatijasi =
  | { ok: true; natija: DavomatNatija }
  | { ok: false; xato: string }

/**
 * Davomat va woblar — bitta amal.
 *
 * Uchala jadvalga (lessons, attendance, woblr) bazadagi bitta
 * funksiya yozadi, ya'ni yarim saqlanib qolish holati yo'q.
 * Huquqni ham o'sha funksiya tekshiradi.
 */
export async function davomatniSaqla(
  guruhId: string,
  sana: string,
  belgilar: Record<string, AttendanceStatus>,
  ballar: Record<string, number>,
): Promise<SaqlashNatijasi> {
  /* Kirmagan odam bu amalni bajara olmaydi. Asosiy tekshiruv bazadagi
     davomat_saqla() da (o'z guruhi yoki admin), lekin kodda ham to'sib
     qo'yamiz: hech kim bo'sh sessiya bilan RPC'ni bezovta qilmasin. */
  const profil = await getProfile()
  if (!profil) return { ok: false, xato: 'Avval tizimga kiring.' }
  if (!['admin', 'direktor', 'qabulxona', 'ustoz'].includes(profil.rol)) {
    return { ok: false, xato: 'Davomat qo‘yish huquqingiz yo‘q.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('davomat_saqla', {
    p_group: guruhId,
    p_sana: sana,
    p_belgilar: belgilar,
    p_ballar: ballar,
  })

  if (error) return { ok: false, xato: error.message }

  revalidatePath('/crm/davomat')
  revalidatePath(`/crm/davomat/${guruhId}`)

  return { ok: true, natija: data as unknown as DavomatNatija }
}
