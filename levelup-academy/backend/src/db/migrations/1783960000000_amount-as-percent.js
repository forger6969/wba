/**
 * amount перестаёт быть суммой в сумах — Karis: это процент от оклада,
 * который вычитается («жёлтое предупреждение» + «−5% от оклада» одной
 * записью). Колонку не переименовываем (NUMERIC(12,2) одинаково годится и
 * для сумм, и для процентов, лишняя миграция ради имени не нужна), но
 * ограничиваем диапазоном 0..100 — раньше верхней границы не было вообще.
 */
export const up = (pgm) => {
  // единственная тестовая запись с суммой (1000 сум, ещё с эпохи shtraf) не
  // впишется в диапазон 0..100 — это клик самого Karis при тестировании, не
  // боевые данные, обнуляем перед тем как ограничивать диапазон
  pgm.sql(`UPDATE staff_penalties SET amount = NULL WHERE amount > 100;`);

  pgm.sql(`
ALTER TABLE staff_penalties DROP CONSTRAINT chk_penalty_amount;
ALTER TABLE staff_penalties ADD CONSTRAINT chk_penalty_amount CHECK (amount IS NULL OR (amount >= 0 AND amount <= 100));
  `);

  pgm.sql(`
ALTER TABLE discipline_rules DROP CONSTRAINT chk_rule_amount;
ALTER TABLE discipline_rules ADD CONSTRAINT chk_rule_amount CHECK (amount IS NULL OR (amount >= 0 AND amount <= 100));
  `);
};

export const down = () => {
  // Проект мигрирует только вперёд (см. CONSTRAINTS.md).
};
