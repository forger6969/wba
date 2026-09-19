# Admin

Branch admin: dashboard, expenses, students, mentors, groups

[← back to index](./README.md)

### POST `/api/admin/announcements`
Broadcast an announcement to students of the branch (or one group)

Resolves the recipients (all active students of the branch, or only the given group), then enqueues `announcement.created` on the notification queue — delivery is handled asynchronously by the Telegram bot worker, never inline.


**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Request body:**
- `title`: string **(required)**
- `message`: string **(required)**
- `groupId`: string (uuid) (optional) — Omit to send to every active student of the branch

**Responses:**

- **201** — Queued for delivery

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

### GET `/api/admin/dashboard`
Branch dashboard — revenue, expenses, profit, debt, student/group counts

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Responses:**

- **200** — Dashboard data
  - `totals` (optional):
    - `revenue`: number (optional)
    - `expenses`: number (optional)
    - `profit`: number (optional)
    - `outstandingDebt`: number (optional)
    - `activeStudents`: integer (optional)
    - `groups`: integer (optional)
    - `overdueInvoices`: integer (optional)
    - `currency`: string (optional) _e.g. "UZS"_
  - `thisMonth` (optional):
    - `revenue`: number (optional)
    - `expenses`: number (optional)
    - `profit`: number (optional)

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

### POST `/api/admin/expenses`
Record a branch expense

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Request body:**
- **CreateExpenseRequest**:
  - `category`: string **(required)**
  - `amount`: number **(required)**
  - `spentAt`: string (date-time) (optional)
  - `note`: string (optional)

**Responses:**

- **201** — Expense created
  - `expense` (optional):
    - **Expense**:
      - `id`: string (uuid) (optional)
      - `category`: string (optional)
      - `amount`: number (optional)
      - `spentAt`: string (date-time) (optional)
      - `note`: string (optional)
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

### GET `/api/admin/expenses`
List branch expenses (paginated, optional date range)

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `page` (query, integer) (optional)
- `limit` (query, integer) (optional)
- `from` (query, string) (optional)
- `to` (query, string) (optional)

**Responses:**

- **200** — Paginated list of expenses
  - `expenses` (optional):
    - _array of:_
      - **Expense**:
        - `id`: string (uuid) (optional)
        - `category`: string (optional)
        - `amount`: number (optional)
        - `spentAt`: string (date-time) (optional)
        - `note`: string (optional)
        - `createdAt`: string (date-time) (optional)
      - `createdBy`: string (optional)
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

### DELETE `/api/admin/expenses/{id}`
Soft-delete a branch expense

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**

**Responses:**

- **204** — Expense deleted

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

- **404** — Expense not found
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

### PATCH `/api/admin/expenses/{id}`
Update a branch expense (partial — at least one field)

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**

**Request body:**
- `category`: string (optional)
- `amount`: number (optional)
- `spentAt`: string (date) (optional)
- `note`: string (optional)

**Responses:**

- **200** — Updated expense
  - `expense` (optional):
    - **Expense**:
      - `id`: string (uuid) (optional)
      - `category`: string (optional)
      - `amount`: number (optional)
      - `spentAt`: string (date-time) (optional)
      - `note`: string (optional)
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

- **404** — Expense not found
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

### POST `/api/admin/groups`
Create a group in the branch, assigned to a mentor

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Request body:**
- **CreateGroupRequest**:
  - `name`: string **(required)**
  - `subject`: string **(required)**
  - `mentorId`: string (uuid) **(required)**
  - `monthlyPrice`: number **(required)**
  - `schedule` (optional):
    - _array of:_
      - `day`: enum: `mon` | `tue` | `wed` | `thu` | `fri` | `sat` | `sun` (optional)
      - `start`: string (optional)
      - `end`: string (optional)
  - `room`: string (optional)

**Responses:**

