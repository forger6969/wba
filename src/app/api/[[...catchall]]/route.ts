import { NextResponse } from 'next/server'

/**
 * /api/* ostida hech qanday aniq route mos kelmasa — shu ishlaydi.
 *
 * NEGA KERAK: api.wbalc.uz butunlay /api/* ga rewrite qilinadi
 * (next.config.ts). Shu fayl bo'lmasa, mos route topilmagan har bir
 * so'rov (masalan /health, yoki bo'sh "/") ildizdagi not-found.tsx'ga
 * tushib, saytning HTML/branding sahifasini qaytarardi — api domeni
 * hech qachon frontend ko'rsatmasligi kerak, faqat JSON.
 */
function javobYoq() {
  return NextResponse.json({ xato: 'topilmadi' }, { status: 404 })
}

export const GET = javobYoq
export const POST = javobYoq
export const PUT = javobYoq
export const PATCH = javobYoq
export const DELETE = javobYoq
