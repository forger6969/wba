import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types'

/**
 * Server component, route handler va server action uchun.
 * Har so'rovda yangidan yaratiladi — global o'zgaruvchiga saqlanmaydi.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Server component ichidan cookie yozib bo'lmaydi.
            // Sessiyani middleware yangilaydi — bu yerda jim o'tamiz.
          }
        },
      },
    },
  )
}
