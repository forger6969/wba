import { pool } from '../../config/db.js';

/**
 * K-ADMIN repository — всё жёстко скоуплено по branch_id (филиал админа).
 * organizationId проставляется при вставках (мульти-аренда).
 * Функции с параметром `client` умеют работать внутри транзакции.
 */

// ==================== ДАШБОРД ФИЛИАЛА ====================

export function branchDashboard(branchId, client = pool) {
  return client
    .query(
      `SELECT
         (SELECT COALESCE(SUM(t.amount), 0) FROM transactions t
            WHERE t.branch_id = $1 AND t.status = 'completed') AS revenue_total,
         (SELECT COALESCE(SUM(t.amount), 0) FROM transactions t
            WHERE t.branch_id = $1 AND t.status = 'completed'
              AND t.created_at >= date_trunc('month', now())) AS revenue_month,
         (SELECT COALESCE(SUM(e.amount), 0) FROM expenses e
            WHERE e.branch_id = $1 AND e.deleted_at IS NULL) AS expenses_total,
         (SELECT COALESCE(SUM(e.amount), 0) FROM expenses e
            WHERE e.branch_id = $1 AND e.deleted_at IS NULL
              AND e.spent_at >= date_trunc('month', now())::date) AS expenses_month,
         (SELECT COALESCE(SUM(sp.total_debt), 0) FROM student_profiles sp
            WHERE sp.branch_id = $1) AS outstanding_debt,
         (SELECT count(*) FROM users u
            WHERE u.branch_id = $1 AND u.role = 'student'
              AND u.status = 'active' AND u.deleted_at IS NULL) AS active_students,
         (SELECT count(*) FROM groups g
            WHERE g.branch_id = $1 AND g.is_archived = false AND g.deleted_at IS NULL) AS groups,
         (SELECT count(*) FROM invoices i
            WHERE i.branch_id = $1 AND i.status = 'overdue' AND i.deleted_at IS NULL) AS overdue_invoices,
         (SELECT count(*) FROM users u
            WHERE u.branch_id = $1 AND u.role = 'student'
              AND u.created_at >= date_trunc('month', now())) AS new_students_month,
         (SELECT count(*) FROM users u
            WHERE u.branch_id = $1 AND u.role = 'student' AND u.status = 'dropped'
              AND u.deleted_at IS NOT NULL AND u.deleted_at >= date_trunc('month', now())) AS dropped_students_month`,
      [branchId],
    )
    .then((r) => r.rows[0]);
}

// ==================== РАСХОДЫ ====================

export function insertExpense(
  { orgId, branchId, category, amount, spentAt, note, createdBy },
  client = pool,
) {
  return client
    .query(
      `INSERT INTO expenses (organization_id, branch_id, category, amount, spent_at, note, created_by)
       VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE), $6, $7)
       RETURNING id, category, amount, spent_at, note, created_at`,
      [orgId, branchId, category, amount, spentAt ?? null, note ?? null, createdBy],
    )
    .then((r) => r.rows[0]);
}

export function listExpenses({ branchId, from, to, limit, offset }, client = pool) {
  return client
    .query(
      `SELECT e.id, e.category, e.amount, e.spent_at, e.note, e.created_at,
              u.first_name AS created_by_first, u.last_name AS created_by_last
         FROM expenses e
         JOIN users u ON u.id = e.created_by
        WHERE e.branch_id = $1 AND e.deleted_at IS NULL
          AND ($2::date IS NULL OR e.spent_at >= $2)
          AND ($3::date IS NULL OR e.spent_at <= $3)
        ORDER BY e.spent_at DESC, e.created_at DESC
        LIMIT $4 OFFSET $5`,
      [branchId, from ?? null, to ?? null, limit, offset],
    )
    .then((r) => r.rows);
}

export function countExpenses({ branchId, from, to }, client = pool) {
  return client
    .query(
      `SELECT count(*)::int AS n FROM expenses e
        WHERE e.branch_id = $1 AND e.deleted_at IS NULL
          AND ($2::date IS NULL OR e.spent_at >= $2)
          AND ($3::date IS NULL OR e.spent_at <= $3)`,
      [branchId, from ?? null, to ?? null],
    )
    .then((r) => r.rows[0].n);
}

const EXPENSE_RETURN = 'id, category, amount, spent_at, note, created_at';

