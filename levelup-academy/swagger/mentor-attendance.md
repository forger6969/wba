# Mentor Attendance

Mentor: mark/read attendance for own groups

[← back to index](./README.md)

### POST `/api/mentor/attendance/groups/{groupId}`
Bulk mark/update attendance for a lesson date (own group only)

Upserts one row per student for the given `lessonDate` (unique on group_id+student_id+lesson_date — resubmitting the same date updates existing marks). A foreign group returns 404 (existence not disclosed to non-owning mentors). Blocked with 403 if the group is archived (archiveGuard). Duplicate `studentId` within one request is rejected by zod (422) before it can break the batch upsert.


**Auth:** Bearer JWT required
**Role(s):** mentor (own groups only)

**Params:**
- `groupId` (path, string) **(required)**

**Request body:**
- **MarkAttendanceRequest**:
  - `lessonDate`: string **(required)**
  - `records` **(required)**:
    - _array of:_
      - `studentId`: string (uuid) **(required)**
      - `status`: enum: `present` | `absent` | `late` | `excused` **(required)**
      - `comment`: string (optional)

**Responses:**

- **200** — Upserted attendance rows
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - _array of:_
      - **AttendanceRecord**:
        - `id`: string (uuid) (optional)
        - `branch_id`: string (uuid) (optional)
        - `group_id`: string (uuid) (optional)
        - `student_id`: string (uuid) (optional)
        - `lesson_date`: string (date) (optional)
        - `status`: enum: `present` | `absent` | `late` | `excused` (optional)
        - `marked_by`: string (uuid) (optional)
        - `comment`: string (optional)
        - `created_at`: string (date-time) (optional)
        - `updated_at`: string (date-time) (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Not this mentor's group's admin scope, or the group is archived
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

### GET `/api/mentor/attendance/groups/{groupId}`
Read attendance for a group — either a single date or a date range

Query must provide either `date`, or both `from` and `to` (validated by zod refine).

**Auth:** Bearer JWT required
**Role(s):** mentor (own groups only)

**Params:**
- `groupId` (path, string) **(required)**
- `date` (query, string) (optional)
- `from` (query, string) (optional)
- `to` (query, string) (optional)

**Responses:**

- **200** — Attendance rows (joined with student first/last name)
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - _array of:_
      - **AttendanceRecord**:
        - `id`: string (uuid) (optional)
        - `branch_id`: string (uuid) (optional)
        - `group_id`: string (uuid) (optional)
        - `student_id`: string (uuid) (optional)
        - `lesson_date`: string (date) (optional)
        - `status`: enum: `present` | `absent` | `late` | `excused` (optional)
        - `marked_by`: string (uuid) (optional)
        - `comment`: string (optional)
        - `created_at`: string (date-time) (optional)
        - `updated_at`: string (date-time) (optional)
      - `first_name`: string (optional)
      - `last_name`: string (optional)

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
