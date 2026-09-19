import { Router } from 'express';
import { validate } from '../../../middlewares/validate.js';
import * as ctrl from './rooms.controller.js';
import { roomIdParam, createRoomSchema, updateRoomSchema } from './rooms.schemas.js';

/**
 * K-ROOMS — кабинеты филиала для сетки расписания (см. GET /admin/schedule).
 * Смонтирован в admin.routes.js под /rooms, authenticate + authorize уже
 * навешаны родителем.
 */
const router = Router();

router.get('/', ctrl.listRooms);
router.post('/', validate({ body: createRoomSchema }), ctrl.createRoom);
router.patch('/:id', validate({ params: roomIdParam, body: updateRoomSchema }), ctrl.updateRoom);
router.delete('/:id', validate({ params: roomIdParam }), ctrl.deleteRoom);

export default router;
