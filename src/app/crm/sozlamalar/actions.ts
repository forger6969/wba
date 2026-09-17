'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { talabRol } from '@/lib/auth'
import { matn, xabarliYol, xatoMatni } from '@/lib/kiritish'
import type { AccountStatus, UserRole } from '@/lib/types'

const YOL = '/crm/sozlamalar'

/**
 * Formadagi matnni JSON qiymatga aylantiradi. Bo'sh — null, ya'ni
 * [ANIQLANMAGAN]: bilinmagan raqam o'rniga taxmin yozilmaydi.
 */
function qiymatOqi(xom: string): unknown {
  const s = xom.trim()
  if (s === '' || s === 'null') return null
  if (/^-?\d+(\.\d+)?$/.test(s.replace(/\s/g, ''))) return Number(s.replace(/\s/g, ''))
  if (s === 'true' || s === 'false') return s === 'true'
  if (s.startsWith('{') || s.startsWith('[')) {
    try {
      return JSON.parse(s)
    } catch {
      return s
    }
  }
  return s
}

export async function sozlamaSaqla(fd: FormData) {
  const profil = await talabRol('admin', 'direktor')

  const kalit = matn(fd.get('kalit'))
  if (!kalit) redirect(YOL)

  const supabase = await createClient()
  const { error } = await supabase
    .from('settings')
    .update({ qiymat: qiymatOqi(String(fd.get('qiymat') ?? '')), ozgartirdi: profil.id })
    .eq('kalit', kalit!)
  if (error) redirect(xabarliYol(YOL, { xato: xatoMatni(error) }))

  revalidatePath('/crm', 'layout')
  redirect(xabarliYol(YOL, { ok: `${kalit} saqlandi.` }))
}

const ROLLAR: UserRole[] = ['admin', 'direktor', 'qabulxona', 'ustoz', 'oquvchi']

/**
 * Xodimning roli, holati va ustoz yozuviga bog'lanishi.
 * O'z hisobingizni o'zgartirib bo'lmaydi — tasodifan o'zini
 * tizimdan chiqarib qo'ymaslik uchun.
 */
export async function xodimSaqla(fd: FormData) {
  const profil = await talabRol('admin', 'direktor')

  const id = matn(fd.get('id'))
  const rol = ROLLAR.find((r) => r === fd.get('rol'))
  const holat: AccountStatus = fd.get('holat') === 'bloklangan' ? 'bloklangan' : 'faol'
  const ustoz = matn(fd.get('teacher_id'))

  if (!id || !rol) redirect(xabarliYol(YOL, { xato: 'Rol noto‘g‘ri.' }))
  if (id === profil.id) redirect(xabarliYol(YOL, { xato: 'O‘z hisobingizning rolini bu yerdan o‘zgartirib bo‘lmaydi.' }))

  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update({ rol: rol!, holat }).eq('id', id!)
  if (error) redirect(xabarliYol(YOL, { xato: xatoMatni(error) }))

  // Ustoz yozuvi: avval eski bog'lanish uziladi, keyin yangisi qo'yiladi
  const { error: e1 } = await supabase.from('teachers').update({ profile_id: null }).eq('profile_id', id!)
  if (e1) redirect(xabarliYol(YOL, { xato: xatoMatni(e1) }))
  if (ustoz) {
    const { error: e2 } = await supabase.from('teachers').update({ profile_id: id! }).eq('id', ustoz)
    if (e2) redirect(xabarliYol(YOL, { xato: xatoMatni(e2) }))
  }

  revalidatePath('/crm', 'layout')
  redirect(xabarliYol(YOL, { ok: 'Xodim saqlandi.' }))
}
