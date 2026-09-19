# Mentor Homework

Mentor: create homework, list submissions, grade

[← back to index](./README.md)

### GET `/api/mentor/homework/{homeworkId}/submissions`
List student submissions for a homework assignment

**Auth:** Bearer JWT required
**Role(s):** mentor (own groups only)

**Params:**
- `homeworkId` (path, string) **(required)**

**Responses:**

- **200** — List of submissions
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - _array of:_
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

- **404** — Homework not found, or its group belongs to another mentor
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

### POST `/api/mentor/homework/groups/{groupId}`
Create a homework assignment for a group (own group only)

**Auth:** Bearer JWT required
**Role(s):** mentor (own groups only)

**Params:**
- `groupId` (path, string) **(required)**

**Request body:**
- **CreateHomeworkRequest**:
  - `title`: string **(required)**
  - `description`: string (optional)
  - `attachmentKey`: string (optional)
  - `maxScore`: integer (optional)
  - `coinReward`: integer (optional)
  - `deadline`: string (date-time) **(required)**

**Responses:**

- **201** — Homework created
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
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

- **403** — Group is archived
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

### GET `/api/mentor/homework/groups/{groupId}`
List homework assigned to a group, with submission/graded counts

**Auth:** Bearer JWT required
**Role(s):** mentor (own groups only)

**Params:**
- `groupId` (path, string) **(required)**

**Responses:**

- **200** — List of homework
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
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
      - `submissions_count`: integer (optional)
      - `graded_count`: integer (optional)

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

### POST `/api/mentor/homework/submissions/{submissionId}/grade`
Grade a homework submission

Idempotent — grading an already-graded submission returns 409. On success, awards `homework.coinReward` coins to the student (via `changeCoins`, in the same transaction as the grade) if the homework has a nonzero coin reward, then emits a coins-changed event after commit.


**Auth:** Bearer JWT required
**Role(s):** mentor (own groups only)

**Params:**
- `submissionId` (path, string) **(required)**

**Request body:**
- `score`: integer **(required)**

**Responses:**

- **200** — Graded submission
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

- **404** — Submission not found, or its group belongs to another mentor
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **409** — Submission is already graded
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **422** — Validation failed, or score outside 0..max_score
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---
