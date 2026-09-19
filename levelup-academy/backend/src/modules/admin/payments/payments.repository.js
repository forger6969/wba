import { pool } from '../../../config/db.js';

/**
 * K-PAY repository — всё жёстко скоуплено по branch_id. Функции с параметром
 * `client` ДОЛЖНЫ вызываться внутри withTransaction (лочат строки).
 */

const INVOICE_RETURN = `id, branch_id, student_id, group_id, type, status, total_amount,
  paid_amount, due_date, period_month, comment, source, created_by, created_at, updated_at`;

const TX_RETURN = `id, branch_id, invoice_id, method, status, amount, receipt_key,
  processed_by, split_batch_id, created_at`;

// ==================== СТУДЕНТ ====================

/** Лочит профиль студента (оплата/возврат меняют total_debt). Строго в филиале. */
export function lockStudentForPayment(studentId, branchId, client) {
  return client
    .query(
      `SELECT u.id, u.status, sp.user_id AS profile_id
         FROM users u
         JOIN student_profiles sp ON sp.user_id = u.id
        WHERE u.id = $1 AND u.branch_id = $2 AND u.role = 'student' AND u.deleted_at IS NULL
        FOR UPDATE OF sp`,
      [studentId, branchId],
    )
    .then((r) => r.rows[0] ?? null);
}

export function incrementDebt(studentId, amount, client) {
  return client.query(
    `UPDATE student_profiles SET total_debt = total_debt + $2, updated_at = now() WHERE user_id = $1`,
    [studentId, amount],
  );
}

export function decrementDebt(studentId, amount, client) {
  return client.query(
    `UPDATE student_profiles SET total_debt = GREATEST(total_debt - $2, 0), updated_at = now() WHERE user_id = $1`,
    [studentId, amount],
  );
}

export function addPaymentBalance(studentId, amount, client) {
  return client.query(
    `INSERT INTO student_payment_accounts (student_id, balance) VALUES ($1, $2)
     ON CONFLICT (student_id) DO UPDATE
       SET balance = student_payment_accounts.balance + EXCLUDED.balance, updated_at = now()`,
    [studentId, amount],
  );
}

// ==================== ИНВОЙСЫ ====================

/** Разовый платёж вне графика — invoice создаётся уже полностью оплаченным. */
export function insertPaidInvoice(
  { branchId, studentId, groupId, type, totalAmount, periodMonth, comment, createdBy },
  client,
) {
  return client
    .query(
      `INSERT INTO invoices
         (branch_id, student_id, group_id, type, status, total_amount, paid_amount,
          period_month, comment, created_by, source)
       VALUES ($1, $2, $3, $4, 'paid', $5, $5, $6, $7, $8, 'manual')
       RETURNING ${INVOICE_RETURN}`,
      [branchId, studentId, groupId ?? null, type, totalAmount, periodMonth ?? null, comment ?? null, createdBy],
    )
    .then((r) => r.rows[0]);
}

/** Строго в филиале, с блокировкой строки — оплата/возврат меняют paid_amount/status. */
export function lockInvoiceInBranch(id, branchId, client) {
  return client
    .query(
      `SELECT ${INVOICE_RETURN} FROM invoices
        WHERE id = $1 AND branch_id = $2 AND deleted_at IS NULL
        FOR UPDATE`,
      [id, branchId],
    )
    .then((r) => r.rows[0] ?? null);
}

/** Зачисление оплаты: paid_amount += addedAmount, статус пересчитывается. */
export function applyInvoicePayment(id, addedAmount, client) {
  return client
    .query(
      `UPDATE invoices
          SET paid_amount = paid_amount + $2,
              status = (CASE WHEN paid_amount + $2 >= total_amount THEN 'paid' ELSE 'partially_paid' END)::invoice_status,
              updated_at = now()
        WHERE id = $1
        RETURNING ${INVOICE_RETURN}`,
      [id, addedAmount],
    )
    .then((r) => r.rows[0]);
}

/**
 * Откат суммы (refund/void транзакции): paid_amount -= amount, статус — снова
 * 'overdue', если срок уже прошёл, иначе 'pending'/'partially_paid'/'paid'.
 */
