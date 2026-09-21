import { pool } from '../../config/db.js';

const SELECT = `
  SELECT t.id, t.student_name AS "studentName", t.phone, t.subject,
         t.trial_date AS "trialDate", t.mentor_id AS "mentorId",
         t.status, t.reason, t.follow_up_date AS "followUpDate", t.notes,
         t.branch_id AS "branchId", t.created_at AS "createdAt", t.updated_at AS "updatedAt",
         NULLIF(TRIM(COALESCE(m.first_name,'') || ' ' || COALESCE(m.last_name,'')), '') AS "mentorName"
  FROM trial_lessons t
  LEFT JOIN users m ON m.id = t.mentor_id`;

export async function list({ organizationId, branchId, status }) {
  const params = [organizationId];
  let where = 't.organization_id = $1';
  if (branchId) { params.push(branchId); where += ` AND (t.branch_id = $${params.length} OR t.branch_id IS NULL)`; }
  if (status) { params.push(status); where += ` AND t.status = $${params.length}`; }
  const { rows } = await pool.query(`${SELECT} WHERE ${where} ORDER BY t.trial_date DESC NULLS LAST, t.created_at DESC`, params);
  return rows;
}

export async function create(d) {
  const { rows } = await pool.query(
    `INSERT INTO trial_lessons
       (organization_id, branch_id, student_name, phone, subject, trial_date, mentor_id, status, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,'scheduled'),$9,$10) RETURNING id`,
    [d.organizationId, d.branchId, d.studentName, d.phone, d.subject, d.trialDate, d.mentorId, d.status, d.notes, d.createdBy]);
  return rows[0].id;
}

export async function update(id, organizationId, d) {
  const { rows } = await pool.query(
    `UPDATE trial_lessons SET
       student_name   = COALESCE($3,  student_name),
       phone          = COALESCE($4,  phone),
       subject        = COALESCE($5,  subject),
       trial_date     = COALESCE($6,  trial_date),
       mentor_id      = COALESCE($7,  mentor_id),
       status         = COALESCE($8,  status),
       reason         = COALESCE($9,  reason),
       follow_up_date = COALESCE($10, follow_up_date),
       notes          = COALESCE($11, notes),
       updated_at     = now()
     WHERE id = $1 AND organization_id = $2 RETURNING id`,
    [id, organizationId, d.studentName, d.phone, d.subject, d.trialDate, d.mentorId, d.status, d.reason, d.followUpDate, d.notes]);
  return rows[0];
}

export async function remove(id, organizationId) {
  const { rowCount } = await pool.query('DELETE FROM trial_lessons WHERE id = $1 AND organization_id = $2', [id, organizationId]);
  return rowCount > 0;
}
