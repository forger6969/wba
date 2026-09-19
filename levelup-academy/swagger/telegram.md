# Telegram


[← back to index](./README.md)

### POST `/api/telegram/bind-token`
Issue a one-time token to link the caller's account to the Telegram bot

Student and parent accounts only — any other role gets 403. Returns a short-lived token (kept in Redis, single-use) plus a ready deep link; opening the link starts the bot with the token, which the bot then consumes to bind the chat to the user. Answers 503 when TELEGRAM_BOT_USERNAME is unset — the deep link cannot be built.


**Auth:** Bearer JWT required
**Role(s):** authenticated

**Responses:**

- **201** — Token issued
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - `token`: string (optional)
    - `expiresIn`: integer (optional) — TTL in seconds
    - `deepLink`: string (optional) _e.g. "https://t.me/levelup_bot?start=abc123"_

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Caller is not a student or parent
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **503** — Telegram is not configured on this server

---

### GET `/api/telegram/login/poll`
Check whether the Telegram login was confirmed, and collect the session

**Auth:** Bearer JWT required
**Role(s):** authenticated

**Params:**
- `nonce` (query, string) **(required)**

**Responses:**

- **200** — status=pending — keep polling; status=unknown — the nonce expired or never existed, start over; status=approved — tokens are in the payload.


- **400** — nonce missing

---

### POST `/api/telegram/login/start`
Begin login through Telegram — issues a nonce and a deep link

Public on purpose: this IS the login. The nonce alone grants nothing; it only becomes usable after the bot matches the chat against telegram_accounts, so an account with no linked Telegram cannot be entered this way.


**Auth:** Bearer JWT required
**Role(s):** authenticated

**Responses:**

- **201** — Nonce issued

- **503** — Telegram is not configured on this server

---

### GET `/api/telegram/status`
Whether the caller's account is linked to Telegram

**Auth:** Bearer JWT required
**Role(s):** authenticated

**Responses:**

- **200** — Link state
  - `success`: boolean (optional)
  - `data` (optional):
    - `configured`: boolean (optional) — server has a bot username
    - `linked`: boolean (optional)
    - `username`: string (optional)
    - `firstName`: string (optional)
    - `linkedAt`: string (date-time) (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### DELETE `/api/telegram/unlink`
Unlink the caller's Telegram from their account

Mirrors the bot's /stop, but from the cabinet. Without it a user who lost access to the linked Telegram could never bind a new one — telegram_accounts.user_id is unique, so the next insert always failed.


**Auth:** Bearer JWT required
**Role(s):** authenticated

**Responses:**

- **200** — Unlinked (or there was nothing to unlink)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---
