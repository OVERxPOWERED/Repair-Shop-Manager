# FixPro Developer Guide

Everything a developer needs to understand, run, change and ship FixPro. Facts here were read from the code on 2026-10-04. Items marked **TODO(verify)** were not confirmed against running code. Rules live in `AGENTS.md`; the plan is `ROADMAP.md`; progress is `COMPLETION.md` and `docs/PROJECT-STATE.md`.

---

## 1. Architecture at a glance

```
 Android / iOS (Capacitor shell)  ─┐
 Web browser                      ─┼─►  Next.js static export (frontend/out)
                                   │        │ fetch (Bearer JWT + X-Shop-Id)
                                   │        ▼
                                   └──►  Django REST API  /api/v1/...   ──► PostgreSQL
                                            │   + server-rendered public pages (/privacy, /terms, /account/delete, /t/<token>)
                                            ├─ WeasyPrint PDFs
                                            └─ SMS provider (console in dev)
 GitHub Actions: CI, nightly cron calls, backups
```

- One Next.js codebase (`output: 'export'`, no server features) wrapped by Capacitor (`appId: in.fixpro.repairshop`, `webDir: out`).
- Django 5.2 + DRF + SimpleJWT + PostgreSQL 16. Python 3.12.
- Hosting during pilot: Render free web service (`render.yaml`) + Neon Postgres. Free tier sleeps, so the first request is slow (`lib/server-wake.ts` handles this). **Rule: move to a paid VPS before onboarding a second shop.**

## 2. Repository layout

```
backend/
  config/            settings (base, dev, test, prod), urls.py, wsgi
  apps/
    core/            base models, API envelope, errors, idempotency, concurrency, phone/IST helpers,
                     dashboard, reports, exports, trash, cron, health, images, testing helpers
    accounts/        User, OTPChallenge, UserDevice, AccountDeletionRequest, auth views, public pages
    tenancy/         Organization, Shop, Role, Membership, Invite, ShopBrand, AccessoryOption, permissions, scoping
    audit/           append-only AuditLog
    customers/       Customer
    devices/         Device, DeviceIdentifier (IMEI)
    jobs/            Job, line items, photos, notes, status history, state machine, services
    billing/         Invoice (+ series, lines), Payment, GST engine
    documents/       PDF generation (invoice, job receipt)
    tracking/        public tracking page by token
    messaging/       MessageTemplate, message log, SMS adapter
    inventory/       (Phase 2, 2.1 in progress) items, stock ledger
frontend/
  src/app/           routes (see §8)
  src/features/      per-domain api.ts, schemas, components (auth, billing, customers, devices, home,
                     invoices, jobs, messages, onboarding, reports, settings, staff)
  src/lib/           api client, auth store, formatting, validation, printer, images, upi, env
  src/native/        Capacitor wrappers with web fallbacks (camera, barcode, ocr, bluetooth, printer,
                     share, haptics, secure-storage, preferences, network, status-bar, app, device)
  src/i18n/          config, store, messages/{en,hi,hi-Latn}.json
  src/components/    ui (shadcn), shell (AppHeader, BottomNav, ShopSwitcher), states, forms
  e2e/               Playwright (incl. axe accessibility)
docs/                blueprint, schema, roadmap, api-conventions, error-codes, decisions, runbooks/restore.md,
                     store-readiness.md, pilot-log.md, user-manual-hinglish.md, this file
.github/workflows/   ci.yml, cron.yml, backup.yml
render.yaml, docker-compose.yml
```

## 3. Running locally

```bash
# Backend
cd backend
python3.12 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
cp <env example> .env            # see §13 for variables; DATABASE_URL must point to Postgres
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_demo_data            # demo shop, +919876543210
.venv/bin/python manage.py seed_demo_data --reviewer # reviewer account +919999999999
.venv/bin/python manage.py runserver 8000

# Frontend
cd frontend && pnpm install && pnpm dev     # NEXT_PUBLIC_API_BASE_URL defaults to http://localhost:8000/api/v1
```

Dev login: `+919999999999` with fixed OTP `123456` (`OTP_TEST_NUMBERS`, set in `settings/dev.py` and `test.py`). In dev the SMS provider just logs; real OTPs are not shown outside DEBUG.

