import type { MetadataRoute } from 'next'

import { saytManzil } from '@/lib/markaz'

const SAYT = saytManzil()

/** CRM qidiruvga tushmasin, ommaviy sayt tushsin. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/crm', '/kirish'],
    },
    sitemap: `${SAYT}/sitemap.xml`,
  }
}
