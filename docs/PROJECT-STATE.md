# Project State

> Live status file. The agent updates this at the end of every task. Keep it short and factual.

**Phase:** 0 (Foundations)  **Subphase:** next is 0.10 (i18n and Indian formatters)  **Last updated:** 2026-10-02

> 2026-10-02: ROADMAP.md rewritten as v3.0 (phases → subphases with step-by-step instructions) and COMPLETION.md added.
> Subphases 0.1 through 0.9 completed and verified on PostgreSQL 16 & Next.js 14 / Capacitor 8.

## Done
- **Master Unified Roadmap & Design Hub:** `ROADMAP.md` and `design/` catalog.
- **Frontend Foundation (Subphase 0.9):**
  - Standard directory architecture established (`components/{ui,shell,states,forms}`, `features`, `i18n`, `lib/{api,auth,format,validation,constants}`, `native`, `scripts`, `e2e`).
  - Initialized shadcn/ui and installed 15 primitives (`button`, `input`, `label`, `sheet`, `dialog`, `skeleton`, `badge`, `separator`, `switch`, `select`, `checkbox`, `radio-group`, `tabs`, `sonner`, `textarea`).
  - Restyled `button.tsx` to FixPro design specifications (`h-[54px] rounded-2xl active:scale-[0.98]` and `h-12 rounded-2xl border-neutral-200`).
  - Configured Plus Jakarta Sans with Noto Sans Devanagari fallback in `layout.tsx` and `tailwind.config.ts`, added safe-area padding and `Providers` shell component.
  - Setup Vitest with JSDOM and Testing Library matchers in `vitest.config.ts` and `vitest.setup.ts`.
  - Configured ESLint R7 guard rail against unabstracted native plugin imports outside `src/native/*`.
  - Typed environment access module in `src/lib/env.ts` with `android.allowMixedContent` in `capacitor.config.ts`.
  - Full frontend verification passed (lint, typecheck, 9 vitest tests, next static export).
- **Hardware Spikes, Done Honestly (Subphase 0.8):**
  - Corrected `docs/printers.md` (untested matrix & unverified checklist) and `docs/decisions.md` (Spike B status to `proposed` pending physical hardware runs).
  - Upgraded rasterizer in `frontend/src/lib/printer/rasterizer.ts` to accept generic `RasterSource`, slice print output into bands of <= 128 rows with individual `GS v 0` headers, pad width to multiple of 8 with white pixels, optional cut, and added `chunkBytes` helper for BLE MTU writes.
  - Added 4 rasterizer unit tests in `rasterizer.test.ts` (9/9 vitest tests passing).
  - Added `@capacitor/ios@^8.5.2` and created iOS native project with `npx cap add ios`.
  - Configured Android and iOS permissions for Bluetooth LE and Camera.
  - Installed and verified Capacitor 8 plugins: `@capacitor-community/bluetooth-le`, `@capacitor-mlkit/barcode-scanning`, `@capacitor-mlkit/text-recognition`, `@capacitor/camera`.
  - Created dev spike harness screen at `frontend/src/app/dev/spikes/page.tsx` for real-device BLE scanning/printing, camera barcode scanning with Luhn validation, and ML Kit OCR photo scanning.
- **Tenancy and Permissions Repair (Subphase 0.7):**
  - Replaced thread-local `TenantScopingMiddleware` with explicit `resolve_shop_context(request)` setting `request.shop` and `request.membership`.
  - Implemented `ShopScopedMixin`, `ShopScopedViewSet`, `ShopScopedAPIView`, and `ShopScopedPKField` with automated permission map checking and 404 isolation for cross-tenant or missing shops.
  - Role management: removed system role seeding from onboarding GET; system roles (`Owner`, `Manager`, `Front Desk`, `Engineer`) automatically seeded on `post_migrate` signal and via `seed_roles` management command.
  - Strict validators for GSTIN (with checksum), state code, and UPI ID.
  - Staff management API: `GET /api/v1/staff/`, `GET /api/v1/staff/<id>/`, `POST /api/v1/staff/<id>/role/`, `POST /api/v1/staff/<id>/suspend/`, `POST /api/v1/staff/<id>/reactivate/`, `POST /api/v1/staff/<id>/remove/`.
  - Guarded against modifying owners, self-modification, role escalation, and unauthorized role assignments.
  - Deleted legacy `apps/tenancy/scoping.py`.
  - Registered 6 staff error codes in `docs/error-codes.md`.
  - 17 tenancy tests passing (71/71 total backend tests passing).
