# Supabase'ni ulash — qadamma-qadam

Bir marta bajariladi, ~10 daqiqa. Hech narsa to'lash shart emas — bepul tarif
77 o'quvchi uchun ortig'i bilan yetadi.

---

## 1. Hisob ochish

1. <https://supabase.com> ga kiring → **Start your project**
2. GitHub hisobingiz bilan kiring (yoki email bilan ro'yxatdan o'ting)

## 2. Loyiha yaratish

1. **New project** tugmasi
2. To'ldiriladigan joylar:

   | Maydon | Nima yoziladi |
   |---|---|
   | Name | `wba` |
   | Database Password | Kuchli parol o'ylab toping va **saqlab qo'ying** — qayta ko'rsatilmaydi |
   | Region | **Frankfurt (eu-central-1)** — Toshkentga eng yaqin ishonchli mintaqa |
   | Plan | Free |

3. **Create new project** → 2–3 daqiqa kutiladi

> Parolni yo'qotsangiz qo'rqmang — uni Settings → Database dan qayta o'rnatish mumkin.

## 3. Sxemani o'rnatish

Chap menyudan **SQL Editor** → **New query**.

Quyidagi 4 faylni **shu tartibda** ochib, ichidagini nusxalab qo'yasiz va har
safar **Run** bosasiz:

1. `supabase/migrations/0001_schema.sql` — jadvallar
2. `supabase/migrations/0002_functions.sql` — hisob-kitob va avtomatik ishlar
3. `supabase/migrations/0003_rls.sql` — huquqlar
4. `supabase/migrations/0004_seed.sql` — yo'nalishlar va sozlamalar

Har birida `Success. No rows returned` chiqishi kerak.

> Xato chiqsa — to'xtang va xato matnini menga yuboring. Yarim o'rnatilgan
> sxema ustiga davom ettirmang.

## 4. Kalitlarni olish

**Project Settings** (pastdagi tishli g'ildirak) → **API**:

| Sahifadagi nom | `.env.local` dagi nom |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` |

Loyiha papkasida `.env.example` dan nusxa oling va to'ldiring:

```bash
cp .env.example .env.local
```

> **`service_role` kaliti — bu bosh kalit.** U RLS'ni butunlay chetlab o'tadi.
> Hech qachon brauzerga, Telegramga yoki skrinshotga tushmasin.
> `.env.local` fayli `.gitignore` da — GitHub'ga ketmaydi.

## 5. Birinchi admin hisobini ochish

**Authentication** → **Users** → **Add user** → **Create new user**:

- Email: `jamshid@wba.uz` (yoki o'zingizniki)
- Password: kuchli parol
- ✅ **Auto Confirm User** — belgilangan bo'lsin

Keyin **SQL Editor** da rolni beriladi:

```sql
update profiles
set rol = 'admin', ism = 'Jamshid Abdialimov'
where id = (select id from auth.users where email = 'jamshid@wba.uz');
```

Shundan keyin `/kirish` sahifasidan kirish mumkin bo'ladi.

## 6. Ma'lumotni ko'chirish

Google Sheets'dan o'qish uchun service account kerak:

1. <https://console.cloud.google.com> → loyiha yarating (yoki mavjudini oling)
2. **APIs & Services** → **Enable APIs** → **Google Sheets API** ni yoqing
3. **Credentials** → **Create credentials** → **Service account**
4. Yaratilgan hisobga kiring → **Keys** → **Add key** → **JSON** → fayl yuklanadi
5. Faylni loyihada `.secrets/google-service-account.json` sifatida saqlang
6. `Students_wba` jadvalini oching → **Share** → service account emailini
   (`...@....iam.gserviceaccount.com`) **Viewer** sifatida qo'shing

Keyin:

```bash
npm run migrate:dry     # faqat ko'rsatadi, hech narsa yozmaydi
npm run migrate         # bazaga yozadi
```

`migrate:dry` natijasini birga ko'rib chiqamiz — nechta o'quvchi, guruh, to'lov
topilgani va qaysi qatorlar tushunarsiz bo'lgani ro'yxat bo'lib chiqadi.

> **Eslatma:** davomat tarixi ko'chirilmaydi. Sheets'da faqat oylik jamlanma
> bor (13 dars, 3 kelgan), har bir darsning o'zi yo'q — ularni tiklab bo'lmaydi.
> Davomat yangi tizimda birinchi darsdan boshlab yig'iladi.

## 7. Avtomatik ishlar (Faza 4)

Har oyning 1-sanasida hisob-faktura yaratish uchun Supabase'da **Cron**
kengaytmasi ishlatiladi:

```sql
-- Database → Extensions → pg_cron ni yoqing, keyin:
select cron.schedule(
  'oylik-hisob-faktura',
  '0 1 1 * *',                          -- har oyning 1-sanasi, 01:00 UTC
  $$select create_monthly_invoices()$$
);
```

Buni hozir qilish shart emas — Faza 4 da birga sozlaymiz.

---

## Muammo bo'lsa

| Belgi | Sabab | Yechim |
|---|---|---|
| `relation "profiles" does not exist` | 0001 ishga tushmagan | Migratsiyalarni tartib bilan qayta yuriting |
| Kirgandan keyin bo'sh sahifa | `profiles` da rol yo'q | 5-qadamdagi `update profiles` ni bajaring |
| `new row violates row-level security` | Rol yetarli emas | Qaysi rol bilan kirganingizni tekshiring |
| `migrate` da `PERMISSION_DENIED` | Sheets ulashilmagan | 6-qadamning 6-bandi |