- **201** — Group created
  - `group` (optional):
    - **Group**:
      - `id`: string (uuid) (optional)
      - `name`: string (optional)
      - `subject`: string (optional)
      - `monthlyPrice`: number (optional)
      - `schedule` (optional):
        - _array of:_
          - `day`: enum: `mon` | `tue` | `wed` | `thu` | `fri` | `sat` | `sun` (optional)
          - `start`: string (optional) _e.g. "18:00"_
          - `end`: string (optional) _e.g. "19:30"_
      - `room`: string (optional)
      - `isArchived`: boolean (optional)
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

- **404** — Mentor not found in your branch
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

### GET `/api/admin/groups`
List groups of the branch (paginated)

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `page` (query, integer) (optional)
- `limit` (query, integer) (optional)

**Responses:**

- **200** — Paginated list of groups
  - `groups` (optional):
    - _array of:_
      - **Group**:
        - `id`: string (uuid) (optional)
        - `name`: string (optional)
        - `subject`: string (optional)
        - `monthlyPrice`: number (optional)
        - `schedule` (optional):
          - _array of:_
            - `day`: enum: `mon` | `tue` | `wed` | `thu` | `fri` | `sat` | `sun` (optional)
            - `start`: string (optional) _e.g. "18:00"_
            - `end`: string (optional) _e.g. "19:30"_
        - `room`: string (optional)
        - `isArchived`: boolean (optional)
        - `createdAt`: string (date-time) (optional)
      - `students`: integer (optional)
      - `mentor` (optional):
        - `id`: string (uuid) (optional)
        - `name`: string (optional)
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

---

### GET `/api/admin/groups/{id}`
Group detail — group info + mentor + member students

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**

**Responses:**

- **200** — Group detail
  - `group` (optional):
    - **Group**:
      - `id`: string (uuid) (optional)
      - `name`: string (optional)
      - `subject`: string (optional)
      - `monthlyPrice`: number (optional)
      - `schedule` (optional):
        - _array of:_
          - `day`: enum: `mon` | `tue` | `wed` | `thu` | `fri` | `sat` | `sun` (optional)
          - `start`: string (optional) _e.g. "18:00"_
          - `end`: string (optional) _e.g. "19:30"_
      - `room`: string (optional)
      - `isArchived`: boolean (optional)
      - `createdAt`: string (date-time) (optional)
    - `mentor` (optional):
      - `id`: string (uuid) (optional)
      - `name`: string (optional)
    - `students` (optional):
      - _array of:_
        - `id`: string (uuid) (optional)
        - `firstName`: string (optional)
        - `lastName`: string (optional)
        - `phone`: string (optional)
        - `status`: string (optional)
        - `totalDebt`: number (optional)
        - `coinBalance`: integer (optional)
        - `joinedAt`: string (date-time) (optional)

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

- **404** — Group not found in your branch
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

### PATCH `/api/admin/groups/{id}`
Update a group (partial — at least one field; can reassign mentor)

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**

**Request body:**
- **UpdateGroupRequest**:
  - `name`: string (optional)
  - `subject`: string (optional)
  - `mentorId`: string (uuid) (optional)
  - `monthlyPrice`: number (optional)
  - `schedule` (optional):
    - _array of:_
      - _(free-form object)_
  - `room`: string (optional)

**Responses:**

- **200** — Updated group
  - `group` (optional):
    - **Group**:
      - `id`: string (uuid) (optional)
      - `name`: string (optional)
      - `subject`: string (optional)
      - `monthlyPrice`: number (optional)
      - `schedule` (optional):
        - _array of:_
          - `day`: enum: `mon` | `tue` | `wed` | `thu` | `fri` | `sat` | `sun` (optional)
          - `start`: string (optional) _e.g. "18:00"_
          - `end`: string (optional) _e.g. "19:30"_
      - `room`: string (optional)
      - `isArchived`: boolean (optional)
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

- **404** — Group or mentor not found in your branch
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

### POST `/api/admin/groups/{id}/archive`
Archive a group (read-only afterwards)

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**

**Responses:**

