# Security Audit — Payment & Webhook Modules

**Date:** 2026-05-15
**Scope:** `apps/api/src/payments/payments.service.ts`, `apps/api/src/webhooks/webhooks.controller.ts`, `apps/api/src/auth/strategies/jwt.strategy.ts`
**Auditor:** Senior Security Engineer (automated review)

---

## Summary Table

| # | Severity | Area | Short Description |
|---|----------|------|-------------------|
| 1 | **Critical** | Webhooks | MoMo/ZaloPay/SePay — non-timing-safe string comparison allows HMAC bypass via timing attack |
| 2 | **Critical** | Webhooks (SePay) | `transferAmount` from webhook body is never validated against the DB amount — amount substitution accepted without verification |
| 3 | **High** | Webhooks | ThrottlerModule is configured but no `ThrottlerGuard` is applied anywhere; webhook endpoints have no rate-limit enforcement |
| 4 | **High** | Webhooks (SePay) | SePay auth uses a static API-key bearer secret compared with `!==` (non-timing-safe); same severity class as #1 |
| 5 | **High** | Payments | `reconcile()` idempotency guard has a TOCTOU race window under concurrent webhook delivery |
| 6 | **High** | Payments | MoMo error message from the gateway is forwarded verbatim to the client — potential information leakage |
| 7 | **Medium** | Payments | `orderId` is partly derived from `Date.now()` (millisecond timestamp) — low but non-zero collision risk for two rapid requests on the same invoice |
| 8 | **Medium** | Auth | `JWT_SECRET` is read with the non-null assertion (`!`) at module bootstrap — a missing env var causes a runtime crash instead of a controlled startup error |
| 9 | **Medium** | App | `CORS_ORIGIN` defaults to `'*'` if the env var is absent — overly permissive in production |
| 10 | **Low** | Auth | JWT strategy does a DB round-trip on every authenticated request; there is no cache/allowlist — unnecessary load and no revocation mechanism documented |
| 11 | **Low** | Webhooks (ZaloPay) | MAC mismatch returns HTTP 200 with `return_code: -1` instead of HTTP 400 — makes it harder to alert on bad traffic |

---

## Findings

### Finding 1 — Critical: Non-timing-safe HMAC comparison (MoMo & ZaloPay)

**File:line:** `apps/api/src/webhooks/webhooks.controller.ts:28` (MoMo), `:49` (ZaloPay)

**Description:**
Both MoMo and ZaloPay signature checks use JavaScript's `===` operator for string comparison:

```ts
// MoMo — line 28
if (body.signature !== expectedSig) { ... }

// ZaloPay — line 49
if (mac !== expectedMac) { ... }
```

V8 (and most JS engines) short-circuit string comparisons on the first differing character.
An attacker making repeated requests can use statistical timing measurements to brute-force the expected HMAC one nibble at a time, eventually forging a valid signature without knowing the secret key.
This is a well-documented attack class (Lucky Thirteen, various HMAC timing papers).

**Fix:** Use Node's built-in `crypto.timingSafeEqual` after converting both strings to `Buffer`:

```ts
import * as crypto from 'crypto';

function safeCompareHex(a: string, b: string): boolean {
  // Lengths must match first; differing lengths are not secret
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

// MoMo
if (!safeCompareHex(body.signature, expectedSig)) { ... }

// ZaloPay
if (!safeCompareHex(mac, expectedMac)) { ... }
```

---

### Finding 2 — Critical: SePay `transferAmount` never validated against DB amount

**File:line:** `apps/api/src/webhooks/webhooks.controller.ts:76-81`

**Description:**
The SePay webhook handler extracts `transferAmount` from the request body and then calls `reconcile()` with `'success'` without verifying that the transferred amount equals the invoice amount stored in the database:

```ts
const { transferAmount, description } = body;  // line 76 — transferAmount is read but never used
const match = description?.match(/RENT-([a-zA-Z0-9]{8}-\d+)/);
if (!match) return { success: true };

const orderId = match[0];
await this.payments.reconcile(orderId, 'success', body.referenceCode, body);  // line 81
```

