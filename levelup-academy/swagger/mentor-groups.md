# Mentor Groups

Mentor's own groups + roster (read-only; CRUD is Admin-side)

[← back to index](./README.md)

### GET `/api/mentor/groups`
List the mentor's own groups (dashboard + selectors for attendance/homework/tests/coins)

**Auth:** Bearer JWT required
**Role(s):** mentor (own groups only)

**Responses:**

- **200** — List of groups
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
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

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### GET `/api/mentor/groups/{groupId}/stats`
Group statistics with per-student comparison

One call instead of a submissions/results request per assignment per student. Returns the group averages, the spread of students across performance bands, and a per-student row ranked by an overall score (the mean of whichever of attendance / homework / tests that student actually has — a newcomer with no tests yet is not penalised for it). Scoped to the requesting mentor's own group; anything else answers 404.


**Auth:** Bearer JWT required
**Role(s):** mentor (own groups only)

**Params:**
- `groupId` (path, string) **(required)**

**Responses:**

- **200** — Group statistics

- **404** — Group not found or belongs to another mentor

---

### GET `/api/mentor/groups/{groupId}/students`
Roster of a group's students (own group only)

**Auth:** Bearer JWT required
**Role(s):** mentor (own groups only)

**Params:**
- `groupId` (path, string) **(required)**

**Responses:**

- **200** — Group roster
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - _array of:_
      - `id`: string (uuid) (optional)
      - `firstName`: string (optional)
      - `lastName`: string (optional)
      - `status`: string (optional)
      - `coinBalance`: integer (optional)
      - `joinedAt`: string (date-time) (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **404** — Group not found (includes groups belonging to another mentor)
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
