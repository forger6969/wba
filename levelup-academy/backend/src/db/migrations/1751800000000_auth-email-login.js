/**
 * K-AUTH v2 — вход по email.
 *   - email становится опциональным идентификатором входа: уникален среди «живых»
 *     строк (partial unique). Остаётся nullable — у student/parent его может не быть.
 *   - phone больше не NOT NULL: админы заводятся по email, телефон опционален.
 *
 * Зона: Karis (auth). Согласовано в группе levelUp перед push.
 */

export const up = (pgm) => {
  pgm.sql(`
    -- email уникален только среди активных строк, NULL допускается многократно
    CREATE UNIQUE INDEX uq_users_email
      ON users (email)
      WHERE email IS NOT NULL AND deleted_at IS NULL;

    -- телефон больше не обязателен (вход по email)
    ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS uq_users_email;
    ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
  `);
};
