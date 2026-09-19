/**
 * K-MAIN — онбординг партнёров + биллинг.
 *   - organizations.domain — свой домен партнёра (marsit-school.us), уникальный.
 *   - plan (уже есть VARCHAR) используем под 'pro' | 'max'.
 *
 * Зона: Karis (Main Admin). Согласовано в группе levelUp.
 */

export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS domain VARCHAR(190);

    CREATE UNIQUE INDEX uq_organizations_domain
      ON organizations (domain)
      WHERE domain IS NOT NULL AND deleted_at IS NULL;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS uq_organizations_domain;
    ALTER TABLE organizations DROP COLUMN IF EXISTS domain;
  `);
};
