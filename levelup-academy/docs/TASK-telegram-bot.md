# TASK — Telegram-бот (уведомления родителям/студентам)

> ## ✅ СТАТУС СВЕРЕН С КОДОМ 2026-07-26 (Karis)
>
> Файл стоял с **0 галочками**, хотя Bilol сделал 14 коммитов и почти весь B1–B3 уже в коде.
> Именно это и было задачей `TG-SYNC` в корневом `TASK.md`. Сверка ниже — по факту, из кода:
>
> | Блок | Было в файле | Реально в коде (2026-07-26) |
> |---|---|---|
> | B1 bind-token | `[ ]` всё | ✅ `POST /api/telegram/bind-token` (`telegram.routes.js:42`), `bind-token.service.js` с Redis `SET ... EX NX` + атомарным `GETDEL` |
> | B1 `/start` | `[ ]` | ✅ `bot.handlers.js:10` — с payload и без, невалидный токен обрабатывается |
> | B1 `/stop` | `[ ]` | ✅ `bot.handlers.js:54` — DELETE из `telegram_accounts`, «не было привязки» отдельным ответом |
> | B1 polling | `[ ]` | ✅ `bot.js:22` — `bot.start()` вызывается (в коде даже комментарий, почему без него `/start` мёртв) |
> | B2 `payment.due_soon` | `[ ]` | ✅ хендлер в `HANDLERS` (`notification.worker.js:21`), payload `{ studentId, amount, dueDate, daysLeft }` |
> | B3 `announcement` | `[ ]` | ✅ хендлер есть, но имя события — **`announcement.created`**, не `announcement` |
>
> ⚠️ **Главная оговорка:** всё это на проде **не работает** — не по вине Bilol'а.
> В `render.yaml` нет сервиса `type: worker`, значит `worker.js` никогда не запускается
> и очередь `notifications` никто не читает. См. `BUG-NO-WORKER` в корневом `TASK.md`.
> Пока это не решено, бот принимает `/start`, но ни одного уведомления не доставит.
>
> Что реально осталось — в разделе «Открыто» в конце файла.

> **Исполнитель:** Bilol
> **Зона в коде:** `backend/src/modules/telegram/` + свои воркеры в `backend/src/queues/`
> **Ветка:** `bilol/telegram-bot` → PR в `main` через ревью
> **Координация:** Abdulaziz (инфра, очереди, коины) · Karis (платежи, auth)

---

## 1. Что уже готово (фундамент — не переписывать)

| Компонент | Где | Что делает |
|---|---|---|
| grammY-инстанс | `src/modules/telegram/bot.js` | `bot` (или `null` без токена — dev). Токен: `TELEGRAM_BOT_TOKEN` в `.env` |
| Таблица привязки | `telegram_accounts` (init-миграция) | `user_id UNIQUE`, `tg_chat_id UNIQUE`, `tg_role ('student'\|'parent')`, `linked_at` |
| Воркер доставки | `src/queues/workers/notification.worker.js` | Слушает очередь `notifications`, резолвит chat_id по `telegram_accounts`, шлёт через `bot.api.sendMessage`. Rate-limit 25 msg/сек уже стоит |
| Готовые типы уведомлений | там же, `HANDLERS` | `coins.changed` · `payment.received` · `debt.overdue` · `homework.due` |
| Крон просрочек | `src/queues/workers/overdue.worker.js` | Ежедневно 09:00 помечает просроченные `payment_schedules` → кладёт `debt.overdue` в очередь |
| Очередь | `src/queues/notification.queue.js` | `notificationQueue.add(name, payload)` — единственный вход для уведомлений |

~~**Итого:** доставка «очередь → Telegram» работает. Не работает **привязка** (в `telegram_accounts` некому писать — бот не умеет `/start`) и нет **напоминаний до срока оплаты**.~~

**Итого (2026-07-26, сверено с кодом):** привязка написана (`/start` + `/stop` + bind-token
через Redis), `payment.due_soon` и `announcement.created` хендлеры есть. Локально цепочка
целиком собрана. **Но на проде она мертва** — `worker.js` не запускается (нет `type: worker`
в `render.yaml`, `BUG-NO-WORKER`), поэтому очередь никто не читает.

---

## 2. Задачи

### B1. Регистрация в боте: `/start` + bind-token 🔴 (блокирует всё остальное)
Без этого `telegram_accounts` пуста и ни одно уведомление не доставляется.

> ✅ **Схема согласована с Karis (группа, 07.07):** привязка **НЕ** через `users.login_code` + пароль
> (это постоянные креды входа в CRM — светить и переиспользовать их как bind-код нельзя: фишинг и утечка).
> Вместо этого — **отдельный одноразовый bind-token**: кабинет генерит короткий токен → Redis
> (TTL 10 мин, single-use, маппинг `token → user_id`) → бот валидирует токен, пишет
> `telegram_accounts` и гасит токен.

