import { redirect } from 'next/navigation'
import { talabProfil, getUstoz } from '@/lib/auth'
import { boshSahifa } from '@/lib/menyu'

/* Har so'rovda qaytadan hisoblanadi. Aks holda kalitlar qo'yilmagan
   holatda qurilsa (`supabaseSozlanganmi()` = false) bu sahifa cookie'ga
   tegmaydi, Next uni statik deb bilib "/kirish" ga yo'naltirishni
   qotirib qo'yadi — kirgan odam ham aylanma yo'naltirishga tushadi. */
export const dynamic = 'force-dynamic'

/**
 * Kim kirdi — o'shanga qarab. Ustoz (boshqaruv huquqisiz) to'g'ridan-to'g'ri
 * davomatga tushadi: botda ham u faqat o'z ishini ko'radi.
 */
export default async function Crm() {
  const profil = await talabProfil()
  const ustoz = await getUstoz()
  redirect(boshSahifa(profil.rol, Boolean(ustoz)))
}