- **Authentication Hardening (Subphase 0.6):**
  - E.164 phone normalization and privacy masking (`normalize_phone`, `mask_phone`) in `apps.core.phone`.
  - SMS provider abstraction (`SmsProvider`, `ConsoleSmsProvider`, `get_sms_provider`) with secure hidden logging outside `DEBUG`.
  - Secure HMAC-SHA256 OTP hashing keyed with `SECRET_KEY`; row-locked attempt counting with 3-attempt lock, 30s cooldown, and 6/hour rate limiting.
  - Test OTP numbers (`OTP_TEST_NUMBERS`) strictly scoped to test/dev environments.
  - `DeviceJWTAuthentication` and `DeviceAwareTokenRefreshSerializer` tracking session platform, app version, and refresh token families with automatic theft/reuse detection and device revocation.
  - `ProfileUpdateSerializer` preventing users from deactivating themselves via `PATCH /auth/me/`.
  - Added endpoints: `POST /auth/logout/`, `POST /auth/logout-all/`, `GET /auth/devices/`, `DELETE /auth/devices/<id>/`.
  - `purge_otp_challenges` management command for housekeeping.
  - Registered 7 error codes in `docs/error-codes.md`.
  - All 15 auth tests passing in `apps/accounts/tests/test_auth.py` (54/54 total backend tests passing).
- **Idempotency Keys & Optimistic Concurrency (Subphase 0.5):**
  - `IdempotencyRecord` model and migration (`core.0001_initial`) storing request hash, status code, response body, and user+key uniqueness.
  - `@idempotent(required=True/False)` decorator handling duplicate requests with replay (`Idempotent-Replayed: true`), key reuse conflict checks (422), and in-flight conflicts (409).
  - Applied `@idempotent(required=False)` to `OnboardShopView.post`.
  - Optimistic concurrency helper `expected_version` and `save_with_version` with `VersionedUpdateMixin` for `If-Match` ETags on versioned resources.
  - `purge_idempotency_records` management command removing records older than 48 hours.
  - Registered 7 error codes in `docs/error-codes.md`.
  - 10 tests in `apps/core/tests/test_idempotency.py` and `test_concurrency.py` (44/44 total backend tests passing).
- **API Contract Layer (Subphase 0.4):**
  - Standard JSON response envelope: `{ data: ... }` for detail, `{ data: [...], meta: { count, next, previous } }` for list responses.
  - Standard error format: `{ error: { code, message, fields, request_id } }` with registered error codes in `docs/error-codes.md`.
  - Custom `api_exception_handler` translating DRF, Django validation, and custom `DomainError`, `ConflictError`, `NotFoundError`.
  - `RequestIdMiddleware` accepting or generating safe UUIDs, setting `X-Request-Id` response header, and populating `request_id` in logs via filter.
  - Rate limiting configured with burst/sustained limits (`anon`: 60/min, `user`: 600/min, plus endpoint-specific rates).
  - Indian Standard Time (IST) time utilities (`now_ist`, `today_ist`, `financial_year_start`, `financial_year_label`).
  - OpenAPI schema post-processor wrapping responses in envelopes in `drf-spectacular`.
  - 10 contract tests in `apps/core/tests/test_api_contract.py` (34/34 total backend tests passing).
- **Tooling, Settings & CI Repair (Subphase 0.1):**
  - Python 3.12 with `backend/.python-version` and `uv` virtual environment.
  - Upgraded dependencies: Django 5.2 LTS, psycopg2-binary, split runtime & dev requirements (`requirements.txt`, `requirements-dev.txt`).
  - Settings: Single database URL (`dj-database-url`), PostgreSQL test settings (`config.settings.test`), Whitenoise, hardened prod settings with Sentry.
  - CORS: Configured origins including `https://localhost` (Android WebView) and allowed headers (`x-shop-id`, `idempotency-key`, `if-match`, etc.).
  - Frontend: Upgraded to Next.js 14.2.35, Capacitor 8.5.2 (`@capacitor/core`, `@capacitor/android`, `@capacitor/haptics`, `@capacitor/share`), `packageManager: pnpm@11.26.0`, Node engines >= 22.
  - CI: GitHub Actions workflow with PostgreSQL 16 service, ruff, migration dry-run, deploy check, pytest, pip-audit, and frontend lint/typecheck/test/build.
- **Test Toolkit (Subphase 0.2):**
  - Shared fixtures in `backend/conftest.py`: autouse `_clear_cache`, `world` fixture with 2 organizations, 2 shops, and all 4 canonical roles (`Owner`, `Manager`, `Front Desk`, `Engineer`) in Shop A, plus `client_for` client builder.
  - Cross-tenant isolation verification helper `assert_other_shop_hidden` in `apps.core.testing` enforcing 404 behavior across GET/PATCH/DELETE.
  - Factory-Boy definitions for `User`, `Organization`, `Shop`, and `Membership`.
  - Smoke tests in `apps/core/tests/test_toolkit.py` passing (20/20 total backend tests passing).