/** Частичное обновление расхода в пределах филиала. */
export function updateExpense(id, branchId, fields, client = pool) {
  const cols = [];
  const vals = [];
  let i = 1;
  for (const [key, col] of [
    ['category', 'category'],
    ['amount', 'amount'],
    ['note', 'note'],
  ]) {
    if (fields[key] !== undefined) {
      cols.push(`${col} = $${i++}`);
      vals.push(fields[key]);
    }
  }
  if (fields.spentAt !== undefined) {
    cols.push(`spent_at = $${i++}::date`);
    vals.push(fields.spentAt);
  }
  if (cols.length === 0) return Promise.resolve(null);
  vals.push(id, branchId);
  return client
    .query(
      `UPDATE expenses SET ${cols.join(', ')}, updated_at = now()
        WHERE id = $${i++} AND branch_id = $${i} AND deleted_at IS NULL
        RETURNING ${EXPENSE_RETURN}`,
      vals,
    )
    .then((r) => r.rows[0] ?? null);
}

export function softDeleteExpense(id, branchId, client = pool) {
  return client
    .query(
      `UPDATE expenses SET deleted_at = now(), updated_at = now()
        WHERE id = $1 AND branch_id = $2 AND deleted_at IS NULL
        RETURNING id`,
      [id, branchId],
    )
    .then((r) => r.rows[0] ?? null);
}

// ==================== СТУДЕНТЫ ====================

/** Создание user (student ИЛИ parent) с логин-кодом. Бросает 23505 при конфликте. */
export function insertCodeUser(
  { orgId, branchId, role, firstName, lastName, phone, loginCode, passwordHash, passwordEncrypted },
  client = pool,
) {
  // parent — уровень организации, но заводится в филиале, храним branch_id для скоупа админа
  return client
    .query(
      `INSERT INTO users
         (organization_id, branch_id, role, first_name, last_name, phone, login_code, password_hash, password_encrypted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, role, first_name, last_name, phone, login_code`,
      [orgId, branchId, role, firstName, lastName, phone, loginCode, passwordHash, passwordEncrypted ?? null],
    )
    .then((r) => r.rows[0]);
}

/** Родитель конкретного студента, в своём филиале — логин-код + обратимый пароль для QR-модалки. */
export function findStudentParentInBranch(studentId, branchId, client = pool) {
  return client
    .query(
      `SELECT p.id, p.login_code, p.password_encrypted
         FROM student_profiles sp
         JOIN users p ON p.id = sp.parent_id
        WHERE sp.user_id = $1 AND sp.branch_id = $2 AND p.role = 'parent' AND p.deleted_at IS NULL`,
      [studentId, branchId],
    )
    .then((r) => r.rows[0] ?? null);
}

export function setParentPassword(parentId, passwordHash, client = pool) {
  return client
    .query(
      `UPDATE users SET password_hash = $2, updated_at = now()
        WHERE id = $1 AND role = 'parent' AND deleted_at IS NULL RETURNING id`,
      [parentId, passwordHash],
    )
    .then((r) => r.rows[0] ?? null);
}

/** Обратимо-зашифрованная копия пароля родителя — только для admin-просмотра. */
export function setParentPasswordEncrypted(parentId, passwordEncrypted, client = pool) {
  return client
    .query(`UPDATE users SET password_encrypted = $2, updated_at = now() WHERE id = $1`, [parentId, passwordEncrypted])
    .then(() => undefined);
}

export function insertStudentProfile(
  { userId, branchId, parentId, birthDate, gender, address, school, leadSource, hasLaptop, offerSigned, passwordEncrypted },
  client = pool,
) {
  return client
    .query(
      `INSERT INTO student_profiles
         (user_id, branch_id, parent_id, birth_date, gender, address, school, lead_source, has_laptop, offer_signed, password_encrypted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, false), $11)
       RETURNING id, coin_balance, total_debt`,
      [
        userId, branchId, parentId ?? null, birthDate ?? null,
        gender ?? null, address ?? null, school ?? null, leadSource ?? null,
        hasLaptop ?? null, offerSigned ?? null, passwordEncrypted ?? null,
      ],
    )
    .then((r) => r.rows[0]);
}

export function addStudentToGroupRaw({ groupId, studentId }, client = pool) {
  return client
    .query(
      `INSERT INTO group_students (group_id, student_id) VALUES ($1, $2)
       ON CONFLICT (group_id, student_id) DO UPDATE SET left_at = NULL
       RETURNING id`,
      [groupId, studentId],
    )
    .then((r) => r.rows[0]);
}

