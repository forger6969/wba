import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

/**
 * 21.08.2026 — найдено вживую: без retryStrategy ioredis переподключается
 * дефолтными шагами (50мс×N, потолок 2с), а клиентов у нас ~15 (main, pub,
 * sub + Queue/Worker пара на каждую из 6 BullMQ-очередей). Когда Redis
 * реально недоступен (Upstash упёрся в лимит, см. ниже) — все 15 долбят
 * реконнектом каждые ~2с, каждый пишет error с полным стеком, это залило
 * лог до ~5 млн строк за 50 минут и утопило процесс (login отвечал 500 —
 * event loop был занят логированием, а не самим Redis). Шаг увеличен и
 * ограничен, чтобы частота попыток была на порядок ниже.
 */
function retryStrategy(times) {
  return Math.min(times * 500, 15000);
}

/** Полный err (со стеком и вложенными AggregateError) в проде смысла не
 * несёт — причина всегда одна и та же (сеть/квота), а объём лога решает
 * судьбу процесса при массовом реконнекте (см. комментарий выше). Короткая
 * строка вместо объекта — тот же диагноз, на два порядка меньше байт. */
function createClient(name, options = {}) {
  const testOptions = env.NODE_ENV === 'test'
    ? { retryStrategy: () => null, connectTimeout: 500, enableOfflineQueue: false }
    : { retryStrategy };
  const client = new Redis(env.REDIS_URL, { lazyConnect: false, ...testOptions, ...options });
  let lastLoggedMessage = '';
  let lastLoggedAt = 0;
  client.on('error', (err) => {
    const message = err?.message || 'Unknown Redis error';
    const now = Date.now();
    // One unavailable Redis used to produce millions of identical log lines,
    // starving the Node event loop and turning otherwise healthy logins into 500s.
    if (message !== lastLoggedMessage || now - lastLoggedAt >= 60_000) {
      lastLoggedMessage = message;
      lastLoggedAt = now;
      logger.error(`Redis error [${name}]: ${message}`);
    }
  });
  return client;
}

/**
 * Main client: cache (orgAccessGate), rate limiter, presence, leaderboards.
 * `commandTimeout` — без него один запрос к деградировавшему Redis (Upstash,
 * квота исчерпана — 11.08.2026) реально висит ~2с (замерено), потому что
 * ioredis успевает переподключиться и повторить команду, прежде чем она
 * дойдёт до вызывающего кода. Весь этот путь и так уже обёрнут в try/catch
 * с фолбэком на Postgres — таймаут просто заставляет фолбэк срабатывать
 * быстро, а не после долгого ожидания. Только на `main`: у BullMQ-соединения
 * и pub/sub-пары свои долгоживущие блокирующие команды, которым короткий
 * таймаут сломает работу.
 *
 * `enableOfflineQueue: false` — обнаружено 21.08.2026 вживую: commandTimeout
 * защищает только команду, УЖЕ отправленную по живому соединению. Пока
 * клиент переподключается (DNS/сеть недоступны — ровно так и было: Upstash
 * временно не резолвился), любая команда молча оседает в офлайн-очередь и
 * ждёт реального подключения — HTTP-запрос (в т.ч. логин, где Redis вообще
 * не должен участвовать, но глобальный rate-limiter стоит перед роутом)
 * висел, пока не подключится Redis, а не 400мс. С этим флагом такая команда
 * сразу падает ошибкой — try/catch-фолбэки срабатывают немедленно.
 */
export const redis = createClient('main', { commandTimeout: 400, enableOfflineQueue: false });

/** Dedicated pub/sub pair for @socket.io/redis-adapter. */
export const redisPub = createClient('pub');
export const redisSub = createClient('sub');

/** BullMQ requires maxRetriesPerRequest: null on its connection. */
export const redisConnection = createClient('bullmq', { maxRetriesPerRequest: null });

export async function closeRedis() {
  await Promise.allSettled([redis.quit(), redisPub.quit(), redisSub.quit(), redisConnection.quit()]);
}
