import { pool } from '../../config/db.js';

const PUBLIC_COLUMNS = `id, organization_id, branch_id, role, status,
  first_name, last_name, phone, email, avatar_key, is_archived, created_at, updated_at`;

// Тот же набор, но с префиксом таблицы — для запросов с JOIN. Без него
// `created_at` и `updated_at`, которые есть и в users, и в mentor_profiles,
// делают выборку неоднозначной, и Postgres отвечает 42702.
const USER_COLUMNS_PREFIXED = PUBLIC_COLUMNS
  .split(',')
  .map((c) => `u.${c.trim()}`)
  .join(', ');

/**
 * Карточка ментора подтягивается LEFT JOIN'ом: строки в mentor_profiles может
 * не быть (ментор её ещё не заполнял), и это не повод не отдать пользователя.
 * Для остальных ролей поля просто NULL.
 */
export async function findById(id, db = pool) {
  const { rows: [user] } = await db.query(
    `SELECT ${USER_COLUMNS_PREFIXED},
            mp.bio, mp.skills, mp.grade, mp.grade_set_at
       FROM users u
       LEFT JOIN mentor_profiles mp ON mp.user_id = u.id
      WHERE u.id = $1 AND u.deleted_at IS NULL`,
    [id],
  );
  return user ?? null;
}

/**
 * Карточка ментора. UPSERT, а не UPDATE: строки может ещё не существовать —
 * ментор заполняет её впервые. Грейд здесь не трогается вообще, для него
 * отдельный путь через админский модуль.
 */
export async function upsertMentorProfile(userId, { bio, skills }) {
  const { rows: [row] } = await pool.query(
    `INSERT INTO mentor_profiles (user_id, bio, skills)
          VALUES ($1, $2, COALESCE($3::text[], '{}'))
     ON CONFLICT (user_id) DO UPDATE
            SET bio        = COALESCE($2, mentor_profiles.bio),
                skills     = COALESCE($3::text[], mentor_profiles.skills),
                updated_at = now()
       RETURNING bio, skills, grade, grade_set_at`,
    [userId, bio ?? null, skills ?? null],
  );
  return row ?? null;
}

