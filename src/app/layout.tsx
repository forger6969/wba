import type { Metadata, Viewport } from 'next'
import { Archivo, Manrope, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  weight: ['600', '700', '800', '900'],
  variable: '--font-archivo',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wba.uz'),
  title: {
    default: 'World Bridge Academy — Toshkentda o‘quv markazi',
    template: '%s · World Bridge Academy',
  },
  description:
    '2018 yildan beri Toshkentda. Sakkiz yo‘nalish, guruhda 12 kishidan ortiq emas, ' +
    'birinchi dars va daraja aniqlash bepul.',
  openGraph: {
    type: 'website',
    locale: 'uz_UZ',
    siteName: 'World Bridge Academy',
  },
}

export const viewport: Viewport = {
  themeColor: '#0D0A09',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={`${archivo.variable} ${manrope.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
