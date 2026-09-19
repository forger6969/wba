# Coins

Student's own coin balance + history

[← back to index](./README.md)

### GET `/api/coins/me`
Current student's coin balance + paginated history

**Auth:** Bearer JWT required
**Role(s):** student (own balance/history)

**Params:**
- `page` (query, integer) (optional)
- `limit` (query, integer) (optional)

**Responses:**

- **200** — Balance + history
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - `balance`: integer (optional)
    - `history` (optional):
      - _array of:_
        - **CoinHistoryEntry**:
          - `id`: string (uuid) (optional)
          - `branch_id`: string (uuid) (optional)
          - `student_id`: string (uuid) (optional)
          - `actor_id`: string (uuid) (optional)
          - `operation`: enum: `reward` | `deduction` | `purchase` | `system` (optional)
          - `amount`: integer (optional)
          - `balance_after`: integer (optional)
          - `reason`: string (optional)
          - `ref_type`: string (optional)
          - `ref_id`: string (optional)
          - `created_at`: string (date-time) (optional)
    - `meta` (optional):
      - **PageMeta**:
        - `total`: integer (optional)
        - `page`: integer (optional)
        - `limit`: integer (optional)
        - `totalPages`: integer (optional)

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

- **404** — Student profile not found
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