- **200** — Group archived
  - `group` (optional):
    - **Group**:
      - `id`: string (uuid) (optional)
      - `name`: string (optional)
      - `subject`: string (optional)
      - `monthlyPrice`: number (optional)
      - `schedule` (optional):
        - _array of:_
          - `day`: enum: `mon` | `tue` | `wed` | `thu` | `fri` | `sat` | `sun` (optional)
          - `start`: string (optional) _e.g. "18:00"_
          - `end`: string (optional) _e.g. "19:30"_
      - `room`: string (optional)
      - `isArchived`: boolean (optional)
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

- **404** — Group not found in your branch
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

### GET `/api/admin/groups/{id}/attendance`
Group attendance roster for a lesson date

Returns every active student of the group with their status on the given date (`null` if not yet marked) — a full roster, not only marked rows.


**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**
- `date` (query, string) **(required)**

**Responses:**

- **200** — Attendance roster
  - _array of:_
    - `id`: string (uuid) (optional)
    - `studentId`: string (uuid) (optional)
    - `studentName`: string (optional)
    - `status`: enum: `present` | `absent` | `late` | `excused` (optional)

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

### POST `/api/admin/groups/{id}/attendance`
Mark/clear group attendance for a lesson date

Records with a status are upserted; records with `status: null` clear the mark. Admins may correct past lessons but not future ones. Returns the refreshed roster.


**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**

**Request body:**
- `lessonDate`: string **(required)** _e.g. "2026-07-20"_
- `records` **(required)**:
  - _array of:_
    - `studentId`: string (uuid) **(required)**
    - `status`: enum: `present` | `absent` | `late` | `excused` **(required)**

**Responses:**

- **200** — Refreshed roster

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

### GET `/api/admin/groups/{id}/feedback`
List group feedback (student/teacher reviews)

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**

**Responses:**

- **200** — Feedback list
  - _array of:_
    - `id`: string (uuid) (optional)
    - `type`: enum: `student` | `teacher` (optional)
    - `authorName`: string (optional)
    - `content`: string (optional)
    - `rating`: integer (optional)
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

