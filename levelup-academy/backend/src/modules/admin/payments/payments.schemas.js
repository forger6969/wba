import { z } from 'zod';

// NUMERIC(12,2) — максимум 9 999 999 999.99
const money = z.coerce.number().positive().max(9_999_999_999);

export const idParam = z.object({ id: z.string().uuid('Invalid id') });

// card/transfer оставлены ради старых записей (см. 1784350000000_payment-method-uzbek-providers.js) —
// новые платежи используют конкретный способ.
const paymentPart = z.object({
  method: z.enum(['cash', 'card', 'transfer', 'humo', 'uzcard', 'uzum', 'payme', 'click', 'bank_transfer']),
  amount: money,
});

// ---------- Разовый платёж вне графика начислений — создаёт свой уже оплаченный invoice ----------
export const createAdHocPaymentSchema = z
  .object({
    studentId: z.string().uuid('Invalid studentId'),
    groupId: z.string().uuid('Invalid groupId').optional(),
    periodMonth: z.coerce.date().optional(),
    totalAmount: money,
    parts: z.array(paymentPart).min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
  })
  .refine(
    (o) => {
      const partsSum = o.parts.reduce((sum, p) => sum + p.amount, 0);
      return Math.abs(partsSum - o.totalAmount) < 0.005;
    },
    { message: 'Parts sum does not match totalAmount', path: ['parts'] },
  );

// ---------- Оплата существующего счёта (авто-начисление за месяц или ручной pending) ----------
// Сумма частей не может превышать остаток — проверяется в сервисе под FOR UPDATE
// (остаток меняется конкурентно, до открытия транзакции его достоверно не узнать).
export const payInvoiceSchema = z.object({
  parts: z.array(paymentPart).min(1).max(5),
});

export const refundSchema = z.object({
  reason: z.string().trim().min(1, 'Reason is required for a refund').max(500),
});

export const voidSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const receiptUploadUrlQuery = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(120),
});

export const attachReceiptSchema = z.object({
  receiptKey: z.string().min(1).max(500),
});

export const listInvoicesQuery = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(['pending', 'partially_paid', 'paid', 'overdue', 'cancelled']).optional(),
  studentId: z.string().uuid('Invalid studentId').optional(),
});
