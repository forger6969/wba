# Mentor Coins

Mentor/Admin manual coin grants + student coin history

[← back to index](./README.md)

### POST `/api/mentor/coins`
Manually grant (positive amount) or deduct (negative amount) coins from a student

Ownership check: a mentor may only act on students enrolled in one of their own groups; an admin may only act on students in their own branch. A student outside that scope returns 404 (existence not disclosed).


**Auth:** Bearer JWT required
**Role(s):** mentor + admin

**Request body:**
- **GrantCoinsRequest**:
  - `studentId`: string (uuid) **(required)**
  - `amount`: integer **(required)** — Non-zero; positive = reward, negative = deduction
  - `reason`: string **(required)**

**Responses:**

- **201** — Coins granted/deducted
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - `balanceAfter`: integer (optional)
    - `entry` (optional):
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

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **404** — Student not found (includes students outside actor's scope)
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

### GET `/api/mentor/coins/groups/{groupId}/budget`
Remaining monthly coin allowance for a group

A mentor may hand out `coins_per_student × current group size` coins per calendar month, per group. Nothing is pre-allocated: the figure is derived on read, so enrolling a student raises the allowance immediately. Whatever is left over does not carry into the next month. Deductions made by the mentor within the same month return to the allowance; deductions of coins granted in an earlier month do not.


**Auth:** Bearer JWT required
**Role(s):** mentor + admin

**Params:**
- `groupId` (path, string) **(required)**

**Responses:**

- **200** — Budget state for the current month
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - `month`: string (optional) _e.g. "2026-07"_
    - `coinsPerStudent`: integer (optional) _e.g. 10_
    - `students`: integer (optional) _e.g. 12_
    - `allocated`: integer (optional) _e.g. 120_
    - `spent`: integer (optional) _e.g. 45_
    - `remaining`: integer (optional) _e.g. 75_

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **404** — Not your group

---

### GET `/api/mentor/coins/students/{studentId}`
Paginated coin history of a student (within actor's scope)

**Auth:** Bearer JWT required
**Role(s):** mentor + admin

**Params:**
- `studentId` (path, string) **(required)**
- `page` (query, integer) (optional)
- `limit` (query, integer) (optional)

**Responses:**

- **200** — Coin history
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - `items` (optional):
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

- **404** — Student not found (includes students outside actor's scope)
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
