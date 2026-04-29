# API Specification — App Quản Lý Cho Thuê Nhà (Rental Management App)

**Version:** v1  
**Base URL:** `https://api.rentapp.vn/v1`  
**Protocol:** HTTPS only  
**Auth:** JWT Bearer (access token in `Authorization: Bearer <token>` header)  
**Content-Type:** `application/json` (unless uploading files — `multipart/form-data`)  
**Date:** 2026-04-16

---

## Table of Contents

1. [Global Conventions](#1-global-conventions)
2. [Auth Flow Diagram](#2-auth-flow-diagram)
3. [Rate Limiting Strategy](#3-rate-limiting-strategy)
4. [Pagination Strategy](#4-pagination-strategy)
5. [File Upload Spec](#5-file-upload-spec)
6. [Realtime Spec](#6-realtime-spec)
7. [Webhook Spec — Payment Reconciliation](#7-webhook-spec--payment-reconciliation)
8. [Auth Endpoints](#8-auth-endpoints)
9. [Properties Endpoints](#9-properties-endpoints)
10. [Rooms Endpoints](#10-rooms-endpoints)
11. [Contracts Endpoints](#11-contracts-endpoints)
12. [Invoices Endpoints](#12-invoices-endpoints)
13. [Payments Endpoints](#13-payments-endpoints)
14. [Deposits Endpoints](#14-deposits-endpoints)
15. [Checklist Endpoints](#15-checklist-endpoints)
16. [Maintenance Endpoints](#16-maintenance-endpoints)
17. [Notifications Endpoints](#17-notifications-endpoints)
18. [Chat Endpoints](#18-chat-endpoints)
19. [Financial Reports Endpoints](#19-financial-reports-endpoints)

---

## 1. Global Conventions

### Standard Success Envelope

```json
{
  "success": true,
  "data": { ... },
  "meta": { ... }
}
```

### Standard Error Envelope

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": [ ... ]
  }
}
```

### Common Error Codes

| HTTP Status | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body/params failed validation |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 401 | `TOKEN_EXPIRED` | Access token has expired |
| 403 | `FORBIDDEN` | Authenticated but insufficient role/ownership |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate resource or state conflict |
| 422 | `UNPROCESSABLE` | Business logic violation |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

### RBAC Roles

- `landlord` — Chủ nhà: owns properties, manages rooms, contracts, invoices, payments
- `tenant` — Người thuê: views their own room/contract, creates maintenance tickets, chats

Endpoints are tagged with **[Landlord]**, **[Tenant]**, or **[Both]**.

### ID Format

All IDs are UUIDs v4 (string).

---

## 2. Auth Flow Diagram

```
┌────────────┐                        ┌───────────────┐                  ┌──────────────┐
│   Client   │                        │  Auth Service  │                  │  PostgreSQL   │
└─────┬──────┘                        └───────┬───────┘                  └──────┬───────┘
      │                                       │                                 │
      │  POST /v1/auth/register               │                                 │
      │──────────────────────────────────────>│                                 │
      │                                       │  INSERT user + hash password    │
      │                                       │────────────────────────────────>│
      │                                       │<────────────────────────────────│
      │  201 { user, accessToken,             │                                 │
      │        refreshToken }                 │                                 │
      │<──────────────────────────────────────│                                 │
      │                                       │                                 │
      │  POST /v1/auth/login                  │                                 │
      │──────────────────────────────────────>│                                 │
      │                                       │  SELECT user, verify bcrypt     │
      │                                       │────────────────────────────────>│
      │                                       │<────────────────────────────────│
      │  200 { accessToken (15m),             │                                 │
      │        refreshToken (30d) }           │                                 │
      │<──────────────────────────────────────│                                 │
      │                                       │                                 │
      │  [API call with expired accessToken]  │                                 │
      │──────────────────────────────────────>│                                 │
      │  401 TOKEN_EXPIRED                    │                                 │
      │<──────────────────────────────────────│                                 │
      │                                       │                                 │
      │  POST /v1/auth/refresh                │                                 │
      │  { refreshToken }                     │                                 │
      │──────────────────────────────────────>│                                 │
      │                                       │  Verify refresh token in DB     │
      │                                       │────────────────────────────────>│
      │  200 { accessToken (15m),             │                                 │
      │        refreshToken (30d, rotated) }  │                                 │
      │<──────────────────────────────────────│                                 │
      │                                       │                                 │
      │  POST /v1/auth/logout                 │                                 │
      │  { refreshToken }                     │                                 │
      │──────────────────────────────────────>│                                 │
      │                                       │  DELETE refresh token from DB   │
      │                                       │────────────────────────────────>│
      │  204 No Content                       │                                 │
      │<──────────────────────────────────────│                                 │

Token Lifetimes:
  accessToken  → JWT, signed RS256, 15 minutes
  refreshToken → opaque random token, 30 days, stored in DB (refresh_tokens table)
  Refresh token rotation: each /refresh call invalidates old and issues new refreshToken
  Family detection: if a stolen refreshToken is replayed after rotation, entire family is revoked
```

---

## 3. Rate Limiting Strategy

Rate limits are enforced per IP (unauthenticated) and per user ID (authenticated) using a sliding window algorithm backed by Redis.

| Endpoint Group | Limit | Window |
|---|---|---|
| `POST /v1/auth/login` | 10 requests | 15 minutes |
| `POST /v1/auth/register` | 5 requests | 1 hour |
| `POST /v1/auth/refresh` | 20 requests | 15 minutes |
| `POST /v1/payments/*/initiate` | 20 requests | 1 hour |
| `POST /v1/maintenance/*/tickets` | 30 requests | 1 hour |
| All other authenticated endpoints | 300 requests | 1 minute |
| All other unauthenticated endpoints | 60 requests | 1 minute |
| File upload endpoints | 30 requests | 10 minutes |

**Rate Limit Response Headers (all endpoints):**

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 248
X-RateLimit-Reset: 1745123456
Retry-After: 37        (only when 429 is returned)
```

**Rate Limit Exceeded Response:**

```json
HTTP/1.1 429 Too Many Requests

{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please retry after 37 seconds.",
    "details": {
      "retryAfter": 37
    }
  }
}
```

---

## 4. Pagination Strategy

All list endpoints use **cursor-based pagination** for performance on large datasets. Cursor is an opaque base64-encoded string pointing to the last record's sort key.

### Query Parameters (all list endpoints)

| Parameter | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | 20 | Items per page. Max 100. |
| `cursor` | string | null | Cursor from previous response's `meta.nextCursor`. Omit for first page. |
| `sort` | string | `createdAt` | Sort field (endpoint-specific allowed values documented per endpoint). |
| `order` | `asc` \| `desc` | `desc` | Sort direction. |

### Paginated Response Shape

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "limit": 20,
    "hasNextPage": true,
    "nextCursor": "eyJpZCI6ImFiYzEyMyIsImNyZWF0ZWRBdCI6IjIwMjYtMDQtMTUifQ==",
    "total": 142
  }
}
```

`total` is an approximate count and may be omitted for very large tables. When `hasNextPage` is `false`, `nextCursor` is `null`.

---

## 5. File Upload Spec

### Flow

All file uploads use a two-step signed URL approach via Supabase Storage, except chat images which can be uploaded directly.

**Step 1 — Request signed upload URL:**

```
POST /v1/uploads/presign
Authorization: Bearer <token>

{
  "context": "room_photo" | "maintenance_media" | "chat_image" | "contract_attachment",
  "filename": "photo.jpg",
  "mimeType": "image/jpeg",
  "size": 2048576
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "uploadId": "upld_abc123",
    "uploadUrl": "https://storage.supabase.co/v1/object/sign/...",
    "publicUrl": "https://cdn.rentapp.vn/files/room_photo/uuid.jpg",
    "expiresAt": "2026-04-16T10:15:00Z"
  }
}
```

**Step 2 — Upload file directly to Supabase Storage:**

```
PUT <uploadUrl>
Content-Type: image/jpeg

<binary body>
```

**Step 3 — Reference `publicUrl` in subsequent API calls** (e.g., room photo URLs, maintenance media URLs).

### Constraints

| Context | Allowed MIME Types | Max Size | Max Files |
|---|---|---|---|
| `room_photo` | `image/jpeg`, `image/png`, `image/webp` | 10 MB | 20 per room |
| `maintenance_media` | `image/jpeg`, `image/png`, `video/mp4`, `video/quicktime` | 50 MB | 5 per ticket |
| `chat_image` | `image/jpeg`, `image/png`, `image/gif`, `image/webp` | 5 MB | 1 per message |
| `contract_attachment` | `application/pdf` | 20 MB | 1 per contract |

### Errors

```json
{ "error": { "code": "FILE_TOO_LARGE", "message": "File exceeds maximum size of 10 MB" } }
{ "error": { "code": "INVALID_MIME_TYPE", "message": "Only JPEG, PNG, WebP are allowed for room photos" } }
{ "error": { "code": "UPLOAD_QUOTA_EXCEEDED", "message": "Maximum 20 photos per room" } }
```

---

## 6. Realtime Spec

The app uses **Supabase Realtime** (PostgreSQL change subscriptions) for push events, and REST polling for non-critical data.

### WebSocket / Supabase Realtime Channels

Clients connect to Supabase Realtime with their JWT. Each channel is scoped by row-level security.

| Channel Name | Trigger | Payload | Subscribers |
|---|---|---|---|
| `notifications:user:{userId}` | INSERT on `notifications` table | `{ id, type, title, body, data, createdAt }` | Both |
| `chat:conversation:{conversationId}` | INSERT on `messages` table | `{ id, conversationId, senderId, type, content, createdAt }` | Both |
| `chat:seen:{conversationId}` | UPDATE on `conversation_participants` (lastSeenAt) | `{ userId, lastSeenAt }` | Both |
| `maintenance:ticket:{ticketId}` | UPDATE on `maintenance_tickets` (status) | `{ ticketId, status, updatedAt }` | Both |
| `payment:status:{paymentId}` | UPDATE on `payments` (status) | `{ paymentId, status, paidAt }` | Both |

### REST Polling (not Realtime)

- Invoice list (tenant checks monthly)
- Contract status
- Financial reports
- Deposit status

### Client Connection Example (Supabase JS SDK)

```js
const channel = supabase
  .channel('notifications:user:' + userId)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => handleNotification(payload.new))
  .subscribe()
```

---

## 7. Webhook Spec — Payment Reconciliation

Webhooks are received from Momo, ZaloPay, and VietQR (bank transfer QR) to auto-reconcile payments.

### Webhook Endpoint

```
POST /v1/webhooks/payment/{provider}
```

Where `{provider}` is `momo`, `zalopay`, or `vietqr`.

No `Authorization` header is used — instead, each provider's signature is verified.

### Signature Verification

| Provider | Method | Header / Field |
|---|---|---|
| Momo | HMAC-SHA256 of raw body | `signature` field inside JSON body |
| ZaloPay | HMAC-SHA256 of `appid\|apptransid\|apptime\|amount\|embeddata\|item` | `mac` field inside JSON body |
| VietQR | HMAC-SHA256 of raw body | `X-Signature` request header |

**All webhooks must be acknowledged within 5 seconds** by returning HTTP 200. Processing is done asynchronously via a queue.

### Momo Webhook Payload

```json
{
  "partnerCode": "MOMO_PARTNER_CODE",
  "orderId": "pay_abc123_1745123456",
  "requestId": "req_xyz789",
  "amount": 3500000,
  "orderInfo": "Invoice #INV-2026-04",
  "orderType": "momo_wallet",
  "transId": 987654321,
  "resultCode": 0,
  "message": "Successful.",
  "payType": "qr",
  "responseTime": 1745123460000,
  "extraData": "",
  "signature": "abc...def"
}
```

`resultCode: 0` = success. Any other value = failure.

### ZaloPay Webhook Payload

```json
{
  "app_id": 123,
  "app_trans_id": "260416_pay_abc123",
  "app_time": 1745123456000,
  "amount": 3500000,
  "embed_data": "{\"paymentId\":\"pay_abc123\"}",
  "item": "[]",
  "zp_trans_id": 987654321,
  "server_time": 1745123460000,
  "channel": 38,
  "merchant_user_id": "user@email.com",
  "user_fee_amount": 0,
  "discount_amount": 0,
  "mac": "abc...def"
}
```

### VietQR Webhook Payload

```json
{
  "id": "vqr_abc123",
  "gateway": "VietQR",
  "transactionDate": "2026-04-16 10:05:23",
  "accountNumber": "1234567890",
  "subAccount": null,
  "amount": 3500000,
  "accumulated": 3500000,
  "code": "PAY-abc123",
  "transactionContent": "Thanh toan hoa don PAY-abc123",
  "referenceCode": "FT26106789",
  "description": "Chuyen khoan thanh toan",
  "transferType": "in",
  "signature": "abc...def"
}
```

### Webhook Reconciliation Logic

```
1. Verify signature (reject with 400 if invalid)
2. Extract internal paymentId from orderId / embed_data / description code
3. Lookup payment record; if already PAID → return 200 (idempotent)
4. If resultCode == 0 (Momo) or status "success" (ZaloPay) or transferType "in" (VietQR):
   a. UPDATE payments SET status='paid', paidAt=now(), providerTransactionId=<transId>
   b. UPDATE invoices SET status='paid' WHERE id = payment.invoiceId
   c. INSERT notification for tenant and landlord
   d. Publish to Supabase Realtime channel payment:status:{paymentId}
5. If failure: UPDATE payments SET status='failed'
6. Return 200 { received: true }
```

### Webhook Response

```json
HTTP/1.1 200 OK

{ "received": true }
```

Return `200` even on signature failure after logging (to prevent provider retries revealing info). Internally flag and alert.

---

## 8. Auth Endpoints

### 8.1 Register

**POST /v1/auth/register**  
**Auth:** None  
**RBAC:** Public

**Request Body:**

```json
{
  "fullName": "Nguyễn Văn An",         // string, required, 2–100 chars
  "email": "an@example.com",            // string, required, valid email, unique
  "phone": "0901234567",                // string, required, Vietnamese phone regex: /^(0[3|5|7|8|9])\d{8}$/
  "password": "SecureP@ss1",            // string, required, min 8 chars, 1 uppercase, 1 number, 1 special char
  "role": "landlord",                   // enum: "landlord" | "tenant", required
  "referralCode": "REF123"              // string, optional
}
```

**Success Response 201:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "fullName": "Nguyễn Văn An",
      "email": "an@example.com",
      "phone": "0901234567",
      "role": "landlord",
      "avatarUrl": null,
      "createdAt": "2026-04-16T10:00:00Z"
    },
    "accessToken": "eyJhbGci...",
    "refreshToken": "rt_opaque_random_string",
    "expiresIn": 900
  }
}
```

**Error Responses:**

```json
409 { "error": { "code": "CONFLICT", "message": "Email already registered" } }
400 { "error": { "code": "VALIDATION_ERROR", "message": "Password must contain at least one uppercase letter, one number, and one special character", "details": [{ "field": "password", "message": "..." }] } }
```

---

### 8.2 Login

**POST /v1/auth/login**  
**Auth:** None  
**RBAC:** Public

**Request Body:**

```json
{
  "email": "an@example.com",    // string, required
  "password": "SecureP@ss1",    // string, required
  "deviceId": "device_abc123",  // string, optional — for push notification targeting
  "fcmToken": "fcm_token_xyz"   // string, optional — Firebase Cloud Messaging token
}
```

**Success Response 200:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "fullName": "Nguyễn Văn An",
      "email": "an@example.com",
      "phone": "0901234567",
      "role": "landlord",
      "avatarUrl": "https://cdn.rentapp.vn/avatars/usr_abc123.jpg"
    },
    "accessToken": "eyJhbGci...",
    "refreshToken": "rt_opaque_random_string",
    "expiresIn": 900
  }
}
```

**Error Responses:**

```json
401 { "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid email or password" } }
403 { "error": { "code": "ACCOUNT_SUSPENDED", "message": "Your account has been suspended. Contact support." } }
429 { "error": { "code": "RATE_LIMITED", "message": "Too many login attempts. Try again in 15 minutes." } }
```

---

### 8.3 Refresh Token

**POST /v1/auth/refresh**  
**Auth:** None (uses refreshToken in body)  
**RBAC:** Public

**Request Body:**

```json
{
  "refreshToken": "rt_opaque_random_string"  // string, required
}
```

**Success Response 200:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "rt_new_rotated_token",
    "expiresIn": 900
  }
}
```

**Error Responses:**

```json
401 { "error": { "code": "INVALID_REFRESH_TOKEN", "message": "Refresh token is invalid or expired" } }
401 { "error": { "code": "TOKEN_REUSE_DETECTED", "message": "Refresh token reuse detected. All sessions have been invalidated." } }
```

---

### 8.4 Logout

**POST /v1/auth/logout**  
**Auth:** Bearer (optional — best-effort invalidation)  
**RBAC:** Both

**Request Body:**

```json
{
  "refreshToken": "rt_opaque_random_string"  // string, required
}
```

**Success Response 204:** No body.

**Error Responses:**

```json
400 { "error": { "code": "VALIDATION_ERROR", "message": "refreshToken is required" } }
```

---

### 8.5 Get Profile

**GET /v1/auth/profile**  
**Auth:** Bearer required  
**RBAC:** Both

**Success Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "fullName": "Nguyễn Văn An",
    "email": "an@example.com",
    "phone": "0901234567",
    "role": "landlord",
    "avatarUrl": "https://cdn.rentapp.vn/avatars/usr_abc123.jpg",
    "nationalId": "012345678901",
    "nationalIdFrontUrl": "https://cdn.rentapp.vn/docs/id_front.jpg",
    "nationalIdBackUrl": "https://cdn.rentapp.vn/docs/id_back.jpg",
    "bankAccountName": "NGUYEN VAN AN",
    "bankAccountNumber": "1234567890",
    "bankName": "Vietcombank",
    "createdAt": "2026-04-16T10:00:00Z",
    "updatedAt": "2026-04-16T10:00:00Z"
  }
}
```

---

### 8.6 Update Profile

**PATCH /v1/auth/profile**  
**Auth:** Bearer required  
**RBAC:** Both

**Request Body (all fields optional):**

```json
{
  "fullName": "Nguyễn Văn An",              // string, 2–100 chars
  "phone": "0901234567",                     // string, Vietnamese phone regex
  "avatarUrl": "https://cdn.../avatar.jpg",  // string, valid URL, from presigned upload
  "nationalId": "012345678901",              // string, 9 or 12 digits
  "nationalIdFrontUrl": "https://...",       // string, valid URL
  "nationalIdBackUrl": "https://...",        // string, valid URL
  "bankAccountName": "NGUYEN VAN AN",        // string, uppercase
  "bankAccountNumber": "1234567890",         // string, 6–19 digits
  "bankName": "Vietcombank"                  // string, one of predefined bank list
}
```

**Success Response 200:**

```json
{
  "success": true,
  "data": { /* updated user object, same shape as GET /profile */ }
}
```

**Error Responses:**

```json
400 { "error": { "code": "VALIDATION_ERROR", "message": "Invalid phone number format" } }
409 { "error": { "code": "CONFLICT", "message": "Phone number already used by another account" } }
```

---

## 9. Properties Endpoints

Properties (Bất động sản) are owned by landlords. Each property contains rooms.

### 9.1 Create Property

**POST /v1/properties**  
**Auth:** Bearer required  
**RBAC:** [Landlord]

**Request Body:**

```json
{
  "name": "Nhà trọ Bình Thạnh",            // string, required, 2–200 chars
  "type": "boarding_house",                  // enum: "boarding_house" | "apartment_building" | "villa" | "office", required
  "address": {
    "street": "123 Đinh Tiên Hoàng",        // string, required
    "ward": "Phường 3",                      // string, required
    "district": "Bình Thạnh",               // string, required
    "city": "Hồ Chí Minh",                  // string, required
    "fullAddress": "123 Đinh Tiên Hoàng, Phường 3, Bình Thạnh, TP.HCM"  // string, auto-generated
  },
  "description": "Nhà trọ sạch sẽ...",      // string, optional, max 2000 chars
  "photoUrls": ["https://cdn.../p1.jpg"],    // array of strings, optional, max 20 URLs
  "amenities": ["wifi", "parking", "security"],  // array of strings, optional
  "electricityRate": 3500,                   // number, required, VND per kWh
  "waterRate": 15000,                        // number, required, VND per m³
  "serviceChargePerRoom": 50000             // number, optional, VND per month
}
```

**Success Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "prop_abc123",
    "landlordId": "usr_abc123",
    "name": "Nhà trọ Bình Thạnh",
    "type": "boarding_house",
    "address": { "street": "...", "ward": "...", "district": "...", "city": "...", "fullAddress": "..." },
    "description": "...",
    "photoUrls": ["https://cdn.../p1.jpg"],
    "amenities": ["wifi", "parking", "security"],
    "electricityRate": 3500,
    "waterRate": 15000,
    "serviceChargePerRoom": 50000,
    "totalRooms": 0,
    "occupiedRooms": 0,
    "createdAt": "2026-04-16T10:00:00Z",
    "updatedAt": "2026-04-16T10:00:00Z"
  }
}
```

**Error Responses:**

```json
400 { "error": { "code": "VALIDATION_ERROR", "message": "electricityRate must be a positive number" } }
403 { "error": { "code": "FORBIDDEN", "message": "Only landlords can create properties" } }
```

---

### 9.2 List Properties

**GET /v1/properties**  
**Auth:** Bearer required  
**RBAC:** [Landlord] — returns only the calling landlord's properties

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `limit` | integer | Default 20, max 100 |
| `cursor` | string | Pagination cursor |
| `sort` | string | `createdAt` (default), `name`, `totalRooms` |
| `order` | string | `asc` \| `desc` (default `desc`) |
| `search` | string | Full-text search on name and address |

**Success Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "prop_abc123",
      "name": "Nhà trọ Bình Thạnh",
      "type": "boarding_house",
      "address": { "fullAddress": "123 Đinh Tiên Hoàng, Phường 3, Bình Thạnh, TP.HCM" },
      "photoUrls": ["https://cdn.../p1.jpg"],
      "totalRooms": 12,
      "occupiedRooms": 10,
      "monthlyRevenue": 35000000,
      "createdAt": "2026-04-16T10:00:00Z"
    }
  ],
  "meta": { "limit": 20, "hasNextPage": false, "nextCursor": null, "total": 3 }
}
```

---

### 9.3 Get Property

**GET /v1/properties/{propertyId}**  
**Auth:** Bearer required  
**RBAC:** [Landlord] — must own the property

**Path Parameters:**

| Param | Type | Description |
|---|---|---|
| `propertyId` | UUID | Property ID |

**Success Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "prop_abc123",
    "landlordId": "usr_abc123",
    "name": "Nhà trọ Bình Thạnh",
    "type": "boarding_house",
    "address": { "street": "...", "ward": "...", "district": "...", "city": "...", "fullAddress": "..." },
    "description": "...",
    "photoUrls": ["https://cdn.../p1.jpg"],
    "amenities": ["wifi", "parking", "security"],
    "electricityRate": 3500,
    "waterRate": 15000,
    "serviceChargePerRoom": 50000,
    "totalRooms": 12,
    "occupiedRooms": 10,
    "availableRooms": 2,
    "monthlyRevenue": 35000000,
    "createdAt": "2026-04-16T10:00:00Z",
    "updatedAt": "2026-04-16T10:00:00Z"
  }
}
```

**Error Responses:**

```json
404 { "error": { "code": "NOT_FOUND", "message": "Property not found" } }
403 { "error": { "code": "FORBIDDEN", "message": "You do not own this property" } }
```

---

### 9.4 Update Property

**PATCH /v1/properties/{propertyId}**  
**Auth:** Bearer required  
**RBAC:** [Landlord] — must own the property

**Request Body:** Same fields as POST /v1/properties, all optional.

**Success Response 200:**

```json
{
  "success": true,
  "data": { /* updated property object */ }
}
```

**Error Responses:**

```json
404 { "error": { "code": "NOT_FOUND", "message": "Property not found" } }
403 { "error": { "code": "FORBIDDEN", "message": "You do not own this property" } }
```

---

### 9.5 Delete Property

**DELETE /v1/properties/{propertyId}**  
**Auth:** Bearer required  
**RBAC:** [Landlord] — must own the property

**Success Response 200:**

```json
{
  "success": true,
  "data": { "message": "Property deleted successfully" }
}
```

**Error Responses:**

```json
404 { "error": { "code": "NOT_FOUND", "message": "Property not found" } }
403 { "error": { "code": "FORBIDDEN", "message": "You do not own this property" } }
422 { "error": { "code": "UNPROCESSABLE", "message": "Cannot delete property with active tenants. Please terminate all contracts first." } }
```

---

## 10. Rooms Endpoints

### 10.1 Create Room

**POST /v1/properties/{propertyId}/rooms**  
**Auth:** Bearer required  
**RBAC:** [Landlord]

**Request Body:**

```json
{
  "roomNumber": "P101",                    // string, required, unique within property
  "floor": 1,                              // integer, optional
  "area": 25.5,                            // number, required, m², min 1
  "maxOccupants": 2,                       // integer, required, min 1
  "monthlyRent": 3500000,                  // number, required, VND
  "depositAmount": 7000000,               // number, required, VND (typically 2 months rent)
  "description": "Phòng hướng Đông...",   // string, optional, max 1000 chars
  "photoUrls": ["https://cdn.../r1.jpg"], // array of strings, max 20 URLs
  "amenities": ["air_conditioner", "water_heater", "balcony"],  // array of strings
  "furnitures": [                          // array of furniture items
    { "name": "Giường", "quantity": 1, "condition": "new" },
    { "name": "Tủ quần áo", "quantity": 1, "condition": "good" }
  ]
}
```

**Success Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "room_abc123",
    "propertyId": "prop_abc123",
    "roomNumber": "P101",
    "floor": 1,
    "area": 25.5,
    "maxOccupants": 2,
    "monthlyRent": 3500000,
    "depositAmount": 7000000,
    "status": "available",
    "description": "...",
    "photoUrls": ["https://cdn.../r1.jpg"],
    "amenities": ["air_conditioner", "water_heater", "balcony"],
    "furnitures": [ { "name": "Giường", "quantity": 1, "condition": "new" } ],
    "currentTenantId": null,
    "currentContractId": null,
    "createdAt": "2026-04-16T10:00:00Z",
    "updatedAt": "2026-04-16T10:00:00Z"
  }
}
```

**Error Responses:**

```json
404 { "error": { "code": "NOT_FOUND", "message": "Property not found" } }
403 { "error": { "code": "FORBIDDEN", "message": "You do not own this property" } }
409 { "error": { "code": "CONFLICT", "message": "Room number P101 already exists in this property" } }
```

---

### 10.2 List Rooms

**GET /v1/properties/{propertyId}/rooms**  
**Auth:** Bearer required  
**RBAC:** [Landlord]

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `limit` | integer | Default 20, max 100 |
| `cursor` | string | Pagination cursor |
| `status` | string | Filter: `available` \| `occupied` \| `maintenance` \| `inactive` |
| `floor` | integer | Filter by floor |

**Success Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "room_abc123",
      "roomNumber": "P101",
      "floor": 1,
      "area": 25.5,
      "monthlyRent": 3500000,
      "status": "occupied",
      "currentTenant": {
        "id": "usr_tenant1",
        "fullName": "Trần Thị Bình",
        "phone": "0912345678"
      },
      "contractEndDate": "2026-12-31",
      "photoUrls": ["https://cdn.../r1.jpg"]
    }
  ],
  "meta": { "limit": 20, "hasNextPage": false, "nextCursor": null, "total": 12 }
}
```

---

### 10.3 Get Room

**GET /v1/properties/{propertyId}/rooms/{roomId}**  
**Auth:** Bearer required  
**RBAC:** [Landlord] — own property; [Tenant] — must be current occupant of the room

**Success Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "room_abc123",
    "propertyId": "prop_abc123",
    "roomNumber": "P101",
    "floor": 1,
    "area": 25.5,
    "maxOccupants": 2,
    "monthlyRent": 3500000,
    "depositAmount": 7000000,
    "status": "occupied",
    "description": "...",
    "photoUrls": ["https://cdn.../r1.jpg"],
    "amenities": ["air_conditioner", "water_heater", "balcony"],
    "furnitures": [ { "name": "Giường", "quantity": 1, "condition": "new" } ],
    "currentTenantId": "usr_tenant1",
    "currentContractId": "contract_abc123",
    "currentTenant": {
      "id": "usr_tenant1",
      "fullName": "Trần Thị Bình",
      "phone": "0912345678",
      "avatarUrl": null
    },
    "electricityMeterStart": 1250,
    "waterMeterStart": 340,
    "createdAt": "2026-04-16T10:00:00Z",
    "updatedAt": "2026-04-16T10:00:00Z"
  }
}
```

---

### 10.4 Update Room

**PATCH /v1/properties/{propertyId}/rooms/{roomId}**  
**Auth:** Bearer required  
**RBAC:** [Landlord] — must own the property

**Request Body:** Same fields as POST room, all optional. `roomNumber` change only allowed when room is `available`.

**Success Response 200:**

```json
{
  "success": true,
  "data": { /* updated room object */ }
}
```

**Error Responses:**

```json
422 { "error": { "code": "UNPROCESSABLE", "message": "Cannot change room number while room is occupied" } }
```

---

### 10.5 Update Room Status

**PATCH /v1/properties/{propertyId}/rooms/{roomId}/status**  
**Auth:** Bearer required  
**RBAC:** [Landlord]

**Request Body:**

```json
{
  "status": "maintenance",  // enum: "available" | "occupied" | "maintenance" | "inactive", required
  "reason": "Sửa điện nước"  // string, optional, max 500 chars
}
```

**Business Rules:**
- Cannot set `available` if there is an active contract (must terminate contract first)
- Cannot set `occupied` manually — auto-set when contract is activated
- `maintenance` and `inactive` can be set when room is `available`

**Success Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "room_abc123",
    "status": "maintenance",
    "statusUpdatedAt": "2026-04-16T10:00:00Z"
  }
}
```

