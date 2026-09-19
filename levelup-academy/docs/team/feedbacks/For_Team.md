# 👥 LevelUp Academy — Admin Frontend Team Guide

## 📋 Loyiha haqida

**LevelUp Academy EduCRM** — bu o'quv markazi uchun admin panel. Hozircha **frontend demo** bosqichida, backend KEYINROQ ulanadi.

**Stack:**
- React 19 + Vite 8 + Tailwind CSS v4
- `react-router-dom` v7 (routing)
- `react-icons/hi2` (Heroicons v2 — iconkalar)
- `recharts` (chartlar)
- `axios` (backend kelganda)

**Muhim qoidalar:**
- ❌ Zustand/TanStack Query kerak emas — faqat `useState`
- ❌ Backend YO'Q — hamma ma'lumot JS massivda (dummy data)
- ❌ TypeScript YO'Q — hammasi `.jsx`
- ✅ Har bir sahifa alohida branchda: `feat/reports`, `feat/chat`, `feat/settings`
- ✅ PR yozganda Abdulloh review qiladi

---

## 📂 Papka tuzilishi

```
admin_page/src/
├── main.jsx          # Router (11 ta route) — tayyor
├── App.jsx           # Outlet + Toast — tayyor
├── index.css         # Global stillar — tayyor
├── constants.js      # NAV_TITLES — tayyor
├── context/
│   ├── AuthContext.jsx   # Login/logout mock — tayyor
│   └── ThemeContext.jsx  # Dark/light mode — tayyor
├── components/
│   ├── Sidebar.jsx   # 8 nav item, NavLink — tayyor
│   ├── Layout.jsx    # Dynamic title/subtitle — tayyor
│   ├── Header.jsx    # — tayyor
│   ├── Button.jsx    # Ripple effect, variantlar — tayyor
│   ├── Modal.jsx     # Overlay, ESC close — tayyor
│   ├── Input.jsx     # label, error, select — tayyor
│   ├── Badge.jsx     # Status badge (active/paid/frozen...) — tayyor
│   ├── StatCard.jsx  # Value, delta, icon — tayyor
│   ├── Toast.jsx     # Success/error/warning — tayyor
│   ├── EmptyState.jsx# Empty placeholder — tayyor
│   ├── ErrorState.jsx# Error placeholder — tayyor
│   ├── Skeleton.jsx  # Loading skeleton — tayyor
│   └── ... 
├── pages/
│   ├── Dashboard.jsx   # ✅ To'liq tayyor
│   ├── Students.jsx    # ✅ To'liq tayyor
│   ├── Groups.jsx      # ✅ To'liq tayyor
│   ├── GroupDetail.jsx # ✅ To'liq tayyor
│   ├── Payments.jsx    # ✅ To'liq tayyor
│   ├── Expenses.jsx    # ✅ To'liq tayyor
│   ├── Mentors.jsx     # ✅ To'liq tayyor
│   ├── NotFound.jsx    # ✅ To'liq tayyor
│   ├── Reports.jsx     # 🟡 SHELL — Odil to'ldiradi
│   ├── Chat.jsx        # 🟡 SHELL — Hamidula to'ldiradi
│   └── Settings.jsx    # 🟡 SHELL — Abduloh to'ldiradi
└── services/
    └── adminService.js # API endpointlar (kelajakda)
```

---

## 🎯 Kim nima qiladi?

### 👑 Abduloh — Teamlead / Mid-Level

| Status | Vazifa | Nima qilish |
|--------|--------|-------------|
| ✅ | Routing (main.jsx) | 11 ta route, createBrowserRouter |
| ✅ | Groups.jsx | Card grid, filter, CRUD modal |
| ✅ | GroupDetail.jsx | Students table, attendance toggle |
| ✅ | NotFound.jsx | 404 sahifa |
| 🔄 | **Dashboard.jsx — yaxshilash** | Chartlarni Grade Distribution ga moslash, Loading/Error state |
| 🆕 | **Settings.jsx — to'ldirish** | 6 ta tab (General, Appearance, Notifications, Security, Finance, Localization) |
| 🔄 | Code Review | Odil va Hamidula PRlarini review qilish |

**Settings.jsx** uchun ko'rsatma:
- Fayl: `src/pages/Settings.jsx`
- Holati: Tablar tayyor, har bir tab uchun content yozilishi kerak
- Kerakli komponentlar: `Button`, `Input`
- Tablar: General (academy info form), Appearance (theme selector), Notifications (toggle switches), Security (2FA, password change), Finance (currency, payment provider), Localization (language, date format)

---

### 🟢 Odiljon — Strong Junior

| Status | Vazifa | Nima qilish |
|--------|--------|-------------|
| ✅ | Students.jsx | Table, filter, search, pagination, CRUD modal |
| ✅ | Payments.jsx | Dual panel (list + invoice detail), CRUD modal |
| 🔄 | **Reports.jsx — to'ldirish** | Charts + stat cards + table |

