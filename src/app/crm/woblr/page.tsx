import Link from 'next/link'
import { talabProfil } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { supabaseSozlanganmi } from '@/lib/supabase/env'
import { Card, CardHeader, Badge, Empty } from '@/components/ui'
import { Sarlavha, Ulanmagan } from '@/components/crm'
import { Maydon, kirishKlass } from '@/components/forma'
import { davrNomi, joriyDavr } from '@/lib/format'
import type { LeaderboardRow } from '@/lib/types'

export const metadata = { title: 'WOBLR' }
export const dynamic = 'force-dynamic'

/**
 * WOBLR reytingi. Ball darsda davomat bilan birga beriladi
 * (/crm/davomat). Reyting funksiya orqali olinadi: o'quvchi butun
 * guruhning ballini ko'radi, lekin telefon, qarz, davomat — yo'q.
 */
export default async function Woblr({
  searchParams,
}: {
  searchParams: Promise<{ guruh?: string; davr?: string }>
}) {
  const profil = await talabProfil()
  if (!supabaseSozlanganmi()) return <Ulanmagan nom="WOBLR" />

  const s = await searchParams
  const supabase = await createClient()

  // RLS: ustozga o'z guruhlari, o'quvchiga o'zi o'qiydigan guruhlar
  const { data: guruhlar } = await supabase.from('groups').select('id, nom').eq('holat', 'faol').order('nom')
  const gList = guruhlar ?? []

  const guruh = gList.find((g) => g.id === s.guruh)?.id ?? (profil.rol === 'ustoz' || profil.rol === 'oquvchi' ? gList[0]?.id : undefined)
  const davr = s.davr === 'hammasi' ? null : /^\d{4}-\d{2}$/.test(s.davr ?? '') ? s.davr! : joriyDavr()

  const { data } = await supabase.rpc('woblr_leaderboard', { p_group: guruh ?? null, p_davr: davr })
  const reyting = (data ?? []) as LeaderboardRow[]

  const { data: maxBall } = await supabase.from('settings').select('qiymat').eq('kalit', 'woblr.max_ball_dars').maybeSingle()

  return (
    <div className="flex flex-col gap-4 px-5 py-5 lg:px-7">
      <Sarlavha
        nom="WOBLR reytingi"
        izoh={`${guruh ? gList.find((g) => g.id === guruh)?.nom : 'Butun markaz'} · ${davr ? davrNomi(davr) : 'hamma vaqt'}`}
      />

      <form className="flex flex-wrap items-end gap-2.5">
        <Maydon nom="Guruh">
          <select name="guruh" defaultValue={guruh ?? ''} className={kirishKlass}>
            {profil.rol !== 'ustoz' && profil.rol !== 'oquvchi' && <option value="">Butun markaz</option>}
            {gList.map((g) => (
              <option key={g.id} value={g.id}>{g.nom}</option>
            ))}
          </select>
        </Maydon>
        <Maydon nom="Oy">
          <select name="davr" defaultValue={davr ?? 'hammasi'} className={kirishKlass}>
            <option value={joriyDavr()}>{davrNomi(joriyDavr())}</option>
            {davr && davr !== joriyDavr() && <option value={davr}>{davrNomi(davr)}</option>}
            <option value="hammasi">Hamma vaqt</option>
          </select>
        </Maydon>
        <button type="submit" className="min-h-11 rounded-[9px] border border-line px-5 text-[13.5px] text-ink-2 hover:text-ink">
          Ko‘rsatish
        </button>
      </form>

      <Card className="flex flex-col">
        <CardHeader title="Reyting" meta={`${reyting.length} o‘quvchi`} />
        {reyting.length === 0 ? (
          <div className="px-5 pb-5">
            <Empty>Bu davrda hali ball berilmagan. Ball davomat ekranida, dars paytida qo‘yiladi.</Empty>
          </div>
        ) : (
          <ol>
            {reyting.map((r) => (
              <li key={r.student_id} className="flex items-center gap-3 border-t border-line-soft px-5 py-3">
                <span
                  className={`tnum flex size-9 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-display)] text-[14px] font-bold ${
                    r.orin <= 3 ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-ink-3'
                  }`}
                >
                  {r.orin}
                </span>
                {profil.rol === 'oquvchi' ? (
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{r.fish}</span>
                ) : (
                  <Link href={`/crm/oquvchilar/${r.student_id}`} className="min-w-0 flex-1 truncate text-[13.5px] font-semibold hover:text-brand">
                    {r.fish}
                  </Link>
                )}
                <Badge ton={r.ball > 0 ? 'accent' : 'brand'}>
                  {r.ball > 0 ? `+${r.ball}` : r.ball}
                </Badge>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <p className="text-[12px] text-ink-3">
        Bir darsda eng ko‘p ball: {maxBall?.qiymat != null ? String(maxBall.qiymat) : '[ANIQLANMAGAN]'} ·
        bazadagi chegara −10…+10.
      </p>
    </div>
  )
}
