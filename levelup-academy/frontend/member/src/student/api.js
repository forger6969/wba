// Все запросы идут на /api (dev-прокси Vite → боевой бэкенд по конвенции
// проекта, см. root member/api.js: по умолчанию — РЕАЛЬНЫЙ бэкенд).
// VITE_API_URL — боевой бэкенд (Render) для production build.
// USE_MOCKS — демо-данные в памяти, ТОЛЬКО по явному VITE_USE_MOCKS=true.
// Раньше здесь было «моки по умолчанию» — из-за этого в рейтинге и других
// страницах кабинета показывались выдуманные имена (Алишер) вместо реальных,
// хотя вход уже шёл через настоящий бэкенд. Теперь по конвенции как у root.

import { refreshOnce } from '../api.js';

const API_BASE = typeof import.meta !== 'undefined' ? import.meta.env.VITE_API_URL || '' : '';
const USE_MOCKS =
  typeof import.meta !== 'undefined' ? import.meta.env.VITE_USE_MOCKS === 'true' : false;

let accessToken = null;
let onSessionExpired = () => {};
let onPaymentOverdue = () => {};

export function setAccessToken(token) {
  accessToken = token;
}

export function setOnSessionExpired(handler) {
  onSessionExpired = handler;
}

/** 402 от blockIfOverdue: у студента просроченный счёт — панель закрыта до оплаты. */
export function setOnPaymentOverdue(handler) {
  onPaymentOverdue = handler;
}

// ============================================================
//  MOCK LAYER — демо-кабинет студента без бэкенда
// ============================================================
const delay = (ms = 260) => new Promise((r) => setTimeout(r, ms));

