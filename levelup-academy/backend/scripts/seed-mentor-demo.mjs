/**
 * Наполнить демо-ментора данными: группы, ученики, родители, посещаемость,
 * домашние задания, тесты, коины.
 *
 *   node scripts/seed-mentor-demo.mjs
 *   node scripts/seed-mentor-demo.mjs --clean     # только удалить созданное
 *
 * Зачем не рандом: у каждого ученика есть скрытый «уровень» 0..1, и от него
 * зависят и посещаемость, и оценки, и сдача домашних. Иначе экраны сравнения
 * учеников (гистограмма, «сильные / в зоне риска», слабые темы) показывают
 * ровный шум, на котором невозможно понять, работает подсчёт или нет.
 *
 * Скрипт идемпотентен: свои записи он помечает login_code `lu…` и при повторном
 * запуске сначала удаляет именно их. Существующие demo-аккаунты (demostud,
 * demostu1…3, demopare) не трогает — они заведены не здесь.
 *
 * База по умолчанию ЛОКАЛЬНАЯ. `.env` смотрит на продакшн-Neon, и наливать
 * туда сотни фиктивных учеников нельзя ни при каких обстоятельствах.
 */
import 'dotenv/config';
import argon2 from 'argon2';
import pg from 'pg';

const DB = process.env.TEST_DB ?? 'postgresql://levelup:levelup@localhost:5432/levelup';
const MENTOR_EMAIL = process.env.SEED_MENTOR ?? 'mentor.demo@levelup.local';
const CLEAN_ONLY = process.argv.includes('--clean');

const STUDENT_PASSWORD = '123456';
const PARENT_PASSWORD = '654321';

/* ---------- справочники ---------- */

const FIRST_M = ['Aziz', 'Bekzod', 'Doston', 'Eldor', 'Farrux', 'G\'ayrat', 'Hasan', 'Ibrohim',
  'Jasur', 'Kamron', 'Lutfulla', 'Muhammad', 'Nodir', 'Otabek', 'Rustam', 'Sardor',
  'Temur', 'Ulug\'bek', 'Vohid', 'Zafar', 'Shohruh', 'Alisher', 'Bobur', 'Davron'];
const FIRST_F = ['Aziza', 'Barno', 'Dilnoza', 'Elnora', 'Feruza', 'Gulnora', 'Hilola', 'Iroda',
  'Jasmina', 'Kamola', 'Lola', 'Malika', 'Nigora', 'Oysha', 'Rayhona', 'Sevara',
  'Tahmina', 'Umida', 'Vazira', 'Zilola'];
const LAST = ['Valiyev', 'Karimov', 'Rahimov', 'Yusupov', 'Nazarov', 'Ergashev', 'Tursunov',
  'Abdullayev', 'Salimov', 'Qodirov', 'Mirzayev', 'Sattorov', 'Hakimov', 'Jo\'rayev',
  'Nematov', 'Oripov', 'Sharipov', 'Umarov', 'Xolmatov', 'Yo\'ldoshev'];

/* Группы. `level` задаёт средний уровень набора — группы должны отличаться.

   Занятия ТРИ раза в неделю у всех: при двух днях в месяце выходит 8-9 уроков,
   и журнал выглядит полупустым — учебный центр так курс не ведёт. Три дня дают
   привычные 12-14 занятий в месяц. */