- [x] `POST /api/telegram/bind-token` (за `authenticate` Кариса, роли student/parent): генерит короткий токен → Redis `SET bind:<token> <user_id> EX 600 NX`, ответ `{ token, expiresIn, deepLink }` (`https://t.me/<bot>?start=<token>`). Кнопка «Привязать Telegram» в кабинете зовёт этот эндпоинт (фронт — отдельный таск)
- [x] `bot.command('start')` с payload (`ctx.match` из deep-link): валидировать токен атомарно (`GETDEL`) → `INSERT INTO telegram_accounts (user_id, tg_chat_id, tg_role)` → подтверждение. Невалидный/протухший токен → понятное сообщение «получите новый код в кабинете»
- [x] `/start` без payload — приветствие + инструкция, где взять код (кнопка в кабинете CRM)
- [x] Повторная привязка того же юзера/чата → понятный ответ, не 500 (UNIQUE на обоих полях)
- [x] `/stop` — отвязка (DELETE из `telegram_accounts`)
- [x] Long-polling запуск: `bot.start()` — отдельный entrypoint или внутри `worker.js` (согласовать с Abdulaziz)

### B2. Напоминание «пришло время платить» 🔴
Сейчас родитель узнаёт о платеже только ПОСЛЕ просрочки (`debt.overdue`). Нужно ДО:

> ✅ **Разделение согласовано (группа, 07.07):** producer-джоб пишет **Karis** — выборка из
> `payment_schedules` (его денежная зона) за N дней до срока + постановка `payment.due_soon`
> в очередь + идемпотентность на его стороне. Bilol делает только доставку.

- [x] Хендлер `payment.due_soon` в `HANDLERS` (`notification.worker.js`): сообщение родителю «Скоро платёж X сум, срок YYYY-MM-DD»
- [ ] Формат payload (`studentId`, сумма, `dueDate`) — согласовать с Karis до его пуша producer-джоба

### B3. События/объявления родителям 🟡

> ✅ **Источник согласован (группа, 07.07):** Karis даёт `POST /api/admin/announcements` (K-ADMIN) —
> admin создаёт объявление, эндпоинт кладёт `notificationQueue.add('announcement', payload)`.
> Bilol свой HTTP-эндпоинт НЕ делает — только читает очередь.

- [x] Хендлер `announcement` в `HANDLERS`: рассылка родителям филиала (или группы) — текст события, дата
      ℹ️ Имя события в коде — **`announcement.created`**, а не `announcement`, как записано
      в этом файле выше. Обе стороны сходятся: producers кладут именно `announcement.created`
      (`admin.service.js:724`, `super.service.js:371`). Устарел только текст договорённости
- [ ] Резолв получателей: родители студентов филиала/группы (`student_profiles.parent_id` → `telegram_accounts`)
- [ ] Формат payload (`branchId` / `groupId`, текст, дата) — согласовать с Karis до его пуша эндпоинта
- [ ] Батч-рассылка большому числу родителей — частями, лимитер уже стоит в воркере

### B4. Качество 🟢
- [ ] Все тексты сообщений — на узбекском и русском (язык юзера — согласовать где хранить; на старте можно RU)
- [ ] Ошибка Telegram API (юзер заблокировал бота, chat_id мёртв) не должна ронять батч — try/catch на отправку, лог, продолжить
- [ ] Тесты по образцу `backend/tests/mentor/run.js` (живая БД, фикстуры с откатом)

---

## 3. Правила координации (обязательны — `backend/TASKS.md` §6)

| Правило | Что это значит для тебя |
|---|---|
| **Уведомления только через очередь** | HTTP-код НИКОГДА не зовёт `bot.api` напрямую. Всё через `notificationQueue.add(name, payload)` → хендлер в воркере |
| **Деньги — только SELECT** | `payment_schedules`, `invoices`, `transactions` — читать можно, писать нельзя (зона Karis). Producer-джоб `payment.due_soon` тоже у Karis (см. B2) |
| **Чужие файлы не трогаем** | Нужна правка в чужой зоне → TODO-комментарий + сообщение в группу |
| **Миграции** | Своя таблица/колонка → `npm run migrate:create`, имя файла в группу ДО пуша (timestamp-конфликты) |
| **Секреты** | `TELEGRAM_BOT_TOKEN` только в `.env` (gitignored). В `.env.example` — плейсхолдер |

---

## 4. Как поднять окружение

```bash
git clone <repo> && git checkout -b bilol/telegram-bot
cd backend && cp .env.example .env   # заполнить JWT_ACCESS_SECRET (32+ симв.), TELEGRAM_BOT_TOKEN
docker compose up -d                 # Postgres 16, Redis 7, MinIO, Mailpit
npm install && npm run migrate && npm run seed
npm run dev                          # API
npm run worker:dev                   # воркеры очередей (тут живёт notification.worker)
```

Демо-данные из seed: студенты `demostu1/111111`, `demostu2/222222`, `demostu3/333333`, родитель `demopare/654321` (login-code/пароль).

---

## 5. Definition of Done

- [ ] Родитель жмёт «Привязать Telegram» в кабинете → deep-link `/start <token>` → привязка в `telegram_accounts` → получает `debt.overdue` и `payment.due_soon` вживую
- [ ] Протухший/использованный bind-token не привязывает и даёт понятный ответ
- [ ] Объявление админа (`announcement` из очереди) доходит всем привязанным родителям филиала
- [ ] Блокировка бота одним юзером не ломает рассылку остальным
- [ ] Никаких прямых вызовов `bot.api` из HTTP-кода; деньги — только SELECT
- [ ] Тесты зелёные, PR прошёл ревью (Abdulaziz — очереди/инфра, Karis — если затронуты платежи)