**Error Responses:**

```json
422 { "error": { "code": "UNPROCESSABLE", "message": "Cannot mark as available: active contract exists" } }
```

---

### 10.6 Get Room Calendar Availability

**GET /v1/properties/{propertyId}/rooms/{roomId}/calendar**  
**Auth:** Bearer required  
**RBAC:** [Landlord]

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `year` | integer | Yes | e.g., `2026` |
| `month` | integer | Yes | 1–12 |

**Success Response 200:**

```json
{
  "success": true,
  "data": {
    "roomId": "room_abc123",
    "roomNumber": "P101",
    "year": 2026,
    "month": 4,
    "status": "occupied",
    "contracts": [
      {
        "contractId": "contract_abc123",
        "tenantName": "Trần Thị Bình",
        "startDate": "2026-01-01",
        "endDate": "2026-12-31",
        "monthlyRent": 3500000
      }
    ],
    "availablePeriods": [],
    "maintenancePeriods": []
  }
}
```

---

### 10.7 Delete Room

**DELETE /v1/properties/{propertyId}/rooms/{roomId}**  
**Auth:** Bearer required  
**RBAC:** [Landlord]

**Success Response 200:**

```json
{ "success": true, "data": { "message": "Room deleted successfully" } }
```

**Error Responses:**

