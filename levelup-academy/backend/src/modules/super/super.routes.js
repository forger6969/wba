import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { orgAccessGate } from '../../middlewares/orgAccessGate.js';
import { requireOrgFeature } from '../../middlewares/requireOrgFeature.js';
import {
  createBranchSchema,
  createAdminSchema,
  updateBranchSchema,
  updateAdminSchema,
  freezeSchema,
  idParam,
  createMethodistSchema,
  updateMethodistSchema,
  freezeMethodistSchema,
  updateOrganizationSchema,
  createAnnouncementSchema,
  improveAnnouncementSchema,
  statsQuery,
  createBranchManagerSchema,
  updateBranchManagerSchema,
  freezeBranchManagerSchema,
  reassignBranchManagersSchema,
  setTrainingTypePriceSchema,
  setTrainingTypeArchivedSchema,
  createShopItemSchema,
  updateShopItemSchema,
  setShopItemArchivedSchema,
  listShopItemsQuery,
  createFeatureRequestSchema,
  createOrgExpenseSchema,
  listOrgExpensesSchema,
  updateOrgExpenseSchema,
  createEmployeeSchema,
  updateEmployeeSchema,
  createOrgMentorSchema,
  updateMentorGradeSchema,
  updateMentorBranchSchema,
} from './super.schemas.js';
import * as ctrl from './super.controller.js';
import * as discipline from '../discipline/discipline.controller.js';
import * as reminders from './reminders/reminders.controller.js';
import {
  issuePenaltySchema,
  listPenaltiesQuery,
  createRuleSchema,
} from '../discipline/discipline.schemas.js';

const router = Router();

// вся панель — только CEO (владелец организации-партнёра); scope = своя org
router.use(authenticate, orgAccessGate, authorize('ceo'));

// CEO может внести расход в любой филиал своей организации.
router.post('/expenses', validate({ body: createOrgExpenseSchema }), ctrl.createExpense);
router.get('/expenses', validate({ query: listOrgExpensesSchema }), ctrl.listExpenses);
router.patch('/expenses/:id', validate({ params: idParam, body: updateOrgExpenseSchema }), ctrl.updateExpense);
router.delete('/expenses/:id', validate({ params: idParam }), ctrl.deleteExpense);

