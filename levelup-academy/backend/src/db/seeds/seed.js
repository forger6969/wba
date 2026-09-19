/**
 * Dev seed (идемпотентный):
 *   1. main_admin — владелец платформы
 *   2. demo org + main branch + ceo + mentor (вход по email)
 *   3. demo студенты + parent (вход по логин-коду + пароль) + группа + членство —
 *      минимальный набор для прогона auth/mentor/student/parent-флоу.
 *
 * Все пароли = SEED_MAIN_ADMIN_PASSWORD, кроме student/parent (свои). argon2id. Run: npm run seed
 */
import argon2 from 'argon2';
import { pool } from '../../config/db.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

const DEMO_ORG_NAME = 'Demo Learning Center';
const DEMO_CEO_PHONE = '+998901111111';
const DEMO_MENTOR_EMAIL = 'mentor.demo@levelup.local';
const DEMO_ADMIN_EMAIL = 'admin.demo@levelup.local';
const DEMO_ADMIN_PHONE = '+998902222222';
// фиксированные демо-креды student/parent (в реале генерятся при заведении ученика)
const DEMO_STUDENTS = [
  { code: 'demostu1', pass: '111111', firstName: 'Ali', lastName: 'Valiyev' },
  { code: 'demostu2', pass: '222222', firstName: 'Vali', lastName: 'Aliyev' },
  { code: 'demostu3', pass: '333333', firstName: 'Sami', lastName: 'Karimov' },
];
const DEMO_PARENT = { code: 'demopare', pass: '654321' };
const DEMO_GROUP = { name: 'JavaScript Basics', subject: 'JavaScript', monthlyPrice: 500000 };

const hash = (p) => argon2.hash(p, { type: argon2.argon2id });

/** insert-if-missing по указанному полю (для строк без стабильного ON CONFLICT). */
async function ensureUser(client, key, cols) {
  const { rows } = await client.query(
    `SELECT id FROM users WHERE ${key.by} = $1 AND deleted_at IS NULL`,
    [key.value],
  );
  if (rows[0]) return rows[0].id;
  const names = Object.keys(cols);
  const placeholders = names.map((_, i) => `$${i + 1}`).join(', ');
  const { rows: [row] } = await client.query(
    `INSERT INTO users (${names.join(', ')}) VALUES (${placeholders}) RETURNING id`,
    Object.values(cols),
  );
  return row.id;
}

/** Идемпотентный get-or-create по id: сначала SELECT, при отсутствии — INSERT. */
async function getOrCreate(client, selectSql, selectParams, insertSql, insertParams) {
  const found = await client.query(selectSql, selectParams);
  if (found.rows[0]) return found.rows[0].id;
  const created = await client.query(insertSql, insertParams);
  return created.rows[0].id;
}

/**
 * Отказаться работать, если DATABASE_URL смотрит не на локальную базу.
 *
 * Почему проверка в коде, а не предупреждение в README. Инструкция запуска в
 * backend/README.md называет `npm run seed` пятым шагом, и это правда — но
 * только для машины, где база локальная. На деле `.env` разработчика может
 * указывать в облако: у владельца проекта DATABASE_URL ведёт в боевой Neon,
 * REDIS_URL в Upstash, S3 в Storj. При NODE_ENV=development (значение по
 * умолчанию из config/env.js) сид тогда создаёт демо-организацию и демо-учеников
 * прямо в живой базе, где сидят настоящие пользователи.
 *
 * Прочитавший README человек — или агент — выполнит пятый шаг буквально.
 * Текстовое предупреждение это не останавливает: его либо не заметят, либо
 * README вообще не откроют. Останавливает только отказ запуститься.
 *
 * Данные сид не разрушает (идемпотентные upsert, ни TRUNCATE, ни DELETE), но
 * мусор в проде вычищать придётся руками, а какие записи демо, а какие живые —
 * потом уже не отличить.
 *
 * Сознательный запуск против удалённой базы остаётся возможен: SEED_ALLOW_REMOTE=yes.
 * Осознанное действие требует одного лишнего слова — случайное не проходит.
 */
const LOCAL_DB_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'postgres', 'db']);

function assertLocalDatabase() {
  if (process.env.SEED_ALLOW_REMOTE === 'yes') {
    logger.warn('SEED_ALLOW_REMOTE=yes — проверка локальной базы отключена вручную');
    return;
  }

  const host = (env.DATABASE_URL.match(/@([^:/?]+)/) || [])[1] || '';
  if (LOCAL_DB_HOSTS.has(host)) return;

  logger.error(
    { host },
    'Сид остановлен: DATABASE_URL ведёт не на локальную базу.\n' +
      'Похоже, это облачная (боевая) база — сид записал бы в неё демо-данные.\n' +
      'Нужна локальная база: docker compose up -d и DATABASE_URL на localhost.\n' +
      'Если удалённая база нужна намеренно: SEED_ALLOW_REMOTE=yes npm run seed',
  );
  process.exit(1);
}

