import { Router } from 'express';
import { validate } from '../../../middlewares/validate.js';
import * as ctrl from './payments.controller.js';
import {
  idParam,
  createAdHocPaymentSchema,
  payInvoiceSchema,
  refundSchema,
  voidSchema,
  receiptUploadUrlQuery,
  attachReceiptSchema,
  listInvoicesQuery,
} from './payments.schemas.js';

/**
 * K-PAY — платежи филиала. Смонтирован в admin.routes.js под /payments,
 * authenticate + authorize('admin') уже навешаны родителем; req.scope
 * жёстко = свой branch_id.
 *
 * NASIYA/рассрочки НЕТ (решение 2026-07-05, подтверждено 2026-07-07).
 * Долг появляется через авто-начисление за месяц (billing.worker), гасится
 * либо оплатой конкретного счёта (/invoices/:id/pay), либо разовым платежом
 * вне графика (/ — создаёт свой уже оплаченный invoice).
 */
const router = Router();

/**
 * @openapi
 * /api/admin/payments/invoices:
 *   get:
 *     tags: [Admin Payments]
 *     summary: List invoices of the branch (paginated, filter by status/student)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/PageParam' }
 *       - { $ref: '#/components/parameters/LimitParam' }
 *       - name: status
 *         in: query
 *         schema: { type: string, enum: [pending, partially_paid, paid, overdue, cancelled] }
 *       - name: studentId
 *         in: query
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Paginated list of invoices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 invoices:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - { $ref: '#/components/schemas/Invoice' }
 *                       - type: object
 *                         properties:
 *                           student: { type: string }
 *                           group: { type: string, nullable: true }
 *                 meta: { $ref: '#/components/schemas/PageMeta' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/invoices', validate({ query: listInvoicesQuery }), ctrl.listInvoices);

/**
 * @openapi
 * /api/admin/payments/invoices/{id}/pay:
 *   post:
 *     tags: [Admin Payments]
 *     summary: Pay (fully or partially, single or split method) an existing invoice
 *     description: >
 *       Works for both auto-billed monthly invoices and manually pending ones. The
 *       remaining balance is only known under a row lock (FOR UPDATE) inside the
 *       transaction — parts summing above the remaining balance return 422 (not
 *       the usual zod validation 422, but a service-level check after locking).
 *       Queues a `payment.received` notification job after commit.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PayInvoiceRequest' }
 *     responses:
 *       200:
 *         description: Invoice updated with new payment
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 invoice: { $ref: '#/components/schemas/Invoice' }
 *                 transactions:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Transaction' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Invoice or student not found in your branch
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Invoice is already paid or cancelled
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Validation failed, or parts sum exceeds the remaining balance
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/invoices/:id/pay', validate({ params: idParam, body: payInvoiceSchema }), ctrl.payInvoice);

/**
 * @openapi
 * /api/admin/payments:
 *   post:
 *     tags: [Admin Payments]
 *     summary: Record an ad-hoc payment outside the monthly billing schedule
 *     description: >
 *       Creates its own invoice, already marked paid (type `full` if one payment
 *       part, `split` if more than one). `parts` amounts must sum to `totalAmount`
 *       (validated by zod before the transaction opens). Decrements the student's
 *       outstanding debt and queues a `payment.received` notification after commit.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateAdHocPaymentRequest' }
 *     responses:
 *       201:
 *         description: Ad-hoc invoice created and paid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 invoice: { $ref: '#/components/schemas/Invoice' }
 *                 transactions:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Transaction' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Student not found in your branch
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Student is frozen
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/', validate({ body: createAdHocPaymentSchema }), ctrl.createAdHocPayment);

/**
 * @openapi
 * /api/admin/payments/transactions/{id}/refund:
 *   post:
 *     tags: [Admin Payments]
 *     summary: Refund a completed transaction
 *     description: >
 *       Reverses one transaction (sets its status to `refunded`), recalculates the
 *       parent invoice's paid amount, and re-increments the student's outstanding
 *       debt by the transaction amount. Queues a `payment.refunded` notification.
 *       Only transactions currently `completed` can be refunded.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason: { type: string, maxLength: 500, description: Required for a refund }
 *     responses:
 *       200:
 *         description: Invoice after reversal
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { invoice: { $ref: '#/components/schemas/Invoice' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Transaction or invoice not found in your branch
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Transaction is already refunded/voided (not completed)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/transactions/:id/refund',
  validate({ params: idParam, body: refundSchema }),
  ctrl.refundTransaction,
);

/**
 * @openapi
 * /api/admin/payments/transactions/{id}/void:
 *   post:
 *     tags: [Admin Payments]
 *     summary: Void a completed transaction (reason optional, no refund notification)
 *     description: Same reversal mechanics as refund, but sets status `voided` and does not queue a notification.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string, maxLength: 500 }
 *     responses:
 *       200:
 *         description: Invoice after reversal
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { invoice: { $ref: '#/components/schemas/Invoice' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Transaction or invoice not found in your branch
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Transaction is already refunded/voided (not completed)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/transactions/:id/void',
  validate({ params: idParam, body: voidSchema }),
  ctrl.voidTransaction,
);

/**
 * @openapi
 * /api/admin/payments/transactions/{id}/receipt-upload-url:
 *   get:
 *     tags: [Admin Payments]
 *     summary: Get a presigned S3 upload URL to attach a receipt to a transaction
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *       - name: filename
 *         in: query
 *         required: true
 *         schema: { type: string, maxLength: 255 }
 *       - name: contentType
 *         in: query
 *         required: true
 *         schema: { type: string, maxLength: 120 }
 *     responses:
 *       200:
 *         description: Presigned upload URL + the S3 object key to attach afterwards
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uploadUrl: { type: string, format: uri }
 *                 receiptKey: { type: string }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Transaction not found in your branch
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get(
  '/transactions/:id/receipt-upload-url',
  validate({ params: idParam, query: receiptUploadUrlQuery }),
  ctrl.getReceiptUploadUrl,
);

/**
 * @openapi
 * /api/admin/payments/transactions/{id}/receipt:
 *   patch:
 *     tags: [Admin Payments]
 *     summary: Attach an already-uploaded receipt (S3 key) to a transaction
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [receiptKey]
 *             properties: { receiptKey: { type: string, maxLength: 500 } }
 *     responses:
 *       200:
 *         description: Receipt attached
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 receiptKey: { type: string }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Transaction not found in your branch
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch(
  '/transactions/:id/receipt',
  validate({ params: idParam, body: attachReceiptSchema }),
  ctrl.attachReceipt,
);

export default router;
