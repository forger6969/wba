import crypto from 'node:crypto';

const TTL = 1800;
const key = (token) => `telegram:group-bind:${token}`;
const fallback = new Map();
const withTimeout = (promise, ms = 700) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), ms)),
]);

export class GroupBindTokenService {
  constructor({ redis }) { this.redis = redis; }
  async create(groupId) {
    for (let i = 0; i < 5; i += 1) {
      const token = crypto.randomBytes(6).toString('base64url');
      fallback.set(token, { groupId, expiresAt: Date.now() + TTL * 1000 });
      try { await withTimeout(this.redis.set(key(token), groupId, 'EX', TTL, 'NX')); } catch { /* memory fallback */ }
      return { token, expiresIn: TTL };
    }
    throw new Error('Failed to allocate group bind token');
  }
  async consume(token) {
    if (!token) return null;
    const local = fallback.get(token);
    if (local) {
      fallback.delete(token);
      return local.expiresAt > Date.now() ? local.groupId : null;
    }
    try { return await withTimeout(this.redis.getdel(key(token))); } catch { return null; }
  }
}
