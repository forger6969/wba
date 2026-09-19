/**
 * Отправить ментору сообщение от имени родителя или ученика — чтобы вживую
 * проверить, доходит ли уведомление в открытую вкладку.
 *
 *   node scripts/send-test-dm.mjs parent  "Salom, o'g'lim bugun kelmadi"
 *   node scripts/send-test-dm.mjs demostu1 "Uy vazifani tushunmadim"
 *
 * Первый аргумент — login_code (`demopare`, `demostu1`, …) или слово `parent`
 * как синоним `demopare`. Второй — текст; без него отправится текст с меткой
 * времени, чтобы каждое сообщение было заметно новым.
 *
 * Скрипт локальный: DATABASE_URL по умолчанию берётся из docker-compose, а не
 * из .env — тот смотрит на продакшн-Neon, и слать туда тестовые сообщения
 * незачем. Токен подписывается тем же JWT_ACCESS_SECRET, что и обычный вход,
 * поэтому пароль тестового аккаунта знать не нужно.
 */
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { io } from 'socket.io-client';

const API = process.env.TEST_API ?? 'http://localhost:4100';
const DB = process.env.TEST_DB ?? 'postgresql://levelup:levelup@localhost:5432/levelup';
const MENTOR_EMAIL = process.env.TEST_MENTOR ?? 'mentor.demo@levelup.local';

const [rawWho = 'parent', ...rest] = process.argv.slice(2);
const who = rawWho === 'parent' ? 'demopare' : rawWho;
const body = rest.join(' ') || `Test xabar ${new Date().toLocaleTimeString('ru-RU')}`;

const db = new pg.Client({ connectionString: DB });
await db.connect();
const { rows: [sender] } = await db.query(
  `SELECT id, role, organization_id, branch_id, first_name, last_name
     FROM users WHERE login_code = $1 AND deleted_at IS NULL`,
  [who],
);
const { rows: [mentor] } = await db.query(
  'SELECT id, first_name, last_name FROM users WHERE email = $1',
  [MENTOR_EMAIL],
);
await db.end();

if (!sender) throw new Error(`нет пользователя с кодом «${who}»`);
if (!mentor) throw new Error(`нет ментора ${MENTOR_EMAIL}`);

const token = jwt.sign(
  { role: sender.role, orgId: sender.organization_id, branchId: sender.branch_id },
  process.env.JWT_ACCESS_SECRET,
  { subject: sender.id, expiresIn: '10m' },
);

const socket = io(API, { auth: { token }, transports: ['websocket'] });
await new Promise((resolve, reject) => {
  socket.on('connect', resolve);
  socket.on('connect_error', (e) => reject(new Error(`сокет: ${e.message}`)));
  setTimeout(() => reject(new Error('сокет: таймаут')), 8000);
});

// Родитель и ученик пишут в УЖЕ существующую комнату — событие reply, а не
// send: первым начинать диалог они не вправе.
const ack = await new Promise((resolve) => {
  const t = setTimeout(() => resolve({ ok: false, error: 'timeout' }), 8000);
  socket.emit('chat:dm:reply', { staffId: mentor.id, body }, (res) => {
    clearTimeout(t);
    resolve(res ?? { ok: false, error: 'нет ответа' });
  });
});

socket.close();

const from = `${sender.first_name} ${sender.last_name} (${sender.role})`;
if (ack.ok) {
  console.log(`\n  ✓ отправлено: ${from} → ${mentor.first_name} ${mentor.last_name}`);
  console.log(`    текст:   «${body}»`);
  console.log(`    комната: ${ack.roomKey}\n`);
} else {
  console.log(`\n  ✗ не отправлено: ${from} → ошибка: ${ack.error}\n`);
  process.exitCode = 1;
}
