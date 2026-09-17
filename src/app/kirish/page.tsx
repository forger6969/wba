import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { supabaseSozlanganmi, SUPABASE_YOQ } from '@/lib/supabase/env'
import { Logo } from '@/components/ui'

export const metadata = { title: 'Tizimga kirish' }

const XATOLAR: Record<string, string> = {
  notogri: 'Email yoki parol noto‘g‘ri.',
  bosh: 'Email va parolni kiriting.',
  bloklangan: 'Hisobingiz vaqtincha to‘xtatilgan. Admin bilan bog‘laning.',
  huquq: 'Bu bo‘limga kirish huquqingiz yo‘q.',
  ulanmagan: SUPABASE_YOQ,
}

async function kirish(formData: FormData) {
  'use server'

  const email = String(formData.get('email') ?? '').trim()
  const parol = String(formData.get('parol') ?? '')
  const keyin = String(formData.get('keyin') ?? '') || '/crm/dashboard'

  if (!email || !parol) redirect('/kirish?xato=bosh')
  if (!supabaseSozlanganmi()) redirect('/kirish?xato=ulanmagan')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password: parol })

  if (error) redirect('/kirish?xato=notogri')
  redirect(keyin)
}

export default async function Kirish({
  searchParams,
}: {
  searchParams: Promise<{ xato?: string; keyin?: string }>
}) {
  const { xato, keyin } = await searchParams
  const ulangan = supabaseSozlanganmi()

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="flex w-full max-w-sm flex-col gap-7">
        <div className="flex flex-col items-center gap-5">
          <Logo size="lg" />
          <div className="flex flex-col items-center gap-1.5 text-center">
            <h1 className="h-display text-[26px]">Tizimga kirish</h1>
            <p className="text-[13.5px] text-ink-2">
              Hisobni markaz admini ochadi. Parolingizni bilmasangiz — admin bilan bog‘laning.
            </p>
          </div>
        </div>

        {xato && (
          <p
            role="alert"
            className="rounded-[10px] border border-brand bg-brand-soft px-4 py-3 text-[13px]"
          >
            {XATOLAR[xato] ?? 'Nimadir noto‘g‘ri ketdi. Qaytadan urinib ko‘ring.'}
          </p>
        )}

        {!ulangan && (
          <p className="rounded-[10px] border border-dashed border-line px-4 py-3.5 text-[12.5px] leading-relaxed text-ink-2">
            {SUPABASE_YOQ} Kalitlar qo‘yilmaguncha tizimga kirib bo‘lmaydi.
          </p>
        )}

        <form action={kirish} className="flex flex-col gap-3.5">
          <input type="hidden" name="keyin" value={keyin ?? ''} />

          <label className="flex flex-col gap-1.5">
            <span className="lbl">Email</span>
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="ism@wba.uz"
              className="min-h-12 rounded-[9px] border border-line bg-surface px-3.5 text-[14px] text-ink placeholder:text-ink-4"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="lbl">Parol</span>
            <input
              name="parol"
              type="password"
              autoComplete="current-password"
              required
              className="min-h-12 rounded-[9px] border border-line bg-surface px-3.5 text-[14px] text-ink"
            />
          </label>

          <button
            type="submit"
            disabled={!ulangan}
            className="mt-1 min-h-12 rounded-[9px] bg-brand text-[14.5px] font-bold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Kirish
          </button>
        </form>

        <Link href="/" className="text-center text-[13px] text-ink-3 hover:text-ink">
          ← Saytga qaytish
        </Link>
      </div>
    </div>
  )
}
