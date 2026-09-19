import { pool } from '../../config/db.js';

// ---------- филиалы ----------

export function countBranches(orgId, client = pool) {
  return client
    .query(
      `SELECT count(*)::int AS n FROM branches
        WHERE organization_id = $1 AND deleted_at IS NULL`,
      [orgId],
    )
    .then((r) => r.rows[0].n);
}

export function insertBranch({ orgId, name, address, phone, isMain, lat, lng }, client = pool) {
  return client
    .query(
      `INSERT INTO branches (organization_id, name, address, phone, is_main, lat, lng)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, address, phone, is_main, lat, lng, created_at`,
      [orgId, name, address ?? null, phone ?? null, isMain ?? false, lat ?? null, lng ?? null],
    )
    .then((r) => r.rows[0]);
}

/** Филиалы организации + число админов и учеников в каждом. */
export function listBranches(orgId, client = pool) {
  return client
    .query(
      `SELECT b.id, b.name, b.address, b.phone, b.is_main, b.is_archived, b.lat, b.lng, b.created_at,
              (SELECT count(*) FROM users u
                 WHERE u.branch_id = b.id AND u.role = 'admin' AND u.deleted_at IS NULL) AS admins,
              (SELECT count(*) FROM users u
                 WHERE u.branch_id = b.id AND u.role = 'student' AND u.deleted_at IS NULL) AS students,
              (SELECT count(*) FROM users u
                 WHERE u.branch_id = b.id AND u.role = 'mentor' AND u.deleted_at IS NULL) AS mentors,
              (SELECT count(*) FROM groups g
                 WHERE g.branch_id = b.id AND g.deleted_at IS NULL) AS groups,
              -- деньги филиала: сколько получено с учеников и сколько потрачено
              (SELECT COALESCE(SUM(t.amount), 0) FROM transactions t
                 WHERE t.branch_id = b.id AND t.status = 'completed') AS revenue,
              (SELECT COALESCE(SUM(e.amount), 0) FROM expenses e
                 WHERE e.branch_id = b.id AND e.deleted_at IS NULL) AS expenses,
              (SELECT COALESCE(SUM(sp.total_debt), 0) FROM student_profiles sp
                 WHERE sp.branch_id = b.id) AS debt
         FROM branches b
        WHERE b.organization_id = $1 AND b.deleted_at IS NULL
        ORDER BY b.is_main DESC, b.created_at DESC`,
      [orgId],
    )
    .then((r) => r.rows);
}

/** Филиал по id ТОЛЬКО в пределах организации (защита от чужого филиала). */
export function findBranchInOrg(branchId, orgId, client = pool) {
  return client
    .query(
      `SELECT id FROM branches
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [branchId, orgId],
    )
    .then((r) => r.rows[0] ?? null);
}

export function findExpenseInOrg(expenseId, orgId, client = pool) {
  return client
    .query(
      `SELECT e.id, e.branch_id
         FROM expenses e
        WHERE e.id = $1 AND e.organization_id = $2 AND e.deleted_at IS NULL`,
      [expenseId, orgId],
    )
    .then((result) => result.rows[0] ?? null);
}

export function insertOrgExpense({ orgId, branchId, category, amount, spentAt, note, createdBy }, client = pool) {
  return client.query(
    `INSERT INTO expenses (organization_id, branch_id, category, amount, spent_at, note, created_by)
     VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE), $6, $7)
     RETURNING id, branch_id, category, amount, spent_at, note, created_at`,
    [orgId, branchId, category, amount, spentAt ?? null, note ?? null, createdBy],
  ).then((result) => result.rows[0]);
}

export function listOrgExpenses({ orgId, branchId, organizationOnly, from, to, limit, offset }, client = pool) {
  return client.query(
    `SELECT e.id, e.branch_id, b.name AS branch_name, e.category, e.amount, e.spent_at, e.note,
            e.created_at, u.first_name AS created_by_first, u.last_name AS created_by_last
       FROM expenses e
       LEFT JOIN branches b ON b.id = e.branch_id
       JOIN users u ON u.id = e.created_by
      WHERE e.organization_id = $1 AND e.deleted_at IS NULL
        AND ($2::uuid IS NULL OR e.branch_id = $2)
        AND ($3::boolean = false OR e.branch_id IS NULL)
        AND ($4::date IS NULL OR e.spent_at >= $4)
        AND ($5::date IS NULL OR e.spent_at <= $5)
      ORDER BY e.spent_at DESC, e.created_at DESC
      LIMIT $6 OFFSET $7`,
    [orgId, branchId ?? null, organizationOnly, from ?? null, to ?? null, limit, offset],
  ).then((result) => result.rows);
}

export function countOrgExpenses({ orgId, branchId, organizationOnly, from, to }, client = pool) {
  return client.query(
    `SELECT count(*)::int AS n FROM expenses e
      WHERE e.organization_id = $1 AND e.deleted_at IS NULL
        AND ($2::uuid IS NULL OR e.branch_id = $2)
        AND ($3::boolean = false OR e.branch_id IS NULL)
        AND ($4::date IS NULL OR e.spent_at >= $4)
        AND ($5::date IS NULL OR e.spent_at <= $5)`,
    [orgId, branchId ?? null, organizationOnly, from ?? null, to ?? null],
  ).then((result) => result.rows[0].n);
}

export function updateOrgExpense(id, orgId, fields, client = pool) {
  const cols = [];
  const vals = [];
  let i = 1;
  for (const [key, col] of [['category', 'category'], ['amount', 'amount'], ['note', 'note'], ['spentAt', 'spent_at']]) {
    if (fields[key] !== undefined) {
      cols.push(`${col} = $${i++}`);
      vals.push(fields[key]);
    }
  }
  vals.push(id, orgId);
  return client.query(
    `UPDATE expenses SET ${cols.join(', ')}, updated_at = now()
      WHERE id = $${i++} AND organization_id = $${i} AND deleted_at IS NULL
      RETURNING id, branch_id, category, amount, spent_at, note, created_at`,
    vals,
  ).then((result) => result.rows[0] ?? null);
}

export function softDeleteOrgExpense(id, orgId, client = pool) {
  return client.query(
    `UPDATE expenses SET deleted_at = now(), updated_at = now()
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL RETURNING id`,
    [id, orgId],
  ).then((result) => result.rows[0] ?? null);
}

const BRANCH_RETURN = 'id, name, address, phone, is_main, is_archived, lat, lng, created_at';

/** Частичное обновление филиала в пределах своей орг. */
export function updateBranch(id, orgId, fields, client = pool) {
  const cols = [];
  const vals = [];
  let i = 1;
  for (const [key, col] of [
    ['name', 'name'],
    ['address', 'address'],
    ['phone', 'phone'],
    ['lat', 'lat'],
    ['lng', 'lng'],
  ]) {
    if (fields[key] !== undefined) {
      cols.push(`${col} = $${i++}`);
      vals.push(fields[key]);
    }
  }
  if (cols.length === 0) return findBranchFull(id, orgId, client);
  vals.push(id, orgId);
  return client
    .query(
      `UPDATE branches SET ${cols.join(', ')}, updated_at = now()
        WHERE id = $${i++} AND organization_id = $${i} AND deleted_at IS NULL
        RETURNING ${BRANCH_RETURN}`,
      vals,
    )
    .then((r) => r.rows[0] ?? null);
}

export function setBranchArchived(id, orgId, archived, client = pool) {
  return client
    .query(
      `UPDATE branches SET is_archived = $3, updated_at = now()
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
        RETURNING ${BRANCH_RETURN}`,
      [id, orgId, archived],
    )
    .then((r) => r.rows[0] ?? null);
}

export function findBranchFull(id, orgId, client = pool) {
  return client
    .query(
      `SELECT ${BRANCH_RETURN} FROM branches
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [id, orgId],
    )
    .then((r) => r.rows[0] ?? null);
}

