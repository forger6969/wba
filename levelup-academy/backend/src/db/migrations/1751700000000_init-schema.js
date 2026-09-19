/**
 * Initial schema — full DDL from docs/BACKEND-ARCHITECTURE.md §3
 * plus SaaS multi-tenancy changes from backend/TASKS.md §3:
 *   A1: organizations (tenant root)
 *   A2: organization_id on branches/users — two-level tenancy: organization → branch
 *   A3: 'main_admin' role (platform owners) above 'superadmin' (partner owner)
 *   A5: leads (landing-page requests)
 *   A7: expenses (branch expenses; income − expenses = profit)
 *
 * Ownership note (TASKS.md §7): миграционную инфру поднимает Abdulaziz; money/tenant
 * таблицы (invoices, transactions, payment_schedules, expenses, organizations, leads)
 * дальше эволюционирует Karis в своих миграциях.
 */

export const up = (pgm) => {
  pgm.sql(`
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- ---------- ENUMS ----------
CREATE TYPE user_role          AS ENUM ('main_admin', 'superadmin', 'admin', 'mentor', 'parent', 'student');
CREATE TYPE user_status        AS ENUM ('active', 'frozen', 'graduated', 'dropped');
CREATE TYPE org_status         AS ENUM ('trial', 'active', 'frozen');
CREATE TYPE lead_status        AS ENUM ('new', 'contacted', 'onboarded', 'rejected');
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

-- ---------- ORGANIZATIONS (A1 — tenant root: партнёр/учебный центр) ----------
CREATE TABLE organizations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(160) NOT NULL,
    owner_user_id UUID,                      -- FK добавляется после users (циклическая ссылка)
    status        org_status NOT NULL DEFAULT 'trial',
    plan          VARCHAR(60),               -- модель биллинга не определена (A6) — пока произвольная метка
    is_archived   BOOLEAN NOT NULL DEFAULT false,
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- BRANCHES (второй уровень аренды: organization → branch) ----------
CREATE TABLE branches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),   -- A2
    name            VARCHAR(120) NOT NULL,
    address         TEXT,
    phone           VARCHAR(32),
    is_main         BOOLEAN NOT NULL DEFAULT false,
    is_archived     BOOLEAN NOT NULL DEFAULT false,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ровно один главный филиал НА ОРГАНИЗАЦИЮ
CREATE UNIQUE INDEX uq_branches_main_per_org ON branches (organization_id) WHERE is_main = true;
CREATE INDEX idx_branches_org ON branches (organization_id) WHERE deleted_at IS NULL;

-- ---------- USERS (все роли в одной таблице) ----------
-- main_admin: organization_id IS NULL, branch_id IS NULL (уровень платформы)
-- superadmin: organization_id NOT NULL, branch_id IS NULL (уровень организации)
-- остальные:  organization_id NOT NULL, branch_id NOT NULL (уровень филиала)
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),            -- A2
    branch_id       UUID REFERENCES branches(id),
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
    CONSTRAINT chk_users_org_scope    CHECK (role = 'main_admin' OR organization_id IS NOT NULL),
    CONSTRAINT chk_users_branch_scope CHECK (role IN ('main_admin', 'superadmin') OR branch_id IS NOT NULL)
);
CREATE INDEX idx_users_branch_role ON users (branch_id, role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_org         ON users (organization_id) WHERE deleted_at IS NULL;

ALTER TABLE organizations
    ADD CONSTRAINT fk_organizations_owner FOREIGN KEY (owner_user_id) REFERENCES users(id);

-- ---------- LEADS (A5 — заявки с лендинга, зона Main Admin) ----------
CREATE TABLE leads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(120) NOT NULL,
    phone           VARCHAR(32)  NOT NULL,
    center_name     VARCHAR(160) NOT NULL,
    center_size     VARCHAR(60),
    message         TEXT,
    status          lead_status NOT NULL DEFAULT 'new',
    notes           TEXT,
    organization_id UUID REFERENCES organizations(id),  -- проставляется при онбординге
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_leads_status ON leads (status, created_at DESC);

-- ---------- EXPENSES (A7 — расходы филиала, зона Admin/Karis) ----------
CREATE TABLE expenses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    branch_id       UUID NOT NULL REFERENCES branches(id),
    category        VARCHAR(60) NOT NULL,
    amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    spent_at        DATE NOT NULL DEFAULT CURRENT_DATE,
    note            TEXT,
    created_by      UUID NOT NULL REFERENCES users(id),
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_expenses_branch_date ON expenses (branch_id, spent_at DESC) WHERE deleted_at IS NULL;

-- ---------- STUDENT PROFILES (1:1 с users, role = student) ----------
CREATE TABLE student_profiles (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    branch_id     UUID NOT NULL REFERENCES branches(id),
    parent_id     UUID REFERENCES users(id),   -- родитель (role = parent)
    coin_balance  INTEGER NOT NULL DEFAULT 0 CHECK (coin_balance >= 0),
    total_debt    NUMERIC(12,2) NOT NULL DEFAULT 0,
    frozen_at     TIMESTAMPTZ,
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

-- ---------- GROUP MEMBERSHIP (M:N student <-> group) ----------
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
    created_by   UUID NOT NULL REFERENCES users(id),
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
    split_batch_id UUID,                      -- связка частей одного сплит-платежа
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_transactions_invoice ON transactions (invoice_id);
CREATE INDEX idx_transactions_branch_date ON transactions (branch_id, created_at);

-- ---------- PAYMENT SCHEDULES (Halol Nasiya — график рассрочки) ----------
CREATE TABLE payment_schedules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id   UUID NOT NULL REFERENCES branches(id),
    invoice_id  UUID NOT NULL REFERENCES invoices(id),
    seq_number  SMALLINT NOT NULL CHECK (seq_number > 0),
    due_date    DATE NOT NULL,
    amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    status      schedule_status NOT NULL DEFAULT 'upcoming',
    paid_transaction_id UUID REFERENCES transactions(id),
    paid_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_schedule_seq UNIQUE (invoice_id, seq_number)
);
CREATE INDEX idx_schedules_due ON payment_schedules (status, due_date);

-- ---------- COIN HISTORY (append-only аудит геймификации) ----------
CREATE TABLE coin_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id   UUID NOT NULL REFERENCES branches(id),
    student_id  UUID NOT NULL REFERENCES users(id),
    actor_id    UUID NOT NULL REFERENCES users(id),   -- КТО начислил/списал
    operation   coin_operation NOT NULL,
    amount      INTEGER NOT NULL CHECK (amount <> 0), -- + начисление, - списание
    balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
    reason      TEXT NOT NULL,
    ref_type    VARCHAR(40),                          -- 'homework' | 'test' | 'shop_order' | ...
    ref_id      UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_coin_history_student ON coin_history (student_id, created_at DESC);
CREATE INDEX idx_coin_history_actor   ON coin_history (actor_id, created_at DESC);

-- ---------- CHAT MESSAGES ----------
-- branch_id NULLABLE: main_admin/superadmin пишут вне скоупа филиала
CREATE TABLE chat_messages (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id    UUID REFERENCES branches(id),
    chat_type    chat_type NOT NULL,
    room_key     VARCHAR(120) NOT NULL,   -- 'global' | 'parent:<uuid>' | 'group:<uuid>'
    sender_id    UUID NOT NULL REFERENCES users(id),
    body         TEXT NOT NULL CHECK (length(body) <= 4000),
    attachment_key TEXT,
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
    questions    JSONB NOT NULL,           -- [{q, options[], correct}] — correct не отдаётся клиенту
    duration_min SMALLINT NOT NULL CHECK (duration_min > 0),
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
    answers     JSONB NOT NULL DEFAULT '[]',
    score       SMALLINT,
    started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    CONSTRAINT uq_test_result UNIQUE (test_id, student_id)
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
  `);
};

export const down = (pgm) => {
  pgm.sql(`
DROP TABLE IF EXISTS
  refresh_tokens, telegram_accounts, videos, shop_orders, shop_items,
  test_results, tests, homework_submissions, homework, attendance,
  chat_messages, coin_history, payment_schedules, transactions, invoices,
  group_students, groups, student_profiles, expenses, leads
CASCADE;

ALTER TABLE organizations DROP CONSTRAINT IF EXISTS fk_organizations_owner;
DROP TABLE IF EXISTS users, branches, organizations CASCADE;

DROP TYPE IF EXISTS
  tg_role, homework_status, attendance_status, chat_type, coin_operation,
  schedule_status, transaction_status, invoice_type, invoice_status,
  payment_method, lead_status, org_status, user_status, user_role;
  `);
};
