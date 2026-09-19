# Elyor — ish jurnali (frontend/staff, auth qismi)

> ⚠️ **2026-07-26 sverka (Karis).** Bu jurnaldagi 4 ta muammoning holati bugungi kunda:
> 1. `api.adminDashboard is not a function` — ✅ TUZATILGAN (`api.js:2166`)
> 2. «Забыли пароль» mock ishlamaydi — ❌ HALI OCHIQ. `api.js` mock blokida
>    `/auth/forgot-password` va `/auth/reset-password` uchun `if` case yo'q (faqat
>    login/google/refresh/logout bor) → `Mock route not implemented`. Real backendda ishlaydi
> 3. Google login COOP xatosi — ❌ HALI OCHIQ (`FE-COOP`, egasi Kozim)
> 4. React Router v7 future-flag — ❌ HALI OCHIQ, 4 ta app'ning hech birida flag qo'yilmagan
>    (tekshirildi: `v7_startTransition` / `v7_relativeSplatPath` — 0 ta topildi). `FE-ROUTER-FLAG`, egasi Kozim
>
> Elyor to'g'ri qilgan: bu fayllar uning chegarasidan tashqarida edi. Vazifalar endi
> korneviy `TASK.md` da (`AUTH-FORGOT`, `AUTH-ELYOR-4`, `FE-COOP`, `FE-ROUTER-FLAG`) —
> holat faqat o'sha yerdan o'qilsin, bu jurnal tarix uchun.

_Faqat frontend (login/register) o'zgarishlari shu yerga yoziladi. Backendga tegilmaydi._

## 2026-07-16
- `task.md` va `error.md` ko'rib chiqildi (avvalgi QA-audit natijasi, `2026-07-10` sanasida yozilgan).
- Topilgan 4 ta muammo tekshirildi:
  1. Admin dashboard `api.adminDashboard is not a function` — `src/api.js` + `src/queries.js`
  2. Google login COOP konsol xatosi — `src/firebase.js` + `src/auth.jsx` yoki `vite.config.js`
  3. «Забыли пароль» mock ishlamaydi — `src/api.js` (mock blok)
  4. React Router v7 future-flag warning — `src/main.jsx`
- Xulosa: barcha 4 tasi umumiy fayllarga (`api.js`, `auth.jsx`, `main.jsx`, `vite.config.js`) tegadi — bu fayllar boshqa rollar (admin/mentor/super/methodist) tomonidan ham ishlatiladi, mening chegaramdan (faqat login+register) tashqarida.
- **Qaror: hech biriga tegilmadi.** Karis yoki tegishli egasiga alohida xabar qilinishi kerak.