/** Админы конкретного филиала (для карточки филиала). */
export function listBranchAdmins(branchId, client = pool) {
  return client
    .query(
      `SELECT id, first_name, last_name, email, status
         FROM users
        WHERE branch_id = $1 AND role = 'admin' AND deleted_at IS NULL
        ORDER BY created_at DESC`,
      [branchId],
    )
    .then((r) => r.rows);
}

/**
 * Группы филиала: с ментором и числом учеников.
 *
 * Раньше отдавались только имя, предмет и цена — а на карточке филиала нужно
 * понимать, живая группа или пустая, и кто её ведёт.
 */
export function listBranchGroups(branchId, client = pool) {
  return client
    .query(
      `SELECT g.id, g.name, g.subject, g.monthly_price,
              g.mentor_id,
              (m.first_name || ' ' || m.last_name) AS mentor_name,
              (SELECT count(*) FROM group_students gs
                 WHERE gs.group_id = g.id) AS students
         FROM groups g
         LEFT JOIN users m ON m.id = g.mentor_id
        WHERE g.branch_id = $1 AND g.deleted_at IS NULL
        ORDER BY g.created_at DESC`,
      [branchId],
    )
    .then((r) => r.rows);
}

/** Ученики филиала — для вкладки «Ученики» в карточке филиала. */
export function listBranchStudents(branchId, client = pool) {
  return client
    .query(
      `SELECT u.id, u.first_name, u.last_name, u.phone, u.status,
              sp.total_debt, sp.coin_balance
         FROM users u
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
        WHERE u.branch_id = $1 AND u.role = 'student' AND u.deleted_at IS NULL
        ORDER BY u.created_at DESC`,
      [branchId],
    )
    .then((r) => r.rows);
}

/** Менторы филиала — сотрудники, которых не видно в списке админов. */
export function listBranchMentors(branchId, client = pool) {
  return client
    .query(
      `SELECT id, first_name, last_name, email, phone, status
         FROM users
        WHERE branch_id = $1 AND role = 'mentor' AND deleted_at IS NULL
        ORDER BY created_at DESC`,
      [branchId],
    )
    .then((r) => r.rows);
}

/**
 * Показатели одного филиала.
 *
 * Те же выражения, что в branchBreakdown по всей организации, — карточка
 * филиала показывала «Ученики», «Месячный доход» и «Общий долг», но сервер
 * этих чисел не отдавал вовсе, и на экране всегда стояли нули.
 */
export function branchStats(branchId, client = pool) {
  return client
    .query(
      `SELECT
         (SELECT count(*) FROM users u
            WHERE u.branch_id = $1 AND u.role = 'student'
              AND u.status = 'active' AND u.deleted_at IS NULL)::int AS students,
         (SELECT count(*) FROM users u
            WHERE u.branch_id = $1 AND u.role = 'mentor' AND u.deleted_at IS NULL)::int AS mentors,
         (SELECT count(*) FROM groups g
            WHERE g.branch_id = $1 AND g.deleted_at IS NULL)::int AS groups,
         (SELECT COALESCE(SUM(i.paid_amount), 0) FROM invoices i
            WHERE i.branch_id = $1) AS revenue,
         (SELECT COALESCE(SUM(e.amount), 0) FROM expenses e
            WHERE e.branch_id = $1 AND e.deleted_at IS NULL) AS expenses,
         (SELECT COALESCE(SUM(sp.total_debt), 0) FROM student_profiles sp
            WHERE sp.branch_id = $1) AS debt`,
      [branchId],
    )
    .then((r) => r.rows[0]);
}

// ---------- админы: правка / заморозка ----------

/** Админ по id ТОЛЬКО в своей орг. */
export function findAdminInOrg(id, orgId, client = pool) {
  return client
    .query(
      `SELECT id FROM users
        WHERE id = $1 AND organization_id = $2 AND role = 'admin' AND deleted_at IS NULL`,
      [id, orgId],
    )
    .then((r) => r.rows[0] ?? null);
}

const ADMIN_RETURN =
  'id, first_name, last_name, email, status, branch_id, phone, monthly_salary';

export function updateAdmin(id, orgId, fields, client = pool) {
  const cols = [];
  const vals = [];
  let i = 1;
  for (const [key, col] of [
    ['firstName', 'first_name'],
    ['lastName', 'last_name'],
    ['branchId', 'branch_id'],
    ['phone', 'phone'],
    ['monthlySalary', 'monthly_salary'],
  ]) {
    if (fields[key] !== undefined) {
      cols.push(`${col} = $${i++}`);
      vals.push(fields[key]);
    }
  }
  if (cols.length === 0) return null;
  vals.push(id, orgId);
  return client
    .query(
      `UPDATE users SET ${cols.join(', ')}, updated_at = now()
        WHERE id = $${i++} AND organization_id = $${i} AND role = 'admin' AND deleted_at IS NULL
        RETURNING ${ADMIN_RETURN}`,
      vals,
    )
    .then((r) => r.rows[0] ?? null);
}

export function setAdminPasswordHash(id, orgId, passwordHash, client = pool) {
  return client
    .query(
      `UPDATE users SET password_hash = $3, updated_at = now()
        WHERE id = $1 AND organization_id = $2 AND role = 'admin' AND deleted_at IS NULL
        RETURNING ${ADMIN_RETURN}`,
      [id, orgId, passwordHash],
    )
    .then((r) => r.rows[0] ?? null);
}

export function setAdminStatus(id, orgId, status, client = pool) {
  return client
    .query(
      `UPDATE users SET status = $3, updated_at = now()
        WHERE id = $1 AND organization_id = $2 AND role = 'admin' AND deleted_at IS NULL
        RETURNING ${ADMIN_RETURN}`,
      [id, orgId, status],
    )
    .then((r) => r.rows[0] ?? null);
}

