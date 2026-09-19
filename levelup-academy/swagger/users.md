# Users

Cross-role profile endpoints (own profile, scoped user lookups)

[← back to index](./README.md)

### GET `/api/users`
List users of the caller's own branch (admin/ceo only)

Requires `req.user.branchId` to be set — returns 400 if the caller has no branch scope.

**Auth:** Bearer JWT required
**Role(s):** any authenticated role (scoped to own profile / own branch)

**Params:**
- `role` (query, string) (optional)
- `status` (query, string) (optional)
- `page` (query, integer) (optional)
- `limit` (query, integer) (optional)

**Responses:**

- **200** — Paginated list of branch users
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - _array of:_
      - **UserProfile**:
        - `id`: string (uuid) (optional)
        - `organization_id`: string (uuid) (optional)
        - `branch_id`: string (uuid) (optional)
        - `role`: string (optional)
        - `status`: string (optional)
        - `first_name`: string (optional)
        - `last_name`: string (optional)
        - `phone`: string (optional)
        - `email`: string (optional)
        - `avatar_key`: string (optional)
        - `avatarUrl`: string (optional) — Presigned S3 URL, derived from avatar_key
        - `is_archived`: boolean (optional)
        - `created_at`: string (date-time) (optional)
        - `updated_at`: string (date-time) (optional)
  - `meta` (optional):
    - **PageMeta**:
      - `total`: integer (optional)
      - `page`: integer (optional)
      - `limit`: integer (optional)
      - `totalPages`: integer (optional)

- **400** — Branch scope required (caller has no branchId)
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

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

### GET `/api/users/{id}`
Get a user's profile card, scoped to the caller

Staff-only (main_admin, ceo, admin, mentor) — student/parent must use `GET /api/users/me` for their own data. Scope: main_admin sees the whole platform; ceo only users in their own organization; admin/ mentor only users in their own branch. A user outside scope returns 404 (existence not disclosed).


**Auth:** Bearer JWT required
**Role(s):** any authenticated role (scoped to own profile / own branch)

**Params:**
- `id` (path, string) **(required)**

**Responses:**

- **200** — User profile
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - **UserProfile**:
      - `id`: string (uuid) (optional)
      - `organization_id`: string (uuid) (optional)
      - `branch_id`: string (uuid) (optional)
      - `role`: string (optional)
      - `status`: string (optional)
      - `first_name`: string (optional)
      - `last_name`: string (optional)
      - `phone`: string (optional)
      - `email`: string (optional)
      - `avatar_key`: string (optional)
      - `avatarUrl`: string (optional) — Presigned S3 URL, derived from avatar_key
      - `is_archived`: boolean (optional)
      - `created_at`: string (date-time) (optional)
      - `updated_at`: string (date-time) (optional)

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

- **404** — User not found (includes users outside caller's scope)
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

### GET `/api/users/me`
Current authenticated user's profile

**Auth:** Bearer JWT required
**Role(s):** any authenticated role (scoped to own profile / own branch)

**Responses:**

- **200** — Own profile
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - **UserProfile**:
      - `id`: string (uuid) (optional)
      - `organization_id`: string (uuid) (optional)
      - `branch_id`: string (uuid) (optional)
      - `role`: string (optional)
      - `status`: string (optional)
      - `first_name`: string (optional)
      - `last_name`: string (optional)
      - `phone`: string (optional)
      - `email`: string (optional)
      - `avatar_key`: string (optional)
      - `avatarUrl`: string (optional) — Presigned S3 URL, derived from avatar_key
      - `is_archived`: boolean (optional)
      - `created_at`: string (date-time) (optional)
      - `updated_at`: string (date-time) (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **404** — User not found
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### PATCH `/api/users/me`
Update own profile (partial — at least one field)

**Auth:** Bearer JWT required
**Role(s):** any authenticated role (scoped to own profile / own branch)

**Request body:**
- **UpdateProfileRequest**:
  - `firstName`: string (optional)
  - `lastName`: string (optional)
  - `email`: string (email) (optional)
  - `avatarKey`: string (optional)

**Responses:**

- **200** — Updated profile
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - **UserProfile**:
      - `id`: string (uuid) (optional)
      - `organization_id`: string (uuid) (optional)
      - `branch_id`: string (uuid) (optional)
      - `role`: string (optional)
      - `status`: string (optional)
      - `first_name`: string (optional)
      - `last_name`: string (optional)
      - `phone`: string (optional)
      - `email`: string (optional)
      - `avatar_key`: string (optional)
      - `avatarUrl`: string (optional) — Presigned S3 URL, derived from avatar_key
      - `is_archived`: boolean (optional)
      - `created_at`: string (date-time) (optional)
      - `updated_at`: string (date-time) (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **404** — User not found
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
