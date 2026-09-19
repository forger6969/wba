import { pool } from '../../../config/db.js';
import { AppError } from '../../../utils/AppError.js';

/**
 * Общий хелпер mentor-домена: загрузка группы + проверка владения.
 * "Ментор может действовать только со своими группами" (TASKS §6) — используется
 * и в мутациях, и в чтении, т.к. все роуты этого домена — mentor-side.
 */

/** Сырые поля группы, нужные фичам домена (branch_id — для homework/tests/attendance). */
export async function getGroupOrThrow(groupId, db = pool) {
  const { rows: [group] } = await db.query(
    `SELECT id, branch_id, mentor_id, name, subject, monthly_price, is_archived, schedule
       FROM groups
      WHERE id = $1 AND deleted_at IS NULL`,
    [groupId],
  );
  if (!group) throw new AppError(404, 'Group not found');
  return group;
}

/**
 * Бросает 404, если mentorId не ведёт эту группу (ТЗ K-AUTH §2: чужая группа
 * неотличима от несуществующей — существование не раскрываем).
 * Возвращает саму группу (для branch_id и т.п.).
 */
export async function requireMentorGroup(mentorId, groupId, db = pool) {
  const group = await getGroupOrThrow(groupId, db);
  if (group.mentor_id !== mentorId) {
    throw new AppError(404, 'Group not found');
  }
  return group;
}