// ---------- дашборд организации ----------

/** `branchId` — сузить те же итоги до одного филиала, без него организация целиком
 * (Статистика: переключатель «все филиалы / конкретный филиал» на одних и тех же виджетах). */
export function orgTotals(orgId, branchId = null, client = pool) {
  return client
    .query(
      `SELECT
         (SELECT count(*) FROM branches
            WHERE organization_id = $1 AND deleted_at IS NULL
              AND ($2::uuid IS NULL OR id = $2)) AS branches,
         -- EXISTS-проверка филиала — та же причина, что у выручки ниже: люди
         -- считались по users.branch_id без оглядки на то, жив ли сам филиал,
         -- поэтому итог мог быть больше суммы по филиалам из branchBreakdown.
         (SELECT count(*) FROM users u
            WHERE u.organization_id = $1 AND u.role = 'student'
              AND u.status = 'active' AND u.deleted_at IS NULL
              AND EXISTS (SELECT 1 FROM branches b WHERE b.id = u.branch_id AND b.deleted_at IS NULL)
              AND ($2::uuid IS NULL OR u.branch_id = $2)) AS active_students,
         (SELECT count(*) FROM users u
            WHERE u.organization_id = $1 AND u.role = 'admin' AND u.deleted_at IS NULL
              AND EXISTS (SELECT 1 FROM branches b WHERE b.id = u.branch_id AND b.deleted_at IS NULL)
              AND ($2::uuid IS NULL OR u.branch_id = $2)) AS admins,
         (SELECT count(*) FROM users u
            WHERE u.organization_id = $1 AND u.role = 'mentor' AND u.deleted_at IS NULL
              AND EXISTS (SELECT 1 FROM branches b WHERE b.id = u.branch_id AND b.deleted_at IS NULL)
              AND ($2::uuid IS NULL OR u.branch_id = $2)) AS mentors,
         -- Karis 22.08.2026: b.deleted_at IS NULL добавлено в выручку и долг.
         -- Без него удалённый филиал ВЫПАДАЛ из счётчика branches и из
         -- branchBreakdown (там фильтр есть), но его деньги ПРОДОЛЖАЛИ падать
         -- в общий итог. Итог переставал сходиться с разбивкой по филиалам:
         -- доли не давали 100%, а avgRevenue = выручка(с удалёнными) /
         -- число филиалов(без удалённых) завышался. Сейчас удалённых филиалов
         -- нет, поэтому вживую не проявлялось — сработало бы при первом же
         -- удалении. Скоуп «текущее состояние организации» везде одинаковый.
         (SELECT COALESCE(SUM(t.amount), 0) FROM transactions t
            JOIN branches b ON b.id = t.branch_id
           WHERE b.organization_id = $1 AND t.status = 'completed'
             AND b.deleted_at IS NULL
             AND ($2::uuid IS NULL OR b.id = $2)) AS revenue,
         (SELECT COALESCE(SUM(sp.total_debt), 0) FROM student_profiles sp
            JOIN branches b ON b.id = sp.branch_id
           WHERE b.organization_id = $1 AND b.deleted_at IS NULL
             AND ($2::uuid IS NULL OR b.id = $2)) AS outstanding_debt`,
      [orgId, branchId],
    )
    .then((r) => r.rows[0]);
}

/** Разбивка по филиалам: студенты, выручка, долг (для дашборда/обзора). */
export function branchBreakdown(orgId, fromDate = null, client = pool) {
  return client
    .query(
      `SELECT b.id, b.name, b.is_main, b.is_archived,
              (SELECT count(*) FROM users u
                 WHERE u.branch_id = b.id AND u.role = 'student'
                   AND u.status = 'active' AND u.deleted_at IS NULL) AS students,
              (SELECT count(*) FROM users u
                 WHERE u.branch_id = b.id AND u.role = 'admin' AND u.deleted_at IS NULL) AS admins,
              (SELECT COALESCE(SUM(t.amount), 0) FROM transactions t
                 WHERE t.branch_id = b.id AND t.status = 'completed'
                   AND ($2::timestamptz IS NULL OR t.created_at >= $2)) AS revenue,
              (SELECT COALESCE(SUM(sp.total_debt), 0) FROM student_profiles sp
                 WHERE sp.branch_id = b.id) AS debt
         FROM branches b
        WHERE b.organization_id = $1 AND b.deleted_at IS NULL
        ORDER BY b.is_main DESC, b.created_at DESC`,
      [orgId, fromDate],
    )
    .then((r) => r.rows);
}

// ---------- админы ----------

export function insertAdmin(
  { orgId, branchId, firstName, lastName, email, phone, passwordHash },
  client = pool,
) {
  return client
    .query(
      `INSERT INTO users (organization_id, branch_id, role, first_name, last_name, email, phone, password_hash)
       VALUES ($1, $2, 'admin', $3, $4, $5, $6, $7)
       RETURNING id, role, organization_id, branch_id, first_name, last_name, email`,
      [orgId, branchId, firstName, lastName, email, phone ?? null, passwordHash],
    )
    .then((r) => r.rows[0]);
}

/** Админы организации + название их филиала. */
export function listAdmins(orgId, client = pool) {
  return client
    .query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.status, u.created_at,
              u.branch_id, b.name AS branch_name, u.phone, u.monthly_salary
         FROM users u
         JOIN branches b ON b.id = u.branch_id
        WHERE u.organization_id = $1 AND u.role = 'admin' AND u.deleted_at IS NULL
        ORDER BY u.created_at DESC`,
      [orgId],
    )
    .then((r) => r.rows);
}

// ---------- методисты ----------

export function insertMethodist(
  { orgId, firstName, lastName, email, phone, passwordHash },
  client = pool,
) {
  return client
    .query(
      `INSERT INTO users (organization_id, role, first_name, last_name, email, phone, password_hash)
       VALUES ($1, 'methodist', $2, $3, $4, $5, $6)
       RETURNING id, role, organization_id, first_name, last_name, email, phone`,
      [orgId, firstName, lastName, email, phone ?? null, passwordHash],
    )
    .then((r) => r.rows[0]);
}

// ---------- менторы (для выбора в «Взыскании» — сами менторов не заводят) ----------

/** Все менторы организации (по всем филиалам) — только чтение, для выбора
    цели взыскания у CEO. Заводит/редактирует ментора Admin филиала. */
export function listMentors(orgId, client = pool) {
  return client
    .query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.status, u.created_at,
              u.branch_id, b.name AS branch_name, u.phone,
              mp.grade, mp.bio, mp.skills
         FROM users u
         LEFT JOIN branches b ON b.id = u.branch_id
         LEFT JOIN mentor_profiles mp ON mp.user_id = u.id
        WHERE u.organization_id = $1 AND u.role = 'mentor' AND u.deleted_at IS NULL
        ORDER BY u.created_at DESC`,
      [orgId],
    )
    .then((r) => r.rows);
}

