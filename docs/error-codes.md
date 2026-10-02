# API error codes

Every `error.code` the API can return. The client maps each to `errors.<code>` in the locale files.
Add a row in the same commit that introduces a code (ROADMAP Recipe R8).

| Code | HTTP | Meaning |
|---|---|---|
| validation.failed | 400 | Field validation failed; see `fields` |
| request.malformed | 400 | Body is not valid JSON |
| auth.not_authenticated | 401 | No token sent |
| auth.token_invalid | 401 | Token invalid, expired or revoked; client refreshes once, then signs out |
| permission.denied | 403 | Authenticated but missing a permission |
| not_found | 404 | Object missing or belongs to another shop |
| shop.header_missing | 400 | `X-Shop-Id` header missing on a shop-scoped endpoint |
| shop.header_invalid | 400 | `X-Shop-Id` is not a UUID |
| shop.not_found | 404 | Shop missing, deleted, or the user is not an active member |
| request.method_not_allowed | 405 | HTTP method not supported |
| rate.limited | 429 | Throttled; see `Retry-After` |
| idempotency.key_required | 400 | Idempotency-Key header is required on this POST endpoint |
| idempotency.key_invalid | 400 | Idempotency-Key must be a valid UUID |
| idempotency.key_reused | 422 | Idempotency-Key already used for a different request |
| idempotency.in_progress | 409 | The original request with this Idempotency-Key is still processing |
| concurrency.if_match_required | 428 | If-Match header with version loaded is required |
| concurrency.if_match_invalid | 400 | If-Match must be an integer version |
| concurrency.version_mismatch | 409 | Record version changed concurrently; reload and try again |
| otp.cooldown | 429 | Please wait before requesting another OTP; see `Retry-After` |
| otp.too_many_requests | 429 | Hourly OTP limit reached; try again later |
| otp.not_found | 400 | No pending OTP challenge found; request a new one |
| otp.expired | 400 | OTP has expired; request a new one |
| otp.locked | 400 | Too many incorrect attempts; request a new OTP |
| otp.invalid | 400 | Incorrect OTP code; attempts remaining indicated in fields |
| auth.account_disabled | 403 | User account has been deactivated or disabled |
| server.error | 500 | Unexpected; quote `request_id` to support |
