import { pool } from '../../config/db.js';

/**
 * Свод «что изменилось» по партнёрам (Karis 26.08.2026, пункт #10).
 *
 * Никакой новой телеметрии — читает уже существующий audit_log (тот же,
 * что питает /main/audit): статусы, платежи, бонусы, фичи, заявки на фичи,
 * счета. organization_id IS NOT NULL уже отсекает платформенные и auth-
 * записи (у auth.* organization_id всегда NULL, см. insertLoginAudit).
 *
 * Группировка и лимит "последних N" — в JS, а не array_agg в SQL: проще
 * читать, и объём (audit_log за 7/30 дней) не настолько велик, чтобы это
 * имело значение.
 */

const WINDOWS = [7, 30];
const RECENT_LIMIT = 10;

export async function partnerDigest(days = 7) {
  const window = WINDOWS.includes(Number(days)) ? Number(days) : 7;

  const { rows } = await pool.query(
    `SELECT a.organization_id, o.name AS organization_name,
            a.action, a.entity_label, a.reason, a.actor_name, a.created_at
       FROM audit_log a
       JOIN organizations o ON o.id = a.organization_id
      WHERE a.organization_id IS NOT NULL
        AND a.created_at > now() - ($1 || ' days')::interval
      ORDER BY a.organization_id, a.created_at DESC`,
    [window],
  );

  const byOrg = new Map();
  for (const r of rows) {
    let entry = byOrg.get(r.organization_id);
    if (!entry) {
      entry = {
        organizationId: r.organization_id,
        organizationName: r.organization_name,
        changesCount: 0,
        lastChangeAt: r.created_at,
        events: [],
      };
      byOrg.set(r.organization_id, entry);
    }
    entry.changesCount += 1;
    if (entry.events.length < RECENT_LIMIT) {
      entry.events.push({
        action: r.action,
        entityLabel: r.entity_label,
        reason: r.reason,
        actorName: r.actor_name,
        createdAt: r.created_at,
      });
    }
  }

  // больше всего изменений и самые свежие — первыми
  const items = [...byOrg.values()].sort(
    (a, b) => new Date(b.lastChangeAt) - new Date(a.lastChangeAt),
  );
  return { windowDays: window, items };
}
