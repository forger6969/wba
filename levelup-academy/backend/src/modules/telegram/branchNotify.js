import { pool } from '../../config/db.js';
import { bot } from './bot.js';
import { logger } from '../../config/logger.js';

/**
 * Общая точка отправки в группу родителей филиала — используется несколькими
 * фичами (посещаемость, слабые темы, дневная сводка), поэтому вынесена сюда,
 * а не продублирована в каждом модуле. НЕ через BullMQ/notificationQueue:
 * это событие, а не запланированная задача — шлётся прямо из web-процесса,
 * тем самым НЕ зависит от воркера (см. BUG-NO-WORKER в TASK.md — воркер на
 * проде не поднят вообще, а bot живёт в web-процессе через webhook).
 *
 * Ошибка отправки НИКОГДА не должна ронять вызывающий HTTP-запрос — родитель
 * не должен страдать из-за того, что Telegram недоступен, когда ментор просто
 * хотел отметить давомат. Поэтому функция сама ловит исключения и просто логирует.
 */
export async function sendToBranchGroup(branchId, text) {
  if (!bot) return false;

  try {
    const { rows: [row] } = await pool.query(
      `SELECT parent_tg_chat_id FROM branches WHERE id = $1 AND deleted_at IS NULL`,
      [branchId],
    );
    if (!row?.parent_tg_chat_id) return false;

    await bot.api.sendMessage(row.parent_tg_chat_id, text, { parse_mode: 'HTML' });
    return true;
  } catch (err) {
    logger.error({ err, branchId }, 'Failed to send message to branch parent group');
    return false;
  }
}
