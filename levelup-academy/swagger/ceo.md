# CEO

Organization owner: branches, admins, methodists, org dashboard

[← back to index](./README.md)

### POST `/api/super/admins`
Create an admin assigned to one of the organization's branches

Login (email) is set by CEO; password is auto-generated and returned once (tempPassword).

**Auth:** Bearer JWT required
**Role(s):** ceo

**Request body:**
- **CreateAdminRequest**:
  - `firstName`: string **(required)**
  - `lastName`: string **(required)**
  - `email`: string (email) **(required)**
  - `branchId`: string (uuid) **(required)**
  - `phone`: string (optional)

**Responses:**

- **201** — Admin created
  - `admin` (optional):
    - **AdminSummary**:
      - `id`: string (uuid) (optional)
      - `firstName`: string (optional)
      - `lastName`: string (optional)
      - `email`: string (email) (optional)
      - `status`: enum: `active` | `frozen` (optional)
      - `branchId`: string (uuid) (optional)

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

- **404** — Branch not found in your organization
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **409** — Email already in use
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

### GET `/api/super/admins`
List admins of the organization

**Auth:** Bearer JWT required
**Role(s):** ceo

**Responses:**

- **200** — List of admins
  - `admins` (optional):
    - _array of:_
      - **AdminSummary**:
        - `id`: string (uuid) (optional)
        - `firstName`: string (optional)
        - `lastName`: string (optional)
        - `email`: string (email) (optional)
        - `status`: enum: `active` | `frozen` (optional)
        - `branchId`: string (uuid) (optional)
      - `branchName`: string (optional)
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

### PATCH `/api/super/admins/{id}`
Update an admin (partial — at least one field; can reassign branch)

If `branchId` is changed, the new branch must belong to the same organization.

**Auth:** Bearer JWT required
**Role(s):** ceo

**Params:**
- `id` (path, string) **(required)**

**Request body:**
- **UpdateAdminRequest**:
  - `firstName`: string (optional)
  - `lastName`: string (optional)
  - `branchId`: string (uuid) (optional)
  - `phone`: string (optional)

**Responses:**

- **200** — Updated admin
  - `admin` (optional):
    - **AdminSummary**:
      - `id`: string (uuid) (optional)
      - `firstName`: string (optional)
      - `lastName`: string (optional)
      - `email`: string (email) (optional)
      - `status`: enum: `active` | `frozen` (optional)
      - `branchId`: string (uuid) (optional)

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

- **404** — Admin or target branch not found in your organization
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

### PATCH `/api/super/admins/{id}/freeze`
Freeze or unfreeze an admin account

**Auth:** Bearer JWT required
**Role(s):** ceo

**Params:**
- `id` (path, string) **(required)**

**Request body:**
- `frozen`: boolean **(required)**

**Responses:**

- **200** — Updated admin status
  - `admin` (optional):
    - **AdminSummary**:
      - `id`: string (uuid) (optional)
      - `firstName`: string (optional)
      - `lastName`: string (optional)
      - `email`: string (email) (optional)
      - `status`: enum: `active` | `frozen` (optional)
      - `branchId`: string (uuid) (optional)

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

- **404** — Admin not found in your organization
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

### GET `/api/super/announcements`
List organization announcements (migration 1783870000000_super-announcements)

**Auth:** Bearer JWT required
**Role(s):** ceo

**Responses:**

- **200** — Announcements
  - `announcements` (optional):
    - _array of:_
      - _(free-form object)_
  - `items` (optional):
    - _array of:_
      - _(free-form object)_
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

### POST `/api/super/announcements`
Create an announcement — queues Telegram delivery for parent/student audiences

**Auth:** Bearer JWT required
**Role(s):** ceo

**Request body:**
- `title`: string **(required)**
- `body`: string **(required)**
- `targetType`: enum: `all-staff` | `all-admins` | `all-mentors` | `all-parents` | `all-students` **(required)**

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

### DELETE `/api/super/announcements/{id}`
Soft-delete an announcement

**Auth:** Bearer JWT required
**Role(s):** ceo

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

- **404** — Announcement not found in your organization
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### GET `/api/super/attendance`
Attendance across the organization (optional group/date filter)

`records` and `lessons` are the same array (`lessons` is a front-end alias). `totals` counts each status over the returned records.