`transferAmount` is destructured but then silently discarded. Any notification with a valid `orderId` in the description — regardless of the actual transferred amount — will mark the invoice as paid. A malicious actor who can send a request to this endpoint (e.g., via SePay's webhook infrastructure or a misconfigured test key) could pay ₫1 and have a ₫10,000,000 invoice reconciled as paid.

**Fix:** Load the payment record first and compare amounts before reconciling:

```ts
async sepayCallback(@Body() body: any, @Headers('x-api-key') apiKey: string) {
  if (!safeCompareHmac(apiKey, process.env.SEPAY_WEBHOOK_SECRET!)) {
    throw new BadRequestException('Invalid API key');
  }

  const { transferAmount, description } = body;
  const match = description?.match(/RENT-([a-zA-Z0-9]{8}-\d+)/);
  if (!match) return { success: true };

  const orderId = match[0];

  // Amount guard — load the pending payment and compare
  const payment = await this.prisma.payment.findUnique({ where: { gatewayOrderId: orderId } });
  if (!payment) return { success: true };
  if (transferAmount !== payment.amount) {
    this.logger.warn(`SePay amount mismatch for ${orderId}: got ${transferAmount}, expected ${payment.amount}`);
    return { success: true };  // do NOT reconcile; alert operations team
  }

  await this.payments.reconcile(orderId, 'success', body.referenceCode, body);
  return { success: true };
}
```

---

### Finding 3 — High: Rate-limiting configured but never enforced on any endpoint

**File:line:** `apps/api/src/app.module.ts:26`, `apps/api/src/webhooks/webhooks.controller.ts` (no guard present)

**Description:**
`ThrottlerModule` is imported and configured (`60 req / 60 s`), but no `ThrottlerGuard` is registered as a global guard or applied to any controller. NestJS throttling is opt-in via the guard; the module import alone does nothing. Consequently, all endpoints — including the unauthenticated webhook endpoints — have no rate-limiting.

An adversary can flood the webhook endpoints to:
- enumerate valid `orderId` patterns (SePay endpoint does not require HMAC, only a shared secret that is susceptible to timing attacks per Finding 1)
- trigger DoS via excessive DB writes or reconcile attempts

**Fix — two required changes:**

1. Register `ThrottlerGuard` globally in `AppModule`:

```ts
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

providers: [
  { provide: APP_GUARD, useClass: ThrottlerGuard },
],
```

2. Add tighter per-endpoint limits on the webhook controller (payment gateways send at most a handful of retries):

```ts
import { Throttle, SkipThrottle } from '@nestjs/throttler';

@Throttle({ default: { ttl: 60_000, limit: 10 } })
@Controller('webhooks')
export class WebhooksController { ... }
```

---

### Finding 4 — High: SePay API-key comparison is non-timing-safe

**File:line:** `apps/api/src/webhooks/webhooks.controller.ts:72`

**Description:**
```ts
if (apiKey !== process.env.SEPAY_WEBHOOK_SECRET) {
```
This is the same class of timing attack as Finding 1 but applied to the static API key. Unlike HMAC hex strings, the API key comparison uses arbitrary UTF-8 strings, so `timingSafeEqual` requires converting to `Buffer` with the same encoding on both sides.

**Fix:**

```ts
function safeCompareUtf8(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

if (!safeCompareUtf8(apiKey ?? '', process.env.SEPAY_WEBHOOK_SECRET!)) {
  throw new BadRequestException('Invalid API key');
}
```

Note: `apiKey` can be `undefined` if the header is absent; add a null-guard (`apiKey ?? ''`) to avoid a runtime error before the comparison.

---

### Finding 5 — High: TOCTOU race condition in `reconcile()` idempotency guard

**File:line:** `apps/api/src/payments/payments.service.ts:73-103`

**Description:**
The current idempotency guard is:

```ts
const payment = await this.prisma.payment.findUnique({ where: { gatewayOrderId: orderId } });
if (!payment) return;
if (payment.status !== PaymentStatus.cho_xu_ly) return;  // only process pending

// ... later ...
await this.prisma.$transaction([
  this.prisma.payment.update({ where: { gatewayOrderId: orderId }, data: { status: PaymentStatus.thanh_cong, ... } }),
  this.prisma.invoice.update({ ... data: { status: InvoiceStatus.da_thanh_toan } }),
]);
```

The `findUnique` (read) and the `$transaction` (write) are two separate database operations with no exclusive lock between them. If two webhook deliveries arrive simultaneously (common — payment gateways retry aggressively), both can read `status === cho_xu_ly` before either write completes, and both will proceed to update. This results in:
- The invoice being marked paid twice (harmless in this case but non-atomic)
- `gatewayTransactionId` and `gatewayResponse` being overwritten by the second delivery

More critically, the invoice `paidAt` timestamp will be set twice, and if any side-effect (e.g., a notification or a ledger entry) is triggered inside the transaction, it will fire twice.

**Fix — use an atomic conditional update ("compare-and-swap") instead of read-then-write:**

```ts
async reconcile(orderId: string, status: 'success' | 'failure', transactionId?: string, gatewayResponse?: object) {
  if (status === 'success') {
    // Atomically transition cho_xu_ly → thanh_cong; if the row is already
    // in another state, updateMany returns count=0 and we bail early.
    const result = await this.prisma.payment.updateMany({
      where: { gatewayOrderId: orderId, status: PaymentStatus.cho_xu_ly },
      data: {
        status: PaymentStatus.thanh_cong,
        gatewayTransactionId: transactionId,
        gatewayResponse: gatewayResponse as any,
        paidAt: new Date(),
      },
    });
    if (result.count === 0) return; // already processed or not found

    // Load to get invoiceId, then update invoice
    const payment = await this.prisma.payment.findUnique({ where: { gatewayOrderId: orderId } });
    if (payment) {
      await this.prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: { status: InvoiceStatus.da_thanh_toan, paidAt: new Date() },
      });
    }
  } else {
    await this.prisma.payment.updateMany({
      where: { gatewayOrderId: orderId, status: PaymentStatus.cho_xu_ly },
      data: { status: PaymentStatus.that_bai, gatewayResponse: gatewayResponse as any },
    });
  }
}
```

`updateMany` with a `where` condition on `status` is effectively a database-level CAS; if two concurrent calls race, only one will find `count > 0`.

---

### Finding 6 — High: MoMo gateway error message forwarded verbatim to client

**File:line:** `apps/api/src/payments/payments.service.ts:126`

**Description:**
```ts
if (data.resultCode !== 0) throw new BadRequestException(`MoMo error: ${data.message}`);
```

The raw message from MoMo's API is embedded directly in the HTTP 400 response body. Depending on MoMo's error messages, this can expose internal details such as:
- Merchant configuration hints ("invalid access key for environment X")
- Internal endpoint routing information
- Rate-limiting or quota details that assist in timing attacks

**Fix:** Log the raw message server-side and return a generic client-facing message:

```ts
if (data.resultCode !== 0) {
  this.logger.error(`MoMo order creation failed: resultCode=${data.resultCode} message=${data.message}`);
  throw new BadRequestException('Không thể khởi tạo thanh toán MoMo. Vui lòng thử lại.');
}
```

Apply the same pattern to the ZaloPay error on line 151:
```ts
if (data.return_code !== 1) {
  this.logger.error(`ZaloPay order creation failed: return_code=${data.return_code} message=${data.return_message}`);
  throw new BadRequestException('Không thể khởi tạo thanh toán ZaloPay. Vui lòng thử lại.');
}
```

---

### Finding 7 — Medium: `orderId` collision risk from millisecond timestamp

**File:line:** `apps/api/src/payments/payments.service.ts:28`

**Description:**
```ts
const orderId = `RENT-${invoice.id.slice(0, 8)}-${Date.now()}`;
```

`Date.now()` has millisecond resolution. Two concurrent payment-initiation calls for the same invoice (e.g., double-tap on mobile) within the same millisecond will produce the same `orderId`. If the `gatewayOrderId` column has a unique index, the second request will receive a Prisma `P2002` (conflict) error. If it does not have a unique index, two payment rows will share an `orderId`, breaking the `reconcile()` lookup which assumes `findUnique`.

**Fix:** Append a cryptographically random suffix instead of (or in addition to) a timestamp:

```ts
const nonce = crypto.randomBytes(4).toString('hex');
const orderId = `RENT-${invoice.id.slice(0, 8)}-${Date.now()}-${nonce}`;
```

Also ensure `gatewayOrderId` has a unique database constraint (add to Prisma schema if absent):
```prisma
model Payment {
  gatewayOrderId String @unique
}
```

---

### Finding 8 — Medium: Missing env-var startup validation for `JWT_SECRET`

**File:line:** `apps/api/src/auth/strategies/jwt.strategy.ts:17`

**Description:**
```ts
secretOrKey: process.env.JWT_SECRET!,
```

The non-null assertion (`!`) suppresses TypeScript's type error but does not enforce the value at runtime. If `JWT_SECRET` is absent, `secretOrKey` will be `undefined`. Depending on the version of `passport-jwt`, this either silently accepts all tokens (because HMAC with an undefined key may not throw during verification) or crashes at runtime on the first authenticated request — both are bad outcomes.

**Fix:** Validate required secrets at bootstrap time. Add a startup check in `main.ts` or use a NestJS `ConfigService` with `validationSchema`:

```ts
// In main.ts, before NestFactory.create:
const REQUIRED_ENV = ['JWT_SECRET', 'MOMO_SECRET_KEY', 'ZALOPAY_KEY2', 'SEPAY_WEBHOOK_SECRET'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`FATAL: environment variable ${key} is not set`);
    process.exit(1);
  }
}
```

Or use `Joi` with NestJS `ConfigModule`:
```ts
ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: Joi.object({
    JWT_SECRET: Joi.string().min(32).required(),
    MOMO_SECRET_KEY: Joi.string().required(),
    ZALOPAY_KEY2: Joi.string().required(),
    SEPAY_WEBHOOK_SECRET: Joi.string().min(32).required(),
  }),
}),
```

---

### Finding 9 — Medium: `CORS_ORIGIN` defaults to wildcard `'*'`

**File:line:** `apps/api/src/main.ts:22`

**Description:**
```ts
origin: process.env.CORS_ORIGIN ?? '*',
```

If `CORS_ORIGIN` is not set in the deployment environment (a common misconfiguration), the API accepts requests from any origin. Combined with `credentials: true`, this is a severe CORS misconfiguration: browsers will include cookies/credentials for cross-origin requests from any domain.

Note: `credentials: true` with `origin: '*'` is actually rejected by browsers per the CORS spec (they require an explicit origin, not `*`), but it means the `credentials` flag is misleading and the configuration will silently fail in ways that are hard to debug.

**Fix:** Remove the `'*'` fallback; fail fast at startup if `CORS_ORIGIN` is not set:

```ts
const corsOrigin = process.env.CORS_ORIGIN;
if (!corsOrigin) {
  throw new Error('CORS_ORIGIN environment variable must be set');
}
app.enableCors({ origin: corsOrigin, credentials: true });
```

Or allow a comma-separated list for multi-origin support:
```ts
const allowedOrigins = (process.env.CORS_ORIGIN ?? '').split(',').map(s => s.trim()).filter(Boolean);
app.enableCors({ origin: allowedOrigins, credentials: true });
```

---

### Finding 10 — Low: No JWT revocation mechanism; DB lookup on every request

**File:line:** `apps/api/src/auth/strategies/jwt.strategy.ts:22-28`

**Description:**
The JWT strategy does a `prisma.user.findUnique` on every authenticated request to verify the user still exists. While this pattern provides de facto revocation (deleted users lose access immediately), it also means:
- Every API call generates a DB query regardless of caching
- There is no explicit token revocation (e.g., logout invalidation, refresh-token rotation, `jti` blocklist)
- A compromised JWT remains valid until the user row is deleted

This is a low-severity architectural concern rather than an immediate vulnerability.

**Fix (recommended):** Implement a token revocation blocklist using Redis (already present in the stack via BullModule):

```ts
// On logout, store the jti in Redis with TTL equal to the remaining token lifetime
await this.redis.set(`revoked:${payload.jti}`, '1', 'EX', remainingTtlSeconds);

// In JwtStrategy.validate(), check the blocklist before the DB lookup
const revoked = await this.redis.get(`revoked:${payload.jti}`);
if (revoked) throw new UnauthorizedException();
```

---

### Finding 11 — Low: ZaloPay MAC failure returns HTTP 200

**File:line:** `apps/api/src/webhooks/webhooks.controller.ts:49-51`

**Description:**
```ts
if (mac !== expectedMac) {
  this.logger.warn('ZaloPay webhook MAC mismatch');
  return { return_code: -1, return_message: 'mac not equal' };
}
```

Returning HTTP 200 on a MAC failure is required by ZaloPay's webhook contract (their docs say to return `return_code: -1` on error). However, this means infrastructure-level alerting tools (Datadog, Sentry, etc.) that key on HTTP 4xx/5xx will not fire on authentication failures. An attacker probing the endpoint will also receive a clean 200, making the failure indistinguishable from a successful probe at the network level.

**Fix:** This behaviour is dictated by the ZaloPay API contract, so the HTTP status code cannot be changed. However, the log level should be `error` (not `warn`) and a metric/alert should be emitted for MAC failures exceeding a threshold. Add a counter:

```ts
this.logger.error(`ZaloPay MAC mismatch — possible replay/forgery attempt`);
// Emit a custom metric or throw to Sentry here
```

---

## Items Verified as Correctly Implemented

- **Authorization on payment initiation (`payments.service.ts:23`):** The `initiate()` method correctly verifies `invoice.tenantId === tenantId` before proceeding, preventing one tenant from initiating payment on another tenant's invoice. ✅

- **Amount sourced from DB (`payments.service.ts:35-40`):** `invoice.totalAmount` from the database is used for all gateway order creation calls. The `CreatePaymentDto` does not accept an `amount` field — the DTO only takes `invoiceId` and `method`. Amount tampering via the API payload is not possible. ✅

- **Already-paid invoice guard (`payments.service.ts:24-26`):** Attempting to initiate payment on an already-paid invoice throws a `BadRequestException`. ✅

- **Secret keys from environment variables (`payments.service.ts:106,131,155`):** All gateway credentials (`MOMO_SECRET_KEY`, `ZALOPAY_KEY1`, `ZALOPAY_KEY2`, `SEPAY_WEBHOOK_SECRET`, etc.) are read from `process.env` and are not hardcoded. The `.env` file is listed in `.gitignore` and is not tracked by git. ✅

- **JWT expiration enforced (`jwt.strategy.ts:18`):** `ignoreExpiration: false` is set explicitly. ✅

- **Global exception filter (`all-exceptions.filter.ts`):** The filter maps Prisma and HTTP exceptions to sanitized responses. 500-class errors are logged server-side with stack traces but the client receives only `'Đã xảy ra lỗi hệ thống'`. ✅

- **Input validation (`main.ts:13-18`):** `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` strips unknown fields from all request bodies, preventing mass-assignment on DTOs. ✅

- **MoMo signature construction (`payments.service.ts:108`):** The outbound HMAC signature is constructed over the correct canonical string as specified by MoMo's v2 API documentation. ✅

- **ZaloPay uses `KEY2` for webhook validation (`webhooks.controller.ts:45`):** ZaloPay requires `KEY1` for order creation and `KEY2` for callback MAC verification. The implementation correctly uses `ZALOPAY_KEY1` in `createZaloPayOrder` and `ZALOPAY_KEY2` in `zalopayCallback`. ✅

- **Idempotency guard present (`payments.service.ts:76`):** A status check (`payment.status !== PaymentStatus.cho_xu_ly`) prevents re-processing completed or failed payments. The race condition (Finding 5) is a robustness concern, not a complete absence of protection. ✅

---

## Priority Fix Order

1. **Finding 2** (Critical) — SePay amount not validated; fix immediately before production deployment
2. **Findings 1 & 4** (Critical/High) — Replace all string comparisons with `timingSafeEqual`
3. **Finding 5** (High) — Replace read-then-write with atomic `updateMany` CAS
4. **Finding 3** (High) — Register `ThrottlerGuard` as global guard
5. **Finding 6** (High) — Sanitize gateway error messages before returning to client
6. **Findings 7, 8, 9** (Medium) — Harden orderId generation, add startup env validation, fix CORS default
7. **Findings 10, 11** (Low) — JWT revocation and ZaloPay alerting improvements
