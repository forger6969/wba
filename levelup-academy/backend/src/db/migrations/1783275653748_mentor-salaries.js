/**
 * mentor_salaries — зарплата ментора за месяц (зона Abdulaziz, AB-MENTOR).
 *
 * ⚠️ Модель расчёта не финализирована (fixed / % от выручки группы / за студента).
 *    Таблица хранит итоговые суммы; base_amount проставляется вручную (Admin), а
 *    сервис отдаёт «подсказку» из групп ментора (кол-во студентов × выручка) как
 *    decision-support. Финальную модель согласовать с тимлидом. Не связана с
 *    transactions Кариса (зарплата — отдельный денежный поток).
 *
 * Ownership (TASKS §7.1): имя файла анонсируется в группе до пуша.
 */

export const up = (pgm) => {
  pgm.sql(`
CREATE TYPE salary_status AS ENUM ('draft', 'approved', 'paid');

CREATE TABLE mentor_salaries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    branch_id       UUID NOT NULL REFERENCES branches(id),
    mentor_id       UUID NOT NULL REFERENCES users(id),
    period_month    DATE NOT NULL,                       -- первый день месяца
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
CREATE INDEX idx_mentor_salaries_mentor ON mentor_salaries (mentor_id, period_month DESC);
CREATE INDEX idx_mentor_salaries_branch ON mentor_salaries (branch_id, period_month DESC);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
DROP TABLE IF EXISTS mentor_salaries CASCADE;
DROP TYPE IF EXISTS salary_status;
  `);
};
