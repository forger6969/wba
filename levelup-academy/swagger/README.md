# LevelUp Academy API — API reference (v0.1.0)

Multi-tenant Educational CRM backend for LevelUp Academy. Roles: main_admin, ceo, admin, mentor, student, parent, methodist. Auth via JWT bearer access tokens (15 min TTL) + httpOnly refresh-token cookie (30 days, rotated).

> Auto-generated from `backend/src/config/swagger.js` (the same spec that powers the live
> `GET /api/docs` Swagger UI when the backend is running). Regenerate after any route/schema
> change with:
>
> ```bash
> cd backend && npm run docs:md
> ```

## Modules

- [Auth](./auth.md) — Login (main/staff/member), Google OAuth, refresh, logout, password reset _(11 endpoints)_
- [Leads](./leads.md) — Public landing-page lead submission _(1 endpoint)_
- [Main Admin](./main-admin.md) — Platform owner: partner onboarding, pricing, leads, platform dashboard _(14 endpoints)_
- [CEO](./ceo.md) — Organization owner: branches, admins, methodists, org dashboard _(35 endpoints)_
- [Admin](./admin.md) — Branch admin: dashboard, expenses, students, mentors, groups _(33 endpoints)_
- [Admin Payments](./admin-payments.md) — K-PAY: invoices, ad-hoc payments, refunds/voids, receipts _(7 endpoints)_
- [Admin Reports](./admin-reports.md) — K-PAY: branch revenue/debt report by group _(1 endpoint)_
- [Mentor Groups](./mentor-groups.md) — Mentor's own groups + roster (read-only; CRUD is Admin-side) _(3 endpoints)_
- [Mentor Attendance](./mentor-attendance.md) — Mentor: mark/read attendance for own groups _(2 endpoints)_
- [Mentor Homework](./mentor-homework.md) — Mentor: create homework, list submissions, grade _(4 endpoints)_
- [Mentor Tests](./mentor-tests.md) — Mentor: create tests, list results _(3 endpoints)_
- [Mentor Salary](./mentor-salary.md) — Mentor salary suggestion/records (mentor self-view; admin manages) _(4 endpoints)_
- [Mentor Coins](./mentor-coins.md) — Mentor/Admin manual coin grants + student coin history _(3 endpoints)_
- [Student](./student.md) — Student's own home dashboard, homework, tests, videos, leaderboard _(17 endpoints)_
- [Student Shop](./student-shop.md) — Coin shop: browse/purchase (student), manage items (admin/mentor) _(5 endpoints)_
- [Parent](./parent.md) — Parent's read-only view of their children _(5 endpoints)_
- [Methodist](./methodist.md) — Organization-wide content authoring (training types/topics/lessons/questions) + analytics _(26 endpoints)_
- [Chat](./chat.md) — Realtime chat REST history (sending is via Socket.io, not REST) _(5 endpoints)_
- [Coins](./coins.md) — Student's own coin balance + history _(1 endpoint)_
- [Users](./users.md) — Cross-role profile endpoints (own profile, scoped user lookups) _(4 endpoints)_
- [Discipline](./discipline.md) — Дисциплина сотрудников: штрафы (shtraf) + увольнение (qora) + устав организации _(10 endpoints)_
- [Telegram](./telegram.md) —  _(5 endpoints)_
- [Mentor](./mentor.md) —  _(1 endpoint)_
- [Branch Manager](./branch-manager.md) —  _(5 endpoints)_

**Total: 205 endpoints across 24 modules.**