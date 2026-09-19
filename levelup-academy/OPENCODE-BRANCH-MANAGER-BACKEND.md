# Задача: реальный backend для роли `branch_manager`

## Контекст

Проект LevelUp Academy (Node/Express + PostgreSQL/Neon, React/Vite фронт). Один
из фронтендеров (kozim) сделал **полностью статичную** демо-панель
"Branch Manager" — `frontend/staff/src/pages/branch-manager/` (Dashboard,
Income, Expenses, Reports, Branch). Все данные захардкожены в
`frontend/staff/src/pages/branch-manager/_data.js`, реальных API-вызовов нет.
Роли `branch_manager` в backend нет вообще.

Задача: сделать эту роль **настоящей** — с логикой, аналогичной уже
существующей роли `admin` (`backend/src/modules/admin/`), но с более полной
информацией именно о своём филиале, и подключить фронт к реальному API вместо
моков.

**Прочитай `CLAUDE.md` в корне репозитория целиком до начала работы** — там
описаны архитектурные правила проекта (multi-tenancy, soft-delete, финансы) и
жёсткое разделение Frontend/Backend по участникам команды. Ты сейчас работаешь
и в backend, и в frontend одновременно — это нормально только потому, что
задачу ставит Team Lead (владелец репозитория), в остальных случаях так
делать нельзя.

## Карта директорий — что уже есть и что создать

Прочитай эту карту внимательно, прежде чем открывать хоть один файл — часто
уточняется, чего именно НЕ нужно трогать.

```
backend/
├── src/
│   ├── app.js                         ← ПРАВИТЬ: зарегистрировать новый роутер (см. 2.4)
│   ├── middlewares/
│   │   ├── authenticate.js            ← НЕ трогать (уже универсален: role/orgId/branchId из JWT)
│   │   └── authorize.js               ← НЕ трогать (ветка else уже покрывает branch_manager)
│   ├── db/migrations/
│   │   └── XXXXXXXXXXXXX_add-branch-manager-role.js   ← СОЗДАТЬ (см. 1.1, timestamp больше
│   │                                     максимального существующего файла в этой папке)
│   └── modules/
│       ├── admin/
│       │   ├── admin.service.js       ← ЧИТАТЬ и переиспользовать функции напрямую (2.1)
│       │   ├── admin.repository.js    ← ЧИТАТЬ для стиля SQL-запросов, НЕ менять
│       │   ├── payments/              ← ЧИТАТЬ — источник для /branch-manager/income
│       │   └── reports/
│       │       └── reports.repository.js  ← ЧИТАТЬ — источник для /branch-manager/reports
│       ├── super/
│       │   ├── super.repository.js    ← ЧИТАТЬ (паттерн создания admin), СТРОГО НЕ менять
│       │   │                             существующие `role = 'admin'` запросы — только
│       │   │                             добавлять новые функции рядом
│       │   ├── super.service.js       ← ДОБАВИТЬ: createBranchManager, listBranchManagers
│       │   ├── super.controller.js    ← ДОБАВИТЬ: обработчики для новых роутов
│       │   ├── super.routes.js        ← ДОБАВИТЬ: POST/GET /branch-managers
│       │   └── super.schemas.js       ← ДОБАВИТЬ: zod-схему для создания (копия схемы admin)
│       └── branch-manager/            ← СОЗДАТЬ ВЕСЬ МОДУЛЬ С НУЛЯ
│           ├── branch-manager.routes.js
│           ├── branch-manager.controller.js
│           ├── branch-manager.service.js
│           ├── branch-manager.repository.js   (только если понадобится — часть логики
│           │                                    реэкспортируется из admin, см. 2.1)
│           └── branch-manager.schemas.js       (если нужна валидация query-параметров)

frontend/staff/src/
├── api.js                             ← ПРАВИТЬ: добавить branchManagerX функции (4.1) +
│                                          superCreateBranchManager (3.1) + убрать/оставить
│                                          MOCK_ACCOUNTS запись (4.4)
├── queries.js                         ← ПРАВИТЬ: React Query хуки (4.2)
├── pages/
│   ├── admin/                         ← ЧИТАТЬ для конвенций (loading/error UI), НЕ менять
│   ├── super/
│   │   ├── Admins.jsx                 ← ПРАВИТЬ: AddStaffButton — 2 новых пункта (3.2, 3.5)
│   │   └── BranchDetail.jsx           ← ЧИТАТЬ для контекста, менять не обязательно
│   └── branch-manager/                ← УЖЕ СУЩЕСТВУЕТ (только что перенесена из
│       ├── Dashboard.jsx                 pages/admin/branch-manager/ — если увидишь
│       ├── Income.jsx                    старый путь где-то ещё, это баг, сообщи)
│       ├── Expenses.jsx               ← ПРАВИТЬ все 5 файлов: заменить импорт из _data.js
│       ├── Reports.jsx                   на реальные хуки (4.3)
│       ├── Branch.jsx
│       ├── _ui.jsx                    ← ЧИТАТЬ, компоненты переиспользуются как есть
│       └── _data.js                   ← УДАЛИТЬ последним шагом, когда все 5 страниц
│                                          перестанут на него ссылаться
```

