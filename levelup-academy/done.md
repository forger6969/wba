# LevelUp Academy — TUGALLANGAN VAZIFALAR

> Oxirgi yangilanish: 25.08.2026 06:20 (UTC+5, Toshkent vaqti)
> Statistika: 209/237 task tugallangan (88%)

---

## Progress: [#################...] 88%

## Tugallangan vazifalar

### Main Admin — levelup-academy.uz sayti statistikasi (Karis, 25.08.2026) ✅
- [x] Yangi sahifa `/site-analytics`: sayt bo'yicha hamma raqam bitta ekranda. Ilgari
      ular uchta begona kabinetda edi — Search Console, GA4 va Clarity
- [x] Search Console API: qanday so'rovlar bilan topishadi, ko'rsatishlar, kliklar, CTR,
      o'rtacha pozitsiya, qaysi sahifalar qidiruvda chiqadi
- [x] GA4 Data API: nechta odam kelgan, **saytda o'rtacha qancha vaqt turgan**, qayerdan
      kelgan (Google / to'g'ridan-to'g'ri / ijtimoiy tarmoq), qaysi sahifalarni ko'rgan va
      qancha vaqt, qaysi sahifadan boshlagan va necha foizi hech narsa qilmay ketgan.
      Mamlakatlar, qurilmalar, ariza formasi konversiyalari (`generate_lead`)
- [x] **Saytdan qaysi sahifada chiqib ketishgani**: GA4'da exit rate metrikasi YO'Q —
      u Universal Analytics bilan birga olib tashlangan. Shuning uchun landing o'zi
      `page_exit` hodisasini yuboradi (`pagehide` + `visibilitychange`, sahifaga bir
      marta, `transport_type: beacon`), panel uni `pagePath` kesimida sanaydi.
      Ma'lumot chiqarilgan kundan boshlab to'planadi — ekranda shu sana ochiq yozilgan
- [x] Yangi kutubxona qo'shilmadi: `google-auth-library` Google-login uchun allaqachon
      bor edi, u service account JWT'ni ham qiladi. Ikkala skoup ham readonly — server
      GA4 va Search Console'da hech narsani o'zgartira olmaydi
- [x] Xatolar bo'sh massiv bilan almashtirilmaydi: kalit yo'q bo'lsa `configured:false`
      va sozlash qadamlari ekranda, API xato bersa — o'sha blok `null` va aniq xato
      matni, qolgan bloklar chiziladi. Begona kalit bilan nazorat tajribasi o'tkazildi
- [x] Search Console oynasi 3 kunga orqaga surilgan (Google ma'lumotni kechikib chiqaradi,
      aks holda oxirgi kunlar nol bo'lib grafik «qulash» ko'rinishini beradi) — sanalar
      raqamlar yonida ochiq yozilgan
- [x] **Google ulanishi sozlandi 25.08.2026** — Karis so'roviga ko'ra brauzer orqali:
      service account `site-analytics-reader@levelup-1c059.iam.gserviceaccount.com`,
      ikkala API yoqildi, GA4'da «Читатель», Search Console'da «Ограниченный доступ»
      (bu yetarli ekani jonli tekshirildi), JSON kalit `backend/.env` ga ko'chirildi.
      Parol kiritilmadi, kalit chatga chiqarilmadi, `.env` git'ga tushmaydi
- [x] **Jonli natija (28 kun):** 88 tashrif buyuruvchi, 144 seans, 714 sahifa ko'rish,
      o'rtacha saytda 6 daq 04 son, rad etish 54,9%. Google'dan 51 klik / 327 ko'rsatish,
      CTR 15,6%, o'rtacha pozitsiya 8,0. Eng ko'p so'rov «levelup academy» (9 klik,
      1,8-pozitsiya). Manbalar: Organic Search 77, Direct 58 seans. Xatolar yo'q
- [ ] ⚠️ QOLGANI — `page_exit` hodisasi hozircha faqat lokal kodda. «Где уходят с сайта»
      bo'sh turadi (hozir 0) — landing prod'ga deploy qilinishi kerak

### Main Admin — Audit Log, Центр контроля va backend qulashi (Karis, 25.08.2026) ✅
- [x] **Audit Log**: ilgari `main` modulida bitta ham jurnal yozuvi yo'q edi — hamkorni
      muzlatish, qo'lda to'lov, bonus oylar, pullik fichalar izsiz ketardi
      (`audit_log.organization_id` NOT NULL edi, Main Admin esa tashkilotdan tashqarida).
      Endi 8 ta amal «bo'ldi → bo'ldi» ko'rinishida yoziladi. Onboarding'dagi vaqtinchalik
      parol ATAYLAB yozilmaydi. Sahifa `/audit`
- [x] **Центр контроля** (`/action-center`): hozir aralashuv talab qiladigan 6 xil signal,
      har biri havola bilan — qayerga borib tuzatish kerakligini ko'rsatadi. Bloklash
      qoidasi qayta yozilmadi, `shared/orgAccess.js` dagi `isOrgAccessBlocked` chaqiriladi
- [x] **Backend qulashining sababi topildi**: `pool.on('error')` faqat bo'sh turgan
      klientlarni ushlaydi; `pool.connect()` bergan klient uzilishda o'zida 'error'
      chiqaradi, tinglovchisi yo'q → uncaughtException → butun protsess o'ladi.
      `pool.on('connect')` ichida tinglovchi qo'shildi. Nazorat tajribasi bilan isbotlandi

