# LevelUp Academy — SaaS CRM для учебных центров

Мульти-арендная платформа (SaaS), которую мы продаём учебным центрам Узбекистана.
Каждый партнёр = отдельная организация (тенант) со своими филиалами, сотрудниками и учениками.

**7 ролей:** Main Admin (мы, платформа) → CEO (партнёр) → Admin (филиал) →
Mentor · Methodist · Student · Parent.

Что внутри: заявки с лендинга и онбординг партнёров, филиалы и сотрудники, посещаемость,
ДЗ и тесты, финансы (счета, платежи full/split, расходы, отчёты), геймификация на коинах,
realtime-чаты и presence через Socket.io, уведомления в Telegram через очередь.

> [!IMPORTANT]
> **Статус на 2026-07-26:** проект в активной разработке, не в проектировании.
> 326 коммитов, 14 участников. Бэкенд всех панелей написан, фронт интегрируется.
> Прогресс к v1 и реальные статусы — в [`TASK.md`](TASK.md) (единственный источник правды)
> и в автогенерируемом [`done.md`](done.md).

> [!WARNING]
> **Известные дыры на проде** (подробности в `TASK.md`):
> воркеры BullMQ на Render не запускаются (сервиса `type: worker` нет) → счета не выставляются,
> просрочки не отмечаются, Telegram-уведомления не доставляются; страница биллинга в Main Admin
> построена на отменённой модели тарифов и показывает нули.

---

## 📚 Документация

| Документ | Что внутри |
|---|---|
| [`TASK.md`](TASK.md) | **Источник правды по задачам и статусам.** Все панели, баги, владельцы |
| [`done.md`](done.md) | Автогенерация из `TASK.md` (`scripts/update-done.py`) — не править руками |
| [`CLAUDE.md`](CLAUDE.md) | Правила команды: зоны доступа, Frontend ≠ Backend, workflow `save-zone` |
| [Backend Architecture](docs/BACKEND-ARCHITECTURE.md) | Структура, PostgreSQL DDL, middlewares (RBAC, archiveGuard), Socket.io + Redis, split-payment, коины, BullMQ + Telegram |
| [Frontend Architecture](docs/FRONTEND-ARCHITECTURE.md) | React + Vite: роутинг по ролям, TanStack Query, auto-refresh, socket-клиент, темизация |
| [Design System](docs/FRONTEND-DESIGN-SYSTEM.md) | Лайм `#C6FF34`, Manrope, тёмный сайдбар — обязательно для всех панелей |
| [`frontend/TEAM-TASKS.md`](frontend/TEAM-TASKS.md) | Контракты API для фронта по панелям |
| [`backend/TASKS.md`](backend/TASKS.md) | ⚠️ Исторический: деление зон и решения A1–A8. Статусы оттуда не читать |
| [Backend Diagrams](docs/diagrams/Backend-Architecture-Diagrams.md) · [Frontend Diagrams](docs/diagrams/Frontend-Architecture-Diagrams.md) | Mermaid-схемы, рендерятся прямо на GitHub |
| [`swagger/`](swagger/) | Сгенерированная документация API — 158 endpoint, покрытие 100% |

---

## 🛠️ Стек

| Слой | Технология |
|---|---|
| Backend | Node.js + Express (ES Modules) |
| База данных | PostgreSQL (node-pg-migrate) |
| Кэш / очереди / presence | Redis + BullMQ |
| Realtime | Socket.io (redis-adapter) |
| Файлы | MinIO / AWS S3 (presigned URLs) |
| Уведомления | Telegram Bot (grammY) через очередь |
| Frontend | React 18 + Vite + Tailwind + DaisyUI, TanStack Query |
| Деплой | Render (backend) + Vercel (frontend) |

Фронт — **не монолит**, а 4 независимых Vite-приложения:
`landing-page` · `main-admin` · `staff` (Admin + CEO + Mentor + Methodist) ·
`member` (вход + кабинеты Student и Parent).

---

## 🚀 Запуск

```bash
# Backend
cd backend
cp .env.example .env          # JWT_ACCESS_SECRET — минимум 32 символа
docker compose up -d          # Postgres 16, Redis 7, MinIO, Mailpit
npm install && npm run migrate && npm run seed
npm run dev                   # API
npm run worker:dev            # воркеры очередей — без них уведомления и счета не работают

# Frontend (любое из приложений)
cd frontend/staff && npm install && npm run dev
```

ℹ️ Кабинет ученика отдельным приложением не запускается — он внутри `frontend/member`
(роуты `/student`, `/lessons`, `/tests`, `/homework`, `/videos`, `/shop`, `/leaderboard`).
Приложение `frontend/student` удалено 04.08.2026 как дубль.

⚠️ `backend/.env` должен указывать на **локальный** Postgres. Если там окажется строка Neon —
`npm run seed` запишет демо-данные прямо в прод.

---

## 📐 Ключевые архитектурные правила

- **Мульти-аренда двухуровневая** — `organization_id` → `branch_id`; каждый запрос фильтруется
  по `req.scope`, никогда не по значению из клиента
- **Invoice ↔ Transactions** — сплит-платёж = один счёт + N транзакций с общим `split_batch_id`
- **Nasiya (рассрочка) в v1 НЕТ** — решение 05–07.07.2026, долги ведутся через `total_debt`.
  Click/Payme/UzCard/Humo — только v3
- **`coin_history` append-only** — баланс меняется только через `changeCoins()`, никаких прямых UPDATE
- **Архив ≠ удаление** — `is_archived` = read-only (мутации → 403), `deleted_at` = soft-delete
- **Всё внешнее — через очередь** — HTTP-запрос никогда не ждёт Telegram или SMTP
  (единственное исключение: OTP при входе)

---

## 🌿 Ветки

`main` ← `save-zone` ← ветки участников. Мержит только Team Lead (Karis).
Прямой push в `main` запрещён. Подробности — в [`CLAUDE.md`](CLAUDE.md).
