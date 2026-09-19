import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { orgAccessGate } from '../../middlewares/orgAccessGate.js';
import { requireOrgFeature } from '../../middlewares/requireOrgFeature.js';
import {
  listExpensesQuery,
  listIncomeQuery,
  listReportsQuery,
} from './branch-manager.schemas.js';
import * as ctrl from './branch-manager.controller.js';

/**
 * K-BRANCH-MANAGER — панель филиала. Только branch_manager; scope жёстко = свой branch_id.
 * Read-only: дашборд, доход, расход, отчёты, карточка своего филиала.
 */
const router = Router();

router.use(authenticate, orgAccessGate, authorize('branch_manager'));

/**
 * @openapi
 * /api/branch-manager/dashboard:
 *   get:
 *     tags: [Branch Manager]
 *     summary: Branch dashboard — revenue, expenses, profit, debt, student/group counts
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totals:
 *                   type: object
 *                   properties:
 *                     revenue: { type: number }
 *                     expenses: { type: number }
 *                     profit: { type: number }
 *                     outstandingDebt: { type: number }
 *                     activeStudents: { type: integer }
 *                     groups: { type: integer }
 *                     overdueInvoices: { type: integer }
 *                     currency: { type: string, example: UZS }
 *                 thisMonth:
 *                   type: object
 *                   properties:
 *                     revenue: { type: number }
 *                     expenses: { type: number }
 *                     profit: { type: number }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/dashboard', ctrl.dashboard);

/**
 * @openapi
 * /api/branch-manager/branch:
 *   get:
 *     tags: [Branch Manager]
 *     summary: Full info about own branch — name, address, stats, manager
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Branch detail
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/BranchDetail' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/branch', ctrl.branch);

/**
 * @openapi
 * /api/branch-manager/income:
 *   get:
 *     tags: [Branch Manager]
 *     summary: List branch payments for a month (student, group, amount, method, status)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: month
 *         in: query
 *         required: true
 *         schema: { type: string, pattern: '^\d{4}-\d{2}$', example: '2026-08' }
 *     responses:
 *       200:
 *         description: Payments list + monthly total
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       date: { type: string, format: date }
 *                       student: { type: string }
 *                       group: { type: string, nullable: true }
 *                       amount: { type: number }
 *                       method: { type: string }
 *                       status: { type: string, enum: [paid, pending, overdue] }
 *                 total: { type: number }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/income', validate({ query: listIncomeQuery }), ctrl.income);

/**
 * @openapi
 * /api/branch-manager/expenses:
 *   get:
 *     tags: [Branch Manager]
 *     summary: List branch expenses (paginated, optional date range and category)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/PageParam' }
 *       - { $ref: '#/components/parameters/LimitParam' }
 *       - name: from
 *         in: query
 *         schema: { type: string, format: date-time }
 *       - name: to
 *         in: query
 *         schema: { type: string, format: date-time }
 *       - name: category
 *         in: query
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of expenses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 expenses:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - { $ref: '#/components/schemas/Expense' }
 *                       - type: object
 *                         properties: { createdBy: { type: string } }
 *                 meta: { $ref: '#/components/schemas/PageMeta' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/expenses', validate({ query: listExpensesQuery }), ctrl.expenses);

/**
 * @openapi
 * /api/branch-manager/reports:
 *   get:
 *     tags: [Branch Manager]
 *     summary: Monthly income/expense/profit series for charts
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: range
 *         in: query
 *         schema: { type: string, enum: ['3m', '6m', '12m'], default: '6m' }
 *     responses:
 *       200:
 *         description: Monthly series
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 range: { type: string }
 *                 series:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key: { type: string }
 *                       label: { type: string }
 *                       income: { type: number }
 *                       expenses: { type: number }
 *                       profit: { type: number }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/reports', validate({ query: listReportsQuery }), ctrl.reports);

/**
 * @openapi
 * /api/branch-manager/telegram/status:
 *   get:
 *     tags: [Branch Manager]
 *     summary: Whether this branch's parent Telegram group is linked
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Link state }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/telegram/status', ctrl.telegramStatus);

/**
 * @openapi
 * /api/branch-manager/telegram/bind-token:
 *   post:
 *     tags: [Branch Manager]
 *     summary: Issue a one-time code to link this branch's parent group
 *     description: >
 *       Bot must be added to the group manually first, then the code is sent as
 *       /bindbranch <code> inside that group. 503 if Telegram is not configured.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Code issued }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       503: { description: Telegram is not configured on this server }
 */
router.post('/telegram/bind-token', requireOrgFeature('telegram_integration'), ctrl.createTelegramBindToken);

/**
 * @openapi
 * /api/branch-manager/telegram/unlink:
 *   delete:
 *     tags: [Branch Manager]
 *     summary: Unlink this branch's parent Telegram group
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Unlinked (or there was nothing to unlink) }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.delete('/telegram/unlink', ctrl.unlinkTelegramGroup);

export default router;