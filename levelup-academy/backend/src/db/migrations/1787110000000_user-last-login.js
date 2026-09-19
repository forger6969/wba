export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS idx_users_org_last_login
      ON users (organization_id, last_login_at DESC)
      WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_platform_payments_org_type_period
      ON platform_org_payments (organization_id, type, period_covered DESC);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_platform_payments_org_type_period;
    DROP INDEX IF EXISTS idx_users_org_last_login;
    ALTER TABLE users DROP COLUMN IF EXISTS last_login_at;
  `);
};
