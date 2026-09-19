import { pool } from '../../config/db.js';

/**
 * Блокирует строку профиля студента (SELECT ... FOR UPDATE) и возвращает баланс/скоуп.
 * ДОЛЖЕН вызываться внутри транзакции (передаётся client).
 */
export async function lockStudentProfile(studentId, client) {
  const { rows: [profile] } = await client.query(
    `SELECT user_id, branch_id, coin_balance
       FROM student_profiles
      WHERE user_id = $1
      FOR UPDATE`,
    [studentId],
  );
  return profile ?? null;
}

export async function setBalance(studentId, newBalance, client) {
  await client.query(
    `UPDATE student_profiles
        SET coin_balance = $2, updated_at = now()
      WHERE user_id = $1`,
    [studentId, newBalance],
  );
}

export async function insertHistory(entry, client) {
  const { branchId, studentId, actorId, operation, amount, balanceAfter, reason, refType, refId,
    // Из какого месячного бюджета операция. NULL для всего, что бюджета ментора
    // не касается: покупок в магазине, начислений админом, системных.
    groupId } = entry;
  const { rows: [row] } = await client.query(
    `INSERT INTO coin_history
       (branch_id, student_id, actor_id, operation, amount, balance_after, reason, ref_type,
        ref_id, group_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, branch_id, student_id, actor_id, operation, amount, balance_after,
               reason, ref_type, ref_id, group_id, created_at`,
    [branchId, studentId, actorId, operation, amount, balanceAfter, reason, refType ?? null,
      refId ?? null, groupId ?? null],
  );
  return row;
}

/** История коинов студента (append-only аудит), новые сверху. */
export async function findHistoryByStudent(studentId, { limit, offset }) {
  const { rows } = await pool.query(
    `SELECT id, operation, amount, balance_after, reason, ref_type, ref_id, created_at
       FROM coin_history
      WHERE student_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3`,
    [studentId, limit, offset],
  );
  return rows;
}

export async function countHistoryByStudent(studentId) {
  const { rows: [{ count }] } = await pool.query(
    `SELECT count(*)::int AS count FROM coin_history WHERE student_id = $1`,
    [studentId],
  );
  return count;
}
