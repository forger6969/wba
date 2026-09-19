# LevelUp Academy — Backend Architecture

> Полная архитектура backend-части Educational CRM: Node.js + Express + PostgreSQL + Redis + Socket.io + BullMQ + MinIO/S3 + Telegram Bot.
> Язык кода — JavaScript (ES Modules). Документ — единый источник правды для backend-разработки.

> **🆕 SaaS / мульти-аренда (2026-07-05, одобрено тимлидом).** LevelUp Academy — платформа, которую мы продаём учебным центрам. Над филиалами появился слой **организаций** (тенант = партнёр) и роль **Main Admin** (владелец платформы). Иерархия: **Main Admin (мы) → CEO (партнёр/учебный центр) → Admin (филиал) → Mentor/Student/Parent**. Учебные центры оставляют заявку на лендинге (`leads`) → Main Admin создаёт для них `organization` + пользователя `ceo`. Мульти-аренда стала двухуровневой: `organization → branch`. Биллинг партнёров (они платят нам за услугу) — модель оплаты пока **не определена**, схема будет добавлена после решения.

---

## 1. Обзор системы

### 1.1 Роли

| Роль | Область видимости | Ключевые возможности |
|---|---|---|
| **MainAdmin** 🆕 | Вся платформа (все организации) | Заявки с лендинга (`leads`), онбординг партнёров (создание `organization` + `ceo`), наш доход и все партнёры, биллинг, управление организациями |
| **CEO** | Своя организация (`organization_id`, все её филиалы) | Дашборд центра, доход/долги своей организации, CRUD филиалов, CRUD админов, отчёты по организации |
| **Admin** | Только свой филиал (`branch_id`) | Финансы (доход **и расход** `expenses`), отчёты, чеки, сплит-платежи, CRUD групп/студентов/менторов, заморозка студентов, тесты и ДЗ |
| **Mentor** | Свои группы | Davomat (посещаемость), проверка ДЗ/тестов, коины ±, экзамены с таймером, свои зарплатные инсайты |
| **Parent** | Только свой ребёнок | Посещаемость, оценки, статус ДЗ, долг, чат с Admin/Mentor |
| **Student** | Личный кабинет | Home, Profile, Shop, Test, Homework, Video, Лидерборды недели/месяца |

### 1.2 Стек и зоны ответственности

| Компонент | Технология | Зачем |
|---|---|---|
| HTTP API | Express.js (Node.js) | REST, RBAC, бизнес-логика |
| БД | PostgreSQL | Транзакционная целостность (деньги, коины) |
| Realtime | Socket.io | Чаты, live-счётчики онлайна |
| Кэш / presence / очереди | Redis | Онлайн-статусы, лидерборды (ZSET), BullMQ |
| Фоновые задачи | BullMQ + worker-процесс | Telegram-уведомления, cron просрочек |
| Файлы | MinIO / AWS S3 | Видеоуроки, вложения ДЗ, чеки оплат |
| Уведомления | Telegram Bot (grammY/telegraf) | Пуши студентам и родителям |

### 1.3 Диаграмма потоков

```
                 ┌────────────┐   REST (axios)    ┌─────────────────────┐
                 │  React SPA │◄─────────────────►│   Express API       │
                 │            │   WebSocket       │  ┌───────────────┐  │
                 └────────────┘◄─────────────────►│  │  Socket.io     │  │
                                                  │  └──────┬────────┘  │
                                                  └────┬────┼──────┬────┘
                                                       │    │      │ presigned URL
                          SQL (pg pool, transactions)  │    │      ▼
                 ┌─────────────┐◄──────────────────────┘    │  ┌──────────┐
                 │ PostgreSQL  │                            │  │ MinIO/S3 │
                 └─────────────┘        presence, ZSET,     │  └──────────┘
                                        cache, BullMQ jobs  ▼
                 ┌─────────────┐◄───────────────────────────┘
                 │    Redis    │
                 └──────┬──────┘
                        │  BullMQ queue: "notifications"
                        ▼
                 ┌─────────────┐   Telegram Bot API   ┌───────────┐
                 │   Worker    │─────────────────────►│ Telegram  │
                 │  (process)  │                      └───────────┘
                 └─────────────┘
```

> **Принцип:** HTTP-запрос никогда не ждёт Telegram. Всё внешнее — через очередь.
> **Принцип:** каждая денежная и коиновая операция — одна SQL-транзакция + строка аудита.

---

## 2. Структура директорий

Feature-based модульная структура. Каждый модуль самодостаточен: routes → controller → service → repository.

```
educrm-backend/
├── src/
│   ├── config/
│   │   ├── env.js              # dotenv + zod-валидация переменных окружения
│   │   ├── db.js               # pg Pool
│   │   ├── redis.js            # ioredis clients (main / pub / sub)
│   │   └── s3.js               # MinIO/S3 client
│   │
│   ├── middlewares/
│   │   ├── authenticate.js     # JWT verify → req.user
│   │   ├── authorize.js        # RBAC: роли + branch-скоуп
│   │   ├── archiveGuard.js     # 403 на запись в архивные сущности
│   │   ├── validate.js         # zod-валидация body/params/query
│   │   ├── rateLimiter.js      # rate limiting (redis store)
│   │   └── errorHandler.js     # централизованный обработчик ошибок
│   │
│   ├── modules/
│   │   ├── auth/               # login, refresh rotation, logout
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   └── auth.validation.js
│   │   ├── organizations/      # 🆕 тенанты-партнёры (Main Admin), онбординг
│   │   ├── leads/              # 🆕 заявки с лендинга (Main Admin)
│   │   ├── users/              # CRUD пользователей, заморозка студентов
│   │   ├── branches/           # филиалы внутри организации (Multi-Tenancy)
│   │   ├── groups/             # группы, архивация, состав
│   │   ├── attendance/         # Davomat
│   │   ├── payments/           # инвойсы, транзакции, сплит, Nasiya, расходы (expenses)
│   │   ├── homework/           # ДЗ + сабмиты + вложения (S3)
│   │   ├── tests/              # тесты, экзамены с таймером, результаты
│   │   ├── gamification/       # коины, coin_history, лидерборды
│   │   ├── shop/               # магазин за коины
│   │   ├── videos/             # видеоуроки (S3 presigned)
│   │   ├── chat/               # история сообщений (REST-часть чата)
│   │   ├── reports/            # отчёты Admin/CEO, зарплаты менторов
│   │   └── telegram/           # привязка TG-аккаунтов
│   │
│   ├── sockets/
│   │   ├── index.js            # инициализация Socket.io + redis-adapter
│   │   ├── socketAuth.js       # JWT-аутентификация handshake
│   │   ├── presence.js         # онлайн-статусы студентов в Redis
│   │   └── chat.js             # комнаты: global, parent:<id>, group:<id>
│   │
│   ├── queues/
│   │   ├── notification.queue.js    # producer (BullMQ)
│   │   └── workers/
│   │       ├── notification.worker.js  # consumer → Telegram API
│   │       └── overdue.worker.js       # cron: просрочки Nasiya
│   │
│   ├── db/
│   │   ├── migrations/         # node-pg-migrate
│   │   └── seeds/              # default branch, ceo
│   │
│   ├── utils/
│   │   ├── AppError.js         # операционные ошибки с http-статусом
│   │   ├── asyncHandler.js     # обёртка контроллеров
│   │   └── pagination.js
│   │
│   ├── app.js                  # express app: middlewares + routes
│   └── server.js               # http server + socket.io + graceful shutdown
│
├── worker.js                   # entrypoint фонового worker-процесса
├── .env.example
├── package.json
└── README.md
```

