import { randomUUID } from 'node:crypto';
import { withTransaction } from '../../../config/db.js';
import { AppError } from '../../../utils/AppError.js';
import { parsePagination, buildPageMeta } from '../../../utils/pagination.js';
import { buildObjectKey, getUploadUrl as getS3UploadUrl } from '../../../config/s3.js';
import { notificationQueue } from '../../../queues/notification.queue.js';
import { logger } from '../../../config/logger.js';
import * as repo from './payments.repository.js';

async function enqueuePaymentNotification(data) {
  try {
    await notificationQueue.add('payment.received', data);
  } catch (err) {
    // The payment is already committed at this point. A temporary Redis/queue
    // failure must not make the cashier think that the payment was rejected
    // and submit the same money a second time.
    logger.error({ err, invoiceId: data.invoiceId }, 'Failed to enqueue payment notification');
  }
}

function mapInvoice(i) {
  return {
    id: i.id,
    type: i.type,
    status: i.status,
    totalAmount: Number(i.total_amount),
    paidAmount: Number(i.paid_amount),
    dueDate: i.due_date,
    periodMonth: i.period_month,
    comment: i.comment,
    source: i.source,
    createdAt: i.created_at,
  };
}

function mapTransaction(t) {
  return {
    id: t.id,
    invoiceId: t.invoice_id,
    method: t.method,
    status: t.status,
    amount: Number(t.amount),
    receiptKey: t.receipt_key,
    splitBatchId: t.split_batch_id,
    createdAt: t.created_at,
  };
}

/** Пишет N транзакций с общим split_batch_id (null, если часть одна). Общий кусок create/pay. */
async function recordParts(client, { branchId, invoiceId, parts, processedBy }) {
  const splitBatchId = parts.length > 1 ? randomUUID() : null;
  const transactions = [];
  for (const part of parts) {
    // eslint-disable-next-line no-await-in-loop -- каждая часть пишется последовательно в одной транзакции
    const tx = await repo.insertTransaction(
      { branchId, invoiceId, method: part.method, amount: part.amount, processedBy, splitBatchId },
      client,
    );
    transactions.push(tx);
  }
  return transactions;
}

// ==================== РАЗОВЫЙ ПЛАТЁЖ (вне графика начислений) ====================

/**
 * Ad-hoc платёж: создаёт СВОЙ invoice уже оплаченным (не привязан к
 * авто-начислению за месяц). Сумма частей сверяется с totalAmount в схеме —
 * ДО открытия транзакции.
 */
export async function createAdHocPayment(scope, actorId, body) {
  const { studentId, groupId, periodMonth, totalAmount, parts, comment } = body;
  const invoiceType = parts.length > 1 ? 'split' : 'full';

  const { invoice, transactions } = await withTransaction(async (client) => {
    const student = await repo.lockStudentForPayment(studentId, scope.branchId, client);
    if (!student) throw new AppError(404, 'Student not found in your branch');
    if (student.status === 'frozen') throw new AppError(409, 'Student is frozen');

    const invoiceRow = await repo.insertPaidInvoice(
      {
        branchId: scope.branchId,
        studentId,
        groupId,
        type: invoiceType,
        totalAmount,
        periodMonth,
        comment,
        createdBy: actorId,
      },
      client,
    );
    const txRows = await recordParts(client, {
      branchId: scope.branchId,
      invoiceId: invoiceRow.id,
      parts,
      processedBy: actorId,
    });
    await repo.decrementDebt(studentId, totalAmount, client);

    return { invoice: invoiceRow, transactions: txRows };
  });

  // уведомление — строго ПОСЛЕ commit, иначе можно уведомить об оплате, которая откатилась
  // Notification transport is best-effort. Redis being unavailable must not
  // keep the cashier modal spinning after the PostgreSQL transaction committed.
  void enqueuePaymentNotification({
    studentId,
    invoiceId: invoice.id,
    amount: totalAmount,
    methods: parts.map((p) => p.method),
  });

  return { invoice: mapInvoice(invoice), transactions: transactions.map(mapTransaction) };
}

// ==================== ОПЛАТА СУЩЕСТВУЮЩЕГО СЧЁТА ====================

/**
 * Гасит существующий invoice (авто-начисление за месяц или ручной pending),
 * полностью или частично, одним методом или сплитом. Остаток известен только
 * под FOR UPDATE (конкурентные оплаты), поэтому сверка parts <= остаток — уже
 * внутри транзакции, а не до неё (в отличие от ad-hoc платежа).
 */
