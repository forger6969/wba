import { pool } from '../../config/db.js';

// Целевой сотрудник для штрафа/qora — только в своей организации, не удалён.
export function findStaffInOrg(targetUserId, orgId, client = pool) {
  return client
    .query(
      `SELECT id, role, organization_id, branch_id, status,
              first_name, last_name
         FROM users
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [targetUserId, orgId],
    )
    .then((r) => r.rows[0] ?? null);
}

export function insertPenalty(
  { organizationId, branchId, targetUserId, targetRole, issuedBy, issuerRole, type, amount, reason },
  client = pool,
) {
  return client
    .query(
      `INSERT INTO staff_penalties
         (organization_id, branch_id, target_user_id, target_role, issued_by, issuer_role, type, amount, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, target_user_id, target_role, issued_by, issuer_role, type, amount, reason, created_at`,
      [organizationId, branchId ?? null, targetUserId, targetRole, issuedBy, issuerRole, type, amount ?? null, reason],
    )
    .then((r) => r.rows[0]);
}

// Сменить статус пользователя в рамках организации (fire / reactivate).
export function setUserStatus(userId, orgId, status, client = pool) {
  return client
    .query(
      `UPDATE users SET status = $3, updated_at = now()
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
        RETURNING id, status`,
      [userId, orgId, status],
    )
    .then((r) => r.rows[0] ?? null);
}

// Список штрафов организации (super — вся org; admin — сужаем branchId в сервисе).
export function listPenalties({ organizationId, branchId, issuedBy, targetUserId, type }, client = pool) {
  const cond = ['p.organization_id = $1'];
  const vals = [organizationId];
  let i = 2;
  if (branchId) {
    cond.push(`p.branch_id = $${i++}`);
    vals.push(branchId);
  }
  if (issuedBy) {
    cond.push(`p.issued_by = $${i++}`);
    vals.push(issuedBy);
  }
  if (targetUserId) {
    cond.push(`p.target_user_id = $${i++}`);
    vals.push(targetUserId);
  }
  if (type) {
    cond.push(`p.type = $${i++}`);
    vals.push(type);
  }
  return client
    .query(
      `SELECT p.id, p.type, p.amount, p.reason, p.created_at,
              p.target_user_id, p.target_role,
              tu.first_name || ' ' || tu.last_name AS target_name,
              p.issued_by, p.issuer_role,
              iu.first_name || ' ' || iu.last_name AS issued_by_name
         FROM staff_penalties p
         JOIN users tu ON tu.id = p.target_user_id
         JOIN users iu ON iu.id = p.issued_by
        WHERE ${cond.join(' AND ')}
        ORDER BY p.created_at DESC`,
      vals,
    )
    .then((r) => r.rows);
}

// Свои штрафы (для панели сотрудника).
export function listPenaltiesForUser(userId, client = pool) {
  return client
    .query(
      `SELECT p.id, p.type, p.amount, p.reason, p.created_at, p.issuer_role
         FROM staff_penalties p
        WHERE p.target_user_id = $1
        ORDER BY p.created_at DESC`,
      [userId],
    )
    .then((r) => r.rows);
}

// ---------- каталог правил (qoyda) ----------

export function listRules(orgId, client = pool) {
  return client
    .query(
      `SELECT id, type, amount, description, created_by, created_at
         FROM discipline_rules
        WHERE organization_id = $1
        ORDER BY created_at DESC`,
      [orgId],
    )
    .then((r) => r.rows);
}

export function insertRule({ orgId, type, amount, description, createdBy }, client = pool) {
  return client
    .query(
      `INSERT INTO discipline_rules (organization_id, type, amount, description, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, type, amount, description, created_by, created_at`,
      [orgId, type, amount ?? null, description, createdBy],
    )
    .then((r) => r.rows[0]);
}

export function deleteRule(id, orgId, client = pool) {
  return client
    .query(
      `DELETE FROM discipline_rules WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [id, orgId],
    )
    .then((r) => r.rows[0] ?? null);
}

