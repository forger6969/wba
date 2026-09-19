# 🟡 Hamidulla — Junior+

## Umumiy ma'lumot
- **Roli:** Frontend developer
- **Level:** Junior+ (bir oz tajribali junior)
- **Vazifalar soni:** 2 ta sahifa (1 ta tugallangan, 1 ta qoldi)
- **Stack:** React 19 + Vite + Tailwind CSS v4 + react-icons/hi2 + recharts + react-router-dom v7

---

## 🎯 Vazifalar (Status)

### ✅ 1. Expenses.jsx (TUGALLANDI)
- 3 ta StatCard: Total Expenses, This Month, Average/Day
- Table: Category, Amount, Date, Description
- Category filter tablar
- Expense qo'shish Modal, delete tugmasi
- Budget Forecast bar chart (recharts)

### 🔄 2. Chat.jsx (2 kun) — BAJARILMADI
**Sahifa tayyor:** `src/pages/Chat.jsx` — routing ulangan, ikki panelli layout bor
**Siz to'ldirishingiz kerak:**

**Nima qilish kerak:**
- **Chap panel (sidebar):** Chat list — avatar + name + last message + time + unread badge
- **O'ng panel (chat oynasi):** 
  - Header: chatdagi odam nomi + avatar + online/offline
  - Messages: qabul qilingan (chapda, kulrang) va jo'natilgan (o'ngda, lime)
  - Input: matn yozish + Send tugma (Enter bilan ham jo'natsin)
- **5-6 ta chat** bilan demo (mentorlar va studentlar bilan chat)
- **Har bir chatda 3-5 tadan** xabar
- **Send bosilganda:** xabar massivga qo'shiladi

**Texnologiya:**
- `useState` → messages, selectedChat, inputValue
- `react-icons/hi2` → `HiOutlinePaperAirplane`, `HiOutlineMagnifyingGlass`, `HiOutlinePhone`, `HiOutlineVideoCamera`
- **Dummy data:** 5-6 ta chat, har birida 3-5 tadan xabar

**Namuna dummy data:**
```js
const contacts = [
  { id: 1, name: 'Aziz Karimov', role: 'Mentor', avatar: 'AK', online: true, lastMsg: 'Salom', time: '14:30', unread: 2 },
  { id: 2, name: 'Malika Rahimova', role: 'Student', avatar: 'MR', online: false, lastMsg: 'Rahmat', time: '12:15', unread: 0 },
];
const messages = {
  1: [
    { id: 1, from: 'them', text: 'Salom, bugun dars bormi?', time: '14:25' },
    { id: 2, from: 'me', text: 'Ha, soat 16:00 da', time: '14:26' },
  ],
};
```

**Dependencies:** Input, Badge

---

## 📊 Kimni kutadi?
| Kim | Kutadi | Sabab |
|-----|--------|-------|
| Siz | Hech kimni | Routing tayyor, sahifa o'z ichida ishlaysiz |
| Abdulloh | Sizni (Chat) | PR merge qilish uchun |

## 📅 Timeline
| Kun | Nima qilish |
|-----|-------------|
| 1-2 | Chat.jsx — sidebar + chat window + send message |

## 🎨 Dizayn
- Fon: `#F6FBEA`
- Karta: oq fon, rounded-2xl, shadow, padding
- Chat:
  - Qabul qilingan xabar: chapda, `bg-[var(--surface)]`, `rounded-[16px] rounded-bl-[4px]`
  - Jo'natilgan xabar: o'ngda, `bg-[var(--green)] text-[#141B10]`, `rounded-[16px] rounded-br-[4px]`
- Online indicator: `w-3 h-3 bg-[#2ECC71] rounded-full`
- Tugmalar: `bg-[#C6FF34] text-black` (lime)
- Iconkalar: `react-icons/hi2` (Heroicons v2)

## 💡 Muhim eslatmalar
- **Zustand/TanStack Query kerak emas** — faqat `useState`
- **Backend YO'Q** — hamma ma'lumotlar JS massivda (dummy data)
- **Chatda socket.io kerak emas** — hozircha faqat frontend ko'rinish, real chat EMAS
- **react-icons/hi2** dan foydalan (masalan: `HiOutlinePaperAirplane`, `HiOutlineMagnifyingGlass`)
- **Branch nomi:** `feat/chat`
- **Oldin Expenses ni qilgan eding** (tayyor), endi Chat ga o't
- **Agar tiqilib qolsangiz:** avval Google, keyin Abdullohdan so'rang

## ✅ DoD (Definition of Done)
- [ ] Sahifa react-router da ro'yxatdan o'tgan (tayyor)
- [ ] Barcha dummy data tayyor
- [ ] Chatda xabar yozish va ko'rsatish ishlaydi
- [ ] Dizayn yuqoridagi ko'rsatmalarga mos
- [ ] PR yozilgan va Abdulloh review qilgan
