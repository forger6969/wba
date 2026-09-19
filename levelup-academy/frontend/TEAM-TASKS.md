# LevelUp Academy — Frontend: правила, дизайн-система, контракты

> ## ⚠️ Разделение ответственности (уточнено 2026-07-26)
>
> Этот файл **больше не источник правды по задачам.** Два файла не могут быть «единственным
> источником» одновременно — из-за этого статусы тут и в `TASK.md` разъехались.
>
> | Что нужно | Где смотреть |
> |---|---|
> | **Кто чем занят, что сделано, что сломано** | корневой `TASK.md` — **только он** |
> | Дизайн-система, палитра, типографика | этот файл, §2 |
> | Auth-контракты, JWT payload, роутинг, структура папок | этот файл, §3–§5 |
> | Границы зон и запрет переключения между панелями | этот файл, §1 |
>
> **Разделы §7 и ниже — исторические.** Это исходные задания людям от 15.07 и чек-листы
> «Definition of Done». Галочки там не поддерживаются и уже расходятся с кодом
> (пример: §7 говорит «интерцептора на 401 нет» — он есть с 16.07, коммит `55ef617`).
> Как ТЗ они по-прежнему полезны, как статус — нет.

---

## 1. Стек и общие правила

| Компонент | Технология |
|-----------|-----------|
| Сборка | Vite |
| UI | React 18 (JSX) |
| Стили | Tailwind CSS + DaisyUI |
| Темизация | CSS Variables в `:root` (лайм-палитра) |
| Роутинг | React Router v6 |
| Серверное состояние | TanStack Query |
| Клиентское состояние | Redux Toolkit (auth, UI, socket) |
| HTTP | axios (единый instance) |
| Realtime | socket.io-client (singleton) |
| Формы | react-hook-form + zod |
| Деплой | Vercel (отдельные приложения) |

### Ключевые принципы

- **НЕ одна SPA — пять отдельных Vite-приложений** (исправлено 2026-07-26):
  `landing-page` · `main-admin` · `staff` (Admin + CEO + Mentor + Methodist) ·
  `member` (вход + кабинет Parent) · `student`. Внутри `staff` роль из JWT определяет
  layout и дерево маршрутов — но между приложениями общего роутера нет.
- **Нет ролевой логики «на глазок»** — только через `RoleGuard` и ролевые layouts.
- **RBAC на фронте = UX, не безопасность.** Реальная защита — на бэке.
- **Валидация форм:** zod-схемы (те же, что на бэке).
- **Ветка на фичу:** `feature/<panel>-<name>` (напр. `feature/mentor-sardor`).
  ⚠️ **PR идёт в `save-zone`, НЕ в `main`** (исправлено 2026-07-26). В `main` мержит только
  Team Lead и только после проверки `save-zone`. Прямой PR в `main` — нарушение workflow,
  см. `CLAUDE.md`.

### ⛔ ЗАПРЕТ: НЕ переключайся между панелями!

**Каждый человек работает ТОЛЬКО над своей панелью.** Это строгое правило:

| Человек | Его панель | ❌ НЕЛЬЗЯ трогать |
|---------|-----------|-------------------|
| Elyor | Auth | CEO, Admin, Mentor, Methodist |
| Said Islom | CEO (дашборд) | Auth, Admin, Mentor, Methodist |
| Aziz | CEO (филиалы) | Auth, Admin, Mentor, Methodist |
| Abduloh | Admin (студенты) + **весь фронт** | 🔓 **ИСКЛЮЧЕНИЕ — ограничений нет** (см. ниже) |
| Odil | Admin (группы) | Auth, CEO, Mentor, Methodist |
| Hamidula | Admin (расходы) | Auth, CEO, Mentor, Methodist |
| Sardor | Mentor (дашборд) | Auth, CEO, Admin, Methodist |
| Kozim | Mentor (домашки) | Auth, CEO, Admin, Methodist |  
| Alish | Mentor (тесты) | Auth, CEO, Admin, Methodist |
| Azizbek | Methodist | Auth, CEO, Admin, Mentor |

**Почему:** Каждая панель — отдельное Vite-приложение. Смешивание кода = конфликты + ломает рабочий процесс.

#### 🔓 Исключение: Abduloh (решение Karis, 2026-07-20)

На **Abduloh** запрет выше не распространяется — у него полный доступ ко всему `frontend/`: любая панель, любое из 4 Vite-приложений. Он может заходить в чужую панель и править код.

