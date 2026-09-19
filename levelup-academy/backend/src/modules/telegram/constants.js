export const BIND_TOKEN_TTL_SECONDS = 600;
export const BIND_TOKEN_REDIS_PREFIX = 'telegram:bind:';
export const BIND_TOKEN_BYTES = 9;

export function bindTokenKey(token) {
  return `${BIND_TOKEN_REDIS_PREFIX}${token}`;
}

/**
 * Вход через Telegram.
 *
 * TTL короче, чем у привязки (600с): привязка — разовая настройка, её можно
 * отложить и вернуться, а вход человек делает здесь и сейчас. Чем меньше живёт
 * nonce, тем меньше окно, в которое подсмотренная ссылка ещё что-то значит.
 *
 * Префикс отдельный от bind: если перепутать пространства ключей, токен привязки
 * можно было бы предъявить как токен входа.
 */
export const LOGIN_NONCE_TTL_SECONDS = 180;
export const LOGIN_NONCE_REDIS_PREFIX = 'telegram:login:';
export const LOGIN_NONCE_BYTES = 16;

/** Значение ключа, пока бот ещё не подтвердил вход. */
export const LOGIN_PENDING = 'pending';

export function loginNonceKey(nonce) {
  return `${LOGIN_NONCE_REDIS_PREFIX}${nonce}`;
}

/**
 * Префикс в `/start <payload>`, отделяющий вход от привязки. Deep-link Telegram
 * отдаёт один аргумент, поэтому тип операции кодируется в нём же.
 */
export const LOGIN_PAYLOAD_PREFIX = 'login_';

/**
 * Привязка группы родителей филиала (Branch Manager). Отдельное пространство
 * ключей от личной привязки (BIND_TOKEN_REDIS_PREFIX) — код тут не должен
 * подходить как токен для входа личного аккаунта, и наоборот.
 * TTL длиннее личной привязки (600с): пока код получен в кабинете, Branch
 * Manager ещё должен вручную добавить бота в группу — это не мгновенно.
 */
export const BRANCH_BIND_TOKEN_TTL_SECONDS = 1800;
export const BRANCH_BIND_TOKEN_REDIS_PREFIX = 'telegram:branch-bind:';
export const BRANCH_BIND_TOKEN_BYTES = 6; // короче личного — вводится руками в группе, не по ссылке

export function branchBindTokenKey(token) {
  return `${BRANCH_BIND_TOKEN_REDIS_PREFIX}${token}`;
}
