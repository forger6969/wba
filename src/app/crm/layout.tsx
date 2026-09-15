import Link from 'next/link'
import { redirect } from 'next/navigation'
import { talabProfil, ROL_NOMI, staffmi } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui'
import { bosh } from '@/lib/format'
import type { UserRole } from '@/lib/types'
import {
  IconDashboard, IconStudents, IconGroups, IconTeacher, IconAttendance,
  IconWoblr, IconPayments, IconDebt, IconLeads, IconReports, IconSettings, IconLogout,
} from '@/components/icons'

type NavItem = {
  href: string
  nom: string
  Icon: (p: { size?: number; className?: string }) => React.ReactElement
  rollar: UserRole[]
}

const NAV: NavItem[] = [
  { href: '/crm/dashboard',   nom: 'Dashboard',   Icon: IconDashboard,  rollar: ['admin', 'qabulxona', 'ustoz', 'oquvchi'] },
  { href: '/crm/oquvchilar',  nom: 'O‘quvchilar', Icon: IconStudents,   rollar: ['admin', 'qabulxona', 'ustoz'] },
  { href: '/crm/guruhlar',    nom: 'Guruhlar',    Icon: IconGroups,     rollar: ['admin', 'qabulxona', 'ustoz'] },
  { href: '/crm/ustozlar',    nom: 'Ustozlar',    Icon: IconTeacher,    rollar: ['admin'] },
  { href: '/crm/davomat',     nom: 'Davomat',     Icon: IconAttendance, rollar: ['admin', 'ustoz'] },
  { href: '/crm/woblr',       nom: 'WOBLR',       Icon: IconWoblr,      rollar: ['admin', 'qabulxona', 'ustoz', 'oquvchi'] },
  { href: '/crm/tolovlar',    nom: 'To‘lovlar',   Icon: IconPayments,   rollar: ['admin', 'qabulxona'] },
  { href: '/crm/qarzdorlar',  nom: 'Qarzdorlar',  Icon: IconDebt,       rollar: ['admin', 'qabulxona'] },
  { href: '/crm/lidlar',      nom: 'Lidlar',      Icon: IconLeads,      rollar: ['admin', 'qabulxona'] },
  { href: '/crm/hisobotlar',  nom: 'Hisobotlar',  Icon: IconReports,    rollar: ['admin', 'qabulxona'] },
  { href: '/crm/sozlamalar',  nom: 'Sozlamalar',  Icon: IconSettings,   rollar: ['admin'] },
]

async function chiqish() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/kirish')
}

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const profil = await talabProfil()
  const menyu = NAV.filter((n) => n.rollar.includes(profil.rol))

  // Tasdiqlanmagan to'lovlar soni — faqat kassa ko'radigan raqam
  let tasdiqlanmagan = 0
  if (staffmi(profil.rol)) {
    const supabase = await createClient()
    const { count } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('bekor', false)
      .eq('tasdiqlangan', false)
    tasdiqlanmagan = count ?? 0
  }

  return (
    <div className="flex min-h-dvh">
      <aside className="flex w-56 shrink-0 flex-col gap-6 border-r border-line bg-[#120e0d] px-3.5 py-5 max-lg:hidden">
        <Link href="/crm/dashboard" className="px-2">
          <Logo />
        </Link>

        <nav className="flex flex-col gap-0.5">
          {menyu.map(({ href, nom, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-[13.5px] text-ink-2 transition hover:bg-surface-2 hover:text-ink"
            >
              <Icon size={17} />
              <span className="flex-1">{nom}</span>
              {href === '/crm/tolovlar' && tasdiqlanmagan > 0 && (
                <span className="tnum font-[family-name:var(--font-mono)] text-[11px] text-brand">
                  {tasdiqlanmagan}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <div className="flex items-center gap-2.5 rounded-[10px] border border-line bg-surface px-3 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand font-[family-name:var(--font-display)] text-xs font-bold">
              {bosh(profil.ism)}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[12.5px] font-semibold">{profil.ism}</span>
              <span className="lbl text-[9px] text-brand">{ROL_NOMI[profil.rol]}</span>
            </span>
          </div>

          <form action={chiqish}>
            <button
              type="submit"
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-[13px] text-ink-3 transition hover:bg-surface-2 hover:text-ink"
            >
              <IconLogout size={17} />
              Chiqish
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