export function listMethodists(orgId, client = pool) {
  return client
    .query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.status, u.phone, u.created_at,
               u.monthly_salary
          FROM users u
         WHERE u.organization_id = $1 AND u.role = 'methodist' AND u.deleted_at IS NULL
         ORDER BY u.created_at DESC`,
      [orgId],
    )
    .then((r) => r.rows);
}

export function updateMentorGrade(orgId, mentorId, grade, setBy, client = pool) {
  return client.query(
    `INSERT INTO mentor_profiles (user_id, grade, grade_set_by, grade_set_at)
     SELECT u.id, $3::mentor_grade, $4,
            CASE WHEN $3::mentor_grade IS NULL THEN NULL ELSE now() END
       FROM users u
      WHERE u.id = $2 AND u.organization_id = $1 AND u.role = 'mentor' AND u.deleted_at IS NULL
     ON CONFLICT (user_id) DO UPDATE
       SET grade = EXCLUDED.grade,
           grade_set_by = EXCLUDED.grade_set_by,
           grade_set_at = EXCLUDED.grade_set_at
     RETURNING user_id, grade, grade_set_at`,
    [orgId, mentorId, grade, setBy],
  ).then((r) => r.rows[0] ?? null);
}

export function moveMentorToBranch(orgId, mentorId, branchId, client = pool) {
  return client.query(
    `UPDATE users SET branch_id = $3, updated_at = now()
      WHERE id = $2 AND organization_id = $1 AND role = 'mentor' AND deleted_at IS NULL
      RETURNING id, branch_id`,
    [orgId, mentorId, branchId],
  ).then((r) => r.rows[0] ?? null);
}

export function detachMentorOldBranchGroups(mentorId, newBranchId, client = pool) {
  return client.query(
    `UPDATE groups SET mentor_id = NULL, updated_at = now()
      WHERE mentor_id = $1 AND branch_id <> $2 AND deleted_at IS NULL
      RETURNING id`,
    [mentorId, newBranchId],
  ).then((r) => r.rows);
}

export function insertEmployee({ orgId, branchId, firstName, lastName, email, phone, jobTitle, passwordHash }, client = pool) {
  return client.query(
    `INSERT INTO users (organization_id, branch_id, role, first_name, last_name, email, phone, job_title, password_hash)
     VALUES ($1, $2, 'employee', $3, $4, $5, $6, $7, $8)
     RETURNING id, branch_id, first_name, last_name, email, phone, job_title, status, created_at`,
    [orgId, branchId, firstName, lastName, email, phone ?? null, jobTitle, passwordHash],
  ).then((r) => r.rows[0]);
}

export function listEmployees(orgId, client = pool) {
  return client.query(
    `SELECT u.id, u.branch_id, u.first_name, u.last_name, u.email, u.phone, u.job_title,
            u.monthly_salary, u.status, u.created_at, b.name AS branch_name
       FROM users u JOIN branches b ON b.id = u.branch_id
      WHERE u.organization_id = $1 AND u.role = 'employee' AND u.deleted_at IS NULL
      ORDER BY u.created_at DESC`, [orgId],
  ).then((r) => r.rows);
}

export function updateEmployee(id, orgId, fields, client = pool) {
  const cols = []; const vals = []; let i = 1;
  for (const [key, col] of [['firstName','first_name'],['lastName','last_name'],['branchId','branch_id'],['phone','phone'],['jobTitle','job_title'],['monthlySalary','monthly_salary']]) {
    if (fields[key] !== undefined) { cols.push(`${col} = $${i++}`); vals.push(fields[key]); }
  }
  vals.push(id, orgId);
  return client.query(
    `UPDATE users SET ${cols.join(', ')}, updated_at = now()
      WHERE id = $${i++} AND organization_id = $${i} AND role = 'employee' AND deleted_at IS NULL
      RETURNING id, branch_id, first_name, last_name, email, phone, job_title, monthly_salary, status, created_at`, vals,
  ).then((r) => r.rows[0] ?? null);
}

export function setEmployeeStatus(id, orgId, status, client = pool) {
  return client.query(
    `UPDATE users SET status = $3, updated_at = now() WHERE id = $1 AND organization_id = $2 AND role = 'employee' AND deleted_at IS NULL
     RETURNING id, branch_id, first_name, last_name, email, phone, job_title, monthly_salary, status, created_at`,
    [id, orgId, status],
  ).then((r) => r.rows[0] ?? null);
}

export function setEmployeePasswordHash(id, orgId, passwordHash, client = pool) {
  return client.query(
    `UPDATE users SET password_hash = $3, updated_at = now() WHERE id = $1 AND organization_id = $2 AND role = 'employee' AND deleted_at IS NULL
     RETURNING id, branch_id, first_name, last_name, email, phone, job_title, status, created_at`,
    [id, orgId, passwordHash],
  ).then((r) => r.rows[0] ?? null);
}

// ---------- branch managers ----------

export function insertBranchManager(
  { orgId, branchId, firstName, lastName, email, phone, passwordHash },
  client = pool,
) {
  return client
    .query(
      `INSERT INTO users (organization_id, branch_id, role, first_name, last_name, email, phone, password_hash)
       VALUES ($1, $2, 'branch_manager', $3, $4, $5, $6, $7)
       RETURNING id, role, organization_id, branch_id, first_name, last_name, email`,
      [orgId, branchId, firstName, lastName, email, phone ?? null, passwordHash],
    )
    .then((r) => r.rows[0]);
}

export function listBranchManagers(orgId, client = pool) {
  return client
    .query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.status, u.created_at,
                u.branch_id, b.name AS branch_name, u.phone
          FROM users u
          JOIN branches b ON b.id = u.branch_id
         WHERE u.organization_id = $1 AND u.role = 'branch_manager' AND u.deleted_at IS NULL
         ORDER BY u.created_at DESC`,
      [orgId],
    )
    .then((r) => r.rows);
}

/** Branch Manager по id ТОЛЬКО в пределах организации. */
export function findBranchManagerInOrg(id, orgId, client = pool) {
  return client
    .query(
      `SELECT id FROM users
        WHERE id = $1 AND organization_id = $2 AND role = 'branch_manager' AND deleted_at IS NULL`,
      [id, orgId],
    )
    .then((r) => r.rows[0] ?? null);
}

const BRANCH_MANAGER_RETURN =
  'id, first_name, last_name, email, status, branch_id, phone, created_at';

