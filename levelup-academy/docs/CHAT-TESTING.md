# Чат: как тестировать вручную (Postman / curl)

Коротко: **читать** сообщения можно обычным HTTP, **отправлять** — только через
Socket.IO. REST-эндпоинта на отправку в проекте нет и не планировался.

---

## 0. Что где живёт

| Адрес | Что это |
|---|---|
| `http://localhost:4100` | локальный бэкенд (Docker Postgres + Redis) |
| `http://localhost:4100/api/docs` | **Swagger UI — 135 эндпоинтов всего API** |
| `http://localhost:4100/api/docs.json` | та же спека файлом → импорт в Postman |
| `http://localhost:5200` | фронт `staff` (панель ментора) |

Swagger покрывает весь REST. Отдельно расписывать его здесь незачем — открой
`/api/docs`, там каждый маршрут с параметрами и примерами ответов. Ниже только
чат и только то, чего в Swagger нет.

---

## 1. Токен

Обычный вход:

```
POST /api/auth/staff/login          {"login": "...", "password": "..."}   ← сотрудники
POST /api/auth/member/login         {"login": "...", "password": "..."}   ← ученик/родитель
```

Поле называется **`login`**, не `email`. Ответ приходит плоским объектом
(`{ user, accessToken, ... }`), без обёртки `data`.

Если пароль тестового аккаунта неизвестен:

```bash
node scripts/test-token.mjs mentor.demo@levelup.local 12h
node scripts/test-token.mjs demopare          # по login_code
```

Печатает токен, `user id` и готовые `room_key` диалогов этого человека.
Подписывает тем же `JWT_ACCESS_SECRET`, что и обычный вход, поэтому пароль не
нужен. Работает только против бэкенда с тем же секретом.

Дальше во всех запросах: `Authorization: Bearer <токен>`.

---

## 2. Чтение — обычный HTTP

| Метод | Путь | Ответ |
|---|---|---|
| GET | `/api/chat/contacts` | с кем можно переписываться: `peer_type`, `unread_count`, `last_message`, `room_key` |
| GET | `/api/chat/:roomKey/messages?limit=50&cursor=<ISO>` | история, **новые сверху** |
| POST | `/api/chat/:roomKey/read` | пометить входящие прочитанными |

`roomKey` содержит двоеточия и в URL кодируется как `%3A`:

```bash
curl -H "Authorization: Bearer $T" \
  "http://localhost:4100/api/chat/dm%3A<staffId>%3A<peerId>/messages?limit=20"
```

Границы, которые уже проверяются сервером: `limit` зажимается в `[1,100]`,
битый `cursor` → `400` (а не 500 от Postgres), чужая комната → `403`.

---

## 3. Отправка — Socket.IO

Подключение: URL `http://localhost:4100`, транспорт `websocket`, токен в
**handshake auth**, не в заголовке:

```json
{ "token": "<access token>" }
```

Неверный/протухший токен — соединение не поднимется вовсе
(`Invalid or expired token`).

### События

| Событие | Кто вправе | Тело |
|---|---|---|
| `chat:dm:send` | сотрудник → родитель **или** ученик | `{ "peerId": "<uuid>", "body": "текст" }` |
| `chat:dm:reply` | **только родитель** → сотрудник | `{ "staffId": "<uuid>", "body": "текст" }` |
| `chat:global:send` | main_admin / ceo / admin / mentor | `{ "body": "текст" }` |

Каждое отвечает подтверждением: `{ ok: true, id, roomKey }` либо
`{ ok: false, error: "..." }`.

Входящие приходят событием `chat:dm:message` (личные) и `chat:global:message`
(общий чат сотрудников).

### Что вернёт отказ

| Ситуация | error |
|---|---|
| собеседник не из своих групп / филиала / организации | `Forbidden` |
| ученик пытается ответить через `chat:dm:reply` | `Forbidden` — **право есть только у родителя** |
| пустое тело | `Message body is required` |

Подписаться на чужую комнату нельзя: события `join` нет вовсе, сервер сам шлёт
адресно в личную комнату `user:<id>`.

### В Postman

New → **Socket.IO** (не HTTP-запрос) → URL `http://localhost:4100` →
Settings → Handshake: auth `{"token":"..."}`, transport `websocket` →
Events: слушать `chat:dm:message` → Message: событие `chat:dm:send`, тело JSON.

### Быстрее, чем Postman

```bash
node scripts/send-test-dm.mjs parent "Salom ustoz"      # от родителя ментору
node scripts/send-test-dm.mjs demostu1 "Tushunmadim"    # от ученика (сейчас Forbidden)
```

---

## 4. Как проверить, что уведомление доходит вживую

1. Открой панель ментора на `:5200`, войди `mentor.demo@levelup.local`.
2. Не трогая вкладку, запусти `node scripts/send-test-dm.mjs parent "тест"`.
3. Счётчик на колокольчике должен вырасти **сам**, без перезагрузки.

Если не растёт — смотри подписку на `chat:dm:message` в `Notifications`
(`frontend/staff/src/components/Layout.jsx`). Ровно этой подписки там не было,
из-за чего непрочитанные показывались только на момент загрузки страницы.

---

## 5. База

Скрипты в `scripts/` намеренно ходят в **локальную** базу
(`postgresql://levelup:levelup@localhost:5432/levelup`), а не в `DATABASE_URL`
из `.env` — тот указывает на продакшн-Neon. Любая команда, запущенная без явного
`DATABASE_URL`, попадёт в продакшн: так однажды уже уехала миграция. Переопределить
можно через `TEST_DB`.

---

## 6. Известные пробелы

- **Ученик не может ответить.** `chat:dm:reply` проверяет `role !== 'parent'`.
  Ментор ученику пишет, ученик прочитать может, ответить — нет.
- **Попап уведомлений не гасит счётчик** при открытии диалога: `POST /read`
  из него не вызывается.
- `frontend/member` (зона Kama) всё ещё слушает старую комнату `parent:<id>`.
