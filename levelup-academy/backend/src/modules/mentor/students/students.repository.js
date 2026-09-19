import { pool } from '../../../config/db.js';

/**
 * Статистика ученика для ментора.
 *
 * Каждый запрос сам ограничен группами этого ментора (`g.mentor_id = $2`) —
 * доступ проверяется не только на входе, но и в самих выборках. Иначе ментор,
 * подставив чужой studentId, увидел бы домашки и оценки из чужих групп.
 */

/** Ученик виден ментору, только если состоит в его действующей группе. */
export function findStudentForMentor(studentId, mentorId, client = pool) {
  return client
    .query(
      // Баланс и логин-код живут не в users: баланс — в student_profiles,
      // код входа ученика — это users.login_code.
      `SELECT u.id, u.first_name, u.last_name, u.phone, u.email, u.status,
              u.login_code, u.created_at, sp.coin_balance
         FROM users u
         JOIN student_profiles sp ON sp.user_id = u.id
         JOIN group_students gs   ON gs.student_id = u.id AND gs.left_at IS NULL
         JOIN groups g            ON g.id = gs.group_id AND g.deleted_at IS NULL
        WHERE u.id = $1 AND g.mentor_id = $2 AND u.deleted_at IS NULL
        LIMIT 1`,
      [studentId, mentorId],
    )
    .then((r) => r.rows[0] ?? null);
}

/** Группы ментора, в которых состоит ученик. */
export function listStudentGroups(studentId, mentorId, client = pool) {
  return client
    .query(
      `SELECT g.id, g.name, g.subject, gs.joined_at
         FROM groups g
         JOIN group_students gs ON gs.group_id = g.id AND gs.student_id = $1
        WHERE g.mentor_id = $2 AND g.deleted_at IS NULL AND gs.left_at IS NULL
        ORDER BY gs.joined_at`,
      [studentId, mentorId],
    )
    .then((r) => r.rows);
}

/** Посещаемость: свод по статусам за всё время в группах этого ментора. */
export function attendanceSummary(studentId, mentorId, client = pool) {
  return client
    .query(
      `SELECT a.status, count(*)::int AS count
         FROM attendance a
         JOIN groups g ON g.id = a.group_id
        WHERE a.student_id = $1 AND g.mentor_id = $2 AND g.deleted_at IS NULL
        GROUP BY a.status`,
      [studentId, mentorId],
    )
    .then((r) => r.rows);
}

/** Последние отметки — чтобы видеть не только проценты, но и динамику. */
export function recentAttendance(studentId, mentorId, limit = 12, client = pool) {
  return client
    .query(
      `SELECT a.lesson_date, a.status, g.name AS group_name
         FROM attendance a
         JOIN groups g ON g.id = a.group_id
        WHERE a.student_id = $1 AND g.mentor_id = $2 AND g.deleted_at IS NULL
        ORDER BY a.lesson_date DESC
        LIMIT $3`,
      [studentId, mentorId, limit],
    )
    .then((r) => r.rows);
}

/**
 * Домашние задания: ВСЕ задания групп ученика, а не только сданные.
 * Ключевой момент — LEFT JOIN: несданное ДЗ обязано попасть в список со
 * status = NULL. Обычный JOIN показал бы только сделанное, то есть ровно ту
 * половину картины, которая ментору не нужна.
 */
export function homeworkBreakdown(studentId, mentorId, client = pool) {
  return client
    .query(
      `SELECT h.id, h.title, h.deadline, h.max_score, h.coin_reward,
              g.name AS group_name,
              s.status, s.score, s.submitted_at, s.graded_at
         FROM homework h
         JOIN groups g          ON g.id = h.group_id AND g.mentor_id = $2
         JOIN group_students gs ON gs.group_id = g.id
                               AND gs.student_id = $1 AND gs.left_at IS NULL
         LEFT JOIN homework_submissions s ON s.homework_id = h.id AND s.student_id = $1
        WHERE h.deleted_at IS NULL AND g.deleted_at IS NULL
        ORDER BY h.deadline DESC`,
      [studentId, mentorId],
    )
    .then((r) => r.rows);
}

/** Тесты: тоже все, включая непройденные (LEFT JOIN по той же причине). */
export function testsBreakdown(studentId, mentorId, client = pool) {
  return client
    .query(
      `SELECT t.id, t.title, t.coin_reward, t.created_at,
              g.name AS group_name,
              jsonb_array_length(t.questions) AS max_score,
              r.score, r.started_at, r.finished_at
         FROM tests t
         JOIN groups g          ON g.id = t.group_id AND g.mentor_id = $2
         JOIN group_students gs ON gs.group_id = g.id
                               AND gs.student_id = $1 AND gs.left_at IS NULL
         LEFT JOIN test_results r ON r.test_id = t.id AND r.student_id = $1
        WHERE t.deleted_at IS NULL AND g.deleted_at IS NULL
        ORDER BY t.created_at DESC`,
      [studentId, mentorId],
    )
    .then((r) => r.rows);
}

