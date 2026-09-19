# LevelUp Academy — Backend Tasks (деление по панелям + инфра)

> # ⚠️ ЭТОТ ФАЙЛ — ИСТОРИЧЕСКИЙ, НЕ ИСТОЧНИК ПРАВДЫ (пометка 2026-07-26)
>
> **Актуальные задачи и статусы — только в корневом `TASK.md`.** Здесь зафиксировано
> исходное деление зон между Karis и Abdulaziz (июль 2026) и решения A1–A8. Галочки
> в §4 и §5 отражают состояние на **05–07.07.2026** и с тех пор устарели: почти всё,
> что тут стоит как `[ ]`, давно написано (Main Admin, CEO, Admin, платежи,
> отчёты — см. корневой `TASK.md`).
>
> Файл держится ради §1 (модель продукта), §2 (деление зон), §6 (правила координации)
> и §7 (закрытые вопросы) — они не устарели. Статусы задач отсюда **не читать**.

> Источник правды по архитектуре: `docs/BACKEND-ARCHITECTURE.md`.
> ⚠️ Этот файл вводит **новую модель (SaaS/мульти-аренда)**, которой в том доке ещё нет — пункты помечены 🆕. Их нужно внести в архитектуру перед реализацией.
> Команда: **Karis** (@Azizbek2603) + **Abdulaziz** (@YakubovAbdulaziz) + **Bilol** (telegram-бот, см. `docs/TASK-telegram-bot.md`).
> БД: **PostgreSQL** (+ Redis, MinIO/S3).

---

## 1. Модель продукта

**LevelUp Academy — это SaaS, который мы продаём учебным центрам.** Мульти-арендность: каждый партнёр = отдельная организация (тенант).

| Роль | Кто это | Область видимости |
|---|---|---|
| **Main Admin** 🆕 | МЫ (владельцы платформы) | вся платформа: заявки с лендинга, наш доход, наши партнёры, биллинг |
| **CEO** | партнёр = учебный центр (напр. Mars IT school) | своя организация: свои филиалы, свой доход |
| **Admin** | сотрудник одного филиала | свой филиал: доход **и расход**, студенты, группы, платежи |
| **Mentor** | преподаватель | свои группы |
| **Student / Parent** | конечные пользователи | личный кабинет / свой ребёнок |

Поток онбординга: центр оставляет **заявку на лендинге** → она падает в **Main Admin** → Main Admin создаёт **CEO** (заводит организацию) → CEO сам добавляет филиалы и админов → Admin добавляет студентов/родителей.

---

## 2. Деление задач

| Karis | Abdulaziz |
|---|---|
| **Main Admin** — платформа, онбординг партнёров, биллинг, лиды | **Mentor** — davomat, ДЗ, тесты, экзамены, коины ±, зарплата |
| **CEO** — организация партнёра, CRUD филиалов, CRUD админов | **Student** — home, магазин, тесты, ДЗ, видео, лидерборд |
| **Admin** — филиал: доход **+ расход**, студенты, группы, платежи, отчёты | **Parent** — обзор ребёнка, чат |
| **Auth + Authorization** — login, JWT, refresh, SMS OTP, SMTP, RBAC (authenticate/authorize) | **Вся инфраструктура** — config, db (Postgres) pool, redis, s3, sockets, очереди, telegram-бот, scaffold, app.js/server.js |

> **Деньги:** платежи студентов (invoices/split/Nasiya) + расходы филиала (`expenses`) + биллинг партнёров — у **Karis**. Коины/магазин — у **Abdulaziz**.
> Инфраструктуру (config/db/redis/s3) настраивает Abdulaziz, но **импортируют её оба** — это общий фундамент, «владение» = кто пишет первичный сетап.

---

## 3. 🆕 Изменения архитектуры (нового нет в `BACKEND-ARCHITECTURE.md`)

