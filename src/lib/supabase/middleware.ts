import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseSozlanganmi } from './env'

/**
 * CRM butunlay /crm ostida turadi.
 * Keyinchalik app.wba.uz → /crm rewrite'i bilan ajratiladi
 * (next.config.ts dagi rewrites qismiga qarang).
 */
const CRM_PREFIX = '/crm'

/**
 * Server Component'lar (getProfile, auth.ts) shu header orqali
 * tasdiqlangan foydalanuvchi ID'sini oladi — auth.getUser() ni QAYTA
 * chaqirib, Supabase Auth'ga ikkinchi tarmoq so'rovi yubormaslik uchun
 * (har sahifada, har navigatsiyada — sekinlikning katta qismi shu
 * yerdan edi). Xavfsizlik: mijozdan kelgan asl qiymat pastda DARHOL
 * o'chiriladi — faqat shu funksiya, getUser() haqiqatan tasdiqlagandan
 * KEYIN, qayta yozadi.
 */
const FOYDALANUVCHI_SARLAVHA = 'x-wba-user-id'

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.delete(FOYDALANUVCHI_SARLAVHA)

  let response = NextResponse.next({ request: { headers: requestHeaders } })

  /* Kalitlar hali qo'yilmagan — sessiyaga tegmaymiz. Aks holda
     bu yerdagi xato butun saytni yiqitadi. Sahifalarning o'zi
     "Supabase ulanmagan" holatini ko'rsatadi. */
  if (!supabaseSozlanganmi()) return response

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: requestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // MUHIM: getClaims() bilan getUser() orasida hech narsa bo'lmasin —
  // sessiya shu yerda yangilanadi.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user && pathname.startsWith(CRM_PREFIX)) {
    const url = request.nextUrl.clone()
    url.pathname = '/kirish'
    url.searchParams.set('keyin', pathname)
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/kirish') {
    const url = request.nextUrl.clone()
    // /crm har kimni o'z paneliga yuboradi (o'quvchi — o'z sahifasiga).
    // Dashboardga yuborilsa o'quvchi "ochiq emas" xabarini ko'rardi.
    url.pathname = '/crm'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (user) requestHeaders.set(FOYDALANUVCHI_SARLAVHA, user.id)

  // Cookie yangilanishlari (token refresh) yuqorida `response`ga
  // to'planib qolgan bo'lishi mumkin — yangi headerli response'ga
  // ko'chiramiz, aks holda sessiya cookie'lari yo'qolib qoladi.
  const yakuniy = NextResponse.next({ request: { headers: requestHeaders } })
  response.cookies.getAll().forEach((c) => yakuniy.cookies.set(c))
  return yakuniy
}