> **Ключевое решение:** API-сервер (`server.js`) и worker (`worker.js`) — два отдельных процесса. Падение Telegram-worker'а не затрагивает API. В проде — pm2/systemd/docker-compose.

---

## 3. PostgreSQL — DDL

Полный скрипт. Правила, применённые ко всем core-таблицам:

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `branch_id UUID NOT NULL REFERENCES branches(id)` — Multi-Tenancy с первого дня; тенант-корень — `branches.organization_id` (org → branch), поэтому организацию дочерних сущностей выводим через их филиал
- Платформенные сущности (`organizations`, `leads`) и org-уровневые пользователи (`main_admin`, `ceo`) не привязаны к одному филиалу — см. ниже
- `is_archived BOOLEAN NOT NULL DEFAULT false` + `deleted_at TIMESTAMPTZ` — архив и soft-delete раздельно
- Деньги — `NUMERIC(12,2)`, никогда `FLOAT`
- `created_at / updated_at TIMESTAMPTZ`

```sql
-- =============================================================
-- LevelUp Academy PostgreSQL Schema
-- =============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- ---------- ENUMS ----------
CREATE TYPE user_role          AS ENUM ('main_admin', 'ceo', 'admin', 'mentor', 'parent', 'student');
CREATE TYPE user_status        AS ENUM ('active', 'frozen', 'graduated', 'dropped');
CREATE TYPE org_status         AS ENUM ('trial', 'active', 'frozen');   -- 🆕 статус организации-партнёра
CREATE TYPE lead_status        AS ENUM ('new', 'contacted', 'onboarded', 'rejected');   -- 🆕 заявка с лендинга
CREATE TYPE payment_method     AS ENUM ('cash', 'card', 'transfer');
CREATE TYPE invoice_status     AS ENUM ('pending', 'partially_paid', 'paid', 'overdue', 'cancelled');
CREATE TYPE invoice_type       AS ENUM ('full', 'split', 'installment');   -- installment = Halol Nasiya
CREATE TYPE transaction_status AS ENUM ('completed', 'refunded', 'voided');
CREATE TYPE schedule_status    AS ENUM ('upcoming', 'due', 'paid', 'overdue');
CREATE TYPE coin_operation     AS ENUM ('reward', 'deduction', 'purchase', 'system');
CREATE TYPE chat_type          AS ENUM ('global', 'direct', 'group');
CREATE TYPE attendance_status  AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE homework_status    AS ENUM ('assigned', 'submitted', 'graded', 'late');
CREATE TYPE tg_role            AS ENUM ('student', 'parent');

-- ---------- ORGANIZATIONS (🆕 тенант-корень: партнёр = учебный центр) ----------
CREATE TABLE organizations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(160) NOT NULL,        -- напр. "Mars IT school"
    owner_user_id UUID,                          -- ceo владелец (FK добавляется после users)
    status        org_status NOT NULL DEFAULT 'trial',
    plan          VARCHAR(60),                   -- тариф 'pro'|'max' (config/plans.js)
    domain        VARCHAR(190),                  -- свой домен партнёра (marsit-school.us), unique; бэкенд общий
    is_archived   BOOLEAN NOT NULL DEFAULT false,
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- LEADS (🆕 заявки с формы лендинга → падают в Main Admin) ----------
CREATE TABLE leads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(120) NOT NULL,       -- Имя (как к вам обращаться)
    phone           VARCHAR(32)  NOT NULL,       -- Телефон
    center_name     VARCHAR(160),                -- Учебный центр
    center_size     VARCHAR(60),                 -- Размер центра (напр. "Сеть филиалов")
    message         TEXT,                        -- Сообщение
    status          lead_status NOT NULL DEFAULT 'new',
    organization_id UUID REFERENCES organizations(id),   -- проставляется при онбординге
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_leads_status ON leads (status, created_at DESC);

-- ---------- BRANCHES (филиал внутри организации) ----------
CREATE TABLE branches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),   -- 🆕 тенант
    name            VARCHAR(120) NOT NULL,
    address         TEXT,
    phone           VARCHAR(32),
    is_main         BOOLEAN NOT NULL DEFAULT false,               -- главный филиал В РАМКАХ организации
    is_archived     BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_branches_org ON branches (organization_id);
-- ровно один главный филиал НА ОРГАНИЗАЦИЮ
CREATE UNIQUE INDEX uq_branches_main ON branches (organization_id) WHERE is_main = true;

-- seed демо-организации + её главного филиала
WITH org AS (
    INSERT INTO organizations (name, status) VALUES ('Demo Center', 'active') RETURNING id
)
INSERT INTO branches (organization_id, name, is_main)
SELECT id, 'Main Branch', true FROM org;

-- ---------- USERS (все роли в одной таблице) ----------
-- 🆕 organization_id + nullable branch_id под иерархию ролей:
--   main_admin  → org NULL,     branch NULL   (платформа)
--   ceo  → org NOT NULL, branch NULL   (вся организация партнёра)
--   admin/mentor/parent/student → org NOT NULL, branch NOT NULL (один филиал)
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),      -- 🆕 NULL только у main_admin
    branch_id       UUID REFERENCES branches(id),           -- 🆕 NULL у main_admin и ceo
    role            user_role NOT NULL,
    status          user_status NOT NULL DEFAULT 'active',
    first_name      VARCHAR(80)  NOT NULL,
    last_name       VARCHAR(80)  NOT NULL,
    phone           VARCHAR(32)  NOT NULL,
    email           VARCHAR(160),
    password_hash   TEXT NOT NULL,               -- argon2id
    avatar_key      TEXT,                        -- ключ объекта в S3
    is_archived     BOOLEAN NOT NULL DEFAULT false,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_phone UNIQUE (phone),
    CONSTRAINT chk_user_scope CHECK (
        (role = 'main_admin' AND organization_id IS NULL AND branch_id IS NULL)
        OR (role = 'ceo' AND organization_id IS NOT NULL AND branch_id IS NULL)
        OR (role IN ('admin','mentor','parent','student') AND organization_id IS NOT NULL AND branch_id IS NOT NULL)
    )
);
CREATE INDEX idx_users_branch_role ON users (branch_id, role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_org_role    ON users (organization_id, role) WHERE deleted_at IS NULL;

-- FK владельца организации (после users, чтобы разорвать цикл ссылок)
ALTER TABLE organizations
    ADD CONSTRAINT fk_org_owner FOREIGN KEY (owner_user_id) REFERENCES users(id);

-- ---------- STUDENT PROFILES (1:1 с users, role = student) ----------
CREATE TABLE student_profiles (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    branch_id     UUID NOT NULL REFERENCES branches(id),
    parent_id     UUID REFERENCES users(id),   -- родитель (role = parent)
    coin_balance  INTEGER NOT NULL DEFAULT 0 CHECK (coin_balance >= 0),
    total_debt    NUMERIC(12,2) NOT NULL DEFAULT 0,
    frozen_at     TIMESTAMPTZ,                 -- когда Admin заморозил
    frozen_reason TEXT,
    birth_date    DATE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_student_profiles_parent ON student_profiles (parent_id);
CREATE INDEX idx_student_profiles_branch ON student_profiles (branch_id);

-- ---------- GROUPS ----------
CREATE TABLE groups (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id     UUID NOT NULL REFERENCES branches(id),
    mentor_id     UUID NOT NULL REFERENCES users(id),   -- role = mentor
    name          VARCHAR(120) NOT NULL,
    subject       VARCHAR(120) NOT NULL,
    monthly_price NUMERIC(12,2) NOT NULL CHECK (monthly_price >= 0),
    schedule      JSONB NOT NULL DEFAULT '[]',          -- [{day:"mon", start:"14:00", end:"16:00"}]
    room          VARCHAR(60),
    is_archived   BOOLEAN NOT NULL DEFAULT false,       -- архив → всё read-only
    archived_at   TIMESTAMPTZ,
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_groups_branch  ON groups (branch_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_groups_mentor  ON groups (mentor_id) WHERE deleted_at IS NULL;

-- ---------- GROUP MEMBERSHIP (M:N student ↔ group) ----------
CREATE TABLE group_students (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id   UUID NOT NULL REFERENCES groups(id),
    student_id UUID NOT NULL REFERENCES users(id),
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at    TIMESTAMPTZ,
    CONSTRAINT uq_group_student UNIQUE (group_id, student_id)
);
CREATE INDEX idx_group_students_student ON group_students (student_id) WHERE left_at IS NULL;

-- ---------- INVOICES (счёт: один на оплату/период) ----------
CREATE TABLE invoices (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id    UUID NOT NULL REFERENCES branches(id),
    student_id   UUID NOT NULL REFERENCES users(id),
    group_id     UUID REFERENCES groups(id),
    type         invoice_type   NOT NULL DEFAULT 'full',
    status       invoice_status NOT NULL DEFAULT 'pending',
    total_amount NUMERIC(12,2)  NOT NULL CHECK (total_amount > 0),
    paid_amount  NUMERIC(12,2)  NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    due_date     DATE,
    period_month DATE,                        -- за какой месяц обучения
    comment      TEXT,
    created_by   UUID NOT NULL REFERENCES users(id),   -- admin, создавший счёт
    is_archived  BOOLEAN NOT NULL DEFAULT false,
    deleted_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_paid_le_total CHECK (paid_amount <= total_amount)
);
CREATE INDEX idx_invoices_student ON invoices (student_id, status);
CREATE INDEX idx_invoices_branch  ON invoices (branch_id, status);

-- ---------- TRANSACTIONS (факт оплаты; split = 2+ строки на 1 invoice) ----------
CREATE TABLE transactions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id    UUID NOT NULL REFERENCES branches(id),
    invoice_id   UUID NOT NULL REFERENCES invoices(id),
    method       payment_method NOT NULL,
    status       transaction_status NOT NULL DEFAULT 'completed',
    amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    receipt_key  TEXT,                        -- скан чека в S3
    processed_by UUID NOT NULL REFERENCES users(id),
    -- связка частей одного сплит-платежа между собой:
    split_batch_id UUID,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_transactions_invoice ON transactions (invoice_id);
CREATE INDEX idx_transactions_branch_date ON transactions (branch_id, created_at);

-- ---------- PAYMENT SCHEDULES (Halol Nasiya — график рассрочки) ----------
CREATE TABLE payment_schedules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id   UUID NOT NULL REFERENCES branches(id),
    invoice_id  UUID NOT NULL REFERENCES invoices(id),
    seq_number  SMALLINT NOT NULL CHECK (seq_number > 0),   -- № платежа: 1, 2, 3...
    due_date    DATE NOT NULL,
    amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    status      schedule_status NOT NULL DEFAULT 'upcoming',
    paid_transaction_id UUID REFERENCES transactions(id),
    paid_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_schedule_seq UNIQUE (invoice_id, seq_number)
);
CREATE INDEX idx_schedules_due ON payment_schedules (status, due_date);

-- ---------- EXPENSES (🆕 расходы филиала: Admin видит доход − расход = прибыль) ----------
CREATE TABLE expenses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id   UUID NOT NULL REFERENCES branches(id),
    category    VARCHAR(80) NOT NULL,             -- аренда | зарплата | реклама | прочее
    amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    spent_at    DATE NOT NULL,
    note        TEXT,
    created_by  UUID NOT NULL REFERENCES users(id),
    is_archived BOOLEAN NOT NULL DEFAULT false,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_expenses_branch ON expenses (branch_id, spent_at);

-- ---------- COIN HISTORY (аудит геймификации — защита от фрода) ----------
CREATE TABLE coin_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id   UUID NOT NULL REFERENCES branches(id),
    student_id  UUID NOT NULL REFERENCES users(id),
    actor_id    UUID NOT NULL REFERENCES users(id),   -- КТО начислил/списал
    operation   coin_operation NOT NULL,
    amount      INTEGER NOT NULL CHECK (amount <> 0), -- + начисление, - списание
    balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
    reason      TEXT NOT NULL,                        -- ПОЧЕМУ (обязательно)
    ref_type    VARCHAR(40),                          -- 'homework' | 'test' | 'shop_order' | ...
    ref_id      UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()    -- КОГДА
);
CREATE INDEX idx_coin_history_student ON coin_history (student_id, created_at DESC);
CREATE INDEX idx_coin_history_actor   ON coin_history (actor_id, created_at DESC);

-- ---------- CHAT MESSAGES ----------
CREATE TABLE chat_messages (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id    UUID NOT NULL REFERENCES branches(id),
    chat_type    chat_type NOT NULL,
    room_key     VARCHAR(120) NOT NULL,   -- 'global' | 'parent:<uuid>' | 'group:<uuid>'
    sender_id    UUID NOT NULL REFERENCES users(id),
    body         TEXT NOT NULL CHECK (length(body) <= 4000),
    attachment_key TEXT,                  -- файл в S3
    read_at      TIMESTAMPTZ,
    deleted_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_room ON chat_messages (room_key, created_at DESC);

-- ---------- ATTENDANCE (Davomat) ----------
CREATE TABLE attendance (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id   UUID NOT NULL REFERENCES branches(id),
    group_id    UUID NOT NULL REFERENCES groups(id),
    student_id  UUID NOT NULL REFERENCES users(id),
    lesson_date DATE NOT NULL,
    status      attendance_status NOT NULL,
    marked_by   UUID NOT NULL REFERENCES users(id),   -- mentor
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_attendance UNIQUE (group_id, student_id, lesson_date)
);
CREATE INDEX idx_attendance_student ON attendance (student_id, lesson_date DESC);

-- ---------- HOMEWORK ----------
CREATE TABLE homework (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id   UUID NOT NULL REFERENCES branches(id),
    group_id    UUID NOT NULL REFERENCES groups(id),
    created_by  UUID NOT NULL REFERENCES users(id),   -- mentor или admin
    title       VARCHAR(200) NOT NULL,
    description TEXT,
    attachment_key TEXT,
    max_score   SMALLINT NOT NULL DEFAULT 100,
    coin_reward SMALLINT NOT NULL DEFAULT 0,
    deadline    TIMESTAMPTZ NOT NULL,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE homework_submissions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    homework_id  UUID NOT NULL REFERENCES homework(id),
    student_id   UUID NOT NULL REFERENCES users(id),
    status       homework_status NOT NULL DEFAULT 'submitted',
    file_key     TEXT,                     -- вложение в S3
    text_answer  TEXT,
    score        SMALLINT,
    graded_by    UUID REFERENCES users(id),
    graded_at    TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_submission UNIQUE (homework_id, student_id)
);

-- ---------- TESTS / EXAMS ----------
CREATE TABLE tests (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id    UUID NOT NULL REFERENCES branches(id),
    group_id     UUID NOT NULL REFERENCES groups(id),
    created_by   UUID NOT NULL REFERENCES users(id),
    title        VARCHAR(200) NOT NULL,
    questions    JSONB NOT NULL,           -- [{q, options[], correct}] — правильные ответы не отдаются клиенту
    duration_min SMALLINT NOT NULL CHECK (duration_min > 0),   -- лимит времени
    starts_at    TIMESTAMPTZ,              -- окно экзамена (mentor планирует)
    ends_at      TIMESTAMPTZ,
    coin_reward  SMALLINT NOT NULL DEFAULT 0,
    is_archived  BOOLEAN NOT NULL DEFAULT false,
    deleted_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE test_results (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id     UUID NOT NULL REFERENCES tests(id),
    student_id  UUID NOT NULL REFERENCES users(id),
    answers     JSONB NOT NULL DEFAULT '[]',   -- number[]: answers[i] = выбранный индекс опции вопроса i (-1 = пропуск)
    score       SMALLINT,                      -- round(correct / total * 100); reward при score >= 50
    started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    CONSTRAINT uq_test_result UNIQUE (test_id, student_id)
);

-- ---------- MENTOR SALARIES (зарплата ментора за месяц, зона Abdulaziz) ----------
-- ⚠️ Модель расчёта не финализирована (fixed / % от выручки группы / за студента).
--    base_amount проставляется вручную (Admin); сервис даёт «подсказку» из групп
--    ментора (activeStudents × monthly_price) как decision-support. Не связана с
--    transactions (зарплата — отдельный денежный поток). Согласовать с тимлидом.
CREATE TYPE salary_status AS ENUM ('draft', 'approved', 'paid');

CREATE TABLE mentor_salaries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    branch_id       UUID NOT NULL REFERENCES branches(id),
    mentor_id       UUID NOT NULL REFERENCES users(id),
    period_month    DATE NOT NULL,                          -- первый день месяца
    base_amount     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (base_amount >= 0),
    bonus_amount    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (bonus_amount >= 0),
    total_amount    NUMERIC(12,2) GENERATED ALWAYS AS (base_amount + bonus_amount) STORED,
    status          salary_status NOT NULL DEFAULT 'draft',
    note            TEXT,
    created_by      UUID NOT NULL REFERENCES users(id),
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_mentor_salary_period UNIQUE (mentor_id, period_month)
);

-- ---------- SHOP (трата коинов) ----------
CREATE TABLE shop_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id   UUID NOT NULL REFERENCES branches(id),
    name        VARCHAR(160) NOT NULL,
    image_key   TEXT,
    coin_price  INTEGER NOT NULL CHECK (coin_price > 0),
    stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    is_archived BOOLEAN NOT NULL DEFAULT false,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shop_orders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id   UUID NOT NULL REFERENCES branches(id),
    item_id     UUID NOT NULL REFERENCES shop_items(id),
    student_id  UUID NOT NULL REFERENCES users(id),
    coin_price  INTEGER NOT NULL,           -- цена на момент покупки
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- VIDEOS ----------
CREATE TABLE videos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id   UUID NOT NULL REFERENCES branches(id),
    group_id    UUID NOT NULL REFERENCES groups(id),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    title       VARCHAR(200) NOT NULL,
    video_key   TEXT NOT NULL,              -- объект в S3/MinIO
    duration_sec INTEGER,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- TELEGRAM ACCOUNTS (регистрация в боте) ----------
CREATE TABLE telegram_accounts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL UNIQUE REFERENCES users(id),
    tg_chat_id  BIGINT NOT NULL UNIQUE,
    tg_role     tg_role NOT NULL,           -- как зарегистрировался в боте
    linked_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- REFRESH TOKENS (rotation) ----------
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
```

