/**
 * Генерация учётных данных для parent/student (у них нет email).
 *   - login_code: 8 символов, буквы+цифры (без похожих 0/O/1/I/l) — это их «логин»
 *   - password:   6 цифр
 * Обе строки генерит Admin при заведении ученика; показываются ему в панели.
 */
import crypto from 'node:crypto';

// без визуально похожих символов, чтобы не путать при диктовке
const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export function genLoginCode(len = 8) {
  let out = '';
  for (let i = 0; i < len; i += 1) {
    out += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
  }
  return out;
}

export function genNumericPassword(len = 6) {
  let out = '';
  for (let i = 0; i < len; i += 1) out += crypto.randomInt(0, 10);
  return out;
}

// временный пароль для email-ролей (ceo/admin/mentor) при заведении — показывается один раз
const PASS_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function genTempPassword(len = 10) {
  let out = '';
  for (let i = 0; i < len; i += 1) out += PASS_ALPHABET[crypto.randomInt(0, PASS_ALPHABET.length)];
  return out;
}
