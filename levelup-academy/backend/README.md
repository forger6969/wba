# LevelUp Academy — Backend

Multi-tenant Educational CRM (SaaS). Express + PostgreSQL + Redis + Socket.io + BullMQ + MinIO/S3 + Telegram Bot.

Architecture: [`docs/BACKEND-ARCHITECTURE.md`](../docs/BACKEND-ARCHITECTURE.md) · Task split: [`TASKS.md`](./TASKS.md)

## Quick start

> ### ⚠️ Read this before running anything
>
> **Check where your `.env` points first.** These steps assume Postgres, Redis, S3
> and SMTP all run locally in Docker. That is not a given: on this project's own
> machines `DATABASE_URL` points at production Neon, `REDIS_URL` at Upstash,
> `S3_ENDPOINT` at Storj and `SMTP_HOST` at Resend.
>
> With a cloud `.env`, `docker compose up -d` starts four containers that nothing
> ever connects to — the app still talks to production. Harmless but pointless.
>
> `npm run seed` is the dangerous one. `NODE_ENV` defaults to `development`
> (`src/config/env.js`), which is exactly the branch that creates the demo
> organisation and demo students — so against a cloud `.env` it writes them into
> the live database. `src/db/seeds/seed.js` now refuses to run unless
> `DATABASE_URL` is local, but do not rely on the guard: know which database you
> are pointed at.
>
> Quick check:
> ```bash
> grep -E '^(DATABASE_URL|REDIS_URL|S3_ENDPOINT)=' .env
> ```
> Hosts that are not `localhost` mean you are on cloud services, and the Docker
> step below is not for you.

### Path A — cloud `.env` (what this project's machines actually use)

If the check above showed Neon / Upstash / Storj hosts, this is you. **No Docker,
no migrate, no seed** — those services are already running and the schema is
already applied.

```bash
npm install
npm run dev                 # API on :4000
```

### Path B — fully local `.env`

Only when `DATABASE_URL` and `REDIS_URL` point at `localhost`. Starting Docker
with a cloud `.env` just leaves four containers idling while the app talks to
production anyway.

```bash
cp .env.example .env        # fill JWT_ACCESS_SECRET (min 32 chars)
                            # keep DATABASE_URL/REDIS_URL on localhost
docker compose up -d        # Postgres 16, Redis 7, MinIO, Mailpit
npm install
npm run migrate             # apply schema
npm run seed                # main_admin + demo org/branch/ceo — LOCAL DB ONLY
npm run dev                 # API + queues/crons on :4000, one process
```

- MinIO console: http://localhost:9001 (minioadmin/minioadmin) — create bucket `levelup`
- Mailpit UI: http://localhost:8025
- Health check: http://localhost:4000/health

## Processes

| Process | Entry | Purpose |
|---|---|---|
| API | `src/server.js` | REST + Socket.io + Telegram (webhook) + BullMQ очереди/краны — единственный процесс (WORKER-MERGE, 11.08.2026) |

## Conventions

- ES Modules, feature-based structure: `routes → controller → service → repository`
- All notifications go through `notificationQueue.add(name, payload)` — never call TG/SMTP/SMS from HTTP code (exception: auth OTP)
- Coins change only via `changeCoins()` (gamification module)
- Money tables (`invoices`, `transactions`, `payment_schedules`, `expenses`, billing) — Karis's zone
- Every scoped query filters by `organization_id` + `branch_id` (when not null) and `deleted_at IS NULL`
- Branches: `karis/*`, `abdulaziz/*`; commits in English
