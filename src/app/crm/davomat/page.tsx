import Link from 'next/link'
import { talabProfil, getUstoz } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { supabaseSozlanganmi } from '@/lib/supabase/env'
import { Card, Badge, Empty } from '@/components/ui'
import { Sarlavha, Ulanmagan } from '@/components/crm'
import { IconAttendance } from '@/components/icons'
import { sana, vaqt, jadval, bugunToshkent } from '@/lib/format'
import type { BugungiDars } from '@/lib/types'

export const metadata = { title: 'Davomat' }
export const dynamic = 'force-dynamic'

export default async function Davomat() {
  await talabProfil()
  if (!supabaseSozlanganmi()) return <Ulanmagan nom="Davomat" />

  const ustoz = await getUstoz()
  const supabase = await createClient()
  const bugun = bugunToshkent()

  /* v_bugungi_darslar security_invoker — ustozga faqat o'z guruhlari
     ko'rinadi, adminga hammasi. */
  const { data: darslar } = await supabase
    .from('v_bugungi_darslar')
    .select('*')
    .order('boshlanish')

  const dList = (darslar ?? []) as unknown as BugungiDars[]

  return (
    <div className="flex flex-col gap-4 px-5 py-5 lg:px-7">
      <Sarlavha
        nom="Bugungi darslar"
        izoh={`${sana(bugun)}${ustoz ? ` · ${ustoz.ism}` : ''}`}
      />

      {dList.length === 0 ? (
        <Card className="p-5">
          <Empty>
            Bugun dars yo‘q.
            {ustoz
              ? ' Guruhingiz jadvali boshqa kunga to‘g‘ri kelsa, o‘sha kuni shu yerda chiqadi.'
              : ' Bugunga to‘g‘ri keladigan faol guruh topilmadi.'}
          </Empty>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {dList.map((d) => (
            <li key={d.group_id}>
              <Link
                href={`/crm/davomat/${d.group_id}`}
                className="flex items-center gap-4 rounded-[12px] border border-line bg-surface px-4 py-3.5 transition hover:border-ink-3"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-brand">
                  <IconAttendance size={19} />
                </span>

                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-[14px] font-semibold">{d.nom}</span>
                  <span className="font-[family-name:var(--font-mono)] text-[11.5px] text-ink-3">
                    {vaqt(d.boshlanish)}–{vaqt(d.tugash)} · {d.oquvchilar} o‘quvchi
                  </span>
                </span>

                <Badge ton={d.belgilangan ? 'ok' : 'accent'} nuqta>
                  {d.belgilangan ? 'belgilangan' : 'kutilmoqda'}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="lbl">
        {dList.length > 0 &&
          `Jadval: ${jadval(dList[0].boshlanish, dList[0].tugash, dList[0].kun_turi)}`}
      </p>
    </div>
  )
}
