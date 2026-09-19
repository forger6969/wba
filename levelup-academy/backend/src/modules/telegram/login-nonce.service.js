import crypto from 'node:crypto';
import {
  LOGIN_NONCE_BYTES,
  LOGIN_NONCE_TTL_SECONDS,
  LOGIN_PENDING,
  loginNonceKey,
} from './constants.js';

const localLoginNonces = new Map();

function localGet(nonce) {
  const item = localLoginNonces.get(nonce);
  if (!item || item.expiresAt <= Date.now()) {
    localLoginNonces.delete(nonce);
    return null;
  }
  return item;
}

/**
 * Вход через Telegram: браузер и бот встречаются на одном одноразовом nonce.
 *
 *   create()   — фронт получает nonce и deep-link, в Redis кладётся `pending`
 *   approve()  — бот нашёл чат в telegram_accounts и подставляет userId
 *   claim()    — фронт смотрит, подтверждено ли (ключ НЕ удаляется)
 *   consume()  — вызывается ПОСЛЕ того, как сессия реально выдана
 *
 * Почему nonce, а не сразу токены в боте: access-token нельзя отдавать в чат —
 * он останется в истории переписки и в бэкапах Telegram навсегда. Через nonce в
 * чат уходит только «да, это он», а сами токены выдаются браузеру по HTTPS.
 */
export class TelegramLoginNonceService {
  constructor({ redis, botUsername, ttlSeconds = LOGIN_NONCE_TTL_SECONDS }) {
    if (!redis) throw new Error('redis is required');
    this.redis = redis;
    this.botUsername = botUsername;
    this.ttlSeconds = ttlSeconds;
  }

  async create() {
    if (!this.botUsername) {
      throw new Error('TELEGRAM_BOT_USERNAME is required to build a deep link');
    }

    const nonce = await this.#createUniqueNonce();

    return {
      nonce,
      expiresIn: this.ttlSeconds,
      deepLink: `https://t.me/${this.botUsername}?start=login_${encodeURIComponent(nonce)}`,
    };
  }

  /**
   * Проставить userId существующему nonce.
   *
   * `XX` — только если ключ уже есть: иначе бот с выдуманным или уже протухшим
   * nonce создавал бы новую запись, и «вход» появлялся бы там, где его никто не
   * начинал. Обновление не продлевает TTL — окно остаётся тем, что задал фронт.
   */
  async approve(nonce, userId) {
    if (!nonce || !userId) return false;
    try {
      const res = await this.redis.set(loginNonceKey(nonce), userId, 'KEEPTTL', 'XX');
      return res === 'OK';
    } catch (error) {
      if (process.env.NODE_ENV === 'production') throw error;
      const item = localGet(nonce);
      if (!item) return false;
      item.value = userId;
      return true;
    }
  }

  /**
   * Посмотреть результат БЕЗ удаления ключа. Раньше это удаляло nonce сразу —
   * если после этого выдача сессии (loginByUserId) падала (напр. Redis сам не
   * отвечает, org-гейт и т.п.), настоящая ошибка терялась: следующий опрос
   * видел уже пустой ключ и показывал «ссылка истекла» вместо реальной причины.
   * Теперь удаление — отдельный шаг (`consume`), вызывающий код зовёт его
   * только после того, как сессия реально выдана.
   */
  async claim(nonce) {
    if (!nonce) return { status: 'unknown' };
    let value;
    try {
      value = await this.redis.get(loginNonceKey(nonce));
    } catch (error) {
      if (process.env.NODE_ENV === 'production') throw error;
      value = localGet(nonce)?.value ?? null;
    }
    if (value === null) return { status: 'unknown' }; // не выдавали или уже истёк
    if (value === LOGIN_PENDING) return { status: 'pending' };
    return { status: 'approved', userId: value };
  }

  /** Одноразовость: зовётся ПОСЛЕ успешной выдачи сессии, не до. */
  async consume(nonce) {
    try {
      await this.redis.del(loginNonceKey(nonce));
    } catch (error) {
      if (process.env.NODE_ENV === 'production') throw error;
    }
    localLoginNonces.delete(nonce);
  }

  async #createUniqueNonce() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const nonce = crypto.randomBytes(LOGIN_NONCE_BYTES).toString('base64url');
      try {
        const ok = await this.redis.set(
          loginNonceKey(nonce),
          LOGIN_PENDING,
          'EX',
          this.ttlSeconds,
          'NX',
        );
        if (ok === 'OK') return nonce;
      } catch (error) {
        if (process.env.NODE_ENV === 'production') throw error;
        localLoginNonces.set(nonce, {
          value: LOGIN_PENDING,
          expiresAt: Date.now() + this.ttlSeconds * 1000,
        });
        return nonce;
      }
    }
    throw new Error('Failed to allocate a unique Telegram login nonce');
  }
}
