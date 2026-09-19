import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { orgAccessGate } from '../../middlewares/orgAccessGate.js';
import { requireOrgFeature } from '../../middlewares/requireOrgFeature.js';
import { validate } from '../../middlewares/validate.js';
import {
  idParam,
  groupStudentParams,
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesQuery,
  createStudentSchema,
  updateStudentSchema,
  freezeStudentSchema,
  deleteStudentSchema,
  studentsStatsQuery,
  listStudentsQuery,
  createMentorSchema,
  freezeMentorSchema,
  updateMentorSchema,
  createGroupSchema,
  updateGroupSchema,
  addGroupStudentSchema,
  listGroupsQuery,
  createAnnouncementSchema,
  improveAnnouncementSchema,
  groupAttendanceQuery,
  markGroupAttendanceSchema,
  createGroupHomeworkSchema,
  createGroupFeedbackSchema,
  studentAttendanceQuery,
  sendStudentTelegramMessageSchema,
} from './admin.schemas.js';
import * as ctrl from './admin.controller.js';
import * as discipline from '../discipline/discipline.controller.js';
import { issuePenaltySchema, listPenaltiesQuery } from '../discipline/discipline.schemas.js';
import paymentsRoutes from './payments/payments.routes.js';
import reportsRoutes from './reports/reports.routes.js';
import shopAdminRoutes from './shop/shop-admin.routes.js';
import roomsRoutes from './rooms/rooms.routes.js';

/**
 * K-ADMIN — панель филиала. Только Admin; scope жёстко = свой branch_id.
 * Управление: дашборд, расходы, студенты (add-student с генерацией логин-кода),
 * группы, платежи (/payments), отчёты (/reports).
 */
const router = Router();

// branch_manager получил те же права, что admin, в своём филиале (07.08.2026,
// решение Karis) — req.scope у обеих ролей уже совпадает (authorize.js:32),
// так что второй набор эндпоинтов не нужен, достаточно пустить сюда роль.
router.use(authenticate, orgAccessGate, authorize('admin', 'branch_manager'));

router.use('/payments', paymentsRoutes);
router.use('/reports', reportsRoutes);
router.use('/shop', requireOrgFeature('shop'), shopAdminRoutes);
router.use('/rooms', roomsRoutes);

