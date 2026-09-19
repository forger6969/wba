# @WBAlcBot — Telegram bot

> Holat: **2026-09-20 — ishga tushdi.** Bot Apps Script'dan shu loyihaga
> ko'chdi (A-yo'l: webhook Next ichida). Ma'lumot Sheets'dan emas, shu
> Supabase bazasidan o'qiladi — real vaqtda.

## Tuzilma

```
Telegram ──webhook (secret_token)──▶ /api/telegram (Vercel) ──▶ Supabase
Admin /crm/xabarlar ──server amal (RLS)──▶ elonlar + elon_yetkazish ──▶ sendMessage
```

| Fayl | Nima |
|---|---|
| `src/app/api/telegram/route.ts` | Webhook: /start, kontakt, menyu tugmalari |
| `src/lib/telegram.ts` | Bot API, HTML escape, e'lon yuborish (429/403), to'plamlab yuborish |
| `src/lib/elon.ts` | E'lon formasi, filtr, andozalar ({ism}, {qarz}, {oy}) |
| `src/app/crm/xabarlar/` | Admin: yozish → ko'rib chiqish → yuborish, tarix |
| `src/app/crm/profil/` | "Telegramga ulash" — bir martalik havola |
| `supabase/migrations/0021_telegram.sql` | Jadvallar, ulash funksiyalari, auditoriya |

## Ulanish
1. **Telefon:** `/start` → "Telefon raqamimni yuborish" → `telegram_ula_telefon()`
   oxirgi 9 raqam bo'yicha: o'quvchining shaxsiy raqami → o'quvchi; ota/ona
   raqami → ota-ona (har farzand alohida); ustoz; xodim. Bot kontakt
   yuboruvchining O'ZINIKI ekanini tekshiradi (`contact.user_id === from.id`).
2. **Sayt:** Profil → "Telegramga ulash" → `telegram_token_ol()` (15 daqiqa,
   bir martalik) → `t.me/WBAlcBot?start=<token>` → `telegram_ula_token()`.
3. Ustozning `teachers.telegram_id` si bazada bo'lsa (eski botdan) — `/start`
   ning o'zi yetadi.

## Menyu (kimga nima)
- O'quvchi / ota-ona: Qarz · Darslar · Davomat · Woblar (har farzand uchun)
- Ustoz: Bugungi darslarim → saytdagi davomat sahifasiga havola
- Xodim: Bugungi hisobot (`tushum_hisobot`) · Qarzdorlar

## Huquq
Webhook `service_role` bilan ishlaydi (sessiya yo'q) — shuning uchun har
amalda chatning `telegram_ulanish` dagi o'quvchi/ustoz/xodimi olinadi va
so'rov o'sha ID bilan cheklanadi. `callback_data` ga ishonilmaydi.

## Muhit o'zgaruvchilari (Vercel → Production)
```
TELEGRAM_BOT_TOKEN        BotFather tokeni (secret)
TELEGRAM_WEBHOOK_SECRET   setWebhook secret_token — Telegram sarlavhada yuboradi
```

## Webhook'ni o'rnatish / qaytarish
```
setWebhook url=https://<sayt>/api/telegram secret_token=<TELEGRAM_WEBHOOK_SECRET>
          allowed_updates=["message","callback_query"]
```
Eski (Apps Script + Cloudflare Worker) manzili `.secrets/eski-webhook.json` da —
kerak bo'lsa shunga qaytariladi.

## Keyingi bosqichlar
- Avtomatik eslatmalar: har oy to'lov eslatmasi (pg_cron → yuborish).
- Kunlik 19:40 hisobot guruhga — bazadan (eski Apps Script triggeri o'chiriladi).
- Ustoz davomatini botning o'zida belgilash, to'lov kiritish, probniy, tasdiq.
- 5 til (eski botdagi uz/ru/en/tr/ar).
