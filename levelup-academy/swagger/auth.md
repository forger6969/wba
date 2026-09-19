# Auth

Login (main/staff/member), Google OAuth, refresh, logout, password reset

[← back to index](./README.md)

### POST `/api/auth/forgot-password`
Request a password-reset OTP code by email

Always returns the same success message regardless of whether the account exists (anti user-enumeration). If the account exists and has an email, a 6-digit OTP (valid 3 minutes, max 3 attempts) is emailed. Resend cooldown of 60s per email is enforced silently. Rate-limited to 5 req/min (route-specific bucket, in addition to the /api/auth-wide and global limiters).


**Auth:** Public — no token required

**Request body:**
- **ForgotPasswordRequest**:
  - `email`: string (email) **(required)**

**Responses:**

- **200** — Always returned on valid input, regardless of account existence
  - **MessageResponse**:
    - `message`: string (optional)

- **422** — Validation failed
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

- **429** — Rate limit exceeded
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### POST `/api/auth/logout`
Revoke the current refresh token and clear the cookie

Legacy shared endpoint, kept only for already-deployed frontends. New clients should use /api/auth/{main,staff,member}/logout.


**Auth:** Public — no token required

**Responses:**

- **204** — Logged out (cookie cleared, refresh token revoked if it existed)

---

### POST `/api/auth/main/google`
Login as Main Admin via Google/Firebase id-token

Verifies the Google id-token (audience = GOOGLE_CLIENT_ID) via google-auth-library. The Google account must already be linked to an existing `main_admin` user by email (Google never creates new accounts). Not validated by zod — body is read directly as `{ idToken }`.


**Auth:** Public — no token required

**Request body:**
- **GoogleLoginRequest**:
  - `idToken`: string **(required)** — Google/Firebase id-token from the client SDK

**Responses:**

- **200** — Authenticated
  - **AuthResponse**:
    - `user` (optional):
      - **AuthUser**:
        - `id`: string (uuid) (optional)
        - `role`: enum: `main_admin` | `ceo` | `admin` | `mentor` | `student` | `parent` | `methodist` (optional)
        - `organizationId`: string (uuid) (optional)
        - `branchId`: string (uuid) (optional)
        - `firstName`: string (optional)
        - `lastName`: string (optional)
    - `accessToken`: string (optional) — JWT, 15 min TTL

- **400** — idToken required
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **401** — Invalid Google token, or email not verified
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — No account for this Google email, account not allowed here, or frozen
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **503** — Google login is not configured on this server (missing GOOGLE_CLIENT_ID)
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### POST `/api/auth/main/login`
Login as Main Admin (email + password)

Only accounts with role `main_admin` may authenticate here. Any other role returns the same 401 as a wrong password (no role/account enumeration). On success a `refresh_token` httpOnly cookie (path `/api/auth`, 30 days) is set.


**Auth:** Public — no token required

**Request body:**
- **LoginRequest**:
  - `login`: string **(required)** — Email (staff/main_admin) or 8-char login code (student/parent)
  - `password`: string **(required)**

**Responses:**

- **200** — Authenticated
  - **AuthResponse**:
    - `user` (optional):
      - **AuthUser**:
        - `id`: string (uuid) (optional)
        - `role`: enum: `main_admin` | `ceo` | `admin` | `mentor` | `student` | `parent` | `methodist` (optional)
        - `organizationId`: string (uuid) (optional)
        - `branchId`: string (uuid) (optional)
        - `firstName`: string (optional)
        - `lastName`: string (optional)
    - `accessToken`: string (optional) — JWT, 15 min TTL

- **401** — Invalid login or password
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Account is frozen
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **422** — Validation failed
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

- **429** — Rate limit exceeded (20 req/min per IP on /api/auth, plus global limiter)
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### POST `/api/auth/member/login`
Login as member (student, parent) via login-code + password

`login` field carries the 8-char login code for student/parent accounts (not an email). Only role `student` or `parent` accepted. Sets the `refresh_token` httpOnly cookie on success.


**Auth:** Public — no token required

**Request body:**
- **LoginRequest**:
  - `login`: string **(required)** — Email (staff/main_admin) or 8-char login code (student/parent)
  - `password`: string **(required)**

**Responses:**

- **200** — Authenticated
  - **AuthResponse**:
    - `user` (optional):
      - **AuthUser**:
        - `id`: string (uuid) (optional)
        - `role`: enum: `main_admin` | `ceo` | `admin` | `mentor` | `student` | `parent` | `methodist` (optional)
        - `organizationId`: string (uuid) (optional)
        - `branchId`: string (uuid) (optional)
        - `firstName`: string (optional)
        - `lastName`: string (optional)
    - `accessToken`: string (optional) — JWT, 15 min TTL

- **401** — Invalid login or password
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Account is frozen
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **422** — Validation failed
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

### POST `/api/auth/member/logout`
Revoke the current refresh token, scoped to this panel's own cookie

Same as /api/auth/logout, but clears the group-scoped cookie.

**Auth:** Public — no token required

**Responses:**

- **204** — Logged out (cookie cleared, refresh token revoked if it existed)

---

