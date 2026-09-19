import type { MetadataRoute } from 'next'

import { saytManzil } from '@/lib/markaz'

const SAYT = saytManzil()

/** Ommaviy sahifalar. CRM ichki tizim — kiritilmaydi. */
export default function sitemap(): MetadataRoute.Sitemap {
  const bugun = new Date()
  return [
    { url: `${SAYT}/`, lastModified: bugun, changeFrequency: 'weekly', priority: 1 },
    { url: `${SAYT}/ariza`, lastModified: bugun, changeFrequency: 'monthly', priority: 0.8 },
  ]
}
