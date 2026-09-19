# Chat

Realtime chat REST history (sending is via Socket.io, not REST)

[← back to index](./README.md)

### GET `/api/chat/{roomKey}/messages`
Cursor-paginated message history for a chat room

Room access rules (`requireRoomAccess`): `global` — everyone except students; `parent:<uuid>` — that parent themself or any staff role; `group:<uuid>` — main_admin/ceo/admin unconditionally, or the group's own mentor/enrolled students. `limit` is clamped server-side to [1, 100] (non-numeric defaults to 50); `cursor` must be a valid ISO timestamp (checked before hitting the DB — otherwise Postgres would 500 on a bad `::timestamptz` cast). This is REST read-only history; sending messages happens over the Socket.io chat namespace, not via this REST API.


**Auth:** Bearer JWT required
**Role(s):** any authenticated role (scoped to own chats)

**Params:**
- `roomKey` (path, string) **(required)**
- `limit` (query, integer) (optional)
- `cursor` (query, string) (optional) — ISO timestamp — returns messages older than this

**Responses:**

- **200** — Message history (newest first)
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - `messages` (optional):
      - _array of:_
        - **ChatMessage**:
          - `id`: string (uuid) (optional)
          - `chat_type`: string (optional)
          - `room_key`: string (optional)
          - `sender_id`: string (uuid) (optional)
          - `body`: string (optional)
          - `attachment_key`: string (optional)
          - `created_at`: string (date-time) (optional)
          - `sender_first_name`: string (optional)
          - `sender_last_name`: string (optional)
          - `sender_role`: string (optional)
    - `nextCursor`: string (date-time) (optional)

- **400** — cursor must be a valid ISO timestamp, or invalid/unknown room key
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

- **403** — No access to this room
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### POST `/api/chat/{roomKey}/read`
Mark incoming messages of a room as read

Marks every message in the room not sent by the caller as read. Room access is enforced by the same `requireRoomAccess` rules as history.


**Auth:** Bearer JWT required
**Role(s):** any authenticated role (scoped to own chats)

**Params:**
- `roomKey` (path, string) **(required)**

**Responses:**

- **200** — Number of messages marked read
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - `updated`: integer (optional) _e.g. 3_

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — No access to this room
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### GET `/api/chat/contacts`
Parents this staff member may privately message

Contact list for private `dm:<staffId>:<parentId>` conversations, with the last message and unread count per room. Scope mirrors the send-time check exactly: a mentor sees parents whose child is in one of their own groups, an admin — parents of their branch, a ceo — parents of their organization. Other roles get an empty list. Staff never see each other's conversations, so this list is per-user by construction.


**Auth:** Bearer JWT required
**Role(s):** any authenticated role (scoped to own chats)

**Responses:**

- **200** — Contact list (most recent conversation first)
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - _array of:_
      - **ChatContact**:
        - `id`: string (uuid) (optional) — Parent user id
        - `first_name`: string (optional)
        - `last_name`: string (optional)
        - `avatar_key`: string (optional)
        - `child_names`: string (optional) — Comma-separated children of this parent (context for the staff member)
        - `room_key`: string (optional) _e.g. "dm:3fa85f64-…:9c1b2d34-…"_
        - `last_message`: string (optional)
        - `last_message_at`: string (date-time) (optional)
        - `unread_count`: integer (optional) _e.g. 2_

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### POST `/api/chat/dm`
Send a direct message over HTTP

Sends a private message without a websocket. Direction follows the caller's role, never a request field: staff (mentor/admin/ceo) message a parent or a student, while a parent or student may only reply to a staff member who is already allowed to talk to them — neither can open a conversation. Permission checks and persistence are shared with the socket events, and the message is still pushed live to both participants' `user:<id>` rooms.


**Auth:** Bearer JWT required
**Role(s):** any authenticated role (scoped to own chats)

**Request body:**
- `peerId`: string (uuid) **(required)** — The other participant — a parent/student for staff, a staff member for a parent/student
- `body`: string **(required)**

**Responses:**

- **201** — Message stored and delivered
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - **ChatMessage**:
      - `id`: string (uuid) (optional)
      - `chat_type`: string (optional)
      - `room_key`: string (optional)
      - `sender_id`: string (uuid) (optional)
      - `body`: string (optional)
      - `attachment_key`: string (optional)
      - `created_at`: string (date-time) (optional)
      - `sender_first_name`: string (optional)
      - `sender_last_name`: string (optional)
      - `sender_role`: string (optional)

- **400** — peerId must be a uuid

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Not allowed to message this person

- **422** — Empty or too long body

---

### GET `/api/chat/my-threads`
My conversations with staff (parent/student side)

AB-VERIFY: parent/student cannot start a `dm:<staffId>:<me>` conversation (only reply — see POST /chat/dm and requireRoomAccess), so this list is built from existing messages, not from an eligibility rule like /chat/contacts. Other roles get an empty list.


**Auth:** Bearer JWT required
**Role(s):** any authenticated role (scoped to own chats)

**Responses:**

- **200** — Threads (most recent message first)
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - _array of:_
      - **ChatContact**:
        - `id`: string (uuid) (optional) — Parent user id
        - `first_name`: string (optional)
        - `last_name`: string (optional)
        - `avatar_key`: string (optional)
        - `child_names`: string (optional) — Comma-separated children of this parent (context for the staff member)
        - `room_key`: string (optional) _e.g. "dm:3fa85f64-…:9c1b2d34-…"_
        - `last_message`: string (optional)
        - `last_message_at`: string (date-time) (optional)
        - `unread_count`: integer (optional) _e.g. 2_

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---
