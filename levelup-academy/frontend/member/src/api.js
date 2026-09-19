const API_BASE = typeof import.meta !== 'undefined' ? import.meta.env.VITE_API_URL || '' : '';
// По умолчанию — РЕАЛЬНЫЙ бэкенд (dev-прокси Vite → Render), моки только по
// явному VITE_USE_MOCKS=true. Раньше здесь было наоборот («моки, если не
// задано false»), а student/api.js уже перешёл на «реальный по умолчанию» —
// из-за рассинхрона логин шёл через мок (выдавал фейковый accessToken), а
// первый же запрос кабинета студента бил в настоящий бэкенд с этим фейком и
// получал «Invalid or expired token» (2026-08-30, Abduloh).
const USE_MOCKS =
  typeof import.meta !== 'undefined' ? import.meta.env.VITE_USE_MOCKS === 'true' : false;

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

// -------- MOCK DATA --------
const MOCK_CHILDREN = [
  {
    id: 'mock-child-001',
    firstName: 'Диёр',
    lastName: 'Собиров',
    avatarKey: null,
    branchId: 'mock-branch-001',
    coins: 350,
    totalDebt: '150000.00',
    frozen: false,
  },
];

const MOCK_OVERVIEW = {
  child: { id: 'mock-child-001', firstName: 'Диёр', lastName: 'Собиров', avatarKey: null, frozen: false },
  coins: 350,
  totalDebt: '150000.00',
  currentInvoice: { totalAmount: 200000, paidAmount: 50000 },
  rank: { rank: 3, coins: 350 },
  groups: [
    { id: 'g1', name: 'A1', subject: 'Английский язык', mentorName: 'Акбар Каримов', studentCount: 12 },
  ],
  attendance: {
    windowDays: 30,
    summary: { present: 18, absent: 2, late: 1, excused: 1, total: 22 },
    recent: [
      { lessonDate: '2026-07-14', status: 'present', comment: null, groupName: 'A1' },
      { lessonDate: '2026-07-13', status: 'late', comment: 'Опоздал на 10 минут', groupName: 'A1' },
      { lessonDate: '2026-07-12', status: 'present', comment: null, groupName: 'A1' },
      { lessonDate: '2026-07-11', status: 'absent', comment: 'Без уважительной причины', groupName: 'A1' },
      { lessonDate: '2026-07-10', status: 'present', comment: null, groupName: 'A1' },
      { lessonDate: '2026-07-09', status: 'excused', comment: 'Болел', groupName: 'A1' },
      { lessonDate: '2026-07-08', status: 'present', comment: null, groupName: 'A1' },
    ],
  },
  grades: {
    homework: [
      { id: 'hw-001', title: 'Упражнения на тему "Present Simple"', score: 88, maxScore: 100, gradedAt: '2026-07-14T10:00:00.000Z', groupName: 'A1', description: 'Выполнить упражнения на Present Simple (стр. 45, №№ 12-18). Показать все решения с проверкой.' },
      { id: 'hw-002', title: 'Домашнее задание #4', score: 92, maxScore: 100, gradedAt: '2026-07-10T10:00:00.000Z', groupName: 'A1', description: 'Решить задачи на квадратные уравнения (стр. 38, №№ 5-10). Составить уравнения по условию задачи.' },
      { id: 'hw-003', title: 'Практическая работа #3', score: 75, maxScore: 100, gradedAt: '2026-07-06T10:00:00.000Z', groupName: 'A1', description: 'Написать эссе на тему "Мой будущий профессия" (200-250 слов). Использовать Conditional Second Type минимум 3 раза.' },
      { id: 'hw-004', title: 'Лабораторная работа #2', score: 95, maxScore: 100, gradedAt: '2026-07-02T10:00:00.000Z', groupName: 'A1', description: 'Написать программу на Python: сортировка массива методом пузырька. Добавить комментарии к каждому шагу.' },
    ],
    tests: [
      { id: 'test-001', title: 'Тест по английскому (Beginner)', score: 90, maxScore: 10, finishedAt: '2026-07-13T14:00:00.000Z', groupName: 'A1', durationMin: 30,
        questions: [
          { q: '"Achieve" means:', options: ['To reach a goal', 'To give up', 'To sleep', 'To eat'], correct: 0, studentAnswer: 0 },
          { q: 'Choose the correct form: "She ___ to school every day."', options: ['goes', 'go', 'going', 'gone'], correct: 0, studentAnswer: 0 },
          { q: '"Diligent" is closest in meaning to:', options: ['Hard-working', 'Lazy', 'Angry', 'Happy'], correct: 0, studentAnswer: 0 },
          { q: '"I wish I ___ a bird."', options: ['were', 'was', 'am', 'be'], correct: 0, studentAnswer: 0 },
          { q: 'Plural of "child":', options: ['children', 'childs', 'childes', 'childern'], correct: 0, studentAnswer: 0 },
          { q: '"Despite the rain, we ___ went out."', options: ['still', 'already', 'yet', 'ever'], correct: 0, studentAnswer: 1 },
          { q: '"She has been studying ___ 3 hours."', options: ['for', 'since', 'from', 'during'], correct: 0, studentAnswer: 0 },
          { q: '"If I ___ rich, I would travel the world."', options: ['were', 'am', 'will be', 'be'], correct: 0, studentAnswer: 0 },
          { q: '"The book is ___ the table."', options: ['on', 'in', 'at', 'by'], correct: 0, studentAnswer: 0 },
          { q: '"He asked me where ___."', options: ['I lived', 'did I live', 'I live', 'do I live'], correct: 0, studentAnswer: 0 },
        ]},
      { id: 'test-002', title: 'Тест по математике (Квадратные уравнения)', score: 70, maxScore: 10, finishedAt: '2026-07-08T14:00:00.000Z', groupName: 'A1', durationMin: 25,
        questions: [
          { q: 'Решите: x² - 5x + 6 = 0', options: ['x=2, x=3', 'x=1, x=6', 'x=-2, x=-3', 'x=0, x=5'], correct: 0, studentAnswer: 0 },
          { q: 'Дискриминант уравнения 2x² + 3x - 5 = 0 равен:', options: ['49', '25', '1', '9'], correct: 0, studentAnswer: 0 },
          { q: 'Какое число является корнем x² = 16?', options: ['4', '-4', '±4', '8'], correct: 2, studentAnswer: 0 },
          { q: 'Сумма корней уравнения x² - 7x + 12 = 0 равна:', options: ['7', '12', '-7', '19'], correct: 0, studentAnswer: 0 },
          { q: 'Произведение корней уравнения x² - 5x + 6 = 0:', options: ['5', '6', '11', '-6'], correct: 1, studentAnswer: 0 },
          { q: 'Решите: x² + 2x - 8 = 0', options: ['x=2, x=-4', 'x=-2, x=4', 'x=1, x=-8', 'x=8, x=-1'], correct: 0, studentAnswer: 0 },
          { q: 'При каком значении k уравнение x² + kx + 9 = 0 имеет один корень?', options: ['k=6', 'k=-6', 'k=±6', 'k=9'], correct: 2, studentAnswer: 1 },
          { q: 'Решите неравенство: x² - 4 > 0', options: ['x > 2', 'x < -2 или x > 2', '-2 < x < 2', 'x ≠ ±2'], correct: 1, studentAnswer: 1 },
          { q: 'Корни уравнения 3x² - 12x + 9 = 0:', options: ['x=1, x=3', 'x=2, x=6', 'x=3, x=9', 'x=0, x=4'], correct: 0, studentAnswer: 0 },
          { q: 'Дискриминант: x² - 6x + 9 = 0', options: ['0', '36', '9', '12'], correct: 0, studentAnswer: 0 },
        ]},
      { id: 'test-003', title: 'Тест по основам программирования', score: 90, maxScore: 10, finishedAt: '2026-07-05T14:00:00.000Z', groupName: 'A1', durationMin: 20,
        questions: [
          { q: 'Что такое переменная?', options: ['Именованная область памяти', 'Тип данных', 'Функция', 'Цикл'], correct: 0, studentAnswer: 0 },
          { q: 'Какой оператор используется для условий?', options: ['if', 'for', 'while', 'return'], correct: 0, studentAnswer: 0 },
          { q: 'Что делает функция print()?', options: ['Выводит данные', 'Считывает данные', 'Удаляет данные', 'Копирует данные'], correct: 0, studentAnswer: 0 },
          { q: 'Какой тип данных у числа 3.14?', options: ['float', 'int', 'str', 'bool'], correct: 0, studentAnswer: 0 },
          { q: 'Что такое цикл?', options: ['Повторение действий', 'Условие', 'Функция', 'Переменная'], correct: 0, studentAnswer: 0 },
          { q: 'Какой оператор сравнения означает "не равно"?', options: ['!=', '==', '>=', '<='], correct: 0, studentAnswer: 1 },
          { q: 'Что такое список (list)?', options: ['Упорядоченная коллекция', 'Число', 'Строка', 'Логическое значение'], correct: 0, studentAnswer: 0 },
          { q: 'Какой метод добавляет элемент в список?', options: ['append()', 'remove()', 'pop()', 'clear()'], correct: 0, studentAnswer: 0 },
          { q: 'Что такое индекс?', options: ['Номер элемента', 'Тип данных', 'Функция', 'Переменная'], correct: 0, studentAnswer: 0 },
          { q: 'Какой оператор используется для цикла?', options: ['for', 'if', 'def', 'class'], correct: 0, studentAnswer: 0 },
        ]},
    ],
  },
};

