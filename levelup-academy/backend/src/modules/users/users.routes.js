import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { orgAccessGate } from '../../middlewares/orgAccessGate.js';
import * as ctrl from './users.controller.js';
import * as discipline from '../discipline/discipline.controller.js';
import { directoryQuerySchema, idParamSchema, listUsersQuerySchema, updateProfileSchema } from './users.schemas.js';

const router = Router();

router.use(authenticate, orgAccessGate);

/**
 * @openapi
 * /api/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Current authenticated user's profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Own profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/UserProfile' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *   patch:
 *     tags: [Users]
 *     summary: Update own profile (partial — at least one field)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateProfileRequest' }
 *     responses:
 *       200:
 *         description: Updated profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/UserProfile' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/me', ctrl.getMe);
router.patch('/me', validate({ body: updateProfileSchema }), ctrl.updateMe);

// Своя дисциплина: сотрудник (admin/mentor/methodist) видит каталог правил + свои штрафы.
// authorize(...) без ctrl-роутов просто ставит req.scope и режет доступ до staff.
/**
 * @openapi
 * /api/users/me/penalties:
 *   get:
 *     tags: [Discipline]
 *     summary: Own penalties (admin / mentor / methodist self-view)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Own penalty list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       type: { type: string, enum: [sariq, qizil, shtraf, qora] }
 *                       amount: { type: number, nullable: true }
 *                       reason: { type: string }
 *                       issuer_role: { type: string }
 *                       created_at: { type: string, format: date-time }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 * /api/users/me/discipline-rules:
 *   get:
 *     tags: [Discipline]
 *     summary: Organization discipline rules catalog (staff self-view, read-only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Rules
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/me/penalties', authorize('admin', 'mentor', 'methodist'), discipline.myPenalties);
router.get('/me/discipline-rules', authorize('admin', 'mentor', 'methodist'), discipline.listRules);

// Единый каталог. Порядок важен: статический `/directory` должен идти до `/:id`.
router.get(
  '/directory',
  authorize('main_admin', 'ceo', 'admin', 'branch_manager', 'finance_manager', 'mentor', 'methodist'),
  validate({ query: directoryQuerySchema }),
  ctrl.listDirectory,
);

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: List users of the caller's own branch (admin/ceo only)
 *     description: Requires `req.user.branchId` to be set — returns 400 if the caller has no branch scope.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: role
 *         in: query
 *         schema: { type: string, enum: [main_admin, ceo, admin, mentor, methodist, parent, student] }
 *       - name: status
 *         in: query
 *         schema: { type: string, enum: [active, frozen, graduated, dropped] }
 *       - { $ref: '#/components/parameters/PageParam' }
 *       - { $ref: '#/components/parameters/LimitParam' }
 *     responses:
 *       200:
 *         description: Paginated list of branch users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/UserProfile' }
 *                 meta: { $ref: '#/components/schemas/PageMeta' }
 *       400:
 *         description: Branch scope required (caller has no branchId)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/', authorize('admin', 'ceo'), validate({ query: listUsersQuerySchema }), ctrl.listUsers);

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user's profile card, scoped to the caller
 *     description: >
 *       Staff-only (main_admin, ceo, admin, mentor) — student/parent must
 *       use `GET /api/users/me` for their own data. Scope: main_admin sees the
 *       whole platform; ceo only users in their own organization; admin/
 *       mentor only users in their own branch. A user outside scope returns 404
 *       (existence not disclosed).
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/UserProfile' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: User not found (includes users outside caller's scope)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
// только персонал — member-роли (student/parent) не должны читать чужой PII;
// контроллер дополнительно скоупит по org/branch. Свои данные — через GET /me.
router.get('/:id', authorize('main_admin', 'ceo', 'admin', 'mentor'), validate({ params: idParamSchema }), ctrl.getUser);

export default router;
