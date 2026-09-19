import { Router } from 'express';
import { validate } from '../../../middlewares/validate.js';
import { archiveGuard } from '../../../middlewares/archiveGuard.js';
import * as ctrl from './shop-admin.controller.js';
import { itemIdParam, orderIdParam, restockItemSchema, listOrdersQuery, createBranchShopItemSchema } from './shop-admin.schemas.js';

/**
 * K-SHOP (branch) — смонтирован в admin.routes.js под /shop, authenticate +
 * authorize('admin','branch_manager') уже навешаны родителем. Каталог (имя/
 * цена/фото) держит CEO — см. super.routes.js /shop/items; здесь только
 * остаток товара (restock) и заказы своего филиала (выдать/отменить+вернуть коины).
 */
const router = Router();

/**
 * @openapi
 * /api/admin/shop/items:
 *   get:
 *     tags: [Admin Shop]
 *     summary: List shop items of the branch (management view — includes archived/out of stock)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Items
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/items', ctrl.listBranchItems);
router.post('/items', validate({ body: createBranchShopItemSchema }), ctrl.createBranchItem);

/**
 * @openapi
 * /api/admin/shop/items/{id}/stock:
 *   patch:
 *     tags: [Admin Shop]
 *     summary: Restock a branch item (only field the branch may change — price/name is CEO's)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [stock]
 *             properties: { stock: { type: integer, minimum: 0 } }
 *     responses:
 *       200: { description: Updated item }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch(
  '/items/:id/stock',
  validate({ params: itemIdParam, body: restockItemSchema }),
  archiveGuard('shop_items'),
  ctrl.restockItem,
);

/**
 * @openapi
 * /api/admin/shop/orders:
 *   get:
 *     tags: [Admin Shop]
 *     summary: List shop orders of the branch (paginated, optional status filter)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/PageParam' }
 *       - { $ref: '#/components/parameters/LimitParam' }
 *       - name: status
 *         in: query
 *         schema: { type: string, enum: [pending, fulfilled, cancelled] }
 *     responses:
 *       200: { description: Paginated orders }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/orders', validate({ query: listOrdersQuery }), ctrl.listOrders);

/**
 * @openapi
 * /api/admin/shop/orders/{id}/fulfill:
 *   post:
 *     tags: [Admin Shop]
 *     summary: Mark an order fulfilled (prize handed out physically)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     responses:
 *       200: { description: Updated order }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.post('/orders/:id/fulfill', validate({ params: orderIdParam }), ctrl.fulfillOrder);

/**
 * @openapi
 * /api/admin/shop/orders/{id}/cancel:
 *   post:
 *     tags: [Admin Shop]
 *     summary: Cancel an order — refunds coins to the student and restocks the item
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     responses:
 *       200: { description: Updated order }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.post('/orders/:id/cancel', validate({ params: orderIdParam }), ctrl.cancelOrder);

export default router;