// Guruh reytingi — bitta gruppadagi barcha bolalar
const MOCK_GROUP_RATING = [
  { childId: 'mock-child-001', firstName: 'Диёр', lastName: 'Собиров', coins: 350, avgScore: 88, rank: 1 },
  { childId: 'mock-child-003', firstName: 'Сардор', lastName: 'Каримов', coins: 320, avgScore: 85, rank: 2 },
  { childId: 'mock-child-004', firstName: 'Нилуфар', lastName: 'Рустамова', coins: 290, avgScore: 82, rank: 3 },
  { childId: 'mock-child-005', firstName: 'Жасур', lastName: 'Тўраев', coins: 270, avgScore: 79, rank: 4 },
  { childId: 'mock-child-006', firstName: 'Малика', lastName: 'Холматова', coins: 250, avgScore: 76, rank: 5 },
  { childId: 'mock-child-007', firstName: 'Умид', lastName: 'Жўраев', coins: 230, avgScore: 73, rank: 6 },
  { childId: 'mock-child-008', firstName: 'Зарина', lastName: 'Назарова', coins: 210, avgScore: 70, rank: 7 },
  { childId: 'mock-child-009', firstName: 'Бехзод', lastName: 'Алиев', coins: 190, avgScore: 67, rank: 8 },
  { childId: 'mock-child-010', firstName: 'Гулнора', lastName: 'Маматова', coins: 170, avgScore: 64, rank: 9 },
  { childId: 'mock-child-011', firstName: 'Даврон', lastName: 'Исмоилов', coins: 150, avgScore: 61, rank: 10 },
  { childId: 'mock-child-012', firstName: 'Ойбек', lastName: 'Сатторов', coins: 130, avgScore: 58, rank: 11 },
  { childId: 'mock-child-013', firstName: 'Лола', lastName: 'Эргашева', coins: 110, avgScore: 55, rank: 12 },
];

