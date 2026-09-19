/**
 * CEO не может сам включать/выключать себе платные фичи — только видеть
 * каталог (GET /api/super/features/catalog) и отправлять заявку Main
 * Admin'у на подключение/отключение. Approve дёргает тот же
 * setFeatureFlag(), что и прямое включение Main Admin'ом (включая
 * про-рейт-кредит при approve на remove) — заявка это ДОПОЛНИТЕЛЬНЫЙ канал,
 * не единственный путь изменения флага.
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TYPE feature_request_type AS ENUM ('add', 'remove');
    CREATE TYPE feature_request_status AS ENUM ('pending', 'approved', 'rejected');

    CREATE TABLE platform_feature_requests (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id  UUID NOT NULL REFERENCES organizations(id),
        feature_key      VARCHAR(60) NOT NULL,
        type             feature_request_type NOT NULL,
        status           feature_request_status NOT NULL DEFAULT 'pending',
        note             TEXT,
        requested_by     UUID NOT NULL REFERENCES users(id),
        reviewed_by      UUID REFERENCES users(id),
        reviewed_at      TIMESTAMPTZ,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_feature_requests_org ON platform_feature_requests (organization_id, created_at DESC);
    CREATE INDEX idx_feature_requests_pending ON platform_feature_requests (status) WHERE status = 'pending';
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS platform_feature_requests;
    DROP TYPE IF EXISTS feature_request_type;
    DROP TYPE IF EXISTS feature_request_status;
  `);
};
