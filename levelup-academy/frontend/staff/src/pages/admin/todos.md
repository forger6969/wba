# Admin Panel — TODOS (Abduloh)

> Status: ⬜ qilinmagan | 🔄 jarayonda | ✅ tayyor
> Sana: 2026-08-01
> Yangilangan: 2026-08-11

## 1. Students — «Задолжен» filtri
- ✅ «Задолжен» tugmasi hozir **tasdiqlash so'rayapti** (confirm dialog) — bu noto'g'ri. → Kodda confirm dialog **yo'q** (Students.jsx:214-233 — oddiy tab filter, `setStatusFilter('debt')`), olib tashlash kerak emas.
- ✅ Qarz har oy o'zgaradi, hamma qarzdor o'quvchilar **avtomatik** ko'rinishi kerak — dialogni olib tashlash. → Qarzdorlar live filter: `filteredRows` → `studentDebt(s) > 0` (Students.jsx:128).
- ✅ Qarzdor list avtomatik yangilanib turishi kerak (har oy). → **«Задолжен» tab faol paytda `refetchInterval: 60_000`** — ro'yxat har daqiqada avtomatik yangilanadi (queries.js `useAdminStudents(qs, opts)` + Students.jsx:99-104).

## 2. Export — to'liq style fix
- ✅ ExportDialog / exportUtils style-ni to'liq o'rganish.
- ✅ Export dizaynini yaxshilash (design system: --primary #40833B, glass-bg, rounded-14, hover shadow).
- ✅ **MD + CSV export olib tashlandi** (faqat Excel/PDF qoldi) — ExportDialog FORMAT_OPTIONS 2 ta, exportUtils'dan exportToMarkdown/exportToCSV o'chirildi.

## 3. Dashboard — «New Group» tugmasi
- ✅ Dashboard'ga **«New Group»** tugmasi qo'shildi (PageHeader da, Plus icon).
- ✅ Bosilganda → `/groups` sahifasiga `state: { openCreate: true }` bilan o'tadi, Groups.jsx location.state ni o'qib modalni avtomatik ochadi (refresh da qayta ochilmaydi).

## 4. Add Group modalka — yangilash (katta ish)
- ✅ **1-qadam:** Avval **mentor tanlanadi** (backenda bor mentorlar ro'yxati).
- ✅ Tanlangan mentorni **vaqt jadvaliga** qarab **bo'sh vaqtlar** ko'rsatiladi (algoritm: 08:00–20:00, 30-min qadam, mentor guruhlari schedule'dan occupied map; kunlar kesishmasi bo'yicha free-slot chips; band kunlar qizil nuqta bilan).
- ✅ Kunlar tanlangach — **avtomatik tugash sanasi** hisoblanadi (modul 1/3/6 oy select, birinchi dars sanasi + N oy, preview).
- ✅ Guruhga **yangi o'quvchi** qo'shish (accordion: ism/familiya/telefon) → guruh yaratilgach `adminCreateStudent(groupId)` — login-kod + parol paneli, copy tugmalari.
- ✅ Backend kontraktlar tekshirildi: `POST /admin/groups` (days+startTime), `GET /admin/groups/:id` (schedule), `POST /admin/students` (groupId qabul qiladi).

## 5. Davomat (GroupDetail Attendance)
- ✅ **Muzlatilgan (frozen) o'quvchilar** davomatda **belgilanishi mumkin emas** — `GroupDetail.jsx` AttendanceTab: `frozenIds` Set, `toggleDay` guard, hujayralar `disabled` + `cursor-not-allowed` + opacity-60, ism yonida «Заморожен» badge (qizil).
- ✅ «Не отмечен» (not marked) variantini olib tashlash — legendadan «Не отмечен» elementi o'chirildi (faqat Пришёл/Опоздал/Не пришёл + Исправлено админом qoldi).

## 6. Mentors — edit
- ✅ Edit modal'da **level (GradePicker) kartada qoldi** — modal ichida level yo'q (user qarori, 2026-08-01).
- ✅ Edit modal'da **email + parol** maydonlari paydo bo'ldi: email oldindan to'ldirilgan, parol bo'sh (faqat o'zgartirilganda). **PATCH body**ga ham yuboriladi.
- ✅ **Backend gap (Karis kutilmoqda):** `updateMentorSchema` (admin.schemas.js:99) faqat firstName/lastName/phone/grade qabul qiladi — email/parolni zod tashlab yuboradi. Frontend **saved emailni PATCH javobidan tekshiradi**; o'zgarmagan bo'lsa — «Email/parol saqlanmadi — backend updateMentorSchema hali qabul qilmaydi» degan sariq ogohlantirish ko'rsatadi (modal ichida). Karis schema'ga `email` + `password` qo'shishi kerak.

## 7. Discipline — bug fix + yangi qoidalar
- ✅ Ranglar bug'i: qora bosganda yashil bo'lyapti — **hover'da yashil** bo'lishi kerak. → IssueModal tip tugmalari endi **daraja rangi bilan to'ldiriladi** (hover'da ham, tanlanganda ham): sariq `#eab308` (qora matn), qizil `#dc2626`, qora `#111827` — xuddi Super Admin panelidagi yangi dizayndek (discipline-meta.jsx TYPE_META, eski `btn-primary`/join o'chirildi). Yashil (primary) faqat umumiy aksent sifatida qoldi (sahifa tugmalari).
- ✅ Backendda bor **yangi qoida qo'shish** funksiyasi — modalka. → RulesPanel'ga «Новое правило» tugmasi + **NewRuleModal** qo'shildi, `api.adminCreateDisciplineRule` → `POST /admin/discipline-rules`. **Backend gap (Karis kutilmoqda):** bu marshrut admin.routes.js'da yo'q (faqat `/admin/penalties`) — qoida yaratish hozircha faqat Super Admin'da (`/super/discipline-rules`). 404 bo'lsa modal ichida **sariq ogohlantirish** ko'rsatiladi (Task 6'deki usul). Karis admin.routes.js'ga `GET/POST /admin/discipline-rules` qo'shishi kerak (super.routes.js:1190-1191 dagi pattern, `createRuleSchema`).
- ✅ Modalka uchun **yangi dizayn / yangi style**. → Daraja rangli kartochkalar grid (hover'da to'ldirish, `dark` matn), LevelBadge — hamma joyda shared discipline-meta.jsx (mahalliy oklch TYPE_META dublikati o'chirildi).
- ✅ Qoida va boshqalar **hamma mentorlarga** tegishli bo'lishi — bitta mentorni so'ramasligi. → Backend `createRuleSchema` (type/amount/description) organizatsiya darajasida — mentorni so'ramaydi; RulesPanel org bo'yicha HAMMA qoidalarni ko'rsatadi. Modalda ham eslatma qo'shildi: «Правило применяется ко всем сотрудникам организации».
- ✅ Admin'da qoidalar ro'yxati **sokin 403** edi (IssueModal `superDisciplineRules` → `GET /super/discipline-rules`, super.routes.js:31 `authorize('superadmin')`) — qoidalar yuklanmasa seçktor shunchaki yo'q bo'lib ko'rinardi. → `rulesError` holati: ro'yxat yuklanmasa sariq ogohlantirish «заполните процент вручную» (xuddi Task 6/7 usuli). **Backend gap (Karis kutilmoqda):** `GET /admin/discipline-rules` ham admin.routes.js'da yo'q — qoidalar katalogini hozircha faqat Super Admin ko'radi; Karis `GET/POST /admin/discipline-rules` qo'shishi bilan ikkala joy ham ishlaydi.

## 8. Payments
- ✅ **«Просрочено» (overdue)** tugmasini/tag'ini olib tashlash → STATUS/STATUS_LIST/STATUS_LABELS dan olib tashlandi + «Просрочено» KPI o'chirildi (stats.overdue ham).
- ✅ **«Отменён» (cancelled)** bo'lishini ham yo'qotish → STATUS'dan o'chirildi. (Eski overdue/cancelled invoice'lar `pending` fallback'ga tushadi — UI da ko'rinmaydi.)

## 9. Expenses — tozalash
- ✅ KPI kartalarni olib tashlash: «Все расходы», «В этом месяце», «Ожидает», «Одобрено», «Средний расход» → butun KPI blok + stats useMemo o'chirildi.
- ✅ Filterdan **«От» → «До» (date range)** olib tashlash → desktop + mobile date inputlari o'chirildi.
- ✅ **«Все статусы»** selection olib tashlash → status SelectFilter (desktop+mobile), STATUSES/STATUS_LABELS, getStatusCount o'chirildi.
- ✅ **«Сначала новые»** select olib tashlash → sort SelectFilter + SORT_OPTIONS o'chirildi, sort har doim eng yangi (spentAt desc).
- ✅ Add modalka ranglari juda ko'p — **design system ranglarini ishlatish** → kategoriya tugmalari endi `--primary` yashil (avval har kategoriyada har xil rang).
- ✅ **«Другое» (Other)** kategoriya → bosilganda **«Название расхода»** input paydo bo'ladi (majburiy) → `note`ga saqlanadi (backend schema'da title yo'q). Boshqa kategoriyalarda «Примечание» maydoni qoladi.
- ✅ To'lov usulida **«Перевод» (transfer) olib tashlash** — faqat naqd + karta (PAYMENT_METHODS = ['Наличные', 'Карта']). Eslatma: backend `createExpenseSchema` paymentMethod'ni qabul qilmaydi (zod tashlab yuboradi) — to'lov usuli `note` matnidan aniqlanadi.
- ✅ Modalkada **date field olib tashlash** → `spentAt` har doim bugungi sana (add/edit'da formData'da saqlanadi, UI'da ko'rinmaydi).
- ✅ **Bank olib tashlash** → PAYMENT_METHODS dan o'chirildi. Eski 'Перевод'/'Банк' yozuvlari note heuristics orqali eski ko'rinishda qolaveradi.

## 10. Reports — tozalash + ranglar
- ✅ Jadvalni olib tashlash: «Группа / Ученики / Доход / Долг / Соотношение» + «4 группы» + «Общий доход» + «Общий долг» → butun table blok (thead/tbody + footer) o'chirildi; KPI kartalar va grafiklar qoldi. `Banknote`, `Tip`, `maxRevenue`, `useAuth`/`token` (ishlatilmagan) ham olib tashlandi.
- ✅ Ranglar juda yomon — **design system ranglari ishlatildi** → COLORS endi `index.css` `:root` palitrasidan (--primary #40833B, --danger #dc2626, --warning #b45309, --info #2563eb, --success #15803d, text-secondary/muted); bar chart fill `var(--primary)` + `var(--danger)`.

## 11. Expenses — admindan olib tashlash
- ✅ `/expenses` route admindan olib tashlandi (App.jsx) — faqat branch_manager uchun qoldi.
- ✅ Admin sidebar'dan "Xarajatlar" havolasi o'chirildi.
- ✅ Branch Manager o'z Expenses.jsx fayliga ega (pages/branch-manager/Expenses.jsx).

## 12. Schedule — sidebar'dan olib tashlash, guruh ichiga qo'shish
- ✅ `/schedule` route kommentariyaga olingan (App.jsx:152).
- ✅ Admin sidebar'dan "Raspisaniye" havolasi o'chirildi.
- ✅ GroupDetail.jsx da yangi **"Расписание" tab** qo'shildi (ScheduleTab komponenti, line 977-1039).
- ✅ Guruhning haftalik raspisaniyasi read-only grid sifatida ko'rinadi.

## 13. Shop — olib tashlash
- ✅ `/shop` route kommentariyaga olingan (App.jsx:151).
- ✅ Admin sidebar'dan "Shop" havolasi o'chirildi.

## 14. Mentor level o'zgartirish — olib tashlash
- ✅ Mentors.jsx da grade/level o'zgartirish funksiyasi olib tashlandi (Karis, 11.08.2026).
- ✅ Grade endi **read-only badge** sifatida ko'rinadi (MentorCard komponentida).
- ✅ Edit modal'da grade picker yo'q — faqat ism, familiya, telefon o'zgartiriladi.
- ✅ API da `PATCH /users/me` grade ni ignore qiladi (backend ham qabul qilmaydi).

## 15. Chat — mentorlar bilan ishlash
- 🔄 Admin Chat.jsx — mentorlar bilan real-time chat sahifasi qurish.
- 🔄 Mentor Chat.jsx — boshqa mentorlar bilan chat sahifasi qurish.
- ⬜ Chat kontaktlar ro'yxatida **faqat mentorlar** ko'rinishi kerak (studentlar/ota-onalar emas).
- ⬜ Filialda bor **barcha mentorlar** chiqishi kerak.
- ⬜ Socket.io orqali real-time xabar almashish.

---

## Jarvis TODO (ichki)

> Bu bo'lim Jarvis (AI assistant) uchun — qolgan ishlar va eslatmalar.

### Bajarilgan
- [x] Loyiha tuzilishini o'rganish (CLAUDE.md, App.jsx, Layout.jsx)
- [x] Expenses: admindan olib tashlangan, branch_manager da bor — tekshirildi ✅
- [x] Schedule: sidebar'dan olib tashlangan, GroupDetail ichida tab — tekshirildi ✅
- [x] Shop: route kommentariya — tekshirildi ✅
- [x] Mentor level: read-only qilingan — tekshirildi ✅
- [x] Chat sahifalarini yaratish boshlandi

### Jarayonda
- [ ] Admin Chat.jsx — to'liq chat sahifasini yaratish (subagent ishlamoqda)
- [ ] Mentor Chat.jsx — to'liq chat sahifasini yaratish (subagent ishlamoqda)

### Keyingi qadamlar
- [ ] Chat sahifalarini test qilish (`npm run dev`)
- [ ] Socket.io integratsiyasini tekshirish
