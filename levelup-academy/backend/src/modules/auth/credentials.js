/**
 * Генерация учётных данных для parent/student (у них нет email).
 *   - login_code: 5 цифр — это их «логин»
 *   - password:   6 цифр
 * Обе строки генерит Admin при заведении ученика; показываются ему в панели.
 */
import crypto from 'node:crypto';

export const LOGIN_CODE_LENGTH = 5;

/* Первая цифра кодирует роль — так заведено в уже выданных кодах WBA:
   ученики 1xxxx, родители 2xxxx. Генератор обязан попадать в ту же схему,
   иначе новый ученик получил бы код из «родительского» диапазона и живые
   списки перестали бы читаться глазами. */
const ROLE_PREFIX = { student: '1', parent: '2' };
const FALLBACK_PREFIX = '3';

/**
 * 5 цифр: префикс роли + 4 случайные.
 *
 * Было 8 символов буквами и цифрами. Заменено 24.09.2026 по требованию WBA:
 * код диктуют детям голосом и вводят с телефона, буквы в этом сценарии —
 * источник ошибок. Уникальность обеспечивает не генератор, а уникальный
 * индекс uq_users_login_code: вызывающий код ретраит коллизию
 * (admin.service.insertCodeUserWithCode). На роль приходится 10 000 кодов
 * при сотне живых учеников, так что ретрай — редкость.
 */
export function genLoginCode(role) {
  const prefix = ROLE_PREFIX[role] ?? FALLBACK_PREFIX;
  let out = prefix;
  for (let i = 1; i < LOGIN_CODE_LENGTH; i += 1) out += crypto.randomInt(0, 10);
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
