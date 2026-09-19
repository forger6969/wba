/**
 * Показать, что лежит в базе, и выгрузить всё в JSON.
 *
 * Нужен перед необратимыми операциями: сначала смотрим, туда ли подключились
 * (у проекта в Neon может быть несколько одноимённых баз), и делаем дамп,
 * чтобы у удаления был откат, не зависящий от того, вспомнил ли кто-то создать
 * ветку-снимок.
 *
 * Запуск:
 *   DATABASE_URL="postgresql://..." DB_SSL=true node scripts/db-inspect.js [--dump путь.json]
 */
import { writeFileSync } from 'node:fs';
import pg from 'pg';

const TABLES = [
  'attendance', 'audit_log', 'branches', 'chat_messages', 'coin_history',
  'discipline_rules', 'expenses', 'group_feedback', 'group_students', 'groups', 'homework',
  'homework_submissions', 'invoices', 'leads', 'mentor_profiles',
  'mentor_salaries', 'methodology_lessons', 'methodology_questions',
  'org_announcements', 'organizations', 'payment_schedules',
  'platform_announcements', 'platform_pricing', 'refresh_tokens', 'reminders',
  'shop_items', 'shop_orders', 'staff_penalties', 'student_profiles',
  'telegram_accounts', 'test_results', 'tests', 'topics', 'training_types',
  'transactions', 'users', 'videos',
];

const dumpIdx = process.argv.indexOf('--dump');
const dumpPath = dumpIdx !== -1 ? process.argv[dumpIdx + 1] : null;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20_000,
});

const { rows: [where] } = await pool.query(
  `SELECT current_database() AS db, current_user AS usr,
          inet_server_addr()::text AS host, version() AS ver`,
);
console.log(`База:   ${where.db}`);
console.log(`Роль:   ${where.usr}`);
console.log(`Сервер: ${where.host ?? 'через pooler'}`);
console.log('');

const dump = {};
let total = 0;
const nonEmpty = [];

for (const t of TABLES) {
  const { rows } = await pool.query(`SELECT * FROM ${t}`);
  dump[t] = rows;
  total += rows.length;
  if (rows.length) nonEmpty.push([t, rows.length]);
}

console.log(`Непустых таблиц: ${nonEmpty.length}, строк всего: ${total}`);
for (const [t, n] of nonEmpty.sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(5)}  ${t}`);
}

const users = dump.users ?? [];
if (users.length) {
  console.log('\nПользователи по ролям:');
  const byRole = users.reduce((a, u) => ((a[u.role] = (a[u.role] || 0) + 1), a), {});
  for (const [r, n] of Object.entries(byRole).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}  ${r}`);
  }
}

if (dumpPath) {
  writeFileSync(dumpPath, JSON.stringify(dump, null, 2), 'utf8');
  console.log(`\nДамп сохранён: ${dumpPath}`);
}

await pool.end();
