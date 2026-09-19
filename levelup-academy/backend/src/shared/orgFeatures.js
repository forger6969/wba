import { pool } from '../config/db.js';

/**
 * Единая проверка "включена ли фича X организации" (org_feature_flags,
 * `1784460000000_org-feature-flags.js`). В отличие от orgAccessGate.js —
 * БЕЗ Redis-кэша: пока Upstash-квота не восстановлена (см. TASK.md 🔴),
 * не стоит вешать на неё ещё один гейт на каждый запрос; строка по
 * PRIMARY KEY (organization_id, feature_key) и так дешёвая.
 */
export async function isFeatureEnabledForOrg(orgId, featureKey, db = pool) {
  if (!orgId) return false;
  const { rows: [row] } = await db.query(
    `SELECT enabled FROM org_feature_flags WHERE organization_id = $1 AND feature_key = $2`,
    [orgId, featureKey],
  );
  return row?.enabled ?? false;
}