const GROUPS = [
  { name: 'JavaScript Basics', subject: 'JavaScript', price: 450000, level: 0.62, size: 12,
    schedule: [{ day: 'mon', start: '18:00', end: '19:30' }, { day: 'wed', start: '18:00', end: '19:30' }, { day: 'fri', start: '18:00', end: '19:30' }],
    topics: ['O\'zgaruvchilar va turlar', 'Shartli operatorlar', 'Sikllar', 'Massivlar',
      'Funksiyalar', 'Obyektlar', 'DOM bilan ishlash', 'Hodisalar (events)'] },
  { name: 'React Fundamentals', subject: 'React', price: 600000, level: 0.71, size: 10,
    schedule: [{ day: 'tue', start: '16:00', end: '17:30' }, { day: 'thu', start: '16:00', end: '17:30' }, { day: 'sat', start: '16:00', end: '17:30' }],
    topics: ['JSX asoslari', 'Komponentlar', 'Props va State', 'useEffect',
      'Ro\'yxatlar va key', 'Formalar', 'Router', 'Custom hooklar'] },
  { name: 'Node.js Backend', subject: 'Node.js', price: 650000, level: 0.55, size: 9,
    schedule: [{ day: 'mon', start: '19:30', end: '21:00' }, { day: 'wed', start: '19:30', end: '21:00' }, { day: 'fri', start: '19:30', end: '21:00' }],
    topics: ['Node asoslari', 'Express marshrutlari', 'Middleware', 'REST API',
      'PostgreSQL ulanish', 'Autentifikatsiya', 'Fayl yuklash'] },
  { name: 'Python Start', subject: 'Python', price: 400000, level: 0.66, size: 11,
    schedule: [{ day: 'tue', start: '14:00', end: '15:30' }, { day: 'thu', start: '14:00', end: '15:30' }, { day: 'sat', start: '14:00', end: '15:30' }],
    topics: ['Sintaksis asoslari', 'Ro\'yxatlar va lug\'atlar', 'Funksiyalar',
      'Fayllar bilan ishlash', 'Modullar', 'OOP asoslari'] },
  /* Единственная группа с занятиями в воскресенье. Нужна именно такой: ментор
     теперь вправе отмечать только СЕГОДНЯШНИЙ урок, а у всех остальных групп
     расписание будни-суббота — в воскресенье журнал не потрогать вообще, и
     проверить отметку в выходной было не на чем. */
  { name: 'IT Kids', subject: 'IT Kids', price: 300000, level: 0.6, size: 10,
    schedule: [{ day: 'sun', start: '11:00', end: '13:00' }],
    topics: ['Kompyuter bilan tanishuv', 'Scratch asoslari', 'Algoritm nima',
      'Sikllar va shartlar', 'Kichik o\'yin yaratish', 'Internet xavfsizligi',
      'Prezentatsiya tayyorlash'] },
  { name: 'Frontend Pro', subject: 'Frontend', price: 700000, level: 0.78, size: 8,
    schedule: [{ day: 'mon', start: '10:00', end: '12:00' }, { day: 'wed', start: '10:00', end: '12:00' }, { day: 'sat', start: '10:00', end: '12:00' }],
    topics: ['Semantik HTML', 'CSS Grid va Flex', 'Responsive dizayn',
      'Animatsiyalar', 'Optimallashtirish', 'Deploy'] },
];

const WEEKDAY = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const LESSON_WEEKS = 9;   // журнал за два месяца — видно и тренд, и пропуски

/* ---------- вспомогательное ---------- */

// Свой генератор со стабильным зерном: повторный запуск даёт те же данные,
// иначе каждый прогон менял бы картинку на экранах и сравнивать было бы не с чем.
let seed = 20260719;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const chance = (p) => rnd() < p;
const between = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const iso = (d) => d.toISOString().slice(0, 10);

const db = new pg.Client({ connectionString: DB });
await db.connect();

if (DB.includes('neon')) {
  console.error('ОТКАЗ: скрипт направлен на продакшн-базу. Проверьте TEST_DB.');
  await db.end();
  process.exit(1);
}

const { rows: [mentor] } = await db.query(
  'SELECT id, organization_id, branch_id FROM users WHERE email = $1',
  [MENTOR_EMAIL],
);
if (!mentor) {
  console.error(`нет ментора ${MENTOR_EMAIL}`);
  await db.end();
  process.exit(1);
}

const orgId = mentor.organization_id;
const branchId = mentor.branch_id;

/* ---------- очистка прошлого прогона ---------- */

await db.query('BEGIN');

const { rows: old } = await db.query(
  "SELECT id FROM users WHERE login_code LIKE 'lu%' OR login_code LIKE 'lp%'",
);
const oldIds = old.map((r) => r.id);

if (oldIds.length) {
  // Порядок важен: сначала то, что ссылается на ученика, потом сам ученик.
  await db.query('DELETE FROM coin_history WHERE student_id = ANY($1)', [oldIds]);
  await db.query('DELETE FROM test_results WHERE student_id = ANY($1)', [oldIds]);
  await db.query('DELETE FROM homework_submissions WHERE student_id = ANY($1)', [oldIds]);
  await db.query('DELETE FROM attendance WHERE student_id = ANY($1)', [oldIds]);
  await db.query('DELETE FROM group_students WHERE student_id = ANY($1)', [oldIds]);
  await db.query('DELETE FROM student_profiles WHERE user_id = ANY($1) OR parent_id = ANY($1)', [oldIds]);
  await db.query('DELETE FROM chat_messages WHERE sender_id = ANY($1)', [oldIds]);
  await db.query('DELETE FROM refresh_tokens WHERE user_id = ANY($1)', [oldIds]);
  await db.query('DELETE FROM users WHERE id = ANY($1)', [oldIds]);
}

