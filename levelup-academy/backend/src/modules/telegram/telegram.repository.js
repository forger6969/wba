import { pool } from '../../config/db.js';

/** Кому принадлежит чат. Используется входом через Telegram. */
export async function findUserByChatId(chatId, client = pool) {
  const { rows } = await client.query(
    `SELECT u.*
       FROM telegram_accounts ta
       JOIN users u ON u.id = ta.user_id
      WHERE ta.tg_chat_id = $1
        AND u.deleted_at IS NULL`,
    [chatId],
  );
  return rows[0] ?? null;
}

/** Состояние привязки для кабинета. */
export async function findBindingByUserId(userId, client = pool) {
  const { rows } = await client.query(
    `SELECT tg_chat_id, tg_role, tg_username, tg_first_name, linked_at
       FROM telegram_accounts
      WHERE user_id = $1`,
    [userId],
  );
  return rows[0] ?? null;
}

/** Отвязка из кабинета. Возвращает, была ли вообще привязка. */
export async function deleteBindingByUserId(userId, client = pool) {
  const { rowCount } = await client.query(
    `DELETE FROM telegram_accounts WHERE user_id = $1`,
    [userId],
  );
  return rowCount > 0;
}

export async function insertBinding(
  { userId, chatId, role, username = null, firstName = null },
  client = pool,
) {
  await client.query(
    `INSERT INTO telegram_accounts (user_id, tg_chat_id, tg_role, tg_username, tg_first_name)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, chatId, role, username, firstName],
  );
}
