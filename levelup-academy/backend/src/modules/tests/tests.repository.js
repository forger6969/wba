import { pool } from '../../config/db.js';

/**
 * Общий data-layer для тестов/экзаменов. Контракт JSONB:
 *   questions: [{ q: string, options: string[], correct: number }]  // correct = индекс верного
 *   answers:   number[]   // answers[i] = выбранный индекс опции для вопроса i (-1 = пропущен)
 *
 * `correct` НИКОГДА не отдаётся студенту (getTestForStudent вырезает его).
 * Пишут обе зоны Abdulaziz: mentor (createTest), student (startAttempt/submitAttempt).
 */

export async function createTest(input, db = pool) {
  const { branchId, groupId, createdBy, title, questions, durationMin, startsAt, endsAt, coinReward } =
    input;
  const { rows: [test] } = await db.query(
    `INSERT INTO tests
       (branch_id, group_id, created_by, title, questions, duration_min, starts_at, ends_at, coin_reward)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
     RETURNING *`,
    [branchId, groupId, createdBy, title, JSON.stringify(questions), durationMin,
     startsAt ?? null, endsAt ?? null, coinReward],
  );
  return test;
}

export async function getTestById(id, db = pool) {
  const { rows: [test] } = await db.query(
    `SELECT * FROM tests WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  return test ?? null;
}

/** Тесты группы для ментора (с correct, со статистикой сдач). */
export async function listTestsForGroup(groupId) {
  const { rows } = await pool.query(
    `SELECT t.*,
            (SELECT count(*)::int FROM test_results r WHERE r.test_id = t.id AND r.finished_at IS NOT NULL) AS attempts_count
       FROM tests t
      WHERE t.group_id = $1 AND t.deleted_at IS NULL
      ORDER BY t.created_at DESC`,
    [groupId],
  );
  return rows;
}

/** Тесты для студента по его группам + статус его попытки (без correct — вырезает сервис). */
export async function listTestsForStudent(studentId, groupIds) {
  if (groupIds.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT t.id, t.group_id, t.title, t.questions, t.duration_min, t.starts_at, t.ends_at,
            t.coin_reward, t.created_at,
            r.started_at, r.finished_at, r.score
       FROM tests t
       LEFT JOIN test_results r ON r.test_id = t.id AND r.student_id = $1
      WHERE t.group_id = ANY($2) AND t.deleted_at IS NULL AND t.is_archived = false
      ORDER BY t.created_at DESC`,
    [studentId, groupIds],
  );
  return rows;
}

export async function getResult(testId, studentId, db = pool) {
  const { rows: [r] } = await db.query(
    `SELECT * FROM test_results WHERE test_id = $1 AND student_id = $2`,
    [testId, studentId],
  );
  return r ?? null;
}

/** Начать попытку (уникальность test_id+student_id → повторный старт словит conflict). */
export async function insertAttempt({ testId, studentId }, db = pool) {
  const { rows: [r] } = await db.query(
    `INSERT INTO test_results (test_id, student_id, started_at)
     VALUES ($1, $2, now())
     ON CONFLICT (test_id, student_id) DO NOTHING
     RETURNING *`,
    [testId, studentId],
  );
  return r ?? null; // null = попытка уже существует
}

/** Зафиксировать сдачу: ответы + балл + finished_at (только если ещё не финиширована). */
export async function finalizeAttempt({ testId, studentId, answers, score }, db = pool) {
  const { rows: [r] } = await db.query(
    `UPDATE test_results
        SET answers = $3::jsonb, score = $4, finished_at = now()
      WHERE test_id = $1 AND student_id = $2 AND finished_at IS NULL
      RETURNING *`,
    [testId, studentId, JSON.stringify(answers), score],
  );
  return r ?? null; // null = не найдено или уже финиширована
}
