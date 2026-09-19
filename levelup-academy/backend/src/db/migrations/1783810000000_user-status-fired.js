/**
 * Add 'fired' to user_status enum — staff terminated via a "qora" (black mark).
 * A fired user is blocked from login (like 'frozen') but the status is distinct
 * so it reads as a disciplinary termination, not a temporary freeze.
 */
export const up = (pgm) => {
  // Новое значение enum нельзя использовать в той же транзакции, где оно добавлено.
  // noTransaction() коммитит ADD VALUE отдельно (см. add-methodist-role).
  pgm.noTransaction();
  pgm.sql(`ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'fired'`);
};

export const down = (pgm) => {
  // PostgreSQL не даёт удалять значение enum без пересоздания типа.
  pgm.sql(`ALTER TYPE user_status RENAME TO user_status_old;
    CREATE TYPE user_status AS ENUM ('active', 'frozen', 'graduated', 'dropped');
    ALTER TABLE users ALTER COLUMN status TYPE user_status USING status::text::user_status;
    DROP TYPE user_status_old;`);
};