Quality commands:
```
backend:  .venv/bin/pytest -q ; ruff check . ; ruff format --check . ; python manage.py makemigrations --check --dry-run
frontend: pnpm lint (also runs i18n:check) ; pnpm typecheck ; pnpm test ; pnpm build
mobile:   npx cap sync ; npx cap run android
```

## 4. Core backend conventions (non-negotiable)

- **Tenant isolation**: every business table extends `ShopScopedModel` (`shop` FK, `created_by`, `version`, soft delete, UUID pk). Viewsets scope by the requesting user's membership via `TenantScopingMiddleware`/`resolve_shop_context` using the `X-Shop-Id` header. Cross-shop access returns 404/403. Test helper: `assert_other_shop_hidden`.
- **Money** is integer paise (`BigIntegerField`). GST rates are basis points (1800 = 18%). Quantities on stock are `Decimal(10,3)`.
- **UUID pks**, `created_at/updated_at/deleted_at`. `delete()` is soft; `hard_delete()` is permanent. Default managers hide deleted rows; `all_objects` includes them.
- **Issued invoices are immutable**; fixes are credit notes.
- **Audit**: status changes, edits, deletes, permission changes, exports go to `AuditLog` (append-only; update/delete raise).
- **Time**: stored UTC, shown IST; financial year April to March (`apps/core` IST helpers).
- **Permissions are server-side** (`permission_map` on viewsets, `membership.has_perm`).
- **Optimistic concurrency**: versioned resources take `If-Match: <version>`; mismatch returns 409 `conflict`.
- **Idempotency**: POSTs marked `@idempotent()` accept an `Idempotency-Key` (UUID) header; a retry returns the stored response. Records purged after 48 h.

### API envelope (`docs/api-conventions.md`, `docs/error-codes.md`)
```json
// detail:  { "data": {...} }
// list:    { "data": [...], "meta": { "count", "next", "previous" } }
// error:   { "error": { "code": "job.invalid_transition", "message": "...", "fields": {}, "request_id": "..." } }
```
Errors are `DomainError(message, code=, status=, fields=, wait=)`; `ConflictError` (409) and `NotFoundError` (404) subclass it. `wait` becomes `Retry-After`. Every response carries `X-Request-Id`. Register new error codes in `docs/error-codes.md`.

Throttles (`settings/base.py`): anon 60/min, user 600/min, otp_send 10/hour/IP, otp_verify 30/hour, token_refresh 120/hour, tracking 60/min. Request body cap 2.5 MB.

## 5. Authentication and sessions

Flow: `POST /auth/otp/send/` → SMS → `POST /auth/otp/verify/` returns `{tokens:{access,refresh}, user, ...}` and registers a `UserDevice` (device_id, platform, app_version).

- OTP: 6 digits, stored as an HMAC-SHA256 of `otp:{phone}:{code}` keyed by `SECRET_KEY` (never plain). Per-phone 30 s cooldown (`otp.cooldown`, 429), 6 per hour (`otp.too_many_requests`), max 3 attempts then `otp.locked`. Purposes: `login`, `phone_change`, `delete_account`.
- JWT via SimpleJWT with refresh rotation and blacklist (reuse detection); refresh is per-device family. `auth/logout/` revokes the current device; `auth/logout-all/` all devices; `auth/devices/` lists and revokes.
- Frontend stores tokens in the Zustand auth store (`lib/auth/store.ts`) persisted through `native/secure-storage.ts` (native secure storage; no auth tokens in browser storage on native). `SessionBoot.tsx` restores the session on launch. `lib/api/client.ts` attaches `Authorization: Bearer`, `X-Shop-Id`, optionally `Idempotency-Key` and `If-Match`, unwraps the envelope, throws `ApiError` (status, code, fields), and refreshes the token on 401. **TODO(verify)** exact refresh-retry logic in `client.ts`.
- Routing guard `lib/auth/route.ts nextRoute()`: signedOut → `/welcome/`; no name → `/profile-setup/`; no shop → `/invites/` (if pending invites) else `/onboarding/`; else `/home/`.

