# Student

Student's own home dashboard, homework, tests, videos, leaderboard

[← back to index](./README.md)

### GET `/api/student/home`
Student dashboard — coin balance, debt, weekly rank, groups, upcoming homework

Blocked with 402 (via `blockIfOverdue`) if the student has an unpaid overdue invoice. `upcomingHomework` is the top 5 non-graded assignments sorted by nearest deadline (deadlines already in the future).


**Auth:** Bearer JWT required
**Role(s):** student (own data only)

**Responses:**

- **200** — Dashboard data
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - `coins`: integer (optional)
    - `totalDebt`: number (optional)
    - `rank` (optional):
      - `rank`: integer (optional)
      - `coins`: integer (optional)
    - `groups` (optional):
      - _array of:_
        - `id`: string (uuid) (optional)
        - `name`: string (optional)
        - `subject`: string (optional)
        - `mentorName`: string (optional)
    - `upcomingHomework` (optional):
      - _array of:_
        - **Homework**:
          - `id`: string (uuid) (optional)
          - `branch_id`: string (uuid) (optional)
          - `group_id`: string (uuid) (optional)
          - `created_by`: string (uuid) (optional)
          - `title`: string (optional)
          - `description`: string (optional)
          - `attachment_key`: string (optional)
          - `max_score`: integer (optional)
          - `coin_reward`: integer (optional)
          - `deadline`: string (date-time) (optional)
          - `is_archived`: boolean (optional)
          - `created_at`: string (date-time) (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **402** — Payment overdue — access is blocked until paid
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

### GET `/api/student/homework`
List homework across the student's own groups, with own submission status

Blocked with 402 if the student has an unpaid overdue invoice.

**Auth:** Bearer JWT required
**Role(s):** student (own data only)

**Responses:**

- **200** — List of homework
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - _array of:_
      - `id`: string (uuid) (optional)
      - `group_id`: string (uuid) (optional)
      - `title`: string (optional)
      - `description`: string (optional)
      - `attachment_key`: string (optional)
      - `max_score`: integer (optional)
      - `coin_reward`: integer (optional)
      - `deadline`: string (date-time) (optional)
      - `created_at`: string (date-time) (optional)
      - `submission_status`: enum: `submitted` | `late` | `graded` | `null` (optional)
      - `score`: integer (optional)
      - `submitted_at`: string (date-time) (optional)
      - `file_key`: string (optional)
      - `text_answer`: string (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **402** — Payment overdue — access is blocked until paid
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

### POST `/api/student/homework/{homeworkId}/submit`
Submit (or resubmit, if not yet graded) a homework solution

At least one of `fileKey`/`textAnswer` is required. Status becomes `late` if submitted after the deadline, else `submitted`. Resubmitting after grading returns 409 (a DB guard prevents overwriting a graded submission).


**Auth:** Bearer JWT required
**Role(s):** student (own data only)

**Params:**
- `homeworkId` (path, string) **(required)**

**Request body:**
- `fileKey`: string (optional)
- `textAnswer`: string (optional)

**Responses:**

- **201** — Submission recorded
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - **HomeworkSubmission**:
      - `id`: string (uuid) (optional)
      - `homework_id`: string (uuid) (optional)
      - `student_id`: string (uuid) (optional)
      - `status`: enum: `submitted` | `late` | `graded` (optional)
      - `file_key`: string (optional)
      - `text_answer`: string (optional)
      - `score`: integer (optional)
      - `submitted_at`: string (date-time) (optional)
      - `graded_by`: string (uuid) (optional)
      - `graded_at`: string (date-time) (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **402** — Payment overdue — access is blocked until paid
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Not a member of this group
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **404** — Homework not found
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **409** — Homework is already graded, or is archived
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

### GET `/api/student/homework/{homeworkId}/upload-url`
Get a presigned S3 upload URL for a homework solution file

Requires the student to be a member of the homework's group (403 if not) and the homework to not be archived (409 if archived).


**Auth:** Bearer JWT required
**Role(s):** student (own data only)

**Params:**
- `homeworkId` (path, string) **(required)**
- `filename` (query, string) **(required)**
- `contentType` (query, string) **(required)**

**Responses:**

- **200** — Presigned upload URL + object key
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - `uploadUrl`: string (uri) (optional)
    - `fileKey`: string (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **402** — Payment overdue — access is blocked until paid
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Not a member of this group
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **404** — Homework not found
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **409** — Homework is archived
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

### GET `/api/student/leaderboard`
Branch leaderboard (top 20) for the current week or month, plus own rank

Backed by a Redis ZSET incremented on positive coin changes (`coins.service.emitCoinsChanged`); resets naturally when the period key rolls over.


**Auth:** Bearer JWT required
**Role(s):** student (own data only)

**Params:**
- `period` (query, string) (optional)

**Responses:**

- **200** — Leaderboard
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - **Leaderboard**:
      - `period`: enum: `week` | `month` (optional)
      - `top` (optional):
        - _array of:_
          - `studentId`: string (uuid) (optional)
          - `coins`: integer (optional)
          - `rank`: integer (optional)
          - `firstName`: string (optional)
          - `lastName`: string (optional)
          - `avatarKey`: string (optional)
      - `me` (optional):
        - `rank`: integer (optional)
        - `coins`: integer (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **402** — Payment overdue — access is blocked until paid
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

### GET `/api/student/lessons`
Topics + lessons of the student's courses (via group.training_type_id), with progress

Real methodology content (training_types → topics → methodology_lessons → methodology_questions), replacing what used to be a frontend mock. A student sees the union of every training_type their active groups are linked to. Progress fields (score/submissionStatus) are only populated when a real attempt/submission exists — never fabricated.


**Auth:** Bearer JWT required
**Role(s):** student (own data only)

**Responses:**

- **200** — List of topics, each with its lessons

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **402** — Payment overdue — access is blocked until paid
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### GET `/api/student/lessons/{lessonId}`
Lesson detail (test-type includes attempt status, practical-type includes submission status)

**Auth:** Bearer JWT required
**Role(s):** student (own data only)

**Params:**
- `lessonId` (path, string) **(required)**

**Responses:**

- **200** — Lesson detail

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **404** — Lesson not found (outside student's courses)
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### POST `/api/student/lessons/{lessonId}/homework`
Submit a practical-lesson homework (file and/or text answer)

No grading endpoint exists yet for this — submission is recorded as 'submitted', mentor/methodist grading is a follow-up piece of work.


**Auth:** Bearer JWT required
**Role(s):** student (own data only)

**Params:**
- `lessonId` (path, string) **(required)**

**Request body:**
- `fileKey`: string (optional)
- `textAnswer`: string (optional)

**Responses:**

- **200** — Submission recorded

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **404** — Lesson not found

- **409** — Not a practical lesson, or already graded

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

### GET `/api/student/lessons/{lessonId}/homework/upload-url`
Presigned S3 upload url for a practical-lesson submission file

**Auth:** Bearer JWT required
**Role(s):** student (own data only)

**Params:**
- `lessonId` (path, string) **(required)**
- `filename` (query, string) **(required)**
- `contentType` (query, string) (optional)

**Responses:**

- **200** — Presigned upload URL + fileKey

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **404** — Lesson not found

- **409** — Not a practical lesson

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

### POST `/api/student/lessons/{lessonId}/start`
Start (or resume) a lesson test attempt

Idempotent while the attempt is unfinished — reloading the page just returns the same questions again, so an unlimited-time test survives a refresh. Only errors once the attempt is already submitted.


**Auth:** Bearer JWT required
**Role(s):** student (own data only)

**Params:**
- `lessonId` (path, string) **(required)**

**Responses:**

- **201** — Attempt started or resumed — questions without correct answers

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **404** — Lesson not found

- **409** — Not a test lesson, or already submitted

---

### POST `/api/student/lessons/{lessonId}/submit`
Submit answers for a lesson test and get scored

Score >= 50 and a nonzero coin_reward grants coins immediately via the same changeCoins() path as group tests. answers is keyed by questionId.


**Auth:** Bearer JWT required
**Role(s):** student (own data only)

**Params:**
- `lessonId` (path, string) **(required)**

**Request body:**
- `answers` **(required)**:
  - _(free-form object)_

**Responses:**

- **200** — Score

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **404** — Lesson not found

- **409** — Not a test lesson, attempt not started, or already submitted

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

### GET `/api/student/tests`
List tests across the student's own groups (correct-answer indices stripped)

**Auth:** Bearer JWT required
**Role(s):** student (own data only)

**Responses:**

- **200** — List of tests
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - _array of:_
      - **TestForStudent**:
        - **Test**:
          - `id`: string (uuid) (optional)
          - `branch_id`: string (uuid) (optional)
          - `group_id`: string (uuid) (optional)
          - `created_by`: string (uuid) (optional)
          - `title`: string (optional)
          - `questions` (optional):
            - _array of:_
              - `q`: string (optional)
              - `options` (optional):
                - _array of:_
                  - _string_
              - `correct`: integer (optional) — Index of the correct option
          - `duration_min`: integer (optional)
          - `starts_at`: string (date-time) (optional)
          - `ends_at`: string (date-time) (optional)
          - `coin_reward`: integer (optional)
          - `is_archived`: boolean (optional)
          - `created_at`: string (date-time) (optional)
        - `questions` (optional):
          - _array of:_
            - `q`: string (optional)
            - `options` (optional):
              - _array of:_
                - _string_

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **402** — Payment overdue — access is blocked until paid
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

### GET `/api/student/tests/{testId}`
Get a test to take (correct-answer indices stripped, checks membership + availability window)

**Auth:** Bearer JWT required
**Role(s):** student (own data only)

**Params:**
- `testId` (path, string) **(required)**

**Responses:**

- **200** — Test data
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - **TestForStudent**:
      - **Test**:
        - `id`: string (uuid) (optional)
        - `branch_id`: string (uuid) (optional)
        - `group_id`: string (uuid) (optional)
        - `created_by`: string (uuid) (optional)
        - `title`: string (optional)
        - `questions` (optional):
          - _array of:_
            - `q`: string (optional)
            - `options` (optional):
              - _array of:_
                - _string_
            - `correct`: integer (optional) — Index of the correct option
        - `duration_min`: integer (optional)
        - `starts_at`: string (date-time) (optional)
        - `ends_at`: string (date-time) (optional)
        - `coin_reward`: integer (optional)
        - `is_archived`: boolean (optional)
        - `created_at`: string (date-time) (optional)
      - `questions` (optional):
        - _array of:_
          - `q`: string (optional)
          - `options` (optional):
            - _array of:_
              - _string_

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **402** — Payment overdue — access is blocked until paid
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Not a member of this group
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **404** — Test not found
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **409** — Test is archived, not open yet, or closed
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

### POST `/api/student/tests/{testId}/start`
Start a test attempt (records started_at; one attempt per student per test)

**Auth:** Bearer JWT required
**Role(s):** student (own data only)

**Params:**
- `testId` (path, string) **(required)**

**Responses:**

- **201** — Attempt started — timer data for the client
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - `startedAt`: string (date-time) (optional)
    - `durationMin`: integer (optional)
    - `endsAt`: string (date-time) (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **402** — Payment overdue — access is blocked until paid
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Not a member of this group
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **404** — Test not found
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **409** — Test is archived, not open yet, closed, or attempt already started
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

### POST `/api/student/tests/{testId}/submit`
Submit answers and get scored

Server enforces the timer (attempt start + durationMin, capped by the test's `endsAt`) — expired timer returns 409. Score is `round(correctCount/questionCount*100)`. If score >= 50 and the test has a nonzero coin reward, coins are granted immediately (not queued).


**Auth:** Bearer JWT required
**Role(s):** student (own data only)

**Params:**
- `testId` (path, string) **(required)**

**Request body:**
- `answers` **(required)**:
  - _array of:_
    - _integer_

**Responses:**

- **200** — Score
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - `score`: integer (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **402** — Payment overdue — access is blocked until paid
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Not a member of this group
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **404** — Test not found
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **409** — Test is archived, attempt not started, already submitted, or time is up
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

### GET `/api/student/videos`
List videos across the student's own groups (non-archived)

**Auth:** Bearer JWT required
**Role(s):** student (own data only)

**Responses:**

- **200** — List of videos
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - _array of:_
      - `id`: string (uuid) (optional)
      - `group_id`: string (uuid) (optional)
      - `title`: string (optional)
      - `duration_sec`: integer (optional)
      - `created_at`: string (date-time) (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **402** — Payment overdue — access is blocked until paid
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

### GET `/api/student/videos/{videoId}/stream-url`
Get a presigned S3 GET URL to stream a video

Requires the student to be a member of the video's group (403 if not).

**Auth:** Bearer JWT required
**Role(s):** student (own data only)

**Params:**
- `videoId` (path, string) **(required)**

**Responses:**

- **200** — Presigned stream URL
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - `streamUrl`: string (uri) (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **402** — Payment overdue — access is blocked until paid
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Not a member of this group
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **404** — Video not found
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