/* Задания и тесты прошлого прогона — по названиям, которые генерирует этот
   скрипт. Группу JavaScript Basics завели не мы и удалять её нельзя, но её
   домашки и тесты иначе копятся с каждым запуском: за три прогона в журнале
   оказывалось три комплекта одних и тех же тем. */
const seededTitles = GROUPS.flatMap((g) => g.topics);
const seededTests = GROUPS.flatMap((g) => [1, 2, 3, 4].map((n) => `${g.subject} — nazorat ${n}`));

await db.query(
  `DELETE FROM homework_submissions WHERE homework_id IN (
     SELECT id FROM homework WHERE created_by = $1 AND title = ANY($2))`,
  [mentor.id, seededTitles],
);
await db.query('DELETE FROM homework WHERE created_by = $1 AND title = ANY($2)',
  [mentor.id, seededTitles]);
await db.query(
  `DELETE FROM test_results WHERE test_id IN (
     SELECT id FROM tests WHERE created_by = $1 AND title = ANY($2))`,
  [mentor.id, seededTests],
);
await db.query('DELETE FROM tests WHERE created_by = $1 AND title = ANY($2)',
  [mentor.id, seededTests]);

// Группы прошлого прогона (кроме заведённой не нами JavaScript Basics).
const { rows: oldGroups } = await db.query(
  `SELECT id FROM groups WHERE mentor_id = $1 AND name = ANY($2)`,
  [mentor.id, GROUPS.slice(1).map((g) => g.name)],
);
if (oldGroups.length) {
  const gids = oldGroups.map((r) => r.id);
  await db.query('DELETE FROM attendance WHERE group_id = ANY($1)', [gids]);
  await db.query(
    'DELETE FROM homework_submissions WHERE homework_id IN (SELECT id FROM homework WHERE group_id = ANY($1))', [gids]);
  await db.query('DELETE FROM homework WHERE group_id = ANY($1)', [gids]);
  await db.query(
    'DELETE FROM test_results WHERE test_id IN (SELECT id FROM tests WHERE group_id = ANY($1))', [gids]);
  await db.query('DELETE FROM tests WHERE group_id = ANY($1)', [gids]);
  await db.query('DELETE FROM group_students WHERE group_id = ANY($1)', [gids]);
  await db.query('DELETE FROM groups WHERE id = ANY($1)', [gids]);
}

if (CLEAN_ONLY) {
  await db.query('COMMIT');
  console.log(`удалено: учеников/родителей ${oldIds.length}, групп ${oldGroups.length}`);
  await db.end();
  process.exit(0);
}

/* ---------- пароли ---------- */

const studentHash = await argon2.hash(STUDENT_PASSWORD);
const parentHash = await argon2.hash(PARENT_PASSWORD);

/* ---------- группы ---------- */

