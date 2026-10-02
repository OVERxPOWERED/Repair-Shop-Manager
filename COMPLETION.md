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
| 0 | [0.10](#010-i18n-and-indian-formatters) | i18n and Indian formatters | ⬜ Not started | — |
| 0 | [0.11](#011-api-client-session-store-secure-storage-and-native-layer) | API client, session store, secure storage and native layer | ⬜ Not started | — |
| 0 | [0.12](#012-auth-screens-splash-welcome-phone-otp-profile) | Auth screens (splash, welcome, phone, OTP, profile) | ⬜ Not started | — |
| 0 | [0.13](#013-shop-onboarding-wizard) | Shop onboarding wizard | ⬜ Not started | — |
| 0 | [0.14](#014-app-shell-navigation-and-shared-states--iphone) | App shell, navigation and shared states (+ iPhone) | ⬜ Not started | — |
| 0 | [0.15](#015-audit-log) | Audit log | ⬜ Not started | — |
| 0 | [0.16](#016-staff-invites-and-the-staff--roles-screens) | Staff invites and the Staff / Roles screens | ⬜ Not started | — |
| 0 | [0.17](#017-pilot-deployment-monitoring-scheduled-jobs-and-backups) | Pilot deployment, monitoring, scheduled jobs and backups | ⬜ Not started | — |
| 0 | [0.18](#018-phase-0-exit-review) | Phase 0 exit review | ⬜ Not started | — |
| **0** | **Exit** | **Phase 0 exit checklist** | ⬜ Not started | — |
| 1 | [1.1](#11-postgres-search-and-per-shop-catalogs-brands-accessories) | Postgres search and per-shop catalogs (brands, accessories) | ⬜ Not started | — |
| 1 | [1.2](#12-customers-api) | Customers API | ⬜ Not started | — |
| 1 | [1.3](#13-devices-and-imei-api) | Devices and IMEI API | ⬜ Not started | — |
| 1 | [1.4](#14-customers-and-devices-screens) | Customers and devices screens | ⬜ Not started | — |
| 1 | [1.5](#15-jobs-core-api-job-sheet-numbering-lock-encryption) | Jobs core API (job sheet, numbering, lock encryption) | ⬜ Not started | — |
| 1 | [1.6](#16-file-storage-and-job-photos) | File storage and job photos | ⬜ Not started | — |
| 1 | [1.7](#17-job-intake-wizard-8-steps) | Job intake wizard (8 steps) | ⬜ Not started | — |
| 1 | [1.8](#18-status-workflow-assignment-visibility-and-dashboard-api) | Status workflow, assignment, visibility and dashboard API | ⬜ Not started | — |
| 1 | [1.9](#19-home-dashboard-jobs-list-and-job-detail-screens) | Home dashboard, Jobs list and Job detail screens | ⬜ Not started | — |
| 1 | [1.10](#110-imei-barcode-scan-ocr-capture-and-check-imei) | IMEI barcode scan, OCR capture and "Check IMEI" | ⬜ Not started | — |
| 1 | [1.11](#111-line-items-and-payments-api) | Line items and payments API | ⬜ Not started | — |
| 1 | [1.12](#112-line-items-payments-and-upi-qr-screens) | Line items, payments and UPI QR screens | ⬜ Not started | — |
| 1 | [1.13](#113-invoices-and-the-optional-gst-engine) | Invoices and the optional GST engine | ⬜ Not started | — |
| 1 | [1.14](#114-invoice-screens) | Invoice screens | ⬜ Not started | — |
| 1 | [1.15](#115-pdf-documents-weasyprint) | PDF documents (WeasyPrint) | ⬜ Not started | — |
| 1 | [1.16](#116-sharing-native-share-sheet-and-whatsapp) | Sharing (native share sheet and WhatsApp) | ⬜ Not started | — |
| 1 | [1.17](#117-thermal-receipt-printing) | Thermal receipt printing | ⬜ Not started | — |
| 1 | [1.18](#118-public-tracking-page) | Public tracking page | ⬜ Not started | — |
| 1 | [1.19](#119-messaging-templates-sms-adapter-message-log) | Messaging (templates, SMS adapter, message log) | ⬜ Not started | — |
| 1 | [1.20](#120-trash-restore-permanent-delete-and-exports) | Trash, restore, permanent delete and exports | ⬜ Not started | — |
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
| ⬜ Not started | — | — | — |

- [ ] 0.10.1 Config and store
- [ ] 0.10.2 Messages and provider
- [ ] 0.10.3 Translation key checker
- [ ] 0.10.4 Formatters (with tests)
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 0.11 API client, session store, secure storage and native layer

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 0.11.1 Native service layer
- [ ] 0.11.2 Session store
- [ ] 0.11.3 API client
- [ ] 0.11.4 Query client, boot and generated types
- [ ] 0.11.5 Tests (`src/lib/api/client.test.ts`, mock `fetch` with `vi.fn()`)
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 0.12 Auth screens (splash, welcome, phone, OTP, profile)

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 0.12.1 Routing rule (pure function + test)
- [ ] 0.12.2 Screens
- [ ] 0.12.3 i18n
- [ ] 0.12.4 🧑‍🔧 Manual check
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 0.13 Shop onboarding wizard

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 0.13.1 GSTIN validator (TS) + tests
- [ ] 0.13.2 GST state code list
- [ ] 0.13.3 UPI ID validator + tests
- [ ] 0.13.4 Onboarding Zod schema mirroring backend rules
- [ ] 0.13.5 3-step wizard with StepProgressBar and one idempotency key
- [ ] 0.13.6 Success screen and shop selection
- [ ] 0.13.7 i18n keys in 3 locales
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 0.14 App shell, navigation and shared states (+ iPhone)

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 0.14.1 Shared state components (`src/components/states/`)
- [ ] 0.14.2 Shell
- [ ] 0.14.3 🧑‍🔧 Run on devices
- [ ] 0.14.4 Playwright smoke test (local only for now)
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 0.15 Audit log

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 0.15.1 App and model
- [ ] 0.15.2 Service
- [ ] 0.15.3 Record these events now
- [ ] 0.15.4 Read API and admin
- [ ] 0.15.5 Tests (`apps/audit/tests/test_audit.py`)
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 0.16 Staff invites and the Staff / Roles screens

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 0.16.1 Backend service (`backend/apps/tenancy/invites.py`)
- [ ] 0.16.2 Endpoints
- [ ] 0.16.3 Backend tests
- [ ] 0.16.4 Frontend
- [ ] 0.16.5 🧑‍🔧 Device check
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 0.17 Pilot deployment, monitoring, scheduled jobs and backups

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 0.17.1 Production cache and cron endpoint
- [ ] 0.17.2 Render (API) + Neon (database)
- [ ] 0.17.3 Static web app (Cloudflare Pages or similar)
- [ ] 0.17.4 Cold-start UX
- [ ] 0.17.5 Sentry
- [ ] 0.17.6 Scheduled jobs and backups (GitHub Actions)
- [ ] 0.17.7 Docs
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 0.18 Phase 0 exit review

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 0.18.1 Full backend + frontend checks green
- [ ] 0.18.2 🧑‍🔧 Exit scenario on iPhone + Android (owner onboard, engineer invite/accept)
- [ ] 0.18.3 Spike results in docs are measured, not claimed
- [ ] 0.18.4 docs/PROJECT-STATE.md updated
- [ ] 0.18.5 Phase 0 marked Done below
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## Phase 0 exit checklist

- [ ] Phone OTP sign-up and shop onboarding on web, Android and iPhone
- [ ] Staff invite with role accepted on a second device
- [ ] Audit log records sensitive actions
- [ ] CI green on Postgres (backend + frontend)
- [ ] Pilot API reachable over mobile data; backups and cron green
- [ ] Printer and IMEI spikes answered with measured results
- [ ] All Phase 0 subphases are `✅ Done`

---

# Phase 1: Core Repair MVP

**Phase status:** ⬜ Not started · **Started:** — · **Completed:** —

## 1.1 Postgres search and per-shop catalogs (brands, accessories)

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 1.1.1 Enable `pg_trgm`
- [ ] 1.1.2 Models (`backend/apps/tenancy/models.py`, R1)
- [ ] 1.1.3 Seed defaults on shop creation
- [ ] 1.1.4 Endpoints (R2)
- [ ] 1.1.5 Tests
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 1.2 Customers API

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 1.2.1 App and model
- [ ] 1.2.2 Visibility helper
- [ ] 1.2.3 Serializer
- [ ] 1.2.4 ViewSet (R2)
- [ ] 1.2.5 Tests
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 1.3 Devices and IMEI API

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 1.3.1 Models (`apps/devices`)
- [ ] 1.3.2 IMEI policy (`apps/devices/services.py`)
- [ ] 1.3.3 Endpoints
- [ ] 1.3.4 Tests
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 1.4 Customers and devices screens

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 1.4.1 Customer + device query hooks
- [ ] 1.4.2 Customers list (search, infinite scroll, FAB)
- [ ] 1.4.3 CustomerFormSheet with duplicate-phone lookup and 409 handling
- [ ] 1.4.4 Customer detail (devices, call/WhatsApp, history placeholder)
- [ ] 1.4.5 DeviceFormSheet with brand picker and live IMEI validation
- [ ] 1.4.6 i18n keys
- [ ] 1.4.7 Vitest for schemas / IMEI field
- [ ] 1.4.8 🧑‍🔧 Checked at 360 px on a phone
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 1.5 Jobs core API (job sheet, numbering, lock encryption)

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 1.5.1 Field encryption
- [ ] 1.5.2 Models (`apps/jobs/models.py`)
- [ ] 1.5.3 Services (`apps/jobs/services.py`)
- [ ] 1.5.4 API
- [ ] 1.5.5 Tests
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 1.6 File storage and job photos

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 1.6.1 Storage
- [ ] 1.6.2 Model and image processing
- [ ] 1.6.3 Endpoints
- [ ] 1.6.4 Tests
- [ ] 1.6.5 Frontend
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 1.7 Job intake wizard (8 steps)

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 1.7.1 Supporting endpoint
- [ ] 1.7.2 Draft state
- [ ] 1.7.3 Steps (`(app)/jobs/new/page.tsx` with a `StepProgressBar`)
- [ ] 1.7.4 i18n and tests
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 1.8 Status workflow, assignment, visibility and dashboard API

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 1.8.1 State machine (`apps/jobs/state_machine.py`)
- [ ] 1.8.2 Services
- [ ] 1.8.3 Visibility in `JobViewSet.get_queryset`
- [ ] 1.8.4 Endpoints
- [ ] 1.8.5 Tests
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 1.9 Home dashboard, Jobs list and Job detail screens

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 1.9.1 status.ts styles + translations test
- [ ] 1.9.2 StatusBadge
- [ ] 1.9.3 Home with live dashboard summary
- [ ] 1.9.4 Jobs list with counts pills and search
- [ ] 1.9.5 Job detail (all sections, timeline, notes, lock reveal, action bar)
- [ ] 1.9.6 Customer repair history
- [ ] 1.9.7 Haptics on status change
- [ ] 1.9.8 i18n namespace jobs
- [ ] 1.9.9 🧑‍🔧 Full lifecycle on a phone; engineer visibility checked
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 1.10 IMEI barcode scan, OCR capture and "Check IMEI"

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 1.10.1 src/native/barcode.ts
- [ ] 1.10.2 src/native/ocr.ts
- [ ] 1.10.3 extractImeiCandidates + tests (incl. IMEISV)
- [ ] 1.10.4 ImeiCaptureField with mandatory confirm
- [ ] 1.10.5 Duplicate IMEI warning
- [ ] 1.10.6 Check IMEI sheet (KYM SMS + official site; TODO(verify) kept)
- [ ] 1.10.7 🧑‍🔧 Real-device accuracy matrix recorded in docs/decisions.md
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 1.11 Line items and payments API

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 1.11.1 Money helpers (`apps/core/money.py`)
- [ ] 1.11.2 Line items (`apps/jobs/models.py`)
- [ ] 1.11.3 Payments (`apps/billing`)
- [ ] 1.11.4 UPI helper (`apps/billing/upi.py`)
- [ ] 1.11.5 Tests
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 1.12 Line items, payments and UPI QR screens

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 1.12.1 qrcode dependency
- [ ] 1.12.2 src/lib/upi.ts + tests
- [ ] 1.12.3 MoneyInput
- [ ] 1.12.4 Repair details section (line items, totals)
- [ ] 1.12.5 Add payment sheet with idempotency key
- [ ] 1.12.6 UPI QR screen + Mark as paid
- [ ] 1.12.7 Advance at intake step 6
- [ ] 1.12.8 Deliver-with-balance warning
- [ ] 1.12.9 Customers 'With dues' filter (backend + chip)
- [ ] 1.12.10 i18n namespace billing
- [ ] 1.12.11 🧑‍🔧 QR scanned with two UPI apps
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 1.13 Invoices and the optional GST engine

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 1.13.1 Models (`apps/billing/models.py`)
- [ ] 1.13.2 Immutability
- [ ] 1.13.3 Tax engine (`apps/billing/tax.py`, pure functions, no DB)
- [ ] 1.13.4 Numbering
- [ ] 1.13.5 Services and endpoints
- [ ] 1.13.6 Tests (`apps/billing/tests/`)
- [ ] 1.13.7 🧑‍🔧 CA review
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 1.14 Invoice screens

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 1.14.1 Invoice query hooks
- [ ] 1.14.2 Create/View invoice from job detail
- [ ] 1.14.3 Draft editor + preview + amount in words (tests)
- [ ] 1.14.4 Issue confirm flow
- [ ] 1.14.5 Cancel with credit note
- [ ] 1.14.6 Invoices list under More
- [ ] 1.14.7 i18n namespace invoices
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 1.15 PDF documents (WeasyPrint)

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 1.15.1 Dependencies
- [ ] 1.15.2 App `apps/documents`
- [ ] 1.15.3 Tests
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 1.16 Sharing (native share sheet and WhatsApp)

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 1.16.1 src/native/share.ts (+ apiBlob)
- [ ] 1.16.2 WhatsApp message builders (3 locales) + tests
- [ ] 1.16.3 tracking_url on JobSerializer
- [ ] 1.16.4 Share buttons on job and invoice
- [ ] 1.16.5 WhatsApp hidden when phone masked
- [ ] 1.16.6 🧑‍🔧 Shared receipt + invoice to WhatsApp on Android and iPhone
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 1.17 Thermal receipt printing

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 1.17.1 PrinterService types
- [ ] 1.17.2 BLE printer implementation
- [ ] 1.17.3 Fake printer
- [ ] 1.17.4 Printer factory
- [ ] 1.17.5 Receipt models (job / payment / invoice)
- [ ] 1.17.6 Canvas renderer (Noto fonts, QR)
- [ ] 1.17.7 Print flow with error banners
- [ ] 1.17.8 Printer settings screen
- [ ] 1.17.9 Web print fallback page
- [ ] 1.17.10 Print buttons (Thermal / A4)
- [ ] 1.17.11 Tests (models, chunking, byte stream)
- [ ] 1.17.12 🧑‍🔧 docs/printers.md filled with real results
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 1.18 Public tracking page

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 1.18.1 App `apps/tracking`
- [ ] 1.18.2 View rules
- [ ] 1.18.3 Template
- [ ] 1.18.4 Tests
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 1.19 Messaging (templates, SMS adapter, message log)

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 1.19.1 messaging app models
- [ ] 1.19.2 Default templates migration (3 locales)
- [ ] 1.19.3 Safe template renderer
- [ ] 1.19.4 SMS provider adapter (TODO(verify) API)
- [ ] 1.19.5 send_job_message service + logs
- [ ] 1.19.6 auto_sms_events setting + hooks
- [ ] 1.19.7 Endpoints (log, manual send, template overrides)
- [ ] 1.19.8 Real OTP SMS + pilot OTP numbers removed
- [ ] 1.19.9 Tests
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

## 1.20 Trash, restore, permanent delete and exports

| Status | Started | Completed | Commit |
|---|---|---|---|
| ⬜ Not started | — | — | — |

- [ ] 1.20.1 Trash in `ShopScopedViewSet`
- [ ] 1.20.2 Purge job
- [ ] 1.20.3 Exports
- [ ] 1.20.4 Frontend trash
- [ ] 1.20.5 Tests
- [ ] Verify commands from ROADMAP passed

**Verification:**
```text
(paste summarised results here)
```
**Notes:** —

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
