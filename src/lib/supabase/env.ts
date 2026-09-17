/**
 * Supabase sozlanganmi.
 *
 * `.env.local` bo'lmasa `createServerClient` "supabaseUrl is required"
 * deb xato tashlaydi — va bu xato middleware'da chiqadi, ya'ni BUTUN
 * sayt ochilmay qoladi. Prototip esa kalitlarsiz ham ko'rinishi kerak:
 * shuning uchun har kirish nuqtasida avval shu tekshiriladi.
 */
export function supabaseSozlanganmi(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

/** Foydalanuvchiga ko'rsatiladigan izoh — bir joyda tursin. */
export const SUPABASE_YOQ =
  'Supabase ulanmagan: .env.local da NEXT_PUBLIC_SUPABASE_URL va NEXT_PUBLIC_SUPABASE_ANON_KEY yo‘q.'
