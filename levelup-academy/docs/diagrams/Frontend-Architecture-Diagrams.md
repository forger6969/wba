# LevelUp Academy Frontend Architecture — Diagrams

Visual architecture of the LevelUp Academy client: app shell, role routing, data flow, auth refresh, socket lifecycle and file uploads. All diagrams are Mermaid — GitHub renders them natively.

> [!NOTE]
> Full spec with code: [FRONTEND-ARCHITECTURE.md](../FRONTEND-ARCHITECTURE.md). This file is the visual map.

---

## App Shell & Role Routing

```mermaid
flowchart TD
    ENTRY[main.jsx] --> APP[App.jsx<br/>Router + QueryClient + Theme]
    APP --> LOGIN[/login/]
    APP --> PR{ProtectedRoute<br/>token?}
    PR -- no --> LOGIN
    PR -- yes --> RG{RoleGuard<br/>user.role}

    RG -- student --> SL[StudentLayout]
    RG -- parent --> PL[ParentLayout]
    RG -- mentor --> ML[MentorLayout]
    RG -- admin --> AL[AdminLayout]
    RG -- ceo --> SAL[CEOLayout]

    SL --> S1[Home] & S2[Shop] & S3[Test] & S4[Homework] & S5[Video] & S6[Leaderboard]
    PL --> P1[Child: attendance / scores / debt] & P2[Chat]
    ML --> M1[Davomat] & M2[Grading] & M3[Coins ±] & M4[Exams] & M5[Salary]
    AL --> A1[Dashboard + live online] & A2[Payments] & A3[Groups/Students] & A4[Reports] & A5[Chat]
    SAL --> G1[Global Dashboard: all branches]
```

> [!TIP]
> **Code-splitting per role.** Each layout is `lazy()` — a student never downloads admin code. After login: `navigate(HOME_BY_ROLE[user.role])`.

---

## Data Flow (two state layers)

```mermaid
flowchart LR
    subgraph SERVER_STATE["Server state — TanStack Query"]
        QK[(Query cache<br/>groups, invoices, homework...)]
    end
    subgraph CLIENT_STATE["Client state — Redux Toolkit"]
        AS[authSlice<br/>user + accessToken in memory]
        US[uiSlice<br/>theme, modals, online count]
    end

    CMP[Components] -- useQuery / useMutation --> QK
    CMP -- useSelector / useDispatch --> AS & US
    QK -- axios --> API[Express API]
    MUT[Mutation success] -- invalidateQueries --> QK
    SOCK[Socket events] -- setState --> US
```

| Layer | Tool | Holds |
|---|---|---|
| Server state | TanStack Query | Everything from the API (cache, refetch, invalidation) |
| Client state | Redux Toolkit | auth session, theme, modals, socket status |

---

## Auth: Login & Silent Refresh (rotation)

```mermaid
sequenceDiagram
    participant U as User
    participant SPA as React SPA
    participant API as Express API

    U->>SPA: login(phone, password)
    SPA->>API: POST /auth/login
    API-->>SPA: accessToken (15m) + user<br/>Set-Cookie: refresh (httpOnly, 30d)
    SPA->>SPA: token → Redux store (memory only)

    Note over SPA,API: ...15 minutes later...

    SPA->>API: GET /api/... (expired token)
    API-->>SPA: 401
    SPA->>API: POST /auth/refresh (cookie)
    API->>API: rotate: revoke old, issue new pair
    API-->>SPA: new accessToken + Set-Cookie
    SPA->>API: retry original request
    API-->>SPA: 200

    Note over SPA: parallel 401s share ONE<br/>refreshPromise — no storm
```

> [!IMPORTANT]
> **403 from archiveGuard.** The interceptor recognises the archived-entity 403 and fires a global toast — «Архив, только чтение» — instead of logging the user out.

---

## Socket Lifecycle & Live Online

```mermaid
flowchart TD
    LOGIN[Login success] --> CS[connectSocket<br/>singleton + JWT]
    CS --> ROLE{user.role}

    ROLE -- student --> PO[emit presence:online]
    PO --> HB[heartbeat every 25s]

    ROLE -- admin / ceo --> DASH[join dashboards room]
    DASH --> CNT[on presence:count → uiSlice]
    CNT --> UI[Live counter on dashboard<br/>aria-live]

    ROLE -- global roles --> GJ[join global chat]
    ROLE -- parent --> PJ[join parent:id room]

    LOGOUT[Logout] --> DS[disconnectSocket<br/>clear heartbeat]
    REFRESH[Token refreshed] --> RC[reconnect with new JWT]
```

Chat events (match backend): `chat:global:send` → `chat:global:message`, `chat:parent:send` → `chat:parent:message`; history via REST `GET /api/chat/:roomKey/messages?cursor=`.

---

## File Upload (presigned) & Protected Video

```mermaid
sequenceDiagram
    participant ST as Student (SPA)
    participant API as Express API
    participant S3 as MinIO / S3

    rect rgb(230, 240, 255)
    Note over ST,S3: Homework upload
    ST->>API: POST /uploads/presign {purpose, fileName, type}
    API-->>ST: uploadUrl + objectKey
    ST->>S3: PUT file (direct, no API proxy)
    ST->>API: POST /homework/:id/submissions {objectKey}
    end

    rect rgb(255, 245, 230)
    Note over ST,S3: Watch video
    ST->>API: GET /videos/:id/url
    API->>API: check group membership
    API-->>ST: presigned GET URL (TTL 2h)
    ST->>S3: stream <video src=signedUrl>
    end
```

---

## Theming (CSS Variables + DaisyUI)

```mermaid
flowchart LR
    T[Theme toggle] --> UST[uiSlice.theme]
    UST --> DOM["html data-theme='dark'"]
    UST --> LS[(localStorage)]
    DOM --> VARS[":root / [data-theme] CSS variables<br/>--color-primary, --radius-card..."]
    VARS --> TW["Tailwind tokens<br/>rgb(var(--x) / alpha)"]
    VARS --> DUI[DaisyUI components]
    TW & DUI --> UI[Consistent UI, no rebuild]
```

---

## Exam Timer (server-authoritative)

```mermaid
sequenceDiagram
    participant ST as Student
    participant API as Express API

    ST->>API: POST /tests/:id/start
    API->>API: check window starts_at..ends_at
    API-->>ST: questions (no answers) + finishedBy
    Note over ST: countdown = finishedBy - now<br/>display only
    ST->>API: POST /tests/:id/submit {answers}
    alt before finishedBy
        API-->>ST: score + coins
    else after finishedBy
        API-->>ST: 409 rejected (server clock wins)
    end
```

---

## See also

- [Backend Diagrams](Backend-Architecture-Diagrams.md) — server-side counterpart
- [FRONTEND-ARCHITECTURE.md](../FRONTEND-ARCHITECTURE.md) — full specification with code
