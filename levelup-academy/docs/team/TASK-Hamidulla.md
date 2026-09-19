# 🟡 Hamidulla — Topshiriq: Mentor + Chat + Payments

> **Developer:** Hamidulla (@sunnatillaev1) — Junior+
> **Branch:** `hamidullar` (yoki sizga berilgan branch)
> **Asos:** `Abduloh` branchidan oling
> **Vazifa:** Mentor panellari + Admin Chat + Admin Payments ni yakunlash

---

## 📋 Umumiy ko'rsatmalar

### Ishga tushirish
```bash
git checkout -b hamidullar Abduloh
cd frontend/staff
npm install
npm run dev
```

### Uslub (Styling)
- **style.md** ni o'qing — `frontend/staff/src/pages/admin/style.md`
- CSS variables: `var(--bg)`, `var(--surface)`, `var(--text)`, `var(--green)` va h.k.
- Barcha kartalar: `glass-strong rounded-[20px] p-5 card-hover-premium`
- Animatsiyalar: `animate-fade-in`, `animate-slide-up`, `stagger-*`
- **Tailwind v4** — utility-class lar orqali styling
- **react-icons/hi2** — HeroIcons v2
- **lucide-react** — hozirgi loyihada ishlatilgan

### API ulanish
- API chaqiruvlari `frontend/staff/src/api.js` orqali
- Query hooks: `frontend/staff/src/queries.js`
- `useAuth()` dan token olinadi
- Backend URL: `https://api.levelup-academy.uz`

### Git
- Commitlar **English** da yoziladi
- `feat:`, `fix:`, `refactor:`, `style:` prefixlari bilan
- PR `Abduloh` ga yuboriladi

---

## 📄 1. Mentor Pages (`frontend/staff/src/pages/mentor/`)