/** Список пользователей филиала с фильтром по роли/статусу и пагинацией. */
export async function findByBranch({ branchId, role, status, limit, offset }) {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}
       FROM users
      WHERE branch_id = $1 AND deleted_at IS NULL
        AND ($2::user_role   IS NULL OR role = $2)
        AND ($3::user_status IS NULL OR status = $3)
      ORDER BY created_at DESC
      LIMIT $4 OFFSET $5`,
    [branchId, role ?? null, status ?? null, limit, offset],
  );
  return rows;
}

export async function countByBranch({ branchId, role, status }) {
  const { rows: [{ count }] } = await pool.query(
    `SELECT count(*)::int AS count
       FROM users
      WHERE branch_id = $1 AND deleted_at IS NULL
        AND ($2::user_role   IS NULL OR role = $2)
        AND ($3::user_status IS NULL OR status = $3)`,
    [branchId, role ?? null, status ?? null],
  );
  return count;
}

/**
 * Единый каталог людей организации. Scope передаётся только из JWT-сервиса:
 * клиент никогда не выбирает organization_id/branch_id сам.
 *
 * Финансовые суммы агрегируются из первичных документов. `total_debt` оставлен
 * рядом как контрольное значение, но UI использует рассчитанный invoiceDebt.
 */
export async function findDirectory({
  organizationId, branchId, mentorId, role, status, search, limit, offset,
}) {
  const { rows } = await pool.query(
    `WITH invoice_totals AS (
       SELECT student_id,
              COALESCE(sum(total_amount) FILTER (WHERE status <> 'cancelled' AND deleted_at IS NULL), 0) AS billed,
              COALESCE(sum(paid_amount) FILTER (WHERE status <> 'cancelled' AND deleted_at IS NULL), 0) AS paid,
              COALESCE(sum(total_amount - paid_amount) FILTER (
                WHERE status IN ('pending', 'partially_paid', 'overdue') AND deleted_at IS NULL
              ), 0) AS invoice_debt,
              COALESCE(sum(total_amount - paid_amount) FILTER (
                WHERE status = 'overdue' AND deleted_at IS NULL
              ), 0) AS overdue
         FROM invoices
        GROUP BY student_id
     ), mentor_students AS (
       SELECT DISTINCT gs.student_id
         FROM groups g
         JOIN group_students gs ON gs.group_id = g.id AND gs.left_at IS NULL
        WHERE ($3::uuid IS NOT NULL AND g.mentor_id = $3)
          AND g.deleted_at IS NULL
     )
     SELECT u.id, u.organization_id, u.branch_id, u.role, u.status,
            u.first_name, u.last_name, u.phone, u.email, u.avatar_key,
            u.is_archived, u.created_at, u.updated_at,
            b.name AS branch_name, o.name AS organization_name,
            sp.parent_id, sp.coin_balance, sp.total_debt,
            COALESCE(it.billed, 0) AS billed,
            COALESCE(it.paid, 0) AS paid,
            COALESCE(it.invoice_debt, 0) AS invoice_debt,
            COALESCE(it.overdue, 0) AS overdue,
            CASE WHEN u.role = 'parent' THEN (
              SELECT count(*)::int FROM student_profiles children WHERE children.parent_id = u.id
            ) ELSE NULL END AS children_count
       FROM users u
       LEFT JOIN organizations o ON o.id = u.organization_id
       LEFT JOIN branches b ON b.id = u.branch_id
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       LEFT JOIN invoice_totals it ON it.student_id = u.id
      WHERE u.deleted_at IS NULL
        AND ($1::uuid IS NULL OR u.organization_id = $1)
        AND ($2::uuid IS NULL OR u.branch_id = $2)
        AND ($3::uuid IS NULL OR u.id = $3 OR u.id IN (SELECT student_id FROM mentor_students))
        AND ($4::text IS NULL OR u.role::text = $4)
        AND ($5::text IS NULL OR u.status::text = $5)
        AND ($6::text IS NULL OR concat_ws(' ', u.first_name, u.last_name, u.phone, u.email) ILIKE '%' || $6 || '%')
      ORDER BY
        CASE u.role::text
          WHEN 'ceo' THEN 1 WHEN 'branch_manager' THEN 2 WHEN 'admin' THEN 3
          WHEN 'finance_manager' THEN 4 WHEN 'methodist' THEN 5 WHEN 'mentor' THEN 6
          WHEN 'parent' THEN 7 WHEN 'student' THEN 8 ELSE 9
        END,
        u.first_name, u.last_name
      LIMIT $7 OFFSET $8`,
    [organizationId ?? null, branchId ?? null, mentorId ?? null, role ?? null,
      status ?? null, search?.trim() || null, limit, offset],
  );
  return rows;
}

export async function countDirectory({ organizationId, branchId, mentorId, role, status, search }) {
  const { rows: [{ count }] } = await pool.query(
    `SELECT count(DISTINCT u.id)::int AS count
       FROM users u
      WHERE u.deleted_at IS NULL
        AND ($1::uuid IS NULL OR u.organization_id = $1)
        AND ($2::uuid IS NULL OR u.branch_id = $2)
        AND ($3::uuid IS NULL OR u.id = $3 OR EXISTS (
          SELECT 1 FROM groups g
          JOIN group_students gs ON gs.group_id = g.id AND gs.left_at IS NULL
          WHERE g.mentor_id = $3 AND g.deleted_at IS NULL AND gs.student_id = u.id
        ))
        AND ($4::text IS NULL OR u.role::text = $4)
        AND ($5::text IS NULL OR u.status::text = $5)
        AND ($6::text IS NULL OR concat_ws(' ', u.first_name, u.last_name, u.phone, u.email) ILIKE '%' || $6 || '%')`,
    [organizationId ?? null, branchId ?? null, mentorId ?? null, role ?? null,
      status ?? null, search?.trim() || null],
  );
  return count;
}

/** Обновление собственного профиля (ограниченный набор полей). */
export async function updateProfile(id, { firstName, lastName, email, avatarKey }) {
  const { rows: [user] } = await pool.query(
    `UPDATE users
        SET first_name = COALESCE($2, first_name),
            last_name  = COALESCE($3, last_name),
            email      = COALESCE($4, email),
            avatar_key = COALESCE($5, avatar_key),
            updated_at = now()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING ${PUBLIC_COLUMNS}`,
    [id, firstName ?? null, lastName ?? null, email ?? null, avatarKey ?? null],
  );
  return user ?? null;
}