- [x] **A1. `organizations`** — таблица тенантов (партнёр/учебный центр). Поля: name, owner_user_id, status, plan, created_at. *(арх-док `2091423`, init-миграция в `abdulaziz/infra`)*
- [x] **A2. `organization_id`** на `branches` (и во всех дочерних скоупах). Мульти-аренда двухуровневая: **organization → branch**. *(branches + users с CHECK по ролям — готово)*
- [x] **A3. Роль `main_admin`** в enum `user_role`, выше `ceo`. *(enum: main_admin, ceo, admin, mentor, parent, student)*
- [ ] **A4. CEO перескоупить** — видит только свою организацию (`organization_id`), не все филиалы глобально. ⚠️ затрагивает зону Abdulaziz.
- [x] **A5. `leads`** 🆕 — заявки с лендинга (name, phone, center_name, center_size, message, status: new/contacted/onboarded/rejected). *(таблица создана)*
- [x] **A6. Биллинг партнёров** 🆕 — ⛔ **ЭТА МОДЕЛЬ ОТМЕНЕНА 2026-07-16, НЕ ИСПОЛЬЗОВАТЬ.**

      **Актуально:** тарифы = бакеты по числу учеников (Free / Start / Standard / Pro /
      Business / Network) в `config/plans.js` (`TIERS` + `computeBill({ students })`),
      **филиалы бесплатны**, `GET /api/main/pricing` отдаёт `{ tiers, currency }`.
      Правка тарифов через API отключена — цифры в конфиге (DB-editable = v2).

      ~~Отменено (06.07): планы pro/max, счёт = `base + студенты*perStudent + филиалы*perBranch`.~~
      ⚠️ Именно эта строка и старая swagger-схема заставили Shohjahon'а построить
      `main-admin/Billing.jsx` на полях `baseFirstBranch`/`perStudent` — страница до сих пор
      сломана (BUG-BILLING в корневом `TASK.md`). Стёртая формула оставлена зачёркнутой
      специально, чтобы никто не восстановил её по памяти.
- [x] **A7. `expenses`** 🆕 — расходы филиала (branch_id, category, amount, spent_at, note, created_by). Admin видит доход − расход = прибыль. *(таблица создана)*
- [ ] **A8. Scope-пайплайн:** `authorize` учитывает `organizationId` + `branchId`; каждый repository-запрос фильтрует по обоим.


## 4. Задачи Karis

### K-AUTH — Auth + Authorization (моё) ✅ ЗАКРЫТО

> ⚠️ Аудит 2026-07-19: галочки здесь были протухшие — всё это давно сделано и живёт в
> `backend/src/modules/auth/`. Актуальный статус ведётся в корневом `TASK.md`, этот файл —
> исторический (задачи по нему сверены и закрыты).
> Изменение против плана: **SMS OTP отменён** (платный) → реализован **email OTP**.

- [x] `auth`: login (3 endpoint: main/staff/member, argon2id), JWT access 15м `{sub, role, orgId, branchId}`
- [x] Refresh rotation (30д httpOnly cookie, reuse → revoke всю семью), logout, frozen-check (403)
- [x] ~~SMS~~ **Email** OTP forgot/reset password (rate limit `passwordResetLimiter`, zod-валидация) + SMTP (письма OTP/смена пароля).
      ⚠️ Бэкенд готов, но **фронта у этого нет** — см. `AUTH-FORGOT` в корневом `TASK.md`
- [x] `authenticate` + `authorize` middlewares (RBAC + org+branch scope, A8)
- [x] Google OAuth (Firebase) для main_admin

### K-MAIN — Main Admin (платформа)

> ⚠️ Галочки ниже — на 07.07.2026. Сверено с кодом 2026-07-26: всё, кроме управления
> партнёрами, закрыто. Актуальный статус — корневой `TASK.md`.

- [x] Приём заявки с лендинга: публичный endpoint формы → `leads` *(готово, `POST /api/leads`)*
- [x] Панель заявок: список лидов, смена статуса, заметки *(`GET /main/leads`, `PATCH /main/leads/:id`)*
- [x] Онбординг партнёра: `POST /api/main/partners` — создать `organization` (план+домен) + `ceo` (temp-пароль). Проверено вживую. *(модуль `modules/main`, миграция `1752000000000_org-billing`)*
- [x] Платформенный дашборд (базовый): `GET /api/main/dashboard` — наш доход (сумма счетов), партнёры, студенты, филиалы. `GET /api/main/partners` — список с счётом каждого.
- [x] Биллинг: `config/plans.js` (pro/max, base+perStudent+perBranch, лимиты) + `monthlyBill()`. Цифры-плейсхолдеры.
- [ ] Прибыль партнёра в дашборде (доход−расход) — ждёт платежи (K-ADMIN)
- [ ] Управление партнёрами: заморозка/активация, смена плана

