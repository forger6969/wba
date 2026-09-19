import { pool } from '../../../config/db.js';

export async function listByOrg(orgId, limit = 200) {
  const { rows } = await pool.query(
    `SELECT id, student_id, student_name, parent_name, kind, message, status, error, sent_at, created_at
       FROM reminders
      WHERE organization_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [orgId, limit],
  );
  return rows;
}

/** kind + payload — нужны сервису, чтобы повторно поставить тот же job в очередь (resend). */
export async function getById(orgId, id) {
  const { rows: [row] } = await pool.query(
    `SELECT id, student_id, kind, payload FROM reminders WHERE id = $1 AND organization_id = $2`,
    [id, orgId],
  );
  return row ?? null;
}

export async function deleteById(orgId, id) {
  const { rows: [row] } = await pool.query(
    `DELETE FROM reminders WHERE id = $1 AND organization_id = $2 RETURNING id`,
    [id, orgId],
  );
  return row ?? null;
}

/** Текущий долг студента — чтобы не долбить повторным напоминанием уже оплаченный счёт. */
export async function getStudentDebt(studentId) {
  const { rows: [row] } = await pool.query(
    `SELECT total_debt FROM student_profiles WHERE user_id = $1`,
    [studentId],
  );
  return row ? Number(row.total_debt) : null;
}

/** Организация/филиал + ФИО студента и его родителя (для денормализации в лог). */
export async function resolveStudentContext(studentId) {
  const { rows: [row] } = await pool.query(
    `SELECT u.organization_id, u.branch_id,
            u.first_name || ' ' || u.last_name AS student_name,
            p.first_name || ' ' || p.last_name AS parent_name
       FROM users u
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       LEFT JOIN users p ON p.id = sp.parent_id
      WHERE u.id = $1`,
    [studentId],
  );
  return row ?? null;
}

/**
 * Атомарный upsert по job_id: INSERT ... ON CONFLICT DO UPDATE — retry-попытки
 * одного и того же BullMQ job'а (failed x N перед следующим attempt, затем
 * итоговый completed/failed) схлопываются в одну строку, без гонки
 * check-then-insert между параллельными обработчиками событий очереди.
 */
export async function upsertByJobId(row) {
  // sent_at считается в JS, а не в SQL CASE WHEN $n = 'sent' — параметр не может
  // одновременно типизироваться как reminder_status (колонка) и text (сравнение
  // в CASE) в одном PREPARE, Postgres бросает "inconsistent types deduced".
  const sentAt = row.status === 'sent' ? new Date() : null;
  await pool.query(
    `INSERT INTO reminders
       (organization_id, branch_id, student_id, student_name, parent_name,
        kind, payload, message, status, error, job_id, sent_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (job_id) DO UPDATE
        SET status = EXCLUDED.status,
            error = EXCLUDED.error,
            sent_at = COALESCE(EXCLUDED.sent_at, reminders.sent_at)`,
    [
      row.organizationId, row.branchId, row.studentId, row.studentName, row.parentName,
      row.kind, JSON.stringify(row.payload), row.message, row.status, row.error ?? null, row.jobId, sentAt,
    ],
  );
}
