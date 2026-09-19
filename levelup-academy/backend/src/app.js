import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { createRateLimiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { AppError } from './utils/AppError.js';
import { swaggerSpec } from './config/swagger.js';
import authRoutes from './modules/auth/auth.routes.js';
import chatRoutes from './modules/chat/chat.routes.js';
import coinsRoutes from './modules/coins/coins.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import mentorRoutes from './modules/mentor/mentor.routes.js';
import studentRoutes from './modules/student/student.routes.js';
import parentRoutes from './modules/parent/parent.routes.js';
import mainRoutes from './modules/main/main.routes.js';
import healthRoutes from './modules/health/health.routes.js';
import platformBillingRoutes from './modules/platformBilling/platformBilling.routes.js';
import leadsRoutes from './modules/main/leads.routes.js';
import superRoutes from './modules/super/super.routes.js';
import financeRoutes from './modules/finance/finance.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import branchManagerRoutes from './modules/branch-manager/branch-manager.routes.js';
import methodistRoutes from './modules/methodist/methodist.routes.js';
import telegramRoutes from './modules/telegram/telegram.routes.js';
import { emitMainDashboardChanged } from './sockets/io.js';

/**
 * Кто имеет право звать API из браузера.
 *
 * Два режима, переключаются переменной CORS_MODE без правки кода:
 *
 *   open       (по умолчанию) — отражаем любой присланный Origin. Так было
 *              изначально и так оставлено СОЗНАТЕЛЬНО на время командной
 *              работы: у четырнадцати человек свои превью-домены и локальные
 *              порты, и закрытый список блокировал бы их по очереди.
 *   allowlist  — пускаем только известные домены (список ниже) плюс то, что
 *              перечислено в ALLOWED_ORIGINS.
 *
 * ⚠️ Чем `open` опасен. Вместе с `credentials: true` сервер отвечает
 * `Access-Control-Allow-Origin: <origin запросившего>` кому угодно — проверено
 * на боевом API запросом с `Origin: https://evil-example.com`. Единственное,
 * что мешает чужой странице дёрнуть /api/auth/refresh с куками жертвы и
 * прочитать оттуда свежий access-token, — это `sameSite: 'lax'` у refresh-куки
 * (modules/auth/auth.controller.js). Пока режим `open`, эту настройку менять
 * НЕЛЬЗЯ: `SameSite=none` вместе с открытым CORS = захват аккаунта с любого
 * сайта. Панели на *.vercel.app кросс-сайтовые с API, поэтому соблазн поставить
 * `none` будет — правильный ответ не он, а поддомены levelup-academy.uz.
 *
 * Когда команда закончит: `CORS_MODE=allowlist` в переменных Render.
 */
const PROD_ORIGINS = new Set([
  'https://levelup-academy.uz',
  'https://www.levelup-academy.uz',
  'https://student.levelup-academy.uz',
  'https://staff-levelup.vercel.app',
  'https://owner-levelup.vercel.app',
  'https://member-levelup.vercel.app',
  'https://level-up-academy.vercel.app',
  'https://levelup-staff.vercel.app',
  'https://levelup-owner.vercel.app',
  'https://levelup-member.vercel.app',
  'https://levelup-student.vercel.app',
  'https://levelup-landing.vercel.app',
]);

// превью-деплои того же аккаунта: <project>-<hash>-azizbek0010s-projects.vercel.app
const VERCEL_PREVIEW = /^https:\/\/[a-z0-9-]+-azizbek0010s-projects\.vercel\.app$/;

function corsOrigin(origin, cb) {
  // открытый режим: команда работает с превью-доменов и локальных портов
  if (env.CORS_MODE !== 'allowlist') return cb(null, true);

  // без Origin приходят curl, Postman, серверные вызовы и same-origin навигация —
  // CORS к ним не применяется, блокировать нечего
  if (!origin) return cb(null, true);

  const extra = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (PROD_ORIGINS.has(origin) || extra.includes(origin)) return cb(null, true);
  if (VERCEL_PREVIEW.test(origin)) return cb(null, true);
  // локальная разработка: любой порт localhost, но только вне production
  if (env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return cb(null, true);
  }

  logger.warn({ origin }, 'CORS: origin отклонён');
  return cb(null, false); // не бросаем ошибку: cors просто не выставит заголовок
}

export function createApp() {
  const app = express();

  // за прокси Render/облака: доверяем 1 хопу, чтобы req.ip читался из
  // X-Forwarded-For (иначе rate-limiter считает всех клиентов одним IP).
  app.set('trust proxy', 1);

  app.use(helmet());

  // API — не веб-страница: в поисковой выдаче ему делать нечего. Домен-property в Search
  // Console (sc-domain:) охватывает и поддомены, поэтому без этого заголовка Google вправе
  // индексировать JSON-ответы api.* — мусор в выдаче и бесплатная карта endpoint'ов.
  // Заголовком, а не meta-тегом: у JSON нет <head>.
  app.use((_req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    next();
  });

  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger, autoLogging: env.NODE_ENV !== 'test' }));

  // Health checks must not depend on Redis. Otherwise a Redis outage delays
  // the hosting probe and can cause a healthy API process to be restarted.
  app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

  app.use(createRateLimiter({ keyPrefix: 'rl:api', points: 300, duration: 60 }));

  // Dashboard live-invalidation. The socket carries no business data; it only
  // tells authenticated Main Admin clients to refetch canonical API responses.
  // This keeps permissions and calculations in the existing HTTP endpoints.
  app.use((req, res, next) => {
    const changesDashboard = req.method !== 'GET' && req.method !== 'HEAD'
      && (req.path.startsWith('/api/main')
        || req.path.startsWith('/api/leads')
        || req.path.startsWith('/api/super')
        || req.path.startsWith('/api/admin/students'));
    if (changesDashboard) {
      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          emitMainDashboardChanged({ resource: req.path, method: req.method });
        }
      });
    }
    next();
  });

  // Краулер запрашивает /robots.txt до всего остального. Без файла он получал 404 и считал,
  // что обходить можно всё. X-Robots-Tag выше закрывает уже загруженные ответы — этот файл
  // не даёт их загружать вовсе.
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send('User-agent: *\nDisallow: /\n');
  });

  // Корень — не эндпоинт данных; API живёт на /api/*. Отдаём подсказку вместо 404,
  // чтобы фронтендеры, открывшие корень для проверки, не пугались.
  app.get('/', (_req, res) =>
    res.json({ success: true, service: 'LevelUp Academy API', api: '/api', health: '/health' }));

  // --- API docs (swagger-jsdoc + swagger-ui-express) ---
  // No auth gate exists elsewhere for docs-style routes in this codebase, so we
  // default to the safer option: serve only outside production. In dev/test the
  // UI is fully public (no authenticate()) so partners' onboarding devs can browse
  // it without a token; in production it's not mounted at all (avoids exposing the
  // full endpoint/schema surface of a multi-tenant payments API to the internet).
  if (env.NODE_ENV !== 'production') {
    // helmet()'s default CSP blocks the inline <script>/<style> that
    // swagger-ui-express injects into its HTML page — relax it only for this path.
    const relaxCspForDocs = (_req, res, next) => {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:;",
      );
      next();
    };
    app.use('/api/docs', relaxCspForDocs, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));
  }

  // --- modules ---
  app.use('/api/auth', authRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/leads', leadsRoutes); // ПУБЛИЧНЫЙ приём заявок с лендинга (без токена)
  app.use('/api/main', mainRoutes);   // Main Admin: онбординг партнёров, дашборд платформы
  app.use('/api/main', healthRoutes); // Main Admin: настоящая проверка БД/Redis/S3 (Karis 26.08.2026)
  app.use('/api/main/invoices', platformBillingRoutes); // Main Admin: счета и долги партнёров (Karis 26.08.2026)
  app.use('/api/super', superRoutes); // CEO: филиалы + админы своей организации
  app.use('/api/finance', financeRoutes); // FINANCE MANAGER: доход/расход всей организации, без филиалов/админов
app.use('/api/admin', adminRoutes); // K-ADMIN: филиал — дашборд, расходы, студенты, группы
app.use('/api/branch-manager', branchManagerRoutes); // BRANCH MANAGER: дашборд/доход/расход/отчёты/карточка своего филиала
app.use('/api/methodist', methodistRoutes); // METHODIST: тесты, ДЗ, аналитика
  app.use('/api/coins', coinsRoutes);       // AB: студент — баланс/история коинов
  app.use('/api/users', usersRoutes);       // AB-SHARED: профиль, список филиала
  app.use('/api/mentor', mentorRoutes);     // AB-MENTOR: davomat, ДЗ, тесты, зарплата
  app.use('/api/student', studentRoutes);   // AB-STUDENT: home, магазин, ДЗ, тесты, видео, лидерборд
  app.use('/api/parent', parentRoutes);     // AB-PARENT: обзор ребёнка (посещаемость/оценки/долг/коины)
  app.use('/api/telegram', telegramRoutes); // BILOL: привязка Telegram (bind-token)

  // 404 → errorHandler
  app.use((req, _res, next) => {
    next(new AppError(404, `Route ${req.method} ${req.path} not found`));
  });

  app.use(errorHandler); // всегда последним

  return app;
}