### Student — Mavzu ichida video → test → uyga vazifa ketma-ketligi (Karis, 22.08.2026) ✅
- [x] «Mening darslarim» ikki bosqichga bo'lindi: mavzular ro'yxati (`/lessons`) → mavzu ichi
      (`/lessons/topics/:id`, yangi `TopicDetail.jsx`). Ilgari hamma mavzu bitta uzun lentada edi
- [x] Mavzu ichida qat'iy ketma-ketlik: video → test → uyga vazifa. Oldingisi tugamaguncha
      keyingisi ochilmaydi (qulf ikonkasi + sabab matni)
- [x] Mavzu videosi ikki xil: YouTube havolasi (bepul, cheklovsiz) YOKI Storj'ga fayl yuklash.
      Fayl uchun o'tkazib yuborish REAL bloklangan (seek-bar yo'q, `maxReachedTime` qaytarish,
      strelkalar bloki). «Ko'rildi» — haqiqiy `ENDED`/`ended` hodisasi bo'yicha, foiz emas
- [x] Yon menyu endi to'g'ridan-to'g'ri mavzularga olib boradi; bosh sahifadagi «Kunlik vazifa»
      ham bo'sh `/tests` o'rniga real mavzuga yo'naltiradi

### Metodist + Main Admin — Mavzu videosi va uning tannarxi (Karis, 22.08.2026) ✅
- [x] Metodist mavzuga video biriktiradi: havola yoki fayl (`POST /methodist/topics/:id/video`,
      presigned PUT → Storj). Fayl hajmi serverda o'lchanadi (HeadObject) — mijoz raqamiga
      ishonilmaydi, aks holda hajmni pasaytirib ko'rsatish mumkin bo'lardi
- [x] Narx avtomatik: Storj tannarxi $0.007/GB, Karis belgilagan ustama bilan $0.020/GB —
      saqlash (oyiga) va har bir ko'rish uchun alohida (`src/config/pricing.js`)
- [x] Pul ko'rsatkichlari FAQAT Main Admin'da (`/video-storage`) — hamkorning xodimi bo'lgan
      metodistga infratuzilma tannarxi hech qayerda ko'rsatilmaydi (SQL RETURNING'da ham yo'q)

### Backend — Tanga endi avtomatik va aniq beriladi (Karis, 22.08.2026) ✅
- [x] Aqlli tahlil (AI) endi sdachani O'ZI yopadi va tangani O'ZI qo'yadi. Ilgari AI faqat matn
      yozardi, ball hech qayerga tushmasdi va sdacha `submitted` holatida abadiy qotib qolardi —
      qo'lda baholash endpointi umuman yo'q edi
- [x] Test uchun tanga «hammasi yoki hech nima» emas, to'g'ri javoblar ulushi bo'yicha:
      `round(coin_reward × to'g'ri / jami)` — 10 tanga va 10 savolda har to'g'ri javobga 1 tanga
- [x] Video uchun tanga: oxirigacha ko'rilsa to'liq summa, faqat BIR marta
      (`topic_video_views`, UNIQUE) — qayta ko'rish bilan tanga yig'ib bo'lmaydi

### Finance Manager — mock rol HAQIQIY backend roliga aylandi (Karis, 22.08.2026) ✅
- [x] Migratsiya: `chk_users_branch_scope` endi `finance_manager`ga `branch_id IS NULL` ruxsat
      beradi — rol butun tashkilotni ko'radi (CEO/metodist kabi), bitta filialga bog'lanmaydi
- [x] Alohida modul `/api/finance/*` (`authorize('finance_manager','ceo')`) — CEO'ning
      `super.routes.js` bloki KENGAYTIRILMADI, aks holda filiallar/adminlar/o'quvchilar ham
      ochilib ketardi. Kontroller/servis o'sha bitta (dublikat yo'q), faqat kirish nuqtasi boshqa
- [x] 6 sahifa mock'dan real ma'lumotga o'tdi, `pages/finance/_data.js` butunlay o'chirildi
- [x] Xarajatlar sahifasi endi qo'shish/tahrirlash/o'chirishni ham qiladi (backend tayyor edi)

### Backend + Frontend — Moliyaviy hisob-kitobdagi 10 ta xato tuzatildi (Karis, 22.08.2026) ✅
- [x] Filial ulushi: davr daromadi BUTUN VAQT daromadiga bo'linardi — ulushlar 100% bermasdi
      (jonli tekshiruv: 37.5% + 9.4% = 46.9% → 80% + 20% = 100%). CEO panelida ham shu xato bor edi
- [x] Oylik dinamika: qatordagi oxirgi ikki nuqta olinardi, to'lovsiz oylar qatorda umuman
      bo'lmaydi — «avgust iyunga» «oydan-oyga» deb ko'rsatilardi. Endi kalendar bo'yicha aniq
- [x] O'sish foizi: bitta oy ma'lumoti bo'lsa mavjud bo'lmagan oyga nisbatan «+100%» to'qib
      chiqarilardi → endi `null`, chunki noldan o'sish aniqlanmagan
