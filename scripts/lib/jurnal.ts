/**
 * Davomat jurnallarini o'qish (`Davomat toq` / `Davomat juft` /
 * `Davomat dam olish`).
 *
 * Jurnalda sarlavha qatori YO'Q — u blok-blok qurilgan va har qatorning
 * turi yashirin kalit ustunida (U, 21) turadi (Q_Jurnal.js:50-60):
 *
 *   "#OY:2026-09"            oy sarlavhasi
 *   "#BOSH"                  blok sarlavhasi
 *   "#SANA|<guruh nomi>"     shu blokning dars sanalari — D..R
 *   "Ism (S001) · Guruh"     o'quvchi qatori — D..R da true/false
 *
 * Ochiq katak doim true yoki false; bo'sh katak — o'sha kuni o'quvchi
 * bu guruhda bo'lmagan. Uchinchi holat jurnalda yo'q, shuning uchun
 * bu yerdan faqat `keldi` va `kelmadi` chiqadi.
 */

import { sanaga, kalitAjrat } from './parse'

/** Ustunlar (1-asosli) — Q_Jurnal.js: J_S1, J_SOXIR, J_KALIT */
export const J_S1 = 4
export const J_SOXIR = 18
export const J_KALIT = 21

export type Dars = { group_id: string; sana: string }
export type Davomat = {
  group_id: string
  sana: string
  student_id: string
  holat: 'keldi' | 'kelmadi'
}

export type JurnalNatija = { darslar: Dars[]; belgilar: Davomat[] }

type Sozlama = {
  /** Guruh nomi → guruh ID */
  guruhId: Map<string, string>
  /** Bazada bor o'quvchilar */
  oquvchiBor: Set<string>
  ogoh?: (m: string) => void
}

/**
 * Bir nechta jurnal varag'ini o'qiydi va bitta natijaga yig'adi.
 * `varaqlar` — [varaq nomi, xom qatorlar] juftliklari.
 */
export function jurnallarniOqi(
  varaqlar: [string, unknown[][]][],
  { guruhId, oquvchiBor, ogoh = () => {} }: Sozlama,
): JurnalNatija {
  const darslar = new Map<string, Dars>()
  const belgilar: Davomat[] = []

  for (const [nom, xom] of varaqlar) {
    let guruhNomi = ''
    let gid: string | undefined
    let sanalar: (string | null)[] = []

    for (const qator of xom) {
      const kalit = String(qator?.[J_KALIT - 1] ?? '').trim()
      if (!kalit) continue

      // Yangi oy yoki yangi blok — eski sanalar amal qilmaydi
      if (kalit.startsWith('#OY:') || kalit === '#BOSH') {
        gid = undefined
        sanalar = []
        continue
      }

      if (kalit.startsWith('#SANA')) {
        guruhNomi = kalit.split('|')[1]?.trim() ?? ''
        gid = guruhId.get(guruhNomi)
        if (guruhNomi && !gid) ogoh(`Jurnal (${nom}): guruh topilmadi — "${guruhNomi}"`)
        sanalar = []
        for (let c = J_S1 - 1; c <= J_SOXIR - 1; c++) sanalar.push(sanaga(qator?.[c]))
        continue
      }

      if (!gid) continue

      const { fish, id } = kalitAjrat(kalit)
      if (!id) continue
      if (!oquvchiBor.has(id)) {
        ogoh(`Jurnal (${nom}): o'quvchi bazada yo'q — "${fish}" (${guruhNomi})`)
        continue
      }

      sanalar.forEach((sana, i) => {
        if (!sana) return
        const katak = qator?.[J_S1 - 1 + i]
        if (typeof katak !== 'boolean') return

        darslar.set(`${gid}|${sana}`, { group_id: gid as string, sana })
        belgilar.push({
          group_id: gid as string,
          sana,
          student_id: id,
          holat: katak ? 'keldi' : 'kelmadi',
        })
      })
    }
  }

  return { darslar: [...darslar.values()], belgilar }
}
