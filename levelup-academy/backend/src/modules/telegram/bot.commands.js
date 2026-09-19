import { getDashboard } from '../student/home/home.service.js';
import { getLeaderboard } from '../leaderboard/leaderboard.service.js';
import { getBalance } from '../coins/coins.service.js';

/**
 * Команды, доступные ПОСЛЕ привязки: ученик спрашивает бота о своих коинах,
 * рейтинге и ближайших дедлайнах, не открывая сайт.
 *
 * Данные берутся из тех же сервисов, что и кабинет (`getDashboard`,
 * `getLeaderboard`, `getBalance`) — namеренно, чтобы бот и сайт не могли
 * разойтись в цифрах. Своих запросов к БД здесь нет.
 *
 * Все команды требуют привязанного чата: `resolveUser` возвращает null, если
 * `telegram_accounts` не знает этот chat_id, и вызывающий отвечает подсказкой
 * про привязку. Ни одна команда не создаёт привязку сама — иначе открывший
 * ссылку присвоил бы себе чужой аккаунт.
 */

const LEADERBOARD_LIMIT = 10;

/** Кто владеет этим чатом. null — чат не привязан или аккаунт неактивен. */
export async function resolveUser(pool, chatId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.role, u.first_name, u.last_name, u.branch_id, u.status, u.preferred_language
       FROM telegram_accounts ta
       JOIN users u ON u.id = ta.user_id
      WHERE ta.tg_chat_id = $1
        AND u.deleted_at IS NULL`,
    [chatId],
  );
  const user = rows[0];
  if (!user || user.status !== 'active') return null;
  return {
    id: user.id,
    role: user.role,
    firstName: user.first_name,
    branchId: user.branch_id,
    preferredLanguage: user.preferred_language,
  };
}

const num = (v) => Number(v || 0).toLocaleString('ru-RU').replace(/ /g, ' ');

const shortDate = (d) => {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}`;
};

/** Место в рейтинге читается одинаково в трёх командах — держим в одном месте. */
const rankLine = (rank) =>
  rank && rank.rank ? `${rank.rank}-o'rin (${num(rank.coins)} coin)` : 'reytingda hali yo‘qsiz';

export async function coinsCommand(user) {
  const [coins, board] = await Promise.all([
    getBalance(user.id),
    getLeaderboard(user.branchId, 'week', { limit: 1, studentId: user.id }),
  ]);

  return [
    `🪙 <b>Coinlaringiz: ${num(coins)}</b>`,
    '',
    `🏆 Haftalik reyting: ${rankLine(board.me)}`,
  ].join('\n');
}

export async function ratingCommand(user) {
  const board = await getLeaderboard(user.branchId, 'week', {
    limit: LEADERBOARD_LIMIT,
    studentId: user.id,
  });

  if (!board.top.length) {
    return '🏆 <b>Haftalik reyting</b>\n\nBu hafta hali hech kim coin olmagan.';
  }

  const medals = ['🥇', '🥈', '🥉'];
  const lines = board.top.map((r, i) => {
    const mark = medals[i] || `${r.rank}.`;
    const name = [r.firstName, r.lastName].filter(Boolean).join(' ') || 'O‘quvchi';
    // Своя строка помечена, чтобы не искать себя глазами в списке из десяти.
    const me = r.studentId === user.id ? ' ⬅️' : '';
    return `${mark} ${name} — ${num(r.coins)}${me}`;
  });

  return [
    '🏆 <b>Haftalik reyting</b>',
    '',
    ...lines,
    '',
    `Sizning o‘rningiz: ${rankLine(board.me)}`,
  ].join('\n');
}

export async function homeCommand(user) {
  const d = await getDashboard({ id: user.id, branchId: user.branchId });

  const out = [`👤 <b>Salom, ${user.firstName || 'o‘quvchi'}!</b>`, ''];
  out.push(`🪙 Coin: <b>${num(d.coins)}</b>`);
  out.push(`🏆 Reyting: ${rankLine(d.rank)}`);
  out.push(
    Number(d.totalDebt) > 0
      ? `💰 Qarz: <b>${num(d.totalDebt)} so‘m</b>`
      : '✅ Qarzingiz yo‘q',
  );

  if (d.groups?.length) {
    out.push('', `👥 Guruhlar: ${d.groups.map((g) => g.name).join(', ')}`);
  }

  if (d.upcomingHomework?.length) {
    out.push('', '📚 <b>Yaqin vazifalar:</b>');
    for (const h of d.upcomingHomework) {
      out.push(`• ${h.title} — ${shortDate(h.deadline)}`);
    }
  } else {
    out.push('', '📚 Yaqin muddatli vazifa yo‘q');
  }

  return out.join('\n');
}