### Account deletion (subphase 1.24)
- `GET/POST/DELETE /auth/account-deletion/` (view pending / request / cancel). Request creates `AccountDeletionRequest` with a 7-day `scheduled_for`, and logs the user out of all devices.
- Sole-owner guard: owner of a shop with other active staff gets 409 `accounts.sole_owner_conflict`.
- `process_account_deletions` command (via `services.process_due_account_deletions`): anonymizes name to "Deleted User", phone to `+00<12 hex>`, deactivates and soft deletes the user, removes memberships, revokes devices.
- It is now scheduled: `process-account-deletions` is in `apps/core/cron.py CRON_JOBS` and `.github/workflows/cron.yml` (fixed 2026-10-04; it was missing before).
- Public web page `/account/delete/` (server-rendered; phone → OTP → confirm) in `apps/accounts/public_views.py`, templates in `apps/accounts/templates/accounts/`. Required by Play Store and App Store.
- Logging in during the grace period: the manual says it cancels the request. **TODO(verify)** whether login actually auto-cancels; the explicit cancel is `DELETE /auth/account-deletion/`.

## 6. Tenancy and permissions

Models: `Organization` (owner_user) → `Shop` (many) → `Membership` (user, role, status active/suspended/removed) and `Role` (system roles have `organization=None`). `Invite` (phone + role, accept/decline).

Default roles are defined in `apps/tenancy/permissions.py` (`PERMISSION_CODES`, `SYSTEM_ROLES`) and seeded by `seed_system_roles()`:
- **Owner**: all codes. **Manager**: all except `jobs.delete_permanent`, `data.bulk_delete`, `roles.manage`, `billing.subscription`, `audit.view`. **Front Desk** and **Engineer**: explicit lists (Engineer is job/customer/invoice-view/print/printer plus `inventory.view`).
- Codes: jobs.*, customers.*, invoices.*, payments.*, money.see_cost_profit, reports.*, data.*, staff.*, roles.manage, shop.settings, printers.configure, billing.subscription, audit.view, and new inventory.view, inventory.edit, stock.adjust.
- A new code needs: add to `PERMISSION_CODES`, decide role membership, rerun seed (existing DBs need `seed_system_roles` to refresh), and add the endpoint to the permission-matrix test (`apps/core/tests/test_permission_matrix.py`, 44 endpoints x 4 roles).
- **Known gap**: `inventory.edit` and `stock.adjust` are not yet given to Manager explicitly; Manager gets them only because Manager = all-but-excluded. Front Desk gets `inventory.view` only.

Shop settings that change behaviour (on `Shop`): lock job after delivery, restrict engineers to assigned jobs, mask customer phone for engineers, engineer delivery access, default warranty days, public tracking toggle and expiry, GST (enabled, GSTIN, scheme), invoice prefix, round-off, default terms, UPI id, auto SMS events, logo.

## 7. Data model (summary; full detail in `docs/02-database-schema.md`)

| App | Models | Notes |
|---|---|---|
| accounts | User (phone unique, name, preferred_locale), OTPChallenge, UserDevice, AccountDeletionRequest | phone E.164, max 16 chars |
| tenancy | Organization, Shop, Role, Membership, Invite, ShopBrand, AccessoryOption | partial unique indexes where not deleted |
| customers | Customer | phone unique per shop where not null/deleted; anonymize sets phone NULL |
| devices | Device, DeviceIdentifier | IMEI with `luhn_valid`, `captured_via` (barcode/ocr/manual) |
| jobs | Job, JobCounter, line items, photos, notes, JobStatusHistory | `job_no` per shop via `select_for_update` on counter; lock pattern/PIN encrypted |
| billing | Invoice, InvoiceSeries, lines, Payment | invoice number per shop + kind + financial year, assigned only on issue |
| messaging | MessageTemplate, message log | log keeps masked phones |
| audit | AuditLog | append-only |
| inventory | ItemCategory, Supplier, Item, ItemCompatibility, StockMovement, PriceHistory, Demand | see §11 |

Job status machine (`apps/jobs/state_machine.py`):
```
received → diagnosing | awaiting_approval | in_repair | cancelled
diagnosing → awaiting_approval | awaiting_parts | in_repair | returned_unrepaired | cancelled
awaiting_approval → in_repair | awaiting_parts | returned_unrepaired | cancelled
awaiting_parts → in_repair | cancelled
in_repair → repaired | awaiting_parts | returned_unrepaired
repaired → ready_for_pickup | in_repair
ready_for_pickup → delivered | in_repair
delivered / cancelled / returned_unrepaired: terminal (reopen via POST /jobs/{id}/reopen/, needs jobs.reopen)
```
`jobs.deliver` is needed for `delivered`, `jobs.change_status` for the rest. Engineers without `jobs.view_all` can only transition jobs assigned to them. Every transition writes `JobStatusHistory` + audit and can queue a customer message. Dashboard groups: pending, in_progress, repaired, delivered, closed.