const MOCK_CHAT_MESSAGES = {
  global: [
    {
      id: 'msg-001',
      chat_type: 'global',
      room_key: 'global',
      sender_id: 'mock-admin-001',
      body: 'Уважаемые родители! С 20 июля начинаются летние интенсивы по английскому языку. Запись уже открыта!',
      attachment_key: null,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      sender_first_name: 'Нурбек',
      sender_last_name: 'Алиев',
      sender_role: 'admin',
    },
    {
      id: 'msg-002',
      chat_type: 'global',
      room_key: 'global',
      sender_id: 'mock-mentor-001',
      body: 'Добрый день! Напоминаю, что завтра контрольная работа по английскому языку. Пусть дети повторят тему "Present Simple".',
      attachment_key: null,
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      sender_first_name: 'Акбар',
      sender_last_name: 'Каримов',
      sender_role: 'mentor',
    },
    {
      id: 'msg-003',
      chat_type: 'global',
      room_key: 'global',
      sender_id: 'mock-parent-id-001',
      body: 'Спасибо за информацию! Диёр уже готовится.',
      attachment_key: null,
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      sender_first_name: 'Нодира',
      sender_last_name: 'Собирова',
      sender_role: 'parent',
    },
  ],
  direct: [
    {
      id: 'msg-010',
      chat_type: 'direct',
      room_key: 'dm:mock-mentor-001:mock-parent-id-001',
      sender_id: 'mock-mentor-001',
      body: 'Здравствуйте, Нодира! Хотел сообщить, что Диёр очень хорошо себя ведёт на занятиях. Последние две недели заметен прогресс в английском языке.',
      attachment_key: null,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      sender_first_name: 'Акбар',
      sender_last_name: 'Каримов',
      sender_role: 'mentor',
    },
    {
      id: 'msg-011',
      chat_type: 'direct',
      room_key: 'dm:mock-mentor-001:mock-parent-id-001',
      sender_id: 'mock-parent-id-001',
      body: 'Большое спасибо за обратную связь! Очень приятно слышать. Он действительно старается.',
      attachment_key: null,
      created_at: new Date(Date.now() - 86400000 + 600000).toISOString(),
      sender_first_name: 'Нодира',
      sender_last_name: 'Собирова',
      sender_role: 'parent',
    },
    {
      id: 'msg-012',
      chat_type: 'direct',
      room_key: 'dm:mock-mentor-001:mock-parent-id-001',
      sender_id: 'mock-mentor-001',
      body: 'Кстати, на следующей неделе будет олимпиада по английскому языку. Может, Диёр хочет поучаствовать? Он точно способен занять призовое место.',
      attachment_key: null,
      created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      sender_first_name: 'Акбар',
      sender_last_name: 'Каримов',
      sender_role: 'mentor',
    },
  ],
};

