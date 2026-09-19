import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  // 'open' — отражать любой Origin (нужно, пока команда работает с превью-доменов),
  // 'allowlist' — пускать только известные домены. Подробности и риски — в app.js
  CORS_MODE: z.enum(['open', 'allowlist']).default('open'),
  // дополнительные разрешённые Origin через запятую — на случай нового домена
  // без передеплоя кода (список по умолчанию живёт в app.js)
  ALLOWED_ORIGINS: z.string().optional().or(z.literal('')),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().min(1),
  // managed Postgres (Neon и т.п.) требует TLS — на локальном docker оставляем false
  DB_SSL: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  // ожидание подключения к БД: локальный docker отвечает мгновенно, а спящий
  // Neon сначала будит compute — см. комментарий в config/db.js
  DB_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  // Дефолт нужен только локально. В production он опасен: если переменную забыли
  // задать, приложение молча уходит на localhost, Redis там нет, и чат, presence
  // и очереди BullMQ тихо не работают — падают только логи, HTTP отвечает 200.
  // Поэтому ниже (superRefine) в production дефолт запрещён.
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  JWT_ACCESS_SECRET: z.string().min(32),

  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().default('levelup'),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().optional().or(z.literal('')),
  SMTP_PASS: z.string().optional().or(z.literal('')),
  SMTP_FROM: z.string().default('no-reply@levelup.local'),

  SMS_API_URL: z.string().url().optional().or(z.literal('')),
  SMS_API_TOKEN: z.string().optional().or(z.literal('')),

  TELEGRAM_BOT_TOKEN: z.string().optional().or(z.literal('')),
  // Без него bind-token.service бросает исключение → POST /api/telegram/bind-token
  // отдаёт 500, а кнопка «Telegram» в кабинете молча ничего не делает.
  // Значение — @username бота без «@».
  TELEGRAM_BOT_USERNAME: z.string().optional().or(z.literal('')),

  // Публичный адрес API (например https://api.levelup-academy.uz). Задан вместе
  // с TELEGRAM_WEBHOOK_SECRET → бот работает через webhook, иначе long-polling.
  PUBLIC_API_URL: z.string().url().optional().or(z.literal('')),
  // Секрет в пути webhook И в заголовке secret_token. Минимум 24 символа:
  // путь попадает в логи прокси, короткий секрет там подбирается.
  TELEGRAM_WEBHOOK_SECRET: z.string().min(24).optional().or(z.literal('')),
  // Язык ответов бота. По умолчанию узбекский (см. bot.js) — аудитория ученики
  // и родители в Узбекистане. 'ru' — если партнёру нужен русский.
  TELEGRAM_BOT_LANG: z.enum(['uz', 'ru']).optional().or(z.literal('')),

  // Google/Firebase вход: Web client ID (из Firebase → Auth → Google → Web SDK).
  // Публичное значение. Пусто → /api/auth/google отдаёт 503.
  GOOGLE_CLIENT_ID: z.string().optional().or(z.literal('')),

  // --- Аналитика сайта levelup-academy.uz (Karis 25.08.2026) ---
  // Сервисный аккаунт Google для чтения GA4 Data API и Search Console API.
  // Это НЕ GOOGLE_CLIENT_ID выше: тот — публичный OAuth-клиент для входа
  // пользователей, а здесь приватный ключ, которым сервер ходит в чужие API
  // от своего имени. Пусто → /api/main/site-analytics отвечает
  // { configured: false } с инструкцией, а не падает и не врёт нулями.
  GOOGLE_SA_CLIENT_EMAIL: z.string().optional().or(z.literal('')),
  // Приватный ключ из JSON сервисного аккаунта. В .env переводы строк хранятся
  // как литеральные \n (иначе значение не помещается в одну строку) —
  // google.auth.js разворачивает их обратно. Base64 тоже принимается.
  GOOGLE_SA_PRIVATE_KEY: z.string().optional().or(z.literal('')),
  // Числовой ID ресурса GA4 (Админ → Настройки ресурса → Идентификатор).
  // Именно ID ресурса, а не Measurement ID G-XXXX из тега на сайте.
  GA4_PROPERTY_ID: z.string().optional().or(z.literal('')),
  // Ресурс в Search Console. Для domain-property формат строго
  // 'sc-domain:levelup-academy.uz'; для префиксного — 'https://levelup-academy.uz/'.
  GSC_SITE_URL: z.string().default('sc-domain:levelup-academy.uz'),

  // --- Лимиты хранилища (Karis 26.08.2026) ---
  // Ни у Neon, ни у Storj нет API биллинга, подключённого сюда — сервер видит
  // только РЕАЛЬНЫЙ объём (pg_database_size / сумма размеров в бакете), а сам
  // лимит плана знает только владелец аккаунта. Пусто → страница показывает
  // фактический объём без процента "сколько из лимита" — придумывать чужую
  // цифру плана нельзя.
  NEON_STORAGE_LIMIT_GB: z.string().optional().or(z.literal('')),
  STORJ_STORAGE_LIMIT_GB: z.string().optional().or(z.literal('')),

  // за сколько дней до due_date слать родителям напоминание payment.due_soon
  DUE_SOON_REMINDER_DAYS: z.coerce.number().int().positive().default(2),

  // Aqlli tahlil (AI-review практических уроков). Пусто → review.service сразу
  // пишет review_status='failed' и не делает сетевых вызовов — сдача ДЗ
  // продолжает работать без AI. Groq (не Gemini) — 09.08.2026 переключились:
  // бесплатный тариф Groq/Cerebras НЕ обучается на входных данных (в отличие
  // от free tier самого Google), а сюда прилетает код реальных детей.
  GROQ_API_KEY: z.string().optional().or(z.literal('')),
  // Запасные ключи (10.08.2026, запрос пользователя): free tier одного ключа
  // gpt-oss-120b — ~200K токенов/день, это ~100 проверок — школа может
  // упереться за один день. groq.client.js пробует их по очереди, любой
  // не заданный просто пропускается.
  GROQ_API_KEY_2: z.string().optional().or(z.literal('')),
  GROQ_API_KEY_3: z.string().optional().or(z.literal('')),

  SEED_MAIN_ADMIN_PHONE: z.string().default('+998900000000'),
  SEED_MAIN_ADMIN_EMAIL: z.string().email().default('hp8187081014laptop@gmail.com'),
  SEED_MAIN_ADMIN_PASSWORD: z.string().min(8).default('ChangeMe123!'),
  SEED_CEO_EMAIL: z.string().email().default('azizbekamangeldiev.2010@gmail.com'),
}).superRefine((cfg, ctx) => {
  if (cfg.NODE_ENV !== 'production') return;

  // BUG-REDIS-SILENT: на проде подключение к localhost заведомо мусорное —
  // значит переменную не задали. Лучше не подняться совсем, чем работать
  // с мёртвыми очередями и чатом, делая вид, что всё в порядке.
  if (/\/\/(localhost|127\.0\.0\.1)[:/]/.test(cfg.REDIS_URL)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['REDIS_URL'],
      message:
        'в production REDIS_URL обязателен и не может указывать на localhost — задайте внешний Redis (Upstash и т.п.) в переменных окружения',
    });
  }
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // fail-fast: приложение не должно стартовать с битым окружением
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = parsed.data;
