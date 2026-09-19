/**
 * K-AUTH v3 — логин-код для parent/student.
 *   - admin/superadmin/main_admin/mentor входят по email,
 *   - parent/student — по сгенерированному логин-коду (8 симв. буквы+цифры) + пароль (6 цифр).
 *   login_code уникален среди «живых» строк, nullable (у email-ролей его нет).
 *
 * Зона: Karis (auth). Согласовано в группе levelUp.
 */

export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS login_code VARCHAR(16);

    CREATE UNIQUE INDEX uq_users_login_code
      ON users (login_code)
      WHERE login_code IS NOT NULL AND deleted_at IS NULL;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS uq_users_login_code;
    ALTER TABLE users DROP COLUMN IF EXISTS login_code;
  `);
};
