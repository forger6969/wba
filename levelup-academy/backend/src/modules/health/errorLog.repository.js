import { pool } from '../../config/db.js';

export function listErrors({ resolved = 'open', limit = 50, offset = 0 } = {}, client = pool) {
  const cond = resolved === 'open' ? 'WHERE resolved_at IS NULL'
    : resolved === 'resolved' ? 'WHERE resolved_at IS NOT NULL' : '';
  return client
    .query(
      `SELECT id, fingerprint, kind, message, stack, route, status_code,
              occurrence_count, first_seen_at, last_seen_at, resolved_at,
              count(*) OVER()::int AS total_count
         FROM platform_error_log
         ${cond}
        ORDER BY last_seen_at DESC
        LIMIT $1 OFFSET $2`,
      [limit, offset],
    )
    .then((r) => r.rows);
}

export function resolveError(id, client = pool) {
  return client
    .query(
      `UPDATE platform_error_log SET resolved_at = now() WHERE id = $1
       RETURNING id, message, resolved_at`,
      [id],
    )
    .then((r) => r.rows[0]);
}

/** Для Центра контроля — сколько НЕрешённых ошибок сработало за последние сутки. */
export function countRecentUnresolved(client = pool) {
  return client
    .query(
      `SELECT count(*)::int AS count
         FROM platform_error_log
        WHERE resolved_at IS NULL AND last_seen_at > now() - interval '24 hours'`,
    )
    .then((r) => r.rows[0].count);
}
