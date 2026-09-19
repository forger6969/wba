/**
 * Karis 08.08.2026: макс. число студентов в группе — тоже решение CEO, а не
 * ручной ввод при создании группы (тот же принцип, что и price в
 * 1783980000000_training-type-price.js). Nullable — у старых методик лимита
 * ещё нет, группа без training_type_id по-прежнему не ограничена отсюда.
 */
export const up = (pgm) => {
  pgm.sql(`ALTER TABLE training_types ADD COLUMN max_students INTEGER CHECK (max_students IS NULL OR max_students > 0);`);
};

export const down = (pgm) => {
  pgm.sql(`ALTER TABLE training_types DROP COLUMN IF EXISTS max_students;`);
};
