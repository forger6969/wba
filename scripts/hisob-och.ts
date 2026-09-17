/**
 * Tizimga kirish hisobini ochadi (yoki mavjudini yangilaydi).
 *
 *   npm run hisob -- --email jamshid@wba.uz --ism "Jamshid" --rol admin --ustoz U01
 *   npm run hisob -- --email farrux@wba.uz  --ism "Farrux"  --rol direktor
 *
 * O'zi ro'yxatdan o'tish o'chirilgan (config.toml: enable_signup = false),
 * hisobni faqat shu skript ochadi. Rol app_metadata ga yoziladi — uni
 * foydalanuvchi o'zi o'zgartira olmaydi (0008_rol_xavfsizligi.sql).
 *
 * --parol berilmasa tasodifiy parol yaratiladi va BIR MARTA ekranga
 * chiqariladi. U hech qayerga saqlanmaydi.
 *
 * --ustoz U01 — shu odamni Ustozlar jadvalidagi yozuvga bog'laydi.
 * "Ustozmi" degan savol rolga emas, shu bog'lanishga qaraydi: admin
 * ham, direktor ham ustoz bo'lishi mumkin (botdagidek).
 */

import { randomBytes } from 'node:crypto'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const ROLLAR = ['admin', 'direktor', 'qabulxona', 'ustoz', 'oquvchi'] as const
type Rol = (typeof ROLLAR)[number]

function arg(nom: string): string | undefined {
  const i = process.argv.indexOf(`--${nom}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function ishga() {
  const email = arg('email')?.trim().toLowerCase()
  const ism = arg('ism')?.trim()
  const rol = arg('rol') as Rol | undefined
  const ustoz = arg('ustoz')?.trim().toUpperCase()
  const berilganParol = arg('parol')

  if (!email || !ism || !rol) {
    throw new Error(
      'Kerak: --email, --ism, --rol. Masalan:\n' +
        '  npm run hisob -- --email jamshid@wba.uz --ism "Jamshid" --rol admin --ustoz U01',
    )
  }
  if (!ROLLAR.includes(rol)) {
    throw new Error(`Rol noto‘g‘ri: "${rol}". Mumkin: ${ROLLAR.join(', ')}`)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase kalitlari topilmadi (.env.local)')

  const db = createClient(url, key, { auth: { persistSession: false } })
  const parol = berilganParol ?? randomBytes(9).toString('base64url')

  // Bor hisobni qidiramiz — skript qayta ishga tushirilsa dublikat bo'lmasin
  const { data: royxat, error: xatoRoyxat } = await db.auth.admin.listUsers({ perPage: 1000 })
  if (xatoRoyxat) throw new Error(`Hisoblar ro‘yxati: ${xatoRoyxat.message}`)
  const bor = royxat.users.find((u) => u.email?.toLowerCase() === email)

  let userId: string
  if (bor) {
    const { error } = await db.auth.admin.updateUserById(bor.id, {
      ...(berilganParol ? { password: parol } : {}),
      user_metadata: { ism },
      app_metadata: { rol },
    })
    if (error) throw new Error(`Hisobni yangilash: ${error.message}`)
    userId = bor.id
  } else {
    const { data, error } = await db.auth.admin.createUser({
      email,
      password: parol,
      email_confirm: true,
      user_metadata: { ism },
      app_metadata: { rol },
    })
    if (error || !data.user) throw new Error(`Hisob ochish: ${error?.message}`)
    userId = data.user.id
  }

  // Profil trigger bilan ochiladi; mavjud hisobda esa rol va ism shu yerda yangilanadi
  const { error: xatoProfil } = await db.from('profiles').update({ ism, rol }).eq('id', userId)
  if (xatoProfil) throw new Error(`Profil: ${xatoProfil.message}`)

  if (ustoz) {
    const { data: t, error } = await db
      .from('teachers')
      .update({ profile_id: userId })
      .eq('id', ustoz)
      .select('id, ism')
    if (error) throw new Error(`Ustozga bog‘lash: ${error.message}`)
    if (!t?.length) throw new Error(`Ustoz topilmadi: ${ustoz} (avval ko‘chirish skriptini yuriting)`)
    console.log(`  ustoz: ${t[0].id} — ${t[0].ism}`)
  }

  console.log(`\n${bor ? 'Yangilandi' : 'Ochildi'}: ${email}`)
  console.log(`  ism:  ${ism}`)
  console.log(`  rol:  ${rol}`)
  if (!bor || berilganParol) {
    console.log(`  parol: ${parol}${berilganParol ? '' : '   ← bir marta ko‘rsatiladi, saqlab qo‘ying'}`)
  }
}

ishga().catch((e) => {
  console.error('\nXATO:', e instanceof Error ? e.message : e)
  process.exit(1)
})
