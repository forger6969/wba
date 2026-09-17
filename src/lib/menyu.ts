/**
 * Panellar — botdagi tuzilmaning o'zi.
 *
 * Botda menyu rol bo'yicha bo'linadi (BOT_Menyu.js: menyuTugmalar):
 *   ustoz    — Davomat, Guruhlarim
 *   admin    — Qarzdorlar, Bugun, Shu oy, Probniy(lar), hisobotlar
 *   direktor — Tasdiqlash
 * va "USTOZ FAQAT O'Z ISHINI KO'RADI": qarz, tushum, probniy unga
 * umuman chiqmaydi.
 *
 * Bir odam ikki rolda bo'lishi mumkin — u holda ikkala bo'lim ham
 * ko'rinadi (Farrux: direktor + ustoz, Jamshid: admin + ustoz).
 *
 * `tayyor: false` — prototipda hali yo'q sahifa. Menyuda ko'rinadi,
 * lekin havola emas: bosib 404 ga tushib qolmasin.
 */

import type { UserRole } from '@/lib/types'
import { adminmi, staffmi, tasdiqlaydimi } from '@/lib/auth'
import {
  IconDashboard, IconStudents, IconGroups, IconTeacher, IconAttendance,
  IconWoblr, IconPayments, IconDebt, IconLeads, IconReports, IconSettings,
} from '@/components/icons'

type IconKomponent = (p: { size?: number; className?: string }) => React.ReactElement

export type MenyuBand = {
  href: string
  nom: string
  Icon: IconKomponent
  tayyor: boolean
  /** Telefonning pastki panelida chiqadimi */
  mobil?: boolean
}

export type MenyuBolim = {
  nom: string
  bandlar: MenyuBand[]
}

export function menyular(rol: UserRole, ustozmi: boolean): MenyuBolim[] {
  const bolimlar: MenyuBolim[] = []

  if (ustozmi) {
    bolimlar.push({
      nom: 'Ustoz paneli',
      bandlar: [
        { href: '/crm/davomat', nom: 'Davomat', Icon: IconAttendance, tayyor: true, mobil: true },
        { href: '/crm/guruhlar', nom: 'Guruhlarim', Icon: IconGroups, tayyor: true, mobil: true },
        { href: '/crm/woblr', nom: 'WOBLR', Icon: IconWoblr, tayyor: false },
      ],
    })
  }

  if (staffmi(rol)) {
    bolimlar.push({
      nom: ustozmi ? 'Boshqaruv' : 'Boshqaruv paneli',
      bandlar: [
        { href: '/crm/dashboard', nom: 'Bugun', Icon: IconDashboard, tayyor: true, mobil: true },
        { href: '/crm/oquvchilar', nom: 'O‘quvchilar', Icon: IconStudents, tayyor: true, mobil: true },
        ...(ustozmi ? [] : [{ href: '/crm/guruhlar', nom: 'Guruhlar', Icon: IconGroups, tayyor: true, mobil: true }]),
        { href: '/crm/qarzdorlar', nom: 'Qarzdorlar', Icon: IconDebt, tayyor: false },
        { href: '/crm/tolovlar', nom: 'To‘lovlar', Icon: IconPayments, tayyor: false },
        { href: '/crm/probniylar', nom: 'Probniylar', Icon: IconLeads, tayyor: false },
        { href: '/crm/hisobotlar', nom: 'Hisobotlar', Icon: IconReports, tayyor: false },
        ...(adminmi(rol)
          ? [
              { href: '/crm/ustozlar', nom: 'Ustozlar', Icon: IconTeacher, tayyor: false },
              { href: '/crm/sozlamalar', nom: 'Sozlamalar', Icon: IconSettings, tayyor: false },
            ]
          : []),
      ],
    })
  }

  if (tasdiqlaydimi(rol)) {
    bolimlar.push({
      nom: 'Direktor',
      bandlar: [
        {
          href: '/crm/tolovlar?filtr=tasdiqlanmagan',
          nom: 'Tasdiqlash',
          Icon: IconPayments,
          tayyor: false,
          mobil: true,
        },
      ],
    })
  }

  if (rol === 'oquvchi') {
    bolimlar.push({
      nom: 'Mening sahifam',
      bandlar: [
        { href: '/crm/dashboard', nom: 'Bosh sahifa', Icon: IconDashboard, tayyor: true, mobil: true },
        { href: '/crm/woblr', nom: 'WOBLR', Icon: IconWoblr, tayyor: false },
      ],
    })
  }

  return bolimlar
}

/** Kirgan odam qaysi sahifadan boshlaydi — botdagi "o'z ishi" tamoyili. */
export function boshSahifa(rol: UserRole, ustozmi: boolean): string {
  if (ustozmi && !staffmi(rol)) return '/crm/davomat'
  return '/crm/dashboard'
}