/**
 * @openapi
 * /api/super/dashboard:
 *   get:
 *     tags: [CEO]
 *     summary: Organization dashboard (revenue, debt, students, per-branch breakdown)
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
 *                     branches: { type: integer }
 *                     activeStudents: { type: integer }
 *                     admins: { type: integer }
 *                     revenue: { type: number }
 *                     outstandingDebt: { type: number }
 *                     currency: { type: string, example: UZS }
 *                 branches:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       name: { type: string }
 *                       isMain: { type: boolean }
 *                       isArchived: { type: boolean }
 *                       students: { type: integer }
 *                       admins: { type: integer }
 *                       revenue: { type: number }
 *                       debt: { type: number }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/dashboard', ctrl.dashboard);

/**
 * @openapi
 * /api/super/organization:
 *   get:
 *     tags: [CEO]
 *     summary: Organization profile (Settings page)
 *     description: >
 *       Returns the partner organization profile. `plan` is derived from the
 *       organization's tier (see `config/plans.js`), it is not stored per-row.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Organization profile
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Organization' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   patch:
 *     tags: [CEO]
 *     summary: Update organization profile (name / domain / lesson duration)
 *     description: >
 *       Partial update — at least one field is required. `lessonDurationMin`
 *       applies to every group of the organization: group end time is computed
 *       from it on the backend (see POST/PATCH /api/admin/groups).
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateOrganizationRequest' }
 *     responses:
 *       200:
 *         description: Updated organization profile
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Organization' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/organization', ctrl.getOrganization);
router.patch('/organization', validate({ body: updateOrganizationSchema }), ctrl.updateOrganization);

/**
 * @openapi
 * /api/super/students:
 *   get:
 *     tags: [CEO]
 *     summary: List students across the whole organization (paginated)
 *     description: >
 *       Search matches first name, last name or phone (ILIKE). Scope is the
 *       caller's organization — students of every branch are included.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Substring match on first name / last name / phone
 *       - in: query
 *         name: frozen
 *         schema: { type: string, enum: ['true', 'false'] }
 *         description: Filter by frozen status; omit for all
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated students
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 students:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       firstName: { type: string }
 *                       lastName: { type: string }
 *                       phone: { type: string, nullable: true }
 *                       status: { type: string }
 *                       frozen: { type: boolean }
 *                       branchName: { type: string, nullable: true }
 *                       createdAt: { type: string, format: date-time }
 *                 total: { type: integer }
 *                 page: { type: integer }
 *                 pageCount: { type: integer }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/students', ctrl.listStudents);

/**
 * @openapi
 * /api/super/students/{id}:
 *   delete:
 *     tags: [CEO]
 *     summary: Soft-delete a student of the organization
 *     description: Sets `deleted_at`; the row is kept for finance history.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { id: { type: string, format: uuid } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.delete('/students/:id', validate({ params: idParam }), ctrl.deleteStudent);

/**
 * @openapi
 * /api/super/groups:
 *   get:
 *     tags: [CEO]
 *     summary: List groups across the whole organization
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Groups of every branch
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 groups:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       name: { type: string }
 *                       subject: { type: string, nullable: true }
 *                       monthlyPrice: { type: number }
 *                       schedule: { type: object, nullable: true }
 *                       lessonDays:
 *                         type: object
 *                         nullable: true
 *                         description: Alias of `schedule`, kept for the front-end
 *                       room: { type: string, nullable: true }
 *                       isArchived: { type: boolean }
 *                       branchName: { type: string, nullable: true }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/groups', ctrl.listGroups);

/**
 * @openapi
 * /api/super/groups/{id}/archive:
 *   post:
 *     tags: [CEO]
 *     summary: Archive a group (read-only, mutations return 403 afterwards)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Archived
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 group:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     isArchived: { type: boolean, example: true }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.post('/groups/:id/archive', validate({ params: idParam }), ctrl.archiveGroup);

/**
 * @openapi
 * /api/super/groups/{id}/unarchive:
 *   post:
 *     tags: [CEO]
 *     summary: Unarchive a group
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Unarchived
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 group:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     isArchived: { type: boolean, example: false }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.post('/groups/:id/unarchive', validate({ params: idParam }), ctrl.unarchiveGroup);

/**
 * @openapi
 * /api/super/groups/{id}:
 *   delete:
 *     tags: [CEO]
 *     summary: Soft-delete a group of the organization
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { id: { type: string, format: uuid } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.delete('/groups/:id', validate({ params: idParam }), ctrl.deleteGroup);

/**
 * @openapi
 * /api/super/attendance:
 *   get:
 *     tags: [CEO]
 *     summary: Attendance across the organization (optional group/date filter)
 *     description: >
 *       `records` and `lessons` are the same array (`lessons` is a front-end
 *       alias). `totals` counts each status over the returned records.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: groupId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Attendance records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 records:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       groupId: { type: string, format: uuid }
 *                       groupName: { type: string }
 *                       studentId: { type: string, format: uuid }
 *                       firstName: { type: string }
 *                       lastName: { type: string }
 *                       date: { type: string, format: date }
 *                       status: { type: string, enum: [present, absent, late, excused] }
 *                 lessons:
 *                   type: array
 *                   description: Alias of `records`
 *                   items: { type: object }
 *                 totals:
 *                   type: object
 *                   properties:
 *                     present: { type: integer }
 *                     absent: { type: integer }
 *                     late: { type: integer }
 *                     excused: { type: integer }
 *                 total: { type: integer }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/attendance', ctrl.attendance);

/**
 * @openapi
 * /api/super/announcements:
 *   get:
 *     tags: [CEO]
 *     summary: List organization announcements (migration 1783870000000_super-announcements)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Announcements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 announcements: { type: array, items: { type: object } }
 *                 items: { type: array, items: { type: object } }
 *                 total: { type: integer }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *   post:
 *     tags: [CEO]
 *     summary: Create an announcement — queues Telegram delivery for parent/student audiences
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, body, targetType]
 *             properties:
 *               title: { type: string, maxLength: 200 }
 *               body: { type: string, maxLength: 4000 }
 *               targetType: { type: string, enum: [all-staff, all-admins, all-mentors, all-parents, all-students] }
 *     responses:
 *       201:
 *         description: Created
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/announcements', ctrl.listAnnouncements);
router.get('/announcements/image-upload-url', ctrl.announcementImageUploadUrl);
router.post('/announcements/improve', validate({ body: improveAnnouncementSchema }), ctrl.improveAnnouncement);
router.post('/announcements', validate({ body: createAnnouncementSchema }), ctrl.createAnnouncement);

/**
 * @openapi
 * /api/super/announcements/{id}:
 *   delete:
 *     tags: [CEO]
 *     summary: Soft-delete an announcement
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Announcement not found in your organization
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.delete('/announcements/:id', validate({ params: idParam }), ctrl.deleteAnnouncement);

/**
 * @openapi
 * /api/super/reminders:
 *   get:
 *     tags: [CEO]
 *     summary: History of automated payment reminders (payment.due / payment.due_soon / debt.overdue)
 *     description: >
 *       Not written by an HTTP handler — a BullMQ QueueEvents listener
 *       (reminders/reminders.listener.js) logs each reminder job as it
 *       completes or fails on the shared 'notifications' queue. Scoped to
 *       this organization, newest first.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Reminder history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       studentName: { type: string }
 *                       parentName: { type: string }
 *                       message: { type: string }
 *                       status: { type: string, enum: [pending, sent, failed] }
 *                       error: { type: string, nullable: true }
 *                       sentAt: { type: string, format: date-time, nullable: true }
 *                       createdAt: { type: string, format: date-time }
 *                 total: { type: integer }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/reminders', reminders.list);

/**
 * @openapi
 * /api/super/reminders/{id}/resend:
 *   post:
 *     tags: [CEO]
 *     summary: Re-queue the same reminder job (same payload) — history is not overwritten, a new entry appears once it settles
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Re-queued
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Reminder not found in your organization
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/reminders/:id/resend', validate({ params: idParam }), reminders.resend);

/**
 * @openapi
 * /api/super/reminders/{id}:
 *   delete:
 *     tags: [CEO]
 *     summary: Delete a reminder history entry
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Reminder not found in your organization
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.delete('/reminders/:id', validate({ params: idParam }), reminders.remove);

/**
 * @openapi
 * /api/super/audit:
 *   get:
 *     tags: [CEO]
 *     summary: Organization audit log (migration 1783880000000_audit-log)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Audit entries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items: { type: array, items: { type: object } }
 *                 total: { type: integer }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/audit', ctrl.listAudit);

/**
 * @openapi
 * /api/super/stats:
 *   get:
 *     tags: [CEO]
 *     summary: Organization statistics — KPIs, revenue series, per-branch and per-method breakdown
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: period
 *         in: query
 *         schema: { type: string, enum: ['7d', '30d', '90d'], default: '30d' }
 *     responses:
 *       200:
 *         description: Stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period: { type: string }
 *                 totals:
 *                   type: object
 *                   properties:
 *                     revenue: { type: number }
 *                     outstandingDebt: { type: number }
 *                     activeStudents: { type: integer }
 *                     admins: { type: integer }
 *                     branches: { type: integer }
 *                     avgRevenue: { type: number }
 *                     debtRatio: { type: number }
 *                     currency: { type: string }
 *                 branches:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       name: { type: string }
 *                       revenue: { type: number }
 *                       debt: { type: number }
 *                       students: { type: integer }
 *                       admins: { type: integer }
 *                       share: { type: number, description: 'Доля филиала в общей выручке организации, %' }
 *                 revenueSeries: { type: array, items: { type: object } }
 *                 paymentMethods: { type: array, items: { type: object } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/stats', validate({ query: statsQuery }), ctrl.stats);

/**
 * @openapi
 * /api/super/branches:
 *   post:
 *     tags: [CEO]
 *     summary: Create a branch in the organization
 *     description: The organization's first branch is automatically flagged `isMain`.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateBranchRequest' }
 *     responses:
 *       201:
 *         description: Branch created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { branch: { $ref: '#/components/schemas/Branch' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *   get:
 *     tags: [CEO]
 *     summary: List branches of the organization (with admin/student counts)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of branches
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 branches:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - { $ref: '#/components/schemas/Branch' }
 *                       - type: object
 *                         properties:
 *                           admins: { type: integer }
 *                           students: { type: integer }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.post('/branches', validate({ body: createBranchSchema }), ctrl.createBranch);
router.get('/branches', ctrl.listBranches);

/**
 * @openapi
 * /api/super/branches/{id}:
 *   get:
 *     tags: [CEO]
 *     summary: Branch detail — branch info + its admins + its groups
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     responses:
 *       200:
 *         description: Branch detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 branch:
 *                   allOf:
 *                     - { $ref: '#/components/schemas/Branch' }
 *                     - type: object
 *                       properties:
 *                         admins:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id: { type: string, format: uuid }
 *                               firstName: { type: string }
 *                               lastName: { type: string }
 *                               email: { type: string, format: email }
 *                               status: { type: string }
 *                         groups:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id: { type: string, format: uuid }
 *                               name: { type: string }
 *                               subject: { type: string }
 *                               monthlyPrice: { type: number }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Branch not found in your organization
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *   patch:
 *     tags: [CEO]
 *     summary: Update branch fields (partial — at least one field required)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateBranchRequest' }
 *     responses:
 *       200:
 *         description: Updated branch
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { branch: { $ref: '#/components/schemas/Branch' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Branch not found in your organization
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/branches/:id', validate({ params: idParam }), ctrl.branchDetail);
router.patch('/branches/:id', validate({ params: idParam, body: updateBranchSchema }), ctrl.updateBranch);

/**
 * @openapi
 * /api/super/branches/{id}/archive:
 *   post:
 *     tags: [CEO]
 *     summary: Archive a branch (read-only afterwards)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     responses:
 *       200:
 *         description: Branch archived
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { branch: { $ref: '#/components/schemas/Branch' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Branch not found in your organization
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/branches/:id/archive', validate({ params: idParam }), ctrl.archiveBranch);

/**
 * @openapi
 * /api/super/branches/{id}/unarchive:
 *   post:
 *     tags: [CEO]
 *     summary: Unarchive a branch
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     responses:
 *       200:
 *         description: Branch unarchived
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { branch: { $ref: '#/components/schemas/Branch' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Branch not found in your organization
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/branches/:id/unarchive', validate({ params: idParam }), ctrl.unarchiveBranch);

/**
 * @openapi
 * /api/super/admins:
 *   post:
 *     tags: [CEO]
 *     summary: Create an admin assigned to one of the organization's branches
 *     description: Login (email) is set by CEO; password is auto-generated and returned once (tempPassword).
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateAdminRequest' }
 *     responses:
 *       201:
 *         description: Admin created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { admin: { $ref: '#/components/schemas/AdminSummary' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Branch not found in your organization
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Email already in use
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *   get:
 *     tags: [CEO]
 *     summary: List admins of the organization
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of admins
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 admins:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - { $ref: '#/components/schemas/AdminSummary' }
 *                       - type: object
 *                         properties:
 *                           branchName: { type: string }
 *                           createdAt: { type: string, format: date-time }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.post('/admins', validate({ body: createAdminSchema }), ctrl.createAdmin);
router.get('/admins', ctrl.listAdmins);

router.post('/employees', validate({ body: createEmployeeSchema }), ctrl.createEmployee);
router.get('/employees', ctrl.listEmployees);
router.patch('/employees/:id', validate({ params: idParam, body: updateEmployeeSchema }), ctrl.updateEmployee);
router.patch('/employees/:id/freeze', validate({ params: idParam, body: freezeSchema }), ctrl.freezeEmployee);
router.post('/employees/:id/reset-password', validate({ params: idParam }), ctrl.resetEmployeePassword);

/**
 * @openapi
 * /api/super/admins/{id}:
 *   patch:
 *     tags: [CEO]
 *     summary: Update an admin (partial — at least one field; can reassign branch)
 *     description: If `branchId` is changed, the new branch must belong to the same organization.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateAdminRequest' }
 *     responses:
 *       200:
 *         description: Updated admin
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { admin: { $ref: '#/components/schemas/AdminSummary' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Admin or target branch not found in your organization
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch('/admins/:id', validate({ params: idParam, body: updateAdminSchema }), ctrl.updateAdmin);

/**
 * @openapi
 * /api/super/admins/{id}/freeze:
 *   patch:
 *     tags: [CEO]
 *     summary: Freeze or unfreeze an admin account
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
 *         description: Updated admin status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { admin: { $ref: '#/components/schemas/AdminSummary' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Admin not found in your organization
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch('/admins/:id/freeze', validate({ params: idParam, body: freezeSchema }), ctrl.freezeAdmin);
router.post('/admins/:id/reset-password', validate({ params: idParam }), ctrl.resetAdminPassword);

/**
 * @openapi
 * /api/super/methodists:
 *   post:
 *     tags: [CEO]
 *     summary: Create a methodist (organization-level, not tied to a branch)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateMethodistRequest' }
 *     responses:
 *       201:
 *         description: Methodist created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { methodist: { $ref: '#/components/schemas/MethodistSummary' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409:
 *         description: Email already in use
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *   get:
 *     tags: [CEO]
 *     summary: List methodists of the organization
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of methodists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 methodists:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - { $ref: '#/components/schemas/MethodistSummary' }
 *                       - type: object
 *                         properties: { createdAt: { type: string, format: date-time } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.post('/methodists', validate({ body: createMethodistSchema }), ctrl.createMethodist);
router.get('/methodists', ctrl.listMethodists);

// методики (training_types) — цена и лимит группы ставит только CEO, один раз на методику
router.get('/training-types', ctrl.listTrainingTypes);
router.patch('/training-types/:id/price', validate({ params: idParam, body: setTrainingTypePriceSchema }), ctrl.setTrainingTypePrice);
router.patch('/training-types/:id/archive', validate({ params: idParam, body: setTrainingTypeArchivedSchema }), ctrl.setTrainingTypeArchived);

// --- branch managers ---

/**
 * @openapi
 * /api/super/branch-managers:
 *   post:
 *     tags: [CEO]
 *     summary: Create a branch manager assigned to one of the organization's branches
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateBranchManagerRequest' }
 *     responses:
 *       201:
 *         description: Branch manager created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { manager: { $ref: '#/components/schemas/BranchManagerSummary' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Branch not found in your organization
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Email already in use
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *   get:
 *     tags: [CEO]
 *     summary: List branch managers of the organization
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of branch managers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 managers:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - { $ref: '#/components/schemas/BranchManagerSummary' }
 *                       - type: object
 *                         properties:
 *                           branchName: { type: string }
 *                           createdAt: { type: string, format: date-time }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.post('/branch-managers', validate({ body: createBranchManagerSchema }), ctrl.createBranchManager);
router.get('/branch-managers', ctrl.listBranchManagers);

// --- branch managers CRUD ---
// /reassign ДО /:id — иначе Express примет 'reassign' за параметр :id
router.patch('/branch-managers/reassign', validate({ body: reassignBranchManagersSchema }), ctrl.reassignBranchManagers);
router.patch('/branch-managers/:id', validate({ params: idParam, body: updateBranchManagerSchema }), ctrl.updateBranchManager);
router.patch('/branch-managers/:id/freeze', validate({ params: idParam, body: freezeBranchManagerSchema }), ctrl.freezeBranchManager);
router.post('/branch-managers/:id/reset-password', validate({ params: idParam }), ctrl.resetBranchManagerPassword);
router.delete('/branch-managers/:id', validate({ params: idParam }), ctrl.deleteBranchManager);

// --- методики / цена абонемента ---

/**
 * @openapi
 * /api/super/mentors:
 *   get:
 *     tags: [CEO]
 *     summary: List mentors of the organization (read-only — Admin of the branch manages them)
 *     description: Нужен только для выбора цели в «Взыскании» — CRUD ментора остаётся у Admin филиала.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of mentors
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/mentors', ctrl.listMentors);
router.post('/mentors', validate({ body: createOrgMentorSchema }), ctrl.createMentor);
router.patch('/mentors/:id/grade', validate({ params: idParam, body: updateMentorGradeSchema }), ctrl.updateMentorGrade);
router.patch('/mentors/:id/branch', validate({ params: idParam, body: updateMentorBranchSchema }), ctrl.updateMentorBranch);

/**
 * @openapi
 * /api/super/methodists/{id}:
 *   patch:
 *     tags: [CEO]
 *     summary: Update a methodist (partial — at least one field)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateMethodistRequest' }
 *     responses:
 *       200:
 *         description: Updated methodist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { methodist: { $ref: '#/components/schemas/MethodistSummary' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Methodist not found in your organization
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch('/methodists/:id', validate({ params: idParam, body: updateMethodistSchema }), ctrl.updateMethodist);

/**
 * @openapi
 * /api/super/methodists/{id}/freeze:
 *   patch:
 *     tags: [CEO]
 *     summary: Freeze or unfreeze a methodist account
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
 *         description: Updated methodist status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { methodist: { $ref: '#/components/schemas/MethodistSummary' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Methodist not found in your organization
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch('/methodists/:id/freeze', validate({ params: idParam, body: freezeMethodistSchema }), ctrl.freezeMethodist);
router.post('/methodists/:id/reset-password', validate({ params: idParam }), ctrl.resetMethodistPassword);

// ==================== ДИСЦИПЛИНА (правила + штрафы/предупреждения/qora) ====================

/**
 * @openapi
 * /api/super/penalties:
 *   get:
 *     tags: [Discipline]
 *     summary: List penalties in the organization
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: targetUserId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [sariq, qizil, qora] }
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
 *     summary: Issue a warning (sariq/qizil) or fire (qora) a staff member
 *     description: >
 *       CEO → admin / mentor / methodist. amount — необязательный
 *       довесок к любому из трёх уровней, не отдельная категория.
 *       qora ставит целевому status=fired (атомарно).
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

/**
 * @openapi
 * /api/super/staff/{id}/reactivate:
 *   post:
 *     tags: [Discipline]
 *     summary: Reactivate a fired staff member (qora → active)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     responses:
 *       200:
 *         description: Reactivated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     status: { type: string, example: active }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.post('/staff/:id/reactivate', validate({ params: idParam }), discipline.reactivateStaff);

/**
 * @openapi
 * /api/super/discipline-rules:
 *   get:
 *     tags: [Discipline]
 *     summary: List organization discipline rules (qoyda catalog)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Rules
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *   post:
 *     tags: [Discipline]
 *     summary: Create a discipline rule (violation -> sariq/qizil/qora)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type: { type: string, enum: [sariq, qizil, qora] }
 *               amount: { type: number, description: 'Необязательный довесок к любому уровню' }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Created
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/discipline-rules', discipline.listRules);
router.post('/discipline-rules', validate({ body: createRuleSchema }), discipline.createRule);

// ==================== SHOP-КАТАЛОГ (CEO заводит товары, филиал только пополняет остаток) ====================

/**
 * @openapi
 * /api/super/shop/items:
 *   get:
 *     tags: [CEO]
 *     summary: List global shop catalog items of the organization
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Items }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *   post:
 *     tags: [CEO]
 *     summary: Create a global shop item in every organization branch
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, coinPrice]
 *             properties:
 *               name: { type: string, minLength: 1, maxLength: 160 }
 *               imageKey: { type: string, maxLength: 512 }
 *               coinPrice: { type: integer, minimum: 1 }
 *     responses:
 *       201: { description: Item created }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Branch not found in your organization
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/shop/items', requireOrgFeature('shop'), validate({ query: listShopItemsQuery }), ctrl.listShopItems);
router.post('/shop/items', requireOrgFeature('shop'), validate({ body: createShopItemSchema }), ctrl.createShopItem);

/**
 * @openapi
 * /api/super/shop/items/{id}:
 *   patch:
 *     tags: [CEO]
 *     summary: Update a global shop item's name/image/price in every branch
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
 *               name: { type: string, minLength: 1, maxLength: 160 }
 *               imageKey: { type: string, maxLength: 512 }
 *               coinPrice: { type: integer, minimum: 1 }
 *     responses:
 *       200: { description: Updated item }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Item not found in your organization
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch('/shop/items/:id', requireOrgFeature('shop'), validate({ params: idParam, body: updateShopItemSchema }), ctrl.updateShopItem);

/**
 * @openapi
 * /api/super/shop/items/{id}/archive:
 *   patch:
 *     tags: [CEO]
 *     summary: Archive or unarchive a shop item (archived items are hidden from students)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [archived]
 *             properties: { archived: { type: boolean } }
 *     responses:
 *       200: { description: Updated item }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Item not found in your organization
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch('/shop/items/:id/archive', requireOrgFeature('shop'), validate({ params: idParam, body: setShopItemArchivedSchema }), ctrl.setShopItemArchived);

/**
 * @openapi
 * /api/super/discipline-rules/{id}:
 *   delete:
 *     tags: [Discipline]
 *     summary: Delete a discipline rule
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     responses:
 *       200:
 *         description: Deleted
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.delete('/discipline-rules/:id', validate({ params: idParam }), discipline.deleteRule);

// --- анонсы от Main Admin (баг 10.08.2026: писались, но были нечитаемы отсюда) ---
router.get('/platform-announcements', ctrl.listPlatformAnnouncements);

// --- каталог платных фич + свои заявки (переключает только Main Admin) ---
router.get('/features/catalog', ctrl.getFeatureCatalog);
router.post('/features/requests', validate({ body: createFeatureRequestSchema }), ctrl.createFeatureRequest);
router.get('/features/requests', ctrl.listOwnFeatureRequests);

// --- свой биллинг (read-only): статус доступа + журнал оплат/бонусов/кредитов ---
router.get('/billing', ctrl.getOwnBilling);
router.get('/billing/ledger', ctrl.getOwnLedger);

export default router;