```json
422 { "error": { "code": "UNPROCESSABLE", "message": "Cannot delete room with active or pending contracts" } }
```

---

## 11. Contracts Endpoints

### 11.1 Create Contract

**POST /v1/contracts**  
**Auth:** Bearer required  
**RBAC:** [Landlord]

**Request Body:**

```json
{
  "roomId": "room_abc123",              // UUID, required
  "tenantId": "usr_tenant1",           // UUID, required — tenant must already have an account
  "startDate": "2026-05-01",           // date string YYYY-MM-DD, required, must be future or today
  "endDate": "2027-04-30",             // date string YYYY-MM-DD, required, must be after startDate
  "monthlyRent": 3500000,              // number, VND, required
  "depositAmount": 7000000,            // number, VND, required
  "paymentDueDay": 5,                  // integer 1–28, required — day of month payment is due
  "electricityMeterStart": 1250,       // integer, required — kWh reading at move-in
  "waterMeterStart": 340,              // integer, required — m³ reading at move-in
  "additionalTerms": "Không nuôi thú cưng",  // string, optional, max 5000 chars
  "coTenants": [                       // array, optional — additional occupants (non-account holders)
    { "fullName": "Lê Văn Cường", "nationalId": "012345678901", "phone": "0922345678" }
  ]
}
```

