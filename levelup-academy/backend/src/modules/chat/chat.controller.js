import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import * as chatService from './chat.service.js';
import { listStaffContacts, listStaffStudentContacts, listStaffPeerContacts, listMyThreads } from './chat.access.js';

/**
 * GET /api/chat/contacts — все, кому сотрудник вправе писать: родители и сами
 * ученики.
 *
 * `peer_type` обязателен клиенту: в списке рядом стоят мать и её ребёнок с
 * одной фамилией, и без пометки непонятно, кому пишешь. Сортировка общая — по
 * времени последнего сообщения, иначе свежий диалог с учеником уезжал бы под
 * список молчащих родителей.
 */
export const getContacts = asyncHandler(async (req, res) => {
  // Админ филиала — только родители (решение 2026-07-21): прямого диалога
  // админ↔ученик нет (см. canStaffChatStudent), поэтому и в список учеников
  // не добавляем. Ментор по-прежнему видит и учеников, и родителей.
  const includeFamily = ['mentor', 'admin', 'ceo'].includes(req.user.role);
  const [parents, students, staffPeers] = await Promise.all([
    includeFamily ? listStaffContacts(req.user) : Promise.resolve([]),
    includeFamily ? listStaffStudentContacts(req.user) : Promise.resolve([]),
    listStaffPeerContacts(req.user),
  ]);

  const data = [
    ...parents.map((c) => ({ ...c, peer_type: 'parent' })),
    ...students.map((c) => ({ ...c, peer_type: 'student' })),
    ...staffPeers.map((c) => ({ ...c, peer_type: c.staff_role })),
  ].sort((a, b) => {
    if (a.last_message_at && b.last_message_at) {
      return new Date(b.last_message_at) - new Date(a.last_message_at);
    }
    if (a.last_message_at) return -1;
    if (b.last_message_at) return 1;
    return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
  });

  res.json({ success: true, data });
});

/**
 * GET /api/chat/my-threads — диалоги родителя/студента со staff, с которыми
 * уже есть переписка (сам он написать первым не может, см. listMyThreads).
 * Для остальных ролей — пустой список (см. AUTH-FORGOT/CLAUDE.md: чужая
 * роль не должна получать 403 на чисто информационном списке).
 */
export const getMyThreads = asyncHandler(async (req, res) => {
  const data = await listMyThreads(req.user);
  res.json({ success: true, data });
});

/**
 * POST /api/chat/dm — отправить личное сообщение обычным HTTP.
 *
 * Сокет остаётся основным транспортом фронта, но проверять чат руками через
 * него неудобно, а внешним интеграциям (тот же Telegram-бот) держать
 * websocket-соединение незачем. Логика общая с сокетом — см. sendDirectMessage.
 */
export const sendDm = asyncHandler(async (req, res) => {
  const { peerId, body } = req.body ?? {};
  const message = await chatService.sendDirectMessage({ sender: req.user, peerId, body });
  res.status(201).json({ success: true, data: message });
});

/** POST /api/chat/:roomKey/read — пометить входящие комнаты прочитанными. */
export const markRead = asyncHandler(async (req, res) => {
  const updated = await chatService.markRoomRead(req.params.roomKey, req.user.id);
  res.json({ success: true, data: { updated } });
});

/** GET /api/chat/:roomKey/messages?limit=50&cursor=<ISO timestamp> */
export const getMessages = asyncHandler(async (req, res) => {
  const { roomKey } = req.params;
  const { limit, cursor } = req.query;

  // границы на входе: limit ∈ [1, 100], cursor — валидный timestamp
  // (иначе отрицательный LIMIT / битый каст ::timestamptz = 500 из Postgres)
  if (cursor !== undefined && Number.isNaN(Date.parse(cursor))) {
    throw new AppError(400, 'cursor must be a valid ISO timestamp');
  }

  const data = await chatService.getRoomHistory(roomKey, {
    limit: Math.max(1, Math.min(100, Number.parseInt(limit, 10) || 50)),
    before: cursor ?? null,
  });

  res.json({ success: true, data });
});
