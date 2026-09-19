import { pool } from '../config/db.js';

/**
 * Read-only хелперы принадлежности к группам. Групповой CRUD — зона Admin (Karis);
 * здесь только SELECT'ы, нужные mentor/student/parent модулям (§6: «Остальные — SELECT»).
 * Любой хелпер принимает опциональный `db` (client в транзакции) — по умолчанию pool.
 */

/** id активных групп студента (членство не закрыто left_at). */
export async function getStudentGroupIds(studentId, db = pool) {
  const { rows } = await db.query(
    `SELECT group_id FROM group_students
      WHERE student_id = $1 AND left_at IS NULL`,
    [studentId],
  );
  return rows.map((r) => r.group_id);
}

/** Состоит ли студент в группе (активное членство). */
export async function isStudentInGroup(studentId, groupId, db = pool) {
  const { rowCount } = await db.query(
    `SELECT 1 FROM group_students
      WHERE student_id = $1 AND group_id = $2 AND left_at IS NULL`,
    [studentId, groupId],
  );
  return rowCount > 0;
}

/** id групп, которые ведёт ментор (не удалённые). */
export async function getMentorGroupIds(mentorId, db = pool) {
  const { rows } = await db.query(
    `SELECT id FROM groups WHERE mentor_id = $1 AND deleted_at IS NULL`,
    [mentorId],
  );
  return rows.map((r) => r.id);
}

/** Ведёт ли ментор эту группу. */
export async function isMentorOfGroup(mentorId, groupId, db = pool) {
  const { rowCount } = await db.query(
    `SELECT 1 FROM groups
      WHERE id = $1 AND mentor_id = $2 AND deleted_at IS NULL`,
    [groupId, mentorId],
  );
  return rowCount > 0;
}
