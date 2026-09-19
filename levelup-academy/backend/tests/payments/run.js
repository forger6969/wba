/**
 * Integration tests for the K-PAY domain (src/modules/admin/payments/**)
 * against the LIVE Postgres + Redis stack. No HTTP server, no auth — services
 * are called directly with an admin's scope/actor id.
 *
 * Run:  node tests/payments/run.js
 */
import { randomUUID } from 'node:crypto';
import { pool } from '../../src/config/db.js';
import { closeRedis } from '../../src/config/redis.js';
import { notificationQueue } from '../../src/queues/notification.queue.js';

import * as paymentsService from '../../src/modules/admin/payments/payments.service.js';

import { setupFixtures, teardownFixtures, insertPendingInvoice, getStudentDebt } from './fixtures.js';
import { scenario, printSummary, assert, assertEqual, expectAppError } from './lib/harness.js';

async function main() {
  const ctx = await setupFixtures();
  const { branchId, otherBranchId, adminId, studentA, studentB, studentC } = ctx;
  const scope = { branchId };
  const otherScope = { branchId: otherBranchId };

  // =======================================================================
  // Group 1 — ad-hoc payments (full / split), studentA
  // =======================================================================
  await scenario(1, 'createAdHocPayment (single method) -> full invoice, one transaction', async () => {
    const { invoice, transactions } = await paymentsService.createAdHocPayment(scope, adminId, {
      studentId: studentA,
      totalAmount: 500000,
      parts: [{ method: 'cash', amount: 500000 }],
      comment: 'Full ad-hoc payment',
    });
    assertEqual(invoice.type, 'full', 'ad-hoc single-method invoice should be type=full');
    assertEqual(invoice.status, 'paid', 'ad-hoc invoice is created already paid');
    assertEqual(invoice.paidAmount, 500000, 'paidAmount should equal totalAmount');
    assertEqual(transactions.length, 1, 'exactly one transaction');
    assertEqual(transactions[0].splitBatchId, null, 'single-part payment has no split batch');
  });

  let splitInvoiceId;
  let splitBatchId;
  await scenario(2, 'createAdHocPayment (split cash+card) -> split invoice, shared split_batch_id', async () => {
    const { invoice, transactions } = await paymentsService.createAdHocPayment(scope, adminId, {
      studentId: studentA,
      totalAmount: 300000,
      parts: [
        { method: 'cash', amount: 150000 },
        { method: 'card', amount: 150000 },
      ],
      comment: 'Split ad-hoc payment',
    });
    splitInvoiceId = invoice.id;
    assertEqual(invoice.type, 'split', 'multi-part invoice should be type=split');
    assertEqual(transactions.length, 2, 'two transactions for two parts');
    assert(transactions[0].splitBatchId, 'split parts must carry a split_batch_id');
    assertEqual(transactions[0].splitBatchId, transactions[1].splitBatchId, 'both parts share the same split_batch_id');
    splitBatchId = transactions[0].splitBatchId;
  });

  await scenario(3, 'ad-hoc payments never push a student into negative debt', async () => {
    const debt = await getStudentDebt(studentA);
    assertEqual(debt, 0, 'studentA never had outstanding debt — GREATEST floor keeps it at 0');
    assert(splitInvoiceId && splitBatchId, 'split invoice/batch captured from scenario 2');
  });

  // =======================================================================
  // Group 2 — payInvoice progression (partial -> paid) + error paths, studentB
  // =======================================================================
  const invoicePB1 = await insertPendingInvoice(ctx, studentB, { totalAmount: 1_000_000 });

  await scenario(4, 'payInvoice partial payment -> partially_paid, debt reduced by the paid part', async () => {
    const { invoice } = await paymentsService.payInvoice(scope, adminId, invoicePB1, {
      parts: [{ method: 'cash', amount: 400000 }],
    });
    assertEqual(invoice.status, 'partially_paid', 'partial payment leaves invoice partially_paid');
    assertEqual(invoice.paidAmount, 400000, 'paidAmount should equal the part paid so far');
    assertEqual(await getStudentDebt(studentB), 600000, 'debt = 1,000,000 - 400,000');
  });

  await scenario(5, 'payInvoice remaining balance -> paid', async () => {
    const { invoice } = await paymentsService.payInvoice(scope, adminId, invoicePB1, {
      parts: [{ method: 'card', amount: 600000 }],
    });
    assertEqual(invoice.status, 'paid', 'paying the remainder fully settles the invoice');
    assertEqual(invoice.paidAmount, 1000000, 'paidAmount should equal totalAmount');
    assertEqual(await getStudentDebt(studentB), 0, 'debt fully cleared');
  });

  await scenario(6, 'payInvoice on an already-paid invoice -> 409', async () => {
    await expectAppError(
      () => paymentsService.payInvoice(scope, adminId, invoicePB1, { parts: [{ method: 'cash', amount: 1 }] }),
      409,
      'already paid',
    );
  });

  const invoicePB2 = await insertPendingInvoice(ctx, studentB, { totalAmount: 200000 });

  await scenario(7, 'payInvoice parts sum exceeding the remaining balance -> 422', async () => {
    await expectAppError(
      () => paymentsService.payInvoice(scope, adminId, invoicePB2, { parts: [{ method: 'cash', amount: 300000 }] }),
      422,
      'exceeds remaining balance',
    );
    assertEqual(await getStudentDebt(studentB), 200000, 'rejected payment must not touch the debt');
  });

  await scenario(8, 'payInvoice from a different branch scope -> 404 (branch isolation)', async () => {
    await expectAppError(
      () => paymentsService.payInvoice(otherScope, adminId, invoicePB2, { parts: [{ method: 'cash', amount: 100000 }] }),
      404,
      'not found in your branch',
    );
  });

  await scenario(9, 'payInvoice on a non-existent invoice id -> 404', async () => {
    await expectAppError(
      () => paymentsService.payInvoice(scope, adminId, randomUUID(), { parts: [{ method: 'cash', amount: 100000 }] }),
      404,
    );
  });

  // =======================================================================
  // Group 3 — refund / void + branch isolation, studentC
  // =======================================================================
  const invoicePC1 = await insertPendingInvoice(ctx, studentC, { totalAmount: 500000 });
  const { transactions: pc1Tx } = await paymentsService.payInvoice(scope, adminId, invoicePC1, {
    parts: [{ method: 'cash', amount: 500000 }],
  });
  const txRefund = pc1Tx[0].id;

  await scenario(10, 'refundTransaction -> invoice reopens, debt restored', async () => {
    assertEqual(await getStudentDebt(studentC), 0, 'sanity: invoice fully paid, no debt before refund');
    const { invoice } = await paymentsService.refundTransaction(scope, txRefund, 'Customer requested refund');
    assertEqual(invoice.status, 'pending', 'invoice with no due_date reopens as pending after full refund');
    assertEqual(invoice.paidAmount, 0, 'paidAmount reverted to 0');
    assertEqual(await getStudentDebt(studentC), 500000, 'debt restored by the refunded amount');
  });

  await scenario(11, 'refundTransaction on an already-refunded transaction -> 409', async () => {
    await expectAppError(
      () => paymentsService.refundTransaction(scope, txRefund, 'Second attempt'),
      409,
      'already refunded',
    );
  });

  const invoicePC2 = await insertPendingInvoice(ctx, studentC, { totalAmount: 200000 });
  const { transactions: pc2Tx } = await paymentsService.payInvoice(scope, adminId, invoicePC2, {
    parts: [{ method: 'transfer', amount: 200000 }],
  });
  const txVoid = pc2Tx[0].id;

  await scenario(12, 'voidTransaction -> invoice reopens, debt restored', async () => {
    const debtBefore = await getStudentDebt(studentC);
    const { invoice } = await paymentsService.voidTransaction(scope, txVoid, 'Wrong amount entered');
    assertEqual(invoice.status, 'pending', 'invoice reopens as pending after full void');
    assertEqual(await getStudentDebt(studentC), debtBefore + 200000, 'debt restored by the voided amount');
  });

  await scenario(13, 'voidTransaction from a different branch scope -> 404 (branch isolation)', async () => {
    const invoicePC3 = await insertPendingInvoice(ctx, studentC, { totalAmount: 100000 });
    const { transactions: pc3Tx } = await paymentsService.payInvoice(scope, adminId, invoicePC3, {
      parts: [{ method: 'cash', amount: 100000 }],
    });
    await expectAppError(
      () => paymentsService.voidTransaction(otherScope, pc3Tx[0].id, 'Cross-branch attempt'),
      404,
      'not found in your branch',
    );
  });

  const ok = printSummary();

  await teardownFixtures(ctx);
  await notificationQueue.close();
  await closeRedis();
  await pool.end();
  process.exit(ok ? 0 : 1);
}

main().catch(async (err) => {
  console.error('FATAL', err);
  process.exit(1);
});
