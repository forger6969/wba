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

/**
 * Доступ к группе с учётом роли, а не только «свой ментор».
 *
 * Понадобилось 24.09.2026 (WBA): администратор и суперадмин должны вести
 * davomat в ЛЮБОЙ группе, а не только в той, где сами записаны ментором.
 * Ровно эта логика уже жила в сокет-слое (sockets/attendance.js, canAccess),
 * но сервис её не знал и отвечал 404 — один и тот же человек проходил через
 * сокет и получал отказ через REST. Теперь правило одно и лежит здесь.
 *
 * Скоуп у каждой роли свой: ментор — свои группы, admin/branch_manager —
 * свой филиал, ceo — вся организация. Отказ везде 404, а не 403: существование
 * чужой группы не раскрывается (K-AUTH §2).
 */
export async function requireGroupAccess(actor, groupId, db = pool) {
  const group = await getGroupOrThrow(groupId, db);
  const role = actor?.role;

  if (role === 'admin' || role === 'branch_manager') {
    if (group.branch_id !== actor.branchId) throw new AppError(404, 'Group not found');
    return group;
  }

  if (role === 'ceo') {
    const { rows: [branch] } = await db.query(
      'SELECT organization_id FROM branches WHERE id = $1 AND deleted_at IS NULL',
      [group.branch_id],
    );
    if (!branch || branch.organization_id !== actor.organizationId) {
      throw new AppError(404, 'Group not found');
    }
    return group;
  }

  // mentor и всё остальное — прежнее правило «только своя группа»
  if (group.mentor_id !== actor?.id) throw new AppError(404, 'Group not found');
  return group;
}

/** Роли, которым журнал открыт целиком — включая прошедшие и будущие даты. */
export function canEditAnyLessonDate(role) {
  return role === 'admin' || role === 'branch_manager' || role === 'ceo';
}