## 8. Frontend screens and flows

Routes (`frontend/src/app`, all static):

| Route | Purpose |
|---|---|
| `/` | redirect by `nextRoute` |
| `/welcome`, `/login`, `/verify` | language, phone entry, OTP |
| `/profile-setup` | first-time name |
| `/invites` | accept or decline shop invites |
| `/onboarding` | create organization and shop (`POST /tenancy/onboard/`) |
| `/home` | counts, recent jobs, quick actions (`/dashboard/summary/`, `/jobs/counts/`) |
| `/jobs`, `/jobs/new`, `/jobs/detail?id=` | list, 8-step intake wizard (Zustand `intake-store`, draft persisted), detail |
| `/customers`, `/customers/detail?id=` | list, profile, devices, history |
| `/inventory` | placeholder until Phase 2 |
| `/invoices`, `/invoices/detail?id=` | list, detail, issue, cancel, PDF, payments |
| `/print/receipt` | thermal receipt rendering/printing |
| `/more` | menu, language, devices and sessions, logout, delete account, legal links |
| `/more/reports` | `/reports/summary/` |
| `/more/staff`, `/more/staff/detail`, `/more/roles` | staff and role management |
| `/more/settings/{profile,billing,jobs,brands,accessories,messaging,printer}` | shop settings |
| `/more/settings/data/{trash,export}` | restore, permanent delete, Excel export |
| `/privacy`, `/terms` | static in-app legal pages (also served by backend) |
| `/dev/spikes` | hardware spikes, only if `NEXT_PUBLIC_ENABLE_DEV_PAGES=true` |

Because of static export, detail screens use query strings (`?id=`) not dynamic segments, and there are no server actions or route handlers.

State and data: TanStack Query for server data (keys like `["auth","devices"]`), Zustand for auth, locale, intake draft. Forms: React Hook Form + Zod (`features/*/schema.ts`). Each feature has `api.ts` hooks that call `api()` from `lib/api/client.ts`. Shell: `AppHeader`, `ShopSwitcher`, `BottomNav` (Home, Jobs, Customers, Inventory, More). Shared loading/empty/error components in `components/states`.

i18n: next-intl with `en`, `hi`, `hi-Latn`; `pnpm i18n:check` fails if keys differ across locales (1053 keys at last run). All new UI text must go through message keys. **Known debt**: several screens (e.g. parts of `more/page.tsx` dialogs, `settings/profile`, and the new `privacy`/`terms` pages) still contain hardcoded English strings. This breaks rule 7; fix before store release.

Native layer (`src/native`): each capability exposes a function with a web fallback: camera, barcode scan, OCR (IMEI extract + Luhn, always user-confirmed), Bluetooth printing (ESC/POS; text is rasterized to a 1-bit bitmap in `lib/printer/rasterizer.ts` so Devanagari prints without printer ROM support), share sheet and WhatsApp deep links (`features/messages/whatsapp.ts`), haptics, secure storage, network status, app lifecycle.

Typical flow, "create a job": `/jobs/new` steps → local draft in `intake-store` → on confirm, `POST /customers/` (if new), `POST /devices/`, `POST /jobs/` with `Idempotency-Key` → `job_no` allocated server-side in the same transaction → photos uploaded to `POST /jobs/{id}/photos/` (client compresses first, `lib/images/compress.ts`) → share sheet.

## 9. Backend endpoints (all under `/api/v1/`; every shop-scoped call needs `Authorization` and `X-Shop-Id`)

**Auth/account**: `POST auth/otp/send/`, `POST auth/otp/verify/`, `POST auth/token/refresh/`, `GET auth/me/`, `POST auth/logout/`, `POST auth/logout-all/`, `GET auth/devices/`, `DELETE auth/devices/{id}/`, `GET|POST|DELETE auth/account-deletion/`.