При этом:

- Владение задачами НЕ меняется — у каждого остаётся своя панель и свои таски. Доступ Abduloh это право чинить и дорабатывать, а не забрать панель себе.
- ⛔ Затирать/удалять чужую работу нельзя даже с полным доступом. Конфликт решается через merge, а не через удаление чужого кода.
- Правил `backend/` это не касается — туда по-прежнему нельзя.
- Правил остальных это не касается — все остальные строки таблицы работают как раньше.

---

## 2. Дизайн-система

### Палитра (светлая тема)

| Токен | Hex | Использование |
|-------|-----|---------------|
| `--bg` | `#F6FBEA` | Фон страницы (лайм-тинт) |
| `--surface` | `#FFFFFF` | Карточки — белые с явной тенью |
| `--text` | `#1D2417` | Основной текст — графитово-зелёный |
| `--text-muted` | `#5E6E52` | Вторичный текст |
| `--border` | `#E6EDD8` | Границы, разделители таблиц |
| `--accent` | `#C6FF34` | Лайм: кнопки, прогресс, бейджи, активная навигация |
| `--accent-ink` | `#141B10` | Текст НА лайме (тёмный) |
| `--sidebar` | `#1D2417` | Тёмный сайдбар/шапка |
| `--sidebar-text` | `#DCE9CC` / dim `#8FA283` | Текст в сайдбаре |
| success | `#2ECC71` (bg `rgba(.14)`) | «Оплачен / активен» |
| danger | `#E8543E` (bg `rgba(.12)`) | «Должник / просрочка» |

### Тень карточек

```
0 10px 28px rgba(29,36,23,.14), 0 2px 6px rgba(29,36,23,.08)
```

### Hover-эффекты

- Карточки: `hover:-translate-y-0.5 transition-all`
- Строки таблиц: подсветка `#F8FDF0`
- Шкала оценок 0–100: интенсивность лайма растёт (`rgba .35 → .55 → .78 → 1`)

### Типографика

- **Display (заголовки, цифры, логотип):** Manrope (variable 200–800)
- **Body:** Segoe UI / system-ui
- **Цифры в таблицах:** `font-variant-numeric: tabular-nums`

### Компоненты (макет дашборда v2)

- Сайдбар тёмный с иконками; активный пункт — лайм-подложка `rgba(198,255,52,.13)`
- Логотип-знак: кольцо прогресса (отсылка к 0–100)
- Стат-карточки: label + delta-бейдж (▲) + крупная цифра + спарклайн
- Таблица учеников: аватар-плитка, оценка + мини-бар, пилюли статусов
- График распределения оценок: 4 диапазона (0–59 / 60–74 / 75–89 / 90–100)

---

## 3. Авторизация и вход

### Три отдельных endpoint'а по группам ролей

| Endpoint | Роль | Способ входа |
|----------|------|-------------|
| `POST /api/auth/main/login` | Main Admin | Email + пароль |
| `POST /api/auth/staff/login` | CEO + Admin + Mentor | Email + пароль |
| `POST /api/auth/member/login` | Student + Parent | Логин-код (8 симв.) + пароль (6 цифр) |

> ⚠️ Единого `/api/auth/login` НЕТ. Тело у всех `{ login, password }`. Чужая роль на чужом endpoint → 401.

### Google OAuth (Firebase)

- `POST /api/auth/main/google` — только main_admin
- `POST /api/auth/staff/google` — admin/ceo/mentor
- member (student/parent) — **без Google**

### Сброс пароля

- `POST /api/auth/forgot-password` → OTP на почту
- `POST /api/auth/reset-password`
- Для member-ролей «забыли пароль» не показывать (пароль перевыдаёт Admin)

### JWT payload

```json
{ "sub": "user-id", "role": "admin", "orgId": "org-id", "branchId": "branch-id" }
```

### Авто-refresh

- 401 → новый токен → повтор запроса без разлогина
- `credentials: 'include'` на все `/api/auth/*` (refresh-cookie)

---

## 4. Роутинг

```jsx
// src/app/router.jsx — ключевые маршруты
/login          → Navigate to /login/staff
/login/main     → LoginPage variant="main"    // Main Admin
/login/staff    → LoginPage variant="staff"   // CEO + Admin + Mentor + Methodist
/login/member   → LoginPage variant="member"  // Student + Parent

/student        → RoleGuard allow={['student']}   → StudentLayout
/admin          → RoleGuard allow={['admin']}     → AdminLayout
/ceo     → RoleGuard allow={['ceo']} → CEOLayout
/mentor         → RoleGuard allow={['mentor']}    → MentorLayout
/methodist      → RoleGuard allow={['methodist']}  → MethodistLayout
```

