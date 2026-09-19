# Main Admin

Platform owner: partner onboarding, pricing, leads, platform dashboard

[← back to index](./README.md)

### GET `/api/main/announcements`
Объявления платформы

Анонсы, которые владелец платформы рассылает партнёрам. Отличаются от объявлений организации (`/api/super/announcements`): здесь аудитория — сами партнёры, а не сотрудники одного центра.


**Auth:** Bearer JWT required
**Role(s):** main_admin

**Responses:**

- **200** — Список объявлений
  - `items` (optional):
    - _array of:_
      - **PlatformAnnouncement**:
        - `id`: string (uuid) (optional)
        - `title`: string (optional)
        - `body`: string (optional)
        - `targetType`: enum: `all-partners` | `all-ceo` (optional)
        - `recipientCount`: integer (optional) — Counted at send time and frozen — the audience changes later.
        - `readCount`: integer (optional) — Always 0 — read receipts do not exist in the system yet.
        - `senderName`: string (optional)
        - `createdAt`: string (date-time) (optional)
  - `total`: integer (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Authenticated but role not allowed on this endpoint
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### POST `/api/main/announcements`
Создать объявление платформы

В очередь уведомлений НЕ кладётся: адресаты — сотрудники, а привязка к Telegram-боту есть только у student/parent. Объявление показывается в панели.


**Auth:** Bearer JWT required
**Role(s):** main_admin

**Request body:**
- `title`: string **(required)**
- `body`: string **(required)**
- `targetType`: enum: `all-partners` | `all-ceo` **(required)**

**Responses:**

- **201** — Создано
  - **PlatformAnnouncement**:
    - `id`: string (uuid) (optional)
    - `title`: string (optional)
    - `body`: string (optional)
    - `targetType`: enum: `all-partners` | `all-ceo` (optional)
    - `recipientCount`: integer (optional) — Counted at send time and frozen — the audience changes later.
    - `readCount`: integer (optional) — Always 0 — read receipts do not exist in the system yet.
    - `senderName`: string (optional)
    - `createdAt`: string (date-time) (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Authenticated but role not allowed on this endpoint
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **422** — zod validation failed (body/params/query)
  - **ValidationErrorResponse**:
    - **ErrorResponse**:
      - `success`: boolean **(required)** _e.g. false_
      - `message`: string **(required)**
      - `details` (optional):
        - _(free-form object)_
      - `stack`: string (optional) — Only present when NODE_ENV=development
    - `message`: string (optional) _e.g. "Validation failed"_
    - `details` (optional):
      - _(free-form object)_

---

### DELETE `/api/main/announcements/{id}`
Удалить объявление платформы (soft-delete)

**Auth:** Bearer JWT required
**Role(s):** main_admin

**Params:**
- `id` (path, string) **(required)**

**Responses:**

- **200** — Удалено
  - `id`: string (uuid) (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Authenticated but role not allowed on this endpoint
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **404** — Объявление не найдено
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### GET `/api/main/dashboard`
Platform-wide dashboard (aggregated totals across all partners)

Our platform revenue = sum of each partner's computed monthly bill.

**Auth:** Bearer JWT required
**Role(s):** main_admin

**Responses:**

- **200** — Dashboard data
  - `totals` (optional):
    - `partners`: integer (optional)
    - `students`: integer (optional)
    - `branches`: integer (optional)
    - `ourMonthlyIncome`: number (optional)
    - `currency`: string (optional) _e.g. "UZS"_
  - `pricing` (optional):
    - **PlatformPricing**:
      - `tiers` (optional):
        - _array of:_
          - `id`: string (optional) _e.g. "standard"_
          - `label`: string (optional) _e.g. "Standard"_
          - `minStudents`: integer (optional) _e.g. 101_
          - `maxStudents`: integer (optional) — null = no upper bound (Network tier) _e.g. 300_
          - `price`: integer (optional) — UZS/month. null = negotiated individually (Network tier) _e.g. 349000_
      - `currency`: string (optional) _e.g. "UZS"_
  - `partners` (optional):
    - _array of:_
      - **PartnerSummary**:
        - `id`: string (uuid) (optional)
        - `name`: string (optional)
        - `plan`: string (optional)
        - `domain`: string (optional)
        - `status`: enum: `active` | `frozen` (optional)
        - `createdAt`: string (date-time) (optional)
        - `branches`: integer (optional)
        - `students`: integer (optional)
        - `monthlyBill`: number (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Authenticated but role not allowed on this endpoint
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### GET `/api/main/leads`
List landing-page leads, optionally filtered by status

**Auth:** Bearer JWT required
**Role(s):** main_admin

**Params:**
- `status` (query, string) (optional)

**Responses:**

- **200** — List of leads
  - `leads` (optional):
    - _array of:_
      - **Lead**:
        - `id`: string (uuid) (optional)
        - `name`: string (optional)
        - `phone`: string (optional)
        - `centerName`: string (optional)
        - `centerSize`: string (optional)
        - `message`: string (optional)
        - `status`: enum: `new` | `contacted` | `onboarded` | `rejected` (optional)
        - `notes`: string (optional)
        - `organizationId`: string (uuid) (optional)
        - `createdAt`: string (date-time) (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Authenticated but role not allowed on this endpoint
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **422** — zod validation failed (body/params/query)
  - **ValidationErrorResponse**:
    - **ErrorResponse**:
      - `success`: boolean **(required)** _e.g. false_
      - `message`: string **(required)**
      - `details` (optional):
        - _(free-form object)_
      - `stack`: string (optional) — Only present when NODE_ENV=development
    - `message`: string (optional) _e.g. "Validation failed"_
    - `details` (optional):
      - _(free-form object)_

---

### PATCH `/api/main/leads/{id}`
Update a lead's status and/or notes (partial — at least one field)

**Auth:** Bearer JWT required
**Role(s):** main_admin

**Params:**
- `id` (path, string) **(required)**

**Request body:**
- **LeadUpdateRequest**:
  - `status`: enum: `new` | `contacted` | `onboarded` | `rejected` (optional)
  - `notes`: string (optional)

**Responses:**

- **200** — Updated lead
  - `lead` (optional):
    - **Lead**:
      - `id`: string (uuid) (optional)
      - `name`: string (optional)
      - `phone`: string (optional)
      - `centerName`: string (optional)
      - `centerSize`: string (optional)
      - `message`: string (optional)
      - `status`: enum: `new` | `contacted` | `onboarded` | `rejected` (optional)
      - `notes`: string (optional)
      - `organizationId`: string (uuid) (optional)
      - `createdAt`: string (date-time) (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Authenticated but role not allowed on this endpoint
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **404** — Lead not found
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **422** — zod validation failed (body/params/query)
  - **ValidationErrorResponse**:
    - **ErrorResponse**:
      - `success`: boolean **(required)** _e.g. false_
      - `message`: string **(required)**
      - `details` (optional):
        - _(free-form object)_
      - `stack`: string (optional) — Only present when NODE_ENV=development
    - `message`: string (optional) _e.g. "Validation failed"_
    - `details` (optional):
      - _(free-form object)_

---

### POST `/api/main/partners`
Onboard a new partner (organization + its CEO)

Creates the organization and its CEO user in one transaction, sets the org owner, and (if `leadId` given) marks that lead as onboarded and links it to the new organization. Returns a one-time temp password for the new CEO (must be relayed to the partner out-of-band; they reset it via forgot-password afterwards).


**Auth:** Bearer JWT required
**Role(s):** main_admin

**Request body:**
- **OnboardPartnerRequest**:
  - `organizationName`: string **(required)**
  - `domain`: string (optional) _e.g. "marsit-school.us"_
  - `leadId`: string (uuid) (optional)
  - `admin` **(required)**:
    - `firstName`: string **(required)**
    - `lastName`: string **(required)**
    - `email`: string (email) **(required)**
    - `phone`: string (optional)

**Responses:**

- **201** — Partner onboarded
  - `organization` (optional):
    - `id`: string (uuid) (optional)
    - `name`: string (optional)
    - `plan`: string (optional)
    - `domain`: string (optional)
    - `status`: string (optional)
    - `created_at`: string (date-time) (optional)
  - `ceo` (optional):
    - `id`: string (uuid) (optional)
    - `firstName`: string (optional)
    - `lastName`: string (optional)
    - `email`: string (email) (optional)
  - `tempPassword`: string (optional) — One-time temp password, shown only in this response

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Authenticated but role not allowed on this endpoint
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **409** — Domain already taken, or email already in use
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **422** — zod validation failed (body/params/query)
  - **ValidationErrorResponse**:
    - **ErrorResponse**:
      - `success`: boolean **(required)** _e.g. false_
      - `message`: string **(required)**
      - `details` (optional):
        - _(free-form object)_
      - `stack`: string (optional) — Only present when NODE_ENV=development
    - `message`: string (optional) _e.g. "Validation failed"_
    - `details` (optional):
      - _(free-form object)_

---

### GET `/api/main/partners`
List all partner organizations with computed billing

For each org, computes `branches`, `students` counts and `monthlyBill` (via computeBill against current platform pricing).


**Auth:** Bearer JWT required
**Role(s):** main_admin

**Responses:**

- **200** — List of partners
  - `partners` (optional):
    - _array of:_
      - **PartnerSummary**:
        - `id`: string (uuid) (optional)
        - `name`: string (optional)
        - `plan`: string (optional)
        - `domain`: string (optional)
        - `status`: enum: `active` | `frozen` (optional)
        - `createdAt`: string (date-time) (optional)
        - `branches`: integer (optional)
        - `students`: integer (optional)
        - `monthlyBill`: number (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Authenticated but role not allowed on this endpoint
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### PATCH `/api/main/partners/{id}/status`
Activate or freeze a partner organization

**Auth:** Bearer JWT required
**Role(s):** main_admin

**Params:**
- `id` (path, string) **(required)**

**Request body:**
- `status`: enum: `active` | `frozen` **(required)**

**Responses:**

- **200** — Partner status updated
  - `partner` (optional):
    - `id`: string (uuid) (optional)
    - `name`: string (optional)
    - `status`: string (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Authenticated but role not allowed on this endpoint
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **404** — Partner not found
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **422** — zod validation failed (body/params/query)
  - **ValidationErrorResponse**:
    - **ErrorResponse**:
      - `success`: boolean **(required)** _e.g. false_
      - `message`: string **(required)**
      - `details` (optional):
        - _(free-form object)_
      - `stack`: string (optional) — Only present when NODE_ENV=development
    - `message`: string (optional) _e.g. "Validation failed"_
    - `details` (optional):
      - _(free-form object)_

---

### GET `/api/main/pricing`
Get current platform pricing (per-partner billing formula, in UZS)

**Auth:** Bearer JWT required
**Role(s):** main_admin

**Responses:**

- **200** — Current pricing
  - `pricing` (optional):
    - **PlatformPricing**:
      - `tiers` (optional):
        - _array of:_
          - `id`: string (optional) _e.g. "standard"_
          - `label`: string (optional) _e.g. "Standard"_
          - `minStudents`: integer (optional) _e.g. 101_
          - `maxStudents`: integer (optional) — null = no upper bound (Network tier) _e.g. 300_
          - `price`: integer (optional) — UZS/month. null = negotiated individually (Network tier) _e.g. 349000_
      - `currency`: string (optional) _e.g. "UZS"_

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Authenticated but role not allowed on this endpoint
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### PUT `/api/main/pricing`
Update platform pricing (partial — at least one field required)

**Auth:** Bearer JWT required
**Role(s):** main_admin

**Request body:**
- **UpdatePricingRequest**:
  - _(free-form object)_

**Responses:**

- **200** — Updated pricing
  - `pricing` (optional):
    - **PlatformPricing**:
      - `tiers` (optional):
        - _array of:_
          - `id`: string (optional) _e.g. "standard"_
          - `label`: string (optional) _e.g. "Standard"_
          - `minStudents`: integer (optional) _e.g. 101_
          - `maxStudents`: integer (optional) — null = no upper bound (Network tier) _e.g. 300_
          - `price`: integer (optional) — UZS/month. null = negotiated individually (Network tier) _e.g. 349000_
      - `currency`: string (optional) _e.g. "UZS"_

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Authenticated but role not allowed on this endpoint
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **422** — zod validation failed (body/params/query)
  - **ValidationErrorResponse**:
    - **ErrorResponse**:
      - `success`: boolean **(required)** _e.g. false_
      - `message`: string **(required)**
      - `details` (optional):
        - _(free-form object)_
      - `stack`: string (optional) — Only present when NODE_ENV=development
    - `message`: string (optional) _e.g. "Validation failed"_
    - `details` (optional):
      - _(free-form object)_

---

### GET `/api/main/profile`
Профиль владельца платформы

**Auth:** Bearer JWT required
**Role(s):** main_admin

**Responses:**

- **200** — Профиль
  - `profile` (optional):
    - **MainProfile**:
      - `id`: string (uuid) (optional)
      - `firstName`: string (optional)
      - `lastName`: string (optional)
      - `email`: string (email) (optional)
      - `phone`: string (optional)
      - `role`: string (optional) _e.g. "main_admin"_

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Authenticated but role not allowed on this endpoint
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### PATCH `/api/main/profile`
Изменить профиль владельца платформы

Частичное обновление. Email и телефон уникальны среди пользователей — при конфликте возвращается 409, а не сырая ошибка БД.


**Auth:** Bearer JWT required
**Role(s):** main_admin

**Request body:**
- `firstName`: string (optional)
- `lastName`: string (optional)
- `email`: string (email) (optional)
- `phone`: string (optional) _e.g. "+998901234567"_

**Responses:**

- **200** — Обновлено
  - `profile` (optional):
    - **MainProfile**:
      - `id`: string (uuid) (optional)
      - `firstName`: string (optional)
      - `lastName`: string (optional)
      - `email`: string (email) (optional)
      - `phone`: string (optional)
      - `role`: string (optional) _e.g. "main_admin"_

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Authenticated but role not allowed on this endpoint
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **409** — Email или телефон уже заняты
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **422** — zod validation failed (body/params/query)
  - **ValidationErrorResponse**:
    - **ErrorResponse**:
      - `success`: boolean **(required)** _e.g. false_
      - `message`: string **(required)**
      - `details` (optional):
        - _(free-form object)_
      - `stack`: string (optional) — Only present when NODE_ENV=development
    - `message`: string (optional) _e.g. "Validation failed"_
    - `details` (optional):
      - _(free-form object)_

---

### GET `/api/main/revenue`
Platform revenue detail — our income (sum of partner bills) + per-partner billing

Our monthly income = sum of each partner's computed bill (by student count). Read-only over money tables — writes nothing.


**Auth:** Bearer JWT required
**Role(s):** main_admin

**Responses:**

- **200** — Revenue detail
  - `totals` (optional):
    - `partners`: integer (optional)
    - `activePartners`: integer (optional)
    - `students`: integer (optional)
    - `branches`: integer (optional)
    - `ourMonthlyIncome`: number (optional)
    - `currency`: string (optional) _e.g. "UZS"_
  - `partners` (optional):
    - _array of:_
      - _(free-form object)_
  - `pricing` (optional):
    - **PlatformPricing**:
      - `tiers` (optional):
        - _array of:_
          - `id`: string (optional) _e.g. "standard"_
          - `label`: string (optional) _e.g. "Standard"_
          - `minStudents`: integer (optional) _e.g. 101_
          - `maxStudents`: integer (optional) — null = no upper bound (Network tier) _e.g. 300_
          - `price`: integer (optional) — UZS/month. null = negotiated individually (Network tier) _e.g. 349000_
      - `currency`: string (optional) _e.g. "UZS"_

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Authenticated but role not allowed on this endpoint
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---
