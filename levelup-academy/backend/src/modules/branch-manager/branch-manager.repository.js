import { pool } from '../../config/db.js';

/** Сам филиал (имя/адрес/телефон/главный ли) — отдельно от branchStats, там только числа. */
export function branchInfo(branchId, client = pool) {
  return client
    .query(
      `SELECT id, name, address, phone, is_main FROM branches
        WHERE id = $1 AND deleted_at IS NULL`,
      [branchId],
    )
    .then((r) => r.rows[0] ?? null);
}

export function branchStats(branchId, client = pool) {
  return client
    .query(
      `SELECT
         (SELECT count(*) FROM users u
            WHERE u.branch_id = $1 AND u.role = 'student'
              AND u.status = 'active' AND u.deleted_at IS NULL)::int AS students,
         (SELECT count(*) FROM users u
            WHERE u.branch_id = $1 AND u.role = 'mentor' AND u.deleted_at IS NULL)::int AS mentors,
         (SELECT count(*) FROM groups g
            WHERE g.branch_id = $1 AND g.deleted_at IS NULL)::int AS groups,
         (SELECT count(*) FROM users u
            WHERE u.branch_id = $1 AND u.role = 'admin' AND u.deleted_at IS NULL)::int AS admins,
         (SELECT COALESCE(SUM(i.paid_amount), 0) FROM invoices i
            WHERE i.branch_id = $1) AS revenue,
         (SELECT COALESCE(SUM(e.amount), 0) FROM expenses e
            WHERE e.branch_id = $1 AND e.deleted_at IS NULL) AS expenses,
         (SELECT COALESCE(SUM(sp.total_debt), 0) FROM student_profiles sp
            WHERE sp.branch_id = $1) AS debt
       FROM branches b WHERE b.id = $1 AND b.deleted_at IS NULL`,
      [branchId],
    )
    .then((r) => r.rows[0] ?? null);
}

/** Реальные расходы филиала за период — для отчётов (income() перепутал это с долгом). */
export function monthExpenses(branchId, { from, to }, client = pool) {
  return client
    .query(
      `SELECT COALESCE(SUM(e.amount), 0) AS expenses
         FROM expenses e
        WHERE e.branch_id = $1 AND e.deleted_at IS NULL
          AND e.spent_at >= $2 AND e.spent_at <= $3`,
      [branchId, from, to],
    )
    .then((r) => Number(r.rows[0]?.expenses ?? 0));
}

/** Сколько платежей прошло за период — для строки «N ta to'lov» в отчётах. */
export function monthPaymentsCount(branchId, { from, to }, client = pool) {
  return client
    .query(
      `SELECT count(*)::int AS n FROM transactions t
        WHERE t.branch_id = $1 AND t.status = 'completed'
          AND t.created_at >= $2 AND t.created_at < $3::date + INTERVAL '1 day'`,
      [branchId, from, to],
    )
    .then((r) => r.rows[0]?.n ?? 0);
}

export function listBranchPayments(branchId, { from, to }, client = pool) {
  return client
    .query(
      `SELECT i.id, i.created_at, i.total_amount, i.paid_amount, i.status,
               u.first_name AS student_first, u.last_name AS student_last,
               g.name AS group_name
          FROM invoices i
          JOIN users u ON u.id = i.student_id
     LEFT JOIN groups g ON g.id = i.group_id
         WHERE i.branch_id = $1 AND i.deleted_at IS NULL
           AND ($2::date IS NULL OR i.created_at >= $2)
           AND ($3::date IS NULL OR i.created_at < $3 + INTERVAL '1 day')
         ORDER BY i.created_at DESC`,
      [branchId, from ?? null, to ?? null],
    )
    .then((r) => r.rows);
}

export function countBranchPayments(branchId, { from, to }, client = pool) {
  return client
    .query(
      `SELECT count(*)::int AS n FROM invoices i
         WHERE i.branch_id = $1 AND i.deleted_at IS NULL
           AND ($2::date IS NULL OR i.created_at >= $2)
           AND ($3::date IS NULL OR i.created_at < $3 + INTERVAL '1 day')`,
      [branchId, from ?? null, to ?? null],
    )
    .then((r) => r.rows[0].n);
}

// ---------- Telegram-группа родителей филиала ----------

export function getTelegramGroupStatus(branchId, client = pool) {
  return client
    .query(
      `SELECT parent_tg_chat_id, parent_tg_bound_at FROM branches
        WHERE id = $1 AND deleted_at IS NULL`,
      [branchId],
    )
    .then((r) => r.rows[0] ?? null);
}

export function unlinkTelegramGroup(branchId, client = pool) {
  return client
    .query(
      `UPDATE branches SET parent_tg_chat_id = NULL, parent_tg_bound_at = NULL
        WHERE id = $1 AND parent_tg_chat_id IS NOT NULL AND deleted_at IS NULL`,
      [branchId],
    )
    .then((r) => r.rowCount > 0);
}