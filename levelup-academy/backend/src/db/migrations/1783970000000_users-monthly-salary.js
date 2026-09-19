/**
 * Karis: карточка сотрудника должна нести оклад — не для авторасчёта прямо
 * сейчас («hozircha oyliklar hisoblanmasin»), просто поле должно существовать
 * и быть готово к использованию (например для % от оклада в дисциплине).
 * Необязательное, нет CHECK на диапазон — оклад не бизнес-правило этой
 * таблицы, а метаданные сотрудника.
 */
export const up = (pgm) => {
  pgm.sql(`ALTER TABLE users ADD COLUMN monthly_salary NUMERIC(12, 2);`);
};

export const down = (pgm) => {
  pgm.sql(`ALTER TABLE users DROP COLUMN IF EXISTS monthly_salary;`);
};
