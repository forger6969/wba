// Все запросы идут на /api (dev-прокси Vite → http://localhost:4000).
// VITE_API_URL — боевой бэкенд (Render) для production build.
// VITE_USE_MOCKS=false — отключает моки, использует реальный бэкенд.
// По умолчанию true: эмуляция на localStorage для разработки без бэкенда.

const API_BASE = typeof import.meta !== 'undefined' ? import.meta.env.VITE_API_URL || '' : '';
const USE_MOCKS =
  typeof import.meta !== 'undefined' ? import.meta.env.VITE_USE_MOCKS !== 'false' : true;

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

// Живого сокета в мок-режиме нет — страницам с realtime (чат, davomat) нужно
// знать об этом, чтобы не ждать ack от несуществующего сервера.
export const USING_MOCKS = USE_MOCKS;

/* -------- Mentor mock helpers --------
   Было две группы и один и тот же список из трёх учеников, который отдавался
   для любой группы: на дашборде «O'quvchilar» показывал 0 (у групп не было
   поля students), а журнал и коины во всех группах выглядели одинаково.
   Теперь у каждой группы свой состав, свой размер и своё расписание. */
const MOCK_MENTOR_GROUPS = [
  {
    id: 'group-uuid-1', name: 'English B1', subject: 'Ingliz tili', students: 12,
    schedule: [{ day: 'mon', start: '14:00', end: '16:00' },
               { day: 'wed', start: '14:00', end: '16:00' }],
  },
  {
    id: 'group-uuid-2', name: 'Frontend Basics', subject: 'Dasturlash', students: 9,
    schedule: [{ day: 'tue', start: '10:00', end: '12:00' },
               { day: 'thu', start: '10:00', end: '12:00' }],
  },
  {
    id: 'group-uuid-3', name: 'IELTS Intensive', subject: 'Ingliz tili', students: 7,
    schedule: [{ day: 'mon', start: '18:00', end: '20:00' },
               { day: 'fri', start: '18:00', end: '20:00' }],
  },
  {
    id: 'group-uuid-4', name: 'English A2', subject: 'Ingliz tili', students: 14,
    schedule: [{ day: 'tue', start: '16:00', end: '18:00' },
               { day: 'sat', start: '11:00', end: '13:00' }],
  },
  {
    id: 'group-uuid-5', name: 'Speaking Club', subject: 'Ingliz tili', students: 6,
    schedule: [{ day: 'sat', start: '15:00', end: '16:30' }],
  },
];

const UZ_FIRST = [
  'Aziza', 'Bekzod', 'Malika', 'Sardor', 'Nodira', 'Javohir', 'Zilola', 'Otabek',
  'Gulnora', 'Doston', 'Shahzoda', 'Ulugbek', 'Kamola', 'Aziz', 'Nilufar',
  'Jasur', 'Dilnoza', 'Temur', 'Sevara', 'Akmal',
];
const UZ_LAST = [
  'Rahimova', 'Toshmatov', 'Yusupova', 'Karimov', 'Ismoilova', 'Aliyev',
  'Nazarova', 'Mirzayev', 'Sattorova', 'Ergashev', 'Qodirova', 'Xolmatov',
];

/**
 * Родитель ученика. Есть не у каждого — так и в жизни, и это позволяет
 * проверить, что пункт «написать родителю» гаснет там, где писать некому.
 */
function mockParentIdFor(n) {
  return n % 2 === 0 ? `parent-of-${n}` : null;
}

/** Один ученик по сквозному номеру — номер и есть его личность. */
function mockStudent(n) {
  return {
    id: `stu-${n}`,
    parentId: mockParentIdFor(n),
    firstName: UZ_FIRST[n % UZ_FIRST.length],
    lastName: UZ_LAST[(n * 5 + 1) % UZ_LAST.length],
    phone: `+9989${String(10000000 + n * 137).slice(0, 8)}`,
    status: n % 13 === 0 ? 'frozen' : 'active',
    coinBalance: ((n * 37) % 40) * 5 + 20,
    // Часть учеников уже получила коины сегодня — иначе колонка «Bugun»
    // при проверке всегда нулевая и её нечем отличить от сломанной.
    coinsToday: n % 3 === 0 ? ((n % 4) + 1) * 5 : 0,
    student_code: `stu${String(1000 + n)}`,
  };
}

/* Состав группы: стабильный и не пересекающийся с соседями.
   Номера сквозные — смещение группы равно сумме размеров предыдущих. Первый
   вариант считал смещение как index*7, диапазоны накладывались, и разные
   ученики получали одинаковые имя, телефон и student_code: в общем списке
   это выглядело дублями. */
function mockGroupStudents(groupId) {
  const idx = MOCK_MENTOR_GROUPS.findIndex((g) => g.id === groupId);
  if (idx < 0) return [];
  const offset = MOCK_MENTOR_GROUPS.slice(0, idx).reduce((s, g) => s + g.students, 0);
  const own = Array.from({ length: MOCK_MENTOR_GROUPS[idx].students }, (_, i) =>
    mockStudent(offset + i + 1));

  // Speaking Club — разговорный клуб: пара ребят ходит туда из English B1.
  // Это ещё и проверка того, что общий список склеивает такого ученика в одну
  // строку с двумя группами, а не показывает его дважды.
  if (groupId === 'group-uuid-5') return [mockStudent(1), mockStudent(2), ...own.slice(2)];
  return own;
}

/**
 * Родители всех учеников ментора — ровно те, кого отдал бы бэкенд:
 * по одному на ученика, у кого он есть, с реальным именем ребёнка.
 */
function mockParentsOfStudents() {
  const seen = new Map();
  MOCK_MENTOR_GROUPS.forEach((g) => {
    mockGroupStudents(g.id).forEach((s) => {
      if (!s.parentId || seen.has(s.parentId)) return;
      const n = Number(String(s.id).replace(/\D/g, '')) || 1;
      seen.set(s.parentId, {
        id: s.parentId,
        // фамилия у родителя та же, что у ребёнка — так список читается
        first_name: UZ_FIRST[(n * 3 + 5) % UZ_FIRST.length],
        last_name: s.lastName,
        avatar_key: null,
        child_names: `${s.firstName} ${s.lastName}`,
        room_key: `dm:mock-me:${s.parentId}`,
        // Превью/непрочитанные — из фактической истории, не из остатка от
        // номера ученика: раньше каждый шестой контакт носил бейдж «2» при
        // полностью пустом диалоге.
        ...mockRoomSummary(`dm:mock-me:${s.parentId}`),
      });
    });
  });
  return [...seen.values()];
}

/* Статистика группы — форма ответа GET /api/mentor/groups/:id/stats.
   Показатели выводятся из номера ученика, поэтому список получается с разбросом:
   сильные, средние и отстающие — иначе сравнивать было бы нечего. */
function mockGroupStats(groupId) {
  const group = MOCK_MENTOR_GROUPS.find((g) => g.id === groupId) ?? MOCK_MENTOR_GROUPS[0];
  const roster = mockGroupStudents(group.id);

  const students = roster.map((s, i) => {
    const n = Number(String(s.id).replace(/\D/g, '')) || i + 1;
    const attendanceRate = 55 + ((n * 7) % 46);
    const homeworkTotal = 8;
    const homeworkDone = Math.min(homeworkTotal, 3 + ((n * 3) % 6));
    const homeworkAvg = 45 + ((n * 11) % 56);
    const testsTotal = 4;
    const testsTaken = Math.min(testsTotal, 1 + (n % 4));
    const testAvg = 40 + ((n * 13) % 61);
    const item = {
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      status: s.status,
      coinBalance: s.coinBalance,
      attendanceRate,
      lessons: 18,
      homeworkDone,
      homeworkTotal,
      homeworkRate: Math.round((homeworkDone / homeworkTotal) * 100),
      homeworkAvg,
      testsTaken,
      testsTotal,
      testAvg,
    };
    const parts = [item.attendanceRate, item.homeworkRate, item.homeworkAvg, item.testAvg];
    return { ...item, overall: Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) };
  }).sort((a, b) => b.overall - a.overall);

  const BANDS = [
    { key: 'weak', label: '0–59%', from: 0, to: 59 },
    { key: 'mid', label: '60–79%', from: 60, to: 79 },
    { key: 'good', label: '80–89%', from: 80, to: 89 },
    { key: 'top', label: '90–100%', from: 90, to: 100 },
  ];
  const distribution = BANDS.map((b) => {
    const count = students.filter((s) => s.overall >= b.from && s.overall <= b.to).length;
    return { ...b, count, percent: Math.round((count / students.length) * 100) };
  });

  const avg = (key) => Math.round(
    students.reduce((s, r) => s + (r[key] ?? 0), 0) / students.length,
  );

  return {
    group: { id: group.id, name: group.name, subject: group.subject },
    summary: {
      students: students.length,
      attendanceRate: avg('attendanceRate'),
      homeworkRate: avg('homeworkRate'),
      homeworkAvg: avg('homeworkAvg'),
      testAvg: avg('testAvg'),
      overall: avg('overall'),
    },
    distribution,
    students,
  };
}

/* Статистика ученика — та же форма, что отдаёт GET /api/mentor/students/:id/stats.
   Числа выводятся из номера ученика, поэтому у разных людей картина разная, но
   у одного и того же она не скачет между открытиями. */
function mockStudentStats(studentId) {
  const n = Number(String(studentId).replace(/\D/g, '')) || 7;
  const base = mockStudent(n);
  const groups = MOCK_MENTOR_GROUPS.filter((_, i) => (n + i) % 3 !== 0).slice(0, 2);

  const present = 12 + (n % 9);
  const absent = n % 5;
  const late = n % 3;
  const attTotal = present + absent + late;

  const HW_TITLES = [
    'Present Simple — mashqlar', 'Past Tense — yozma ish', 'Future Forms',
    'Reading: Unit 4', 'Vocabulary 100 ta so\'z', 'Listening practice',
    'Essay: My city', 'Phrasal verbs',
  ];
  const homework = HW_TITLES.map((title, i) => {
    const roll = (n + i * 3) % 5;
    const state = roll === 0 ? 'missed' : roll === 1 ? 'submitted' : 'graded';
    const maxScore = 10;
    return {
      id: `hw-${n}-${i}`,
      title,
      groupName: groups[i % groups.length]?.name ?? 'English B1',
      deadline: new Date(Date.now() - (8 - i) * 86400000).toISOString(),
      maxScore,
      coinReward: 5,
      state,
      score: state === 'graded' ? 5 + ((n + i) % 6) : null,
      submittedAt: state === 'missed' ? null : new Date(Date.now() - (8 - i) * 86400000).toISOString(),
    };
  });
  const graded = homework.filter((h) => h.score !== null);
  const done = homework.filter((h) => h.state !== 'missed' && h.state !== 'pending');

  const TEST_TITLES = ['Grammar Test', 'Vocabulary Test', 'Midterm Exam', 'Listening Test'];
  const tests = TEST_TITLES.map((title, i) => {
    const taken = (n + i) % 4 !== 0;
    const maxScore = 10;
    const score = taken ? 4 + ((n + i * 2) % 7) : null;
    return {
      id: `test-${n}-${i}`,
      title,
      groupName: groups[i % groups.length]?.name ?? 'English B1',
      maxScore,
      score,
      percent: taken ? Math.round((score / maxScore) * 100) : null,
      finishedAt: taken ? new Date(Date.now() - (6 - i) * 86400000).toISOString() : null,
    };
  });
  const taken = tests.filter((t) => t.finishedAt);

  const round = (v) => Math.round(v);

  // Динамика за 6 месяцев. Один месяц намеренно без данных — чтобы было видно,
  // что линия в пропуске рвётся, а не падает в ноль.
  const trend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const wave = (k) => 55 + ((n * 7 + i * 13 + k) % 40);
    const empty = i === 1;
    return {
      month: key,
      attendanceRate: empty ? null : Math.min(100, wave(0)),
      homeworkAvg: empty ? null : Math.min(100, wave(9)),
      testAvg: empty || i === 2 ? null : Math.min(100, wave(21)),
      lessons: empty ? 0 : 6 + (i % 3),
    };
  });

  return {
    trend,
    student: {
      id: studentId,
      firstName: base.firstName,
      lastName: base.lastName,
      phone: base.phone,
      email: null,
      status: base.status,
      loginCode: base.student_code,
      coinBalance: base.coinBalance,
      joinedAt: '2026-02-10T09:00:00Z',
    },
    groups,
    attendance: {
      present, absent, late, excused: 0, total: attTotal,
      rate: round(((present + late) / attTotal) * 100),
    },
    recentAttendance: Array.from({ length: 10 }, (_, i) => ({
      date: new Date(Date.now() - (i + 1) * 2 * 86400000).toISOString().slice(0, 10),
      status: (n + i) % 7 === 0 ? 'absent' : (n + i) % 5 === 0 ? 'late' : 'present',
      groupName: groups[0]?.name ?? 'English B1',
    })),
    homework: {
      total: homework.length,
      done: done.length,
      missed: homework.filter((h) => h.state === 'missed').length,
      pending: 0,
      graded: graded.length,
      avgPercent: graded.length
        ? round(graded.reduce((s, h) => s + (h.score / h.maxScore) * 100, 0) / graded.length)
        : null,
      completionRate: round((done.length / homework.length) * 100),
      items: homework,
    },
    tests: {
      total: tests.length,
      taken: taken.length,
      avgPercent: taken.length
        ? round(taken.reduce((s, t) => s + t.percent, 0) / taken.length)
        : null,
      items: tests,
    },
    coins: {
      balance: base.coinBalance,
      earned: base.coinBalance + 40,
      spent: 40,
      recent: [
        { id: 'c1', amount: 10, reason: 'Uy vazifasi', refType: 'homework', createdAt: new Date(Date.now() - 86400000).toISOString() },
        { id: 'c2', amount: 5, reason: 'Dars faolligi', refType: null, createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
        { id: 'c3', amount: -20, reason: "Do'kondan xarid", refType: 'shop_order', createdAt: new Date(Date.now() - 6 * 86400000).toISOString() },
      ],
    },
  };
}

/* -------- мок-хранилище чата --------
   Отправленное в мок-режиме держим в localStorage, а не в state страницы:
   иначе сообщение исчезало при переходе в другой диалог или перезагрузке. */
const MOCK_CHAT_KEY = 'mock_chat_messages';

/* Готовые диалоги `dm:<staffId>:<peerId>`. Лежат на уровне модуля, потому что
   их читают ДВА мока — история и список контактов. Пока сид был локальной
   переменной внутри истории, список рисовал превью и счётчик непрочитанных из
   головы: «2 новых» у пустого диалога и «Yozishmalar boshlanmagan» у того, где
   переписка есть. */
const DM_SEED = {
  'dm:mock-me:parent-uuid-1': [
    { body: 'Assalomu alaykum, Aziza bugun darsga kelmadi', from: 'parent', at: '2026-07-18T09:30:00Z' },
    { body: 'Va alaykum assalom. Sababi bormi?', from: 'me', at: '2026-07-18T09:35:00Z' },
    { body: "Kasal bo'lib qoldi, ertaga keladi", from: 'parent', at: '2026-07-18T09:38:00Z' },
    { body: 'Rahmat, tushundim', from: 'parent', at: '2026-07-18T09:40:00Z' },
  ],
  'dm:mock-me:parent-uuid-2': [
    { body: 'Bekzod uyga vazifani bajardimi?', from: 'parent', at: '2026-07-17T15:00:00Z' },
    { body: "Ha, to'liq bajardi. 9/10 ball", from: 'me', at: '2026-07-17T15:05:00Z' },
    { body: 'Ertaga darsga keladi', from: 'parent', at: '2026-07-17T15:10:00Z' },
  ],
};

/**
 * Превью и счётчик непрочитанных для карточки контакта — из той же истории,
 * что откроется по клику. Непрочитанным считается только ВХОДЯЩЕЕ (`from`
 * не `me`) после последнего исходящего: свои же сообщения не могут быть
 * «новыми для меня».
 */
function mockRoomSummary(roomKey) {
  const seeded = DM_SEED[roomKey] ?? [];
  const sent = (mockChatRead()[roomKey] ?? []).map((m) => ({
    body: m.body, from: 'me', at: m.created_at,
  }));
  const all = [...seeded, ...sent].sort((a, b) => new Date(a.at) - new Date(b.at));
  if (!all.length) return { last_message: null, last_message_at: null, unread_count: 0 };

  const lastOwn = all.map((m) => m.from === 'me').lastIndexOf(true);
  const unread = all.slice(lastOwn + 1).filter((m) => m.from !== 'me').length;
  const last = all[all.length - 1];
  return { last_message: last.body, last_message_at: last.at, unread_count: unread };
}

function mockChatRead() {
  try {
    return JSON.parse(localStorage.getItem(MOCK_CHAT_KEY) || '{}');
  } catch {
    return {};   // повреждённый JSON не должен ронять весь чат
  }
}

function mockChatAppend(roomKey, message) {
  const all = mockChatRead();
  all[roomKey] = [...(all[roomKey] ?? []), message];
  localStorage.setItem(MOCK_CHAT_KEY, JSON.stringify(all));
  return message;
}

// -------- Super Admin mock helpers --------
const getMockData = () => {
  let branches = JSON.parse(localStorage.getItem('mock_branches'));
  let admins = JSON.parse(localStorage.getItem('mock_admins'));

  if (!branches) {
    branches = [
      {
        id: 'downtown-branch-uuid-1111', name: 'Downtown Academy',
        address: '123 Main St, Central District', phone: '+998901234567',
        isMain: true, isArchived: false, admins: 2, students: 450,
        revenue: 1200000000, debt: 15000000, createdAt: '2026-01-15T08:00:00.000Z',
      },
      {
        id: 'chilanzar-branch-uuid-2222', name: 'Chilanzar Branch',
        address: 'Kamil Yashen St, Chilanzar', phone: '+998909876543',
        isMain: false, isArchived: false, admins: 1, students: 280,
        revenue: 850000000, debt: 8000000, createdAt: '2026-02-10T09:30:00.000Z',
      },
      {
        id: 'sergeli-branch-uuid-3333', name: 'Sergeli Branch',
        address: 'Yangihayot District, Sergeli', phone: '+998905556677',
        isMain: false, isArchived: true, admins: 0, students: 120,
        revenue: 320000000, debt: 22000000, createdAt: '2026-03-01T10:00:00.000Z',
      },
    ];
    localStorage.setItem('mock_branches', JSON.stringify(branches));
  }

  if (!admins) {
    admins = [
      {
        id: 'admin-uuid-1111', firstName: 'Ильхом', lastName: 'Кадыров',
        email: 'ilkhom@levelup.local', status: 'active',
        branchId: 'downtown-branch-uuid-1111', branchName: 'Downtown Academy',
        phone: '+998901112233', createdAt: '2026-01-20T11:00:00.000Z',
      },
      {
        id: 'admin-uuid-2222', firstName: 'Джасур', lastName: 'Усманов',
        email: 'jasur@levelup.local', status: 'active',
        branchId: 'downtown-branch-uuid-1111', branchName: 'Downtown Academy',
        phone: '+998902223344', createdAt: '2026-01-22T12:00:00.000Z',
      },
      {
        id: 'admin-uuid-3333', firstName: 'Малика', lastName: 'Шарипова',
        email: 'malika@levelup.local', status: 'frozen',
        branchId: 'chilanzar-branch-uuid-2222', branchName: 'Chilanzar Branch',
        phone: '+998903334455', createdAt: '2026-02-15T10:00:00.000Z',
      },
    ];
    localStorage.setItem('mock_admins', JSON.stringify(admins));
  }

  return { branches, admins };
};