### 3.1 Ключевые решения схемы

> **Invoice ↔ Transactions.** Инвойс — «сколько должен». Транзакция — «сколько и чем заплатил». Сплит 50/50 = один invoice (`type='split'`) + две транзакции с общим `split_batch_id`. Nasiya = invoice (`type='installment'`) + строки в `payment_schedules`; каждый взнос закрывается транзакцией и линкуется через `paid_transaction_id`.

> **coin_history — append-only.** Никогда не UPDATE/DELETE. Баланс в `student_profiles.coin_balance` — денормализованный кэш, всегда меняется в одной транзакции с INSERT в историю. `balance_after` позволяет проверить целостность за O(1).

> **`is_archived` ≠ `deleted_at`.** Архив — бизнес-состояние «read-only» (видно всем, менять нельзя). Soft-delete — «как будто не существует» (скрыто из всех выборок `WHERE deleted_at IS NULL`).

> **`mentor_salaries` — отдельный денежный поток.** Зарплата ментора не проходит через `transactions`/`invoices` (зона расчётов Karis). `total_amount` — генерируемая колонка (`base + bonus`), пересчёта в коде нет. ⚠️ Модель начисления (fixed / % от выручки / за студента) не финализирована — таблица хранит итог, `base_amount` вводится вручную; открытый вопрос для тимлида.

