import { pool } from '../config/db.js';
import { logger } from '../config/logger.js';

/**
 * Трекер ошибок бэкенда (Karis 26.08.2026). Единая точка записи для трёх
 * источников: errorHandler.js (5xx из HTTP-запроса), server.js
 * (unhandledRejection/uncaughtException — падения вне запроса).
 *
 * Группировка по отпечатку — одна и та же повторяющаяся ошибка (например,
 * сегодняшняя история с Redis) увеличивает occurrence_count у одной записи,
 * а не плодит тысячи одинаковых строк.
 */
function fingerprintOf(kind, message, stack) {
  const firstFrame = (stack ?? '').split('\n')[1]?.trim() ?? '';
  return `${kind}::${message}::${firstFrame}`.slice(0, 500);
}

/**
 * Никогда не бросает — записывающий сам не должен уронить то место, откуда
 * его вызвали (обработчик ошибок, обработчик падения процесса).
 */
export async function recordError(kind, err, context = {}) {
  try {
    const message = String(err?.message ?? err ?? 'Unknown error').slice(0, 2000);
    const stack = err?.stack ? String(err.stack).slice(0, 4000) : null;
    const fingerprint = fingerprintOf(kind, message, stack);

    await pool.query(
      `INSERT INTO platform_error_log (fingerprint, kind, message, stack, route, status_code)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (fingerprint) DO UPDATE
         SET occurrence_count = platform_error_log.occurrence_count + 1,
             last_seen_at = now(),
             -- повторилась после того, как её пометили решённой — значит,
             -- на самом деле не решена, снова показываем
             resolved_at = NULL`,
      [fingerprint, kind, message, stack, context.route ?? null, context.statusCode ?? null],
    );
  } catch (e) {
    logger.error({ err: e }, 'errorTracker: не удалось записать ошибку');
  }
}
