# Student Shop

Coin shop: browse/purchase (student), manage items (admin/mentor)

[← back to index](./README.md)

### GET `/api/student/shop/items`
List active, in-stock shop items for the caller's branch

Open to student, admin, and mentor (`req.user.branchId` taken directly from the JWT).

**Auth:** Bearer JWT required
**Role(s):** student (purchase) + admin/mentor (manage items)

**Responses:**

- **200** — List of items
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - _array of:_
      - **ShopItem**:
        - `id`: string (uuid) (optional)
        - `branch_id`: string (uuid) (optional)
        - `name`: string (optional)
        - `image_key`: string (optional)
        - `coin_price`: integer (optional)
        - `stock`: integer (optional)
        - `is_archived`: boolean (optional)
        - `created_at`: string (date-time) (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **402** — Payment overdue — access is blocked until paid (students only)
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

### POST `/api/student/shop/items`
Create a shop item (admin/mentor only — checked in the controller, not just authorize)

**Auth:** Bearer JWT required
**Role(s):** student (purchase) + admin/mentor (manage items)

**Request body:**
- **CreateShopItemRequest**:
  - `name`: string **(required)**
  - `imageKey`: string (optional)
  - `coinPrice`: integer **(required)**
  - `stock`: integer **(required)**

**Responses:**

- **201** — Item created
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - **ShopItem**:
      - `id`: string (uuid) (optional)
      - `branch_id`: string (uuid) (optional)
      - `name`: string (optional)
      - `image_key`: string (optional)
      - `coin_price`: integer (optional)
      - `stock`: integer (optional)
      - `is_archived`: boolean (optional)
      - `created_at`: string (date-time) (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Forbidden — student cannot create shop items
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

### PATCH `/api/student/shop/items/{itemId}`
Update a shop item (admin/mentor only, partial — at least one field)

A foreign-branch item is indistinguishable from a non-existent one (404). Blocked with 403 if the item is archived (archiveGuard).


**Auth:** Bearer JWT required
**Role(s):** student (purchase) + admin/mentor (manage items)

**Params:**
- `itemId` (path, string) **(required)**

**Request body:**
- **UpdateShopItemRequest**:
  - `name`: string (optional)
  - `imageKey`: string (optional)
  - `coinPrice`: integer (optional)
  - `stock`: integer (optional)

**Responses:**

- **200** — Updated item
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - **ShopItem**:
      - `id`: string (uuid) (optional)
      - `branch_id`: string (uuid) (optional)
      - `name`: string (optional)
      - `image_key`: string (optional)
      - `coin_price`: integer (optional)
      - `stock`: integer (optional)
      - `is_archived`: boolean (optional)
      - `created_at`: string (date-time) (optional)

- **401** — Missing/invalid/expired bearer token
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **403** — Forbidden (student), or item is archived
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **404** — Item not found (includes items of another branch)
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

### POST `/api/student/shop/items/{itemId}/purchase`
Purchase a shop item with coins

Locks the item row, deducts `coinPrice` coins via `changeCoins` (which throws 422 if the student's balance is insufficient — rolling back the whole transaction, no order created), creates the order, and decrements stock — all in one transaction.


**Auth:** Bearer JWT required
**Role(s):** student (purchase) + admin/mentor (manage items)

**Params:**
- `itemId` (path, string) **(required)**

**Responses:**

- **201** — Order created
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - **ShopOrder**:
      - `id`: string (uuid) (optional)
      - `branch_id`: string (uuid) (optional)
      - `item_id`: string (uuid) (optional)
      - `student_id`: string (uuid) (optional)
      - `coin_price`: integer (optional)
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

- **404** — Item not found (includes items of another branch)
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **409** — Item is unavailable (archived or out of stock)
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **422** — Insufficient coin balance, or validation failed
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### GET `/api/student/shop/orders`
Purchase history of the current student

**Auth:** Bearer JWT required
**Role(s):** student (purchase) + admin/mentor (manage items)

**Responses:**

- **200** — List of orders
  - `success`: boolean (optional) _e.g. true_
  - `data` (optional):
    - _array of:_
      - **ShopOrder**:
        - `id`: string (uuid) (optional)
        - `branch_id`: string (uuid) (optional)
        - `item_id`: string (uuid) (optional)
        - `student_id`: string (uuid) (optional)
        - `coin_price`: integer (optional)
        - `created_at`: string (date-time) (optional)
      - `item_name`: string (optional)
      - `image_key`: string (optional)

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