---

## 4. Core Middlewares

### 4.1 `authenticate.js` — JWT

```js
// src/middlewares/authenticate.js
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Authentication required'));
  }

  try {
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET);
    // payload: { sub, role, organizationId, branchId } — подписывается в auth.service при логине
    // organizationId = null у main_admin; branchId = null у main_admin и ceo
    req.user = {
      id: payload.sub,
      role: payload.role,
      organizationId: payload.organizationId ?? null,
      branchId: payload.branchId ?? null,
    };
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
}
```

### 4.2 `authorize.js` — RBAC + branch-скоуп

```js
// src/middlewares/authorize.js
import { AppError } from '../utils/AppError.js';

/**
 * RBAC guard.
 *   router.post('/groups', authenticate, authorize('ceo', 'admin'), ...)
 *
 * Двухуровневый скоуп (org → branch), ПРИНУДИТЕЛЬНО подставляется в req.scope:
 *   - main_admin  → { organizationId: null, branchId: null } — вся платформа;
 *   - ceo  → своя организация (organizationId из токена), branchId можно
 *     сузить через query до конкретного филиала своей организации;
 *   - остальные   → жёстко свой organizationId + branchId из токена.
 *   Клиентские organization_id / branch_id в body/query ниже своего уровня игнорируются.
 */
export function authorize(...allowedRoles) {
  return (req, _res, next) => {
    const { user } = req;
    if (!user) return next(new AppError(401, 'Authentication required'));

    if (!allowedRoles.includes(user.role)) {
      return next(new AppError(403, 'Insufficient permissions'));
    }

    if (user.role === 'main_admin') {
      req.scope = { organizationId: null, branchId: null };           // вся платформа
    } else if (user.role === 'ceo') {
      req.scope = { organizationId: user.organizationId, branchId: req.query.branchId ?? null };
    } else {
      req.scope = { organizationId: user.organizationId, branchId: user.branchId };
    }

    next();
  };
}
```

