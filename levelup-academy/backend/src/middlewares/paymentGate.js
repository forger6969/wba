import { pool } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { ensureCurrentInvoicesForStudent } from '../modules/billing/billing.service.js';

/**
 * Блокирует ВЕСЬ доступ студента к своим данным (домашка/тесты/видео/магазин/
 * дашборд), пока у него есть просроченный (>5 числа) неоплаченный счёт.
 * Оплата (даже частичная) сразу снимает статус 'overdue' у invoice
 * (см. payments.service.applyInvoicePayment) → на следующий же запрос доступ
 * восстанавливается, без ожидания cron-джобы.
 *
 * Не студент (admin/mentor, заходящие в общие роуты вроде /shop) — пропускает
 * молча: у них нет invoices на свой id, сумма всегда 0.
 */
export async function blockIfOverdue(req, _res, next) {
  if (req.user.role !== 'student') return next();

  try {
    // Cron/Redis may be unavailable. Create a missing current invoice before
    // deciding access so a direct URL or API request cannot bypass billing.
    await ensureCurrentInvoicesForStudent(req.user.id);
    const { rows } = await pool.query(
      `WITH expired AS (
         UPDATE invoices SET status = 'overdue', updated_at = now()
          WHERE student_id = $1 AND status IN ('pending','partially_paid')
            AND due_date < CURRENT_DATE AND deleted_at IS NULL
          RETURNING 1
       )
       SELECT COALESCE(SUM(total_amount - paid_amount), 0) AS amount, MIN(due_date) AS "dueDate"
         FROM invoices
        WHERE student_id = $1
          AND (status = 'overdue' OR (status IN ('pending','partially_paid') AND due_date < CURRENT_DATE))
          AND deleted_at IS NULL`,
      [req.user.id],
    );
    const amount = Number(rows[0].amount);
    if (amount > 0) {
      return next(new AppError(402, 'Payment overdue — access is blocked until paid', { amount, dueDate: rows[0].dueDate }));
    }
    next();
  } catch (err) {
    next(err);
  }
}