**Auth:** Bearer JWT required
**Role(s):** ceo

**Params:**
- `groupId` (query, string) (optional)
- `date` (query, string) (optional)

**Responses:**

- **200** — Attendance records
  - `records` (optional):
    - _array of:_
      - `id`: string (uuid) (optional)
      - `groupId`: string (uuid) (optional)
      - `groupName`: string (optional)
      - `studentId`: string (uuid) (optional)
      - `firstName`: string (optional)
      - `lastName`: string (optional)
      - `date`: string (date) (optional)
      - `status`: enum: `present` | `absent` | `late` | `excused` (optional)
  - `lessons` (optional):
    - _array of:_
      - _(free-form object)_
  - `totals` (optional):
    - `present`: integer (optional)
    - `absent`: integer (optional)
    - `late`: integer (optional)
    - `excused`: integer (optional)
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

### GET `/api/super/audit`
Organization audit log (migration 1783880000000_audit-log)

**Auth:** Bearer JWT required
**Role(s):** ceo

**Responses:**

- **200** — Audit entries
  - `items` (optional):
    - _array of:_
      - _(free-form object)_
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

### POST `/api/super/branch-managers`
Create a branch manager assigned to one of the organization's branches

**Auth:** Bearer JWT required
**Role(s):** ceo

**Request body:**
- _CreateBranchManagerRequest_ (unresolved ref)

**Responses:**

- **201** — Branch manager created
  - `manager` (optional):
    - _BranchManagerSummary_ (unresolved ref)

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

- **404** — Branch not found in your organization
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **409** — Email already in use
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

### GET `/api/super/branch-managers`
List branch managers of the organization

**Auth:** Bearer JWT required
**Role(s):** ceo

**Responses:**

- **200** — List of branch managers
  - `managers` (optional):
    - _array of:_
      - _BranchManagerSummary_ (unresolved ref)
      - `branchName`: string (optional)
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

### POST `/api/super/branches`
Create a branch in the organization

The organization's first branch is automatically flagged `isMain`.

**Auth:** Bearer JWT required
**Role(s):** ceo

**Request body:**
- **CreateBranchRequest**:
  - `name`: string **(required)**
  - `address`: string (optional)
  - `phone`: string (optional)

**Responses:**

- **201** — Branch created
  - `branch` (optional):
    - **Branch**:
      - `id`: string (uuid) (optional)
      - `name`: string (optional)
      - `address`: string (optional)
      - `phone`: string (optional)
      - `isMain`: boolean (optional)
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

### GET `/api/super/branches`
List branches of the organization (with admin/student counts)

**Auth:** Bearer JWT required
**Role(s):** ceo

**Responses:**

- **200** — List of branches
  - `branches` (optional):
    - _array of:_
      - **Branch**:
        - `id`: string (uuid) (optional)
        - `name`: string (optional)
        - `address`: string (optional)
        - `phone`: string (optional)
        - `isMain`: boolean (optional)
        - `isArchived`: boolean (optional)
        - `createdAt`: string (date-time) (optional)
      - `admins`: integer (optional)
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

---

### GET `/api/super/branches/{id}`
Branch detail — branch info + its admins + its groups

**Auth:** Bearer JWT required
**Role(s):** ceo

**Params:**
- `id` (path, string) **(required)**

**Responses:**

- **200** — Branch detail
  - `branch` (optional):
    - **Branch**:
      - `id`: string (uuid) (optional)
      - `name`: string (optional)
      - `address`: string (optional)
      - `phone`: string (optional)
      - `isMain`: boolean (optional)
      - `isArchived`: boolean (optional)
      - `createdAt`: string (date-time) (optional)
    - `admins` (optional):
      - _array of:_
        - `id`: string (uuid) (optional)
        - `firstName`: string (optional)
        - `lastName`: string (optional)
        - `email`: string (email) (optional)
        - `status`: string (optional)
    - `groups` (optional):
      - _array of:_
        - `id`: string (uuid) (optional)
        - `name`: string (optional)
        - `subject`: string (optional)
        - `monthlyPrice`: number (optional)

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

- **404** — Branch not found in your organization
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

### PATCH `/api/super/branches/{id}`
Update branch fields (partial — at least one field required)

**Auth:** Bearer JWT required
**Role(s):** ceo

**Params:**
- `id` (path, string) **(required)**

