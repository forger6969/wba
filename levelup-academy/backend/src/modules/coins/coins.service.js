import { pool, withTransaction } from '../../config/db.js';
import { redis } from '../../config/redis.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../utils/AppError.js';
import { notificationQueue } from '../../queues/notification.queue.js';
import { isoWeekKey, monthKey } from '../../shared/period.js';
import * as repo from './coins.repository.js';

const LEADERBOARD_TTL_SEC = 100 * 24 * 3600; // ~3 месяца, старые периоды самоочищаются

// сколько знак операции должен соответствовать знаку суммы
const SIGN = {
  reward: (a) => a > 0,
  deduction: (a) => a < 0,
  purchase: (a) => a < 0,
  system: (a) => a !== 0,
};

const weekKeyFor = (branchId) => `lb:branch:${branchId}:week:${isoWeekKey()}`;
const monthKeyFor = (branchId) => `lb:branch:${branchId}:month:${monthKey()}`;

/**
 * ЕДИНСТВЕННАЯ точка изменения коинов (TASKS §6). Прямой UPDATE coin_balance запрещён.
 *
 *   await changeCoins({ studentId, actorId, amount, operation, reason, refType, refId });
 *
 * Атомарно: FOR UPDATE профиля → проверка баланса (>= 0) → UPDATE баланса →
 * append в coin_history. Возвращает { history, balanceAfter }.
 *
 * @param {object}  input
 * @param {'reward'|'deduction'|'purchase'|'system'} input.operation
 * @param {number}  input.amount  + начисление / − списание (знак должен совпадать с operation)
 * @param {import('pg').PoolClient} [client]
 *   Если передан — участвует в транзакции вызывающего и НЕ шлёт side-effects
 *   (лидерборд/уведомление): вызывающий сам зовёт emitCoinsChanged() после commit.
 *   Если не передан — оборачивает в собственную транзакцию и шлёт side-effects сам.
 */
export async function changeCoins(input, client = null) {
  const { studentId, actorId, amount, operation, reason, refType = null, refId = null,
    groupId = null } = input;

  if (!Number.isInteger(amount) || amount === 0) {
    throw new AppError(422, 'Coin amount must be a non-zero integer');
  }
  const signOk = SIGN[operation];
  if (!signOk) throw new AppError(422, `Unknown coin operation: ${operation}`);
  if (!signOk(amount)) {
    throw new AppError(422, `Amount sign does not match operation "${operation}"`);
  }
  if (!reason?.trim()) throw new AppError(422, 'Coin change reason is required');

  const run = async (db) => {
    const profile = await repo.lockStudentProfile(studentId, db);
    if (!profile) throw new AppError(404, 'Student profile not found');

    const balanceAfter = profile.coin_balance + amount;
    if (balanceAfter < 0) throw new AppError(422, 'Insufficient coin balance');

    await repo.setBalance(studentId, balanceAfter, db);
    const history = await repo.insertHistory(
      { branchId: profile.branch_id, studentId, actorId, operation, amount, balanceAfter,
        reason: reason.trim(), refType, refId, groupId },
      db,
    );
    return { history, balanceAfter, branchId: profile.branch_id };
  };

  // участвуем в чужой транзакции — side-effects на вызывающем
  if (client) return run(client);

  // своя транзакция — после commit шлём лидерборд + уведомление
  const result = await withTransaction(run);
  await emitCoinsChanged({
    studentId,
    branchId: result.branchId,
    amount,
    reason: reason.trim(),
  });
  return result;
}

/**
 * Побочные эффекты изменения коинов: инкремент ZSET-лидерборда (только на
 * положительных начислениях — лидерборд = заработанные коины, покупки не роняют
 * рейтинг) + постановка Telegram-уведомления в очередь. Никогда не бросает —
 * коины уже начислены в БД, эффекты best-effort.
 */
export async function emitCoinsChanged({ studentId, branchId, amount, reason }) {
  if (amount > 0 && branchId) {
    try {
      const wk = weekKeyFor(branchId);
      const mk = monthKeyFor(branchId);
      await redis
        .multi()
        .zincrby(wk, amount, studentId)
        .expire(wk, LEADERBOARD_TTL_SEC)
        .zincrby(mk, amount, studentId)
        .expire(mk, LEADERBOARD_TTL_SEC)
        .exec();
    } catch (err) {
      logger.error({ err, studentId }, 'Leaderboard update failed');
    }
  }

  try {
    await notificationQueue.add('coins.changed', { studentId, amount, reason });
  } catch (err) {
    logger.error({ err, studentId }, 'coins.changed notification enqueue failed');
  }
}

export async function getStudentHistory(studentId, { limit, offset, page }) {
  const [items, total] = await Promise.all([
    repo.findHistoryByStudent(studentId, { limit, offset }),
    repo.countHistoryByStudent(studentId),
  ]);
  return { items, total, page, limit };
}

/** Текущий баланс из профиля (без блокировки — для чтения). */
export async function getBalance(studentId) {
  const { rows: [row] } = await pool.query(
    `SELECT coin_balance FROM student_profiles WHERE user_id = $1`,
    [studentId],
  );
  if (!row) throw new AppError(404, 'Student profile not found');
  return row.coin_balance;
}
