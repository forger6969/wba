import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // Server action'lar faqat shu domenlardan chaqirilsin
    serverActions: {
      allowedOrigins: ['localhost:3000', 'wba.uz', 'app.wba.uz'],
    },
  },

  async rewrites() {
    return {
      beforeFiles: [
        // app.wba.uz/... → /crm/...
        // Shu tufayli CRM alohida subdomenda ko'rinadi,
        // lekin kod bazasi bitta bo'lib qoladi.
        {
          source: '/:path*',
          has: [{ type: 'host', value: 'app.wba.uz' }],
          destination: '/crm/:path*',
        },
      ],
      afterFiles: [],
      fallback: [],
    }
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ]
  },
}

export default nextConfig