```js
// пример использования скоупа в репозитории
// src/modules/groups/groups.repository.js
export async function findGroups(db, scope) {
  const params = [];
  let where = 'g.deleted_at IS NULL';
  // организацию groups получает через свой филиал (b.organization_id)
  if (scope.organizationId) {
    params.push(scope.organizationId);
    where += ` AND b.organization_id = $${params.length}`;
  }
  if (scope.branchId) {
    params.push(scope.branchId);
    where += ` AND g.branch_id = $${params.length}`;
  }
  const { rows } = await db.query(
    `SELECT g.* FROM groups g JOIN branches b ON b.id = g.branch_id
      WHERE ${where} ORDER BY g.created_at DESC`, params,
  );
  return rows;   // main_admin: оба null → всё; ceo: своя org; admin: свой филиал
}
```

### 4.3 `archiveGuard.js` — защита архивных сущностей

```js
// src/middlewares/archiveGuard.js
import { pool } from '../config/db.js';
import { AppError } from '../utils/AppError.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// таблицы, для которых включена архивная защита
const ARCHIVABLE = new Set([
  'groups', 'users', 'invoices', 'homework', 'tests', 'shop_items', 'videos', 'branches',
]);

/**
 * Блокирует ЛЮБУЮ мутацию сущности с is_archived = true → 403.
 * GET проходит всегда (архив read-only, не невидимый).
 *
 * Использование (двухуровневое):
 *   1) прямая мутация сущности:
 *        router.put('/:id', archiveGuard('groups'), ctrl.update)
 *   2) мутация дочерней сущности внутри архивной группы:
 *        router.post('/:groupId/homework', archiveGuard('groups', 'groupId'), ctrl.create)
 */
export function archiveGuard(table, idParam = 'id') {
  if (!ARCHIVABLE.has(table)) {
    throw new Error(`archiveGuard: table "${table}" is not registered as archivable`);
  }

  return async (req, _res, next) => {
    if (!MUTATING_METHODS.has(req.method)) return next();

    const entityId = req.params[idParam];
    if (!entityId) return next();

    try {
      // имя таблицы из белого списка — интерполяция безопасна
      const { rows } = await pool.query(
        `SELECT is_archived FROM ${table} WHERE id = $1 AND deleted_at IS NULL`,
        [entityId],
      );

      if (rows.length === 0) return next(new AppError(404, 'Entity not found'));
      if (rows[0].is_archived) {
        return next(new AppError(403, 'Entity is archived and read-only'));
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
```

```js
// пример подключения в модуле groups
// src/modules/groups/groups.routes.js
import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { archiveGuard } from '../../middlewares/archiveGuard.js';
import * as ctrl from './groups.controller.js';

const router = Router();
router.use(authenticate);

router.get('/',        authorize('ceo', 'admin', 'mentor'), ctrl.list);
router.get('/:id',     authorize('ceo', 'admin', 'mentor'), ctrl.getOne);
router.post('/',       authorize('ceo', 'admin'), ctrl.create);
router.put('/:id',     authorize('ceo', 'admin'), archiveGuard('groups'), ctrl.update);
router.delete('/:id',  authorize('ceo', 'admin'), archiveGuard('groups'), ctrl.softDelete);
router.post('/:id/archive', authorize('ceo', 'admin'), ctrl.archive);

// дочерние сущности архивной группы тоже заблокированы:
router.post('/:groupId/homework', authorize('ceo', 'admin', 'mentor'),
  archiveGuard('groups', 'groupId'), ctrl.createHomework);

export default router;
```

### 4.4 `errorHandler.js` — централизованные ошибки

```js
// src/middlewares/errorHandler.js
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export function errorHandler(err, _req, res, _next) {
  const status = err.statusCode ?? 500;
  const isOperational = Boolean(err.isOperational);

  if (!isOperational) logger.error({ err }, 'Unhandled error');

  res.status(status).json({
    success: false,
    message: isOperational ? err.message : 'Internal server error',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
```

---

## 5. Socket.io + Redis: presence и чаты

### 5.1 Инициализация

```js
// src/sockets/index.js
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redis, redisPub, redisSub } from '../config/redis.js';
import { socketAuth } from './socketAuth.js';
import { registerPresence } from './presence.js';
import { registerChat } from './chat.js';

export function initSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
  });

  io.adapter(createAdapter(redisPub, redisSub)); // масштабирование на N инстансов
  io.use(socketAuth);                            // JWT из handshake.auth.token → socket.user

  io.on('connection', (socket) => {
    registerPresence(io, socket, redis);
    registerChat(io, socket, redis);
  });

  return io;
}
```

### 5.2 Presence — живой счётчик онлайна

