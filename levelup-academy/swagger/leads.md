# Leads

Public landing-page lead submission

[← back to index](./README.md)

### POST `/api/leads`
Submit a landing-page lead (public, no auth)

Public form submission from the marketing landing page. Rate-limited to 5 requests/min per IP (route-specific bucket) in addition to the global limiter. Only `{ id }` of the created lead is returned (no internal fields leaked).


**Auth:** Public — no token required

**Request body:**
- **LeadSubmitRequest**:
  - `name`: string **(required)**
  - `phone`: string **(required)**
  - `centerName`: string (optional)
  - `centerSize`: string (optional)
  - `message`: string (optional)

**Responses:**

- **201** — Lead recorded
  - `id`: string (uuid) (optional)

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