### K-SUPER — CEO (организация партнёра) ✅ закрыто (сверено 2026-07-26)
- [x] Дашборд организации (свой доход, scope = свой `organization_id`) — `GET /api/super/dashboard`
- [x] CRUD филиалов; CRUD админов; отчёты по организации — `super.routes.js` (branches, admins,
      methodists, `GET /super/reports`, `GET /super/stats`)

### K-ADMIN — Admin (филиал) ✅ закрыто (сверено 2026-07-26)
- [x] Дашборд филиала: **доход + расход = прибыль**
- [x] Расходы 🆕: CRUD `expenses` (+ `PATCH /admin/expenses/:id`, `admin.routes.js:223`)
- [x] Студенты филиала (CRUD, заморозка); группы (CRUD, привязка ментора)
- [x] Платежи: full + split (валидация суммы до BEGIN, FOR UPDATE, split_batch_id, джоб после commit); refund/void; чеки в S3. **Nasiya/рассрочка УБРАНА из v1** (решение 05–07.07) — долги через `total_debt`
- [x] Отчёты филиала (выручка, долги по группам) — `GET /api/admin/reports`

### K-TEST — проверка (моё)
- [x] Интеграционные тесты денег (full/split — БЕЗ Nasiya) и auth-флоу (login→refresh→reuse-detect→OTP)
      — переданы Abdulaziz'у и написаны (`tests/payments/`, `tests/auth/`).
      ⚠️ Последний зафиксированный прогон — 2026-07-19 (66 тестов зелёные, 5 наборов).
      **2026-07-26 прогнать не удалось — Docker не запущен**, база недоступна. Это не «зелёные»,
      это «не проверено сегодня»

---

## 5. Задачи Abdulaziz

### AB-INFRA — вся инфраструктура ✅ (ветка `abdulaziz/infra`, 05.07.2026)
- [x] Scaffold: npm init (ES Modules), структура по `docs` §2, deps, `docker-compose.yml` (Postgres 16, Redis 7, MinIO, Mailpit), `.env.example`
- [x] `config/`: env(zod fail-fast), **db (Postgres) pool**, redis(main/pub/sub), s3(presigned helpers), mailer, sms, logger
- [x] `utils/` (AppError, asyncHandler, pagination) + middlewares: validate(zod), rateLimiter, archiveGuard, errorHandler
- [x] `app.js` + `server.js`: helmet/cors/json/pino-http, монтирование роутов, errorHandler последним, graceful shutdown
- [x] Миграции (node-pg-migrate): весь DDL §3 + новые A1/A2/A3/A5/A7 (init-миграция; дальше каждый свои таблицы — см. §7.1)
- [x] Sockets: init (redis-adapter, socketAuth от auth Karis), presence, chat-транспорт
- [x] Очереди: notification.queue + notification.worker (payment.received, debt.overdue, coins.changed, homework.due), overdue cron 09:00, worker.js entrypoint
- [x] Telegram-бот (grammY): инстанс `bot` для notification.worker. **Дальнейшее — зона Bilol** (`docs/TASK-telegram-bot.md`): /start + link-code, напоминания об оплате до срока, объявления родителям