let mockMsgCounter = 100;

// FE-PARENT-PAGINATION: более длинные списки, чтобы в моке было что листать
// (overview.recent/homework/tests короткие — там нужен только виджет обзора)
const ATTENDANCE_GROUPS = ['A1'];
const ATTENDANCE_STATUSES = ['present', 'present', 'present', 'late', 'absent', 'excused'];
const MOCK_ATTENDANCE_HISTORY = Array.from({ length: 45 }, (_, i) => ({
  lessonDate: new Date(Date.now() - 86400000 * i).toISOString().slice(0, 10),
  status: ATTENDANCE_STATUSES[i % ATTENDANCE_STATUSES.length],
  comment: null,
  groupName: ATTENDANCE_GROUPS[i % ATTENDANCE_GROUPS.length],
}));

const NOTIF_TEMPLATES = [
  { type: 'grade', title: 'Новая оценка', body: 'Диёр получил новую оценку' },
  { type: 'attendance', title: 'Опоздание', body: 'Диёр опоздал на занятие' },
  { type: 'payment', title: 'Напоминание об оплате', body: 'Срок оплаты приближается' },
];
const MOCK_NOTIFICATIONS = Array.from({ length: 12 }, (_, i) => ({
  id: `n${i + 1}`,
  ...NOTIF_TEMPLATES[i % NOTIF_TEMPLATES.length],
  createdAt: new Date(Date.now() - 3600000 * 6 * i).toISOString(),
  read: i > 1,
}));

/** page/limit из query-строки мок-пути, с теми же дефолтами, что и на бэке (page=1, limit=20). */
function mockPageParams(path) {
  const url = new URL(path, 'http://mock');
  return {
    page: Number(url.searchParams.get('page')) || 1,
    limit: Number(url.searchParams.get('limit')) || 20,
  };
}