**Request body:**
- **UpdateBranchRequest**:
  - `name`: string (optional)
  - `address`: string (optional)
  - `phone`: string (optional)

**Responses:**

- **200** — Updated branch
  - `branch` (optional):
    - **Branch**:
      - `id`: string (uuid) (optional)
      - `name`: string (optional)
      - `address`: string (optional)
      - `phone`: string (optional)
      - `isMain`: boolean (optional)
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

- **404** — Branch not found in your organization
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

### POST `/api/super/branches/{id}/archive`
Archive a branch (read-only afterwards)

**Auth:** Bearer JWT required
**Role(s):** ceo

**Params:**
- `id` (path, string) **(required)**

**Responses:**

- **200** — Branch archived
  - `branch` (optional):
    - **Branch**:
      - `id`: string (uuid) (optional)
      - `name`: string (optional)
      - `address`: string (optional)
      - `phone`: string (optional)
      - `isMain`: boolean (optional)
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

- **404** — Branch not found in your organization
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### POST `/api/super/branches/{id}/unarchive`
Unarchive a branch

**Auth:** Bearer JWT required
**Role(s):** ceo

**Params:**
- `id` (path, string) **(required)**

**Responses:**

- **200** — Branch unarchived
  - `branch` (optional):
    - **Branch**:
      - `id`: string (uuid) (optional)
      - `name`: string (optional)
      - `address`: string (optional)
      - `phone`: string (optional)
      - `isMain`: boolean (optional)
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

- **404** — Branch not found in your organization
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### GET `/api/super/dashboard`
Organization dashboard (revenue, debt, students, per-branch breakdown)

**Auth:** Bearer JWT required
**Role(s):** ceo

**Responses:**

- **200** — Dashboard data
  - `totals` (optional):
    - `branches`: integer (optional)
    - `activeStudents`: integer (optional)
    - `admins`: integer (optional)
    - `revenue`: number (optional)
    - `outstandingDebt`: number (optional)
    - `currency`: string (optional) _e.g. "UZS"_
  - `branches` (optional):
    - _array of:_
      - `id`: string (uuid) (optional)
      - `name`: string (optional)
      - `isMain`: boolean (optional)
      - `isArchived`: boolean (optional)
      - `students`: integer (optional)
      - `admins`: integer (optional)
      - `revenue`: number (optional)
      - `debt`: number (optional)

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

### GET `/api/super/groups`
List groups across the whole organization

**Auth:** Bearer JWT required
**Role(s):** ceo

**Responses:**

- **200** — Groups of every branch
  - `groups` (optional):
    - _array of:_
      - `id`: string (uuid) (optional)
      - `name`: string (optional)
      - `subject`: string (optional)
      - `monthlyPrice`: number (optional)
      - `schedule` (optional):
        - _(free-form object)_
      - `lessonDays` (optional):
        - _(free-form object)_
      - `room`: string (optional)
      - `isArchived`: boolean (optional)
      - `branchName`: string (optional)

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

### DELETE `/api/super/groups/{id}`
Soft-delete a group of the organization

**Auth:** Bearer JWT required
**Role(s):** ceo

**Params:**
- `id` (path, string) **(required)**

**Responses:**

- **200** — Deleted
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