const saveMockData = (branches, admins) => {
  if (branches) localStorage.setItem('mock_branches', JSON.stringify(branches));
  if (admins) localStorage.setItem('mock_admins', JSON.stringify(admins));
};

/** Мок-данные для методиста */
function getMethodistMocks() {
  let tt = JSON.parse(localStorage.getItem('mock_tt') || '[]');
  if (tt.length === 0) {
    tt = [
      { id: 'tt-1', name: 'Веб-разработка', description: 'Frontend & Backend', icon: '🌐', sort_order: 0, created_at: '2026-06-01T10:00:00Z', topics_count: 2 },
      { id: 'tt-2', name: 'Python', description: 'Основы программирования', icon: '🐍', sort_order: 1, created_at: '2026-06-10T10:00:00Z', topics_count: 1 },
    ];
    localStorage.setItem('mock_tt', JSON.stringify(tt));
  }

  let topics = JSON.parse(localStorage.getItem('mock_topics') || '[]');
  if (topics.length === 0) {
    topics = [
      { id: 'tp-1', training_type_id: 'tt-1', name: 'HTML/CSS', description: 'Вёрстка', sort_order: 0, created_at: '2026-06-05T10:00:00Z', lessons_count: 2 },
      { id: 'tp-2', training_type_id: 'tt-1', name: 'JavaScript', description: 'Основы JS', sort_order: 1, created_at: '2026-06-08T10:00:00Z', lessons_count: 1 },
      { id: 'tp-3', training_type_id: 'tt-2', name: 'Основы Python', description: '', sort_order: 0, created_at: '2026-06-12T10:00:00Z', lessons_count: 1 },
    ];
    localStorage.setItem('mock_topics', JSON.stringify(topics));
  }

  let lessons = JSON.parse(localStorage.getItem('mock_lessons') || '[]');
  if (lessons.length === 0) {
    lessons = [
      { id: 'ls-1', topic_id: 'tp-1', title: 'HTML Теги', lesson_type: 'test', description: '', instruction: 'Изучите основные HTML теги', coin_reward: 10, sort_order: 0, created_at: '2026-06-06T10:00:00Z', questions_count: 3 },
      { id: 'ls-2', topic_id: 'tp-1', title: 'Flexbox практика', lesson_type: 'practical', description: 'Сверстать макет используя Flexbox', instruction: '', coin_reward: 20, sort_order: 1, created_at: '2026-06-07T10:00:00Z', questions_count: 2 },
      { id: 'ls-3', topic_id: 'tp-2', title: 'Переменные и типы', lesson_type: 'test', description: '', instruction: '', coin_reward: 10, sort_order: 0, created_at: '2026-06-09T10:00:00Z', questions_count: 4 },
      { id: 'ls-4', topic_id: 'tp-3', title: 'Hello World', lesson_type: 'test', description: '', instruction: '', coin_reward: 5, sort_order: 0, created_at: '2026-06-13T10:00:00Z', questions_count: 2 },
    ];
    localStorage.setItem('mock_lessons', JSON.stringify(lessons));
  }

  let questions = JSON.parse(localStorage.getItem('mock_questions') || '[]');
  if (questions.length === 0) {
    questions = [
      { id: 'q-1', lesson_id: 'ls-1', question_text: 'Какой тег для заголовка H1?', option_a: '<h1>', option_b: '<head>', option_c: '<heading>', option_d: '<title>', correct_answer: 'A', sort_order: 0 },
      { id: 'q-2', lesson_id: 'ls-1', question_text: 'Какой атрибут для ссылки?', option_a: 'src', option_b: 'href', option_c: 'link', option_d: 'url', correct_answer: 'B', sort_order: 1 },
      { id: 'q-3', lesson_id: 'ls-1', question_text: 'Тег для изображения?', option_a: '<img>', option_b: '<pic>', option_c: '<image>', option_d: '<src>', correct_answer: 'A', sort_order: 2 },
      { id: 'q-4', lesson_id: 'ls-2', question_text: 'Свойство для flex-контейнера?', option_a: 'display: block', option_b: 'display: flex', option_c: 'display: inline', option_d: 'display: grid', correct_answer: 'B', sort_order: 0 },
      { id: 'q-5', lesson_id: 'ls-2', question_text: 'Ось по умолчанию в flex?', option_a: 'column', option_b: 'row', option_c: 'vertical', option_d: 'auto', correct_answer: 'B', sort_order: 1 },
      { id: 'q-6', lesson_id: 'ls-3', question_text: 'Как объявить переменную?', option_a: 'var x', option_b: 'variable x', option_c: 'v x', option_d: 'int x', correct_answer: 'A', sort_order: 0 },
      { id: 'q-7', lesson_id: 'ls-3', question_text: 'Тип данных "Привет"?', option_a: 'number', option_b: 'boolean', option_c: 'string', option_d: 'object', correct_answer: 'C', sort_order: 1 },
      { id: 'q-8', lesson_id: 'ls-3', question_text: 'Какой оператор присваивания?', option_a: '==', option_b: '=', option_c: '===', option_d: '=>', correct_answer: 'B', sort_order: 2 },
      { id: 'q-9', lesson_id: 'ls-3', question_text: 'Число 42 — это какой тип?', option_a: 'string', option_b: 'boolean', option_c: 'number', option_d: 'bigint', correct_answer: 'C', sort_order: 3 },
      { id: 'q-10', lesson_id: 'ls-4', question_text: 'Функция вывода в Python?', option_a: 'console.log', option_b: 'print', option_c: 'echo', option_d: 'output', correct_answer: 'B', sort_order: 0 },
      { id: 'q-11', lesson_id: 'ls-4', question_text: '.py — это расширение?', option_a: 'Java', option_b: 'C++', option_c: 'Python', option_d: 'Ruby', correct_answer: 'C', sort_order: 1 },
    ];
    localStorage.setItem('mock_questions', JSON.stringify(questions));
  }

  // Практические задания: обязательные требования (shart) с баллами.
  // TODO(Karis): real backend — GET/POST /methodist/lessons/:id/requirements,
  // PATCH/DELETE /methodist/requirements/:id.
  let requirements = JSON.parse(localStorage.getItem('mock_requirements') || '[]');
  if (requirements.length === 0) {
    requirements = [
      { id: 'req-1', lesson_id: 'ls-2', text: 'i18n — 3 til (uz/ru/en)', points: 20, sort_order: 0 },
      { id: 'req-2', lesson_id: 'ls-2', text: 'Dizayn DaisyUI', points: 5, sort_order: 1 },
      { id: 'req-3', lesson_id: 'ls-2', text: 'Responsive (1280 / 768 / 375)', points: 10, sort_order: 2 },
    ];
    localStorage.setItem('mock_requirements', JSON.stringify(requirements));
  }

  return { tt, topics, lessons, questions, requirements };
}

const syncRequirementsCount = (mocks, lessonId) => {
  const count = mocks.requirements.filter((r) => r.lesson_id === lessonId).length;
  const lesson = mocks.lessons.find((l) => l.id === lessonId);
  if (lesson) {
    lesson.requirements_count = count;
    localStorage.setItem('mock_lessons', JSON.stringify(mocks.lessons));
  }
};