- [x] O'chirilgan filial: puli umumiy yakunga tushardi, lekin filiallar ro'yxatidan chiqib
      ketardi (yakun ≠ filiallar yig'indisi). O'quvchi/admin/mentor sanoqlarida ham shunday edi
- [x] **Oy chegarasi mahalliy vaqtda hisoblanardi** (UTC+5), `toISOString()` uni 5 soatga surib
      yuborardi: avgustga 31-iyuldagi 6 mlrd tranzaksiya kirib ketardi. Avgust daromadi
      7 502 030 081 → 1 502 030 081, trend ▲649% → ▼79%
- [x] Xarajatlar sahifasida oy filtri UMUMAN yo'q edi — butun vaqt «oylik xarajat» deb
      ko'rsatilardi (5 704 553 → 4 704 553) va oylik daromad bilan solishtirib bo'lmasdi
- [x] `api.financeExpenses` `from`/`to` parametrlarini tashlab yuborardi, backendga yetib bormasdi
- [x] Sozlamalar: `/users/me` snake_case qaytaradi, kod camelCase o'qirdi — ism/familiya bo'sh edi
- [x] Tekshirildi, xato YO'Q: qaytarilgan to'lovlar (`refunded`) daromaddan to'g'ri chiqarilgan;
      `total_debt` — haqiqiy tranzaksion balans; barcha yakunlar filiallar yig'indisiga teng

### Student paneli — chat, e'lonlar va interfeys tuzatishlari (Karis, 22.08.2026) ✅
- [x] Chat: admin ham suhbatdosh sifatida qo'shildi (backend ruxsat berardi, frontend
      ko'rsatmasdi); to'liq ekranli yangi dizayn; ism yonida rol yozuvi (Mentor/Админ)
- [x] E'lonlar sahifasi umumiy dizayn tizimiga o'tkazildi va i18n'ga ulandi (matn qattiq
      o'zbekcha edi); sana buzilgan edi (`2026 M08 22`) — umumiy `fmtDateTime` ishlatildi
- [x] Skeleton mos kelmasligi: `/leaderboard` va bosh sahifada umumiy 3-ustunli skeleton real
      tuzilishga mos emas edi — har biriga o'z shakli yozildi
- [x] Staff login sahifasidagi «Demo-kirish (backendsiz)» eslatmasi endi faqat mock rejimda
      ko'rinadi — real backendda bunday akkauntlar yo'q va foydalanuvchini chalg'itardi

### Backend+Frontend — Shop va Telegram fича-gate (Karis, 13.08.2026) ✅ kod tayyor, migratsiya KUTMOQDA
- [x] Umumiy: `shared/orgFeatures.js` (`isFeatureEnabledForOrg`, Redis'siz —
- [x] Shop: gейт `student.routes.js` (`/shop`), `admin.routes.js` (`/shop`),
- [x] Telegram: gейт `telegram.routes.js` (`POST /bind-token`),
- [x] Frontend Telegram-UI: `frontend/staff` — Branch Manager
- [x] `orgFeatures: {shop, telegramIntegration}` — `publicUser()`

### Backend — Student paneli: XOB so'rovi (Telegram, 12.08.2026) ✅ kod tayyor, migratsiya KUTMOQDA
- [x] XOB-1 LEADERBOARD-GROUP: `GET /api/student/leaderboard?groupId=...`
- [x] XOB-2 VISIT-STREAK: `GET /api/student/home` ga `streak`/`longestStreak`
- [x] XOB-3 LESSON-REVIEW: `GET /api/student/lessons/:id` submission ichiga
- [x] XOB-4 STUDENT-LANGUAGE: `users.preferred_language` ('ru'|'uz', NULL =

### Backend — Aqlli tahlil + Ota-onalar Telegram guruhi (Karis, 09.08.2026) ✅
- [x] AI-REVIEW: `methodology_submissions` uchun AI kod-tahlili — Groq
- [x] TG-BRANCH-BIND: Branch Manager kabinetida (`Branch.jsx`) "Ota-onalar
- [x] TG-ATTENDANCE: `attendance.service.js` — davomat belgilangach (3 daqiqa
- [x] TG-TEST-RESULT: `submitTest` — har test topshirilgach natija (mavzu +
- [x] TG-DAILY-DIGEST: har kuni 00:00 (Asia/Tashkent) — kecha muddati o'tib
- [x] STORJ-UPGRADE ($5/oy dan, hisob bo'yicha minimum): 10.08.2026 aniqlandi —
- [x] RENDER-STARTER: web-servisni (`LevelUP_academy-1`) Free'dan Starter'ga
- [x] WORKER-MERGE: `worker.js` `server.js` ichiga qo'shildi — o'sha $7/oy

### Backend — Auth (Karis)
- [x] K-AUTH: login (3 endpoint: main/staff/member), JWT access 15m
- [x] K-AUTH: Refresh rotation (30d httpOnly cookie), logout, frozen-check (403)
- [x] K-AUTH: Email OTP forgot/reset password (SMS bekor qilindi — pullik)
- [x] K-AUTH: SMTP OTP/password change emails
- [x] K-AUTH: authenticate + authorize middlewares (RBAC + org+branch scope)
- [x] K-AUTH: Google OAuth (Firebase) main_admin uchun

### Backend — Main Admin (Karis)
- [x] K-MAIN: Public endpoint forms -> leads table
- [x] K-MAIN: Lead panel: list, status change, notes
- [x] K-MAIN: Partner onboarding: POST /api/main/partners
- [x] K-MAIN: Platform dashboard: GET /api/main/dashboard
- [x] K-MAIN: Billing: narxlar DBda (platform_pricing), GET/PUT /api/main/pricing
- [x] K-MAIN: Partner freeze/activate (PATCH /partners/:id/status)
- [x] K-MAIN: YANGI narx modeli (2026-07-16) — o'quvchi bucket tariflari (Free/Start/Standard/Pro/Business/Network), filiallar bepul; config/plans.js TIERS + computeBill({students}); eski filial+o'quvchi formula bekor; GET /api/main/pricing endi { tiers, currency }

### Backend — CEO (Karis)
- [x] K-SUPER: Organization dashboard (GET /api/super/dashboard: totals + branch breakdown)
- [x] K-SUPER: CRUD branches (+ archive/unarchive) va CRUD admins (+ freeze)

### Backend — Admin (Karis)
- [x] K-ADMIN: Branch dashboard: income + expenses = profit
- [x] K-ADMIN: Expenses CRUD
- [x] K-ADMIN: Students CRUD (add-student login_code+parol generatsiya, freeze, regenerate-password, soft-delete)
- [x] K-ADMIN: Groups CRUD (archive, mentor biriktirish, students add/remove)
- [x] K-ADMIN: Mentors CRUD (create/PATCH/freeze/DELETE guard bilan)
- [x] K-ADMIN: Guruh jadvali (2026-07-16) — POST/PATCH /api/admin/groups { days[], startTime }; tugash vaqti backendda org dars davomiyligidan hisoblanadi; GET /api/admin/settings (davomiylik)

### Backend — Methodist (Karis)
- [x] K-METHODIST: Training types, topics, lessons CRUD + analytics (modules/methodist)
- [x] K-METHODIST: Dars media (2026-07-18) — migratsiya 1783800000000 (video_url + file_key) + GET /api/methodist/lessons/:id/upload-url (presigned S3) + updateLesson videoUrl/fileKey qabul qiladi

### Backend — Xodimlar intizomi (Karis) ✅ 2026-07-18 (MVP1, main da)
- [x] K-DISC: shtraf (summa + sabab, avto-yechish YO'Q) + qora (ishdan bo'shatish, status='fired', withTransaction)
- [x] K-DISC: Huquqlar matritsasi (CAN_ISSUE): ceo→admin/mentor/methodist; admin→mentor/methodist (shtraf), faqat mentor (qora); main_admin→HECH NARSA
- [x] K-DISC: Ustav (org_charters, erkin matn, upsert, barcha xodimlarga ko'rinadi)
- [x] K-DISC: Endpointlar — super PUT/GET /charter, POST/GET /penalties, POST /staff/:id/reactivate; admin GET /charter, POST/GET /penalties; shared GET /users/me/penalties, /users/me/charter
- [x] K-DISC: Swagger — Discipline tegi, 10 endpoint, swagger/*.md qayta generatsiya (139 endpoint)
- [x] K-DISC-FRONT ✅ BAJARILDI 2026-07-28 (Karis, Hamidula'ning o'rniga — vaqtni tejash uchun

### Backend — V1 To'lovlar 🔥 (Karis — Team Lead, 2 task) ✅
- [x] K-PAY: Payments modul: oylik avto-hisoblash (billing.worker, 1-sana, muddat 5-sana) + invoice + full + split (FOR UPDATE, split_batch_id, validatsiya BEGIN dan oldin) + ad-hoc to'lov + refund/void + chek S3 ga; commit dan KEYIN notificationQueue ('payment.received'/'payment.due'/'payment.refunded'); total_debt + invoice.status qayta hisob. To'lamasa (5-sanadan keyin, invoice='overdue') — student panelga umuman data qaytmaydi (paymentGate, 402). NASIYA YO'Q
- [x] K-PAY: Branch reports: filial bo'yicha tushum va qarzlar (guruhlar kesimida) — GET /api/admin/reports

### Mentor panel — to'liq qayta ishlash (Karis) ✅ 2026-07-18/19 — save-zone da 42 commit
- [x] MP-COINS: Mentor oylik koin limiti — migratsiya `1783850000000_mentor-coin-budget`
- [x] MP-PROFILE: Mentor professional profili — migratsiya `1783840000000_mentor-profile`
- [x] MP-STATS: Statistika — har o'quvchi bo'yicha (davomat/uy vazifa/test/koin), 6 oylik trend grafigi,
- [x] MP-ATTEND: Davomat Socket.IO ga ko'chirildi — o'qish, yozish va jonli yangilanish;
- [x] MP-CHAT: Chat qayta yozildi — kompozer HAR DOIM render bo'ladi (ilgari `activeContact` ichida edi →
- [x] MP-SHELL: Staff qobig'i — sidebar hover'da ochiladi/yopiladi, ishlaydigan bildirishnomalar paneli,
- [x] MP-SEED: `seed-mentor-demo.mjs` (demo mentorni real data bilan to'ldiradi),
- [x] MP-VERIFY ✅ JONLI TEKSHIRILDI 2026-07-28 (Karis): Docker ko'tarildi (`docker compose up

### Backend — Integration (Karis) 🔥 hozirgi fokus
- [x] K-INT: admin GroupDetail — **QAROR QABUL QILINDI 2026-07-19**, Abdulaziz bloki OCHILDI.
- [x] BUG-LOCAL-PROD-DB ✅ TUZATILDI 2026-07-19: `backend/.env` dagi `DATABASE_URL`

### BUGLAR / BLOKERLAR (Karis) — 2026-07-18 tekshiruvida topildi
- [x] BUG-PROD-MOCKS ✅ TUZATILDI 2026-07-19: `frontend/{staff,student,member}/.env.production`
- [x] ~~BUG-STACK~~ ✅ TUZATILGAN (2026-07-19 auditda tekshirildi, TASK.md eskirgan edi): `render.yaml:19-20` da `NODE_ENV=production` O'RNATILGAN, `errorHandler.js:41` stack'ni faqat `env.NODE_ENV === 'development'` da qaytaradi (qat'iy tenglik — yangi hostingda o'zgaruvchi unutilsa ham stack chiqmaydi). Bundan tashqari 5xx da `details` ham berkitildi, o'rniga `errorId` (pino req.id) qaytadi — commit `5a1f177`
- [x] ~~BUG-LOCAL-PROD-DB~~ ✅ TUZATILGAN — **DUBLIKAT yozuv edi, 2026-07-26 da yopildi.**
- [x] BUG-TESTS-RED ✅ TUZATILDI 2026-07-19 (commit `b22c3e4`):
- [x] BUG-REDIS-SILENT ✅ **TASDIQLANDI 2026-07-28 (Karis)** — aslida allaqachon `7226ab6` (26.07)
- [x] ~~BUG-BILLING~~ ✅ YOPILDI 2026-07-26 (Karis): `Billing.jsx` bakit modeliga o'tkazildi,

### Swagger / API hujjatlari (Karis) ✅ 2026-07-18
- [x] DOCS: Barcha route'lar auditi — 158 route topildi, 139 tasi hujjatlashtirilgan edi, 19 tasi YO'Q edi (16 super + 2 admin + 1 telegram)
- [x] DOCS: 19 ta yetishmagan @openapi bloki yozildi → **qamrov 100%** (158/158, spec 158 operatsiya beradi)
- [x] DOCS: Yangi komponentlar — `Organization`, `UpdateOrganizationRequest`, `NotImplemented` (501 javobi)
- [x] DOCS: `PlatformPricing` sxemasi eski narx modelidan yangi TIERS ga ko'chirildi (BUG-BILLING sababi)
- [x] DOCS: Zaglushka endpointlar hujjatda ochiq belgilandi (⚠️ STUB / 501) — front ularga ulanmasin
- [x] DOCS: swagger/*.md qayta generatsiya (139 → 158 endpoint, yangi telegram.md)

### Backend — V1 qolganlari (Abdulaziz) ✅ (kod: d57dff5)
- [x] AB-V1: POST /api/admin/announcements -> notificationQueue (Bilol TG-boti uchun e'lonlar)
- [x] AB-V1: due-soon worker (to'lov muddatidan N kun oldin ota-onaga eslatma, payment.due_soon)
- [x] AB-V1: Partner profit main dashboardda (income - expenses; pul jadvallariga faqat SELECT)
- [x] AB-V1: Integration testlar: payments full/split + auth flow (login -> refresh -> reuse-detect -> OTP)

### Backend — CEO Integratsiya (Karis) 🔥 hozirgi fokus
- [x] K-SUPER-INT: GET + PATCH /api/super/organization — Settings (org profil) ✅ jonli tekshirildi (35586f6)
- [x] K-SUPER-INT: Dars davomiyligi (2026-07-16) — organizations.lesson_duration_min + lessonDurationMin GET/PATCH /api/super/organization da
- [x] K-SUPER-INT: GET /api/super/students (+search/filter/pagination + DELETE) — Students sahifa (repository listOrgStudents: ILIKE search + LIMIT/OFFSET)
- [x] K-SUPER-INT: GET /api/super/groups (+archive/unarchive + DELETE) — Groups sahifa
- [x] K-SUPER-INT: GET /api/super/attendance (date/group filter) — Attendance
- [x] K-SUPER-INT ✅ JONLI TEKSHIRILDI 2026-07-28 (Karis): Dashboard, Филиалы, Студенты, Группы,

### Backend — YANGI TOPSHIRIQ (Abdulaziz) 🔥 2026-07-19, Karis bergan
- [x] AB-INT-GROUP — attendance/homework/feedback endpointlar `admin.routes.js` da,
- [x] AB-SUPER-ANN — `GET/POST/DELETE /api/super/announcements` (`460914b`)
- [x] AB-SUPER-REM — `GET /api/super/reminders` + resend/delete (`870d1c5`)
- [x] AB-SUPER-AUDIT — `GET /api/super/audit` (`460914b`)
- [x] AB-SUPER-STATS — `GET /api/super/stats` (`460914b`); front tomoni FE-SUPER-STATS'da
- [x] AB-SUPER-SWAGGER ✅ TUZATILDI 2026-07-28 (Karis): announcements GET/POST/DELETE va
- [x] AB-SUPER-REPORTS — `GET /api/super/reports` (`460914b`); front FE-SUPER-REPORTS'da
- [x] AB-EXPENSE-PATCH — `PATCH /api/admin/expenses/:id` qo'shildi
- [x] AB-MAIN-REVENUE — `GET /api/main/revenue` (`460914b`); front tomoni Shohjahon'da (MAIN: Revenue)
- [x] AB-VERIFY ✅ JONLI TEKSHIRILDI 2026-07-28 (Karis, Abdulaziz'ning ishiga tegmasdan —
- [x] AB-VERIFY: Parent Chat — Socket.io realtime tasdiqlandi (2026-07-21)

### Telegram bot (Bilol) ⚠️ TASK.md ga 2026-07-19 da QO'SHILDI
- [x] TG-SYNC ✅ BAJARILDI 2026-07-26 (Karis): `docs/TASK-telegram-bot.md` kod bilan sverka
- [x] TG-BIND ✅ BAJARILGAN (Bilol; 2026-07-26 auditda tasdiqlandi):
- [x] TG-DUE ✅ BAJARILGAN (Bilol): `payment.due_soon` handler `notification.worker.js:21` da,
- [x] TG-ANN ✅ BAJARILGAN (Bilol): `announcement.created` handler `notification.worker.js:37` da.
- [x] TG-FRONT ✅ BAJARILDI 2026-07-28 (Karis): parent — `member/Profile.jsx` da karta

### Backend — Infrastructure (Abdulaziz) ✅
- [x] AB-INFRA: Scaffold + structure + deps + docker-compose
- [x] AB-INFRA: config/ (env, db, redis, s3, mailer, sms, logger)
- [x] AB-INFRA: utils/ + middlewares (validate, rateLimiter, archiveGuard, errorHandler)
- [x] AB-INFRA: app.js + server.js
- [x] AB-INFRA: Migrations (node-pg-migrate) — full DDL
- [x] AB-INFRA: Sockets (redis-adapter, socketAuth, presence, chat)
- [x] AB-INFRA: Queues (BullMQ notification + overdue worker)
- [x] AB-INFRA: Telegram bot (grammy)

### Backend — Mentor (Abdulaziz) ✅
- [x] AB-MENTOR: Attendance (bulk-upsert)
- [x] AB-MENTOR: Homework check (0-max + coin_reward)
- [x] AB-MENTOR: Test constructor (questions JSONB)
- [x] AB-MENTOR: Exam with timer
- [x] AB-MENTOR: Coins +/- via changeCoins()
- [x] AB-MENTOR: Mentor salary (mentor_salaries)
- [x] AB-MENTOR: Manual coin assignment POST /api/mentor/coins
- [x] AB-MENTOR: Mentor groups read overview

### Backend — Student (Abdulaziz) ✅
- [x] AB-STUDENT: Home (coins/debt/ranking/groups/deadlines)
- [x] AB-STUDENT: Shop (FOR UPDATE, rollback on insufficient)
- [x] AB-STUDENT: Tests (timer, scoring, reward >= 50%)
- [x] AB-STUDENT: Homework (presigned S3)
- [x] AB-STUDENT: Videos (by membership)
- [x] AB-STUDENT: Leaderboards week/month (Redis ZSET)

### Backend — Parent (Abdulaziz) ✅
- [x] AB-PARENT: Child overview (coins, debt, ranking, groups, attendance, grades)
- [x] AB-PARENT: Ownership guard assertParentOwnsChild

### Backend — Shared (Abdulaziz) ✅
- [x] AB-SHARED: users module (profile, branch list)
- [x] AB-SHARED: db/seeds (demo data, idempotent)
- [x] AB-SHARED: Coin foundation: coins.changeCoins()

### Backend — Narx / GTM (Karis) 🔥 YANGI (2026-07-16)
- [x] PRICE: Bucket tariflar backendda (config/plans.js TIERS, computeBill by students)
- [x] PRICE ✅ 2026-07-19: Neon'dagi migratsiyalar prognat qilindi.
- [x] PRICE ✅ 2026-07-19: `render.yaml` ga `preDeployCommand: npm run migrate` qo'shildi.

### Frontend — Auth (Elyor)
- [x] AUTH: Login sahifalar (3 endpoint: main / staff / member) — `staff/pages/Login.jsx`, `member/pages/Login.jsx`, `main-admin/pages/Login.jsx`, uchalasi `/auth/{staff,member,main}/login` ga ulangan. `origin/elyor` da save-zone dan ortiqcha commit YO'Q — merge qilinadigan narsa qolmagan
- [x] AUTH: ProtectedRoute + RoleGuard — ProtectedRoute uchala App.jsx da, `staff/components/RoleGuard.jsx` admin+ceo route'larida ishlatiladi
- [x] AUTH: Router setup by roles — staff/App.jsx da rolli route'lar
- [x] AUTH: Redux authSlice — KERAK EMAS (useAuth() context yetarli, qaror 2026-07-15)
- [x] AUTH: 401 → refresh → retry interceptor (api.js, bitta refreshPromise) — ✅ Elyor bajardi (staff/member/main-admin), save-zone ga merge (55ef617). Auditda tasdiqlandi: `refreshPromise` 4 ta app da ham bor
- [x] AUTH: Socket.io client — `staff/socket.js` (presence + davomat live + ack-request), `member/socket.js`. `main-admin` va `student` da realtime sahifa YO'Q (Chat yo'q) → ularga socket kerak emas
- [x] AUTH-FORGOT ✅ TUZATILDI 2026-07-28 (Karis): `staff/api.js` mock-blokiga
- [x] AUTH-ELYOR-4 ✅ 4/4 YOPILDI 2026-07-28 (Karis): 1) admin dashboard — tuzatilgan

### Frontend — CEO ⚠️ TUGAMAGAN (Said Islom + Aziz) — 2026-07-19 auditda ochildi
- [x] SUPER (front): Dashboard (org income, branches, admins, students)
- [x] SUPER (front): CRUD branches (Branches -> BranchDetail)
- [x] SUPER (front): CRUD admins
- [x] SUPER (front): Organization settings + ComingSoon (Shohjahon) — backend /api/super/organization TAYYOR (Karis, 35586f6)
- [x] SUPER (front) ✅ BAJARILDI 2026-07-28 (Karis): Settings sahifasiga "Длительность урока"
- [x] FE-SUPER-STATS ✅ **BAJARILDI 2026-07-27 (Karis)** — sahifa `GET /api/super/stats?period=` ga
- [x] FE-SUPER-REPORTS ✅ **BAJARILDI 2026-07-27 (Karis)** — sahifa `GET /api/super/reports` ga
- [x] FE-SUPER-WIRE ✅ **TASDIQLANDI 2026-07-28 (Karis)** — kod tekshirildi: uchala sahifa

### Main Admin (Karis) 🔥 to'liq egasi — 2026-07-26 dan, front + backend
- [x] MAIN: Dashboard — KPI + grafiklar (Dashboard.jsx, 805 qator)
- [x] MAIN: Leads — ro'yxat / filtr / status o'zgartirish, OnboardModal (temp-parol), Qabul / Rad etish
- [x] MAIN: Organizations (hamkorlar) — ro'yxat / qidiruv, freeze / activate (855 qator)
- [x] MAIN: Org-detail sahifasi — OrgDetail.jsx qurilgan
- [x] MAIN: Billing ✅ TUZATILDI 2026-07-26 (Karis) — BUG-BILLING yopildi.
- [x] MAIN: Revenue ✅ ULANDI 2026-07-26 (Karis).
- [x] MAIN: Settings — ✅ audit 2026-07-19: "zaglushka" deb yozilgani NOTO'G'RI edi.
- [x] MAIN-404-BACKEND ✅ YOPILDI 2026-07-26 (Karis) — endpointlar YOZILDI.
- [x] MAIN-FINES-MOCK ✅ YOPILDI 2026-07-26 (Karis) — mok o'chirildi, sahifa qayta yozildi.
- [x] MAIN: Forgot-password ✅ POLISH QILINDI 2026-07-26 (Karis).
- [x] MAIN: Design-system ✅ TEKSHIRILDI 2026-07-26 (Karis), jonli brauzerda.
- [x] ~~MAIN-FINES~~ — dublikat, yuqoridagi `MAIN-FINES-MOCK` ga birlashtirildi (2026-07-26)
- [x] ~~MAIN-UNTRACKED~~ ✅ ANIQLANDI 2026-07-26: `Fines.jsx` va `Announcements.jsx` ni

### Frontend — Admin (Abduloh, Odil, Hamidula)
- [x] ADMIN: rey/xob admin_page ishini staff strukturasiga ko'chirish (alohida Vite-app EMAS — staff ichida sahifalar; merge REVIEW dan keyin)
- [x] ADMIN: Dashboard (income + expenses = profit) — Dashboard.jsx, api ga ulangan
- [x] ADMIN: Students CRUD (xob integratsiyasi bor — reviewdan o'tkazish) — Students.jsx + StudentDetail.jsx
- [x] ADMIN: Groups CRUD — Groups.jsx + GroupDetail.jsx
- [x] ADMIN ✅ (Abduloh) `GroupDetail.jsx` real API ga ulangan ekan — tekshirildi 2026-07-28
- [x] ADMIN: Payments UI (full/split modal; K-PAY chiqqach ulanadi) — Payments.jsx (775 qator)
- [x] ADMIN: Expenses CRUD — Expenses.jsx + PDF eksport (Abduloh, jspdf)
- [x] ADMIN: Reports — Reports.jsx, GET /api/admin/reports ga ulangan

### Frontend — YANGI TASKLAR: Kozim / Alish 🆕 2026-07-19 (2026-07-26 da yangilandi)
- [x] FE-CHAT-ADMIN ✅ BAJARILDI 2026-07-21 (Karis): chat endi HAQIQIY.
- [x] FE-DEAD-CODE ✅ hammasi allaqachon o'chirilgan ekan (tekshirildi 2026-07-28, Karis):
- [x] FE-ROUTER-FLAG ✅ QO'SHILDI 2026-07-28 (Karis): `future={{ v7_startTransition: true,
- [x] FE-COOP ✅ TUZATILDI 2026-07-28 (Karis): `Cross-Origin-Opener-Policy:
- [x] FE-THIN-PAGES ✅ BAJARILDI 2026-07-28 (Karis): `member/Debt.jsx` 108→142 qator (haqiqiy

### Frontend — Mentor (Sardor, Kozim, Alish)
- [x] MENTOR: Dashboard (groups, upcoming lessons)
- [x] MENTOR: Attendance journal — Attendance.jsx (726 qator, api ga ulangan)
- [x] MENTOR: Homework (check, grades)
- [x] MENTOR: Tests (create, results) — Tests.jsx + konstruktor + natijalar (2026-07-18)
- [x] MENTOR: Coins (assign/deduct)
- [x] MENTOR: Chat — shaxsiy dm: xonalar, Socket.io + tarix, faqat xodim va ota-ona ko‘radi (2026-07-18)

### Frontend — Student (Odil) 🔥 to'liq egasi — 2026-08-09 dan
- [x] STUDENT: Home (coins, groups, deadlines)
- [x] STUDENT: Tests — Tests.jsx + TestTake.jsx (timer/scoring)
- [x] STUDENT: Homework
- [x] STUDENT: Shop
- [x] STUDENT: Videos
- [x] STUDENT: Leaderboard
- [x] STUDENT: staff design-system'ga ko'chirildi (Tailwind + DaisyUI) — 2026-07-25, Karis (`a458c1b`)
- [x] STUDENT ✅ JONLI TEKSHIRILDI 2026-07-28 (Karis, Sardor'ning ishiga tegmasdan): login,
- [x] STUDENT ✅ BAJARILDI 2026-07-28 (Karis, Sardor'ning ishiga tegmasdan) —
- [x] STUDENT UI-STATES ✅ 2026-07-28 (Karis): audit qilindi — `Home.jsx` va `TestTake.jsx`
- [x] STUDENT (Odil): design-system — laym #C6FF34, Manrope, responsive

### Frontend — Parent (Kama — @Azizovcf, git iface9808-sketch) 🔥 to'liq egasi
- [x] PARENT: Child overview — Dashboard.jsx (useParentOverview hook)
- [x] PARENT: Bir nechta farzand — child-context.jsx (bolalar orasida almashtirish)
- [x] PARENT: Davomat detali — Attendance.jsx
- [x] PARENT: Baholar / uy vazifa natijalari — Grades.jsx
- [x] PARENT: To'lov / qarz — Debt.jsx
- [x] PARENT: Chat — Chat.jsx (16 chaqiruv) ✅ Socket.io realtime tasdiqlandi (2026-07-21)
- [x] PARENT: Bildirishnomalar — Notifications.jsx
- [x] PARENT ✅ JONLI TEKSHIRILDI 2026-07-28 (Karis): Обзор, Посещаемость, Оценки, Оплата,
- [x] AB-PARENT-NOTIF ✅ allaqachon bajarilgan ekan (Abdulaziz, `870d1c5`, 2026-07-21) —
- [x] FE-PARENT-DEBT ✅ TUZATILDI 2026-07-28 (Karis): backendga `overview.repository.js`
- [x] FE-PARENT-PROFILE-PREF ✅ TUZATILDI 2026-07-28 (Karis): haqiqiy push-bildirishnoma
- [x] FE-PARENT-SIDEBAR-NOTIF ✅ allaqachon yopilgan ekan — `Layout.jsx` umumiy
- [x] FE-PARENT-PAGINATION ✅ TUZATILDI 2026-07-28 (Karis): backendga ikkita yangi

### Frontend — Landing Page ✅
- [x] LANDING: Home, Features, Roles, Finance, Gamification, Contacts
- [x] LANDING: Header, Footer, CTA

### Frontend — Methodist (Said Islom, Aziz — CEO'dan o'tkazildi) ✅ karkas
- [x] METHODIST: Training Types (CRUD)
- [x] METHODIST: Topics (CRUD)
- [x] METHODIST: Lessons (CRUD + LessonEditor)
- [x] METHODIST: Analytics
- [x] METHODIST: Dashboard

### Frontend — Design / UX 🆕 EGALARI BELGILANDI (2026-07-19)
- [x] UI-SHARED ✅ BAJARILDI 2026-07-21 (Karis): admin sahifalari endi `mentor/_ui.jsx` dan
- [x] UI-TABLES ✅ AUDIT + TUZATILDI 2026-07-28 (Karis): 162 ta `tabular-nums` ishlatilishi
- [x] UI-CACHE ✅ AUDIT 2026-07-28 (Karis): barcha admin/mentor/methodist/super sahifalari

### YANGI ROLLAR — Branch Manager + Finance Manager (2026-08-04, Karis og'zaki berdi)
- [x] ROLE-RENAME-SUPERADMIN ✅ **YOPILDI 07.08.2026.** `superadmin` → `ceo` (Karis CEO/CEO
      savoliga ikki marta javob berdi). ⚠️ **29.08.2026 qayta nomlandi: `ceo` → `ceo`** —
      «CEO» butun dunyoda Search Engine Optimization deb tushuniladi, direktor uchun
      to‘g‘ri qisqartma CEO. Migratsiya `1787160000000_rename-ceo-to-ceo.js`

---

## Jamoa boyicha

- Karis (Backend): 129 task
- Abdulaziz (Backend): 84 task
- Frontend jamoasi: 74 task

---

## 2026-08-24 — Landing UI/UX yangilanishi (Karis)

- [x] **Bajaruvchi: Karis (Team Lead).** Landing sahifalarining umumiy vizual
      uslubi yangilandi: `for-language-school`, `for-courses`, `crm-vs-excel`,
      `blog`, `blog/excel-to-crm`, `vs/modme`, `vs/umai` va `about`.
- [x] Umumiy header qayta ishlab chiqildi: bitta yaxlit panel, logo/menu/til
      almashtirgich atrofidagi ortiqcha alohida cardlar olib tashlandi.
- [x] Logo `LevelUp Academy` oddiy va yaxlit ko'rinishga keltirildi; yashil belgi
      atrofidagi qo'shimcha card va umumiy oq logo-card olib tashlandi.
- [x] Navigatsiya va RU/UZ/EN almashtirgichi soddalashtirildi; aktiv holatlar
      laym chiziq bilan ko'rsatiladi.
- [x] Header scroll harakati qo'shildi: pastga scroll qilganda yashirinadi,
      tepaga scroll qilganda qayta paydo bo'ladi; kichik scroll tebranishlariga
      qarshi threshold ishlatiladi.
- [x] Header fixed/overlay rejimiga o'tkazildi va orqasidagi bo'sh oq fon olib
      tashlandi; birinchi ekran kontenti header ostiga kirib ketmasligi uchun
      responsive kompensatsion padding qo'shildi.
- [x] Mobil drawer dizayni va yopish tugmasi saqlandi; desktop/tablet/mobile
      responsive holatlari tekshirildi.
- [x] Tekshiruv: landing client production build muvaffaqiyatli; to'liq buildda
      client + SSR + 57 ta lokalizatsiyalangan prerender URL muvaffaqiyatli;
      `http://localhost:5173/landing/about` — HTTP 200.