// -------- MOCK REQUEST HANDLER --------
async function mockRequest(path, { method = 'GET', body } = {}) {
  await delay();

  // AUTH
  if (path === '/auth/member/login') {
    const { login, password } = body;
    const MOCK_MEMBERS = [
      { code: 'demostud', password: '123456', role: 'student', firstName: 'Диёр', lastName: 'Собиров' },
      { code: 'demopare', password: '654321', role: 'parent', firstName: 'Нодира', lastName: 'Собирова' },
    ];
    const account = MOCK_MEMBERS.find(
      (m) => m.code === String(login).trim().toLowerCase() && m.password === password
    );
    if (!account) {
      const err = new Error('Неверный логин-код или пароль');
      err.status = 401;
      throw err;
    }
    const user = {
      id: `mock-${account.role}-id-001`,
      firstName: account.firstName,
      lastName: account.lastName,
      role: account.role,
      loginCode: account.code,
    };
    localStorage.setItem('mock_member_token', `mock-jwt-${account.role}-xyz`);
    localStorage.setItem('mock_member_user', JSON.stringify(user));
    return { user, accessToken: `mock-jwt-${account.role}-xyz` };
  }

  if (path === '/auth/member/refresh') {
    const mockToken = localStorage.getItem('mock_member_token');
    const mockUser = JSON.parse(localStorage.getItem('mock_member_user') || 'null');
    if (mockToken && mockUser) return { user: mockUser, accessToken: mockToken };
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }

  if (path === '/auth/member/logout') {
    localStorage.removeItem('mock_member_token');
    localStorage.removeItem('mock_member_user');
    return { success: true };
  }

  // PARENT
  if (path === '/parent/children') return { data: MOCK_CHILDREN };


  if (path === '/parent/children/mock-child-001/overview') {
    return { data: MOCK_OVERVIEW };
  }

  // GROUP RATING — bitta guruhdagi barcha bolalar reytingi
  if (/^\/parent\/children\/[^/]+\/group-rating/.test(path)) {
    return { data: { groupId: 'g1', groupName: 'A1', students: MOCK_GROUP_RATING } };
  }

  // HOMEWORK DETAIL
  if (path.startsWith('/parent/homework/')) {
    const hwId = path.split('/').pop();
    const hw = MOCK_OVERVIEW.grades.homework.find((h) => h.id === hwId);
    if (!hw) { const e = new Error('Not found'); e.status = 404; throw e; }
    const mistakes = hw.score < hw.maxScore ? [
      { question: 'Задание 3', studentAnswer: 'Неправильная формулировка ответа', correctAnswer: 'Требуется пересмотреть решение', comment: 'Проверь знаки при подстановке' },
    ] : [];
    return { data: { ...hw, mistakes, comment: hw.score >= 90 ? 'Отличная работа!' : hw.score >= 75 ? 'Хорошо, но есть замечания' : 'Нужно повторить материал' } };
  }

  // TEST DETAIL
  if (path.startsWith('/parent/tests/')) {
    const testId = path.split('/').pop();
    const test = MOCK_OVERVIEW.grades.tests.find((t) => t.id === testId);
    if (!test) { const e = new Error('Not found'); e.status = 404; throw e; }
    const wrongAnswers = test.questions.filter((q) => q.studentAnswer !== q.correct).map((q, i) => ({
      question: q.q,
      studentAnswer: q.options[q.studentAnswer],
      correctAnswer: q.options[q.correct],
      isCorrect: false,
    }));
    const correctAnswers = test.questions.filter((q) => q.studentAnswer === q.correct).map((q) => ({
      question: q.q,
      studentAnswer: q.options[q.studentAnswer],
      correctAnswer: q.options[q.correct],
      isCorrect: true,
    }));
    return { data: { ...test, wrongAnswers, correctAnswers, totalQuestions: test.questions.length, correctCount: correctAnswers.length, wrongCount: wrongAnswers.length } };
  }

  // CHAT — match both encoded and non-encoded
  if (path === '/chat/global/messages' || path === '/chat/global%2Fmessages') {
    return { data: { messages: MOCK_CHAT_MESSAGES.global, nextCursor: null } };
  }

  if (path.startsWith('/chat/dm%3Amock-mentor-001') || (path.startsWith('/chat/dm:mock-mentor-001') && path.endsWith('/messages'))) {
    return { data: { messages: MOCK_CHAT_MESSAGES.direct, nextCursor: null } };
  }

  // AB-VERIFY: список диалогов родителя со staff (my-threads)
  if (path === '/chat/my-threads') {
    const last = MOCK_CHAT_MESSAGES.direct[MOCK_CHAT_MESSAGES.direct.length - 1];
    return {
      data: [
        {
          id: 'mock-mentor-001',
          first_name: 'Акбар',
          last_name: 'Каримов',
          avatar_key: null,
          staff_role: 'mentor',
          room_key: 'dm:mock-mentor-001:mock-parent-id-001',
          last_message: last?.body ?? null,
          last_message_at: last?.created_at ?? null,
          unread_count: 0,
        },
      ],
    };
  }

  // TG-FRONT
  if (path === '/telegram/bind-token') {
    return { data: { token: 'mock-bind-token', expiresIn: 300, deepLink: 'https://t.me/levelup_academy_bot?start=mock-bind-token' } };
  }
  if (path === '/telegram/status') {
    return { data: { configured: true, linked: false, username: null, firstName: null, linkedAt: null } };
  }
  if (path === '/telegram/unlink') {
    return { data: { unlinked: true } };
  }

  // NOTIFICATIONS — FE-PARENT-PAGINATION: курсор `before` через query-string
  if (path.startsWith('/parent/notifications')) {
    const before = new URL(path, 'http://mock').searchParams.get('before');
    const all = MOCK_NOTIFICATIONS.filter((n) => !before || new Date(n.createdAt) < new Date(before));
    const PAGE = 3;
    const items = all.slice(0, PAGE);
    const nextCursor = items.length === PAGE && all.length > PAGE ? items[items.length - 1].createdAt : null;
    return { data: { items, nextCursor } };
  }

  // ATTENDANCE (paginated) — FE-PARENT-PAGINATION
  if (/^\/parent\/children\/[^/]+\/attendance/.test(path)) {
    const { page, limit } = mockPageParams(path);
    const start = (page - 1) * limit;
    const items = MOCK_ATTENDANCE_HISTORY.slice(start, start + limit);
    return { data: { items, total: MOCK_ATTENDANCE_HISTORY.length, page, pageCount: Math.max(1, Math.ceil(MOCK_ATTENDANCE_HISTORY.length / limit)) } };
  }

  // GRADES (paginated) — FE-PARENT-PAGINATION
  if (/^\/parent\/children\/[^/]+\/grades/.test(path)) {
    const url = new URL(path, 'http://mock');
    const type = url.searchParams.get('type') || 'homework';
    const { page, limit } = mockPageParams(path);
    const source = type === 'tests' ? MOCK_OVERVIEW.grades.tests : MOCK_OVERVIEW.grades.homework;
    const start = (page - 1) * limit;
    const items = source.slice(start, start + limit);
    return { data: { items, total: source.length, page, pageCount: Math.max(1, Math.ceil(source.length / limit)) } };
  }

  const err = new Error('Mock route not implemented: ' + path);
  err.status = 404;
  throw err;
}

