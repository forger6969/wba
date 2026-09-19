import { pool } from '../../config/db.js';

/** Группа в организации методиста. Методист не "владеет" группой, как ментор —
    работает по всей организации, поэтому проверка по organization_id группы,
    а не по mentor_id. */
export async function findGroupInOrg(groupId, orgId) {
  const { rows: [group] } = await pool.query(
    `SELECT g.id, g.branch_id
       FROM groups g
       JOIN branches b ON b.id = g.branch_id
      WHERE g.id = $1 AND b.organization_id = $2 AND g.deleted_at IS NULL`,
    [groupId, orgId],
  );
  return group ?? null;
}
