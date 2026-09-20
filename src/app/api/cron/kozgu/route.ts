import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { kozguniYoz } from '@/lib/kozgu'

/**
 * BAZA → SHEETS KO'ZGUSI (har 3 soatda, 0024 dagi pg_cron chaqiradi).
 *
 * Ko'zgu faqat O'QISH uchun: jadvalga yozilgani bazaga qaytmaydi.
 * Shuning uchun begona chaqiruvdan zarar yo'q — baribir o'sha ma'lumot
 * qayta yoziladi. Shunga qaramay tez-tez chaqirib Google kvotasini
 * yeb qo'ymasin: kalitsiz chaqiruv 2 soatda bir martadan ko'p emas.
 * Qo'lda/darhol: Authorization: Bearer <CRON_SIR>.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BELGI = 'kozgu.oxirgi'

export async function POST(req: NextRequest) {
  const sir = process.env.CRON_SIR
  const qolda = Boolean(sir) && req.headers.get('authorization') === `Bearer ${sir}`
  const db = createAdminClient()

  if (!qolda) {
    const { data } = await db.from('settings').select('qiymat').eq('kalit', BELGI).maybeSingle()
    const oxirgi = typeof data?.qiymat === 'string' ? Date.parse(data.qiymat) : 0
    if (oxirgi && Date.now() - oxirgi < 2 * 60 * 60 * 1000) {
      return NextResponse.json({ ok: true, sabab: 'yaqinda yangilangan' }, { status: 202 })
    }
  }

  try {
    const natija = await kozguniYoz()
    await db.from('settings').upsert({
      kalit: BELGI,
      qiymat: new Date().toISOString(),
      tavsif: 'Sheets ko‘zgusi oxirgi yangilangan vaqt (/api/cron/kozgu)',
    })
    return NextResponse.json({ ok: true, natija })
  } catch (e) {
    const matn = e instanceof Error ? e.message : String(e)
    console.error('[kozgu]', matn)
    return NextResponse.json({ ok: false, sabab: matn }, { status: 500 })
  }
}
