import { pool } from '../config/db.js';
import { redis } from '../config/redis.js';
import { AppError } from '../utils/AppError.js';
import { isOrgAccessBlocked } from '../shared/orgAccess.js';

const CACHE_TTL_SECONDS = 45;
const cacheKey = (orgId) => `org:access:${orgId}`;

/**
 * Блокирует ВЕСЬ доступ организации (все роли: ceo/admin/mentor/methodist/
 * branch_manager/student/parent, все методы), если Main Admin заморозил
 * партнёра или партнёр не заплатил и грейс-период (до 5 числа следующего
 * месяца) истёк. `main_admin` не org-scoped (organizationId=null) — пропускается
 * молча, как и любой запрос без организации.
 *
 * Токен access-jwt статeless (без похода в БД, ~1ч живёт) — на одном только
 * login-check доступ уже выданному токену продолжал бы работать до истечения.
 * Здесь — per-request проверка (тот же паттерн, что paymentGate.js), но с
 * коротким Redis-кэшем на 45с, чтобы не бить БД на каждый запрос; кэш явно
 * сбрасывается (invalidateOrgAccessCache) при любом изменении access_until/
 * status/фич из main.service.js — блокировка Main Admin'ом видна сразу, не
 * через 45 секунд.
 */
export async function orgAccessGate(req, _res, next) {
  const orgId = req.user?.organizationId;
  if (!orgId) return next();

  try {
    const org = await getOrgAccessRow(orgId);
    const check = isOrgAccessBlocked(org);
    if (check.blocked) {
      return next(new AppError(402, 'Organization access suspended — contact platform owner', { reason: check.reason }));
    }
    next();
  } catch (err) {
    next(err);
  }
}

async function getOrgAccessRow(orgId) {
  const cached = await redis.get(cacheKey(orgId)).catch(() => null);
  // Redis may be unavailable in local development. Some failed/replayed
  // ioredis commands can resolve with a non-cache diagnostic value; never let
  // malformed cache data turn every protected API route into HTTP 500.
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // Treat an invalid cache entry as a miss and use PostgreSQL below.
    }
  }

  const { rows } = await pool.query(
    `SELECT status, access_until FROM organizations WHERE id = $1 AND deleted_at IS NULL`,
    [orgId],
  );
  const org = rows[0] ?? null;
  await redis.set(cacheKey(orgId), JSON.stringify(org), 'EX', CACHE_TTL_SECONDS).catch(() => {});
  return org;
}

/** Дёргать из main.service.js после любого изменения access_until/status/флагов. */
export async function invalidateOrgAccessCache(orgId) {
  await redis.del(cacheKey(orgId)).catch(() => {});
}
