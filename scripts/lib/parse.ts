/** Sheets'dagi "iflos" matnni toza qiymatga aylantiruvchi funksiyalar. */

export type KunTuri = 'toq' | 'juft' | 'har_kuni'

/** "650,000" · "650 000" · "650000.00" → 650000 */
export function pulga(v: unknown): number {
  if (typeof v === 'number') return Math.round(v)
  const s = String(v ?? '').replace(/[^\d.,-]/g, '')
  if (!s) return 0
  const n = Number(s.replace(/\s/g, '').replace(/,/g, ''))
  return Number.isFinite(n) ? Math.round(n) : 0
}

/** "+998-90-968-07-12" · "901234567" → "+998901234567" | null */
export function telefonga(v: unknown): string | null {
  const raqam = String(v ?? '').replace(/\D/g, '')
  if (raqam.length === 9) return `+998${raqam}`
  if (raqam.length === 12 && raqam.startsWith('998')) return `+${raqam}`
  if (raqam.length === 13 && raqam.startsWith('9998')) return `+${raqam.slice(1)}`
  return null
}

/** "15.09.2026" · "2026-09-15" · Excel seriyasi → "2026-09-15" | null */
export function sanaga(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null

  if (typeof v === 'number' && v > 20000 && v < 60000) {
    // Excel/Sheets sana seriyasi (1899-12-30 dan boshlab)
    const ms = (v - 25569) * 86400 * 1000
    return new Date(ms).toISOString().slice(0, 10)
  }

  const s = String(v).trim()

  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`

  m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`

  return null
}

/** "2026-09" formatiga keltiradi */
export function davrga(v: unknown): string | null {
  const s = String(v ?? '').trim()
  const m = s.match(/(\d{4})[-/](\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}`
  const sana = sanaga(v)
  return sana ? sana.slice(0, 7) : null
}

const USUL_MAP: Record<string, 'naqd' | 'karta' | 'click' | 'payme'> = {
  naqd: 'naqd', nal: 'naqd', cash: 'naqd', наличные: 'naqd',
  karta: 'karta', plastik: 'karta', card: 'karta', карта: 'karta',
  click: 'click', klik: 'click',
  payme: 'payme', payma: 'payme',
}

/** To'lov usulini aniqlaydi. Aniqlanmasa — null (qo'lda tekshiriladi). */
export function usulga(v: unknown): 'naqd' | 'karta' | 'click' | 'payme' | null {
  const s = String(v ?? '').trim().toLowerCase()
  if (!s) return null
  for (const [kalit, qiymat] of Object.entries(USUL_MAP)) {
    if (s.includes(kalit)) return qiymat
  }
  return null
}

/** Bosqich nomlaridagi qisqartmalarni to'g'rilaydi */
const BOSQICH_MAP: Record<string, string> = {
  'pre-inter': 'Pre-Intermediate',
  'pre inter': 'Pre-Intermediate',
  'pre-intermediate': 'Pre-Intermediate',
  'pre-ielts': 'Pre-IELTS',
  'inter': 'Intermediate',
  'intermediate': 'Intermediate',
  'elementary': 'Elementary',
  'beginner': 'Beginner',
  'starter': 'Starter',
  'ielts': 'IELTS',
}

export function bosqichNormal(nom: string): string {
  const kalit = nom.trim().toLowerCase()
  return BOSQICH_MAP[kalit] ?? nom.trim()
}

/** Guruh/bosqich nomidan yo'nalishni topadi */
export function yonalishAniqla(nom: string): string | null {
  const s = nom.toLowerCase()
  if (/starter|beginner|elementary|inter|ielts|english|ingliz/.test(s)) return 'ingliz-tili'
  if (/rus|русск/.test(s)) return 'rus-tili'
  if (/arab/.test(s)) return 'arab-tili'
  if (/matem|matma|математ/.test(s)) return 'matematika'
  if (/pochemuchka|почемучка/.test(s)) return 'pochemuchka'
  if (/\bai\b|sun'?iy|it\b/.test(s)) return 'ai-it'
  if (/scratch/.test(s)) return 'scratch'
  if (/dastur|web|html|css|javascript/.test(s)) return 'web-dasturlash'
  return null
}

export type GuruhTavsifi = {
  xom: string
  nom: string
  ustoz: string | null
  boshlanish: string | null
  tugash: string | null
  kunTuri: KunTuri
  yonalish: string | null
}

/**
 * "Beginner · Diana · 08:30-10:00, Toq kun" ni qismlarga ajratadi.
 * Format buzilgan bo'lsa ham bor narsani oladi.
 */
export function guruhParse(xom: string): GuruhTavsifi | null {
  const s = xom.trim()
  if (!s || s.length < 3) return null

  const qismlar = s.split(/\s*·\s*/)
  const nom = bosqichNormal(qismlar[0] ?? s)
  const ustoz = qismlar[1]?.trim() || null
  const vaqtQismi = qismlar.slice(2).join(' ')

  const vaqt = vaqtQismi.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/)
  const kun = /juft/i.test(vaqtQismi) ? 'juft' : /har\s*kun/i.test(vaqtQismi) ? 'har_kuni' : 'toq'

  const pad = (t: string) => (t.length === 4 ? `0${t}` : t)

  return {
    xom: s,
    nom,
    ustoz,
    boshlanish: vaqt ? pad(vaqt[1]) : null,
    tugash: vaqt ? pad(vaqt[2]) : null,
    kunTuri: kun as KunTuri,
    yonalish: yonalishAniqla(nom),
  }
}

/** "A + B" — bitta katakda ikkita guruh turgan holat */
export function guruhlarniAjrat(xom: unknown): string[] {
  const s = String(xom ?? '').trim()
  if (!s) return []
  return s
    .split(/\s+\+\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 2)
}

/** "Madina Abduganiyeva (S015)" → { fish, id } */
export function ismVaId(xom: unknown): { fish: string; id: string | null } {
  const s = String(xom ?? '').trim()
  const m = s.match(/^(.*?)\s*\((S\d+)\)\s*$/i)
  if (m) return { fish: m[1].trim(), id: m[2].toUpperCase() }
  return { fish: s, id: null }
}

/** Axlat qatorlarni tashlab yuborish uchun */
export function axlatmi(fish: string): boolean {
  const s = fish.trim().toLowerCase()
  if (!s || s.length < 2) return true
  if (/^namuna|^misol|^test|^sdfd|^dars soati|^jami|^umumiy/.test(s)) return true
  if (/^\d+$/.test(s)) return true
  if (/^[^a-zA-Zа-яА-ЯёЁʻʼ'`]+$/.test(s)) return true
  return false
}
