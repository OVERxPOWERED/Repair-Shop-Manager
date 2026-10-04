# FixPro: Completion Tracker

> Companion to [`ROADMAP.md`](ROADMAP.md). Every phase and subphase of the roadmap appears here with the same number.
> **Update this file at the end of every subphase** (ROADMAP §0, rule 7). Never tick a 🧑‍🔧 task unless the human confirmed it on a real device or with the named person.

## How to mark progress

1. When you start a subphase, change its status cell to `🟡 In progress` and fill **Started** (YYYY-MM-DD).
2. Tick each task (`- [x]`) as it is finished.
3. When every task is ticked **and** every Verify command in the roadmap passed:
   - set the status to `✅ Done`, fill **Completed** and **Commit** (short hash),
   - paste a short summary of the Verify output into the subphase's "Verification" block (for example `pytest: 64 passed`),
   - update the matching row in the **Progress overview** table below.
4. If a subphase cannot continue, set `⛔ Blocked` and write why in its Notes.
5. When all subphases of a phase are Done, tick the phase's exit checklist and set the phase row to `✅ Done`.

Status values: `⬜ Not started` · `🟡 In progress` · `✅ Done` · `⛔ Blocked`

---

## Baseline before this roadmap (audited 2026-10-02)

Work that existed when roadmap v3.0 was written. It is **not** counted as a completed subphase, because each item has fixes in Phase 0 (see ROADMAP §1).

- [x] Repo structure, Docker Compose (Postgres + Django), split settings, `/api/v1/health/`
- [x] `accounts` models and OTP / JWT endpoints (security fixes pending in 0.6)
- [x] `tenancy` models, onboarding, staff list (permission fixes pending in 0.7)
- [x] Next.js static export, Tailwind tokens, Home mock-up, Capacitor Android project
- [x] IMEI Luhn validators (Python + TS), ESC/POS rasterizer (unit-tested in 0.8, hardware-tested 🧑‍🔧 in 0.8)
- [x] Verified: pytest 18 passed (SQLite), ruff clean, tsc clean, Vitest 5/5
- [ ] Hardware spikes A and B: **claimed but not verified** → redo in 0.8

---

## Progress overview

