import { pool } from '../../../config/db.js';

/**
 * Статистика группы: по строке на ученика.
 *
 * Три отдельных запроса вместо одного сшитого: у посещаемости, домашек и
 * тестов разные условия отбора и разная зернистость, и объединять их в SQL
 * пришлось бы через вложенные подзапросы, которые потом никто не прочитает.
 * Сшиваются по student_id в сервисе — там это две строки.
 *
 * Каждый запрос ограничен группой ментора: доступ проверяется не только на
 * входе в эндпоинт, но и в самих выборках.
 */

/** Группа принадлежит этому ментору — иначе показывать нечего. */
export function findGroupForMentor(groupId, mentorId, client = pool) {
  return client
    .query(
      `SELECT id, name, subject
         FROM groups
        WHERE id = $1 AND mentor_id = $2 AND deleted_at IS NULL`,
      [groupId, mentorId],
    )
    .then((r) => r.rows[0] ?? null);
}

/** Состав группы. Основа списка: ученик без единой отметки тоже должен попасть. */
export function roster(groupId, client = pool) {
  return client
    .query(
      `SELECT u.id, u.first_name, u.last_name, u.status, sp.coin_balance
         FROM group_students gs
         JOIN users u            ON u.id = gs.student_id AND u.deleted_at IS NULL
         JOIN student_profiles sp ON sp.user_id = u.id
        WHERE gs.group_id = $1 AND gs.left_at IS NULL
        ORDER BY u.first_name`,
      [groupId],
    )
    .then((r) => r.rows);
}

export function attendancePerStudent(groupId, client = pool) {
  return client
    .query(
      `SELECT student_id,
              count(*)::int AS total,
              count(*) FILTER (WHERE status IN ('present', 'late'))::int AS attended
         FROM attendance
        WHERE group_id = $1
        GROUP BY student_id`,
      [groupId],
    )
    .then((r) => r.rows);
}

/**
 * Домашки: сколько задано группе, сколько сдал каждый и средний процент.
 * LEFT JOIN — несданное обязано считаться в знаменателе, иначе «сдал 2 из 2»
 * выглядело бы отличником у того, кто пропустил остальные восемь.
 */
export function homeworkPerStudent(groupId, client = pool) {
  return client
    .query(
      `SELECT gs.student_id,
              count(h.id)::int AS total,
              count(s.id)::int AS done,
              round(avg(s.score::numeric / nullif(h.max_score, 0) * 100)
                    FILTER (WHERE s.score IS NOT NULL))::int AS avg_percent
         FROM group_students gs
         CROSS JOIN LATERAL (
           SELECT id, max_score FROM homework
            WHERE group_id = $1 AND deleted_at IS NULL
         ) h
         LEFT JOIN homework_submissions s
                ON s.homework_id = h.id AND s.student_id = gs.student_id
        WHERE gs.group_id = $1 AND gs.left_at IS NULL
        GROUP BY gs.student_id`,
      [groupId],
    )
    .then((r) => r.rows);
}

/** Тесты: сколько прошёл каждый и средний процент по завершённым попыткам. */
export function testsPerStudent(groupId, client = pool) {
  return client
    .query(
      `SELECT gs.student_id,
              count(t.id)::int AS total,
              count(r.id) FILTER (WHERE r.finished_at IS NOT NULL)::int AS taken,
              round(avg(r.score::numeric / nullif(jsonb_array_length(t.questions), 0) * 100)
                    FILTER (WHERE r.finished_at IS NOT NULL))::int AS avg_percent
         FROM group_students gs
         CROSS JOIN LATERAL (
           SELECT id, questions FROM tests
            WHERE group_id = $1 AND deleted_at IS NULL
         ) t
         LEFT JOIN test_results r ON r.test_id = t.id AND r.student_id = gs.student_id
        WHERE gs.group_id = $1 AND gs.left_at IS NULL
        GROUP BY gs.student_id`,
      [groupId],
    )
    .then((r) => r.rows);
}
