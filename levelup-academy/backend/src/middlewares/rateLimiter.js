import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redis } from '../config/redis.js';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/AppError.js';

/**
 * Rate limiter с Redis-store (общий на все инстансы API).
 *   app.use(createRateLimiter({ keyPrefix: 'rl:api', points: 100, duration: 60 }))
 *   router.use('/auth', createRateLimiter({ keyPrefix: 'rl:auth', points: 10, duration: 60 }))
 *
 * Превышение лимита reject'ится объектом RateLimiterRes (не Error) → 429.
 * Недоступность Redis reject'ится обычным Error → fail-open: инфра-сбой не
 * должен превращаться в 429 для всего трафика, включая login.
 */
export function createRateLimiter({ keyPrefix, points, duration }) {
  const limiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix,
    points,
    duration,
  });

  return async (req, _res, next) => {
    try {
      await limiter.consume(req.ip);
      next();
    } catch (err) {
      if (err instanceof Error) {
        logger.error({ err, keyPrefix }, 'Rate limiter store unavailable — failing open');
        return next();
      }
      next(new AppError(429, 'Too many requests, slow down'));
    }
  };
}
