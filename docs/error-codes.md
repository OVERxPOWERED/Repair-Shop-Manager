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
| server.error | 500 | Unexpected; quote `request_id` to support |
