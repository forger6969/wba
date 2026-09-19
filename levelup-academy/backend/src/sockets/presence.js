import { logger } from '../config/logger.js';

const PRESENCE_TTL = 60;                        // сек; heartbeat каждые ~25 сек
const ONLINE_SET = 'online_students';           // SET уникальных id
const keyOf = (id) => `online_students:${id}`;  // TTL-ключ на студента

const DASHBOARD_ROLES = new Set(['main_admin', 'ceo', 'admin']);

/**
 * Socket.IO не ловит reject async-листенеров — необработанная ошибка Redis
 * здесь роняет весь процесс (unhandled rejection). Поэтому каждый хендлер
 * обёрнут в try/catch: сбой presence — деградация счётчика, не краш API.
 */
export function registerPresence(io, socket, redis) {
  const { user } = socket;

  socket.on('presence:online', async () => {
    if (user.role !== 'student') return;
    try {
      // TTL-ключ (авто-очистка при обрыве) + SET (мгновенный COUNT без SCAN)
      await redis
        .multi()
        .set(keyOf(user.id), socket.id, 'EX', PRESENCE_TTL)
        .sadd(ONLINE_SET, user.id)
        .exec();
      await broadcastOnlineCount(io, redis);
    } catch (err) {
      logger.error({ err, userId: user.id }, 'presence:online failed');
    }
  });

  socket.on('presence:heartbeat', async () => {
    if (user.role !== 'student') return;
    try {
      await redis.expire(keyOf(user.id), PRESENCE_TTL);
    } catch (err) {
      logger.error({ err, userId: user.id }, 'presence:heartbeat failed');
    }
  });

  socket.on('disconnect', async () => {
    if (user.role !== 'student') return;
    try {
      await redis.multi().del(keyOf(user.id)).srem(ONLINE_SET, user.id).exec();
      await broadcastOnlineCount(io, redis);
    } catch (err) {
      logger.error({ err, userId: user.id }, 'presence:disconnect cleanup failed');
    }
  });

  // дашборды подписываются на комнату счётчика
  if (DASHBOARD_ROLES.has(user.role)) {
    socket.join('dashboards');
    getOnlineCount(redis)
      .then((count) => socket.emit('presence:count', { count }))
      .catch((err) => logger.error({ err }, 'presence:count initial emit failed'));
  }
}

async function getOnlineCount(redis) {
  // SET может содержать «протухшие» id (упавший процесс не вызвал disconnect) —
  // сверяем с живыми TTL-ключами и чистим лениво
  const ids = await redis.smembers(ONLINE_SET);
  if (ids.length === 0) return 0;

  const pipeline = redis.pipeline();
  ids.forEach((id) => pipeline.exists(keyOf(id)));
  const results = await pipeline.exec();

  const stale = ids.filter((_, i) => results[i][1] === 0);
  if (stale.length > 0) await redis.srem(ONLINE_SET, ...stale);

  return ids.length - stale.length;
}

async function broadcastOnlineCount(io, redis) {
  const count = await getOnlineCount(redis);
  io.to('dashboards').emit('presence:count', { count });
}
