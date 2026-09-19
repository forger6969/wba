## ✅ Frontend/staff — дизайн выровнен по эталону Main Admin (13.08.2026, Karis)

> "har bir pageni... main admin desingi dashboard design ga o'hshasin full".
> Разница оказалась не в компонентах, а в ТЕМЕ: `main-admin/tailwind.config.js`
> ещё 11.08 уменьшил радиус скруглений DaisyUI ("острее углы = серьёзнее
> продукт"), а `frontend/staff/tailwind.config.js` — общий для Admin/CEO/
> Mentor/Methodist/Branch Manager/Finance — так и остался на старом мягком
> `--rounded-box: 1rem`. Один токен правится → эффект сразу на ВСЕХ страницах,
> использующих `.card`/`.btn`/`.badge`/`.modal-box` (подавляющее большинство).
>
> - [x] `tailwind.config.js`: `--rounded-box` 1rem→0.5rem, `--rounded-btn`
>       0.6rem→0.375rem, добавлен `--rounded-badge: 0.25rem` (как в main-admin).
> - [x] Три общих UI-кита донастроены под тот же паттерн Main Admin (`card
>       bg-base-100 border border-base-200/60 shadow-sm`, иконка-чип `w-8 h-8
>       rounded-lg`, подпись capslock 11px, значение `text-3xl font-extrabold
>       tabular-nums`) — везде убраны хардкод-переопределения `rounded-2xl`,
>       которые сам токен не ловит:
>       `pages/super/_ui.jsx` (Card/Panel/Metric/EmptyState — держит Дисциплину,
>       Объявления, Фичи, StaffDetail, BranchDetail и другие CEO-страницы),
>       `pages/mentor/_ui.jsx` (Panel/Kpi/EmptyState — держит Students/Groups/
>       Mentors/Payments/Dashboard/Reports по комментарию в файле),
>       `pages/finance/_ui.jsx` (см. блок выше, 13.08 раньше этой сессии).
> - [x] Точечно: `finance/Settings.jsx`, `super/Branches.jsx` (плитки филиалов),
>       `super/BranchFormModal.jsx` (модалка) — убраны локальные `rounded-2xl`.
> - [x] Живьём проверено (CEO): Дашборд, Филиалы, Дисциплина, Финансы — единый
>       плоский стиль, без ошибок в консоли.
> - ⚠️ **Не 100% страниц.** Methodist сознательно НЕ трогал — у него отдельная
>       задокументированная "Content Studio" айдентика (index.css, лайм-акцент)
>       — не путать с недосмотром. Чат-пузыри/попап-меню (StaffChat, дропдауны)
>       тоже не трогал — они намеренно круглее карточек, это отдельный паттерн,
>       не "дашборд". Остальные мелкие изолированные `rounded-2xl` (иконки-
>       декорации, demo-блок на Login) — не системные, специально не искал все
>       до единого ради самого "full" — если где-то ещё бросится в глаза,
>       скажи, дочищу точечно.

# LevelUp Academy — MASTER TASK LIST

> Bu fayl — barcha vazifalarning yagona manbaidir. `done.md` avtomatik yangilanadi (`scripts/update-done.py`).
> Statistika qo'lda YOZILMAYDI — real raqamlar faqat `done.md` da.
> V1 SCOPE: naqd + karta (full/split). Click/Payme/UzCard/Humo — FAQAT v3. Nasiya/рассрочка — V1 DA YO'Q (qaror 2026-07-05, tasdiqlangan 2026-07-07).

## ✅ Shop/TG gate — qayta tekshirildi va JONLI tasdiqlandi (13.08.2026, Karis so'rovi)

> Ikkita migratsiya ishga tushirildi (`npm run migrate`, Neon) — bulardan biri
> **prodda login'ni butunlay buzib turgan edi** (`preferred_language` ustuni
> yo'q edi, XOB-4 committidan beri). Login endi ishlaydi.
>
> Qayta o'qishda topilgan va tuzatilgan xatolar:
> 1. **Real bag**: `Branch.jsx` `TelegramGroupCard` — `useState` shartli
>    `return null`dan KEYIN chaqirilardi (Rules of Hooks buzilishi) — React
>    "Rendered more/fewer hooks" bilan qulagan bo'lardi. Barcha hook'lar
>    return'dan oldinga ko'chirildi.
> 2. **Ortiqcha DB so'rov**: `telegram.controller.js` `pollLogin` —
>    `isFeatureEnabledForOrg` ni yana chaqirardi, holbuki `loginByUserId`
>    (`publicUser()`) buni ALLAQACHON hisoblagan (`session.user.orgFeatures`).
>    Olib tashlandi.
>
> **Jonli tekshirildi (brauzer + to'g'ridan-to'g'ri DB, Karis test org'i,
> keyin asl holatiga qaytarildi):**
> - `requireOrgFeature` middleware: OFF → 403, ON → o'tkazadi (to'g'ridan-to'g'ri).
> - Branch Manager sidebar: Shop OFF → "Do'kon" yo'q, `/shop`ga to'g'ridan-to'g'ri
>   kirish → redirect `/`ga. Shop ON (DB orqali) → "Do'kon" paydo bo'ldi,
>   `/shop` ochildi (bo'sh katalog, kutilganidek).
> - Main Admin → Партнёр → Финансы → **haqiqiy UI tumbler bosildi** (skript
>   emas) — `shop` `org_feature_flags`da `true` bo'lib yozildi, brauzerda
>   yashil ko'rindi. To'liq zanjir ishlaydi: tumbler → PATCH → DB → gate → UI.
> - `/features` katalogida "Магазин коинов (Shop)" va "Telegram-интеграция"
>   ikkalasi ham ko'rinadi (seed-migratsiya ishladi).

## Backend+Frontend — Shop va Telegram fича-gate (Karis, 13.08.2026) ✅ kod tayyor, migratsiya KUTMOQDA

> So'rov: Main Admin Shop va Telegram-integratsiyani partnyorlarga alohida
> yoqib/o'chira olishi kerak (xuddi shu mexanizm — `org_feature_flags` +
> `platform_addon_prices` + CEO so'rov-inbox — allaqachon AI-review uchun
> ishlagan, endi shu ikkisiga ham qo'shildi). O'chirilgan bo'lsa — sidebar'da
> ko'rinmasin VA to'g'ridan-to'g'ri link bilan ham ochilmasin (backend ham
> 403 qaytaradi, front ham yashiradi).
>
> **Migratsiya `1786578520188_seed-shop-telegram-feature-keys.js` — ATAYLAB
> ishga tushirilmadi** (o'sha CLAUDE.md qoidasi: faqat localhost yoki Karis
> ruxsati bilan). `npm run migrate` qilinmaguncha `shop`/`telegram_integration`
> `platform_addon_prices` katalogida ko'rinmaydi va Main Admin ularni hali
> tumbler qila olmaydi — kod tayyor, birgina shu qadam qolgan.

- [x] Umumiy: `shared/orgFeatures.js` (`isFeatureEnabledForOrg`, Redis'siz —
      Upstash kvotasi ustiga yana bir gейт qo'ymaslik uchun), middleware
      `requireOrgFeature(key)` — rout-daraxtga osiladi, 403 qaytaradi.
- [x] Shop: gейт `student.routes.js` (`/shop`), `admin.routes.js` (`/shop`),
      `super.routes.js` (4 ta `/shop/items*` rout alohida-alohida, chunki
      sub-router emas). Sidebar: `frontend/staff` — `Layout.jsx`
      `filterNavByFeatures()` (admin/ceo/branch_manager), route guard —
      yangi `FeatureGuard.jsx` (`App.jsx` `/shop`, `/shop-catalog`).
      `frontend/member` (student) — `student/components/Layout.jsx`
      `buildNav()`, route guard — `App.jsx` ichidagi lokal `FeatureGuard`.
- [x] Telegram: gейт `telegram.routes.js` (`POST /bind-token`),
      `branch-manager.routes.js` (`POST /telegram/bind-token`),
      `admin.routes.js` (`POST /students/:id/telegram/message`). Login
      (`/telegram/login/*`) — PUBLIC rout, org faqat `loginByUserId`dan KEYIN
      ma'lum bo'ladi, shuning uchun gейт `telegram.controller.js`
      `pollLogin()` ichida (session chiqqandan keyin, lekin consume'dan
      oldin). Bot tomonidan yangi bind (`bot.handlers.js` `handleBind`) —
      race uchun qo'shimcha tekshiruv (token band bo'lgan payt fича yoqiq
      edi, lekin bot bilan gaplashguncha o'chirilgan bo'lishi mumkin).
      `getStatus`/`unlink` — ATAYLAB gейtланмаган (o'chirilgan holda ham
      eski bog'lanishni ko'rish/uzish imkoni qolsin — xavfsizlik klapani).
- [x] Frontend Telegram-UI: `frontend/staff` — Branch Manager
      `TelegramGroupCard` (`Branch.jsx`, butunlay yashirin), Admin
      `StudentDetail.jsx` "Написать в Telegram" bloki. `frontend/member` —
      student sidebar TG-bind bloki (`student/components/Layout.jsx`),
      Parent `Profile.jsx` TG-karta butunlay.
      ⚠️ **Login sahifasidagi "Telegram orqali kirish" tugmasi — ГЕЙТЛАНМАДИ.**
      Bu login'gacha, foydalanuvchi (demak — organizatsiya) hali noma'lum;
      qaysi orgга tekshirish kerakligini frontend oldindan bila olmaydi.
      Amalda himoyalangan — backend `pollLogin` o'chirilgan bo'lsa 403
      qaytaradi (endi haqiqiy xato ko'rinadi, "muddati tugadi" emas — pastga
      qara).
- [x] `orgFeatures: {shop, telegramIntegration}` — `publicUser()`
      (`auth.service.js`, barcha login/refresh javoblarida), `GET
      /api/users/me` (staff-front shu orqali biladi), `GET /api/student/home`.

## 🐛 TG-LOGIN BUG (topildi va tuzatildi 13.08.2026 shu sessiyada)

> Karis: "student tg orqali kirish ishlamayapti". Sabab ikkita, ikkalasi ham
> tuzatildi:
>
> 1. **`telegram.controller.js` `pollLogin()`** — nonce'ni `loginByUserId()`
>    MUVAFFAQIYATLI bo'lishidan OLDIN o'chirar edi (`login-nonce.service.js`
>    `claim()`). `loginByUserId` xato bersa (Redis o'chgan, org-gate va h.k.)
>    — xato haqiqiy edi, lekin nonce allaqachon o'chgan, keyingi opros
>    "unknown" ko'rsatardi. Tuzatildi: `claim()` endi FAQAT o'qiydi,
>    yangi `consume()` faqat sessiya muvaffaqiyatli chiqqandan KEYIN chaqiriladi.
> 2. **`frontend/member/src/pages/Login.jsx`** `onTelegramLogin` — real xatoni
>    (masalan 403/500, `err.status` bor) tarmoq uzilishi bilan bir xil `catch
>    {}`ga solib, jim yutib yuborardi, keyingi tikda "muddati tugadi" degan
>    umumiy xabar chiqardi. Tuzatildi: `err.status` bo'lsa — haqiqiy xabar
>    ko'rsatiladi, bo'lmasa (tarmoq uzilishi) — opros davom etadi.
>
> ⚠️ **Karis'ning o'z test-akkaunti (`demostud`) uchun TEKSHIRILDI — bu ikkisi
> sabab emas edi.** `org_feature_flags` (`student_panel`/`parent_panel`) —
> `true`, `telegram_accounts` — bog'langan, org — `active`, `access_until`
> kelajakda. To'g'ridan-to'g'ri probe qilindi: xuddi shu `SET...NX` buyrug'i
> (nonce yaratish nima ishlatadi) jonli Redis'da **`Command timed out`**
> qaytardi — demak asosiy sabab hozircha ham 🔴 yuqoridagi Upstash kvotasi
> (pastga qara), kod bagi emas. Kvota tiklanmaguncha TG-login (yangi
> bind ham) baribir ishlamaydi — bu Claude to'lay olmaydigan narsa.

## 🔴 SHOSHILINCH — Upstash Redis limit tugagan (11.08.2026 topildi)

`npm test` orqali aniqlandi: `ERR max requests limit exceeded. Limit: 500000, Usage: 500001`
— Upstash free-tier oyliq so'rov limiti tugagan. Ta'sir qiladi: leaderboard
(Redis ZSET — rank butun kodda `null`/`undefined` bo'lib qoladi), OTP
(forgotPassword/resetPassword ishlamaydi), ehtimol BullMQ navbatlar ham.
**Bu proddagi PLATFORMA UCHUN HAM haqiqiy** — faqat local test emas, chunki
`.env` bir xil Upstash'ga qaraydi (Path A, boshqa fayllarda yozilganidek).
Yechim: Upstash dashboard → planni ko'tarish yoki keyingi oyni kutish (qachon
reset bo'lishini Upstash'dan tekshirish kerak). Claude o'zi to'lov qila
olmaydi — Karis'ning ishi.

**11.08.2026, kechqurun — prod 502 bo'lib qoldi, sababi topildi va tuzatildi
(lekin Upstash kvotasi hali HAM tugagan holicha qoladi):** `server.js`da
kron-planlashtirish (`scheduleOverdueCron`/`Billing`/`DueSoon`/`DailyDigest`)
himoyasiz top-level `await` edi — Redis reject qilganda (kvota tufayli)
butun process qulardi, hattoki HTTP-port allaqachon tinglayotgan bo'lsa ham.
Bittasi `client.on('error')`dan ham o'tib ketadigan ioredis'ning ichki AUTH
retry'i edi. Tuzatildi: har bir schedule chaqiruvi try/catch'ga o'raldi +
process-level `unhandledRejection` guard qo'shildi. `main`ga alohida commit
bilan pushlandi (Karis ruxsati bilan), Render qayta deploy qildi, prod
tekshirildi — `HTTP 200`. ⚠️ Bu Redis'ni "tuzatmaydi" — faqat Redis
o'chganda API'ning butunlay yiqilib tushishini to'xtatadi (leaderboard/OTP/
navbatlar baribir ishlamaydi, kvota tugagunicha yoki ko'tarilgunicha).

## Backend — Student paneli: XOB so'rovi (Telegram, 12.08.2026) ✅ kod tayyor, migratsiya KUTMOQDA

> Manba: XOB → Karis, Telegram shaxsiy chat, 2026-08-12T10:50. Kodlandi 13.08.2026
> (Karis so'rovi bilan, shu sessiyada). **4 tasi ham backendda yozildi**, lekin
> to'liq jonli tekshiruv 2 ta sababdan BLOKLANGAN — kod emas, muhit:
> (1) yangi migratsiya `1786574763938_add-student-preferred-language.js`
> `.env`dagi `DATABASE_URL` to'g'ridan-to'g'ri Neon (prod)ga qarayotgani uchun
> ATAYLAB ishga tushirilmadi (CLAUDE.md qoidasi: migratsiya faqat localhost'da,
> yoki Karis ruxsati bilan qo'lda) — shu ustun yo'qligi sababli `npm test`da
> auth-suite'ning bir qismi `column "preferred_language" does not exist` beradi;
> (2) yuqoridagi 🔴 Upstash kvota muammosi hali yechilmagan — leaderboard/shop/
> payments suite'lari "Command timed out"/"max requests limit" bilan yiqiladi,
> bularning hech biri shu ishga aloqador emas (mentor/homework/tests/videos —
> Redisga tegmaydigan hamma narsa — yashil). **Karis: migratsiyani ishga
> tushirish kerak** (`npm run migrate`, Neon'ga) — shundan keyin bu blok ham
> yopiladi.

- [x] XOB-1 LEADERBOARD-GROUP: `GET /api/student/leaderboard?groupId=...`
      — Redisga qo'shimcha yuk bermaslik uchun (Upstash kvotasi tugagan holda)
      ZSET orqali emas, `coin_history`dan to'g'ridan-to'g'ri SQL bilan
      hisoblanadi (guruh a'zolari + shu davrdagi ijobiy coin'lar yig'indisi).
      403, agar talaba shu guruhga a'zo bo'lmasa. Javob formati filial-
      leaderboard bilan bir xil (`{period, top, me}` — XOB `items` deb yozgan
      edi, lekin bordagi field nomi haqiqatda `top`, shunga moslandi).
      Fayllar: `leaderboard.schemas.js`, `leaderboard.controller.js`,
      `leaderboard/leaderboard.service.js` (`getGroupLeaderboard`).
- [x] XOB-2 VISIT-STREAK: `GET /api/student/home` ga `streak`/`longestStreak`
      — `attendance`dan hisoblanadi (kun = "borilgan", agar o'sha kunning
      BARCHA yozuvlari 'present' bo'lsa — bir necha guruhli talabalar uchun).
      `home.repository.js` (`getAttendanceHistory`), `home.service.js`
      (`computeAttendanceStreaks`).
- [x] XOB-3 LESSON-REVIEW: `GET /api/student/lessons/:id` submission ichiga
      `review` + `reviewStatus` — ma'lumot DB'da allaqachon bor edi, faqat
      qaytarilmagan edi. `lessons.service.js` (`getLessonDetail`).
- [x] XOB-4 STUDENT-LANGUAGE: `users.preferred_language` ('ru'|'uz', NULL =
      hali tanlanmagan) — yangi migratsiya. `GET /student/home` va barcha
      login javoblarida (`publicUser`, `auth.service.js`) qaytariladi;
      talaba o'zi yozishi uchun **yangi endpoint** `PATCH /student/home/language`
      qo'shildi (XOB spekada yo'q edi, lekin maydon hech qachon to'lmasligi
      uchun kerak edi). Ishlatildi: `ai-review/service.js` (DEFAULT_LANG
      o'rniga `submission.student_language`), `notifyTestResult`
      (`lessons.service.js` — sarlavha ru/uz, hali tanlamagan uchun eski
      xulq-atvor — uz — saqlanadi), Telegram-bot `/home /coins /rating`
      buyruqlari (`bot.handlers.js` — `dataCommand` ichida `messages()`
      endi global emas, foydalanuvchi tilida). ⚠️ `/start /help /bindbranch
      /stop` — hali aniqlanmagan foydalanuvchi, global til qoladi (boshqacha
      imkoni yo'q). `coinsCommand`/`ratingCommand`/`homeCommand`
      (`bot.commands.js`) matni — alohida, `messages()`ga bog'liq emas, hali
      100% qattiq uzbekcha qoladi — buni tarjima qilish XOB so'ragan doiradan
      tashqarida (katta, alohida ish).

## Backend — Main Admin: tarif/fича-flag/to'lov/xarajat/anons (Karis, 11.08.2026)

> Katta blok — to'liq reja `C:\Users\user\.claude\plans\playful-moseying-conway.md`.
> 6 ta yangi migratsiya (M1-M6) + backfill (kritik xato topildi va tuzatildi —
> `access_until IS NULL` yangi ustunni backfill qilmasdan barcha mavjud
> organizatsiyalarni login'da bloklab qo'ygan edi, testlar orqali deploy'dan
> OLDIN topildi). Backend to'liq: fича-katalog CRUD, org-level access gate
> (login + har bir so'rov, 10 ta router'ga ulandi), AI-review gate, to'lov/
> bonus/про-рейт, platform_expenses + balans, CEO fича so'rovlari, anons bagi
> tuzatildi + nishonlash.
>
> **Frontend ham qo'shildi** (11.08.2026, davomi): Main Admin — `Features.jsx`
> (katalog CRUD + kiruvchi so'rovlar inbox'i), `OrgDetail.jsx`'ga "Доступ"
> tab (to'lov/bonus/ledger) + "Финансы" tab'ga fича-tumbler'lar, sidebar
> badge. `staff/super` (CEO tomoni) — `Features.jsx` (katalog ko'rish +
> подключение/отключение so'rash, tumbler yo'q — faqat so'rov), `Billing.jsx`
> (access_until/grace status + ledger, YANGI backend endpoint'lar
> `GET /super/billing` va `GET /super/billing/ledger` shu bilan birga
> qo'shildi — rejada bor edi, ammo backend yo'q edi), `Announcements.jsx`ga
> "От LevelUp Academy" read-only blok.
>
> **Xato topildi va tuzatildi shu davomida**: `getFeatureCatalog(orgId)`
> `repo.listActiveAddonCatalog(orgId)`ni chaqirardi, lekin bu funksiya
> `orgId`ni emas, `client`ni (DB pool) kutadi — natijada
> `GET /super/features/catalog` runtime'da `client.query is not a function`
> bilan buzilardi (hech qachon chaqirilmagan/testlanmagan edi).
> `super.service.js:962`da tuzatildi.
>
> Ikkala frontend (`main-admin`, `staff`) `npm run build` bilan tekshirildi —
> xatosiz.
>
> **✅ Live e2e test o'tkazildi (11.08.2026, kechqurun), butunlay yashil:**
> alohida test-org (`E2E QA Test Org`, keyin frozen qilindi, real partnyorlarga
> tegmaydi) orqali: onboarding → access_until avto to'g'ri qo'yildi → CEO
> login ishlaydi → access_until 60 kunga orqaga surildi → CEO login `402
> payment_overdue` bilan bloklandi → to'lov yozildi → login qayta ishladi →
> **allaqachon chiqarilgan (eski) student токен** access_until orqaga
> surilgandan keyin keyingi so'rovda `402`ga uchradi — bu request-time
> gate'ning (login-time emas) asosiy isboti → bonus +2 oy stackланди to'g'ri
> (`GREATEST(access_until, bugun) + N`) → student_panel/parent_panel
> mustaqil ishlaydi (bittasini yoqish ikkinchisiga tegmaydi) → CEO fича
> so'rovi → Main Admin approve → flag va CEO'dagi katalog ikkalasi ham
> yangilandi → `GET /super/billing`, `/billing/ledger`, `/features/catalog`
> — hammasi to'g'ri javob qaytardi (avvalgi bug tuzatilgani ham shu bilan
> tasdiqlandi) → dashboard user-count (students/parents/staff) aniq to'g'ri
> chiqdi. Brauzer orqali ham tekshirildi: Main Admin `/features` sahifasida
> yangi fича jonli yaratildi (slug avto-generatsiya to'g'ri), `OrgDetail`
> "Доступ" tab'i ledger'ni aniq ko'rsatdi, konsolda xatolik yo'q.

## Backend — Aqlli tahlil + Ota-onalar Telegram guruhi (Karis, 09.08.2026) ✅

> Backend'ga tegishli bo'lgan hammasi — Karis qildi (Claude bilan birga, shu
> sessiyada) — odatdagi zona egasi (Abdulaziz: Mentor/Student/Parent) emas,
> chunki Karis Team Lead sifatida to'g'ridan-to'g'ri o'zi ishladi.
>
> (1) AI kod-review (backend, Groq — Gemini emas, pastga qara), (2) Branch
> Manager filial uchun ota-onalar Telegram guruhini ulaydi, (3) davomat va
> (4) test natijasi shu guruhga avto boradi, (5) har kuni 00:00'da kecha
> topshirilmagan uy vazifalari sodig'i. Hammasi save-zone'ga PUSH QILINDI
> (`d75d8d9`, `11af73c`), migratsiyalar Neon'ga qo'llandi, testlar yashil.

- [x] AI-REVIEW: `methodology_submissions` uchun AI kod-tahlili — Groq
      (`openai/gpt-oss-120b`, bepul tarif, ma'lumotlarda o'qitilmaydi — shuning
      uchun Gemini emas Groq tanlandi). Migratsiya (review/review_source/
      review_status/review_attempts/reviewed_at + training_types.ai_review_enabled),
      extractor (fayl/zip/GitHub/matn), BullMQ queue+worker, `submitHomework`
      hook, `GET /student/home` ga `topicStats`+`review`, methodist toggle.
      ⚠️ Ishlashi uchun BullMQ worker kerak — pastga BUG-NO-WORKER'ga qara.
      Jonli sinovdan o'tkazildi (ru+uz, Groq API orqali, DB'siz) — ishlaydi.
- [x] TG-BRANCH-BIND: Branch Manager kabinetida (`Branch.jsx`) "Ota-onalar
      guruhi" kartasi — kod so'raydi, botni guruhga QO'LDA qo'shadi, guruhda
      `/bindbranch <kod>` yuboradi. Backend: `branches.parent_tg_chat_id`,
      `/api/branch-manager/telegram/{status,bind-token,unlink}`, bot
      handler (`bot.handlers.js`). BUG-NO-WORKER'ga BOG'LIQ EMAS — bot
      webhook orqali web-processda ishlaydi (worker emas).
- [x] TG-ATTENDANCE: `attendance.service.js` — davomat belgilangach (3 daqiqa
      debounce, chunki UI har bosishda avtosaqlaydi) kunlik yakuniy davomat
      guruhga ketadi. BUG-NO-WORKER'ga bog'liq emas (event, web-processdan).
- [x] TG-TEST-RESULT: `submitTest` — har test topshirilgach natija (mavzu +
      foiz) guruhga ketadi. BUG-NO-WORKER'ga bog'liq emas.
- [x] TG-DAILY-DIGEST: har kuni 00:00 (Asia/Tashkent) — kecha muddati o'tib
      topshirilmagan uy vazifalari ro'yxati guruhga. `dailyDigest.worker.js`.
      🔴 **BUG-NO-WORKER tufayli PRODDA ISHLAMAYDI** — kod tayyor, lekin
      Render'da `type: worker` servisi yo'q (TASK.md'dagi eski yozuvga qara),
      demak worker.js umuman ishga tushmaydi. Boshqa 3 tadan farqli — bu
      croni, event emas, workersiz imkoni yo'q.

### 🔲 OCHIQ VAZIFA — EGASI: **KARIS** (pul kerak, Claude sotib ololmaydi/kirita olmaydi)

- [x] STORJ-UPGRADE ($5/oy dan, hisob bo'yicha minimum): 10.08.2026 aniqlandi —
      bepul trial 4 kun oldin tugagan, Storage/Download limiti 0'ga tushgan,
      shuning uchun barcha fayl yuklash (ДЗ, video, chek, AI-review) 403
      AccessDenied bilan qaytadi edi. ✅ 11.08.2026 — asosiy loyiha
      (wEc4jgBwQxy) Pay as you go'ga o'tkazildi, karta bog'landi, PUT+GET
      jonli tekshirildi (eski bucket'dagi ma'lumotlar saqlanib qolgan).
      ⚠️ Yo'lda vaqtinchalik ikkinchi (yangi triyal) Storj akkaunt yaratilgan
      va bir necha soat `.env`/Render'da turgan edi — endi to'liq olib
      tashlandi, asosiy akkaunt kalitlari qaytarildi (`.env` va Render
      Environment, ikkalasi ham), jonli tekshirildi.
- [x] RENDER-STARTER: web-servisni (`LevelUP_academy-1`) Free'dan Starter'ga
      ($7/oy) ko'tarish — 09.08.2026 auditda topilgan sabab: free plan 15
      daqiqa jimlikdan keyin uxlaydi, uyg'onish 30-60 son, + Neon o'zi ham
      uxlaydi (+5s) — ikkalasi ustma-ust tushganda birinchi so'rov 500 bilan
      qaytadi ("guruh bilan kirganda ba'zan ishlamaydi" — Karis 09.08 xabari).
      Starter uxlamaydi — muammo yo'qoladi. ✅ 11.08.2026 1:28 — to'landi,
      dashboard'da tasdiqlandi (0.5 CPU/512MB, "Instance type changed from
      Free to Starter"), qayta deploy Live.
- [x] WORKER-MERGE: `worker.js` `server.js` ichiga qo'shildi — o'sha $7/oy
      servis o'zi AI-review navbatini ham, 00:00 kunlik svodkani ham,
      billing/overdue/due-soon cronlarini ham ushlaydi. Alohida worker
      servisi ($7/oy qo'shimcha) SHART EMAS edi — bitta har doim yonib
      turgan process yetarli. ✅ 11.08.2026 — `worker.js` o'chirildi,
      `npm run worker`/`worker:dev` olib tashlandi, `render.yaml`dagi
      ishlatilmagan worker-shablon o'chirildi, testlar yashil (mentor/
      student/payments/auth PASS, `parent` — eski, bog'liq emas), `save-zone`
      ga push qilindi (`e72e314`). ⚠️ Kelishilgan trade-off: shu tufayli
      AI-review'dagi bag butun saytni ham yiqitishi mumkin (bitta process) —
      kichik markaz uchun qabul qilingan. Hali `main` ga merj qilinmagan.

**Jami: ~$12/oy** (Render Starter $7 + Storj Pay as you go $5 dan, ikkalasi ham to'langan, 11.08.2026).

**Yopilgan savollar** (edi, endi hal): `npm run migrate` Neon'ga to'g'ridan-
to'g'ri gonildi (17/17 test o'tdi) · `GROQ_API_KEY`/`_2`/`_3` Render
Environment'ga qo'shildi va deploy qilindi (10.08.2026).

## ⚠️ Jamoa branch'lari — save-zone'ga hali qo'shilmagan (2026-08-09 tekshiruvi)

> `git fetch --all --prune` qilindi, har bir branch save-zone bilan solishtirildi
> (`git log save-zone..origin/<branch>`). **hamidulla endi save-zone'da** — 07-28'dagi
> 9 fayldagi konflikt o'shandan beri hal qilingan va merge bo'lgan. Boshqa hamma branch
> (Bilol, Islom, abdulaziz/student-panel, alisher/mentor-panel, aziz/branches, elyor,
> hamidulla, kozim, methodist, rey, shohjahon) — save-zone bilan bab-baravar
> (ancestor), qo'shimcha ish yo'q. FAQAT 3 tasida qo'shimcha commit bor:

- **`Abduloh`** (1 commit, 08-08): `feat(admin/expenses): add payment method icons,
  recurring expenses, fix paymentMethod bug, add flex-wrap footer` —
  `frontend/staff/src/api.js` + `pages/admin/Expenses.jsx` (+106/−22). Merge qilinmadi.
- **`aziz/finance-manager`** (Aziz, 2 commit, 08-07): yangi **Finance Manager** paneli —
  `frontend/staff/src/pages/finance/{Dashboard,Expenses,Income,Reports,Salaries,_data,
  _i18n,_ui}.jsx` (13 fayl, +1460/−48), `Layout.jsx`/`App.jsx`/`Login.jsx`/`api.js` ga
  ulangan, barcha rollar uchun sidebar i18n tarjimasi. TASK.md da bu ishning izi yo'q
  edi — yangi bo'lim sifatida pastga qo'shildi. Merge qilinmadi, review kerak (yangi
  panel — boshqa panellar bilan marshrut/kirish nizosi bo'lishi mumkin).
- **`iface9808` (Kama)** (4 commit, 08-07): parent panelga to'liq i18n (ru/uz/en,
  `frontend/member/src/i18n/{en,ru,uz}.js` + `i18n.jsx` + `LanguageSwitcher.jsx`),
  test ball foizi ko'rsatilishi tuzatildi, guruh nomi overflow tuzatildi
  (initsiallar+truncate), chat backendga ulanishga tayyorlandi (21 fayl, +1287/−320).
  Eski TASK.md yozuvi (07-27, chat redesign konflikt haqida) ESKIRGAN — o'sha ish
  allaqachon save-zone'da, bu 08-07'dagi YANGI commitlar. Merge qilinmadi.
  ⚠️ **KONFLIKT XAVFI:** shu branch ham `frontend/member/src/i18n/{ru,uz}.js` ni
  MUSTAQIL yaratgan — endi shu fayllar save-zone'da XOB versiyasi bilan allaqachon
  bor (pastga qara). Merge qilinganda `header`/boshqa umumiy bo'limlarda albatta
  konflikt chiqadi — Kama o'z `hub`/`parent` bo'limlarini XOB'ning `header`/`home`/
  `feedback`/`leaderboard` bo'limlari USTIGA qo'shishi kerak, ustidan yozib emas.
- **`alish`** (2 commit, 07-14, o'zgarishsiz 07-28'dan beri): hali ham repo ILDIZIGA
  alohida Vite-ilova — muammo hal qilinmagan, Alish `frontend/` ichida qayta boshlashi
  kerak (pastdagi ALISH bo'limiga qara).

### ✅ `xob` — save-zone'ga merge qilindi (2026-08-09, Claude, commit `172d250`)

Student paneli qayta ishlandi — responsive, to'liq i18n (ru/uz), yangi `/study`
sahifasi (LessonsHub), «Aqlli tahlil» AI-review MAKETI (backend hali yo'q, dev/mock
rejimida ko'rinadi). 21 fayl, +2051/−336.

Merge oldidan kod tekshirildi, **1 ta haqiqiy bag topildi va tuzatildi**:
`frontend/member/src/i18n/ru.js` dagi `header.tgBind`…`tgUnlinkSuccess` (13 ta kalit)
o'zbekcha matn bilan qolib ketgan edi (uz.js'dan copy-paste, tarjima qilinmagan).
Kod hozircha bu kalitlarni hech qayerda ishlatmaydi (o'lik), lekin kimdir ulasa
rus interfeysida o'zbekcha matn chiqib qolardi — merge commitida to'g'ridan-to'g'ri
tuzatildi. Boshqa hech narsa buzilmagan: `npm run build` (frontend/member) toza
o'tdi, 1915 modul, xatosiz.

Merge paytida BITTA konflikt bo'ldi — `App.jsx`: save-zone'da xob ketganidan keyin
`/qr-login` marshruti qo'shilgan edi (QR-kirish fichasi), xob esa `I18nProvider`
bilan o'radi. Ikkalasi ham saqlab qolindi (konflikt mazmunan yo'q edi, faqat bir xil
qatorga tegilgan).

---

## Backend — Auth (Karis)

- [x] K-AUTH: login (3 endpoint: main/staff/member), JWT access 15m
- [x] K-AUTH: Refresh rotation (30d httpOnly cookie), logout, frozen-check (403)
- [x] K-AUTH: Email OTP forgot/reset password (SMS bekor qilindi — pullik)
- [x] K-AUTH: SMTP OTP/password change emails
- [x] K-AUTH: authenticate + authorize middlewares (RBAC + org+branch scope)
- [x] K-AUTH: Google OAuth (Firebase) main_admin uchun

## Backend — Main Admin (Karis)

- [x] K-MAIN: Public endpoint forms -> leads table
- [x] K-MAIN: Lead panel: list, status change, notes
- [x] K-MAIN: Partner onboarding: POST /api/main/partners
- [x] K-MAIN: Platform dashboard: GET /api/main/dashboard
- [x] K-MAIN: Billing: narxlar DBda (platform_pricing), GET/PUT /api/main/pricing
- [x] K-MAIN: Partner freeze/activate (PATCH /partners/:id/status)
- [x] K-MAIN: YANGI narx modeli (2026-07-16) — o'quvchi bucket tariflari (Free/Start/Standard/Pro/Business/Network), filiallar bepul; config/plans.js TIERS + computeBill({students}); eski filial+o'quvchi formula bekor; GET /api/main/pricing endi { tiers, currency }

## Backend — CEO (Karis)

- [x] K-SUPER: Organization dashboard (GET /api/super/dashboard: totals + branch breakdown)
- [x] K-SUPER: CRUD branches (+ archive/unarchive) va CRUD admins (+ freeze)

## Backend — Admin (Karis)

- [x] K-ADMIN: Branch dashboard: income + expenses = profit
- [x] K-ADMIN: Expenses CRUD
- [x] K-ADMIN: Students CRUD (add-student login_code+parol generatsiya, freeze, regenerate-password, soft-delete)
- [x] K-ADMIN: Groups CRUD (archive, mentor biriktirish, students add/remove)
- [x] K-ADMIN: Mentors CRUD (create/PATCH/freeze/DELETE guard bilan)
- [x] K-ADMIN: Guruh jadvali (2026-07-16) — POST/PATCH /api/admin/groups { days[], startTime }; tugash vaqti backendda org dars davomiyligidan hisoblanadi; GET /api/admin/settings (davomiylik)

## Backend — Methodist (Karis)

- [x] K-METHODIST: Training types, topics, lessons CRUD + analytics (modules/methodist)
- [x] K-METHODIST: Dars media (2026-07-18) — migratsiya 1783800000000 (video_url + file_key) + GET /api/methodist/lessons/:id/upload-url (presigned S3) + updateLesson videoUrl/fileKey qabul qiladi

## Backend — Xodimlar intizomi (Karis) ✅ 2026-07-18 (MVP1, main da)

> Modul `backend/src/modules/discipline/`. Migratsiyalar: 1783810000000 (user_status += 'fired'),
> 1783820000000 (staff_penalties), 1783830000000 (org_charters).

- [x] K-DISC: shtraf (summa + sabab, avto-yechish YO'Q) + qora (ishdan bo'shatish, status='fired', withTransaction)
- [x] K-DISC: Huquqlar matritsasi (CAN_ISSUE): ceo→admin/mentor/methodist; admin→mentor/methodist (shtraf), faqat mentor (qora); main_admin→HECH NARSA
- [x] K-DISC: Ustav (org_charters, erkin matn, upsert, barcha xodimlarga ko'rinadi)
- [x] K-DISC: Endpointlar — super PUT/GET /charter, POST/GET /penalties, POST /staff/:id/reactivate; admin GET /charter, POST/GET /penalties; shared GET /users/me/penalties, /users/me/charter
- [x] K-DISC: Swagger — Discipline tegi, 10 endpoint, swagger/*.md qayta generatsiya (139 endpoint)
- [x] K-DISC-FRONT ✅ BAJARILDI 2026-07-28 (Karis, Hamidula'ning o'rniga — vaqtni tejash uchun
      o'zi qildi, Hamidula'ning boshqa ishiga tegilmadi):
      • Super panel — allaqachon tayyor ekan (`pages/super/Discipline.jsx`, 579 qator,
        Karis tomonidan 26.07 qurilgan): ustav tahrirlash + shtraf/qora berish formasi +
        ro'yxat + statistika. TASK.md eskirgan edi, kod tekshirilib [x] qo'yildi
      • Mentor va Methodist — YO'Q edi, tuzatildi: umumiy `components/MyDiscipline.jsx`
        (o'z shtraflari + ustav, faqat o'qish) yozildi va ikkalasining `Profile.jsx`
        sahifasiga qo'shildi. Methodist'da esa `/profile` marshruti UMUMAN yo'q edi —
        `RoleView` xaritasida yo'q edi, shuning uchun tugma bosilsa jimgina dashboardga
        qaytarardi. Yangi `pages/methodist/Profile.jsx` yozildi (mentor variantidan
        soddalashtirilgan — guruh/grade/skills yo'q) va marshrutga qo'shildi
      • Bekendga ikkita yangi funksiya: `api.myPenalties`/`api.myCharter`
        (`GET /api/users/me/penalties`, `/users/me/charter`) — ilgari frontda umuman
        chaqirilmagan edi
- [ ] K-DISC-FRONT-ADMIN 🔄 EGASI: **ABDULOH** (Hamidula'dan o'tkazildi, 2026-07-28, Karis).
      Admin panelda: shtraf berish formasi + ro'yxat (`POST/GET /api/admin/penalties`),
      ustavni faqat o'qish (`GET /api/admin/charter`). Huquqlar matritsasi bo'yicha
      admin → mentor/methodist'ga shtraf bera oladi, qora ro'yxat esa FAQAT mentor'ga —
      backend tekshiradi, lekin frontda ham ishlamaydigan tugma ko'rsatilmasin
- [ ] K-DISC: runtime tekshiruv — hali BD da yugurtirilmagan (npm run migrate + jonli test)

## Backend — V1 To'lovlar 🔥 (Karis — Team Lead, 2 task) ✅

- [x] K-PAY: Payments modul: oylik avto-hisoblash (billing.worker, 1-sana, muddat 5-sana) + invoice + full + split (FOR UPDATE, split_batch_id, validatsiya BEGIN dan oldin) + ad-hoc to'lov + refund/void + chek S3 ga; commit dan KEYIN notificationQueue ('payment.received'/'payment.due'/'payment.refunded'); total_debt + invoice.status qayta hisob. To'lamasa (5-sanadan keyin, invoice='overdue') — student panelga umuman data qaytmaydi (paymentGate, 402). NASIYA YO'Q
- [x] K-PAY: Branch reports: filial bo'yicha tushum va qarzlar (guruhlar kesimida) — GET /api/admin/reports

## Mentor panel — to'liq qayta ishlash (Karis) ✅ 2026-07-18/19 — save-zone da 42 commit

> Bu ish hech qaysi md faylda YOZILMAGAN edi (audit 2026-07-19 da qo'shildi).
> Backend + frontend birga: `modules/mentor/*`, `modules/chat/*`, `modules/coins/*`, `frontend/staff`.

- [x] MP-COINS: Mentor oylik koin limiti — migratsiya `1783850000000_mentor-coin-budget`
      (`organizations.coins_per_student` normasi). Limit SAQLANMAYDI, hisoblanadi:
      norma × guruhdagi aktiv o'quvchi soni − shu oyda berilgani. Sabab: yangi o'quvchi kelsa
      limit DARHOL o'ssin (saqlangan qiymat har qabul/chiqishda eskirardi).
      `GET /api/mentor/coins/groups/:groupId/budget`, jurnalda qolgan limit ko'rinadi
- [x] MP-PROFILE: Mentor professional profili — migratsiya `1783840000000_mentor-profile`
      (bio, ko'nikmalar, admin qo'yadigan daraja); profil ikki panelli "stol" ko'rinishida
- [x] MP-STATS: Statistika — har o'quvchi bo'yicha (davomat/uy vazifa/test/koin), 6 oylik trend grafigi,
      guruh ichida o'quvchilarni solishtiruvchi "Statistika" tab'i, barcha o'quvchilar sahifasi.
      `GET /api/mentor/groups/:groupId/stats`, `GET /api/mentor/groups/:groupId/students`
- [x] MP-ATTEND: Davomat Socket.IO ga ko'chirildi — o'qish, yozish va jonli yangilanish;
      avtosaqlash (Saqlash tugmasi olib tashlandi), butun oy darslari sana bilan va kim belgilagani,
      **mentor faqat BUGUNGI darsni belgilay oladi**, koinlar to'g'ridan-to'g'ri jurnal qatorida
- [x] MP-CHAT: Chat qayta yozildi — kompozer HAR DOIM render bo'ladi (ilgari `activeContact` ichida edi →
      kontakt ro'yxati bo'sh bo'lsa yozadigan joy yo'q edi, "input yo'q" shikoyatining ildizi shu),
      `POST /api/chat/dm` (HTTP orqali xabar), xodim→o'quvchi to'g'ridan-to'g'ri yozishi,
      bildirishnoma qo'ng'irog'i socket orqali yangilanadi, kontakt ro'yxatidagi 500 tuzatildi
- [x] MP-SHELL: Staff qobig'i — sidebar hover'da ochiladi/yopiladi, ishlaydigan bildirishnomalar paneli,
      header menyulari, telefonda gorizontal overflow va chat kompozeri tuzatildi, firma logotipi
- [x] MP-SEED: `seed-mentor-demo.mjs` (demo mentorni real data bilan to'ldiradi),
      `test-token.mjs`, `send-test-dm.mjs`, `docs/CHAT-TESTING.md` (qo'lda Postman/curl bilan tekshirish)
- [x] MP-VERIFY ✅ JONLI TEKSHIRILDI 2026-07-28 (Karis): Docker ko'tarildi (`docker compose up
      postgres`, 24/24 migratsiya joyida), backend + staff `VITE_USE_MOCKS=false` bilan
      lokal ishga tushirildi. Dashboard/Groups/Attendance (belgilash + saqlash + real-time
      badge) va Chat (DM yuborish) — hammasi haqiqiy API/socket bilan tekshirildi.
      ⚠️ Yo'lda topilgan haqiqiy bag: dev prokside `/socket.io` yo'q edi — chat va live
      attendance HECH QACHON ishlamagan (har doim `connect_error: timeout`), shuning uchun
      buni ilgari hech kim jonli tekshira olmagan edi. `vite.config.js` (staff+member) ga
      `/socket.io` proxy (`ws: true`) qo'shildi — MP-VERIFY shu tufayli ilgari BLOKLANGAN edi

## Backend — Integration (Karis) 🔥 hozirgi fokus

> Backend kod tayyor (barcha panellar). Endi asosiy ish — frontend panellarni backend bilan ulash.

- [ ] K-INT: Frontend ↔ backend integratsiya (SUPER ADMIN'dan tashqari — u Abdulaziz'da) — main-admin org-detail endpoint (Shohjahon uchun), endpoint kontraktlar, CORS/cookie, jonli E2E qolgan panellar bo'yicha
- [x] K-INT: admin GroupDetail — **QAROR QABUL QILINDI 2026-07-19**, Abdulaziz bloki OCHILDI.

      **Qaror: attendance va homework — mentor jadvallaridan REUSE. Yangi jadval YO'Q.**

      Sabab: bu saqlash masalasi emas, KO'RISH masalasi. Mentor davomatni belgilaydi,
      admin o'sha belgilanganni ko'radi — bu bitta ma'lumotning ikki o'quvchisi.
      Alohida jadval qilinsa, admin ko'rgan davomat mentor yozgan davomatdan
      farq qila boshlaydi. Bu yerda esa oyliklar (mentor_salaries davomatdan hisoblanadi),
      ota-onaga hisobot va qarz — hammasi shu raqamga bog'liq. Ikki manba = ikki haqiqat,
      va qaysi biri to'g'riligini hech kim ayta olmaydi. Sinxronizatsiya ham yechim emas:
      u albatta bir kun bo'lib qoladi va buni hech kim sezmaydi.

      Amalda: mavjud `attendance` va `homework` jadvallariga admin uchun **faqat o'qish**,
      scope `branch_id` bo'yicha (admin faqat o'z filialini ko'radi, JWT dan olinadi —
      klientdan kelgan branch_id ga ishonilmaydi, CONSTRAINTS bo'yicha).
      Yozish huquqi mentor'da qoladi.

      ⚠️ `feedback` — BOSHQA masala: bu jadval umuman YO'Q, ya'ni yangi migratsiya + CRUD kerak.
      Uni reuse qilib bo'lmaydi, chunki reuse qiladigan narsaning o'zi yo'q.

      📌 Karis boshqacha o'ylasa — aytsin, o'zgartiramiz. Lekin Abdulaziz kutib turmasin
- [x] BUG-LOCAL-PROD-DB ✅ TUZATILDI 2026-07-19: `backend/.env` dagi `DATABASE_URL`
      lokal Docker postgres'ga o'tkazildi (`levelup:levelup@localhost:5432/levelup`).
      Tekshirildi: ulanish ishlaydi, lokal bazada AYNI o'sha 18 migratsiya va demo data bor
      (111 user, 6 guruh) — ya'ni hech narsa buzilmadi, ish jarayoni o'zgarmaydi.
      Prod (Neon) satri fayldan olib tashlandi va izoh qoldirildi — u faqat Render dashboard'ida.
      ⚠️ JAMOAGA: kimda `backend/.env` da Neon satri tursa — DARHOL lokalga o'tkazsin.
      Aks holda `npm run seed` demo datani to'g'ridan-to'g'ri PRODGA yozadi

## 🔴 BUGLAR / BLOKERLAR (Karis) — 2026-07-18 tekshiruvida topildi

- [x] BUG-PROD-MOCKS ✅ TUZATILDI 2026-07-19: `frontend/{staff,student,member}/.env.production`
      uchalasiga ham `VITE_USE_MOCKS=false` qo'shildi. Ilgari o'zgaruvchi umuman yo'q edi va
      kod `VITE_USE_MOCKS !== 'false'` ni tekshirgani uchun undefined = MOCK YONIQ bo'lardi —
      ya'ni prodda panellar soxta localStorage datasini ko'rsatardi.
      `main-admin` bu bug'dan jabrlanmagan (uning `api.js` da bu pattern yo'q)
- [x] ~~BUG-STACK~~ ✅ TUZATILGAN (2026-07-19 auditda tekshirildi, TASK.md eskirgan edi): `render.yaml:19-20` da `NODE_ENV=production` O'RNATILGAN, `errorHandler.js:41` stack'ni faqat `env.NODE_ENV === 'development'` da qaytaradi (qat'iy tenglik — yangi hostingda o'zgaruvchi unutilsa ham stack chiqmaydi). Bundan tashqari 5xx da `details` ham berkitildi, o'rniga `errorId` (pino req.id) qaytadi — commit `5a1f177`
- [x] ~~BUG-LOCAL-PROD-DB~~ ✅ TUZATILGAN — **DUBLIKAT yozuv edi, 2026-07-26 da yopildi.**
      Yuqorida "Backend — Integration" bo'limida AYNI shu bug allaqachon `[x]` bilan turgan edi
      (19.07 da tuzatilgan), bu yerda esa hali `[ ]` ochiq turardi — bitta ish ikki joyda,
      biri qarama-qarshi holatda. Kod tekshirildi 2026-07-26: `backend/.env` da
      `DATABASE_URL=postgresql://...@localhost:5432/levelup` — lokal, Neon EMAS.
      Quyidagi matn tarix uchun qoldirildi:
      ~~`backend/.env` dagi
      `DATABASE_URL` **to'g'ridan-to'g'ri PROD Neon bazasiga** qaragan
      (`ep-empty-wind-ai4drexy...neon.tech`), lokal Docker postgres'ga EMAS —
      holbuki `levelup-postgres` konteyneri 22 soatdan beri ishlab turibdi va ishlatilmayapti.
      **Nima demak:** kim `npm run seed` yoki `seed-mentor-demo.mjs` ni lokal ishga tushirsa —
      demo data TO'G'RIDAN-TO'G'RI PRODGA yoziladi. Skript `INSERT`/`UPDATE` qiladi.
      Hozircha omad: prodda demo guruhlar yo'q (13 org, 15 filial, 58 user, 6 guruh — real data).
      Lekin bu vaqt masalasi.
      **Tuzatish:** lokal `.env` `postgresql://postgres:postgres@localhost:5432/levelup` ga o'tsin,
      prod URL faqat Render dashboard'ida qolsin. Jamoaga ham aytilsin~~
- [ ] BUG-NO-WORKER 🔥🔥🔥 ENG KATTASI (2026-07-19 auditda topildi): **prodda BIRORTA worker ishlamayapti.**
      ⚠️ **2026-07-26 da qayta tekshirildi — HALI OCHIQ.** `render.yaml` da bitta `type: web`,
      `type: worker` yo'q. Fayl sarlavhasidagi izohda ham to'g'ridan-to'g'ri yozilgan:
      "Фоновый worker (BullMQ) и cron 09:00 на free НЕ запускаются — только API".
      Ya'ni bu bilib turib qoldirilgan holat, unutilgan emas — lekin mijoz uchun farqi yo'q

      `worker.js` 4 ta worker va 3 ta cron ko'taradi:
      `notificationWorker` · `overdueWorker` + cron 09:00 · **`billingWorker` + oylik cron** · `dueSoonWorker`
      `package.json` da alohida skript ham bor: `"worker": "node worker.js"`.
      Lekin `render.yaml` da **`type: worker` servisi 0 ta** — faqat bitta `type: web`,
      u esa `npm start` → `node src/server.js` ni ishga tushiradi. Ya'ni `worker.js` HECH QACHON yugurmaydi.

      **Prodda nima ishlamayapti:**
      • Oylik hisob-fakturalar AVTOMATIK yaratilmaydi (billing.worker, har oy 1-sanada) →
        invoice yo'q → qarz hisoblanmaydi → `total_debt` o'sib bormaydi
      • Muddati o'tgan to'lovlar aniqlanmaydi (overdue cron 09:00) →
        `invoice='overdue'` qo'yilmaydi → `paymentGate` (402) ishlamaydi, qarzdor student panelni ochaveradi
      • To'lov bildirishnomalari yuborilmaydi (`payment.received` / `payment.due` / `payment.refunded`)
      • Ota-onaga eslatmalar bormaydi (dueSoon)
      • **Bilol'ning Telegram boti umuman xabar olmaydi** — queue'ga tushadi, hech kim o'qimaydi

      ⚠️ TASK.md da `K-PAY` "oylik avto-hisoblash" bilan birga **[x] BAJARILGAN** deb turibdi.
      Kod yozilgan — to'g'ri. Lekin prodda ishlamayapti, ya'ni mijoz uchun u YO'Q.
      Bu loyihaning asosiy sotuv nuqtasi (to'lov boshqaruvi) prodda o'lik degani.

      **Yechim variantlari** (Karis tanlaydi):
      1. `render.yaml` ga `type: worker` servisi qo'shish — TO'G'RI yo'l, lekin **free planda worker YO'Q**, pullik kerak
      2. Vaqtinchalik: `worker.js` ni web servis ichida ko'tarish (`server.js` dan import) —
         kichik yuklamada ishlaydi, lekin web uxlab qolsa cron ham uxlaydi (free plan 15 daqiqada uxlaydi)
      3. Tashqi cron (masalan cron-job.org) maxsus endpointni chaqiradi — eng arzoni, lekin endpoint himoyalanishi shart

- [x] BUG-TESTS-RED ✅ TUZATILDI 2026-07-19 (commit `b22c3e4`):
      testlar bugungi sanaga o'tkazildi (sana serverdagidek Toshkent bo'yicha hisoblanadi),
      `npm test` `&&` zanjiridan `tests/run-all.js` ga o'tkazildi — endi har bir to'plam
      alohida processda yuguradi va bittasi yiqilsa qolganlari BEKOR BO'LMAYDI.
      Yangi test qo'shildi (3b) — "faqat bugun" qoidasining o'zi hech narsa bilan qoplanmagan edi,
      shuning uchun uning kelishi 3 ta begona testni yiqitgan edi. Endi kecha va ertaga ham tekshiriladi.
      **Natija: 5 ta to'plam ham YASHIL — 66 test** (mentor 17 · student 17 · parent 4 · payments 13 · auth 15)

- [~] ~~BUG-TESTS-RED~~ (tarix uchun) 🔥 (2026-07-19 auditda topildi — testlar ISHGA TUSHIRILDI):
      **Mentor testlarida 3 ta FAIL, sababi mening o'z o'zgarishim.**
      `b6bf912` commit'i "mentor faqat BUGUNGI darsni belgilay oladi" qoidasini kiritdi
      (`attendance.service.js:35` — `assertToday()`), testlar esa davomatni o'tgan sana bilan qo'yadi:
      • 1. Bulk-mark mixed statuses → `O'tgan kunlar davomatini o'zgartirib bo'lmaydi`
      • 2. Re-mark same group+date → xuddi shu
      • 3. Boshqa mentor chet guruhni belgilashi → 404 kutilgan, 422 kelgan

      ✅ Xavfsizlik TEKSHIRILDI — sizib chiqish YO'Q: `assertToday` egalikdan OLDIN tursa ham,
      o'tgan sanada har qanday guruh (o'ziniki, chetniki, umuman yo'q) bir xil 422 beradi,
      bugungi sanada esa bir xil 404 — ya'ni guruh bor-yo'qligini ajratib bo'lmaydi.
      **Kod TO'G'RI, TESTLAR eskirgan** → 3 ta testni bugungi sanaga o'tkazish kerak
      (3-testni ham, aks holda u egalik tekshiruvigacha yetib bormaydi va tekshirmaydi)

      ⚠️ Bundan ham yomoni: `npm test` skripti `&&` bilan zanjir qilingan —
      mentor yiqilgani uchun **student / parent / payments / auth testlari UMUMAN yugurmagan**.
      Alohida ishga tushirilganda hammasi YASHIL: student 17/17 · parent 4/4 · payments 13/13 · auth 15/15.
      Ya'ni bitta fail 49 ta sog'lom testni yashirib turgan. `&&` o'rniga har biri alohida ishlasin
      va oxirida umumiy natija chiqsin

- [x] BUG-REDIS-SILENT ✅ **TASDIQLANDI 2026-07-28 (Karis)** — aslida allaqachon `7226ab6` (26.07)
      da tuzatilgan edi, TASK.md eskirgan edi. `env.js` da `superRefine`: production'da
      `REDIS_URL` localhost'ga qarasa — server umuman ko'tarilmaydi (fail-fast)

- [x] ~~BUG-BILLING~~ ✅ YOPILDI 2026-07-26 (Karis): `Billing.jsx` bakit modeliga o'tkazildi,
      saqlash formasi olib tashlandi (bekend baribir yozmaydi). Tarixiy tavsif:
      ~~`main-admin/src/pages/Billing.jsx` hali ESKI narx modelida (`baseFirstBranch`/`perStudent`), backend 2026-07-16 dan `{ tiers, currency }` qaytaradi → sahifa buzilgan. Egasi: Shohjahon (pastda MAIN bo'limida ham bor).
      SABABI TOPILDI: swagger `PlatformPricing` sxemasi ham eski modelda qolgan edi — Shohjahon hujjatga qarab qurgan. Sxema 2026-07-18 da tuzatildi (tiers), endi front ni ham moslashtirish kerak~~

## Swagger / API hujjatlari (Karis) ✅ 2026-07-18

- [x] DOCS: Barcha route'lar auditi — 158 route topildi, 139 tasi hujjatlashtirilgan edi, 19 tasi YO'Q edi (16 super + 2 admin + 1 telegram)
- [x] DOCS: 19 ta yetishmagan @openapi bloki yozildi → **qamrov 100%** (158/158, spec 158 operatsiya beradi)
- [x] DOCS: Yangi komponentlar — `Organization`, `UpdateOrganizationRequest`, `NotImplemented` (501 javobi)
- [x] DOCS: `PlatformPricing` sxemasi eski narx modelidan yangi TIERS ga ko'chirildi (BUG-BILLING sababi)
- [x] DOCS: Zaglushka endpointlar hujjatda ochiq belgilandi (⚠️ STUB / 501) — front ularga ulanmasin
- [x] DOCS: swagger/*.md qayta generatsiya (139 → 158 endpoint, yangi telegram.md)

## Backend — V1 qolganlari (Abdulaziz) ✅ (kod: d57dff5)

- [x] AB-V1: POST /api/admin/announcements -> notificationQueue (Bilol TG-boti uchun e'lonlar)
- [x] AB-V1: due-soon worker (to'lov muddatidan N kun oldin ota-onaga eslatma, payment.due_soon)
- [x] AB-V1: Partner profit main dashboardda (income - expenses; pul jadvallariga faqat SELECT)
- [x] AB-V1: Integration testlar: payments full/split + auth flow (login -> refresh -> reuse-detect -> OTP)

## Backend — CEO Integratsiya (Karis) 🔥 hozirgi fokus

> CEO FRONT = to'liq Shohjahon versiyasi (14 sahifa), lekin uning yangi sahifalari
> backend endpoint'larini chaqiradi — ular YO'Q edi. **Karis quradi** (avval Abdulaziz'ga berilgandi →
> Team Lead o'ziga qaytarib oldi). Zona: `modules/super`.

- [x] K-SUPER-INT: GET + PATCH /api/super/organization — Settings (org profil) ✅ jonli tekshirildi (35586f6)
- [x] K-SUPER-INT: Dars davomiyligi (2026-07-16) — organizations.lesson_duration_min + lessonDurationMin GET/PATCH /api/super/organization da
- [x] K-SUPER-INT: GET /api/super/students (+search/filter/pagination + DELETE) — Students sahifa (repository listOrgStudents: ILIKE search + LIMIT/OFFSET)
- [x] K-SUPER-INT: GET /api/super/groups (+archive/unarchive + DELETE) — Groups sahifa
> ⚠️ TUZATISH 2026-07-19: quyidagi 4 ta vazifa Abdulaziz'ga BERILDI (AB-SUPER-* ga qara).
> Bu yerda ham, u yerda ham turgani XATO edi — bitta ish ikki joyda ikki odamga yozilgan edi.
> Egasi endi BITTA: Abdulaziz. Bu yerda faqat tarix uchun qoldirilyapti.

- [~] K-SUPER-INT: GET /api/super/stats → **AB-SUPER-STATS (Abdulaziz)**
- [~] K-SUPER-INT: GET/POST/DELETE /api/super/announcements → **AB-SUPER-ANN (Abdulaziz)**
- [~] K-SUPER-INT: GET /api/super/reminders → **AB-SUPER-REM (Abdulaziz)**
- [~] K-SUPER-INT: GET /api/super/audit → **AB-SUPER-AUDIT (Abdulaziz)**
- [x] K-SUPER-INT: GET /api/super/attendance (date/group filter) — Attendance
- [x] K-SUPER-INT ✅ JONLI TEKSHIRILDI 2026-07-28 (Karis): Dashboard, Филиалы, Студенты, Группы,
      Отчёты, Статистика (7/30/90 kunlik almashtirish), Дисциплина (взыскание/устав),
      Объявления (real create+delete+audit), Напоминания, Настройки (lessonDurationMin
      saqlash) — barchasi real ceo login bilan tekshirildi, hech qanday xato topilmadi

## Backend — YANGI TOPSHIRIQ (Abdulaziz) 🔥 2026-07-19, Karis bergan

> Auditda topilgan ochiq backend ishlar. Hammasi `backend/` zonasida — Abdulaziz'ning zonasi.
> Tartib MUHIM: AB-INT-GROUP birinchi, chunki u boshqa odamni (Abduloh) BLOKLAB turibdi.

### AB-INT-GROUP ✅ YOPILDI (Abdulaziz, 2026-07-20)

- [x] AB-INT-GROUP — attendance/homework/feedback endpointlar `admin.routes.js` da,
      `feedback` uchun yangi jadval (migratsiya `1783860000000`, commit `5a70184`).
      Qolgan ish frontda: `GroupDetail.jsx` hali mock'dan olyapti, real API ga o'tsin (Abduloh)

### AB-SUPER-STUB ✅ barchasi yopildi (Abdulaziz, 2026-07-20/21)

- [x] AB-SUPER-ANN — `GET/POST/DELETE /api/super/announcements` (`460914b`)
- [x] AB-SUPER-REM — `GET /api/super/reminders` + resend/delete (`870d1c5`)
- [x] AB-SUPER-AUDIT — `GET /api/super/audit` (`460914b`)
- [x] AB-SUPER-STATS — `GET /api/super/stats` (`460914b`); front tomoni FE-SUPER-STATS'da
- [x] AB-SUPER-SWAGGER ✅ TUZATILDI 2026-07-28 (Karis): announcements GET/POST/DELETE va
      audit GET izohlari yangilandi (endi real ishlashini yozadi, "501/stub" emas).
      Alohida `swagger/*.md` generatsiya skripti repoda yo'q ekan — hujjat swagger-jsdoc
      orqali runtime'da JSDoc izohlaridan to'g'ridan-to'g'ri chiqadi

### AB-SUPER-REPORTS + AB-MAIN-REVENUE (Abdulaziz)

- [x] AB-SUPER-REPORTS — `GET /api/super/reports` (`460914b`); front FE-SUPER-REPORTS'da
- [x] AB-EXPENSE-PATCH — `PATCH /api/admin/expenses/:id` qo'shildi
- [x] AB-MAIN-REVENUE — `GET /api/main/revenue` (`460914b`); front tomoni Shohjahon'da (MAIN: Revenue)

### AB-VERIFY

- [x] AB-VERIFY ✅ JONLI TEKSHIRILDI 2026-07-28 (Karis, Abdulaziz'ning ishiga tegmasdan —
      vaqtni tejash uchun o'zi qildi). **Haqiqiy bag topildi va tuzatildi:** parent'ning
      "От staff" tab'i eski `parent:<id>` xona formatidan foydalanardi — bekend buni
      chat.access.js'da 2026-07-2x atrofida `dm:<staffId>:<parentId>` juft-xonalarga
      o'tkazgandan beri bu format UMUMAN ishlamas edi (`requireRoomAccess` 400 qaytaradi).
      Ya'ni parent hech qachon staff'dan kelgan xabarni ko'ra olmagan, javob berish esa
      frontendda umuman yo'q edi. Tuzatish: bekendga `GET /api/chat/my-threads`
      (parent/student o'z suhbatlarini ko'radi — o'zi boshlay olmaydi, faqat javob),
      frontendga `chat:dm:reply` socket orqali javob yozish. Jonli tasdiqlandi: mentor →
      parent xabar yubordi, parent ko'rdi va javob yozdi — ikkalasi ham real vaqtda
- [x] AB-VERIFY: Parent Chat — Socket.io realtime tasdiqlandi (2026-07-21)

## Telegram bot (Bilol) ⚠️ TASK.md ga 2026-07-19 da QO'SHILDI

> ❌ Muammo: Bilol jamoada, 14 commit qilgan, lekin bu faylda uning NOMI ham yo'q edi.
> Vazifalari `docs/TASK-telegram-bot.md` da alohida yotibdi va u yerda **0 ta [x]** —
> holbuki u allaqachon ishlagan (masalan `bot.start()` — /start va /stop umuman
> polling qilmayotgan edi, o'sha tuzatilgan). Ya'ni fayl real holatdan orqada.
> Bitta manba bo'lishi kerak — shuning uchun bu yerga ko'rsatkich qo'yildi.

- [x] TG-SYNC ✅ BAJARILDI 2026-07-26 (Karis): `docs/TASK-telegram-bot.md` kod bilan sverka
      qilindi, 8 ta vazifa `[x]` ga o'tkazildi va fayl boshiga sverka jadvali qo'yildi.
      Bilol'ning ishi yozilmay qolgani sabab u "hech narsa qilmagan"dek ko'rinardi — bu noto'g'ri edi
- [x] TG-BIND ✅ BAJARILGAN (Bilol; 2026-07-26 auditda tasdiqlandi):
      `POST /api/telegram/bind-token` (`telegram.routes.js:42`) + `bind-token.service.js`
      (Redis `SET ... EX NX`, atomar `GETDEL`) + `/start` payload bilan va payloadsiz
      (`bot.handlers.js:10`) + `/stop` (`bot.handlers.js:54`) + `bot.start()` polling (`bot.js:22`)
- [x] TG-DUE ✅ BAJARILGAN (Bilol): `payment.due_soon` handler `notification.worker.js:21` da,
      payload `{ studentId, amount, dueDate, daysLeft }`.
      ⚠️ Producer (payment_schedules'dan N kun oldin queue'ga qo'yish) — **Karis'da**, hali yozilmagan
- [x] TG-ANN ✅ BAJARILGAN (Bilol): `announcement.created` handler `notification.worker.js:37` da.
      Producer'lar ham to'g'ri nom bilan yozadi (`admin.service.js:724`, `super.service.js:371`)
- [ ] TG-DUE-PRODUCER 🆕 (Karis): `payment.due_soon` ni queue'ga qo'yadigan job YO'Q.
      Bilol tomoni tayyor, lekin uni hech kim chaqirmaydi → eslatma hech qachon ketmaydi.
      `payment_schedules` dan muddatdan N kun oldin tanlab, idempotent tarzda qo'yilsin
- [ ] TG-PROD-DEAD 🔴🆕 (Karis): butun TG zanjiri **prodda o'lik** — `BUG-NO-WORKER`.
      `render.yaml` da `type: worker` yo'q → `worker.js` yugurmaydi → `notifications` navbatini
      hech kim o'qimaydi. Bot `/start` ni qabul qiladi, lekin BIRORTA bildirishnoma yetib bormaydi.
      Bilol'ning 14 commit'i shu sababli mijozga ko'rinmayapti — bu uning aybi emas
- [x] TG-FRONT ✅ BAJARILDI 2026-07-28 (Karis): parent — `member/Profile.jsx` da karta
      (bind-token → deep-link tugmasi); student — `student/Layout.jsx` sidebar footeriga
      ikonka tugma qo'shildi (alohida sahifasi yo'q shu panelda, shuning uchun footerga)

## Backend — Infrastructure (Abdulaziz) ✅

- [x] AB-INFRA: Scaffold + structure + deps + docker-compose
- [x] AB-INFRA: config/ (env, db, redis, s3, mailer, sms, logger)
- [x] AB-INFRA: utils/ + middlewares (validate, rateLimiter, archiveGuard, errorHandler)
- [x] AB-INFRA: app.js + server.js
- [x] AB-INFRA: Migrations (node-pg-migrate) — full DDL
- [x] AB-INFRA: Sockets (redis-adapter, socketAuth, presence, chat)
- [x] AB-INFRA: Queues (BullMQ notification + overdue worker)
- [x] AB-INFRA: Telegram bot (grammy)

## Backend — Mentor (Abdulaziz) ✅

- [x] AB-MENTOR: Attendance (bulk-upsert)
- [x] AB-MENTOR: Homework check (0-max + coin_reward)
- [x] AB-MENTOR: Test constructor (questions JSONB)
- [x] AB-MENTOR: Exam with timer
- [x] AB-MENTOR: Coins +/- via changeCoins()
- [x] AB-MENTOR: Mentor salary (mentor_salaries)
- [x] AB-MENTOR: Manual coin assignment POST /api/mentor/coins
- [x] AB-MENTOR: Mentor groups read overview

## Backend — Student (Abdulaziz) ✅

- [x] AB-STUDENT: Home (coins/debt/ranking/groups/deadlines)
- [x] AB-STUDENT: Shop (FOR UPDATE, rollback on insufficient)
- [x] AB-STUDENT: Tests (timer, scoring, reward >= 50%)
- [x] AB-STUDENT: Homework (presigned S3)
- [x] AB-STUDENT: Videos (by membership)
- [x] AB-STUDENT: Leaderboards week/month (Redis ZSET)

## Backend — Parent (Abdulaziz) ✅

- [x] AB-PARENT: Child overview (coins, debt, ranking, groups, attendance, grades)
- [x] AB-PARENT: Ownership guard assertParentOwnsChild

## Backend — Shared (Abdulaziz) ✅

- [x] AB-SHARED: users module (profile, branch list)
- [x] AB-SHARED: db/seeds (demo data, idempotent)
- [x] AB-SHARED: Coin foundation: coins.changeCoins()

## Backend — Narx / GTM (Karis) 🔥 YANGI (2026-07-16)

> To'liq strategiya — PRICING.md (vault). Model: o'quvchi bucket tariflari, filiallar bepul, narx=sifat (kafolat).

- [x] PRICE: Bucket tariflar backendda (config/plans.js TIERS, computeBill by students)
- [x] PRICE ✅ 2026-07-19: Neon'dagi migratsiyalar prognat qilindi.
      ⚠️ Bu yerda yozilgani NOTO'G'RI edi — "9 ta yugurtirilmagan" deyilgandi, aslida
      bazani tekshirganda 17 tasi ALLAQACHON yugurgan ekan (`org-lesson-duration`, `lesson-media`,
      `user-status-fired`, `staff-penalties`, `org-charter`, `mentor-profile` — hammasi joyida).
      Faqat BITTA qolgan edi: `1783850000000_mentor-coin-budget` → yugurtirildi, jami 18 ta.
      Tekshirildi: `organizations.coins_per_student` ✓, `coin_history.group_id` ✓, indeks ✓
- [x] PRICE ✅ 2026-07-19: `render.yaml` ga `preDeployCommand: npm run migrate` qo'shildi.
      Endi migratsiya yangi kod trafikni olishdan OLDIN yuguradi; migratsiya yiqilsa —
      Render deploy'ni to'xtatadi va eski versiya ishlab turaveradi (buzuq versiyani chiqargandan yaxshi)
- [ ] PRICE: Tariflarni DB-editable qilish (Main Admin tahrirlaydi) — v2
- [ ] FREEZE: Obunani muzlatish — 1 oy bepul, keyin (2-3-4...oy) pullik; backend logika + billing + status
- [ ] WHITE-LABEL: Markazga o'z brendida sayt (bizning backend/storage) — pullik xizmat 4 990 000 dan (minimal, murakkab bo'lsa qimmatroq); shablon self-serve + to'liq kastom premium
- ❌ REFERAL: kerak emas (qaror 2026-07-16)

---

## Frontend — Auth (Elyor)

> ⚠️ AUDIT 2026-07-19 (Karis): bu bo'limdagi galochkalar ESKIRGAN edi — kod tekshirildi,
> 4 ta vazifa allaqachon bajarilgan, 1 tasi kerak emas. Faqat BITTA haqiqiy tirqish topildi (pastda).

- [x] AUTH: Login sahifalar (3 endpoint: main / staff / member) — `staff/pages/Login.jsx`, `member/pages/Login.jsx`, `main-admin/pages/Login.jsx`, uchalasi `/auth/{staff,member,main}/login` ga ulangan. `origin/elyor` da save-zone dan ortiqcha commit YO'Q — merge qilinadigan narsa qolmagan
- [x] AUTH: ProtectedRoute + RoleGuard — ProtectedRoute uchala App.jsx da, `staff/components/RoleGuard.jsx` admin+ceo route'larida ishlatiladi
- [x] AUTH: Router setup by roles — staff/App.jsx da rolli route'lar
- [x] AUTH: Redux authSlice — KERAK EMAS (useAuth() context yetarli, qaror 2026-07-15)
- [x] AUTH: 401 → refresh → retry interceptor (api.js, bitta refreshPromise) — ✅ Elyor bajardi (staff/member/main-admin), save-zone ga merge (55ef617). Auditda tasdiqlandi: `refreshPromise` 4 ta app da ham bor
- [x] AUTH: Socket.io client — `staff/socket.js` (presence + davomat live + ack-request), `member/socket.js`. `main-admin` va `student` da realtime sahifa YO'Q (Chat yo'q) → ularga socket kerak emas

### 🔴 AUTH — haqiqiy ochiq tirqish (auditda topildi 2026-07-19)

- [x] AUTH-FORGOT ✅ TUZATILDI 2026-07-28 (Karis): `staff/api.js` mock-blokiga
      `/auth/forgot-password` va `/auth/reset-password` case qo'shildi (kod mokda doim
      `123456`, real oqim: so'rov → kod → yangi parol). Real backend ilgari ham to'g'ri
      ulangan edi — faqat mock rejimi ishlamas edi.
      ⚠️ Ochiq savol qoladi (qaror kerak, kod bilan yopilmaydi): `member` (Student/Parent)
      login-kod bilan kiradi, email bo'lmasligi mumkin → ularga tiklash admin orqalimi yoki
      umuman formasiz?
- [x] AUTH-ELYOR-4 ✅ 4/4 YOPILDI 2026-07-28 (Karis): 1) admin dashboard — tuzatilgan
      (avvalroq). 2) «Забыли пароль» mock — yuqoridagi AUTH-FORGOT bilan yopildi.
      3) Google COOP — FE-COOP bilan yopildi. 4) React Router future-flag — FE-ROUTER-FLAG
      bilan yopildi

## Frontend — CEO ⚠️ TUGAMAGAN (Said Islom + Aziz) — 2026-07-19 auditda ochildi

> ❌ Bu bo'lim ilgari "✅ TUGADI" deb turgan edi — bu NOTO'G'RI bo'lgan.
> Sahifalar chizilgan, lekin 3 tasi bo'sh qaytadi va 1 tasi O'YLAB TOPILGAN raqam ko'rsatadi.
> **Egasi:** Said Islom + Aziz — Super panelni asli SHULAR qurgan, kodni biladi.
> Ikkalasining ham ochiq vazifasi yo'q edi, Methodist karkasi tayyor.
> Backend tomoni Abdulaziz'da (AB-SUPER-* ga qara) — front va back BIRGA yopiladi.

- [x] SUPER (front): Dashboard (org income, branches, admins, students)
- [x] SUPER (front): CRUD branches (Branches -> BranchDetail)
- [x] SUPER (front): CRUD admins
- [x] SUPER (front): Organization settings + ComingSoon (Shohjahon) — backend /api/super/organization TAYYOR (Karis, 35586f6)
- [x] SUPER (front) ✅ BAJARILDI 2026-07-28 (Karis): Settings sahifasiga "Длительность урока"
      maydoni qo'shildi (10-600 min, zod validatsiya), PATCH /api/super/organization
      lessonDurationMin bilan birga yuboriladi

### 🔴 FE-SUPER (Said Islom + Aziz) — auditda topilgan xatolar

- [x] FE-SUPER-STATS ✅ **BAJARILDI 2026-07-27 (Karis)** — sahifa `GET /api/super/stats?period=` ga
      ulandi. 7/30/90 tugmalari endi haqiqiy so'rov yuboradi (avval faqat tugma rangini
      o'zgartirardi), "Выручка по дням" haqiqiy `revenueSeries` bo'yicha chiziladi (avval o'q
      bo'ylab filiallar turardi), "Способы оплаты" bloki haqiqiy `paymentMethods` bilan qaytdi.
      Backendga `totals.periodRevenue` qo'shildi: KPI "Выручка" hamma vaqt uchun edi grafiklar esa
      7 kun uchun — bitta ekranda ikkita har xil raqam turardi. Lokal bazada tekshirildi:
      period=7d → 2 400 000, period=30d → 9 750 000, naqd/karta/o'tkazma 32/37/31 foiz
      Asl vazifa matni (Said Islom uchun yozilgan edi): `super/Stats.jsx:22-27` da **O'YLAB TOPILGAN raqamlar** bor edi:
      ```js
      const PAYMENT_METHODS = [
        { name: 'Наличные', value: 65 }, { name: 'Карта', value: 30 }, { name: 'Online', value: 5 },
      ];
      ```
      Bu hardcode haqiqiy grafik bo'lib chiziladi — hamkor "65% naqd" degan raqamni ko'radi,
      lekin uni HECH KIM hisoblamagan. Bu eng xavflisi: sahifa ishlayotgandek ko'rinadi.
      Hardcode o'chirilsin, `GET /api/super/stats` ga ulansin.
      🟢 **2026-07-26: backend TAYYOR** — `GET /api/super/stats` `super.routes.js:586` da bor
      (`period` query bilan). Kutiladigan hech narsa yo'q, ish to'liq frontda.
      ⚠️ Sahifa hozir `useSuperDashboard` ni chaqiryapti — bu Dashboard'ning endpointi, Stats'niki EMAS.
      Hardcode 2026-07-26 da ham `Stats.jsx` da joyida turibdi (qayta tekshirildi)
- [x] FE-SUPER-REPORTS ✅ **BAJARILDI 2026-07-27 (Karis)** — sahifa `GET /api/super/reports` ga
      o'tkazildi. Filialning ulushi endi serverdan keladi (`branch.share`), razmetkada qayta
      hisoblanmaydi — aks holda formulani serverda o'zgartirsak ikki joyda ikki xil raqam chiqardi.
      O'rtacha tushum ham serverdan. Lokal bazada tekshirildi: 9 750 000 · ulush 100 foiz · 1 admin.
      Asl vazifa matni (Aziz uchun): `super/Reports.jsx` ham `useSuperDashboard` da o'tirardi — o'z ma'lumoti yo'q edi.
      Ya'ni Dashboard / Stats / Reports — uchtasi BITTA endpointdan oziqlanyapti.
      🟢 **2026-07-26: backend TAYYOR** — `GET /api/super/reports` `super.routes.js:619` da bor.
      Ish faqat frontda: `useSuperDashboard` o'rniga o'z endpointiga o'tsin
- [x] FE-SUPER-WIRE ✅ **TASDIQLANDI 2026-07-28 (Karis)** — kod tekshirildi: uchala sahifa
      (`Announcements.jsx`, `Reminders.jsx`, `Audit.jsx`) allaqachon o'z real endpointlariga
      ulangan (`api.superAnnouncements/superReminders/superAudit` va CRUD mutatsiyalar),
      `useSuperDashboard` ga tayanib qolgan joy yo'q. Kim tomonidan yopilgani noaniq —
      TASK.md eskirgan edi. Qolgan ish: jonli ceo login bilan E2E (AB-VERIFY/
      K-SUPER-INT blokiga qara), kod tomoni yopiq

## Main Admin (Karis) 🔥 to'liq egasi — 2026-07-26 dan, front + backend

> 🔄 **Egasi almashdi (2026-07-26, Karis qarori):** panel Shohjahon'dan Karis'ga o'tdi.
> Sabab: panelning to'rtta sahifasi mavjud bo'lmagan endpointlarga urilardi, ya'ni ish
> frontda emas, ikki tomonda edi — `main` moduli esa baribir Karis'ning zonasi.
> Endi front ham, backend ham bitta odamda: chegara yo'q, kutish yo'q.
> Shohjahon'ning 16.07 gacha qilgan ishi joyida qoladi (Dashboard / Leads / Organizations
> / OrgDetail) — u qayta yozilmadi.

- [x] MAIN: Dashboard — KPI + grafiklar (Dashboard.jsx, 805 qator)
- [x] MAIN: Leads — ro'yxat / filtr / status o'zgartirish, OnboardModal (temp-parol), Qabul / Rad etish
- [x] MAIN: Organizations (hamkorlar) — ro'yxat / qidiruv, freeze / activate (855 qator)
- [x] MAIN: Org-detail sahifasi — OrgDetail.jsx qurilgan
- [x] MAIN: Billing ✅ TUZATILDI 2026-07-26 (Karis) — BUG-BILLING yopildi.
      `Billing.jsx` butunlay qayta yozildi: eski formula (`baseFirstBranch`/`perExtraBranch`/
      `perStudent`) o'rniga bakit modeli — `pricing.tiers` serverdan olinadi, jadval qilib
      ko'rsatiladi, kalkulyator o'quvchi soniga qarab tarifni tanlaydi (`tierForStudents`
      qoidasi frontda takrorlangan, tariflar esa serverdan — hisob bir zumda ishlaydi).
      **Saqlash formasi ATAYIN olib tashlandi:** `PUT /api/main/pricing` bekendda hech narsa
      yozmaydi (`return getPricing()`), tariflar `config/plans.js` da. Ilgari tugma "saqlandi"
      deb yolg'on rapor berardi. Sahifada endi "faqat o'qish" belgisi va sabab yozilgan.
      DB-editable tariflar — v2 (PRICE bo'limiga qara).
- [x] MAIN: Revenue ✅ ULANDI 2026-07-26 (Karis).
      `api.js` ga `revenue` metodi qo'shildi, `queries.js` ga `useRevenue()`; `Revenue.jsx`
      endi `GET /api/main/revenue` dan oladi (ilgari `useDashboard` da o'tirardi).
      Umumiy summa server javobidan olinadi (`totals.ourMonthlyIncome`), frontda qayta
      hisoblanmaydi — aks holda tarif o'zgarganda ikki tomon jimgina ajralib ketardi.
      🔴 **Eng muhimi:** "chorak / yil" tugmalari endi ochiq **PROGNOZ** deb belgilangan
      ("Prognoz na:", "oylik × N, hamkorlar tarkibi o'zgarmasa", KPI'da "оценка").
      Ilgari oylik summa jimgina koeffitsiyentga ko'paytirilib "Доход / год" deb
      yozilardi — o'ylab topilgan raqam haqiqiydek ko'rinardi. Fakt bo'yicha davr
      kesimi uchun hisob-faktura tarixi kerak, u platformada hali yo'q.
- [x] MAIN: Settings — ✅ audit 2026-07-19: "zaglushka" deb yozilgani NOTO'G'RI edi.
      438 qator, `useDashboard` + `usePricing` + `api.updateProfile` — real ishlaydi
- [x] MAIN-404-BACKEND ✅ YOPILDI 2026-07-26 (Karis) — endpointlar YOZILDI.
      Ilgari front mavjud bo'lmagan 4 ta yo'lga urilardi. Endi ular bor:
      • `GET/POST/DELETE /api/main/announcements` — platforma e'lonlari.
        Yangi migratsiya `1783900000000_platform-announcements` (`platform_announcements`
        jadvali + `platform_announcement_target` enum: `all-partners` / `all-ceos`).
        Super'nikidan alohida: u yerda auditoriya bitta tashkilot ichida, bu yerda —
        hamkorlarning o'zi, qiymatlar kesishmaydi.
        ⚠️ Navbatga (`notificationQueue`) ATAYIN qo'yilmaydi: qabul qiluvchilar xodimlar,
        `telegram_accounts` esa faqat student/parent uchun to'ladi — worker chat_id topolmay
        vazifani jimgina tashlab yuborardi.
      • `GET /api/main/profile` + `PATCH /api/main/profile` — profil. Email va telefon
        bandligi oldindan tekshiriladi → tushunarli 409, xom BD xatosi emas.
      **Frontda ham tuzatildi:** `Settings.jsx` da `catch` bloki 404/500 ni "muvaffaqiyat"
      qilib ko'rsatardi ("graceful degradation") — ya'ni saqlanmaganini yashirardi.
      Olib tashlandi, endi xato ko'rinadi, 409 esa alohida matn bilan.
      **Jonli tekshirildi** (lokal BD, seed): 201 create → GET ro'yxatda ko'rinadi →
      DELETE 200 → ikkinchi DELETE 404; yaroqsiz `targetType` → 422; band email → 409;
      bo'sh body → 422; tokensiz → 401.
- [x] MAIN-FINES-MOCK ✅ YOPILDI 2026-07-26 (Karis) — mok o'chirildi, sahifa qayta yozildi.
      `initialMock` (6 ta o'ylab topilgan hamkor va jarima) butunlay olib tashlandi.
      **Qaror: shtraf yozish formasi olib tashlandi, sahifa faqat ko'rish uchun.**
      Sabab kod bilan tasdiqlangan: `discipline` modulidagi CAN_ISSUE matritsasida
      `main_admin` HECH KIMGA jazo bera olmaydi — jazoni CEO va Admin o'z
      tashkiloti ichida beradi. Ya'ni "jarima yozish" tugmasi tamoyil bo'yicha ishlay
      olmasdi, uni backendga ulash mumkin emas edi.
      O'rniga: `GET /api/main/penalties` — barcha hamkorlar bo'yicha intizom sharhi
      (KPI: shtraflar summasi/soni, ishdan bo'shatishlar, qamrab olingan tashkilotlar;
      jadval: markaz / xodim / sabab / kim bergan / summa / sana; qidiruv va tur filtri).
      Faqat SELECT — yozish yo'q. Sahifada nega forma yo'qligi izohlangan.
      **Jonli tekshirildi:** test yozuv qo'yilgach JOIN to'g'ri ishladi —
      markaz nomi, xodim, kim bergani va summa to'g'ri qaytdi.
- [x] MAIN: Forgot-password ✅ POLISH QILINDI 2026-07-26 (Karis).
      Sikl o'zi to'liq edi (3 bosqich: kod so'rash → kod+yangi parol → tayyor).
      Tuzatilgani: 1) `POST /auth/forgot-password` da **429 ishlanmasdi** — bekendda
      `passwordResetLimiter` turibdi, tez-tez bosilganda xom xabar chiqardi; endi
      "Слишком много запросов кода" deb tushuntiriladi. 2) "Kodni qayta yuborish"
      tugmasi aslida QAYTA YUBORMASDI — birinchi bosqichga qaytarardi xolos, odam
      uni ketma-ket bosib limitga urilardi; endi haqiqiy qayta yuborish + 60 sekundlik
      hisob ("Отправить заново через N с"), yonida alohida "Другой email" havolasi
- [x] MAIN: Design-system ✅ TEKSHIRILDI 2026-07-26 (Karis), jonli brauzerda.
      Laym `#C6FF34` va Manrope `tailwind.config.js` da (`limebrand`, `primary`, `sans`) — joyida.
      Uch holat barcha data-sahifalarda bor (Skeleton / EmptyState / Error) — yangi
      Billing va Fines ga ham qo'yildi.
      **Responsive jonli o'lchandi** (Playwright, `scrollWidth > clientWidth` tekshiruvi):
      375 / 768 / 1280 px — oltala sahifada ham gorizontal scroll YO'Q.
      Sahifa matnida `NaN` yoki `undefined` chiqmaydi (avtomatik tekshirildi).
      TanStack invalidation: e'lon yaratilganda ro'yxat darhol yangilanadi (UI orqali tasdiqlandi)
- [ ] MAIN: Test organizatsiyalarni tozalash — **BAJARILMADI, ataylab.**
      Bu PROD Neon bazasidan yozuv o'chirish demak. Qaysi organizatsiya "test" ekanini
      faqat egasi biladi (13 org bor, ba'zisi real mijoz bo'lishi mumkin), va noto'g'ri
      o'chirilgan tenant bilan birga uning filiallari, o'quvchilari va to'lovlari ketadi.
      Buni avtomat qilish mumkin emas — ro'yxat tasdiqlansin, keyin o'chiriladi.
- [ ] MAIN: Google OAuth — jonli E2E login testi — **BAJARILMADI.**
      Haqiqiy Google hisobiga kirish kerak (Firebase `levelup-1c059`), parol menda yo'q
      va u brauzerda qo'lda kiritiladi. Kod tomoni joyida (`loginWithGoogle`,
      `POST /auth/main/google`), lekin "tekshirildi" deb yozish yolg'on bo'lardi.
- [x] ~~MAIN-FINES~~ — dublikat, yuqoridagi `MAIN-FINES-MOCK` ga birlashtirildi (2026-07-26)
- [x] ~~MAIN-UNTRACKED~~ ✅ ANIQLANDI 2026-07-26: `Fines.jsx` va `Announcements.jsx` ni
      **Shohjahon** qurgan — `a7185cb` ("interactive charts, freeze modal, partner analysis, new pages",
      2026-07-16) va `3eb01ed` ("announcements redesign", 2026-07-16).
      Holati ham aniq: ikkalasi ham ishlamaydi — `MAIN-404-BACKEND` va `MAIN-FINES-MOCK` ga qara

## Frontend — Admin (Abduloh, Odil, Hamidula)

- [x] ADMIN: rey/xob admin_page ishini staff strukturasiga ko'chirish (alohida Vite-app EMAS — staff ichida sahifalar; merge REVIEW dan keyin)
- [x] ADMIN: Dashboard (income + expenses = profit) — Dashboard.jsx, api ga ulangan
- [x] ADMIN: Students CRUD (xob integratsiyasi bor — reviewdan o'tkazish) — Students.jsx + StudentDetail.jsx
- [x] ADMIN: Groups CRUD — Groups.jsx + GroupDetail.jsx
- [x] ADMIN ✅ (Abduloh) `GroupDetail.jsx` real API ga ulangan ekan — tekshirildi 2026-07-28
      (Karis, `646060e`/27.07): attendance/homework/feedback oltala endpoint ham chaqirilyapti,
      mock qolmagan. TASK.md eskirgan edi
- [ ] ADMIN (Abduloh): 🔄 **Odil'dan o'tkazildi (2026-07-28, Karis qarori)** — Guruh formasi:
      mentor majburiy + kunlar (1-3-5/2-4-6 preset yoki boshqa kunlar galochka) + boshlanish
      vaqti + tugash vaqti AVTO (GET /api/admin/settings) → POST/PATCH { days, startTime };
      kontrakt TEAM-TASKS §9.2
- [x] ADMIN: Payments UI (full/split modal; K-PAY chiqqach ulanadi) — Payments.jsx (775 qator)
- [x] ADMIN: Expenses CRUD — Expenses.jsx + PDF eksport (Abduloh, jspdf)
- [x] ADMIN: Reports — Reports.jsx, GET /api/admin/reports ga ulangan
- [ ] ADMIN-EXPENSES-V2 🆕 (Abduloh, branch `Abduloh`, 08-08): to'lov usuli ikonkalari,
      takroriy xarajatlar (recurring), `paymentMethod` bagi tuzatildi, footer flex-wrap.
      Save-zone'ga hali merge qilinmagan

## Frontend — Finance Manager (Aziz) 🆕 2026-08-09 — branch `aziz/finance-manager`, hali merge qilinmagan

> Yangi panel — TASK.md da ilgari umuman yozilmagan edi, `git fetch` orqali topildi.
> `frontend/staff/src/pages/finance/*` (13 fayl), `Layout.jsx`/`App.jsx`/`Login.jsx`/`api.js`
> ga ulangan. Karis ko'rib chiqishi kerak: yangi rol/marshrut boshqa panellar bilan
> to'qnashmasligini tekshirish, keyin save-zone'ga merge.

- [ ] FIN-DASHBOARD (Aziz): `pages/finance/Dashboard.jsx`
- [ ] FIN-EXPENSES (Aziz): `pages/finance/Expenses.jsx`
- [ ] FIN-INCOME (Aziz): `pages/finance/Income.jsx`
- [ ] FIN-REPORTS (Aziz): `pages/finance/Reports.jsx`
- [ ] FIN-SALARIES (Aziz): `pages/finance/Salaries.jsx`
- [ ] FIN-I18N (Aziz): barcha rollar uchun sidebar label tarjimasi (`_i18n.jsx`, 323 qator)
- [ ] FIN-REVIEW (Karis): merge oldidan ko'rib chiqish — marshrut/kirish nizosi bormi

## Frontend — YANGI TASKLAR: Kozim / Alish 🆕 2026-07-19 (2026-07-26 da yangilandi)

> Mentor paneli Karis'ga o'tdi (jamoa bilan kelishilgan) → uchalasi bo'shadi.
> Quyidagilar auditda topilgan HAQIQIY ishlar — har birining isboti bor, o'ylab topilgani yo'q.
> 🔄 **2026-07-26:** Sardor bu bo'limdan chiqarildi — u endi `Frontend — Student` panelining
> to'liq egasi. Uning vazifalari Kozim'ga (tozalash) va Kama'ga (`member/` sahifalari) berildi.

### 🔴 KOZIM — admin/Chat.jsx ni jonlantirish (eng katta ish, BLOKLANMAGAN)

- [x] FE-CHAT-ADMIN ✅ BAJARILDI 2026-07-21 (Karis): chat endi HAQIQIY.
      Yechim — nusxa ko'chirish EMAS, umumiy komponent: `components/StaffChat.jsx`
      ni mentor va admin BIRGA ishlatadi (`variant` faqat matnlarni almashtiradi).
      Sabab: rollar farqi faqat qamrovda, uni backend hisoblaydi
      (`listStaffContacts` — mentorga guruhlari, adminga butun filial).
      Jonli tekshirildi: kontaktlar BD dan keladi, yuborilgan xabar socket orqali
      `chat_messages` ga admin `sender_id` bilan yozildi. Jami −1934 qator.
      ⚠️ Olib tashlangan soxta funksiyalar (backend ularni QO'LLAB-QUVVATLAMAYDI):
      xabarga javob, "yozmoqda" indikatori, yozishmani o'chirish, tarix bo'yicha qidiruv
- [~] ~~FE-CHAT-ADMIN~~ (tarix uchun): `staff/src/pages/admin/Chat.jsx` (1275 qator) — **soxta chat**.
      Ichida 7 ta TODO va hardcode kontaktlar:
      ```js
      const initialContacts = [
        { id: 1, name: 'Aziz Karimov', role: 'Mentor', lastMsg: 'Salom, bugun dars bormi?' ... }
      ```
      Ya'ni admin chatni ochsa — o'ylab topilgan odamlar va o'ylab topilgan xabarlarni ko'radi.
      Uchta muammo: (1) kontaktlar hardcode (2) Socket.io UMUMAN ulanmagan — realtime yo'q
      (3) "men / u" xabarni `sender_id` bo'yicha emas, boshqa yo'l bilan aniqlayapti — noto'g'ri
      ⚠️ Kodda "backendda endpoint yo'q" deb yozilgan — bu ESKIRGAN. Endi BOR:
      `GET /api/chat/contacts` va `POST /api/chat/dm` (chat.routes.js:98 va :147) + socket tayyor
      📌 Namuna yonida: `pages/mentor/Chat.jsx` — xuddi shu ish u yerda ishlaydigan qilib yozilgan, ko'chir
      💡 Kozim'ga berildi: u o'z panelida chat qilgan, mavzuni biladi

### 🔴 KOZIM — o'lik kod va konsol tozalash ⬅️ 2026-07-26 da Sardor'dan o'tdi

> Sardor to'liq Student paneliga o'tdi (Karis qarori 2026-07-26), shuning uchun
> bu uchta vazifa Kozim'ga berildi — u chat integratsiyasidan keyin bo'sh.

- [x] FE-DEAD-CODE ✅ hammasi allaqachon o'chirilgan ekan (tekshirildi 2026-07-28, Karis):
      `mentoor/` — 2026-07-21 (yuqorida), `ComingSoon.jsx`/`Placeholder.jsx` —
      `cd91467`/`df6344f` (2026-07-26). TASK.md eskirgan edi
- [x] FE-ROUTER-FLAG ✅ QO'SHILDI 2026-07-28 (Karis): `future={{ v7_startTransition: true,
      v7_relativeSplatPath: true }}` barcha 4 ta `main.jsx` da (staff/main-admin/member/student)
- [x] FE-COOP ✅ TUZATILDI 2026-07-28 (Karis): `Cross-Origin-Opener-Policy:
      same-origin-allow-popups` — dev (`vite.config.js` server.headers) va prod
      (`vercel.json`) uchun `staff` va `main-admin` da

### 🔴 ALISH — `member/` panelini mentor darajasiga chiqarish

> ⚠️ Zona: `member/` Kama'da — Karis ruxsat bergandan KEYIN boshlansin.
> 🔄 **2026-07-26:** `student/` qismi bu vazifadan OLIB TASHLANDI — u endi Sardor'da
> (`Frontend — Student` bo'limiga qara). Alish'da faqat `member/` qoldi.

- [x] FE-THIN-PAGES ✅ BAJARILDI 2026-07-28 (Karis): `member/Debt.jsx` 108→142 qator (haqiqiy
      to'lov progress-bar FE-PARENT-DEBT bilan birga), `Attendance.jsx` 122→228 (pagination
      bilan birga), `Notifications.jsx` 112→152 (kursor pagination + qo'shilgan ErrorState).
      Uchala sahifada ham endi Skeleton/EmptyState/Error + retry bor

## Frontend — Mentor (Sardor, Kozim, Alish)

- [x] MENTOR: Dashboard (groups, upcoming lessons)
- [x] MENTOR: Attendance journal — Attendance.jsx (726 qator, api ga ulangan)
- [x] MENTOR: Homework (check, grades)
- [x] MENTOR: Tests (create, results) — Tests.jsx + konstruktor + natijalar (2026-07-18)
- [x] MENTOR: Coins (assign/deduct)
- [x] MENTOR: Chat — shaxsiy dm: xonalar, Socket.io + tarix, faqat xodim va ota-ona ko‘radi (2026-07-18)

## Frontend — Student (Odil) 🔥 to'liq egasi — 2026-08-09 dan

> 🔄 **Egasi almashdi (2026-08-09, Karis qarori):** panel Sardor'dan Odil'ga o'tdi.
> Pastdagi "EGALIK SAVOLI" (XOB shu panelni 09.08'da qurgan, lekin jamoa jadvalida
> yo'q edi) shu tarzda yopildi — Karis Odil'ni rasmiy egasi qilib belgiladi.
>
> 🔄 **Eski yozuv (2026-07-26, tarix uchun):** panel Abdulaziz'dan Sardor'ga o'tgan edi.
> Abdulaziz **faqat backend**da qoladi (`Backend — Student`, `Backend — Mentor`,
> `Backend — Parent`, `Backend — Infrastructure`, CEO) — frontendda uning zonasi yo'q.
> Sardor'ning eski vazifalari (FE-DEAD-CODE / FE-ROUTER-FLAG / FE-COOP / UI-DS)
> boshqalarga berildi.

> ⚠️ Barcha sahifalar QURILGAN va api kontraktiga ulangan, LEKIN mock rejimida ishlaydi
> (BUG-PROD-MOCKS ga qara). Jonli E2E qilinmagan.

- [x] STUDENT: Home (coins, groups, deadlines)
- [x] STUDENT: Tests — Tests.jsx + TestTake.jsx (timer/scoring)
- [x] STUDENT: Homework
- [x] STUDENT: Shop
- [x] STUDENT: Videos
- [x] STUDENT: Leaderboard
- [x] STUDENT: staff design-system'ga ko'chirildi (Tailwind + DaisyUI) — 2026-07-25, Karis (`a458c1b`)
- [x] STUDENT ✅ JONLI TEKSHIRILDI 2026-07-28 (Karis, Sardor'ning ishiga tegmasdan): login,
      Главная, Тесты, Домашки, Видео, Магазин, Рейтинг — `VITE_USE_MOCKS=false` bilan
      real backend'da tekshirildi, xato topilmadi. Responsive ham (360-1440px) toza
- [x] STUDENT ✅ BAJARILDI 2026-07-28 (Karis, Sardor'ning ishiga tegmasdan) —
      `Videos.jsx`/`Tests.jsx`/`Leaderboard.jsx` da yo'q edi: xato bo'lsa `list`/`data`
      null qolib qolardi va Skeleton abadiy aylanaverardi (retry yo'q). Endi uchalasida
      ham `ErrorState onRetry` bor. Bo'sh holat matnlari va Skeleton ilgari ham bor edi
- [x] STUDENT UI-STATES ✅ 2026-07-28 (Karis): audit qilindi — `Home.jsx` va `TestTake.jsx`
      da allaqachon bor edi, `Homework.jsx` va `Shop.jsx` da yo'q edi (xuddi shu "abadiy
      Skeleton" bagi) — tuzatildi. Endi student panelidagi barcha 7 sahifada 3 holat ham bor
- [x] STUDENT (Odil): design-system — laym #C6FF34, Manrope, responsive
      ✅ MERGE QILINDI 2026-08-09 (branch `xob`, commit `172d250`): to'liq responsive
      qayta ishlash, i18n ru/uz, yangi `/study` (LessonsHub) sahifasi, «Aqlli tahlil»
      AI-review maketi (backend endi TAYYOR — yuqoridagi "AI-REVIEW" bo'limiga qara).
      21 fayl, +2051/−336. Kod tekshirildi, 1 ta bag topilib tuzatildi (yuqorida
      "✅ xob — save-zone'ga merge qilindi" ga qara).
      ✅ **EGALIK SAVOLI YOPILDI (2026-08-09, Karis qarori):** panel rasman
      Odil'niki qilindi. Amaldagi ish (09.08 redizayn) XOB tomonidan qilingan edi —
      jamoa jadvalida u umuman yo'q, TASK.md'da tarix uchun shunday qoldirildi.

## Frontend — Parent (Kama — @Azizovcf, git iface9808-sketch) 🔥 to'liq egasi

> Methodist'dan Parent panelga o'tkazildi. Backend tayyor (AB-PARENT: child overview + assertParentOwnsChild guard).
> Panel: `frontend/member` (parent tomoni — login-kod + parol bilan kiradi).

- [x] PARENT: Child overview — Dashboard.jsx (useParentOverview hook)
- [x] PARENT: Bir nechta farzand — child-context.jsx (bolalar orasida almashtirish)
- [x] PARENT: Davomat detali — Attendance.jsx
- [x] PARENT: Baholar / uy vazifa natijalari — Grades.jsx
- [x] PARENT: To'lov / qarz — Debt.jsx
- [x] PARENT: Chat — Chat.jsx (16 chaqiruv) ✅ Socket.io realtime tasdiqlandi (2026-07-21)
- [ ] PARENT-I18N 🆕 (Kama, branch `iface9808`, 08-07): to'liq i18n ru/uz/en
      (`frontend/member/src/i18n/{en,ru,uz}.js`, locale-aware formatlar), til
      almashtirgich UI (`LanguageSwitcher.jsx`), test ball foizi ko'rsatilishi va
      guruh nomi overflow (initsiallar+truncate) tuzatildi, chat backendga ulanishga
      tayyorlandi. Save-zone'ga hali merge qilinmagan
- [x] PARENT: Bildirishnomalar — Notifications.jsx
- [x] PARENT ✅ JONLI TEKSHIRILDI 2026-07-28 (Karis): Обзор, Посещаемость, Оценки, Оплата,
      Уведомления, Профиль (Telegram tugmasi, preference toggle'lar) — real login bilan
      tekshirildi. Chat — AB-VERIFY'ga qara (u yerda topilgan bag shu yerga ham tegishli edi)
- [ ] PARENT: Design-system — laym #C6FF34, Manrope, 3 holat (Skeleton/Empty/Error), responsive 1280/768/375, TanStack Query

### 🔴 PARENT (Kama) — auditda topilgan yangi kamchiliklar (2026-07-21)

- [x] AB-PARENT-NOTIF ✅ allaqachon bajarilgan ekan (Abdulaziz, `870d1c5`, 2026-07-21) —
      tekshirildi 2026-07-28 (Karis): `GET /api/parent/notifications` bor va front
      (`member/api.js`) real endpointga ulangan, mock emas. TASK.md eskirgan edi
- [x] FE-PARENT-DEBT ✅ TUZATILDI 2026-07-28 (Karis): backendga `overview.repository.js`
      `getCurrentInvoice()` qo'shildi (joriy invoice `total_amount`/`paid_amount`),
      `Debt.jsx` progress-bar endi haqiqiy nisbatni ko'rsatadi
- [x] FE-PARENT-PROFILE-PREF ✅ TUZATILDI 2026-07-28 (Karis): haqiqiy push-bildirishnoma
      infratuzilmasi (service worker/VAPID) loyihada umuman yo'q — shuning uchun soxta
      bekend jadval o'rniga toggle'lar `localStorage` ga saqlanadi (haqiqiy klient
      sozlamasi, backend kerak emas)
- [x] FE-PARENT-SIDEBAR-NOTIF ✅ allaqachon yopilgan ekan — `Layout.jsx` umumiy
      `sidebar` komponenti orqali desktop va mobilda bir xil link ishlatadi
- [x] FE-PARENT-PAGINATION ✅ TUZATILDI 2026-07-28 (Karis): backendga ikkita yangi
      endpoint (`GET /parent/children/:id/attendance`, `.../grades`, page/limit) +
      `GET /parent/notifications` uchun kursor pagination (`before`, lenta 5 manbadan
      birlashtiriladi — oddiy offset ishlamaydi). Frontda pager + "ko'proq ko'rsatish"

## Frontend — Landing Page ✅

- [x] LANDING: Home, Features, Roles, Finance, Gamification, Contacts
- [x] LANDING: Header, Footer, CTA

## Frontend — Methodist (Said Islom, Aziz — CEO'dan o'tkazildi) ✅ karkas

> Panel karkasi tayyor (Karis). Said Islom + Aziz endi Methodist jamoasida — qo'shimcha ish + MVP2 kontent-menejer + support/maintenance.
> ⚠️ **2026-07-26:** bu bo'limda ochiq vazifa YO'Q, lekin ikkalasining REAL ochiq ishi bor —
> `Frontend — CEO` bo'limidagi FE-SUPER-STATS / FE-SUPER-REPORTS / FE-SUPER-WIRE.
> Git-hisobotda ular shu sababli endi "CEO" panelida ko'rinadi (ilgari "Methodist · 0 vazifa"
> deb turardi, CEO esa egasiz ko'rinardi — ikkalasi ham noto'g'ri manzara berardi).
> Methodist ishi qaytadan boshlansa (MVP2 kontent-menejer) — hisobotdagi panel qaytariladi.

- [x] METHODIST: Training Types (CRUD)
- [x] METHODIST: Topics (CRUD)
- [x] METHODIST: Lessons (CRUD + LessonEditor)
- [x] METHODIST: Analytics
- [x] METHODIST: Dashboard

## Frontend — Design / UX 🆕 EGALARI BELGILANDI (2026-07-19)

> Bu blok ilgari EGASIZ turgan edi — 6 ta vazifa, hech kimga biriktirilmagan.
> Egasiz vazifa = hech kim qilmaydigan vazifa. Endi mentor jamoasi bo'shadi
> (mentor panelni Karis o'zi oldi, jamoa bilan kelishilgan) — shular oladi.

- [ ] UI-DS (HAR KIM o'z paneli bo'yicha — 2026-07-26 da Sardor'dan taqsimlandi):
      Har bir panel FRONTEND-DESIGN-SYSTEM.md ga qat'iy rioya qiladi
      (laym #C6FF34, Manrope, qorong'i sidebar #1D2417, kartochka soyalari) — o'zboshimcha ranglar TAQIQLANADI
      ✅ ADMIN QISMI BAJARILDI 2026-07-21 (Karis): admin panelida 651 ta klass-daraja
      `var(--...)` mavzu tokenlariga o'tkazildi, `glass-strong` → `card bg-base-100`.
      **Ildiz sabab topildi:** `index.css` `:root` da DaisyUI mavzusidagi AYNI qiymatlar
      qayta e'lon qilingan edi (`--green` #40833B == `primary`, `--text` #1D2417 ==
      `base-content`, `--surface` #fff == `base-100`, `--danger` #dc2626 == `error`) —
      ya'ni bitta palitraning ikkita nusxasi. Brend rangini o'zgartirish ikki joyni
      tahrirlashni talab qilardi. Yana `src/pages/admin/style.md` da Abdullohning
      alohida "style guide"i yotgan edi (docs/archive ga ko'chirildi) — dizayn
      shuning uchun ikkiga bo'lingan
      ⚠️ QOLDI: ~105 ta inline `style={{ ... 'var(--x)' }}`. Ular BIR XIL ko'rinadi
      (qiymatlar bir xil), lekin hali `index.css` ga bog'liq. Har birini `className` ga
      ko'chirish kerak — skript bilan ko'r-ko'rona qilinmadi
- [ ] UI-STATES (HAR KIM o'z paneli bo'yicha): har sahifada 3 holat — Skeleton (yuklanish),
      EmptyState (bo'sh ma'lumot), Error (xato + retry). Bu markazlashgan vazifa EMAS:
      kim qaysi sahifada ishlayotgan bo'lsa, o'sha sahifaning uch holatini o'zi yopadi
- [x] UI-SHARED ✅ BAJARILDI 2026-07-21 (Karis): admin sahifalari endi `mentor/_ui.jsx` dan
      foydalanadi. KPI-plitka OLTI nusxada yotgan edi — `StatCard` Students/Groups/Mentors/
      Payments da (bayt-ma-bayt bir xil) + deyarli xuddi shunday `KpiCard` Dashboard/Reports da.
      Bittasi `_ui.jsx` ga ko'chirildi. Nusxalar xom hex qabul qilardi: 13 ta qotirilgan rang,
      ba'zisi turli registrda takrorlangan (`#8B5CF6` va `#8b5cf6`). Endi `tone`
      (neutral/success/warning/danger) → mavzu tokeni
- [ ] UI-RESPONSIVE (Alish): 1280 / 768 / 375 px kengliklar, gorizontal scroll yo'q
- [x] UI-TABLES ✅ AUDIT + TUZATILDI 2026-07-28 (Karis): 162 ta `tabular-nums` ishlatilishi
      allaqachon bor edi, hover/pilyulalar deyarli hamma joyda. 5 ta haqiqiy tirqish topildi
      va tuzatildi: `admin/Groups.jsx`, `admin/Students.jsx`, `mentor/StatsTab.jsx`,
      `super/Attendance.jsx`, `super/Dashboard.jsx` — raqamli ustunlarda `tabular-nums` yo'q edi
- [x] UI-CACHE ✅ AUDIT 2026-07-28 (Karis): barcha admin/mentor/methodist/super sahifalari
      tekshirildi — qayerda mutatsiya bo'lsa, o'sha yerda `invalidate()`/`invalidateQueries`/
      `refetch()` bor. Chat va Attendance (mentor) — sokat orqali live yangilanadi,
      alohida invalidatsiya kerak emas. Tuzatishga hojat topilmadi

## 🆕 YANGI ROLLAR — Branch Manager + Finance Manager (2026-08-04, Karis og'zaki berdi)

> ⚠️ Hozircha faqat REJALASHTIRISH — kod yozilmagan. Ikkalasi ham hozirgi 7 ta rolga
> (main_admin/ceo/admin/mentor/student/parent/methodist) qo'shiladigan YANGI rol.
> **Karis o'zi 2026-08-04 aytdi: backend integratsiyani (DB migratsiya, `authorize`
> middleware, RBAC) O'ZI qiladi — jamoadan FAQAT frontend (UI, mock-rejim bilan) kerak.**
> Backend tomon `backend/src/middlewares/authorize.js`da: rol nomi `req.user.role` bilan
> to'g'ridan-to'g'ri solishtiriladi, scope esa `else` shoxobchasida (org+branch, xuddi
> admin'dek) — Branch Manager va Finance Manager ikkalasi ham shu naqshga tushadi,
> Karis uchun bu kichik o'zgarish. Jamoa bemalol UI'ni mock data bilan boshlashi mumkin,
> backend keyin ulanadi (xuddi boshqa panellar VITE_USE_MOCKS bilan qurilgani kabi).

- [ ] ROLE-BRANCH 🔄 EGASI (frontend, jamoa): **Elyor, Said Islom, Kozim** (Karis
      tayinladi, 2026-08-04 — Abduloh'dan bu uchoviga o'tkazildi).
      Yangi rol — **Branch Manager** (Filial menejeri). Karis ta'rifi: "Admin'lar bilan bir
      qatorda turadi, filialga TO'LIQ javobgar odam — Admin'dan KO'PROQ ma'lumotga ega
      bo'ladi". Ya'ni Branch Manager ⊃ Admin (kengroq), Admin'dan esa 1-2 narsa OLIB
      TASHLANADI (qaysi huquq/sahifa — Karis hali aniq aytmadi).
      **BU UCHOVNING ISHI — aniq QANCHA va NIMA ko'rinishini HAL QILISH** (Karis: "shuni
      hal qilishi kerak"): Admin panelidagi (`frontend/staff/src/pages/admin/`) qaysi
      sahifa/ma'lumot Branch Manager'da QO'SHIMCHA ko'rinadi (masalan: boshqa filiallar bilan
      solishtirish, filial darajasidagi to'liqroq moliyaviy ko'rinish, xodimlar bo'yicha
      kengroq hisobot — aniq ro'yxat SHU UCHOVDAN chiqishi kerak, keyin Karis bilan
      tasdiqlanadi), va Admin'dan aynan NIMA olib tashlanishi kerak.
      Amaliy boshlanish nuqtasi: Admin panelining nusxasini olib (`pages/admin/*` —
      Dashboard/Students/Groups/Mentors/Payments/Reports/Expenses), yangi `pages/branch/`
      papkasida Branch Manager variantini qurish, farqlarni taklif sifatida yozib qo'yish.
      Mock-rejimda ishlang — backend Karis'da.

- [x] ROLE-RENAME-SUPERADMIN ✅ **YOPILDI 07.08.2026.** Karis CEO/CEO savoliga ikki marta
      aniq javob berdi: CEO, CEO emas. To'liq texnik o'zgartirish qilindi (faqat UI matni
      emas) — Postgres enum (`user_role` va `platform_announcement_target`), JWT/RBAC
      (`authorize.js` va h.k.), barcha rol-tekshiruvlari backend+frontend, hujjatlar.
      Migratsiya `1784320000000_rename-superadmin-to-ceo.js` — `ALTER TYPE ... RENAME VALUE`,
      Docker'da tekshirilgan, hali hech qanday bazaga qo'llanmagan (prod ham, local ham).
      Qo'llashda: barcha joriy CEO/Super Admin foydalanuvchilari qayta login qilishi kerak
      (JWT'dagi eski role qiymati bilan `authorize('ceo')` endi mos kelmaydi).

- [x] ROLE-FINANCE ✅ **YOPILDI 22.08.2026 (Karis)** — rol endi mock emas, HAQIQIY backend roli:
      migratsiya `1787090000000_finance-manager-org-wide.js` (butun tashkilot, `branch_id IS NULL`),
      alohida modul `backend/src/modules/finance/` → `/api/finance/*`, huquq
      `authorize('finance_manager','ceo')`. CEO bloki (`super.routes.js`) ATAYLAB kengaytirilmadi —
      aks holda filiallar/adminlar/o'quvchilar ham ochilib ketardi. 6 sahifa real ma'lumotga
      o'tdi, `pages/finance/_data.js` butunlay o'chirildi. Scope savoliga javob: BUTUN TASHKILOT
      (CEO darajasida). Tafsilot va topilgan 10 ta hisob-kitob xatosi — `done.md`, 22.08.2026.
      Quyida dastlabki topshiriq matni tarix uchun saqlanadi:

- [ ] ROLE-FINANCE 🔄 EGASI (frontend, jamoa): **Shohjahon, Aziz, Alish** (Karis
      tayinladi, 2026-08-04). Yangi rol — **Finance Manager** (Finans menejeri). Karis
      ta'rifi: daromad, rashod, xodimlar oyligi va boshqa BARCHA xarajatlarni kuzatadi.
      Scope hali aniqlanmagan (butun tashkilotmi — ceo darajasida, yoki filial —
      admin darajasida?) — bu ham jamoa taklifi bilan Karis'ga qaytishi kerak.
      Boshlanish nuqtasi: mavjud moliyaviy sahifalarni ko'rib chiqish —
      `admin/Expenses.jsx`, `admin/Reports.jsx`, `super/Reports.jsx`, `main/Revenue.jsx`,
      `main/Billing.jsx` (oylik/xodim xarajati hali alohida sahifa sifatida YO'Q — buni
      ham shu jamoa loyihalashi kerak). Mock-rejimda, yangi `pages/finance/` papkasida.

## 🆕 STUDENT — chat kabinetga qo'shiladi (2026-08-04, Karis)

> ⚠️ **DIQQAT — ehtimoliy to'qnashuv:** shu kunning o'zida bu ish OpenCode (avtomat agent)
> orqali ALLAQACHON boshlangan edi — `frontend/member/src/student/api.js` ga mock chat
> hisob-kitobi (`mockChatAppend`, `chatThreads`/`chatMessages`/`chatMarkRead`) yozib
> ulgurgan, `student/pages/Chat.jsx` yozishga tayyorlangan edi. Karis to'xtatishni
> so'ragan edi, lekin tool chaqiruvi RAD ETILDI — ya'ni OpenCode sessiyasi hali ham
> shu faylni yozib turgan yoki yozib bo'lgan bo'lishi mumkin. **Sardor va Odil
> boshlashdan OLDIN albatta tekshirsin: `frontend/member/src/student/` papkasida
> `Chat.jsx`/`api.js` allaqachon bormi — bo'lsa, NOLDAN yozmasdan O'SHANI ko'rib
> chiqib davom ettirsin, aks holda ikki xil chat ustma-ust qurilib chiqadi.**

- [ ] STUDENT-CHAT 🔄 EGASI: **Sardor, Odil** (Karis tayinladi, 2026-08-04). Hozircha
      Student kabineti (`frontend/member/src/student/`, roulari `/student /lessons /tests
      /homework /videos /shop /leaderboard`)da chat sahifasi UMUMAN yo'q edi — faqat
      Parent'da bor (`member/src/pages/Chat.jsx`, `roomKey = parent:${user.id}`).
      Namuna: `frontend/staff/components/StaffChat.jsx` (variant bilan mentor/admin
      ikkalasiga xizmat qiladi) va yuqoridagi Parent Chat.jsx — bir xil naqsh, roomKey/rol
      farqi bilan. Backend tomon (`backend/src/sockets/chat.js`, `modules/chat`) allaqachon
      tayyor, student→mentor yo'nalishi ham (`AB-VERIFY` yozuviga qara yuqorida) ishlaydi —
      demak bu asosan FRONTEND ish, mock kerak emas, real socket bilan qurilishi mumkin.

## Landing header va sahifalar dizayni (2026-08-24, Karis)

- [x] LANDING-UI-2026-08-24 — **EGASI VA BAJARUVCHI: Karis (Team Lead)**.
      Landing sahifalari va umumiy header yangilandi: zamonaviy yagona panel,
      alohida ichki cardlarsiz logo/menu/til almashtirgich, responsive mobil drawer,
      pastga scroll qilganda header yashirinishi va tepaga scroll qilganda qayta
      ko'rinishi, header ortidagi bo'sh oq fon yo'qotilishi. Landing sahifalari
      (`for-language-school`, `for-courses`, `crm-vs-excel`, `blog`, maqola,
      `vs/modme`, `vs/umai`, `about`) UI/UX bo'yicha yangilandi. Client build,
      SSR/prerender va localhost HTTP tekshiruvlari muvaffaqiyatli o'tdi.

## SaaS Control Center — Main Admin paneli (2026-08-25, Karis)

> Karis belgilagan tartib: chiroyli grafiklardan emas, to'rtta narsadan boshlanadi —
> Action Center, hisob-fakturalar va qarzlar, Audit Log, Health Score.
> Quyidagi uchtasi bajarildi (hisob-fakturalar va Health Score hali qolgan).

- [x] SCC-AUDIT ✅ **BAJARILDI 25.08.2026 (Karis)** — platforma egasining harakatlari
      jurnali. Ilgari `main` modulida bitta ham yozuv yo'q edi: hamkorni muzlatish,
      qo'lda to'lov, bonus oylar, pullik fichalarni yoqish — hammasi izsiz ketardi,
      chunki `audit_log.organization_id` NOT NULL edi, Main Admin esa hech qaysi
      tashkilotga tegishli emas (migratsiya `1787100000000` buni oldi, `before_data`,
      `after_data`, `reason` ustunlari qo'shildi). Endi 8 ta amal «bo'ldi → bo'ldi»
      ko'rinishida yoziladi: kim, qachon, qaysi IP. Onboarding'dagi vaqtinchalik
      parol ATAYLAB yozilmaydi. UI: `/audit` sahifasi + yon menyuda «История изменений»

- [x] SCC-ACTION ✅ **BAJARILDI 25.08.2026 (Karis)** — «Центр контроля»: hozir
      aralashuv talab qiladigan narsalar bitta ekranda. 6 xil signal: kirish
      bloklangan hamkor, grace-davri tugayotgan, kirish muddati yaqinlashgan,
      qo'lda muzlatilgan, hech qachon kirmagan / 14 kundan beri kirmagan hamkor,
      javobsiz ariza, kutayotgan ficha so'rovi. Har biri `href` bilan — qayerga
      borib tuzatishni ko'rsatadi. Bloklash qoidasi QAYTA YOZILMADI, `shared/
      orgAccess.js` dagi `isOrgAccessBlocked` chaqiriladi — aks holda panel bir
      narsani ko'rsatib, tizim boshqacha ishlagan bo'lardi. Dashboard tepasida
      panel + yon menyuda birinchi punkt, kritik soni bilan

- [x] SCC-PGCRASH ✅ **BAJARILDI 25.08.2026 (Karis)** — backend'ning kun davomida
      qayta-qayta o'lishi sababi topildi: `pool.on('error')` faqat pul ichida
      bo'sh turgan klientlarni ushlaydi, `pool.connect()` orqali berilgan klient
      esa uzilishda o'zida 'error' chiqaradi — tinglovchisi yo'q, bu
      unhandledRejection emas, uncaughtException, va butun protsess o'lardi.
      `pool.on('connect')` ichida tinglovchi qo'shildi (`config/db.js`).
      Nazorat tajribasi bilan isbotlangan: tinglovchisiz pul o'ladi, tuzatilgani
      omon qoladi va `SELECT 1` ishlaydi

- [x] SCC-SITE-ANALYTICS ✅ **BAJARILDI 25.08.2026 (Karis)** — `levelup-academy.uz`
      sayti bo'yicha to'liq statistika Main Admin ichida (`/site-analytics`).
      Ilgari bu raqamlar uchta begona kabinetda yotardi. Search Console API —
      qanday so'rovlar bilan topishadi, ko'rsatishlar, kliklar, CTR, o'rtacha
      pozitsiya. GA4 Data API — nechta odam kelgan, **saytda o'rtacha qancha
      vaqt turgan**, qayerdan kelgan, qaysi sahifalarni ko'rgan, qaysi sahifadan
      boshlagan va necha foizi hech narsa qilmay ketgan. Mamlakatlar, qurilmalar,
      `generate_lead` konversiyalari.
      **Saytdan qaysi sahifada chiqib ketishgani**: GA4'da exit rate metrikasi
      YO'Q — u Universal Analytics bilan birga olib tashlangan, Data API orqali
      olishning iloji yo'q. Shuning uchun landing o'zi `page_exit` hodisasini
      yuboradi (`pagehide` + `visibilitychange`, sahifaga bir marta), panel esa
      uni `pagePath` kesimida sanaydi. Ma'lumot chiqarilgan kundan boshlab
      to'planadi, ekranda shu sana ochiq yozilgan
- [x] SCC-SITE-ANALYTICS-QA — yangi kutubxona qo'shilmadi (`google-auth-library`
      Google-login uchun allaqachon bor edi). Xatolar bo'sh massiv bilan
      almashtirilmaydi: kalit yo'q bo'lsa `configured:false` va sozlash bo'yicha
      qadamlar, API xato bersa — o'sha blok `null` va aniq xato matni, qolganlari
      chiziladi. Begona kalit bilan nazorat tajribasi o'tkazildi. Ikkala build
      (main-admin + landing SSR/prerender) toza. Hujjat: `docs/SITE-ANALYTICS.md`
- [x] SCC-SITE-ANALYTICS-KEY ✅ **BAJARILDI 25.08.2026** — Karis so'roviga ko'ra
      brauzer avtomatizatsiyasi orqali sozlandi (parol kiritilmadi, kalit chatga
      chiqarilmadi): service account `site-analytics-reader@levelup-1c059.iam.
      gserviceaccount.com`, ikkala API yoqildi, GA4'da «Читатель», Search
      Console'da «Ограниченный доступ» (bu yetarli — tekshirildi), JSON kalit
      `backend/.env` ga ko'chirildi. **Jonli tekshiruv:** 28 kunda 88 tashrif
      buyuruvchi, 144 seans, o'rtacha 6 daq 04 son, Google'dan 51 klik / 327
      ko'rsatish, CTR 15,6%, o'rtacha pozitsiya 8,0 — xatolarsiz

- [ ] SCC-SITE-ANALYTICS-DEPLOY ⚠️ — `page_exit` hodisasi hozircha faqat lokal
      koddа. Prod'ga chiqmaguncha «Где уходят с сайта» bo'sh turadi (hozir 0),
      chunki hodisa saytda hali yuborilmayapti. Landing deploy qilinishi kerak

- [ ] SCC-BILLING — platforma → hamkor hisob-fakturalari (`platform_invoices`,
      pozitsiyalar, to'lovlar, chegirmalar; qisman to'lov, statuslar). Hozircha
      faqat `platform_org_payments` (kassa jurnali) bor, tariflar esa
      `config/plans.js` da qotib yotibdi — `PUT /api/main/pricing` hech nima
      yozmaydi, `platform_pricing` jadvali bo'sh
- [ ] SCC-HEALTH — hamkor Health Score (0–100): kirishlar, to'lov intizomi,
      faollik. SCC-BILLING dan keyin, chunki unga to'lov tarixi kerak
