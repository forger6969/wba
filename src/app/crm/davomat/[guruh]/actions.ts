'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
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