const mock = {
  user: {
    // Совпадает с id и ИМЕНЕМ, которые root member/api.js выдаёт для demostud
    // в mock-логине (Диёр Собиров) — иначе useAuth().user (root) и mock.user
    // расходятся, и Leaderboard не подсвечивает свою строку / показывает чужое
    // имя на месте «ты».
    id: 'mock-student-id-001',
    firstName: 'Диёр',
    lastName: 'Собиров',
    role: 'student',
    branchId: 'branch-001',
  },
  coins: 420,
  totalDebt: 350000,
  groups: [
    { id: 'g1', name: 'Frontend React', subject: 'Веб-разработка', mentorName: 'Ильхом Кадыров' },
    { id: 'g2', name: 'Python BootCamp', subject: 'Программирование', mentorName: 'Джасур Усманов' },
  ],
  homework: [
    {
      id: 'hw1', group_id: 'g1', title: 'Свёрстать карточку товара', description: 'Flexbox + адаптив, приложи ссылку на CodeSandbox.',
      max_score: 100, coin_reward: 20, deadline: new Date(Date.now() + 2 * 864e5).toISOString(),
      created_at: new Date(Date.now() - 3 * 864e5).toISOString(), submission_status: null, score: null, text_answer: null,
    },
    {
      id: 'hw2', group_id: 'g2', title: 'Функция FizzBuzz', description: 'Классика на циклы и условия.',
      max_score: 100, coin_reward: 15, deadline: new Date(Date.now() + 5 * 864e5).toISOString(),
      created_at: new Date(Date.now() - 1 * 864e5).toISOString(), submission_status: 'submitted', score: null, text_answer: 'готово',
    },
    {
      id: 'hw3', group_id: 'g1', title: 'Промисы и async/await', description: 'Три задачи на асинхронность.',
      max_score: 100, coin_reward: 25, deadline: new Date(Date.now() - 1 * 864e5).toISOString(),
      created_at: new Date(Date.now() - 6 * 864e5).toISOString(), submission_status: 'graded', score: 92, text_answer: 'решено',
    },
  ],
  tests: [
    {
      id: 't1', group_id: 'g1', title: 'Основы HTML/CSS', duration_min: 10, coin_reward: 30,
      starts_at: null, ends_at: null, created_at: new Date(Date.now() - 2 * 864e5).toISOString(),
      started_at: null, finished_at: null, score: null,
      questions: [
        { q: 'Какой тег задаёт заголовок первого уровня?', options: ['<h1>', '<head>', '<header>', '<title>'], correct: 0 },
        { q: 'Свойство для горизонтального центрирования flex-элементов?', options: ['align-items', 'justify-content', 'text-align', 'float'], correct: 1 },
        { q: 'Единица, зависящая от размера шрифта родителя?', options: ['px', 'vw', 'em', '%'], correct: 2 },
        { q: 'Как сделать элемент невидимым, сохранив место?', options: ['display:none', 'visibility:hidden', 'opacity:1', 'hidden'], correct: 1 },
      ],
    },
    {
      id: 't2', group_id: 'g2', title: 'Python: типы и циклы', duration_min: 15, coin_reward: 25,
      starts_at: null, ends_at: null, created_at: new Date(Date.now() - 4 * 864e5).toISOString(),
      started_at: new Date(Date.now() - 3 * 864e5).toISOString(), finished_at: new Date(Date.now() - 3 * 864e5).toISOString(), score: 80,
      questions: [
        { q: 'Функция вывода в консоль?', options: ['echo', 'print', 'console.log', 'puts'], correct: 1 },
        { q: 'Тип значения "42"?', options: ['int', 'str', 'float', 'bool'], correct: 1 },
      ],
    },
    {
      id: 't3', group_id: 'g1', title: 'JavaScript: массивы (скоро)', duration_min: 12, coin_reward: 20,
      starts_at: new Date(Date.now() + 3 * 864e5).toISOString(), ends_at: null, created_at: new Date().toISOString(),
      started_at: null, finished_at: null, score: null,
      questions: [{ q: 'Заглушка', options: ['a', 'b'], correct: 0 }],
    },
  ],
  videos: [
    { id: 'v1', group_id: 'g1', title: 'Урок 1. Введение во Flexbox', duration_sec: 725, created_at: new Date(Date.now() - 5 * 864e5).toISOString() },
    { id: 'v2', group_id: 'g1', title: 'Урок 2. Grid за 20 минут', duration_sec: 1240, created_at: new Date(Date.now() - 2 * 864e5).toISOString() },
    { id: 'v3', group_id: 'g2', title: 'Python. Списки и словари', duration_sec: 980, created_at: new Date(Date.now() - 1 * 864e5).toISOString() },
  ],
  shopItems: [
    { id: 'i1', name: 'Стикерпак LevelUp', image_key: null, coin_price: 100, stock: 24 },
    { id: 'i2', name: 'Термокружка', image_key: null, coin_price: 350, stock: 8 },
    { id: 'i3', name: 'Футболка academy', image_key: null, coin_price: 500, stock: 5 },
    { id: 'i4', name: 'Наушники', image_key: null, coin_price: 1500, stock: 2 },
  ],
  orders: [
    { id: 'o1', item_id: 'i1', item_name: 'Стикерпак LevelUp', image_key: null, coin_price: 100, created_at: new Date(Date.now() - 7 * 864e5).toISOString() },
  ],
  attempts: {}, // testId -> { endsAt }
  topics: [
    {
      id: 'top1', name: 'Алгебра — уравнения', description: 'Линейные уравнения и их решение', videoUrl: null, hasVideoFile: false, videoDurationSec: null,
      lessons: [
        {
          id: 'lsn1', title: 'Проверь себя: линейные уравнения', type: 'test', description: null, coinReward: 25, videoUrl: null,
          questions: [
            { id: 'q1', question: 'Реши: 2x + 4 = 10. Чему равен x?', options: ['1', '3', '2', '4'], correct: 'B' },
            { id: 'q2', question: 'Реши: x − 5 = 0. Чему равен x?', options: ['0', '−5', '5', '10'], correct: 'C' },
            { id: 'q3', question: 'Реши: 3x = 12. Чему равен x?', options: ['3', '5', '6', '4'], correct: 'D' },
          ],
        },
        {
          id: 'lsn2', title: 'Домашнее задание: 5 уравнений', type: 'practical', description: 'Реши 5 уравнений в тетради и пришли фото решения.', coinReward: 15, videoUrl: null,
        },
      ],
    },
  ],
  lessonAttempts: {}, // lessonId -> { started_at, finished_at, score, answers }
  lessonSubmissions: {}, // lessonId -> { status, score, submitted_at, file_key, text_answer }
};