/** Новый пароль для Branch Manager — тот же сценарий, что у admin/methodist. */
export function setBranchManagerPasswordHash(id, orgId, passwordHash, client = pool) {
  return client
    .query(
      `UPDATE users SET password_hash = $3, updated_at = now()
        WHERE id = $1 AND organization_id = $2 AND role = 'branch_manager' AND deleted_at IS NULL
        RETURNING ${BRANCH_MANAGER_RETURN}`,
      [id, orgId, passwordHash],
    )
    .then((r) => r.rows[0] ?? null);
}

/** Частичное обновление Branch Manager (в т.ч. перенос в другой филиал). */
export function updateBranchManager(id, orgId, fields, client = pool) {
  const cols = [];
  const vals = [];
  let i = 1;
  for (const [key, col] of [
    ['firstName', 'first_name'],
    ['lastName', 'last_name'],
    ['branchId', 'branch_id'],
    ['phone', 'phone'],
  ]) {
    if (fields[key] !== undefined) {
      cols.push(`${col} = $${i++}`);
      vals.push(fields[key]);
    }
  }
  if (cols.length === 0) return findBranchManagerInOrg(id, orgId, client);
  vals.push(id, orgId);
  return client
    .query(
      `UPDATE users SET ${cols.join(', ')}, updated_at = now()
        WHERE id = $${i++} AND organization_id = $${i} AND role = 'branch_manager' AND deleted_at IS NULL
        RETURNING ${BRANCH_MANAGER_RETURN}`,
      vals,
    )
    .then((r) => r.rows[0] ?? null);
}

/** Заморозка / разморозка Branch Manager. */
export function setBranchManagerStatus(id, orgId, status, client = pool) {
  return client
    .query(
      `UPDATE users SET status = $3, updated_at = now()
        WHERE id = $1 AND organization_id = $2 AND role = 'branch_manager' AND deleted_at IS NULL
        RETURNING ${BRANCH_MANAGER_RETURN}`,
      [id, orgId, status],
    )
    .then((r) => r.rows[0] ?? null);
}

/** Soft-delete Branch Manager. */
export function deleteBranchManager(id, orgId, client = pool) {
  return client
    .query(
      `UPDATE users SET deleted_at = now(), updated_at = now()
        WHERE id = $1 AND organization_id = $2 AND role = 'branch_manager' AND deleted_at IS NULL
        RETURNING id`,
      [id, orgId],
    )
    .then((r) => r.rows[0] ?? null);
}

export function findMethodistInOrg(id, orgId, client = pool) {
  return client
    .query(
      `SELECT id FROM users
        WHERE id = $1 AND organization_id = $2 AND role = 'methodist' AND deleted_at IS NULL`,
      [id, orgId],
    )
    .then((r) => r.rows[0] ?? null);
}

export function setMethodistPasswordHash(id, orgId, passwordHash, client = pool) {
  return client
    .query(
      `UPDATE users SET password_hash = $3, updated_at = now()
        WHERE id = $1 AND organization_id = $2 AND role = 'methodist' AND deleted_at IS NULL
        RETURNING id, first_name, last_name, email, status, phone`,
      [id, orgId, passwordHash],
    )
    .then((r) => r.rows[0] ?? null);
}

export function updateMethodist(id, orgId, fields, client = pool) {
  const cols = [];
  const vals = [];
  let i = 1;
  for (const [key, col] of [
    ['firstName', 'first_name'],
    ['lastName', 'last_name'],
    ['phone', 'phone'],
    ['monthlySalary', 'monthly_salary'],
  ]) {
    if (fields[key] !== undefined) {
      cols.push(`${col} = $${i++}`);
      vals.push(fields[key]);
    }
  }
  if (cols.length === 0) return null;
  vals.push(id, orgId);
  return client
    .query(
      `UPDATE users SET ${cols.join(', ')}, updated_at = now()
        WHERE id = $${i++} AND organization_id = $${i} AND role = 'methodist' AND deleted_at IS NULL
        RETURNING id, first_name, last_name, email, phone, monthly_salary`,
      vals,
    )
    .then((r) => r.rows[0] ?? null);
}

export function setMethodistStatus(id, orgId, status, client = pool) {
  return client
    .query(
      `UPDATE users SET status = $3, updated_at = now()
        WHERE id = $1 AND organization_id = $2 AND role = 'methodist' AND deleted_at IS NULL
        RETURNING id, first_name, last_name, email, phone`,
      [id, orgId, status],
    )
    .then((r) => r.rows[0] ?? null);
}

// ---------- организация (профиль партнёра, Settings) ----------

export function getOrganization(orgId, client = pool) {
  return client
    .query(
      `SELECT id, name, domain, status, plan, lesson_duration_min,
              coins_per_student, created_at
         FROM organizations
        WHERE id = $1 AND deleted_at IS NULL`,
      [orgId],
    )
    .then((r) => r.rows[0] ?? null);
}

export function updateOrganization(orgId, fields, client = pool) {
  const cols = [];
  const vals = [];
  let i = 1;
  for (const [key, col] of [
    ['name', 'name'],
    ['domain', 'domain'],
    ['lessonDurationMin', 'lesson_duration_min'],
    ['coinsPerStudent', 'coins_per_student'],
  ]) {
    if (fields[key] !== undefined) {
      cols.push(`${col} = $${i++}`);
      vals.push(fields[key]);
    }
  }
  if (cols.length === 0) return getOrganization(orgId, client);
  vals.push(orgId);
  return client
    .query(
      `UPDATE organizations SET ${cols.join(', ')}, updated_at = now()
        WHERE id = $${i} AND deleted_at IS NULL
        RETURNING id, name, domain, status, plan, lesson_duration_min,
                  coins_per_student, created_at`,
      vals,
    )
    .then((r) => r.rows[0] ?? null);
}

// ---------- студенты организации (Super Students страница) ----------

export async function listOrgStudents(orgId, { search, frozen, page, limit }, client = pool) {
  const conds = ["u.organization_id = $1", "u.role = 'student'", 'u.deleted_at IS NULL'];
  const vals = [orgId];
  let i = 2;
  if (search) {
    conds.push(`(u.first_name ILIKE $${i} OR u.last_name ILIKE $${i} OR u.phone ILIKE $${i})`);
    vals.push(`%${search}%`);
    i++;
  }
  if (frozen === true) conds.push("u.status = 'frozen'");
  else if (frozen === false) conds.push("u.status <> 'frozen'");
  const where = conds.join(' AND ');
  const offset = (page - 1) * limit;
  const [rows, cnt] = await Promise.all([
    client.query(
      `SELECT u.id, u.first_name, u.last_name, u.phone, u.status, u.created_at,
              b.name AS branch_name
         FROM users u
         LEFT JOIN branches b ON b.id = u.branch_id
        WHERE ${where}
        ORDER BY u.created_at DESC
        LIMIT $${i} OFFSET $${i + 1}`,
      [...vals, limit, offset],
    ),
    client.query(`SELECT count(*)::int AS n FROM users u WHERE ${where}`, vals),
  ]);
  return { rows: rows.rows, total: cnt.rows[0].n };
}

