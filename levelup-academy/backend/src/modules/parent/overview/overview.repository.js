import { pool } from '../../../config/db.js';

/**
 * Read-only доступ parent-домена. Родитель никогда не пишет в эти таблицы —
 * только SELECT'ы (§6: «Остальные — SELECT»). Скоуп всегда ограничен детьми
 * этого родителя (student_profiles.parent_id) — проверяется в getChild().
 */

/** Дети родителя (краткая карточка): профиль + коины/долг + заморозка. */
export async function getChildrenForParent(parentId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.first_name, u.last_name, u.avatar_key,
            sp.branch_id, sp.coin_balance, sp.total_debt, sp.frozen_at
       FROM student_profiles sp
       JOIN users u ON u.id = sp.user_id
      WHERE sp.parent_id = $1
      ORDER BY u.first_name, u.last_name`,
    [parentId],
  );
  return rows.map(mapChild);
}

/**
 * Один ребёнок этого родителя. Возвращает профиль или null, если ребёнка
 * с таким id у родителя нет — вызывающий превращает null в 403 (guard).
 */
export async function getChild(parentId, childId) {
  const { rows: [row] } = await pool.query(
    `SELECT u.id, u.first_name, u.last_name, u.avatar_key,
            sp.branch_id, sp.coin_balance, sp.total_debt, sp.frozen_at
       FROM student_profiles sp
       JOIN users u ON u.id = sp.user_id
      WHERE sp.parent_id = $1 AND sp.user_id = $2`,
    [parentId, childId],
  );
  return row ? mapChild(row) : null;
}

/** Текущий неоплаченный/частично оплаченный счёт ребёнка — для прогресс-бара оплаты. */
export async function getCurrentInvoice(childId) {
  const { rows: [row] } = await pool.query(
    `SELECT total_amount, paid_amount
       FROM invoices
      WHERE student_id = $1 AND status IN ('pending', 'partially_paid', 'overdue')
      ORDER BY due_date DESC
      LIMIT 1`,
    [childId],
  );
  if (!row) return null;
  return { totalAmount: Number(row.total_amount), paidAmount: Number(row.paid_amount) };
}

/** Группы ребёнка (активное членство) с ФИО ментора. */
export async function getGroups(childId) {
  const { rows } = await pool.query(
    `SELECT g.id, g.name, g.subject,
            (SELECT count(*)::int FROM group_students members
              WHERE members.group_id = g.id AND members.left_at IS NULL) AS student_count,
            m.first_name AS mentor_first_name, m.last_name AS mentor_last_name
       FROM group_students gs
       JOIN groups g ON g.id = gs.group_id AND g.deleted_at IS NULL
       JOIN users m ON m.id = g.mentor_id
      WHERE gs.student_id = $1 AND gs.left_at IS NULL
      ORDER BY g.name`,
    [childId],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    subject: r.subject,
    mentorName: `${r.mentor_first_name} ${r.mentor_last_name}`,
    studentCount: r.student_count,
  }));
}

/** Сводка посещаемости по статусам за последние `days` дней. */
export async function getAttendanceSummary(childId, days) {
  const { rows } = await pool.query(
    `SELECT status, COUNT(*)::int AS count
       FROM attendance
      WHERE student_id = $1
        AND lesson_date >= CURRENT_DATE - $2::int
      GROUP BY status`,
    [childId, days],
  );
  const summary = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
  for (const r of rows) {
    summary[r.status] = r.count;
    summary.total += r.count;
  }
  return summary;
}

/** Последние отметки посещаемости (для ленты обзора). */
export async function getRecentAttendance(childId, limit) {
  const { rows } = await pool.query(
    `SELECT a.lesson_date, a.status, a.comment, g.name AS group_name
       FROM attendance a
       JOIN groups g ON g.id = a.group_id
      WHERE a.student_id = $1
      ORDER BY a.lesson_date DESC
      LIMIT $2`,
    [childId, limit],
  );
  return rows.map((r) => ({
    lessonDate: r.lesson_date,
    status: r.status,
    comment: r.comment,
    groupName: r.group_name,
  }));
}

/** FE-PARENT-PAGINATION: полная (постраничная) история посещаемости — не ограничена RECENT_LIMIT обзора. */
export async function getAttendancePage(childId, page, limit) {
  const offset = (page - 1) * limit;
  const { rows } = await pool.query(
    `SELECT a.lesson_date, a.status, a.comment, g.name AS group_name,
            count(*) OVER() AS total
       FROM attendance a
       JOIN groups g ON g.id = a.group_id
      WHERE a.student_id = $1
      ORDER BY a.lesson_date DESC
      LIMIT $2 OFFSET $3`,
    [childId, limit, offset],
  );
  const total = rows[0] ? Number(rows[0].total) : 0;
  const items = rows.map((r) => ({
    lessonDate: r.lesson_date,
    status: r.status,
    comment: r.comment,
    groupName: r.group_name,
  }));
  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / limit)) };
}

/** Последние оценённые ДЗ ребёнка. */
export async function getRecentHomeworkGrades(childId, limit) {
  const { rows } = await pool.query(
    `SELECT hw.id, hw.title, hw.max_score, s.score, s.graded_at
       FROM homework_submissions s
       JOIN homework hw ON hw.id = s.homework_id
      WHERE s.student_id = $1 AND s.status = 'graded'
      ORDER BY s.graded_at DESC
      LIMIT $2`,
    [childId, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    score: r.score,
    maxScore: r.max_score,
    gradedAt: r.graded_at,
  }));
}

/** Последние завершённые тесты/экзамены ребёнка. */
export async function getRecentTestResults(childId, limit) {
  const { rows } = await pool.query(
    `SELECT t.id, t.title,
            100 AS max_score,
            tr.score, tr.finished_at
       FROM test_results tr
       JOIN tests t ON t.id = tr.test_id
      WHERE tr.student_id = $1 AND tr.finished_at IS NOT NULL
      ORDER BY tr.finished_at DESC
      LIMIT $2`,
    [childId, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    score: r.score,
    maxScore: r.max_score,
    finishedAt: r.finished_at,
  }));
}

/** FE-PARENT-PAGINATION: полная история оценок (ДЗ или тестов) постранично. */
export async function getGradesPage(childId, type, page, limit) {
  const offset = (page - 1) * limit;
  if (type === 'tests') {
    const { rows } = await pool.query(
      `SELECT t.id, t.title,
              100 AS max_score,
              tr.score, tr.finished_at, count(*) OVER() AS total
         FROM test_results tr
         JOIN tests t ON t.id = tr.test_id
        WHERE tr.student_id = $1 AND tr.finished_at IS NOT NULL
        ORDER BY tr.finished_at DESC
        LIMIT $2 OFFSET $3`,
      [childId, limit, offset],
    );
    const total = rows[0] ? Number(rows[0].total) : 0;
    const items = rows.map((r) => ({
      id: r.id, title: r.title, score: r.score, maxScore: r.max_score, finishedAt: r.finished_at,
    }));
    return { items, total, page, pageCount: Math.max(1, Math.ceil(total / limit)) };
  }

  const { rows } = await pool.query(
    `SELECT hw.id, hw.title, hw.max_score, s.score, s.graded_at, count(*) OVER() AS total
       FROM homework_submissions s
       JOIN homework hw ON hw.id = s.homework_id
      WHERE s.student_id = $1 AND s.status = 'graded'
      ORDER BY s.graded_at DESC
      LIMIT $2 OFFSET $3`,
    [childId, limit, offset],
  );
  const total = rows[0] ? Number(rows[0].total) : 0;
  const items = rows.map((r) => ({
    id: r.id, title: r.title, score: r.score, maxScore: r.max_score, gradedAt: r.graded_at,
  }));
  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / limit)) };
}

export async function getGroupRating(childId) {
  const { rows: [group] } = await pool.query(
    `SELECT g.id, g.name
       FROM group_students own_membership
       JOIN groups g ON g.id = own_membership.group_id AND g.deleted_at IS NULL
      WHERE own_membership.student_id = $1 AND own_membership.left_at IS NULL
      ORDER BY g.name
      LIMIT 1`,
    [childId],
  );
  if (!group) return null;

  const { rows } = await pool.query(
    `SELECT u.id AS child_id, u.first_name, u.last_name, sp.coin_balance AS coins,
            COALESCE(ROUND((
              COALESCE((SELECT AVG(hs.score::numeric / NULLIF(h.max_score, 0) * 100)
                          FROM homework_submissions hs
                          JOIN homework h ON h.id = hs.homework_id
                         WHERE hs.student_id = u.id AND h.group_id = $1 AND hs.status = 'graded'), 0)
              + COALESCE((SELECT AVG(tr.score::numeric)
                            FROM test_results tr
                            JOIN tests t ON t.id = tr.test_id
                           WHERE tr.student_id = u.id AND t.group_id = $1 AND tr.finished_at IS NOT NULL), 0)
            ) / NULLIF(
              (CASE WHEN EXISTS (SELECT 1 FROM homework_submissions hs JOIN homework h ON h.id = hs.homework_id WHERE hs.student_id = u.id AND h.group_id = $1 AND hs.status = 'graded') THEN 1 ELSE 0 END)
              + (CASE WHEN EXISTS (SELECT 1 FROM test_results tr JOIN tests t ON t.id = tr.test_id WHERE tr.student_id = u.id AND t.group_id = $1 AND tr.finished_at IS NOT NULL) THEN 1 ELSE 0 END), 0
            )), 0)::int AS avg_score
       FROM group_students gs
       JOIN users u ON u.id = gs.student_id AND u.deleted_at IS NULL
       JOIN student_profiles sp ON sp.user_id = u.id
      WHERE gs.group_id = $1 AND gs.left_at IS NULL
      ORDER BY avg_score DESC, sp.coin_balance DESC, u.first_name, u.last_name`,
    [group.id],
  );

  return {
    groupId: group.id,
    groupName: group.name,
    students: rows.map((r, index) => ({
      childId: r.child_id,
      firstName: r.first_name,
      lastName: r.last_name,
      coins: r.coins,
      avgScore: r.avg_score,
      rank: index + 1,
    })),
  };
}

export async function getHomeworkDetailForParent(parentId, homeworkId) {
  const { rows: [row] } = await pool.query(
    `SELECT h.id, h.title, h.description, h.max_score, g.name AS group_name,
            hs.score, hs.graded_at
       FROM homework_submissions hs
       JOIN homework h ON h.id = hs.homework_id AND h.deleted_at IS NULL
       JOIN groups g ON g.id = h.group_id AND g.deleted_at IS NULL
       JOIN student_profiles sp ON sp.user_id = hs.student_id
      WHERE h.id = $1 AND sp.parent_id = $2 AND hs.status = 'graded'`,
    [homeworkId, parentId],
  );
  if (!row) return null;
  return {
    id: row.id, title: row.title, description: row.description, maxScore: row.max_score,
    groupName: row.group_name, score: row.score, gradedAt: row.graded_at,
    comment: null, mistakes: [],
  };
}

export async function getTestDetailForParent(parentId, testId) {
  const { rows: [row] } = await pool.query(
    `SELECT t.id, t.title, t.questions, t.duration_min, g.name AS group_name,
            tr.answers, tr.score, tr.finished_at
       FROM test_results tr
       JOIN tests t ON t.id = tr.test_id AND t.deleted_at IS NULL
       JOIN groups g ON g.id = t.group_id AND g.deleted_at IS NULL
       JOIN student_profiles sp ON sp.user_id = tr.student_id
      WHERE t.id = $1 AND sp.parent_id = $2 AND tr.finished_at IS NOT NULL`,
    [testId, parentId],
  );
  return row ?? null;
}

function mapChild(r) {
  return {
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    avatarKey: r.avatar_key,
    branchId: r.branch_id,
    coins: r.coin_balance,
    totalDebt: r.total_debt,
    frozen: r.frozen_at !== null,
  };
}
