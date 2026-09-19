# WBA — to'liq diagnostika (2026-09-19)

Uch tizim ko'rib chiqildi: **sayt + baza** (bu repo), **Telegram bot**
(Apps Script, `Desktop\wba_bot\*.js` — bu repoda YO'Q) va **Google Sheets**
(`Students_wba`). Hech narsa o'zgartirilmadi: bot va Sheets faqat o'qildi,
sayt lokal nusxada SINOV yozuvlari bilan sinaldi va ular keyin o'chirildi.

Vazifalar bo'yicha taqsimot — [`TASKS.md`](../TASKS.md).

## Qanday tekshirildi

| Qism | Usul |
|---|---|
| Bot kodi | 54 fayl, 24 263 qator. Kirish nuqtasi (`doPost`), rollar, to'lov, davomat, jurnal, probniy, hisobot, onEdit — to'liq o'qildi; qolgani sarlavha va xavfli chaqiriqlar bo'yicha |
| Sheets | Sheets API (faqat o'qish): 16 varaq, har katak qiymati va formatlangan ko'rinishi, xato kataklar, sana/telefon formatlari, takrorlar, bo'sh majburiy maydonlar |
| Sayt | 4 rol (admin, direktor, ustoz, o'quvchi) × 22 sahifa, 390 px (telefon) va 1280 px; konsol xatolari, gorizontal siljish, huquq yo'naltirishlari; kirish/chiqish, tema, CSV eksport, ariza formasi; 33 unit test, typecheck, lint, bazaning mantiq/RLS testlari, `next build` |
| Bulut | Vercel deploylari va kalitlari, Supabase migratsiyalari, ma'lumot soni, Auth sozlamalari |

**Darajalar:** 🔴 kritik — pul/ma'lumot yo'qolishi yoki begona kirishi mumkin ·
🟠 yuqori — tez orada buziladi yoki raqamlar noto'g'ri · 🟡 o'rta — noqulay,
nomuvofiq · ⚪ past — kosmetik, hujjat.

## Qisqa xulosa

- **Sayt ishlamayapti (bulutda).** Vercel'da kalitlar yo'q va `sxvs` commitlari Hobby tarifida bloklanadi. Sayt kodi esa sog'lom: hamma sahifa ochiladi, huquqlar to'g'ri.
- **Bulutdagi davomat noto'g'ri.** Kelajakdagi 95 dars "kelmadi" bo'lib ko'chib qolgan. Pul raqamlari esa to'g'ri: to'lashi kerak 52 800 000, Sheets bilan mos.
- **Botda to'rtta kritik teshik bor:**
  - soxta tugma bosish bilan istalgan to'lovni o'chirish mumkin;
  - xuddi shu yo'l bilan istalgan probniyni o'quvchiga aylantirish mumkin;
  - jurnal qayta qurilishi davomatni butunlay yo'qotishi mumkin;
  - himoyasiz "hammasini tozalash" funksiyasi turibdi.
- **Sheets'da ma'lumot bo'shliqlari katta.** 78/79 o'quvchida tug'ilgan sana yo'q, 9 tasida telefon yo'q. 40 to'lovning bittasi ham tasdiqlanmagan. Juft kunlardagi darslarning 40% i belgilanmagan.
- **Sinxron yo'q.** Bulutdagi baza 19.09 dagi surat. Sheets va bot yangilanaveradi, sayt esa eskiradi.

---

## 1. Infratuzilma va bulut

| # | Daraja | Topilma | Dalil |
|---|---|---|---|
| I1 | 🔴 | Vercel'da **birorta ham kalit yo'q** (`NEXT_PUBLIC_SUPABASE_URL`, `…_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`) — sayt bazaga ulanmagan | Vercel → Settings → Environment Variables: "No Environment Variables Added" |
| I2 | 🔴 | `sxvs` commiti **Blocked**: "Hobby Plan does not support collaboration for private repositories" | Deploy `ef165ec` |
| I3 | 🔴 | Supabase Auth: **"Allow new users to sign up" YOQILGAN** — ochiq anon kalit bilan istalgan odam ro'yxatdan o'tadi (lokalda yopilgan edi, bulutga o'tmagan) | Authentication → Sign In / Providers |
| I4 | 🟠 | Supabase **Free**: kunlik zaxira nusxa yo'q, 7 kun faolsizlikda loyiha to'xtaydi — bazada to'lovlar bor | Organization "wba" — Free Plan |
| I5 | 🟠 | Bulutda **bitta hisob** (admin). Direktor, 9 ustoz, o'quvchilar loginlari yo'q | `auth.users` = 1 |
| I6 | 🟡 | Vercel hisobida 2FA o'rnatilmagan (so'raganda "Skip" bosilgan) | — |
| I7 | 🟡 | Supabase Auth "Site URL"/"Redirect URLs" Vercel domeniga sozlanmagan (tekshirilishi kerak) | — |
| I8 | 🟡 | Domen: `wba.uz` / `app.wba.uz` kodda bor (`next.config.ts`, `src/lib/markaz.ts`), lekin Vercel'ga ulanmagan; domen kimniki — `[ANIQLANMAGAN]` | — |
| I9 | ⚪ | Birinchi deploy (`b387d10`) yiqilgan: ikki bosh sahifa (`app/page.tsx` + `(site)/page.tsx`). `ef165ec` da tuzatilgan | Build log: `ENOENT … (site)/page_client-reference-manifest.js` |
| I10 | ⚪ | Oylik hisob-faktura cron'i bor: `5 0 * * *` UTC = **05:05 Toshkent** (avvalgi hisobotda "10:00" deb xato aytilgan edi) | `cron.job` |

**Bulutdagi ma'lumot (tekshirildi):** 9 ustoz · 21 guruh · 79 o'quvchi ·
85 qatnashuv (hammasi `sheets_id` bilan) · 85 hisob-faktura (52 800 000) ·
40 to'lov (21 040 000, takror ID yo'q) · qarz 31 760 000 · 2 probniy ·
migratsiyalar 0001–0017 · anon kalit bilan chaqiriladigan funksiya = 0.

## 2. Ko'chirish (Sheets → baza) va bulutdagi ma'lumot

| # | Daraja | Topilma | Joyi |
|---|---|---|---|
| K1 | 🔴 | **Kelajakdagi darslar ham ko'chirilgan**: 268 darsdan 95 tasi 20–30.09 da, ularda 398 ta "kelmadi". Sayt davomat foizini sun'iy pasaytiradi, "uzoq kelmayapti" signallari noto'g'ri | `scripts/lib/jurnal.ts:88` — sana ≤ bugun filtri yo'q |
| K2 | 🟠 | **Belgilanmagan darslar "kelmadi" bo'lib ko'chgan**: o'tgan darslardan 41 tasida hamma "kelmadi" (jurnalda belgilanmagan va kelmagan farqlanmaydi, §4) | bulut: `bool_and(holat='kelmadi')` |
| K3 | 🟡 | "Dars o'tkazilmadi" (bot hammani KELDI qiladi + izoh) → bazada "keldi" bo'lib tushadi, `lessons.otkazildi=false` bo'lishi kerak | jurnal izohi `dars o'tkazilmadi MM-DD` |
| K4 | 🟡 | To'lov usuli **"Terminal"** (2 ta) tanilmaydi → `null`; bazaning `payment_method` enum'ida ham yo'q | `scripts/lib/parse.ts:56`, `0001_schema.sql:19` |
| K5 | 🟡 | Bazada haqiqiy o'tgan davomat: 671 belgi, 458 keldi (68%) — K1/K2 tuzatilgach shu ko'rinadi | — |

## 3. Sayt va baza

### Nima ishlaydi (tasdiqlandi)
- 4 rol × 22 sahifa: hammasi 200, sahifada xato matni yo'q, konsol xatosi yo'q, 390 px da gorizontal siljish yo'q.
- Huquqlar: ustoz boshqaruv sahifalaridan `/crm/davomat?xato=huquq` ga, o'quvchi `/crm/men?xato=huquq` ga qaytadi. Ustozga guruhda o'quvchi ismlari havolasiz ko'rsatiladi.
- Noto'g'ri parol xabari, chiqish va chiqqandan keyin `/crm` yopiqligi ishlaydi. CSV eksport (BOM, `;`) ishlaydi.
- Ommaviy sahifa, `/ariza` (honeypot + soatiga 5 ta cheklov), `robots.txt`, `sitemap.xml`, 404 ishlaydi.
- `sxvs` ning 0016 tuzatishi (anon kalit bilan definer funksiyalarni chaqirish) to'g'ri va muhim.

### Topilmalar
| # | Daraja | Topilma | Joyi |
|---|---|---|---|
| S1 | 🔴 | **Sinxron yo'q.** Bulutdagi baza — 19.09 surati. Sheets'ga bot va admin yozaveradi, sayt eskiradi; saytda kiritilgan to'lov Sheets'ga o'tmaydi. Ikki "haqiqat" ajraladi | arxitektura |
| S2 | 🟠 | **Oylik hisob qoidasi farq qiladi.** Baza — kalendar oyi: 1-sanada hammaga yangi oy (`create_monthly_invoices`). Sheets — kelgan kundan oyma-oy (`DATEDIF(…,"M")+1`): 16.09 da kelgan bolaning 2-oyi 16.10 da. 1–15 oktyabrda saytdagi qarz Sheets'dan katta chiqadi | `0006_direktor_huquq.sql:178` |
| S3 | 🟡 | Ochiq yo'naltirish to'liq yopilmagan: `/\evil.com` tekshiruvdan o'tadi, brauzer `\` ni `/` deb o'qiydi → `//evil.com` | `src/app/kirish/page.tsx:14` |
| S4 | 🟡 | CRM davomati faqat **bugun** uchun — kecha unutilgan davomatni tuzatib bo'lmaydi (bot ham faqat bugun) | `src/app/crm/davomat/[guruh]/page.tsx:22` |
| S5 | 🟡 | `payment_method` enum'da `terminal` yo'q (K4) | `0001_schema.sql:19` |
| S6 | ⚪ | Tema almashtirgich telefonda yo'q — faqat kompyuterdagi yon menyuda | `src/app/crm/layout.tsx:135` |
| S7 | ⚪ | `/crm/men` (o'quvchi sahifasi) ga admin va ustoz ham kiradi — bo'sh sahifa | `src/app/crm/men/page.tsx` |
| S8 | ⚪ | O'quvchi woblar reytingida boshqalarning to'liq ismini ko'radi (maxfiylik qarori) | `src/app/crm/woblr/page.tsx` |
| S9 | ⚪ | Ariza cheklovi IP'ni `x-forwarded-for` dan oladi — Vercel'da `x-real-ip` ishonchliroq | `src/app/(site)/ariza/page.tsx:18` |
| S10 | ⚪ | CI yo'q: testlar, typecheck, `db:test` faqat qo'lda | — |
| S11 | ⚪ | `CLAUDE.md` da "Sheets — ko'zgu, asosiy baza emas" deyilgan, lekin qaror o'zgargan (ikki tomonlama). `TASKS.md` eskirgan (ko'chirish bajarildi) | hujjat |
| S12 | ✅ | `npm run ishga` Docker o'chiq bo'lsa yiqilardi (PowerShell 5.1: `Stop` + stderr) — **tuzatildi** | `scripts/ishga-tushir.ps1` |

## 4. Telegram bot (Apps Script)

Bot kodi bu repoda yo'q: `Desktop\wba_bot\*.js`, `clasp` bilan deploy
qilinadi. Kod o'zgarsa `clasp push` **va** `clasp deploy -i AKfycbzCUCC…`
kerak (deploy qilinmasa eski versiya ishlaydi).

| # | Daraja | Topilma | Joyi |
|---|---|---|---|
| B1 | 🔴 | **To'lovni bekor qilish tugmasida huquq tekshiruvi yo'q.** Bot API: "a bad client can send arbitrary data in callback_data". Botga yozgan har kim (ustoz, begona) o'zidagi istalgan bot xabariga `X\|T0005\|0` yuborib istalgan to'lovni o'chira oladi. `/bekor` buyrug'i esa admin bilan cheklangan — nomuvofiq | `Kod.js:967` |
| B2 | 🔴 | **"Doimiy qilish" tugmasida huquq yo'q.** `PD\|<qator>\|0` bilan istalgan probniy qatori O'quvchilar + Qatnashuvga yoziladi va pul hisoblana boshlaydi; qator raqami taxmin qilinadi | `BOT_Probniy.js:223` |
| B3 | 🔴 | **Bekor qilingan to'lov izsiz o'chadi va ID qayta ishlatiladi.** `bTolovOchir` qatorni tozalaydi; keyingi to'lov birinchi bo'sh qatorga tushadi, ID esa `ROW()-1` formula → eski `T0005` endi boshqa to'lov. Tarix yo'qoladi, bazadagi `sheets_id` bilan sinxda noto'g'ri yozuvga bog'lanadi | `BOT_Baza.js:358` |
| B4 | 🔴 | **Jurnal qayta qurilishi davomatni yo'qotishi mumkin.** `_jurnalYoz` avval butun varaqni tozalaydi, keyin yozadi; belgilar faqat xotirada. `JURNAL_AVTO` 18.09 da 350 s ishlagan (chegara 360 s), oylar hech qachon arxivlanmaydi → varaq o'sadi → bir kun vaqt tugab, tozalangan-u yozilmagan varaq qoladi | `Q_Jurnal.js:450`, `Q_Jurnal.js:534` |
| B5 | 🔴 | **Himoyasiz "hammasini tozalash".** `KOCHIR_1` O'quvchilar, Ustozlar, Guruhlar, Qatnashuv, Tolovlar, Narxlar ustunlarini qorovulsiz tozalaydi va deploy qilinadi. Muharrirda funksiya ro'yxati kechikadi (avval noto'g'ri funksiya ishga tushgan) | `X_Kochir.js:82`, `.claspignore` |
| B6 | 🟠 | **Davomat noto'g'ri qatorga yozilishi mumkin.** `davomatSaqla` qator/ustunni keshdan (1 soatgacha) oladi; oradagi `JURNAL()` (yangi o'quvchi → 60 s dan keyin) qatorlarni siljitadi → belgi boshqa bolaga tushadi. `JURNAL()` qulf olmaydi | `BOT_Davomat.js:287` |
| B7 | 🟠 | **"Belgilanmagan" va "kelmadi" farqlanmaydi.** Ochiq katak doim `false`; bot yangi darsni HAMMA ❌ bilan ochadi (izoh va xotira "hammasi KELDI" deydi). Ustoz faqat kelmaganlarni bosib saqlasa — hamma "kelmadi". Juft kunlarda 64 darsdan 26 tasi umuman belgilanmagan | `BOT_Davomat.js:220` |
| B8 | 🟠 | **300 qator chegarasi.** `B_CHEGARA_ODDIY=300` (O'quvchilar/Qatnashuv/Guruhlar/Ustozlar/Probniylar) va `QATOR_SONI=300` (formulalar). Qatnashuv panjarasi 301 qator, 86 band, tugaganlari ham qoladi → ~1 yilda bot yangi yozuvlarni ko'rmaydi va yoza olmaydi | `BOT_Baza.js:55`, `B_Yangi.js:14` |
| B9 | 🟠 | **21-guruhni botdan tanlab bo'lmaydi.** Probniy va biriktirishda `guruhlar.slice(0, 20)`; hozir 21 faol guruh | `BOT_Probniy.js:598`, `:706` |
| B10 | 🟠 | `_Davomat` 400 qatorgacha o'qiladi (o'quvchi×oy×guruh) — oshganda o'quvchi kartasidagi davomat jim yo'qoladi | `BOT_Baza.js:663` |
| B11 | 🟡 | Davomat foizi = TRUE / oyning **hamma** ochiq darslari (kelajakdagilari ham) — oy boshida hamma ~20% va qizil | `Q_Jurnal.js:379` |
| B12 | 🟡 | `/biriktir` ishlamaydi: admin buyruqlari ro'yxatida bor, `switch` da yo'q → menyu chiqadi; `biriktirBoshla()` hech qayerdan chaqirilmaydi | `Kod.js:788`, `BOT_Probniy.js:534` |
| B13 | 🟡 | Tugma indeksi (`BG\|i`, `PG\|i`) bosilgan paytda qayta hisoblanadi — oradagi guruh o'zgarsa boshqa guruhga yoziladi | `BOT_Probniy.js:609` |
| B14 | 🟡 | `_qatnYoz`: o'sha o'quvchi+guruh qatori bo'lsa (tugagan bo'lsa ham) Boshlandi ustidan yoziladi, Tugadi qoladi → qayta yozilishda Tugadi < Boshlandi | `U_Qatnashuv.js:472` |
| B15 | 🟡 | onEdit faqat **bitta katak** tahririni ishlaydi — nusxalab qo'yilgan (paste) qatorlarda Sana/Davr/narx muhri/Kiritilgan to'lmaydi, kaskad ishlamaydi | `C_Avto.js:180` |
| B16 | 🟡 | Istisnoda foydalanuvchiga javob yo'q — faqat `_Bot_log`; "bot qotdi" tuyg'usi | `Kod.js:744` |
| B17 | 🟡 | `doPost` kalit tekshiruvi `WEBHOOK_SIR` bo'lsagina ishlaydi (fail-open) | `Kod.js:719` |
| B18 | 🟡 | Proksi `SECRET` qo'yilmasa har kim soxta update yuboradi (admin `from.id` bilan). Qo'yilganini `PROKSI_SINOV` bilan tekshirish kerak | `proksi/worker.js` |
| B19 | 🟡 | `max_connections=1` + Worker kutadi — sekin amal (Excel, jurnal) paytida hamma navbatda | `BOT_Webhook.js:138` |
| B20 | 🟡 | Tasdiq ustuni qat'iy himoyada, lekin fayl **egasi** (administrator) ham bosa oladi — "faqat direktor" qoidasi egaga taalluqli emas | `T_Tasdiq.js:46` |
| B21 | 🟡 | Guruh nomi (`Yo'nalish · O'qituvchi · Dars vaqti`) boshqa varaqlarda matn-kalit; o'zgarsa kaskad bilan qayta yoziladi (avval 10 to'lov uzilgan) | `C_Avto.js:114` |
| B22 | 🟡 | `excelYubor` butun jadvalni (hamma telefonlar bilan) Telegramga xlsx qilib yuboradi | `Kod.js:1221` |
| B23 | ⚪ | `tg()` 5xx da `sendMessage` ni 3 marta qayta yuboradi — takror xabar | `Kod.js:288` |
| B24 | ⚪ | `bOquvchiQidir`: S1000+ ID noto'g'ri (`slice(-3)`) | `BOT_Baza.js:178` |
| B25 | ⚪ | `TEKSHIR_hammasi`, `BOT_TEZLIK` webhook rejimida "POLL ✘", "POLLING BILAN TO'QNASHADI" deb chalg'itadi; `Kod.js` sarlavhasi "POLLING versiyasi" | `Kod.js:1326` |
| B26 | ⚪ | `DAVOMAT_ESLAT` shanba kuni dam olish guruhlarini o'tkazib yuboradi (trigger yoqilmagan) | `BOT_Davomat.js:322` |
| B27 | ⚪ | Bir martalik `Z_*` (15 fayl), `W_Malumot.js` (1881 qator eski ma'lumot), eskirgan `test_kod.js` deploy ro'yxatida | `.claspignore` |
| B28 | ⚪ | Oddiy to'lov matni: "3000 dan kichik → ×1000" ("Ali 2500" = 2 500 000), tasdiqlash qadami yo'q — faqat "Bekor" tugmasi | `Kod.js:519` |

## 5. Google Sheets — ma'lumot

| # | Daraja | Topilma |
|---|---|---|
| D1 | 🟠 | **S079 Muhammad** — Q088 "Boshlandi" matn (`"16.09.2026 "`) → Qatnashuv 89-qator, O'quvchilar 80-qator va Boshqaruv paneli (36, 52-qator) `#VALUE!`; Sheets unga hisob chiqarmayapti |
| D2 | 🟠 | **S076 Oybek Safarbayev** bir guruhga ikki marta ochiq (Q083 01.09, Q086 16.09) — Sheets ikki barobar hisoblaydi |
| D3 | 🟠 | **40 to'lovdan birortasi tasdiqlanmagan** (Tasdiq = false) — direktor tasdig'i jarayoni ishlatilmayapti |
| D4 | 🟠 | **Juft kun darslarining 40% i belgilanmagan** (64 dan 26): Arab tili, Starter, Rus tili, IELTS, Pre-Intermediate, Matematika (juft); toq kunlarda 96 dan 6 |
| D5 | 🟡 | 78/79 o'quvchida **tug'ilgan sana bo'sh** |
| D6 | 🟡 | 9 o'quvchida **birorta telefon yo'q**: S020, S044, S071–S077 |
| D7 | 🟡 | 3 o'quvchida bitta katakda ikki raqam ("… / …"): S064, S066, S068 (Ota telefoni) |
| D8 | 🟡 | 11 o'quvchi familiyasiz: S033 Asilbek, S034 Laylo, S044 Robiya, S067 Bilol, S068 Sobir, S071 Nig'monxo'ja, S072 Rahmatxo'ja, S074 Dilbek, S077 Dilnur, S078 "Kozim " (oxirida probel), S079 Muhammad |
| D9 | 🟡 | 3 o'quvchi "Faol", lekin ochiq guruhi yo'q: S037, S038, S045 |
| D10 | 🟡 | Q031 — ortiqcha to'langan −1 350 000 (oldindan to'lovmi yoki noto'g'ri kalitmi) |
| D11 | 🟡 | 16 to'lovda Usul bo'sh; 2 tasida "Terminal" (bot va bazada yo'q usul) |
| D12 | ⚪ | Narxlar: 2 ta sinov axlati — "sdfd · Jamshid · 07:00-08:30", "sdfd · Jamshid · 07:45-09:45" |
| D13 | ⚪ | Xodimlar: 1408092377 ismi "Ismini yozing" bo'lib turibdi |
| D14 | ⚪ | Probniylar: P002 "Muhammad" hali "Probniy", lekin S079 sifatida o'quvchilarga qo'shilgan |
| D15 | ✅ | Guruhlarda ustozsiz/narxsiz/bo'sh/12 dan oshgan guruh yo'q; to'lovlarda yetim, takror, sanasiz, kelajak sanali yo'q; `_Bot_log` da XATO yo'q |
