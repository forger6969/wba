import { pul, davrNomi, bugunToshkent } from '@/lib/format'
import type { ElonFiltr, ElonOluvchi, ElonTuri, TelegramKim } from '@/lib/types'

/** E'lon formasi — sahifa (ko'rib chiqish) va yuborish amali bir xil o'qisin. */

export const TURLAR: { qiymat: ElonTuri; nom: string }[] = [
  { qiymat: 'umumiy', nom: 'Umumiy e’lon' },
  { qiymat: 'tolov', nom: 'To‘lov eslatmasi' },
  { qiymat: 'test', nom: 'Oylik test' },
  { qiymat: 'majlis', nom: 'Majlis' },
]

/** Telegram'dagi xabar sarlavhasi */
export const SARLAVHA: Record<ElonTuri, string> = {
  umumiy: 'WBA · E’lon',
  tolov: 'WBA · To‘lov eslatmasi',
  test: 'WBA · Oylik test',
  majlis: 'WBA · Majlis',
}

export const KIMLAR: { qiymat: TelegramKim; nom: string }[] = [
  { qiymat: 'oquvchi', nom: 'O‘quvchilar' },
  { qiymat: 'ota_ona', nom: 'Ota-onalar' },
  { qiymat: 'ustoz', nom: 'Ustozlar' },
  { qiymat: 'xodim', nom: 'Xodimlar' },
]

export type ElonForma = { turi: ElonTuri; matn: string; kimga: TelegramKim[]; filtr: ElonFiltr; f: string }

type Manba = { get(k: string): unknown; getAll(k: string): unknown[] }

/** FormData yoki URLSearchParams — ikkalasida ham get/getAll bor */
export function elonFormadan(m: Manba): ElonForma {
  const turiXom = String(m.get('turi') ?? '')
  const turi = (TURLAR.find((t) => t.qiymat === turiXom)?.qiymat ?? 'umumiy') as ElonTuri
  const matn = String(m.get('matn') ?? '').trim().slice(0, 3500)
  const kimga = m.getAll('k').map(String).filter((k): k is TelegramKim => KIMLAR.some((x) => x.qiymat === k))
  const f = String(m.get('f') ?? 'hammasi')
  return { turi, matn, kimga: [...new Set(kimga)], filtr: filtrOqi(f), f }
}

/** "hammasi" | "qarzdor" | "guruh:G05" | "fan:ingliz-tili" */
export function filtrOqi(f: string): ElonFiltr {
  if (f === 'qarzdor') return { qarzdor: true }
  const [tur, qiymat] = f.split(':')
  if (tur === 'guruh' && /^[A-Za-z0-9_-]{1,20}$/.test(qiymat ?? '')) return { guruh: qiymat }
  if (tur === 'fan' && /^[a-z0-9-]{1,40}$/.test(qiymat ?? '')) return { fan: qiymat }
  return {}
}

/**
 * Andozalar: {ism} — oluvchining (ota-onaga — farzandining) ismi,
 * {qarz} — o'quvchining qarzi, {oy} — joriy oy.
 */
export function shaxsiyMatn(matn: string, a: Pick<ElonOluvchi, 'ism' | 'qarz'>): string {
  return matn
    .replaceAll('{ism}', a.ism)
    .replaceAll('{qarz}', a.qarz != null ? `${pul(Math.max(Number(a.qarz), 0))} so‘m` : '')
    .replaceAll('{oy}', davrNomi(bugunToshkent().slice(0, 7)).toLowerCase())
}
