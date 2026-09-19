/**
 * shtraf уходит как отдельная категория — Karis: только 3 уровня (sariq/
 * qizil/qora), деньги — необязательный довесок к любому из них, а не 4-я
 * категория. penalty_type (ENUM) не трогаем: Postgres не умеет вычёркивать
 * значения из ENUM, а старые записи с type='shtraf' (тестовые, до этого
 * решения) должны остаться читаемыми. Приложение просто больше не создаёт
 * новых shtraf-строк (см. discipline.schemas.js PENALTY_TYPES).
 *
 * Ограничение на amount было «обязательна у shtraf, у остальных запрещена/
 * необязательна» — раз обязательного типа больше нет, сумма просто всегда
 * необязательна (если есть — неотрицательная).
 */
export const up = (pgm) => {
  pgm.sql(`
ALTER TABLE staff_penalties DROP CONSTRAINT chk_penalty_amount;
ALTER TABLE staff_penalties ADD CONSTRAINT chk_penalty_amount CHECK (amount IS NULL OR amount >= 0);
  `);

  pgm.sql(`
ALTER TABLE discipline_rules DROP CONSTRAINT chk_rule_amount;
ALTER TABLE discipline_rules ADD CONSTRAINT chk_rule_amount CHECK (amount IS NULL OR amount >= 0);
  `);
};

export const down = () => {
  // Проект мигрирует только вперёд (см. CONSTRAINTS.md).
};
