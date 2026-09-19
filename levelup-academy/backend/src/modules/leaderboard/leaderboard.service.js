import { pool } from '../../config/db.js';
import { redis } from '../../config/redis.js';
import { isoWeekKey, monthKey } from '../../shared/period.js';

/** Начало текущего периода (локальное время процесса = TZ продукта), для SQL-фильтра. */
function periodStart(period, date = new Date()) {
  if (period === 'week') {
    const dayNum = (date.getDay() + 6) % 7; // Пн=0 ... Вс=6
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() - dayNum);
    return d;
  }
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Лидерборды считаются из Redis ZSET, которые инкрементит coins.service.emitCoinsChanged
 * на положительных начислениях. Ключ на период (week/month) на филиал — «сброс»
 * рейтинга происходит сам при смене периода.
 */

const keyFor = (branchId, period) =>
  period === 'week'
    ? `lb:branch:${branchId}:week:${isoWeekKey()}`
    : `lb:branch:${branchId}:month:${monthKey()}`;

/** Топ-N с именами студентов + позиция запрашивающего. */
export async function getLeaderboard(branchId, period, { limit = 20, studentId = null } = {}) {
  const key = keyFor(branchId, period);

  try {
    // ZSET: [member, score, member, score, ...] по убыванию
    const flat = await redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');
    const ranked = [];
    for (let i = 0; i < flat.length; i += 2) {
      ranked.push({ studentId: flat[i], coins: Number(flat[i + 1]), rank: i / 2 + 1 });
    }

    const names = await resolveNames(ranked.map((r) => r.studentId));
    const top = ranked.map((r) => ({ ...r, ...names[r.studentId] }));

    let me = null;
    if (studentId) {
      const [rank, score] = await Promise.all([
        redis.zrevrank(key, studentId),
        redis.zscore(key, studentId),
      ]);
      me = rank === null ? { rank: null, coins: 0 } : { rank: rank + 1, coins: Number(score) };
    }

    return { period, top, me };
  } catch {
    // Redis — ускоритель, а не источник истины. Локальная разработка и временный
    // сбой Redis не должны превращать весь кабинет ученика/родителя в HTTP 500.
    return getLeaderboardFromDatabase(branchId, period, { limit, studentId });
  }
}

async function getLeaderboardFromDatabase(branchId, period, { limit, studentId }) {
  const since = periodStart(period);
  const { rows } = await pool.query(
    `SELECT u.id AS "studentId", u.first_name AS "firstName", u.last_name AS "lastName",
            u.avatar_key AS "avatarKey", COALESCE(SUM(ch.amount) FILTER (WHERE ch.amount > 0), 0)::int AS coins
       FROM student_profiles sp
       JOIN users u ON u.id = sp.user_id AND u.deleted_at IS NULL
       LEFT JOIN coin_history ch ON ch.student_id = u.id AND ch.created_at >= $2
      WHERE sp.branch_id = $1
      GROUP BY u.id, u.first_name, u.last_name, u.avatar_key
      ORDER BY coins DESC, u.first_name, u.last_name`,
    [branchId, since],
  );
  const ranked = rows.map((row, index) => ({ ...row, rank: index + 1 }));
  const own = studentId ? ranked.find((row) => row.studentId === studentId) : null;
  return {
    period,
    top: ranked.slice(0, limit),
    me: studentId ? (own ? { rank: own.rank, coins: own.coins } : { rank: null, coins: 0 }) : null,
  };
}

/**
 * Топ группы — не из Redis (ZSET копит только по филиалу, а `coin_history.group_id`
 * заполняется лишь для операций из бюджета ментора — большинство строк NULL, см.
 * миграцию 1783850000000). Считаем напрямую по `coin_history` для участников группы:
 * та же семантика, что и у ZSET (сумма положительных начислений за период), просто SQL.
 * Групп мало людьми — читаем всех участников без LIMIT, ранжируем в JS.
 */
export async function getGroupLeaderboard(groupId, period, { limit = 20, studentId = null } = {}) {
  const since = periodStart(period);
  const { rows } = await pool.query(
    `SELECT gs.student_id AS "studentId", u.first_name AS "firstName", u.last_name AS "lastName",
            u.avatar_key AS "avatarKey",
            COALESCE((
              SELECT SUM(ch.amount) FROM coin_history ch
               WHERE ch.student_id = gs.student_id AND ch.amount > 0 AND ch.created_at >= $2
            ), 0)::int AS coins
       FROM group_students gs
       JOIN users u ON u.id = gs.student_id
      WHERE gs.group_id = $1 AND gs.left_at IS NULL
      ORDER BY coins DESC, u.first_name ASC`,
    [groupId, since],
  );

  const ranked = rows.map((r, i) => ({ ...r, rank: i + 1 }));
  const top = ranked.slice(0, limit);
  const me = studentId ? (ranked.find((r) => r.studentId === studentId) ?? null) : null;

  return { period, top, me: me ? { rank: me.rank, coins: me.coins } : null };
}

async function resolveNames(ids) {
  if (ids.length === 0) return {};
  const { rows } = await pool.query(
    `SELECT id, first_name, last_name, avatar_key FROM users WHERE id = ANY($1)`,
    [ids],
  );
  return Object.fromEntries(
    rows.map((u) => [
      u.id,
      { firstName: u.first_name, lastName: u.last_name, avatarKey: u.avatar_key },
    ]),
  );
}