**Business Rules:**
- Room must be `available`
- Tenant account must have role `tenant`
- No overlapping contracts on same room

**Success Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "contract_abc123",
    "roomId": "room_abc123",
    "propertyId": "prop_abc123",
    "tenantId": "usr_tenant1",
    "landlordId": "usr_landlord1",
    "startDate": "2026-05-01",
    "endDate": "2027-04-30",
    "monthlyRent": 3500000,
    "depositAmount": 7000000,
    "paymentDueDay": 5,
    "electricityMeterStart": 1250,
    "waterMeterStart": 340,
    "additionalTerms": "Không nuôi thú cưng",
    "coTenants": [],
    "status": "draft",
    "landlordSignedAt": null,
    "tenantSignedAt": null,
    "pdfUrl": null,
    "createdAt": "2026-04-16T10:00:00Z",
    "updatedAt": "2026-04-16T10:00:00Z"
  }
}
```

**Error Responses:**

```json
409 { "error": { "code": "CONFLICT", "message": "Room already has an active contract" } }
422 { "error": { "code": "UNPROCESSABLE", "message": "Tenant account not found or not a tenant role" } }
422 { "error": { "code": "UNPROCESSABLE", "message": "endDate must be after startDate" } }
```

---

### 11.2 Generate Contract PDF

**POST /v1/contracts/{contractId}/generate-pdf**  
**Auth:** Bearer required  
**RBAC:** [Landlord] — must own the contract

**Request Body:** Empty `{}`

**Business Rules:** PDF is generated from contract data using a server-side template. Overwrites any previous draft PDF.

**Success Response 200:**

```json
{
  "success": true,
  "data": {
    "contractId": "contract_abc123",
    "pdfUrl": "https://cdn.rentapp.vn/contracts/contract_abc123.pdf",
    "generatedAt": "2026-04-16T10:05:00Z"
  }
}
```

**Error Responses:**

```json
404 { "error": { "code": "NOT_FOUND", "message": "Contract not found" } }
422 { "error": { "code": "UNPROCESSABLE", "message": "Cannot generate PDF for a terminated contract" } }
```

---

### 11.3 Submit E-Signature

**POST /v1/contracts/{contractId}/sign**  
**Auth:** Bearer required  
**RBAC:** [Both] — landlord or tenant who is party to this contract

**Request Body:**

```json
{
  "signatureImageUrl": "https://cdn.rentapp.vn/signatures/sig_abc.png",  // string, required — base64 PNG data URL of drawn signature
  "agreedToTerms": true           // boolean, required, must be true
}
```

**Business Rules:**
- Landlord can sign when contract is `draft` or `pending_tenant_signature`
- Tenant can sign when contract is `pending_tenant_signature`
- When both have signed → status becomes `active`, room status becomes `occupied`
- Signature is recorded with timestamp and IP address

**Success Response 200:**

```json
{
  "success": true,
  "data": {
    "contractId": "contract_abc123",
    "signedBy": "landlord",
    "signedAt": "2026-04-16T10:10:00Z",
    "status": "pending_tenant_signature",
    "landlordSignedAt": "2026-04-16T10:10:00Z",
    "tenantSignedAt": null,
    "pdfUrl": "https://cdn.rentapp.vn/contracts/contract_abc123_signed.pdf"
  }
}
```

**When both parties have signed:**

```json
{
  "success": true,
  "data": {
    "contractId": "contract_abc123",
    "signedBy": "tenant",
    "signedAt": "2026-04-16T10:15:00Z",
    "status": "active",
    "landlordSignedAt": "2026-04-16T10:10:00Z",
    "tenantSignedAt": "2026-04-16T10:15:00Z",
    "pdfUrl": "https://cdn.rentapp.vn/contracts/contract_abc123_fully_signed.pdf"
  }
}
```

**Error Responses:**

```json
403 { "error": { "code": "FORBIDDEN", "message": "You are not a party to this contract" } }
409 { "error": { "code": "CONFLICT", "message": "You have already signed this contract" } }
422 { "error": { "code": "UNPROCESSABLE", "message": "Contract PDF must be generated before signing" } }
```

---

### 11.4 Get Contract

**GET /v1/contracts/{contractId}**  
**Auth:** Bearer required  
**RBAC:** [Both] — landlord who owns or tenant who is party to the contract

**Success Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "contract_abc123",
    "roomId": "room_abc123",
    "propertyId": "prop_abc123",
    "tenantId": "usr_tenant1",
    "landlordId": "usr_landlord1",
    "room": {
      "roomNumber": "P101",
      "floor": 1,
      "area": 25.5,
      "property": { "name": "Nhà trọ Bình Thạnh", "address": { "fullAddress": "..." } }
    },
    "tenant": { "id": "usr_tenant1", "fullName": "Trần Thị Bình", "phone": "0912345678" },
    "landlord": { "id": "usr_landlord1", "fullName": "Nguyễn Văn An", "phone": "0901234567" },
    "startDate": "2026-05-01",
    "endDate": "2027-04-30",
    "monthlyRent": 3500000,
    "depositAmount": 7000000,
    "paymentDueDay": 5,
    "electricityMeterStart": 1250,
    "waterMeterStart": 340,
    "additionalTerms": "Không nuôi thú cưng",
    "coTenants": [],
    "status": "active",
    "landlordSignedAt": "2026-04-16T10:10:00Z",
    "tenantSignedAt": "2026-04-16T10:15:00Z",
    "pdfUrl": "https://cdn.rentapp.vn/contracts/contract_abc123_fully_signed.pdf",
    "createdAt": "2026-04-16T10:00:00Z",
    "updatedAt": "2026-04-16T10:15:00Z"
  }
}
```

---

### 11.5 List Contracts

**GET /v1/contracts**  
**Auth:** Bearer required  
**RBAC:** [Both] — landlord sees all their contracts; tenant sees only their own

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `limit` | integer | Default 20, max 100 |
| `cursor` | string | Pagination cursor |
| `status` | string | Filter: `draft` \| `pending_landlord_signature` \| `pending_tenant_signature` \| `active` \| `expired` \| `terminated` |
| `propertyId` | UUID | Filter by property (landlord only) |
| `roomId` | UUID | Filter by room (landlord only) |

**Success Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "contract_abc123",
      "roomNumber": "P101",
      "propertyName": "Nhà trọ Bình Thạnh",
      "tenantName": "Trần Thị Bình",
      "startDate": "2026-05-01",
      "endDate": "2027-04-30",
      "monthlyRent": 3500000,
      "status": "active",
      "daysUntilExpiry": 379,
      "pdfUrl": "https://cdn.rentapp.vn/contracts/contract_abc123_fully_signed.pdf"
    }
  ],
  "meta": { "limit": 20, "hasNextPage": false, "nextCursor": null, "total": 5 }
}
```

---

### 11.6 Download Contract PDF

**GET /v1/contracts/{contractId}/download**  
**Auth:** Bearer required  
**RBAC:** [Both] — must be party to the contract

**Success Response 200:**

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="contract_abc123.pdf"

<binary PDF content>
```

Or, redirect to signed storage URL:

```json
HTTP/1.1 302 Found
Location: https://cdn.rentapp.vn/contracts/contract_abc123_fully_signed.pdf?token=signed_url_token&expires=1745130000
```

**Error Responses:**

```json
404 { "error": { "code": "NOT_FOUND", "message": "Contract PDF not yet generated" } }
```

---

### 11.7 Terminate Contract

**POST /v1/contracts/{contractId}/terminate**  
**Auth:** Bearer required  
**RBAC:** [Landlord]

**Request Body:**

```json
{
  "terminationDate": "2026-06-01",      // date YYYY-MM-DD, required, must be >= today
  "reason": "Người thuê vi phạm hợp đồng",  // string, required, max 1000 chars
  "penaltyAmount": 0                    // number, VND, optional — early termination fee
}
```

**Success Response 200:**

```json
{
  "success": true,
  "data": {
    "contractId": "contract_abc123",
    "status": "terminated",
    "terminationDate": "2026-06-01",
    "reason": "Người thuê vi phạm hợp đồng",
    "terminatedAt": "2026-04-16T11:00:00Z"
  }
}
```

---

## 12. Invoices Endpoints

### 12.1 Create Monthly Invoice

**POST /v1/invoices**  
**Auth:** Bearer required  
**RBAC:** [Landlord]

**Request Body:**

```json
{
  "contractId": "contract_abc123",      // UUID, required
  "billingMonth": "2026-04",            // string YYYY-MM, required
  "electricityMeterEnd": 1310,          // integer, required — kWh reading at end of period
  "waterMeterEnd": 358,                 // integer, required — m³ reading at end of period
  "electricityMeterStart": 1250,        // integer, optional — auto-filled from last invoice or contract start
  "waterMeterStart": 340,               // integer, optional — auto-filled from last invoice or contract start
  "additionalCharges": [                // array, optional
    { "description": "Phí gửi xe", "amount": 100000 },
    { "description": "Phí internet", "amount": 150000 }
  ],
  "discounts": [                        // array, optional
    { "description": "Giảm giá tháng 4", "amount": 50000 }
  ],
  "dueDate": "2026-04-20",             // date YYYY-MM-DD, required
  "notes": "Tháng 4/2026"              // string, optional
}
```

**Auto-computed fields (server-side):**

