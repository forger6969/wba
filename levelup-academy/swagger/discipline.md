# Discipline

Дисциплина сотрудников: штрафы (shtraf) + увольнение (qora) + устав организации

[← back to index](./README.md)

### GET `/api/admin/penalties`
List penalties issued by this admin

**Auth:** Bearer JWT required
**Role(s):** authenticated

**Params:**
- `targetUserId` (query, string) (optional)
- `type` (query, string) (optional)

**Responses:**

- **200** — Penalty list
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - _array of:_
      - **Penalty**:
        - `id`: string (uuid) (optional)
        - `type`: enum: `sariq` | `qizil` | `qora` (optional)
        - `amount`: number (optional) — необязательна для любого типа
        - `reason`: string (optional)
        - `created_at`: string (date-time) (optional)
        - `target_user_id`: string (uuid) (optional)
        - `target_role`: enum: `admin` | `mentor` | `methodist` (optional)
        - `target_name`: string (optional)
        - `issued_by`: string (uuid) (optional)
        - `issuer_role`: enum: `ceo` | `admin` (optional)
        - `issued_by_name`: string (optional)

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

### POST `/api/admin/penalties`
Issue penalty — Admin → mentor/methodist (shtraf), mentor (qora)

Ментор только своего филиала. Права проверяются в discipline.service.

**Auth:** Bearer JWT required
**Role(s):** authenticated

**Request body:**
- **IssuePenaltyRequest**:
  - `targetUserId`: string (uuid) **(required)** — Сотрудник: admin / mentor / methodist
  - `type`: enum: `sariq` | `qizil` | `qora` **(required)** — sariq = жёлтое, qizil = красное предупреждение, qora = увольнение
  - `amount`: number (optional) — Сумма в сумах — необязательный довесок к любому уровню, без автосписания
  - `reason`: string **(required)**

**Responses:**

- **201** — Penalty created
  - **IssuePenaltyResponse**:
    - `success`: boolean (optional) _e.g. true_
    - `data` (optional):
      - `penalty` (optional):
        - **Penalty**:
          - `id`: string (uuid) (optional)
          - `type`: enum: `sariq` | `qizil` | `qora` (optional)
          - `amount`: number (optional) — необязательна для любого типа
          - `reason`: string (optional)
          - `created_at`: string (date-time) (optional)
          - `target_user_id`: string (uuid) (optional)
          - `target_role`: enum: `admin` | `mentor` | `methodist` (optional)
          - `target_name`: string (optional)
          - `issued_by`: string (uuid) (optional)
          - `issuer_role`: enum: `ceo` | `admin` (optional)
          - `issued_by_name`: string (optional)
      - `fired`: boolean (optional) — true если это qora (сотрудник уволен, status=fired)

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

