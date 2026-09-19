/**
 * Расширение дисциплины: два новых уровня взыскания между штрафом и увольнением,
 * плюс каталог правил ("qoyda") — организация один раз описывает, за что какой
 * уровень выдаётся, вместо того чтобы каждый раз формулировать причину заново
 * в свободном тексте устава.
 *
 *  - sariq (жёлтый) — предупреждение, без денег и без блокировки входа.
 *  - qizil (красный) — строгое предупреждение, тоже без денег и блокировки.
 *
 * Оба — чисто информационные записи, как и решили: НЕ автоматика (набор N
 * жёлтых/красных не порождает qora сам по себе — это остаётся ручным решением
 * Super Admin, как и раньше был только qora).
 *
 * discipline_rules — каталог, а не журнал выданных взысканий (тот остаётся в
 * staff_penalties). Правило не привязано к конкретному сотруднику: это запись
 * вида «систематическое опоздание → sariq» или «прогул → штраф 100000», на
 * которую потом ссылаются при выдаче взыскания.
 */
export const up = (pgm) => {
  pgm.sql(`
ALTER TYPE penalty_type ADD VALUE IF NOT EXISTS 'sariq';
ALTER TYPE penalty_type ADD VALUE IF NOT EXISTS 'qizil';
  `);

  pgm.sql(`
ALTER TABLE staff_penalties DROP CONSTRAINT chk_penalty_amount;
ALTER TABLE staff_penalties ADD CONSTRAINT chk_penalty_amount CHECK (
  (type = 'shtraf' AND amount IS NOT NULL AND amount >= 0)
  OR (type != 'shtraf' AND amount IS NULL)
);
  `);

  pgm.sql(`
CREATE TABLE discipline_rules (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type             penalty_type NOT NULL,
    amount           NUMERIC(12, 2),          -- только для shtraf, в сумах; NULL для остальных
    description      TEXT NOT NULL,
    created_by       UUID NOT NULL REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_rule_amount CHECK (
      (type = 'shtraf' AND amount IS NOT NULL AND amount >= 0)
      OR (type != 'shtraf' AND amount IS NULL)
    )
);

CREATE INDEX idx_discipline_rules_org ON discipline_rules (organization_id, created_at DESC);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
DROP TABLE IF EXISTS discipline_rules;
  `);
  // penalty_type: значения ENUM нельзя удалить (DROP VALUE не существует в Postgres) —
  // откат ограничения amount пропущен по той же причине, что и в staff-penalties:
  // миграции этого проекта только вперёд (см. CONSTRAINTS.md), down() здесь для
  // симметрии, а не для реального отката значений enum.
};