const groupIds = [];
for (const g of GROUPS) {
  const { rows: [existing] } = await db.query(
    'SELECT id FROM groups WHERE mentor_id = $1 AND name = $2 AND deleted_at IS NULL',
    [mentor.id, g.name],
  );
  if (existing) {
    // Уже была (JavaScript Basics из базового сида) — только дописываем
    // расписание: без него журнал не знает, в какие дни рисовать колонки.
    await db.query('UPDATE groups SET schedule = $1, monthly_price = $2 WHERE id = $3',
      [JSON.stringify(g.schedule), g.price, existing.id]);
    groupIds.push(existing.id);
  } else {
    const { rows: [created] } = await db.query(
      `INSERT INTO groups (branch_id, mentor_id, name, subject, monthly_price, schedule, room)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [branchId, mentor.id, g.name, g.subject, g.price, JSON.stringify(g.schedule), `${between(101, 305)}-xona`],
    );
    groupIds.push(created.id);
  }
}

/* ---------- ученики и родители ---------- */

let codeN = 0;
const nextCode = (prefix) => `${prefix}${String(++codeN).padStart(6, '0')}`;

const students = [];   // { id, level, groups: [] }

for (let gi = 0; gi < GROUPS.length; gi += 1) {
  const g = GROUPS[gi];
  const groupId = groupIds[gi];

  // В уже существующей группе часть учеников заведена не нами — досыпаем
  // до нужного размера, а не поверх.
  const { rows: [{ n }] } = await db.query(
    'SELECT count(*)::int n FROM group_students WHERE group_id = $1', [groupId],
  );
  const need = Math.max(0, g.size - n);

  for (let i = 0; i < need; i += 1) {
    const female = chance(0.42);
    const firstName = female ? pick(FIRST_F) : pick(FIRST_M);
    const lastName = pick(LAST);

    // Уровень вокруг среднего по группе, но с разбросом — нужны и отличники,
    // и отстающие, иначе сравнивать учеников не на чем.
    const level = Math.min(0.98, Math.max(0.12, g.level + (rnd() - 0.5) * 0.55));

    const { rows: [student] } = await db.query(
      `INSERT INTO users (organization_id, branch_id, role, status, first_name, last_name,
                          phone, password_hash, login_code)
       VALUES ($1,$2,'student','active',$3,$4,$5,$6,$7) RETURNING id`,
      [orgId, branchId, firstName, lastName,
        `+9989${between(0, 9)}${String(between(0, 9999999)).padStart(7, '0')}`,
        studentHash, nextCode('lu')],
    );

    // Родитель есть не у всех — так в чате видно оба случая: и «написать
    // родителю», и отсутствие такой возможности.
    let parentId = null;
    if (chance(0.75)) {
      const { rows: [parent] } = await db.query(
        `INSERT INTO users (organization_id, branch_id, role, status, first_name, last_name,
                            phone, password_hash, login_code)
         VALUES ($1,$2,'parent','active',$3,$4,$5,$6,$7) RETURNING id`,
        [orgId, branchId, chance(0.5) ? pick(FIRST_M) : pick(FIRST_F), lastName,
          `+9989${between(0, 9)}${String(between(0, 9999999)).padStart(7, '0')}`,
          parentHash, nextCode('lp')],
      );
      parentId = parent.id;
    }

    const coins = Math.round(level * between(120, 400));
    await db.query(
      `INSERT INTO student_profiles (user_id, branch_id, parent_id, coin_balance, total_debt, birth_date)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [student.id, branchId, parentId, coins,
        chance(0.22) ? between(1, 4) * 450000 : 0,
        `${between(2004, 2012)}-${String(between(1, 12)).padStart(2, '0')}-${String(between(1, 28)).padStart(2, '0')}`],
    );

    await db.query(
      'INSERT INTO group_students (group_id, student_id, joined_at) VALUES ($1,$2, now() - ($3 || \' days\')::interval)',
      [groupId, student.id, between(30, 120)],
    );

    students.push({ id: student.id, level, groupIdx: [gi], coins });
  }

  // Уже состоящие в группе (demostu1…3) тоже должны получить данные — иначе
  // у них пустая статистика, а именно их видно первыми.
  const { rows: existing } = await db.query(
    `SELECT gs.student_id FROM group_students gs
      WHERE gs.group_id = $1 AND gs.student_id NOT IN (SELECT id FROM users WHERE login_code LIKE 'lu%')`,
    [groupId],
  );
  existing.forEach((r, k) => {
    if (students.some((s) => s.id === r.student_id)) return;
    students.push({ id: r.student_id, level: 0.45 + k * 0.18, groupIdx: [gi], coins: between(40, 200) });
  });
}

/* ---------- часть учеников — сразу в двух группах ---------- */

for (const s of students) {
  if (!chance(0.18)) continue;
  const other = between(0, GROUPS.length - 1);
  if (s.groupIdx.includes(other)) continue;
  const { rowCount } = await db.query(
    'SELECT 1 FROM group_students WHERE group_id = $1 AND student_id = $2',
    [groupIds[other], s.id],
  );
  if (rowCount) continue;
  await db.query(
    'INSERT INTO group_students (group_id, student_id, joined_at) VALUES ($1,$2, now() - ($3 || \' days\')::interval)',
    [groupIds[other], s.id, between(15, 60)],
  );
  s.groupIdx.push(other);
}

/* ---------- посещаемость ---------- */

const today = new Date();
let attRows = 0;

