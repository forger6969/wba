import { pool } from '../../config/db.js';
import { bot } from './bot.js';

export async function sendToGroupParentChat(groupId, text, imageUrl = null) {
  const { rows: [row] } = await pool.query(
    `SELECT g.parent_tg_chat_id
       FROM groups g JOIN branches b ON b.id = g.branch_id
       JOIN org_feature_flags f ON f.organization_id = b.organization_id
      WHERE g.id = $1 AND g.deleted_at IS NULL AND f.feature_key = 'telegram_integration'
        AND f.enabled = true AND g.parent_tg_chat_id IS NOT NULL`, [groupId],
  );
  if (!row) return false;
  if (!bot) return false;
  if (imageUrl) await bot.api.sendPhoto(row.parent_tg_chat_id, imageUrl, { caption: text, parse_mode: 'HTML' });
  else await bot.api.sendMessage(row.parent_tg_chat_id, text, { parse_mode: 'HTML' });
  return true;
}