export function listStudents({ branchId, search, groupId, limit, offset }, client = pool) {
  return client
    .query(
      `SELECT u.id, u.first_name, u.last_name, u.phone, u.status, u.login_code, u.created_at,
              sp.coin_balance, sp.total_debt, sp.parent_id,
              EXISTS (
                SELECT 1 FROM invoices i
                 WHERE i.student_id = u.id AND i.status = 'overdue' AND i.deleted_at IS NULL
              ) AS has_overdue_invoice,
              COALESCE(
                (SELECT json_agg(json_build_object(
                          'id', g.id, 'name', g.name, 'subject', g.subject,
                          'mentor', m.first_name || ' ' || m.last_name
                        ))
                   FROM group_students gs
                   JOIN groups g ON g.id = gs.group_id
                   JOIN users m ON m.id = g.mentor_id
                  WHERE gs.student_id = u.id AND gs.left_at IS NULL AND g.deleted_at IS NULL),
                '[]'
              ) AS groups
         FROM users u
         JOIN student_profiles sp ON sp.user_id = u.id
        WHERE u.branch_id = $1 AND u.role = 'student' AND u.deleted_at IS NULL
          AND ($2::text IS NULL OR (u.first_name || ' ' || u.last_name) ILIKE '%' || $2 || '%'
                                    OR u.phone ILIKE '%' || $2 || '%'
                                    OR u.login_code ILIKE '%' || $2 || '%')
          AND ($3::uuid IS NULL OR EXISTS (
                SELECT 1 FROM group_students gs
                 WHERE gs.student_id = u.id AND gs.group_id = $3 AND gs.left_at IS NULL))
        ORDER BY u.created_at DESC
        LIMIT $4 OFFSET $5`,
      [branchId, search ?? null, groupId ?? null, limit, offset],
    )
    .then((r) => r.rows);
}

export function countStudents({ branchId, search, groupId }, client = pool) {
  return client
    .query(
      `SELECT count(*)::int AS n
         FROM users u
        WHERE u.branch_id = $1 AND u.role = 'student' AND u.deleted_at IS NULL
          AND ($2::text IS NULL OR (u.first_name || ' ' || u.last_name) ILIKE '%' || $2 || '%'
                                    OR u.phone ILIKE '%' || $2 || '%'
                                    OR u.login_code ILIKE '%' || $2 || '%')
          AND ($3::uuid IS NULL OR EXISTS (
                SELECT 1 FROM group_students gs
                 WHERE gs.student_id = u.id AND gs.group_id = $3 AND gs.left_at IS NULL))`,
      [branchId, search ?? null, groupId ?? null],
    )
    .then((r) => r.rows[0].n);
}

/** Студент по id строго в филиале. */
export function findStudentInBranch(id, branchId, client = pool) {
  return client
    .query(
      `SELECT u.id, u.first_name, u.last_name, u.phone, u.status, u.login_code, u.created_at,
              sp.coin_balance, sp.total_debt, sp.parent_id, sp.birth_date,
              sp.frozen_at, sp.frozen_reason,
              sp.gender, sp.address, sp.school, sp.lead_source, sp.has_laptop, sp.offer_signed,
              p.first_name AS parent_first, p.last_name AS parent_last, p.phone AS parent_phone,
              EXISTS (
                SELECT 1 FROM invoices i
                 WHERE i.student_id = u.id AND i.status = 'overdue' AND i.deleted_at IS NULL
              ) AS has_overdue_invoice
         FROM users u
         JOIN student_profiles sp ON sp.user_id = u.id
         LEFT JOIN users p ON p.id = sp.parent_id
        WHERE u.id = $1 AND u.branch_id = $2 AND u.role = 'student' AND u.deleted_at IS NULL`,
      [id, branchId],
    )
    .then((r) => r.rows[0] ?? null);
}

export function studentGroups(studentId, client = pool) {
  return client
    .query(
      `SELECT g.id, g.name, g.subject, g.monthly_price,
              m.first_name AS mentor_first, m.last_name AS mentor_last
         FROM group_students gs
         JOIN groups g ON g.id = gs.group_id
         JOIN users m ON m.id = g.mentor_id
        WHERE gs.student_id = $1 AND gs.left_at IS NULL AND g.deleted_at IS NULL
        ORDER BY g.name`,
      [studentId],
    )
    .then((r) => r.rows);
}

const STUDENT_RETURN = 'id, first_name, last_name, phone, status';

export function updateStudent(id, branchId, fields, client = pool) {
  const cols = [];
  const vals = [];
  let i = 1;
  for (const [key, col] of [
    ['firstName', 'first_name'],
    ['lastName', 'last_name'],
    ['phone', 'phone'],
  ]) {
    if (fields[key] !== undefined) {
      cols.push(`${col} = $${i++}`);
      vals.push(fields[key]);
    }
  }
  if (cols.length === 0) return Promise.resolve(null);
  vals.push(id, branchId);
  return client
    .query(
      `UPDATE users SET ${cols.join(', ')}, updated_at = now()
        WHERE id = $${i++} AND branch_id = $${i} AND role = 'student' AND deleted_at IS NULL
        RETURNING ${STUDENT_RETURN}`,
      vals,
    )
    .then((r) => r.rows[0] ?? null);
}

