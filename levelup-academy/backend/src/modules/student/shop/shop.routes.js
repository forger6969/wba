import { Router } from 'express';
import { validate } from '../../../middlewares/validate.js';
import { archiveGuard } from '../../../middlewares/archiveGuard.js';
import * as ctrl from './shop.controller.js';
import { itemIdParamSchema, createItemSchema, updateItemSchema } from './shop.schemas.js';

const router = Router();

// auth: authenticate + authorize('student','admin','mentor') навешаны в
// student.routes.js; роль на мутациях дополнительно проверяет сервис.

/**
 * @openapi
 * /api/student/shop/items:
 *   get:
 *     tags: [Student Shop]
 *     summary: List active, in-stock shop items for the caller's branch
 *     description: Open to student, admin, and mentor (`req.user.branchId` taken directly from the JWT).
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/ShopItem' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       402:
 *         description: Payment overdue — access is blocked until paid (students only)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *   post:
 *     tags: [Student Shop]
 *     summary: Create a shop item (admin/mentor only — checked in the controller, not just authorize)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateShopItemRequest' }
 *     responses:
 *       201:
 *         description: Item created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/ShopItem' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403:
 *         description: Forbidden — student cannot create shop items
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/items', ctrl.listItems);

/**
 * @openapi
 * /api/student/shop/items/{itemId}/purchase:
 *   post:
 *     tags: [Student Shop]
 *     summary: Purchase a shop item with coins
 *     description: >
 *       Locks the item row, deducts `coinPrice` coins via `changeCoins` (which
 *       throws 422 if the student's balance is insufficient — rolling back the
 *       whole transaction, no order created), creates the order, and decrements
 *       stock — all in one transaction.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: itemId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Order created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/ShopOrder' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       402:
 *         description: Payment overdue — access is blocked until paid
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Item not found (includes items of another branch)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Item is unavailable (archived or out of stock)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Insufficient coin balance, or validation failed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/items/:itemId/purchase', validate({ params: itemIdParamSchema }), ctrl.purchase);

/**
 * @openapi
 * /api/student/shop/orders:
 *   get:
 *     tags: [Student Shop]
 *     summary: Purchase history of the current student
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - { $ref: '#/components/schemas/ShopOrder' }
 *                       - type: object
 *                         properties:
 *                           item_name: { type: string }
 *                           image_key: { type: string, nullable: true }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       402:
 *         description: Payment overdue — access is blocked until paid
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/orders', ctrl.listOrders);

router.post('/items', validate({ body: createItemSchema }), ctrl.createItem);

/**
 * @openapi
 * /api/student/shop/items/{itemId}:
 *   patch:
 *     tags: [Student Shop]
 *     summary: Update a shop item (admin/mentor only, partial — at least one field)
 *     description: >
 *       A foreign-branch item is indistinguishable from a non-existent one (404).
 *       Blocked with 403 if the item is archived (archiveGuard).
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: itemId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateShopItemRequest' }
 *     responses:
 *       200:
 *         description: Updated item
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/ShopItem' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403:
 *         description: Forbidden (student), or item is archived
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Item not found (includes items of another branch)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch(
  '/items/:itemId',
  validate({ params: itemIdParamSchema, body: updateItemSchema }),
  archiveGuard('shop_items', 'itemId'),
  ctrl.updateItem,
);

export default router;
