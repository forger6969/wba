import Link from 'next/link'
import { redirect } from 'next/navigation'
import { talabProfil, getUstoz, ROL_NOMI, staffmi, tasdiqlaydimi } from '@/lib/auth'
import { menyular, type MenyuBand } from '@/lib/menyu'
import { createClient } from '@/lib/supabase/server'
import { supabaseSozlanganmi } from '@/lib/supabase/env'
import { Logo } from '@/components/ui'
import { bosh } from '@/lib/format'
import { IconLogout, IconChevronDown } from '@/components/icons'
import { TemaTugma } from '@/components/tema'
import { NavBand } from '@/components/nav-band'

async function chiqish() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/kirish')
}

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const profil = await talabProfil()
  const ustoz = await getUstoz()
  const bolimlar = menyular(profil.rol, Boolean(ustoz))

  /* Tasdiqlanmagan to'lovlar soni — pul ko'radiganlarga.
     Ustozga umuman chiqmaydi (botdagi qoida). */
  let tasdiqlanmagan = 0
  if (staffmi(profil.rol) && supabaseSozlanganmi()) {
    const supabase = await createClient()
    const { count } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('bekor', false)
      .eq('tasdiqlangan', false)
    tasdiqlanmagan = count ?? 0
  }

  const nishon = (band: MenyuBand) =>
    band.href.startsWith('/crm/tolovlar') ? tasdiqlanmagan : undefined

  /* Telefon uchun: eng kerakli 4 ta band + "Menyu" (qolgan hammasi).
     Pastki panelga 5 tadan ortig'i sig'maydi, bo'limlar esa ko'p. */
  const mobilBandlar = bolimlar
    .flatMap((b) => b.bandlar.filter((x) => x.mobil && x.tayyor))
    .slice(0, 4)

  /* Kim ekani — botdagi menyuMatni() kabi: ikki rol bo'lsa ikkalasi ham. */
  const kim = [
    ustoz ? `ustoz — ${ustoz.ism}` : null,
    tasdiqlaydimi(profil.rol) ? 'direktor' : null,
    profil.rol === 'admin' ? 'administrator' : null,
    profil.rol === 'qabulxona' ? 'qabulxona' : null,
  ].filter((x): x is string => Boolean(x))

  return (
    <div className="flex min-h-dvh">
      <aside className="flex w-56 shrink-0 flex-col gap-6 border-r border-line bg-surface px-3.5 py-5 max-lg:hidden">
        <Link href="/crm" className="px-2">
          <Logo />
        </Link>

        <nav className="flex flex-col gap-5">
          {bolimlar.map((bolim) => (
            <div key={bolim.nom} className="flex flex-col gap-0.5">
              <span className="lbl px-3 pb-1">{bolim.nom}</span>
              {bolim.bandlar.map((band) => (
                <NavBand
                  key={band.href}
                  href={band.href}
                  nom={band.nom}
                  tayyor={band.tayyor}
                  icon={<band.Icon size={17} />}
                  nishon={nishon(band)}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <div className="flex items-center gap-2.5 rounded-[10px] border border-line bg-surface px-3 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand font-[family-name:var(--font-display)] text-xs font-bold">
              {bosh(profil.ism)}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[12.5px] font-semibold">{profil.ism}</span>
              <span className="lbl text-[9px] text-brand">
                {kim.length ? kim.join(' · ') : ROL_NOMI[profil.rol]}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <form action={chiqish} className="flex-1">
              <button
                type="submit"
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-[13px] text-ink-3 transition hover:bg-surface-2 hover:text-ink"
              >
                <IconLogout size={17} />
                Chiqish
              </button>
            </form>
            <TemaTugma />
          </div>
        </div>
      </aside>

      {/* Telefon: tepada logotip, pastda asosiy bandlar */}
      <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between border-b border-line bg-surface px-4 py-2.5 lg:hidden">
        <Link href="/crm">
          <Logo size="sm" />
        </Link>
        <span className="lbl text-[9px] text-brand">
          {kim.length ? kim[0] : ROL_NOMI[profil.rol]}
        </span>
      </header>

      <nav
        aria-label="Asosiy menyu"
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
      >
        {mobilBandlar.map((band) => (
          <Link
            key={band.href}
            href={band.href}
            className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-1 text-ink-3 transition hover:text-ink"
          >
            <band.Icon size={18} />
            <span className="truncate text-[10.5px]">{band.nom}</span>
          </Link>
        ))}
        <Link
          href="/crm/menyu"
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-1 text-ink-3 transition hover:text-ink"
        >
          <IconChevronDown size={18} />
          <span className="truncate text-[10.5px]">Menyu</span>
        </Link>
      </nav>

      <main className="min-w-0 flex-1 max-lg:pt-14 max-lg:pb-16">{children}</main>
    </div>
  )
}