/** Сколько учеников заведено за месяц — для «Студенты: динамика набора» (period=12m).
 * По `created_at` самого users, не student_profiles: профиль создаётся в той же
 * транзакции, что и сам пользователь, дата не разъедется. */
export function newStudentsSeriesMonthly(orgId, fromDate, branchId = null, client = pool) {
  return client
    .query(
      `SELECT date_trunc('month', u.created_at)::date AS month, count(*)::int AS cnt
         FROM users u
        WHERE u.organization_id = $1 AND u.role = 'student' AND u.deleted_at IS NULL
          AND u.created_at >= $2
          AND ($3::uuid IS NULL OR u.branch_id = $3)
        GROUP BY month
        ORDER BY month`,
      [orgId, fromDate, branchId],
    )
    .then((r) => r.rows);
}

/** То же самое по дням — для 7d/30d/90d, тот же принцип, что и у revenueSeries. */
export function newStudentsSeriesDaily(orgId, fromDate, branchId = null, client = pool) {
  return client
    .query(
      `SELECT date_trunc('day', u.created_at)::date AS day, count(*)::int AS cnt
         FROM users u
        WHERE u.organization_id = $1 AND u.role = 'student' AND u.deleted_at IS NULL
          AND u.created_at >= $2
          AND ($3::uuid IS NULL OR u.branch_id = $3)
        GROUP BY day
        ORDER BY day`,
      [orgId, fromDate, branchId],
    )
    .then((r) => r.rows);
}

export function softDeleteOrgStudent(id, orgId, client = pool) {
  return client
    .query(
      `UPDATE users SET deleted_at = now(), updated_at = now()
        WHERE id = $1 AND organization_id = $2 AND role = 'student' AND deleted_at IS NULL
        RETURNING id`,
      [id, orgId],
    )
    .then((r) => r.rows[0] ?? null);
}

export function findStudentInOrg(id, orgId, client = pool) {
  return client
    .query(
      `SELECT u.id, u.first_name, u.last_name, u.phone, u.status, u.login_code, u.created_at,
              sp.coin_balance, sp.total_debt, sp.parent_id, sp.birth_date,
              sp.frozen_at, sp.frozen_reason, b.name AS branch_name,
              EXISTS (
                SELECT 1 FROM invoices i
                 WHERE i.student_id = u.id AND i.status = 'overdue' AND i.deleted_at IS NULL
              ) AS has_overdue_invoice
         FROM users u
         JOIN student_profiles sp ON sp.user_id = u.id
         LEFT JOIN branches b ON b.id = u.branch_id
        WHERE u.id = $1 AND u.organization_id = $2 AND u.role = 'student' AND u.deleted_at IS NULL`,
      [id, orgId],
    )
    .then((r) => r.rows[0] ?? null);
}

/** Активные группы ученика — тот же запрос, что и у Admin (studentGroups в
 * admin.repository.js), продублирован здесь: у него нет branch/org-скоупа
 * (id ученика уже проверен в findStudentInOrg), а модуль владеет своим repo. */
export function studentGroupsOrg(studentId, client = pool) {
  return client
    .query(
      `SELECT g.id, g.name, g.subject, g.monthly_price,
              m.first_name AS mentor_first, m.last_name AS mentor_last
         FROM group_students gs
         JOIN groups g ON g.id = gs.group_id
         LEFT JOIN users m ON m.id = g.mentor_id
        WHERE gs.student_id = $1 AND gs.left_at IS NULL AND g.deleted_at IS NULL
        ORDER BY g.name`,
      [studentId],
    )
    .then((r) => r.rows);
}

// ---------- группы организации (Super Groups страница) ----------

export function listOrgGroups(orgId, client = pool) {
  return client
    .query(
      `SELECT g.id, g.name, g.subject, g.monthly_price, g.schedule, g.room,
              g.is_archived, g.created_at, b.name AS branch_name,
              CASE WHEN m.id IS NULL THEN NULL
                   ELSE m.first_name || ' ' || m.last_name END AS mentor_name,
              (SELECT count(*) FROM group_students gs WHERE gs.group_id = g.id) AS students_count
         FROM groups g
         JOIN branches b ON b.id = g.branch_id
         LEFT JOIN users m ON m.id = g.mentor_id
        WHERE b.organization_id = $1 AND g.deleted_at IS NULL
        ORDER BY g.is_archived, g.name`,
      [orgId],
    )
    .then((r) => r.rows);
}

export function setOrgGroupArchived(id, orgId, archived, client = pool) {
  return client
    .query(
      `UPDATE groups g
          SET is_archived = $3,
              archived_at = CASE WHEN $3 THEN now() ELSE NULL END,
              updated_at = now()
         FROM branches b
        WHERE g.id = $1 AND g.branch_id = b.id AND b.organization_id = $2 AND g.deleted_at IS NULL
        RETURNING g.id`,
      [id, orgId, archived],
    )
    .then((r) => r.rows[0] ?? null);
}

export function softDeleteOrgGroup(id, orgId, client = pool) {
  return client
    .query(
      `UPDATE groups g SET deleted_at = now(), updated_at = now()
         FROM branches b
        WHERE g.id = $1 AND g.branch_id = b.id AND b.organization_id = $2 AND g.deleted_at IS NULL
        RETURNING g.id`,
      [id, orgId],
    )
    .then((r) => r.rows[0] ?? null);
}

export function findGroupInOrg(id, orgId, client = pool) {
  return client
    .query(
      `SELECT g.id, g.name, g.subject, g.monthly_price, g.schedule, g.room,
              g.is_archived, g.created_at, g.mentor_id, b.name AS branch_name,
              m.first_name AS mentor_first, m.last_name AS mentor_last
         FROM groups g
         JOIN branches b ON b.id = g.branch_id
         LEFT JOIN users m ON m.id = g.mentor_id
        WHERE g.id = $1 AND b.organization_id = $2 AND g.deleted_at IS NULL`,
      [id, orgId],
    )
    .then((r) => r.rows[0] ?? null);
}

/** Состав группы — тот же запрос, что и groupStudents в admin.repository.js
 * (id группы уже проверен в findGroupInOrg, branch/org-скоуп здесь не нужен). */
export function groupStudentsOrg(groupId, client = pool) {
  return client
    .query(
      `SELECT u.id, u.first_name, u.last_name, u.phone, u.status,
              sp.total_debt, sp.coin_balance, gs.joined_at
         FROM group_students gs
         JOIN users u ON u.id = gs.student_id
         JOIN student_profiles sp ON sp.user_id = u.id
        WHERE gs.group_id = $1 AND gs.left_at IS NULL AND u.deleted_at IS NULL
        ORDER BY u.first_name`,
      [groupId],
    )
    .then((r) => r.rows);
}

