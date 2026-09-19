# Mentor


[← back to index](./README.md)

### GET `/api/mentor/students/{studentId}/stats`
Statistics for one student (attendance, homework, tests, coins)

Aggregated in a single call: every query is scoped to groups led by the requesting mentor, so a student from someone else's group answers 404 — indistinguishable from one that does not exist. Homework and tests are LEFT JOINed, so assignments the student never submitted are present in the list with state `missed` or `pending`.


**Auth:** Bearer JWT required
**Role(s):** authenticated

**Params:**
- `studentId` (path, string) **(required)**

**Responses:**

- **200** — Student statistics

- **404** — Student is not in any of your groups

---
