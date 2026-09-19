import pg from 'pg';
import { env } from './env.js';
import { logger } from './logger.js';

/**
 * DATE отдаём строкой «YYYY-MM-DD», как он лежит в базе.
 *
 * По умолчанию драйвер превращает DATE в JS-Date, подставляя ЛОКАЛЬНУЮ полночь
 * сервера. В зоне UTC+5 дата урока 2026-07-17 становится объектом, который в
 * JSON сериализуется как «2026-07-16T19:00:00.000Z», — клиент отрезает первые
 * десять символов и получает 16-е июля. Журнал давомата целиком съезжал на
 * день назад; проверено на живой базе: в таблице 17-е, в ответе API 16-е.
 *
 * Календарной дате часовой пояс не нужен по определению: дата урока, срок
 * оплаты, месяц периода и день рождения не «происходят» в момент времени.
 * Поэтому правка стоит на уровне драйвера, а не в отдельном запросе, — иначе
 * тот же сдвиг ждал бы каждую из семи DATE-колонок при первом же обращении.
 *
 * 1082 — OID типа DATE в Postgres. TIMESTAMPTZ (например homework.deadline)
 * это не затрагивает: там момент времени, и часовой пояс уместен.
 */
pg.types.setTypeParser(1082, (value) => value);

/**
 * connectionTimeoutMillis: 5 с хватает локальному докеру, но не managed-базе,
 * которая спит. Neon на бесплатном плане останавливает compute при простое, и
 * первое подключение будит его — это занимает больше пяти секунд. Итог был
 * виден на проде: первый запрос после паузы падал с «Connection terminated due
 * to connection timeout», пользователь получал 500 на входе, а повторная
 * попытка сразу проходила. Для базы с холодным стартом ждём дольше.
 */
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: env.DB_CONNECT_TIMEOUT_MS,
  // Managed PostgreSQL can silently drop a long-lived TCP connection. Keep
  // sockets alive and recycle clients before a stale one reaches a login.
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
  maxLifetimeSeconds: 300,
  // A dead remote connection must fail quickly instead of keeping every login
  // request open until the whole pool is exhausted.
  query_timeout: 30_000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle PostgreSQL client');
});

/**
 * Karis 25.08.2026: pool.on('error') выше ловит ТОЛЬКО простаивающих клиентов
 * внутри пула. Клиент, уже выданный через pool.connect() (withTransaction,
 * mentor/coins.service), при обрыве соединения эмитит 'error' сам на себе — а
 * слушателя на нём нет. EventEmitter без слушателя 'error' бросает синхронно,
 * и это НЕ unhandledRejection (тот обработчик в server.js процесс бы удержал),
 * а uncaughtException, которого в проекте нет вообще — падал весь процесс.
 *
 * Из-за этого бэкенд ложился целиком несколько раз за 25.08 с
 * 'Connection terminated unexpectedly': Neon на бесплатном плане рвёт
 * простаивающие соединения, и вместо переподключения умирал сервер.
 *
 * Слушатель ничего не проглатывает: промис самого запроса отклоняется отдельно
 * и доходит до вызывающего кода как раньше. Он лишь снимает падение процесса —
 * пул выбрасывает битое соединение и открывает новое.
 */
pool.on('connect', (client) => {
  client.on('error', (err) => {
    logger.error({ err }, 'PostgreSQL client error (соединение будет пересоздано)');
  });
});

/** Shortcut for one-off queries (no transaction). */
export const query = (text, params) => pool.query(text, params);

/**
 * Runs `fn(client)` inside a transaction. Commits on success, rolls back on error.
 *   await withTransaction(async (client) => { ... });
 * If ROLLBACK itself fails (dead connection mid-transaction), the original
 * error is preserved and the client is destroyed instead of returning a
 * possibly-dirty connection to the pool.
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  let released = false;
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      logger.error({ err: rollbackErr }, 'ROLLBACK failed after transaction error');
      released = true;
      client.release(rollbackErr); // не возвращаем в пул потенциально битое соединение
    }
    throw err;
  } finally {
    if (!released) client.release();
  }
}
