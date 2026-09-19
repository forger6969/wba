import { pool } from '../../config/db.js';

// ==================== ТЕСТЫ ====================

/** Создать тест (без привязки к конкретной группе — методологический). */
export function createTest(input, db = pool) {
  const { branchId, createdBy, title, description, questions, durationMin, coinReward } = input;
  return db
    .query(
      `INSERT INTO tests
         (branch_id, group_id, created_by, title, description, questions, duration_min, coin_reward)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
       RETURNING *`,
      [branchId ?? null, null, createdBy, title, description ?? null,
       JSON.stringify(questions), durationMin, coinReward],
    )
    .then((r) => r.rows[0]);
}

/** Получить тест по ID. */
export function getTestById(id, db = pool) {
  return db
    .query(`SELECT * FROM tests WHERE id = $1 AND deleted_at IS NULL`, [id])
    .then((r) => r.rows[0] ?? null);
}

/** Список тестов организации (все филиалы). */
export function listTestsByOrg(orgId, db = pool) {
  return db
    .query(
      `SELECT t.id, t.title, t.description, t.duration_min, t.coin_reward, t.created_at,
              t.branch_id, b.name AS branch_name
         FROM tests t
         JOIN branches b ON b.id = t.branch_id
        WHERE b.organization_id = $1 AND t.deleted_at IS NULL AND t.is_archived = false
        ORDER BY t.created_at DESC`,
      [orgId],
    )
    .then((r) => r.rows);
}

/** Обновить тест (только свои). */
export function updateTest(id, createdBy, fields, db = pool) {
  const cols = [];
  const vals = [];
  let i = 1;
  for (const [key, col] of [
    ['title', 'title'],
    ['description', 'description'],
    ['questions', 'questions'],
    ['durationMin', 'duration_min'],
    ['coinReward', 'coin_reward'],
  ]) {
    if (fields[key] !== undefined) {
      cols.push(`${col} = $${i++}`);
      vals.push(key === 'questions' ? JSON.stringify(fields[key]) : fields[key]);
    }
  }
  if (cols.length === 0) return null;
  vals.push(id, createdBy);
  return db
    .query(
      `UPDATE tests SET ${cols.join(', ')}, updated_at = now()
        WHERE id = $${i++} AND created_by = $${i} AND deleted_at IS NULL
        RETURNING *`,
      vals,
    )
    .then((r) => r.rows[0] ?? null);
}

/** Архивировать тест. */
export function archiveTest(id, createdBy, db = pool) {
  return db
    .query(
      `UPDATE tests SET is_archived = true, updated_at = now()
        WHERE id = $1 AND created_by = $2 AND deleted_at IS NULL
        RETURNING id`,
      [id, createdBy],
    )
    .then((r) => r.rows[0] ?? null);
}

// ==================== ДОМАШНИЕ ЗАДАНИЯ ====================