```
electricityUsed = electricityMeterEnd - electricityMeterStart  (kWh)
waterUsed = waterMeterEnd - waterMeterStart  (m³)
electricityCharge = electricityUsed × property.electricityRate
waterCharge = waterUsed × property.waterRate
serviceCharge = property.serviceChargePerRoom
totalAdditional = sum(additionalCharges)
totalDiscount = sum(discounts)
totalAmount = monthlyRent + electricityCharge + waterCharge + serviceCharge + totalAdditional - totalDiscount
```

**Success Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "inv_abc123",
    "contractId": "contract_abc123",
    "roomId": "room_abc123",
    "tenantId": "usr_tenant1",
    "landlordId": "usr_landlord1",
    "billingMonth": "2026-04",
    "dueDate": "2026-04-20",
    "breakdown": {
      "monthlyRent": 3500000,
      "electricity": {
        "meterStart": 1250,
        "meterEnd": 1310,
        "usage": 60,
        "ratePerUnit": 3500,
        "amount": 210000
      },
      "water": {
        "meterStart": 340,
        "meterEnd": 358,
        "usage": 18,
        "ratePerUnit": 15000,
        "amount": 270000
      },
      "serviceCharge": 50000,
      "additionalCharges": [
        { "description": "Phí gửi xe", "amount": 100000 },
        { "description": "Phí internet", "amount": 150000 }
      ],
      "discounts": [
        { "description": "Giảm giá tháng 4", "amount": 50000 }
      ]
    },
    "totalAmount": 4230000,
    "status": "unpaid",
    "paidAt": null,
    "notes": "Tháng 4/2026",
    "createdAt": "2026-04-16T10:00:00Z"
  }
}
```

**Error Responses:**

```json
409 { "error": { "code": "CONFLICT", "message": "Invoice for 2026-04 already exists for this contract" } }
422 { "error": { "code": "UNPROCESSABLE", "message": "electricityMeterEnd must be >= electricityMeterStart" } }
422 { "error": { "code": "UNPROCESSABLE", "message": "Contract is not active" } }
```

---

### 12.2 Get Invoice

**GET /v1/invoices/{invoiceId}**  
**Auth:** Bearer required  
**RBAC:** [Both] — landlord who owns; tenant who is billed

**Success Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "inv_abc123",
    "contractId": "contract_abc123",
    "billingMonth": "2026-04",
    "dueDate": "2026-04-20",
    "breakdown": { /* same as create response */ },
    "totalAmount": 4230000,
    "status": "unpaid",
    "paidAt": null,
    "payments": [
      {
        "id": "pay_abc123",
        "amount": 4230000,
        "status": "pending",
        "provider": "momo",
        "createdAt": "2026-04-16T10:00:00Z"
      }
    ],
    "notes": "Tháng 4/2026",
    "createdAt": "2026-04-16T10:00:00Z"
  }
}
```

---

### 12.3 List Invoices

**GET /v1/invoices**  
**Auth:** Bearer required  
**RBAC:** [Both]

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `limit` | integer | Default 20, max 100 |
| `cursor` | string | Pagination cursor |
| `contractId` | UUID | Filter by contract |
| `status` | string | `unpaid` \| `paid` \| `overdue` \| `cancelled` |
| `billingMonth` | string | YYYY-MM filter |
| `from` | date | Filter createdAt >= date |
| `to` | date | Filter createdAt <= date |

**Success Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "inv_abc123",
      "billingMonth": "2026-04",
      "roomNumber": "P101",
      "tenantName": "Trần Thị Bình",
      "totalAmount": 4230000,
      "dueDate": "2026-04-20",
      "status": "unpaid",
      "daysOverdue": 0
    }
  ],
  "meta": { "limit": 20, "hasNextPage": false, "nextCursor": null, "total": 48 }
}
```

---

## 13. Payments Endpoints

### 13.1 Initiate Payment

**POST /v1/payments/initiate**  
**Auth:** Bearer required  
**RBAC:** [Tenant] — can only pay their own invoices; [Landlord] — can initiate on behalf of tenant

**Request Body:**

```json
{
  "invoiceId": "inv_abc123",        // UUID, required
  "provider": "momo",               // enum: "momo" | "zalopay" | "vietqr", required
  "amount": 4230000,                // number, VND, required — must match invoice totalAmount
  "returnUrl": "myapp://payment/callback",  // string, optional — deep link for mobile redirect
  "description": "Thanh toán hóa đơn tháng 4/2026"  // string, optional
}
```

**Success Response 201:**

```json
{
  "success": true,
  "data": {
    "paymentId": "pay_abc123",
    "invoiceId": "inv_abc123",
    "provider": "momo",
    "amount": 4230000,
    "status": "pending",
    "paymentUrl": "https://payment.momo.vn/pay?token=...",
    "deepLink": "momo://pay?token=...",
    "qrCode": "data:image/png;base64,...",
    "expiresAt": "2026-04-16T10:15:00Z",
    "providerOrderId": "pay_abc123_1745123456",
    "createdAt": "2026-04-16T10:00:00Z"
  }
}
```

**VietQR-specific additional fields:**

```json
{
  "qrCode": "data:image/png;base64,...",
  "bankAccount": {
    "bankName": "Vietcombank",
    "accountNumber": "1234567890",
    "accountName": "NGUYEN VAN AN"
  },
  "transferContent": "PAY-abc123"
}
```

**Error Responses:**

```json
404 { "error": { "code": "NOT_FOUND", "message": "Invoice not found" } }
403 { "error": { "code": "FORBIDDEN", "message": "This invoice does not belong to you" } }
409 { "error": { "code": "CONFLICT", "message": "Invoice already paid" } }
422 { "error": { "code": "UNPROCESSABLE", "message": "Payment amount does not match invoice total" } }
```

---

### 13.2 Get Payment

**GET /v1/payments/{paymentId}**  
**Auth:** Bearer required  
**RBAC:** [Both] — must be party to the invoice

**Success Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "pay_abc123",
    "invoiceId": "inv_abc123",
    "provider": "momo",
    "amount": 4230000,
    "status": "paid",
    "providerOrderId": "pay_abc123_1745123456",
    "providerTransactionId": "987654321",
    "paidAt": "2026-04-16T10:06:00Z",
    "paymentUrl": null,
    "qrCode": null,
    "createdAt": "2026-04-16T10:00:00Z"
  }
}
```

---

### 13.3 Get Payment History

**GET /v1/payments**  
**Auth:** Bearer required  
**RBAC:** [Both]

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `limit` | integer | Default 20, max 100 |
| `cursor` | string | Pagination cursor |
| `status` | string | `pending` \| `paid` \| `failed` \| `refunded` |
| `provider` | string | `momo` \| `zalopay` \| `vietqr` |
| `contractId` | UUID | Filter by contract |
| `from` | date | Date range filter |
| `to` | date | Date range filter |

**Success Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "pay_abc123",
      "invoiceId": "inv_abc123",
      "billingMonth": "2026-04",
      "roomNumber": "P101",
      "tenantName": "Trần Thị Bình",
      "amount": 4230000,
      "provider": "momo",
      "status": "paid",
      "paidAt": "2026-04-16T10:06:00Z"
    }
  ],
  "meta": { "limit": 20, "hasNextPage": true, "nextCursor": "eyJ...", "total": 96 }
}
```

---

### 13.4 Payment Webhook Receiver

**POST /v1/webhooks/payment/{provider}**  
**Auth:** None (signature-based verification)  
**RBAC:** N/A (system endpoint)

See [Section 7 — Webhook Spec](#7-webhook-spec--payment-reconciliation) for full detail.

**Success Response 200:**

```json
{ "received": true }
```

---

## 14. Deposits Endpoints

### 14.1 Record Deposit

**POST /v1/deposits**  
**Auth:** Bearer required  
**RBAC:** [Landlord]

**Request Body:**

```json
{
  "contractId": "contract_abc123",   // UUID, required
  "amount": 7000000,                 // number, VND, required — must match contract.depositAmount
  "paidDate": "2026-05-01",         // date YYYY-MM-DD, required
  "paymentMethod": "bank_transfer",  // enum: "cash" | "bank_transfer" | "momo" | "zalopay", required
  "reference": "FT26106789",         // string, optional — bank transfer reference
  "notes": "Đặt cọc đầy đủ"         // string, optional
}
```

**Success Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "dep_abc123",
    "contractId": "contract_abc123",
    "tenantId": "usr_tenant1",
    "landlordId": "usr_landlord1",
    "amount": 7000000,
    "paidDate": "2026-05-01",
    "paymentMethod": "bank_transfer",
    "reference": "FT26106789",
    "status": "held",
    "refundAmount": null,
    "refundDate": null,
    "refundReason": null,
    "notes": "Đặt cọc đầy đủ",
    "createdAt": "2026-05-01T10:00:00Z"
  }
}
```

**Error Responses:**

```json
409 { "error": { "code": "CONFLICT", "message": "Deposit already recorded for this contract" } }
422 { "error": { "code": "UNPROCESSABLE", "message": "Deposit amount (6000000) does not match contract deposit amount (7000000)" } }
```

---

### 14.2 Process Deposit Refund

**POST /v1/deposits/{depositId}/refund**  
**Auth:** Bearer required  
**RBAC:** [Landlord]

**Request Body:**

```json
{
  "refundAmount": 6500000,             // number, VND, required — must be <= deposit amount
  "refundDate": "2026-06-05",          // date YYYY-MM-DD, required
  "refundReason": "Trừ tiền sửa chữa cửa bị hỏng (500,000 VND)",  // string, required, max 1000 chars
  "deductions": [                       // array, optional — itemized deductions
    { "description": "Sửa cửa phòng", "amount": 500000 }
  ],
  "paymentMethod": "bank_transfer"     // enum: "cash" | "bank_transfer" | "momo" | "zalopay"
}
```

**Success Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "dep_abc123",
    "status": "refunded",
    "originalAmount": 7000000,
    "refundAmount": 6500000,
    "deductedAmount": 500000,
    "deductions": [{ "description": "Sửa cửa phòng", "amount": 500000 }],
    "refundDate": "2026-06-05",
    "refundReason": "Trừ tiền sửa chữa cửa bị hỏng (500,000 VND)",
    "refundedAt": "2026-04-16T11:00:00Z"
  }
}
```

**Error Responses:**

```json
422 { "error": { "code": "UNPROCESSABLE", "message": "Refund amount exceeds deposit amount" } }
409 { "error": { "code": "CONFLICT", "message": "Deposit has already been refunded" } }
```

---

### 14.3 Get Deposit

**GET /v1/deposits/{depositId}**  
**Auth:** Bearer required  
**RBAC:** [Both] — landlord who owns; tenant who is party

**Success Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "dep_abc123",
    "contractId": "contract_abc123",
    "tenantId": "usr_tenant1",
    "amount": 7000000,
    "paidDate": "2026-05-01",
    "paymentMethod": "bank_transfer",
    "status": "held",
    "refundAmount": null,
    "refundDate": null,
    "deductions": [],
    "createdAt": "2026-05-01T10:00:00Z"
  }
}
```