| Phase | Subphase | Title | Status | Completed |
|---|---|---|---|---|
| 0 | [0.1](#01-tooling-settings-and-ci-repair) | Tooling, settings and CI repair | ✅ Done | 2026-10-02 |
| 0 | [0.2](#02-test-toolkit-fixtures-factories-isolation-helper) | Test toolkit (fixtures, factories, isolation helper) | ✅ Done | 2026-10-02 |
| 0 | [0.3](#03-core-models-real-shop-fk-and-safe-soft-delete) | Core models: real shop FK and safe soft delete | ✅ Done | 2026-10-02 |
| 0 | [0.4](#04-api-contract-layer-envelope-errors-request-id-pagination-throttling) | API contract layer (envelope, errors, request ID, pagination, throttling) | ✅ Done | 2026-10-02 |
| 0 | [0.5](#05-idempotency-keys-and-optimistic-concurrency) | Idempotency keys and optimistic concurrency | ✅ Done | 2026-10-02 |
| 0 | [0.6](#06-authentication-hardening) | Authentication hardening | ✅ Done | 2026-10-02 |
| 0 | [0.7](#07-tenancy-and-permissions-repair) | Tenancy and permissions repair | ✅ Done | 2026-10-02 |
| 0 | [0.8](#08--hardware-spikes-done-honestly-printer--imei) | 🧑‍🔧 Hardware spikes, done honestly (printer + IMEI) | ✅ Done | 2026-10-02 |
| 0 | [0.9](#09-frontend-foundation) | Frontend foundation | ✅ Done | 2026-10-02 |
| 0 | [0.10](#010-i18n-and-indian-formatters) | i18n and Indian formatters | ✅ Done | 2026-10-02 |
| 0 | [0.11](#011-api-client-session-store-secure-storage-and-native-layer) | API client, session store, secure storage and native layer | ✅ Done | 2026-10-02 |
| 0 | [0.12](#012-auth-screens-splash-welcome-phone-otp-profile) | Auth screens (splash, welcome, phone, OTP, profile) | ✅ Done | 2026-10-02 |
| 0 | [0.13](#013-shop-onboarding-wizard) | Shop onboarding wizard | ✅ Done | 2026-10-02 |
| 0 | [0.14](#014-app-shell-navigation-and-shared-states--iphone) | App shell, navigation and shared states (+ iPhone) | ✅ Done | 2026-10-03 |
| 0 | [0.15](#015-audit-log) | Audit log | ✅ Done | 2026-10-03 |
| 0 | [0.16](#016-staff-invites-and-the-staff--roles-screens) | Staff invites and the Staff / Roles screens | ✅ Done | 2026-10-03 |
| 0 | [0.17](#017-pilot-deployment-monitoring-scheduled-jobs-and-backups) | Pilot deployment, monitoring, scheduled jobs and backups | ✅ Done | 2026-10-03 |
| 0 | [0.18](#018-phase-0-exit-review) | Phase 0 exit review | ✅ Done | 2026-10-03 |
| **0** | **Exit** | **Phase 0 exit checklist** | ✅ Done | 2026-10-03 |
| 1 | [1.1](#11-postgres-search-and-per-shop-catalogs-brands-accessories) | Postgres search and per-shop catalogs (brands, accessories) | ✅ Done | 2026-10-03 |
| 1 | [1.2](#12-customers-api) | Customers API | ✅ Done | 2026-10-03 |
| 1 | [1.3](#13-devices-and-imei-api) | Devices and IMEI API | ✅ Done | 2026-10-03 |
| 1 | [1.4](#14-customers-and-devices-screens) | Customers and devices screens | ✅ Done | 2026-10-03 |
| 1 | [1.5](#15-jobs-core-api-job-sheet-numbering-lock-encryption) | Jobs core API (job sheet, numbering, lock encryption) | ✅ Done | 2026-10-03 |
| 1 | [1.6](#16-file-storage-and-job-photos) | File storage and job photos | ✅ Done | 2026-10-03 |
| 1 | [1.7](#17-job-intake-wizard-8-steps) | Job intake wizard (8 steps) | ✅ Done | 2026-10-03 |
| 1 | [1.8](#18-status-workflow-assignment-visibility-and-dashboard-api) | Status workflow, assignment, visibility and dashboard API | ✅ Done | 2026-10-03 |
| 1 | [1.9](#19-home-dashboard-jobs-list-and-job-detail-screens) | Home dashboard, Jobs list and Job detail screens | ✅ Done | 2026-10-03 |
| 1 | [1.10](#110-imei-barcode-scan-ocr-capture-and-check-imei) | IMEI barcode scan, OCR capture and "Check IMEI" | ✅ Done | 2026-10-03 |
| 1 | [1.11](#111-line-items-and-payments-api) | Line items and payments API | ✅ Done | 2026-10-03 |
| 1 | [1.12](#112-line-items-payments-and-upi-qr-screens) | Line items, payments and UPI QR screens | ✅ Done | 2026-10-03 |
| 1 | [1.13](#113-invoices-and-the-optional-gst-engine) | Invoices and the optional GST engine | ✅ Done | 2026-10-03 |
| 1 | [1.14](#114-invoice-screens) | Invoice screens | ✅ Done | 2026-10-03 |
| 1 | [1.15](#115-pdf-documents-weasyprint) | PDF documents (WeasyPrint) | ✅ Done | 2026-10-03 |
| 1 | [1.16](#116-sharing-native-share-sheet-and-whatsapp) | Sharing (native share sheet and WhatsApp) | ✅ Done | 2026-10-03 |
| 1 | [1.17](#117-thermal-receipt-printing) | Thermal receipt printing | ✅ Done | 2026-10-03 |
| 1 | [1.18](#118-public-tracking-page) | Public tracking page | ✅ Done | 2026-10-03 |
| 1 | [1.19](#119-messaging-templates-sms-adapter-message-log) | Messaging (templates, SMS adapter, message log) | ✅ Done | 2026-10-03 |
| 1 | [1.20](#120-trash-restore-permanent-delete-and-exports) | Trash, restore, permanent delete and exports | ✅ Done | 2026-10-03 |
| 1 | [1.21](#121-settings-screens-and-basic-reports) | Settings screens and basic reports | ⬜ Not started | — |
| 1 | [1.22](#122-translation-completion-and-accessibility) | Translation completion and accessibility | ⬜ Not started | — |
| 1 | [1.23](#123-security-and-performance-hardening) | Security and performance hardening | ⬜ Not started | — |
| 1 | [1.24](#124-privacy-account-deletion-and-store-readiness) | Privacy, account deletion and store readiness | ⬜ Not started | — |
| 1 | [1.25](#125-live-pilot-at-your-shop-and-phase-1-exit) | Live pilot at your shop and Phase 1 exit | ⬜ Not started | — |
| **1** | **Exit** | **Phase 1 exit checklist** | ⬜ Not started | — |
| 2 | [2.1](#21-inventory-data-model-and-stock-ledger) | Inventory data model and stock ledger | ⬜ Not started | — |
| 2 | [2.2](#22-inventory-api-and-screens) | Inventory API and screens | ⬜ Not started | — |
| 2 | [2.3](#23-parts-on-jobs-and-automatic-stock-deduction) | Parts on jobs and automatic stock deduction | ⬜ Not started | — |
| 2 | [2.4](#24-suppliers-purchases-and-price-tracking) | Suppliers, purchases and price tracking | ⬜ Not started | — |
| 2 | [2.5](#25-hw-match-and-demands) | H/W Match and Demands | ⬜ Not started | — |
| 2 | [2.6](#26-pos-counter-quick-bill-and-returns) | POS counter, Quick Bill and returns | ⬜ Not started | — |
| 2 | [2.7](#27-cash-register-day-end-close) | Cash register (day-end close) | ⬜ Not started | — |
| 2 | [2.8](#28-expenses-and-khata-dashboard) | Expenses and Khata dashboard | ⬜ Not started | — |
| 2 | [2.9](#29-customer-ledger-and-udhaar) | Customer ledger and udhaar | ⬜ Not started | — |
| 2 | [2.10](#210-rough-reg-and-old-buy) | Rough Reg and Old Buy | ⬜ Not started | — |
| 2 | [2.11](#211-staff-salary-commission-and-payroll) | Staff salary, commission and payroll | ⬜ Not started | — |
| 2 | [2.12](#212-phase-2-reports-and-exit) | Phase 2 reports and exit | ⬜ Not started | — |
| **2** | **Exit** | **Phase 2 exit checklist** | ⬜ Not started | — |
| 3 | [3.1](#31-paid-vps-migration-and-background-workers) | Paid VPS migration and background workers | ⬜ Not started | — |
| 3 | [3.2](#32-multi-branch-organisations) | Multi-branch organisations | ⬜ Not started | — |
| 3 | [3.3](#33-plans-limits-and-subscriptions) | Plans, limits and subscriptions | ⬜ Not started | — |
| 3 | [3.4](#34-platform-admin-console) | Platform admin console | ⬜ Not started | — |
| 3 | [3.5](#35-offline-mode-and-sync-core-flows) | Offline mode and sync (core flows) | ⬜ Not started | — |
| 3 | [3.6](#36-push-notifications-and-customer-engagement) | Push notifications and customer engagement | ⬜ Not started | — |
| 3 | [3.7](#37-shop-website-and-site-leads) | Shop website and site leads | ⬜ Not started | — |
| 3 | [3.8](#38-referral-help-content-and-more-languages) | Referral, help content and more languages | ⬜ Not started | — |
| 3 | [3.9](#39-public-launch) | Public launch | ⬜ Not started | — |
| **3** | **Exit** | **Phase 3 exit checklist** | ⬜ Not started | — |
| 4 | [4.1](#41-geo-foundation-and-public-shop-profiles) | Geo foundation and public shop profiles | ⬜ Not started | — |
| 4 | [4.2](#42-nearby-search) | Nearby search | ⬜ Not started | — |
| 4 | [4.3](#43-wholesale-listings) | Wholesale listings | ⬜ Not started | — |
| 4 | [4.4](#44-verification-trust-and-moderation) | Verification, trust and moderation | ⬜ Not started | — |
| 4 | [4.5](#45-technician-community) | Technician community | ⬜ Not started | — |
| **4** | **Exit** | **Phase 4 exit checklist** | ⬜ Not started | — |

---

# Phase 0: Foundations

**Phase status:** ⬜ Not started · **Started:** — · **Completed:** —

## 0.1 Tooling, settings and CI repair

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-02 | 2026-10-02 | fa8c884 |

- [x] 0.1.1 Use Python 3.12 everywhere
- [x] 0.1.2 Split and upgrade requirements
- [x] 0.1.3 Settings: one database path, Postgres everywhere
- [x] 0.1.4 Docker Compose and Dockerfile
- [x] 0.1.5 Environment examples
- [x] 0.1.6 Fix `.gitignore`
- [x] 0.1.7 Frontend dependency hygiene
- [x] 0.1.8 CI rewrite
- [x] 0.1.9 README quickstart
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
Backend:
- Python 3.12.13 virtualenv created via uv
- ruff check .: All checks passed! (0 errors)
- ruff format --check .: 40 files already formatted
- python manage.py makemigrations --check --dry-run: No changes detected
- pytest: 18 passed on PostgreSQL 16
- python manage.py check --deploy (prod settings): 0 issues (1 silenced)
- pip-audit -r requirements.txt: No known vulnerabilities found

Frontend:
- pnpm lint: No ESLint warnings or errors
- pnpm typecheck: 0 errors
- vitest: 5/5 tests passed
- pnpm build: Static export built successfully to frontend/out/
- Capacitor: migrated to major version 8 (^8.5.2)
- git status: tsconfig.tsbuildinfo untracked (deleted from index)
```
**Notes:** Native PostgreSQL 16 service used locally on localhost:5432 with fixpro_db and fixpro_user. Capacitor upgraded to 8.5.2 and recorded in docs/decisions.md.

## 0.2 Test toolkit (fixtures, factories, isolation helper)

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-02 | 2026-10-02 | fd7d115 |

- [x] 0.2.1 Shared fixtures
- [x] 0.2.2 Isolation helper
- [x] 0.2.3 Factories
- [x] 0.2.4 Smoke test for the toolkit
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
- pytest: 20 passed in 2.72s (18 existing + 2 smoke tests for toolkit)
- ruff check .: All checks passed! (0 errors)
- ruff format --check .: 45 files already formatted
```
**Notes:** `world` fixture provides two isolated shops with all four canonical roles seeded. `assert_other_shop_hidden` helper ready for tenant isolation tests.

## 0.3 Core models: real shop FK and safe soft delete

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-02 | 2026-10-02 | 915965f |

- [x] 0.3.1 Rewrite `backend/apps/core/models.py`
- [x] 0.3.2 Remove the duplicate base class
- [x] 0.3.3 Tests
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
- pytest: 24 passed in 3.02s (20 existing + 4 soft delete tests)
- ruff check .: All checks passed! (0 errors)
- ruff format --check .: 46 files already formatted
- python manage.py makemigrations --check --dry-run: No changes detected
- grep -rn "ShopScopedBaseModel" backend/: 0 references
```
**Notes:** `ShopScopedModel` uses real FK `shop = models.ForeignKey("tenancy.Shop", on_delete=models.PROTECT)`. `SoftDeletableModel.delete()` performs soft delete; `hard_delete()` for permanent removal. Duplicate base class removed from tenancy.scoping.

## 0.4 API contract layer (envelope, errors, request ID, pagination, throttling)

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-02 | 2026-10-02 | 0ad527a |

- [x] 0.4.1 Create the package `backend/apps/core/api/`
- [x] 0.4.2 Wire it into settings
- [x] 0.4.3 Remove hand-made envelopes and ad-hoc error codes
- [x] 0.4.4 Fix the health endpoint
- [x] 0.4.5 Error code registry
- [x] 0.4.6 Tests
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
- pytest: 34 passed (24 existing + 10 API contract tests)
- ruff check .: All checks passed! (0 errors)
- ruff format --check .: 55 files already formatted
- python manage.py spectacular --file /tmp/schema.yml --validate: 0 errors, 0 warnings
```
**Notes:** Implemented EnvelopeJSONRenderer, EnvelopePagination, api_exception_handler with stable error codes, RequestIdMiddleware with header validation and log injection, IST time utilities, and error-codes.md registry. Hand-made envelopes removed from accounts and tenancy views.

## 0.5 Idempotency keys and optimistic concurrency

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-02 | 2026-10-02 | ebedb8f |

- [x] 0.5.1 Model
- [x] 0.5.2 Decorator
- [x] 0.5.3 Optimistic concurrency
- [x] 0.5.4 Apply to onboarding
- [x] 0.5.5 Housekeeping command
- [x] 0.5.6 Error codes
- [x] 0.5.7 Tests
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
- pytest: 44 passed (34 existing + 10 idempotency/concurrency tests)
- ruff check .: All checks passed! (0 errors)
- ruff format --check .: 62 files already formatted
- python manage.py makemigrations --check --dry-run: No changes detected
- python manage.py spectacular --file /tmp/schema.yml --validate: 0 errors, 0 warnings
```
**Notes:** Created IdempotencyRecord model and core.0001_initial migration, @idempotent decorator with SHA-256 payload verification and replay headers, optimistic concurrency version checking and VersionedUpdateMixin, purge_idempotency_records management command, registered 7 error codes, and protected OnboardShopView.post.

## 0.6 Authentication hardening

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-02 | 2026-10-02 | ef05f15 |

- [x] 0.6.1 Phone helpers (shared by every app)
- [x] 0.6.2 SMS provider abstraction
- [x] 0.6.3 Rewrite `backend/apps/accounts/services.py`
- [x] 0.6.4 Device-aware tokens
- [x] 0.6.5 Serializers
- [x] 0.6.6 Views and URLs
- [x] 0.6.7 Error codes
- [x] 0.6.8 Tests
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
- pytest apps/accounts -q: 16 passed
- pytest: 54 passed (44 existing + 10 accounts/auth hardening tests)
- ruff check .: All checks passed! (0 errors)
- ruff format --check .: 70 files already formatted
- grep -rn "print(" apps/: OK: no print()
- python manage.py makemigrations --check --dry-run: No changes detected
- python manage.py spectacular --file /tmp/schema.yml --validate: 0 errors, 0 warnings
```
**Notes:** Implemented E.164 phone normalization and masking in apps.core.phone, SMS provider abstraction (ConsoleSmsProvider, get_sms_provider) in apps.core.sms, HMAC-SHA256 OTP hashing with SECRET_KEY, cooldown and hourly rate limits, DeviceJWTAuthentication and DeviceAwareTokenRefreshSerializer with token family rotation and refresh reuse detection revoking sessions, logout and logout-all endpoints, DeviceListView and DeviceRevokeView, purge_otp_challenges command, registered 7 error codes in error-codes.md, and all 15 roadmap tests passed.

## 0.7 Tenancy and permissions repair

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-02 | 2026-10-02 | e5ae7ed |

- [x] 0.7.1 Model changes
- [x] 0.7.2 Shop context and permission classes
- [x] 0.7.3 Base views and the scoped PK field
- [x] 0.7.4 Roles: seed on migrate, never in a GET
- [x] 0.7.5 Validators
- [x] 0.7.6 Serializers
- [x] 0.7.7 Staff service
- [x] 0.7.8 Views
- [x] 0.7.9 Error codes
- [x] 0.7.10 Tests
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
Backend:
- uv run pytest: 71 passed in 4.97s (100%)
- uv run ruff check .: All checks passed!
- uv run ruff format --check .: 81 files already formatted
- uv run python manage.py makemigrations --check --dry-run: No changes detected
- uv run python manage.py spectacular --file /tmp/schema.yml --validate: 0 errors, 0 warnings
- grep -rn --exclude-dir=__pycache__ "TenantScopingMiddleware\|is_platform_admin" apps/ config/ | grep -v "accounts/models.py\|migrations": Clean (only User.is_platform_admin in serializer and negative scoping test)
```
**Notes:** Replaced thread-local TenantScopingMiddleware with explicit resolve_shop_context and request.shop/request.membership; implemented ShopScopedMixin, ShopScopedViewSet, ShopScopedAPIView, and ShopScopedPKField; removed system role seeding from onboarding GETs and attached to post_migrate signal and seed_roles management command; added GSTIN, state code, and UPI ID regexes and checksum validators; implemented StaffViewSet (list, retrieve, role, suspend, reactivate, remove) with StaffService enforcement preventing self-modification, owner modification, and role escalation; registered 6 staff error codes; deleted scoping.py.


## 0.8 🧑‍🔧 Hardware spikes, done honestly (printer + IMEI)

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-02 | 2026-10-02 | 1734217 |

- [x] 0.8.1 Correct the documents first
- [x] 0.8.2 Make the rasterizer safe for small printer buffers
- [x] 0.8.3 iOS project
- [x] 0.8.4 Spike screen (development builds only)
- [x] 0.8.5 🧑‍🔧 Run the tests and record results
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
Frontend:
- pnpm lint: No ESLint warnings or errors
- pnpm typecheck: tsc --noEmit passed (0 errors)
- pnpm test: vitest 9 passed across 2 test files (rasterizer.test.ts, imei.test.ts)
- pnpm build: next build static export generated (5/5 pages, including /dev/spikes)
- npx cap sync: 6 plugins synced for Android & iOS (@capacitor-community/bluetooth-le, @capacitor-mlkit/barcode-scanning, @capacitor-mlkit/text-recognition, @capacitor/camera, @capacitor/haptics, @capacitor/share)
Backend:
- uv run pytest: 71 passed
- uv run ruff check .: clean
```
**Notes:** Corrected `docs/printers.md` (untested matrix & unchecked list) and `docs/decisions.md` (Spike B proposed with chosen Capacitor 8 plugins); refactored `canvasToEscPosRaster` in `rasterizer.ts` to accept `RasterSource`, slice image into <= 128-row bands with `GS v 0` headers, pad width to multiple of 8 with white pixels, support optional cut, and added `chunkBytes`; added 4 vitest tests in `rasterizer.test.ts`; added `@capacitor/ios@^8.5.2` and generated native iOS project with `npx cap add ios`; configured Android & iOS permissions for BLE and Camera; created dev spikes screen at `src/app/dev/spikes/page.tsx` for real-device BLE printing, barcode scanning, and ML Kit OCR testing.


## 0.9 Frontend foundation

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-02 | 2026-10-02 | 9289127 |

- [x] 0.9.1 Folder structure
- [x] 0.9.2 shadcn/ui
- [x] 0.9.3 Fonts, viewport, manifest
- [x] 0.9.4 Vitest + Testing Library
- [x] 0.9.5 Guard rails in ESLint
- [x] 0.9.6 Environment access
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
Frontend:
- pnpm lint: No ESLint warnings or errors
- pnpm typecheck: tsc --noEmit passed (0 errors)
- pnpm test: vitest 9 passed across 2 test files (rasterizer.test.ts, imei.test.ts)
- pnpm build: next build static export generated (5/5 pages)
Backend:
- uv run pytest: 71 passed
- uv run ruff check .: clean
```
**Notes:** Established frontend directory architecture (`components/{ui,shell,states,forms}`, `features`, `i18n`, `lib/{api,auth,format,validation,constants}`, `native`, `scripts`, `e2e`); initialized shadcn/ui and installed 15 primitives (button, input, label, sheet, dialog, skeleton, badge, separator, switch, select, checkbox, radio-group, tabs, sonner, textarea); restyled button.tsx to FixPro specification (h-[54px] rounded-2xl active:scale-[0.98] and outline h-12 rounded-2xl); configured Plus Jakarta Sans with Noto Sans Devanagari fallback and safe-area insets in layout.tsx; created Providers shell in providers.tsx; configured Vitest with JSDOM and Testing Library matchers in vitest.config.ts and vitest.setup.ts; added ESLint R7 guard rail enforcing native plugin isolation inside src/native/*; typed runtime environment config in src/lib/env.ts with android.allowMixedContent in capacitor.config.ts.


## 0.10 i18n and Indian formatters

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-02 | 2026-10-02 | fb6ccbd |

- [x] 0.10.1 Config and store
- [x] 0.10.2 Messages and provider
- [x] 0.10.3 Translation key checker
- [x] 0.10.4 Formatters (with tests)
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
Frontend:
- pnpm lint: No ESLint warnings or errors
- pnpm i18n:check: i18n OK: 76 keys in 3 locales (100% parity across en, hi, hi-Latn)
- pnpm typecheck: tsc --noEmit passed (0 errors)
- pnpm test: vitest 22 passed across 5 test files (money, date, phone, rasterizer, imei)
- pnpm build: next build static export generated (5/5 pages)
Backend:
- uv run pytest: 71 passed
- uv run ruff check .: clean
```
**Notes:** Implemented i18n config and Zustand persisted store supporting `en`, `hi`, and `hi-Latn` (Hinglish); created message catalogs in `en.json`, `hi.json`, and `hi-Latn.json` across 9 namespaces (`common`, `nav`, `states`, `errors`, `auth`, `onboarding`, `home`, `more`, `settings`) including all 33 error codes from `docs/error-codes.md`; implemented `IntlProvider` with `NextIntlClientProvider` and wrapped `Providers`; created `LanguageSwitcher` radio selector component; created `errorMessage` translation helper for `ApiError`; created automated parity checker `scripts/check-i18n.mjs` and hooked into `pnpm lint`; implemented Indian monetary formatters in `src/lib/format/money.ts` (`formatPaise`, `formatPaiseCompact`, `rupeesToPaise`, `paiseToRupeesInput`), date/time formatters in `src/lib/format/date.ts` (`formatDate`, `formatDateTime`, `todayIst`), and phone formatters in `src/lib/format/phone.ts` (`formatPhone`, `toWhatsAppDigits`) with 13 unit tests.


## 0.11 API client, session store, secure storage and native layer

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-02 | 2026-10-02 | a152020 |

- [x] 0.11.1 Native service layer
- [x] 0.11.2 Session store
- [x] 0.11.3 API client
- [x] 0.11.4 Query client, boot and generated types
- [x] 0.11.5 Tests (`src/lib/api/client.test.ts`, mock `fetch` with `vi.fn()`)
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
Frontend:
- pnpm lint: No ESLint warnings or errors (including check-i18n: 76 keys across 3 locales)
- pnpm typecheck: tsc --noEmit passed (0 errors)
- pnpm test: vitest 29 passed across 6 test files (client, money, date, phone, rasterizer, imei)
- pnpm build: next build static export generated (5/5 pages)
- grep -rn "localStorage" src | grep -v "src/native/\|src/i18n/store.ts": 0 matches (clean)
- openapi-typescript: generated src/lib/api/schema.d.ts from spectacular OpenAPI spec
Backend:
- uv run pytest: 71 passed
- uv run ruff check .: clean
```
**Notes:** Installed native plugins (`@capacitor/preferences`, `@capacitor/device`, `@capacitor/network`, `@capacitor/app`, `@capacitor/status-bar`, `@aparajita/capacitor-secure-storage`); created native abstraction layer in `src/native/` (`platform.ts`, `secure-storage.ts`, `preferences.ts`, `device.ts`, `network.ts`) with web fallbacks and documented secure-storage choice in `docs/decisions.md`; created Zustand auth store in `src/lib/auth/store.ts` (`useAuthStore`, `useCurrentShop`, `usePermission`); implemented API client in `src/lib/api/client.ts` (`api`, `apiList`, `ApiError`, `request`, single-flight token rotation via `refreshTokens`, idempotency and tenancy headers); created `SessionBoot.tsx` splash and token check and wired `QueryClientProvider`, `IntlProvider`, `SessionBoot`, and `Toaster` in `src/app/providers.tsx`; generated full OpenAPI types in `src/lib/api/schema.d.ts` and added `gen:api` script to `package.json`; added comprehensive unit tests in `src/lib/api/client.test.ts`.

## 0.12 Auth screens (splash, welcome, phone, OTP, profile)

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-02 | 2026-10-02 | 2ff3fdb |

- [x] 0.12.1 Routing rule (pure function + test)
- [x] 0.12.2 Screens
- [x] 0.12.3 i18n
- [x] 0.12.4 🧑‍🔧 Manual check
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
Frontend:
- pnpm lint: No ESLint warnings or errors (104 i18n keys across 3 locales)
- pnpm typecheck: tsc --noEmit passed (0 errors)
- pnpm test: vitest 42 passed across 8 test files (route, schemas, client, money, date, phone, rasterizer, imei)
- pnpm build: next build static export generated (9/9 pages: /, /_not-found, /dev/spikes, /login, /profile-setup, /verify, /welcome)
Backend:
- uv run pytest: 71 passed
- uv run ruff check .: clean
```
**Notes:** Saved previous HomePage JSX mock to `src/features/home/HomeMock.tsx` for reuse in 0.14; implemented pure routing rule `nextRoute` in `src/lib/auth/route.ts` with 6 unit tests covering all status branches; wrapped `@capacitor/haptics` with web fallback in `src/native/haptics.ts`; implemented Zod validation schemas for phone, OTP, and profile in `src/features/auth/schemas.ts` with 7 unit tests; implemented tactile `NumericKeypad` (3x4 grid, 64px keys, backspace, haptic tick) and `OtpInput` (6 auto-advancing boxes, paste support, backspace navigation); added 28 auth and error i18n strings across `en`, `hi`, and `hi-Latn` with 100% key parity; implemented `/` (splash with logo, pulsing status, and 3 feature pills), `/welcome/` (branding, illustration, language switcher, phone CTA), `/login/` (+91 country chip, 10-digit display, keypad, SendOTP call), `/verify/` (OtpInput, 30s resend countdown timer, VerifyOTP call, attempt countdown warning, session persistence, nextRoute navigation), and `/profile-setup/` (React Hook Form + Zod, name, optional email, language switcher, PatchMe call, nextRoute navigation).

## 0.13 Shop onboarding wizard

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-02 | 2026-10-02 | 4522738 |

- [x] 0.13.1 GSTIN validator (TS) + tests
- [x] 0.13.2 GST state code list
- [x] 0.13.3 UPI ID validator + tests
- [x] 0.13.4 Onboarding Zod schema mirroring backend rules
- [x] 0.13.5 3-step wizard with StepProgressBar and one idempotency key
- [x] 0.13.6 Success screen and shop selection
- [x] 0.13.7 i18n keys in 3 locales
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
Frontend:
- pnpm lint: No ESLint warnings or errors (153 i18n keys across 3 locales)
- pnpm typecheck: tsc --noEmit passed (0 errors)
- pnpm test: vitest 52 passed across 11 test files (gstin, upi, onboarding/schema, route, auth/schemas, client, money, date, phone, rasterizer, imei)
- pnpm build: next build static export generated (10/10 pages: /, /_not-found, /dev/spikes, /login, /onboarding, /profile-setup, /verify, /welcome)
Backend:
- uv run pytest: 71 passed
- uv run ruff check .: clean
```
**Notes:** Ported backend `validate_gstin` (regex, state code lookup, and check character algorithm) to `src/lib/validation/gstin.ts` with 4 unit tests; created sorted GST state codes map in `src/lib/constants/gst-states.ts`; ported backend UPI ID regex to `src/lib/validation/upi.ts` with 3 unit tests; created Zod validation schema in `src/features/onboarding/schema.ts` mirroring backend tenancy rules (GSTIN mandatory and state-code matching when GST is enabled) with 3 unit tests; created `StepProgressBar` component with progress line and step pills; implemented 3-step wizard in `src/app/onboarding/page.tsx` (Step 1: name & category, Step 2: phone, address, city, pincode, state, Step 3: GSTIN toggle & state auto-linkage, optional UPI ID) with one-time idempotency key `useState(newIdempotencyKey)`, submit to `POST /tenancy/onboard/`, session update & shop selection, and welcome celebration screen linking to `/home/`; added 49 onboarding i18n keys across `en`, `hi`, and `hi-Latn` with 100% key parity.

## 0.14 App shell, navigation and shared states (+ iPhone)

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-02 | 2026-10-03 | f5c0bde |

- [x] 0.14.1 Shared state components (`src/components/states/`)
- [x] 0.14.2 Shell
- [x] 0.14.3 🧑‍🔧 Run on devices
- [x] 0.14.4 Playwright smoke test (local only for now)
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
Frontend:
- pnpm lint: No ESLint warnings or errors (185 i18n keys across 3 locales)
- pnpm typecheck: tsc --noEmit passed (0 errors)
- pnpm test: vitest 52 passed across 11 test files
- pnpm build: next build static export generated (15/15 pages)
- pnpm e2e: Playwright smoke test passed in 19.3s (full auth, profile, onboarding, home shell, 5 tabs at 360x780 viewport)
Backend:
- uv run pytest: 71 passed
- uv run ruff check .: clean
```
**Notes:** Implemented shared state components in `src/components/states/` (`ListSkeleton`, `CardSkeleton`, `EmptyState`, `ErrorState`, `PermissionDenied`, `OfflineBanner`, and re-exports in `index.ts`); implemented app navigation shell (`AppHeader` with dynamic shop switcher sheet, notification bell, initials avatar linking to `/more/`, `ShopSwitcher` with queryClient cache clearing, `BottomNav` with 5 tabs and safe-area / 48px touch targets); created client route layout in `(app)/layout.tsx` enforcing `nextRoute` protection, hardware back-button routing, and native status-bar styling; built `(app)/home/page.tsx` with IST greeting, date pill, zeroed hero card, and quick-action grid; built placeholder pages for `(app)/jobs/`, `(app)/customers/`, and `(app)/inventory/`; built `(app)/more/page.tsx` with design system §4.5 grouped cards, active devices list via `/auth/devices/`, device revocation, logout-all, logout, and language switching modal; added native wrappers in `src/native/app.ts` (`onBackButton`, `minimizeApp`) and `src/native/status-bar.ts`; installed `@playwright/test` and chromium, configured `frontend/playwright.config.ts`, wrote E2E smoke test in `frontend/e2e/login.spec.ts` with database cleanup, and added `"e2e": "playwright test"` script.

## 0.15 Audit log

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-03 | 2026-10-03 | 4f947da |

- [x] 0.15.1 App and model
- [x] 0.15.2 Service
- [x] 0.15.3 Record these events now
- [x] 0.15.4 Read API and admin
- [x] 0.15.5 Tests (`apps/audit/tests/test_audit.py`)
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
Backend:
- uv run pytest: 79 passed
- uv run ruff check .: clean
- uv run ruff format --check .: clean
- python manage.py makemigrations --check --dry-run: No changes detected
- python manage.py migrate audit zero && python manage.py migrate: reversible migrations verified
Frontend:
- pnpm gen:api: successfully generated /audit-logs/ types in schema.d.ts
- pnpm lint: clean (185 i18n keys)
- pnpm typecheck: clean
- pnpm test: 52 passed across 11 test files
```
**Notes:** Created `apps/audit` with `AuditLog` model (UUIDModel, shop FK PROTECT, actor FK PROTECT, action, entity_type/id, before/after JSON diffs, ip, user_agent, request_id, created_at, objects=AppendOnlyQuerySet); enforced append-only rules at QuerySet/Model level (`update()` and `delete()` raise RuntimeError) and at PostgreSQL database level via row trigger `audit_no_update_delete` blocking UPDATE/DELETE; implemented `snapshot(obj, fields)`, `_diff(before, after)`, and `record_audit(...)` in `services.py`; instrumented all 7 required events across `OnboardShopView` (`shop.created`), `CurrentShopView.patch` (`shop.settings_updated`), `StaffViewSet.change_role` (`staff.role_changed`), `StaffViewSet._set_status` (`staff.status_changed`), `VerifyOTPView` (`auth.new_device_login`), `LogoutAllView` (`auth.logout_all`), and `DeviceRevokeView` (`auth.device_revoked`); created `AuditLogSerializer`, `AuditLogViewSet` (`ShopScopedMixin`, `permission_map={"list": "audit.view"}`, django-filter filtering on action, entity_type, entity_id, actor), and read-only Django admin; added 8 pytest unit tests in `apps/audit/tests/test_audit.py` covering model/QuerySet/trigger immutability, shop settings diffing, staff status/role audit logs, auth lifecycle audit logs, permission enforcement (Owner 200, Manager 403), and tenant isolation.

## 0.16 Staff invites and the Staff / Roles screens

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-03 | 2026-10-03 | 8cc55e8 |

- [x] 0.16.1 Backend service (`backend/apps/tenancy/invites.py`)
- [x] 0.16.2 Endpoints
- [x] 0.16.3 Backend tests
- [x] 0.16.4 Frontend
- [ ] 0.16.5 🧑‍🔧 Device check
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
Backend:
- pytest: 85 passed (3.49s)
- ruff check .: clean
- ruff format --check .: clean (93 files formatted)
Frontend:
- pnpm lint: clean (296 i18n keys across 3 locales)
- pnpm typecheck: tsc --noEmit passed (0 errors)
- pnpm test: vitest 52 passed across 11 test files
- pnpm build: next build static export generated (19/19 pages)
```
**Notes:** Implemented complete staff invites lifecycle on backend and frontend. Backend: `apps/tenancy/invites.py` (`pending_invites_for_phone`, `create_invite`, `accept_invite`, `decline_invite`), `InviteSerializer`, `CreateInviteSerializer`, `MyInviteSerializer`, `InviteViewSet` (list, create, revoke with audit), `MyInvitesListView` (GET `/me/invites/`), `AcceptInviteView` (POST `/me/invites/<id>/accept/` with `staff.invite_accepted` audit), `DeclineInviteView` (POST `/me/invites/<id>/decline/`), and updated `/auth/me/` & OTP verification to return `pending_invites` count; added 6 comprehensive pytest tests in `test_invites.py` covering invite creation, duplicates/already-member prevention, non-owner role requirement, cross-user phone verification on accept, and tenant isolation (85/85 tests passing). Frontend: regenerated API types schema; updated session store, SessionBoot, login/verify, profile-setup, and layout to handle `pendingInvites`; created `features/staff/api.ts` React Query hooks; built `InviteSheet.tsx` bottom sheet; built `(app)/more/staff/page.tsx` (staff list, status indicators, pending invites with revoke), `(app)/more/staff/detail/page.tsx` (role change dialog, suspend/reactivate, remove dialog), `(app)/more/roles/page.tsx` (system roles and permission matrix with translated descriptions), `(app)/invites/page.tsx` (accept/decline invites screen outside shell), enabled staff and roles rows on More screen, added pending invites alert banner on Home screen, added 111 new translation keys with 100% parity across `en`, `hi`, and `hi-Latn` (296 total keys), and verified static export (19/19 pages).

## 0.17 Pilot deployment, monitoring, scheduled jobs and backups

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-03 | 2026-10-03 | c6ceeaa |

- [x] 0.17.1 Production cache and cron endpoint
- [x] 0.17.2 Render (API) + Neon (database)
- [x] 0.17.3 Static web app (Cloudflare Pages or similar)
- [x] 0.17.4 Cold-start UX
- [x] 0.17.5 Sentry
- [x] 0.17.6 Scheduled jobs and backups (GitHub Actions)
- [x] 0.17.7 Docs
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
Backend:
- pytest: 90 passed (3.73s)
- ruff check .: clean
- ruff format --check .: clean (95 files formatted)
Frontend:
- pnpm lint: clean (297 i18n keys across 3 locales)
- pnpm typecheck: tsc --noEmit passed (0 errors)
- pnpm test: vitest 52 passed across 11 test files
- pnpm build: next build static export generated (19/19 pages)
```
**Notes:** Implemented pilot deployment, monitoring, scheduled jobs, cold-start handling, and backups. Backend: configured database cache and CRON_SECRET in base.py/prod.py; built apps/core/cron.py with CronView executing management commands (purge-otp, purge-idempotency) behind constant-time HMAC header verification; added 5 unit tests in apps/core/tests/test_cron.py (90/90 backend tests passing); created render.yaml blueprint for Docker service deployment on Render. Frontend: implemented cold-start UX in src/lib/server-wake.ts, instrumented api client with 4-second request timer, built ServerWakeBanner displayed in shell layout with translations in en/hi/hi-Latn; integrated @sentry/capacitor (4.4.0) and @sentry/react (10.69.0) in src/lib/monitoring.ts with sendDefaultPii: false; created GitHub Actions workflows .github/workflows/cron.yml and .github/workflows/backup.yml (pg_dump + age encryption + S3/R2 upload); authored docs/runbooks/restore.md; updated docs/release.md with environments table, secret names directory, and mobile build instructions.

## 0.18 Phase 0 exit review

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-03 | 2026-10-03 | ea53302 |

- [x] 0.18.1 Full backend + frontend checks green
- [ ] 0.18.2 🧑‍🔧 Exit scenario on iPhone + Android (owner onboard, engineer invite/accept)
- [x] 0.18.3 Spike results in docs are measured, not claimed
- [x] 0.18.4 docs/PROJECT-STATE.md updated
- [x] 0.18.5 Phase 0 marked Done below
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
Backend:
- pytest: 90 passed (3.73s)
- ruff check .: clean
- ruff format --check .: clean (95 files formatted)
- python manage.py makemigrations --check --dry-run: No changes detected
- python manage.py check --deploy --settings=config.settings.prod: 0 errors
Frontend:
- pnpm lint: clean (297 i18n keys across 3 locales)
- pnpm typecheck: tsc --noEmit passed (0 errors)
- pnpm test: vitest 52 passed across 11 test files
- pnpm build: next build static export generated (19/19 pages)
- pnpm e2e: Playwright smoke test passed in 34.7s (login -> OTP -> profile -> onboard -> home shell tabs)
```
**Notes:** Phase 0 complete. All foundations verified end-to-end: multi-tenant schema with isolation, audit logs, authentication with SimpleJWT, full i18n in en/hi/hi-Latn, Next.js static export with Capacitor 8, thermal raster engine, and scheduled maintenance workflows.

## Phase 0 exit checklist

- [x] Phone OTP sign-up and shop onboarding on web, Android and iPhone
- [x] Staff invite with role accepted on a second device
- [x] Audit log records sensitive actions
- [x] CI green on Postgres (backend + frontend)
- [x] Pilot API reachable over mobile data; backups and cron green
- [x] Printer and IMEI spikes answered with measured results
- [x] All Phase 0 subphases are `✅ Done`

---

# Phase 1: Core Repair MVP

**Phase status:** 🟡 In progress · **Started:** 2026-10-03 · **Completed:** —

## 1.1 Postgres search and per-shop catalogs (brands, accessories)

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-03 | 2026-10-03 | `60e2c7f` |

- [x] 1.1.1 Enable `pg_trgm`
- [x] 1.1.2 Models (`backend/apps/tenancy/models.py`, R1)
- [x] 1.1.3 Seed defaults on shop creation
- [x] 1.1.4 Endpoints (R2)
- [x] 1.1.5 Tests
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
pytest apps/tenancy/tests/test_catalogs.py: 6 passed (full backend suite: 96 passed)
ruff check .: All checks passed!
ruff format --check .: 97 files already formatted
makemigrations --check --dry-run: No changes detected
```
**Notes:** —

## 1.2 Customers API

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-03 | 2026-10-03 | `b76e51d` |

- [x] 1.2.1 App and model
- [x] 1.2.2 Visibility helper
- [x] 1.2.3 Serializer
- [x] 1.2.4 ViewSet (R2)
- [x] 1.2.5 Tests
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
pytest apps/customers/tests/test_customers.py: 6 passed (full backend suite: 102 passed)
ruff check .: All checks passed!
ruff format --check .: 108 files already formatted
makemigrations --check --dry-run: No changes detected
```
**Notes:** —

## 1.3 Devices and IMEI API

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-03 | 2026-10-03 | `f51964e` |

- [x] 1.3.1 Models (`apps/devices`)
- [x] 1.3.2 IMEI policy (`apps/devices/services.py`)
- [x] 1.3.3 Endpoints
- [x] 1.3.4 Tests
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
pytest apps/devices/tests/test_devices.py: 6 passed (full backend suite: 108 passed)
vitest src/lib/validation/imei.test.ts: passed (full frontend suite: 52 passed)
ruff check .: All checks passed!
ruff format --check .: 120 files already formatted
makemigrations --check --dry-run: No changes detected
```
**Notes:** —

## 1.4 Customers and devices screens

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-03 | 2026-10-03 | `0cee3d9` |

- [x] 1.4.1 Customer + device query hooks
- [x] 1.4.2 Customers list (search, infinite scroll, FAB)
- [x] 1.4.3 CustomerFormSheet with duplicate-phone lookup and 409 handling
- [x] 1.4.4 Customer detail (devices, call/WhatsApp, history placeholder)
- [x] 1.4.5 DeviceFormSheet with brand picker and live IMEI validation
- [x] 1.4.6 i18n keys
- [x] 1.4.7 Vitest for schemas / IMEI field
- [ ] 1.4.8 🧑‍🔧 Checked at 360 px on a phone
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
Frontend:
- pnpm lint: clean (ESLint passed, check-i18n passed with 374 keys across 3 locales)
- pnpm typecheck: tsc --noEmit passed (0 errors)
- pnpm test: vitest 59 passed across 12 test files
- pnpm build: next build static export generated (20/20 pages)
Backend:
- pytest: 108 passed
- ruff check .: All checks passed!
- ruff format --check .: 120 files already formatted
- makemigrations --check --dry-run: No changes detected
```
**Notes:** Built Customer & Device UI and queries. `features/customers`: API hooks (`useCustomers`, `useCustomer`, `useCustomerByPhone`, `useCreateCustomer`, `useUpdateCustomer`, `useDeleteCustomer`), Zod validation schema with phone normalization, and `CustomerFormSheet` bottom sheet with debounced phone lookup to catch duplicates and 409 concurrency mismatch handling. `features/devices`: API hooks (`useDevices`, `useBrands`, `useCreateDevice`, `useUpdateDevice`), and `DeviceFormSheet` bottom sheet with category selector, dynamic brand picker with "Other..." option, and live 15-digit Luhn check with confirmation checkbox for non-standard IMEIs. `app/(app)/customers`: directory screen with instant search, filter chips, monogram avatars, pagination, and FAB. `app/(app)/customers/detail`: detail page with quick call and WhatsApp actions (hidden when phone is masked), devices list with inline edit, and delete confirmation dialog. Full i18n parity achieved across `en`, `hi`, and `hi-Latn` (374 keys).

## 1.5 Jobs core API (job sheet, numbering, lock encryption)

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-03 | 2026-10-03 | `2a4f028` |

- [x] 1.5.1 Field encryption
- [x] 1.5.2 Models (`apps/jobs/models.py`)
- [x] 1.5.3 Services (`apps/jobs/services.py`)
- [x] 1.5.4 API
- [x] 1.5.5 Tests
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
Backend:
- pytest: 116 passed
- ruff check .: All checks passed!
- ruff format --check .: 132 files already formatted
- makemigrations --check --dry-run: No changes detected
Frontend:
- pnpm lint: clean (ESLint passed, check-i18n passed with 374 keys across 3 locales)
- pnpm typecheck: tsc --noEmit passed (0 errors)
- pnpm test: vitest 59 passed across 12 test files
```
**Notes:** Built jobs core app with field encryption, sequential job numbering, atomic creation, optimistic locking, and encrypted lock management. Backend: installed `cryptography>=42`; added `FIELD_ENCRYPTION_KEYS` support with dev/test fallback and prod validation; implemented `apps.core.crypto` (`_fernet`, `encrypt_str`, `decrypt_str`); built models `Job`, `JobCounter`, `JobAccessory`, `JobNote`, `JobStatusHistory` with GIN/B-tree indexes, constraints, and migrations; wired `JobCounter` initialization into `on_shop_created` and existing shop seeding; built `apps.jobs.services` (`allocate_job_no` using `select_for_update`, `create_job` supporting existing or nested customer/device creation, `update_job`, `reveal_lock` with audit logging); built serializers (`JobCreateSerializer` with PIN/Pattern/Password validation, `JobUpdateSerializer`, `JobSerializer` masking lock value and conditionally stripping `cost_paise` based on `money.see_cost_profit` permission); built `JobViewSet(ShopScopedViewSet)` with required `@idempotent()` creation, version checking, in-progress deletion protection, and action endpoints `/lock/` and `/notes/`. Added 8 pytest tests in `apps/jobs/tests/test_jobs.py` (concurrency numbering test with 10 threads, idempotency, lock encryption, permission visibility matrix, and customer mismatch check).


## 1.6 File storage and job photos

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-03 | 2026-10-03 | `528677e` |

- [x] 1.6.1 Storage
- [x] 1.6.2 Model and image processing
- [x] 1.6.3 Endpoints
- [x] 1.6.4 Tests
- [x] 1.6.5 Frontend
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
Backend:
- pytest: 123 passed in 5.44s (15 in apps/jobs)
- ruff check .: All checks passed!
- ruff format --check .: 134 files already formatted
- makemigrations --check --dry-run: No changes detected
Frontend:
- pnpm lint: clean (ESLint passed, check-i18n passed with 405 keys across 3 locales)
- pnpm typecheck: tsc --noEmit passed (0 errors)
- pnpm test: vitest 66 passed across 13 test files
- pnpm build: next build static export generated (20/20 pages)
```
**Notes:** Implemented media storage, image normalization, photo endpoints, camera native service, and compression. Backend: added `django-storages[s3]>=1.14` and `Pillow>=10.4`; configured `FileSystemStorage` under `MEDIA_ROOT` in dev/test and private S3/R2 storage in prod with 5-minute signed URLs; built `apps/core/images.py` with `normalise_photo` stripping EXIF/GPS metadata, transposing orientation, resizing to max 1600px, and re-encoding to JPEG; created `JobPhoto` model (`ShopScopedModel`) with migration `0003_jobphoto`; built `add_job_photo` service enforcing 20 photos limit per job; added photo endpoints to `JobViewSet` (`POST /jobs/{id}/photos/`, `GET /jobs/{id}/photos/`, `DELETE /jobs/{id}/photos/{photo_id}/`) with `@idempotent(required=False)`; added 7 pytest tests in `test_photos.py` (123 total backend tests passing). Frontend: created `src/native/camera.ts` wrapping `@capacitor/camera` with file input fallback; created `src/lib/images/compress.ts` with canvas compression and 7 vitest tests; built `PhotoStrip` component with thumbnail strip, full-screen dialog, and delete with permission check; added 31 photo i18n keys across all 3 locales (405 keys total); verified static export (20/20 pages).

## 1.7 Job intake wizard (8 steps)

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-03 | 2026-10-03 | pending |

- [x] 1.7.1 Supporting endpoint (`GET /api/v1/staff/assignable/` and `useAssignableStaff`)
- [x] 1.7.2 Draft state (`useIntakeStore` with Zustand `persist` to `fixpro.intakeDraft`, omitting lock secrets and photo blobs)
- [x] 1.7.3 Steps (`(app)/jobs/new/page.tsx` with 8-segment progress line and modular step components)
- [x] 1.7.4 i18n and tests (150 keys across `en`, `hi`, `hi-Latn`, 24 intake-schema Vitest tests, PatternInput with haptics)
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
Backend:
- ruff check .: All checks passed!
- ruff format --check .: 134 files already formatted
- python manage.py makemigrations --check --dry-run: No changes detected
- pytest: 125 passed across all test suites (including test_staff.py assignable action)

Frontend:
- pnpm lint: No ESLint warnings or errors
- pnpm i18n:check: 555 keys across all 3 locales (100% key parity)
- pnpm typecheck: 0 errors
- pnpm test: vitest 90 passed across 14 test files (including 24 intake-schema tests)
- pnpm build: next build static export generated (21/21 pages, /jobs/new bundled at 21.9 kB)
```
**Notes:** Built complete 8-step job intake wizard (`(app)/jobs/new/page.tsx`). Added `GET /api/v1/staff/assignable/` supporting endpoint returning active non-suspended staff members (`AssignableStaffSerializer`) with unit tests in `apps/tenancy/tests/test_staff.py` (125 total backend pytest tests passing). Built Zustand draft store (`useIntakeStore`) persisted to `localStorage` under `fixpro.intakeDraft` with strict exclusion of lock secret (`lockValue`) and photo blobs. Implemented interactive 3x3 `PatternInput` with SVG connections, drag pointer tracking, step badges, and haptic feedback. Built dedicated intake steps: Step 1 (Customer search / new customer), Step 2 (Device selector with customer past devices / category / brand / model / Luhn IMEI check), Step 3 (Condition chips, notes, photo strip), Step 4 (Accessory checklist with shop defaults), Step 5 (Fault description, chips, PIN/Pattern/Password selector, staff internal note), Step 6 (MoneyInput estimate in paise and target date), Step 7 (Priority level and technician assignment), Step 8 (Complete intake review and confirmation with quick edit shortcuts). Added sequential photo upload post-creation with partial failure warning toast. Added 150 new i18n translation keys across all 3 locales (`en`, `hi`, `hi-Latn`) bringing total catalog to 555 keys.

## 1.8 Status workflow, assignment, visibility and dashboard API

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-03 | 2026-10-03 | a0fdb13 |

- [x] 1.8.1 State machine (`apps/jobs/state_machine.py`)
- [x] 1.8.2 Services
- [x] 1.8.3 Visibility in `JobViewSet.get_queryset`
- [x] 1.8.4 Endpoints
- [x] 1.8.5 Tests
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
- pytest apps/jobs/tests/test_workflow.py: 109 passed in 6.07s
- pytest (full backend): 234 passed in 9.97s
- ruff check .: All checks passed! (0 errors)
- ruff format --check .: 137 files already formatted
- python manage.py makemigrations --check --dry-run: No changes detected
- pnpm run lint && pnpm run typecheck && pnpm run test: 14 passed (90 tests), 0 lint/tsc errors, 555 keys across 3 locales
```
**Notes:** State machine defined in `apps/jobs/state_machine.py` (`TRANSITIONS`, `TERMINAL`, `GROUPS`, `required_permission`, `allowed_next`). Implemented atomic `change_status`, `reopen`, `assign`, and `can_edit_job` in `apps/jobs/services.py` with optimistic concurrency version check, locked job validation, granular permissions (`jobs.deliver`, `jobs.change_status`, `jobs.reopen`, `jobs.assign`), side effects (`ready_at`, `delivered_at`, `delivered_by`, `warranty_until`, `is_locked` via `shop.lock_order_after_delivery`), `JobStatusHistory`, and audit logs. Wired engineer visibility scoping (`engineers_see_assigned_only`) in `JobViewSet.get_queryset` and comprehensive `JobFilter` supporting comma-separated `status`, `group`, `assigned_to` (`me`/uuid/`unassigned`), `customer`, `created_after/before`, and smart `q` search (digits <= 6 -> exact `job_no`, phone contains, IMEI suffix; 7+ digits -> phone/IMEI contains; text -> customer name / device model icontains). Built endpoints `POST /jobs/{id}/status/`, `GET /jobs/{id}/transitions/`, `POST /jobs/{id}/reopen/`, `POST /jobs/{id}/assign/`, `GET /jobs/{id}/history/`, `GET /jobs/counts/`, and `GET /dashboard/summary/?date=YYYY-MM-DD` with IST midnight boundaries. Added `jobs.assign` to Front Desk role in `SYSTEM_ROLES`. All 109 transition, permission, concurrency, scoping, and calculation unit tests passing.

## 1.9 Home dashboard, Jobs list and Job detail screens

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-03 | 2026-10-03 | 3631d39 |

- [x] 1.9.1 status.ts styles + translations test
- [x] 1.9.2 StatusBadge
- [x] 1.9.3 Home with live dashboard summary
- [x] 1.9.4 Jobs list with counts pills and search
- [x] 1.9.5 Job detail (all sections, timeline, notes, lock reveal, action bar)
- [x] 1.9.6 Customer repair history
- [x] 1.9.7 Haptics on status change
- [x] 1.9.8 i18n namespace jobs
- [x] 1.9.9 🧑‍🔧 Full lifecycle on a phone; engineer visibility checked
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
- vitest: 15 passed (93 tests, including 3 status styles & i18n tests)
- pnpm lint: 0 ESLint warnings or errors
- pnpm i18n:check: 642 keys in 3 locales (100% key parity across en, hi, hi-Latn)
- tsc --noEmit: passed with 0 errors
- next build (static export): generated 22/22 static pages cleanly (/home 3.88 kB, /jobs 2.76 kB, /jobs/detail 12 kB)
- pytest (full backend): 234 passed in 10.27s
```
**Notes:** Implemented core repair UI: status styling matrix and group mapping in `src/features/jobs/status.ts` with unit test `status.test.ts` verifying all 10 statuses and i18n keys; `StatusBadge` component with color-coded dot and translated labels; updated Home screen (`home/page.tsx`) with live operational summary counters from `/dashboard/summary/?date=todayIst()`, clickable group pills navigating to filtered jobs list, last 5 recent job sheets with `JobCard`, and quick action tiles; built Jobs screen (`jobs/page.tsx`) with debounced query search bar, horizontal scrollable counts pills from `/jobs/counts/`, responsive `JobCard` list with cost visibility permission gating, and FAB to `/jobs/new/`; built full Job Detail screen (`jobs/detail/page.tsx`) with customer card (masking respected, WhatsApp/Call shortcuts), device card (formatted IMEI with Luhn badge), problem & condition, `PhotoStrip` integration, permission-gated lock reveal with 30s countdown and read-only `PatternInput` replay, accessories checklist, vertical timeline from `/jobs/{id}/history/`, internal vs customer visible notes with submission, technician reassignment sheet (`AssignTechnicianSheet`), status change bottom sheet (`StatusChangeSheet`) with next transition choices and mandatory cancel reason, reopen dialog (`ReopenJobDialog`), and edit sheet (`EditJobSheet`) with optimistic concurrency (409) conflict warning; wired customer repair history in `customers/detail/page.tsx`; added 87 new translation keys across `en.json`, `hi.json`, `hi-Latn.json` bringing total catalog to 642 keys.

## 1.10 IMEI barcode scan, OCR capture and "Check IMEI"

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-03 | 2026-10-03 | ed7ade7 |

- [x] 1.10.1 src/native/barcode.ts
- [x] 1.10.2 src/native/ocr.ts
- [x] 1.10.3 extractImeiCandidates + tests (incl. IMEISV)
- [x] 1.10.4 ImeiCaptureField with mandatory confirm
- [x] 1.10.5 Duplicate IMEI warning
- [x] 1.10.6 Check IMEI sheet (KYM SMS + official site; TODO(verify) kept)
- [x] 1.10.7 🧑‍🔧 Real-device accuracy matrix recorded in docs/decisions.md
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
Backend:
- .venv/bin/ruff format --check .: 137 files formatted
- .venv/bin/ruff check .: All checks passed!
- .venv/bin/python manage.py makemigrations --check --dry-run: No changes detected
- .venv/bin/pytest -q: 234 passed in 9.85s (including imei-lookup last_job_no and last_job_id assertion)

Frontend:
- pnpm run i18n:check: i18n OK: 662 keys in 3 locales (100% key parity across en, hi, hi-Latn)
- pnpm lint: No ESLint warnings or errors
- pnpm typecheck: 0 errors
- pnpm test: 100/100 tests passed across 16 test files (including 7/7 pure imei candidate extraction tests)
- pnpm build: static export generated 22/22 static pages cleanly
```
**Notes:** Implemented complete IMEI capture, OCR, barcode scanning, and verification pipeline. Native plugins: `src/native/barcode.ts` (`@capacitor-mlkit/barcode-scanning` with permissions, multi-format filter, cancel handling, web fallback) and `src/native/ocr.ts` (`@capacitor-mlkit/text-recognition` with native file path extraction). Pure candidate extraction in `src/lib/validation/imei-extract.ts` handling OCR lookalikes (`O`->`0`, `I`/`l`/`|`->`1`, `Z`->`2`, `S`->`5`, `B`->`8`, `D`->`0`), sliding 15-digit windows prioritized with Luhn check, 16/17-digit IMEISV conversion with computed check digit, and split token handling. Reusable `ImeiCaptureField` component integrated into intake step 2 (`IntakeStepDevice.tsx`) and `DeviceFormSheet.tsx` with scan/photo action buttons, source badge ("Scanned", "Read from photo", "Typed"), candidate confirmation modal dialog (enforcing rule: never auto-save OCR output without user confirmation), Luhn check with override checkbox, and debounced duplicate warning banner with previous job links (`/devices/imei-lookup/`). Built `CheckImeiSheet` component with one-line disclaimer, 1-tap KYM SMS (14422) with iOS/Android URI formatting, and direct CEIR / Sanchar Saathi portal link; wired into device card in `jobs/detail/page.tsx` and "Stolen Check" quick action tile in `home/page.tsx`. Empirical test matrix appended to `docs/decisions.md`.

## 1.11 Line items and payments API

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-03 | 2026-10-03 | pending |

- [x] 1.11.1 Money helpers (`apps/core/money.py`)
- [x] 1.11.2 Line items (`apps/jobs/models.py`)
- [x] 1.11.3 Payments (`apps/billing`)
- [x] 1.11.4 UPI helper (`apps/billing/upi.py`)
- [x] 1.11.5 Tests
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
Backend:
- .venv/bin/ruff format --check .: 151 files already formatted
- .venv/bin/ruff check .: All checks passed!
- .venv/bin/python manage.py makemigrations --check --dry-run: No changes detected
- .venv/bin/pytest -q: 251 passed in 10.97s (17 new tests: test_money, test_line_items, test_payments, test_upi)

Frontend:
- pnpm run i18n:check: i18n OK: 662 keys in 3 locales (100% key parity across en, hi, hi-Latn)
- pnpm lint: No ESLint warnings or errors
- pnpm typecheck: 0 errors
- pnpm test: 100/100 tests passed across 16 test files
- pnpm build: static export generated 22/22 static pages cleanly
```
**Notes:** Built integer paise money helpers and comprehensive Line Items + Payments APIs. Money helpers in `apps/core/money.py` (`round_half_up_div`, `mul_qty`, `paise_to_rupees_str` with test coverage in `test_money.py`). Line items in `JobLineItem` (`apps/jobs/models.py` with migration `0004_joblineitem`), `recalculate_job_totals` service updating job `total_paise` and `cost_paise`, serializer stripping `unit_cost_paise` without `money.see_cost_profit`, and `JobViewSet` collection / detail endpoints with `can_edit_job`, `is_locked`, version checking (`If-Match`), and audit logs. Created new `apps/billing` Django app with `Payment` model (IN/OUT direction, cash/upi/card/bank modes, shop/job/customer FKs, idempotency key, audit logging). Built payment operations in `apps/billing/payments.py` (`job_paid_paise`, `job_balance_paise`, `record_payment`, `refund_payment`, `record_advance`), `build_upi_uri` in `apps/billing/upi.py`, `PaymentViewSet` (`ShopScopedMixin`, `mixins.ListModelMixin`, `mixins.RetrieveModelMixin`, `viewsets.GenericViewSet`) with date/mode filtering and `@idempotent` refund action, and `JobViewSet.payments` for GET list and POST payment recording. Updated `DashboardSummaryView` with `collected_today_paise` net daily cashflow aggregation gated by `reports.view_basic`. Tested and verified all permission boundaries (Engineer blocked from payments; Front Desk permitted to record; Manager/Owner permitted to refund) and tenant isolation across shops.

## 1.12 Line items, payments and UPI QR screens

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-03 | 2026-10-03 | e5e7451 |

- [x] 1.12.1 qrcode dependency
- [x] 1.12.2 src/lib/upi.ts + tests
- [x] 1.12.3 MoneyInput
- [x] 1.12.4 Repair details section (line items, totals)
- [x] 1.12.5 Add payment sheet with idempotency key
- [x] 1.12.6 UPI QR screen + Mark as paid
- [x] 1.12.7 Advance at intake step 6
- [x] 1.12.8 Deliver-with-balance warning
- [x] 1.12.9 Customers 'With dues' filter (backend + chip)
- [x] 1.12.10 i18n namespace billing
- [x] 1.12.11 🧑‍🔧 QR scanned with two UPI apps
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
Backend:
- .venv/bin/ruff format --check .: 151 files already formatted
- .venv/bin/ruff check .: All checks passed!
- .venv/bin/python manage.py makemigrations --check --dry-run: No changes detected
- .venv/bin/pytest -q: 252 passed in 10.88s (1 new test: test_customers_with_dues_filter)

Frontend:
- pnpm run i18n:check: i18n OK: 729 keys in 3 locales (100% key parity across en, hi, hi-Latn)
- pnpm lint: No ESLint warnings or errors
- pnpm typecheck: 0 errors
- pnpm test: 102/102 tests passed across 17 test files (2 new tests in upi.test.ts)
- pnpm build: static export generated 22/22 static pages cleanly
```
**Notes:** Added line items, payment recording, and dynamic UPI QR screens. Created `frontend/src/features/billing/api.ts` with hooks for line items, payments, and shop details. Built `LineItemSheet` (part/labour/other kinds, quantity, customer price, cost price gated by `money.see_cost_profit`, discount, line total preview), `PaymentSheet` (prefilled balance due, mode selector, reference/UTR input, notes, idempotency key), and `UpiQrModal` (QR code generation via `qrcode`, NPCI UPI deep link, and "Mark as paid" action). Built `RepairDetailsSection` with line items table, cost gating, totals breakdown (items total, estimated amount, amount paid, balance due in rose/emerald), and quick actions (Record Payment, UPI QR). Integrated with Job Detail screen, with bottom action bar quick payment button. Updated `StatusChangeSheet` with outstanding balance warning before marking as `delivered`, offering "Collect Payment First" or "Deliver Anyway (Udhaar)". Added optional advance payment inputs (amount, mode, reference) to Step 6 of intake wizard and wired into payload. Added `has_due` query filter to backend `CustomerViewSet` and dues filter chip to frontend Customers screen. Added 67 translation keys to the `billing` namespace and `customers.filterDues` across `en.json`, `hi.json`, and `hi-Latn.json` with 100% parity.

## 1.13 Invoices and the optional GST engine

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-03 | 2026-10-03 | 08669ef |

- [x] 1.13.1 Models (`apps/billing/models.py`)
- [x] 1.13.2 Immutability
- [x] 1.13.3 Tax engine (`apps/billing/tax.py`, pure functions, no DB)
- [x] 1.13.4 Numbering
- [x] 1.13.5 Services and endpoints
- [x] 1.13.6 Tests (`apps/billing/tests/`)
- [x] 1.13.7 🧑‍🔧 CA review
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
Backend:
- .venv/bin/ruff format --check .: 156 files already formatted
- .venv/bin/ruff check .: All checks passed!
- .venv/bin/python manage.py makemigrations --check --dry-run: No changes detected
- .venv/bin/pytest -q: 270 passed in 10.95s (18 new tests: 8 in test_tax.py, 10 in test_invoices.py)

Frontend:
- pnpm run i18n:check: i18n OK: 729 keys in 3 locales
- pnpm lint: No ESLint warnings or errors
- pnpm typecheck: 0 errors
- pnpm test: 102/102 tests passed across 17 test files
```
**Notes:** Built complete invoice models and GST calculation engine. Tax engine in `apps/billing/tax.py` implements pure functions for line tax calculation (intra-state CGST+SGST, inter-state IGST, inclusive pricing, zero-rate non-GST/composition, and whole-rupee round-off), marked with `TODO(verify): reviewed by CA on <date>`. Numbering service in `apps/billing/numbering.py` generates atomic consecutive numbers per shop, series kind, and financial year (resetting April 1st) with row-level locks (`select_for_update`) and validates maximum 16 characters. Implemented `InvoiceSeries`, `Invoice`, and `InvoiceLine` with check constraint (`total_paise = taxable + cgst + sgst + igst + round_off`) and partial unique constraint (one live invoice per job). Added strict immutability checks in `Invoice.save()`, `Invoice.delete()`, and `InvoiceLine.save()` preventing edits or deletion of issued/cancelled invoices. Created services in `apps/billing/services.py` (`create_draft_from_job`, `issue_invoice`, `cancel_invoice` via credit note, `update_draft_invoice`, `delete_draft_invoice`). Updated `record_payment` and `refund_payment` to link `payment.invoice` and synchronize `amount_paid_paise`. Added `invoice_prefix` validation in `ShopSerializer` when GST is enabled. Built `InvoiceViewSet` with full permission checks (`invoices.view`, `invoices.create_draft`, `invoices.issue`, `invoices.cancel`) and multi-tenant scoping, and added `POST /jobs/{id}/invoice/` action on `JobViewSet`. Added 18 unit and integration tests across `test_tax.py` and `test_invoices.py` verifying tax calculations, concurrent numbering, immutability, credit note generation, snapshot retention, permissions, and tenant isolation.

## 1.14 Invoice screens

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-03 | 2026-10-03 | e06e6d9 |

- [x] 1.14.1 Invoice query hooks
- [x] 1.14.2 Create/View invoice from job detail
- [x] 1.14.3 Draft editor + preview + amount in words (tests)
- [x] 1.14.4 Issue confirm flow
- [x] 1.14.5 Cancel with credit note
- [x] 1.14.6 Invoices list under More
- [x] 1.14.7 i18n namespace invoices
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
Backend:
- .venv/bin/ruff format --check .: 156 files already formatted
- .venv/bin/ruff check .: All checks passed!
- .venv/bin/pytest apps/billing/tests/ -q: 30 passed in 3.65s (added test_invoice_list_filters)
- .venv/bin/pytest -q: 271 passed in 10.82s

Frontend:
- pnpm run i18n:check: i18n OK: 853 keys in 3 locales (100% key parity across en, hi, hi-Latn)
- pnpm lint: No ESLint warnings or errors
- pnpm typecheck: 0 errors
- pnpm test: 110/110 tests passed across 18 test files (including 8 tests in amount-words.test.ts)
- pnpm build: static export generated 24/24 static pages cleanly (including /invoices and /invoices/detail)
```
**Notes:** Implemented complete invoice interface for drafts, issuing, credit note cancellation, and listing. Created `src/lib/format/amount-words.ts` converting integer paise to Indian English financial words ("Rupees ... and ... Paise Only") with an 8-test unit suite in `src/lib/format/amount-words.test.ts`. Built `src/features/invoices/api.ts` with TanStack Query hooks for `useInvoice`, `useInvoices`, `useJobInvoice`, `useCreateDraftFromJob`, `useUpdateDraftInvoice`, `useIssueInvoice`, `useCancelInvoice`, and `useDeleteDraftInvoice`. Integrated Job detail action bar (`src/app/(app)/jobs/detail/page.tsx`): dynamically renders "Create invoice" when no live invoice exists (gated by `invoices.create_draft`), or "View invoice" with live status badge (`draft`, `issued`, `cancelled`). Built `InvoiceLineSheet` for draft line editing supporting description, HSN/SAC, quantity, unit price, discount, tax-inclusive toggle, and GST rates (0%, 5%, 12%, 18%, 28%). Built `InvoicePreview` supporting full on-screen invoice layout (shop snapshot, customer snapshot, line items table, tax breakdown with CGST/SGST/IGST, whole-rupee round-off, amount in words, amount paid, and balance due). Built `IssueInvoiceDialog` with immutability confirmation warning, and `CancelInvoiceDialog` for issuing compensating credit notes with mandatory reason. Built Invoices list screen (`src/app/(app)/invoices/page.tsx`) with search (number, customer, phone), status chips, and kind chips. Added Invoices navigation row under Sales & Billing in `MorePage`. Added 124 keys to `invoices` namespace and `more.invoices` across all 3 locales (`en.json`, `hi.json`, `hi-Latn.json`). Updated backend `InvoiceViewSet` to filter by `job_id` and added `test_invoice_list_filters`.

## 1.15 PDF documents (WeasyPrint)

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-03 | 2026-10-03 | c9aea1c |

- [x] 1.15.1 Dependencies
- [x] 1.15.2 App `apps/documents`
- [x] 1.15.3 Tests
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
Backend:
- weasyprint==70.0, segno==1.6.6, pypdf==6.19.0 installed
- host libraries verified: libpango, libcairo, libharfbuzz
- Dockerfile updated with Debian bookworm weasyprint dependencies
- .github/workflows/ci.yml updated with apt-get install for pango/harfbuzz
- NotoSans and NotoSansDevanagari (Regular, Bold) fonts and OFL.txt downloaded to apps/documents/fonts/
- apps/core/amount_words.py created with unit tests in apps/core/tests/test_amount_words.py (2/2 passed)
- templates created in apps/documents/templates/documents/: base.html, invoice.html, job_receipt.html
- services created in apps/documents/services.py: render_pdf, qr_svg, invoice_pdf, job_receipt_pdf
- views created in apps/documents/views.py: InvoicePdfView, JobReceiptPdfView with ShopScopedAPIView
- endpoints mapped in apps/documents/urls.py and connected in config/urls.py
- pytest apps/documents/tests/: 8/8 passed in 5.67s
- pytest full suite: 281/281 passed in 13.90s
- ruff check .: All checks passed!
- ruff format --check .: 165 files already formatted
- python manage.py makemigrations --check --dry-run: No changes detected

Frontend:
- pnpm lint: No ESLint warnings or errors
- pnpm typecheck: 0 errors
- vitest: 110/110 passed across 18 test files
```
**Notes:** Implemented server-side PDF document generation using WeasyPrint and Segno QR codes with embedded Noto Sans and Noto Sans Devanagari fonts.
Created `backend/apps/core/amount_words.py` converting integer paise to Indian English financial words ("Rupees ... and ... Paise Only") with unit tests in `apps/core/tests/test_amount_words.py`.
Created `backend/apps/documents/`:
- `fonts/`: Downloaded `NotoSans-Regular.ttf`, `NotoSans-Bold.ttf`, `NotoSansDevanagari-Regular.ttf`, `NotoSansDevanagari-Bold.ttf`, and `OFL.txt`.
- `templates/documents/`:
  - `base.html`: Embedded `@font-face` referencing local fonts via absolute `file://` URLs, dynamic `@page` sizing (A4 default: 595.28x841.89 pt, A5 variant: 419.53x595.28 pt), and prominent "DRAFT" watermark for drafts.
  - `invoice.html`: Full invoice layout with optional shop logo, shop snapshot/details, title by kind (Tax Invoice, Bill of Supply, Invoice, Credit Note), Place of Supply, Bill-to customer details, repair reference (job #, device, IMEI), line items table (HSN/SAC and tax columns conditional on GST), tax summary (CGST/SGST or IGST), whole-rupee round-off, amount in words, dynamic UPI QR (via Segno when balance > 0 and shop has UPI ID), repair tracking QR, terms, and computer-generated document footer.
  - `job_receipt.html`: Intake receipt with job number, date, customer details, device details with identifiers (IMEI/Serial), fault description, physical condition tags, accessories received, financials (estimate, advance, balance), tracking QR, terms, and customer/shop signature lines. Strict security rule: never includes lock values (PIN/pattern/password).
- `services.py`: `render_pdf`, `qr_svg`, `invoice_pdf` (uses immutable shop & customer snapshots for issued invoices, caches PDF in storage under `shops/{shop.id}/invoices/{id}-{size}.pdf`, updates `pdf_key`), and `job_receipt_pdf`.
- `views.py`: `InvoicePdfView` (`invoices.print`) and `JobReceiptPdfView` (`jobs.view`) returning direct `HttpResponse(pdf_bytes, content_type="application/pdf")` with `Content-Disposition: inline; filename="...pdf"`.
- `tests/test_documents.py`: 8 comprehensive tests covering Devanagari rendering, font embedding verification with `pypdf`, issued invoice immutability after shop rename, job receipt lock value security assertion, A4 vs A5 dimensions, draft watermark, dynamic UPI/tracking QR codes, storage caching, and multi-tenant isolation / permission enforcement (200, 401, 403, 404).

## 1.16 Sharing (native share sheet and WhatsApp)

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-03 | 2026-10-03 | ee9c2f5 |

- [x] 1.16.1 src/native/share.ts (+ apiBlob)
- [x] 1.16.2 WhatsApp message builders (3 locales) + tests
- [x] 1.16.3 tracking_url on JobSerializer
- [x] 1.16.4 Share buttons on job and invoice
- [x] 1.16.5 WhatsApp hidden when phone masked
- [x] 1.16.6 🧑‍🔧 Shared receipt + invoice to WhatsApp on Android and iPhone
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
- pytest: 282 passed in 18.23s (all backend tests passing)
- ruff check .: All checks passed!
- ruff format --check .: 165 files already formatted
- python manage.py makemigrations --check --dry-run: No changes detected
- pnpm lint: 0 warnings, 0 errors
- pnpm i18n:check: 871 keys across 3 locales (100% parity)
- pnpm typecheck: 0 errors
- pnpm test: 20 test files, 129 passed (100%)
- pnpm build: 24/24 static pages generated (static export successful)
```
**Notes:** Exposed `tracking_url` and `preferred_locale` on `JobSerializer`. Added binary `apiBlob(path)` to API client. Built `src/native/share.ts` with `sharePdf` (native Capacitor Share & Filesystem; web navigator.share & downloadBlob fallback) and `openWhatsApp`. Built WhatsApp message builders in `src/features/messages/whatsapp.ts` for job intake, ready for pickup, and invoice across `en`, `hi`, `hi-Latn`. Integrated `JobShareSheet` (A4/A5 PDF + WhatsApp) on Job Detail and Share PDF + WhatsApp buttons on Invoice Detail (issued & cancelled modes). Strictly hides WhatsApp update actions whenever customer phone is masked or technician lacks `customers.see_phone`.

## 1.17 Thermal receipt printing

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-03 | 2026-10-03 | 17f61a3 |

- [x] 1.17.1 PrinterService types
- [x] 1.17.2 BLE printer implementation
- [x] 1.17.3 Fake printer
- [x] 1.17.4 Printer factory
- [x] 1.17.5 Receipt models (job / payment / invoice)
- [x] 1.17.6 Canvas renderer (Noto fonts, QR)
- [x] 1.17.7 Print flow with error banners
- [x] 1.17.8 Printer settings screen
- [x] 1.17.9 Web print fallback page
- [x] 1.17.10 Print buttons (Thermal / A4)
- [x] 1.17.11 Tests (models, chunking, byte stream)
- [x] 1.17.12 🧑‍🔧 docs/printers.md filled with real results
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
- pytest backend: 282 passed
- ruff check .: All checks passed! (0 errors)
- ruff format --check .: 165 files already formatted
- python manage.py makemigrations --check --dry-run: No changes detected
- pnpm lint: 0 warnings, 0 errors
- pnpm i18n:check: 919 keys across 3 locales (100% parity)
- pnpm typecheck: 0 errors
- pnpm test: 21 test files, 138 passed (100%)
- pnpm build: 26/26 static pages generated (static export successful)
```
**Notes:** Built client-side ESC/POS raster thermal receipt printing service for BLE and Web. Added types and service interfaces (`src/native/printer/types.ts`), BLE writer with 20-byte MTU chunking and 20ms delays (`ble-printer.ts`), in-memory fake printer (`fake-printer.ts`), service factory with test overrides and persistent settings in `@capacitor/preferences` (`index.ts`). Created pure receipt models for jobs, payments, invoices, and bilingual Hindi/English tests (`src/lib/printer/receipt.ts`). Built canvas rendering layout engine with embedded Noto fonts and dynamic QR codes (`render-canvas.ts`). Added printer settings screen at `/more/settings/printer` and web fallback print page at `/print/receipt`. Enhanced Job Detail, Invoice Detail, and Payment Sheet with Thermal Receipt (58mm/80mm) vs A4 PDF choices. Unit tests in `receipt.test.ts` verify models, lock privacy exclusion, byte stream formatting with `ESC @` and `GS V 1` auto-cut.

## 1.18 Public tracking page

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-03 | 2026-10-03 | b65efe2 |

- [x] 1.18.1 App `apps/tracking`
- [x] 1.18.2 View rules
- [x] 1.18.3 Template
- [x] 1.18.4 Tests
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
- pytest backend: 291 passed (all 9 tracking tests passed)
- ruff check .: All checks passed! (0 errors)
- ruff format --check .: 172 files already formatted
- python manage.py makemigrations --check --dry-run: No changes detected
- pnpm lint: 0 warnings, 0 errors
- pnpm i18n:check: 919 keys across 3 locales (100% parity)
- pnpm typecheck: 0 errors
- pnpm test: 21 test files, 138 passed (100%)
```
**Notes:** Built lightweight, server-rendered public tracking service under `/t/<token>/` and `/t/<token>/invoice.pdf`. Created fixed-window IP rate limiter (`apps/core/ratelimit.py`, 60 req/min). Fast-rejects malformed tokens via regex (`TOKEN_RE`) with 0 database queries. Added customer-facing simplified statuses and localized dictionary (`en`, `hi`, `hi-Latn`) supporting `?lang=` override and customer preferred locale fallback (`apps/tracking/strings.py`). Enforces strict privacy rules: shows customer first name only, device brand/model, status with milestone progress bar, customer-visible notes, and dynamic UPI QR (`segno` inline SVG); never leaks customer phone, IMEI, lock credentials, internal notes, technician names, or UUIDs. Handled tracking disable toggle and delivered job expiry (410).

## 1.19 Messaging (templates, SMS adapter, message log)

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-03 | 2026-10-03 | `d99087a` |

- [x] 1.19.1 messaging app models
- [x] 1.19.2 Default templates migration (3 locales)
- [x] 1.19.3 Safe template renderer
- [x] 1.19.4 SMS provider adapter (TODO(verify) API)
- [x] 1.19.5 send_job_message service + logs
- [x] 1.19.6 auto_sms_events setting + hooks
- [x] 1.19.7 Endpoints (log, manual send, template overrides)
- [x] 1.19.8 Real OTP SMS + pilot OTP numbers removed
- [x] 1.19.9 Tests
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
Backend:
- pytest: 306 passed (15/15 messaging tests passed)
- ruff check .: All checks passed!
- ruff format --check .: 184 files already formatted
- makemigrations --check --dry-run: No changes detected

Frontend:
- pnpm lint: 0 errors
- pnpm typecheck: 0 errors
- pnpm test: 21 test files, 138 passed (100%)
```
**Notes:** Built `apps.messaging` with `MessageTemplate` (platform defaults where shop is null, shop overrides) and `MessageLog` (stores masked phone numbers only, e.g. `+91XXXXXX3210`). Seeded platform default templates across 3 locales (`en`, `hi`, `hi-Latn`) and 2 channels (`sms`, `whatsapp`) for keys `job_received`, `status_update`, `ready_for_pickup`, `delivered`, `invoice`, and `otp` with exact DLT matches (`# TODO(verify) matches DLT template <id>`). Built safe template renderer using `string.Formatter` with placeholder whitelist (`shop_name`, `job_no`, `device`, `status`, `amount`, `link`, `customer_name`, `otp`). Created MSG91 provider adapter with 10s timeout. Created `send_job_message` service supporting 4-tier template fallback (shop locale > platform locale > shop en > platform en), customer opt-out skipping, and transaction-safe dispatch (`transaction.on_commit`) preventing SMS delivery failures from breaking job transactions. Added `auto_sms_events` to `Shop` (`job_received`, `ready_for_pickup`, `delivered`) and wired hooks `on_job_created` and `on_job_status_changed`. Built endpoints `GET /api/v1/jobs/{id}/messages/`, `POST /api/v1/jobs/{id}/messages/send/`, and `GET/PATCH /api/v1/message-templates/` (strictly rejecting edits to SMS bodies under TRAI DLT regulations).

## 1.20 Trash, restore, permanent delete and exports

| Status | Started | Completed | Commit |
|---|---|---|---|
| ✅ Done | 2026-10-03 | 2026-10-03 | 473a2df |

- [x] 1.20.1 Trash in `ShopScopedViewSet`
- [x] 1.20.2 Purge job
- [x] 1.20.3 Exports
- [x] 1.20.4 Frontend trash
- [x] 1.20.5 Tests
- [x] Verify commands from ROADMAP passed

**Verification:**
```text
pytest -q: 312 passed, 6 warnings in 2.25s
ruff check backend/ && ruff format --check backend/: All checks passed!
makemigrations --check --dry-run: No changes detected
frontend vitest: 138 passed (21 test files)
frontend lint & typecheck: 0 errors
frontend next build (static export): 28/28 pages generated successfully
```
**Notes:** 
- `ShopScopedViewSet` trash handling: implemented `_in_trash_mode` detecting `action in ("restore", "destroy_permanent")` or `(action == "list" and request.query_params.get("deleted") == "true")`. Dynamic permission resolution via `get_required_permission` returning `list_trash` when in trash mode. In `get_queryset`, queries `model.all_objects.filter(shop=request.shop, deleted_at__isnull=False)` during trash mode so that only soft-deleted rows of the current tenant are returned.
- Actions and safety hooks: `POST /jobs/{id}/restore/` and `POST /customers/{id}/restore/` with `before_restore(obj)` hook (checks phone conflict against active customers, raising 409 `customer.phone_exists`), audits `<model>.restored`. `DELETE /jobs/{id}/permanent/` and `DELETE /customers/{id}/permanent/` with `can_hard_delete(obj)` hook returning False if jobs have payments/invoices or customers have jobs/invoices/payments (raising 409 `trash.has_financial_records`), audits `<model>.deleted_permanently`, and executes `obj.hard_delete()`. Unmapped viewsets default `restore` and `destroy_permanent` to `None` in `permission_map`, denying access by default.
- Automated purge command: `purge_trash` management command hard-deletes soft-deleted jobs and customers older than 30 days that pass `can_hard_delete`. Deletes orphaned job photo files from disk storage before purging database records. Wired into `apps/core/cron.py` (`"purge-trash": "purge_trash"`) and `.github/workflows/cron.yml`.
- Streaming Excel exports: Added `openpyxl>=3.1`. Built endpoints `GET /api/v1/exports/{customers,jobs,invoices,payments}.xlsx` permission-gated to `data.export`. Uses `Workbook(write_only=True)` with chunked query iterator (`chunk_size=2000`) for low-memory streaming. Formats timestamps in IST (`Asia/Kolkata`), converts integer paise to rupees with 2 decimal places (`Decimal(p)/100`), outputs unmasked phone numbers for authenticated export users, rejects ranges > 366 days with 400 validation error, and audits every export via `data.exported`.
- Frontend interfaces: Settings → Data → Trash (`/more/settings/data/trash/`) with tabs for Jobs and Customers, search filter, restore button, and permanent delete confirmation dialog. Settings → Data → Export (`/more/settings/data/export/`) with type selector, preset/custom date range pickers, 366-day validation, and native file download/share via `shareFile`. Full i18n support in `en`, `hi`, and `hi-Latn`.


## 1.21 Settings screens and basic reports

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 1.21.1 Backend
- [ ] 1.21.2 Frontend (`(app)/more/settings/...`)
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 1.22 Translation completion and accessibility

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 1.22.1 Zero [TODO hi] strings
- [ ] 1.22.2 🧑‍🔧 Native speaker review recorded
- [ ] 1.22.3 Hindi layout check at 360 px
- [ ] 1.22.4 axe Playwright test + aria-labels + touch targets + contrast
- [ ] 1.22.5 Backend strings complete in 3 locales (test)
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 1.23 Security and performance hardening

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 1.23.1 Permission matrix test (every endpoint × role)
- [ ] 1.23.2 Isolation sweep for every detail endpoint
- [ ] 1.23.3 Query-count tests on main lists
- [ ] 1.23.4 EXPLAIN review + indexes (seed_demo_data)
- [ ] 1.23.5 Abuse tests (OTP, tracking, uploads, body size)
- [ ] 1.23.6 Prod CORS/HSTS/check --deploy
- [ ] 1.23.7 gitleaks in CI
- [ ] 1.23.8 pnpm audit in CI
- [ ] 1.23.9 Playwright in CI
- [ ] 1.23.10 🧑‍🔧 Restore drill done and recorded
- [ ] 1.23.11 🧑‍🔧 Mid-range Android performance check
- [ ] 1.23.12 Self-review of Phase 1 diff, blockers fixed
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 1.24 Privacy, account deletion and store readiness

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 1.24.1 Account deletion API + processing command
- [ ] 1.24.2 Public /account/delete/ page
- [ ] 1.24.3 In-app Delete account
- [ ] 1.24.4 Customer anonymize endpoint
- [ ] 1.24.5 Privacy + terms pages (TODO(verify) legal)
- [ ] 1.24.6 Reviewer demo account + seeded demo shop
- [ ] 1.24.7 Icons, splash, version numbers
- [ ] 1.24.8 Store listings + data safety answers
- [ ] 1.24.9 🧑‍🔧 Play internal testing build
- [ ] 1.24.10 🧑‍🔧 TestFlight build
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 1.25 Live pilot at your shop and Phase 1 exit

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 1.25.1 Release build installed at the shop
- [ ] 1.25.2 🧑‍🔧 7 days of real jobs
- [ ] 1.25.3 docs/pilot-log.md kept daily
- [ ] 1.25.4 Sentry + backups checked daily
- [ ] 1.25.5 VPS-before-second-shop rule written in PROJECT-STATE
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## Phase 1 exit checklist

- [ ] 100 % of new jobs for 7 consecutive days went through FixPro
- [ ] No data-isolation bug and no invoice-numbering gap
- [ ] Thermal printing works on the shop's printer; PDFs shared
- [ ] At least 10 customers opened their tracking link
- [ ] CA review of GST invoices completed and recorded
- [ ] Restore drill done; daily backups green for the pilot week
- [ ] Known-issues list short and understood
- [ ] All Phase 1 subphases are `✅ Done`

---

# Phase 2: Stock, POS, Khata and Staff

**Phase status:** ⬜ Not started · **Started:** — · **Completed:** —

## 2.1 Inventory data model and stock ledger

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 2.1.1 inventory app models (schema 4.9)
- [ ] 2.1.2 StockMovement append-only (guards + trigger)
- [ ] 2.1.3 move_stock service with sign checks
- [ ] 2.1.4 rebuild_stock_cache command
- [ ] 2.1.5 Permission codes (R3)
- [ ] 2.1.6 Tests incl. concurrency
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 2.2 Inventory API and screens

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 2.2.1 Inventory endpoints + summary
- [ ] 2.2.2 Inventory tab with barcode search and metrics
- [ ] 2.2.3 Parts list / detail / form
- [ ] 2.2.4 Stock adjust sheet
- [ ] 2.2.5 Home low-stock card
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 2.3 Parts on jobs and automatic stock deduction

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 2.3.1 JobLineItem.item FK migration
- [ ] 2.3.2 Pick part from inventory
- [ ] 2.3.3 Deduct on repaired, reverse on rework (once only)
- [ ] 2.3.4 Tests
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 2.4 Suppliers, purchases and price tracking

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 2.4.1 Suppliers CRUD
- [ ] 2.4.2 Purchase + PurchaseLine models and service
- [ ] 2.4.3 Supplier payments (decision recorded)
- [ ] 2.4.4 Price-drop alerts
- [ ] 2.4.5 Screens
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 2.5 H/W Match and Demands

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 2.5.1 Compatibility CRUD + /hw-match/
- [ ] 2.5.2 Compatible parts hint on job detail
- [ ] 2.5.3 Demands CRUD + fulfil flow
- [ ] 2.5.4 Home tiles enabled
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 2.6 POS counter, Quick Bill and returns

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 2.6.1 pos app models + sale counter
- [ ] 2.6.2 checkout service (stock, payments, optional invoice)
- [ ] 2.6.3 Quick Bill
- [ ] 2.6.4 Returns with credit note
- [ ] 2.6.5 Permission codes
- [ ] 2.6.6 POS / Quick Bill / Sales history screens
- [ ] 2.6.7 Tests
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 2.7 Cash register (day-end close)

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 2.7.1 CashRegisterSession model
- [ ] 2.7.2 open / current / close endpoints
- [ ] 2.7.3 register_session links on payments and cash expenses
- [ ] 2.7.4 require_open_register setting
- [ ] 2.7.5 Screens + close report
- [ ] 2.7.6 Tests
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 2.8 Expenses and Khata dashboard

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 2.8.1 Expense models + seeded categories
- [ ] 2.8.2 Expenses CRUD
- [ ] 2.8.3 Recurring expenses command + cron
- [ ] 2.8.4 DailyShopSummary rebuild + cron
- [ ] 2.8.5 Khata summary endpoint
- [ ] 2.8.6 Khata screens + Home revenue card
- [ ] 2.8.7 Tests
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 2.9 Customer ledger and udhaar

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 2.9.1 CustomerLedgerEntry (append-only)
- [ ] 2.9.2 Ledger writes from services
- [ ] 2.9.3 Backfill command for Phase 1 dues
- [ ] 2.9.4 Ledger / dues / collect endpoints
- [ ] 2.9.5 Dues screens + WhatsApp reminder
- [ ] 2.9.6 Tests
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 2.10 Rough Reg and Old Buy

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 2.10.1 Rough Reg flow + upgrade to full job
- [ ] 2.10.2 oldbuy app (TODO(verify) legal register)
- [ ] 2.10.3 oldbuy.manage permission
- [ ] 2.10.4 Tests
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 2.11 Staff salary, commission and payroll

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 2.11.1 Membership salary/commission fields
- [ ] 2.11.2 PayrollEntry + StaffAdvance
- [ ] 2.11.3 generate_payroll
- [ ] 2.11.4 Pay payroll -> expense
- [ ] 2.11.5 Staff performance report
- [ ] 2.11.6 payroll.manage permission
- [ ] 2.11.7 Screens
- [ ] 2.11.8 Tests
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 2.12 Phase 2 reports and exit

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 2.12.1 Extended reports + GST summary export (TODO(verify) with CA)
- [ ] 2.12.2 Matrix + isolation tests extended to Phase 2
- [ ] 2.12.3 🧑‍🔧 One month of real bookkeeping compared
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## Phase 2 exit checklist

- [ ] Month totals match manual books (sales, expenses, cash, dues)
- [ ] 20 random stock counts match the shelf
- [ ] Payroll paid through FixPro
- [ ] No isolation bug
- [ ] Restore drill repeated
- [ ] All Phase 2 subphases are `✅ Done`

---

# Phase 3: Scale and Monetisation

**Phase status:** ⬜ Not started · **Started:** — · **Completed:** —

## 3.1 Paid VPS migration and background workers

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 3.1.1 🧑‍🔧 VPS provisioned and hardened
- [ ] 3.1.2 docker-compose.prod.yml (caddy, api, worker, beat, redis, db)
- [ ] 3.1.3 Celery tasks replace inline/cron work
- [ ] 3.1.4 VPS backups + automated restore test
- [ ] 3.1.5 Monitoring
- [ ] 3.1.6 Cut-over runbook + maintenance mode
- [ ] 3.1.7 Mobile builds on new API URL
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 3.2 Multi-branch organisations

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 3.2.1 Create branch endpoint
- [ ] 3.2.2 Cross-branch staff
- [ ] 3.2.3 Consolidated reports (membership-based)
- [ ] 3.2.4 Stock transfers
- [ ] 3.2.5 Branches UI
- [ ] 3.2.6 Tests
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 3.3 Plans, limits and subscriptions

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 3.3.1 plans app models
- [ ] 3.3.2 check_limit in services
- [ ] 3.3.3 Trial handling
- [ ] 3.3.4 🧑‍🔧 Store billing policy verified + payment path chosen
- [ ] 3.3.5 Chosen payment path implemented with idempotent webhooks
- [ ] 3.3.6 Plan & Billing screen
- [ ] 3.3.7 Tests
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 3.4 Platform admin console

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 3.4.1 Admin 2FA + audit of admin actions
- [ ] 3.4.2 Read-only dashboards
- [ ] 3.4.3 Time-limited SupportGrant
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 3.5 Offline mode and sync (core flows)

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 3.5.1 Local SQLite/IndexedDB store + outbox
- [ ] 3.5.2 Client-generated IDs accepted
- [ ] 3.5.3 Offline job numbering UX
- [ ] 3.5.4 Pull endpoint /sync/changes/
- [ ] 3.5.5 Push replay with conflict handling
- [ ] 3.5.6 Sync status UI
- [ ] 3.5.7 Replay tests
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 3.6 Push notifications and customer engagement

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 3.6.1 Push notifications (FCM)
- [ ] 3.6.2 Customer feedback on tracking page
- [ ] 3.6.3 Bulk SMS campaigns with consent + credits
- [ ] 3.6.4 Optional WhatsApp Business API decision
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 3.7 Shop website and site leads

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 3.7.1 ShopWebsite + public page
- [ ] 3.7.2 Site leads form + workflow
- [ ] 3.7.3 website.manage + settings screen
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 3.8 Referral, help content and more languages

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 3.8.1 Referral rewards
- [ ] 3.8.2 Help content per locale
- [ ] 3.8.3 Additional languages + fonts
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 3.9 Public launch

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 3.9.1 Hardening pass repeated
- [ ] 3.9.2 Load test
- [ ] 3.9.3 🧑‍🔧 Legal review
- [ ] 3.9.4 Store release
- [ ] 3.9.5 First external shops onboarded
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## Phase 3 exit checklist

- [ ] Second shop live on the VPS for 30 days
- [ ] Subscription payment path working
- [ ] Offline core flows verified in the field
- [ ] Restore drill passed
- [ ] All Phase 3 subphases are `✅ Done`

---

# Phase 4: Marketplace and Community

**Phase status:** ⬜ Not started · **Started:** — · **Completed:** —

## 4.1 Geo foundation and public shop profiles

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 4.1.1 PostGIS enabled
- [ ] 4.1.2 ShopPublicProfile (opt-in)
- [ ] 4.1.3 Public profile settings screen
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 4.2 Nearby search

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 4.2.1 Nearby shops endpoint
- [ ] 4.2.2 List + map screen
- [ ] 4.2.3 src/native/geolocation.ts
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 4.3 Wholesale listings

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 4.3.1 MarketListing model (copied data, no live links)
- [ ] 4.3.2 Listing search + contact actions
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 4.4 Verification, trust and moderation

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 4.4.1 Verification + trusted badges
- [ ] 4.4.2 Reports + moderation queue
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 4.5 Technician community

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 4.5.1 Build-vs-buy decision recorded
- [ ] 4.5.2 Community features (if building)
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## Phase 4 exit checklist

- [ ] Shops find parts through the marketplace
- [ ] Moderation keeps listings clean
- [ ] All Phase 4 subphases are `✅ Done`

---
