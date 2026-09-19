# Mentor Salary

Mentor salary suggestion/records (mentor self-view; admin manages)

[← back to index](./README.md)

### POST `/api/mentor/salary`
Create or update a mentor's salary record for a period (admin only)

Only `req.user.role === 'admin'` may call this (checked in the service, not just via the router-level authorize). The target mentor must belong to the admin's own branch. Upsert is blocked with 409 if the existing record for that mentor+period is already `approved` or `paid`.


**Auth:** Bearer JWT required
**Role(s):** mentor (own record)

**Request body:**
- **UpsertSalaryRequest**:
  - `mentorId`: string (uuid) **(required)**
  - `periodMonth`: string **(required)** — YYYY-MM or YYYY-MM-DD, normalized to the 1st of the month _e.g. "2026-07"_
  - `baseAmount`: number **(required)**
  - `bonusAmount`: number (optional)
  - `note`: string (optional)

**Responses:**

- **201** — Salary record created/updated
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - **SalaryRecord**:
      - `id`: string (uuid) (optional)
      - `organization_id`: string (uuid) (optional)
      - `branch_id`: string (uuid) (optional)
      - `mentor_id`: string (uuid) (optional)
      - `period_month`: string (date) (optional)
      - `base_amount`: number (optional)
      - `bonus_amount`: number (optional)
      - `status`: enum: `draft` | `approved` | `paid` (optional)
      - `note`: string (optional)
      - `paid_at`: string (date-time) (optional)
      - `created_by`: string (uuid) (optional)
      - `created_at`: string (date-time) (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Only admin can manage mentor salaries, or mentor belongs to another branch
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **404** — Mentor not found
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **409** — Salary record is already approved/paid and cannot be edited
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

### PATCH `/api/mentor/salary/{id}/status`
Transition a salary record's status (admin only)

Allowed transitions: draft→approved, approved→paid, paid→approved (rollback of a mistaken payment mark). `paidAt` is set only while status is `paid`. Any other transition returns 409.


**Auth:** Bearer JWT required
**Role(s):** mentor (own record)

**Params:**
- `id` (path, string) **(required)**

**Request body:**
- `status`: enum: `approved` | `paid` **(required)**

**Responses:**

- **200** — Updated salary record
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - **SalaryRecord**:
      - `id`: string (uuid) (optional)
      - `organization_id`: string (uuid) (optional)
      - `branch_id`: string (uuid) (optional)
      - `mentor_id`: string (uuid) (optional)
      - `period_month`: string (date) (optional)
      - `base_amount`: number (optional)
      - `bonus_amount`: number (optional)
      - `status`: enum: `draft` | `approved` | `paid` (optional)
      - `note`: string (optional)
      - `paid_at`: string (date-time) (optional)
      - `created_by`: string (uuid) (optional)
      - `created_at`: string (date-time) (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Only admin can manage mentor salaries, or record belongs to another branch
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **404** — Salary record not found
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **409** — Invalid status transition for the record's current status
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

### GET `/api/mentor/salary/mentors/{mentorId}`
List a mentor's salary records for a year

Same ownership rules as the suggestion endpoint (self, or admin/ceo/main_admin).

**Auth:** Bearer JWT required
**Role(s):** mentor (own record)

**Params:**
- `mentorId` (path, string) **(required)**
- `year` (query, integer) (optional)

**Responses:**

- **200** — List of salary records
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - _array of:_
      - **SalaryRecord**:
        - `id`: string (uuid) (optional)
        - `organization_id`: string (uuid) (optional)
        - `branch_id`: string (uuid) (optional)
        - `mentor_id`: string (uuid) (optional)
        - `period_month`: string (date) (optional)
        - `base_amount`: number (optional)
        - `bonus_amount`: number (optional)
        - `status`: enum: `draft` | `approved` | `paid` (optional)
        - `note`: string (optional)
        - `paid_at`: string (date-time) (optional)
        - `created_by`: string (uuid) (optional)
        - `created_at`: string (date-time) (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Not allowed to view this mentor's data
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

### GET `/api/mentor/salary/mentors/{mentorId}/suggestion`
Decision-support salary suggestion for a month (pure calculation, writes nothing)

`groupRevenue = monthlyPrice × activeStudents` per group the mentor teaches during the month. Access: the mentor may only view their own suggestion; admin only for mentors in their own branch (404 if a foreign branch, to avoid disclosure); ceo/main_admin unrestricted.


**Auth:** Bearer JWT required
**Role(s):** mentor (own record)

**Params:**
- `mentorId` (path, string) **(required)**
- `month` (query, string) **(required)**

**Responses:**

- **200** — Suggestion
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - `groups` (optional):
      - _array of:_
        - `groupId`: string (uuid) (optional)
        - `name`: string (optional)
        - `activeStudents`: integer (optional)
        - `monthlyPrice`: number (optional)
        - `groupRevenue`: number (optional)
    - `totalStudents`: integer (optional)
    - `totalRevenue`: number (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Not allowed to view this mentor's data (foreign mentor/branch)
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **404** — Mentor not found (includes mentors of another branch, for admin requesters)
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
