# 📊 Dashboard — Ma'lumotlar manbai

> **Maqsad:** Dashboard'dagi har bir metrika qayerdan kelayotganini, qanday hisoblanayotganini tushuntirish
> **Manba:** Backend `admin.repository.js` → `branchDashboard()` funktsiyasi

---

## 1. Umumiy daromad (Revenue)

**Kartadagi nom:** "Umumiy daromad"
**Backenddagi nom:** `revenue_total`
**Qiymat:** `128,500,000 so'm`

### Qayerdan keladi?
PostgreSQL — `transactions` jadvalidan:
```sql
SELECT COALESCE(SUM(t.amount), 0) FROM transactions t
WHERE t.branch_id = $1 AND t.status = 'completed'
```
- **Jadval:** `transactions`
- **Filter:** faqat shu filial (`branch_id`), faqat `status = 'completed'` bo'lgan to'lovlar
- **Hisoblash:** BARCHA tugallangan to'lovlar summasini yig'adi (HAMMA VAQT — umrbod)

### Nega bu son ishonchli?
- `transactions` jadvaliga faqat muvaffaqiyatli to'lovlar yoziladi
- `status = 'completed'` — bu to'lov haqiqatda amalga oshganini bildiradi
- Hech qachon o'chirilmaydi (append-only), faqat `status` o'zgaradi

---

## 2. Xarajatlar (Expenses)

**Kartadagi nom:** "Xarajatlar"
**Backenddagi nom:** `expenses_total`
**Qiymat:** `42,300,000 so'm`

### Qayerdan keladi?
PostgreSQL — `expenses` jadvalidan:
```sql
SELECT COALESCE(SUM(e.amount), 0) FROM expenses e
WHERE e.branch_id = $1 AND e.deleted_at IS NULL
```
- **Jadval:** `expenses`
- **Filter:** faqat shu filial (`branch_id`), faqat o'chirilmagan (`deleted_at IS NULL`)
- **Hisoblash:** HAMMA o'chirilmagan xarajatlarni yig'adi

### Nega bu son ishonchli?
- Xarajat faqat admin tomonidan qo'shiladi (autentifikatsiya + authorizatsiya)
- Soft delete: o'chirilganda `deleted_at` belgilanadi, ma'lumot yo'qolmaydi (audit)

---

## 3. Sof foyda (Net Profit)

**Kartadagi nom:** "Sof foyda"
**Backenddagi nom:** `profit` (calculation)
**Qiymat:** `86,200,000 so'm`

### Qayerdan keladi?
Frontendda hisoblanmaydi! Backendda hisoblanadi:
```javascript
// admin.service.js
profit: revenueTotal - expensesTotal
```

### Formula:
```
Sof foyda = Umumiy daromad - Xarajatlar
```
Yani:
```
86,200,000 = 128,500,000 - 42,300,000
```

### Nega bu formula?
Bu eng oddiy va to'g'ri hisoblash usuli:
1. **Daromad** — o'quvchilardan tushgan barcha pullar (transactions)
2. **Xarajat** — markaz sarflagan barcha pullar (expenses)
3. **Sof foyda** = ikkalasining farqi

> **Muhim:** Backendda `profit` alohida saqlanmaydi. Har safar dashboard so'ralganda hisoblanadi. Shuning uchun u doimo yangi va aniq.

---

## 4. Qarzdorliklar (Outstanding Debt)

**Kartadagi nom:** "Qarzdorliklar"
**Backenddagi nom:** `outstanding_debt`
**Qiymat:** `15,700,000 so'm`

### Qayerdan keladi?
PostgreSQL — `student_profiles` jadvalidan:
```sql
SELECT COALESCE(SUM(sp.total_debt), 0) FROM student_profiles sp
WHERE sp.branch_id = $1
```
- **Jadval:** `student_profiles`
- **Filter:** faqat shu filial (`branch_id`)
- **Hisoblash:** BARCHA talabalarning `total_debt` maydonlarini yig'adi

### Nega bu son ishonchli?
- `total_debt` har bir talaba uchun alohida hisoblanadi
- To'lov qilinganda `total_debt` kamayadi
- Yangi oy kelganda (oylik to'lov) `total_debt` ko'payadi
- Append-only: tarix o'zgarmaydi

---

## 5. Qo'shimcha ko'rsatkichlar

### Faol talabalar (Active Students)
- **Backend:** `active_students`
- **SQL:** `SELECT count(*) FROM users WHERE branch_id = $1 AND role = 'student' AND status = 'active' AND deleted_at IS NULL`
- **Izoh:** Faqat `status = 'active'` bo'lgan, o'chirilmagan talabalar

### Guruhlar (Groups)
- **Backend:** `groups`
- **SQL:** `SELECT count(*) FROM groups WHERE branch_id = $1 AND is_archived = false AND deleted_at IS NULL`
- **Izoh:** Faqat arxivlanmagan va o'chirilmagan guruhlar

### Muddat o'tgan to'lovlar (Overdue Invoices)
- **Backend:** `overdue_invoices`
- **SQL:** `SELECT count(*) FROM invoices WHERE branch_id = $1 AND status = 'overdue' AND deleted_at IS NULL`
- **Izoh:** `status = 'overdue'` bo'lgan invoice'lar soni

### Shu oy daromadi (This Month Revenue)
- **Backend:** `revenue_month`
- **SQL:** Xuddi `revenue_total` ga o'xshash, lekin qo'shimcha filter: `t.created_at >= date_trunc('month', now())`
- **Izoh:** Faqat shu oyning 1-sanasidan boshlab to'lovlar

---

## 📊 Ma'lumotlar oqimi diagrammasi

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  PostgreSQL  │────→│  admin.repository│────→│ admin.service   │
│              │     │  .js             │     │ .js             │
│  transactions│     │                  │     │                 │
│  expenses    │     │  branchDashboard │     │ dashboard()     │
│  student_    │     │  (SQL queries)   │     │ (calculation)   │
│    profiles  │     │                  │     │                 │
│  users       │     │                  │     │ revenue -       │
│  groups      │     │                  │     │ expenses =      │
│  invoices    │     │                  │     │ profit          │
└──────────────┘     └──────────────────┘     └────────┬────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Frontend:       │←────│ /admin/dashboard │←────│ JSON Response   │
│ Dashboard.jsx   │     │ (API endpoint)   │     │ {               │
│                 │     │                  │     │   totals: {     │
│ StatCard ×4     │     │ GET /admin/      │     │     revenue,    │
│ Chart (recharts)│     │   dashboard      │     │     expenses,   │
│ Ko'rsatkichlar  │     │                  │     │     profit,     │
│ Oxirgi to'lovlar│     │                  │     │     debt...     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

---

## ⚠️ Hozirgi holat: DEMO

Hozircha Dashboard **MOCK_DATA** bilan ishlaydi → `frontend/admin/admin_page/src/pages/Dashboard.jsx`

Backend kelganda:
```javascript
import { fetchDashboard } from '../services/adminService.js';

// useEffect bilan chaqiriladi:
const data = await fetchDashboard();
// setData(data); → MOCK_DATA o'rniga ishlatiladi
```
