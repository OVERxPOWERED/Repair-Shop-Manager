# Project State

> Live status file. The agent updates this at the end of every task. Keep it short and factual.

**Phase:** 0 (Foundations)  **Week:** 2 (Completed) → 3 (Next)  **Last updated:** 2026-10-02

## Done
- **Master Unified Roadmap & Design Hub:** `ROADMAP.md` and `design/` catalog.
- **Backend Foundations (Week 1):** Django 5, DRF, split settings, `core` app with UUID/soft-delete base models, `/api/v1/health/`.
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
  - 18 backend tests passing with pytest (verifying Shop A cannot access Shop B, missing header rejection, role permission enforcement, and suspended user lockout).
- **Hardware Risk Reduction Spikes (Week 2):**
  - **Spike A (Thermal Printing):** 1-bit monochrome canvas bitmap rasterizer pipeline (`ESC/POS GS v 0`) in `frontend/src/lib/printer/rasterizer.ts` for crisp bilingual Hindi/English printing without printer ROM chips. Documented in `docs/printers.md`.
  - **Spike B (IMEI Scanning & Luhn Algorithm):** Mathematical 15-digit Luhn check-digit verification in backend (`apps.core.validators`) and frontend (`frontend/src/lib/validation/imei.ts`) with Vitest tests passing 5/5. Documented in `docs/decisions.md`.

## In progress
- (none - Week 2 deliverables complete and verified)

## Next
1. Week 3: Frontend App Shell, i18n & Onboarding Wizard (Splash screen, phone OTP login screen with in-app numeric keypad, shop onboarding wizard, and triple locale with `next-intl`).
2. Week 3: Secure token storage integration (Capacitor secure storage with web fallback).
3. Week 3: Indian currency and number formatters.

## Blocked / waiting on
- DLT registration (external approval for commercial SMS in India)

## Known issues
- (none)

## Lessons / notes
- SimpleJWT `token_blacklist` requires Django migrations to be applied before token rotation works.
- Sub-₹3,000 thermal printers in India lack Devanagari ROMs; 1-bit monochrome bitmap rasterization via canvas completely circumvents this limitation.
- IMEI OCR must always be paired with Luhn check-digit validation and a manual visual confirmation dialog.

## Verification log
| Date | Command | Result |
|---|---|---|
| 2026-10-02 | `backend/.venv/bin/ruff check backend/` | All checks passed! (0 errors) |
| 2026-10-02 | `backend/.venv/bin/ruff format --check backend/` | 39 files already formatted |
| 2026-10-02 | `backend/.venv/bin/pytest backend/` | 18 passed in 0.89s (0 warnings) |
| 2026-10-02 | `pnpm --dir frontend typecheck` | Passed with zero errors (`tsc --noEmit`) |
| 2026-10-02 | `pnpm --dir frontend lint` | No ESLint warnings or errors |
| 2026-10-02 | `pnpm --dir frontend test` | Vitest passed 5/5 tests in 1.16s |
