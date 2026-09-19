/**
 * Main Admin включает/выключает партнёру доступ к конкретным фичам (кабинет
 * ученика, кабинет родителя, платные надбавки типа AI) — по умолчанию всё
 * выключено, пока Main Admin явно не включит. `feature_key` не привязан
 * к enum — платные фичи заводятся в каталоге (platform_addon_prices,
 * следующая миграция) произвольно, этой таблице всё равно, платная фича
 * или нет (это знает каталог).
 *
 * `access_until` — до какого дня организация оплачена (см. platform_org_payments) —
 * лежит на organizations, а не в отдельной таблице: единственное значение,
 * читается на каждый запрос (orgAccessGate), должно быть максимально дёшево.
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE org_feature_flags (
        organization_id UUID NOT NULL REFERENCES organizations(id),
        feature_key     VARCHAR(60) NOT NULL,
        enabled         BOOLEAN NOT NULL DEFAULT false,
        enabled_at      TIMESTAMPTZ,
        updated_by      UUID REFERENCES users(id),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (organization_id, feature_key)
    );

    ALTER TABLE organizations ADD COLUMN access_until DATE;
    CREATE INDEX idx_organizations_access_until ON organizations (access_until);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS org_feature_flags;
    ALTER TABLE organizations DROP COLUMN IF EXISTS access_until;
  `);
};
