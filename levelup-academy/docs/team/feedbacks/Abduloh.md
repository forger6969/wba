# 👑 Abdulloh — Teamlead / Mid-Level

## Umumiy ma'lumot
- **Roli:** Teamlead (admin frontend jamoasi leadi)
- **Level:** Mid-Level
- **Stack:** React 19 + Vite + Tailwind CSS v4 + react-icons/hi2 + recharts + react-router-dom v7

---

## 🎯 Vazifalar (Status)

### ✅ 1. Routing va App.jsx (TUGALLANDI)
- `main.jsx` → 11 ta route, createBrowserRouter
- `App.jsx` → Outlet + dynamic page titles + Toast
- Barcha sahifalar import qilingan va routerga ulangan

### ✅ 2. Groups.jsx (TUGALLANDI)
- Card grid, status filter, search, progress bar
- CRUD modal, navigate to detail
- Dummy data bilan to'liq ishlaydi

### ✅ 3. GroupDetail.jsx (TUGALLANDI)
- Group info, schedule, students table
- Attendance toggle (Present/Absent)
- Stats sidebar

### 🔄 4. Dashboard.jsx — yaxshilash (1-kun)
Mavjud Dashboard tayyor, lekin:
- recharts chart ni Grade Distribution ga moslash
- StatCard'larni real data pattern ga moslash
- Loading/Error state bilan to'ldirish

**Texnologiya:** `recharts` — BarChart, ResponsiveContainer

### 🆕 5. Settings.jsx (1-1.5 kun) — YANGI!
**Nima qilish kerak:**
- Chapda tablar: General, Appearance, Notifications, Security, Finance, Localization
- O'ngda tanlangan tab bo'yicha forma
- Toggle switchlar (notifications, 2FA)
- Theme selector (Light/Dark/System)
- Save tugmasi bilan sozlamalarni saqlash

**Dependencies:** Button, Input, Modal

### ✅ 6. NotFound.jsx (TUGALLANDI)
- 404 sahifa, Dashboard'ga qaytish tugmasi

### 🔄 7. Code Review (doimiy)
- Odil va Hamidula PRlarini review qilish
- Kod sifati, dizayn mosligi, best practices
- Main branchga merge qilish

---

## 📊 Kimni kutadi?
| Kim | Kutadi | Sabab |
|-----|--------|-------|
| Siz | Hech kimni | O'zingiz mustaqil ishlaysiz |
| Odil | Sizni (Code Review) | Reports PR review uchun |
| Hamidula | Sizni (Code Review) | Chat PR review uchun |

## 📅 Timeline
| Kun | Nima qilish |
|-----|-------------|
| 1 | Dashboard refinement |
| 2-3 | Settings.jsx — tablar + formalar |
| Doimiy | Code review |



## 🎨 Dizayn
- Fon: `#F6FBEA`
- Sidebar: `#F1F7E4` (light) / `#0A0E0A` (dark)
- Accent: `#C6FF34` (lime)
- Tugmalar: lime `bg-[#C6FF34]` `text-black`
- Badge status: Active=lime, Full=red, Archived=gray, Starting=yellow
- Karta: oq fon, shadow, rounded-2xl
- Jadval: striped rows, sticky header