---

## 5. Структура проекта (общая)

```
frontend/
├── TEAM-TASKS.md          ← ЭТОТ ФАЙЛ
├── landing-page/          # Лендинг (React + Vite)
├── main-admin/            # Панель Main Admin (DaisyUI лайм)
├── staff/                 # Панель Admin + CEO + Mentor + Methodist (ОБЩИЙ)
├── auth/                  # Логин/регистрация (общий)
└── logos/                 # Логотипы
```

### Feature-based структура внутри каждой панели

```
src/
├── app/           # App.jsx (провайдеры), router.jsx, queryClient.js
├── components/    # ui/ (Button, Modal, Table...), layout/ (Sidebar, Topbar), feedback/
├── layouts/       # RoleLayout.jsx (каркас кабинета)
├── features/      # auth/, dashboard/, users/, groups/...
├── hooks/         # useDebounce, usePagination, useOnlineCount
├── services/      # api.js (axios), upload.js (presigned URL)
├── sockets/       # socket.js (singleton)
├── store/         # index.js, authSlice.js, uiSlice.js
├── styles/        # index.css (Tailwind), themes.css (CSS Variables)
└── main.jsx
```

---

## 6. Команда и таски

> ⚠️ Таблица пересобрана 2026-07-26 — предыдущая версия отставала: в ней не было
> Main Admin, Parent и Student вообще, Methodist числился за Karis'ом,
> а Sardor стоял на Mentor'е.

| Панель | Приложение | Люди | Backend API | Контракт |
|--------|-----------|------|-------------|----------|
| **Auth** | все | Elyor | K-AUTH ✅ | §7 этого файла |
| **Main Admin** | `main-admin` | Shohjahon | K-MAIN ✅ (announcements/profile ❌ нет) | `TASK.md` |
| **CEO** | `staff/pages/super` | Said Islom, Aziz | K-SUPER ✅ + AB-SUPER-* ✅ | §8 этого файла |
| **Admin** | `staff/pages/admin` | Abduloh, Odil, Hamidula, XOB | K-ADMIN ✅ (+ group attendance/homework/feedback ✅) | §9 этого файла |
| **Mentor** | `staff/pages/mentor` | Kozim, Alish | AB-MENTOR ✅ | §10 этого файла |
| **Methodist** | `staff/pages/methodist` | Said Islom, Aziz (каркас — Karis) | AB-METHODIST ✅ | §11 этого файла |
| **Student** | `student` | **Sardor** (с 2026-07-26, полный владелец) | AB-STUDENT ✅ | `TASK.md` |
| **Parent** | `member` | Kama (git `iface9808`) | AB-PARENT ✅ | `TASK.md` |
| **Landing** | `landing-page` | Karis + Abdulaziz (CEO — поисковая оптимизация) | `POST /api/leads` ✅ | `TASK.md` |

> Отдельные `docs/TASK-frontend-*.md` УДАЛЕНЫ — контракты живут только здесь, чтобы не расходились.

---

## 7. Auth — Elyor

**Панель:** Auth (общая для всех ролей)
**Backend:** Karis, K-AUTH — ✅ готов

### ~~🆕 Открытые задачи (подтверждено Karis, 2026-07-15)~~ — ЗАКРЫТЫ, сверено 2026-07-26

- [x] **Login-страницы (main/staff/member)** — сделаны, все три бьют в свой endpoint
      (`staff/pages/Login.jsx`, `member/pages/Login.jsx`, `main-admin/pages/Login.jsx`).
      В `origin/elyor` лишних коммитов сверх `save-zone` нет — мержить нечего
- [x] **Auto-refresh `401 → refresh → retry`** — ✅ сделал Elyor 16.07 (`55ef617`, `68062da`).
      Единый `refreshPromise` присутствует во всех четырёх приложениях.
      ⚠️ Текст выше («интерцептора на 401 нет») был верен на 15.07 и с тех пор врал
- [x] **Redux authSlice — НЕ нужен.** Решение в силе, работаем на `useAuth()` context

### Задачи

#### 7.1 Каркас auth (базис для всех)

