import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { requireRoomAccess } from '../../middlewares/roomAccess.js';
import { orgAccessGate } from '../../middlewares/orgAccessGate.js';
import * as ctrl from './chat.controller.js';

const router = Router();

/**
 * @openapi
 * /api/chat/{roomKey}/messages:
 *   get:
 *     tags: [Chat]
 *     summary: Cursor-paginated message history for a chat room
 *     description: >
 *       Room access rules (`requireRoomAccess`): `global` — everyone except
 *       students; `parent:<uuid>` — that parent themself or any staff role;
 *       `group:<uuid>` — main_admin/ceo/admin unconditionally, or the
 *       group's own mentor/enrolled students. `limit` is clamped server-side to
 *       [1, 100] (non-numeric defaults to 50); `cursor` must be a valid ISO
 *       timestamp (checked before hitting the DB — otherwise Postgres would 500
 *       on a bad `::timestamptz` cast). This is REST read-only history; sending
 *       messages happens over the Socket.io chat namespace, not via this REST API.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: roomKey
 *         in: path
 *         required: true
 *         schema: { type: string }
 *         examples:
 *           global: { value: 'global' }
 *           parent: { value: 'parent:3fa85f64-5717-4562-b3fc-2c963f66afa6' }
 *           group: { value: 'group:3fa85f64-5717-4562-b3fc-2c963f66afa6' }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 50 }
 *       - name: cursor
 *         in: query
 *         description: ISO timestamp — returns messages older than this
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Message history (newest first)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     messages:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/ChatMessage' }
 *                     nextCursor: { type: string, format: date-time, nullable: true }
 *       400:
 *         description: cursor must be a valid ISO timestamp, or invalid/unknown room key
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403:
 *         description: No access to this room
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/:roomKey/messages', authenticate, orgAccessGate, requireRoomAccess, ctrl.getMessages);

/**
 * @openapi
 * /api/chat/contacts:
 *   get:
 *     tags: [Chat]
 *     summary: Parents this staff member may privately message
 *     description: >
 *       Contact list for private `dm:<staffId>:<parentId>` conversations, with
 *       the last message and unread count per room. Scope mirrors the send-time
 *       check exactly: a mentor sees parents whose child is in one of their own
 *       groups, an admin — parents of their branch, a ceo — parents of
 *       their organization. Other roles get an empty list. Staff never see each
 *       other's conversations, so this list is per-user by construction.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Contact list (most recent conversation first)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/ChatContact' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/contacts', authenticate, orgAccessGate, ctrl.getContacts);

/**
 * @openapi
 * /api/chat/my-threads:
 *   get:
 *     tags: [Chat]
 *     summary: My conversations with staff (parent/student side)
 *     description: >
 *       AB-VERIFY: parent/student cannot start a `dm:<staffId>:<me>` conversation
 *       (only reply — see POST /chat/dm and requireRoomAccess), so this list is
 *       built from existing messages, not from an eligibility rule like
 *       /chat/contacts. Other roles get an empty list.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Threads (most recent message first)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/ChatContact' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/my-threads', authenticate, orgAccessGate, ctrl.getMyThreads);

/**
 * @openapi
 * /api/chat/dm:
 *   post:
 *     tags: [Chat]
 *     summary: Send a direct message over HTTP
 *     description: >
 *       Sends a private message without a websocket. Direction follows the
 *       caller's role, never a request field: staff (mentor/admin/ceo)
 *       message a parent or a student, while a parent or student may only reply
 *       to a staff member who is already allowed to talk to them — neither can
 *       open a conversation. Permission checks and persistence are shared with
 *       the socket events, and the message is still pushed live to both
 *       participants' `user:<id>` rooms.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [peerId, body]
 *             properties:
 *               peerId:
 *                 type: string
 *                 format: uuid
 *                 description: The other participant — a parent/student for staff, a staff member for a parent/student
 *               body: { type: string, maxLength: 4000 }
 *           example: { peerId: '3fa85f64-5717-4562-b3fc-2c963f66afa6', body: 'Salom ustoz' }
 *     responses:
 *       201:
 *         description: Message stored and delivered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/ChatMessage' }
 *       400:
 *         description: peerId must be a uuid
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403:
 *         description: Not allowed to message this person
 *       422:
 *         description: Empty or too long body
 */
router.post('/dm', authenticate, orgAccessGate, ctrl.sendDm);

/**
 * @openapi
 * /api/chat/{roomKey}/read:
 *   post:
 *     tags: [Chat]
 *     summary: Mark incoming messages of a room as read
 *     description: >
 *       Marks every message in the room not sent by the caller as read. Room
 *       access is enforced by the same `requireRoomAccess` rules as history.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: roomKey
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Number of messages marked read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     updated: { type: integer, example: 3 }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403:
 *         description: No access to this room
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/:roomKey/read', authenticate, orgAccessGate, requireRoomAccess, ctrl.markRead);

export default router;
