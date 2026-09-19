/**
 * Счета и долги партнёров (Karis 26.08.2026, пункт #4 из списка мониторинга).
 *
 * До этого истории счетов не было вообще — только кассовый журнал
 * (`platform_org_payments`, что реально заплатили) и `organizations.
 * access_until` (до какого числа открыт доступ). Спросить «сколько партнёр
 * должен» было нечем: тариф считается ЖИВЬЁМ по текущему числу пользователей
 * (config/plans.js → computeBill), а не хранится помесячно — партнёр,
 * выросший с 50 до 80 учеников, задним числом показал бы за март счёт по
 * сегодняшним 80, хотя в марте платил за 50.
 *
 * `tier_id`, `users_count`, `amount` — СНИМОК на момент выставления, не
 * пересчитываются. Это и есть разница между «счётом» и «текущей оценкой»:
 * once issued, a real bill does not change just because reality moved on.
 *
 * status НЕ включает 'overdue' — это производное состояние (due_date прошёл,
 * а оплата не закрыла сумму), а не то, что кто-то выставляет руками; хранить
 * его отдельно значило бы городить ещё один cron, который его то ставит,
 * то снимает при частичной оплате. Списки/API вычисляют его при чтении.
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TYPE platform_invoice_status AS ENUM ('pending', 'partially_paid', 'paid', 'cancelled');

    CREATE TABLE platform_invoices (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id  UUID NOT NULL REFERENCES organizations(id),
        period_covered   VARCHAR(7) NOT NULL, -- 'YYYY-MM', тот же формат, что platform_org_payments.period_covered
        tier_id          VARCHAR(20) NOT NULL,
        users_count      INT NOT NULL,
        amount           INT NOT NULL,
        paid_amount      INT NOT NULL DEFAULT 0,
        status           platform_invoice_status NOT NULL DEFAULT 'pending',
        due_date         DATE NOT NULL,
        issued_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        cancelled_at     TIMESTAMPTZ,
        cancel_reason    TEXT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

        -- один счёт на организацию за период — генерация идемпотентна,
        -- тот же приём, что у K-PAY chargeCurrentMonth (уникальный индекс
        -- страхует от дублей, даже если сгенерировать вручную и по крону разом)
        UNIQUE (organization_id, period_covered)
    );

    CREATE INDEX idx_platform_invoices_org ON platform_invoices (organization_id, period_covered DESC);
    CREATE INDEX idx_platform_invoices_unpaid ON platform_invoices (due_date)
      WHERE status IN ('pending', 'partially_paid');

    -- какой счёт закрыла конкретная оплата — NULL, если оплата не привязана
    -- ни к какому счёту (бонусные месяцы, старые записи до этой миграции)
    ALTER TABLE platform_org_payments ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES platform_invoices(id);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE platform_org_payments DROP COLUMN IF EXISTS invoice_id;
    DROP TABLE IF EXISTS platform_invoices;
    DROP TYPE IF EXISTS platform_invoice_status;
  `);
};
