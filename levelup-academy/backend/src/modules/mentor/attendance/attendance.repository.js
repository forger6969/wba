import { pool } from '../../../config/db.js';

/**
 * Data-layer davomat (посещаемости). Таблица `attendance` — собственность
 * mentor-домена (AB-MENTOR), UNIQUE (group_id, student_id, lesson_date).
 */

/**
 * Массовая отметка на дату урока одним SQL-запросом (upsert по unique-constraint).
 * unnest разворачивает параллельные массивы в набор строк для INSERT ... SELECT.
 */
export async function upsertMany({ branchId, groupId, markedBy, lessonDate, records }) {
  const studentIds = records.map((r) => r.studentId);
  const statuses = records.map((r) => r.status);
  const comments = records.map((r) => r.comment ?? null);

  const { rows } = await pool.query(
    `INSERT INTO attendance (branch_id, group_id, student_id, lesson_date, status, marked_by, comment)
     SELECT $1, $2, r.student_id, $3, r.status::attendance_status, $4, r.comment
       FROM unnest($5::uuid[], $6::text[], $7::text[]) AS r(student_id, status, comment)
     ON CONFLICT (group_id, student_id, lesson_date) DO UPDATE
       SET status     = EXCLUDED.status,
           comment    = EXCLUDED.comment,
           marked_by  = EXCLUDED.marked_by,
           updated_at = now()
     RETURNING *`,
    [branchId, groupId, lessonDate, markedBy, studentIds, statuses, comments],
  );
  return rows;
}

/**
 * Снять отметки на дату урока для перечисленных студентов (unmark).
 * `attendance.status` — NOT NULL, поэтому «пусто» = отсутствие строки, а не
 * NULL-статус: сбросить отметку можно только удалением. Используется, когда
 * админ в журнале прогоняет статус ученика по кругу обратно в «не отмечено».
 */
export async function deleteMarks(groupId, lessonDate, studentIds) {
  if (studentIds.length === 0) return;
  await pool.query(
    `DELETE FROM attendance
      WHERE group_id = $1 AND lesson_date = $2 AND student_id = ANY($3::uuid[])`,
    [groupId, lessonDate, studentIds],
  );
}

/** Отметки группы на конкретную дату урока.
   `marked_by_role` нужен, чтобы отличить отметку, поставленную/исправленную
   администратором, от менторской: клетка сохраняет цвет статуса, но получает
   пометку «исправлено администратором». LEFT JOIN — отметившего могли удалить. */
export async function findByGroupAndDate(groupId, lessonDate) {
  const { rows } = await pool.query(
    `SELECT a.*, u.first_name, u.last_name,
            m.role       AS marked_by_role,
            m.first_name AS marked_by_first_name,
            m.last_name  AS marked_by_last_name
       FROM attendance a
       JOIN users u ON u.id = a.student_id
       LEFT JOIN users m ON m.id = a.marked_by
      WHERE a.group_id = $1 AND a.lesson_date = $2
      ORDER BY u.last_name, u.first_name`,
    [groupId, lessonDate],
  );
  return rows;
}

/** Отметки группы за диапазон дат (включительно). */
export async function findByGroupAndRange(groupId, from, to) {
  const { rows } = await pool.query(
    /* Имя отметившего нужно в шапке журнала: у группы бывает подменный
       преподаватель, и по колонке должно быть видно, кто вёл этот урок.
       LEFT JOIN, а не JOIN: сотрудника могли удалить (soft-delete), и из-за
       обычного JOIN отметка пропала бы из журнала целиком. */
    `SELECT a.*, u.first_name, u.last_name,
            m.role       AS marked_by_role,
            m.first_name AS marked_by_first_name,
            m.last_name  AS marked_by_last_name
       FROM attendance a
       JOIN users u ON u.id = a.student_id
       LEFT JOIN users m ON m.id = a.marked_by
      WHERE a.group_id = $1 AND a.lesson_date BETWEEN $2 AND $3
      ORDER BY a.lesson_date DESC, u.last_name, u.first_name`,
    [groupId, from, to],
  );
  return rows;
}
