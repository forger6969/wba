# WBA — vazifalar

Holat: 2026-09-18. Loyiha konteksti va qoidalar — `CLAUDE.md` (avval shuni o'qing).

## Ishga tushirish (yangi kompyuterda)

```bash
git clone https://github.com/jamshideng/wba.git && cd wba
npm install
cp .env.example .env.local        # kalitlarni Jamshiddan oling — git'da YO'Q
npx supabase@latest start         # Docker kerak; portlar 583xx (config.toml)
npx supabase@latest migration up
npm run ishga                     # Windows: build + server (http://localhost:3000)
```

Git'da yo'q (ataylab): `.env.local`, `.secrets/` (Google service account JSON),
`Students 2026.xlsx`. Ularni Jamshid alohida beradi.

Tekshiruv: `npm test` · `npm run typecheck` · `npx eslint src scripts` · `npm run db:test`.

---

## Hozir — 1. Sheets'dagi hamma ma'lumotni bazaga ko'chirish

Skript tayyor, quruq yurish toza (tushuntirilmagan farq yo'q):
9 ustoz · 21 guruh · 79 o'quvchi · 85 qatnashuv · 35 to'lov (18 670 000) ·
2 probniy · 268 dars · 1069 davomat belgisi.

- [ ] Lokal bazadagi **test ma'lumotlarini o'chirish** — faqat Jamshid
      tasdig'i bilan. Zaxira: `.secrets/zaxira/test-malumot-2026-09-18.sql`.
      Test ID'lari (S001–S003, G01–G04, U01–U02) haqiqiy ID'lar bilan to'qnashadi.
      `jamshid@` (admin) va `farrux@` (direktor) hisoblari qoladi.
- [ ] `npm run migrate:dry -- --davomat` → hisobotni ko'rish
- [ ] `npm run migrate -- --davomat` → yozish
- [ ] Ko'chirilgandan keyin ustoz va o'quvchilarga login ochish
      (o'quvchi profili / Ustozlar sahifasi yoki `npm run hisob`).

## Sheets'da Jamshid tuzatadi

- [ ] **S076 Oybek Safarbayev** — Pre-Intermediate · Komila guruhiga ikki marta
      yozilgan (Q083 01.09 dan, Q086 16.09 dan, ikkalasi ochiq). Sheets ikki
      barobar hisoblayapti. Bazaga bittasi (Q083) yoziladi.
- [ ] **S079 Muhammad** — "Boshlandi" matn bo'lib kiritilgan (`"16.09.2026 "`),
      Sheets hisob chiqarmayapti. Bazada to'g'ri hisoblanadi.
- [ ] 16 ta to'lovda "Usul" bo'sh (T-qatorlar 14–29) — bazada `[ANIQLANMAGAN]`.

## Keyingi — 2. Bulutli Supabase va joylashtirish

- [ ] supabase.com da loyiha ochish (Jamshid bilan birga, Chrome orqali).
- [ ] Migratsiyalar 0001–0015 ni bulutga qo'llash, `.env.local` → bulut kalitlari.
- [ ] Saytni joylashtirish — hosting tanlanmagan `[ANIQLANMAGAN]`
      (`wba.uz` ommaviy sayt, `app.wba.uz` → `/crm`).
- [ ] pg_cron (`create_monthly_invoices`) bulutda yoqilganini tekshirish.

## Keyingi — 3. Sheets ⇄ baza ikki tomonlama bog'lash

Qaror: Sheets'da o'zgarsa bazaga, bazada (sayt) o'zgarsa Sheets'ga o'tadi.
Telegram bot hozircha Apps Script'da qoladi va Sheets'ga yozaveradi.

- [ ] Sheets → baza: Apps Script'dan push (`manba='sheets'`), yozuv
      `sheets_id` (Q001 / T0001 / P001) bo'yicha topiladi (0015).
- [ ] Baza → Sheets: outbox navbat jadvali + Apps Script vaqtli trigger,
      jadvalning o'z yozuvchi funksiyalari bilan qo'llaydi.
- [ ] Aylanib qolmaslik: har o'zgarishda manba belgisi.
- [ ] Botning mavjud fayllariga tegilmaydi — yangi `SINX_*` fayllar.
      Apps Script kodi bu repoda YO'Q (`Desktop\wba_bot\` da, clasp bilan).

## Ochiq savollar (Jamshid javob beradi — taxmin qilinmaydi)

- [ ] Ustoz maoshi qanday hisoblanadi (`teachers.maosh_turi` = null).
- [ ] Bir darsda eng ko'p necha wobl (`settings.woblr.max_ball_dars` = null).
- [ ] Chegirma miqdorlari: ikki fanga yozilganda, aka-uka/do'st bilan kelganda.
- [ ] `Xodimlar` varag'i (3 qator) — ko'chirilmaydi; xodimlarga login alohida ochiladi.

## Ma'lum cheklovlar

- Ko'chirish skripti darslarni bitta so'rovda o'qiydi — PostgREST 1000 qator
  chegarasi. Hozir 268; 1000 dan oshsa sahifalash kerak.
- Xotira kam kompyuterda `next dev` emas, `npm run ishga` (`next start`).