---

### 14.4 Deposit Transaction History

**GET /v1/deposits**  
**Auth:** Bearer required  
**RBAC:** [Both]

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `limit` | integer | Default 20, max 100 |
| `cursor` | string | Pagination cursor |
| `contractId` | UUID | Filter by contract |
| `status` | string | `held` \| `refunded` \| `forfeited` |

**Success Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "dep_abc123",
      "contractId": "contract_abc123",
      "roomNumber": "P101",
      "tenantName": "Trần Thị Bình",
      "amount": 7000000,
      "paidDate": "2026-05-01",
      "status": "held",
      "refundAmount": null,
      "createdAt": "2026-05-01T10:00:00Z"
    }
  ],
  "meta": { "limit": 20, "hasNextPage": false, "nextCursor": null, "total": 8 }
}
```

---

## 15. Checklist Endpoints

### 15.1 Create Room Checklist

**POST /v1/rooms/{roomId}/checklist**  
**Auth:** Bearer required  
**RBAC:** [Landlord]

**Request Body:**

```json
{
  "contractId": "contract_abc123",   // UUID, required — checklist is tied to a contract period
  "type": "move_in",                 // enum: "move_in" | "move_out", required
  "items": [
    {
      "category": "Nội thất",
      "name": "Giường ngủ",
      "description": "Giường đôi 1.6m",
      "quantity": 1,
      "condition": "new",            // enum: "new" | "good" | "fair" | "poor"
      "photoUrls": ["https://cdn.../item1.jpg"],
      "notes": "Không có vết trầy xước"
    },
    {
      "category": "Thiết bị",
      "name": "Máy lạnh",
      "description": "Daikin 1HP",
      "quantity": 1,
      "condition": "good",
      "photoUrls": [],
      "notes": null
    }
  ],
  "landlordNotes": "Phòng sạch sẽ khi bàn giao"
}
```

**Success Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "chk_abc123",
    "roomId": "room_abc123",
    "contractId": "contract_abc123",
    "type": "move_in",
    "status": "pending_tenant_confirmation",
    "items": [
      {
        "id": "chkitem_001",
        "category": "Nội thất",
        "name": "Giường ngủ",
        "description": "Giường đôi 1.6m",
        "quantity": 1,
        "condition": "new",
        "photoUrls": ["https://cdn.../item1.jpg"],
        "notes": "Không có vết trầy xước",
        "tenantConfirmed": false,
        "tenantConditionOverride": null
      }
    ],
    "landlordNotes": "Phòng sạch sẽ khi bàn giao",
    "tenantNotes": null,
    "landlordSignedAt": "2026-04-16T10:00:00Z",
    "tenantSignedAt": null,
    "createdAt": "2026-04-16T10:00:00Z"
  }
}
```

---

### 15.2 List Checklist Items

**GET /v1/rooms/{roomId}/checklist**  
**Auth:** Bearer required  
**RBAC:** [Both] — landlord who owns room; tenant who occupies room

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `contractId` | UUID | Filter by contract |
| `type` | string | `move_in` \| `move_out` |

**Success Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "chk_abc123",
      "type": "move_in",
      "status": "pending_tenant_confirmation",
      "itemCount": 8,
      "confirmedCount": 0,
      "createdAt": "2026-04-16T10:00:00Z"
    }
  ]
}
```

---

### 15.3 Get Checklist

**GET /v1/checklists/{checklistId}**  
**Auth:** Bearer required  
**RBAC:** [Both]

**Success Response 200:** Full checklist object with all items (same shape as create response).

---

### 15.4 Tenant Confirm Checklist Items

**POST /v1/checklists/{checklistId}/confirm**  
**Auth:** Bearer required  
**RBAC:** [Tenant] — must be the tenant of the contract

**Request Body:**

```json
{
  "confirmations": [
    {
      "itemId": "chkitem_001",
      "agreed": true,                          // boolean — does tenant agree with condition?
      "conditionOverride": null,               // enum or null — tenant's observed condition if different
      "tenantNotes": "Đồng ý"
    },
    {
      "itemId": "chkitem_002",
      "agreed": false,
      "conditionOverride": "fair",             // tenant says it's only "fair" not "good"
      "tenantNotes": "Máy lạnh có tiếng ồn nhẹ"
    }
  ],
  "tenantNotes": "Nhìn chung phòng ổn, máy lạnh cần kiểm tra lại",
  "tenantSignature": "https://cdn.rentapp.vn/signatures/tenant_sig.png"  // string, required
}
```

**Success Response 200:**

```json
{
  "success": true,
  "data": {
    "checklistId": "chk_abc123",
    "status": "completed",
    "tenantSignedAt": "2026-04-16T10:30:00Z",
    "disputedItems": [
      {
        "itemId": "chkitem_002",
        "name": "Máy lạnh",
        "landlordCondition": "good",
        "tenantCondition": "fair",
        "tenantNotes": "Máy lạnh có tiếng ồn nhẹ"
      }
    ]
  }
}
```

---

### 15.5 Get Checkout Comparison

**GET /v1/checklists/{checklistId}/comparison**  
**Auth:** Bearer required  
**RBAC:** [Both]

Compares a `move_in` checklist with the latest `move_out` checklist for the same room/contract.

**Success Response 200:**

```json
{
  "success": true,
  "data": {
    "contractId": "contract_abc123",
    "roomNumber": "P101",
    "comparison": [
      {
        "itemId": "chkitem_001",
        "name": "Giường ngủ",
        "moveInCondition": "new",
        "moveOutCondition": "good",
        "conditionChange": "minor_wear",
        "moveInPhotoUrls": ["https://cdn.../mi_item1.jpg"],
        "moveOutPhotoUrls": ["https://cdn.../mo_item1.jpg"],
        "landlordNotes": null,
        "tenantNotes": null,
        "deductionSuggested": false,
        "deductionAmount": 0
      }
    ],
    "summary": {
      "itemsWithChanges": 2,
      "totalDeductionSuggested": 500000
    }
  }
}
```

---

## 16. Maintenance Endpoints

### 16.1 Create Maintenance Ticket

**POST /v1/maintenance/tickets**  
**Auth:** Bearer required  
**RBAC:** [Tenant]

**Request Body:**

```json
{
  "roomId": "room_abc123",              // UUID, required — must be tenant's current room
  "title": "Vòi nước bị rỉ",           // string, required, 5–200 chars
  "description": "Vòi nước bồn rửa bát bị rỉ từ hôm qua, nước chảy liên tục",  // string, required, max 2000 chars
  "category": "plumbing",               // enum: "plumbing" | "electrical" | "furniture" | "appliance" | "structural" | "pest" | "other", required
  "priority": "medium",                 // enum: "low" | "medium" | "high" | "urgent", required
  "mediaUrls": [                        // array of strings, optional, max 5 (from presigned upload)
    "https://cdn.rentapp.vn/maintenance/img1.jpg",
    "https://cdn.rentapp.vn/maintenance/video1.mp4"
  ],
  "preferredSchedule": "2026-04-17 09:00"  // string, optional — tenant's preferred fix time
}
```

**Success Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "ticket_abc123",
    "roomId": "room_abc123",
    "propertyId": "prop_abc123",
    "tenantId": "usr_tenant1",
    "landlordId": "usr_landlord1",
    "title": "Vòi nước bị rỉ",
    "description": "...",
    "category": "plumbing",
    "priority": "medium",
    "status": "open",
    "mediaUrls": ["https://cdn.../img1.jpg"],
    "preferredSchedule": "2026-04-17T09:00:00Z",
    "scheduledAt": null,
    "resolvedAt": null,
    "tenantRating": null,
    "tenantFeedback": null,
    "createdAt": "2026-04-16T10:00:00Z",
    "updatedAt": "2026-04-16T10:00:00Z"
  }
}
```

**Error Responses:**

```json
403 { "error": { "code": "FORBIDDEN", "message": "You can only create tickets for your own room" } }
```

---

### 16.2 Update Ticket Status (Landlord)

**PATCH /v1/maintenance/tickets/{ticketId}/status**  
**Auth:** Bearer required  
**RBAC:** [Landlord] — must own the property containing the room

**Request Body:**

```json
{
  "status": "in_progress",            // enum: "open" | "in_progress" | "scheduled" | "resolved" | "closed" | "rejected", required
  "scheduledAt": "2026-04-17T09:00:00Z",  // datetime, required if status is "scheduled"
  "landlordNotes": "Sẽ gửi thợ đến vào sáng mai",  // string, optional, max 1000 chars
  "resolutionNotes": null             // string, required if status is "resolved"
}
```

**Status Transition Rules:**

```
open → in_progress | scheduled | rejected
in_progress → scheduled | resolved
scheduled → in_progress | resolved
resolved → closed (after tenant rates)
```

**Success Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "ticket_abc123",
    "status": "in_progress",
    "landlordNotes": "Sẽ gửi thợ đến vào sáng mai",
    "scheduledAt": null,
    "updatedAt": "2026-04-16T11:00:00Z"
  }
}
```

**Error Responses:**

```json
422 { "error": { "code": "UNPROCESSABLE", "message": "Invalid status transition: cannot go from resolved to in_progress" } }
```

---

### 16.3 Rate Ticket (Tenant)

**POST /v1/maintenance/tickets/{ticketId}/rate**  
**Auth:** Bearer required  
**RBAC:** [Tenant] — must be the tenant who created the ticket

**Request Body:**

```json
{
  "rating": 4,                         // integer 1–5, required
  "feedback": "Thợ đến đúng giờ, sửa nhanh và gọn gàng"  // string, optional, max 500 chars
}
```

**Business Rules:** Can only rate when ticket status is `resolved`. Rating triggers status → `closed`.

**Success Response 200:**

```json
{
  "success": true,
  "data": {
    "ticketId": "ticket_abc123",
    "tenantRating": 4,
    "tenantFeedback": "Thợ đến đúng giờ, sửa nhanh và gọn gàng",
    "status": "closed",
    "closedAt": "2026-04-18T14:00:00Z"
  }
}
```

**Error Responses:**

```json
422 { "error": { "code": "UNPROCESSABLE", "message": "Can only rate tickets with status resolved" } }
409 { "error": { "code": "CONFLICT", "message": "Ticket has already been rated" } }
```

---

### 16.4 List Maintenance Tickets

**GET /v1/maintenance/tickets**  
**Auth:** Bearer required  
**RBAC:** [Both] — landlord sees all tickets for their properties; tenant sees only their own

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `limit` | integer | Default 20, max 100 |
| `cursor` | string | Pagination cursor |
| `status` | string | Filter: `open` \| `in_progress` \| `scheduled` \| `resolved` \| `closed` \| `rejected` |
| `category` | string | Filter by category |
| `priority` | string | Filter: `low` \| `medium` \| `high` \| `urgent` |
| `roomId` | UUID | Filter by room (landlord only) |
| `propertyId` | UUID | Filter by property (landlord only) |
| `sort` | string | `createdAt` (default), `priority`, `updatedAt` |

**Success Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "ticket_abc123",
      "title": "Vòi nước bị rỉ",
      "category": "plumbing",
      "priority": "medium",
      "status": "in_progress",
      "roomNumber": "P101",
      "propertyName": "Nhà trọ Bình Thạnh",
      "tenantName": "Trần Thị Bình",
      "mediaUrls": ["https://cdn.../img1.jpg"],
      "scheduledAt": null,
      "createdAt": "2026-04-16T10:00:00Z"
    }
  ],
  "meta": { "limit": 20, "hasNextPage": false, "nextCursor": null, "total": 7 }
}
```

