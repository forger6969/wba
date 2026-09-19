/**
 * Karis: QR-вход был одноразовым токеном на 5 минут (Redis) — на практике
 * неудобно: студент сканирует раз в день, а не в момент, когда admin держит
 * экран открытым. Переезжает на постоянный токен в Postgres — как студенческий
 * бейдж: сгенерирован один раз, работает бессрочно, пока admin его не
 * перевыпустит (см. admin/qr-login.repository.js regenerate).
 */
export const up = (pgm) => {
  pgm.sql(`ALTER TABLE users ADD COLUMN qr_token VARCHAR(32) UNIQUE;`);
  pgm.sql(`CREATE INDEX idx_users_qr_token ON users (qr_token) WHERE qr_token IS NOT NULL;`);
};

export const down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS idx_users_qr_token;`);
  pgm.sql(`ALTER TABLE users DROP COLUMN IF EXISTS qr_token;`);
};