**Reports.jsx** uchun ko'rsatma:
- Fayl: `src/pages/Reports.jsx`
- Holati: **Shell** — period filter tugmalari tayyor, qolgani bo'sh
- Siz yozishingiz kerak:
  1. **4 ta StatCard** — Total Revenue, Total Expenses, Net Profit, Active Students
  2. **Revenue vs Expenses BarChart** — 7 oylik data (har oy: revenue, expenses)
  3. **Student Growth AreaChart** — Enrolled vs Dropped dinamikasi
  4. **Group Performance table** — group name, students count, avg grade, revenue, progress bar

**Namuna kod** (Dashboard.jsx dagi pattern):
```jsx
import StatCard from '../components/StatCard.jsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// StatCard ishlatish:
<StatCard title="Total Revenue" value={formatCurrency(totalRevenue)} delta={12.5} icon={...} color="#2ECC71" />

// Chart ishlatish:
<ResponsiveContainer width="100%" height={260}>
  <BarChart data={yourData}>
    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
    <Tooltip content={<CustomTooltip />} />
    <Bar dataKey="revenue" fill="#2ECC71" radius={[4,4,0,0]} barSize={16} />
  </BarChart>
</ResponsiveContainer>
```

**Dummy data namuna:**
```js
const mockRevenue = [
  { month: 'Jan', revenue: 24000000, expenses: 12000000, students: 45 },
  { month: 'Feb', revenue: 28000000, expenses: 13500000, students: 52 },
  // ... 7-12 oy
];
```

**Import qilishni unutmang:**
```jsx
import { useState } from 'react';
import { HiOutlineArrowTrendingUp, HiOutlineDocumentText, HiOutlineUserGroup, HiOutlineBanknotes } from 'react-icons/hi2';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import StatCard from '../components/StatCard.jsx';
```

---

### 🟡 Hamidulla — Junior+

| Status | Vazifa | Nima qilish |
|--------|--------|-------------|
| ✅ | Expenses.jsx | Stat cards, table, filter, CRUD modal, bar chart |
| 🔄 | **Chat.jsx — to'ldirish** | Contacts list + chat window + send message |

