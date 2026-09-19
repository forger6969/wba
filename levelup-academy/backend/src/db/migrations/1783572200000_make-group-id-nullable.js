/**
 * Make group_id nullable in tests and homework tables.
 * Методист создаёт тесты/ДЗ на уровне организации (без привязки к конкретной группе),
 * поэтому group_id должен быть опциональным.
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE tests    ALTER COLUMN group_id DROP NOT NULL;
    ALTER TABLE homework ALTER COLUMN group_id DROP NOT NULL;
  `);
};

export const down = (pgm) => {
  // Сначала удаляем строки с NULL group_id, иначе ALTER не пройдёт
  pgm.sql(`
    DELETE FROM homework WHERE group_id IS NULL;
    DELETE FROM tests    WHERE group_id IS NULL;
    ALTER TABLE tests    ALTER COLUMN group_id SET NOT NULL;
    ALTER TABLE homework ALTER COLUMN group_id SET NOT NULL;
  `);
};
