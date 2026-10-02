# Project State

> Live status file. The agent updates this at the end of every task. Keep it short and factual.

**Phase:** 0 (Foundations)  **Subphase:** next is 0.2 (Test toolkit)  **Last updated:** 2026-10-02

> 2026-10-02: ROADMAP.md rewritten as v3.0 (phases → subphases with step-by-step instructions) and COMPLETION.md added.
> Subphase 0.1 (Tooling, settings and CI repair) completed and verified on PostgreSQL 16.

## Done
- **Master Unified Roadmap & Design Hub:** `ROADMAP.md` and `design/` catalog.
- **Tooling, Settings & CI Repair (Subphase 0.1):**
  - Python 3.12 with `backend/.python-version` and `uv` virtual environment.
  - Upgraded dependencies: Django 5.2 LTS, psycopg2-binary, split runtime & dev requirements (`requirements.txt`, `requirements-dev.txt`).
  - Settings: Single database URL (`dj-database-url`), PostgreSQL test settings (`config.settings.test`), Whitenoise, hardened prod settings with Sentry.
  - CORS: Configured origins including `https://localhost` (Android WebView) and allowed headers (`x-shop-id`, `idempotency-key`, `if-match`, etc.).
  - Frontend: Upgraded to Next.js 14.2.35, Capacitor 8.5.2 (`@capacitor/core`, `@capacitor/android`, `@capacitor/haptics`, `@capacitor/share`), `packageManager: pnpm@11.26.0`, Node engines >= 22.
  - CI: GitHub Actions workflow with PostgreSQL 16 service, ruff, migration dry-run, deploy check, pytest, pip-audit, and frontend lint/typecheck/test/build.
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
- (none - Subphase 0.1 complete)

## Next
1. ROADMAP 0.2: Test toolkit (fixtures, factories, isolation helper).
2. ROADMAP 0.3–0.7: Core models, API contract, idempotency, auth hardening, tenancy repair.
3. ROADMAP 0.8: Redo hardware spikes on real devices.
Track progress in COMPLETION.md.

## Blocked / waiting on
- DLT registration (external approval for commercial SMS in India)

## Known issues
- Any shop member (even Engineer) can edit or **hard-delete** their shop via `/api/v1/shops/{id}/` (fix: 0.3, 0.7).
- Front Desk can suspend or delete the Owner's membership; `POST /staff/` returns 201 without saving (fix: 0.7).
- OTP codes are printed/logged in all environments; weak OTP hashing; attempt counter has no row lock; fixed test OTP active whenever DEBUG (fix: 0.6).
- Users can deactivate themselves via `PATCH /auth/me/`; no logout / logout-all; refresh reuse detection not implemented (fix: 0.6).
- No API envelope, error handler, idempotency, If-Match or throttling (fix: 0.4, 0.5).
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