/* ── Динамика по месяцам ──────────────────────────────────────────────────
   Три отдельных запроса, а не один с FULL JOIN: у посещаемости, домашек и
   тестов свои даты и свои условия отбора, и склеивать их в SQL пришлось бы
   через подзапросы, которые читаются хуже, чем три простых GROUP BY.
   Сшиваются по ключу месяца в сервисе. */

const MONTHS_BACK = "date_trunc('month', now()) - interval '5 months'";

export function attendanceByMonth(studentId, mentorId, client = pool) {
  return client
    .query(
      `SELECT to_char(date_trunc('month', a.lesson_date), 'YYYY-MM') AS month,
              count(*) FILTER (WHERE a.status IN ('present', 'late'))::int AS attended,
              count(*)::int AS total
         FROM attendance a
         JOIN groups g ON g.id = a.group_id
        WHERE a.student_id = $1 AND g.mentor_id = $2 AND g.deleted_at IS NULL
          AND a.lesson_date >= ${MONTHS_BACK}
        GROUP BY 1 ORDER BY 1`,
      [studentId, mentorId],
    )
    .then((r) => r.rows);
}

/** Средний процент за ДЗ по месяцам — только оценённые работы. */
export function homeworkByMonth(studentId, mentorId, client = pool) {
  return client
    .query(
      `SELECT to_char(date_trunc('month', h.deadline), 'YYYY-MM') AS month,
              round(avg(s.score::numeric / nullif(h.max_score, 0) * 100))::int AS avg_percent,
              count(*)::int AS graded
         FROM homework h
         JOIN groups g          ON g.id = h.group_id AND g.mentor_id = $2
         JOIN group_students gs ON gs.group_id = g.id
                               AND gs.student_id = $1 AND gs.left_at IS NULL
         JOIN homework_submissions s ON s.homework_id = h.id AND s.student_id = $1
        WHERE h.deleted_at IS NULL AND g.deleted_at IS NULL AND s.score IS NOT NULL
          AND h.deadline >= ${MONTHS_BACK}
        GROUP BY 1 ORDER BY 1`,
      [studentId, mentorId],
    )
    .then((r) => r.rows);
}

/** Доля сданных ДЗ по месяцам: все задания месяца против сданных. */
export function homeworkDoneByMonth(studentId, mentorId, client = pool) {
  return client
    .query(
      `SELECT to_char(date_trunc('month', h.deadline), 'YYYY-MM') AS month,
              count(*)::int AS total,
              count(s.id)::int AS done
         FROM homework h
         JOIN groups g          ON g.id = h.group_id AND g.mentor_id = $2
         JOIN group_students gs ON gs.group_id = g.id
                               AND gs.student_id = $1 AND gs.left_at IS NULL
         LEFT JOIN homework_submissions s ON s.homework_id = h.id AND s.student_id = $1
        WHERE h.deleted_at IS NULL AND g.deleted_at IS NULL
          AND h.deadline >= ${MONTHS_BACK}
        GROUP BY 1 ORDER BY 1`,
      [studentId, mentorId],
    )
    .then((r) => r.rows);
}

/** Средний процент за тесты по месяцам — только завершённые попытки. */
export function testsByMonth(studentId, mentorId, client = pool) {
  return client
    .query(
      `SELECT to_char(date_trunc('month', r.finished_at), 'YYYY-MM') AS month,
              round(avg(r.score::numeric
                        / nullif(jsonb_array_length(t.questions), 0) * 100))::int AS avg_percent,
              count(*)::int AS taken
         FROM test_results r
         JOIN tests t           ON t.id = r.test_id AND t.deleted_at IS NULL
         JOIN groups g          ON g.id = t.group_id AND g.mentor_id = $2
         JOIN group_students gs ON gs.group_id = g.id
                               AND gs.student_id = $1 AND gs.left_at IS NULL
        WHERE r.student_id = $1 AND r.finished_at IS NOT NULL AND g.deleted_at IS NULL
          AND r.finished_at >= ${MONTHS_BACK}
        GROUP BY 1 ORDER BY 1`,
      [studentId, mentorId],
    )
    .then((r) => r.rows);
}

/** Коины: сводка начислений/списаний и последние операции. */
export function coinsSummary(studentId, client = pool) {
  return client
    .query(
      `SELECT
         coalesce(sum(amount) FILTER (WHERE amount > 0), 0)::int AS earned,
         coalesce(-sum(amount) FILTER (WHERE amount < 0), 0)::int AS spent
       FROM coin_history
      WHERE student_id = $1`,
      [studentId],
    )
    .then((r) => r.rows[0] ?? { earned: 0, spent: 0 });
}

export function recentCoins(studentId, limit = 10, client = pool) {
  return client
    .query(
      `SELECT id, amount, reason, ref_type, created_at
         FROM coin_history
        WHERE student_id = $1
        ORDER BY created_at DESC
        LIMIT $2`,
      [studentId, limit],
    )
    .then((r) => r.rows);
}