function mockLeaderboard(period) {
  const base = [
    { studentId: 'x1', firstName: 'Мадина', lastName: 'Юсупова', coins: period === 'week' ? 640 : 2100 },
    { studentId: 'x2', firstName: 'Тимур', lastName: 'Алиев', coins: period === 'week' ? 580 : 1980 },
    // Месячные коины ученика отличаются от недельных — иначе «скорость роста»
    // в демо всегда была бы 100% (420/420). 1000/неделя 420 → темп 0.42 —
    // я ниже лидера, но расту быстрее всех: ровно история «догоню Мадину».
    { studentId: mock.user.id, firstName: mock.user.firstName, lastName: mock.user.lastName, coins: period === 'week' ? mock.coins : 1000 },
    { studentId: 'x3', firstName: 'Нигора', lastName: 'Ким', coins: period === 'week' ? 300 : 1200 },
    { studentId: 'x4', firstName: 'Botir', lastName: 'Хасанов', coins: period === 'week' ? 260 : 990 },
  ]
    .sort((a, b) => b.coins - a.coins)
    .map((r, i) => ({ ...r, rank: i + 1 }));
  const me = base.find((r) => r.studentId === mock.user.id);
  return { period, top: base, me: me ? { rank: me.rank, coins: me.coins } : { rank: null, coins: 0 } };
}

