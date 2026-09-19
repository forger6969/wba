# Branch Manager


[← back to index](./README.md)

### GET `/api/branch-manager/branch`
Full info about own branch — name, address, stats, manager

**Auth:** Bearer JWT required
**Role(s):** authenticated

**Responses:**

- **200** — Branch detail
  - _BranchDetail_ (unresolved ref)

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

### GET `/api/branch-manager/dashboard`
Branch dashboard — revenue, expenses, profit, debt, student/group counts

**Auth:** Bearer JWT required
**Role(s):** authenticated

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

### GET `/api/branch-manager/expenses`
List branch expenses (paginated, optional date range and category)

**Auth:** Bearer JWT required
**Role(s):** authenticated

**Params:**
- `page` (query, integer) (optional)
- `limit` (query, integer) (optional)
- `from` (query, string) (optional)
- `to` (query, string) (optional)
- `category` (query, string) (optional)

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

---

### GET `/api/branch-manager/income`
List branch payments for a month (student, group, amount, method, status)

**Auth:** Bearer JWT required
**Role(s):** authenticated

**Params:**
- `month` (query, string) **(required)**

**Responses:**

- **200** — Payments list + monthly total
  - `payments` (optional):
    - _array of:_
      - `id`: string (optional)
      - `date`: string (date) (optional)
      - `student`: string (optional)
      - `group`: string (optional)
      - `amount`: number (optional)
      - `method`: string (optional)
      - `status`: enum: `paid` | `pending` | `overdue` (optional)
  - `total`: number (optional)

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

### GET `/api/branch-manager/reports`
Monthly income/expense/profit series for charts

**Auth:** Bearer JWT required
**Role(s):** authenticated

**Params:**
- `range` (query, string) (optional)

**Responses:**

- **200** — Monthly series
  - `range`: string (optional)
  - `series` (optional):
    - _array of:_
      - `key`: string (optional)
      - `label`: string (optional)
      - `income`: number (optional)
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
