# LevelUp Academy — Руководство по работе с проектом

Этот каталог `.md` создан для сохранения контекста проекта, настроек, правил и источников.

## 🚀 Как запустить проект локально

### 1. Бэкенд (backend/)
Для работы бэкенда требуются PostgreSQL, Redis, MinIO (S3) и Mailpit. Они запускаются через Docker Compose (если он настроен), либо локально.
```bash
cd backend
cp .env.example .env   # настроить переменные окуржения
npm install
npm run migrate        # запустить миграции БД
npm run seed           # наполнить БД тестовыми данными
npm run dev            # запустить Express API-сервер
npm run worker:dev     # запустить фоновые воркеры очередей
```

*   **API URL:** `http://localhost:4000`
*   **Mailpit (тестовые письма):** `http://localhost:8025`

### 2. Фронтенд CEO (frontend/super-admin/)
```bash
cd frontend/super-admin
npm install
npm run dev            # запустить Vite-сервер разработки
```
*   **Адрес:** `http://localhost:5373`
*   **Прокси:** все запросы к `/api/*` автоматически перенаправляются на бэкенд (`http://localhost:4000`).

---

## 🔑 Тестовые аккаунты (после `npm run seed`)
*   **Main Admin:** `hp8187081014laptop@gmail.com` / `ChangeMe123!` (вход на `/login/main`)
*   **CEO:** `azizbekamangeldiev.2010@gmail.com` / `ChangeMe123!` (вход на `/login/staff`)
*   **Mentor:** `mentor.demo@levelup.local` / `ChangeMe123!` (вход на `/login/staff`)
*   **Student:** логин-код `demostud` / пароль `123456` (вход на `/login/member`)
*   **Parent:** логин-код `demopare` / пароль `654321` (вход на `/login/member`)