### POST `/api/auth/member/refresh`
Rotate refresh token, scoped to this panel's own cookie

Same rotation/reuse-detection as /api/auth/refresh, but reads/writes a group-scoped cookie (`refresh_token_main` / `_staff` / `_member`) instead of the shared one. A token belonging to a role outside this group is rejected with 401 even if presented (defense in depth — in practice it can't happen, since login only ever writes the matching group's cookie).


**Auth:** Public — no token required

**Responses:**

- **200** — New token pair issued
  - **AuthResponse**:
    - `user` (optional):
      - **AuthUser**:
        - `id`: string (uuid) (optional)
        - `role`: enum: `main_admin` | `ceo` | `admin` | `mentor` | `student` | `parent` | `methodist` (optional)
        - `organizationId`: string (uuid) (optional)
        - `branchId`: string (uuid) (optional)
        - `firstName`: string (optional)
        - `lastName`: string (optional)
    - `accessToken`: string (optional) — JWT, 15 min TTL

- **401** — Refresh token missing, invalid, expired, wrong role, or reuse detected
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Account is frozen
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### POST `/api/auth/refresh`
Rotate refresh token and issue a new access token

Legacy shared endpoint, kept only for already-deployed frontends. New clients should use /api/auth/{main,staff,member}/refresh — those read a group-scoped cookie so a session from one panel can't leak into another (this endpoint's single `refresh_token` cookie has no role check). Implements rotation with reuse-detection: presenting an already-revoked token revokes the user's entire token family and returns 401.


**Auth:** Public — no token required

**Responses:**

- **200** — New token pair issued
  - **AuthResponse**:
    - `user` (optional):
      - **AuthUser**:
        - `id`: string (uuid) (optional)
        - `role`: enum: `main_admin` | `ceo` | `admin` | `mentor` | `student` | `parent` | `methodist` (optional)
        - `organizationId`: string (uuid) (optional)
        - `branchId`: string (uuid) (optional)
        - `firstName`: string (optional)
        - `lastName`: string (optional)
    - `accessToken`: string (optional) — JWT, 15 min TTL

- **401** — Refresh token missing, invalid, expired, or reuse detected
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Account is frozen
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### POST `/api/auth/reset-password`
Confirm OTP and set a new password

On success, revokes ALL of the user's existing refresh tokens (forces re-login on every device) and deletes the OTP. 400 is returned both for a wrong/expired code and for an unknown email (no enumeration). After 3 failed attempts the code is invalidated and 429 is returned.


**Auth:** Public — no token required

**Request body:**
- **ResetPasswordRequest**:
  - `email`: string (email) **(required)**
  - `otp`: string **(required)**
  - `newPassword`: string **(required)**

**Responses:**

- **200** — Password updated
  - **MessageResponse**:
    - `message`: string (optional)

- **400** — Code expired/not requested, invalid code, or invalid request
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **422** — Validation failed
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

- **429** — Too many invalid attempts, request a new code (or rate limit exceeded)
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### POST `/api/auth/staff/google`
Login as staff (admin, ceo, mentor, methodist) via Google/Firebase id-token

Same flow as /api/auth/main/google, restricted to staff roles.

**Auth:** Public — no token required

**Request body:**
- **GoogleLoginRequest**:
  - `idToken`: string **(required)** — Google/Firebase id-token from the client SDK

**Responses:**

- **200** — Authenticated
  - **AuthResponse**:
    - `user` (optional):
      - **AuthUser**:
        - `id`: string (uuid) (optional)
        - `role`: enum: `main_admin` | `ceo` | `admin` | `mentor` | `student` | `parent` | `methodist` (optional)
        - `organizationId`: string (uuid) (optional)
        - `branchId`: string (uuid) (optional)
        - `firstName`: string (optional)
        - `lastName`: string (optional)
    - `accessToken`: string (optional) — JWT, 15 min TTL

- **400** — idToken required
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **401** — Invalid Google token, or email not verified
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — No account for this Google email, account not allowed here, or frozen
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **503** — Google login is not configured on this server (missing GOOGLE_CLIENT_ID)
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### POST `/api/auth/staff/login`
Login as staff (admin, ceo, mentor, methodist) via email + password

Only accounts with role `admin`, `ceo`, `mentor` or `methodist` may authenticate here. Sets the `refresh_token` httpOnly cookie on success.


**Auth:** Public — no token required

**Request body:**
- **LoginRequest**:
  - `login`: string **(required)** — Email (staff/main_admin) or 8-char login code (student/parent)
  - `password`: string **(required)**

**Responses:**

- **200** — Authenticated
  - **AuthResponse**:
    - `user` (optional):
      - **AuthUser**:
        - `id`: string (uuid) (optional)
        - `role`: enum: `main_admin` | `ceo` | `admin` | `mentor` | `student` | `parent` | `methodist` (optional)
        - `organizationId`: string (uuid) (optional)
        - `branchId`: string (uuid) (optional)
        - `firstName`: string (optional)
        - `lastName`: string (optional)
    - `accessToken`: string (optional) — JWT, 15 min TTL

- **401** — Invalid login or password
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Account is frozen
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **422** — Validation failed
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