/** birthDate + профиль-поля виджета «Профиль заполнен» — один общий partial-update. */
export function updateStudentProfile(userId, fields, client = pool) {
  const cols = [];
  const vals = [];
  let i = 1;
  for (const [key, col] of [
    ['birthDate', 'birth_date'],
    ['gender', 'gender'],
    ['address', 'address'],
    ['school', 'school'],
    ['leadSource', 'lead_source'],
    ['hasLaptop', 'has_laptop'],
    ['offerSigned', 'offer_signed'],
  ]) {
    if (fields[key] !== undefined) {
      cols.push(`${col} = $${i++}`);
      vals.push(fields[key]);
    }
  }
  if (cols.length === 0) return Promise.resolve();
  vals.push(userId);
  return client
    .query(`UPDATE student_profiles SET ${cols.join(', ')}, updated_at = now() WHERE user_id = $${i}`, vals)
    .then(() => undefined);
}

/** Заморозка/разморозка: статус в users + метка в профиле. */
export function setStudentFrozen(id, branchId, frozen, reason, client = pool) {
  return client
    .query(
      `UPDATE users SET status = $3, updated_at = now()
        WHERE id = $1 AND branch_id = $2 AND role = 'student' AND deleted_at IS NULL
        RETURNING ${STUDENT_RETURN}`,
      [id, branchId, frozen ? 'frozen' : 'active'],
    )
    .then(async (r) => {
      const row = r.rows[0] ?? null;
      if (row) {
        await client.query(
          `UPDATE student_profiles
              SET frozen_at = $2, frozen_reason = $3, updated_at = now()
            WHERE user_id = $1`,
          [id, frozen ? new Date() : null, frozen ? (reason ?? null) : null],
        );
      }
      return row;
    });
}

export function setStudentPassword(id, branchId, passwordHash, client = pool) {
  return client
    .query(
      `UPDATE users SET password_hash = $3, updated_at = now()
        WHERE id = $1 AND branch_id = $2 AND role = 'student' AND deleted_at IS NULL
        RETURNING id`,
      [id, branchId, passwordHash],
    )
    .then((r) => r.rows[0] ?? null);
}

/** Обратимо-зашифрованная копия пароля — только для admin-просмотра (см. utils/credentialCrypto.js). */
export function setStudentPasswordEncrypted(userId, passwordEncrypted, client = pool) {
  return client
    .query(`UPDATE student_profiles SET password_encrypted = $2, updated_at = now() WHERE user_id = $1`, [userId, passwordEncrypted])
    .then(() => undefined);
}

/** Текущий зашифрованный пароль студента + логин-код — для QR-модалки. */
export function findStudentCredentials(id, branchId, client = pool) {
  return client
    .query(
      `SELECT u.login_code, sp.password_encrypted
         FROM users u
         JOIN student_profiles sp ON sp.user_id = u.id
        WHERE u.id = $1 AND u.branch_id = $2 AND u.role = 'student' AND u.deleted_at IS NULL`,
      [id, branchId],
    )
    .then((r) => r.rows[0] ?? null);
}

/** Мягкое удаление: deleted_at + статус dropped (email/код/телефон освобождаются).
 * Причина (dropped_reason) — необязательная, тот же принцип, что и frozen_reason. */
export async function softDeleteStudent(id, branchId, reason, client = pool) {
  const { rows: [row] } = await client.query(
    `UPDATE users SET deleted_at = now(), status = 'dropped', updated_at = now()
      WHERE id = $1 AND branch_id = $2 AND role = 'student' AND deleted_at IS NULL
      RETURNING id`,
    [id, branchId],
  );
  if (!row) return null;
  await client.query(
    `UPDATE student_profiles SET dropped_reason = $2, updated_at = now() WHERE user_id = $1`,
    [id, reason || null],
  );
  return row;
}

/** Динамика прихода/оттока учеников филиала по месяцам — «в этом месяце пришло N,
 * ушло M, чистый прирост N-M» (тот же приём, что у super.repository.js:newStudentsSeriesMonthly,
 * только по одному филиалу и с обеими сериями). */
export function newStudentsSeriesMonthly(branchId, fromDate, client = pool) {
  return client
    .query(
      `SELECT date_trunc('month', u.created_at)::date AS month, count(*)::int AS cnt
         FROM users u
        WHERE u.branch_id = $1 AND u.role = 'student' AND u.created_at >= $2
        GROUP BY month
        ORDER BY month`,
      [branchId, fromDate],
    )
    .then((r) => r.rows);
}

