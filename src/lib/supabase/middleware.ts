import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * CRM butunlay /crm ostida turadi.
 * Keyinchalik app.wba.uz → /crm rewrite'i bilan ajratiladi
 * (next.config.ts dagi rewrites qismiga qarang).
 */
const CRM_PREFIX = '/crm'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

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
          response = NextResponse.next({ request })
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
    url.pathname = '/crm/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
