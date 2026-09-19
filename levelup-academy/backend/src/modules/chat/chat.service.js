import { AppError } from '../../utils/AppError.js';
import { pool } from '../../config/db.js';
import { emitTo } from '../../sockets/io.js';
import { notifyDirectChatRecipient } from '../telegram/directChatNotify.js';
import { moderateMessage } from '../../shared/chatModeration.js';
import * as chatRepository from './chat.repository.js';
import {
  canStaffChatPeer, canStaffChatStaff, dmRoom, userRoom, isUuid, DM_STAFF_ROLES,
} from './chat.access.js';

const MAX_BODY_LENGTH = 4000;

/**
 * Единственная точка записи сообщений — используется и сокетами, и REST,
 * поэтому проверка на запрещённые слова стоит здесь одна на все каналы
 * (global/direct/group), а не дублируется в каждом обработчике.
 *
 * Два независимых режима на каждое слово (Karis 26.08.2026):
 *   - обычное слово — сообщение НЕ меняется, только помечается flagged_word
 *     для списка нарушений в Main Admin; автор и собеседник ничего не видят;
 *   - слово с auto_mask — все его вхождения заменяются на **** ПЕРЕД
 *     сохранением, поэтому и в базе, и в живой рассылке через сокет уже
 *     лежит замаскированный текст — участники видят **** вместо слова.
 */
export async function saveMessage({ chatType, roomKey, senderId, branchId, body, attachmentKey }) {
  const trimmed = body?.trim();
  if (!trimmed) throw new AppError(422, 'Message body is required');
  if (trimmed.length > MAX_BODY_LENGTH) {
    throw new AppError(422, `Message is too long (max ${MAX_BODY_LENGTH} chars)`);
  }

  const { body: moderatedBody, flaggedWords } = await moderateMessage(trimmed);

  return chatRepository.insertMessage({
    chatType,
    roomKey,
    senderId,
    branchId,
    body: moderatedBody,
    attachmentKey,
    flaggedWord: flaggedWords.length ? flaggedWords.join(', ') : null,
  });
}

/**
 * Отправка личного сообщения — единственная реализация на оба транспорта.
 *
 * Сокет (`chat:dm:send` / `chat:dm:reply`) и REST (`POST /api/chat/dm`) зовут
 * именно её: две копии проверки прав однажды разъедутся, и разъедется молча.
 * Направление определяется ролью отправителя, а не полем в запросе — иначе
 * клиент мог бы объявить себя сотрудником.
 *
 * Живая доставка идёт в личные комнаты `user:<id>` обоих участников, поэтому
 * сообщение, отправленное через HTTP, доходит в открытую вкладку так же
 * мгновенно, как отправленное сокетом.
 */
export async function sendDirectMessage({ sender, peerId, body }) {
  if (!isUuid(peerId)) throw new AppError(400, 'peerId must be a uuid');

  let staffId;
  let otherId;

  if (DM_STAFF_ROLES.has(sender.role)) {
    // сотрудник → родитель или ученик
    if (!(await canStaffChatPeer(sender, peerId))) {
      throw new AppError(403, 'You may not message this person');
    }
    if (await canStaffChatStaff(sender, peerId)) {
      const peer = await findStaff(peerId);
      // Keep one stable room key regardless of which staff member sends first.
      // Admin/manager/member is the first side; mentor is the second side.
      if (sender.role === 'mentor') {
        staffId = peer.id;
        otherId = sender.id;
      } else {
        staffId = sender.id;
        otherId = peer.id;
      }
    } else {
      staffId = sender.id;
      otherId = peerId;
    }
  } else if (sender.role === 'parent' || sender.role === 'student') {
    // родитель/ученик → сотрудник, и только в уже разрешённый диалог:
    // право проверяется со стороны сотрудника, первым писать они не могут.
    const staff = await findStaff(peerId);
    if (!staff || !(await canStaffChatPeer(staff, sender.id))) {
      throw new AppError(403, 'You may not message this person');
    }
    staffId = peerId;
    otherId = sender.id;
  } else {
    throw new AppError(403, 'Your role may not use direct messages');
  }

  const roomKey = dmRoom(staffId, otherId);
  const message = await saveMessage({
    chatType: 'direct',
    roomKey,
    senderId: sender.id,
    branchId: sender.branchId,
    body,
  });

  emitTo(userRoom(sender.id), 'chat:dm:message', message);
  emitTo(userRoom(sender.id === staffId ? otherId : staffId), 'chat:dm:message', message);

  // A linked parent/student also receives the staff message in Telegram.
  // Fire-and-forget keeps the persisted CRM chat independent from Telegram outages.
  if (DM_STAFF_ROLES.has(sender.role) && otherId !== sender.id) {
    void notifyDirectChatRecipient({ recipientId: otherId, senderId: sender.id, body: message.body });
  }

  return message;
}

/** Минимальный профиль сотрудника — для проверки прав со стороны собеседника. */
async function findStaff(staffId) {
  const { rows: [row] } = await pool.query(
    `SELECT id, role, organization_id, branch_id
       FROM users
      WHERE id = $1 AND deleted_at IS NULL AND status = 'active'`,
    [staffId],
  );
  if (!row || !DM_STAFF_ROLES.has(row.role)) return null;
  return {
    id: row.id,
    role: row.role,
    organizationId: row.organization_id,
    branchId: row.branch_id,
  };
}

/** Прочитано: доступ к комнате уже проверен middleware'ом requireRoomAccess. */
export async function markRoomRead(roomKey, readerId) {
  return chatRepository.markRoomRead(roomKey, readerId);
}

export async function getRoomHistory(roomKey, { limit, before }) {
  const messages = await chatRepository.findByRoom(roomKey, { limit, before });
  return {
    messages,
    nextCursor: messages.length === limit ? messages.at(-1).created_at : null,
  };
}
