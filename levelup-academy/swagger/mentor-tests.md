# Mentor Tests

Mentor: create tests, list results

[← back to index](./README.md)

### GET `/api/mentor/tests/{testId}/results`
List student results for a test

**Auth:** Bearer JWT required
**Role(s):** mentor (own groups only)

**Params:**
- `testId` (path, string) **(required)**

**Responses:**

- **200** — List of results
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - _array of:_
      - **TestResult**:
        - `id`: string (uuid) (optional)
        - `test_id`: string (uuid) (optional)
        - `student_id`: string (uuid) (optional)
        - `started_at`: string (date-time) (optional)
        - `finished_at`: string (date-time) (optional)
        - `answers` (optional):
          - _array of:_
            - _integer_
        - `score`: integer (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **404** — Test not found, or its group belongs to another mentor
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

### POST `/api/mentor/tests/groups/{groupId}`
Create a test/exam for a group (own group only)

**Auth:** Bearer JWT required
**Role(s):** mentor (own groups only)

**Params:**
- `groupId` (path, string) **(required)**

**Request body:**
- **CreateTestRequest**:
  - `title`: string **(required)**
  - `questions` **(required)**:
    - _array of:_
      - `q`: string **(required)**
      - `options` **(required)**:
        - _array of:_
          - _string_
      - `correct`: integer **(required)** — Must be a valid index within options
  - `durationMin`: integer **(required)**
  - `startsAt`: string (date-time) (optional)
  - `endsAt`: string (date-time) (optional) — Must be after startsAt if both given
  - `coinReward`: integer (optional)

**Responses:**

- **201** — Test created
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
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

### GET `/api/mentor/tests/groups/{groupId}`
List tests of a group (mentor sees full data including correct-answer indices)

**Auth:** Bearer JWT required
**Role(s):** mentor (own groups only)

**Params:**
- `groupId` (path, string) **(required)**

**Responses:**

- **200** — List of tests
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - _array of:_
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
      - `attempts_count`: integer (optional)

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
