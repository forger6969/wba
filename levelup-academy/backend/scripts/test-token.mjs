/**
 * Выдать access-токен тестовому аккаунту — для Postman и curl.
 *
 *   node scripts/test-token.mjs mentor.demo@levelup.local
 *   node scripts/test-token.mjs demopare        # родитель, по login_code
 *   node scripts/test-token.mjs demostu1 24h    # ученик Ali, срок жизни сутки
 *
 * Печатает токен, id пользователя и готовые room_key его диалогов, чтобы не
 * собирать их руками.
 *
 * Токен подписывается тем же JWT_ACCESS_SECRET, что и обычный вход, поэтому
 * пароль знать не нужно — но и работает он только против того бэкенда, у
 * которого этот секрет. База берётся локальная (docker-compose), а не из .env:
 * тот смотрит на продакшн-Neon.
 */
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import pg from 'pg';

const DB = process.env.TEST_DB ?? 'postgresql://levelup:levelup@localhost:5432/levelup';
const [who, ttl = '12h'] = process.argv.slice(2);

if (!who) {
  console.error('укажите email или login_code: node scripts/test-token.mjs demopare');
  process.exit(1);
}

const db = new pg.Client({ connectionString: DB });
await db.connect();
const { rows: [u] } = await db.query(
  `SELECT id, role, email, login_code, first_name, last_name,
          organization_id, branch_id
     FROM users
    WHERE (email = $1 OR login_code = $1) AND deleted_at IS NULL`,
  [who],
);

if (!u) {
  await db.end();
  console.error(`нет пользователя «${who}»`);
  process.exit(1);
}

const token = jwt.sign(
  { role: u.role, orgId: u.organization_id, branchId: u.branch_id },
  process.env.JWT_ACCESS_SECRET,
  { subject: u.id, expiresIn: ttl },
);

// Комнаты, в которых этот человек участвует: staff ↔ собеседник.
const { rows: rooms } = await db.query(
  `SELECT DISTINCT room_key FROM chat_messages
    WHERE room_key LIKE '%' || $1 || '%' ORDER BY room_key`,
  [u.id],
);
await db.end();

console.log(`
  Кто:      ${u.first_name} ${u.last_name} (${u.role})
  user id:  ${u.id}
  срок:     ${ttl}

  TOKEN:
${token}

  Комнаты с перепиской (${rooms.length}):`);
rooms.forEach((r) => console.log(`    ${r.room_key}`));
console.log('');
