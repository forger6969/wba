import { pool } from '../../../config/db.js';

/** Текущий долг студента (student_profiles.total_debt). */
export async function getTotalDebt(studentId) {
  const { rows: [row] } = await pool.query(
    `SELECT total_debt FROM student_profiles WHERE user_id = $1`,
    [studentId],
  );
  return row?.total_debt ?? 0;
}

/** Язык кабинета студента (для AI-review/уведомлений/тг-бота), null пока не выбран. */
export async function getPreferredLanguage(studentId) {
  const { rows: [row] } = await pool.query(
    `SELECT preferred_language FROM users WHERE id = $1`,
    [studentId],
  );
  return row?.preferred_language ?? null;
}

export async function setPreferredLanguage(studentId, language) {
  await pool.query(`UPDATE users SET preferred_language = $2 WHERE id = $1`, [studentId, language]);
}

/** Даты и статусы посещений студента, старые -> новые (для расчёта серии). */
export async function getAttendanceHistory(studentId) {
  const { rows } = await pool.query(
    `SELECT lesson_date AS "lessonDate", status
       FROM attendance
      WHERE student_id = $1
      ORDER BY lesson_date ASC`,
    [studentId],
  );
  return rows;
}

/** Группы студента (активное членство) с ФИО ментора. */
export async function getGroupsForStudent(studentId) {
  const { rows } = await pool.query(
    `SELECT g.id, g.name, g.subject,
            m.first_name AS mentor_first_name, m.last_name AS mentor_last_name
       FROM group_students gs
       JOIN groups g ON g.id = gs.group_id AND g.deleted_at IS NULL
       JOIN users m ON m.id = g.mentor_id
      WHERE gs.student_id = $1 AND gs.left_at IS NULL
      ORDER BY g.name`,
    [studentId],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    subject: r.subject,
    mentorName: `${r.mentor_first_name} ${r.mentor_last_name}`,
  }));
}