### 1.1 Mentor Dashboard (`Dashboard.jsx` — 260 qator)
**Holati:** ✅ Asosan tayyor
- KPI cards bilan (students, today's lessons, attendance rate)
- `useMentorGroups` va `useMentorAttendance` hooklari bilan
- `getDaySlot()` funksiyasi orqali bugungi darslarni ko'rsatadi

**Nima qilish kerak:**
1. Backend API to'liq ulanganligini tekshirish
2. Agar mock data bo'lsa, `useQuery` hooklariga o'tkazish
3. Styleni `style.md` ga moslab tekshirish (CSS variables, glass-strong, hover)
4. Empty state va loading skeleton qo'shilganmi tekshirish
5. `npm run build` da xato bermasligini tekshirish

### 1.2 Mentor Chat (`Chat.jsx` — 666 qator)
**Holati:** ✅ To'liq — Socket.io bilan real-time
- Direct messaging (`dm:<staffId>:<parentId>`)
- Socket.io orqali real-time (`chat:dm:send`, `chat:dm:message`)
- Avatar, SearchInput, EmptyState shared komponentlar
- `GROUP_WINDOW_MS` — ketma-ket xabarlar guruhlash
- Emoji picker

**Nima qilish kerak:**
1. Socket.io ulanishi ishlayotganini tekshirish
2. Offline holatda `WifiOff` icon ko'rsatish
3. Xabar uzunligi cheklovi (MAX_LEN = 4000)
4. Scroll pastga avtomatik
5. `build` da xato yo'qligini tekshirish

### 1.3 Mentor Groups (`Groups.jsx` — 41 qator)
**Holati:** ✅ Redirect (shell)
- `/groups` ga kirganda birinchi guruhga redirect qiladi
- `useMentorGroups()` dan data oladi
- Empty state: "Sizda hali guruhlar yo'q"

**Nima qilish kerak:**
1. Redirect ishlayotganini tekshirish
2. `search` params ni saqlab qolish (`?tab=testlar` kelganda)
3. Loading skeleton borligini tekshirish

### 1.4 Mentor Profile (`Profile.jsx` — 488 qator)
**Holati:** ✅ Asosan tayyor
- `useMe()` — shaxsiy ma'lumotlar
- `useMentorGroups()` — guruhlar ro'yxati
- InfoRow, Grade komponentlari
- Parolni tiklash — email orqali

**Nima qilish kerak:**
1. PATCH `/api/users/me` endpoint orqali ism/familiya/email tahrirlash
2. `build` da xato yo'qligini tekshirish
3. `_ui.jsx` dan Avatar komponenti import qilingan

### 1.5 Mentor Students (`Students.jsx` — 367 qator)
**Holati:** ✅ Asosan tayyor
- Barcha guruhlardagi studentlar (useQueries orqali parallel)
- Context menu (o'ng tugma / double click)
- `RowMenu` komponenti — position x, y bo'yicha
- SearchInput, EmptyState shared komponentlar
- Avatar komponenti

**Nima qilish kerak:**
1. `useQueries` parallel fetch ishlayotganini tekshirish
2. Context menu chetga chiqib ketmasligi (position fixing)
3. Navigatsiya: student detail, chat
4. `build` da xato yo'qligini tekshirish

### 1.6 Mentor StudentDetail (`StudentDetail.jsx` — 697 qator)
**Holati:** ✅ Asosan tayyor
- Chart.js bilan grafiklar (attendance, homework, tests, grade)
- `Ring` komponenti — aylana indikator
- 4 ta section: Overview, Attendance, Homework, Tests
- `useMentorStudentStats()` hook

**Nima qilish kerak:**
1. Backenddan `studentStats` kelganda to'g'ri ko'rsatish
2. Chart.js registratsiyasi (`ChartJS.register`)
3. `build` da xato yo'qligini tekshirish

---

## 📄 2. Admin Chat (`frontend/staff/src/pages/admin/Chat.jsx` — 1275 qator)

**Holati:** ✅ To'liq (mock data bilan)
- Telegram-style ikki panel: contacts (chap) + chat (o'ng)
- Emoji picker (`EMOJIS` array)
- Reaksiyalar (❤️ 👍 😄)
- Online/offline status
- Search (contact + message)
- File upload (`Paperclip`)
- Auto scroll to bottom

**Nima qilish kerak:**
1. **Backend REST endpoint kelganda** mock `initialContacts` va `initialMessages` ni o'zgartirish
2. Socket.io ulanishi (admin uchun real-time)
3. `TODO` commentlarini bajarish (qator 27, 60, 92 va h.k.)
4. Responsive design — mobile da contact list va chat alohida
5. `npm run build` da xato yo'qligini tekshirish

---

## 📄 3. Admin Payments (`frontend/staff/src/pages/admin/Payments.jsx` — 768 qator)

**Holati:** ✅ To'liq — backend bilan ishlaydi
- Invoice card view
- Split payment (naqt + karta birgalikda)
- Stat cards (total revenue, paid, waiting, overdue)
- Ad-hoc payment modal
- Invoice detail modal
- Receipt upload (presigned URL)
- Refund/void transaction
- Pagination
- Status filter tabs

**Nima qilish kerak:**
1. Backend API to'liq ulanganligini tekshirish (`useAdminInvoices`, `useAdminStudents`)
2. `txStore` ref orqali transaction caching ishlayaptimi
3. Receipt upload flow
4. `npm run build` da xato yo'qligini tekshirish

---

## ✅ Bajarilgan mezonlari

| # | Tekshirish | 
|---|-----------|
| 1 | `npm run build` — **0 errors** |
| 2 | Barcha sahifalar `style.md` ga mos |
| 3 | CSS variables ishlatilgan (hardcoded hex emas) |
| 4 | Dark/light mode to'g'ri ishlaydi |
| 5 | Loading skeleton bor |
| 6 | Empty state bor |
| 7 | Animatsiyalar (`animate-fade-in`, `stagger-*`) |
| 8 | Backend API ulangan (mock data emas) |
| 9 | Commitlar English, prefix bilan |

---

## ⛔ MUHIM: Cheklovlar

1. **Backend fayllarga tegilmang!** (`backend/` papkasiga)
2. **Root fayllarga tegilmang!** (README.md, CLAUDE.md, package.json va h.k.)
3. **Boshqa developer sahifalariga tegilmang!** (Odil/Xob ning Expenses, Reports, Settings)
4. `admin/routes.jsx` va routing fayllariga o'zgartirish kiritish kerak bo'lsa — Karis/Team Lead ga habar bering

---

## 📞 Yordam

- **Abdulloh (Team Lead):** @sunnatillaev1 (Telegram) yoki code review uchun
- **Karis:** Backend muammolari uchun
- **Style guide:** `frontend/staff/src/pages/admin/style.md`
- **API docs:** `frontend/staff/src/api.js`
- **Queries:** `frontend/staff/src/queries.js`

## 🎯 Yakuniy eslatma

Eng muhimi — **build xatosiz o'tishi**. Har bir sahifani tugatgandan keyin:
```bash
npm run build
```
Agar xato bo'lsa, tuzating va keyin keyingi sahifaga o'ting.
