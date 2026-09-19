import { pool } from '../../../config/db.js';

/**
 * Data-layer mentor_salaries — собственность mentor-домена (AB-MENTOR).
 * Модель расчёта не финализирована (см. миграцию 1783275653748) — таблица
 * хранит итоговые суммы, base_amount проставляет admin вручную.
 */

/** Пользователь-ментор (для валидации роли/скоупа при upsert). */
export async function findMentorUser(mentorId) {
  const { rows: [user] } = await pool.query(
    `SELECT id, organization_id, branch_id, role
       FROM users
      WHERE id = $1 AND deleted_at IS NULL`,
    [mentorId],
  );
  return user ?? null;
}

/**
 * Upsert по UNIQUE (mentor_id, period_month). Суммы редактируются только в
 * статусе 'draft' — guard в DO UPDATE атомарно защищает approved/paid записи
 * от тихого изменения выплаченных сумм. null = запись уже approved/paid.
 */
export async function upsert({
  organizationId,
  branchId,
  mentorId,
  periodMonth,
  baseAmount,
  bonusAmount,
  note,
  createdBy,
}) {
  const { rows: [row] } = await pool.query(
    `INSERT INTO mentor_salaries
       (organization_id, branch_id, mentor_id, period_month, base_amount, bonus_amount, note, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (mentor_id, period_month) DO UPDATE
       SET base_amount  = EXCLUDED.base_amount,
           bonus_amount = EXCLUDED.bonus_amount,
           note         = EXCLUDED.note,
           updated_at   = now()
     WHERE mentor_salaries.status = 'draft'
     RETURNING *`,
    [organizationId, branchId, mentorId, periodMonth, baseAmount, bonusAmount ?? 0, note ?? null, createdBy],
  );
  return row ?? null;
}

export async function findByMentorAndYear(mentorId, year) {
  const { rows } = await pool.query(
    `SELECT * FROM mentor_salaries
      WHERE mentor_id = $1 AND EXTRACT(YEAR FROM period_month) = $2
      ORDER BY period_month DESC`,
    [mentorId, year],
  );
  return rows;
}

export async function findById(id) {
  const { rows: [row] } = await pool.query(
    `SELECT * FROM mentor_salaries WHERE id = $1`,
    [id],
  );
  return row ?? null;
}

export async function updateStatus(id, status, paidAt) {
  const { rows: [row] } = await pool.query(
    `UPDATE mentor_salaries
        SET status = $2, paid_at = $3, updated_at = now()
      WHERE id = $1
      RETURNING *`,
    [id, status, paidAt],
  );
  return row ?? null;
}

/**
 * Decision-support подсказка: группы ментора + кол-во активных студентов в
 * периоде [periodStart, periodEnd). Активным считается студент, чьё членство
 * пересекается с периодом (joined_at < periodEnd AND (left_at IS NULL OR left_at >= periodStart)).
 */
export async function getGroupsSuggestion(mentorId, periodStart, periodEnd) {
  const { rows } = await pool.query(
    `SELECT g.id AS group_id, g.name, g.monthly_price,
            COUNT(gs.id) FILTER (
              WHERE gs.joined_at < $3 AND (gs.left_at IS NULL OR gs.left_at >= $2)
            )::int AS active_students
       FROM groups g
       LEFT JOIN group_students gs ON gs.group_id = g.id
      WHERE g.mentor_id = $1 AND g.deleted_at IS NULL
      GROUP BY g.id, g.name, g.monthly_price
      ORDER BY g.name`,
    [mentorId, periodStart, periodEnd],
  );
  return rows;
}