**Chat.jsx** uchun ko'rsatma:
- Fayl: `src/pages/Chat.jsx`
- Holati: **Shell** — ikki panelli layout tayyor (chap: 272px, o'ng: flex-1), search input bor, qolgani bo'sh
- Siz yozishingiz kerak:

**1. Chap panel (contacts list):**
```jsx
const [contacts] = useState([
  { id: 1, name: 'Aziz Karimov', role: 'Mentor', avatar: 'AK', online: true, lastMsg: 'Guruh tayyor', time: '12:30', unread: 2 },
  { id: 2, name: 'Malika Rahimova', role: 'Student', avatar: 'MR', online: false, lastMsg: 'Rahmat', time: '11:45', unread: 0 },
  { id: 3, name: 'Jasur Toshmatov', role: 'Mentor', avatar: 'JT', online: true, lastMsg: 'Materiallar kerak', time: '09:20', unread: 1 },
  { id: 4, name: 'Sevara Azizova', role: 'Student', avatar: 'SA', online: false, lastMsg: 'Qachon dars?', time: 'Kecha', unread: 0 },
  { id: 5, name: 'Rustam Yuldashev', role: 'Mentor', avatar: 'RY', online: true, lastMsg: 'To\'lov keldi', time: '08:15', unread: 3 },
]);
```

**2. Messages (har bir chat uchun):**
```jsx
const [messages, setMessages] = useState({
  1: [
    { id: 1, from: 'them', text: 'Salom! Guruh tayyor', time: '12:25' },
    { id: 2, from: 'me', text: 'Yaxshi, boshlang', time: '12:27' },
  ],
  2: [
    { id: 1, from: 'them', text: 'Rahmat!', time: '11:45' },
  ],
  // ...
});
```

**3. Send funksiyasi:**
```jsx
const [input, setInput] = useState('');
const handleSend = () => {
  if (!input.trim()) return;
  const newMsg = { id: Date.now(), from: 'me', text: input.trim(), time: 'hozir' };
  setMessages({ ...messages, [activeChat]: [...(messages[activeChat]||[]), newMsg] });
  setInput('');
};
```

**4. UI elementi tuzilishi:**
- Har bir contact → `button` (bosilganda `setActiveChat(contact.id)`)
- Active contact → chapda `border-left: 3px solid var(--green)`
- Avatar → `w-10 h-10 rounded-[12px] bg-[var(--green)]` (initiallar)
- Online → `w-3 h-3 bg-[#2ECC71] rounded-full` (absolute bottom-right)
- Xabar (them) → chapda, `bg-[var(--surface)] rounded-[16px] rounded-bl-[4px]`
- Xabar (me) → o'ngda, `bg-[var(--green)] text-[#141B10] rounded-[16px] rounded-br-[4px]`
- Send tugma → `button` + `HiOutlinePaperAirplane` icon

**5. Enter bilan jo'natish:**
```jsx
const handleKeyDown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};
// Inputga: onKeyDown={handleKeyDown}
```

**Import qilishni unutmang:**
```jsx
import { useState, useRef, useEffect } from 'react';
import { HiOutlineMagnifyingGlass, HiOutlinePaperAirplane, HiOutlinePhone, HiOutlineVideoCamera, HiOutlineCheckCircle } from 'react-icons/hi2';
```

---

## 🚀 Qanday ishlash kerak (qadam-baqadam)

### 1. Oxirgi versiyani olish
```bash
git checkout rey
git pull origin rey
```

### 2. O'z branchingni yaratish
```bash
# Odil:
git checkout -b feat/reports

# Hamidula:
git checkout -b feat/chat

# Abduloh:
git checkout -b feat/settings
```

### 3. Sahifani to'ldirish
- `src/pages/YourPage.jsx` faylini oching
- U yerda **TODO** commentlari bor — shularni to'ldiring
- Dummy data yarating (JS massiv)
- useState bilan boshqaring
- Tayyor komponentlardan foydalaning (Button, Modal, Input, Badge, StatCard)

### 4. Build test
```bash
npm run build
```
Hech qanday xatolik bo'lmasligi kerak!

### 5. PR yaratish
```bash
git add .
git commit -m "feat: add Reports page with charts and stat cards"
git push origin feat/reports
```
Keyin GitHubda PR yarating va Abdullohni tag qiling.

---

## 📖 Foydali havolalar

| Nima | Qayerda |
|------|---------|
| Dashboard misol | `src/pages/Dashboard.jsx` — chart va stat card namunalari |
| Students misol | `src/pages/Students.jsx` — table, filter, modal namunalari |
| Expenses misol | `src/pages/Expenses.jsx` — chart, filter, delete namunalari |
| Shared komponentlar | `src/components/` papkasida |
| Iconkalar ro'yxati | https://react-icons.github.io/react-icons/icons/hi2/ |
| Router | `src/main.jsx` — barcha routelar |

---

## ⚠️ Muhim!

- **Boshqa sahifalarga tegib ketmang!** Faqat o'zingizning sahifangizni o'zgartiring
- **Faqat useState** ishlating (zustand, redux, tanstack query YO'Q)
- **Faqat .jsx** (TypeScript YO'Q)
- **Importlarni** to'g'ri qiling — `react-icons/hi2` dan, `../components/` dan
- **Pull request** qilgandan keyin Abdullohga habar bering
- **Tiqilib qolsangiz:** avval Google, keyin Abdullohdan so'rang

---

## 📊 Sahifalar holati (jami 11 ta)

| # | Sahifa | Holati | Kimga |
|---|--------|--------|-------|
| 1 | Dashboard | ✅ To'liq tayyor | Abduloh (refine) |
| 2 | Students | ✅ To'liq tayyor | Odil |
| 3 | Groups | ✅ To'liq tayyor | Abduloh |
| 4 | GroupDetail | ✅ To'liq tayyor | Abduloh |
| 5 | Payments | ✅ To'liq tayyor | Odil |
| 6 | Expenses | ✅ To'liq tayyor | Hamidula |
| 7 | Mentors | ✅ To'liq tayyor | (tayyor) |
| 8 | Reports | 🟡 Shell — to'ldirish kerak | **Odil** |
| 9 | Chat | 🟡 Shell — to'ldirish kerak | **Hamidula** |
| 10 | Settings | 🟡 Shell — to'ldirish kerak | **Abduloh** |
| 11 | NotFound | ✅ To'liq tayyor | Abduloh |

---

## 🎨 Dizayn qoidalari

- **Fon rangi:** `#F6FBEA`
- **Sidebar (light):** `#F1F7E4`
- **Sidebar (dark):** `#0A0E0A`
- **Accent (lime):** `#C6FF34`
- **Tugmalar:** `bg-[var(--green)] text-[#141B10]` (lime)
- **Kartalar:** `glass-strong` + `rounded-[20px]` + `card-hover-premium`
- **Statuslar:**
  - Active/Paid: `#2ECC71`
  - Pending/Frozen: `#F59E0B`
  - Overdue/Debtor: `#E8543E`
- **Iconkalar:** `react-icons/hi2` dan (Heroicons v2 outline)
- **Chart ranglari:** Revenue=`#2ECC71`, Expenses=`#E8543E`, Growth=`#3B82F6`
