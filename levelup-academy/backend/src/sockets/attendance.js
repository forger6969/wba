import { pool } from '../config/db.js';
import * as attendanceService from '../modules/mentor/attendance/attendance.service.js';
import { markAttendanceBodySchema, listAttendanceQuerySchema } from '../modules/mentor/attendance/attendance.schemas.js';

/**
 * Журнал davomat целиком поверх Socket.IO: чтение, запись и живые обновления
 * идут одним каналом.
 *
 * Почему не только уведомления, как было раньше: ментор отмечает журнал во
 * время урока, десятками кликов подряд. Каждый HTTP-запрос — это новое
 * рукопожатие и заголовки ради двух полей; постоянное соединение уже открыто,
 * и по нему то же самое уходит одним кадром. Плюс исчезает круг «сохранили по
 * HTTP → пришло событие → перезапросили по HTTP»: ответ и рассылка происходят
 * в одном месте.
 *
 * REST-эндпоинты при этом остались и никуда не денутся — это запасной путь для
 * клиента, у которого сокет не поднялся, и точка входа для интеграций.
 *
 * Права проверяются в каждом обработчике, а не только при подписке: сокет
 * живёт долго, роль и состав групп за это время могут измениться.
 */
export const attendanceRoom = (groupId) => `attendance:${groupId}`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Может ли пользователь наблюдать журнал этой группы. */
async function canWatchGroup(user, groupId) {
  if (!UUID_RE.test(String(groupId ?? ''))) return false;

  const { rows: [group] } = await pool.query(
    `SELECT g.id, g.mentor_id, g.branch_id, b.organization_id
       FROM groups g
       JOIN branches b ON b.id = g.branch_id
      WHERE g.id = $1 AND g.deleted_at IS NULL`,
    [groupId],
  );
  if (!group) return false;

  if (user.role === 'mentor') return group.mentor_id === user.id;
  if (user.role === 'admin') return group.branch_id === user.branchId;
  if (user.role === 'ceo') return group.organization_id === user.organizationId;
  return false;
}

/**
 * Обёртка обработчика: ack всегда получает ответ ровно один раз, а исключение
 * не роняет соединение. Без неё любая ошибка в обработчике оставляла бы клиента
 * ждать ack до таймаута, а журнал — в состоянии «не сохранено, но почему —
 * непонятно».
 */
function handler(fn) {
  return async (payload, ack) => {
    if (typeof ack !== 'function') return;   // без ack отвечать некуда
    try {
      ack({ ok: true, ...(await fn(payload ?? {})) });
    } catch (err) {
      // zod кидает ZodError с массивом issues — отдаём первое сообщение
      const message = err?.issues?.[0]?.message ?? err.message ?? 'Internal error';
      ack({ ok: false, error: message, status: err.statusCode ?? 400 });
    }
  };
}

export function registerAttendance(io, socket) {
  const { user } = socket;

  socket.on('attendance:subscribe', async ({ groupId } = {}, ack) => {
    try {
      if (!(await canWatchGroup(user, groupId))) throw new Error('Forbidden');
      socket.join(attendanceRoom(groupId));
      ack?.({ ok: true });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on('attendance:unsubscribe', ({ groupId } = {}, ack) => {
    if (UUID_RE.test(String(groupId ?? ''))) socket.leave(attendanceRoom(groupId));
    ack?.({ ok: true });
  });

  /**
   * Чтение журнала. Тело валидируется той же схемой, что и REST-запрос:
   * два входа в одну функцию не должны расходиться в том, что считают
   * допустимым.
   */
  socket.on('attendance:fetch', handler(async ({ groupId, ...query }) => {
    if (!UUID_RE.test(String(groupId ?? ''))) throw new Error('Invalid groupId');
    const parsed = listAttendanceQuerySchema.parse(query);

    const records = await attendanceService.getGroupAttendance({
      mentorId: user.id,
      groupId,
      ...parsed,
    });
    return { records };
  }));

  /**
   * Запись отметок. Права и запись — в том же сервисе, что обслуживает REST:
   * дублировать проверку доступа во втором месте значит однажды поправить
   * только одно из них.
   *
   * Рассылку в комнату делает сам сервис, поэтому здесь её нет — иначе
   * подписчики получили бы событие дважды.
   */
  socket.on('attendance:mark', handler(async ({ groupId, ...body }) => {
    if (!UUID_RE.test(String(groupId ?? ''))) throw new Error('Invalid groupId');
    const parsed = markAttendanceBodySchema.parse(body);

    const records = await attendanceService.markAttendance({
      mentorId: user.id,
      groupId,
      lessonDate: parsed.lessonDate,
      records: parsed.records,
    });
    return { records, lessonDate: parsed.lessonDate };
  }));
}
