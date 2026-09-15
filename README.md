# World Bridge Academy — sayt va CRM

Toshkentdagi WBA o'quv markazi uchun bitta loyiha: ommaviy sayt va ichki
boshqaruv tizimi. Bitta baza — sayt, Telegram bot va Google Sheets shundan
o'qiydi.

**Arxitektura kanvasi:** <https://claude.ai/artifact/6n8e3M8xSEh3q3qtZe9HjK>

---

## Nima qayerda

```
supabase/migrations/   Postgres sxemasi — jadvallar, hisob-kitob, RLS
supabase/run-local-test.sh   Migratsiyalarni lokal tekshirish
scripts/               Sheets'dan ko'chirish va sinxronizatsiya
src/app/(site)/        Ommaviy sayt   →  wba.uz
src/app/crm/           CRM            →  app.wba.uz
src/lib/               Supabase klientlari, formatlash, tiplar
docs/SUPABASE-SETUP.md Supabase'ni ulash yo'riqnomasi
```

## Ishga tushirish

```bash
npm install
cp .env.example .env.local     # keyin kalitlarni to'ldiring
npm run dev
```

Supabase kalitlarisiz ham ommaviy sayt ochiladi; CRM uchun baza kerak —
`docs/SUPABASE-SETUP.md` ga qarang.

## Buyruqlar

| Buyruq | Nima qiladi |
|---|---|
| `npm run dev` | Ishlab chiqish serveri |
| `npm run build` | Ishlab chiqarish uchun yig'ish |
| `npm run typecheck` | TypeScript tekshiruvi |
| `npm test` | Ko'chirish parserining testlari |
| `npm run db:test` | Sxema + RLS testlari (lokal Postgres) |
| `npm run migrate:dry` | Sheets'dan nima ko'chishini ko'rsatadi |
| `npm run migrate` | Sheets'dan bazaga ko'chiradi |

## Baza — asosiy qoidalar

**Narx guruhga yoziladi, chegirma yozilishga.** Odam 550 000 to'lagani — bu
boshqa narx emas, 650 000 dan berilgan chegirma. Shu tufayli:

```
qarz = Σ invoices.summa − Σ payments.summa
```

Hammaga 700 000 qo'yib chiqilgani sababli paydo bo'lgan soxta qarz yo'qoladi.

**Bitta o'quvchi — bitta yozuv.** Ikki kursda o'qiydigan bola `students` da
bir marta, `enrollments` da ikki marta turadi. Tushum ikki marta sanalmaydi,
ikkala kurs ham ko'rinadi.

**To'lov o'chirilmaydi.** `bekor = true` qilinadi, yozuv tarixda qoladi.
Bazadagi trigger `DELETE` ni umuman o'tkazmaydi.

**Huquq bazada, kodda emas.** RLS qoidalari ustozga faqat o'z guruhini,
o'quvchiga faqat o'zini ko'rsatadi — sahifada xato bo'lsa ham.

| Rol | Nima qila oladi |
|---|---|
| admin | hammasi; to'lovni tasdiqlash va bekor qilish faqat unda |
| qabulxona | to'lov kiritadi, qarz va lidlarni ko'radi; tasdiqlay olmaydi |
| ustoz | o'z guruhi: davomat, WOBLR, o'z maoshi |
| oquvchi | o'zi: davomat, qarz, WOBLR, reyting |

## Testlar

Sxema haqiqiy Postgres'da tekshiriladi — chegirma mantiqi, qarz formulasi,
to'lovni o'chirishning to'silishi va har bir rolning ko'rish doirasi:

```bash
npm run db:test
```

## Holat

| Faza | Nima | Holat |
|---|---|---|
| 0 | Baza sxemasi, RLS, ko'chirish skripti | ✅ tayyor |
| 1 | Skelet, login, rollar, dashboard | 🔄 boshlandi |
| 2 | O'quvchi / guruh / ustoz profillari | ⬜ |
| 3 | Davomat va WOBLR | ⬜ |
| 4 | Hisob-faktura, to'lov, qarz | ⬜ |
| 5 | Ommaviy saytning qolgan sahifalari | 🔄 bosh sahifa va ariza tayyor |
| 6 | Sheets sync, Telegram bot | ⬜ |

## Hal qilinmagan savollar

1. **Ustoz maoshi qanday hisoblanadi?** Foizmi, o'quvchi sonidanmi, fiksmi?
   `teachers.maosh_turi` hozircha `null` — UI "aniqlanmagan" deb ko'rsatadi.
2. **Bir darsda nechta wobl berish mumkin?** Chegara bormi, manfiy ball bo'ladimi?
   `settings` da `woblr.max_ball_dars` bo'sh turibdi.
3. **Chegirma miqdorlari** — ko'p fanga yozilganda va birga kelganda qancha?

## Eslatma

`next/font` Google Fonts'dan shrift yuklaydi, shuning uchun `npm run build`
internetga chiqishni talab qiladi. Yopiq muhitda yig'ilmasa — sabab shu.