**Tenancy**: `POST tenancy/onboard/`, `GET shops/`, `GET|PATCH shops/current/`, `POST shops/current/logo/` (resized to 512 px, stored under `shops/{id}/logo.*`), `GET me/invites/`, `POST me/invites/{id}/accept|decline/`, `invites/` CRUD, `staff/` (list/retrieve, `assignable/`, `{id}/role|suspend|reactivate|remove`), `roles/`, `brands/` and `accessory-options/` (CRUD + `{id}/restore/` + `{id}/permanent/`).

**Customers**: `customers/` CRUD, `{id}/restore/`, `{id}/permanent/`, `POST {id}/anonymize/` (needs `customers.delete`).

**Devices**: `devices/` CRUD, `devices/imei-lookup/`, `{id}/restore/`, `{id}/permanent/`.

**Jobs**: `jobs/` CRUD (+ filters/search), `jobs/counts/`, `{id}/status/`, `{id}/transitions/`, `{id}/assign/`, `{id}/reopen/`, `{id}/lock/`, `{id}/history/`, `{id}/notes/`, `{id}/photos/` (+ `{photo_id}/`), `{id}/line-items/` (+ `{item_id}/`), `{id}/payments/`, `{id}/invoice/`, `{id}/messages/` and `messages/send/`, `{id}/restore/`, `{id}/permanent/`, `GET jobs/{uuid}/receipt.pdf`.

**Billing**: `invoices/` CRUD, `{id}/issue/`, `{id}/cancel/`, `GET invoices/{uuid}/pdf/`, `payments/` (list/create/retrieve), `payments/{id}/refund/`.

**Messaging**: `message-templates/` CRUD.

**Reporting/data**: `dashboard/summary/`, `reports/summary/?from=&to=` (max 366 days; profit only with `reports.view_profit`), `exports/{customers,jobs,invoices,payments}.xlsx` (needs `data.export`; audited).

**System**: `health/`, `POST internal/cron/{job}/` (header `X-Cron-Secret`; jobs: `purge-otp`, `purge-idempotency`, `purge-trash`, `process-account-deletions`).

**Outside /api/v1**: `/t/<token>/` public tracking page (rate limited), `/t/<token>/invoice.pdf`, `/privacy/`, `/terms/`, `/account/delete/`, `/admin/`, `/api/schema/`, `/api/docs/` (Swagger). For request/response shapes use `/api/docs/` since it is generated by drf-spectacular.

Rule for any new endpoint: serializer validation, permission class/`permission_map`, shop scoping, and tests for happy path, forbidden and other-shop.

## 10. Documents, messaging, tracking

- PDFs: WeasyPrint with embedded Noto fonts (Hindi supported). Invoice A4 PDF, job receipt PDF.
- Tracking: each job has a random token; the public page shows status without login, respects shop toggle and expiry, strings in three languages.
- Messaging: `MessageTemplate` per event and locale; SMS goes through an adapter (`console` in dev; real provider needs TRAI DLT approval, which is still pending); WhatsApp is a client-side deep link, not an API.

## 11. Inventory (Phase 2, subphase 2.1 in progress)

Already built: models, migration `inventory.0001`, `apps/inventory/stock.py move_stock()`, `rebuild_stock_cache`, 11 tests.
- `move_stock` is the only way stock changes: locks the item row, enforces sign by kind (out, repair_use, sale, return_out negative; in, return_in positive; adjust either), writes append-only `StockMovement`, updates cached `qty_on_hand`, records `PriceHistory` and updates `cost_paise` on purchases. Negative stock is allowed with a log warning (the roadmap also wants a `stock.negative` API warning; not yet).
- Still to do for 2.1: DB trigger migration for append-only, real parallel-writer test (`transaction=True`), default role grants for `inventory.edit`/`stock.adjust`, `StockMovement` shop-consistency validation, then 2.2 API and screens. Phase 2 is paused until the Phase 1 pilot is done.

## 12. Testing

- Backend: pytest on PostgreSQL (`config.settings.test`). Shared fixtures in `backend/conftest.py`: `world` (2 organizations, 2 shops, Owner/Manager/Front Desk/Engineer in shop A as `owner_a`, `engineer_a`, etc.) and `client_for(user, shop)`. Notable suites: `core/tests/test_permission_matrix.py`, `test_query_counts.py` (N+1 limits), `test_abuse.py`, `tenancy/tests/test_scoping.py`, `accounts/tests/test_deletion.py`, `test_public_pages.py`, `customers/tests/test_anonymize.py`, `inventory/tests`. Wrap expected `IntegrityError` in `transaction.atomic()`.
- Frontend: Vitest (138 tests: validation, formatting, printer, status, schemas), Playwright e2e and axe accessibility in `frontend/e2e`.