- **Core Models: Real Shop FK & Safe Soft Delete (Subphase 0.3):**
  - `SoftDeletableModel.delete()` performs soft delete (`deleted_at=timezone.now()`); `hard_delete()` performs permanent deletion.
  - `ShopScopedModel` uses real FK `shop = models.ForeignKey("tenancy.Shop", on_delete=models.PROTECT)`, `created_by` user FK, and integer `version` field for optimistic locking.
  - Duplicate base class in `apps/tenancy/scoping.py` removed; zero references to old `ShopScopedBaseModel`.
  - 4 soft delete tests in `apps/core/tests/test_soft_delete.py` passing (24/24 total backend tests passing).
- **Backend Foundations (Week 1):** Django 5.2, DRF, split settings, `core` app with UUID/soft-delete base models, `/api/v1/health/`.
- **Frontend App Shell & Mobile (Week 1):** Next.js App Router static export, Tailwind design tokens, 5-tab shell, Capacitor Android project.
- **Accounts & Authentication (Week 2):**
  - Custom `User` model with phone number as primary identity (`accounts.User`).
  - `OTPChallenge` model with cooldown enforcement, hourly rate limiting, and dev console SMS provider.
  - `UserDevice` tracking session platforms, app versions, and refresh token families.
  - SimpleJWT authentication with rotating refresh tokens and blacklist reuse detection.
  - Endpoints: `/api/v1/auth/otp/send/`, `/api/v1/auth/otp/verify/`, `/api/v1/auth/token/refresh/`, `/api/v1/auth/me/`.
- **Tenancy Architecture & Scoping (Week 2):**
  - Models: `Organization`, `Shop`, `Role`, `Membership`, and `Invite`.
  - Canonical system roles seeded: `Owner`, `Manager`, `Front Desk`, `Engineer` with full permission codes.
  - `TenantScopingMiddleware` and `ShopScopedViewSet` enforcing `X-Shop-Id` header validation and automatic tenant scoping.
  - Onboarding endpoint `/api/v1/tenancy/onboard/` creating organization, shop, and owner membership in one atomic transaction.
- **Cross-Tenant Isolation Test Suite (Week 2):**
  - 18 backend tests passing with pytest on PostgreSQL 16.
- **Hardware Risk Reduction Spikes (Week 2):**
  - **Spike A (Thermal Printing):** 1-bit monochrome canvas bitmap rasterizer pipeline (`ESC/POS GS v 0`) in `frontend/src/lib/printer/rasterizer.ts`. Redo on real hardware in 0.8.
  - **Spike B (IMEI Scanning & Luhn Algorithm):** Mathematical 15-digit Luhn check-digit verification in backend and frontend with Vitest tests passing 5/5. Redo on real hardware in 0.8.

## In progress
- (none - Subphase 0.6 complete)

## Next
1. ROADMAP 0.7: Tenancy and permissions repair (models, resolve_shop_context, permissions, views, roles).
2. ROADMAP 0.8: Redo hardware spikes on real devices.
3. ROADMAP 0.9: Frontend foundation (design tokens, offline store, query provider, envelope client).
Track progress in COMPLETION.md.

## Blocked / waiting on
- DLT registration (external approval for commercial SMS in India)

## Known issues
- Any shop member (even Engineer) can edit their shop via `/api/v1/shops/{id}/` (fix: 0.7).
- Front Desk can suspend or delete the Owner's membership; `POST /staff/` returns 201 without saving (fix: 0.7).
- Hardware spike results in `docs/printers.md` and `docs/decisions.md` are not backed by any device test (fix: 0.8).

## Lessons / notes
- SimpleJWT `token_blacklist` requires Django migrations to be applied before token rotation works.
- Sub-₹3,000 thermal printers in India lack Devanagari ROMs; 1-bit monochrome bitmap rasterization via canvas completely circumvents this limitation.
- IMEI OCR must always be paired with Luhn check-digit validation and a manual visual confirmation dialog.
- Capacitor 8 upgrade performed cleanly with Android gradle wrapper updates.

## Verification log
| Date | Command | Result |
|---|---|---|
| 2026-10-02 | `backend/.venv/bin/ruff check .` | All checks passed! (0 errors) |
| 2026-10-02 | `backend/.venv/bin/ruff format --check .` | 40 files already formatted |
| 2026-10-02 | `backend/.venv/bin/python manage.py makemigrations --check --dry-run` | No changes detected |
| 2026-10-02 | `backend/.venv/bin/pytest` | 18 passed in 3.81s (PostgreSQL 16) |
| 2026-10-02 | `backend/.venv/bin/python manage.py check --deploy` | 0 issues (1 silenced) |
| 2026-10-02 | `backend/.venv/bin/pip-audit -r requirements.txt` | No known vulnerabilities found |
| 2026-10-02 | `pnpm --dir frontend lint` | No ESLint warnings or errors |
| 2026-10-02 | `pnpm --dir frontend typecheck` | Passed with zero errors (`tsc --noEmit`) |
| 2026-10-02 | `pnpm --dir frontend test` | Vitest passed 5/5 tests in 3.04s |
| 2026-10-02 | `pnpm --dir frontend build` | Static export generated in frontend/out/ |