/**
 * @openapi
 * /api/admin/schedule:
 *   get:
 *     tags: [Admin]
 *     summary: Rooms + active groups with schedule, for the drag-and-drop Расписание grid
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Rooms and groups of the branch
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/schedule', ctrl.schedule);

/**
 * @openapi
 * /api/admin/dashboard:
 *   get:
 *     tags: [Admin]
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
 * /api/admin/settings:
 *   get:
 *     tags: [Admin]
 *     summary: Branch-visible org settings (lesson duration)
 *     description: >
 *       Read-only for admins — the value is owned by the organization and is edited by the
 *       CEO (PATCH /api/super/organization). The group form uses it to compute the
 *       lesson end time from the chosen start time.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lessonDurationMin: { type: integer, nullable: true, example: 90 }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/settings', ctrl.settings);

/**
 * @openapi
 * /api/admin/expenses:
 *   post:
 *     tags: [Admin]
 *     summary: Record a branch expense
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateExpenseRequest' }
 *     responses:
 *       201:
 *         description: Expense created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { expense: { $ref: '#/components/schemas/Expense' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *   get:
 *     tags: [Admin]
 *     summary: List branch expenses (paginated, optional date range)
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
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/expenses', validate({ body: createExpenseSchema }), ctrl.createExpense);
router.get('/expenses', validate({ query: listExpensesQuery }), ctrl.listExpenses);

/**
 * @openapi
 * /api/admin/expenses/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Soft-delete a branch expense
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     responses:
 *       204: { description: Expense deleted }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Expense not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
/**
 * @openapi
 * /api/admin/expenses/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Update a branch expense (partial — at least one field)
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
 *               category: { type: string, minLength: 1, maxLength: 60 }
 *               amount: { type: number }
 *               spentAt: { type: string, format: date }
 *               note: { type: string, maxLength: 1000 }
 *     responses:
 *       200:
 *         description: Updated expense
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { expense: { $ref: '#/components/schemas/Expense' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Expense not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch('/expenses/:id', validate({ params: idParam, body: updateExpenseSchema }), ctrl.updateExpense);
router.delete('/expenses/:id', validate({ params: idParam }), ctrl.deleteExpense);

/**
 * @openapi
 * /api/admin/students:
 *   post:
 *     tags: [Admin]
 *     summary: Create a student (and optionally their parent), auto-generating login codes/passwords
 *     description: >
 *       Login code (8 chars) and password (6 digits) are generated server-side for
 *       both the student and, if `parent` is supplied, the parent — returned once
 *       in this response only (must be relayed out-of-band; code-role accounts have
 *       no forgot-password). If `groupId` is given, the group must belong to the
 *       admin's branch and must not be archived (409 if archived).
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateStudentRequest' }
 *     responses:
 *       201:
 *         description: Student (and optional parent) created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 student:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     firstName: { type: string }
 *                     lastName: { type: string }
 *                     loginCode: { type: string }
 *                     password: { type: string }
 *                 parent:
 *                   nullable: true
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     firstName: { type: string }
 *                     lastName: { type: string }
 *                     loginCode: { type: string }
 *                     password: { type: string }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Group not found in your branch
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Group is archived, phone already in use, or login-code collision retries exhausted
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *   get:
 *     tags: [Admin]
 *     summary: List students of the branch (paginated, search, filter by group)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/PageParam' }
 *       - { $ref: '#/components/parameters/LimitParam' }
 *       - name: search
 *         in: query
 *         schema: { type: string }
 *       - name: groupId
 *         in: query
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Paginated list of students
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 students:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/StudentListItem' }
 *                 meta: { $ref: '#/components/schemas/PageMeta' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/students', validate({ body: createStudentSchema }), ctrl.createStudent);
router.get('/students', validate({ query: listStudentsQuery }), ctrl.listStudents);
router.get('/students/stats', validate({ query: studentsStatsQuery }), ctrl.studentsStats);

/**
 * @openapi
 * /api/admin/students/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Student detail (profile + debt + coin balance + groups)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     responses:
 *       200:
 *         description: Student detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { student: { $ref: '#/components/schemas/StudentDetail' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Student not found in your branch
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *   patch:
 *     tags: [Admin]
 *     summary: Update a student's profile fields (partial — at least one field)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateStudentRequest' }
 *     responses:
 *       200:
 *         description: Updated student
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 student:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     firstName: { type: string }
 *                     lastName: { type: string }
 *                     phone: { type: string }
 *                     status: { type: string }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Student not found in your branch
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Phone already in use
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/students/:id', validate({ params: idParam }), ctrl.studentDetail);
router.get('/students/:id/attendance', validate({ params: idParam, query: studentAttendanceQuery }), ctrl.studentAttendance);
router.get('/students/:id/telegram', validate({ params: idParam }), ctrl.studentTelegramStatus);
router.post('/students/:id/telegram/message', requireOrgFeature('telegram_integration'), validate({ params: idParam, body: sendStudentTelegramMessageSchema }), ctrl.sendStudentTelegramMessage);
router.post('/students/:id/qr-token', validate({ params: idParam }), ctrl.createStudentQrToken);
router.post('/students/:id/qr-token/regenerate', validate({ params: idParam }), ctrl.regenerateStudentQrToken);
router.post('/students/:id/parent/qr-token', validate({ params: idParam }), ctrl.createParentQrToken);
router.post('/students/:id/parent/qr-token/regenerate', validate({ params: idParam }), ctrl.regenerateParentQrToken);
router.patch('/students/:id', validate({ params: idParam, body: updateStudentSchema }), ctrl.updateStudent);

/**
 * @openapi
 * /api/admin/students/{id}/freeze:
 *   post:
 *     tags: [Admin]
 *     summary: Freeze or unfreeze a student account
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [frozen]
 *             properties:
 *               frozen: { type: boolean }
 *               reason: { type: string, maxLength: 500 }
 *     responses:
 *       200:
 *         description: Updated status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 student:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     status: { type: string }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Student not found in your branch
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/students/:id/freeze', validate({ params: idParam, body: freezeStudentSchema }), ctrl.freezeStudent);

/**
 * @openapi
 * /api/admin/students/{id}/regenerate-password:
 *   post:
 *     tags: [Admin]
 *     summary: Regenerate a student's numeric password (code-role accounts have no forgot-password flow)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     responses:
 *       200:
 *         description: New password (shown once)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 password: { type: string }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Student not found in your branch
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/students/:id/regenerate-password', validate({ params: idParam }), ctrl.regenerateStudentPassword);
router.get('/students/:id/credentials', validate({ params: idParam }), ctrl.getStudentCredentials);
router.post('/students/:id/parent/regenerate-password', validate({ params: idParam }), ctrl.regenerateParentPassword);
router.get('/students/:id/parent/credentials', validate({ params: idParam }), ctrl.getParentCredentials);

/**
 * @openapi
 * /api/admin/students/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Soft-delete a student and remove them from all groups
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     responses:
 *       204: { description: Student deleted }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Student not found in your branch
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.delete('/students/:id', validate({ params: idParam, body: deleteStudentSchema }), ctrl.deleteStudent);

/**
 * @openapi
 * /api/admin/mentors:
 *   post:
 *     tags: [Admin]
 *     summary: Create a mentor in the admin's branch (login by email)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateMentorRequest' }
 *     responses:
 *       201:
 *         description: Mentor created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { mentor: { $ref: '#/components/schemas/MentorSummary' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409:
 *         description: Email or phone already in use
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *   get:
 *     tags: [Admin]
 *     summary: List mentors of the branch
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of mentors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mentors:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - { $ref: '#/components/schemas/MentorSummary' }
 *                       - type: object
 *                         properties:
 *                           groups: { type: integer }
 *                           createdAt: { type: string, format: date-time }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.post('/mentors', validate({ body: createMentorSchema }), ctrl.createMentor);
router.get('/mentors', ctrl.listMentors);

/**
 * @openapi
 * /api/admin/mentors/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Update a mentor (partial — at least one field)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateMentorRequest' }
 *     responses:
 *       200:
 *         description: Updated mentor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { mentor: { $ref: '#/components/schemas/MentorSummary' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Mentor not found in your branch
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Phone already in use
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch('/mentors/:id', validate({ params: idParam, body: updateMentorSchema }), ctrl.updateMentor);

/**
 * @openapi
 * /api/admin/mentors/{id}/freeze:
 *   post:
 *     tags: [Admin]
 *     summary: Freeze or unfreeze a mentor account
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [frozen]
 *             properties: { frozen: { type: boolean } }
 *     responses:
 *       200:
 *         description: Updated mentor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { mentor: { $ref: '#/components/schemas/MentorSummary' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Mentor not found in your branch
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/mentors/:id/freeze', validate({ params: idParam, body: freezeMentorSchema }), ctrl.freezeMentor);

/**
 * @openapi
 * /api/admin/mentors/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Soft-delete a mentor
 *     description: >
 *       Blocked with 409 if the mentor still leads active (non-archived) groups —
 *       reassign or archive those groups first.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     responses:
 *       204: { description: Mentor deleted }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Mentor not found in your branch
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Mentor still leads active groups
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.delete('/mentors/:id', validate({ params: idParam }), ctrl.deleteMentor);

/**
 * @openapi
 * /api/admin/groups:
 *   post:
 *     tags: [Admin]
 *     summary: Create a group in the branch, assigned to a mentor
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateGroupRequest' }
 *     responses:
 *       201:
 *         description: Group created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { group: { $ref: '#/components/schemas/Group' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Mentor not found in your branch
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *   get:
 *     tags: [Admin]
 *     summary: List groups of the branch (paginated)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/PageParam' }
 *       - { $ref: '#/components/parameters/LimitParam' }
 *     responses:
 *       200:
 *         description: Paginated list of groups
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 groups:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - { $ref: '#/components/schemas/Group' }
 *                       - type: object
 *                         properties:
 *                           students: { type: integer }
 *                           mentor:
 *                             type: object
 *                             properties:
 *                               id: { type: string, format: uuid }
 *                               name: { type: string }
 *                 meta: { $ref: '#/components/schemas/PageMeta' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.post('/groups', validate({ body: createGroupSchema }), ctrl.createGroup);
router.get('/groups', validate({ query: listGroupsQuery }), ctrl.listGroups);
// методики с уже назначенной CEO ценой — источник «Направление» при создании группы
router.get('/training-types', ctrl.listTrainingTypes);

/**
 * @openapi
 * /api/admin/groups/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Group detail — group info + mentor + member students
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     responses:
 *       200:
 *         description: Group detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 group:
 *                   allOf:
 *                     - { $ref: '#/components/schemas/Group' }
 *                     - type: object
 *                       properties:
 *                         mentor:
 *                           type: object
 *                           properties:
 *                             id: { type: string, format: uuid }
 *                             name: { type: string }
 *                         students:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id: { type: string, format: uuid }
 *                               firstName: { type: string }
 *                               lastName: { type: string }
 *                               phone: { type: string }
 *                               status: { type: string }
 *                               totalDebt: { type: number }
 *                               coinBalance: { type: integer }
 *                               joinedAt: { type: string, format: date-time }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Group not found in your branch
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *   patch:
 *     tags: [Admin]
 *     summary: Update a group (partial — at least one field; can reassign mentor)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateGroupRequest' }
 *     responses:
 *       200:
 *         description: Updated group
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { group: { $ref: '#/components/schemas/Group' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Group or mentor not found in your branch
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/groups/:id', validate({ params: idParam }), ctrl.groupDetail);
router.get('/groups/:id/telegram', requireOrgFeature('telegram_integration'), validate({ params: idParam }), ctrl.groupTelegramStatus);
router.post('/groups/:id/telegram/bind-token', requireOrgFeature('telegram_integration'), validate({ params: idParam }), ctrl.createGroupTelegramBindToken);
router.delete('/groups/:id/telegram', requireOrgFeature('telegram_integration'), validate({ params: idParam }), ctrl.unlinkGroupTelegram);
router.patch('/groups/:id', validate({ params: idParam, body: updateGroupSchema }), ctrl.updateGroup);

/**
 * @openapi
 * /api/admin/groups/{id}/archive:
 *   post:
 *     tags: [Admin]
 *     summary: Archive a group (read-only afterwards)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     responses:
 *       200:
 *         description: Group archived
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { group: { $ref: '#/components/schemas/Group' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Group not found in your branch
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/groups/:id/archive', validate({ params: idParam }), ctrl.archiveGroup);

/**
 * @openapi
 * /api/admin/groups/{id}/unarchive:
 *   post:
 *     tags: [Admin]
 *     summary: Unarchive a group
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     responses:
 *       200:
 *         description: Group unarchived
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { group: { $ref: '#/components/schemas/Group' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Group not found in your branch
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/groups/:id/unarchive', validate({ params: idParam }), ctrl.unarchiveGroup);

/**
 * @openapi
 * /api/admin/groups/{id}/students:
 *   post:
 *     tags: [Admin]
 *     summary: Add a student to a group
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId]
 *             properties: { studentId: { type: string, format: uuid } }
 *     responses:
 *       201:
 *         description: Student added to group
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 groupId: { type: string, format: uuid }
 *                 studentId: { type: string, format: uuid }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Group or student not found in your branch
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Group is archived
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/groups/:id/students', validate({ params: idParam, body: addGroupStudentSchema }), ctrl.addGroupStudent);
router.get('/groups/:id/credentials', validate({ params: idParam }), ctrl.groupCredentials);

/**
 * @openapi
 * /api/admin/groups/{id}/students/{studentId}:
 *   delete:
 *     tags: [Admin]
 *     summary: Remove a student from a group
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *       - name: studentId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204: { description: Student removed from group }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Group not found in your branch, or student is not an active member
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.delete('/groups/:id/students/:studentId', validate({ params: groupStudentParams }), ctrl.removeGroupStudent);

// ==================== РАБОЧЕЕ ПРОСТРАНСТВО ГРУППЫ ====================
// GroupDetail (Admin): davomat / ДЗ / фикр-мулоҳоза. davomat и ДЗ переиспользуют
// общие таблицы attendance / homework (те же, что у mentor); фикр — своя таблица.

/**
 * @openapi
 * /api/admin/groups/{id}/attendance:
 *   get:
 *     tags: [Admin]
 *     summary: Group attendance roster for a lesson date
 *     description: >
 *       Returns every active student of the group with their status on the given
 *       date (`null` if not yet marked) — a full roster, not only marked rows.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *       - name: date
 *         in: query
 *         required: true
 *         schema: { type: string, example: '2026-07-20' }
 *     responses:
 *       200:
 *         description: Attendance roster
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string, format: uuid, nullable: true }
 *                   studentId: { type: string, format: uuid }
 *                   studentName: { type: string }
 *                   status:
 *                     type: string
 *                     nullable: true
 *                     enum: [present, absent, late, excused]
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *   post:
 *     tags: [Admin]
 *     summary: Mark/clear group attendance for a lesson date
 *     description: >
 *       Records with a status are upserted; records with `status: null` clear the
 *       mark. Admins may correct past lessons but not future ones. Returns the
 *       refreshed roster.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lessonDate, records]
 *             properties:
 *               lessonDate: { type: string, example: '2026-07-20' }
 *               records:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [studentId, status]
 *                   properties:
 *                     studentId: { type: string, format: uuid }
 *                     status:
 *                       type: string
 *                       nullable: true
 *                       enum: [present, absent, late, excused]
 *     responses:
 *       200: { description: Refreshed roster }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get(
  '/groups/:id/attendance',
  validate({ params: idParam, query: groupAttendanceQuery }),
  ctrl.groupAttendance,
);
router.post(
  '/groups/:id/attendance',
  validate({ params: idParam, body: markGroupAttendanceSchema }),
  ctrl.markGroupAttendance,
);

/**
 * @openapi
 * /api/admin/groups/{id}/homework:
 *   get:
 *     tags: [Admin]
 *     summary: List group homework with submission progress
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     responses:
 *       200:
 *         description: Homework list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string, format: uuid }
 *                   title: { type: string }
 *                   description: { type: string, nullable: true }
 *                   dueDate: { type: string, nullable: true, example: '2026-07-27' }
 *                   status: { type: string, enum: [active, completed, overdue] }
 *                   submissions: { type: integer }
 *                   totalStudents: { type: integer }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   post:
 *     tags: [Admin]
 *     summary: Create homework for the group
 *     description: >
 *       maxScore (100) and coinReward (0) use table defaults. If `dueDate` is
 *       omitted the deadline defaults to one week ahead.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string, minLength: 1, maxLength: 200 }
 *               description: { type: string, maxLength: 2000 }
 *               dueDate: { type: string, example: '2026-07-27' }
 *     responses:
 *       201: { description: Homework created }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/groups/:id/homework', validate({ params: idParam }), ctrl.groupHomework);
router.post(
  '/groups/:id/homework',
  validate({ params: idParam, body: createGroupHomeworkSchema }),
  ctrl.createGroupHomework,
);

/**
 * @openapi
 * /api/admin/groups/{id}/feedback:
 *   get:
 *     tags: [Admin]
 *     summary: List group feedback (student/teacher reviews)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     responses:
 *       200:
 *         description: Feedback list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string, format: uuid }
 *                   type: { type: string, enum: [student, teacher] }
 *                   authorName: { type: string, nullable: true }
 *                   content: { type: string }
 *                   rating: { type: integer, minimum: 1, maximum: 5 }
 *                   createdAt: { type: string, format: date-time }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   post:
 *     tags: [Admin]
 *     summary: Add feedback to the group
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, content, rating]
 *             properties:
 *               type: { type: string, enum: [student, teacher] }
 *               authorName: { type: string, maxLength: 120 }
 *               content: { type: string, minLength: 1, maxLength: 2000 }
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *     responses:
 *       201: { description: Feedback created }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/groups/:id/feedback', validate({ params: idParam }), ctrl.groupFeedback);
router.post(
  '/groups/:id/feedback',
  validate({ params: idParam, body: createGroupFeedbackSchema }),
  ctrl.createGroupFeedback,
);

// объявления (для Telegram-бота — рассылка родителям/студентам филиала или группы)
/**
 * @openapi
 * /api/admin/announcements:
 *   post:
 *     tags: [Admin]
 *     summary: Broadcast an announcement to students of the branch (or one group)
 *     description: >
 *       Resolves the recipients (all active students of the branch, or only the given group),
 *       then enqueues `announcement.created` on the notification queue — delivery is handled
 *       asynchronously by the Telegram bot worker, never inline.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, message]
 *             properties:
 *               title: { type: string, minLength: 1, maxLength: 160 }
 *               message: { type: string, minLength: 1, maxLength: 2000 }
 *               groupId:
 *                 type: string
 *                 format: uuid
 *                 description: Omit to send to every active student of the branch
 *     responses:
 *       201:
 *         description: Queued for delivery
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/announcements', ctrl.listAnnouncements);
router.get('/announcements/image-upload-url', ctrl.announcementImageUploadUrl);
router.post('/announcements/improve', validate({ body: improveAnnouncementSchema }), ctrl.improveAnnouncement);
router.post('/announcements', authorize('branch_manager'), validate({ body: createAnnouncementSchema }), ctrl.createAnnouncement);

// ==================== ДИСЦИПЛИНА ====================

/**
 * @openapi
 * /api/admin/penalties:
 *   get:
 *     tags: [Discipline]
 *     summary: List penalties issued by this admin
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: targetUserId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [shtraf, qora] }
 *     responses:
 *       200:
 *         description: Penalty list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Penalty' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *   post:
 *     tags: [Discipline]
 *     summary: Issue penalty — Admin → mentor/methodist (shtraf), mentor (qora)
 *     description: Ментор только своего филиала. Права проверяются в discipline.service.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/IssuePenaltyRequest' }
 *     responses:
 *       201:
 *         description: Penalty created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/IssuePenaltyResponse' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/penalties', validate({ query: listPenaltiesQuery }), discipline.listPenalties);
router.post('/penalties', validate({ body: issuePenaltySchema }), discipline.issuePenalty);

export default router;
