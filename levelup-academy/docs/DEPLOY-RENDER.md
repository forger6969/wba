# Деплой бэкенда на Render (runbook)

> Render хостит **только Node-API** (`backend/`). База/кэш/файлы — внешние
> managed-сервисы (**Neon** Postgres, **Upstash** Redis, **Storj** S3), уже
> подняты и подключаются через env. Blueprint: `render.yaml` в корне репо.
> Деплой идёт с ветки **`main`**, `autoDeploy: true` (каждый push в main → передеплой).

---

## 0. Что понадобится заранее (собрать значения секретов)

Всё это — из локального `backend/.env` (инфра у Abdulaziz; SMTP + Google у Karis):

| Переменная | Откуда | Обязательна? |
|---|---|---|
| `DATABASE_URL` | Neon (строка вида `postgresql://…?sslmode=require`) | ✅ да |
| `REDIS_URL` | Upstash (`rediss://…`) | ✅ да (без него не стартует sockets/queues/rate-limit) |
| `S3_ENDPOINT` | Storj (`https://gateway.storjshare.io`) | ✅ да |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | Storj | ✅ да |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Gmail SMTP (Karis) | ⚠️ нужен для OTP-писем (сброс пароля) |
| `GOOGLE_CLIENT_ID` | Firebase → Auth → Google → Web SDK (Karis) | ⚠️ нужен для Google-входа (без него `/api/auth/*/google` → 503, остальное работает) |
| `CLIENT_URL` | URL фронта для CORS | ⚠️ временно можно URL самого сервиса |

`JWT_ACCESS_SECRET` **не готовить** — Render сгенерит сам (`generateValue: true`).
`NODE_ENV=production`, `DB_SSL=true`, `S3_REGION`, `S3_BUCKET` уже зашиты в `render.yaml`.

---

## 1. Аккаунт и подключение репозитория
1. Зайти на **render.com** → **Get Started** → войти через **GitHub**.
2. Дать Render доступ к репозиторию `Ichvoganla-Siqilganla/SRM-System` (Configure → выбрать этот репо).

## 2. Создать сервис из Blueprint
1. Dashboard → **New +** → **Blueprint**.
2. Выбрать репозиторий `SRM-System`. Render найдёт `render.yaml` и покажет сервис **`levelup-backend`** (web, регион Frankfurt, free).
3. **Apply** / **Create**.

## 3. Заполнить секреты
Render на этапе создания попросит значения всех переменных с `sync: false` (список из §0).
Вставить их. `CLIENT_URL` пока — URL сервиса (после создания это `https://levelup-backend.onrender.com`), потом заменить на реальный URL фронта.

## 4. Дождаться деплоя и проверить
- Первый билд ~2–4 мин (`npm install` → `npm start`).
- Проверка живости: открыть **`https://levelup-backend.onrender.com/health`** → должно вернуть `{"status":"ok",...}`.
- Если билд упал — смотреть **Logs** сервиса. Частые причины: пустой `DATABASE_URL`/`REDIS_URL`, или `DATABASE_URL` без `?sslmode=require`.

## 5. База данных (один раз)
Neon уже мигрирован и засидирован локально — **обычно ничего делать не нужно**.
Если БД новая/пустая — один раз прогнать локально против неё:
```bash
cd backend
DATABASE_URL="<neon-url>" DB_SSL=true npm run migrate
DATABASE_URL="<neon-url>" DB_SSL=true npm run seed
```
Сид создаёт `main_admin` и демо-организацию (демо-креды — в `src/db/seeds/seed.js`).

## 6. Отдать фронтендам базовый URL
Базовый URL API = `https://levelup-backend.onrender.com`.
Фронт-панели в дев-режиме бьют в него **через Vite-прокси** (как уже сделано для landing/main-admin — просто заменить `target` в `vite.config.js` с `http://localhost:4000` на URL Render). Так нет CORS-возни. Либо в проде указать `VITE_API_URL` = этот URL.

---

## Важные ограничения free-плана (осознанно)
- **Сон после ~15 мин простоя** → первый запрос после простоя = холодный старт **~30–50с**. Для дев/демо ок; убирается платным планом ($7/мес).
- **Фоновый worker (BullMQ) и cron 09:00 НЕ запускаются** на free (Render free = только web-сервисы). Значит **очередь уведомлений не доставляется** (Telegram-напоминания, `coins.changed`, `debt.overdue`). ⚠️ Заметь: **OTP-письма (сброс пароля) работают** — они шлются синхронно из API, не через worker. Когда понадобятся уведомления — добавить worker-сервис на платном плане (`startCommand: npm run worker`).
- **CORS**: `CLIENT_URL` = один origin. Для нескольких дев-фронтов на localhost — использовать Vite-прокси (см. §6), не завязываться на CORS.

## Апгрейд до продакшена (позже)
- Web + Worker на платном плане (без сна, воркер живой).
- `CLIENT_URL` = реальный домен фронта.
- Свой домен + авто-TLS (Render даёт бесплатно).
