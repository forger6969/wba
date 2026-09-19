# Admin Reports

K-PAY: branch revenue/debt report by group

[← back to index](./README.md)

### GET `/api/admin/reports`
Branch revenue + debt report, optionally scoped to a date range, broken down by group

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `from` (query, string) (optional)
- `to` (query, string) (optional)

**Responses:**

- **200** — Report data
  - `period` (optional):
    - `from`: string (date-time) (optional)
    - `to`: string (date-time) (optional)
  - `totals` (optional):
    - `revenue`: number (optional)
    - `debt`: number (optional)
    - `currency`: string (optional) _e.g. "UZS"_
  - `byGroup` (optional):
    - _array of:_
      - `groupId`: string (uuid) (optional)
      - `groupName`: string (optional)
      - `revenue`: number (optional)
      - `debt`: number (optional)
      - `students`: integer (optional)

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