- **404** — Resource not found (or not in caller's organization/scope)
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### POST `/api/admin/groups/{id}/feedback`
Add feedback to the group

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**

**Request body:**
- `type`: enum: `student` | `teacher` **(required)**
- `authorName`: string (optional)
- `content`: string **(required)**
- `rating`: integer **(required)**

**Responses:**

- **201** — Feedback created

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

### GET `/api/admin/groups/{id}/homework`
List group homework with submission progress

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**

**Responses:**

- **200** — Homework list
  - _array of:_
    - `id`: string (uuid) (optional)
    - `title`: string (optional)
    - `description`: string (optional)
    - `dueDate`: string (optional) _e.g. "2026-07-27"_
    - `status`: enum: `active` | `completed` | `overdue` (optional)
    - `submissions`: integer (optional)
    - `totalStudents`: integer (optional)

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

### POST `/api/admin/groups/{id}/homework`
Create homework for the group

maxScore (100) and coinReward (0) use table defaults. If `dueDate` is omitted the deadline defaults to one week ahead.


**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**

**Request body:**
- `title`: string **(required)**
- `description`: string (optional)
- `dueDate`: string (optional) _e.g. "2026-07-27"_

**Responses:**

- **201** — Homework created

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

### POST `/api/admin/groups/{id}/students`
Add a student to a group

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**

**Request body:**
- `studentId`: string (uuid) **(required)**

**Responses:**

- **201** — Student added to group
  - `groupId`: string (uuid) (optional)
  - `studentId`: string (uuid) (optional)

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

- **404** — Group or student not found in your branch
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **409** — Group is archived
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

### DELETE `/api/admin/groups/{id}/students/{studentId}`
Remove a student from a group

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**
- `studentId` (path, string) **(required)**

**Responses:**

- **204** — Student removed from group

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

- **404** — Group not found in your branch, or student is not an active member
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

### POST `/api/admin/groups/{id}/unarchive`
Unarchive a group

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**

**Responses:**

- **200** — Group unarchived
  - `group` (optional):
    - **Group**:
      - `id`: string (uuid) (optional)
      - `name`: string (optional)
      - `subject`: string (optional)
      - `monthlyPrice`: number (optional)
      - `schedule` (optional):
        - _array of:_
          - `day`: enum: `mon` | `tue` | `wed` | `thu` | `fri` | `sat` | `sun` (optional)
          - `start`: string (optional) _e.g. "18:00"_
          - `end`: string (optional) _e.g. "19:30"_
      - `room`: string (optional)
      - `isArchived`: boolean (optional)
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

- **404** — Group not found in your branch
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

### POST `/api/admin/mentors`
Create a mentor in the admin's branch (login by email)

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Request body:**
- **CreateMentorRequest**:
  - `firstName`: string **(required)**
  - `lastName`: string **(required)**
  - `email`: string (email) **(required)**
  - `password`: string **(required)**
  - `phone`: string (optional)

**Responses:**

- **201** — Mentor created
  - `mentor` (optional):
    - **MentorSummary**:
      - `id`: string (uuid) (optional)
      - `firstName`: string (optional)
      - `lastName`: string (optional)
      - `email`: string (email) (optional)
      - `phone`: string (optional)
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

- **409** — Email or phone already in use
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

### GET `/api/admin/mentors`
List mentors of the branch

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Responses:**

- **200** — List of mentors
  - `mentors` (optional):
    - _array of:_
      - **MentorSummary**:
        - `id`: string (uuid) (optional)
        - `firstName`: string (optional)
        - `lastName`: string (optional)
        - `email`: string (email) (optional)
        - `phone`: string (optional)
        - `status`: string (optional)
      - `groups`: integer (optional)
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

---

### PATCH `/api/admin/mentors/{id}`
Update a mentor (partial — at least one field)

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**

**Request body:**
- **UpdateMentorRequest**:
  - `firstName`: string (optional)
  - `lastName`: string (optional)
  - `phone`: string (optional)

**Responses:**

- **200** — Updated mentor
  - `mentor` (optional):
    - **MentorSummary**:
      - `id`: string (uuid) (optional)
      - `firstName`: string (optional)
      - `lastName`: string (optional)
      - `email`: string (email) (optional)
      - `phone`: string (optional)
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

- **404** — Mentor not found in your branch
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **409** — Phone already in use
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

### DELETE `/api/admin/mentors/{id}`
Soft-delete a mentor

Blocked with 409 if the mentor still leads active (non-archived) groups — reassign or archive those groups first.


**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**

**Responses:**

- **204** — Mentor deleted

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

- **404** — Mentor not found in your branch
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **409** — Mentor still leads active groups
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

### POST `/api/admin/mentors/{id}/freeze`
Freeze or unfreeze a mentor account

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**

**Request body:**
- `frozen`: boolean **(required)**

**Responses:**

- **200** — Updated mentor
  - `mentor` (optional):
    - **MentorSummary**:
      - `id`: string (uuid) (optional)
      - `firstName`: string (optional)
      - `lastName`: string (optional)
      - `email`: string (email) (optional)
      - `phone`: string (optional)
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

- **404** — Mentor not found in your branch
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

### GET `/api/admin/settings`
Branch-visible org settings (lesson duration)

Read-only for admins — the value is owned by the organization and is edited by the CEO (PATCH /api/super/organization). The group form uses it to compute the lesson end time from the chosen start time.


**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Responses:**

- **200** — Settings
  - `lessonDurationMin`: integer (optional) _e.g. 90_

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

### POST `/api/admin/students`
Create a student (and optionally their parent), auto-generating login codes/passwords

Login code (8 chars) and password (6 digits) are generated server-side for both the student and, if `parent` is supplied, the parent — returned once in this response only (must be relayed out-of-band; code-role accounts have no forgot-password). If `groupId` is given, the group must belong to the admin's branch and must not be archived (409 if archived).


**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Request body:**
- **CreateStudentRequest**:
  - `firstName`: string **(required)**
  - `lastName`: string **(required)**
  - `phone`: string **(required)**
  - `birthDate`: string (date) (optional)
  - `groupId`: string (uuid) (optional)
  - `parent` (optional):
    - `firstName`: string (optional)
    - `lastName`: string (optional)
    - `phone`: string (optional)

**Responses:**

- **201** — Student (and optional parent) created
  - `student` (optional):
    - `id`: string (uuid) (optional)
    - `firstName`: string (optional)
    - `lastName`: string (optional)
    - `loginCode`: string (optional)
    - `password`: string (optional)
  - `parent` (optional):
    - `id`: string (uuid) (optional)
    - `firstName`: string (optional)
    - `lastName`: string (optional)
    - `loginCode`: string (optional)
    - `password`: string (optional)

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

- **404** — Group not found in your branch
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **409** — Group is archived, phone already in use, or login-code collision retries exhausted
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

### GET `/api/admin/students`
List students of the branch (paginated, search, filter by group)

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `page` (query, integer) (optional)
- `limit` (query, integer) (optional)
- `search` (query, string) (optional)
- `groupId` (query, string) (optional)

**Responses:**

- **200** — Paginated list of students
  - `students` (optional):
    - _array of:_
      - **StudentListItem**:
        - `id`: string (uuid) (optional)
        - `firstName`: string (optional)
        - `lastName`: string (optional)
        - `phone`: string (optional)
        - `status`: string (optional)
        - `loginCode`: string (optional)
        - `coinBalance`: integer (optional)
        - `totalDebt`: number (optional)
        - `hasOverdueInvoice`: boolean (optional)
        - `hasParent`: boolean (optional)
        - `groups` (optional):
          - _array of:_
            - _(free-form object)_
        - `createdAt`: string (date-time) (optional)
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

### GET `/api/admin/students/{id}`
Student detail (profile + debt + coin balance + groups)

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**

**Responses:**

- **200** — Student detail
  - `student` (optional):
    - **StudentDetail**:
      - **StudentListItem**:
        - `id`: string (uuid) (optional)
        - `firstName`: string (optional)
        - `lastName`: string (optional)
        - `phone`: string (optional)
        - `status`: string (optional)
        - `loginCode`: string (optional)
        - `coinBalance`: integer (optional)
        - `totalDebt`: number (optional)
        - `hasOverdueInvoice`: boolean (optional)
        - `hasParent`: boolean (optional)
        - `groups` (optional):
          - _array of:_
            - _(free-form object)_
        - `createdAt`: string (date-time) (optional)
      - `birthDate`: string (date) (optional)
      - `frozenAt`: string (date-time) (optional)
      - `frozenReason`: string (optional)
      - `groups` (optional):
        - _array of:_
          - `id`: string (uuid) (optional)
          - `name`: string (optional)
          - `subject`: string (optional)
          - `monthlyPrice`: number (optional)
          - `mentor`: string (optional)

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

- **404** — Student not found in your branch
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

### PATCH `/api/admin/students/{id}`
Update a student's profile fields (partial — at least one field)

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**

**Request body:**
- **UpdateStudentRequest**:
  - `firstName`: string (optional)
  - `lastName`: string (optional)
  - `phone`: string (optional)
  - `birthDate`: string (date) (optional)

**Responses:**

- **200** — Updated student
  - `student` (optional):
    - `id`: string (uuid) (optional)
    - `firstName`: string (optional)
    - `lastName`: string (optional)
    - `phone`: string (optional)
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

- **404** — Student not found in your branch
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **409** — Phone already in use
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

### DELETE `/api/admin/students/{id}`
Soft-delete a student and remove them from all groups

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**

**Responses:**

- **204** — Student deleted

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

- **404** — Student not found in your branch
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

### POST `/api/admin/students/{id}/freeze`
Freeze or unfreeze a student account

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**

**Request body:**
- `frozen`: boolean **(required)**
- `reason`: string (optional)

**Responses:**

- **200** — Updated status
  - `student` (optional):
    - `id`: string (uuid) (optional)
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

- **404** — Student not found in your branch
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

### POST `/api/admin/students/{id}/regenerate-password`
Regenerate a student's numeric password (code-role accounts have no forgot-password flow)

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**

**Responses:**

- **200** — New password (shown once)
  - `id`: string (uuid) (optional)
  - `password`: string (optional)

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

- **404** — Student not found in your branch
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