Всё, что помечено «НЕ трогать» / «СТРОГО НЕ менять» — критично: там либо уже
правильно реализован скоуп multi-tenancy, либо это код других участников
команды (правило проекта — не затирать чужую работу молча).

---

## ⚠️ Критично — прочитать перед любым запуском

- **НЕ поднимай Docker** (`docker-compose.yml` в `backend/` — не нужен,
  контейнеры будут простаивать).
- **Локальный backend смотрит в БОЕВУЮ базу Neon**, не в локальную/докер-базу
  (см. `backend/.env` — `DATABASE_URL` указывает на облако). Значит:
  - **НЕ запускай `npm run seed`** — упадёт демо-данные в прод (хотя с
    04.08.2026 `seed.js` сам отказывается работать с нелокальной базой — не
    полагайся на это).
  - **НЕ запускай `npm run dev` / `npm start`** без явной необходимости
    вручную проверить руками — это реальный запрос к боевой БД. Если нужно
    проверить код — используй `node --check файл.js` (только синтаксис, без
    выполнения) и `npm run build` на фронтах.
  - Миграции (`npm run migrate`) применяются к БД, на которую указывает
    `DATABASE_URL` — прежде чем гонять, проверь, что это действительно то,
    что нужно (спроси пользователя, если не уверен).
- Коммиты — на английском (`feat:`/`fix:`/`refactor:`), формат как в
  остальной истории репозитория (`git log --oneline -20` для примера).
- Работай в ветке `save-zone`, не в `main`.

---

## Часть 1 — Backend: роль и скоуп

### 1.1 Миграция: добавить `branch_manager` в enum `user_role`

Смотри готовый шаблон — `backend/src/db/migrations/1783572000000_add-methodist-role.js`.
Сделай новый файл с таким же паттерном (имя файла с timestamp больше текущего
максимального в `backend/src/db/migrations/`):

```js
export const up = (pgm) => {
  pgm.noTransaction(); // ADD VALUE нельзя в той же транзакции, где потом используется
  pgm.sql(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'branch_manager'`);
};

export const down = (pgm) => {
  // см. down() в add-methodist-role.js — пересоздание типа с явным списком значений
};
```

**Constraint `chk_users_branch_scope` трогать НЕ надо** — он уже
`CHECK (role IN ('main_admin','ceo') OR branch_id IS NOT NULL)`, а
`branch_manager`, как и `admin`, ОБЯЗАН иметь `branch_id` — новая роль уже
проходит существующее условие.

### 1.2 Разрешить логин: `backend/src/modules/auth/auth.controller.js`

Строка ~43:
```js
staff: ['admin', 'ceo', 'mentor', 'methodist'],
```
→ добавить `'branch_manager'` в этот массив. Вход у branch_manager — как у
admin: email + пароль, через `POST /api/auth/staff/login`.

### 1.3 Scope-мидлварь — `backend/src/middlewares/authorize.js`

**Менять НЕ НАДО.** Прочитай комментарий в файле — там уже написано:
> остальные → жёстко свой organizationId + branchId из токена

`branch_manager` попадает в ветку `else` автоматически, ровно как `admin`.
`req.scope = { organizationId, branchId }` будет проставляться сам.

---

## Часть 2 — Backend: новый модуль `backend/src/modules/branch-manager/`

Структура — 1:1 с `backend/src/modules/admin/` (routes/controller/service/
repository/schemas), но **тоньше**: это read-heavy панель для просмотра
финансов и данных своего филиала, полноценного CRUD над студентами/группами/
менторами (как у admin) НЕ требуется — этого нет даже в статичном
UI-прототипе.

### 2.1 Правило: не дублировать SQL — переиспользовать сервис admin, где возможно

`backend/src/modules/admin/admin.service.js` уже написан как чистые функции
`fn(branchId, ...)`, не завязанные на `req` напрямую (смотри `dashboard`,
`listExpenses`) — их можно **импортировать и вызывать напрямую** из нового
модуля вместо копирования SQL. Это не только меньше кода — это гарантия, что
цифры на панели branch_manager и на панели admin для одного филиала совпадают
1-в-1 (не разъедутся при будущих правках).

```js
// backend/src/modules/branch-manager/branch-manager.service.js
import * as adminService from '../admin/admin.service.js';

