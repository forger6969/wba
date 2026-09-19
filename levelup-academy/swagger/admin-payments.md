# Admin Payments

K-PAY: invoices, ad-hoc payments, refunds/voids, receipts

[← back to index](./README.md)

### POST `/api/admin/payments`
Record an ad-hoc payment outside the monthly billing schedule

Creates its own invoice, already marked paid (type `full` if one payment part, `split` if more than one). `parts` amounts must sum to `totalAmount` (validated by zod before the transaction opens). Decrements the student's outstanding debt and queues a `payment.received` notification after commit.


**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Request body:**
- **CreateAdHocPaymentRequest**:
  - `studentId`: string (uuid) **(required)**
  - `groupId`: string (uuid) (optional)
  - `periodMonth`: string (date) (optional)
  - `totalAmount`: number **(required)**
  - `parts` **(required)**:
    - _array of:_
      - `method`: enum: `cash` | `card` | `transfer` **(required)**
      - `amount`: number **(required)**
  - `comment`: string (optional)

**Responses:**

- **201** — Ad-hoc invoice created and paid
  - `invoice` (optional):
    - **Invoice**:
      - `id`: string (uuid) (optional)
      - `type`: enum: `full` | `split` (optional)
      - `status`: enum: `pending` | `partially_paid` | `paid` | `overdue` | `cancelled` (optional)
      - `totalAmount`: number (optional)
      - `paidAmount`: number (optional)
      - `dueDate`: string (date) (optional)
      - `periodMonth`: string (date) (optional)
      - `comment`: string (optional)
      - `source`: string (optional)
      - `createdAt`: string (date-time) (optional)
  - `transactions` (optional):
    - _array of:_
      - **Transaction**:
        - `id`: string (uuid) (optional)
        - `invoiceId`: string (uuid) (optional)
        - `method`: enum: `cash` | `card` | `transfer` (optional)
        - `status`: enum: `completed` | `refunded` | `voided` (optional)
        - `amount`: number (optional)
        - `receiptKey`: string (optional)
        - `splitBatchId`: string (uuid) (optional)
        - `createdAt`: string (date-time) (optional)

- **401** — Missing/invalid/expired bearer token
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

- **404** — Student not found in your branch
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **409** — Student is frozen
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

### GET `/api/admin/payments/invoices`
List invoices of the branch (paginated, filter by status/student)

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `page` (query, integer) (optional)
- `limit` (query, integer) (optional)
- `status` (query, string) (optional)
- `studentId` (query, string) (optional)

**Responses:**

- **200** — Paginated list of invoices
  - `invoices` (optional):
    - _array of:_
      - **Invoice**:
        - `id`: string (uuid) (optional)
        - `type`: enum: `full` | `split` (optional)
        - `status`: enum: `pending` | `partially_paid` | `paid` | `overdue` | `cancelled` (optional)
        - `totalAmount`: number (optional)
        - `paidAmount`: number (optional)
        - `dueDate`: string (date) (optional)
        - `periodMonth`: string (date) (optional)
        - `comment`: string (optional)
        - `source`: string (optional)
        - `createdAt`: string (date-time) (optional)
      - `student`: string (optional)
      - `group`: string (optional)
  - `meta` (optional):
    - **PageMeta**:
      - `total`: integer (optional)
      - `page`: integer (optional)
      - `limit`: integer (optional)
      - `totalPages`: integer (optional)

- **401** — Missing/invalid/expired bearer token
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

### POST `/api/admin/payments/invoices/{id}/pay`
Pay (fully or partially, single or split method) an existing invoice

Works for both auto-billed monthly invoices and manually pending ones. The remaining balance is only known under a row lock (FOR UPDATE) inside the transaction — parts summing above the remaining balance return 422 (not the usual zod validation 422, but a service-level check after locking). Queues a `payment.received` notification job after commit.


**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**

**Request body:**
- **PayInvoiceRequest**:
  - `parts` **(required)**:
    - _array of:_
      - `method`: enum: `cash` | `card` | `transfer` **(required)**
      - `amount`: number **(required)**

**Responses:**

