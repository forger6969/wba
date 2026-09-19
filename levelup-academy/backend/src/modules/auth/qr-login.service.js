import crypto from 'node:crypto';
import { pool } from '../../config/db.js';

/**
 * Вход студента по QR-коду: admin/branch_manager показывает QR на экране
 * StudentDetail, студент сканирует камерой телефона (открывается ссылка на
 * member-app), ссылка сама логинит его — без набора логин-кода и пароля.
 *
 * ПОСТОЯННЫЙ токен, не одноразовый (решение Karis, 08.08.2026): раньше был
 * Redis-ключ с TTL 5 минут по образцу Telegram bind-token, но студент
 * сканирует не в момент, когда admin держит экран открытым, а когда угодно —
 * QR должен работать как бейдж: сгенерирован один раз на students.id,
 * дальше просто хранится в БД и не протухает. Перевыпуск — на случай утечки
 * (кто-то сфотографировал чужой QR) — см. regenerate().
 */
const QR_TOKEN_BYTES = 16;

async function createUniqueToken(userId) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = crypto.randomBytes(QR_TOKEN_BYTES).toString('base64url');
    try {
      await pool.query(`UPDATE users SET qr_token = $1 WHERE id = $2`, [token, userId]);
      return token;
    } catch (err) {
      if (err.code === '23505') continue; // коллизия уникального токена — генерируем заново
      throw err;
    }
  }
  throw new Error('Failed to allocate a unique QR login token');
}

/** Отдаёт существующий токен студента или заводит новый, если его ещё нет. */
export async function getOrCreateQrToken(userId) {
  const { rows: [row] } = await pool.query(`SELECT qr_token FROM users WHERE id = $1`, [userId]);
  if (row?.qr_token) return row.qr_token;
  return createUniqueToken(userId);
}

/** Перевыпуск — старый QR (напечатанный/сфотканный) сразу перестаёт работать. */
export async function regenerateQrToken(userId) {
  return createUniqueToken(userId);
}

/** userId по токену — без удаления, тот же QR читается сколько угодно раз. */
export async function resolveUserByQrToken(token) {
  if (!token) return null;
  const { rows: [row] } = await pool.query(
    `SELECT id FROM users WHERE qr_token = $1 AND deleted_at IS NULL`,
    [token],
  );
  return row?.id ?? null;
}