---

### 16.5 Get Maintenance Ticket

**GET /v1/maintenance/tickets/{ticketId}**  
**Auth:** Bearer required  
**RBAC:** [Both]

**Success Response 200:** Full ticket object with all fields and status history.

```json
{
  "success": true,
  "data": {
    "id": "ticket_abc123",
    "title": "Vòi nước bị rỉ",
    "description": "...",
    "category": "plumbing",
    "priority": "medium",
    "status": "resolved",
    "mediaUrls": ["https://cdn.../img1.jpg", "https://cdn.../video1.mp4"],
    "preferredSchedule": "2026-04-17T09:00:00Z",
    "scheduledAt": "2026-04-17T09:00:00Z",
    "landlordNotes": "Đã gửi thợ đến",
    "resolutionNotes": "Đã thay ron vòi mới",
    "resolvedAt": "2026-04-17T10:30:00Z",
    "tenantRating": null,
    "tenantFeedback": null,
    "statusHistory": [
      { "status": "open", "changedAt": "2026-04-16T10:00:00Z", "changedBy": "usr_tenant1" },
      { "status": "in_progress", "changedAt": "2026-04-16T11:00:00Z", "changedBy": "usr_landlord1", "notes": "Sẽ gửi thợ đến" },
      { "status": "resolved", "changedAt": "2026-04-17T10:30:00Z", "changedBy": "usr_landlord1", "notes": "Đã thay ron vòi mới" }
    ],
    "createdAt": "2026-04-16T10:00:00Z",
    "updatedAt": "2026-04-17T10:30:00Z"
  }
}
```

---

## 17. Notifications Endpoints

### 17.1 List Notifications

**GET /v1/notifications**  
**Auth:** Bearer required  
**RBAC:** [Both]

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `limit` | integer | Default 20, max 50 |
| `cursor` | string | Pagination cursor |
| `isRead` | boolean | Filter: `true` \| `false` |
| `type` | string | Filter by notification type (see types below) |

**Notification Types:**

| Type | Description |
|---|---|
| `invoice_created` | New invoice generated |
| `invoice_overdue` | Invoice past due date |
| `payment_received` | Payment confirmed |
| `contract_signed` | Contract signature event |
| `contract_expiring` | Contract expires in 30/15/7 days |
| `maintenance_update` | Maintenance ticket status changed |
| `maintenance_rated` | Tenant rated a ticket |
| `deposit_refunded` | Deposit refund processed |
| `checklist_created` | New checklist awaiting confirmation |
| `new_message` | New chat message received |

**Success Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "notif_abc123",
      "type": "payment_received",
      "title": "Thanh toán thành công",
      "body": "Hóa đơn tháng 4/2026 phòng P101 đã được thanh toán 4,230,000 VND",
      "data": {
        "paymentId": "pay_abc123",
        "invoiceId": "inv_abc123",
        "amount": 4230000
      },
      "isRead": false,
      "createdAt": "2026-04-16T10:06:00Z"
    }
  ],
  "meta": { "limit": 20, "hasNextPage": true, "nextCursor": "eyJ...", "total": 42, "unreadCount": 5 }
}
```

---

### 17.2 Mark Notification as Read

**PATCH /v1/notifications/{notificationId}/read**  
**Auth:** Bearer required  
**RBAC:** [Both] — own notifications only

**Request Body:** Empty `{}`

**Success Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "notif_abc123",
    "isRead": true,
    "readAt": "2026-04-16T10:30:00Z"
  }
}
```

---

### 17.3 Mark All Notifications as Read

**POST /v1/notifications/read-all**  
**Auth:** Bearer required  
**RBAC:** [Both]

**Request Body:** Empty `{}`

**Success Response 200:**

```json
{
  "success": true,
  "data": {
    "markedCount": 5,
    "markedAt": "2026-04-16T10:30:00Z"
  }
}
```

---

## 18. Chat Endpoints

### 18.1 List Conversations

**GET /v1/chat/conversations**  
**Auth:** Bearer required  
**RBAC:** [Both]

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `limit` | integer | Default 20, max 50 |
| `cursor` | string | Pagination cursor |

**Success Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "conv_abc123",
      "participants": [
        { "id": "usr_landlord1", "fullName": "Nguyễn Văn An", "avatarUrl": null, "role": "landlord" },
        { "id": "usr_tenant1", "fullName": "Trần Thị Bình", "avatarUrl": null, "role": "tenant" }
      ],
      "relatedContext": {
        "type": "room",
        "roomId": "room_abc123",
        "roomNumber": "P101",
        "propertyName": "Nhà trọ Bình Thạnh"
      },
      "lastMessage": {
        "id": "msg_xyz789",
        "senderId": "usr_tenant1",
        "type": "text",
        "content": "Anh ơi khi nào thợ đến ạ?",
        "createdAt": "2026-04-16T10:05:00Z"
      },
      "unreadCount": 1,
      "createdAt": "2026-05-01T10:00:00Z"
    }
  ],
  "meta": { "limit": 20, "hasNextPage": false, "nextCursor": null, "total": 3 }
}
```

---

### 18.2 Get or Create Conversation

**POST /v1/chat/conversations**  
**Auth:** Bearer required  
**RBAC:** [Both]

Creates a conversation between landlord and tenant, or returns existing one.

**Request Body:**

```json
{
  "recipientId": "usr_landlord1",      // UUID, required — the other party
  "roomId": "room_abc123"              // UUID, optional — links conversation to a room context
}
```

**Success Response 200 (existing) or 201 (new):**

```json
{
  "success": true,
  "data": {
    "id": "conv_abc123",
    "participants": [ ... ],
    "relatedContext": { ... },
    "createdAt": "2026-05-01T10:00:00Z"
  }
}
```

**Error Responses:**

```json
422 { "error": { "code": "UNPROCESSABLE", "message": "Cannot create conversation between two landlords" } }
404 { "error": { "code": "NOT_FOUND", "message": "Recipient not found" } }
```

---

### 18.3 Get Messages in Conversation

**GET /v1/chat/conversations/{conversationId}/messages**  
**Auth:** Bearer required  
**RBAC:** [Both] — must be a participant

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `limit` | integer | Default 30, max 100 |
| `cursor` | string | Cursor for older messages (scroll up) |
| `order` | string | `desc` (default — newest first) |

**Success Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "msg_xyz789",
      "conversationId": "conv_abc123",
      "senderId": "usr_tenant1",
      "senderName": "Trần Thị Bình",
      "senderAvatarUrl": null,
      "type": "text",
      "content": "Anh ơi khi nào thợ đến ạ?",
      "imageUrl": null,
      "seenBy": ["usr_tenant1"],
      "createdAt": "2026-04-16T10:05:00Z"
    },
    {
      "id": "msg_xyz788",
      "conversationId": "conv_abc123",
      "senderId": "usr_landlord1",
      "senderName": "Nguyễn Văn An",
      "senderAvatarUrl": null,
      "type": "image",
      "content": null,
      "imageUrl": "https://cdn.rentapp.vn/chat/img_abc.jpg",
      "seenBy": ["usr_landlord1", "usr_tenant1"],
      "createdAt": "2026-04-16T09:50:00Z"
    }
  ],
  "meta": { "limit": 30, "hasNextPage": true, "nextCursor": "eyJ...", "total": null }
}
```

---

### 18.4 Send Message

**POST /v1/chat/conversations/{conversationId}/messages**  
**Auth:** Bearer required  
**RBAC:** [Both] — must be a participant

**Request Body:**

```json
{
  "type": "text",                       // enum: "text" | "image", required
  "content": "Thợ sẽ đến 9h sáng mai", // string, required if type=text, max 5000 chars
  "imageUrl": null                      // string, required if type=image, from presigned upload
}
```

