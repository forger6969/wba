import crypto from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Обратимое шифрование студенческих паролей — НЕ замена password_hash (тот
 * остаётся argon2 и используется для входа как раньше). Это отдельная копия
 * только для того, чтобы admin/branch_manager мог посмотреть пароль ученика
 * в любой момент (не только один раз при создании) — раньше при утере пароль
 * можно было только перегенерировать, что и было причиной жалобы Karis
 * 08.08.2026. Ключ выводится из JWT_ACCESS_SECRET (не заводим отдельный env,
 * который некому было бы сразу задать на Render) через SHA-256 с доменным
 * разделителем — если JWT-секрет когда-то ротируется, старые encrypted-записи
 * перестанут расшифровываться (это не login-путь, деградация некритична).
 */
const KEY = crypto.createHash('sha256').update(`${env.JWT_ACCESS_SECRET}:student-password-enc`).digest();
const ALGO = 'aes-256-gcm';

export function encryptPassword(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptPassword(payload) {
  const raw = Buffer.from(payload, 'base64');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const enc = raw.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