- `store/index.js` + `store/authSlice.js` — Redux Toolkit: `user`, `accessToken`, `setSession`/`clearSession`
- `services/api.js` — axios instance + interceptors: Bearer из памяти, авто-refresh на 401 (единый `refreshPromise`), 403-archive → toast. **Все `/api/auth/*` — с `credentials:'include'`**
- `features/auth/ProtectedRoute.jsx` — нет токена → `/login`
- `features/auth/RoleGuard.jsx` — роль из JWT → свой кабинет (`HOME_BY_ROLE`)
- `app/router.jsx` — дерево маршрутов + `lazy()` на ролевые layouts

#### 7.2 Страницы логина — 3 endpoint'а

- `/login/main` → **Main Admin** → `POST /api/auth/main/login`
- `/login/staff` → **CEO / Admin / Mentor** → `POST /api/auth/staff/login`
- `/login/member` → **Student / Parent** (логин-код 8 симв. + пароль 6 цифр) → `POST /api/auth/member/login`
- Голый `/login` → редирект на `/login/staff`

#### 7.3 Google-вход (только email-роли)

- Firebase `signInWithPopup(Google)` → `idToken` → POST на endpoint своей группы
- member (student/parent) — **без Google**

#### 7.4 Сброс пароля (только email-роли)

- `POST /api/auth/forgot-password` → OTP на почту → `POST /api/auth/reset-password`
- Для member-ролей «забыли пароль» не показывать

### API

- `POST /api/auth/{main,staff,member}/login` · `POST /api/auth/{main,staff}/google`
- `POST /api/auth/refresh` (cookie) · `POST /api/auth/logout`
- `POST /api/auth/forgot-password` · `POST /api/auth/reset-password`

### Definition of Done

- [ ] Каждая роль логинится своим endpoint'ом и попадает в свой кабинет через `RoleGuard`
- [ ] Google-вход работает для main/staff; member — только код
- [ ] Авто-refresh (401 → новый токен → повтор запроса), `credentials:'include'`
- [ ] Форма валидируется zod; чужая роль → 401 показан понятно
- [ ] Логаут чистит сессию и сокет

---

## 8. CEO — Karis

> 🔒 **Панель CEO — задача Karis.** Shohjahon её собрал (богатые страницы), Karis доводит/стилизует и закрывает. **Остальным не трогать** (Said Islom, Aziz переведены в Methodist). Разделы 8.1–8.2 ниже — исторический API-контракт, теперь под Karis.

**Панель:** CEO (владелец организации, видит ВСЕ филиалы)
**Backend:** Karis, K-SUPER — ✅ готов

> Скоуп своей организации бэк ставит по токену — org/branch с фронта слать НЕ нужно.

### 8.1 Said Islom — Каркас + Дашборд

#### Задачи

- `CEOLayout`: тёмный сайдбар (Dashboard, Branches, Admins, Reports, Settings), topbar с live-онлайном, профиль, логаут
- `ErrorBoundary` на layout, `lazy()` подключение
- Dashboard (`/ceo`): стат-карточки (Total Revenue, Outstanding Debts, Active Students, Live Online), графики (bar по филиалам, тренд долгов), таблица-обзор филиалов

#### API

- `GET /api/super/dashboard` → `{ totals, branches }`
  - `totals`: `{ branches, activeStudents, admins, revenue, outstandingDebt, currency:'UZS' }`
  - `branches[]`: `{ id, name, isMain, isArchived, students, admins, revenue, debt }`
- Socket: `presence:count` (live-онлайн)

> ⚠️ `revenue`/`outstandingDebt` пока 0 (платежи K-ADMIN не готовы). Каркас и графики строй сейчас.

#### Definition of Done

- [ ] Layout + сайдбар + guard (`allow={['ceo']}`)
- [ ] Дашборд тянет `/api/super/dashboard`, live-счётчик обновляется
- [ ] Skeleton при загрузке, EmptyState если данных нет

### 8.2 Aziz — Филиалы

#### Страницы

- **Branches** (`/ceo/branches`): CRUD филиалов, архивация/разархивация, бейдж «главный» (`isMain`)
- **Branch Detail** (`/ceo/branches/:id`): KPI филиала + список админов и групп

#### API