async function rawRequest(path, { method = 'GET', body, token } = {}) {
  if (USE_MOCKS) {
    await delay();
    const mocks = getMethodistMocks();
    // Query stringni saqlab qolib, keyin path dan ajratamiz
    const qIndex = path.indexOf('?');
    const queryString = qIndex >= 0 ? path.slice(qIndex + 1) : '';
    const queryParams = Object.fromEntries(new URLSearchParams(queryString));
    path = qIndex >= 0 ? path.slice(0, qIndex) : path;

    // -------- LESSON FILE UPLOAD MOCK --------
    const uploadUrlMatch = path.match(/^\/methodist\/lessons\/([^/]+)\/upload-url/);
    if (uploadUrlMatch) {
      const filename = queryParams.filename || 'file.pdf';
      return {
        success: true,
        data: {
          uploadUrl: 'mock://skip',
          fileKey: `lessons/${uploadUrlMatch[1]}/${filename}`,
        },
      };
    }

    // -------- AUTH --------
    if (path === '/auth/staff/login') {
      const { login, password } = body;

      // Мок-креды по ролям (совпадают с backend seed env-переменными)
      const MOCK_ACCOUNTS = [
        { email: 'azizbekamangeldiev.2010@gmail.com', password: 'ChangeMe123!', role: 'ceo', firstName: 'Demo', lastName: 'CEO' },
        { email: 'hp8187081014laptop@gmail.com', password: 'ChangeMe123!', role: 'admin', firstName: 'Demo', lastName: 'Admin' },
        { email: 'mentor.demo@levelup.local', password: 'ChangeMe123!', role: 'mentor', firstName: 'Demo', lastName: 'Mentor' },
        { email: 'methodist@levelup.local', password: 'ChangeMe123!', role: 'methodist', firstName: 'Мадина', lastName: 'Рахимова' },
        // Branch Manager — только mock-режим: backend-роли пока нет, страницы
        // полностью статичные (pages/branch-manager/). С VITE_USE_MOCKS=true
        // вход этим аккаунтом в боевой бэкенд упадёт — это ожидаемо.
        { email: 'kozim.manager@gmail.com', password: 'ChangeMe123!', role: 'branch_manager', firstName: 'Baxtiyor', lastName: 'Umarov' },
        // Finance Manager — только mock-режим (pages/finance/), как и branch_manager.
        { email: 'finance.manager@gmail.com', password: 'pass123', role: 'finance_manager', firstName: 'Aziz', lastName: 'Karimov' },
      ];

      const account = MOCK_ACCOUNTS.find(
        (a) => a.email.toLowerCase() === login.toLowerCase() && a.password === password
      );

      if (!account) {
        const err = new Error('Неверный email или пароль');
        err.status = 401;
        throw err;
      }

      const user = {
        id: `mock-${account.role}-id-001`,
        firstName: account.firstName,
        lastName: account.lastName,
        role: account.role,
        email: login,
      };
      localStorage.setItem('mock_token', `mock-jwt-${account.role}-xyz`);
      localStorage.setItem('mock_user', JSON.stringify(user));
      return { user, accessToken: `mock-jwt-${account.role}-xyz` };
    }

    if (path === '/auth/staff/google') {
      // В мок-режиме Google-вход имитирует ceo
      const user = {
        id: 'mock-ceo-google-id-001',
        firstName: 'Demo',
        lastName: 'CEO',
        role: 'ceo',
        email: 'azizbekamangeldiev.2010@gmail.com',
      };
      localStorage.setItem('mock_token', 'mock-jwt-ceo-xyz');
      localStorage.setItem('mock_user', JSON.stringify(user));
      return { user, accessToken: 'mock-jwt-ceo-xyz' };
    }

    if (path === '/auth/staff/refresh') {
      const mockToken = localStorage.getItem('mock_token');
      const mockUser = JSON.parse(localStorage.getItem('mock_user'));
      if (mockToken && mockUser) {
        return { user: mockUser, accessToken: mockToken };
      }
      const err = new Error('Unauthorized');
      err.status = 401;
      throw err;
    }

    if (path === '/auth/staff/logout') {
      localStorage.removeItem('mock_token');
      localStorage.removeItem('mock_user');
      return { success: true };
    }

    // AUTH-FORGOT: код в моке всегда '123456' (для ручного тестирования формы,
    // без реального SMTP) — тот же цикл запрос → код → новый пароль, что на бэке.
    if (path === '/auth/forgot-password') {
      const email = String(body?.email || '').trim().toLowerCase();
      localStorage.setItem(`mock_reset_otp_${email}`, '123456');
      return { message: 'If the account exists, a reset code has been sent' };
    }

    if (path === '/auth/reset-password') {
      const email = String(body?.email || '').trim().toLowerCase();
      const savedOtp = localStorage.getItem(`mock_reset_otp_${email}`);
      if (!savedOtp || savedOtp !== String(body?.otp || '').trim()) {
        const err = new Error('Invalid or expired code');
        err.status = 400;
        throw err;
      }
      localStorage.removeItem(`mock_reset_otp_${email}`);
      return { message: 'Password updated, please log in again' };
    }

    // -------- SUPER ADMIN: Organization Settings --------
    if (path === '/super/organization') {
      let org = JSON.parse(localStorage.getItem('mock_organization'));
      if (!org) {
        org = {
          id: 'org-uuid-001',
          name: 'LevelUp Academy',
          domain: 'levelup.uz',
          status: 'active',
          createdAt: '2026-01-10T08:00:00.000Z',
          plan: { branchLimit: null, diskSpace: '500 GB' },
        };
        localStorage.setItem('mock_organization', JSON.stringify(org));
      }
      if (method === 'PATCH') {
        org = { ...org, ...body };
        localStorage.setItem('mock_organization', JSON.stringify(org));
        return { organization: org };
      }
      return { organization: org };
    }

    // -------- SUPER ADMIN: Dashboard --------
    if (path === '/super/dashboard') {
      const { branches, admins } = getMockData();
      const totals = {
        branches: branches.length,
        activeStudents: branches.reduce((sum, b) => sum + (b.isArchived ? 0 : b.students || 0), 0),
        admins: admins.length,
        revenue: branches.reduce((sum, b) => sum + Number(b.revenue || 0), 0),
        outstandingDebt: branches.reduce((sum, b) => sum + Number(b.debt || 0), 0),
        currency: 'UZS',
      };
      return { totals, branches };
    }

    // -------- SUPER ADMIN: Branches --------
    if (path === '/super/branches') {
      const { branches, admins } = getMockData();
      if (method === 'POST') {
        const newBranch = {
          id: `branch-uuid-${Math.random().toString(36).substr(2, 9)}`,
          name: body.name, address: body.address || '', phone: body.phone || '',
          isMain: branches.length === 0, isArchived: false,
          admins: 0, students: 0, revenue: 0, debt: 0,
          createdAt: new Date().toISOString(),
        };
        branches.push(newBranch);
        saveMockData(branches, admins);
        return { branch: newBranch };
      }
      return { branches };
    }

    if (path.startsWith('/super/branches/')) {
      const { branches, admins } = getMockData();
      const parts = path.split('/');
      const id = parts[3];
      const subAction = parts[4];
      const idx = branches.findIndex((b) => b.id === id);
      if (idx === -1) { const err = new Error('Филиал не найден'); err.status = 404; throw err; }

      if (method === 'PATCH') {
        if (branches[idx].isArchived) { const err = new Error('Нельзя редактировать архивный филиал'); err.status = 403; throw err; }
        branches[idx] = { ...branches[idx],
          name: body.name !== undefined ? body.name : branches[idx].name,
          address: body.address !== undefined ? body.address : branches[idx].address,
          phone: body.phone !== undefined ? body.phone : branches[idx].phone };
        saveMockData(branches, admins);
        return { branch: branches[idx] };
      }
      if (method === 'POST' && subAction === 'archive') { branches[idx].isArchived = true; saveMockData(branches, admins); return { branch: branches[idx] }; }
      if (method === 'POST' && subAction === 'unarchive') { branches[idx].isArchived = false; saveMockData(branches, admins); return { branch: branches[idx] }; }
      if (method === 'GET') {
        const branchAdmins = admins.filter((a) => a.branchId === id);
        const groups = [
          { id: 'g1', name: 'Frontend React/Vue', subject: 'Веб-разработка', monthlyPrice: 800000 },
          { id: 'g2', name: 'Python BootCamp', subject: 'Программирование', monthlyPrice: 900000 },
        ];
        return { branch: { ...branches[idx], admins: branchAdmins, groups: branches[idx].isArchived ? [] : groups } };
      }
    }

    // -------- SUPER ADMIN: Admins --------
    if (path === '/super/admins') {
      const { branches, admins } = getMockData();
      if (method === 'POST') {
        if (admins.some((a) => a.email.toLowerCase() === body.email.toLowerCase())) { const err = new Error('Этот email уже занят'); err.status = 409; throw err; }
        const b = branches.find((x) => x.id === body.branchId);
        const newAdmin = {
          id: `admin-uuid-${Math.random().toString(36).substr(2, 9)}`,
          firstName: body.firstName, lastName: body.lastName, email: body.email,
          status: 'active', branchId: body.branchId, branchName: b ? b.name : '—',
          phone: body.phone || '', createdAt: new Date().toISOString(),
        };
        admins.push(newAdmin);
        if (b) b.admins = (b.admins || 0) + 1;
        saveMockData(branches, admins);
        return { admin: newAdmin };
      }
      return { admins };
    }

    if (path.startsWith('/super/admins/')) {
      const { branches, admins } = getMockData();
      const parts = path.split('/');
      const id = parts[3];
      const subAction = parts[4];
      const idx = admins.findIndex((a) => a.id === id);
      if (idx === -1) { const err = new Error('Администратор не найден'); err.status = 404; throw err; }
      if (method === 'PATCH' && subAction === 'freeze') { admins[idx].status = body.frozen ? 'frozen' : 'active'; saveMockData(branches, admins); return { admin: admins[idx] }; }
      if (method === 'PATCH') {
        const oldBranchId = admins[idx].branchId; const newBranchId = body.branchId;
        if (newBranchId && newBranchId !== oldBranchId) {
          const ob = branches.find((x) => x.id === oldBranchId); const nb = branches.find((x) => x.id === newBranchId);
          if (ob) ob.admins = Math.max(0, (ob.admins || 0) - 1);
          if (nb) nb.admins = (nb.admins || 0) + 1;
          admins[idx].branchId = newBranchId; admins[idx].branchName = nb ? nb.name : '—';
        }
        admins[idx].firstName = body.firstName !== undefined ? body.firstName : admins[idx].firstName;
        admins[idx].lastName = body.lastName !== undefined ? body.lastName : admins[idx].lastName;
        admins[idx].phone = body.phone !== undefined ? body.phone : admins[idx].phone;
        saveMockData(branches, admins);
        return { admin: admins[idx] };
      }
    }

    // -------- SUPER ADMIN: Methodists --------
    if (path === '/super/methodists') {
      if (method === 'POST') {
        const methodistList = JSON.parse(localStorage.getItem('mock_methodists') || '[]');
        if (methodistList.some((m) => m.email.toLowerCase() === body.email.toLowerCase())) { const err = new Error('Этот email уже занят'); err.status = 409; throw err; }
        const newMethodist = {
          id: `methodist-uuid-${Math.random().toString(36).substr(2, 9)}`,
          firstName: body.firstName, lastName: body.lastName, email: body.email,
          status: 'active', phone: body.phone || '', createdAt: new Date().toISOString(),
        };
        methodistList.push(newMethodist);
        localStorage.setItem('mock_methodists', JSON.stringify(methodistList));
        return { methodist: newMethodist };
      }
      let methodists = JSON.parse(localStorage.getItem('mock_methodists') || '[]');
      if (methodists.length === 0) {
        methodists = [
          { id: 'methodist-uuid-1111', firstName: 'Мадина', lastName: 'Рахимова', email: 'madina@levelup.local', status: 'active', phone: '+998901234561', createdAt: '2026-06-01T10:00:00.000Z' },
          { id: 'methodist-uuid-2222', firstName: 'Бобур', lastName: 'Каримов', email: 'bobur@levelup.local', status: 'active', phone: '+998901234562', createdAt: '2026-06-15T12:00:00.000Z' },
        ];
        localStorage.setItem('mock_methodists', JSON.stringify(methodists));
      }
      return { methodists };
    }

    if (path.startsWith('/super/methodists/')) {
      const parts = path.split('/');
      const id = parts[3]; const subAction = parts[4];
      let methodists = JSON.parse(localStorage.getItem('mock_methodists') || '[]');
      const idx = methodists.findIndex((m) => m.id === id);
      if (idx === -1) { const err = new Error('Методист не найден'); err.status = 404; throw err; }
      if (method === 'PATCH' && subAction === 'freeze') { methodists[idx].status = body.frozen ? 'frozen' : 'active'; localStorage.setItem('mock_methodists', JSON.stringify(methodists)); return { methodist: methodists[idx] }; }
      if (method === 'PATCH') {
        methodists[idx].firstName = body.firstName !== undefined ? body.firstName : methodists[idx].firstName;
        methodists[idx].lastName = body.lastName !== undefined ? body.lastName : methodists[idx].lastName;
        methodists[idx].phone = body.phone !== undefined ? body.phone : methodists[idx].phone;
        localStorage.setItem('mock_methodists', JSON.stringify(methodists));
        return { methodist: methodists[idx] };
      }
    }

    // -------- SUPER ADMIN: Organization --------
    if (path === '/super/organization') {
      let org = JSON.parse(localStorage.getItem('mock_org') || 'null');
      if (!org) {
        org = { id: 'org-uuid-0001', name: 'LevelUp Academy', domain: 'levelup.uz', status: 'active', createdAt: '2026-01-01T00:00:00.000Z', plan: { branchLimit: 10, diskSpace: '500 ГБ' } };
        localStorage.setItem('mock_org', JSON.stringify(org));
      }
      if (method === 'PATCH') { org = { ...org, ...body }; localStorage.setItem('mock_org', JSON.stringify(org)); return { organization: org }; }
      return { organization: org };
    }

    // Branch Manager mock helpers
function getBranchManagerMocks() {
  let managers = JSON.parse(localStorage.getItem('mock_branch_managers') || '[]');
  if (managers.length === 0) {
    managers = [
      { id: 'bm-uuid-1111', firstName: 'Baxtiyor', lastName: 'Umarov', email: 'kozim.manager@gmail.com', phone: '+998907654321', role: 'branch_manager', branchId: 'downtown-branch-uuid-1111', branchName: 'Downtown Academy', status: 'active', createdAt: '2026-02-01T10:00:00.000Z' },
    ];
    localStorage.setItem('mock_branch_managers', JSON.stringify(managers));
  }
  return managers;
}

// -------- SUPER ADMIN: Branch Managers --------
if (path === '/super/branch-managers') {
  const managers = getBranchManagerMocks();
  if (method === 'POST') {
    if (managers.some((m) => m.email.toLowerCase() === body.email.toLowerCase())) { const err = new Error('Email already in use'); err.status = 409; throw err; }
    const b = getMockData().branches.find((x) => x.id === body.branchId);
    const newManager = {
      id: `bm-uuid-${Math.random().toString(36).substr(2, 9)}`,
      firstName: body.firstName, lastName: body.lastName, email: body.email,
      phone: body.phone || '', role: 'branch_manager',
      branchId: body.branchId, branchName: b ? b.name : '—',
      status: 'active', createdAt: new Date().toISOString(),
    };
    managers.push(newManager);
    localStorage.setItem('mock_branch_managers', JSON.stringify(managers));
    return { manager: newManager };
  }
  return { managers, branches: getMockData().branches };
}

if (path.startsWith('/super/branch-managers/')) {
  const managers = getBranchManagerMocks();
  const parts = path.split('/');
  const id = parts[3];
  const idx = managers.findIndex((m) => m.id === id);
  if (idx === -1) { const err = new Error('Branch manager not found'); err.status = 404; throw err; }
  if (method === 'PATCH') {
    managers[idx].firstName = body.firstName !== undefined ? body.firstName : managers[idx].firstName;
    managers[idx].lastName = body.lastName !== undefined ? body.lastName : managers[idx].lastName;
    managers[idx].phone = body.phone !== undefined ? body.phone : managers[idx].phone;
    managers[idx].status = body.status !== undefined ? body.status : managers[idx].status;
    localStorage.setItem('mock_branch_managers', JSON.stringify(managers));
    return { manager: managers[idx] };
  }
}

// -------- BRANCH MANAGER: Dashboard --------
if (path === '/branch-manager/dashboard') {
  const { branches, admins } = getMockData();
  const branchId = 'downtown-branch-uuid-1111';
  const branch = branches.find((b) => b.id === branchId) || branches[0];
  const branchAdmins = admins.filter((a) => a.branchId === branchId);
  const totalStudents = branch ? branch.students : 0;
  const totalRevenue = branch ? branch.revenue : 0;
  const totalExpenses = 8200000;
  const outstandingDebt = branch ? branch.debt : 0;
  const dashboard = {
    totalStudents, activeStudents: Math.round(totalStudents * 0.85),
    totalGroups: 12, totalMentors: branchAdmins.length,
    totalRevenue, totalExpenses, outstandingDebt,
    debts: outstandingDebt, overdueInvoices: 5, currency: 'UZS',
  };
  return {
    dashboard,
    ...dashboard,
    branch,
  };
}

// -------- BRANCH MANAGER: Branch info --------
if (path === '/branch-manager/branch') {
  const { branches } = getMockData();
  const branch = branches.find((b) => b.id === 'downtown-branch-uuid-1111') || branches[0];
  return {
    branch: {
      id: branch.id, name: branch.name, address: branch.address,
      phone: branch.phone, email: 'downtown@levelup.uz', telegram: '@downtown_levelup',
      workHours: 'Dush–Shan · 9:00–21:00', founded: 'Yanvar 2026',
      coords: '41.3111° N, 69.2797° E', mapUrl: 'https://yandex.uz/maps/?text=41.3111,69.2797',
      manager: { firstName: 'Baxtiyor', lastName: 'Umarov', phone: '+998907654321' },
      stats: { students: branch.students, groups: 12, staff: 9, debt: branch.debt, revenue: branch.revenue || 0, expenses: 0, profit: branch.revenue || 0 },
    },
  };
}

// -------- BRANCH MANAGER: Income --------
if (path === '/branch-manager/income') {
  const qs = new URL(path, 'http://localhost').searchParams;
  const month = qs.get('month') || '2026-08';
  const payments = [
    { id: 'p1', date: '2026-08-03', student: "O'zbekov Sardor", group: 'Frontend React', amount: 850000, method: 'Karta', status: 'paid' },
    { id: 'p2', date: '2026-08-03', student: 'Karimova Nilufar', group: 'Python Bootcamp', amount: 900000, method: 'Naqd', status: 'paid' },
    { id: 'p3', date: '2026-08-02', student: 'Hasanov Botir', group: 'Frontend React', amount: 850000, method: 'Karta', status: 'pending' },
    { id: 'p4', date: '2026-08-02', student: 'Rahimova Gulnora', group: 'Python Bootcamp', amount: 450000, method: 'Naqd', status: 'paid' },
    { id: 'p5', date: '2026-08-01', student: 'Abdullayev Javlon', group: 'UI/UX Design', amount: 800000, method: 'Karta', status: 'paid' },
    { id: 'p6', date: '2026-08-01', student: 'Tursunov Dilshod', group: 'Frontend React', amount: 850000, method: 'Naqd', status: 'overdue' },
  ].filter((p) => p.date.startsWith(month));
  const totalAmount = payments.reduce((s, p) => s + p.amount, 0);
  return {
    payments, totalAmount, paidCount: payments.filter((p) => p.status === 'paid').length,
    pendingCount: payments.filter((p) => p.status === 'pending').length,
    overdueCount: payments.filter((p) => p.status === 'overdue').length, debt: 3400000,
  };
}

// -------- BRANCH MANAGER: Expenses --------
if (path === '/branch-manager/expenses') {
  const qs = new URL(path, 'http://localhost').searchParams;
  const month = qs.get('month') || '2026-08';
  const expenses = [
    { id: 'e1', date: '2026-08-04', spent_at: '2026-08-04', category: 'Jihozlar', amount: 250000, note: "3 ta klaviatura + sichqoncha" },
    { id: 'e2', date: '2026-08-01', spent_at: '2026-08-01', category: 'Oylik', amount: 800000, note: "Tozalash xodimi avans" },
    { id: 'e3', date: '2026-07-30', spent_at: '2026-07-30', category: 'Kommunal', amount: 450000, note: "Elektr + suv, iyul" },
  ].filter((e) => (e.spent_at || e.date).startsWith(month));
  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
  const categories = [...new Set(expenses.map((e) => e.category))];
  return { expenses, totalAmount, categories };
}

// -------- BRANCH MANAGER: Reports --------
if (path === '/branch-manager/reports') {
  const qs = new URL(path, 'http://localhost').searchParams;
  const months = parseInt(qs.get('months') || '6', 10);
  const monthlySeries = [
    { month: '2026-03', key: '2026-03', label: 'Mart', income: 4200000, expenses: 1100000, profit: 3100000, payments: 4 },
    { month: '2026-04', key: '2026-04', label: 'Aprel', income: 5100000, expenses: 1400000, profit: 3700000, payments: 5 },
    { month: '2026-05', key: '2026-05', label: 'May', income: 4800000, expenses: 1300000, profit: 3500000, payments: 6 },
    { month: '2026-06', key: '2026-06', label: 'Iyun', income: 6000000, expenses: 1600000, profit: 4400000, payments: 7 },
    { month: '2026-07', key: '2026-07', label: 'Iyul', income: 5600000, expenses: 1500000, profit: 4100000, payments: 7 },
    { month: '2026-08', key: '2026-08', label: 'Avgust', income: 6800000, expenses: 1500000, profit: 5300000, payments: 8 },
  ].slice(-months);
  const totalIncome = monthlySeries.reduce((s, m) => s + m.income, 0);
  const totalExpenses = monthlySeries.reduce((s, m) => s + m.expenses, 0);
  const totalProfit = monthlySeries.reduce((s, m) => s + m.profit, 0);
  const totalPayments = monthlySeries.reduce((s, m) => s + m.payments, 0);
  return { monthlySeries, totals: { totalIncome, totalExpenses, totalProfit, totalPayments } };
}
    if (path === '/methodist/training-types') {
      if (method === 'POST') {
        const newItem = {
          id: `tt-${Date.now()}`,
          name: body.name,
          description: body.description || '',
          icon: body.icon || '📚',
          sort_order: mocks.tt.length,
          created_at: new Date().toISOString(),
          topics_count: 0,
        };
        mocks.tt.push(newItem);
        localStorage.setItem('mock_tt', JSON.stringify(mocks.tt));
        return { success: true, data: newItem };
      }
      return { success: true, data: mocks.tt };
    }

    if (path.startsWith('/methodist/training-types/') && path.endsWith('/archive')) {
      const id = path.split('/')[3];
      mocks.tt = mocks.tt.filter((t) => t.id !== id);
      localStorage.setItem('mock_tt', JSON.stringify(mocks.tt));
      return { success: true };
    }

    if (path.match(/^\/methodist\/training-types\/([^/]+)$/)) {
      const id = path.split('/')[3];
      if (method === 'PATCH') {
        const idx = mocks.tt.findIndex((t) => t.id === id);
        if (idx >= 0) {
          Object.assign(mocks.tt[idx], body);
          localStorage.setItem('mock_tt', JSON.stringify(mocks.tt));
          return { success: true, data: mocks.tt[idx] };
        }
      }
    }

    // -------- TOPICS --------
    const topicMatch = path.match(/^\/methodist\/training-types\/([^/]+)\/topics$/);
    if (topicMatch) {
      const trainingTypeId = topicMatch[1];
      const filtered = mocks.topics.filter((t) => t.training_type_id === trainingTypeId);
      return { success: true, data: filtered };
    }

    if (path === '/methodist/topics') {
      if (method === 'POST') {
        const newItem = {
          id: `tp-${Date.now()}`,
          training_type_id: body.trainingTypeId,
          name: body.name,
          description: body.description || '',
          sort_order: mocks.topics.length,
          created_at: new Date().toISOString(),
          lessons_count: 0,
        };
        mocks.topics.push(newItem);
        localStorage.setItem('mock_topics', JSON.stringify(mocks.topics));
        // update topics_count in training type
        const ttIdx = mocks.tt.findIndex((t) => t.id === body.trainingTypeId);
        if (ttIdx >= 0) {
          mocks.tt[ttIdx].topics_count = (mocks.tt[ttIdx].topics_count || 0) + 1;
          localStorage.setItem('mock_tt', JSON.stringify(mocks.tt));
        }
        return { success: true, data: newItem };
      }
    }

    if (path.match(/^\/methodist\/topics\/([^/]+)$/)) {
      const id = path.split('/')[3];
      if (method === 'PATCH') {
        const idx = mocks.topics.findIndex((t) => t.id === id);
        if (idx >= 0) {
          Object.assign(mocks.topics[idx], body);
          localStorage.setItem('mock_topics', JSON.stringify(mocks.topics));
          return { success: true, data: mocks.topics[idx] };
        }
      }
    }

    if (path.match(/^\/methodist\/topics\/([^/]+)\/archive$/)) {
      const id = path.split('/')[3];
      mocks.topics = mocks.topics.filter((t) => t.id !== id);
      localStorage.setItem('mock_topics', JSON.stringify(mocks.topics));
      return { success: true };
    }

    // -------- LESSONS --------
    const lessonMatch = path.match(/^\/methodist\/topics\/([^/]+)\/lessons$/);
    if (lessonMatch) {
      const topicId = lessonMatch[1];
      const filtered = mocks.lessons.filter((l) => l.topic_id === topicId);
      return { success: true, data: filtered };
    }

    if (path === '/methodist/lessons') {
      if (method === 'POST') {
        const newItem = {
          id: `ls-${Date.now()}`,
          topic_id: body.topicId,
          title: body.title,
          lesson_type: body.lessonType,
          description: body.description || '',
          instruction: body.instruction || '',
          coin_reward: body.coinReward || 0,
          sort_order: mocks.lessons.length,
          created_at: new Date().toISOString(),
          questions_count: 0,
          requirements_count: 0,
        };
        mocks.lessons.push(newItem);
        localStorage.setItem('mock_lessons', JSON.stringify(mocks.lessons));
        return { success: true, data: newItem };
      }
    }

    if (path.match(/^\/methodist\/lessons\/([^/]+)$/)) {
      const id = path.split('/')[3];
      if (method === 'GET') {
        const lesson = mocks.lessons.find((l) => l.id === id);
        const qs = mocks.questions.filter((q) => q.lesson_id === id);
        const reqs = mocks.requirements.filter((r) => r.lesson_id === id);
        return { success: true, data: { ...lesson, questions: qs, requirements: reqs } };
      }
      if (method === 'PATCH') {
        const idx = mocks.lessons.findIndex((l) => l.id === id);
        if (idx >= 0) {
          Object.assign(mocks.lessons[idx], body);
          localStorage.setItem('mock_lessons', JSON.stringify(mocks.lessons));
          return { success: true, data: mocks.lessons[idx] };
        }
      }
    }

    if (path.match(/^\/methodist\/lessons\/([^/]+)\/archive$/)) {
      const id = path.split('/')[3];
      mocks.lessons = mocks.lessons.filter((l) => l.id !== id);
      localStorage.setItem('mock_lessons', JSON.stringify(mocks.lessons));
      return { success: true };
    }

    const copyMatch = path.match(/^\/methodist\/lessons\/([^/]+)\/copy$/);
    if (copyMatch && method === 'POST') {
      const lessonId = copyMatch[1];
      const { targetTopicId } = body;
      const original = mocks.lessons.find((l) => l.id === lessonId);
      if (original) {
        const newLesson = {
          ...original,
          id: `ls-${Date.now()}`,
          topic_id: targetTopicId,
          title: `${original.title} (копия)`,
          created_at: new Date().toISOString(),
          questions_count: original.questions_count,
          requirements_count: original.requirements_count,
        };
        mocks.lessons.push(newLesson);
        localStorage.setItem('mock_lessons', JSON.stringify(mocks.lessons));
        // copy questions
        const qs = mocks.questions.filter((q) => q.lesson_id === lessonId);
        const newQs = qs.map((q) => ({ ...q, id: `q-${Date.now()}-${Math.random()}`, lesson_id: newLesson.id }));
        mocks.questions.push(...newQs);
        localStorage.setItem('mock_questions', JSON.stringify(mocks.questions));
        // copy requirements
        const reqs = mocks.requirements.filter((r) => r.lesson_id === lessonId);
        const newReqs = reqs.map((r) => ({ ...r, id: `req-${Date.now()}-${Math.random()}`, lesson_id: newLesson.id }));
        mocks.requirements.push(...newReqs);
        localStorage.setItem('mock_requirements', JSON.stringify(mocks.requirements));
        return { success: true, data: newLesson };
      }
    }

    // -------- QUESTIONS --------
    const qMatch = path.match(/^\/methodist\/lessons\/([^/]+)\/questions$/);
    if (qMatch) {
      const lessonId = qMatch[1];
      const filtered = mocks.questions.filter((q) => q.lesson_id === lessonId);
      return { success: true, data: filtered };
    }

    if (path === '/methodist/questions') {
      if (method === 'POST') {
        const newItem = {
          id: `q-${Date.now()}`,
          lesson_id: body.lessonId,
          question_text: body.questionText,
          option_a: body.optionA,
          option_b: body.optionB,
          option_c: body.optionC,
          option_d: body.optionD,
          correct_answer: body.correctAnswer,
          sort_order: mocks.questions.length,
        };
        mocks.questions.push(newItem);
        localStorage.setItem('mock_questions', JSON.stringify(mocks.questions));
        return { success: true, data: newItem };
      }
    }

    if (path === '/methodist/questions/batch') {
      if (method === 'POST') {
        const newQs = body.questions.map((q, i) => ({
          id: `q-${Date.now()}-${i}`,
          lesson_id: q.lessonId,
          question_text: q.questionText,
          option_a: q.optionA,
          option_b: q.optionB,
          option_c: q.optionC,
          option_d: q.optionD,
          correct_answer: q.correctAnswer,
          sort_order: mocks.questions.length + i,
        }));
        mocks.questions.push(...newQs);
        localStorage.setItem('mock_questions', JSON.stringify(mocks.questions));
        return { success: true, data: newQs };
      }
    }

    if (path.match(/^\/methodist\/questions\/([^/]+)$/)) {
      const id = path.split('/')[3];
      if (method === 'PATCH') {
        const idx = mocks.questions.findIndex((q) => q.id === id);
        if (idx >= 0) {
          Object.assign(mocks.questions[idx], body);
          localStorage.setItem('mock_questions', JSON.stringify(mocks.questions));
          return { success: true, data: mocks.questions[idx] };
        }
      }
      if (method === 'DELETE') {
        mocks.questions = mocks.questions.filter((q) => q.id !== id);
        localStorage.setItem('mock_questions', JSON.stringify(mocks.questions));
        return { success: true };
      }
    }

    // -------- REQUIREMENTS (практические задания) --------
    const reqMatch = path.match(/^\/methodist\/lessons\/([^/]+)\/requirements$/);
    if (reqMatch) {
      const lessonId = reqMatch[1];
      const filtered = mocks.requirements.filter((r) => r.lesson_id === lessonId);
      return { success: true, data: filtered };
    }

    if (path === '/methodist/requirements') {
      if (method === 'POST') {
        const newItem = {
          id: `req-${Date.now()}`,
          lesson_id: body.lessonId,
          text: body.text,
          points: body.points || 0,
          sort_order: mocks.requirements.length,
        };
        mocks.requirements.push(newItem);
        localStorage.setItem('mock_requirements', JSON.stringify(mocks.requirements));
        syncRequirementsCount(mocks, body.lessonId);
        return { success: true, data: newItem };
      }
    }

    if (path.match(/^\/methodist\/requirements\/([^/]+)$/)) {
      const id = path.split('/')[3];
      if (method === 'PATCH') {
        const idx = mocks.requirements.findIndex((r) => r.id === id);
        if (idx >= 0) {
          Object.assign(mocks.requirements[idx], body);
          localStorage.setItem('mock_requirements', JSON.stringify(mocks.requirements));
          return { success: true, data: mocks.requirements[idx] };
        }
      }
      if (method === 'DELETE') {
        const removed = mocks.requirements.find((r) => r.id === id);
        mocks.requirements = mocks.requirements.filter((r) => r.id !== id);
        localStorage.setItem('mock_requirements', JSON.stringify(mocks.requirements));
        if (removed) syncRequirementsCount(mocks, removed.lesson_id);
        return { success: true };
      }
    }

    // -------- ANALYTICS --------
    if (path === '/methodist/difficulty') {
      return {
        success: true,
        data: {
          tests: [
            { test_id: 't1', title: 'HTML Теги', group_name: 'Frontend React/Vue', subject: 'Веб-разработка', branch_name: 'Downtown Academy', attempts: 15, avg_score: '68.5', question_count: 3 },
            { test_id: 't2', title: 'Переменные и типы', group_name: 'Frontend React/Vue', subject: 'Веб-разработка', branch_name: 'Downtown Academy', attempts: 12, avg_score: '45.2', question_count: 4 },
            { test_id: 't3', title: 'Hello World', group_name: 'Python BootCamp', subject: 'Программирование', branch_name: 'Chilanzar Branch', attempts: 10, avg_score: '82.0', question_count: 2 },
          ],
          homework: [
            { homework_id: 'h1', title: 'Flexbox Layout', group_name: 'Frontend React/Vue', subject: 'Веб-разработка', branch_name: 'Downtown Academy', submissions: 14, avg_score: '78.5', max_score: 100 },
            { homework_id: 'h2', title: 'Python Dictionary', group_name: 'Python BootCamp', subject: 'Программирование', branch_name: 'Chilanzar Branch', submissions: 8, avg_score: '52.3', max_score: 100 },
          ],
        },
      };
    }

    if (path === '/methodist/groups') {
      return {
        success: true,
        data: [
          { id: 'g1', name: 'Frontend React/Vue', subject: 'Веб-разработка', branch_name: 'Downtown Academy', mentor_name: 'Ильхом Кадыров', student_count: 15 },
          { id: 'g2', name: 'Python BootCamp', subject: 'Программирование', branch_name: 'Chilanzar Branch', mentor_name: 'Джасур Усманов', student_count: 12 },
        ],
      };
    }

    if (path === '/methodist/students') {
      return {
        success: true,
        data: [
          { id: 's1', first_name: 'Анвар', last_name: 'Собиров', branch_name: 'Downtown Academy', groups: [{ id: 'g1', name: 'Frontend React/Vue', subject: 'Веб-разработка' }] },
          { id: 's2', first_name: 'Гульноза', last_name: 'Каримова', branch_name: 'Chilanzar Branch', groups: [{ id: 'g2', name: 'Python BootCamp', subject: 'Программирование' }] },
          { id: 's3', first_name: 'Ботир', last_name: 'Хасанов', branch_name: 'Downtown Academy', groups: [{ id: 'g1', name: 'Frontend React/Vue', subject: 'Веб-разработка' }] },
        ],
      };
    }

    // -------- ADMIN: Dashboard --------
    if (path === '/admin/dashboard') {
      return {
        totals: {
          totalStudents: 142,
          activeStudents: 128,
          frozenStudents: 14,
          groups: 8,
          totalGroups: 8,
          mentors: 6,
          totalMentors: 6,
          totalRevenue: 42500000,
          totalExpenses: 8200000,
          outstandingDebt: 3400000,
          debts: 3400000,
          overdueInvoices: 5,
          income: 42500000,
          expenses: 8200000,
          currency: 'UZS',
        },
        thisMonth: {
          newStudents: 12,
          revenue: 6800000,
          expenses: 1500000,
          profit: 5300000,
          payments: 23,
        },
        recentActivity: [
          { id: 'a1', type: 'payment', message: 'O\'zbekov Sardor — 850,000 UZS', time: '2 soat oldin' },
          { id: 'a2', type: 'student', message: 'Yangi talaba: Karimova Nilufar', time: '5 soat oldin' },
          { id: 'a3', type: 'expense', message: 'Xarajat: Ofis jihozlari — 320,000 UZS', time: 'Kecha' },
          { id: 'a4', type: 'group', message: 'Frontend React guruhiga 3 ta talaba qo\'shildi', time: '2 kun oldin' },
        ],
      };
    }

    // -------- ADMIN: Students --------
    if (path === '/admin/students' && method === 'GET') {
      let students = JSON.parse(localStorage.getItem('mock_admin_students') || '[]');
      if (students.length === 0) {
        students = [
          { id: 'st-1', firstName: 'Sardor', lastName: 'O\'zbekov', phone: '+998901112233', status: 'active', balance: 1250000, coins: 340, groupName: 'Frontend React', mentorName: 'Ilhom Karimov', createdAt: '2026-01-15T10:00:00Z', loginCode: 'demostud' },
          { id: 'st-2', firstName: 'Nilufar', lastName: 'Karimova', phone: '+998902223344', status: 'active', balance: 850000, coins: 210, groupName: 'Python Bootcamp', mentorName: 'Jasur Usmanov', createdAt: '2026-01-20T11:00:00Z', loginCode: 'nilufar1' },
          { id: 'st-3', firstName: 'Botir', lastName: 'Hasanov', phone: '+998903334455', status: 'active', balance: 2100000, coins: 520, groupName: 'Frontend React', mentorName: 'Ilhom Karimov', createdAt: '2026-02-01T09:00:00Z', loginCode: 'botir12' },
          { id: 'st-4', firstName: 'Gulnora', lastName: 'Rahimova', phone: '+998904445566', status: 'frozen', balance: 450000, coins: 80, groupName: 'Python Bootcamp', mentorName: 'Jasur Usmanov', createdAt: '2026-02-10T08:30:00Z', loginCode: 'gulno4' },
          { id: 'st-5', firstName: 'Javlon', lastName: 'Abdullayev', phone: '+998905556677', status: 'active', balance: 980000, coins: 175, groupName: 'UI/UX Design', mentorName: 'Malika Sharipova', createdAt: '2026-02-15T14:00:00Z', loginCode: 'javlon5' },
          { id: 'st-6', firstName: 'Dilshod', lastName: 'Tursunov', phone: '+998906667788', status: 'active', balance: 1560000, coins: 290, groupName: 'Frontend React', mentorName: 'Ilhom Karimov', createdAt: '2026-03-01T10:00:00Z', loginCode: 'dilsh6' },
          { id: 'st-7', firstName: 'Malika', lastName: 'Nazarova', phone: '+998907778899', status: 'active', balance: 720000, coins: 145, groupName: 'Backend Node.js', mentorName: 'Sardor Rakhimov', createdAt: '2026-03-05T11:30:00Z', loginCode: 'malik7' },
          { id: 'st-8', firstName: 'Otabek', lastName: 'Mirzayev', phone: '+998908889900', status: 'active', balance: 1890000, coins: 410, groupName: 'UI/UX Design', mentorName: 'Malika Sharipova', createdAt: '2026-03-10T09:00:00Z', loginCode: 'otab8' },
          { id: 'st-9', firstName: 'Shahzoda', lastName: 'Ismoilova', phone: '+998909990011', status: 'active', balance: 630000, coins: 95, groupName: 'Python Bootcamp', mentorName: 'Jasur Usmanov', createdAt: '2026-03-15T10:00:00Z', loginCode: 'shahz9' },
          { id: 'st-10', firstName: 'Sardor', lastName: 'Jumaev', phone: '+998901112200', status: 'active', balance: 1340000, coins: 260, groupName: 'Backend Node.js', mentorName: 'Sardor Rakhimov', createdAt: '2026-03-20T12:00:00Z', loginCode: 'sard10' },
          { id: 'st-11', firstName: 'Nodira', lastName: 'Karimova', phone: '+998902223300', status: 'active', balance: 890000, coins: 180, groupName: 'Frontend React', mentorName: 'Ilhom Karimov', createdAt: '2026-04-01T08:00:00Z', loginCode: 'nodir11' },
          { id: 'st-12', firstName: 'Akbar', lastName: 'Sultanov', phone: '+998903334400', status: 'active', balance: 1120000, coins: 225, groupName: 'UI/UX Design', mentorName: 'Malika Sharipova', createdAt: '2026-04-05T10:00:00Z', loginCode: 'akbar12' },
        ];
        localStorage.setItem('mock_admin_students', JSON.stringify(students));
      }
      return { students, total: students.length };
    }

    if (path === '/admin/students' && method === 'POST') {
      const students = JSON.parse(localStorage.getItem('mock_admin_students') || '[]');
      const newStudent = {
        id: `st-${Date.now()}`,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone || '',
        status: 'active',
        balance: 0,
        coins: 0,
        groupName: body.groupName || '',
        mentorName: body.mentorName || '',
        createdAt: new Date().toISOString(),
        loginCode: `user${Math.floor(1000 + Math.random() * 9000)}`,
      };
      students.push(newStudent);
      localStorage.setItem('mock_admin_students', JSON.stringify(students));
      return { student: newStudent };
    }

    if (path.match(/^\/admin\/students\/([^/]+)$/) && method === 'GET') {
      const id = path.split('/')[3];
      const students = JSON.parse(localStorage.getItem('mock_admin_students') || '[]');
      const student = students.find(s => s.id === id);
      if (!student) { const err = new Error('Талаба не найден'); err.status = 404; throw err; }
      // Narxni mock groups ro'yxatidan olamiz (real backendda adminStudentDetail
      // groups[].monthlyPrice qaytaradi — Payments modal shunga tayanadi).
      const groups = JSON.parse(localStorage.getItem('mock_admin_groups') || '[]');
      const mockPrice = groups.find((g) => g.name === student.groupName)?.monthlyPrice || 850000;
      return {
        student: {
          ...student,
          groups: [{ id: 'g1', name: student.groupName, subject: 'Frontend', monthlyPrice: mockPrice }],
          payments: [
            { id: 'p1', amount: 850000, date: '2026-06-01T10:00:00Z', type: 'cash', status: 'paid' },
            { id: 'p2', amount: 500000, date: '2026-05-01T10:00:00Z', type: 'card', status: 'paid' },
          ],
        },
      };
    }

    if (path.match(/^\/admin\/students\/([^/]+)$/) && method === 'PATCH') {
      const id = path.split('/')[3];
      const students = JSON.parse(localStorage.getItem('mock_admin_students') || '[]');
      const idx = students.findIndex(s => s.id === id);
      if (idx === -1) { const err = new Error('Талаба не найден'); err.status = 404; throw err; }
      students[idx] = { ...students[idx], ...body };
      localStorage.setItem('mock_admin_students', JSON.stringify(students));
      return { student: students[idx] };
    }

    if (path.match(/^\/admin\/students\/([^/]+)$/) && method === 'DELETE') {
      const id = path.split('/')[3];
      let students = JSON.parse(localStorage.getItem('mock_admin_students') || '[]');
      students = students.filter(s => s.id !== id);
      localStorage.setItem('mock_admin_students', JSON.stringify(students));
      return { success: true };
    }

    if (path.match(/^\/admin\/students\/([^/]+)\/freeze$/)) {
      const id = path.split('/')[3];
      const students = JSON.parse(localStorage.getItem('mock_admin_students') || '[]');
      const idx = students.findIndex(s => s.id === id);
      if (idx === -1) { const err = new Error('Талаба не найден'); err.status = 404; throw err; }
      students[idx].status = body.frozen ? 'frozen' : 'active';
      localStorage.setItem('mock_admin_students', JSON.stringify(students));
      return { student: students[idx] };
    }

    if (path.match(/^\/admin\/students\/([^/]+)\/regenerate-password$/)) {
      const id = path.split('/')[3];
      const students = JSON.parse(localStorage.getItem('mock_admin_students') || '[]');
      const idx = students.findIndex(s => s.id === id);
      if (idx === -1) { const err = new Error('Талаба не найден'); err.status = 404; throw err; }
      students[idx].loginCode = `new${Math.floor(1000 + Math.random() * 9000)}`;
      localStorage.setItem('mock_admin_students', JSON.stringify(students));
      return { success: true, loginCode: students[idx].loginCode };
    }

    // -------- ADMIN: Groups --------
    if (path === '/admin/groups' && method === 'GET') {
      let groups = JSON.parse(localStorage.getItem('mock_admin_groups') || '[]');
      if (groups.length === 0) {
        groups = [
          { id: 'g1', name: 'Frontend React', subject: 'Frontend', mentorName: 'Ilhom Karimov', studentCount: 18, maxStudents: 20, schedule: 'Dush-Jum 09:00-11:00', monthlyPrice: 850000, status: 'active', createdAt: '2026-01-10T10:00:00Z' },
          { id: 'g2', name: 'Python Bootcamp', subject: 'Backend', mentorName: 'Jasur Usmanov', studentCount: 14, maxStudents: 15, schedule: 'Dush-Jum 11:00-13:00', monthlyPrice: 750000, status: 'active', createdAt: '2026-01-15T10:00:00Z' },
          { id: 'g3', name: 'UI/UX Design', subject: 'Design', mentorName: 'Malika Sharipova', studentCount: 12, maxStudents: 15, schedule: 'Sesh-Pay 14:00-16:00', monthlyPrice: 700000, status: 'active', createdAt: '2026-02-01T10:00:00Z' },
          { id: 'g4', name: 'Backend Node.js', subject: 'Backend', mentorName: 'Sardor Rakhimov', studentCount: 16, maxStudents: 20, schedule: 'Dush-Jum 14:00-16:00', monthlyPrice: 900000, status: 'active', createdAt: '2026-02-10T10:00:00Z' },
          { id: 'g5', name: 'Mobile Flutter', subject: 'Mobile', mentorName: 'Ilhom Karimov', studentCount: 10, maxStudents: 15, schedule: 'Sesh-Shan 10:00-12:00', monthlyPrice: 800000, status: 'active', createdAt: '2026-03-01T10:00:00Z' },
          { id: 'g6', name: 'English Basic', subject: 'Language', mentorName: 'Dilnoza Karimova', studentCount: 20, maxStudents: 20, schedule: 'Dush-Jum 09:00-10:30', monthlyPrice: 500000, status: 'archived', createdAt: '2026-01-20T10:00:00Z' },
        ];
        localStorage.setItem('mock_admin_groups', JSON.stringify(groups));
      }
      return { groups, total: groups.length };
    }

    if (path === '/admin/groups' && method === 'POST') {
      const groups = JSON.parse(localStorage.getItem('mock_admin_groups') || '[]');
      const newGroup = {
        id: `g-${Date.now()}`,
        name: body.name,
        subject: body.subject || '',
        mentorName: body.mentorName || '',
        studentCount: 0,
        maxStudents: body.maxStudents || 15,
        schedule: body.schedule || '',
        monthlyPrice: body.monthlyPrice || 0,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      groups.push(newGroup);
      localStorage.setItem('mock_admin_groups', JSON.stringify(groups));
      return { group: newGroup };
    }

    if (path.match(/^\/admin\/groups\/([^/]+)$/) && method === 'GET') {
      const id = path.split('/')[3];
      const groups = JSON.parse(localStorage.getItem('mock_admin_groups') || '[]');
      const group = groups.find(g => g.id === id);
      if (!group) { const err = new Error('Группа не найдена'); err.status = 404; throw err; }
      // Форма — как у реального бэкенда: students на верхнем уровне, а не
      // под ключом `group` (GroupDetail читает оба варианта: raw.group || raw).
      return {
        ...group,
        students: [
          { id: 'st-1', firstName: 'Sardor', lastName: 'O\'zbekov', phone: '+998901112233' },
          { id: 'st-3', firstName: 'Botir', lastName: 'Hasanov', phone: '+998903334455' },
          { id: 'st-6', firstName: 'Dilshod', lastName: 'Tursunov', phone: '+998906667788' },
        ],
      };
    }

    if (path.match(/^\/admin\/groups\/([^/]+)$/) && method === 'PATCH') {
      const id = path.split('/')[3];
      const groups = JSON.parse(localStorage.getItem('mock_admin_groups') || '[]');
      const idx = groups.findIndex(g => g.id === id);
      if (idx === -1) { const err = new Error('Группа не найдена'); err.status = 404; throw err; }
      groups[idx] = { ...groups[idx], ...body };
      localStorage.setItem('mock_admin_groups', JSON.stringify(groups));
      return { group: groups[idx] };
    }

    if (path.match(/^\/admin\/groups\/([^/]+)\/archive$/) && method === 'POST') {
      const id = path.split('/')[3];
      const groups = JSON.parse(localStorage.getItem('mock_admin_groups') || '[]');
      const idx = groups.findIndex(g => g.id === id);
      if (idx === -1) { const err = new Error('Группа не найдена'); err.status = 404; throw err; }
      groups[idx].status = 'archived';
      localStorage.setItem('mock_admin_groups', JSON.stringify(groups));
      return { group: groups[idx] };
    }

    if (path.match(/^\/admin\/groups\/([^/]+)\/unarchive$/) && method === 'POST') {
      const id = path.split('/')[3];
      const groups = JSON.parse(localStorage.getItem('mock_admin_groups') || '[]');
      const idx = groups.findIndex(g => g.id === id);
      if (idx === -1) { const err = new Error('Группа не найдена'); err.status = 404; throw err; }
      groups[idx].status = 'active';
      localStorage.setItem('mock_admin_groups', JSON.stringify(groups));
      return { group: groups[idx] };
    }

    if (path.match(/^\/admin\/groups\/([^/]+)\/students$/) && method === 'POST') {
      return { success: true };
    }

    if (path.match(/^\/admin\/groups\/([^/]+)\/students\/([^/]+)$/) && method === 'DELETE') {
      return { success: true };
    }

    // -------- ADMIN: Group Attendance (mock — backend yok) --------
    if (path.match(/^\/admin\/groups\/([^/]+)\/attendance/) && method === 'GET') {
      const groupId = path.split('/')[3];
      const urlParams = new URL(path, 'http://localhost').searchParams;
      const date = urlParams.get('date') || new Date().toISOString().slice(0, 10);
      const storageKey = `mock_attendance_${groupId}`;
      const allRecords = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const dayRecords = allRecords.filter(r => r.lessonDate === date || r.lesson_date === date);
      // Guruh student'larini olish
      const groups = JSON.parse(localStorage.getItem('mock_admin_groups') || '[]');
      const group = groups.find(g => g.id === groupId);
      const studentCount = group?.studentCount || 0;
      // Agar bu kun uchun yozuvlar yo'q bo'lsa — avtomatik bo'sh generatsiya
      if (dayRecords.length === 0 && studentCount > 0) {
        const students = [];
        for (let i = 1; i <= studentCount; i++) {
          students.push({
            id: `att-${groupId}-${date}-${i}`,
            groupId,
            studentId: `st-${i}`,
            studentName: ['Sardor O\'zbekov', 'Botir Hasanov', 'Dilshod Tursunov', 'Jamshid Karimov', 'Oybek Rustamov', 'Asilbek Normatov', 'Shohruz Alimov', 'Davron Mirzayev', 'Sarvar Abdullayev', 'Nodir Toshmatov', 'Zafar Sobirov', 'Ilhom Yunusov', 'Bekzod Hamroyev', 'Sherzod Ergashev', 'Kamoliddin Raxmatov', 'Akbar Tulkinov', 'Mansur Jumayev', 'Timur Abduraimov', 'Davlatbek Sindarov', 'Otabek Mahkamov'][i - 1] || `O'quvchi ${i}`,
            lessonDate: date,
            status: null,
            comment: null,
          });
        }
        return { data: students };
      }
      return { data: dayRecords };
    }

    if (path.match(/^\/admin\/groups\/([^/]+)\/attendance/) && method === 'POST') {
      const groupId = path.split('/')[3];
      const storageKey = `mock_attendance_${groupId}`;
      const allRecords = JSON.parse(localStorage.getItem(storageKey) || '[]');
      // body.records ni saqlash
      const newRecords = (body.records || []).map((r, i) => ({
        id: `att-${groupId}-${body.lessonDate || body.lesson_date}-${r.studentId || i}`,
        groupId,
        studentId: r.studentId,
        studentName: r.studentName || r.studentId,
        lessonDate: body.lessonDate || body.lesson_date,
        status: r.status,
        comment: r.comment || null,
      }));
      // Eski yozuvlarni yangilash / qo'shish
      const otherRecords = allRecords.filter(r => r.lessonDate !== (body.lessonDate || body.lesson_date));
      localStorage.setItem(storageKey, JSON.stringify([...otherRecords, ...newRecords]));
      return { data: newRecords };
    }

    // -------- ADMIN: Group Homework (mock) --------
    if (path.match(/^\/admin\/groups\/([^/]+)\/homework/) && method === 'GET') {
      const groupId = path.split('/')[3];
      const storageKey = `mock_homework_${groupId}`;
      let hw = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (hw.length === 0) {
        hw = [
          { id: 'hw-1', groupId, title: 'Flexbox Layout vazifasi', description: 'CSS Flexbox yordamida responsive layout yasang', dueDate: '2026-07-20', status: 'active', submissions: 12, totalStudents: 18, createdAt: '2026-07-14T10:00:00Z' },
          { id: 'hw-2', groupId, title: 'JavaScript DOM manipulation', description: 'DOM elementlari bilan ishlash', dueDate: '2026-07-15', status: 'completed', submissions: 18, totalStudents: 18, createdAt: '2026-07-10T10:00:00Z' },
          { id: 'hw-3', groupId, title: 'React Hooks practice', description: 'useState, useEffect, useRef amaliyot', dueDate: '2026-07-25', status: 'active', submissions: 5, totalStudents: 18, createdAt: '2026-07-16T10:00:00Z' },
        ];
        localStorage.setItem(storageKey, JSON.stringify(hw));
      }
      return { data: hw };
    }

    if (path.match(/^\/admin\/groups\/([^/]+)\/homework/) && method === 'POST') {
      const groupId = path.split('/')[3];
      const storageKey = `mock_homework_${groupId}`;
      const hw = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const newHw = {
        id: `hw-${Date.now()}`,
        groupId,
        title: body.title || 'Yangi vazifa',
        description: body.description || '',
        dueDate: body.dueDate || body.due_date || '',
        status: 'active',
        submissions: 0,
        totalStudents: 18,
        createdAt: new Date().toISOString(),
      };
      hw.push(newHw);
      localStorage.setItem(storageKey, JSON.stringify(hw));
      return { data: newHw };
    }

    // -------- ADMIN: Group Feedback (mock) --------
    if (path.match(/^\/admin\/groups\/([^/]+)\/feedback/) && method === 'GET') {
      const groupId = path.split('/')[3];
      const storageKey = `mock_feedback_${groupId}`;
      let fb = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (fb.length === 0) {
        fb = [
          { id: 'fb-1', groupId, type: 'student', authorName: 'Sardor O\'zbekov', content: 'Dars juda qiziq, mentor yaxshi tushuntiradi!', rating: 5, createdAt: '2026-07-12T14:00:00Z' },
          { id: 'fb-2', groupId, type: 'student', authorName: 'Botir Hasanov', content: 'Vazifalar biroz ko\'p, lekin foydali', rating: 4, createdAt: '2026-07-13T10:00:00Z' },
          { id: 'fb-3', groupId, type: 'teacher', authorName: 'Ilhom Karimov', content: 'Guruh juda faol, davomat yaxshi', rating: 5, createdAt: '2026-07-14T16:00:00Z' },
          { id: 'fb-4', groupId, type: 'teacher', authorName: 'Ilhom Karimov', content: 'React Hooks ni yaxshiroq tushuntirish kerak', rating: 3, createdAt: '2026-07-15T18:00:00Z' },
        ];
        localStorage.setItem(storageKey, JSON.stringify(fb));
      }
      return { data: fb };
    }

    if (path.match(/^\/admin\/groups\/([^/]+)\/feedback/) && method === 'POST') {
      const groupId = path.split('/')[3];
      const storageKey = `mock_feedback_${groupId}`;
      const fb = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const newFb = {
        id: `fb-${Date.now()}`,
        groupId,
        type: body.type || 'student',
        authorName: body.authorName || body.author_name || 'Anonim',
        content: body.content || '',
        rating: body.rating || 5,
        createdAt: new Date().toISOString(),
      };
      fb.push(newFb);
      localStorage.setItem(storageKey, JSON.stringify(fb));
      return { data: newFb };
    }

    // -------- ADMIN: Mentors --------
    if (path === '/admin/mentors' && method === 'GET') {
      let mentors = JSON.parse(localStorage.getItem('mock_admin_mentors') || '[]');
      if (mentors.length === 0) {
        mentors = [
          { id: 'm1', firstName: 'Ilhom', lastName: 'Karimov', email: 'ilhom@levelup.local', phone: '+998901112233', status: 'active', groups: ['Frontend React', 'Mobile Flutter'], salary: 3500000, createdAt: '2026-01-05T10:00:00Z' },
          { id: 'm2', firstName: 'Jasur', lastName: 'Usmanov', email: 'jasur@levelup.local', phone: '+998902223344', status: 'active', groups: ['Python Bootcamp'], salary: 3000000, createdAt: '2026-01-10T10:00:00Z' },
          { id: 'm3', firstName: 'Malika', lastName: 'Sharipova', email: 'malika@levelup.local', phone: '+998903334455', status: 'active', groups: ['UI/UX Design'], salary: 3200000, createdAt: '2026-02-01T10:00:00Z' },
          { id: 'm4', firstName: 'Sardor', lastName: 'Rakhimov', email: 'sardor@levelup.local', phone: '+998904445566', status: 'active', groups: ['Backend Node.js'], salary: 3400000, createdAt: '2026-02-10T10:00:00Z' },
          { id: 'm5', firstName: 'Dilnoza', lastName: 'Karimova', email: 'dilnoza@levelup.local', phone: '+998905556677', status: 'frozen', groups: ['English Basic'], salary: 2800000, createdAt: '2026-03-01T10:00:00Z' },
        ];
        localStorage.setItem('mock_admin_mentors', JSON.stringify(mentors));
      }
      return { mentors, total: mentors.length };
    }

    if (path === '/admin/mentors' && method === 'POST') {
      const mentors = JSON.parse(localStorage.getItem('mock_admin_mentors') || '[]');
      const newMentor = {
        id: `m-${Date.now()}`,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email || '',
        phone: body.phone || '',
        status: 'active',
        groups: [],
        salary: body.salary || 0,
        createdAt: new Date().toISOString(),
      };
      mentors.push(newMentor);
      localStorage.setItem('mock_admin_mentors', JSON.stringify(mentors));
      return { mentor: newMentor };
    }

    if (path.match(/^\/admin\/mentors\/([^/]+)$/) && method === 'PATCH') {
      const id = path.split('/')[3];
      const mentors = JSON.parse(localStorage.getItem('mock_admin_mentors') || '[]');
      const idx = mentors.findIndex(m => m.id === id);
      if (idx === -1) { const err = new Error('Ментор не найден'); err.status = 404; throw err; }
      mentors[idx] = { ...mentors[idx], ...body };
      localStorage.setItem('mock_admin_mentors', JSON.stringify(mentors));
      return { mentor: mentors[idx] };
    }

    if (path.match(/^\/admin\/mentors\/([^/]+)$/) && method === 'DELETE') {
      const id = path.split('/')[3];
      let mentors = JSON.parse(localStorage.getItem('mock_admin_mentors') || '[]');
      mentors = mentors.filter(m => m.id !== id);
      localStorage.setItem('mock_admin_mentors', JSON.stringify(mentors));
      return { success: true };
    }

    if (path.match(/^\/admin\/mentors\/([^/]+)\/freeze$/)) {
      const id = path.split('/')[3];
      const mentors = JSON.parse(localStorage.getItem('mock_admin_mentors') || '[]');
      const idx = mentors.findIndex(m => m.id === id);
      if (idx === -1) { const err = new Error('Ментор не найден'); err.status = 404; throw err; }
      mentors[idx].status = body.frozen ? 'frozen' : 'active';
      localStorage.setItem('mock_admin_mentors', JSON.stringify(mentors));
      return { mentor: mentors[idx] };
    }

    // -------- ADMIN: Expenses --------
    if (path === '/admin/expenses' && method === 'GET') {
      let expenses = JSON.parse(localStorage.getItem('mock_admin_expenses') || '[]');
      if (expenses.length === 0) {
        expenses = [
          { id: 'e1', category: 'Rent', amount: 3200000, spentAt: '2026-06-10T10:00:00Z', note: 'Iyun oyi uchun ofis ijarasi', status: 'paid', paymentMethod: 'Bank', createdBy: 'Demo Admin' },
          { id: 'e2', category: 'Utility', amount: 450000, spentAt: '2026-06-05T10:00:00Z', note: 'Elektr energiyasi uchun to\'lov', status: 'paid', paymentMethod: 'Karta', createdBy: 'Demo Admin' },
          { id: 'e3', category: 'Salary', amount: 3500000, spentAt: '2026-06-01T10:00:00Z', note: 'Ilhom Karimov — iyun oy maoshi', status: 'paid', paymentMethod: "O'tkazma", createdBy: 'Demo Admin' },
          { id: 'e4', category: 'Other', amount: 800000, spentAt: '2026-06-15T10:00:00Z', note: 'Instagram reklama kampaniyasi', status: 'pending', paymentMethod: 'Karta', createdBy: 'Demo Admin' },
          { id: 'e5', category: 'Materials', amount: 120000, spentAt: '2026-06-12T10:00:00Z', note: 'O\'quvchilar uchun choy va gazak', status: 'paid', paymentMethod: 'Naqt', createdBy: 'Demo Admin' },
          { id: 'e6', category: 'Salary', amount: 3200000, spentAt: '2026-06-01T10:00:00Z', note: 'Jasur Usmanov — iyun oy maoshi', status: 'paid', paymentMethod: "O'tkazma", createdBy: 'Demo Admin' },
          { id: 'e7', category: 'Materials', amount: 250000, spentAt: '2026-05-20T10:00:00Z', note: 'Daftar, ruchka va qalam sotib olish', status: 'paid', paymentMethod: 'Naqt', createdBy: 'Demo Admin' },
          { id: 'e8', category: 'Utility', amount: 380000, spentAt: '2026-05-05T10:00:00Z', note: 'Internet va telefon uchun to\'lov', status: 'paid', paymentMethod: 'Karta', createdBy: 'Demo Admin' },
          { id: 'e9', category: 'Other', amount: 1500000, spentAt: '2026-05-15T10:00:00Z', note: 'Ofis ta\'mirlash — devor bo\'yash', status: 'paid', paymentMethod: 'Naqt', createdBy: 'Demo Admin' },
          { id: 'e10', category: 'Rent', amount: 3200000, spentAt: '2026-05-01T10:00:00Z', note: 'May oyi uchun ofis ijarasi', status: 'paid', paymentMethod: 'Bank', createdBy: 'Demo Admin' },
        ];
        localStorage.setItem('mock_admin_expenses', JSON.stringify(expenses));
      }
      return { expenses, total: expenses.length };
    }

    if (path === '/admin/expenses' && method === 'POST') {
      const expenses = JSON.parse(localStorage.getItem('mock_admin_expenses') || '[]');
      const newExpense = {
        id: `e-${Date.now()}`,
        category: body.category || 'Other',
        amount: body.amount || 0,
        spentAt: body.spentAt || new Date().toISOString(),
        note: body.note || '',
        status: 'pending',
        paymentMethod: body.paymentMethod || 'Naqt',
        isRecurring: body.isRecurring || false,
        recurringPeriod: body.recurringPeriod || null,
        nextPaymentAt: body.nextPaymentAt || null,
        createdBy: 'Demo Admin',
      };
      expenses.push(newExpense);
      localStorage.setItem('mock_admin_expenses', JSON.stringify(expenses));
      return { expense: newExpense };
    }

    if (path.match(/^\/admin\/expenses\/([^/]+)$/) && method === 'DELETE') {
      const id = path.split('/')[3];
      let expenses = JSON.parse(localStorage.getItem('mock_admin_expenses') || '[]');
      expenses = expenses.filter(e => e.id !== id);
      localStorage.setItem('mock_admin_expenses', JSON.stringify(expenses));
      return { success: true };
    }

    // -------- ADMIN: Payments/Invoices --------
    if (path === '/admin/payments/invoices' && method === 'GET') {
      let invoices = JSON.parse(localStorage.getItem('mock_admin_invoices') || '[]');
      if (invoices.length === 0) {
        invoices = [
          { id: 'inv-1', studentName: 'Sardor O\'zbekov', groupName: 'Frontend React', student: 'Sardor O\'zbekov', group: 'Frontend React', studentId: 'st-1', amount: 850000, paidAmount: 850000, status: 'paid', dueDate: '2026-06-01T00:00:00Z', paidAt: '2026-06-01T10:00:00Z', paymentMethod: 'cash' },
          { id: 'inv-2', studentName: 'Nilufar Karimova', groupName: 'Python Bootcamp', student: 'Nilufar Karimova', group: 'Python Bootcamp', studentId: 'st-2', amount: 750000, paidAmount: 0, status: 'pending', dueDate: '2026-07-01T00:00:00Z', paidAt: null, paymentMethod: null },
          { id: 'inv-3', studentName: 'Botir Hasanov', groupName: 'Frontend React', student: 'Botir Hasanov', group: 'Frontend React', studentId: 'st-3', amount: 850000, paidAmount: 500000, status: 'partially_paid', dueDate: '2026-07-01T00:00:00Z', paidAt: '2026-06-28T14:00:00Z', paymentMethod: 'card' },
          { id: 'inv-4', studentName: 'Gulnora Rahimova', groupName: 'Python Bootcamp', student: 'Gulnora Rahimova', group: 'Python Bootcamp', studentId: 'st-4', amount: 750000, paidAmount: 750000, status: 'paid', dueDate: '2026-06-01T00:00:00Z', paidAt: '2026-05-30T11:00:00Z', paymentMethod: 'cash' },
          { id: 'inv-5', studentName: 'Javlon Abdullayev', groupName: 'UI/UX Design', student: 'Javlon Abdullayev', group: 'UI/UX Design', studentId: 'st-5', amount: 700000, paidAmount: 0, status: 'overdue', dueDate: '2026-06-01T00:00:00Z', paidAt: null, paymentMethod: null },
          { id: 'inv-6', studentName: 'Dilshod Tursunov', groupName: 'Frontend React', student: 'Dilshod Tursunov', group: 'Frontend React', studentId: 'st-6', amount: 850000, paidAmount: 850000, status: 'paid', dueDate: '2026-07-01T00:00:00Z', paidAt: '2026-06-29T09:00:00Z', paymentMethod: 'card' },
        ];
        localStorage.setItem('mock_admin_invoices', JSON.stringify(invoices));
      } else {
        // Migrate old data: qadimgi ma'lumotlarga student, group, studentId qo'shish
        let changed = false;
        const studentMap = {
          'Sardor O\'zbekov': { id: 'st-1', group: 'Frontend React' },
          'Nilufar Karimova': { id: 'st-2', group: 'Python Bootcamp' },
          'Botir Hasanov': { id: 'st-3', group: 'Frontend React' },
          'Gulnora Rahimova': { id: 'st-4', group: 'Python Bootcamp' },
          'Javlon Abdullayev': { id: 'st-5', group: 'UI/UX Design' },
          'Dilshod Tursunov': { id: 'st-6', group: 'Frontend React' },
        };
        invoices = invoices.map((inv) => {
          const u = { ...inv };
          if (!u.student) u.student = u.studentName || '';
          if (!u.group) u.group = u.groupName || '';
          if (!u.studentId) {
            const match = studentMap[u.studentName || u.student];
            if (match) {
              u.studentId = match.id;
              if (!u.group) u.group = match.group;
              changed = true;
            }
          }
          return u;
        });
        if (changed) localStorage.setItem('mock_admin_invoices', JSON.stringify(invoices));
      }
      const mockCollector = JSON.parse(localStorage.getItem('mock_user') || 'null');
      const mockCollectorName = [mockCollector?.firstName, mockCollector?.lastName].filter(Boolean).join(' ') || 'Demo Admin';
      let collectorChanged = false;
      invoices = invoices.map((inv) => {
        if (Number(inv.paidAmount || 0) > 0 && !inv.acceptedBy) {
          collectorChanged = true;
          return { ...inv, acceptedBy: mockCollectorName };
        }
        return inv;
      });
      if (collectorChanged) localStorage.setItem('mock_admin_invoices', JSON.stringify(invoices));
      // Filter by status if query param present
      if (queryParams.status && queryParams.status !== 'all') {
        invoices = invoices.filter((inv) => inv.status === queryParams.status);
      }
      const total = invoices.length;
      return { invoices, total };
    }

    if (path.match(/^\/admin\/payments\/invoices\/([^/]+)\/pay$/) && method === 'POST') {
      const id = path.split('/')[4];
      const invoices = JSON.parse(localStorage.getItem('mock_admin_invoices') || '[]');
      const idx = invoices.findIndex(i => i.id === id);
      if (idx === -1) { const err = new Error('Invoice не найден'); err.status = 404; throw err; }
      // Handle split payment parts
      const paidAmount = body.parts
        ? body.parts.reduce((sum, p) => sum + Number(p.amount || 0), 0)
        : Number(body.amount || 0);
      invoices[idx].paidAmount = (invoices[idx].paidAmount || 0) + paidAmount;
      invoices[idx].status = invoices[idx].paidAmount >= invoices[idx].amount ? 'paid' : 'partially_paid';
      invoices[idx].paidAt = new Date().toISOString();
      invoices[idx].paymentMethod = body.parts?.[0]?.method || body.method || 'cash';
      const mockCollector = JSON.parse(localStorage.getItem('mock_user') || 'null');
      invoices[idx].acceptedBy = [mockCollector?.firstName, mockCollector?.lastName].filter(Boolean).join(' ') || 'Demo Admin';
      localStorage.setItem('mock_admin_invoices', JSON.stringify(invoices));
      return { invoice: invoices[idx] };
    }

    if (path.match(/^\/admin\/payments\/transactions\/([^/]+)\/refund$/) && method === 'POST') {
      return { success: true, message: 'Возврат выполнен' };
    }

    if (path.match(/^\/admin\/payments\/transactions\/([^/]+)\/void$/) && method === 'POST') {
      return { success: true, message: 'Транзакция аннулирована' };
    }

    // -------- ADMIN: Payments (ad-hoc) --------
    if (path === '/admin/payments' && method === 'POST') {
      const invoices = JSON.parse(localStorage.getItem('mock_admin_invoices') || '[]');
      const students = JSON.parse(localStorage.getItem('mock_admin_students') || '[]');
      const txId = 'tx-' + Date.now();
      const invId = 'inv-' + Date.now();
      // Look up student by ID to get full name
      const foundStudent = students.find((s) => s.id === body.studentId);
      const fullName = foundStudent
        ? [foundStudent.firstName, foundStudent.lastName].filter(Boolean).join(' ')
        : body.studentName || 'Новый студент';
      const group = foundStudent?.groupName || body.groupName || '—';
      const paidSum = body.parts.reduce((s, p) => s + Number(p.amount), 0);
      const totalAmt = Number(body.totalAmount) || paidSum;
      const newInv = {
        id: invId,
        studentName: fullName,
        student: fullName,
        studentId: body.studentId || foundStudent?.id || null,
        groupName: group,
        group: group,
        amount: totalAmt,
        paidAmount: paidSum,
        status: paidSum >= totalAmt ? 'paid' : 'partially_paid',
        dueDate: new Date().toISOString(),
        paidAt: new Date().toISOString(),
        paymentMethod: body.parts?.[0]?.method || 'cash',
        acceptedBy: (() => {
          const mockCollector = JSON.parse(localStorage.getItem('mock_user') || 'null');
          return [mockCollector?.firstName, mockCollector?.lastName].filter(Boolean).join(' ') || 'Demo Admin';
        })(),
      };
      invoices.unshift(newInv);
      localStorage.setItem('mock_admin_invoices', JSON.stringify(invoices));
      return {
        invoice: newInv,
        transactions: body.parts.map((p, i) => ({
          id: txId + '-' + i,
          invoiceId: invId,
          method: p.method,
          status: 'completed',
          amount: Number(p.amount),
          receiptKey: null,
          splitBatchId: body.parts.length > 1 ? 'batch-' + Date.now() : null,
          createdAt: new Date().toISOString(),
        })),
      };
    }

    // -------- ADMIN: Payments (receipt upload) --------
    if (path.match(/^\/admin\/payments\/transactions\/([^/]+)\/receipt-upload-url$/) && method === 'GET') {
      return {
        uploadUrl: 'https://mock-s3.uz/uploads/' + path.split('/')[4] + '/' + Date.now(),
        receiptKey: 'receipts/' + path.split('/')[4] + '/' + Date.now() + '.jpg',
      };
    }

    if (path.match(/^\/admin\/payments\/transactions\/([^/]+)\/receipt$/) && method === 'PATCH') {
      return { id: path.split('/')[4], receiptKey: body.receiptKey };
    }

    // -------- ADMIN: Reports --------
    if (path === '/admin/reports' && method === 'GET') {
      return {
        revenue: {
          total: 42500000,
          thisMonth: 6800000,
          lastMonth: 5900000,
          currency: 'UZS',
        },
        groups: [
          { name: 'Frontend React', students: 18, revenue: 15300000 },
          { name: 'Python Bootcamp', students: 14, revenue: 10500000 },
          { name: 'UI/UX Design', students: 12, revenue: 8400000 },
          { name: 'Backend Node.js', students: 16, revenue: 14400000 },
          { name: 'Mobile Flutter', students: 10, revenue: 8000000 },
        ],
        monthly: [
          { month: 'Yanvar', revenue: 3200000 },
          { month: 'Fevral', revenue: 4100000 },
          { month: 'Mart', revenue: 5200000 },
          { month: 'Aprel', revenue: 5800000 },
          { month: 'May', revenue: 5900000 },
          { month: 'Iyun', revenue: 6800000 },
        ],
        debts: [
          { studentName: 'Javlon Abdullayev', amount: 700000, overdueDays: 45 },
          { studentName: 'Shahzoda Ismoilova', amount: 350000, overdueDays: 15 },
        ],
      };
    }

    // -------- ADMIN: Group Attendance --------
    if (path.match(/^\/admin\/groups\/([^/]+)\/attendance$/) && method === 'GET') {
      const groupId = path.split('/')[3];
      const date = queryParams.date || new Date().toISOString().slice(0, 10);
      const storageKey = `mock_attendance_${groupId}_${date}`;
      let records = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (records.length === 0) {
        const groups = JSON.parse(localStorage.getItem('mock_admin_groups') || '[]');
        const group = groups.find(g => g.id === groupId);
        const students = JSON.parse(localStorage.getItem('mock_admin_students') || '[]');
        // Generate attendance for group students
        const groupStudents = group?.students || [
          { id: 'st-1', firstName: 'Sardor', lastName: "O'zbekov" },
          { id: 'st-3', firstName: 'Botir', lastName: 'Hasanov' },
          { id: 'st-6', firstName: 'Dilshod', lastName: 'Tursunov' },
        ];
        records = groupStudents.map((s, i) => ({
          id: `att-${groupId}-${date}-${i}`,
          studentId: s.id,
          studentName: [s.firstName, s.lastName].filter(Boolean).join(' ') || s.name || `Student ${i + 1}`,
          status: i % 3 === 0 ? 'absent' : i % 5 === 0 ? 'late' : 'present',
          date,
          createdAt: new Date().toISOString(),
        }));
        localStorage.setItem(storageKey, JSON.stringify(records));
      }
      return { records, date };
    }

    if (path.match(/^\/admin\/groups\/([^/]+)\/attendance$/) && method === 'POST') {
      const groupId = path.split('/')[3];
      const date = body.date || new Date().toISOString().slice(0, 10);
      const storageKey = `mock_attendance_${groupId}_${date}`;
      const records = body.records || [];
      const saved = records.map((r, i) => ({
        id: `att-${groupId}-${date}-${i}`,
        studentId: r.studentId,
        studentName: r.studentName || `Student ${i + 1}`,
        status: r.status,
        date,
        createdAt: new Date().toISOString(),
      }));
      localStorage.setItem(storageKey, JSON.stringify(saved));
      return { records: saved };
    }

    // -------- ADMIN: Group Homework --------
    if (path.match(/^\/admin\/groups\/([^/]+)\/homework$/) && method === 'GET') {
      const groupId = path.split('/')[3];
      let homework = JSON.parse(localStorage.getItem(`mock_homework_${groupId}`) || '[]');
      if (homework.length === 0) {
        homework = [
          { id: 'hw-1', groupId, title: 'Flexbox Layout', description: 'Savollar 1-10 ni yeching', dueDate: '2026-07-20T23:59:00Z', status: 'active', createdAt: '2026-07-15T10:00:00Z', submissions: 8, totalStudents: 18 },
          { id: 'hw-2', groupId, title: 'CSS Grid Mastery', description: 'Responsive layout yarating', dueDate: '2026-07-25T23:59:00Z', status: 'active', createdAt: '2026-07-16T10:00:00Z', submissions: 3, totalStudents: 18 },
          { id: 'hw-3', groupId, title: 'React Hooks', description: 'useState va useEffect amaliyot', dueDate: '2026-07-10T23:59:00Z', status: 'completed', createdAt: '2026-07-05T10:00:00Z', submissions: 15, totalStudents: 18 },
        ];
        localStorage.setItem(`mock_homework_${groupId}`, JSON.stringify(homework));
      }
      return { homework, total: homework.length };
    }

    if (path.match(/^\/admin\/groups\/([^/]+)\/homework$/) && method === 'POST') {
      const groupId = path.split('/')[3];
      const homework = JSON.parse(localStorage.getItem(`mock_homework_${groupId}`) || '[]');
      const newHw = {
        id: `hw-${Date.now()}`,
        groupId,
        title: body.title,
        description: body.description || '',
        dueDate: body.dueDate || new Date(Date.now() + 7 * 86400000).toISOString(),
        status: 'active',
        createdAt: new Date().toISOString(),
        submissions: 0,
        totalStudents: 18,
      };
      homework.push(newHw);
      localStorage.setItem(`mock_homework_${groupId}`, JSON.stringify(homework));
      return { homework: newHw };
    }

    // -------- ADMIN: Group Feedback --------
    if (path.match(/^\/admin\/groups\/([^/]+)\/feedback$/) && method === 'GET') {
      const groupId = path.split('/')[3];
      let feedback = JSON.parse(localStorage.getItem(`mock_feedback_${groupId}`) || '[]');
      if (feedback.length === 0) {
        feedback = [
          { id: 'fb-1', groupId, studentId: 'st-1', studentName: "Sardor O'zbekov", type: 'student', content: "Darslar juda yaxshi o'tadi. Mentor tushuntirishni yaxshi biladi.", rating: 5, createdAt: '2026-07-14T10:00:00Z' },
          { id: 'fb-2', groupId, studentId: 'st-3', studentName: 'Botir Hasanov', type: 'student', content: 'Homeworklari juda foydali. Lekin ko\'proq amaliyot bo\'lsa yaxshi bo\'lardi.', rating: 4, createdAt: '2026-07-15T10:00:00Z' },
          { id: 'fb-3', groupId, studentId: null, studentName: "Ilhom Karimov", type: 'teacher', content: 'Guruh juda faol. Ba\'zi talabalar ko\'proq e\'tibor talab qiladi.', rating: 4, createdAt: '2026-07-16T10:00:00Z' },
          { id: 'fb-4', groupId, studentId: 'st-6', studentName: 'Dilshod Tursunov', type: 'student', content: "Guruh atmosferasi juda yaxshi. O'rganishga ishtiyoqim oshdi!", rating: 5, createdAt: '2026-07-17T10:00:00Z' },
        ];
        localStorage.setItem(`mock_feedback_${groupId}`, JSON.stringify(feedback));
      }
      return { feedback, total: feedback.length };
    }

    if (path.match(/^\/admin\/groups\/([^/]+)\/feedback$/) && method === 'POST') {
      const groupId = path.split('/')[3];
      const feedback = JSON.parse(localStorage.getItem(`mock_feedback_${groupId}`) || '[]');
      const newFb = {
        id: `fb-${Date.now()}`,
        groupId,
        studentId: body.studentId || null,
        studentName: body.studentName || 'Anonymous',
        type: body.type || 'student',
        content: body.content,
        rating: body.rating || 5,
        createdAt: new Date().toISOString(),
      };
      feedback.push(newFb);
      localStorage.setItem(`mock_feedback_${groupId}`, JSON.stringify(feedback));
      return { feedback: newFb };
    }

    // -------- ADMIN: Settings --------
    if (path === '/admin/settings' && method === 'GET') {
      let settings = JSON.parse(localStorage.getItem('mock_admin_settings') || 'null');
      if (!settings) {
        settings = {
          branchName: 'Downtown Academy',
          address: '123 Main St, Central District',
          phone: '+998901234567',
          email: 'admin@levelup.uz',
          currency: 'UZS',
          timezone: 'Asia/Tashkent',
          language: 'uz',
          notifications: { email: true, sms: false, telegram: true },
          theme: 'system',
        };
        localStorage.setItem('mock_admin_settings', JSON.stringify(settings));
      }
      return { settings };
    }

    if (path === '/admin/settings' && method === 'PATCH') {
      let settings = JSON.parse(localStorage.getItem('mock_admin_settings') || '{}');
      settings = { ...settings, ...body };
      localStorage.setItem('mock_admin_settings', JSON.stringify(settings));
      return { settings };
    }

    // -------- CHAT --------
    if (path.match(/^\/chat\/([^/]+)\/messages$/) && method === 'GET') {
      // ключ приходит URL-кодированным (в `dm:<staff>:<parent>` есть двоеточия)
      const roomKey = decodeURIComponent(path.split('/')[2]);
      // Generate deterministic mock messages per room key
      const mockMessages = {
        'global': [
          { id: 'cm-1', chat_type: 'global', room_key: 'global', sender_id: 'mock-mentor-id-001', body: 'Assalomu alaykum, hammaga xush kelibsiz!', attachment_key: null, created_at: '2026-07-16T09:00:00Z', sender_first_name: 'Ilhom', sender_last_name: 'Karimov', sender_role: 'mentor' },
          { id: 'cm-2', chat_type: 'global', room_key: 'global', sender_id: 'mock-admin-id-001', body: 'Va alaykum assalom! Bugun yangi guruhlar ro\'yxati tayyor.', attachment_key: null, created_at: '2026-07-16T09:05:00Z', sender_first_name: 'Demo', sender_last_name: 'Admin', sender_role: 'admin' },
          { id: 'cm-3', chat_type: 'global', room_key: 'global', sender_id: 'mock-mentor-id-002', body: 'Frontend React guruhiga 3 ta yangi talaba qo\'shildi', attachment_key: null, created_at: '2026-07-16T09:10:00Z', sender_first_name: 'Jasur', sender_last_name: 'Usmanov', sender_role: 'mentor' },
          { id: 'cm-4', chat_type: 'global', room_key: 'global', sender_id: 'mock-admin-id-001', body: 'Yaxshi, ularni ro\'yxatdan o\'tkazdingizmi?', attachment_key: null, created_at: '2026-07-16T09:12:00Z', sender_first_name: 'Demo', sender_last_name: 'Admin', sender_role: 'admin' },
          { id: 'cm-5', chat_type: 'global', room_key: 'global', sender_id: 'mock-mentor-id-002', body: 'Ha, tayyor. To\'lov ham qilindi', attachment_key: null, created_at: '2026-07-16T09:15:00Z', sender_first_name: 'Jasur', sender_last_name: 'Usmanov', sender_role: 'mentor' },
        ],
      };
      // For parent:1 through parent:6, generate per-contact messages
      for (let i = 1; i <= 6; i++) {
        mockMessages[`parent:${i}`] = [
          { id: `pm-${i}-1`, chat_type: 'parent', room_key: `parent:${i}`, sender_id: `mock-contact-${i}`, body: 'Assalomu alaykum!', attachment_key: null, created_at: '2026-07-16T10:00:00Z', sender_first_name: 'Contact', sender_last_name: `${i}`, sender_role: 'student' },
          { id: `pm-${i}-2`, chat_type: 'parent', room_key: `parent:${i}`, sender_id: 'mock-admin-id-001', body: 'Va alaykum assalom! Qanday yordam bera olaman?', attachment_key: null, created_at: '2026-07-16T10:01:00Z', sender_first_name: 'Demo', sender_last_name: 'Admin', sender_role: 'admin' },
        ];
      }
      // Всё отправленное в мок-режиме лежит в localStorage и приклеивается
      // к сиду — иначе история обнулялась при каждой перезагрузке.
      const sent = mockChatRead()[roomKey] ?? [];

      if (DM_SEED[roomKey] || roomKey.startsWith('dm:')) {
        const seeded = (DM_SEED[roomKey] ?? []).map((m, i) => ({
          id: `${roomKey}-${i}`,
          chat_type: 'direct',
          room_key: roomKey,
          sender_id: m.from === 'me' ? 'mock-me' : roomKey.split(':')[2],
          body: m.body,
          attachment_key: null,
          created_at: m.at,
          sender_first_name: m.from === 'me' ? 'Siz' : 'Ota-ona',
          sender_last_name: '',
          sender_role: m.from === 'me' ? 'mentor' : 'parent',
        }));
        // Реальный бэкенд отдаёт историю НОВЫМИ СВЕРХУ (ORDER BY created_at
        // DESC), и фронт на это рассчитывает — мок обязан повторять порядок.
        const messages = [...seeded, ...sent]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return { success: true, data: { messages, nextCursor: null } };
      }

      const messages = [
        ...sent,
        ...(mockMessages[roomKey] || mockMessages['global']),
      ];
      return { success: true, data: { messages, nextCursor: null } };
    }

    // -------- CHAT: контакты и «прочитано» --------
    // Личный диалог = комната `dm:<staffId>:<parentId>`; здесь staffId фиксируем
    // как mock-me, чтобы ключи в списке и в истории совпадали.
    if (path === '/chat/contacts' && method === 'GET') {
      /* Список собеседников строится ИЗ ТЕХ ЖЕ учеников, что и остальные
         экраны. Раньше здесь лежали три родителя с выдуманными детьми
         («Aziza Rahimova»), не встречающимися ни в одной группе, — переход
         «написать родителю» из списка учеников не находил никого, потому что
         связывать было нечего. Теперь у каждого второго ученика есть
         родитель с тем же parentId, что отдаёт ростер. */
      /* Бэкенд отдаёт и родителей, и самих учеников, помечая каждого
         `peer_type` — иначе мать и её ребёнок стоят в списке рядом с одной
         фамилией и непонятно, кому пишешь. Мок повторяет ту же форму. */
      const parents = mockParentsOfStudents()
        .map((c) => ({ ...c, peer_type: 'parent' }));
      const seenStudents = new Map();
      MOCK_MENTOR_GROUPS.forEach((g) => {
        mockGroupStudents(g.id).forEach((s) => {
          if (seenStudents.has(s.id)) return;   // ученик может быть в двух группах
          seenStudents.set(s.id, {
            id: s.id,
            first_name: s.firstName,
            last_name: s.lastName,
            avatar_key: null,
            child_names: null,
            room_key: `dm:mock-me:${s.id}`,
            ...mockRoomSummary(`dm:mock-me:${s.id}`),
            peer_type: 'student',
          });
        });
      });
      const students = [...seenStudents.values()];

      /* Менторы — только для роля admin/ceo. Ментор не должен видеть
         других менторов в списке контактов (он пишет родителям/ученикам). */
      const me = JSON.parse(localStorage.getItem('mock_user') || localStorage.getItem('mock_me') || 'null');
      const myRole = me?.role ?? 'mentor';
      const mentors = (myRole === 'admin' || myRole === 'ceo')
        ? (() => {
            let list = JSON.parse(localStorage.getItem('mock_admin_mentors') || '[]');
            if (list.length === 0) {
              list = [
                { id: 'm1', firstName: 'Ilhom', lastName: 'Karimov', status: 'active', groups: ['Frontend React', 'Mobile Flutter'] },
                { id: 'm2', firstName: 'Jasur', lastName: 'Usmanov', status: 'active', groups: ['Python Bootcamp'] },
                { id: 'm3', firstName: 'Malika', lastName: 'Sharipova', status: 'active', groups: ['UI/UX Design'] },
                { id: 'm4', firstName: 'Sardor', lastName: 'Rakhimov', status: 'active', groups: ['Backend Node.js'] },
                { id: 'm5', firstName: 'Dilnoza', lastName: 'Karimova', status: 'active', groups: ['English Basic'] },
              ];
              localStorage.setItem('mock_admin_mentors', JSON.stringify(list));
            }
            return list
              .filter((m) => m.status !== 'deleted')
              .map((m) => ({
                id: m.id,
                first_name: m.firstName,
                last_name: m.lastName,
                avatar_key: null,
                child_names: m.groups?.join(', ') ?? null,
                room_key: `dm:mock-me:${m.id}`,
                ...mockRoomSummary(`dm:mock-me:${m.id}`),
                peer_type: 'mentor',
              }));
          })()
        : [];

      return { success: true, data: [...mentors, ...parents, ...students] };
    }

    if (path.match(/^\/chat\/([^/]+)\/read$/) && method === 'POST') {
      return { success: true, data: { updated: 0 } };
    }

    // -------- MENTOR: Groups --------
    // Мока не было вовсе: в мок-режиме у ментора список групп приходил пустым,
    // из-за чего Davomat/Koinlar/Testlar нечем было открыть.
    if (path === '/mentor/groups' && method === 'GET') {
      return { success: true, data: MOCK_MENTOR_GROUPS };
    }

    // -------- PROFILE --------
    // grade сюда НЕ пишется: на бэкенде PATCH /users/me его срезает схемой,
    // ставит только админ. Мок повторяет это правило, иначе фронт можно было
    // бы «проверить» на поведении, которого в бою нет.
    // Fallback: use the logged-in user from mock_user, not a hardcoded mentor
    const fallbackUser = () => {
      const me = JSON.parse(localStorage.getItem('mock_me') || 'null');
      if (me) return me;
      const mu = JSON.parse(localStorage.getItem('mock_user') || 'null');
      if (mu) return mu;
      // Last resort: admin default (not mentor)
      return { id: 'admin-demo', firstName: 'Demo', lastName: 'Admin', email: 'hp8187081014laptop@gmail.com', role: 'admin' };
    };

    if (path === '/users/me' && method === 'GET') {
      return { success: true, data: fallbackUser() };
    }

    if (path === '/users/me' && method === 'PATCH') {
      const current = fallbackUser();
      const { grade, ...allowed } = body;   // grade игнорируем — как на бэкенде
      const next = { ...current, ...allowed };
      localStorage.setItem('mock_me', JSON.stringify(next));
      return { success: true, data: next };
    }

    /* -------- PROFILE: смена пароля (мок) -------- */
    if (path === '/auth/change-password' && method === 'POST') {
      // В моках просто имитируем успешную смену пароля
      return { success: true, message: 'Пароль успешно изменён' };
    }

    /* -------- MENTOR: Davomat --------
       Моков не было вовсе: журнал открывался пустым, а автосохранение при
       каждом клике падало с ошибкой — проверить страницу без поднятого
       бэкенда было невозможно. Храним отметки в localStorage, поэтому они
       переживают перезагрузку и ведут себя как настоящие. */
    const mentorAttMatch = path.match(/^\/mentor\/attendance\/groups\/([^/?]+)/);
    if (mentorAttMatch && method === 'GET') {
      const groupId = mentorAttMatch[1];
      const qs = new URL(path, 'http://localhost').searchParams;
      const date = qs.get('date');
      const from = qs.get('from');
      const to = qs.get('to');
      const saved = JSON.parse(localStorage.getItem(`mock_mentor_att_${groupId}`) || '[]');
      const inRange = (d) => (date ? d === date : (!from || d >= from) && (!to || d <= to));
      return { success: true, data: saved.filter((r) => inRange(r.lesson_date)) };
    }

    if (mentorAttMatch && method === 'POST') {
      const groupId = mentorAttMatch[1];
      const key = `mock_mentor_att_${groupId}`;
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      const lessonDate = body.lessonDate;
      (body.records || []).forEach((r) => {
        // upsert по (student, date) — так же, как ON CONFLICT на бэкенде
        const i = saved.findIndex(
          (x) => x.student_id === r.studentId && x.lesson_date === lessonDate,
        );
        const row = { student_id: r.studentId, lesson_date: lessonDate, status: r.status };
        if (i >= 0) saved[i] = row; else saved.push(row);
      });
      localStorage.setItem(key, JSON.stringify(saved));
      return { success: true, data: { lessonDate, records: body.records } };
    }

    // -------- MENTOR: статистика ученика --------
    const statsMatch = path.match(/^\/mentor\/students\/([^/]+)\/stats$/);
    if (statsMatch && method === 'GET') {
      return { success: true, data: mockStudentStats(statsMatch[1]) };
    }

    const groupStatsMatch = path.match(/^\/mentor\/groups\/([^/]+)\/stats$/);
    if (groupStatsMatch && method === 'GET') {
      return { success: true, data: mockGroupStats(groupStatsMatch[1]) };
    }

    const groupStudentsMatch = path.match(/^\/mentor\/groups\/([^/]+)\/students$/);
    if (groupStudentsMatch && method === 'GET') {
      return { success: true, data: mockGroupStudents(groupStudentsMatch[1]) };
    }

    // -------- MENTOR: Tests --------
    // Сид и чтение — через один хелпер: иначе первый же POST затирал бы
    // начальные тесты пустым массивом.
    const seedMentorTests = (groupId) => {
      const key = `mock_mentor_tests_${groupId}`;
      const stored = JSON.parse(localStorage.getItem(key) || 'null');
      if (stored) return stored;
      return [
        { id: 'test-uuid-1', group_id: groupId, title: 'Present Simple — nazorat',
          duration_min: 20, coin_reward: 10, starts_at: null, ends_at: null,
          questions: [
            { q: 'She ___ to school every day.', options: ['go', 'goes', 'going'], correct: 1 },
            { q: 'They ___ football on Sundays.', options: ['plays', 'play', 'played'], correct: 1 },
          ],
          created_at: '2026-07-15T10:00:00Z' },
      ];
    };

    const testsGroupMatch = path.match(/^\/mentor\/tests\/groups\/([^/]+)$/);
    if (testsGroupMatch && method === 'GET') {
      return { success: true, data: seedMentorTests(testsGroupMatch[1]) };
    }

    if (testsGroupMatch && method === 'POST') {
      const key = `mock_mentor_tests_${testsGroupMatch[1]}`;
      const tests = seedMentorTests(testsGroupMatch[1]);
      const created = {
        id: `test-uuid-${Date.now()}`,
        group_id: testsGroupMatch[1],
        title: body.title,
        duration_min: body.durationMin,
        coin_reward: body.coinReward ?? 0,
        starts_at: body.startsAt ?? null,
        ends_at: body.endsAt ?? null,
        questions: body.questions,
        created_at: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify([created, ...tests]));
      return { success: true, data: created };
    }

    const testResultsMatch = path.match(/^\/mentor\/tests\/([^/]+)\/results$/);
    if (testResultsMatch && method === 'GET') {
      return { success: true, data: [
        { student_id: 'stu-1', first_name: 'Aziza', last_name: 'Rahimova', score: 8, max_score: 10,
          finished_at: '2026-07-16T11:20:00Z' },
        { student_id: 'stu-2', first_name: 'Bekzod', last_name: 'Toshmatov', score: 5, max_score: 10,
          finished_at: '2026-07-16T11:35:00Z' },
        { student_id: 'stu-3', first_name: 'Malika', last_name: 'Yusupova', score: null, max_score: 10,
          finished_at: null },
      ] };
    }

    // Fallback
    const err = new Error('Mock route not implemented: ' + path);
    err.status = 404;
    throw err;
  }

  // Реальный бэкенд-запрос
  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.fields = data.details || data.errors || null;
    throw err;
  }

  return data;
}