- **404** — Resource not found (or not in caller's organization/scope)
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **409** — Conflict with current state (e.g. already fired / not fired)
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

### GET `/api/super/discipline-rules`
List organization discipline rules (qoyda catalog)

**Auth:** Bearer JWT required
**Role(s):** authenticated

**Responses:**

- **200** — Rules

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

### POST `/api/super/discipline-rules`
Create a discipline rule (violation -> sariq/qizil/qora)

**Auth:** Bearer JWT required
**Role(s):** authenticated

**Request body:**
- `type`: enum: `sariq` | `qizil` | `qora` (optional)
- `amount`: number (optional) — Необязательный довесок к любому уровню
- `description`: string (optional)

**Responses:**

- **201** — Created

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

### DELETE `/api/super/discipline-rules/{id}`
Delete a discipline rule

**Auth:** Bearer JWT required
**Role(s):** authenticated

**Params:**
- `id` (path, string) **(required)**

**Responses:**

- **200** — Deleted

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

- **404** — Resource not found (or not in caller's organization/scope)
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### GET `/api/super/penalties`
List penalties in the organization

**Auth:** Bearer JWT required
**Role(s):** authenticated

**Params:**
- `targetUserId` (query, string) (optional)
- `type` (query, string) (optional)

**Responses:**

- **200** — Penalty list
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - _array of:_
      - **Penalty**:
        - `id`: string (uuid) (optional)
        - `type`: enum: `sariq` | `qizil` | `qora` (optional)
        - `amount`: number (optional) — необязательна для любого типа
        - `reason`: string (optional)
        - `created_at`: string (date-time) (optional)
        - `target_user_id`: string (uuid) (optional)
        - `target_role`: enum: `admin` | `mentor` | `methodist` (optional)
        - `target_name`: string (optional)
        - `issued_by`: string (uuid) (optional)
        - `issuer_role`: enum: `ceo` | `admin` (optional)
        - `issued_by_name`: string (optional)

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

### POST `/api/super/penalties`
Issue a warning (sariq/qizil) or fire (qora) a staff member

CEO → admin / mentor / methodist. amount — необязательный довесок к любому из трёх уровней, не отдельная категория. qora ставит целевому status=fired (атомарно).


**Auth:** Bearer JWT required
**Role(s):** authenticated

**Request body:**
- **IssuePenaltyRequest**:
  - `targetUserId`: string (uuid) **(required)** — Сотрудник: admin / mentor / methodist
  - `type`: enum: `sariq` | `qizil` | `qora` **(required)** — sariq = жёлтое, qizil = красное предупреждение, qora = увольнение
  - `amount`: number (optional) — Сумма в сумах — необязательный довесок к любому уровню, без автосписания
  - `reason`: string **(required)**

**Responses:**

- **201** — Penalty created
  - **IssuePenaltyResponse**:
    - `success`: boolean (optional) _e.g. true_
    - `data` (optional):
      - `penalty` (optional):
        - **Penalty**:
          - `id`: string (uuid) (optional)
          - `type`: enum: `sariq` | `qizil` | `qora` (optional)
          - `amount`: number (optional) — необязательна для любого типа
          - `reason`: string (optional)
          - `created_at`: string (date-time) (optional)
          - `target_user_id`: string (uuid) (optional)
          - `target_role`: enum: `admin` | `mentor` | `methodist` (optional)
          - `target_name`: string (optional)
          - `issued_by`: string (uuid) (optional)
          - `issuer_role`: enum: `ceo` | `admin` (optional)
          - `issued_by_name`: string (optional)
      - `fired`: boolean (optional) — true если это qora (сотрудник уволен, status=fired)

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

- **404** — Resource not found (or not in caller's organization/scope)
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **409** — Conflict with current state (e.g. already fired / not fired)
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

### POST `/api/super/staff/{id}/reactivate`
Reactivate a fired staff member (qora → active)

**Auth:** Bearer JWT required
**Role(s):** authenticated

**Params:**
- `id` (path, string) **(required)**

**Responses:**

- **200** — Reactivated
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - `id`: string (uuid) (optional)
    - `status`: string (optional) _e.g. "active"_

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

- **404** — Resource not found (or not in caller's organization/scope)
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **409** — Conflict with current state (e.g. already fired / not fired)
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### GET `/api/users/me/discipline-rules`
Organization discipline rules catalog (staff self-view, read-only)

**Auth:** Bearer JWT required
**Role(s):** authenticated

**Responses:**

- **200** — Rules

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

### GET `/api/users/me/penalties`
Own penalties (admin / mentor / methodist self-view)

**Auth:** Bearer JWT required
**Role(s):** authenticated

**Responses:**

- **200** — Own penalty list
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - _array of:_
      - `id`: string (uuid) (optional)
      - `type`: enum: `sariq` | `qizil` | `shtraf` | `qora` (optional)
      - `amount`: number (optional)
      - `reason`: string (optional)
      - `issuer_role`: string (optional)
      - `created_at`: string (date-time) (optional)

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