- `POST /api/super/branches` — `{ name, address?, phone? }` → `201`
- `GET /api/super/branches` → `{ branches:[...] }`
- `GET /api/super/branches/:id` → `{ branch: { …, admins:[], groups:[] } }`
- `PATCH /api/super/branches/:id` — `{ name?, address?, phone? }` (PATCH, не PUT!)
- `POST /api/super/branches/:id/archive` · `POST /api/super/branches/:id/unarchive`

#### Definition of Done

- [ ] Список филиалов (карточки + счётчики), бейдж «главный»
- [ ] Создание/редактирование через модалку (react-hook-form + zod)
- [ ] Архивация/разархивация корректно прячет/возвращает кнопки мутаций
- [ ] После мутаций — инвалидация кэша TanStack Query

## 9. Admin — Abduloh, Odil, Hamidula

**Панель:** Admin (один филиал: финансы, студенты, группы)
**Backend:** Karis, K-ADMIN — ✅ готов

> `branchId` бэк ставит по токену — на фронте филиал слать НЕ нужно. Guard `allow={['admin']}`.

### 9.1 Abduloh — Каркас + Студенты

#### Страницы

- **AdminLayout** (`/admin`): сайдбар (Dashboard, Students, Groups, Payments, Expenses, Chat), topbar с live-онлайном, профиль, логаут
- **Branch Dashboard** (`/admin`): стат-карточки (Revenue, Debts, Expenses, Profit, Active Students, Groups, Live Online), график доход-vs-расход, лента последних платежей
- **Students** (`/admin/students`): таблица (имя, группа, коины, долг, статус, логин-код), поиск + фильтр, действия (edit, freeze, regenerate-password, delete), «+ Add Student» модалка

#### API

- `GET /api/admin/dashboard` → `{ totals, thisMonth }`
- `GET /api/admin/students?page&limit&search&groupId` → `{ students, meta }`
- `POST /api/admin/students` — `{ firstName, lastName, phone, birthDate?, groupId?, parent? }` → `201 { student:{…,loginCode,password}, parent? }`
- `GET /api/admin/students/:id` · `PATCH /api/admin/students/:id`
- `POST /api/admin/students/:id/freeze` `{ frozen, reason? }`
- `POST /api/admin/students/:id/regenerate-password` → `{ id, password }`
- `DELETE /api/admin/students/:id`

#### Definition of Done

- [ ] Layout + guard `allow={['admin']}`
- [ ] Дашборд: реальные expenses/profit/students/groups + live-онлайн (revenue=0 сейчас ок)
- [ ] Add-student показывает сгенерированные логин-код+пароль (и родителя, если создан), копируются
- [ ] Таблица студентов: пагинация, поиск, фильтр, freeze, regenerate-password, delete

### 9.2 Odil — Группы + Менторы + Отчёты

> 🔄 **2026-07-28 (Karis):** оставшийся открытый пункт этого раздела — форма группы
> (расписание, ниже) — передан **Abduloh**. Groups CRUD / Group Detail / Отчёты уже
> закрыты (см. `TASK.md`), Odil ими больше не занят.

#### Страницы

- **Groups** (`/admin/groups`): карточки/таблица групп, CRUD + архивация/разархивация
- **Group Detail** (`/admin/groups/:id`): состав, ментор, add/remove студента, бейдж «Архив»
- **Reports** (`/admin/reports`): выручка/долги/прибыль из `/api/admin/dashboard`

#### 🆕 Форма группы — расписание (день + время, бэкенд готов)

При создании/правке группы:
- **Ментор** — обязателен (селектор из `GET /api/admin/mentors`).
- **Дни:** быстрые пресеты **1-3-5** (`["mon","wed","fri"]`) и **2-4-6** (`["tue","thu","sat"]`) + кнопка «другие дни» → галочки `mon..sun` (любой набор).
- **Время начала** — админ вводит (напр. `15:00`).
- **Конец урока — НЕ вводится**, показывается превью: возьми длительность из `GET /api/admin/settings` → `{ lessonDurationMin }` (её задаёт CEO), посчитай `start + duration` (напр. 15:00 + 80 = 16:20). Реальный конец всё равно считает бэкенд — превью только для UX.
- Позже день/время/ментора можно менять тем же PATCH.

#### API