// -------- REAL REQUEST --------
async function realRequest(path, { method = 'GET', body, token } = {}) {
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
    throw err;
  }
  return data;
}

// -------- PUBLIC API --------
async function rawRequest(path, opts = {}) {
  return USE_MOCKS ? mockRequest(path, opts) : realRequest(path, opts);
}

// Mock chat send — returns message object
export function mockChatSend(roomKey, body, user) {
  mockMsgCounter++;
  const msg = {
    id: `msg-${mockMsgCounter}`,
    chat_type: roomKey === 'global' ? 'global' : 'direct',
    room_key: roomKey,
    sender_id: user?.id || 'mock-parent-id-001',
    body,
    attachment_key: null,
    created_at: new Date().toISOString(),
    sender_first_name: user?.firstName || 'Нодира',
    sender_last_name: user?.lastName || 'Собирова',
    sender_role: 'parent',
  };
  if (roomKey === 'global') {
    MOCK_CHAT_MESSAGES.global.push(msg);
  } else {
    MOCK_CHAT_MESSAGES.direct.push(msg);
  }
  return msg;
}

// Пути, которым нельзя подсовывать авто-refresh (иначе цикл/логин ломается)
const AUTH_PATHS = new Set(['/auth/member/login', '/auth/member/refresh', '/auth/member/logout']);

