# 🟢 Odiljon — Strong Junior

## Umumiy ma'lumot
- **Roli:** Frontend developer
- **Level:** Strong Junior
- **Vazifalar soni:** 3 ta sahifa (2 ta tugallangan, 1 ta qoldi)
- **Stack:** React 19 + Vite + Tailwind CSS v4 + react-icons/hi2 + recharts + react-router-dom v7

---

## 🎯 Vazifalar (Status)

### ✅ 1. Students.jsx (TUGALLANDI)
- Table: o'quvchilar ro'yxati — №, Full name, Phone, Group, Status, Balance
- Filter tablar: All | Active | Debtor | Frozen
- Student qo'shish/tahrirlash Modal
- Search input, pagination (10 tadan/sahifa)
- Status badge: Active=lime, Debtor=red, Frozen=gray

### ✅ 2. Payments.jsx (TUGALLANDI)
- Ikki panelli layout (chap: payments list, o'ng: invoice detail)
- Payment qo'shish Modal, status filter
- Status badge: Paid=lime, Pending=yellow, Overdue=red

### 🔄 3. Reports.jsx (2 kun) — BAJARILMADI
**Sahifa tayyor:** `src/pages/Reports.jsx` — routing ulangan, period filter bor
**Siz to'ldirishingiz kerak:**

**Nima qilish kerak:**
- **Revenue chart (BarChart):** 7 oylik daromad vs xarajat grafigi
- **Student Growth chart (AreaChart):** Enrolled/Dropped dinamikasi
- **Group Performance table:** guruhlar reytingi (avg grade, revenue, progress bar)
- **4 ta StatCard:** Total Revenue, Total Expenses, Net Profit, Active Students
- **Period filter:** This Week / This Month / This Quarter / This Year

**Texnologiya:**
- `recharts` → BarChart, AreaChart, ResponsiveContainer, Tooltip
- `useState` → period filter, chart data
- **Dummy data:** o'zingiz yarating (7-12 oylik ma'lumot)

**Dependencies:** StatCard, Badge
**Namuna:** Dashboard.jsx dagi chart patternlariga qarang

---

## 📊 Kimni kutadi?
| Kim | Kutadi | Sabab |
|-----|--------|-------|
| Siz | Hech kimni | Routing tayyor, sahifa o'z ichida ishlaysiz |
| Abdulloh | Sizni (Reports) | PR merge qilish uchun |

## 📅 Timeline
| Kun | Nima qilish |
|-----|-------------|
| 1-2 | Reports.jsx — charts + stat cards + table |

## 🎨 Dizayn
- Fon: `#F6FBEA`
- Jadval: oq fon, striped rows, sticky header
- Modal: oq fon, rounded-2xl, shadow-lg
- Tugmalar: `bg-[#C6FF34] text-black`
- Statuslar: Active=lime, Debtor=red, Frozen=gray, Paid=lime, Pending=yellow, Overdue=red
- Chart ranglari: Revenue=#2ECC71, Expenses=#E8543E

## 💡 Muhim eslatmalar
- **Zustand/TanStack Query kerak emas** — faqat `useState`
- **Backend YO'Q** — hamma ma'lumotlar JS massivda (dummy data)
- **Reports.jsx** da period filter kodi tayyor, qolganini siz yozasiz
- **Dashboard.jsx** dagi chart kodiga qarashingiz mumkin (namuna)
- **Branch nomi:** `feat/reports`
- **PR yozganda:** nima qilganingni qisqa yoz (`feat: add reports page with charts and insights`)
