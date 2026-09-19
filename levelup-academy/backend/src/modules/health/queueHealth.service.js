import { Queue } from 'bullmq';
import { redisConnection } from '../../config/redis.js';

/**
 * Наблюдение за очередями BullMQ (Karis 26.08.2026).
 *
 * Все 7 очередей платформы работают через тот же Redis, что сегодня же и
 * упёрся в лимит запросов — значит уведомления родителям об оплате,
 * просрочка, ежедневный дайджест и AI-проверка ДЗ могли тихо остановиться,
 * и никто бы не заметил, пока родитель не спросит «почему не пришло».
 *
 * Экземпляры Queue здесь — НЕ те же объекты, что в воркерах (те объявлены
 * как локальные const внутри своих файлов и не экспортированы). Новый
 * Queue с тем же именем и тем же подключением — стандартный приём чтения
 * состояния очереди (так же устроены готовые дашборды вроде Bull Board):
 * он ничего не потребляет из очереди, только читает счётчики.
 */
const QUEUE_NAMES = ['notifications', 'ai-review', 'billing', 'chat-retention', 'daily-digest', 'due-soon', 'overdue'];

const queues = new Map();
function getQueue(name) {
  if (!queues.has(name)) queues.set(name, new Queue(name, { connection: redisConnection }));
  return queues.get(name);
}

const CHECK_TIMEOUT_MS = 4000;

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Таймаут обязателен: redisConnection (в отличие от главного клиента) без
 * commandTimeout — BullMQ требует maxRetriesPerRequest:null на этом
 * подключении, а enableOfflineQueue по умолчанию включён, значит команда
 * при разорванном Redis не падает сразу, а копится в ожидании реконнекта.
 * Без своего таймаута это повесило бы саму проверку на минуты.
 */
export async function queuesHealth() {
  const results = await Promise.all(
    QUEUE_NAMES.map(async (name) => {
      try {
        const counts = await withTimeout(
          getQueue(name).getJobCounts('waiting', 'active', 'delayed', 'failed'),
          CHECK_TIMEOUT_MS,
        );
        return { name, ok: true, counts };
      } catch (err) {
        return { name, ok: false, error: err.message };
      }
    }),
  );
  return { queues: results, checkedAt: new Date().toISOString() };
}
