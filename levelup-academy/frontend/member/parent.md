# PARENT Panel — Task List (Kama, git: iface9808)

> ⚠️ **Bu fayl — DUBLIKAT, holat manbai EMAS (2026-07-26).**
> Parent panelining rasmiy vazifalari va holati — korneviy `TASK.md`,
> `## Frontend — Parent` bo'limida. Ikki joyda ikki xil galochka turmasin.
> Bu yerda faqat Kama'ning ichki eslatmalari qoladi.

> Backend tayyor: `AB-PARENT` ✅ (child overview + assertParentOwnsChild guard)
> Panel: `frontend/member` — parent tomoni

---

## ✅ Tugallangan (karkas bazasi)

- [x] Auth: login/member endpoint (login-code + parol)
- [x] AuthProvider + useAuth hook
- [x] ChildProvider + useChild hook (bir nechta farzand support)
- [x] Layout: sidebar + topbar + Outlet
- [x] Routing: /dashboard, /attendance, /grades, /debt, /chat, /notifications, /profile
- [x] ProtectedRoute + HomeRedirect (student → student SPA)
- [x] Mock data + API layer (api.js)
- [x] Socket.io client + mock
- [x] UI kit: EmptyState, ErrorState, ProgressRing, ProgressBar, StatCard
- [x] Skeleton loader components
- [x] ErrorBoundary
- [x] Avatar (generative by name)
- [x] PageHeader
- [x] Icons (SVG, 50+ icon)

---

## ✅ YANGILANGAN TASKLAR (9/9 TUGADI)

### TASK 1: PARENT: Child overview ✅

- [x] Hero card — gradient background, child name + attendance ring + groups count
- [x] KPI cards — coins, debt, ranking, attendance
- [x] Attendance widget — ring + 4 status bar breakdown
- [x] Groups list — mentor name, subject badge, hover effects
- [x] Recent lessons — timeline style, status pills
- [x] Recent grades table — score bar, type badge, time ago
- [x] Responsive: 1280 → 2 col, 768 → stacked, 375 → mobile

### TASK 2: PARENT: Child switcher ✅

- [x] Sidebar: custom dropdown — avatar thumbnails, lime ring, chevron animation
- [x] Sidebar: single child — avatar + name + "Ребёнок" badge
- [x] Profile page: child cards — active state, coins, debt, "Выбран" badge
- [x] localStorage persistence — tanlangan child saqlanadi
- [x] EmptyState: child yo'q bo'lsa

### TASK 3: PARENT: Davomat detali ✅

- [x] Summary ring — katta, animation bilan
- [x] 4 ta filter button — present/absent/late/excused (rangli, active state)
- [x] History table — date, group name, status pill, comment
- [x] Filter logic — status bo'yicha filterlash
- [x] EmptyState — "Данных пока нет"
- [x] Responsive: mobile → stacked cards instead of table

### TASK 4: PARENT: Baholar ✅

- [x] Tabs: ДЗ / Тесты (icon + label + count badge)
- [x] Stats row: total, avg (color-coded), best score
- [x] Grade list: icon + title + progress bar + score + date
- [x] Progress bar: color by percentage (green/yellow/red)
- [x] EmptyState per tab
- [x] Responsive: stacked on mobile

### TASK 5: PARENT: To'lov / qarz ✅

- [x] Debt card — amount + color (red if debt, green if clear)
- [x] Coins card — balance + earned label
- [x] Progress bar — paid vs pending
- [x] Warning state — pulsing dot + "Требуется внимание"
- [x] Clear state — checkmark + "Задолженностей нет"
- [x] Responsive: 2-col → stacked

### TASK 6: PARENT: Chat ✅

- [x] Room tabs: global / direct (icon + label)
- [x] Online indicator — green dot + "Онлайн"
- [x] Message list — avatars, role badges, timestamps
- [x] Message bubbles — sent (lime) vs received (grey), rounded
- [x] Input + send button (global only, direct = read-only)
- [x] Auto-scroll to bottom
- [x] Empty state per room
- [x] Responsive: full height on mobile

### TASK 7: PARENT: Bildirishnomalar ✅

- [x] Filter tabs: all / grades / attendance / payment (with counts)
- [x] Notification cards: icon + title + body + time ago
- [x] Unread indicator: lime dot + ring highlight
- [x] Empty state: "Нет уведомлений"
- [x] Responsive: stacked on mobile

### TASK 8: PARENT: Design-system ✅

- [x] Har bir sahifada 3 holat: Skeleton (loading), EmptyState (no data), Error (retry)
- [x] Responsive: 1280px (2-col), 768px (stacked), 375px (mobile)
- [x] TanStack Query cache invalidation after mutations
- [x] Hover effects: cards `hover:-translate-y-0.5`, table rows `hover:bg-base-200/50`
- [x] Shadows: `0 10px 28px rgba(29,36,23,.14), 0 2px 6px rgba(29,36,23,.08)`
- [x] Font: Manrope (variable) — already loaded
- [x] Colors: lime #C6FF34, sidebar #1D2417, bg #F6FBEA, surface #FFFFFF
- [x] Border radius: 1rem (cards), 0.6rem (buttons), 0.75rem (inputs)
- [x] CSS animations: fadeIn, slideUp, scaleIn, fadeInDown
- [x] Mobile touch feedback

### TASK 9: PARENT: Guruh reytingi ✅

- [x] Dashboard'dagi guruh kartasi → click → reyting ko'rinishi
- [x] Guruh ma'lumotlari — nomi, mentor, o'quvchilar soni
- [x] Reyting jadvali — rank, avatar, ism, koinlar, o'rtacha ball
- [x] Top-3: medal/trophy ranglar, qolganlar raqam bilan
- [x] O'z bolasi highlight — `(вы)` belgisi + primary ring
- [x] Backend API: `GET /parent/children/:childId/group-rating` (+ mock)
- [x] Loading skeleton + EmptyState
- [x] Responsive

---

## ICON UPGRADE (emoji → SVG) ✅

Barcha iconalar SVG formatida — `Icons.jsx` da 50+ icon mavjud.

---

## Build status

✅ `vite build` — muvaffaqiyatli (3.38s, 339KB JS, 78KB CSS)
