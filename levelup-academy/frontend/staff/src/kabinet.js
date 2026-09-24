/**
 * Bitta sayt, ikki bo'lim.
 *
 * Xodimlar paneli saytning ildizida, o'quvchi va ota-ona kabineti esa
 * `/kabinet/` ostida turadi — ikkalasi bitta domenga yig'iladi
 * (`frontend/vercel.json`). Kirish formasi bitta: u ildizda, shu papkadagi
 * `pages/Login.jsx` da.
 *
 * Kabinetga o'tayotgan odamning sessiyasini cookie orqali berib bo'lmaydi:
 * API boshqa domenda (Render), refresh-cookie esa `SameSite=Lax` — brauzer uni
 * o'sha domenga yubormaydi. Shuning uchun token bir martalik `sessionStorage`
 * orqali uzatiladi: kabinet uni o'qishi bilan o'chiradi
 * (`member/src/auth.jsx` → `takeHandoff`).
 */

// Dev'da kabinet alohida portda turadi — o'shanda VITE_KABINET_URL beriladi.
export const KABINET_PATH = import.meta.env.VITE_KABINET_URL || '/kabinet/';

const HANDOFF_KEY = 'wba.kabinet.session';

export function handOffSession({ accessToken, user }) {
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ accessToken, user }));
  } catch {
    // Shaxsiy rejim yoki saqlash yopiq: kabinet o'z kirish formasini ko'rsatadi,
    // odam bir marta qayta kiradi — yo'qotiladigan narsa yo'q.
  }
}