for (let gi = 0; gi < GROUPS.length; gi += 1) {
  const g = GROUPS[gi];
  const groupId = groupIds[gi];
  const days = new Set(g.schedule.map((s) => WEEKDAY[s.day]));
  const members = students.filter((s) => s.groupIdx.includes(gi));

  // Даты занятий за последние LESSON_WEEKS недель, только будни расписания и
  // только прошедшие: журнал на будущее заполнять нечем.
  /* Сегодняшний урок НЕ заполняем (back останавливается на 1). Отмечать его —
     работа ментора, и он единственный день, который ему теперь разрешено
     трогать: заполни его сид, и проверить отметку было бы негде. */
  const dates = [];
  for (let back = LESSON_WEEKS * 7; back >= 1; back -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - back);
    if (days.has(d.getDay())) dates.push(iso(d));
  }

  for (const date of dates) {
    const values = [];
    const params = [];
    members.forEach((s, k) => {
      // Чем ниже уровень, тем чаще пропуски и опоздания.
      const r = rnd();
      let status = 'present';
      if (r > 0.55 + s.level * 0.42) status = 'absent';
      else if (r > 0.45 + s.level * 0.40) status = 'late';
      else if (r > 0.42 + s.level * 0.40) status = 'excused';

      const base = k * 6;
      values.push(`($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6})`);
      params.push(branchId, groupId, s.id, date, status, mentor.id);
    });
    if (!values.length) continue;
    await db.query(
      `INSERT INTO attendance (branch_id, group_id, student_id, lesson_date, status, marked_by)
       VALUES ${values.join(',')}
       ON CONFLICT (group_id, student_id, lesson_date) DO NOTHING`,
      params,
    );
    attRows += members.length;
  }
}

/* ---------- отметки в дни без занятий ----------
   Журнал строит колонки по расписанию, поэтому отметка, сделанная в день вне
   расписания (осталась от прежнего расписания или от ручных проверок), в
   таблице не показывается вовсе — но продолжает считаться в статистике
   посещаемости. Такие «невидимые» записи и дают расхождение вида «14 колонок,
   а дней с отметками 17». */
let orphaned = 0;
for (let gi = 0; gi < GROUPS.length; gi += 1) {
  const days = [...new Set(GROUPS[gi].schedule.map((s) => WEEKDAY[s.day]))];
  const { rowCount } = await db.query(
    // extract(dow) в Postgres: 0 = воскресенье, как и в JS getDay()
    `DELETE FROM attendance
      WHERE group_id = $1 AND extract(dow FROM lesson_date)::int <> ALL($2::int[])`,
    [groupIds[gi], days],
  );
  orphaned += rowCount;
}

/* ---------- домашние задания ---------- */

let hwRows = 0;
for (let gi = 0; gi < GROUPS.length; gi += 1) {
  const g = GROUPS[gi];
  const groupId = groupIds[gi];
  const members = students.filter((s) => s.groupIdx.includes(gi));

  for (let t = 0; t < g.topics.length; t += 1) {
    const daysAgo = (g.topics.length - t) * 6;
    const { rows: [hw] } = await db.query(
      `INSERT INTO homework (branch_id, group_id, created_by, title, description,
                             max_score, coin_reward, deadline, created_at)
       VALUES ($1,$2,$3,$4,$5,100,$6, now() - ($7 || ' days')::interval, now() - ($8 || ' days')::interval)
       RETURNING id`,
      [branchId, groupId, mentor.id, g.topics[t],
        `"${g.topics[t]}" mavzusi bo'yicha uyga vazifa`,
        between(5, 20), daysAgo, daysAgo + 6],
    );

    for (const s of members) {
      // Тема считается «трудной», если её сдали плохо или не сдали вовсе.
      // Пропуск — это ОТСУТСТВИЕ строки: экран статистики строит «qilmagan»
      // именно через LEFT JOIN, и заполнять его строкой со статусом нельзя.
      const submits = chance(0.35 + s.level * 0.6);
      if (!submits) continue;

      const late = chance(0.25 - s.level * 0.15);
      const score = Math.max(20, Math.min(100,
        Math.round(45 + s.level * 50 + (rnd() - 0.5) * 26)));
      const graded = chance(0.85);

      await db.query(
        `INSERT INTO homework_submissions (homework_id, student_id, status, text_answer,
                                           score, graded_by, graded_at, submitted_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7, now() - ($8 || ' days')::interval)`,
        [hw.id, s.id, graded ? 'graded' : (late ? 'late' : 'submitted'),
          'Bajarildi', graded ? score : null, graded ? mentor.id : null,
          graded ? new Date() : null, daysAgo - between(0, 3)],
      );
      hwRows += 1;
    }
  }
}

/* ---------- тесты ---------- */

