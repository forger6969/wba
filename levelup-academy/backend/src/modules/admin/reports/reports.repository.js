import { pool } from '../../../config/db.js';

/**
 * Выручка — по факту оплаты (transactions.status='completed'), фильтруется
 * периодом [from, to]. Долг — текущий срез (invoices ещё не закрыт), период
 * на него не влияет: должен = должен сейчас, а не "должен был в марте".
 */

export function branchTotals(branchId, { from, to }, client = pool) {
  return client
    .query(
      `SELECT
         (SELECT COALESCE(SUM(t.amount), 0) FROM transactions t
            WHERE t.branch_id = $1 AND t.status = 'completed'
              AND ($2::date IS NULL OR t.created_at >= $2)
              AND ($3::date IS NULL OR t.created_at < $3 + INTERVAL '1 day')) AS revenue,
         (SELECT COALESCE(SUM(total_amount - paid_amount), 0) FROM invoices
            WHERE branch_id = $1 AND status IN ('pending', 'partially_paid', 'overdue')
              AND deleted_at IS NULL) AS debt`,
      [branchId, from ?? null, to ?? null],
    )
    .then((r) => r.rows[0]);
}

export function revenueDebtByGroup(branchId, { from, to }, client = pool) {
  return client
    .query(
      `WITH revenue AS (
         SELECT i.group_id, COALESCE(SUM(t.amount), 0) AS revenue
           FROM transactions t
           JOIN invoices i ON i.id = t.invoice_id
          WHERE t.branch_id = $1 AND t.status = 'completed'
            AND ($2::date IS NULL OR t.created_at >= $2)
            AND ($3::date IS NULL OR t.created_at < $3 + INTERVAL '1 day')
          GROUP BY i.group_id
       ),
       debt AS (
         SELECT group_id, COALESCE(SUM(total_amount - paid_amount), 0) AS debt
           FROM invoices
          WHERE branch_id = $1 AND status IN ('pending', 'partially_paid', 'overdue')
            AND deleted_at IS NULL
          GROUP BY group_id
       )
       SELECT g.id AS group_id, g.name AS group_name,
              COALESCE(r.revenue, 0) AS revenue,
              COALESCE(d.debt, 0) AS debt,
              (SELECT count(*) FROM group_students gs
                 WHERE gs.group_id = g.id AND gs.left_at IS NULL) AS students
         FROM groups g
         LEFT JOIN revenue r ON r.group_id = g.id
         LEFT JOIN debt d ON d.group_id = g.id
        WHERE g.branch_id = $1 AND g.deleted_at IS NULL
        ORDER BY g.name`,
      [branchId, from ?? null, to ?? null],
    )
    .then((r) => r.rows);
}