export function reverseInvoiceAmount(id, amount, client) {
  return client
    .query(
      `UPDATE invoices
          SET paid_amount = GREATEST(paid_amount - $2, 0),
              status = (CASE
                WHEN GREATEST(paid_amount - $2, 0) <= 0
                  THEN CASE WHEN due_date IS NOT NULL AND due_date < CURRENT_DATE THEN 'overdue' ELSE 'pending' END
                WHEN GREATEST(paid_amount - $2, 0) >= total_amount THEN 'paid'
                ELSE 'partially_paid'
              END)::invoice_status,
              updated_at = now()
        WHERE id = $1
        RETURNING ${INVOICE_RETURN}`,
      [id, amount],
    )
    .then((r) => r.rows[0]);
}

export function listInvoices({ branchId, status, studentId, limit, offset }, client = pool) {
  return client
    .query(
      `SELECT i.id, i.type, i.status, i.total_amount, i.paid_amount, i.due_date, i.period_month,
              i.source, i.created_at,
              u.first_name AS student_first, u.last_name AS student_last,
              g.name AS group_name,
              collector.first_name AS collector_first, collector.last_name AS collector_last,
              latest_tx.created_at AS payment_accepted_at
         FROM invoices i
         JOIN users u ON u.id = i.student_id
    LEFT JOIN groups g ON g.id = i.group_id
    LEFT JOIN LATERAL (
               SELECT t.processed_by, t.created_at
                 FROM transactions t
                WHERE t.invoice_id = i.id AND t.status = 'completed'
                ORDER BY t.created_at DESC
                LIMIT 1
              ) latest_tx ON true
    LEFT JOIN users collector ON collector.id = COALESCE(latest_tx.processed_by, i.created_by)
        WHERE i.branch_id = $1 AND i.deleted_at IS NULL
          AND ($2::invoice_status IS NULL OR i.status = $2)
          AND ($3::uuid IS NULL OR i.student_id = $3)
        ORDER BY i.created_at DESC
        LIMIT $4 OFFSET $5`,
      [branchId, status ?? null, studentId ?? null, limit, offset],
    )
    .then((r) => r.rows);
}

export function countInvoices({ branchId, status, studentId }, client = pool) {
  return client
    .query(
      `SELECT count(*)::int AS n FROM invoices i
        WHERE i.branch_id = $1 AND i.deleted_at IS NULL
          AND ($2::invoice_status IS NULL OR i.status = $2)
          AND ($3::uuid IS NULL OR i.student_id = $3)`,
      [branchId, status ?? null, studentId ?? null],
    )
    .then((r) => r.rows[0].n);
}

// ==================== ТРАНЗАКЦИИ ====================

export function insertTransaction({ branchId, invoiceId, method, amount, processedBy, splitBatchId }, client) {
  return client
    .query(
      `INSERT INTO transactions (branch_id, invoice_id, method, amount, processed_by, split_batch_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${TX_RETURN}`,
      [branchId, invoiceId, method, amount, processedBy, splitBatchId ?? null],
    )
    .then((r) => r.rows[0]);
}

export function lockTransactionInBranch(id, branchId, client) {
  return client
    .query(`SELECT ${TX_RETURN} FROM transactions WHERE id = $1 AND branch_id = $2 FOR UPDATE`, [id, branchId])
    .then((r) => r.rows[0] ?? null);
}

export function setTransactionStatus(id, status, client) {
  return client
    .query(`UPDATE transactions SET status = $2 WHERE id = $1 RETURNING ${TX_RETURN}`, [id, status])
    .then((r) => r.rows[0]);
}

export function attachReceipt(id, branchId, receiptKey, client = pool) {
  return client
    .query(
      `UPDATE transactions SET receipt_key = $3 WHERE id = $1 AND branch_id = $2 RETURNING id, receipt_key`,
      [id, branchId, receiptKey],
    )
    .then((r) => r.rows[0] ?? null);
}

export function findTransactionInBranch(id, branchId, client = pool) {
  return client
    .query(`SELECT ${TX_RETURN} FROM transactions WHERE id = $1 AND branch_id = $2`, [id, branchId])
    .then((r) => r.rows[0] ?? null);
}
