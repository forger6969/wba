'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { talabRol } from '@/lib/auth'
import { matn, sanaOqi, telefonOqi, xabarliYol, xatoMatni } from '@/lib/kiritish'
import type { LeadSource, LeadStatus } from '@/lib/types'

function qaytish(fd: FormData): string {
  const y = String(fd.get('qaytish') ?? '')
  return y.startsWith('/crm/probniylar') ? y : '/crm/probniylar'
}

const MANBALAR: LeadSource[] = ['sayt', 'telegram', 'instagram', 'tavsiya', 'boshqa']

/** Botdagi /probniy: ism → tug'ilgan sana → telefon → guruh. */
export async function probniyQosh(fd: FormData) {
  await talabRol('admin', 'direktor', 'qabulxona')
  const yol = qaytish(fd)

  const ism = matn(fd.get('ism'))
  const telefon = telefonOqi(fd.get('telefon'))
  if (!ism) redirect(xabarliYol(yol, { xato: 'Ismini yozing.' }))
  if (!telefon) redirect(xabarliYol(yol, { xato: 'Telefon kerak. Masalan: 90 123 45 67' }))

  const supabase = await createClient()
  const { error } = await supabase.from('leads').insert({
    ism: ism!,
    telefon: telefon!,
    tugilgan_sana: sanaOqi(fd.get('tugilgan_sana')),
    group_id: matn(fd.get('group_id')),
    sinov_sana: sanaOqi(fd.get('sinov_sana')),
    manba: MANBALAR.find((m) => m === fd.get('manba')) ?? 'boshqa',
    izoh: matn(fd.get('izoh')),
    holat: 'yangi',
  })
  if (error) redirect(xabarliYol(yol, { xato: xatoMatni(error) }))

  revalidatePath('/crm/probniylar')
  redirect(xabarliYol(yol, { ok: `${ism} probniyga yozildi.` }))
}

/** Kelmadi / Rad etdi / qaytadan kutilmoqda. "Doimiy" — alohida amal. */
export async function probniyHolat(fd: FormData) {
  await talabRol('admin', 'direktor', 'qabulxona')
  const yol = qaytish(fd)

  const id = matn(fd.get('id'))
  const holat = (['yangi', 'kelmadi', 'rad'] as LeadStatus[]).find((h) => h === fd.get('holat'))
  if (!id || !holat) redirect(xabarliYol(yol, { xato: 'Holat noto‘g‘ri.' }))

  const supabase = await createClient()
  const { error } = await supabase.from('leads').update({ holat: holat! }).eq('id', id!).is('student_id', null)
  if (error) redirect(xabarliYol(yol, { xato: xatoMatni(error) }))

  revalidatePath('/crm/probniylar')
  redirect(xabarliYol(yol, { ok: 'Holat o‘zgardi.' }))
}

export async function probniyGuruh(fd: FormData) {
  await talabRol('admin', 'direktor', 'qabulxona')
  const yol = qaytish(fd)

  const id = matn(fd.get('id'))
  if (!id) redirect(yol)

  const supabase = await createClient()
  const { error } = await supabase
    .from('leads')
    .update({ group_id: matn(fd.get('group_id')), sinov_sana: sanaOqi(fd.get('sinov_sana')) })
    .eq('id', id!)
  if (error) redirect(xabarliYol(yol, { xato: xatoMatni(error) }))

  revalidatePath('/crm/probniylar')
  redirect(xabarliYol(yol, { ok: 'Guruh va sinov kuni saqlandi.' }))
}

/**
 * Doimiy qilish — O'quvchilar + Qatnashuvga o'tkazadi (Y_Probniy.js:
 * _probOtkaz). Qoida bazada: guruh tanlanmagan bo'lsa o'tkazilmaydi.
 */
export async function probniyDoimiy(fd: FormData) {
  await talabRol('admin', 'direktor', 'qabulxona')
  const yol = qaytish(fd)

  const id = matn(fd.get('id'))
  if (!id) redirect(yol)

  const supabase = await createClient()
  const { data: studentId, error } = await supabase.rpc('probniy_doimiy', {
    p_lead: id!,
    p_boshlandi: sanaOqi(fd.get('boshlandi')),
  })
  if (error) redirect(xabarliYol(yol, { xato: xatoMatni(error) }))

  revalidatePath('/crm', 'layout')
  redirect(xabarliYol(`/crm/oquvchilar/${studentId}`, { ok: `Doimiy o‘quvchi bo‘ldi: ${studentId}` }))
}