export async function payInvoice(scope, actorId, invoiceId, body) {
  const { parts } = body;

  const result = await withTransaction(async (client) => {
    const invoice = await repo.lockInvoiceInBranch(invoiceId, scope.branchId, client);
    if (!invoice) throw new AppError(404, 'Invoice not found in your branch');
    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      throw new AppError(409, `Invoice is already ${invoice.status}`);
    }

    const student = await repo.lockStudentForPayment(invoice.student_id, scope.branchId, client);
    if (!student) throw new AppError(404, 'Student not found in your branch');

    const remaining = Number(invoice.total_amount) - Number(invoice.paid_amount);
    const partsSum = parts.reduce((sum, p) => sum + p.amount, 0);
    const appliedAmount = Math.min(partsSum, remaining);
    const creditAmount = Math.max(partsSum - remaining, 0);

    const txRows = await recordParts(client, {
      branchId: scope.branchId,
      invoiceId,
      parts,
      processedBy: actorId,
    });
    const updatedInvoice = await repo.applyInvoicePayment(invoiceId, appliedAmount, client);
    await repo.decrementDebt(invoice.student_id, appliedAmount, client);
    if (creditAmount > 0) await repo.addPaymentBalance(invoice.student_id, creditAmount, client);

    return {
      invoice: updatedInvoice,
      transactions: txRows,
      studentId: invoice.student_id,
      amount: partsSum,
      creditAmount,
      methods: parts.map((p) => p.method),
    };
  });

  // Return the successful payment immediately; Telegram/Redis runs in background.
  void enqueuePaymentNotification({
    studentId: result.studentId,
    invoiceId: result.invoice.id,
    amount: result.amount,
    methods: result.methods,
  });

  return {
    invoice: mapInvoice(result.invoice),
    transactions: result.transactions.map(mapTransaction),
    creditAmount: result.creditAmount,
  };
}

// ==================== ВОЗВРАТ / АННУЛИРОВАНИЕ ====================

/** Общий путь refund/void: откатывает ОДНУ транзакцию + пересчитывает invoice + возвращает долг. */
async function reverseTransaction(scope, transactionId, newStatus, reason) {
  const result = await withTransaction(async (client) => {
    const tx = await repo.lockTransactionInBranch(transactionId, scope.branchId, client);
    if (!tx) throw new AppError(404, 'Transaction not found in your branch');
    if (tx.status !== 'completed') {
      throw new AppError(409, `Transaction is already ${tx.status}`);
    }

    const invoice = await repo.lockInvoiceInBranch(tx.invoice_id, scope.branchId, client);
    if (!invoice) throw new AppError(404, 'Invoice not found');

    await repo.setTransactionStatus(transactionId, newStatus, client);
    const updatedInvoice = await repo.reverseInvoiceAmount(tx.invoice_id, tx.amount, client);
    await repo.incrementDebt(invoice.student_id, tx.amount, client);

    return { tx, invoice: updatedInvoice, studentId: invoice.student_id };
  });

  if (newStatus === 'refunded') {
    await notificationQueue.add('payment.refunded', {
      studentId: result.studentId,
      amount: Number(result.tx.amount),
      reason: reason ?? null,
    });
  }

  return { invoice: mapInvoice(result.invoice) };
}

export function refundTransaction(scope, transactionId, reason) {
  return reverseTransaction(scope, transactionId, 'refunded', reason);
}

export function voidTransaction(scope, transactionId, reason) {
  return reverseTransaction(scope, transactionId, 'voided', reason);
}

// ==================== ЧЕК (S3) ====================

export async function getReceiptUploadUrl(scope, transactionId, { filename, contentType }) {
  const tx = await repo.findTransactionInBranch(transactionId, scope.branchId);
  if (!tx) throw new AppError(404, 'Transaction not found in your branch');

  const receiptKey = buildObjectKey('receipts', filename);
  const uploadUrl = await getS3UploadUrl(receiptKey, contentType);
  return { uploadUrl, receiptKey };
}

export async function attachReceipt(scope, transactionId, receiptKey) {
  const row = await repo.attachReceipt(transactionId, scope.branchId, receiptKey);
  if (!row) throw new AppError(404, 'Transaction not found in your branch');
  return { id: row.id, receiptKey: row.receipt_key };
}

// ==================== СПИСОК СЧЕТОВ ====================

export async function listInvoices(branchId, query) {
  const { page, limit, offset } = parsePagination(query);
  const filter = { branchId, status: query.status, studentId: query.studentId };
  const [rows, total] = await Promise.all([
    repo.listInvoices({ ...filter, limit, offset }),
    repo.countInvoices(filter),
  ]);
  return {
    invoices: rows.map((i) => ({
      id: i.id,
      type: i.type,
      status: i.status,
      totalAmount: Number(i.total_amount),
      paidAmount: Number(i.paid_amount),
      dueDate: i.due_date,
      periodMonth: i.period_month,
      source: i.source,
      student: `${i.student_first} ${i.student_last}`,
      group: i.group_name,
      acceptedBy: [i.collector_first, i.collector_last].filter(Boolean).join(' ') || null,
      acceptedAt: i.payment_accepted_at,
      createdAt: i.created_at,
    })),
    meta: buildPageMeta(total, page, limit),
  };
}