// ---------- объявления организации (Super Announcements) ----------

/** Сколько адресатов у объявления по типу аудитории (в пределах орг). */
export function countAnnouncementRecipients(orgId, targetType, branchId = null, client = pool) {
  const roleByTarget = {
    'all-staff': ['admin', 'mentor', 'methodist'],
    'all-admins': ['admin'],
    'all-mentors': ['mentor'],
    'all-parents': ['parent'],
    'all-students': ['student'],
    'all-families': ['student', 'parent'],
  };
  const roles = roleByTarget[targetType] ?? [];
  return client
    .query(
      `SELECT count(*)::int AS n FROM users
        WHERE organization_id = $1 AND role = ANY($2)
          AND status = 'active' AND deleted_at IS NULL
          AND ($3::uuid IS NULL OR branch_id = $3)`,
      [orgId, roles, branchId],
    )
    .then((r) => r.rows[0].n);
}

/** id активных студентов орг — адресаты Telegram-доставки для parent/student рассылок. */
export function orgActiveStudentIds(orgId, branchId = null, client = pool) {
  return client
    .query(
      `SELECT id FROM users
        WHERE organization_id = $1 AND role = 'student'
          AND status = 'active' AND deleted_at IS NULL
          AND ($2::uuid IS NULL OR branch_id = $2)`,
      [orgId, branchId],
    )
    .then((r) => r.rows.map((row) => row.id));
}

export function insertAnnouncement(
  { orgId, senderId, title, body, targetType, recipientCount, branchId = null, expiresAt, imageUrl = null, imageKey = null },
  client = pool,
) {
  return client
    .query(
      `INSERT INTO org_announcements
         (organization_id, sender_id, title, body, target_type, recipient_count, branch_id, expires_at, image_url, image_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, title, body, target_type, recipient_count, branch_id, expires_at, image_url, image_key, created_at`,
      [orgId, senderId, title, body, targetType, recipientCount, branchId, expiresAt, imageUrl, imageKey],
    )
    .then((r) => r.rows[0]);
}

export function listAnnouncements(orgId, branchId = null, client = pool) {
  return client
    .query(
      `SELECT a.id, a.title, a.body, a.target_type, a.recipient_count, a.branch_id, a.expires_at, a.image_url, a.image_key, a.created_at,
              (s.first_name || ' ' || s.last_name) AS sender_name, s.role AS sender_role,
              b.name AS branch_name
         FROM org_announcements a
         LEFT JOIN users s ON s.id = a.sender_id
         LEFT JOIN branches b ON b.id = a.branch_id
        WHERE a.organization_id = $1 AND a.deleted_at IS NULL
          AND ($2::uuid IS NULL OR a.branch_id IS NULL OR a.branch_id = $2)
        ORDER BY a.created_at DESC`,
      [orgId, branchId],
    )
    .then((r) => r.rows);
}

export function organizationGroupIds(orgId, branchId = null, client = pool) {
  return client.query(
    `SELECT g.id
       FROM groups g
       JOIN branches b ON b.id = g.branch_id
      WHERE b.organization_id = $1
        AND b.deleted_at IS NULL AND g.deleted_at IS NULL
        AND ($2::uuid IS NULL OR g.branch_id = $2)`,
    [orgId, branchId],
  ).then((r) => r.rows.map((row) => row.id));
}

export function softDeleteAnnouncement(id, orgId, client = pool) {
  return client
    .query(
      `UPDATE org_announcements SET deleted_at = now()
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
        RETURNING id`,
      [id, orgId],
    )
    .then((r) => r.rows[0] ?? null);
}

// ---------- аудит-лог организации (Super Audit) ----------

export function insertAudit(entry, client = pool) {
  const {
    orgId, actorId, actorName, actorRole, action,
    entityType, entityId, entityLabel, success, ip, userAgent, meta,
  } = entry;
  return client
    .query(
      // actor_name не передан → берём из users по actor_id (денормализация: аккаунт
      // могут позже удалить, а в аудите имя должно остаться).
      `INSERT INTO audit_log
         (organization_id, actor_id, actor_name, actor_role, action,
          entity_type, entity_id, entity_label, success, ip, user_agent, meta)
       VALUES ($1, $2,
               COALESCE($3, (SELECT first_name || ' ' || last_name FROM users WHERE id = $2)),
               $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
       RETURNING id`,
      [
        orgId, actorId ?? null, actorName ?? null, actorRole ?? null, action,
        entityType ?? null, entityId ?? null, entityLabel ?? null,
        success ?? true, ip ?? null, userAgent ?? null,
        meta ? JSON.stringify(meta) : null,
      ],
    )
    .then((r) => r.rows[0]);
}

export function listAudit(orgId, limit = 200, client = pool) {
  return client
    .query(
      `SELECT id, actor_id, actor_name, actor_role, action, entity_type,
              entity_id, entity_label, success, ip, user_agent, meta, created_at
         FROM audit_log
        WHERE organization_id = $1
        ORDER BY created_at DESC
        LIMIT $2`,
      [orgId, limit],
    )
    .then((r) => r.rows);
}

// ---------- статистика организации (Super Stats) ----------

/** Выручка по дням за период (из завершённых транзакций филиалов орг). */
export function revenueSeries(orgId, fromDate, branchId = null, client = pool) {
  return client
    .query(
      `SELECT date_trunc('day', t.created_at)::date AS day,
              COALESCE(SUM(t.amount), 0) AS revenue
         FROM transactions t
         JOIN branches b ON b.id = t.branch_id
        WHERE b.organization_id = $1 AND t.status = 'completed'
          AND t.created_at >= $2
          AND ($3::uuid IS NULL OR b.id = $3)
        GROUP BY day
        ORDER BY day`,
      [orgId, fromDate, branchId],
    )
    .then((r) => r.rows);
}

/** Тот же ряд, но по месяцам — для «Статистики» за 12 месяцев (period=12m):
 * день-в-день график на год растягивался бы в нечитаемую гребёнку. */
export function revenueSeriesMonthly(orgId, fromDate, branchId = null, client = pool) {
  return client
    .query(
      `SELECT date_trunc('month', t.created_at)::date AS month,
              COALESCE(SUM(t.amount), 0) AS revenue
         FROM transactions t
         JOIN branches b ON b.id = t.branch_id
        WHERE b.organization_id = $1 AND t.status = 'completed'
          AND t.created_at >= $2
          AND ($3::uuid IS NULL OR b.id = $3)
        GROUP BY month
        ORDER BY month`,
      [orgId, fromDate, branchId],
    )
    .then((r) => r.rows);
}