// Пути, которым нельзя подсовывать авто-refresh (иначе цикл/логин ломается)
const AUTH_PATHS = new Set([
  '/auth/staff/login', '/auth/staff/google', '/auth/staff/refresh', '/auth/staff/logout',
  '/auth/forgot-password', '/auth/reset-password',
]);

// Единый refreshPromise — ЛЮБОЙ триггер (bootstrap на старте приложения,
// реактивный 401, проактивный таймер/visibilitychange в auth.jsx) идёт через
// один и тот же промис, не долбит /refresh по отдельности. Без этого
// bootstrap-вызов при загрузке страницы и первый же 401 от другого
// компонента, смонтированного чуть раньше, оба уходят на сервер с ОДНИМ и
// тем же ещё не провёрнутым refresh-токеном — сервер видит это как reuse и
// отзывает ВСЕ токены пользователя разом (backend/src/modules/auth/
// auth.service.js:refresh, reuse-detection), роняя сессию целиком без
// единой реальной причины (см. task-protocol, 21.08.2026).
let refreshPromise = null;
let onTokenRefreshed = null;
export function setOnTokenRefreshed(cb) { onTokenRefreshed = cb; }

export function refreshOnce() {
  if (!refreshPromise) {
    refreshPromise = rawRequest('/auth/staff/refresh', { method: 'POST' })
      .then((d) => {
        onTokenRefreshed?.(d);
        return d;
      })
      .catch((err) => {
        onTokenRefreshed?.(null);
        throw err;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

// Авто-refresh на 401: один раз пробуем обновить токен и повторить запрос
async function request(path, opts = {}) {
  try {
    return await rawRequest(path, opts);
  } catch (err) {
    if (err.status === 401 && !AUTH_PATHS.has(path) && !opts._retried) {
      const session = await refreshOnce();
      return rawRequest(path, { ...opts, token: session.accessToken, _retried: true });
    }
    throw err;
  }
}

export const api = {
  // -------- GENERIC METHOD (used by Chat.jsx) --------
  get: (path, config = {}) => request(path, { method: 'GET', token: config.token }).then((data) => ({ data })),

  // -------- PROFILE (любая роль) --------
  // Бэкенд: GET/PATCH /api/users/me. PATCH принимает только firstName,
  // lastName, email, avatarKey — смены пароля в кабинете у API нет,
  // пароль меняется через forgot-password с кодом на почту.
  me: (token) => request('/users/me', { token }),
  updateMe: (token, body) => request('/users/me', { method: 'PATCH', token, body }),
  peopleDirectory: (token, qs = '') => request(`/users/directory${qs ? `?${qs}` : ''}`, { token }),

  // -------- PROFILE: смена пароля --------
  changePassword: (token, body) => request('/auth/change-password', { method: 'POST', token, body }),

  // -------- MENTOR: Students --------
  // Одна сводка вместо тридцати запросов: собрать её на клиенте значило бы
  // тянуть submissions по каждому ДЗ и results по каждому тесту.
  mentorStudentStats: (token, studentId) =>
    request(`/mentor/students/${studentId}/stats`, { token }),

  // -------- MENTOR: Groups --------
  mentorGroups: (token) => request('/mentor/groups', { token }),
  mentorGroupStudents: (token, groupId) => request(`/mentor/groups/${groupId}/students`, { token }),
  mentorGroupStats: (token, groupId) => request(`/mentor/groups/${groupId}/stats`, { token }),

  /* Дописать сообщение в мок-историю чата. Вызывается только под USING_MOCKS —
     с живым бэкендом сохранение делает сокет. */
  mockChatAppend,

  // -------- MENTOR: Attendance --------
  mentorAttendance: (token, groupId, params) => {
    const query = params.date
      ? `?date=${params.date}`
      : `?from=${params.from}&to=${params.to}`;
    return request(`/mentor/attendance/groups/${groupId}${query}`, { token });
  },
  mentorMarkAttendance: (token, groupId, body) =>
    request(`/mentor/attendance/groups/${groupId}`, { method: 'POST', token, body }),

  // -------- MENTOR: Homework (view + grade only) --------
  mentorHomeworkList: (token, groupId) => request(`/mentor/homework/groups/${groupId}`, { token }),
  mentorHomeworkSubmissions: (token, homeworkId) =>
    request(`/mentor/homework/${homeworkId}/submissions`, { token }),
  mentorGradeSubmission: (token, submissionId, body) =>
    request(`/mentor/homework/submissions/${submissionId}/grade`, { method: 'POST', token, body }),

  // -------- MENTOR: Coins --------
  mentorGrantCoins: (token, body) => request('/mentor/coins', { method: 'POST', token, body }),
  /* Остаток месячного лимита по группе. Лимит = норма организации × число
     учеников; считается на бэкенде на каждый запрос, поэтому кэшировать надолго
     нельзя — зачисление ученика меняет его сразу. */
  mentorCoinBudget: (token, groupId) =>
    request(`/mentor/coins/groups/${groupId}/budget`, { token }),
  mentorCoinHistory: (token, studentId) => request(`/mentor/coins/students/${studentId}`, { token }),

  // -------- MENTOR: Tests --------
  // body: { title, questions: [{ q, options[], correct }], durationMin, startsAt?, endsAt?, coinReward }
  mentorCreateTest: (token, groupId, body) =>
    request(`/mentor/tests/groups/${groupId}`, { method: 'POST', token, body }),
  mentorTests: (token, groupId) => request(`/mentor/tests/groups/${groupId}`, { token }),
  mentorTestResults: (token, testId) => request(`/mentor/tests/${testId}/results`, { token }),

  // -------- CHAT (личные диалоги staff ↔ parent) --------
  // Комната — пара `dm:<staffId>:<parentId>`; отправка идёт через socket, не сюда.
  chatContacts: (token) => request('/chat/contacts', { token }),
  chatHistory: (token, roomKey, params = {}) => {
    const qs = new URLSearchParams();
    if (params.limit) qs.set('limit', params.limit);
    if (params.cursor) qs.set('cursor', params.cursor);
    const query = qs.toString() ? `?${qs}` : '';
    return request(`/chat/${encodeURIComponent(roomKey)}/messages${query}`, { token });
  },
  chatMarkRead: (token, roomKey) =>
    request(`/chat/${encodeURIComponent(roomKey)}/read`, { method: 'POST', token }),

  // -------- AUTH (staff — admin/ceo/mentor/methodist) --------
  loginStaff: (login, password) =>
    request('/auth/staff/login', { method: 'POST', body: { login, password } }),
  refresh: () => refreshOnce(),
  logout: () => request('/auth/staff/logout', { method: 'POST' }),
  googleLogin: (idToken) => request('/auth/staff/google', { method: 'POST', body: { idToken } }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (body) => request('/auth/reset-password', { method: 'POST', body }),

  // -------- ADMIN (branch admin panel) --------
  adminDashboard: (token) => request('/admin/dashboard', { token }),
  adminCreatePayment: (token, body) => request('/admin/payments', { method: 'POST', token, body }),
  adminSettings: (token) => request('/admin/settings', { token }),
  adminTrainingTypes: (token) => request('/admin/training-types', { token }),
  adminUpdateSettings: (token, body) => request('/admin/settings', { method: 'PATCH', token, body }),
  adminExpenses: (token, qs = '') => request(`/admin/expenses${qs}`, { token }),
  adminCreateExpense: (token, body) => request('/admin/expenses', { method: 'POST', token, body }),
  superCreateExpense: (token, body) => request('/super/expenses', { method: 'POST', token, body }),
  superExpenses: (token, branchId = '') => request(`/super/expenses${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`, { token }),
  superUpdateExpense: (token, id, body) => request(`/super/expenses/${id}`, { method: 'PATCH', token, body }),
  superDeleteExpense: (token, id) => request(`/super/expenses/${id}`, { method: 'DELETE', token }),
  adminDeleteExpense: (token, id) => request(`/admin/expenses/${id}`, { method: 'DELETE', token }),
  adminUpdateExpense: (token, id, body) => request(`/admin/expenses/${id}`, { method: 'PATCH', token, body }),
  adminStudents: (token, qs = '') => request(`/admin/students${qs}`, { token }),
  adminCreateStudent: (token, body) => request('/admin/students', { method: 'POST', token, body }),
  adminStudentDetail: (token, id) => request(`/admin/students/${id}`, { token }),
  adminStudentAttendance: (token, id, qs = '') => request(`/admin/students/${id}/attendance${qs}`, { token }),
  adminStudentTelegram: (token, id) => request(`/admin/students/${id}/telegram`, { token }),
  adminSendStudentTelegramMessage: (token, id, text, toParent) =>
    request(`/admin/students/${id}/telegram/message`, { method: 'POST', token, body: { text, toParent } }),
  adminCreateStudentQrToken: (token, id) => request(`/admin/students/${id}/qr-token`, { method: 'POST', token }),
  adminRegenerateStudentQrToken: (token, id) => request(`/admin/students/${id}/qr-token/regenerate`, { method: 'POST', token }),
  adminGroupCredentials: (token, id) => request(`/admin/groups/${id}/credentials`, { token }),
  adminUpdateStudent: (token, id, body) => request(`/admin/students/${id}`, { method: 'PATCH', token, body }),
  adminFreezeStudent: (token, id, frozen, reason) => request(`/admin/students/${id}/freeze`, { method: 'POST', token, body: { frozen, reason } }),
  adminDeleteStudent: (token, id, reason) => request(`/admin/students/${id}`, { method: 'DELETE', token, body: reason ? { reason } : undefined }),
  adminGroups: (token, qs = '') => request(`/admin/groups${qs}`, { token }),
  adminCreateGroup: (token, body) => request('/admin/groups', { method: 'POST', token, body }),
  adminGroupDetail: (token, id) => request(`/admin/groups/${id}`, { token }),
  adminGroupTelegramStatus: (token, id) => request(`/admin/groups/${id}/telegram`, { token }),
  adminGroupTelegramBindToken: (token, id) => request(`/admin/groups/${id}/telegram/bind-token`, { method: 'POST', token }),
  adminGroupTelegramUnlink: (token, id) => request(`/admin/groups/${id}/telegram`, { method: 'DELETE', token }),
  adminUpdateGroup: (token, id, body) => request(`/admin/groups/${id}`, { method: 'PATCH', token, body }),
  adminArchiveGroup: (token, id, reason) => request(`/admin/groups/${id}/archive`, { method: 'POST', token, body: reason ? { reason } : undefined }),
  adminUnarchiveGroup: (token, id) => request(`/admin/groups/${id}/unarchive`, { method: 'POST', token }),

  // -------- ADMIN/Branch Manager: Расписание (кабинеты + drag-and-drop сетка) --------
  adminSchedule: (token) => request('/admin/schedule', { token }),
  adminRooms: (token) => request('/admin/rooms', { token }),
  adminCreateRoom: (token, body) => request('/admin/rooms', { method: 'POST', token, body }),
  adminUpdateRoom: (token, id, body) => request(`/admin/rooms/${id}`, { method: 'PATCH', token, body }),
  adminDeleteRoom: (token, id) => request(`/admin/rooms/${id}`, { method: 'DELETE', token }),
  adminMentors: (token) => request('/admin/mentors', { token }),
  adminCreateMentor: (token, body) => request('/admin/mentors', { method: 'POST', token, body }),
  adminUpdateMentor: (token, id, body) => request(`/admin/mentors/${id}`, { method: 'PATCH', token, body }),
  adminFreezeMentor: (token, id, frozen) => request(`/admin/mentors/${id}/freeze`, { method: 'POST', token, body: { frozen } }),
  adminDeleteMentor: (token, id) => request(`/admin/mentors/${id}`, { method: 'DELETE', token }),
  adminRegenStudentPassword: (token, id) => request(`/admin/students/${id}/regenerate-password`, { method: 'POST', token }),
  adminStudentCredentials: (token, id) => request(`/admin/students/${id}/credentials`, { token }),
  adminCreateParentQrToken: (token, id) => request(`/admin/students/${id}/parent/qr-token`, { method: 'POST', token }),
  adminRegenerateParentQrToken: (token, id) => request(`/admin/students/${id}/parent/qr-token/regenerate`, { method: 'POST', token }),
  adminRegenParentPassword: (token, id) => request(`/admin/students/${id}/parent/regenerate-password`, { method: 'POST', token }),
  adminParentCredentials: (token, id) => request(`/admin/students/${id}/parent/credentials`, { token }),

  // -------- ADMIN/Branch Manager: Shop (остаток + заказы своего филиала; каталог — у CEO) --------
  adminShopItems: (token) => request('/admin/shop/items', { token }),
  adminCreateShopItem: (token, body) => request('/admin/shop/items', { method: 'POST', token, body }),
  adminRestockShopItem: (token, id, stock) => request(`/admin/shop/items/${id}/stock`, { method: 'PATCH', token, body: { stock } }),
  adminShopOrders: (token, qs = '') => request(`/admin/shop/orders${qs}`, { token }),
  adminFulfillShopOrder: (token, id) => request(`/admin/shop/orders/${id}/fulfill`, { method: 'POST', token }),
  adminCancelShopOrder: (token, id) => request(`/admin/shop/orders/${id}/cancel`, { method: 'POST', token }),

  // -------- ADMIN: Groups — add/remove students --------
  adminAddStudentToGroup: (token, groupId, studentId) =>
    request(`/admin/groups/${groupId}/students`, { method: 'POST', token, body: { studentId } }),
  adminRemoveStudentFromGroup: (token, groupId, studentId) =>
    request(`/admin/groups/${groupId}/students/${studentId}`, { method: 'DELETE', token }),

  // -------- ADMIN: Group Attendance --------
  adminGroupAttendance: (token, groupId, date) =>
    request(`/admin/groups/${groupId}/attendance?date=${date}`, { token }),
  adminMarkGroupAttendance: (token, groupId, body) =>
    request(`/admin/groups/${groupId}/attendance`, { method: 'POST', token, body }),

  // -------- ADMIN: Group Homework --------
  adminGroupHomework: (token, groupId) =>
    request(`/admin/groups/${groupId}/homework`, { token }),
  adminCreateGroupHomework: (token, groupId, body) =>
    request(`/admin/groups/${groupId}/homework`, { method: 'POST', token, body }),

  // -------- ADMIN: Group Feedback --------
  adminGroupFeedback: (token, groupId) =>
    request(`/admin/groups/${groupId}/feedback`, { token }),
  adminCreateGroupFeedback: (token, groupId, body) =>
    request(`/admin/groups/${groupId}/feedback`, { method: 'POST', token, body }),

  // -------- ADMIN: Payments (invoices) --------
  adminInvoices: (token, qs = '') => request(`/admin/payments/invoices${qs}`, { token }),
  adminPayInvoice: (token, invoiceId, body) =>
    request(`/admin/payments/invoices/${invoiceId}/pay`, { method: 'POST', token, body }),

  // -------- ADMIN: Payments (refund / void) --------
  adminRefundTransaction: (token, transactionId, body) =>
    request(`/admin/payments/transactions/${transactionId}/refund`, { method: 'POST', token, body }),
  adminVoidTransaction: (token, transactionId, body) =>
    request(`/admin/payments/transactions/${transactionId}/void`, { method: 'POST', token, body }),

  // -------- ADMIN: Payments (ad-hoc, receipt) --------
  adminAdHocPayment: (token, body) =>
    request('/admin/payments', { method: 'POST', token, body }),
  adminReceiptUploadUrl: (token, transactionId, filename, contentType) =>
    request(`/admin/payments/transactions/${transactionId}/receipt-upload-url?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`, { token }),
  adminAttachReceipt: (token, transactionId, receiptKey) =>
    request(`/admin/payments/transactions/${transactionId}/receipt`, { method: 'PATCH', token, body: { receiptKey } }),

  // -------- ADMIN: Reports --------
  adminReports: (token, qs = '') => request(`/admin/reports${qs}`, { token }),

  // -------- SUPER ADMIN --------
  superDashboard: (token) => request('/super/dashboard', { token }),
  // «Отчёты» слиты в «Статистику» 2026-07-28 — это был один и тот же набор
  // данных (итоги + разбивка по филиалам) на двух страницах; /super/reports
  // больше не существует, доля филиала (share) теперь тоже приходит отсюда.
  superStats: (token, period = '30d', branchId = '') =>
    request(`/super/stats?period=${period}${branchId ? `&branchId=${branchId}` : ''}`, { token }),

  // -------- FINANCE MANAGER --------
  // Тот же контроллер/сервис, что у CEO (super.controller.js) — просто другой
  // роут с authorize('finance_manager', 'ceo') вместо authorize('ceo'), чтобы
  // не открывать Finance Manager'у филиалы/админов вместе с финансами
  // (backend/src/modules/finance/finance.routes.js, Karis 22.08.2026).
  financeDashboard: (token) => request('/finance/dashboard', { token }),
  financeStats: (token, period = '30d', branchId = '') =>
    request(`/finance/stats?period=${period}${branchId ? `&branchId=${branchId}` : ''}`, { token }),
  financeBranches: (token) => request('/finance/branches', { token }),
  financeIncome: (token, { branchId = '', from = '', to = '', page = 1, limit = 20 } = {}) =>
    request(
      `/finance/income?page=${page}&limit=${limit}${branchId ? `&branchId=${branchId}` : ''}${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}`,
      { token },
    ),
  financeSalaries: (token, { branchId = '', periodMonth = '' } = {}) =>
    request(`/finance/salaries?${branchId ? `branchId=${branchId}&` : ''}${periodMonth ? `periodMonth=${periodMonth}` : ''}`, { token }),
  // from/to обязательно прокидываем: бэкенд их принимает (listOrgExpensesSchema),
  // а без них страница тянула расходы за всё время под подписью «за месяц».
  financeExpenses: (token, { branchId = '', from = '', to = '' } = {}) => {
    const qs = new URLSearchParams();
    if (branchId) qs.set('branchId', branchId);
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const q = qs.toString();
    return request(`/finance/expenses${q ? `?${q}` : ''}`, { token });
  },
  financeCreateExpense: (token, body) => request('/finance/expenses', { method: 'POST', token, body }),
  financeUpdateExpense: (token, id, body) => request(`/finance/expenses/${id}`, { method: 'PATCH', token, body }),
  financeDeleteExpense: (token, id) => request(`/finance/expenses/${id}`, { method: 'DELETE', token }),
  superBranches: (token) => request('/super/branches', { token }),
  superBranchDetail: (token, id) => request(`/super/branches/${id}`, { token }),
  superCreateBranch: (token, body) => request('/super/branches', { method: 'POST', token, body }),
  superUpdateBranch: (token, id, body) => request(`/super/branches/${id}`, { method: 'PATCH', token, body }),
  superArchiveBranch: (token, id) => request(`/super/branches/${id}/archive`, { method: 'POST', token }),
  superUnarchiveBranch: (token, id) => request(`/super/branches/${id}/unarchive`, { method: 'POST', token }),
  superAdmins: (token) => request('/super/admins', { token }),
  superEmployees: (token) => request('/super/employees', { token }),
  superCreateEmployee: (token, body) => request('/super/employees', { method: 'POST', token, body }),
  superUpdateEmployee: (token, id, body) => request(`/super/employees/${id}`, { method: 'PATCH', token, body }),
  superFreezeEmployee: (token, id, frozen) => request(`/super/employees/${id}/freeze`, { method: 'PATCH', token, body: { frozen } }),
  superResetEmployeePassword: (token, id) => request(`/super/employees/${id}/reset-password`, { method: 'POST', token }),
  superCreateAdmin: (token, body) => request('/super/admins', { method: 'POST', token, body }),
  superUpdateAdmin: (token, id, body) => request(`/super/admins/${id}`, { method: 'PATCH', token, body }),
  superFreezeAdmin: (token, id) => request(`/super/admins/${id}/freeze`, { method: 'PATCH', token, body: { frozen: true } }),
  superUnfreezeAdmin: (token, id) => request(`/super/admins/${id}/freeze`, { method: 'PATCH', token, body: { frozen: false } }),
  superResetAdminPassword: (token, id) => request(`/super/admins/${id}/reset-password`, { method: 'POST', token }),
  superGetOrganization: (token) => request('/super/organization', { token }),
  superUpdateOrganization: (token, body) => request('/super/organization', { method: 'PATCH', token, body }),
  superTrainingTypes: (token) => request('/super/training-types', { token }),
  superSetTrainingTypePrice: (token, id, price, maxStudents) =>
    request(`/super/training-types/${id}/price`, { method: 'PATCH', token, body: { price, maxStudents } }),
  superSetTrainingTypeArchived: (token, id, archived) =>
    request(`/super/training-types/${id}/archive`, { method: 'PATCH', token, body: { archived } }),
  // -------- CEO: Shop-каталог (имя/фото/цена/старт.остаток — филиал дальше только пополняет) --------
  superShopItems: (token, qs = '') => request(`/super/shop/items${qs}`, { token }),
  superCreateShopItem: (token, body) => request('/super/shop/items', { method: 'POST', token, body }),
  superUpdateShopItem: (token, id, body) => request(`/super/shop/items/${id}`, { method: 'PATCH', token, body }),
  superSetShopItemArchived: (token, id, archived) =>
    request(`/super/shop/items/${id}/archive`, { method: 'PATCH', token, body: { archived } }),
  superMethodists: (token) => request('/super/methodists', { token }),
  // Только чтение — для выбора цели во «Взыскании». CRUD ментора у Admin филиала.
  superMentors: (token) => request('/super/mentors', { token }),
  superCreateMentor: (token, body) => request('/super/mentors', { method: 'POST', token, body }),
  superUpdateMentorGrade: (token, id, grade) => request(`/super/mentors/${id}/grade`, { method: 'PATCH', token, body: { grade } }),
  superCreateMethodist: (token, body) => request('/super/methodists', { method: 'POST', token, body }),
  superUpdateMethodist: (token, id, body) => request(`/super/methodists/${id}`, { method: 'PATCH', token, body }),
  superFreezeMethodist: (token, id) => request(`/super/methodists/${id}/freeze`, { method: 'PATCH', token, body: { frozen: true } }),
  superUnfreezeMethodist: (token, id) => request(`/super/methodists/${id}/freeze`, { method: 'PATCH', token, body: { frozen: false } }),
   superResetMethodistPassword: (token, id) => request(`/super/methodists/${id}/reset-password`, { method: 'POST', token }),

// -------- SUPER ADMIN: Branch Managers --------
  superBranchManagers: (token) => request('/super/branch-managers', { token }),
  superCreateBranchManager: (token, body) => request('/super/branch-managers', { method: 'POST', token, body }),
  superUpdateBranchManager: (token, id, body) => request(`/super/branch-managers/${id}`, { method: 'PATCH', token, body }),
  superFreezeBranchManager: (token, id) => request(`/super/branch-managers/${id}/freeze`, { method: 'PATCH', token, body: { frozen: true } }),
  superUnfreezeBranchManager: (token, id) => request(`/super/branch-managers/${id}/freeze`, { method: 'PATCH', token, body: { frozen: false } }),
  superResetBranchManagerPassword: (token, id) => request(`/super/branch-managers/${id}/reset-password`, { method: 'POST', token }),
  superDeleteBranchManager: (token, id) => request(`/super/branch-managers/${id}`, { method: 'DELETE', token }),

   // -------- BRANCH MANAGER --------
   branchManagerDashboard: (token) => request('/branch-manager/dashboard', { token }),
   branchManagerInfo: (token) => request('/branch-manager/branch', { token }),
   branchManagerIncome: (token, month) => request(`/branch-manager/income?month=${month}`, { token }),
   branchManagerExpenses: (token, month) => request(`/branch-manager/expenses?month=${month}`, { token }),
   branchManagerReports: (token, months = 6) => request(`/branch-manager/reports?months=${months}`, { token }),
   branchManagerTelegramStatus: (token) => request('/branch-manager/telegram/status', { token }),
   branchManagerTelegramBindToken: (token) => request('/branch-manager/telegram/bind-token', { method: 'POST', token }),
   branchManagerTelegramUnlink: (token) => request('/branch-manager/telegram/unlink', { method: 'DELETE', token }),

  // -------- SUPER ADMIN: Students --------
  superStudents: (token, qs = '') => request(`/super/students${qs}`, { token }),
  superStudentsStats: (token, period = '30d', branchId = '') =>
    request(`/super/students/stats?period=${period}${branchId ? `&branchId=${branchId}` : ''}`, { token }),
  superStudentDetail: (token, id) => request(`/super/students/${id}`, { token }),
  superDeleteStudent: (token, id) => request(`/super/students/${id}`, { method: 'DELETE', token }),

  // -------- SUPER ADMIN: Groups --------
  superGroups: (token) => request('/super/groups', { token }),
  superGroupDetail: (token, id) => request(`/super/groups/${id}`, { token }),
  superArchiveGroup: (token, id) => request(`/super/groups/${id}/archive`, { method: 'POST', token }),
  superUnarchiveGroup: (token, id) => request(`/super/groups/${id}/unarchive`, { method: 'POST', token }),
  superDeleteGroup: (token, id) => request(`/super/groups/${id}`, { method: 'DELETE', token }),

  // -------- SUPER ADMIN: Audit --------
  superAudit: (token) => request('/super/audit', { token }),

  // -------- SUPER ADMIN: Announcements --------
  superAnnouncements: (token) => request('/super/announcements', { token }),
  superCreateAnnouncement: (token, body) => request('/super/announcements', { method: 'POST', token, body }),
  superImproveAnnouncement: (token, body) => request('/super/announcements/improve', { method: 'POST', token, body }),
  superAnnouncementImageUploadUrl: (token, filename, contentType) => request(`/super/announcements/image-upload-url?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`, { token }),
  superDeleteAnnouncement: (token, id) => request(`/super/announcements/${id}`, { method: 'DELETE', token }),
  superUpdateMentorBranch: (token, id, branchId) => request(`/super/mentors/${id}/branch`, { method: 'PATCH', token, body: { branchId } }),
  branchAnnouncements: (token) => request('/admin/announcements', { token }),
  branchCreateAnnouncement: (token, body) => request('/admin/announcements', { method: 'POST', token, body }),
  branchImproveAnnouncement: (token, body) => request('/admin/announcements/improve', { method: 'POST', token, body }),
  branchAnnouncementImageUploadUrl: (token, filename, contentType) => request(`/admin/announcements/image-upload-url?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`, { token }),

  // -------- SUPER ADMIN: анонсы от LevelUp Academy (Main Admin), read-only --------
  superPlatformAnnouncements: (token) => request('/super/platform-announcements', { token }),

  // -------- SUPER ADMIN: каталог платных фич + свои заявки на подключение/отключение --------
  superFeatureCatalog: (token) => request('/super/features/catalog', { token }),
  superFeatureRequests: (token) => request('/super/features/requests', { token }),
  superCreateFeatureRequest: (token, body) => request('/super/features/requests', { method: 'POST', token, body }),

  // -------- SUPER ADMIN: свой биллинг (read-only) --------
  superBilling: (token) => request('/super/billing', { token }),
  superBillingLedger: (token) => request('/super/billing/ledger', { token }),

  // -------- SUPER ADMIN: Reminders --------
  superReminders: (token) => request('/super/reminders', { token }),
  superDeleteReminder: (token, id) => request(`/super/reminders/${id}`, { method: 'DELETE', token }),
  superResendReminder: (token, id) => request(`/super/reminders/${id}/resend`, { method: 'POST', token }),

  // -------- SUPER ADMIN: Attendance --------
  superAttendance: (token, qs = '') => request(`/super/attendance${qs}`, { token }),

  // -------- SUPER ADMIN: Discipline (штрафы и увольнения сотрудников) --------
  // Раньше эти данные показывались в панели Main Admin — платформе незачем знать,
  // кого из сотрудников партнёра наказали. Дисциплина принадлежит организации.
  superPenalties: (token, qs = '') => request(`/super/penalties${qs}`, { token }),
  superIssuePenalty: (token, body) => request('/super/penalties', { method: 'POST', token, body }),
  superReactivateStaff: (token, id) => request(`/super/staff/${id}/reactivate`, { method: 'POST', token }),
  // Каталог правил (qoyda): нарушение -> уровень (sariq/qizil/shtraf/qora).
  // Справочник, не автоматика — накопление уровней ничего не выдаёт само.
  // Заменил свободный текстовый устав 2026-07-28.
  superDisciplineRules: (token) => request('/super/discipline-rules', { token }),
  superCreateDisciplineRule: (token, body) => request('/super/discipline-rules', { method: 'POST', token, body }),
  superDeleteDisciplineRule: (token, id) => request(`/super/discipline-rules/${id}`, { method: 'DELETE', token }),

  // -------- K-DISC-FRONT: own discipline (mentor/methodist self-view) --------
  myPenalties: (token) => request('/users/me/penalties', { token }),
  myDisciplineRules: (token) => request('/users/me/discipline-rules', { token }),

  // -------- METHODIST CONTENT --------
  methodistTrainingTypes: (token) => request('/methodist/training-types', { token }),
  methodistCreateTrainingType: (token, body) => request('/methodist/training-types', { method: 'POST', token, body }),
  methodistUpdateTrainingType: (token, id, body) => request(`/methodist/training-types/${id}`, { method: 'PATCH', token, body }),
  methodistArchiveTrainingType: (token, id) => request(`/methodist/training-types/${id}/archive`, { method: 'POST', token }),

  methodistTopics: (token, trainingTypeId) => request(`/methodist/training-types/${trainingTypeId}/topics`, { token }),
  methodistCreateTopic: (token, body) => request('/methodist/topics', { method: 'POST', token, body }),
  methodistUpdateTopic: (token, id, body) => request(`/methodist/topics/${id}`, { method: 'PATCH', token, body }),
  methodistArchiveTopic: (token, id) => request(`/methodist/topics/${id}/archive`, { method: 'POST', token }),

  methodistLessons: (token, topicId) => request(`/methodist/topics/${topicId}/lessons`, { token }),
  methodistCreateLesson: (token, body) => request('/methodist/lessons', { method: 'POST', token, body }),
  methodistGetLesson: (token, id) => request(`/methodist/lessons/${id}`, { token }),
  methodistUpdateLesson: (token, id, body) => request(`/methodist/lessons/${id}`, { method: 'PATCH', token, body }),
  methodistArchiveLesson: (token, id) => request(`/methodist/lessons/${id}/archive`, { method: 'POST', token }),
  methodistCopyLesson: (token, id, targetTopicId) => request(`/methodist/lessons/${id}/copy`, { method: 'POST', token, body: { targetTopicId } }),
  methodistLessonUploadUrl: (token, id, filename, contentType) =>
    request(`/methodist/lessons/${id}/upload-url?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`, { token }),

  // Видео темы файлом (альтернатива videoUrl-ссылке) — стоимость хранения
  // на Storj считается на бэке и намеренно НЕ приходит в этих ответах.
  methodistTopicVideoUploadUrl: (token, topicId, filename, contentType) =>
    request(`/methodist/topics/${topicId}/video/upload-url?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`, { token }),
  methodistConfirmTopicVideo: (token, topicId, body) =>
    request(`/methodist/topics/${topicId}/video`, { method: 'POST', token, body }),
  methodistClearTopicVideoFile: (token, topicId) =>
    request(`/methodist/topics/${topicId}/video`, { method: 'DELETE', token }),

  methodistQuestions: (token, lessonId) => request(`/methodist/lessons/${lessonId}/questions`, { token }),
  methodistCreateQuestion: (token, body) => request('/methodist/questions', { method: 'POST', token, body }),
  methodistCreateQuestionsBatch: (token, questions) => request('/methodist/questions/batch', { method: 'POST', token, body: { questions } }),
  methodistUpdateQuestion: (token, id, body) => request(`/methodist/questions/${id}`, { method: 'PATCH', token, body }),
  methodistDeleteQuestion: (token, id) => request(`/methodist/questions/${id}`, { method: 'DELETE', token }),

  methodistRequirements: (token, lessonId) => request(`/methodist/lessons/${lessonId}/requirements`, { token }),
  methodistCreateRequirement: (token, body) => request('/methodist/requirements', { method: 'POST', token, body }),
  methodistUpdateRequirement: (token, id, body) => request(`/methodist/requirements/${id}`, { method: 'PATCH', token, body }),
  methodistDeleteRequirement: (token, id) => request(`/methodist/requirements/${id}`, { method: 'DELETE', token }),

  // -------- METHODIST ANALYTICS --------
  methodistDifficulty: (token) => request('/methodist/difficulty', { token }),
  methodistGroups: (token) => request('/methodist/groups', { token }),
  methodistStudents: (token) => request('/methodist/students', { token }),
  // -------- MAIN ADMIN --------
  mainDashboard: (token) => request('/main/dashboard', { token }),
  mainPartners: (token) => request('/main/partners', { token }),
  mainSetPartnerStatus: (token, id, status) =>
    request(`/main/partners/${id}/status`, { method: 'PATCH', token, body: { status } }),
  mainOnboardPartner: (token, body) =>
    request('/main/partners', { method: 'POST', token, body }),
  mainLeads: (token) => request('/main/leads', { token }),
  mainUpdateLead: (token, id, body) =>
    request(`/main/leads/${id}`, { method: 'PATCH', token, body }),
  mainGetPricing: (token) => request('/main/pricing', { token }),
  mainUpdatePricing: (token, body) => request('/main/pricing', { method: 'PUT', token, body }),
};

/** PUT файла напрямую в S3/MinIO по presigned URL (в mock-режиме URL 'mock://skip' — пропускаем). */
export async function uploadToPresignedUrl(uploadUrl, file) {
  if (uploadUrl.startsWith('mock://')) return;
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!res.ok) throw new Error(`Не удалось загрузить файл (HTTP ${res.status})`);
}
