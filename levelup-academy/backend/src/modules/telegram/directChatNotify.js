import { pool } from '../../config/db.js';
import { logger } from '../../config/logger.js';
import { bot } from './bot.js';

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

/** Send a private-chat notification without making CRM message delivery depend on Telegram. */
export async function notifyDirectChatRecipient({ recipientId, senderId, body }) {
  if (!bot) return false;

  try {
    const { rows: [target] } = await pool.query(
      `SELECT ta.tg_chat_id,
              sender.first_name AS sender_first_name,
              sender.last_name AS sender_last_name,
              sender.role AS sender_role
         FROM telegram_accounts ta
         JOIN users recipient ON recipient.id = ta.user_id AND recipient.deleted_at IS NULL
         JOIN users sender ON sender.id = $2 AND sender.deleted_at IS NULL
         JOIN org_feature_flags f
           ON f.organization_id = recipient.organization_id
          AND f.feature_key = 'telegram_integration'
          AND f.enabled = true
        WHERE ta.user_id = $1
        LIMIT 1`,
      [recipientId, senderId],
    );
    if (!target?.tg_chat_id) return false;

    const senderName = escapeHtml(`${target.sender_first_name ?? ''} ${target.sender_last_name ?? ''}`.trim());
    const roleLabel = target.sender_role === 'mentor' ? 'Mentor' : 'Xodim';
    const text = `💬 <b>Yangi xabar</b>\n\n<b>${roleLabel}: ${senderName}</b>\n${escapeHtml(body)}`;
    await bot.api.sendMessage(target.tg_chat_id, text, { parse_mode: 'HTML' });
    return true;
  } catch (err) {
    logger.error({ err, recipientId, senderId }, 'Failed to send direct chat Telegram notification');
    return false;
  }
}