```js
// src/sockets/presence.js
const PRESENCE_TTL = 60;            // сек; heartbeat каждые 25 сек
const ONLINE_SET = 'online_students';           // SET уникальных id
const keyOf = (id) => `online_students:${id}`;  // TTL-ключ на студента

export function registerPresence(io, socket, redis) {
  const { user } = socket;

  socket.on('presence:online', async () => {
    if (user.role !== 'student') return;

    // TTL-ключ (авто-очистка при обрыве) + SET (мгновенный COUNT без SCAN)
    await redis
      .multi()
      .set(keyOf(user.id), socket.id, 'EX', PRESENCE_TTL)
      .sadd(ONLINE_SET, user.id)
      .exec();

    await broadcastOnlineCount(io, redis);
  });

  socket.on('presence:heartbeat', async () => {
    if (user.role !== 'student') return;
    await redis.expire(keyOf(user.id), PRESENCE_TTL);
  });

  socket.on('disconnect', async () => {
    if (user.role !== 'student') return;
    await redis.multi().del(keyOf(user.id)).srem(ONLINE_SET, user.id).exec();
    await broadcastOnlineCount(io, redis);
  });

  // дашборды CEO/Admin подписываются на комнату счётчика
  if (user.role === 'ceo' || user.role === 'admin') {
    socket.join('dashboards');
    getOnlineCount(redis).then((count) => socket.emit('presence:count', { count }));
  }
}

async function getOnlineCount(redis) {
  // SET может содержать «протухшие» id (упавший процесс не вызвал disconnect) —
  // сверяем с живыми TTL-ключами и чистим лениво
  const ids = await redis.smembers(ONLINE_SET);
  if (ids.length === 0) return 0;

  const pipeline = redis.pipeline();
  ids.forEach((id) => pipeline.exists(`online_students:${id}`));
  const results = await pipeline.exec();

  const stale = ids.filter((_, i) => results[i][1] === 0);
  if (stale.length > 0) await redis.srem(ONLINE_SET, ...stale);

  return ids.length - stale.length;
}

async function broadcastOnlineCount(io, redis) {
  const count = await getOnlineCount(redis);
  io.to('dashboards').emit('presence:count', { count });
}
```

### 5.3 Чат — global и parent-директ

```js
// src/sockets/chat.js
import { saveMessage } from '../modules/chat/chat.service.js';

const GLOBAL_ROLES = new Set(['ceo', 'admin', 'mentor', 'parent']);
const parentRoom = (parentId) => `parent:${parentId}`;

export function registerChat(io, socket, _redis) {
  const { user } = socket;

  // --- вход в комнаты по роли ---
  if (GLOBAL_ROLES.has(user.role)) socket.join('global');
  if (user.role === 'parent') socket.join(parentRoom(user.id));

  // --- глобальный чат ---
  socket.on('chat:global:send', async ({ body }, ack) => {
    try {
      if (!GLOBAL_ROLES.has(user.role)) throw new Error('Forbidden');

      const message = await saveMessage({
        chatType: 'global',
        roomKey: 'global',
        senderId: user.id,
        branchId: user.branchId,
        body,
      });

      io.to('global').emit('chat:global:message', message);
      ack?.({ ok: true, id: message.id });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  // --- директ Admin/Mentor → Parent ---
  socket.on('chat:parent:send', async ({ parentId, body }, ack) => {
    try {
      if (!['ceo', 'admin', 'mentor'].includes(user.role)) {
        throw new Error('Forbidden');
      }

      const message = await saveMessage({
        chatType: 'direct',
        roomKey: parentRoom(parentId),
        senderId: user.id,
        branchId: user.branchId,
        body,
      });

      io.to(parentRoom(parentId)).emit('chat:parent:message', message);
      socket.emit('chat:parent:message', message); // эхо отправителю
      ack?.({ ok: true, id: message.id });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  // ответ родителя идёт в ту же комнату — админ/ментор просто join'ится
  socket.on('chat:parent:join', ({ parentId }) => {
    if (['ceo', 'admin', 'mentor'].includes(user.role)) {
      socket.join(parentRoom(parentId));
    }
  });
}
```

> Все сообщения персистятся в `chat_messages` (история подгружается по REST `GET /api/chat/:roomKey/messages?cursor=`), сокеты — только транспорт live-доставки.

---

## 6. Split-Payment: контроллер

`POST /api/payments` — единая точка: `full` (одним методом), `split` (наличные+карта) и `installment` (Nasiya).

```js
// src/modules/payments/payments.controller.js
import { pool } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { notificationQueue } from '../../queues/notification.queue.js';

/**
 * POST /api/payments
 * roles: ceo, admin
 *
 * body (split example):
 * {
 *   "studentId": "uuid",
 *   "groupId": "uuid",
 *   "periodMonth": "2026-07-01",
 *   "totalAmount": 1000000,
 *   "parts": [
 *     { "method": "cash", "amount": 500000 },
 *     { "method": "card", "amount": 500000 }
 *   ]
 * }
 */
export const createPayment = asyncHandler(async (req, res) => {
  const { studentId, groupId, periodMonth, totalAmount, parts, comment } = req.body;
  const { user, scope } = req;

  // --- валидация сумм ДО открытия транзакции ---
  if (!Array.isArray(parts) || parts.length === 0) {
    throw new AppError(422, 'At least one payment part is required');
  }
  const partsSum = parts.reduce((sum, p) => sum + Number(p.amount), 0);
  if (partsSum !== Number(totalAmount)) {
    throw new AppError(422,
      `Parts sum (${partsSum}) does not match total amount (${totalAmount})`);
  }

  const invoiceType = parts.length > 1 ? 'split' : 'full';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // студент существует, активен, в нужном филиале — с блокировкой строки
    const { rows: [student] } = await client.query(
      `SELECT u.id, u.status, sp.id AS profile_id
         FROM users u
         JOIN student_profiles sp ON sp.user_id = u.id
        WHERE u.id = $1 AND u.role = 'student'
          AND u.branch_id = $2 AND u.deleted_at IS NULL
        FOR UPDATE OF sp`,
      [studentId, scope.branchId],
    );
    if (!student) throw new AppError(404, 'Student not found in your branch');
    if (student.status === 'frozen') throw new AppError(409, 'Student is frozen');

    // 1) invoice
    const { rows: [invoice] } = await client.query(
      `INSERT INTO invoices
         (branch_id, student_id, group_id, type, status,
          total_amount, paid_amount, period_month, comment, created_by)
       VALUES ($1, $2, $3, $4, 'paid', $5, $5, $6, $7, $8)
       RETURNING *`,
      [scope.branchId, studentId, groupId, invoiceType,
       totalAmount, periodMonth, comment ?? null, user.id],
    );

    // 2) N транзакций, связанных общим split_batch_id
    const { rows: [{ gen_random_uuid: splitBatchId }] } =
      parts.length > 1
        ? await client.query('SELECT gen_random_uuid()')
        : { rows: [{ gen_random_uuid: null }] };

    const transactions = [];
    for (const part of parts) {
      const { rows: [tx] } = await client.query(
        `INSERT INTO transactions
           (branch_id, invoice_id, method, amount, processed_by, split_batch_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [scope.branchId, invoice.id, part.method, part.amount, user.id, splitBatchId],
      );
      transactions.push(tx);
    }

    // 3) пересчёт долга студента
    await client.query(
      `UPDATE student_profiles
          SET total_debt = GREATEST(total_debt - $1, 0), updated_at = now()
        WHERE user_id = $2`,
      [totalAmount, studentId],
    );

    await client.query('COMMIT');

    // 4) уведомление родителю — асинхронно, ПОСЛЕ коммита
    await notificationQueue.add('payment.received', {
      studentId,
      invoiceId: invoice.id,
      amount: totalAmount,
      methods: parts.map((p) => p.method),
    });

    res.status(201).json({ success: true, data: { invoice, transactions } });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});