export function droppedStudentsSeriesMonthly(branchId, fromDate, client = pool) {
  return client
    .query(
      `SELECT date_trunc('month', u.deleted_at)::date AS month, count(*)::int AS cnt
         FROM users u
        WHERE u.branch_id = $1 AND u.role = 'student' AND u.status = 'dropped'
          AND u.deleted_at IS NOT NULL AND u.deleted_at >= $2
        GROUP BY month
        ORDER BY month`,
      [branchId, fromDate],
    )
    .then((r) => r.rows);
}

export function newStudentsSeriesDaily(branchId, fromDate, client = pool) {
  return client
    .query(
      `SELECT date_trunc('day', u.created_at)::date AS day, count(*)::int AS cnt
         FROM users u
        WHERE u.branch_id = $1 AND u.role = 'student' AND u.created_at >= $2
        GROUP BY day
        ORDER BY day`,
      [branchId, fromDate],
    )
    .then((r) => r.rows);
}

export function droppedStudentsSeriesDaily(branchId, fromDate, client = pool) {
  return client
    .query(
      `SELECT date_trunc('day', u.deleted_at)::date AS day, count(*)::int AS cnt
         FROM users u
        WHERE u.branch_id = $1 AND u.role = 'student' AND u.status = 'dropped'
          AND u.deleted_at IS NOT NULL AND u.deleted_at >= $2
        GROUP BY day
        ORDER BY day`,
      [branchId, fromDate],
    )
    .then((r) => r.rows);
}

export function leaveAllGroups(studentId, client = pool) {
  return client
    .query(
      `UPDATE group_students SET left_at = now()
        WHERE student_id = $1 AND left_at IS NULL`,
      [studentId],
    )
    .then(() => undefined);
}

// ==================== МЕНТОРЫ ====================

export function insertMentor(
  { orgId, branchId, firstName, lastName, email, phone, passwordHash },
  client = pool,
) {
  return client
    .query(
      `INSERT INTO users (organization_id, branch_id, role, first_name, last_name, email, phone, password_hash)
       VALUES ($1, $2, 'mentor', $3, $4, $5, $6, $7)
       RETURNING id, first_name, last_name, email, phone, status`,
      [orgId, branchId, firstName, lastName, email, phone ?? null, passwordHash],
    )
    .then((r) => r.rows[0]);
}

export function listMentors(branchId, client = pool) {
  return client
    .query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.status, u.created_at,
              mp.grade, mp.bio, mp.skills,
              (SELECT count(*) FROM groups g
                 WHERE g.mentor_id = u.id AND g.deleted_at IS NULL AND g.is_archived = false) AS groups
         FROM users u
         LEFT JOIN mentor_profiles mp ON mp.user_id = u.id
        WHERE u.branch_id = $1 AND u.role = 'mentor' AND u.deleted_at IS NULL
        ORDER BY u.created_at DESC`,
      [branchId],
    )
    .then((r) => r.rows);
}

export function setMentorStatus(id, branchId, status, client = pool) {
  return client
    .query(
      `UPDATE users SET status = $3, updated_at = now()
        WHERE id = $1 AND branch_id = $2 AND role = 'mentor' AND deleted_at IS NULL
        RETURNING id, first_name, last_name, email, phone, status`,
      [id, branchId, status],
    )
    .then((r) => r.rows[0] ?? null);
}

const MENTOR_RETURN = 'id, first_name, last_name, email, phone, status';

export function updateMentor(id, branchId, fields, client = pool) {
  const cols = [];
  const vals = [];
  let i = 1;
  for (const [key, col] of [
    ['firstName', 'first_name'],
    ['lastName', 'last_name'],
    ['phone', 'phone'],
  ]) {
    if (fields[key] !== undefined) {
      cols.push(`${col} = $${i++}`);
      vals.push(fields[key]);
    }
  }
  if (cols.length === 0) return Promise.resolve(null);
  vals.push(id, branchId);
  return client
    .query(
      `UPDATE users SET ${cols.join(', ')}, updated_at = now()
        WHERE id = $${i++} AND branch_id = $${i} AND role = 'mentor' AND deleted_at IS NULL
        RETURNING ${MENTOR_RETURN}`,
      vals,
    )
    .then((r) => r.rows[0] ?? null);
}

/**
 * Грейд ментора. UPSERT: карточки может ещё не быть, если ментор её не
 * заполнял, — грейд должен ставиться и в этом случае.
 * `grade = null` снимает уровень, поэтому COALESCE тут неуместен: он не дал бы
 * его обнулить.
 */
export function upsertMentorGrade(userId, grade, adminId, client = pool) {
  return client
    .query(
      `INSERT INTO mentor_profiles (user_id, grade, grade_set_by, grade_set_at)
            VALUES ($1, $2, $3, CASE WHEN $2::mentor_grade IS NULL THEN NULL ELSE now() END)
       ON CONFLICT (user_id) DO UPDATE
              SET grade        = $2,
                  grade_set_by = $3,
                  grade_set_at = CASE WHEN $2::mentor_grade IS NULL THEN NULL ELSE now() END,
                  updated_at   = now()
         RETURNING grade`,
      [userId, grade, adminId],
    )
    .then((r) => r.rows[0] ?? null);
}

/** Один ментор филиала вместе с карточкой — для ответа после обновления. */
export function findMentorWithProfile(id, branchId, client = pool) {
  return client
    .query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.status,
              mp.grade, mp.bio, mp.skills
         FROM users u
         LEFT JOIN mentor_profiles mp ON mp.user_id = u.id
        WHERE u.id = $1 AND u.branch_id = $2 AND u.role = 'mentor' AND u.deleted_at IS NULL`,
      [id, branchId],
    )
    .then((r) => r.rows[0] ?? null);
}

