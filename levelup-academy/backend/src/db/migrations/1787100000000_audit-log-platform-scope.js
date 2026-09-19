/**
 * Karis 25.08.2026: Audit Log переводится с «журнала организации» на журнал
 * всей платформы.
 *
 * Проблема: `organization_id NOT NULL` физически не давал записать действие
 * Main Admin — он вне организаций (`authorize.js` даёт ему
 * `organizationId: null`). Из-за этого в `modules/main/` не было НИ ОДНОГО
 * вызова аудита: замораживание партнёра, ручной платёж, бонусные месяцы,
 * переключение платных фич — всё уходило без следа. Теперь NULL = действие
 * уровня платформы, не привязанное к партнёру.
 *
 * `before`/`after` отдельными колонками, а не внутри `meta`: диффы нужны в
 * каждой финансовой записи, и когда у них своё место — их нельзя «забыть»
 * положить, а по jsonb-колонке можно искать. `reason` — для опасных операций
 * (заморозка партнёра, возврат), чтобы в журнале было не только «что», но и
 * «почему».
 *
 * Существующие строки не трогаются: у них organization_id как был, так и
 * остаётся заполненным.
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE audit_log ALTER COLUMN organization_id DROP NOT NULL;

    ALTER TABLE audit_log
      ADD COLUMN IF NOT EXISTS before_data JSONB,
      ADD COLUMN IF NOT EXISTS after_data  JSONB,
      ADD COLUMN IF NOT EXISTS reason      TEXT;

    -- Лента платформы (organization_id IS NULL) — свой индекс: без него
    -- страница Main Admin ушла бы в seq scan по всему журналу партнёров.
    CREATE INDEX IF NOT EXISTS idx_audit_platform
      ON audit_log (created_at DESC)
      WHERE organization_id IS NULL;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_audit_platform;

    ALTER TABLE audit_log
      DROP COLUMN IF EXISTS before_data,
      DROP COLUMN IF EXISTS after_data,
      DROP COLUMN IF EXISTS reason;

    -- Вернуть NOT NULL можно только если платформенных записей не осталось,
    -- иначе откат упадёт — это осознанно: молча удалять журнал нельзя.
    ALTER TABLE audit_log ALTER COLUMN organization_id SET NOT NULL;
  `);
};
