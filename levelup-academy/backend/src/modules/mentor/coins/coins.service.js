import { pool } from '../../../config/db.js';
import { AppError } from '../../../utils/AppError.js';
import { parsePagination, buildPageMeta } from '../../../utils/pagination.js';
import { changeCoins, getStudentHistory } from '../../coins/coins.service.js';
import { assertWithinBudget, getGroupBudget } from './budget.service.js';

/**
 * Право actor'а трогать коины конкретного ученика:
 *   - mentor → ученик должен состоять хотя бы в одной ЕГО группе;
 *   - admin  → ученик должен быть в филиале админа.
 * Чужой/несуществующий ученик → 404 (существование не раскрываем, K-AUTH §2).
 */
async function assertActorOwnsStudent(actor, studentId, db = pool) {
  if (actor.role === 'mentor') {
    const { rowCount } = await db.query(
      `SELECT 1
         FROM group_students gs
         JOIN groups g ON g.id = gs.group_id
        WHERE gs.student_id = $1 AND gs.left_at IS NULL
          AND g.mentor_id = $2 AND g.deleted_at IS NULL`,
      [studentId, actor.id],
    );
    if (!rowCount) throw new AppError(404, 'Student not found');
    return;
  }
  // admin — скоуп по своему филиалу
  const { rowCount } = await db.query(
    `SELECT 1 FROM users
      WHERE id = $1 AND role = 'student' AND deleted_at IS NULL AND branch_id = $2`,
    [studentId, actor.branchId],
  );
  if (!rowCount) throw new AppError(404, 'Student not found');
}

/** Начислить (+) или списать (−) коины с обязательной причиной. */
export async function grantCoins(actor, { studentId, amount, reason, groupId }) {
  await assertActorOwnsStudent(actor, studentId);
  const operation = amount > 0 ? 'reward' : 'deduction';

  /* Админ раздаёт коины вне групповых лимитов: месячный бюджет — инструмент
     ментора, и загонять в него администрацию требованием не предполагалось. */
  if (actor.role !== 'mentor') {
    const { history, balanceAfter } = await changeCoins({
      studentId, actorId: actor.id, amount, operation, reason, refType: 'manual',
    });
    return { balanceAfter, entry: history };
  }

  const targetGroupId = await resolveGroupForGrant(actor, studentId, groupId);

  /* Одна транзакция на проверку лимита и списание: между «осталось 5» и самой
     выдачей не должно быть окна, в которое пролезет второй запрос. Блокировку
     группы ставит assertWithinBudget. */
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const budget = await assertWithinBudget(targetGroupId, amount, client);

    const { history, balanceAfter } = await changeCoins({
      studentId,
      actorId: actor.id,
      amount,
      operation,
      reason,
      refType: 'mentor_grant',   // помечает операцию как расход бюджета группы
      groupId: targetGroupId,
    }, client);

    await client.query('COMMIT');
    return {
      balanceAfter,
      entry: history,
      // Остаток возвращаем сразу: интерфейсу иначе пришлось бы вторым запросом
      // спрашивать то, что здесь уже посчитано.
      budget: { ...budget, spent: budget.spent + amount,
        remaining: Math.max(0, budget.allocated - budget.spent - amount) },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Из какого бюджета списывать. Ученик может состоять сразу в двух группах
 * одного ментора — тогда угадывать нельзя, и клиент обязан указать группу явно.
 */
async function resolveGroupForGrant(actor, studentId, groupId) {
  const { rows } = await pool.query(
    `SELECT g.id, g.name
       FROM group_students gs
       JOIN groups g ON g.id = gs.group_id
      WHERE gs.student_id = $1 AND gs.left_at IS NULL
        AND g.mentor_id = $2 AND g.deleted_at IS NULL`,
    [studentId, actor.id],
  );

  if (groupId) {
    const match = rows.find((r) => r.id === groupId);
    if (!match) throw new AppError(404, 'Student is not in this group');
    return match.id;
  }
  if (rows.length === 1) return rows[0].id;
  if (rows.length === 0) throw new AppError(404, 'Student not found');

  throw new AppError(422,
    `Student belongs to ${rows.length} of your groups — specify groupId`);
}

/** Остаток месячного лимита по группе — для экрана коинов. */
export async function groupBudget(actor, groupId) {
  const { rows: [group] } = await pool.query(
    `SELECT g.id, b.organization_id
       FROM groups g
       JOIN branches b ON b.id = g.branch_id
      WHERE g.id = $1 AND g.mentor_id = $2 AND g.deleted_at IS NULL`,
    [groupId, actor.id],
  );
  if (!group) throw new AppError(404, 'Group not found');
  return getGroupBudget(group);
}

/** История коинов ученика (только для ученика, доступного actor'у). */
export async function studentHistory(actor, studentId, query) {
  await assertActorOwnsStudent(actor, studentId);
  const { page, limit, offset } = parsePagination(query);
  const { items, total } = await getStudentHistory(studentId, { limit, offset, page });
  return { items, meta: buildPageMeta(total, page, limit) };
}