- `GET /api/admin/settings` → `{ lessonDurationMin }` — длительность урока для превью конца
- `GET /api/admin/groups?page&limit` → `{ groups, meta }` (в группе теперь `days[]`, `startTime`, `endTime` + `schedule[]`)
- `POST /api/admin/groups` — `{ name, subject, mentorId, monthlyPrice, days:["mon","wed","fri"], startTime:"15:00", room? }` → `201`
- `GET /api/admin/groups/:id` → `{ group }` (+ `students[]`)
- `PATCH /api/admin/groups/:id` — те же поля, `days` и `startTime` слать **только вместе**
- `POST /api/admin/groups/:id/archive` · `POST /api/admin/groups/:id/unarchive`
- `POST /api/admin/groups/:id/students` `{ studentId }` · `DELETE /api/admin/groups/:id/students/:studentId`
- `GET /api/admin/mentors` — менторы для селектора

#### Definition of Done

- [ ] CRUD групп + archive/unarchive (archiveGuard 403 ловится глобальным toast)
- [ ] 🆕 Форма группы: обязательный ментор + дни (пресеты 1-3-5 / 2-4-6 + «другие дни» галочки) + время начала
- [ ] 🆕 Превью конца урока = `startTime` + `lessonDurationMin` (из `/api/admin/settings`), пересчёт вживую
- [ ] 🆕 Правка группы: менять день/время/ментора (`days`+`startTime` вместе)
- [ ] Group Detail: состав, ментор, add/remove студента
- [ ] Отчёты по филиалу из `/api/admin/dashboard`

### 9.3 Hamidula — Расходы + Чат + Платежи (⏳)

> Готовое сейчас — **расходы** и **чат**. Платежи бэком ещё НЕ подняты — начинай с расходов+чата.

#### Страницы

- **Expenses** (`/admin/expenses`): таблица расходов + «+ Add Expense», шапка Доход − Расход = Прибыль
- **Chat** (`/admin/chat`): список комнат (global staff/parents) + тред, parent-директ, онлайн-индикаторы
- **Payments** (`/admin/payments`): ⏳ бэк не готов — верстай UI, подключишь когда Карис выкатит

#### API (расходы — готово)

- `GET /api/admin/expenses?page&limit&from&to`
- `POST /api/admin/expenses` `{ category, amount, spentAt?, note? }` → `201`
- `DELETE /api/admin/expenses/:id`

#### API (чат — готово)

- `GET /api/chat/:roomKey/messages` + сокеты `chat:global:*`, `chat:parent:*`

#### API (платежи — ждём)

- `POST /api/admin/payments` (full/split), `GET /api/admin/invoices` — контракт будет позже, НЕ выдумывать пути

#### Definition of Done

- [ ] Expenses: список + добавление + удаление; расчёт прибыли из дашборда
- [ ] Чат: отправка/приём в реальном времени, история подгружается
- [ ] PaymentModal (Full/Split) свёрстан; split-валидация не даёт отправить кривую сумму

---

## 10. Mentor — Sardor, Kozim, Alish

**Панель:** Mentor (преподаватель)
**Backend:** Abdulaziz, AB-MENTOR — ✅ готов и оттестирован

> Скоуп «свои группы» бэк ставит по токену. Чужая группа → 404. Guard `allow={['mentor']}`.

### 10.1 Sardor — Каркас + Дашборд + Davomat

#### Страницы

- **MentorLayout**: сайдбар (Dashboard, Attendance, Homework, Tests, Coins, Salary, Chat), topbar, профиль, логаут
- **Dashboard** (`/mentor`): карточки моих групп, быстрые стат (студенты, ДЗ на проверку, зарплата)
- **Attendance** (`/mentor/attendance`): селектор группы, ростер, журнал (Present/Absent/Late/Excused), кнопка Save

#### API

- `GET /api/mentor/groups` → `{ data:[{ id, name, subject, monthlyPrice, schedule, room, isArchived, students }] }`
- `GET /api/mentor/groups/:groupId/students` → `{ data:[{ id, firstName, lastName, status, coinBalance, joinedAt }] }`
- `POST /api/mentor/attendance/groups/:groupId` — `{ lessonDate:"YYYY-MM-DD", records:[{ studentId, status, comment? }] }`
- `GET /api/mentor/attendance/groups/:groupId?date=YYYY-MM-DD` (или `?from=&to=`)

#### Definition of Done

- [ ] Layout + сайдбар + guard
- [ ] Дашборд с моими группами (реальные данные)
- [ ] Селектор группы + ростер; журнал davomat сохраняет/читает
- [ ] Архивная группа → отметки заблокированы (403)

### 10.2 Kozim — Домашки + Коины

#### Страницы

