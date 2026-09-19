import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Statik fayllar va rasmlardan tashqari hamma so'rov.
     * Ommaviy sayt ham o'tadi — sessiya bor-yo'qligini bilish uchun
     * (masalan, header'da "Tizimga kirish" yoki "Dashboard" ko'rsatish).
     * /api/telegram — bot webhook'i: sessiya yo'q, tezlik uchun o'tkazib yuboriladi.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/telegram|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
