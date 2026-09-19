# Member App — Student + Parent Panel

## Overview

`frontend/member/` is a **standalone Vite + React SPA** that serves as the login gateway and personal cabinet for **Students** and **Parents**. Both cabinets live in this one app: after login, `student` is redirected to `/student` (`src/App.jsx:53`) and served from `src/student/`; Parents see the full parent panel described below.

> The separate `frontend/student/` app was deleted on 2026-08-04. Its pages had already been moved into `src/student/` here, and the standalone copy had fallen behind — it was missing `Lessons` and `LessonDetail`.

- **Dev server:** `localhost:5175`
- **Tech:** React 18, Tailwind CSS, DaisyUI, TanStack Query, react-router-dom v7
- **Auth:** Mock mode ON by default (`VITE_USE_MOCKS` not `false` in `.env`)

## Login

| Role | Login Code | Password |
|------|-----------|----------|
| Parent | `demopare` | `654321` |
| Student | `demostud` | `123456` |

- Students → redirected to `VITE_STUDENT_URL` (default `localhost:5176`)
- Parents → stay in member app at `/dashboard`

## Architecture

```
App.jsx
├── /login → Login.jsx (public)
├── / → HomeRedirect (student → external, parent → /dashboard)
└── /dashboard, /attendance, /grades, /debt, /chat, /notifications, /profile
    └── Protected → ParentLayout → ChildProvider + Layout
        └── <Outlet /> renders page components
```

### Key Wrappers

| Component | Purpose |
|-----------|---------|
| `Protected` | Redirects to `/login` if no token |
| `ChildProvider` | Child-switching context — stores selected child in `localStorage` (`parent_selected_child`) |
| `Layout` | Sidebar + header + main outlet |

## Pages (7 routes)

### 1. Dashboard (`/dashboard`)
- **KPI cards:** Coins, Debt (UZS), Rank, Attendance %
- **Attendance chart (30 days):** Present/Absent/Late/Excused counts
- **Groups list:** Subject, teacher name, subject category
- **Recent lessons table:** Group, date, status
- **Recent grades table:** Name, type (HW/Test), score, date with average %

### 2. Attendance (`/attendance`)
- **Summary ring:** Overall attendance % with status breakdown buttons
- **History table:** Date, Group, Status, Comment
- Statuses: Присутствовал, Отсутствовал, Опоздал, По уважит.

### 3. Grades (`/grades`)
- **Tabs:** Домашние задания / Тесты
- **Stats:** Total count, Average %, Best %
- **Card list:** Percentage badge, title, score (x/100 or x/10), date
- Clickable cards → detail modal (via `useHomeworkDetail` / `useTestDetail`)

### 4. Debt/Payment (`/debt`)
- **Debt summary:** Total debt in UZS, paid/waiting indicators
- **Coins card:** Earned coins count
- **Alert banner:** If debt exists, shows warning message

### 5. Chat (`/chat`)
- **Tabs:** Общий чат / От staff
- **Message list:** Avatar, name, role badge, message text, timestamp
- **Message input:** Text field + send button (disabled when empty)

### 6. Notifications (`/notifications`)
- **Unread count** in header
- **Filter tabs:** Все, Оценки, Посещаемость, Оплата (each with count badge)
- **Notification list:** Icon, title, description, timestamp
- Read/unread state per notification

### 7. Profile (`/profile`)
- **Avatar + name:** Parent name, role, login code
- **Children cards:** Each child with coins, debt status, "Выбран" badge for active child
- **Settings toggles:** Push notifications, Chat sounds
- **Logout button:** Clears tokens and redirects to `/login`

## Child Switching

The `ChildProvider` context manages which child's data is displayed:

- **Sidebar dropdown:** `<select>` with all children, bound to `selectedChild.id`
- **Profile page cards:** Click to switch active child
- **Persistence:** `localStorage` key `parent_selected_child`
- **Fallback:** If stored ID not found in children list, defaults to first child

All data-fetching hooks (`useParentOverview`) receive `childId` as parameter, so switching children triggers a refetch with the new child's ID.

