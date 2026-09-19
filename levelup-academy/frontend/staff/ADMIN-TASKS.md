# Admin Panel — Vazifalar Ro'yxati (Abduloh + Odil/Xob)

> 📌 **Manba:** `TASK.md` (root, Team Lead zonasi — o'qib chiqdim), `docs/team/feedbacks/`,
> `swagger/admin*.md`, `swagger/discipline.md`, Karis (Azizbek) ning 27.07.2026 reviewi.
> Bu fayl — admin panelining **frontend** ishlari yagona manbai (save-zone workflow).
> Root `TASK.md` ga TEGILMAYDI — barcha yangi yozuvlar shu yerda.
>
> **Zona:** `frontend/staff/src/pages/admin/` + bog'liq shared fayllar (`api.js`, `queries.js`,
> `components/`). `backend/` va root fayllar TAQIQLANADI.
>
> **Workflow:** `save-zone` branch. Commitlar inglizcha (`feat:` / `fix:` / `refactor:`).
> Pushdan keyin merge ni Karis qiladi. Hech kim o'zgartirgan faylni bossiz qayta yozmaydi.

---

## 👥 Kim nima qiladi (taqsimot: Abduloh 70% / Odil 30%)

| Kim | Huquq | Sahifalari |
|-----|-------|-----------|
| **Abduloh** | to'liq frontend (barcha 5 Vite app) — admin panel lead | Dashboard, Students, StudentDetail, GroupDetail, Payments, Expenses, Reports(dizayn), Mentors, Chat, Settings, Profile, **Announcements (yangi)**, **Charter (yangi)**, + cross-cutting fixlar |
| **Odil / Xob** | faqat `frontend/staff` (admin) | **Groups.jsx** (guruh formasi), **Reports.jsx** (dizayn polish) |
| **Hamidula** | alohida — `K-DISC-FRONT` (TASK.md) | **Penalties** (shtraf berish + ro'yxat, `POST/GET /admin/penalties`) — bu yerda emas, TASK.md da |

> ⚠️ **GroupDetail vs Groups:** ikki xil fayl. `Groups.jsx` (ro'yxat + create/edit modal) = **Odil**.
> `GroupDetail.jsx` (roster, attendance, homework, feedback) = **Abduloh**. Konflikt yo'q.

---

## 📊 Sahifalar bo'yicha vazifalar

### 1. Dashboard.jsx — Abduloh
- [ ] **UI-DS-DASH:** ~105 ta inline `style={{ ... 'var(--x)' }}` -> `className` ga ko'chirish
      (Karis 2026-07-21 da 651 klass-darajani o'tkazgan, inline qoldi). Barcha admin sahifalarda.
- [ ] **UI-STATES-DASH:** Skeleton / EmptyState / Error (3 holat) tekshiruvi.

### 2. Students.jsx + StudentDetail.jsx — Abduloh
- [ ] **FE-STU-BADGE:** "AKTIV" bejigi har qatorda takrorlanadi — faqat **aktiv bo'lmaganda**
      (frozen/debtor) ko'rsatilsin, aktiv qatorlarda bejik bo'lmasin (Karis review §dizayn).
- [ ] **FE-STU-PHONE:** telefon raqamlar formatlanmagan (`+998901112233`) ->
      `+998 90 111 22 33` (`format.js` da `formatPhone` helper qo'shilsin, barcha sahifalarda ishlatilsin).
- [ ] **FE-STU-KPI-DUP:** KPI kartochkalari va filtr chiplari bir xil raqamni ikki marta
      ko'rsatadi — dublikat olib tashlansin (faqat bitta joyda: KPI yoki chip).
- [ ] **UI-STATES-STU:** 3 holat tekshiruvi (Students + StudentDetail).

### 3. Groups.jsx — Odil/Xob 🔥
- [ ] **FE-GROUP-FORM** (TASK.md ADMIN/Odil): guruh formasi — mentor majburiy + kunlar
      (1-3-5 / 2-4-6 preset yoki alohida kun galochka) + boshlanish vaqti + **tugash vaqti AVTO**
      (`GET /api/admin/settings` -> `lessonDurationMin` orqali hisoblanadi) ->
      `POST/PATCH { days, startTime }`. Kontrakt: `frontend/TEAM-TASKS.md §9.2`.
- [ ] **UI-STATES-GROUPS:** 3 holat tekshiruvi.

### 4. GroupDetail.jsx — Abduloh 🔥
- [ ] **FE-GDETAIL-API** (TASK.md ADMIN/Abduloh): attendance / homework / feedback hali
      **mock'dan** olinyapti -> real API ga ulash. 🟢 **Bloker yo'q:** oltala backend endpoint
      2026-07-20 dan beri TAYYOR (AB-INT-GROUP):
      - `GET/POST /admin/groups/:id/attendance`
      - `GET/POST /admin/groups/:id/homework`
      - `GET/POST /admin/groups/:id/feedback` (yangi jadval `1783860000000_group-feedback`)
      Qoida: attendance/homework mentor jadvallaridan REUSE (faqat o'qish, branch scope),
      feedback yangi CRUD. Yozish huquqi mentor'da qoladi — admin faqat ko'radi.
- [ ] **UI-STATES-GDETAIL:** 3 holat tekshiruvi.

### 5. Payments.jsx — Abduloh
- [ ] **UI-STATES-PAY:** 3 holat tekshiruvi (invoice list + detail panel).
- [ ] **FE-PAY-EXPORT-LIMIT:** eksportda limit yuborilmasa 20 qator keladi (DEFAULT_LIMIT 20).
      Barcha eksport ishlatadigan sahifalarda `limit=10000` (yoki backend `?export=all`) qo'shilsin.
      (Expenses/Reports bilan birga hal qilinadi.)

### 6. Expenses.jsx — Abduloh 🔥 (Karis review §xatolar)
- [ ] **FE-EXP-PDF-CYRILL:** PDF da kirill umuman chiqmaydi — `jspdf` standart shriftlarida
      kirill glifi yo'q. `addFileToVFS` + `addFont` bilan TTF shrnt qo'shish kerak
      (masalan Roboto-Regular.ttf, base64). Karis: "bu senga qoldi".
- [ ] **FE-EXP-EXPORT-LIMIT:** eksport faqat ekrandagi 20 qatorni oladi -> `limit` parametri
      yuborilsin (FE-PAY-EXPORT-LIMIT bilan birga).
- [ ] **FE-EXP-COLORS:** PDF sarlavhasi va diagrammalar ko'k `#3B82F6` -> dizayn tizimida
      ko'k YO'Q, panel yashil (lime `#C6FF34` / `var(--green)`). FRONTEND-DESIGN-SYSTEM.md.
- [ ] **FE-EXP-XLSX-CVE:** `xlsx@0.18.5` zaiflik (CVE-2023-30533, prototype pollution).
      SheetJS npm dan ketgan, muzlab qolgan. Yangi manba -> `xlsx` ni yangilash
      (CDN `https://cdn.sheetjs.com/xlsx-0.20.x/xlsx-0.20.x.tgz` yoki `exceljs` ga o'tish).
      ⚠️ Yangi paket o'rnatishdan oldin Karis bilan kelishiladi (package.json o'zgaradi).
- [ ] **UI-STATES-EXP:** 3 holat tekshiruvi.

### 7. Reports.jsx — Odil/Xob (dizayn) + Abduloh (eksport fix)
- [ ] **FE-REP-COLORS** (Odil): diagrammalar ko'k `#3B82F6` -> lime palitra
      (Revenue=`var(--green)`, Expenses=`var(--danger)`). FRONTEND-DESIGN-SYSTEM.md.
- [ ] **FE-REP-EXPORT-LIMIT** (Abduloh): eksport 20 qator muammosi (FE-PAY-EXPORT-LIMIT bilan).
- [ ] **UI-STATES-REP** (Odil): 3 holat tekshiruvi.

### 8. Mentors.jsx — Abduloh
- [ ] **UI-STATES-MENT:** 3 holat tekshiruvi.
- [ ] **FE-MENT-PHONE:** telefon format (FE-STU-PHONE helper bilan birga).

### 9. Chat.jsx — Abduloh
- [ ] Holat: ✅ HAQIQIY (Karis 2026-07-21, `components/StaffChat.jsx` umumiy). Faqat polish.
- [ ] **UI-STATES-CHAT:** empty kontakt ro'yxati holati (mocklarda doim 3 ta bor edi).

### 10. Settings.jsx — Abduloh
- [ ] Holat: ✅ to'liq, 6 tab. Russian -> Uzbek matnlar tekshirilsin (TASK-OdilXob.md ga qara).
- [ ] **UI-STATES-SET:** 3 holat tekshiruvi.

### 11. Profile.jsx — Abduloh
- [ ] **UI-STATES-PROFILE:** 3 holat tekshiruvi.

### 12. Announcements.jsx — Abduloh 🆕 (yangi sahifa)
- [ ] **FE-ADMIN-ANN:** backend TAYYOR — `POST /api/admin/announcements`
      (title, message, groupId? — groupId yo'q bo'lsa butun filial aktiv studentlariga).
      Queue orqali Telegram bot ga yetkaziladi (async). Swagger: `swagger/admin.md`.
      Forma + ro'yxat (oxirgilari). `api.js` ga `adminCreateAnnouncement` qo'shilsin.

### 13. Charter.jsx — Abduloh 🆕 (yangi sahifa, faqat o'qish)
- [ ] **FE-ADMIN-CHARTER:** backend TAYYOR — `GET /api/admin/charter` (faqat o'qish,
      egasi CEO — `PUT /api/super/charter`). Swagger: `swagger/discipline.md`.
      Admin panelda ustav matnini ko'rsatish (read-only). Settings ichida tab sifatida ham bo'lishi mumkin.

---

## 🔧 Cross-cutting (barcha admin sahifalarni tegadi)

- [ ] **FE-EXPORT-LIMIT** (Abduloh): eksport qiluvchi sahifalar (Students/Expenses/Reports/Payments)
      `limit` yubormaydi -> 20 qator. Yagona yechim: `api.js` da eksport chaqiruvlari
      `limit=10000` (yoki alohida `?export=all`) bilan yuborilsin.
- [ ] **FE-PHONE-FMT** (Abduloh): `format.js` da `formatPhone(s)` helper -> barcha sahifalarda.
- [ ] **FE-COLORS-LIME** (Abduloh + Odil): ko'k `#3B82F6` / `#3B82F6` hamma joyda -> lime palitra.
- [ ] **UI-DS-INLINE** (Abduloh): ~105 ta inline `style={{ 'var(--x)' }}` -> `className` (UI-DS-DASH).
- [ ] **UI-STATES** (har kim o'z paneli bo'yicha): 3 holat — Skeleton / EmptyState / Error.

---

## ⛔ Cheklovlar

1. `backend/` ga TEGILMAYDI — Abduloh to'liq frontend huquqi bor, lekin backend yo'q.
2. Root fayllar (`TASK.md`, `CLAUDE.md`, `package.json` korinda, `render.yaml`) — Team Lead zonasi.
3. Boshqa panel egalarining fayllarini bossiz qayta yozmang (Parent = Kama, Super = Said/Aziz, va h.k.).
4. Yangi npm paket o'rnatishdan oldin (xlsx yangilash va h.k.) — Karis dan ruxsat.
5. `GroupDetail.jsx` da attendance/homework ga **faqat o'qish** — yozish mentor'da.
6. Commitlar inglizcha, prefix bilan. PR -> `save-zone`, merge ni Karis qiladi.

---

## 📞 Yordam

- **Abduloh** (admin lead): o'z vazifalari + Odil PR review.
- **Karis** (Team Lead): backend muammolari, root fayllar, merge `save-zone -> main`.
- **API hujjatlari:** `swagger/admin.md`, `swagger/admin-payments.md`, `swagger/admin-reports.md`, `swagger/discipline.md`.
- **Dizayn:** `docs/FRONTEND-DESIGN-SYSTEM.md` (lime #C6FF34, Manrope, qorong'i sidebar #1D2417).
- **Admin tuzilma:** `frontend/staff/src/pages/admin/README.md`.

---

## 🚦 Bajarish tartibi (sahifalar bo'yicha — Karis "sahifalardan boshla")

1. **Expenses.jsx** — PDF kirill + eksport limit + xlsx + ranglar (eng ko'p xato, Karis ko'rsatdi).
2. **Students.jsx** — aktiv badge + telefon format + KPI dublikat.
3. **GroupDetail.jsx** — real API (attendance/homework/feedback).
4. **Reports.jsx** — ranglar (Odil).
5. **Groups.jsx** — guruh formasi (Odil).
6. Yangi sahifalar: **Announcements**, **Charter**.
7. Cross-cutting: telefon helper, eksport limit, inline style cleanup, 3 holat.

*Oxirgi yangilanish: 2026-07-27 (Abduloh tomonidan tuzilgan, save-zone da).*