/** Разбивка выручки по способу оплаты (за период). */
export function revenueByMethod(orgId, fromDate, branchId = null, client = pool) {
  return client
    .query(
      `SELECT t.method, COALESCE(SUM(t.amount), 0) AS amount
         FROM transactions t
         JOIN branches b ON b.id = t.branch_id
        WHERE b.organization_id = $1 AND t.status = 'completed'
          AND t.created_at >= $2
          AND ($3::uuid IS NULL OR b.id = $3)
        GROUP BY t.method`,
      [orgId, fromDate, branchId],
    )
    .then((r) => r.rows);
}

// ---------- посещаемость организации (Super Attendance страница) ----------

export function orgAttendance(orgId, { groupId, date }, client = pool) {
  const conds = ['b.organization_id = $1'];
  const vals = [orgId];
  let i = 2;
  if (groupId) { conds.push(`a.group_id = $${i++}`); vals.push(groupId); }
  if (date) { conds.push(`a.lesson_date = $${i++}`); vals.push(date); }
  return client
    .query(
      `SELECT a.id, a.group_id, a.student_id, a.lesson_date, a.status,
              u.first_name, u.last_name, g.name AS group_name
         FROM attendance a
         JOIN branches b ON b.id = a.branch_id
         JOIN users u ON u.id = a.student_id
         JOIN groups g ON g.id = a.group_id
        WHERE ${conds.join(' AND ')}
        ORDER BY a.lesson_date DESC
        LIMIT 500`,
      vals,
    )
    .then((r) => r.rows);
}

// ---------- методики / цены абонемента (Super Settings — цена ставится один раз на методику) ----------

/** Методики организации с ценой и числом групп, которые её уже используют —
 * чтобы CEO видел, скольких абонемент затронет при смене цены. */
export function listTrainingTypesWithPrice(orgId, client = pool) {
  return client
    .query(
      `SELECT tt.id, tt.name, tt.icon, tt.price, tt.max_students, tt.is_archived,
              (SELECT count(*)::int FROM groups g
                 WHERE g.training_type_id = tt.id AND g.deleted_at IS NULL) AS groups_count
         FROM training_types tt
        WHERE tt.organization_id = $1 AND tt.deleted_at IS NULL
        ORDER BY tt.sort_order ASC, tt.created_at DESC`,
      [orgId],
    )
    .then((r) => r.rows);
}

/** maxStudents === undefined -> не трогаем текущее значение (частичное обновление). */
/** CEO может вернуть методику из архива — иначе назначенная цена молча
 * ничего не даёт: у admin/branch_manager архивные методики не выбираемы
 * (listPricedTrainingTypes фильтрует is_archived=false), а на странице CEO
 * это никак не было видно, что и привело к путанице. */
export function setTrainingTypeArchived(id, orgId, archived, client = pool) {
  return client
    .query(
      `UPDATE training_types SET is_archived = $3, updated_at = now()
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
        RETURNING id, name, icon, price, max_students, is_archived`,
      [id, orgId, archived],
    )
    .then((r) => r.rows[0] ?? null);
}

export function setTrainingTypePrice(id, orgId, price, maxStudents, client = pool) {
  return client
    .query(
      `UPDATE training_types
          SET price = $3, max_students = COALESCE($4, max_students), updated_at = now()
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
        RETURNING id, name, icon, price, max_students`,
      [id, orgId, price, maxStudents ?? null],
    )
    .then((r) => r.rows[0] ?? null);
}

// ---------- анонсы платформы (Main Admin → нам) — read-only для CEO ----------

/** Раньше Main Admin писал в platform_announcements, а CEO их вообще не мог
 * прочитать — не было ни роута, ни фронт-страницы (баг, найден 11.08.2026).
 * `all-partners`/`all-ceo` — видно всем; `specific` — только если наша
 * organization_id есть в platform_announcement_recipients. */
// ---------- каталог платных фич + свои заявки (CEO не переключает сам) ----------

export function listActiveAddonCatalog(client = pool) {
  return client
    .query(`SELECT feature_key, label, price FROM platform_addon_prices WHERE is_active = true ORDER BY created_at ASC`)
    .then((r) => r.rows);
}

export function getOwnFeatureFlags(orgId, client = pool) {
  return client
    .query(`SELECT feature_key, enabled FROM org_feature_flags WHERE organization_id = $1`, [orgId])
    .then((r) => r.rows);
}

export function findPendingFeatureRequest(orgId, featureKey, type, client = pool) {
  return client
    .query(
      `SELECT id FROM platform_feature_requests
        WHERE organization_id = $1 AND feature_key = $2 AND type = $3 AND status = 'pending'`,
      [orgId, featureKey, type],
    )
    .then((r) => r.rows[0] ?? null);
}

export function insertFeatureRequest({ orgId, featureKey, type, note, requestedBy }, client = pool) {
  return client
    .query(
      `INSERT INTO platform_feature_requests (organization_id, feature_key, type, note, requested_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [orgId, featureKey, type, note ?? null, requestedBy],
    )
    .then((r) => r.rows[0]);
}

export function listOwnFeatureRequests(orgId, client = pool) {
  return client
    .query(
      `SELECT fr.*, ap.label AS feature_label
         FROM platform_feature_requests fr
         LEFT JOIN platform_addon_prices ap ON ap.feature_key = fr.feature_key
        WHERE fr.organization_id = $1
        ORDER BY fr.created_at DESC`,
      [orgId],
    )
    .then((r) => r.rows);
}

// ---------- свой биллинг (access_until/status + журнал) — read-only для CEO ----------

export function getOwnAccessInfo(orgId, client = pool) {
  return client
    .query(`SELECT status, access_until FROM organizations WHERE id = $1`, [orgId])
    .then((r) => r.rows[0] ?? null);
}

export function listOwnLedger(orgId, client = pool) {
  return client
    .query(
      `SELECT p.*, ap.label AS feature_label
         FROM platform_org_payments p
         LEFT JOIN platform_addon_prices ap ON ap.feature_key = p.feature_key
        WHERE p.organization_id = $1
        ORDER BY p.created_at DESC`,
      [orgId],
    )
    .then((r) => r.rows);
}

export function listPlatformAnnouncementsForOrg(orgId, client = pool) {
  return client
    .query(
      `SELECT a.id, a.title, a.body, a.target_type, a.created_at
         FROM platform_announcements a
        WHERE a.deleted_at IS NULL
          AND (
            a.target_type IN ('all-partners', 'all-ceo')
            OR (a.target_type = 'specific' AND EXISTS (
                  SELECT 1 FROM platform_announcement_recipients r
                   WHERE r.announcement_id = a.id AND r.organization_id = $1
                ))
          )
        ORDER BY a.created_at DESC`,
      [orgId],
    )
    .then((r) => r.rows);
}
