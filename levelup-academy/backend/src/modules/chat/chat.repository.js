import { pool } from '../../config/db.js';

export async function insertMessage({ chatType, roomKey, senderId, branchId, body, attachmentKey, flaggedWord }) {
  const { rows: [message] } = await pool.query(
    `INSERT INTO chat_messages (chat_type, room_key, sender_id, branch_id, body, attachment_key, flagged_word)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, chat_type, room_key, sender_id, branch_id, body, attachment_key, created_at`,
    [chatType, roomKey, senderId, branchId ?? null, body, attachmentKey ?? null, flaggedWord ?? null],
  );
  return message;
}

/**
 * Пометить прочитанными чужие сообщения комнаты. Свои не трогаем — read_at
 * означает «прочитано получателем», и отправитель получателем не является.
 */
export async function markRoomRead(roomKey, readerId) {
  const { rowCount } = await pool.query(
    `UPDATE chat_messages
        SET read_at = now()
      WHERE room_key = $1
        AND sender_id <> $2
        AND read_at IS NULL
        AND deleted_at IS NULL`,
    [roomKey, readerId],
  );
  return rowCount;
}

/** Cursor-пагинация: сообщения старше `before` (ISO timestamp), новые сверху. */
export async function findByRoom(roomKey, { limit = 50, before = null } = {}) {
  const { rows } = await pool.query(
    `SELECT m.id, m.chat_type, m.room_key, m.sender_id, m.body, m.attachment_key, m.created_at,
            u.first_name AS sender_first_name, u.last_name AS sender_last_name, u.role AS sender_role
       FROM chat_messages m
       JOIN users u ON u.id = m.sender_id
      WHERE m.room_key = $1
        AND m.deleted_at IS NULL
        AND ($2::timestamptz IS NULL OR m.created_at < $2)
      ORDER BY m.created_at DESC
      LIMIT $3`,
    [roomKey, before, limit],
  );
  return rows;
}
