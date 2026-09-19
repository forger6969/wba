# @WBAlcBot — Telegram bot (Faza 6, hali yozilmagan)

> Bu — **topshiriq hujjati**. Bot kodi hozircha YO'Q. Kim yozsa — shu yerdagi
> reja bo'yicha. Sayt va CRM bilan bitta Supabase bazasiga ulanadi.

## Nima uchun

Markazda hozir Apps Script + Sheets'dagi bot ishlaydi (boshqa repoda). Yangi
tizim Next.js + Supabase'ga ko'chdi (bu repo). Yangi bot ham **shu Supabase
bazasi** bilan ishlashi kerak — Sheets bilan emas. Shunda sayt, CRM va bot
bitta manbadan o'qiydi/yozadi.

## Ikki yo'l — bittasini tanlang

### A. Webhook — shu Next loyihasi ichida (tavsiya etiladi)
- `src/app/api/telegram/route.ts` — `POST` route, Telegram update'larini qabul qiladi.
- Bitta kod bazasi: sayt + CRM + bot. Deploy ham bitta (Vercel).
- Webhook manzili: `https://<domen>/api/telegram`. O'rnatish:
  `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<domen>/api/telegram&secret_token=<SIR>`
- **Shart:** sayt Vercel'da tirik bo'lishi kerak (hozir deploy BLOCKED —
  avval o'sha hal bo'lsin).
- Tezlik: webhook polling'dan tez. Serverless'da `route`ni yengil ushlang,
  og'ir ishni (masalan xabar yuborish) darhol `200` qaytarib, keyin bajaring.

### B. Alohida jarayon — long polling
- Node yoki Python (`grammy` / `aiogram`), `getUpdates` bilan.
- Vercel kerak emas, lekin doim ishlab turadigan joy kerak (VPS yoki shu kompyuter).
- Supabase'ga `@supabase/supabase-js` (service_role) orqali ulanadi.

## Muhit o'zgaruvchilari (kalitlar KODGA yozilmaydi)
```
TELEGRAM_BOT_TOKEN=<@WBAlcBot tokeni — BotFather'dan>
TELEGRAM_WEBHOOK_SECRET=<ixtiyoriy: setWebhook secret_token>
NEXT_PUBLIC_SUPABASE_URL=<bor>
SUPABASE_SERVICE_ROLE_KEY=<bor — RLS'ni chetlab o'tadi, faqat serverda>
TELEGRAM_GROUP_ID=<xabarnoma yuboriladigan guruh>
```
Token `.env.local` da turadi (git'ga tushmaydi). Repo egasi kalitni alohida beradi.

## Buyruqlar — Apps Script botidagidek
Eski botdagi mantiqni takrorlang (BOT_Menyu.js). Rol Supabase `profiles.rol`
va `teachers.profile_id` bo'yicha aniqlanadi (`src/lib/auth.ts` bilan bir xil qoida):

| Buyruq | Kim uchun | Ish |
|---|---|---|
| `/probniy` | qabulxona/admin | Yangi lead → `leads` jadvaliga (saytdagi ariza bilan bir xil) |
| `+Ism summa` | qabulxona/admin | To'lov → `payments` (RPC yoki insert), usul so'raladi |
| Tasdiqlash | direktor | `payments.tasdiqlangan = true` (trigger tekshiradi) |
| `/qarz` | staff | Qarzdorlar ro'yxati (`enrollments`/`invoices` hisobidan) |
| Davomat | ustoz | `davomat_saqla` RPC (o'z guruhi) |
| Woblar | ustoz | `woblr` insert (RLS: faqat o'z o'quvchisi) |

**Huquq — bazada (RLS/RPC).** Bot service_role bilan ulansa `auth.uid()` bo'sh
bo'ladi, ya'ni definer funksiyalar tekshiruvni o'tkazib yuboradi (0006/0010/0013).
Shuning uchun botда rolni O'ZINGIZ tekshiring (Telegram ID → `teachers`/`profiles`),
aks holda har kim hamma amalni bajara oladi.

## Supabase tayyor
- Jadvallar: `students, groups, teachers, enrollments, invoices, payments,
  attendance, lessons, leads, woblr, profiles, settings` (migratsiyalar 0001–0017).
- RPC: `oquvchi_qosh, guruhga_biriktir, davomat_saqla, probniy_doimiy,
  chegirma_ozgartir, tushum_hisobot, woblr_leaderboard, rate_limit_hit`.
- `rate_limit_hit(bucket, kalit, limit, oyna_sek)` — bot'da ham flood-controlга ishlating.

## Tezlik bo'yicha maslahat (bot "sekin" bo'lmasin)
- Webhook'da darhol `200` qaytaring; javobni keyin `sendMessage` bilan yuboring.
- Supabase so'rovlarini kamaytiring: bitta `select` da kerakli ustunlarnigina oling.
- `file_id` va tez-tez so'raladigan ma'lumotni keshlang.
- Polling ishlatsangiz `long polling timeout`ni 30s qo'ying, `getUpdates`ni bo'sh urmang.

---
*Holat: 2026-09-19. Sayt/CRM/baza tayyor, deploy Vercel tomonda kutilyapti.
Bot — shu reja bo'yicha yoziladi.*