export async function dashboard(branchId) {
  return adminService.dashboard(branchId); // тот же расчёт totals/thisMonth
}

export async function listExpenses(branchId, query) {
  return adminService.listExpenses(branchId, query); // пагинация уже внутри
}
```

Проверь сигнатуры сам (`grep -n "^export" backend/src/modules/admin/admin.service.js`)
перед реэкспортом — не все функции обязательно принимают ровно такие
аргументы, приведённые тут для ориентира могут отличаться в деталях.

### 2.2 Эндпоинты — соответствие статичным страницам фронта

Смотри реальную форму данных, которую сейчас рисует mock —
`frontend/staff/src/pages/branch-manager/_data.js` (`BRANCH`, `MONTHS`,
`PAYMENTS`, `EXPENSES`, `MONTHLY_SUMMARY`) — API должно возвращать данные в
форме, которую легко замапить на то же самое, чтобы не переписывать разметку
страниц с нуля.

| Роут | Что отдаёт | Источник в backend |
|---|---|---|
| `GET /api/branch-manager/dashboard` | totals + thisMonth (как у admin) | `adminService.dashboard(branchId)` напрямую |
| `GET /api/branch-manager/branch` | **полная карточка своего филиала**: name, address, phone, email, telegram, workHours, founded, coords, manager {firstName,lastName,phone}, stats {students, groups, staff, debt} | НОВЫЙ запрос — см. 2.3 |
| `GET /api/branch-manager/income?month=YYYY-MM` | список оплат филиала за месяц (studentName, group, amount, method, status, date) + суммарно по месяцу | K-PAY: `backend/src/modules/admin/payments/` — смотри, что там уже есть для listInvoices/listTransactions с фильтром branchId, переиспользуй; если готовой read-функции нет — новый repository-запрос по образцу |
| `GET /api/branch-manager/expenses?month=YYYY-MM&category=` | список расходов + суммарно | `adminService.listExpenses(branchId, query)` напрямую (эндпоинт уже поддерживает `from`/`to`, category-фильтр может потребовать добавить) |
| `GET /api/branch-manager/reports?range=6m` | месячная серия `{key, label, income, expenses, profit}` за N месяцев — то, что рисует `MONTHLY_SUMMARY` | смотри `backend/src/modules/admin/reports/reports.repository.js` — там уже есть похожая агрегация (`COALESCE(d.debt,0) AS debt` и т.п.), скорее всего можно переиспользовать или чуть расширить под helyearly-разрез |

Никаких POST/PATCH/DELETE на этом этапе не нужно — в статичном UI их нет
(проверено: `Income.jsx`/`Expenses.jsx` — только фильтры, без форм создания).
Если решишь, что стоит сразу дать создание расхода — уточни у пользователя,
не добавляй самовольно.

### 2.3 "Больше данных про филиал" — что именно добавить в `/branch`

Пользователь явно просил, чтобы у branch_manager была **более полная**
картинка филиала, чем видит обычный admin. У admin сейчас нет отдельного
эндпоинта "инфо о своём филиале" вообще (branch — это епархия CEO,
`backend/src/modules/super/`). Смотри `super.repository.js` — там уже есть
запрос на детальную карточку филиала (адрес, координаты, счётчики
студентов/групп/админов) для CEO; переиспользуй ту же SQL-логику,
но:
- ограничь её ОДНИМ филиалом — `req.scope.branchId` (а не списком по
  organizationId, как у Super);
- НЕ давай возможность редактировать (PATCH/DELETE) — это остаётся зоной
  CEO, branch_manager только читает.

### 2.4 Регистрация роутера

`backend/src/app.js`, после строки с `adminRoutes` (~155):
```js
import branchManagerRoutes from './modules/branch-manager/branch-manager.routes.js';
...
app.use('/api/branch-manager', branchManagerRoutes); // BRANCH MANAGER: дашборд/доход/расход/отчёты/карточка своего филиала
```

`branch-manager.routes.js` — `router.use(authenticate, authorize('branch_manager'))`,
как у admin. OpenAPI JSDoc-комментарии над роутами — по тому же формату, что
в `admin.routes.js` (используются для `/api/docs`).

---

## Часть 3 — CEO: кнопка «Добавить Branch-менеджера» (backend + frontend, ОБЯЗАТЕЛЬНО, должно реально работать)

**Это критично — без этого роль нерабочая**, некому будет логиниться.
Не опция, не «если останется время» — обязательная часть задачи, довести до
полностью рабочего состояния end-to-end (создал в UI → реально появился в
базе → реально может залогиниться).

### 3.1 Backend

Сейчас `backend/src/modules/super/super.repository.js` жёстко фильтрует
`role = 'admin'` буквально везде (создание, список, детали, обновление,
удаление — `grep -n "role = 'admin'" backend/src/modules/super/super.repository.js`
покажет ~8 мест). Их менять/обобщать **не надо** (это чужой рабочий код,
трогать по минимуму), вместо этого — добавь **параллельный** небольшой набор
функций/эндпоинтов специально под branch_manager, по тому же паттерну
(смотри `super.controller.js` / `super.service.js` / `super.repository.js`
как создаётся admin — `VALUES ($1, $2, 'admin', $3, $4, $5, $6, $7)` в
repository — скопируй этот путь один в один, поменяв только роль и убрав то,
что специфично для admin):

- `POST /api/super/branch-managers` — создать (email, пароль генерируется
  сервером так же, как у admin, firstName/lastName/phone, branchId) →
  `role: 'branch_manager'`. Ответ — как у `superCreateAdmin`: временный
  пароль в открытом виде один раз (для показа в UI, см. `TempPasswordModal`
  в `Admins.jsx`).
- `GET /api/super/branch-managers?branchId=` — список.

`PATCH`/`DELETE`/freeze — по аналогии с admin, но можно вторым шагом; для
первой версии обязательны только create + list, этого достаточно, чтобы
кнопка реально работала.

### 3.2 Frontend — где именно добавить кнопку

Файл `frontend/staff/src/pages/super/Admins.jsx` — там уже есть готовый
паттерн именно под это: компонент `AddStaffButton` (строки ~193-215) —
кнопка "Добавить" с выпадающим списком ролей:

```js
// СЕЙЧАС (строки ~206-212):
{(close) => (
  <>
    <DropdownItem onClick={() => { onPick('admin'); close(); }}>Администратора</DropdownItem>
    <DropdownItem onClick={() => { onPick('methodist'); close(); }}>Методиста</DropdownItem>
  </>
)}
```

Добавь **третий** пункт в этот же список — `onPick('branch_manager')` →
"Branch-менеджера". `onPick` — это `openCreate` (строка ~261 в файле),
принимает `role` и открывает `formModal` — расширь его так, чтобы для
`role === 'branch_manager'` форма отправляла запрос на
`api.superCreateBranchManager` (новую функцию в `api.js`, симметрично
`superCreateAdmin`, ищи по `grep -n "superCreateAdmin" frontend/staff/src/api.js`)
вместо `api.superCreateAdmin`. Поля формы (email/firstName/lastName/phone/branch)
— переиспользуй ту же форму, что уже рисуется для admin (`formModal.role`
уже используется в JSX для переключения заголовка/полей — расширь этот
switch третьим случаем, не переписывай форму с нуля).

---

## Часть 3.5 — CEO: кнопка «Финанс-менеджер» — ТОЛЬКО UI-заглушка, backend НЕ делать

Пользователь также хочет **четвёртый** пункт в том же выпадающем списке —
"Финанс-менеджера" ("Финанс" / "Молия"). **Это НЕ функция, а видимость
будущей функции** — роли `finance` НЕТ и быть не должно в этой задаче: ни в
enum `user_role`, ни в БД, ни в backend вообще. Ничего не создавай под неё
на бэкенде.

Реализация — чисто фронтенд, в том же `AddStaffButton`:

```js
<DropdownItem onClick={() => { onPick('branch_manager'); close(); }}>Branch-менеджера</DropdownItem>
<DropdownItem onClick={() => { close(); alert('Скоро — функция в разработке'); }}>Финанс-менеджера</DropdownItem>
```

То есть клик по "Финанс-менеджера" **не должен** открывать `formModal` и не
должен идти ни в один API — только показать сообщение "Скоро" (можно
`alert(...)`, это уже принятый в проекте паттерн для быстрой обратной связи
— смотри `toggleArchive`/`toggleFreeze` в других admin-страницах, там та же
идиома `catch (e) { alert(e.message || 'Ошибка'); }`; здесь по смыслу ближе
к «функция ещё не готова», не к ошибке — но механика показа та же
`alert()`). Не подключай эту кнопку ни к какой форме, ни к какому запросу.

Если в проекте по ходу работы найдётся более подходящий, уже существующий
UI-компонент для "мягкого" уведомления (не голый `alert`, а что-то вроде
тоста/баннера) — используй его вместо `alert`, только если он реально уже
есть и используется в других местах кода (не создавай новый компонент ради
одной кнопки). Поиск: `grep -rn "toast\|Toast\|Notice\|ComingSoon" frontend/staff/src/`.

---

## Часть 4 — Frontend: подключить статичные страницы к реальному API

Файлы: `frontend/staff/src/pages/branch-manager/{Dashboard,Income,Expenses,Reports,Branch}.jsx`
+ `_ui.jsx` (компоненты). `_data.js` — удалить после того, как все страницы
перейдут на реальные данные (пока хоть одна страница на него ссылается — не
трогай).

### 4.1 `frontend/staff/src/api.js`

Добавь функции по образцу существующих `adminX` (grep `adminCreateGroup` в
файле — рядом с ним весь паттерн `request(url, {method, token, body})`):

```js
branchManagerDashboard: (token) => request('/branch-manager/dashboard', { token }),
branchManagerInfo: (token) => request('/branch-manager/branch', { token }),
branchManagerIncome: (token, month) => request(`/branch-manager/income?month=${month}`, { token }),
branchManagerExpenses: (token, month, category) => request(`/branch-manager/expenses?...`, { token }),
branchManagerReports: (token, range) => request(`/branch-manager/reports?range=${range}`, { token }),
```

### 4.2 `frontend/staff/src/queries.js`

React Query хуки по образцу `useAdminGroups`/`useAdminStudents` (тот же
`useQuery`/`queryKey`/`enabled` паттерн).

### 4.3 Сами страницы

В каждой странице замени импорт из `./_data.js` на соответствующий хук, добавь
`isLoading`/`error` состояния (смотри, как это сделано в `pages/admin/*.jsx` —
паттерн одинаковый везде в проекте: `RowSkeleton` на загрузке, `alert
alert-error` на ошибке).

### 4.4 Убрать mock-заглушку логина

`frontend/staff/src/api.js`, строки ~528-537 — блок `MOCK_ACCOUNTS` с
комментарием "Branch Manager — только mock-режим: backend-роли пока нет".
После того, как роль реально заведена в БД — этот аккаунт (`kozim.manager@gmail.com`)
либо убрать из mock-списка совсем (раз теперь есть настоящий бэкенд), либо
оставить только для `VITE_USE_MOCKS=true` режима разработки без интернета —
реши по контексту остального файла (как там устроены другие mock-аккаунты).

---

## Часть 5 — Проверка (без обращения к боевой БД руками)

1. `node --check <файл>.js` — на каждый новый/изменённый backend-файл.
2. `cd frontend/staff && npm run build` — фронт должен собираться без ошибок.
3. Прочитай итоговые файлы целиком ещё раз перед коммитом — особенно
   `authorize.js` (что НЕ менялся), `chk_users_branch_scope` (что НЕ
   менялся), и что во всех новых SQL-запросах фильтр по `branch_id` есть
   ВЕЗДЕ, где он нужен (утечка данных чужого филиала — самая частая ошибка
   в multi-tenant коде).
4. Реальный сквозной прогон (логин + запросы к живой БД) — НЕ делай сам,
   оставь пользователю проверить вручную, когда он сам решит.

## Часть 6 — Коммит

Не пуш и не коммить в `main`. Коммить в `save-zone` небольшими логическими
коммитами (миграция отдельно, backend-модуль отдельно, super-эндпоинты
отдельно, фронт отдельно) — англ. сообщения в стиле `feat(branch-manager): ...`.
Финальный пуш в `save-zone` — только после подтверждения пользователя.