## 13. Configuration

Backend env: `DJANGO_SETTINGS_MODULE`, `SECRET_KEY`, `DATABASE_URL`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS` (must include `https://localhost` and `capacitor://localhost` for the apps), `NUM_PROXIES` (TODO(verify) on Render), `CRON_SECRET`, `SENTRY_DSN`, `OTP_TEST_NUMBERS` (format `phone:code,...`; never set in prod), `APP_VERSION`, storage/SMS provider settings (see `config/settings/base.py`; **TODO(verify)** exact names). Prod: HSTS 1 year, `check --deploy` has 0 warnings.

Frontend env: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_APP_VERSION`, `NEXT_PUBLIC_ENABLE_DEV_PAGES`, `NEXT_PUBLIC_SENTRY_DSN`. Android: `CAP_ALLOW_MIXED_CONTENT` for local HTTP only.

Secrets never go in the repo; gitleaks runs in CI (`.gitleaks.toml`).

## 14. CI, deploy, operations

- `ci.yml`: Postgres 16 service, ruff, migration dry-run, deploy check, pytest, pip-audit, frontend lint/typecheck/test/build, gitleaks, Playwright.
- `cron.yml`: daily 03:00 IST, calls the cron endpoint for each job in the matrix.
- `backup.yml`: daily database backup; restore procedure in `docs/runbooks/restore.md` (a restore drill is a Phase 1 exit item; confirm it was actually run).
- Deploy backend: Render builds `backend/` Dockerfile, runs migrate, createcachetable, collectstatic, gunicorn. Deploy frontend: `pnpm build` then host `out/` on any static host.
- Mobile build: `pnpm build && npx cap sync && npx cap open android` (Android Studio, signed AAB for Play internal testing). iOS needs macOS + Xcode + paid Apple account (TestFlight). Versions today: Android versionName 1.0 / versionCode 1, iOS 1.0 (1); bump versionCode for every upload. Icons and splash are still Capacitor defaults (open item 1.24.7).

## 15. Where to change things (cheat sheet)

| I want to... | Touch |
|---|---|
| add a permission | `tenancy/permissions.py`, role seeds, `permission_map`, permission-matrix test |
| add a model | app `models.py` extending `ShopScopedModel`, migration, partial unique indexes, tests incl. other-shop |
| add an endpoint | viewset/serializer, `urls.py`, permission, scoping, audit if it mutates, tests, `docs/error-codes.md` |
| add a screen | `src/app/(app)/...`, feature `api.ts`, loading/empty/error states, i18n keys in all 3 locales, check at 360 px |
| add a status | `jobs/models.py JobStatus`, `state_machine.py`, frontend `features/jobs/status.ts`, messages, tests |
| add a cron task | management command, entry in `core/cron.py CRON_JOBS`, add to `cron.yml` matrix |
| change GST logic | `billing` GST engine; ask a CA; never guess rules |

## 16. Known issues and open items (as of 2026-10-04)

1. Human tasks open: 1.24.7 icons/splash/version numbers, 1.24.9 Play internal build, 1.24.10 TestFlight, 1.25 pilot, CA review of GST invoices, restore drill confirmation.
2. Hardcoded English strings in some screens (see §8); i18n check passes only because it compares keys, not hardcoded text.
3. Legal pages and `privacy@fixpro.in` / `support@fixpro.in` are placeholders: `TODO(verify) legal`. Store listing text and the DPDP wording need a lawyer or at least careful owner review.
4. SMS DLT registration pending; OTP and notifications use the console provider outside tests.
5. `docs/store-readiness.md` lists URLs (`api.fixpro.in`) that are not yet real.
6. `Inventory` tab is a placeholder; Phase 2 paused.
7. Real-printer behaviour and Bluetooth permission flow need verification on actual hardware (spikes were redone in 0.8 per COMPLETION; confirm on the shop printer).
8. Offline mode does not exist (planned for Phase 3). The app needs internet.
