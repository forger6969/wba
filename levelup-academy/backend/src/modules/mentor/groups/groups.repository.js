import { pool } from '../../../config/db.js';

/** Группы, которые ведёт ментор (read-only; CRUD групп — зона Admin). */
export function listMentorGroups(mentorId, db = pool) {
  return db
    .query(
      `SELECT g.id, g.name, g.subject, g.monthly_price, g.schedule, g.room, g.is_archived,
              (SELECT count(*) FROM group_students gs
                WHERE gs.group_id = g.id AND gs.left_at IS NULL) AS students
         FROM groups g
        WHERE g.mentor_id = $1 AND g.deleted_at IS NULL
        ORDER BY g.is_archived, g.name`,
      [mentorId],
    )
    .then((r) => r.rows);
}

/** Состав группы (для журнала davomat / выбора ученика). */
export function groupRoster(groupId, db = pool) {
  return db
    .query(
      // coins_today — чистое изменение за сегодня, а не только начисления:
      // если ментор дал 10 и тут же снял 5, честнее показать +5, чем +10.
      // Считается от начала текущих суток по времени сервера.
      // parent_id нужен интерфейсу, чтобы «написать родителю» открывало
      // конкретного человека по идентификатору. Раньше связь искалась по
      // совпадению имени ребёнка в списке контактов — тёзки и любое
      // расхождение в записи имени ломали её.
      `SELECT u.id, u.first_name, u.last_name, u.status,
              sp.coin_balance, sp.parent_id, gs.joined_at,
              COALESCE((
                SELECT sum(ch.amount)::int
                  FROM coin_history ch
                 WHERE ch.student_id = u.id
                   AND ch.created_at >= date_trunc('day', now())
              ), 0) AS coins_today
         FROM group_students gs
         JOIN users u ON u.id = gs.student_id
         JOIN student_profiles sp ON sp.user_id = u.id
        WHERE gs.group_id = $1 AND gs.left_at IS NULL AND u.deleted_at IS NULL
        ORDER BY u.first_name`,
      [groupId],
    )
    .then((r) => r.rows);
}