- **404** — Resource not found (or not in caller's organization/scope)
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### POST `/api/super/groups/{id}/archive`
Archive a group (read-only, mutations return 403 afterwards)

**Auth:** Bearer JWT required
**Role(s):** ceo

**Params:**
- `id` (path, string) **(required)**

**Responses:**

- **200** — Archived
  - `group` (optional):
    - `id`: string (uuid) (optional)
    - `isArchived`: boolean (optional) _e.g. true_

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

### POST `/api/super/groups/{id}/unarchive`
Unarchive a group

**Auth:** Bearer JWT required
**Role(s):** ceo

**Params:**
- `id` (path, string) **(required)**

**Responses:**

- **200** — Unarchived
  - `group` (optional):
    - `id`: string (uuid) (optional)
    - `isArchived`: boolean (optional) _e.g. false_

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

### GET `/api/super/mentors`
List mentors of the organization (read-only — Admin of the branch manages them)

Нужен только для выбора цели в «Взыскании» — CRUD ментора остаётся у Admin филиала.

**Auth:** Bearer JWT required
**Role(s):** ceo

**Responses:**

- **200** — List of mentors

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

### POST `/api/super/methodists`
Create a methodist (organization-level, not tied to a branch)

**Auth:** Bearer JWT required
**Role(s):** ceo

**Request body:**
- **CreateMethodistRequest**:
  - `firstName`: string **(required)**
  - `lastName`: string **(required)**
  - `email`: string (email) **(required)**
  - `phone`: string (optional)

**Responses:**

- **201** — Methodist created
  - `methodist` (optional):
    - **MethodistSummary**:
      - `id`: string (uuid) (optional)
      - `firstName`: string (optional)
      - `lastName`: string (optional)
      - `email`: string (email) (optional)
      - `status`: enum: `active` | `frozen` (optional)
      - `phone`: string (optional)

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

- **409** — Email already in use
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

### GET `/api/super/methodists`
List methodists of the organization

**Auth:** Bearer JWT required
**Role(s):** ceo

**Responses:**

- **200** — List of methodists
  - `methodists` (optional):
    - _array of:_
      - **MethodistSummary**:
        - `id`: string (uuid) (optional)
        - `firstName`: string (optional)
        - `lastName`: string (optional)
        - `email`: string (email) (optional)
        - `status`: enum: `active` | `frozen` (optional)
        - `phone`: string (optional)
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

### PATCH `/api/super/methodists/{id}`
Update a methodist (partial — at least one field)

**Auth:** Bearer JWT required
**Role(s):** ceo

**Params:**
- `id` (path, string) **(required)**

**Request body:**
- **UpdateMethodistRequest**:
  - `firstName`: string (optional)
  - `lastName`: string (optional)
  - `phone`: string (optional)

**Responses:**

- **200** — Updated methodist
  - `methodist` (optional):
    - **MethodistSummary**:
      - `id`: string (uuid) (optional)
      - `firstName`: string (optional)
      - `lastName`: string (optional)
      - `email`: string (email) (optional)
      - `status`: enum: `active` | `frozen` (optional)
      - `phone`: string (optional)

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

- **404** — Methodist not found in your organization
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

### PATCH `/api/super/methodists/{id}/freeze`
Freeze or unfreeze a methodist account

**Auth:** Bearer JWT required
**Role(s):** ceo

**Params:**
- `id` (path, string) **(required)**

**Request body:**
- `frozen`: boolean **(required)**

**Responses:**

- **200** — Updated methodist status
  - `methodist` (optional):
    - **MethodistSummary**:
      - `id`: string (uuid) (optional)
      - `firstName`: string (optional)
      - `lastName`: string (optional)
      - `email`: string (email) (optional)
      - `status`: enum: `active` | `frozen` (optional)
      - `phone`: string (optional)

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

- **404** — Methodist not found in your organization
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

### GET `/api/super/organization`
Organization profile (Settings page)

Returns the partner organization profile. `plan` is derived from the organization's tier (see `config/plans.js`), it is not stored per-row.


**Auth:** Bearer JWT required
**Role(s):** ceo

**Responses:**

- **200** — Organization profile
  - **Organization**:
    - `id`: string (uuid) (optional)
    - `name`: string (optional)
    - `domain`: string (optional) _e.g. "levelup"_
    - `status`: string (optional) _e.g. "active"_
    - `lessonDurationMin`: integer (optional) — Lesson length in minutes, applied to every group of the org. Group end time is computed from it on the backend. _e.g. 90_
    - `createdAt`: string (date-time) (optional)
    - `plan` (optional):
      - `branchLimit`: integer (optional)
      - `diskSpace`: string (optional) _e.g. "500 ГБ"_

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

### PATCH `/api/super/organization`
Update organization profile (name / domain / lesson duration)

Partial update — at least one field is required. `lessonDurationMin` applies to every group of the organization: group end time is computed from it on the backend (see POST/PATCH /api/admin/groups).


**Auth:** Bearer JWT required
**Role(s):** ceo

**Request body:**
- **UpdateOrganizationRequest**:
  - `name`: string (optional)
  - `domain`: string (optional) — Lowercased. Empty string or null clears it. Must be unique (409 otherwise).
  - `lessonDurationMin`: integer (optional)

**Responses:**

- **200** — Updated organization profile
  - **Organization**:
    - `id`: string (uuid) (optional)
    - `name`: string (optional)
    - `domain`: string (optional) _e.g. "levelup"_
    - `status`: string (optional) _e.g. "active"_
    - `lessonDurationMin`: integer (optional) — Lesson length in minutes, applied to every group of the org. Group end time is computed from it on the backend. _e.g. 90_
    - `createdAt`: string (date-time) (optional)
    - `plan` (optional):
      - `branchLimit`: integer (optional)
      - `diskSpace`: string (optional) _e.g. "500 ГБ"_

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

### GET `/api/super/reminders`
History of automated payment reminders (payment.due / payment.due_soon / debt.overdue)

Not written by an HTTP handler — a BullMQ QueueEvents listener (reminders/reminders.listener.js) logs each reminder job as it completes or fails on the shared 'notifications' queue. Scoped to this organization, newest first.


**Auth:** Bearer JWT required
**Role(s):** ceo

**Responses:**

- **200** — Reminder history
  - `items` (optional):
    - _array of:_
      - `id`: string (uuid) (optional)
      - `studentName`: string (optional)
      - `parentName`: string (optional)
      - `message`: string (optional)
      - `status`: enum: `pending` | `sent` | `failed` (optional)
      - `error`: string (optional)
      - `sentAt`: string (date-time) (optional)
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

### DELETE `/api/super/reminders/{id}`
Delete a reminder history entry

**Auth:** Bearer JWT required
**Role(s):** ceo

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

- **404** — Reminder not found in your organization
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

### POST `/api/super/reminders/{id}/resend`
Re-queue the same reminder job (same payload) — history is not overwritten, a new entry appears once it settles

**Auth:** Bearer JWT required
**Role(s):** ceo

**Params:**
- `id` (path, string) **(required)**

**Responses:**

- **200** — Re-queued

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

- **404** — Reminder not found in your organization
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

### GET `/api/super/stats`
Organization statistics — KPIs, revenue series, per-branch and per-method breakdown

**Auth:** Bearer JWT required
**Role(s):** ceo

**Params:**
- `period` (query, string) (optional)

**Responses:**

- **200** — Stats
  - `period`: string (optional)
  - `totals` (optional):
    - `revenue`: number (optional)
    - `outstandingDebt`: number (optional)
    - `activeStudents`: integer (optional)
    - `admins`: integer (optional)
    - `branches`: integer (optional)
    - `avgRevenue`: number (optional)
    - `debtRatio`: number (optional)
    - `currency`: string (optional)
  - `branches` (optional):
    - _array of:_
      - `id`: string (uuid) (optional)
      - `name`: string (optional)
      - `revenue`: number (optional)
      - `debt`: number (optional)
      - `students`: integer (optional)
      - `admins`: integer (optional)
      - `share`: number (optional) — Доля филиала в общей выручке организации, %
  - `revenueSeries` (optional):
    - _array of:_
      - _(free-form object)_
  - `paymentMethods` (optional):
    - _array of:_
      - _(free-form object)_

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

### GET `/api/super/students`
List students across the whole organization (paginated)

Search matches first name, last name or phone (ILIKE). Scope is the caller's organization — students of every branch are included.


**Auth:** Bearer JWT required
**Role(s):** ceo

**Params:**
- `search` (query, string) (optional) — Substring match on first name / last name / phone
- `frozen` (query, string) (optional) — Filter by frozen status; omit for all
- `page` (query, integer) (optional)
- `limit` (query, integer) (optional)

**Responses:**

- **200** — Paginated students
  - `students` (optional):
    - _array of:_
      - `id`: string (uuid) (optional)
      - `firstName`: string (optional)
      - `lastName`: string (optional)
      - `phone`: string (optional)
      - `status`: string (optional)
      - `frozen`: boolean (optional)
      - `branchName`: string (optional)
      - `createdAt`: string (date-time) (optional)
  - `total`: integer (optional)
  - `page`: integer (optional)
  - `pageCount`: integer (optional)

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

### DELETE `/api/super/students/{id}`
Soft-delete a student of the organization

Sets `deleted_at`; the row is kept for finance history.

**Auth:** Bearer JWT required
**Role(s):** ceo

**Params:**
- `id` (path, string) **(required)**

**Responses:**

- **200** — Deleted
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

- **404** — Resource not found (or not in caller's organization/scope)
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---
