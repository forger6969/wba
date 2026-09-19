# 📐 LevelUp Academy — Sahifalar tuzilishi

> **Maqsad:** Har bir sahifada foydalanuvchi nima qila olishini tushuntirish
> **Holati:** Dashboard to'liq tayyor, qolganlarini jamoa a'zolari to'ldiradi

---

## 1. Dashboard ✅ (To'liq tayyor)

**Header:** "Панель управления" / "Обзор и аналитика"

**Nima qila oladi foydalanuvchi:**
- 4 ta asosiy ko'rsatkichni ko'radi: Total Students, Active Groups, Revenue, Expenses
- Revenue chart (BarChart) — oylik daromad grafigi
- Grade Distribution (PieChart) — baholar taqsimoti
- Recent Payments — oxirgi to'lovlar ro'yxati
- Recent Activities — so'nggi harakatlar

**Ishlatilgan texnologiyalar:** `useState`, `recharts` (BarChart, PieChart), `StatCard`

---

## 2. Students 🟡

**Header:** "Студенты" / "Управление студентами"

Foydalanuvchi: jadvalda o'quvchilarni ko'radi, status bo'yicha filterlaydi, qidiradi, qo'shadi/tahrirlaydi/o'chiradi, sahifalaydi.

**Kim quradi:** Odil

---

## 3. Groups 🟡

**Header:** "Группы" / "Учебные группы"

Foydalanuvchi: gruppalarni card ko'rinishida ko'radi, status bo'yicha filterlaydi, qidiradi, yangi guruh qo'shadi, guruhga kirib batafsil ko'radi.

**Kim quradi:** Abduloh

---

## 4. Group Detail 🟡

**Header:** "Детали группы"

Foydalanuvchi: guruh ma'lumotini, schedule ni, o'quvchilar jadvalini ko'radi, attendance toggle qiladi (Present/Absent).

**Kim quradi:** Abduloh

---

## 5. Payments 🟡

**Header:** "Платежи" / "Финансы и оплаты"

Foydalanuvchi: to'lovlar jadvalini ko'radi, qatorni bossa invoice detail ochiladi, filterlaydi, qidiradi, yangi to'lov qo'shadi.

**Kim quradi:** Odil

---

## 6. Expenses 🟡

**Header:** "Расходы" / "Учёт расходов"

Foydalanuvchi: 3 ta stat card ko'radi, xarajatlar jadvalini ko'radi, category bo'yicha filterlaydi, yangi xarajat qo'shadi/o'chiradi, Budget Forecast chart ko'radi.

**Kim quradi:** Hamidula

---

## 7. Mentors 🟡

**Header:** "Менторы" / "Преподаватели"

Foydalanuvchi: mentorlar card ko'rinishida ko'radi, qidiradi, qo'shadi/tahrirlaydi, freeze/unfreeze qiladi.

**Kim quradi:** (TBA — kimdir olishi kerak)

---

## 8. Reports 🟡

**Header:** "Отчёты" / "Аналитика и статистика"

Foydalanuvchi: period bo'yicha filterlaydi (This Week/Month/Quarter/Year), revenue va expenses chart ko'radi, student growth ko'radi, group performance table ko'radi.

**Kim quradi:** Odil

---

## 9. Chat 🟡

**Header:** "Чат" / "Сообщения"

Foydalanuvchi: chapda contactlar ro'yxati, o'ngda chat oynasi. Contactni bossa xabarlar ko'rinadi, matn yozib yuboradi.

**Kim quradi:** Hamidula

---

## 10. Settings 🟡

**Header:** "Настройки" / "Настройки системы"

Foydalanuvchi: chapda 6 ta tab (General, Appearance, Notifications, Security, Finance, Localization), har bir tabda tegishli formalar va sozlamalar.

**Kim quradi:** Abduloh

---

## 11. NotFound (404)

Noto'g'ri URL kiritilsa, 404 xatolik sahifasi chiqadi va "Go to Dashboard" tugmasi bor.

**Holati:** ✅ Tayyor

---

## Umumiy eslatma

📌 Dashboard dan tashqari barcha sahifalar **bo'sh** — ularni yuqorida yozilgan jamoa a'zolari o'zlari to'ldiradi.
📌 Har bir sahifa `src/pages/` papkasida, routing `main.jsx` da ulangan.
📌 Shared komponentlar: `Button`, `Modal`, `Input`, `Badge`, `StatCard`, `EmptyState`, `ErrorState` — hammasi tayyor.
