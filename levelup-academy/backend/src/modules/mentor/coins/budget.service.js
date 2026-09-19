import { pool } from '../../../config/db.js';
import { AppError } from '../../../utils/AppError.js';

/**
 * Месячный лимит коинов ментора по группе.
 *
 * Лимит = норма организации × число учеников группы СЕЙЧАС. Ничего не хранится
 * и не начисляется по расписанию — см. миграцию 1783850000000: при требовании
 * «новый ученик пришёл — лимит вырос сразу» хранимое значение устаревало бы
 * при каждом зачислении.
 *
 * Расход — сумма операций ментора по этой группе за текущий месяц. Снятие идёт
 * с минусом и тем самым возвращает коины в бюджет, как и договаривались; см.
 * оговорку про GREATEST(0, …) ниже.
 */

/* Границы месяца берём в ташкентском времени, а не в UTC. created_at хранится
   в timestamptz, и при подсчёте по UTC первые пять часов каждого месяца
   попадали бы в предыдущий: выданное 1-го числа в 3 утра списывалось бы с уже
   закрытого бюджета. */
const TZ = 'Asia/Tashkent';

/** Сколько коинов ментор вправе раздать на одного ученика в месяц. */
async function normFor(organizationId, db = pool) {
  const { rows: [row] } = await db.query(
    'SELECT coins_per_student FROM organizations WHERE id = $1',
    [organizationId],
  );
  return row?.coins_per_student ?? 0;
}

/**
 * Состояние бюджета группы на текущий месяц.
 *
 * `db` передаётся, когда расчёт идёт внутри транзакции выдачи — тогда он видит
 * блокировку группы и не может разойтись с параллельной выдачей.
 */
export async function getGroupBudget(group, db = pool) {
  const norm = await normFor(group.organization_id ?? group.organizationId, db);

  const { rows: [row] } = await db.query(
    `SELECT
       (SELECT count(*)::int
          FROM group_students gs
         WHERE gs.group_id = $1 AND gs.left_at IS NULL)            AS students,
       COALESCE((SELECT sum(ch.amount)::int
          FROM coin_history ch
         WHERE ch.group_id = $1
           AND ch.ref_type = 'mentor_grant'
           AND date_trunc('month', ch.created_at AT TIME ZONE $2)
             = date_trunc('month', now() AT TIME ZONE $2)), 0)     AS spent`,
    [group.id, TZ],
  );

  const students = row.students;
  const allocated = students * norm;

  /* Расход не опускаем ниже нуля. Иначе снятие коинов, выданных в ПРОШЛОМ
     месяце, давало бы отрицательный расход в текущем и раздувало лимит сверх
     положенного: выдал 100 в июле, снял 50 в августе — и в августе к норме
     прибавилось бы 50 из ниоткуда. Возврат работает только в пределах того,
     что выдано в этом же месяце. */
  const spent = Math.max(0, row.spent);

  return {
    month: new Date().toISOString().slice(0, 7),
    coinsPerStudent: norm,
    students,
    allocated,
    spent,
    remaining: Math.max(0, allocated - spent),
  };
}

/**
 * Проверить и списать лимит под выдачу. Вызывать ВНУТРИ транзакции выдачи.
 *
 * Блокирует строку группы: без неё два одновременных запроса читают один и тот
 * же остаток и оба проходят проверку — классическая гонка, на которой лимит
 * обходится двумя параллельными нажатиями.
 *
 * Снятие (amount < 0) не проверяем: оно уменьшает расход, а не увеличивает.
 */
export async function assertWithinBudget(groupId, amount, db) {
  const { rows: [group] } = await db.query(
    `SELECT g.id, g.name, b.organization_id
       FROM groups g
       JOIN branches b ON b.id = g.branch_id
      WHERE g.id = $1 AND g.deleted_at IS NULL
      FOR UPDATE OF g`,
    [groupId],
  );
  if (!group) throw new AppError(404, 'Group not found');

  if (amount < 0) return getGroupBudget(group, db);

  const budget = await getGroupBudget(group, db);

  if (budget.coinsPerStudent === 0) {
    throw new AppError(422,
      'Coin allowance is not configured for this organization yet');
  }
  if (amount > budget.remaining) {
    throw new AppError(422,
      `Monthly coin limit exceeded: ${budget.remaining} of ${budget.allocated} left for this group`);
  }
  return budget;
}
