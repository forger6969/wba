/**
 * Сумма (amount) была жёстко привязана к type='shtraf' (обязательна только у
 * него, у остальных NULL). Karis: жёлтое/красное предупреждение и увольнение
 * тоже должны уметь нести необязательную сумму — например «жёлтое
 * предупреждение + вычет 20 000 сум» одной записью, а не отдельным штрафом.
 * Штраф остаётся единственным типом, где сумма ОБЯЗАТЕЛЬНА.
 */
export const up = (pgm) => {
  pgm.sql(`
ALTER TABLE staff_penalties DROP CONSTRAINT chk_penalty_amount;
ALTER TABLE staff_penalties ADD CONSTRAINT chk_penalty_amount CHECK (
  (type = 'shtraf' AND amount IS NOT NULL AND amount >= 0)
  OR (type != 'shtraf' AND (amount IS NULL OR amount >= 0))
);
  `);

  pgm.sql(`
ALTER TABLE discipline_rules DROP CONSTRAINT chk_rule_amount;
ALTER TABLE discipline_rules ADD CONSTRAINT chk_rule_amount CHECK (
  (type = 'shtraf' AND amount IS NOT NULL AND amount >= 0)
  OR (type != 'shtraf' AND (amount IS NULL OR amount >= 0))
);
  `);
};

export const down = () => {
  // Проект мигрирует только вперёд (см. CONSTRAINTS.md).
};
