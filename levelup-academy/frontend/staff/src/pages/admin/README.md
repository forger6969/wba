# Admin Panel — LevelUp Academy

> ⚠️ **Texnik hujjat, vazifa ro'yxati EMAS (belgi qo'yildi 2026-07-26).**
> Admin panelining ochiq vazifalari va holati — korneviy `TASK.md`,
> `## Frontend — Admin` bo'limida. Bu yerda tuzilma va API tavsifi.
> ⚠️ Bu fayl `src/` ICHIDA yotibdi — bandlga tushmaydi, lekin kod papkasida
> hujjat saqlash yaxshi amaliyot emas. Keyinchalik `docs/` ga ko'chirilsin.

> `frontend/staff/src/pages/admin/` — Admin role pages inside the Staff SPA

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Pages](#pages)
4. [API Routes](#api-routes)
5. [React Query Hooks](#react-query-hooks)
6. [WebSocket Events](#websocket-events)
7. [Redis Usage](#redis-usage)
8. [Technologies](#technologies)

---

## Overview

The Admin panel manages **one branch** (filial). Admins control students, groups, mentors, payments, expenses, reports, and chat — all scoped to their branch via `req.scope.branchId`.

| Feature | Status |
|---------|--------|
| Dashboard KPIs | ✅ Done |
| Student CRUD + Freeze + Export | ✅ Done |
| Group CRUD + Attendance + Roster | ✅ Done |
| Mentor CRUD + Freeze | ✅ Done |
| Invoice/Payment Management + Split Pay | ✅ Done |
| Expense CRUD + PDF Export | ✅ Done |
| Reports (Teacher PDF + Excel exports) | ✅ Done |
| Realtime Chat (Socket.IO) | ✅ Done |
| Org Settings (5 tabs) | ✅ Done |
| Profile (edit + password change) | ✅ Done |

---

## Architecture

```
Staff SPA (Vite + React 18)
│
├── Login.jsx                    ← Staff login (Admin/Super/Mentor/Methodist)
│
├── pages/admin/
│   ├── Dashboard.jsx            ← KPI overview
│   ├── Students.jsx             ← Student list + CRUD modal
│   ├── StudentDetail.jsx        ← Single student detail/edit
│   ├── Groups.jsx               ← Group list + CRUD modal
│   ├── GroupDetail.jsx          ← Group roster, attendance, payments
│   ├── Mentors.jsx              ← Mentor list + CRUD modal
│   ├── Payments.jsx             ← Invoice management + split pay
│   ├── Expenses.jsx             ← Expense CRUD + PDF export
│   ├── Reports.jsx              ← Reports + Excel/PDF exports
│   ├── Chat.jsx                 ← Realtime chat wrapper
│   ├── Settings.jsx             ← Org settings (5 tabs)
│   └── Profile.jsx              ← Admin profile edit
│
├── components/
│   ├── Layout.jsx               ← Sidebar + topbar + notifications
│   ├── PageHeader.jsx           ← Reusable page header
│   ├── StaffChat.jsx            ← Shared chat (admin + mentor)
│   └── ui.jsx                   ← UI primitives
│
└── queries.js                   ← React Query hooks (13 admin hooks)
```

**Auth flow:** `App.jsx` → `PrivateRoute` (checks `auth.token`) → `useRole()` → `canAdmin` gate

---

## Pages

### 1. Dashboard (`Dashboard.jsx`)

**Route:** `/admin/dashboard`

| Feature | Detail |
|---------|--------|
| KPI cards | Revenue, Debtors, Debt Sum, New Students |
| Components | `StatRow`, `Kpi` from `_ui.jsx` |
| Data | `useAdminDashboard` → `GET /api/admin/dashboard` |
| Charts | None (KPI only) |
| Formatters | `money()` for currency, `fmt()` for numbers |

---

### 2. Students (`Students.jsx`)

**Route:** `/admin/students`

| Feature | Detail |
|---------|--------|
| View modes | Card grid + List toggle |
| Search | By name, phone, email, code |
| Pagination | Page-based with limit selector |
| CRUD | Create/Edit modal (firstName, lastName, phone, email, grade) |
| Freeze | Toggle freeze status per student |
| Password | Regenerate + copy to clipboard |
| Export | PDF report card (jsPDF + autotable) |
| Actions | Edit, Freeze, Password Regen, Delete, View Detail |

**Modals:**
- Create/Edit Student — form with validation
- Confirm Delete — destructive action warning
- Password Regen — shows new password + copy button

---

### 3. StudentDetail (`StudentDetail.jsx`)

**Route:** `/admin/students/:id`

| Feature | Detail |
|---------|--------|
| Profile card | Avatar, name, phone, email, code, balance |
| Inline editing | Click edit → save/cancel |
| Freeze | Toggle with confirmation |
| Password | Regenerate + copy-to-clipboard |
| Groups | List of enrolled groups |
| Payments | History with status labels/colors |
| Attendance | Summary view |
| Delete | Confirmation dialog |

---

### 4. Groups (`Groups.jsx`)

**Route:** `/admin/groups`

| Feature | Detail |
|---------|--------|
| View modes | Card grid + List |
| Search | By group name |
| CRUD | Create/Edit modal (name, mentor, schedule) |
| Archive | Toggle archive status |
| Mentor | Dropdown assignment |
| Max display | 15 students per group card |

**Modals:**
- Create/Edit Group — name, mentor select, schedule
- Archive toggle — confirm dialog

---

### 5. GroupDetail (`GroupDetail.jsx`)

**Route:** `/admin/groups/:id`

| Feature | Detail |
|---------|--------|
| Student roster | List with payment status badges |
| Add students | Modal with search + checkbox |
| Remove students | Per-student remove button |
| Attendance | Month navigation, per-day click → per-student toggle |
| Payment summary | Per-student paid/pending/overdue |
| Schedule | Text display using DAY_LABEL map |
| Mentor info | Display assigned mentor |

**Payment status badges:**
- 🟢 `paid` — Fully paid
- 🟡 `pending` — Partial payment
- 🔴 `overdue` — Payment overdue

---

### 6. Mentors (`Mentors.jsx`)

**Route:** `/admin/mentors`

| Feature | Detail |
|---------|--------|
| View modes | Card grid + List |
| Search | By name, email |
| CRUD | Create/Edit modal (firstName, lastName, phone, email, grade) |
| Grade | Junior / Middle / Senior picker |
| Freeze | Toggle freeze status |
| Delete | Soft-delete with confirmation |

---

### 7. Payments (`Payments.jsx`)

**Route:** `/admin/payments`

| Feature | Detail |
|---------|--------|
| Status tabs | All / Paid / Pending / Overdue |
| Payment modal | Split payment (multiple parts) |
| Cancel invoice | With confirmation |
| Receipt | Upload receipt |
| Create invoice | Ad-hoc invoice creation |
| Debtor view | Monthly breakdown |

**Split pay flow:**
1. Click "Pay" on invoice
2. Enter amount (can be partial)
3. System creates `split_batch_id` for tracking
4. Auto-mark fully paid when sum matches

---

### 8. Expenses (`Expenses.jsx`)

**Route:** `/admin/expenses`

| Feature | Detail |
|---------|--------|
| Category filter | Dropdown filter |
| Status filter | Active / Archived |
| Date range | Start + End date pickers |
| CRUD | Create/Edit modal (amount, category, description, date) |
| Charts | Bar chart (Recharts) — monthly expenses |
| PDF export | jsPDF + autotable |
| Pagination | Page-based |

**PDF Export (line 397-481):**
- Title: "Expense Report"
- Columns: Date, Category, Amount, Description
- Auto-table with styling

---

### 9. Reports (`Reports.jsx`)

**Route:** `/admin/reports`

| Feature | Detail |
|---------|--------|
| Teacher report | Date range + student select → PDF generation |
| Payment export | Excel export via backend |
| Debtor export | Excel export via backend |
| KPI cards | Revenue, Expenses, Debt — from `useAdminReports` |
| Charts | Recharts bar/pie charts |
| Filters | Date range, search |
| Custom tooltip | `ChartTooltip` component |

**Teacher Report flow:**
1. Select mentor from dropdown
2. Pick date range (from/to)
3. Select students to include
4. Click "Generate PDF"
5. Backend creates PDF with pdfkit → returns blob
6. Frontend opens in new tab

---

### 10. Chat (`Chat.jsx`)

**Route:** `/admin/chat`

| Feature | Detail |
|---------|--------|
| Component | Thin wrapper → `<StaffChat variant="admin" />` |
| Contacts | Sidebar with online status (Redis presence) |
| Messages | Real-time via Socket.IO |
| Typing | Indicator with timeout |
| History | Loaded on contact select |
| Unread | Badge count |

**WebSocket events used:**
- `message:new` — send/receive
- `typing:start` / `typing:stop`
- `user:online` / `user:offline`
- `presence:query` / `presence:batch`
- `chat:unread`

---

### 11. Settings (`Settings.jsx`)

**Route:** `/admin/settings`

| Tab | Features |
|-----|----------|
| General | Org name, logo, address |
| Notifications | Email/SMS/Telegram toggles |
| Security | Password policy, 2FA |
| Finance | Payment provider config (Click/Payme/UzCard) |
| Localization | Language, timezone, currency |

**Payment providers:**
- Click (test + prod toggle)
- Payme (test + prod toggle)
- UzCard

---

### 12. Profile (`Profile.jsx`)

**Route:** `/admin/profile`

| Feature | Detail |
|---------|--------|
| Personal info | firstName, lastName, nickname, age, email |
| Password | Change current password |
| Role display | admin / ceo / mentor / methodist |
| API | `api.request('auth/me', PATCH)` |

---

## API Routes

All routes prefixed with `/api/admin` — require JWT + `authorize('admin')`.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/dashboard` | Branch KPIs (revenue, expenses, profit, debt, students, groups) |
| GET | `/settings` | Org settings (lesson duration, payment providers) |
| PATCH | `/settings` | Update org settings |
| POST | `/expenses` | Create expense (BullMQ `notifications` job) |
| GET | `/expenses` | List expenses (paginated, date range filter) |
| PATCH | `/expenses/:id` | Update expense |
| DELETE | `/expenses/:id` | Soft-delete expense |
| POST | `/students` | Create student (auto-generates login code + password) |
| GET | `/students` | List students (paginated, search, filter) |
| GET | `/students/:id` | Student detail (profile + debt + coin balance + groups) |
| PATCH | `/students/:id` | Update student profile |
| POST | `/students/:id/freeze` | Freeze/unfreeze student |
| POST | `/students/:id/regenerate-password` | Regenerate student password |
| DELETE | `/students/:id` | Soft-delete student, remove from groups |
| POST | `/mentors` | Create mentor |
| GET | `/mentors` | List mentors |
| PATCH | `/mentors/:id` | Update mentor (name, phone, email, grade, frozen) |
| POST | `/mentors/:id/freeze` | Freeze/unfreeze mentor |
| DELETE | `/mentors/:id` | Soft-delete mentor |
| POST | `/groups` | Create group |
| GET | `/groups` | List groups (includes archived) |
| PATCH | `/groups/:id` | Update group (name, mentor, schedule, archived) |
| POST | `/groups/:id/students` | Add students to group |
| DELETE | `/groups/:id/students/:studentId` | Remove student from group |
| GET | `/groups/:id/students` | List group students (with paidStatus) |
| PATCH | `/groups/:id/students/:studentId/attendance` | Bulk attendance update |
| GET | `/payments` | List invoices (status filter, pagination) |
| GET | `/payments/:id` | Invoice detail with payment history |
| POST | `/payments/:id/pay` | Record payment (auto-mark fully paid, send receipt) |
| POST | `/payments/:id/cancel` | Cancel invoice |
| GET | `/debtors` | List debtors (grouped, monthly breakdown) |
| GET | `/payments/export` | Export payments to Excel (exceljs) |
| GET | `/reports/teachers/:mentorId/report` | Generate teacher report PDF (pdfkit) |
| GET | `/debtors/export` | Export debtors to Excel |
| POST | `/chat/send` | Send message (bullmq `messages` job) |
| GET | `/chat/history/:targetUserId` | Chat history with user |
| GET | `/chat/unread` | Unread counts |
| GET | `/chat/contacts` | Contact list with online status (Redis) |
| GET | `/presence/:userId` | Get user online status |
| POST | `/students/export` | Export students to Excel |
| POST | `/invoices/generate` | Generate invoices for all students |

**Total: 36+ endpoints**

---

## React Query Hooks

| Hook | Endpoint | Purpose |
|------|----------|---------|
| `useAdminDashboard` | `/admin/dashboard` | KPI summary |
| `useAdminStudents(qs)` | `/admin/students` | Paginated student list |
| `useAdminStudentDetail(id)` | `/admin/students/:id` | Single student detail |
| `useAdminGroups(qs)` | `/admin/groups` | Paginated group list |
| `useAdminGroupDetail(id)` | `/admin/groups/:id` | Single group detail |
| `useAdminMentors` | `/admin/mentors` | Full mentor list |
| `useAdminInvoices(qs)` | `/admin/payments` | Paginated invoice list |
| `useAdminExpenses(qs)` | `/admin/expenses` | Paginated expense list |
| `useAdminReports(qs)` | `/admin/reports` | Aggregated report stats |
| `useAdminGroupAttendance(gId, date)` | `/admin/groups/:id/attendance` | Day attendance |
| `useAdminGroupHomework(groupId)` | `/admin/groups/:id/homework` | Homework list |
| `useAdminGroupFeedback(groupId)` | `/admin/groups/:id/feedback` | Feedback list |
| `useAdminSettings` | `/admin/settings` | Org settings |

**Total: 13 hooks**

---

## WebSocket Events

### Connection
```javascript
// Socket.IO client connects to backend namespace
const socket = getSocket() // from socket.js
```

### Events

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `user:online` | Server→Client | `{ userId, name }` | User came online |
| `user:offline` | Server→Client | `{ userId }` | User went offline |
| `presence:query` | Client→Server | `{ userIds[] }` | Request online status |
| `presence:batch` | Server→Client | `{ online: {userId: timestamp} }` | Batch online response |
| `message:new` | Bidirectional | `{ from, to, text, timestamp, read }` | New chat message |
| `message:read` | Bidirectional | `{ messageId, readerId }` | Read receipt |
| `typing:start` | Bidirectional | `{ from, to }` | User started typing |
| `typing:stop` | Bidirectional | `{ from, to }` | User stopped typing |
| `chat:unread` | Server→Client | `{ unread }` | Unread counts update |
| `announcement:new` | Server→Client | announcement object | New announcement |
| `announcement:read` | Client→Server | `{ id }` | Mark announcement read |
| `notification:new` | Server→Client | notification object | New notification |
| `notification:read` | Client→Server | `{ id }` | Mark notification read |
| `pupil:created` | Server→Client | student object | New student created |
| `invoice:created` | Server→Client | invoice object | New invoice generated |

---

## Redis Usage

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `presence:{userId}` | 120s | Online timestamp |
| `presence:{userId}:sockets` | — | Set of active socket IDs |
| `typing:{from}:{to}` | 5s | Typing indicator |
| `read:{chatId}:{userId}` | — | Read status per chat |

---

## Technologies

| Layer | Technology |
|-------|-----------|
| Framework | React 18 (JSX) |
| Build | Vite |
| Routing | React Router v7 |
| State | TanStack Query (React Query) |
| Styling | Tailwind CSS + DaisyUI |
| Charts | Recharts |
| PDF | jsPDF + autotable |
| Excel | exceljs (backend) |
| PDF (backend) | pdfkit |
| Realtime | Socket.IO v4.8+ |
| Auth | JWT + refresh token cookie |
| HTTP | Axios with interceptors |
| Icons | Lucide React |
| Forms | Native + custom validation |
| Date | date-fns |

---

## Backend Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + Express |
| Database | PostgreSQL (pg Pool) |
| Queue | BullMQ + Redis (ioredis) |
| PDF | pdfkit |
| Excel | exceljs |
| Auth | JWT + bcrypt |
| Payments | Click, Payme, UzCard |
| Telegram | grammY |
| Email | Nodemailer SMTP |
| Cron | node-cron |
| Crypto | AES-256-GCM (payment creds) |
| URL signing | HMAC-SHA256 |

---

## File Dependencies

```
admin/*.jsx
  ├── ../../components/Layout.jsx      ← Sidebar + topbar
  ├── ../../components/PageHeader.jsx  ← Reusable header
  ├── ../../components/StaffChat.jsx   ← Chat (shared)
  ├── ../../components/ui.jsx          ← UI primitives (Avatar, Modal, Kpi, StatRow, etc.)
  ├── ../../pages/mentor/_ui.jsx       ← Shared UI components
  ├── ../../queries.js                 ← React Query hooks
  ├── ../../api.js                     ← Axios API client (42 admin methods)
  ├── ../../auth.jsx                   ← useAuth, useRole
  ├── ../../format.js                  ← fmt, money, dateShort, etc.
  └── ../../socket.js                  ← getSocket() for realtime
```

---

## Quick Start

```bash
# Install dependencies
cd frontend/staff && yarn install

# Start dev server (port 5174)
yarn dev

# Login as admin
# Email: hp8187081014laptop@gmail.com
# Password: azizbek_10.3
```

---

*Last updated: 2026-07-22*