## API Methods (6 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `api.loginMember(login, password)` | `POST /auth/member/login` | Login (student or parent) |
| `api.refresh()` | `POST /auth/refresh` | Refresh JWT token |
| `api.logout()` | `POST /auth/logout` | Clear session |
| `api.parentChildren(token)` | `GET /parent/children` | List parent's children |
| `api.parentOverview(token, childId)` | `GET /parent/children/:childId/overview` | Dashboard data for child |
| `api.parentHomeworkDetail(token, hwId)` | `GET /parent/homework/:hwId` | Homework detail with mistakes |
| `api.parentTestDetail(token, testId)` | `GET /parent/tests/:testId` | Test detail with answers |
| `api.chatMessages(token, roomKey)` | `GET /chat/:roomKey/messages` | Chat messages for room |
| `api.notifications(token)` | `GET /parent/notifications` | Parent notifications |

## React Query Hooks (6 hooks)

| Hook | Query Key | Fetches |
|------|-----------|---------|
| `useParentChildren()` | `['parent-children']` | Children list |
| `useParentOverview(childId)` | `['parent-overview', childId]` | Dashboard data |
| `useChatMessages(roomKey)` | `['chat-messages', roomKey]` | Chat messages |
| `useNotifications()` | `['notifications']` | Notifications list |
| `useHomeworkDetail(hwId)` | `['homework-detail', hwId]` | HW detail (lazy) |
| `useTestDetail(testId)` | `['test-detail', testId]` | Test detail (lazy) |

All hooks use `useAuthedQuery` which auto-logs-out on 401 responses.

## Mock Data

Mock mode is ON by default. Mock data includes:

- **2 children:** Диёр Собиров (350 coins, 150K debt) and Алия Собирова (120 coins, no debt)
- **Attendance:** 82% rate, 22 total sessions
- **Grades:** 4 homeworks + 3 tests with scores
- **Chat:** 3 messages in general chat
- **Notifications:** 3 notifications (grade, late, payment)
- **Overview differentiated:** Each child has separate mock overview endpoint

## File Structure

```
frontend/member/src/
├── App.jsx                 # Routes + Protected + ChildProvider wrapper
├── api.js                  # API client + mock handler (428 lines)
├── auth.jsx                # Auth context (token, user, login/logout)
├── child-context.jsx       # ChildProvider for parent child-switching
├── queries.js              # 6 React Query hooks
├── components/
│   ├── Layout.jsx          # Sidebar + header shell
│   ├── Avatar.jsx          # Initials-based avatar
│   ├── ErrorBoundary.jsx   # React error boundary
│   └── Splash.jsx          # Loading splash screen
├── pages/
│   ├── Login.jsx           # Login form
│   ├── Dashboard.jsx       # Parent overview
│   ├── Attendance.jsx      # Attendance history
│   ├── Grades.jsx          # Grades with HW/Test tabs
│   ├── Debt.jsx            # Debt summary
│   ├── Chat.jsx            # Chat interface
│   ├── Notifications.jsx   # Notification list
│   └── Profile.jsx         # Profile + settings
└── index.css               # Tailwind + DaisyUI imports
```

## Playwright Test Results (2026-07-22)

| Page | Status | Notes |
|------|--------|-------|
| Login | ✅ | Parent credentials work, redirects to /dashboard |
| Dashboard | ✅ | KPIs, attendance chart, groups, lessons, grades all render |
| Attendance | ✅ | 82% rate, 7-row history table with comments |
| Grades (HW) | ✅ | 4 homeworks, 88% avg, 95% best |
| Grades (Tests) | ✅ | 3 tests, 77% avg, 90% best |
| Debt | ✅ | 150K UZS debt, 350 coins, alert banner |
| Chat | ✅ | General chat with 3 messages, input field |
| Notifications | ✅ | 3 notifications, filter tabs with counts |
| Profile | ✅ | Parent info, 2 children cards, settings toggles, logout |
| Child switching | ✅ | Dropdown + profile cards switch active child |

All pages load without console errors. Screenshots saved to `docs/screenshots/parent-*.png`.