async function seed() {
  assertLocalDatabase();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const adminHash = await hash(env.SEED_MAIN_ADMIN_PASSWORD);

    // 1. main_admin
    const { rows: [mainAdmin] } = await client.query(
      `INSERT INTO users (role, first_name, last_name, phone, email, password_hash)
       VALUES ('main_admin', 'Platform', 'Owner', $1, $2, $3)
       ON CONFLICT (phone) DO UPDATE SET email = EXCLUDED.email, updated_at = now()
       RETURNING id`,
      [env.SEED_MAIN_ADMIN_PHONE, env.SEED_MAIN_ADMIN_EMAIL, adminHash],
    );

    if (env.NODE_ENV === 'development') {
      // 2. org + main branch (name не уникален → get-or-create без ON CONFLICT)
      const orgId = await getOrCreate(
        client,
        `SELECT id FROM organizations WHERE name = $1`, [DEMO_ORG_NAME],
        `INSERT INTO organizations (name, status, plan) VALUES ($1, 'active', 'demo') RETURNING id`,
        [DEMO_ORG_NAME],
      );

      const branchId = await getOrCreate(
        client,
        `SELECT id FROM branches WHERE organization_id = $1 AND is_main = true`, [orgId],
        `INSERT INTO branches (organization_id, name, is_main) VALUES ($1, 'Main Branch', true) RETURNING id`,
        [orgId],
      );

      // ceo (email)
      const { rows: [ceo] } = await client.query(
        `INSERT INTO users (organization_id, role, first_name, last_name, phone, email, password_hash)
         VALUES ($1, 'ceo', 'Demo', 'CEO', $2, $3, $4)
         ON CONFLICT (phone) DO UPDATE SET email = EXCLUDED.email, updated_at = now()
         RETURNING id`,
        [orgId, DEMO_CEO_PHONE, env.SEED_CEO_EMAIL, adminHash],
      );
      await client.query(
        `UPDATE organizations SET owner_user_id = $1, updated_at = now() WHERE id = $2`,
        [ceo.id, orgId],
      );

      // mentor (email)
      const mentorId = await ensureUser(client, { by: 'email', value: DEMO_MENTOR_EMAIL }, {
        organization_id: orgId, branch_id: branchId, role: 'mentor',
        first_name: 'Demo', last_name: 'Mentor', email: DEMO_MENTOR_EMAIL,
        password_hash: adminHash,
      });

      // admin (email)
      const adminId = await ensureUser(client, { by: 'email', value: DEMO_ADMIN_EMAIL }, {
        organization_id: orgId, branch_id: branchId, role: 'admin',
        first_name: 'Demo', last_name: 'Admin', email: DEMO_ADMIN_EMAIL,
        phone: DEMO_ADMIN_PHONE, password_hash: adminHash,
      });

      // студенты (логин-код + пароль) + профили
      const studentIds = [];
      for (const s of DEMO_STUDENTS) {
        const sid = await ensureUser(client, { by: 'login_code', value: s.code }, {
          organization_id: orgId, branch_id: branchId, role: 'student',
          first_name: s.firstName, last_name: s.lastName, login_code: s.code,
          password_hash: await hash(s.pass),
        });
        studentIds.push(sid);
        await client.query(
          `INSERT INTO student_profiles (user_id, branch_id)
           VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`,
          [sid, branchId],
        );
      }

      // parent (логин-код + пароль), привязан к первому студенту
      const parentId = await ensureUser(client, { by: 'login_code', value: DEMO_PARENT.code }, {
        organization_id: orgId, branch_id: branchId, role: 'parent',
        first_name: 'Demo', last_name: 'Parent', login_code: DEMO_PARENT.code,
        password_hash: await hash(DEMO_PARENT.pass),
      });
      await client.query(
        `UPDATE student_profiles SET parent_id = $1, updated_at = now() WHERE user_id = $2`,
        [parentId, studentIds[0]],
      );

      // группа (ведёт ментор) + членство студентов
      const groupId = await getOrCreate(
        client,
        `SELECT id FROM groups WHERE branch_id = $1 AND name = $2`, [branchId, DEMO_GROUP.name],
        `INSERT INTO groups (branch_id, mentor_id, name, subject, monthly_price)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [branchId, mentorId, DEMO_GROUP.name, DEMO_GROUP.subject, DEMO_GROUP.monthlyPrice],
      );
      for (const sid of studentIds) {
        await client.query(
          `INSERT INTO group_students (group_id, student_id)
           VALUES ($1, $2) ON CONFLICT (group_id, student_id) DO NOTHING`,
          [groupId, sid],
        );
      }

      logger.info({ orgId, branchId, mentorId, adminId, groupId, students: studentIds.length },
        'Demo dev data seeded');
    }

    await client.query('COMMIT');
    logger.info({ mainAdminId: mainAdmin.id }, 'Seed completed');
    logger.info(
      { students: DEMO_STUDENTS.map((s) => ({ login: s.code, pass: s.pass })),
        parentLogin: DEMO_PARENT.code, parentPass: DEMO_PARENT.pass,
        adminLogin: DEMO_ADMIN_EMAIL, adminPass: env.SEED_MAIN_ADMIN_PASSWORD },
      'Demo student/parent/admin creds (dev only)',
    );
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

seed()
  .then(() => pool.end())
  .catch((err) => {
    logger.error({ err }, 'Seed failed');
    process.exit(1);
  });