// Единый refreshPromise — ЛЮБОЙ триггер (bootstrap на старте приложения,
// реактивный 401, проактивный таймер/visibilitychange в auth.jsx, дочерний
// student/api.js) идёт через один и тот же промис, не долбит /refresh
// по отдельности. Без этого два одновременных вызова (например, bootstrap
// в auth.jsx и первый же 401 от компонента, смонтированного раньше, чем
// пришёл ответ bootstrap'а) оба уходят на сервер с ОДНИМ и тем же ещё не
// провёрнутым refresh-токеном — сервер видит это как reuse и отзывает ВСЕ
// токены пользователя разом (backend/src/modules/auth/auth.service.js:refresh,
// reuse-detection), роняя сессию целиком без единой реальной причины.
let refreshPromise = null;
let onTokenRefreshed = null;
export function setOnTokenRefreshed(cb) { onTokenRefreshed = cb; }

export function refreshOnce() {
  if (!refreshPromise) {
    refreshPromise = rawRequest('/auth/member/refresh', { method: 'POST' })
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
  loginMember: (login, password) =>
    request('/auth/member/login', { method: 'POST', body: { login, password } }),
  qrLogin: (token) => request('/auth/member/qr-login', { method: 'POST', body: { token } }),
  refresh: () => refreshOnce(),
  logout: () => request('/auth/member/logout', { method: 'POST' }),

  // Вход через Telegram: сработает только у тех, кто уже привязал бота в кабинете.
  telegramLoginStart: () => request('/telegram/login/start', { method: 'POST' }),
  telegramLoginPoll: (nonce) =>
    request(`/telegram/login/poll?nonce=${encodeURIComponent(nonce)}`),

  parentChildren: (token) => request('/parent/children', { token }),
  parentOverview: (token, childId) => request(`/parent/children/${childId}/overview`, { token }),
  parentGroupRating: (token, childId) => request(`/parent/children/${childId}/group-rating`, { token }),
  parentHomeworkDetail: (token, homeworkId) => request(`/parent/homework/${homeworkId}`, { token }),
  parentTestDetail: (token, testId) => request(`/parent/tests/${testId}`, { token }),

  // FE-PARENT-PAGINATION
  parentAttendance: (token, childId, page = 1, limit = 20) =>
    request(`/parent/children/${childId}/attendance?page=${page}&limit=${limit}`, { token }),
  parentGrades: (token, childId, type = 'homework', page = 1, limit = 20) =>
    request(`/parent/children/${childId}/grades?type=${type}&page=${page}&limit=${limit}`, { token }),

  chatMessages: (token, roomKey) =>
    request(`/chat/${encodeURIComponent(roomKey)}/messages`, { token }),
  chatThreads: (token) => request('/chat/my-threads', { token }),
  chatMarkRead: (token, roomKey) =>
    request(`/chat/${encodeURIComponent(roomKey)}/read`, { method: 'POST', token }),

  // TG-FRONT
  telegramBindToken: (token) => request('/telegram/bind-token', { method: 'POST', token }),
  telegramStatus: (token) => request('/telegram/status', { token }),
  telegramUnlink: (token) => request('/telegram/unlink', { method: 'DELETE', token }),

  notifications: (token, before) =>
    request(`/parent/notifications${before ? `?before=${encodeURIComponent(before)}` : ''}`, { token }),
};
