import { redirect } from 'next/navigation'
import { talabProfil, getUstoz } from '@/lib/auth'
import { boshSahifa } from '@/lib/menyu'

/**
 * Kim kirdi — o'shanga qarab. Ustoz (boshqaruv huquqisiz) to'g'ridan-to'g'ri
 * davomatga tushadi: botda ham u faqat o'z ishini ko'radi.
 */
export default async function Crm() {
  const profil = await talabProfil()
  const ustoz = await getUstoz()
  redirect(boshSahifa(profil.rol, Boolean(ustoz)))
}