- **Homework** (`/mentor/homework`): две вкладки — Assignments (создать ДЗ: заголовок, описание, дедлайн, вложение, maxScore, coinReward) + Grading queue (оценка сдач, идемпотентность)
- **Coins** (`/mentor/coins`): начислить/списать коины с обязательной причиной, лог истории

#### API

- `POST /api/mentor/homework/groups/:groupId` — `{ title, description?, attachmentKey?, maxScore, coinReward, deadline }`
- `GET /api/mentor/homework/groups/:groupId` · `GET /api/mentor/homework/:homeworkId/submissions`
- `POST /api/mentor/homework/submissions/:submissionId/grade` — `{ score }` (награда коинами автоматически)
- `POST /api/mentor/coins` — `{ studentId, amount, reason }` (amount > 0 начислить / < 0 списать)
- `GET /api/mentor/coins/students/:studentId?page&limit`

#### Definition of Done

- [ ] Создание ДЗ с вложением (presigned upload)
- [ ] Очередь проверки: оценка, статус обновляется; повтор → 409 обработан
- [ ] Начисление/списание коинов с причиной, история отображается

### 10.3 Alish — Тесты + Зарплата + Чат

#### Страницы

- **Tests** (`/mentor/tests`): селектор группы, конструктор теста (вопросы + варианты + правильный индекс), расписание (durationMin, startsAt, endsAt, coinReward), список тестов со статусом
- **Salary** (`/mentor/salary`): карточка зарплаты (base + bonus = total), подсказка по выручке групп
- **Chat** (`/mentor/chat`): global staff/parents + parent-директ, онлайн-индикаторы

#### API

- `POST /api/mentor/tests/groups/:groupId` — `{ title, questions:[{q,options,correct}], durationMin, startsAt?, endsAt?, coinReward }`
- `GET /api/mentor/tests/groups/:groupId` · `GET /api/mentor/tests/:testId/results`
- `GET /api/mentor/salary/mentors/:mentorId/suggestion?month=YYYY-MM`
- `GET /api/mentor/salary/mentors/:mentorId?year=YYYY`
- `GET /api/chat/:roomKey/messages` + сокеты

#### Definition of Done

- [ ] Конструктор тестов создаёт тест с вопросами и расписанием
- [ ] Результаты студентов видны после прохождения
- [ ] Карточка зарплаты + подсказка по выручке групп
- [ ] Чат работает в реальном времени

---

## 11. Methodist — Said Islom & Aziz (Tech Lead)

**Панель:** Methodist (методист: контент, тесты, ДЗ, аналитика)
**Backend:** Abdulaziz, AB-METHODIST — ✅ готов

> Methodist отвечает за создание и управление учебным контентом. Guard `allow={['methodist']}`.
> Разработка ведется в ветке `save-zone` во `frontend/staff/src/pages/methodist`.

### Распределение задач

#### 👤 Said Islom (Визуализация, UI/UX и Адаптивность)
- [ ] **Премиальный UI/UX**: Привести все страницы методиста к единой дизайн-системе (цвета `#1D2417`, `#C6FF34`, `#F6FBEA`, шрифты Manrope).
- [ ] **Диаграммы в аналитике**: Нарисовать красивые интерактивные SVG-графики успеваемости на странице `Analytics.jsx`.
- [ ] **Заглушки и Ошибки**: Реализовать Skeleton-загрузчики, EmptyState (пустые списки) и Error-компоненты с кнопкой перезагрузки на всех экранах методиста.
- [ ] **Мобильная адаптация**: Адаптировать сетки под экраны 1280px / 768px / 375px без горизонтального скролла.

#### 👤 Said Islom (Требования практических заданий) — фронт-мок ✅
- [x] **Обязательные требования (rubrics)**: Для практических уроков вместо формы вопросов — блок «Обязательные требования» (текст + баллы, inline-строки, кнопка «Сохранить»). В списке уроков счётчик `requirements_count`, в копировании урока требования переносятся.
- ⚠️ **API-контракт (нужен Karis на реальном бэкенде):**
  - `GET /methodist/lessons/:id/requirements` → `[{ id, lesson_id, text, points, sort_order }]`
  - `POST /methodist/requirements` `{ lessonId, text, points }`
  - `PATCH /methodist/requirements/:id` `{ text, points }`
  - `DELETE /methodist/requirements/:id`
  - Урок (`GET/POST`) получает поле `requirements_count`; копирование урока (`POST .../copy`) переносит и требования.

