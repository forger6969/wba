import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'

/**
 * Service role — RLS'ni chetlab o'tadi.
 *
 * FAQAT server tomonda va faqat quyidagilar uchun:
 *   · saytdagi ariza formasidan lead yozish (anon foydalanuvchi)
 *   · cron ishlari (oylik hisob-faktura, Sheets sinxronizatsiyasi)
 *   · Sheets'dan ko'chirish skripti
 *
 * Foydalanuvchi so'rovlarida ISHLATILMAYDI — u yerda createClient() ishlatiladi,
 * chunki huquqni RLS hal qilishi kerak.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY topilmadi (.env.local ni tekshiring)')
  }

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
