import crypto from 'node:crypto';
import { BRANCH_BIND_TOKEN_BYTES, BRANCH_BIND_TOKEN_TTL_SECONDS, branchBindTokenKey } from './constants.js';

/** Код привязки группы родителей филиала. Тот же приём, что и
 * TelegramBindTokenService (личная привязка), но без deep-link — код
 * вводится руками командой /bindbranch <код> в самой группе, deep-link
 * с ?start= не заходит в группу автоматически (Telegram открывает
 * приватный чат с ботом, а не групповой). */
export class BranchBindTokenService {
  constructor({ redis, tokenTtlSeconds = BRANCH_BIND_TOKEN_TTL_SECONDS }) {
    if (!redis) throw new Error('redis is required');
    this.redis = redis;
    this.tokenTtlSeconds = tokenTtlSeconds;
  }

  async createForBranch(branchId) {
    if (!branchId) throw new Error('branchId is required');
    const token = await this.#createUniqueToken(branchId);
    return { token, expiresIn: this.tokenTtlSeconds };
  }

  async consume(token) {
    if (!token) return null;
    const branchId = await this.redis.getdel(branchBindTokenKey(token));
    return branchId || null;
  }

  async #createUniqueToken(branchId) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const token = crypto.randomBytes(BRANCH_BIND_TOKEN_BYTES).toString('base64url');
      const ok = await this.redis.set(branchBindTokenKey(token), branchId, 'EX', this.tokenTtlSeconds, 'NX');
      if (ok === 'OK') return token;
    }
    throw new Error('Failed to allocate a unique branch bind token');
  }
}
