/**
 * Раньше анонс можно было отправить только "всем партнёрам" или "всем CEO"
 * (platform_announcement_target enum) — точечно одному-двум партнёрам не
 * получалось, у таблицы даже не было organization_id. Добавляем третий
 * вариант таргетинга + join-таблицу конкретных получателей.
 *
 * ALTER TYPE ... ADD VALUE не может быть в одной транзакции с DDL, которая
 * использует новое значение — поэтому в этом файле только добавление enum
 * и создание таблицы, без единого запроса с 'specific'.
 */
export const up = (pgm) => {
  pgm.noTransaction();
  pgm.sql(`ALTER TYPE platform_announcement_target ADD VALUE IF NOT EXISTS 'specific';`);
  pgm.sql(`
    CREATE TABLE platform_announcement_recipients (
        announcement_id UUID NOT NULL REFERENCES platform_announcements(id),
        organization_id UUID NOT NULL REFERENCES organizations(id),
        PRIMARY KEY (announcement_id, organization_id)
    );
  `);
};

export const down = (pgm) => {
  pgm.noTransaction();
  pgm.sql(`DROP TABLE IF EXISTS platform_announcement_recipients;`);
  // 'specific' value ни у одного enum в PostgreSQL нельзя удалить без пересоздания типа —
  // оставляем в down как есть (значение просто перестаёт использоваться в коде).
};