/** Сколько живых неархивных групп ведёт ментор (нельзя удалить, пока ведёт). */
export function countMentorActiveGroups(mentorId, branchId, client = pool) {
  return client
    .query(
      `SELECT count(*)::int AS n FROM groups
        WHERE mentor_id = $1 AND branch_id = $2 AND deleted_at IS NULL AND is_archived = false`,
      [mentorId, branchId],
    )
    .then((r) => r.rows[0].n);
}

export function softDeleteMentor(id, branchId, client = pool) {
  return client
    .query(
      `UPDATE users SET deleted_at = now(), updated_at = now()
        WHERE id = $1 AND branch_id = $2 AND role = 'mentor' AND deleted_at IS NULL
        RETURNING id`,
      [id, branchId],
    )
    .then((r) => r.rows[0] ?? null);
}

// ==================== ГРУППЫ ====================

/** Ментор строго в филиале (для привязки к группе). */
export function findMentorInBranch(mentorId, branchId, client = pool) {
  return client
    .query(
      `SELECT id FROM users
        WHERE id = $1 AND branch_id = $2 AND role = 'mentor' AND deleted_at IS NULL`,
      [mentorId, branchId],
    )
    .then((r) => r.rows[0] ?? null);
}

// длительность урока организации (её задаёт CEO) — по филиалу
export function getOrgLessonDuration(branchId, client = pool) {
  return client
    .query(
      `SELECT o.lesson_duration_min
         FROM branches b
         JOIN organizations o ON o.id = b.organization_id
        WHERE b.id = $1`,
      [branchId],
    )
    .then((r) => r.rows[0]?.lesson_duration_min ?? 60);
}

/** Telegram-привязка студента и его родителя — своей записи в telegram_accounts
 * может не быть ни у кого из них (LEFT JOIN). branchId проверяется через users,
 * чтобы админ не мог заглянуть в чужой филиал по чужому studentId. */
export function studentTelegramBindings(studentId, branchId, client = pool) {
  return client
    .query(
      `SELECT
         ts.tg_username AS student_tg_username, ts.tg_first_name AS student_tg_first_name,
         ts.tg_chat_id IS NOT NULL AS student_linked,
         sp.parent_id,
         tp.tg_username AS parent_tg_username, tp.tg_first_name AS parent_tg_first_name,
         tp.tg_chat_id IS NOT NULL AS parent_linked
        FROM users u
        JOIN student_profiles sp ON sp.user_id = u.id
        LEFT JOIN telegram_accounts ts ON ts.user_id = u.id
        LEFT JOIN telegram_accounts tp ON tp.user_id = sp.parent_id
       WHERE u.id = $1 AND u.branch_id = $2`,
      [studentId, branchId],
    )
    .then((r) => r.rows[0] ?? null);
}

/** Посещаемость одного студента за диапазон дат — для DAVOMAT-полоски на StudentDetail. */
export function studentAttendance(studentId, branchId, from, to, client = pool) {
  return client
    .query(
      `SELECT a.lesson_date, a.status, a.group_id, g.name AS group_name
         FROM attendance a
         JOIN groups g ON g.id = a.group_id
        WHERE a.student_id = $1 AND a.branch_id = $2 AND a.lesson_date BETWEEN $3 AND $4
        ORDER BY a.lesson_date ASC`,
      [studentId, branchId, from, to],
    )
    .then((r) => r.rows);
}