#### 👤 Aziz & Джава (Бизнес-логика, Редакторы и API)
- [x] **Медиа-материалы**: Добавить поле «Видео-урок» (ссылки на YouTube/S3) в форму создания/редактирования уроков.
- [x] **Загрузка ДЗ**: Реализовать привязку файлов (PDF, Архивы) к практическим урокам через S3-хранилище (presigned URLs).
- [x] **Копирование уроков**: Реализовать функционал дублирования уроков между темами (`api.methodistCopyLesson`).
- [x] **Редактор тестов**: Добавить сортировку вопросов в конструкторе (`LessonEditor.jsx`) стрелками вверх/вниз и настроить Zod-валидацию ответов.
- [x] **E2E Интеграция**: Настроить TanStack Query cache invalidation для всех мутаций и проверить сквозные сценарии с реальным API.

---

## 13. Общие правила координации

| Правило | Детали |
|---------|--------|
| **Чужие файлы не трогаем** | Нужна правка у соседа → TODO-комментарий + сообщить |
| **Коины** | Только через `changeCoins()` (Abdulaziz). Никаких прямых UPDATE |
| **Деньги** | `invoices`, `transactions`, `expenses`, биллинг — только Karis. Остальные — SELECT |
| **Уведомления** | Только `notificationQueue.add()`. Никаких прямых TG/SMTP из HTTP |
| **Git** | Один репо, свои ветки (`karis/*`, `abdulaziz/*`), мерж в `main` через ревью |
| **Коммиты** | На английском |
| **API-контракты** | Если эндпоинта ещё нет — согласуй с бэком до реализации, не выдумывай |
| **Общая БД** | Postgres/Redis общие — не гоняй `migrate`/`seed` сам |

---

## 14. MVP Roadmap

| Фаза | Версия | Что входит |
|------|--------|-----------|
| **MVP 1** | `v1.0` | Все панели + Methodist + Student + Parent + Безопасные платежи (нақт + карта) |
| **MVP 2** | `v2.0` | UI Upgrade + Тутор тизими + Омега (кучайтириш) |
| **MVP 3** | `v3.0` | Кўп турли толлов (Click, Payme, UzCard, Humo) + Face ID кириш тизими |

> При входе в проект спроси: "Над какой фазой работаем?" (v1.0/v2.0/v3.0)

### Детали MVP 1 (v1.0)

- **Landing Page** — ✅ Готово
- **Auth** — ✅ Готово (email/код + пароль, Google OAuth)
- **Main Admin** — ✅ Готово (дашборд, заявки, онбординг)
- **CEO** — ✅ Готово (филиалы, админы, дашборд)
- **Admin** — ✅ Готово (дашборд, расходы, студенты, группы)
- **Mentor** — ✅ Готово (ДЗ, тесты, коины, посещаемость)
- **Student** — ✅ Готово (тесты, ДЗ, видео, магазин)
- **Parent** — ✅ Готово (обзор ребёнка)
- **Methodist** — ✅ Готово (контент, аналитика)
- **💳 Платежи** — 🔥 В работе: нақт + карта, invoice, split

### Детали MVP 2 (v2.0)

- **UI** — Полный редизайн по новым стандартам
- **Тутор** — Тутор тизими: репетиторство, индивидуальные занятия
- **Омега** — Кучайтириш: расширенная функциональность

### Детали MVP 3 (v3.0)

- **Толлов тизими** — Кўп турли: Click, Payme, UzCard, Humo
- **Face ID** — Твommниг кириш тизими (биометрия)
- **Мобилка** — PWA / React Native приложение

---

## 15. Запуск (отдельные приложения)

```bash
# Лендинг
cd frontend/landing-page && npm run dev

# Auth (общий)
cd frontend/auth && npm run dev

# Main Admin
cd frontend/main-admin && npm run dev

# Staff (Admin + CEO + Mentor + Methodist)
cd frontend/staff && npm run dev
```

---

## 16. Тестовые аккаунты

| Роль | Email / Код | Пароль |
|------|-------------|--------|
| Main Admin | hp8187081014laptop@gmail.com | azizbek_10.3 |
| CEO | azizbekamangeldiev.2010@gmail.com | (создаётся при онбординге) |
| Student | demostud | 123456 |
| Parent | demopare | 654321 |
| Mentor | mentor.demo@levelup.local | ChangeMe123! |
