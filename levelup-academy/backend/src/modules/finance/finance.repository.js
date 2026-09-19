import { pool } from '../../config/db.js';

/** Только филиалы своей организации — id/name/isMain, без прав их создавать/менять. */
export function listBranches(orgId, client = pool) {
  return client
    .query(
      `SELECT id, name, is_main FROM branches
        WHERE organization_id = $1 AND deleted_at IS NULL
        ORDER BY is_main DESC, created_at DESC`,
      [orgId],
    )
    .then((r) => r.rows);
}

/** Детализация поступлений (тот же джойн, что и admin/payments — invoice → студент/группа). */
export function listIncome({ orgId, branchId, from, to, limit, offset }, client = pool) {
  return client
    .query(
      `SELECT t.id, t.amount, t.method, t.created_at,
              b.id AS branch_id, b.name AS branch_name,
              u.first_name AS student_first, u.last_name AS student_last,
              g.name AS group_name
         FROM transactions t
         JOIN branches b ON b.id = t.branch_id
         LEFT JOIN invoices i ON i.id = t.invoice_id
         LEFT JOIN users u ON u.id = i.student_id
         LEFT JOIN groups g ON g.id = i.group_id
        WHERE b.organization_id = $1 AND t.status = 'completed'
          AND ($2::uuid IS NULL OR b.id = $2)
          AND ($3::timestamptz IS NULL OR t.created_at >= $3)
          AND ($4::timestamptz IS NULL OR t.created_at <= $4)
        ORDER BY t.created_at DESC
        LIMIT $5 OFFSET $6`,
      [orgId, branchId ?? null, from ?? null, to ?? null, limit, offset],
    )
    .then((r) => r.rows);
}

/** Итог и count — те же фильтры, что listIncome, отдельным запросом (страница + сумма разом). */
export function incomeTotals({ orgId, branchId, from, to }, client = pool) {
  return client
    .query(
      `SELECT count(*)::int AS n, COALESCE(SUM(t.amount), 0) AS total
         FROM transactions t
         JOIN branches b ON b.id = t.branch_id
        WHERE b.organization_id = $1 AND t.status = 'completed'
          AND ($2::uuid IS NULL OR b.id = $2)
          AND ($3::timestamptz IS NULL OR t.created_at >= $3)
          AND ($4::timestamptz IS NULL OR t.created_at <= $4)`,
      [orgId, branchId ?? null, from ?? null, to ?? null],
    )
    .then((r) => r.rows[0]);
}

/** Ведомость зарплат организации за один месяц (mentor_salaries — сейчас только менторы). */
export function listSalaries({ orgId, branchId, periodMonth }, client = pool) {
  return client
    .query(
      `SELECT s.id, s.branch_id, b.name AS branch_name, s.mentor_id,
              u.first_name, u.last_name, s.period_month, s.base_amount, s.bonus_amount,
              s.total_amount, s.status
         FROM mentor_salaries s
         JOIN branches b ON b.id = s.branch_id
         JOIN users u ON u.id = s.mentor_id
        WHERE s.organization_id = $1
          AND ($2::uuid IS NULL OR s.branch_id = $2)
          AND ($3::date IS NULL OR s.period_month = $3)
        ORDER BY s.period_month DESC, b.name, u.last_name`,
      [orgId, branchId ?? null, periodMonth ?? null],
    )
    .then((r) => r.rows);
}
