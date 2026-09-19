import { pool } from '../../config/db.js';

/**
 * Общий data-layer для домашних заданий. Пишут обе зоны Abdulaziz:
 *   - mentor: createHomework, listSubmissions, gradeSubmission
 *   - student: listForStudent, submitHomework
 * Единый репозиторий на таблицы homework / homework_submissions (общие таблицы →
 * одна точка правды, сервисы/контроллеры делятся по ролям в отдельных файлах).
 */

export async function createHomework(input, db = pool) {
  const { branchId, groupId, createdBy, title, description, attachmentKey, maxScore, coinReward, deadline } =
    input;
  const { rows: [hw] } = await db.query(
    `INSERT INTO homework
       (branch_id, group_id, created_by, title, description, attachment_key, max_score, coin_reward, deadline)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [branchId, groupId, createdBy, title, description ?? null, attachmentKey ?? null,
     maxScore, coinReward, deadline],
  );
  return hw;
}

export async function getHomeworkById(id, db = pool) {
  const { rows: [hw] } = await db.query(
    `SELECT * FROM homework WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  return hw ?? null;
}

/** ДЗ группы (для ментора). */
export async function listHomeworkForGroup(groupId, { includeArchived = false } = {}) {
  const { rows } = await pool.query(
    `SELECT h.*,
            (SELECT count(*)::int FROM homework_submissions s WHERE s.homework_id = h.id) AS submissions_count,
            (SELECT count(*)::int FROM homework_submissions s WHERE s.homework_id = h.id AND s.status = 'graded') AS graded_count
       FROM homework h
      WHERE h.group_id = $1 AND h.deleted_at IS NULL
        AND ($2 OR h.is_archived = false)
      ORDER BY h.deadline DESC`,
    [groupId, includeArchived],
  );
  return rows;
}

/** ДЗ для студента по его группам + статус его сдачи. */
export async function listHomeworkForStudent(studentId, groupIds) {
  if (groupIds.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT h.id, h.group_id, h.title, h.description, h.attachment_key,
            h.max_score, h.coin_reward, h.deadline, h.created_at,
            s.status AS submission_status, s.score, s.submitted_at, s.file_key, s.text_answer
       FROM homework h
       LEFT JOIN homework_submissions s
              ON s.homework_id = h.id AND s.student_id = $1
      WHERE h.group_id = ANY($2) AND h.deleted_at IS NULL AND h.is_archived = false
      ORDER BY h.deadline DESC`,
    [studentId, groupIds],
  );
  return rows;
}

/**
 * Сдача ДЗ студентом (upsert — повторная отправка перезаписывает ТОЛЬКО до
 * проверки). Guard `status <> 'graded'` в DO UPDATE атомарно защищает уже
 * оценённую сдачу: без него пересдача сбрасывала бы score/graded_* и позволяла
 * повторную оценку → двойное начисление коинов. null = уже оценена.
 */
export async function upsertSubmission(input, db = pool) {
  const { homeworkId, studentId, fileKey, textAnswer, status } = input;
  const { rows: [sub] } = await db.query(
    `INSERT INTO homework_submissions (homework_id, student_id, status, file_key, text_answer, submitted_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (homework_id, student_id) DO UPDATE
       SET status = EXCLUDED.status,
           file_key = EXCLUDED.file_key,
           text_answer = EXCLUDED.text_answer,
           submitted_at = now(),
           score = NULL, graded_by = NULL, graded_at = NULL
     WHERE homework_submissions.status <> 'graded'
     RETURNING *`,
    [homeworkId, studentId, status, fileKey ?? null, textAnswer ?? null],
  );
  return sub ?? null;
}

export async function getSubmissionById(id, db = pool) {
  const { rows: [sub] } = await db.query(
    `SELECT s.*, h.group_id, h.coin_reward, h.branch_id, h.max_score
       FROM homework_submissions s
       JOIN homework h ON h.id = s.homework_id
      WHERE s.id = $1`,
    [id],
  );
  return sub ?? null;
}

/** Список сдач по ДЗ (для проверки ментором). */
export async function listSubmissions(homeworkId) {
  const { rows } = await pool.query(
    `SELECT s.id, s.student_id, s.status, s.file_key, s.text_answer, s.score,
            s.submitted_at, s.graded_at,
            u.first_name, u.last_name
       FROM homework_submissions s
       JOIN users u ON u.id = s.student_id
      WHERE s.homework_id = $1
      ORDER BY s.submitted_at ASC`,
    [homeworkId],
  );
  return rows;
}

/**
 * Проставить оценку (в транзакции вместе с начислением коинов).
 * Guard `status <> 'graded'` делает операцию идемпотентной под конкурентными
 * запросами: второй запрос получит null → вызывающий откатывает без двойного
 * начисления коинов.
 */
export async function gradeSubmission({ submissionId, score, gradedBy }, db = pool) {
  const { rows: [sub] } = await db.query(
    `UPDATE homework_submissions
        SET score = $2, graded_by = $3, graded_at = now(), status = 'graded'
      WHERE id = $1 AND status <> 'graded'
      RETURNING *`,
    [submissionId, score, gradedBy],
  );
  return sub ?? null; // null = уже оценена (конкурентная гонка)
}