- **200** — Invoice updated with new payment
  - `invoice` (optional):
    - **Invoice**:
      - `id`: string (uuid) (optional)
      - `type`: enum: `full` | `split` (optional)
      - `status`: enum: `pending` | `partially_paid` | `paid` | `overdue` | `cancelled` (optional)
      - `totalAmount`: number (optional)
      - `paidAmount`: number (optional)
      - `dueDate`: string (date) (optional)
      - `periodMonth`: string (date) (optional)
      - `comment`: string (optional)
      - `source`: string (optional)
      - `createdAt`: string (date-time) (optional)
  - `transactions` (optional):
    - _array of:_
      - **Transaction**:
        - `id`: string (uuid) (optional)
        - `invoiceId`: string (uuid) (optional)
        - `method`: enum: `cash` | `card` | `transfer` (optional)
        - `status`: enum: `completed` | `refunded` | `voided` (optional)
        - `amount`: number (optional)
        - `receiptKey`: string (optional)
        - `splitBatchId`: string (uuid) (optional)
        - `createdAt`: string (date-time) (optional)

- **401** — Missing/invalid/expired bearer token
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

- **404** — Invoice or student not found in your branch
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **409** — Invoice is already paid or cancelled
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **422** — Validation failed, or parts sum exceeds the remaining balance
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

---

### PATCH `/api/admin/payments/transactions/{id}/receipt`
Attach an already-uploaded receipt (S3 key) to a transaction

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**

**Request body:**
- `receiptKey`: string **(required)**

**Responses:**

- **200** — Receipt attached
  - `id`: string (uuid) (optional)
  - `receiptKey`: string (optional)

- **401** — Missing/invalid/expired bearer token
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

- **404** — Transaction not found in your branch
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

### GET `/api/admin/payments/transactions/{id}/receipt-upload-url`
Get a presigned S3 upload URL to attach a receipt to a transaction

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**
- `filename` (query, string) **(required)**
- `contentType` (query, string) **(required)**

**Responses:**

- **200** — Presigned upload URL + the S3 object key to attach afterwards
  - `uploadUrl`: string (uri) (optional)
  - `receiptKey`: string (optional)

- **401** — Missing/invalid/expired bearer token
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

- **404** — Transaction not found in your branch
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

### POST `/api/admin/payments/transactions/{id}/refund`
Refund a completed transaction

Reverses one transaction (sets its status to `refunded`), recalculates the parent invoice's paid amount, and re-increments the student's outstanding debt by the transaction amount. Queues a `payment.refunded` notification. Only transactions currently `completed` can be refunded.


**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**

**Request body:**
- `reason`: string **(required)** — Required for a refund

**Responses:**

- **200** — Invoice after reversal
  - `invoice` (optional):
    - **Invoice**:
      - `id`: string (uuid) (optional)
      - `type`: enum: `full` | `split` (optional)
      - `status`: enum: `pending` | `partially_paid` | `paid` | `overdue` | `cancelled` (optional)
      - `totalAmount`: number (optional)
      - `paidAmount`: number (optional)
      - `dueDate`: string (date) (optional)
      - `periodMonth`: string (date) (optional)
      - `comment`: string (optional)
      - `source`: string (optional)
      - `createdAt`: string (date-time) (optional)

- **401** — Missing/invalid/expired bearer token
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

- **404** — Transaction or invoice not found in your branch
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **409** — Transaction is already refunded/voided (not completed)
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

### POST `/api/admin/payments/transactions/{id}/void`
Void a completed transaction (reason optional, no refund notification)

Same reversal mechanics as refund, but sets status `voided` and does not queue a notification.

**Auth:** Bearer JWT required
**Role(s):** admin (own branch only)

**Params:**
- `id` (path, string) **(required)**

**Request body:**
- `reason`: string (optional)

**Responses:**

- **200** — Invoice after reversal
  - `invoice` (optional):
    - **Invoice**:
      - `id`: string (uuid) (optional)
      - `type`: enum: `full` | `split` (optional)
      - `status`: enum: `pending` | `partially_paid` | `paid` | `overdue` | `cancelled` (optional)
      - `totalAmount`: number (optional)
      - `paidAmount`: number (optional)
      - `dueDate`: string (date) (optional)
      - `periodMonth`: string (date) (optional)
      - `comment`: string (optional)
      - `source`: string (optional)
      - `createdAt`: string (date-time) (optional)

- **401** — Missing/invalid/expired bearer token
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

- **404** — Transaction or invoice not found in your branch
  - **ErrorResponse**:
    - `success`: boolean **(required)** _e.g. false_
    - `message`: string **(required)**
    - `details` (optional):
      - _(free-form object)_
    - `stack`: string (optional) — Only present when NODE_ENV=development

- **409** — Transaction is already refunded/voided (not completed)
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