/** Методики, которым CEO уже назначил цену — только они выбираемы при создании группы. */
export function listPricedTrainingTypes(branchId, client = pool) {
  return client
    .query(
      `SELECT tt.id, tt.name, tt.icon, tt.price, tt.max_students
         FROM branches b
         JOIN training_types tt ON tt.organization_id = b.organization_id
        WHERE b.id = $1 AND tt.price IS NOT NULL AND tt.is_archived = false AND tt.deleted_at IS NULL
        ORDER BY tt.sort_order ASC, tt.name ASC`,
      [branchId],
    )
    .then((r) => r.rows);
}

/** Одна методика — используется, чтобы backend сам подставил subject/monthlyPrice/maxStudents при создании группы. */
export function findPricedTrainingType(id, branchId, client = pool) {
  return client
    .query(
      `SELECT tt.id, tt.name, tt.price, tt.max_students
         FROM branches b
         JOIN training_types tt ON tt.organization_id = b.organization_id
        WHERE b.id = $2 AND tt.id = $1 AND tt.price IS NOT NULL AND tt.is_archived = false AND tt.deleted_at IS NULL`,
      [id, branchId],
    )
    .then((r) => r.rows[0] ?? null);
}

export function insertGroup(
  { branchId, mentorId, name, subject, monthlyPrice, schedule, room, roomId, trainingTypeId },
  client = pool,
) {
  return client
    .query(
      `INSERT INTO groups (branch_id, mentor_id, name, subject, monthly_price, schedule, room, room_id, training_type_id)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)
       RETURNING id, name, subject, monthly_price, schedule, room, room_id, is_archived, created_at, training_type_id,
         (SELECT r.name FROM rooms r WHERE r.id = groups.room_id) AS room_name`,
      [branchId, mentorId, name, subject, monthlyPrice, JSON.stringify(schedule ?? []), room ?? null, roomId ?? null, trainingTypeId ?? null],
    )
    .then((r) => r.rows[0]);
}

export function listGroups({ branchId, limit, offset }, client = pool) {
  return client
    .query(
      `SELECT g.id, g.name, g.subject, g.monthly_price, g.room, g.room_id, g.is_archived, g.created_at,
              g.mentor_id, g.training_type_id, m.first_name AS mentor_first, m.last_name AS mentor_last,
              r.name AS room_name,
              (SELECT count(*) FROM group_students gs
                 WHERE gs.group_id = g.id AND gs.left_at IS NULL) AS students
         FROM groups g
         JOIN users m ON m.id = g.mentor_id
         LEFT JOIN rooms r ON r.id = g.room_id
        WHERE g.branch_id = $1 AND g.deleted_at IS NULL
        ORDER BY g.is_archived, g.created_at DESC
        LIMIT $2 OFFSET $3`,
      [branchId, limit, offset],
    )
    .then((r) => r.rows);
}

/** Все активные группы филиала с расписанием — для сетки /admin/schedule (без пагинации, набор небольшой). */
export function listGroupsForSchedule(branchId, client = pool) {
  return client
    .query(
      `SELECT g.id, g.name, g.subject, g.schedule, g.room_id, r.name AS room_name,
              g.mentor_id, m.first_name AS mentor_first, m.last_name AS mentor_last,
              g.created_at,
              count(gs.student_id)::int AS student_count
         FROM groups g
         JOIN users m ON m.id = g.mentor_id
         LEFT JOIN rooms r ON r.id = g.room_id
         LEFT JOIN group_students gs ON gs.group_id = g.id AND gs.left_at IS NULL
        WHERE g.branch_id = $1 AND g.deleted_at IS NULL AND g.is_archived = false
        GROUP BY g.id, r.name, m.first_name, m.last_name
        ORDER BY g.created_at`,
      [branchId],
    )
    .then((r) => r.rows);
}

export function countGroups({ branchId }, client = pool) {
  return client
    .query(
      `SELECT count(*)::int AS n FROM groups
        WHERE branch_id = $1 AND deleted_at IS NULL`,
      [branchId],
    )
    .then((r) => r.rows[0].n);
}

export function findGroupInBranch(id, branchId, client = pool) {
  return client
    .query(
      `SELECT g.id, g.name, g.subject, g.monthly_price, g.schedule, g.room, g.room_id,
              g.is_archived, g.created_at, g.mentor_id, g.training_type_id,
              m.first_name AS mentor_first, m.last_name AS mentor_last, r.name AS room_name
         FROM groups g
         JOIN users m ON m.id = g.mentor_id
         LEFT JOIN rooms r ON r.id = g.room_id
        WHERE g.id = $1 AND g.branch_id = $2 AND g.deleted_at IS NULL`,
      [id, branchId],
    )
    .then((r) => r.rows[0] ?? null);
}