**Success Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "msg_xyz790",
    "conversationId": "conv_abc123",
    "senderId": "usr_landlord1",
    "type": "text",
    "content": "Thợ sẽ đến 9h sáng mai",
    "imageUrl": null,
    "seenBy": ["usr_landlord1"],
    "createdAt": "2026-04-16T10:10:00Z"
  }
}
```

**Error Responses:**

```json
403 { "error": { "code": "FORBIDDEN", "message": "You are not a participant in this conversation" } }
422 { "error": { "code": "UNPROCESSABLE", "message": "content is required when type is text" } }
```

---

### 18.5 Mark Conversation as Seen

**POST /v1/chat/conversations/{conversationId}/seen**  
**Auth:** Bearer required  
**RBAC:** [Both] — must be a participant

**Request Body:** Empty `{}`

**Success Response 200:**

```json
{
  "success": true,
  "data": {
    "conversationId": "conv_abc123",
    "userId": "usr_tenant1",
    "lastSeenAt": "2026-04-16T10:10:00Z"
  }
}
```

---

## 19. Financial Reports Endpoints

### 19.1 Monthly Summary

**GET /v1/reports/monthly-summary**  
**Auth:** Bearer required  
**RBAC:** [Landlord]

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `year` | integer | Yes | e.g., `2026` |
| `month` | integer | Yes | 1–12 |
| `propertyId` | UUID | No | Filter by specific property |

**Success Response 200:**

```json
{
  "success": true,
  "data": {
    "period": "2026-04",
    "propertyId": null,
    "summary": {
      "totalRevenue": 42300000,
      "collectedRevenue": 38070000,
      "pendingRevenue": 4230000,
      "overdueRevenue": 0,
      "totalDepositsHeld": 56000000,
      "maintenanceCosts": 500000,
      "netRevenue": 37570000
    },
    "byProperty": [
      {
        "propertyId": "prop_abc123",
        "propertyName": "Nhà trọ Bình Thạnh",
        "totalRooms": 12,
        "occupiedRooms": 10,
        "occupancyRate": 0.833,
        "totalRent": 35000000,
        "collected": 31500000,
        "pending": 3500000,
        "overdue": 0
      }
    ],
    "invoiceStats": {
      "total": 10,
      "paid": 9,
      "unpaid": 1,
      "overdue": 0
    },
    "paymentMethodBreakdown": {
      "momo": 21000000,
      "zalopay": 10500000,
      "vietqr": 6570000,
      "cash": 0
    }
  }
}
```

---

### 19.2 Transaction List with Filters

**GET /v1/reports/transactions**  
**Auth:** Bearer required  
**RBAC:** [Landlord]

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `limit` | integer | Default 20, max 100 |
| `cursor` | string | Pagination cursor |
| `type` | string | `payment` \| `deposit` \| `refund` |
| `propertyId` | UUID | Filter by property |
| `roomId` | UUID | Filter by room |
| `status` | string | `paid` \| `pending` \| `failed` \| `refunded` |
| `provider` | string | `momo` \| `zalopay` \| `vietqr` |
| `from` | date | Start date filter YYYY-MM-DD |
| `to` | date | End date filter YYYY-MM-DD |
| `sort` | string | `date` (default), `amount` |
| `order` | string | `desc` (default), `asc` |

**Success Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "pay_abc123",
      "type": "payment",
      "date": "2026-04-16T10:06:00Z",
      "amount": 4230000,
      "direction": "income",
      "status": "paid",
      "provider": "momo",
      "description": "Thanh toán hóa đơn tháng 4/2026",
      "roomNumber": "P101",
      "propertyName": "Nhà trọ Bình Thạnh",
      "tenantName": "Trần Thị Bình",
      "referenceId": "inv_abc123"
    },
    {
      "id": "dep_abc123",
      "type": "deposit",
      "date": "2026-05-01T10:00:00Z",
      "amount": 7000000,
      "direction": "income",
      "status": "held",
      "provider": null,
      "description": "Tiền cọc phòng P101",
      "roomNumber": "P101",
      "propertyName": "Nhà trọ Bình Thạnh",
      "tenantName": "Trần Thị Bình",
      "referenceId": "dep_abc123"
    }
  ],
  "meta": {
    "limit": 20,
    "hasNextPage": true,
    "nextCursor": "eyJ...",
    "total": 156,
    "aggregates": {
      "totalIncome": 42300000,
      "totalOutcome": 500000,
      "netTotal": 41800000
    }
  }
}
```

---

### 19.3 Annual Overview

**GET /v1/reports/annual**  
**Auth:** Bearer required  
**RBAC:** [Landlord]

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `year` | integer | Yes | e.g., `2026` |
| `propertyId` | UUID | No | Filter by property |

**Success Response 200:**

```json
{
  "success": true,
  "data": {
    "year": 2026,
    "totalAnnualRevenue": 507600000,
    "monthlyBreakdown": [
      { "month": 1, "revenue": 42300000, "collected": 42300000, "pending": 0, "occupancyRate": 0.833 },
      { "month": 2, "revenue": 42300000, "collected": 38070000, "pending": 4230000, "occupancyRate": 0.833 },
      { "month": 3, "revenue": 42300000, "collected": 42300000, "pending": 0, "occupancyRate": 0.916 },
      { "month": 4, "revenue": 42300000, "collected": 38070000, "pending": 4230000, "occupancyRate": 0.916 }
    ],
    "occupancyTrend": {
      "average": 0.875,
      "highest": { "month": 3, "rate": 0.916 },
      "lowest": { "month": 1, "rate": 0.833 }
    }
  }
}
```

---

## Appendix A — Endpoint Summary Table

| # | Method | Path | RBAC | Description |
|---|---|---|---|---|
| 1 | POST | /v1/auth/register | Public | Register new user |
| 2 | POST | /v1/auth/login | Public | Login and get tokens |
| 3 | POST | /v1/auth/refresh | Public | Refresh access token |
| 4 | POST | /v1/auth/logout | Both | Logout and invalidate refresh token |
| 5 | GET | /v1/auth/profile | Both | Get current user profile |
| 6 | PATCH | /v1/auth/profile | Both | Update current user profile |
| 7 | POST | /v1/uploads/presign | Both | Request presigned upload URL |
| 8 | POST | /v1/properties | Landlord | Create property |
| 9 | GET | /v1/properties | Landlord | List own properties |
| 10 | GET | /v1/properties/{id} | Landlord | Get property detail |
| 11 | PATCH | /v1/properties/{id} | Landlord | Update property |
| 12 | DELETE | /v1/properties/{id} | Landlord | Delete property |
| 13 | POST | /v1/properties/{id}/rooms | Landlord | Create room in property |
| 14 | GET | /v1/properties/{id}/rooms | Landlord | List rooms in property |
| 15 | GET | /v1/properties/{id}/rooms/{roomId} | Both | Get room detail |
| 16 | PATCH | /v1/properties/{id}/rooms/{roomId} | Landlord | Update room |
| 17 | PATCH | /v1/properties/{id}/rooms/{roomId}/status | Landlord | Update room status |
| 18 | GET | /v1/properties/{id}/rooms/{roomId}/calendar | Landlord | Get room availability calendar |
| 19 | DELETE | /v1/properties/{id}/rooms/{roomId} | Landlord | Delete room |
| 20 | POST | /v1/contracts | Landlord | Create contract |
| 21 | GET | /v1/contracts | Both | List contracts |
| 22 | GET | /v1/contracts/{id} | Both | Get contract detail |
| 23 | POST | /v1/contracts/{id}/generate-pdf | Landlord | Generate contract PDF |
| 24 | POST | /v1/contracts/{id}/sign | Both | Submit e-signature |
| 25 | GET | /v1/contracts/{id}/download | Both | Download contract PDF |
| 26 | POST | /v1/contracts/{id}/terminate | Landlord | Terminate contract |
| 27 | POST | /v1/invoices | Landlord | Create monthly invoice |
| 28 | GET | /v1/invoices | Both | List invoices |
| 29 | GET | /v1/invoices/{id} | Both | Get invoice detail |
| 30 | POST | /v1/payments/initiate | Both | Initiate payment |
| 31 | GET | /v1/payments/{id} | Both | Get payment detail |
| 32 | GET | /v1/payments | Both | Get payment history |
| 33 | POST | /v1/webhooks/payment/{provider} | System | Payment webhook receiver |
| 34 | POST | /v1/deposits | Landlord | Record deposit |
| 35 | GET | /v1/deposits | Both | List deposits |
| 36 | GET | /v1/deposits/{id} | Both | Get deposit detail |
| 37 | POST | /v1/deposits/{id}/refund | Landlord | Process deposit refund |
| 38 | POST | /v1/rooms/{roomId}/checklist | Landlord | Create room checklist |
| 39 | GET | /v1/rooms/{roomId}/checklist | Both | List checklists for room |
| 40 | GET | /v1/checklists/{id} | Both | Get checklist detail |
| 41 | POST | /v1/checklists/{id}/confirm | Tenant | Tenant confirms checklist items |
| 42 | GET | /v1/checklists/{id}/comparison | Both | Move-in vs move-out comparison |
| 43 | POST | /v1/maintenance/tickets | Tenant | Create maintenance ticket |
| 44 | GET | /v1/maintenance/tickets | Both | List maintenance tickets |
| 45 | GET | /v1/maintenance/tickets/{id} | Both | Get ticket detail |
| 46 | PATCH | /v1/maintenance/tickets/{id}/status | Landlord | Update ticket status |
| 47 | POST | /v1/maintenance/tickets/{id}/rate | Tenant | Rate resolved ticket |
| 48 | GET | /v1/notifications | Both | List notifications |
| 49 | PATCH | /v1/notifications/{id}/read | Both | Mark notification as read |
| 50 | POST | /v1/notifications/read-all | Both | Mark all notifications as read |
| 51 | GET | /v1/chat/conversations | Both | List conversations |
| 52 | POST | /v1/chat/conversations | Both | Get or create conversation |
| 53 | GET | /v1/chat/conversations/{id}/messages | Both | Get messages (paginated) |
| 54 | POST | /v1/chat/conversations/{id}/messages | Both | Send message |
| 55 | POST | /v1/chat/conversations/{id}/seen | Both | Mark conversation as seen |
| 56 | GET | /v1/reports/monthly-summary | Landlord | Monthly financial summary |
| 57 | GET | /v1/reports/transactions | Landlord | Transaction list with filters |
| 58 | GET | /v1/reports/annual | Landlord | Annual revenue overview |

---

## Appendix B — Database Schema Notes

Key tables referenced across endpoints:

| Table | Key Columns |
|---|---|
| `users` | id, full_name, email, phone, password_hash, role, avatar_url, national_id, bank_account_*, created_at |
| `refresh_tokens` | id, user_id, token_hash, family_id, expires_at, revoked_at |
| `properties` | id, landlord_id, name, type, address_json, electricity_rate, water_rate, service_charge |
| `rooms` | id, property_id, room_number, floor, area, monthly_rent, deposit_amount, status, electricity_meter_start, water_meter_start |
| `contracts` | id, room_id, property_id, tenant_id, landlord_id, start_date, end_date, status, landlord_signed_at, tenant_signed_at, pdf_url |
| `invoices` | id, contract_id, room_id, tenant_id, billing_month, breakdown_json, total_amount, status, due_date, paid_at |
| `payments` | id, invoice_id, provider, amount, status, provider_order_id, provider_transaction_id, paid_at |
| `deposits` | id, contract_id, tenant_id, amount, paid_date, status, refund_amount, deductions_json |
| `checklists` | id, room_id, contract_id, type, status, items_json, landlord_signed_at, tenant_signed_at |
| `maintenance_tickets` | id, room_id, tenant_id, landlord_id, title, category, priority, status, media_urls, scheduled_at, resolved_at, tenant_rating |
| `notifications` | id, user_id, type, title, body, data_json, is_read, read_at |
| `conversations` | id, room_id, created_at |
| `conversation_participants` | conversation_id, user_id, last_seen_at |
| `messages` | id, conversation_id, sender_id, type, content, image_url, created_at |

---

*End of API Specification v1 — App Quản Lý Cho Thuê Nhà*  
*Generated: 2026-04-16*
