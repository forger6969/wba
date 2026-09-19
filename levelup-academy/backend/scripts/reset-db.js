/**
 * Полная очистка базы и создание единственного пользователя — Main Admin.
 *
 * Зачем отдельно от seed.js: seed наполняет базу демо-данными (организация,
 * филиал, группы, 60 студентов) — это нужно для разработки и мешает, когда
 * систему готовят к передаче. Здесь наоборот: пусто, кроме владельца платформы.
 *
 * Что делает:
 *   1. TRUNCATE всех таблиц данных, КРОМЕ pgmigrations — схема и история
 *      миграций остаются, иначе следующий деплой попытается накатить их заново;
 *   2. вставляет одного пользователя с ролью main_admin;
 *   3. печатает готовый SQL для Neon, если базу нельзя тронуть отсюда.
 *
 * Пароль хешируется argon2id — тем же способом, что и при обычной регистрации,
 * поэтому вход работает без каких-либо оговорок.
 *
 * Запуск:
 *   node scripts/reset-db.js --email a@b.c --password 'Secret' [--phone +998...] [--dry]
 *   --dry  — ничего не менять, только показать SQL (для вставки в Neon SQL Editor)
 *
 * ⚠️ Действие необратимо. Скрипт требует подтверждения именем базы: он печатает,
 * к какой базе подключён, и без флага --yes ничего не делает.
 */
import { hash } from 'argon2';
import { pool } from '../src/config/db.js';
import { env } from '../src/config/env.js';

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

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const has = (name) => process.argv.includes(`--${name}`);

const email = arg('email', env.SEED_MAIN_ADMIN_EMAIL);
const password = arg('password', env.SEED_MAIN_ADMIN_PASSWORD);
const phone = arg('phone', env.SEED_MAIN_ADMIN_PHONE);
const firstName = arg('first', 'Azizbek');
const lastName = arg('last', 'Amangeldiev');

async function main() {
  const passwordHash = await hash(password);

  const truncate = `TRUNCATE TABLE ${TABLES.join(', ')} RESTART IDENTITY CASCADE;`;
  const insert =
    `INSERT INTO users (role, first_name, last_name, phone, email, password_hash, status)\n` +
    `VALUES ('main_admin', '${firstName}', '${lastName}', '${phone}', '${email}', '${passwordHash}', 'active');`;

  if (has('dry')) {
    console.log('-- SQL для ручного выполнения (например, в Neon SQL Editor).');
    console.log('-- Хеш пароля уже посчитан, дополнительных действий не требуется.');
    console.log('BEGIN;');
    console.log(truncate);
    console.log(insert);
    console.log('COMMIT;');
    await pool.end();
    return;
  }

  // куда мы вообще подключены — самое важное, что нужно увидеть перед TRUNCATE
  const { rows: [db] } = await pool.query(
    'SELECT current_database() AS name, inet_server_addr()::text AS host',
  );
  const target = `${db.name} @ ${db.host ?? 'локальный сокет'}`;

  if (!has('yes')) {
    console.log(`База: ${target}`);
    console.log(`Будет удалено всё из ${TABLES.length} таблиц и создан один main_admin: ${email}`);
    console.log('Действие необратимо. Повторите запуск с флагом --yes, если это то, что нужно.');
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(truncate);
    const { rows: [user] } = await client.query(
      `INSERT INTO users (role, first_name, last_name, phone, email, password_hash, status)
       VALUES ('main_admin', $1, $2, $3, $4, $5, 'active')
       RETURNING id, email, role`,
      [firstName, lastName, phone, email, passwordHash],
    );
    await client.query('COMMIT');
    console.log(`База очищена: ${target}`);
    console.log(`Создан ${user.role}: ${user.email} (id ${user.id})`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Откат, ничего не изменено:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