export function groupStudents(groupId, client = pool) {
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

/** Логин-код/шифр.пароль/QR-токен всех активных студентов группы — для PDF-раздатки. */
export function groupStudentCredentials(groupId, branchId, client = pool) {
  return client
    .query(
      `SELECT u.id, u.first_name, u.last_name, u.login_code, u.qr_token, sp.password_encrypted
         FROM group_students gs
         JOIN users u ON u.id = gs.student_id
         JOIN student_profiles sp ON sp.user_id = u.id
        WHERE gs.group_id = $1 AND gs.left_at IS NULL
          AND u.branch_id = $2 AND u.deleted_at IS NULL
        ORDER BY u.first_name`,
      [groupId, branchId],
    )
    .then((r) => r.rows);
}

const GROUP_RETURN =
  `id, name, subject, monthly_price, schedule, room, room_id, is_archived, created_at, mentor_id,
   (SELECT r.name FROM rooms r WHERE r.id = groups.room_id) AS room_name`;

export function updateGroup(id, branchId, fields, client = pool) {
  const cols = [];
  const vals = [];
  let i = 1;
  for (const [key, col] of [
    ['name', 'name'],
    ['subject', 'subject'],
    ['mentorId', 'mentor_id'],
    ['monthlyPrice', 'monthly_price'],
    ['room', 'room'],
    ['roomId', 'room_id'],
    ['trainingTypeId', 'training_type_id'],
  ]) {
    if (fields[key] !== undefined) {
      cols.push(`${col} = $${i++}`);
      vals.push(fields[key]);
    }
  }
  if (fields.schedule !== undefined) {
    cols.push(`schedule = $${i++}::jsonb`);
    vals.push(JSON.stringify(fields.schedule));
  }
  if (cols.length === 0) return Promise.resolve(null);
  vals.push(id, branchId);
  return client
    .query(
      `UPDATE groups SET ${cols.join(', ')}, updated_at = now()
        WHERE id = $${i++} AND branch_id = $${i} AND deleted_at IS NULL
        RETURNING ${GROUP_RETURN}`,
      vals,
    )
    .then((r) => r.rows[0] ?? null);
}

export function setGroupArchived(id, branchId, archived, client = pool) {
  return client
    .query(
      `UPDATE groups
          SET is_archived = $3, archived_at = CASE WHEN $3 THEN now() ELSE NULL END, updated_at = now()
        WHERE id = $1 AND branch_id = $2 AND deleted_at IS NULL
        RETURNING ${GROUP_RETURN}`,
      [id, branchId, archived],
    )
    .then((r) => r.rows[0] ?? null);
}

export function removeStudentFromGroup(groupId, studentId, client = pool) {
  return client
    .query(
      `UPDATE group_students SET left_at = now()
        WHERE group_id = $1 AND student_id = $2 AND left_at IS NULL
        RETURNING id`,
      [groupId, studentId],
    )
    .then((r) => r.rows[0] ?? null);
}

// ==================== РАБОЧЕЕ ПРОСТРАНСТВО ГРУППЫ (davomat/ДЗ/фикр) ====================

/** Сколько активных участников в группе — знаменатель для «сдано N/M» и статуса ДЗ. */
export function countActiveGroupStudents(groupId, client = pool) {
  return client
    .query(
      `SELECT count(*)::int AS n FROM group_students gs
        WHERE gs.group_id = $1 AND gs.left_at IS NULL`,
      [groupId],
    )
    .then((r) => r.rows[0].n);
}

export function insertGroupFeedback(
  { branchId, groupId, type, authorName, content, rating, createdBy },
  client = pool,
) {
  return client
    .query(
      `INSERT INTO group_feedback (branch_id, group_id, type, author_name, content, rating, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, type, author_name, content, rating, created_at`,
      [branchId, groupId, type, authorName ?? null, content, rating, createdBy],
    )
    .then((r) => r.rows[0]);
}

export function listGroupFeedback(groupId, client = pool) {
  return client
    .query(
      `SELECT id, type, author_name, content, rating, created_at
         FROM group_feedback
        WHERE group_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC`,
      [groupId],
    )
    .then((r) => r.rows);
}

// ==================== ОБЪЯВЛЕНИЯ ====================

/** id активных студентов филиала; при groupId — только участники этой группы. */
export function listActiveStudentIds({ branchId, groupId }, client = pool) {
  return client
    .query(
      `SELECT u.id
         FROM users u
        WHERE u.branch_id = $1 AND u.role = 'student'
          AND u.status = 'active' AND u.deleted_at IS NULL
          AND ($2::uuid IS NULL OR EXISTS (
                SELECT 1 FROM group_students gs
                 WHERE gs.student_id = u.id AND gs.group_id = $2 AND gs.left_at IS NULL))`,
      [branchId, groupId ?? null],
    )
    .then((r) => r.rows.map((row) => row.id));
}
