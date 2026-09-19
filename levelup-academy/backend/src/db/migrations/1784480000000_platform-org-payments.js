/**
 * Единый append-only журнал денег между платформой и партнёром: реальная
 * оплата (наличные/карта), бонусный бесплатный период, про-рейт-кредит за
 * досрочно отключённую платную фичу. `type='payment'` — единственный тип,
 * который считается настоящей выручкой платформы (бонус — 0 по определению,
 * кредит показывается партнёру, но не платформе как доход).
 *
 * Никогда не UPDATE/DELETE строки этой таблицы — только INSERT, история
 * должна быть неизменяемой (это выписка, а не рабочая переменная).
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TYPE org_payment_type AS ENUM ('payment', 'bonus', 'addon_credit');
    CREATE TYPE org_payment_method AS ENUM ('cash', 'card', 'transfer', 'other');

    CREATE TABLE platform_org_payments (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id  UUID NOT NULL REFERENCES organizations(id),
        type             org_payment_type NOT NULL,
        amount           INTEGER NOT NULL DEFAULT 0,
        method           org_payment_method,
        period_covered   VARCHAR(7),
        months_granted   SMALLINT,
        feature_key      VARCHAR(60),
        note             TEXT,
        created_by       UUID NOT NULL REFERENCES users(id),
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_platform_org_payments_org ON platform_org_payments (organization_id, created_at DESC);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS platform_org_payments;
    DROP TYPE IF EXISTS org_payment_type;
    DROP TYPE IF EXISTS org_payment_method;
  `);
};