```

> **Почему так:** сумма частей проверяется до транзакции; строка `student_profiles` лочится `FOR UPDATE` (два админа не спишут долг одновременно); Telegram-джоб ставится строго после `COMMIT` — иначе можно уведомить об оплате, которая откатилась.

---

## 7. Halol Nasiya — рассрочка

### 7.1 Создание

`POST /api/payments/installment` — тот же паттерн транзакции, но:

1. `invoices` создаётся с `type='installment'`, `status='pending'`, `paid_amount=0`.
2. Генерируются строки `payment_schedules`: `seq_number` 1..N, `due_date` с шагом месяц, суммы равными долями (остаток от деления — в последний платёж).
3. `student_profiles.total_debt += total_amount`.

### 7.2 Погашение взноса

`POST /api/payments/installment/:scheduleId/pay`:

1. `SELECT ... FOR UPDATE` строки графика; допустимы только `upcoming | due | overdue`.
2. INSERT в `transactions`, линк `paid_transaction_id`, `status='paid'`, `paid_at=now()`.
3. `invoices.paid_amount += amount`; если все взносы оплачены → `status='paid'`, иначе `'partially_paid'`.
4. `total_debt -= amount`.

### 7.3 Просрочки (worker)

```js
// src/queues/workers/overdue.worker.js — repeatable job BullMQ, каждый день 09:00
// 1. UPDATE payment_schedules SET status='overdue'
//    WHERE status IN ('upcoming','due') AND due_date < CURRENT_DATE;
// 2. Для каждой просрочки → notificationQueue.add('debt.overdue', { studentId, amount, dueDate })
// 3. Родитель получает Telegram: "Просрочен платёж N сумов от <дата>"
```

---

## 8. Геймификация: коины и лидерборды

### 8.1 Сервис коинов — атомарность + аудит

```js
// src/modules/gamification/coins.service.js
import { pool } from '../../config/db.js';
import { redis } from '../../config/redis.js';
import { AppError } from '../../utils/AppError.js';
import { notificationQueue } from '../../queues/notification.queue.js';

const LEADERBOARD_WEEK  = 'leaderboard:week';
const LEADERBOARD_MONTH = 'leaderboard:month';

/**
 * Единственная точка изменения баланса коинов.
 * amount: положительный = начисление, отрицательный = списание.
 */