let testRows = 0;
for (let gi = 0; gi < GROUPS.length; gi += 1) {
  const g = GROUPS[gi];
  const groupId = groupIds[gi];
  const members = students.filter((s) => s.groupIdx.includes(gi));

  for (let t = 0; t < 4; t += 1) {
    const questions = Array.from({ length: 10 }, (_, q) => ({
      id: q + 1,
      text: `${g.subject} savol ${q + 1}`,
      options: ['A', 'B', 'C', 'D'],
      correct: between(0, 3),
    }));
    const daysAgo = (4 - t) * 12;

    const { rows: [test] } = await db.query(
      `INSERT INTO tests (branch_id, group_id, created_by, title, questions, duration_min,
                          coin_reward, starts_at, ends_at, created_at)
       VALUES ($1,$2,$3,$4,$5,30,$6,
               now() - ($7 || ' days')::interval, now() - ($8 || ' days')::interval,
               now() - ($7 || ' days')::interval)
       RETURNING id`,
      [branchId, groupId, mentor.id, `${g.subject} — nazorat ${t + 1}`,
        JSON.stringify(questions), between(10, 30), daysAgo, daysAgo - 1],
    );

    for (const s of members) {
      if (!chance(0.55 + s.level * 0.42)) continue;   // слабые чаще не приходят
      // ВНИМАНИЕ: score — число ВЕРНЫХ ОТВЕТОВ, не процент. Отчёты делят его на
      // jsonb_array_length(questions), поэтому балл «75» при 10 вопросах даёт
      // в статистике 750 %.
      const correct = Math.max(1, Math.min(questions.length,
        Math.round(questions.length * (0.4 + s.level * 0.55 + (rnd() - 0.5) * 0.22))));
      await db.query(
        `INSERT INTO test_results (test_id, student_id, answers, score, started_at, finished_at)
         VALUES ($1,$2,$3,$4, now() - ($5 || ' days')::interval, now() - ($5 || ' days')::interval)`,
        [test.id, s.id, JSON.stringify([]), correct, daysAgo],
      );
      testRows += 1;
    }
  }
}

/* ---------- коины ---------- */

let coinRows = 0;
for (const s of students) {
  let balance = 0;
  const ops = between(3, 9);
  for (let i = 0; i < ops; i += 1) {
    const reward = chance(0.72);
    const amount = reward ? between(5, 40) : -between(5, 30);
    balance = Math.max(0, balance + amount);
    await db.query(
      `INSERT INTO coin_history (branch_id, student_id, actor_id, operation, amount,
                                 balance_after, reason, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, now() - ($8 || ' days')::interval)`,
      [branchId, s.id, mentor.id, reward ? 'reward' : 'deduction', amount, balance,
        reward ? pick(['Dars faolligi', 'Uy vazifa a\'lo', 'Test natijasi', 'Yordam bergani uchun'])
          : pick(['Darsga kech qolgani', 'Uy vazifa bajarilmadi']),
        between(1, 50)],
    );
    coinRows += 1;
  }
  await db.query('UPDATE student_profiles SET coin_balance = $1 WHERE user_id = $2', [balance, s.id]);
}

await db.query('COMMIT');

/* ---------- итог ---------- */

const { rows: [stat] } = await db.query(
  `SELECT (SELECT count(*) FROM groups WHERE mentor_id=$1 AND deleted_at IS NULL)::int groups,
          (SELECT count(DISTINCT gs.student_id) FROM group_students gs
             JOIN groups g ON g.id=gs.group_id WHERE g.mentor_id=$1)::int students,
          (SELECT count(*) FROM attendance WHERE marked_by=$1)::int att,
          (SELECT count(*) FROM homework WHERE created_by=$1)::int hw,
          (SELECT count(*) FROM tests WHERE created_by=$1)::int tests`,
  [mentor.id],
);

console.log(`
  Готово для ${MENTOR_EMAIL}

  групп:              ${stat.groups}
  учеников:           ${stat.students}
  посещаемость:       ${stat.att} записей (вне расписания удалено: ${orphaned})
  домашних заданий:   ${stat.hw} (сдач: ${hwRows})
  тестов:             ${stat.tests} (результатов: ${testRows})
  операций с коинами: ${coinRows}

  Пароли: ученики ${STUDENT_PASSWORD}, родители ${PARENT_PASSWORD}
  Логин-коды: lu…  (ученики), lp… (родители)
`);

await db.end();
