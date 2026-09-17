import Link from 'next/link'
import { talabRol } from '@/lib/auth'
import { supabaseSozlanganmi } from '@/lib/supabase/env'
import { Sarlavha, Ulanmagan } from '@/components/crm'
import { Xabar } from '@/components/forma'
import { IconArrowLeft } from '@/components/icons'
import { guruhQosh } from '../actions'
import { GuruhFormasi } from '../forma'

export const metadata = { title: 'Yangi guruh' }
export const dynamic = 'force-dynamic'

export default async function YangiGuruh({ searchParams }: { searchParams: Promise<{ xato?: string }> }) {
  await talabRol('admin', 'direktor')
  if (!supabaseSozlanganmi()) return <Ulanmagan nom="Yangi guruh" />
  const { xato } = await searchParams

  return (
    <div className="flex max-w-2xl flex-col gap-4 px-5 py-5 lg:px-7">
      <Link href="/crm/guruhlar" className="flex items-center gap-2 text-[13px] text-ink-3 hover:text-ink">
        <IconArrowLeft size={15} /> Guruhlar
      </Link>
      <Sarlavha nom="Yangi guruh" izoh="ID o‘zi beriladi" />
      <Xabar xato={xato} />
      <GuruhFormasi amal={guruhQosh} tugma="Guruhni ochish" />
    </div>
  )
}