/** Создать ДЗ (методологическое, без привязки к группе). */
export function createHomework(input, db = pool) {
  const { branchId, createdBy, title, description, maxScore, coinReward, deadline } = input;
  return db
    .query(
      `INSERT INTO homework
         (branch_id, group_id, created_by, title, description, max_score, coin_reward, deadline)
       VALUES ($1, null, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [branchId ?? null, createdBy, title, description ?? null, maxScore, coinReward, deadline],
    )
    .then((r) => r.rows[0]);
}

/** Список ДЗ организации. */
export function listHomeworkByOrg(orgId, db = pool) {
  return db
    .query(
      `SELECT h.id, h.title, h.description, h.max_score, h.coin_reward, h.deadline, h.created_at,
              h.branch_id, b.name AS branch_name
         FROM homework h
         JOIN branches b ON b.id = h.branch_id
        WHERE b.organization_id = $1 AND h.deleted_at IS NULL AND h.is_archived = false
        ORDER BY h.created_at DESC`,
      [orgId],
    )
    .then((r) => r.rows);
}

/** Обновить ДЗ. */
export function updateHomework(id, createdBy, fields, db = pool) {
  const cols = [];
  const vals = [];
  let i = 1;
  for (const [key, col] of [
    ['title', 'title'],
    ['description', 'description'],
    ['maxScore', 'max_score'],
    ['coinReward', 'coin_reward'],
    ['deadline', 'deadline'],
  ]) {
    if (fields[key] !== undefined) {
      cols.push(`${col} = $${i++}`);
      vals.push(fields[key]);
    }
  }
  if (cols.length === 0) return null;
  vals.push(id, createdBy);
  return db
    .query(
      `UPDATE homework SET ${cols.join(', ')}, updated_at = now()
        WHERE id = $${i++} AND created_by = $${i} AND deleted_at IS NULL
        RETURNING *`,
      vals,
    )
    .then((r) => r.rows[0] ?? null);
}

/** Архивация ДЗ. */
export function archiveHomework(id, createdBy, db = pool) {
  return db
    .query(
      `UPDATE homework SET is_archived = true, updated_at = now()
        WHERE id = $1 AND created_by = $2 AND deleted_at IS NULL
        RETURNING id`,
      [id, createdBy],
    )
    .then((r) => r.rows[0] ?? null);
}

// ==================== АНАЛИТИКА ====================

/** Все студенты организации с группировкой по группам. */
export function listStudentsWithGroups(orgId, db = pool) {
  return db
    .query(
      `SELECT u.id, u.first_name, u.last_name, u.branch_id,
              b.name AS branch_name,
              COALESCE(
                json_agg(
                  json_build_object('id', g.id, 'name', g.name, 'subject', g.subject)
                ) FILTER (WHERE g.id IS NOT NULL),
                '[]'
              ) AS groups
         FROM users u
         JOIN branches b ON b.id = u.branch_id
         LEFT JOIN group_students gs ON gs.student_id = u.id AND gs.left_at IS NULL
         LEFT JOIN groups g ON g.id = gs.group_id AND g.deleted_at IS NULL
        WHERE u.organization_id = $1 AND u.role = 'student'
          AND u.deleted_at IS NULL AND u.status = 'active'
        GROUP BY u.id, b.id
        ORDER BY b.name, u.last_name`,
      [orgId],
    )
    .then((r) => r.rows);
}

/** Все группы организации. */
export function listGroupsByOrg(orgId, db = pool) {
  return db
    .query(
      `SELECT g.id, g.name, g.subject, g.branch_id, b.name AS branch_name,
              g.mentor_id,
              CONCAT(m.first_name, ' ', m.last_name) AS mentor_name,
              (SELECT count(*) FROM group_students gs WHERE gs.group_id = g.id AND gs.left_at IS NULL)::int AS student_count
         FROM groups g
         JOIN branches b ON b.id = g.branch_id
         LEFT JOIN users m ON m.id = g.mentor_id
        WHERE b.organization_id = $1 AND g.deleted_at IS NULL AND g.is_archived = false
        ORDER BY b.name, g.name`,
      [orgId],
    )
    .then((r) => r.rows);
}

/** Статистика сложностей студентов: результаты тестов. */
export function testDifficultyStats(orgId, db = pool) {
  return db
    .query(
      `SELECT t.id AS test_id, t.title, t.group_id, g.name AS group_name, g.subject,
              b.name AS branch_name,
              count(r.id)::int AS attempts,
              round(avg(r.score)::numeric, 1) AS avg_score,
              jsonb_array_length(t.questions) AS question_count
         FROM tests t
         JOIN branches b ON b.id = t.branch_id
         LEFT JOIN groups g ON g.id = t.group_id
         LEFT JOIN test_results r ON r.test_id = t.id AND r.finished_at IS NOT NULL
        WHERE b.organization_id = $1 AND t.deleted_at IS NULL
        GROUP BY t.id, g.id, b.id
        ORDER BY avg_score ASC NULLS LAST
        LIMIT 50`,
      [orgId],
    )
    .then((r) => r.rows);
}

/** Статистика по ДЗ: средний балл, сдаваемость. */
export function homeworkStats(orgId, db = pool) {
  return db
    .query(
      `SELECT h.id AS homework_id, h.title, g.name AS group_name, g.subject, b.name AS branch_name,
              count(s.id)::int AS submissions,
              round(avg(s.score)::numeric, 1) AS avg_score,
              h.max_score
         FROM homework h
         JOIN branches b ON b.id = h.branch_id
         LEFT JOIN groups g ON g.id = h.group_id
         LEFT JOIN homework_submissions s ON s.homework_id = h.id AND s.status = 'graded'
        WHERE b.organization_id = $1 AND h.deleted_at IS NULL
        GROUP BY h.id, g.id, b.id
        ORDER BY avg_score ASC
        LIMIT 50`,
      [orgId],
    )
    .then((r) => r.rows);
}