### AB-MENTOR — Mentor ✅ (ветка `abdulaziz/modules`, 05.07.2026)
- [x] Davomat (UNIQUE group×student×date, bulk-upsert); проверка ДЗ (0–max + coin_reward, идемпотентно); конструктор тестов (questions JSONB, correct скрыт); экзамен с таймером (сабмит после дедлайна → 409); коины ± через `changeCoins()`; зарплата ментора (`mentor_salaries`). *Тесты: 16/16 PASS (`tests/mentor/`).*
- [x] **Ручное начисление коинов** `POST /api/mentor/coins` `{ studentId, amount, reason }` (+/− через `changeCoins`, скоуп: ментор → свои группы, admin → филиал) + история `GET /api/mentor/coins/students/:studentId`. *(07.07 — закрывает потребность фронта Kozim; проверено вживую 12/12.)*
- [x] **Read-обзор групп ментора** `GET /api/mentor/groups` + `GET /api/mentor/groups/:groupId/students` (ростер) — для дашборда/селекторов/журнала. *(07.07.)*
- ⚠️ Модель расчёта зарплаты не финализирована (fixed / % от выручки / за студента) — согласовать с тимлидом; сейчас `base_amount` вручную + suggestion из групп.

### AB-STUDENT — Student ✅ (ветка `abdulaziz/modules`, 05.07.2026)
- [x] Home (коины/долг/рейтинг/группы/дедлайны); магазин (цена фиксируется, `FOR UPDATE`, откат при нехватке); тесты (таймер, скоринг, награда ≥50%); ДЗ (presigned S3); видео (по членству); лидерборды week/month (Redis ZSET). *Тесты: 17/17 PASS (`tests/student/`).*

### AB-PARENT — Parent ✅ (ветка `abdulaziz/modules`, 06.07.2026)
- [x] Обзор ребёнка: список детей (scope по `parent_id`), overview одного ребёнка — коины, долг, недельный рейтинг, группы, посещаемость (сводка 30д + последние отметки), оценки (ДЗ + тесты). Guard принадлежности `assertParentOwnsChild` → 403 на чужого/несуществующего ребёнка. *Тесты: 4/4 PASS (`tests/parent/`).* Чат `parent:<id>` уже работает через sockets/chat.

### AB-SHARED — прочее ✅
- [x] `users` модуль (профиль, список филиала); db/seeds (демо ментор/студенты/группа, идемпотентно). *chat persistence — готово в AB-INFRA.*
- [x] Фундамент коинов: `coins.changeCoins()` (транзакция + `FOR UPDATE` + `coin_history` + ZSET-лидерборд + уведомление) — единственная точка изменения коинов (§6).

---

## 6. Правила координации

| Правило | Детали |
|---|---|
| **Чужие файлы не трогаем** | Нужна правка у соседа → TODO-комментарий у себя + сообщить напарнику |
| **Коины** | Только через `changeCoins()` (Abdulaziz). Никаких прямых UPDATE `coin_balance`. |
| **Деньги** | `invoices`, `transactions`, `payment_schedules`, `total_debt`, `expenses`, биллинг — только Karis. Остальные — SELECT. |
| **Уведомления** | Только `notificationQueue.add(name, payload)` (очередь у Abdulaziz). Никаких прямых TG/SMTP/SMS из HTTP-кода. Исключение: auth OTP шлёт напрямую (латентность). |
| **Инфра общая** | config/db/redis/s3 настраивает Abdulaziz, импортируют оба. |
| **Scope** | Каждый запрос фильтрует по `req.scope.organizationId` + `branchId` (когда не null) и `deleted_at IS NULL`. |
| **Git** | Один репо, свои ветки (`karis/*`, `abdulaziz/*`), мержим только рабочий код, коммиты на английском. |

## 7. Открытые вопросы
- ✅ **Владение миграциями** — решено (группа, 05.07): init-DDL поднял Abdulaziz; дальше миграции своих таблиц каждый пишет сам через `npm run migrate:create` в своей ветке. Имя файла миграции анонсируется в группе до пуша (порядок timestamp'ов не конфликтует).
- ✅ **Модель биллинга партнёров** (A6) — РЕШЕНО 2026-07-16: бакеты по числу учеников
      (Free/Start/Standard/Pro/Business/Network), филиалы бесплатны, цифры в `config/plans.js`.
      Полная стратегия — `PRICING.md` (vault). Вопрос закрыт, см. A6 выше.
- ✅ **Кто заводит менторов** — решено (группа, 05.07): **Admin** в рамках своего филиала, как в арх-доке (Admin CRUD групп/студентов/менторов).
