# LevelUp Academy Backend Architecture — Diagrams

Visual architecture of the LevelUp Academy backend: system overview, data model, payment flows, gamification, presence and the notification queue. All diagrams are Mermaid — GitHub renders them natively.

> [!NOTE]
> Full spec with DDL and code: [BACKEND-ARCHITECTURE.md](../BACKEND-ARCHITECTURE.md). This file is the visual map.

---

## System Overview

```mermaid
flowchart LR
    SPA[React SPA]

    subgraph API["API Server (Express)"]
        REST[REST Controllers]
        MW[Middlewares<br/>auth / RBAC / archiveGuard]
        SIO[Socket.io]
    end

    subgraph DATA["Data Layer"]
        PG[(PostgreSQL<br/>money, coins, audit)]
        RD[(Redis<br/>presence, ZSET, cache)]
        S3[(MinIO / S3<br/>videos, files, receipts)]
    end

    subgraph BG["Worker Process"]
        Q[[BullMQ Queue<br/>notifications]]
        W[Notification Worker]
        CRON[Overdue Cron]
    end

    TG[Telegram Bot API]

    SPA -- HTTPS / axios --> MW --> REST
    SPA <-- WebSocket --> SIO
    REST --> PG
    REST --> RD
    REST -- presigned URL --> S3
    SIO --> RD
    REST -- add job --> Q
    CRON -- add job --> Q
    Q --> W
    W --> PG
    W --> TG
```

> [!IMPORTANT]
> **Two processes.** `server.js` (API + sockets) and `worker.js` (queue consumer + cron) run separately. A Telegram outage never blocks an HTTP request — jobs just wait in Redis.

---

## Data Model (core ER)

```mermaid
erDiagram
    BRANCHES ||--o{ USERS : "branch_id"
    BRANCHES ||--o{ GROUPS : "branch_id"
    BRANCHES ||--o{ INVOICES : "branch_id"

    USERS ||--o| STUDENT_PROFILES : "1:1 (role=student)"
    USERS ||--o{ GROUPS : "mentor_id"
    STUDENT_PROFILES }o--|| USERS : "parent_id (role=parent)"

    GROUPS ||--o{ GROUP_STUDENTS : ""
    USERS ||--o{ GROUP_STUDENTS : "student"

    USERS ||--o{ INVOICES : "student"
    INVOICES ||--o{ TRANSACTIONS : "1..N (split)"
    INVOICES ||--o{ PAYMENT_SCHEDULES : "nasiya plan"
    PAYMENT_SCHEDULES |o--o| TRANSACTIONS : "paid_transaction_id"

    USERS ||--o{ COIN_HISTORY : "student / actor"
    USERS ||--o{ CHAT_MESSAGES : "sender"
    USERS ||--o{ ATTENDANCE : "student"
    GROUPS ||--o{ ATTENDANCE : ""
    GROUPS ||--o{ HOMEWORK : ""
    HOMEWORK ||--o{ HOMEWORK_SUBMISSIONS : ""
    GROUPS ||--o{ TESTS : ""
    TESTS ||--o{ TEST_RESULTS : ""
    USERS ||--o| TELEGRAM_ACCOUNTS : "tg_chat_id"
```

| Rule | Meaning |
|---|---|
| `branch_id` everywhere | Multi-tenancy ready from day one (seeded Main Branch) |
| `is_archived` vs `deleted_at` | Archive = read-only (GET ok, mutations 403); soft-delete = hidden |
| `NUMERIC(12,2)` | Money is never float |
| `coin_history` append-only | Audit trail; balance is a derived cache |

---

## Split Payment Flow (Cash + Card)

```mermaid
sequenceDiagram
    participant A as Admin (SPA)
    participant API as Express /api/payments
    participant PG as PostgreSQL
    participant Q as BullMQ (Redis)
    participant W as Worker
    participant TG as Telegram

    A->>API: POST { total, parts: [cash 50%, card 50%] }
    API->>API: validate: sum(parts) == total
    API->>PG: BEGIN
    API->>PG: SELECT student FOR UPDATE
    API->>PG: INSERT invoice (type=split, status=paid)
    API->>PG: INSERT transaction (cash) + (card)<br/>same split_batch_id
    API->>PG: UPDATE student_profiles SET total_debt -= total
    API->>PG: COMMIT
    API->>Q: add job "payment.received"
    API-->>A: 201 { invoice, transactions }
    Q->>W: job
    W->>PG: resolve parent tg_chat_id
    W->>TG: "✅ Оплата принята"
```

> [!WARNING]
> **Queue after COMMIT only.** The notification job is enqueued strictly after `COMMIT` — otherwise a rolled-back payment could still notify the parent.

---

## Halol Nasiya (Installments)

```mermaid
flowchart TD
    C[Create installment invoice] --> S[Generate payment_schedules<br/>seq 1..N, monthly due_date]
    S --> U1[upcoming]
    U1 -- due_date reached --> D[due]
    D -- payment --> P[paid ✅]
    U1 -- payment early --> P
    D -- cron: due_date passed --> O[overdue ⚠️]
    O -- payment --> P
    O -- daily cron --> N[[queue: debt.overdue]]
    N --> T[Telegram alert to Parent]
    P -- all rows paid --> INV[invoice.status = paid]
    P -- some remain --> PART[invoice.status = partially_paid]
```

---

## Coins & Leaderboards

```mermaid
flowchart LR
    M[Mentor: ±coins + reason] --> TX{{SQL Transaction}}
    TX --> B[UPDATE coin_balance<br/>guard: balance >= 0]
    TX --> H[INSERT coin_history<br/>who / when / how much / why]
    TX -- COMMIT --> AFTER[after commit]
    AFTER --> Z[Redis ZINCRBY<br/>leaderboard:week + :month]
    AFTER --> QN[[queue: coins.changed]]
    QN --> TGS[Telegram to Student/Parent]
    Z --> LB[GET /leaderboard<br/>ZREVRANGE from Redis]
```

> [!TIP]
> **Fraud-proof by construction.** Balance and audit row change in the **same transaction** — one cannot exist without the other. `balance_after` in each history row makes tampering detectable.

---

## Presence (Live Online Counter)

```mermaid
sequenceDiagram
    participant S as Student (socket)
    participant IO as Socket.io
    participant R as Redis
    participant D as CEO/Admin Dashboard

    S->>IO: connect (JWT)
    S->>IO: presence:online
    IO->>R: SET online_students:{id} EX 60 + SADD set
    IO->>D: presence:count {n} (room: dashboards)
    loop every 25s
        S->>IO: presence:heartbeat
        IO->>R: EXPIRE key 60
    end
    S--xIO: disconnect / crash
    Note over R: TTL expires → key dies on its own
    IO->>R: DEL key + SREM (on clean disconnect)
    IO->>D: presence:count {n-1}
```

---

## Request Pipeline (middlewares)

```mermaid
flowchart LR
    REQ[Request] --> RL[rateLimiter] --> AU[authenticate<br/>JWT → req.user]
    AU --> AZ[authorize<br/>roles + branch scope]
    AZ --> AG{archiveGuard<br/>mutation on archived?}
    AG -- yes --> E403[403 Forbidden]
    AG -- no --> V[validate zod] --> CTRL[Controller] --> RES[Response]
    CTRL -. throw .-> EH[errorHandler] --> RES
```

---

## See also

- [Frontend Diagrams](Frontend-Architecture-Diagrams.md) — client-side counterpart
- [BACKEND-ARCHITECTURE.md](../BACKEND-ARCHITECTURE.md) — full specification with code
