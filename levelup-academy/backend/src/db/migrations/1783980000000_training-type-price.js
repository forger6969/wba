/**
 * Karis: цена абонемента — не за группой, а за методикой (training_types).
 * Методист заводит методику (имя/описание/иконка), Super Admin один раз
 * ставит ей цену — все группы этой методики наследуют её. `groups.subject`
 * остаётся как есть (свободный текст, обратная совместимость со старыми
 * группами без методики); `training_type_id` — новая необязательная связь,
 * когда группа заведена ЧЕРЕЗ методику. Обе колонки nullable: у старых
 * training_types цены ещё нет, у старых групп методики ещё нет.
 */
export const up = (pgm) => {
  pgm.sql(`ALTER TABLE training_types ADD COLUMN price NUMERIC(12, 2) CHECK (price IS NULL OR price >= 0);`);
  pgm.sql(`ALTER TABLE groups ADD COLUMN training_type_id UUID REFERENCES training_types(id);`);
  pgm.sql(`CREATE INDEX idx_groups_training_type ON groups (training_type_id) WHERE training_type_id IS NOT NULL;`);
};

export const down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS idx_groups_training_type;`);
  pgm.sql(`ALTER TABLE groups DROP COLUMN IF EXISTS training_type_id;`);
  pgm.sql(`ALTER TABLE training_types DROP COLUMN IF EXISTS price;`);
};
