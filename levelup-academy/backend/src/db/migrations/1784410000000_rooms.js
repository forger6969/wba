/**
 * Karis: Расписание (Jadval) — кабинеты как отдельная сущность филиала вместо
 * свободного текста в groups.room, чтобы можно было видеть занятость кабинета
 * и перетаскивать группу между кабинетами/временем на сетке. groups.room
 * (varchar) остаётся как есть — старые группы без кабинета из новой таблицы
 * не переезжают автоматически (нет способа сопоставить текст с записью
 * надёжно), room_id это новая необязательная связь поверх него.
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE rooms (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_id   UUID NOT NULL REFERENCES branches(id),
        name        VARCHAR(60) NOT NULL,
        capacity    INTEGER CHECK (capacity IS NULL OR capacity > 0),
        deleted_at  TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  pgm.sql(`CREATE INDEX idx_rooms_branch ON rooms (branch_id) WHERE deleted_at IS NULL;`);
  pgm.sql(`ALTER TABLE groups ADD COLUMN room_id UUID REFERENCES rooms(id);`);
  pgm.sql(`CREATE INDEX idx_groups_room ON groups (room_id) WHERE room_id IS NOT NULL;`);
};

export const down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS idx_groups_room;`);
  pgm.sql(`ALTER TABLE groups DROP COLUMN IF EXISTS room_id;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_rooms_branch;`);
  pgm.sql(`DROP TABLE IF EXISTS rooms;`);
};
