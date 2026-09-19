import { pool } from '../../config/db.js';

/**
 * Счета платформа→партнёр (Karis 26.08.2026). Не путать с `invoices`
 * (K-PAY, ученик→школа) — это другая сущность в другом домене.
 */

const CURRENT_STATUS_EXPR = `
  CASE
    WHEN i.status = 'cancelled' THEN 'cancelled'
    WHEN i.status = 'paid' OR COALESCE((
      SELECT sum(p.amount) FROM platform_org_payments p
       WHERE p.organization_id = i.organization_id
         AND p.type = 'payment' AND p.period_covered = i.period_covered
    ), 0) >= i.amount THEN 'paid'
    WHEN o.access_until IS NOT NULL AND o.access_until >= i.due_date THEN 'covered'
    WHEN i.status IN ('pending', 'partially_paid') AND i.due_date < CURRENT_DATE
      THEN 'overdue'
    ELSE i.status::text
  END
`;

export function insertInvoice({ organizationId, periodCovered, tierId, usersCount, amount, dueDate }, client = pool) {
  return client
    .query(
      `INSERT INTO platform_invoices (organization_id, period_covered, tier_id, users_count, amount, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (organization_id, period_covered) DO NOTHING
       RETURNING *`,
      [organizationId, periodCovered, tierId, usersCount, amount, dueDate],
    )
    .then((r) => r.rows[0] ?? null);
}

export function findInvoice(organizationId, periodCovered, client = pool) {
  return client
    .query(
      `SELECT * FROM platform_invoices WHERE organization_id = $1 AND period_covered = $2`,
      [organizationId, periodCovered],
    )
    .then((r) => r.rows[0] ?? null);
}

export function findInvoiceById(id, client = pool) {
  return client.query(`SELECT * FROM platform_invoices WHERE id = $1`, [id]).then((r) => r.rows[0] ?? null);
}

/**
 * Применить оплату к счёту: увеличить paid_amount и пересчитать статус.
 * paid >= amount → paid; 0 < paid < amount → partially_paid. 'overdue' сюда
 * не пишется никогда — это derived-статус, см. CURRENT_STATUS_EXPR.
 */
export function applyPayment(invoiceId, amount, client = pool) {
  return client
    .query(
      `UPDATE platform_invoices
          SET paid_amount = paid_amount + $2,
              status = CASE
                WHEN paid_amount + $2 >= amount THEN 'paid'
                WHEN paid_amount + $2 > 0 THEN 'partially_paid'
                ELSE status
              END
        WHERE id = $1
        RETURNING *`,
      [invoiceId, amount],
    )
    .then((r) => r.rows[0] ?? null);
}

export function cancelInvoice(id, reason, client = pool) {
  return client
    .query(
      `UPDATE platform_invoices i
          SET status = 'cancelled', cancelled_at = now(), cancel_reason = $2
        WHERE i.id = $1 AND i.status <> 'paid'
        RETURNING i.*, (SELECT o.name FROM organizations o WHERE o.id = i.organization_id) AS organization_name`,
      [id, reason],
    )
    .then((r) => r.rows[0] ?? null);
}

export function listInvoices({ organizationId = null, status = null, limit = 50, offset = 0 } = {}, client = pool) {
  const conds = [];
  const vals = [];
  let i = 1;
  if (organizationId) { conds.push(`i.organization_id = $${i++}`); vals.push(organizationId); }
  // фильтр по эффективному статусу (в т.ч. производному 'overdue')
  if (status) { conds.push(`(${CURRENT_STATUS_EXPR}) = $${i++}`); vals.push(status); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  vals.push(limit, offset);

  return client
    .query(
      `SELECT i.*, (${CURRENT_STATUS_EXPR}) AS effective_status,
              greatest(i.paid_amount, COALESCE((
                SELECT sum(p.amount) FROM platform_org_payments p
                 WHERE p.organization_id = i.organization_id
                   AND p.type = 'payment' AND p.period_covered = i.period_covered
              ), 0)) AS effective_paid_amount,
              o.name AS organization_name,
              count(*) OVER()::int AS total_count
         FROM platform_invoices i
         JOIN organizations o ON o.id = i.organization_id
         ${where}
        ORDER BY i.period_covered DESC, o.name
        LIMIT $${i++} OFFSET $${i}`,
      vals,
    )
    .then((r) => r.rows);
}

/**
 * Сводка долгов по организациям — сумма (amount - paid_amount) по счетам,
 * которые ещё не закрыты и не отменены. Отдельным простым запросом, а не
 * агрегатом внутри listInvoices: список счетов и «кто сколько должен» — два
 * разных вопроса с разной формой ответа.
 */
export function debtByOrg(client = pool) {
  return client
    .query(
      `SELECT i.organization_id, o.name AS organization_name,
              sum(i.amount - i.paid_amount)::int AS debt,
              min(i.due_date) FILTER (WHERE i.status IN ('pending','partially_paid') AND i.due_date < CURRENT_DATE) AS oldest_overdue_due_date,
              count(*) FILTER (WHERE i.status IN ('pending','partially_paid') AND i.due_date < CURRENT_DATE)::int AS overdue_count
         FROM platform_invoices i
         JOIN organizations o ON o.id = i.organization_id
        WHERE i.status IN ('pending', 'partially_paid')
          AND (o.access_until IS NULL OR o.access_until < i.due_date)
          AND COALESCE((SELECT sum(p.amount) FROM platform_org_payments p
                        WHERE p.organization_id = i.organization_id
                          AND p.type = 'payment' AND p.period_covered = i.period_covered), 0) < i.amount
        GROUP BY i.organization_id, o.name
       HAVING sum(i.amount - i.paid_amount) > 0
        ORDER BY debt DESC`,
    )
    .then((r) => r.rows);
}

/** Список организаций для генерации счетов — переиспользует ту же выборку,
 *  что и общий список партнёров (main.repository.listPartners), без
 *  дублирования запроса — см. platformBilling.service.js. */
export function orgTierSnapshot(client = pool) {
  return client
    .query(
      `SELECT o.id, o.name, o.access_until,
              (SELECT count(*) FROM users u WHERE u.organization_id = o.id AND u.role = 'student' AND u.status = 'active' AND u.deleted_at IS NULL) +
              (SELECT count(*) FROM users u WHERE u.organization_id = o.id AND u.role = 'parent' AND u.status = 'active' AND u.deleted_at IS NULL) +
              (SELECT count(*) FROM users u WHERE u.organization_id = o.id AND u.role IN ('ceo','admin','mentor','methodist','branch_manager') AND u.status = 'active' AND u.deleted_at IS NULL) AS total_users
         FROM organizations o
        WHERE o.deleted_at IS NULL`,
    )
    .then((r) => r.rows);
}