export async function changeCoins({ studentId, actorId, branchId, amount, operation, reason, refType, refId }) {
  if (!reason?.trim()) throw new AppError(422, 'Reason is required for coin operations');
  if (amount === 0)    throw new AppError(422, 'Amount must be non-zero');

  const client = await pool.connect();
  let balanceAfter;
  try {
    await client.query('BEGIN');

    // атомарное обновление с защитой от ухода в минус
    const { rows: [profile] } = await client.query(
      `UPDATE student_profiles
          SET coin_balance = coin_balance + $1, updated_at = now()
        WHERE user_id = $2 AND coin_balance + $1 >= 0
        RETURNING coin_balance`,
      [amount, studentId],
    );
    if (!profile) throw new AppError(409, 'Insufficient coin balance');
    balanceAfter = profile.coin_balance;

    // аудит — в той же транзакции, без него баланс не изменится
    await client.query(
      `INSERT INTO coin_history
         (branch_id, student_id, actor_id, operation, amount, balance_after, reason, ref_type, ref_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [branchId, studentId, actorId, operation, amount, balanceAfter, reason, refType ?? null, refId ?? null],
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // после коммита: лидерборды (только заработанное, не покупки) + уведомление
  if (amount > 0) {
    await redis
      .multi()
      .zincrby(LEADERBOARD_WEEK, amount, studentId)
      .zincrby(LEADERBOARD_MONTH, amount, studentId)
      .exec();
  }

  await notificationQueue.add('coins.changed', { studentId, amount, reason });

  return { balanceAfter };
}
```

### 8.2 Лидерборды — read path из Redis

```js
// src/modules/gamification/leaderboard.service.js
export async function getTopStudents(redis, period, limit = 10) {
  const key = period === 'week' ? 'leaderboard:week' : 'leaderboard:month';
  const raw = await redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');

  const entries = [];
  for (let i = 0; i < raw.length; i += 2) {
    entries.push({ studentId: raw[i], coins: Number(raw[i + 1]), rank: i / 2 + 1 });
  }
  return entries; // имена/аватары дозагружаются одним SELECT ... WHERE id = ANY($1)
}
```

- Сброс: repeatable-джобы BullMQ — `leaderboard:week` в понедельник 00:00, `leaderboard:month` — 1-го числа. Перед сбросом снапшот сохраняется в Postgres (история «топов месяца»).
- Восстановление после потери Redis: пересчёт `SUM(amount) FROM coin_history WHERE amount > 0 AND created_at >= <период>`.

---

## 9. Telegram-уведомления через очередь

### 9.1 Producer

```js
// src/queues/notification.queue.js
import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.js';

export const notificationQueue = new Queue('notifications', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});
```

### 9.2 Worker (отдельный процесс `worker.js`)

```js
// src/queues/workers/notification.worker.js
import { Worker } from 'bullmq';
import { redisConnection } from '../../config/redis.js';
import { pool } from '../../config/db.js';
import { bot } from '../../modules/telegram/bot.js'; // grammY instance

const HANDLERS = {
  'coins.changed': async ({ studentId, amount, reason }) => {
    const chatIds = await resolveChatIds(studentId, ['student', 'parent']);
    const sign = amount > 0 ? '+' : '';
    await sendToAll(chatIds, `🪙 Coins: ${sign}${amount}\nПричина: ${reason}`);
  },
  'payment.received': async ({ studentId, amount }) => {
    const chatIds = await resolveChatIds(studentId, ['parent']);
    await sendToAll(chatIds, `✅ Оплата принята: ${fmt(amount)} сум`);
  },
  'debt.overdue': async ({ studentId, amount, dueDate }) => {
    const chatIds = await resolveChatIds(studentId, ['parent']);
    await sendToAll(chatIds, `⚠️ Просрочен платёж ${fmt(amount)} сум (срок: ${dueDate})`);
  },
  'homework.due': async ({ studentId, title, deadline }) => {
    const chatIds = await resolveChatIds(studentId, ['student']);
    await sendToAll(chatIds, `📚 Дедлайн завтра: «${title}» до ${deadline}`);
  },
};

export const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    const handler = HANDLERS[job.name];
    if (!handler) throw new Error(`Unknown notification type: ${job.name}`);
    await handler(job.data);
  },
  { connection: redisConnection, concurrency: 5, limiter: { max: 25, duration: 1000 } },
  // limiter: Telegram Bot API ≈ 30 msg/sec — держимся ниже
);

async function resolveChatIds(studentId, roles) {
  const { rows } = await pool.query(
    `SELECT ta.tg_chat_id
       FROM telegram_accounts ta
       JOIN users u ON u.id = ta.user_id
  LEFT JOIN student_profiles sp ON sp.parent_id = ta.user_id
      WHERE (ta.user_id = $1 AND 'student' = ANY($2))
         OR (sp.user_id = $1 AND 'parent'  = ANY($2))`,
    [studentId, roles],
  );
  return rows.map((r) => r.tg_chat_id);
}

async function sendToAll(chatIds, text) {
  for (const chatId of chatIds) {
    await bot.api.sendMessage(chatId, text);
  }
}

function fmt(n) {
  return new Intl.NumberFormat('ru-RU').format(n);
}
```

### 9.3 Регистрация в боте

`/start` → бот спрашивает роль (Student/Parent) → пользователь вводит одноразовый код привязки, который видит в своём профиле на сайте (`GET /api/telegram/link-code`, код живёт 10 минут в Redis) → бот вызывает внутренний endpoint, создаётся строка в `telegram_accounts`. Никаких паролей в Telegram.

---

## 10. Безопасность и продакшен

| Область | Решение |
|---|---|
| Пароли | argon2id, минимум 8 символов |
| JWT | access 15 мин + refresh 30 дней (httpOnly cookie), rotation: каждый refresh выдаёт новую пару и ревокает старый токен (`refresh_tokens`) |
| Rate limiting | `rate-limiter-flexible` с Redis-store; жёстче на `/auth/*` |
| Заголовки | `helmet`, CORS только на домен фронта |
| Валидация | zod-схемы на каждый endpoint (`validate` middleware); внутри системы данным доверяем |
| SQL | только параметризованные запросы `pg`; имена таблиц — из белых списков |
| Файлы | клиент никогда не пишет в S3 напрямую без presigned URL; ключи объектов не угадываемые (`uuid/originalName`) |
| Экзамены | правильные ответы (`tests.questions[].correct`) вырезаются на сервере перед отдачей; окно `starts_at/ends_at` и `duration_min` проверяются на сервере, не на клиенте |
| Заморозка | `status='frozen'` проверяется в `authenticate` (студент теряет доступ) и в платежах |
| Миграции | `node-pg-migrate`, только вперёд, каждая ревьюится |
| Бэкапы | `pg_dump` ежедневно + WAL-архив; Redis — AOF (лидерборды восстановимы из `coin_history`) |
| Логи | `pino` (JSON), request-id на каждый запрос |
| Graceful shutdown | SIGTERM → stop accepting → drain sockets → close pool/redis |

### 10.1 Хостинг — бесплатный облачный стек (для деплоя)

> Дев — локальный Docker (`docker-compose`). Прод/стейдж — managed-сервисы ниже.
> Всё на стандартных интерфейсах (Postgres/Redis/S3) → переключение **только через `.env`**, код не меняем.
> ⚠️ Инфра — зона Abdulaziz; переключение общего сетапа согласуется с ним. Личный `.env` каждый указывает сам.

| Компонент | Managed (free) | Лимит free | Заметка |
|---|---|---|---|
| PostgreSQL | **Neon** | ~0.5 ГБ, serverless | `DATABASE_URL` с `sslmode=require`; pool → SSL |
| Redis (кэш/OTP/очереди) | **Upstash** | 256 МБ, ~500k cmd/день | TLS `rediss://`; BullMQ требует `maxRetriesPerRequest: null` |
| Файлы (S3) | **Storj** (осн.) / **Supabase Storage** (альт.) | Storj 25 ГБ · Supabase 1 ГБ | оба S3-совместимы и **без карты**; переключение через `S3_ENDPOINT/S3_ACCESS_KEY/S3_SECRET_KEY` + `forcePathStyle`. R2 — 10 ГБ, но требует карту |
| Бэк (API + worker) | **Fly.io** / Railway | малый always-on | нужен always-on под sockets + BullMQ worker |
| Почта | **Brevo** | 300/день | после своего домена + DKIM/DMARC |

**S3 (файлы) — переключение только через `.env`, `config/s3.js` не меняем (оба S3-совместимы, `forcePathStyle: true`):**
- **Storj:** `S3_ENDPOINT=https://gateway.storjshare.io` + Access Key / Secret из Storj (S3-credentials)
- **Supabase:** `S3_ENDPOINT=https://<project>.supabase.co/storage/v1/s3` + ключи из Storage → S3 access
- локально (дев) — MinIO как сейчас.

Домен партнёра (`organizations.domain`) резолвит организацию; бэкенд один общий (мульти-аренда).

---

## Приложение: карта REST API (сводно)

| Метод | Путь | Роли |
|---|---|---|
| POST | `/api/auth/login` / `/refresh` / `/logout` | все |
| POST | `/api/main/partners` (онбординг: org+ceo+план+домен) | main_admin |
| GET | `/api/main/partners`, `/api/main/dashboard` | main_admin |
| GET/POST/PUT/DELETE | `/api/users` | ceo, admin (свой филиал) |
| POST | `/api/users/:id/freeze` | ceo, admin |
| GET/POST/PUT/DELETE | `/api/groups`, `/api/groups/:id/archive` | ceo, admin |
| GET/POST | `/api/attendance` | mentor (свои группы), admin |
| POST | `/api/payments` (full/split) | ceo, admin |
| POST | `/api/payments/installment`, `/installment/:scheduleId/pay` | ceo, admin |
| GET | `/api/reports/revenue`, `/api/reports/debts` | ceo (все), admin (филиал) |
| GET | `/api/reports/my-salary` | mentor |
| GET/POST | `/api/homework`, `/api/homework/:id/submissions` | mentor, admin, student (submit) |
| POST | `/api/homework/submissions/:id/grade` | mentor |
| GET/POST | `/api/tests`, `/api/tests/:id/start`, `/api/tests/:id/submit` | mentor/admin (create), student (take) |
| POST | `/api/gamification/coins` | mentor, admin |
| GET | `/api/gamification/leaderboard?period=week\|month` | все |
| GET/POST | `/api/shop/items`, `/api/shop/orders` | admin (items), student (orders) |
| GET | `/api/videos`, `/api/videos/:id/url` (presigned) | student (свои группы) |
| GET | `/api/chat/:roomKey/messages` | по членству в комнате |
| GET | `/api/telegram/link-code` | student, parent |
| GET | `/api/parent/child` (attendance/scores/debt) | parent |
