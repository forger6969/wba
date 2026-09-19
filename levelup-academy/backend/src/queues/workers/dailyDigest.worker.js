import { Queue, Worker } from 'bullmq';
import { redisConnection } from '../../config/redis.js';
import { pool } from '../../config/db.js';
import { logger } from '../../config/logger.js';
import { sendToGroupParentChat } from '../../modules/telegram/groupNotify.js';

const QUEUE_NAME = 'daily-digest';
const dailyDigestQueue = new Queue(QUEUE_NAME, { connection: redisConnection });

export async function scheduleDailyDigestCron() {
  await dailyDigestQueue.upsertJobScheduler(
    'daily-digest-midnight',
    { pattern: '0 0 * * *', tz: 'Asia/Tashkent' },
    { name: 'daily-digest.run' },
  );
}

export const dailyDigestWorker = new Worker(QUEUE_NAME, async () => {
  const { rows } = await pool.query(
    `SELECT g.id AS group_id, g.name AS group_name, h.id AS homework_id,
            h.title AS homework_title, h.max_score, u.first_name, u.last_name,
            COALESCE(s.score, 0) AS score
       FROM homework h
       JOIN groups g ON g.id = h.group_id AND g.deleted_at IS NULL
       JOIN group_students gs ON gs.group_id = g.id AND gs.left_at IS NULL
       JOIN users u ON u.id = gs.student_id AND u.deleted_at IS NULL AND u.status = 'active'
       LEFT JOIN homework_submissions s ON s.homework_id = h.id AND s.student_id = gs.student_id
      WHERE h.deleted_at IS NULL AND h.is_archived = false
        AND h.deadline >= (CURRENT_DATE - INTERVAL '1 day') AND h.deadline < CURRENT_DATE
      ORDER BY g.id, h.id, u.last_name, u.first_name`,
  );
  const reports = new Map();
  for (const row of rows) {
    const key = `${row.group_id}:${row.homework_id}`;
    if (!reports.has(key)) reports.set(key, []);
    reports.get(key).push(row);
  }
  for (const items of reports.values()) {
    const first = items[0];
    const lines = items.map((r) =>
      `• ${r.first_name} ${r.last_name}: ${Math.round((Number(r.score) / Math.max(1, Number(r.max_score))) * 100)}%`).join('\n');
    const text = `<b>📚 ${first.group_name} — uy vazifasi</b>\n${first.homework_title}\n\n${lines}\n\nIltimos, o'quvchilar uy vazifasini vaqtida bajarishiga yordam bering.`;
    // Sequential sends avoid Telegram flood limits.
    // eslint-disable-next-line no-await-in-loop
    const sent = await sendToGroupParentChat(first.group_id, text);
    if (!sent) logger.warn({ groupId: first.group_id }, 'daily digest skipped');
  }
  logger.info({ reports: reports.size, students: rows.length }, 'Daily digest completed');
}, { connection: redisConnection });

dailyDigestWorker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'Daily digest failed'));
dailyDigestWorker.on('error', (err) => logger.error({ err }, 'Daily digest worker error'));
dailyDigestQueue.on('error', (err) => logger.error({ err }, 'Daily digest queue error'));