async function mockRequest(path, { method = 'GET', body } = {}) {
  await delay();
  const seg = path.split('?')[0].split('/').filter(Boolean); // ['student','tests','t1']
  const query = Object.fromEntries(new URLSearchParams(path.split('?')[1] || ''));

  // -- session --
  if (path === '/auth/member/refresh') return { user: mock.user, accessToken: 'mock-token' };
  if (path === '/auth/member/logout') return { success: true };

  // TG-FRONT
  if (path === '/telegram/bind-token') {
    return { data: { token: 'mock-bind-token', expiresIn: 300, deepLink: 'https://t.me/levelup_academy_bot?start=mock-bind-token' } };
  }

  // -- /student/... --
  if (seg[0] === 'student') {
    const [, area, id, action] = seg;

    if (area === 'home') {
      const now = Date.now();
      const upcomingHomework = mock.homework
        .filter((h) => new Date(h.deadline).getTime() > now && h.submission_status !== 'graded')
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 5);
      return { data: { coins: mock.coins, totalDebt: mock.totalDebt, rank: mockLeaderboard('week').me, groups: mock.groups, upcomingHomework } };
    }

    if (area === 'tests') {
      if (!id) return { data: mock.tests.map((t) => ({ ...t, questions: t.questions.map(({ q, options }) => ({ q, options })) })) };
      const test = mock.tests.find((t) => t.id === id);
      if (!test) throw mkErr(404, 'Test not found');
      if (!action) return { data: { ...test, questions: test.questions.map(({ q, options }) => ({ q, options })) } };
      if (action === 'start') {
        const endsAt = new Date(Date.now() + test.duration_min * 60_000).toISOString();
        mock.attempts[id] = { endsAt };
        return { data: { startedAt: new Date().toISOString(), durationMin: test.duration_min, endsAt } };
      }
      if (action === 'submit') {
        const answers = body?.answers ?? [];
        const correct = test.questions.reduce((acc, qn, i) => acc + (answers[i] === qn.correct ? 1 : 0), 0);
        const score = Math.round((correct / test.questions.length) * 100);
        test.finished_at = new Date().toISOString();
        test.started_at = test.started_at || new Date().toISOString();
        test.score = score;
        if (score >= 50) mock.coins += test.coin_reward;
        return { data: { score } };
      }
    }

    if (area === 'homework') {
      if (!id) return { data: mock.homework };
      const hw = mock.homework.find((h) => h.id === id);
      if (!hw) throw mkErr(404, 'Homework not found');
      if (action === 'upload-url') return { data: { uploadUrl: 'mock://skip', fileKey: `mock/${query.filename || 'file'}` } };
      if (action === 'submit') {
        if (hw.submission_status === 'graded') throw mkErr(409, 'Already graded');
        hw.submission_status = Date.now() > new Date(hw.deadline).getTime() ? 'late' : 'submitted';
        hw.text_answer = body?.textAnswer ?? hw.text_answer;
        return { data: { status: hw.submission_status } };
      }
    }

    if (area === 'videos') {
      if (!id) return { data: mock.videos };
      if (action === 'stream-url')
        return { data: { streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' } };
    }

    if (area === 'shop') {
      if (id === 'items' && !action) return { data: mock.shopItems.filter((i) => i.stock > 0) };
      if (id === 'items' && action) {
        // /shop/items/:itemId/purchase → seg = ['student','shop','items',itemId,'purchase']
        const itemId = seg[3];
        const item = mock.shopItems.find((i) => i.id === itemId);
        if (!item) throw mkErr(404, 'Item not found');
        if (mock.coins < item.coin_price) throw mkErr(422, 'Not enough coins');
        mock.coins -= item.coin_price;
        item.stock -= 1;
        const order = { id: `o${Date.now()}`, item_id: item.id, item_name: item.name, image_key: item.image_key, coin_price: item.coin_price, created_at: new Date().toISOString() };
        mock.orders.unshift(order);
        return { data: order };
      }
      if (id === 'orders') return { data: mock.orders };
    }

    if (area === 'leaderboard') return { data: mockLeaderboard(query.period || 'week') };

    if (area === 'lessons') {
      const findLesson = (lessonId) => {
        for (const topic of mock.topics) {
          const lesson = topic.lessons.find((l) => l.id === lessonId);
          if (lesson) return { topic, lesson };
        }
        return null;
      };

      if (!id) {
        return {
          data: mock.topics.map((topic) => ({
            id: topic.id,
            name: topic.name,
            description: topic.description,
            videoUrl: topic.videoUrl,
            hasVideoFile: topic.hasVideoFile ?? false,
            videoDurationSec: topic.videoDurationSec ?? null,
            lessons: topic.lessons.map((l) => {
              const attempt = mock.lessonAttempts[l.id];
              const submission = mock.lessonSubmissions[l.id];
              return {
                id: l.id,
                title: l.title,
                type: l.type,
                description: l.description,
                coinReward: l.coinReward,
                videoUrl: l.videoUrl,
                hasAttachment: !!submission?.file_key,
                score: l.type === 'test' && attempt?.finished_at ? attempt.score : null,
                submissionStatus: l.type === 'practical' ? (submission?.status ?? null) : null,
                submissionScore: l.type === 'practical' ? (submission?.score ?? null) : null,
              };
            }),
          })),
        };
      }

      const found = findLesson(id);
      if (!found) throw mkErr(404, 'Lesson not found');
      const { lesson } = found;

      if (!action) {
        if (lesson.type === 'test') {
          const attempt = mock.lessonAttempts[id];
          return {
            data: {
              id: lesson.id, title: lesson.title, type: lesson.type, description: lesson.description,
              coinReward: lesson.coinReward, videoUrl: lesson.videoUrl,
              attempt: attempt
                ? { startedAt: attempt.started_at, finished: !!attempt.finished_at, score: attempt.finished_at ? attempt.score : null }
                : null,
            },
          };
        }
        const submission = mock.lessonSubmissions[id];
        return {
          data: {
            id: lesson.id, title: lesson.title, type: lesson.type, description: lesson.description,
            coinReward: lesson.coinReward, videoUrl: lesson.videoUrl,
            submission: submission
              ? { status: submission.status, score: submission.score, submittedAt: submission.submitted_at }
              : null,
          },
        };
      }

      if (action === 'start') {
        if (lesson.type !== 'test') throw mkErr(409, 'This lesson is not a test');
        if (mock.lessonAttempts[id]) throw mkErr(409, 'Attempt already started');
        mock.lessonAttempts[id] = { started_at: new Date().toISOString(), finished_at: null, score: null, answers: null };
        return {
          data: {
            startedAt: mock.lessonAttempts[id].started_at,
            questions: lesson.questions.map((q) => ({ id: q.id, type: 'choice', question: q.question, options: q.options })),
          },
        };
      }

      if (action === 'submit') {
        if (lesson.type !== 'test') throw mkErr(409, 'This lesson is not a test');
        const attempt = mock.lessonAttempts[id];
        if (!attempt) throw mkErr(409, 'Attempt not started');
        if (attempt.finished_at) throw mkErr(409, 'Already submitted');
        const answers = body?.answers ?? {};
        const correctCount = lesson.questions.reduce((acc, q) => acc + (answers[q.id] === q.correct ? 1 : 0), 0);
        const score = Math.round((correctCount / lesson.questions.length) * 100);
        attempt.finished_at = new Date().toISOString();
        attempt.score = score;
        attempt.answers = answers;
        if (score >= 50 && lesson.coinReward > 0) mock.coins += lesson.coinReward;
        return { data: { score } };
      }

      if (action === 'homework' && !seg[4]) {
        // GET .../homework/upload-url has seg[3]='homework', seg[4]='upload-url'; POST .../homework has seg length 4
        if (lesson.type !== 'practical') throw mkErr(409, 'This lesson has no homework');
        if (mock.lessonSubmissions[id]?.status === 'graded') throw mkErr(409, 'Already graded, cannot resubmit');
        mock.lessonSubmissions[id] = {
          status: 'submitted',
          score: null,
          submitted_at: new Date().toISOString(),
          file_key: body?.fileKey ?? null,
          text_answer: body?.textAnswer ?? null,
        };
        return { data: { status: 'submitted', submittedAt: mock.lessonSubmissions[id].submitted_at } };
      }

      if (seg[3] === 'homework' && seg[4] === 'upload-url') {
        if (lesson.type !== 'practical') throw mkErr(409, 'This lesson has no homework');
        return { data: { uploadUrl: 'mock://skip', fileKey: `mock/${query.filename || 'file'}` } };
      }
    }
  }

  throw mkErr(404, `Mock route not implemented: ${path}`);
}

function mkErr(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// ============================================================
//  REAL HTTP
// ============================================================
async function rawRequest(path, { method = 'GET', body, skipAuth = false } = {}) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(!skipAuth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.details = data.details || null;
    err.fields = data.details || data.errors || null;
    throw err;
  }
  return data;
}

/**
 * Раньше здесь был свой независимый refreshSession() с собственным
 * refreshPromise — параллельно с точно таким же в корневом api.js. На
 * свежей загрузке /student/* оба модуля стартуют с accessToken=null (до
 * того, как AuthProvider успевает подтянуть сессию по cookie) и оба ловят
 * 401 почти одновременно → ДВА независимых POST /auth/member/refresh с
 * одним и тем же ещё не провёрнутым refresh-токеном. Бэкенд видит второй
 * как reuse (auth.service.js:refresh) и отзывает ВСЕ токены пользователя —
 * сессия рвётся без реальной причины (см. task-protocol, 21.08.2026).
 * Теперь оба модуля используют ОДИН singleton — refreshOnce() из корневого
 * api.js — второй одновременный вызов просто ждёт тот же промис, а не
 * шлёт свой запрос.
 */
async function request(path, opts = {}) {
  if (USE_MOCKS) return mockRequest(path, opts);
  try {
    return await rawRequest(path, opts);
  } catch (err) {
    // 402 — просроченный счёт: бэкенд закрыл весь student-домен, повтор не поможет.
    if (err.status === 402) {
      onPaymentOverdue(err.details?.amount ?? null);
      throw err;
    }
    if (err.status !== 401 || opts.skipAuth) throw err;
    try {
      const session = await refreshOnce();
      accessToken = session.accessToken;
    } catch {
      accessToken = null;
      onSessionExpired();
      throw err;
    }
    return rawRequest(path, opts);
  }
}

export const api = {
  // Сессия (токен/refresh/logout) — целиком в корневом auth.jsx/api.js панели member,
  // этот модуль только принимает токен через setAccessToken() (см. StudentArea в App.jsx).

  // -------- STUDENT: Home --------
  home: () => request('/student/home'),
  announcements: () => request('/student/announcements'),

  // -------- STUDENT: Tests --------
  tests: () => request('/student/tests'),
  test: (testId) => request(`/student/tests/${testId}`),
  startTest: (testId) => request(`/student/tests/${testId}/start`, { method: 'POST' }),
  /* violations — журнал нарушений proctoring кабинета (выход из fullscreen,
     потеря фокуса вкладки). Бэкенд сейчас поле игнорирует; TODO для
     Sardor/Karis: писать в test_attempts.violations, при превышении порога —
     флаг ментору. Клиент шлёт всегда, чтобы контракт был готов. */
  submitTest: (testId, answers, violations) =>
    request(`/student/tests/${testId}/submit`, {
      method: 'POST',
      body: violations?.length ? { answers, violations } : { answers },
    }),

  // -------- STUDENT: Homework --------
  homework: () => request('/student/homework'),
  homeworkUploadUrl: (homeworkId, filename, contentType) =>
    request(
      `/student/homework/${homeworkId}/upload-url?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`,
    ),
  submitHomework: (homeworkId, body) =>
    request(`/student/homework/${homeworkId}/submit`, { method: 'POST', body }),

  // -------- STUDENT: Videos --------
  videos: () => request('/student/videos'),
  videoStreamUrl: (videoId) => request(`/student/videos/${videoId}/stream-url`),

  // -------- STUDENT: Shop --------
  shopItems: () => request('/student/shop/items'),
  purchase: (itemId) => request(`/student/shop/items/${itemId}/purchase`, { method: 'POST' }),
  orders: () => request('/student/shop/orders'),

  // -------- STUDENT: Leaderboard --------
  // groupId — топ своей группы вместо филиала (backend/src/modules/student/
  // leaderboard/leaderboard.controller.js уже поддерживает, фронт просто не
  // передавал параметр).
  leaderboard: (period = 'week', groupId = null) =>
    request(`/student/leaderboard?period=${period}${groupId ? `&groupId=${groupId}` : ''}`),

  // -------- STUDENT: Lessons (методика: темы → уроки → тест/дз) --------
  lessons: () => request('/student/lessons'),
  // Presigned GET на видео-файл темы (Storj) — только если topic.hasVideoFile.
  // Ссылка живёт 15 мин на бэке — запрашивать прямо перед показом плеера.
  lessonTopicVideoUrl: (topicId) => request(`/student/lessons/topics/${topicId}/video-url`),
  // Вызывать один раз, когда видео темы реально доиграно до конца — бэк сам
  // идемпотентен (повторный вызов вернёт coinsAwarded: 0, не задвоит монеты).
  markTopicVideoWatched: (topicId) => request(`/student/lessons/topics/${topicId}/watched`, { method: 'POST' }),
  lesson: (lessonId) => request(`/student/lessons/${lessonId}`),
  startLessonTest: (lessonId) => request(`/student/lessons/${lessonId}/start`, { method: 'POST' }),
  submitLessonTest: (lessonId, answers) =>
    request(`/student/lessons/${lessonId}/submit`, { method: 'POST', body: { answers } }),
  lessonHomeworkUploadUrl: (lessonId, filename, contentType) =>
    request(
      `/student/lessons/${lessonId}/homework/upload-url?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`,
    ),
  submitLessonHomework: (lessonId, body) =>
    request(`/student/lessons/${lessonId}/homework`, { method: 'POST', body }),

  // TG-FRONT
  telegramBindToken: () => request('/telegram/bind-token', { method: 'POST' }),
  telegramStatus: () => request('/telegram/status'),
  telegramUnlink: () => request('/telegram/unlink', { method: 'DELETE' }),
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
