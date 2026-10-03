# Project State

> Live status file. The agent updates this at the end of every task. Keep it short and factual.

**Phase:** 1 (Core Repair MVP)  **Subphase:** next is 1.9 (Home dashboard, Jobs list and Job detail screens)  **Last updated:** 2026-10-03

> 2026-10-02: ROADMAP.md rewritten as v3.0 (phases → subphases with step-by-step instructions) and COMPLETION.md added.
> Phase 0 (Subphases 0.1 through 0.18) completed and verified on PostgreSQL 16 & Next.js 14 / Capacitor 8.

## Done
- **Status Workflow, Assignment, Visibility, and Dashboard API (Subphase 1.8):**
  - State machine in `apps/jobs/state_machine.py`: defined `TRANSITIONS`, `TERMINAL`, `GROUPS`, `required_permission`, and `allowed_next`.
  - Service functions in `apps/jobs/services.py`:
    - `change_status`: concurrency check (`If-Match` version), lock validation, transition matrix validation, granular permissions (`jobs.deliver` for delivered, `jobs.change_status` for others), engineer assignment scope (`jobs.not_assigned_to_you`), mandatory cancel reason, side effects (`ready_at`, `delivered_at`, `delivered_by`, `warranty_until`, `is_locked` via `shop.lock_order_after_delivery`), `JobStatusHistory`, audit logging, and `on_job_status_changed` hook.
    - `reopen`: only from terminal statuses, validates `jobs.reopen`, locked check, mandatory reason, transitions to `in_repair`, clears `warranty_until`, writes history and audit log.
    - `assign`: validates `jobs.assign`, active shop membership check, unassign support (`membership_id=None`), writes audit log and triggers `notify_assignment`.
    - `can_edit_job`: checks `jobs.edit` and (`jobs.view_all` or `job.assigned_to_id == membership.id`), wired into `update_job`.
  - Scoping & filtering:
    - `JobViewSet.get_queryset` applies `engineers_see_assigned_only` filter when membership lacks `jobs.view_all`.
    - `JobFilter` supports `status` (comma-separated), `group`, `assigned_to` (`me`, UUID, `unassigned`), `customer`, `created_after`, `created_before`, and smart `q` search (digits <= 6 -> exact `job_no`, phone contains, IMEI ends with; digits 7+ -> phone/IMEI contains; text -> customer name / device model icontains).
  - Endpoints:
    - `POST /api/v1/jobs/{id}/status/`
    - `GET /api/v1/jobs/{id}/transitions/`
    - `POST /api/v1/jobs/{id}/reopen/`
    - `POST /api/v1/jobs/{id}/assign/`
    - `GET /api/v1/jobs/{id}/history/`
    - `GET /api/v1/jobs/counts/`
    - `GET /api/v1/dashboard/summary/?date=YYYY-MM-DD` (IST midnight boundaries).
  - Granted `jobs.assign` permission to Front Desk role in `apps.tenancy.permissions.SYSTEM_ROLES`.
  - Added 109 test cases in `apps/jobs/tests/test_workflow.py` testing every transition pair, permission checks, side effects, visibility toggles, counts, and search filters. All 234 backend pytest tests passing.
- **Job Intake Wizard (8 Steps) (Subphase 1.7):**
  - Added `GET /api/v1/staff/assignable/` on `StaffViewSet` returning active non-suspended staff members (`AssignableStaffSerializer`) with unit tests in `apps/tenancy/tests/test_staff.py` (125 total backend pytest tests passing).
  - Built `useIntakeStore` with Zustand `persist` to `localStorage` key `fixpro.intakeDraft` with strict exclusion of lock secret (`lockValue`) and photo blobs. Supports draft restoration banner with discard action.
  - Implemented interactive 3x3 `PatternInput` with SVG connections, drag pointer tracking, step badges, and haptic feedback.
  - Built 8-step intake wizard at `src/app/(app)/jobs/new/page.tsx` with top progress indicator, per-step Zod validation, skippable optional steps, and modular step components (`IntakeStepCustomer`, `IntakeStepDevice`, `IntakeStepCondition`, `IntakeStepAccessories`, `IntakeStepProblem`, `IntakeStepEstimate`, `IntakeStepAssignment`, `IntakeStepConfirmation`).
  - Added sequential photo upload post-creation with partial failure warning toast and redirection to job detail.
  - Added 150 new i18n translation keys across all 3 locales (`en`, `hi`, `hi-Latn`) bringing total catalog to 555 keys (100% key parity).
  - Vitest 90/90 tests passing; static production export generated cleanly (21/21 pages, `/jobs/new` 21.9 kB).
- **File Storage and Job Photos (Subphase 1.6):**
  - Integrated `django-storages[s3]>=1.14` and `Pillow>=10.4`; configured `FileSystemStorage` under `MEDIA_ROOT` for dev/test and private S3/R2 storage for prod.
  - Built image normalization in `apps/core/images.py` (`normalise_photo`) stripping EXIF/GPS metadata, fixing rotation via `exif_transpose`, resizing to max 1600px side, and re-encoding to quality 80 JPEG.
  - Created `JobPhoto(ShopScopedModel)` with migration `0003_jobphoto` tracking `file_key`, `kind` (`before`/`after`/`damage`/`other`), `caption`, dimensions, size, and `taken_by` user.
  - Built `add_job_photo` service in `apps/jobs/services.py` enforcing a 20-photo limit (`job.photo_limit`), plus `POST /jobs/{id}/photos/`, `GET /jobs/{id}/photos/`, and `DELETE /jobs/{id}/photos/{photo_id}/` on `JobViewSet`.
  - Added native camera service in `src/native/camera.ts` (`takePhoto` using `@capacitor/camera` with file-input web fallback), canvas compression in `src/lib/images/compress.ts` with 7 vitest tests, and `PhotoStrip` thumbnail viewer/manager component.
  - Added 31 translation keys across all 3 locales (405 keys total); 7 backend photo tests in `test_photos.py` (123 total backend pytest tests passing, 66 frontend vitest tests passing).
- **Jobs Core API (Subphase 1.5):**
  - Integrated `cryptography>=42` and implemented field encryption in `apps/core/crypto.py` (`_fernet`, `encrypt_str`, `decrypt_str`) with multi-key rotation and settings validation in `dev.py`, `test.py`, and `prod.py`.
  - Created `apps/jobs` with `Job(ShopScopedModel)`, `JobCounter(models.Model)`, `JobAccessory(UUIDModel)`, `JobNote(ShopScopedModel)`, `JobStatusHistory(UUIDModel, TimeStampedModel)` with indexing, unique constraint `job_uniq_no_per_shop`, and admin registration.
  - Automated `JobCounter` provisioning via `on_shop_created` hook and data migration `0002_seed_job_counters` for existing shops.
  - Built core repair services in `apps/jobs/services.py`: `allocate_job_no` with row-level pessimistic locking (`select_for_update`), `create_job` with atomic customer/device/accessories/history/note handling and duplicate phone reuse, `update_job` with optimistic concurrency version verification and locked state check, and `reveal_lock` with audit logging.
  - Built serializers (`JobCreateSerializer` with strict PIN/Pattern/Password rules, `JobUpdateSerializer`, `JobSerializer`, `JobNoteSerializer`) and `JobViewSet(ShopScopedViewSet)` enforcing `@idempotent()` creation, in-progress deletion rejection, and action endpoints `/lock/` and `/notes/`.
  - Added 8 unit tests in `apps/jobs/tests/test_jobs.py` (concurrency test with 10 threads asserting sequential numbers 1..10, idempotency, lock encryption, role-based cost visibility, mismatch rejection, tenant isolation). Total backend suite: 116 pytest tests passing.
- **Customers and Devices Screens (Subphase 1.4):**
  - Built customer management query hooks and mutations in `src/features/customers/api.ts` (`useCustomers`, `useCustomer`, `useCustomerByPhone`, `useCreateCustomer`, `useUpdateCustomer`, `useDeleteCustomer`).
  - Built device query hooks and mutations in `src/features/devices/api.ts` (`useDevices`, `useBrands`, `useCreateDevice`, `useUpdateDevice`).
  - Created customer form schema with E.164 phone normalization in `src/features/customers/schema.ts` and unit tests in `schema.test.ts`.
  - Built `CustomerFormSheet`: bottom sheet supporting create and edit, debounced phone lookup warning if number already belongs to another customer with direct link to their profile, and optimistic concurrency (409) conflict warning with reload action.
  - Built `DeviceFormSheet`: bottom sheet supporting 5 device categories, dynamic shop brand dropdown with "Other (specify below)" fallback, multiple identifiers (IMEI 1, IMEI 2, Serial, MEID), live 15-digit Luhn algorithm feedback, and confirmation checkbox to override non-standard IMEIs.
  - Built customers directory at `src/app/(app)/customers/page.tsx` with debounced search query, filter chips, monogram avatars, infinite pagination, and floating action button (`+`).
  - Built customer detail view at `src/app/(app)/customers/detail/page.tsx` with customer info, quick call & WhatsApp action buttons (hidden when phone is masked), devices list with inline edit sheet, delete customer modal with soft-delete, and repair history placeholder.
  - Added complete i18n translations across `customers` and `devices` namespaces in `en.json`, `hi.json`, and `hi-Latn.json` with 100% key parity (374 total keys across 3 locales).
  - All 59 frontend vitest tests passing; static export built (20/20 pages); 108 backend tests passing.
- **Devices and IMEI API (Subphase 1.3):**
  - Moved `DeviceCategory` choices to `apps.core.choices` for clean cross-app reusability without cyclical imports.
  - Created `apps/devices` with `Device(ShopScopedModel)` and `DeviceIdentifier(ShopScopedModel)` with GIN trigram index on identifier `value`, unique constraint `devid_uniq_type_per_device` (`device`, `type`), and registered in Django admin with tabular inlines.
  - Implemented IMEI validation policy in `apps/devices/services.py` (`clean_identifier`, `create_device`, `update_device`) enforcing 15-digit formatting, Luhn check-digit verification with explicit user override (`confirm_invalid`), duplicate type prevention, and atomic device + identifiers management.
  - Built `DeviceSerializer` with nested `identifiers` and `ShopScopedPKField` validation for `customer_id` and `brand_id`.
  - Built `DeviceViewSet(ShopScopedViewSet)` supporting search by `?customer=` and `?imei=` (suffix matching), plus action `GET /devices/imei-lookup/?value=<15 digits>` for tenant-scoped duplicate detection.
  - Verified Luhn algorithm test parity across Python (`test_devices.py`) and TypeScript (`imei.test.ts`) on canonical IMEIs `490154203237518` and `356938035643809`.
  - Added 6 unit tests in `apps/devices/tests/test_devices.py` covering validation matrix, dual-SIM device creation, cross-tenant customer validation, and IMEI suffix search (108 total backend pytest tests passing; 52 frontend vitest tests passing).
- **Customers API (Subphase 1.2):**
  - Created `apps/customers` with `Customer(ShopScopedModel)` carrying GIN trigram indexes on `name` and `phone`, unique constraint `cust_uniq_phone_per_shop` (`shop`, `phone` for non-deleted rows), and registered in Django admin.
  - Implemented phone masking helpers in `apps/customers/visibility.py` (`can_see_customer_phone`, `present_phone`) checking shop setting `mask_phone_for_engineers` and user permission `customers.see_phone`.
  - Built `CustomerSerializer` with E.164 normalization, duplicate phone detection (`customer.phone_exists`), dynamic representation masking (`phone_masked`), and update-time protection against overwriting real phone numbers with masked ones.
  - Built `CustomerViewSet(ShopScopedViewSet)` with `q=` search (digit search across `phone` and `alt_phone`, trigram icontains on `name`), exact `phone=` lookup, ordering, `@idempotent(required=False)` on create, and append-only audit logging (`customer.created`, `customer.updated`, `customer.deleted`) strictly masking phone numbers in before/after snapshots.
  - Added 6 unit tests in `apps/customers/tests/test_customers.py` covering full CRUD, duplicate rejection within shop vs other shop, trigram search and query budget (max 3 queries), technician masking matrix, and stored phone preservation (102 total backend pytest tests passing).
- **Postgres Search and Per-Shop Catalogs (Subphase 1.1):**
  - Enabled PostgreSQL trigram extension (`pg_trgm`) via migration `core.0002_enable_pg_trgm`.
  - Added `DeviceCategory` choices, `ShopBrand(ShopScopedModel)`, and `AccessoryOption(ShopScopedModel)` with case-insensitive unique constraint `brand_uniq_name_per_cat` on `(Lower("name"), "shop", "device_category")`.
  - Created `apps/tenancy/seeds.py` with `DEFAULT_BRANDS` across 4 categories and `DEFAULT_ACCESSORIES`; wired into `on_shop_created` and seeded existing shops via data migration `0004_seed_shop_catalogs`.
  - Built `ShopBrandSerializer`, `AccessoryOptionSerializer`, `ShopBrandViewSet`, `AccessoryOptionViewSet` using `ShopScopedViewSet`, `permission_map` (`jobs.view` for read, `shop.settings` for mutations), `device_category` filtering, atomic rollback savepoint on `IntegrityError` duplicate name, and registered endpoints `/api/v1/brands/` and `/api/v1/accessory-options/`.
  - Added 6 unit tests in `apps/tenancy/tests/test_catalogs.py` covering seeding, soft-delete hiding, permission scoping, cross-tenant isolation, and case-insensitive duplicate prevention (96 total backend pytest tests passing).
- **Master Unified Roadmap & Design Hub:** `ROADMAP.md` and `design/` catalog.
- **Phase 0 Exit Review (Subphase 0.18):**
  - Full backend verification passed: 90 pytest tests passing, ruff lint and format clean, `makemigrations --check` clean, production `check --deploy` clean.
  - Full frontend verification passed: ESLint clean, 100% i18n parity (297 keys across `en`, `hi`, `hi-Latn`), TypeScript clean, Vitest 52/52 tests passing across 11 files, static production export generated cleanly (19/19 pages).
  - Playwright E2E smoke test passing: full flow verified at mobile viewport (phone login -> OTP verify -> profile setup -> shop onboarding -> home dashboard & navigation tabs).
  - Phase 0 exit checklist satisfied; ready for Phase 1.
- **Pilot Deployment, Monitoring, Scheduled Jobs and Backups (Subphase 0.17):**
  - Backend: configured database cache and `CRON_SECRET` in `base.py`/`prod.py`; implemented `apps/core/cron.py` with `CronView` executing management commands (`purge-otp`, `purge-idempotency`) with constant-time HMAC header verification; added 5 unit tests in `apps/core/tests/test_cron.py` (90/90 backend tests passing); created `render.yaml` blueprint for Docker service deployment on Render.
  - Frontend: implemented cold-start UX in `src/lib/server-wake.ts`, instrumented API client with 4-second request timer, built `ServerWakeBanner` displayed in shell layout with translations in en/hi/hi-Latn; integrated `@sentry/capacitor` (4.4.0) and `@sentry/react` (10.69.0) in `src/lib/monitoring.ts` with `sendDefaultPii: false`; verified 52 vitest tests, lint, and static export (19/19 pages).
  - Infrastructure: created GitHub Actions workflows `.github/workflows/cron.yml` and `.github/workflows/backup.yml` (pg_dump + age encryption + S3/R2 upload); authored `docs/runbooks/restore.md`; updated `docs/release.md` with environments table, secret names directory, and mobile build instructions.
- **Staff Invites and Staff / Roles Screens (Subphase 0.16):**
  - Backend: `apps/tenancy/invites.py` (`pending_invites_for_phone`, `create_invite`, `accept_invite`, `decline_invite`), `InviteSerializer`, `CreateInviteSerializer`, `MyInviteSerializer`, `InviteViewSet` (list, create, revoke with audit), `MyInvitesListView` (GET `/me/invites/`), `AcceptInviteView` (POST `/me/invites/<id>/accept/` with `staff.invite_accepted` audit), `DeclineInviteView` (POST `/me/invites/<id>/decline/`), and updated `/auth/me/` & OTP verification to return `pending_invites` count.
  - Added 6 unit tests in `apps/tenancy/tests/test_invites.py` covering invite creation, duplicates/already-member prevention, non-owner role requirement, cross-user phone verification on accept, and tenant isolation (85/85 tests passing).
  - Frontend: regenerated API types schema; updated session store, SessionBoot, login/verify, profile-setup, and layout to handle `pendingInvites`; created `features/staff/api.ts` React Query hooks; built `InviteSheet.tsx` bottom sheet; built `(app)/more/staff/page.tsx` (staff list, status indicators, pending invites with revoke), `(app)/more/staff/detail/page.tsx` (role change dialog, suspend/reactivate, remove dialog), `(app)/more/roles/page.tsx` (system roles and permission matrix with translated descriptions), `(app)/invites/page.tsx` (accept/decline invites screen outside shell), enabled staff and roles rows on More screen, added pending invites alert banner on Home screen.
  - Added 111 new translation keys with 100% parity across `en`, `hi`, and `hi-Latn` (296 total keys), and verified static export (19/19 pages).
- **Append-Only Audit Log (Subphase 0.15):**
  - Created `apps/audit` with `AuditLog` model (UUID PK, shop FK PROTECT, actor FK PROTECT, action, entity_type/id, before/after JSON diffs, ip, user_agent, request_id, created_at, objects=AppendOnlyQuerySet).
  - Enforced append-only guarantees at Model/QuerySet levels (`update()` and `delete()` raise RuntimeError) and at PostgreSQL database level via row trigger `audit_no_update_delete` blocking UPDATE and DELETE.
  - Implemented `snapshot(obj, fields)`, `_diff(before, after)`, and `record_audit(...)` in `apps/audit/services.py`.
  - Instrumented audit events across 7 lifecycle actions: `shop.created` on onboarding, `shop.settings_updated` (storing diff of changed keys on PATCH `/shops/current/`), `staff.role_changed` (storing before/after role_id on POST `/staff/<id>/role/`), `staff.status_changed` (storing before/after status on suspend/reactivate/remove), `auth.new_device_login` (storing platform and device_id on new device OTP verify), `auth.logout_all` (on POST `/auth/logout-all/`), and `auth.device_revoked` (storing device_id on DELETE `/auth/devices/<id>/`).
  - Created `AuditLogSerializer`, `AuditLogViewSet` (`ShopScopedMixin`, `permission_map={"list": "audit.view"}`, django-filter filtering on `action`, `entity_type`, `entity_id`, `actor`), and read-only Django admin.
  - Added 8 unit tests in `apps/audit/tests/test_audit.py` (model/QuerySet/trigger immutability, shop settings diffing, staff status/role audit logs, auth lifecycle audit logs, permission enforcement: Owner 200, Manager 403, and tenant isolation).
  - All 79 backend tests and 52 frontend tests passing; lint, typecheck, migrations, and reversibility verified clean.
- **App Shell, Navigation and Shared States (+ iPhone) (Subphase 0.14):**
  - Implemented shared state components in `src/components/states/`: `ListSkeleton`, `CardSkeleton`, `EmptyState`, `ErrorState`, `PermissionDenied`, `OfflineBanner`, and centralized exports in `index.ts`.
  - Implemented shell navigation components in `src/components/shell/`: `AppHeader` (dynamic multi-shop switcher chevron, notification bell, user initials avatar linking to `/more/`), `ShopSwitcher` (sheet listing user shops with selection and `queryClient.clear()`), and `BottomNav` (5 tabs: Home, Jobs, Customers, Inventory, More; >=48px touch targets, safe area).
  - Built shell layout in `src/app/(app)/layout.tsx` enforcing `nextRoute` route protection, hardware back-button routing (`App.minimizeApp` on tab root, `router.back` otherwise), and light status bar styling.
  - Built `(app)/home/page.tsx` with dynamic IST greeting, date pill, hero card with zeros and quick operations grid with "Soon" badges.
  - Built placeholder views for `(app)/jobs/`, `(app)/customers/`, and `(app)/inventory/` with contextual `EmptyState`.
  - Built `(app)/more/page.tsx` with design system §4.5 grouped cards, active devices list via `GET /api/v1/auth/devices/`, device revocation via `DELETE /api/v1/auth/devices/<id>/`, logout all via `POST /api/v1/auth/logout-all/`, logout via `POST /api/v1/auth/logout/`, and language switcher dialog.
  - Added native wrappers `src/native/app.ts` (`onBackButton`, `minimizeApp`) and `src/native/status-bar.ts`.
  - Configured `@playwright/test` and chromium, wrote full E2E smoke test in `frontend/e2e/login.spec.ts` (tested at 360x780 viewport: auth, profile, onboarding, home shell, 5 tabs navigation).
  - All 52 frontend vitest tests passing; 71 backend pytest tests passing; static export (15/15 pages) and lint passing with 0 errors.
- **Shop Onboarding Wizard (Subphase 0.13):**
  - Ported backend `validate_gstin` (regex, state code lookup, and check character algorithm) to `src/lib/validation/gstin.ts` with 4 unit tests.
  - Created sorted GST state codes constant in `src/lib/constants/gst-states.ts`.
  - Ported backend UPI ID regex to `src/lib/validation/upi.ts` with 3 unit tests.
  - Created Zod validation schema in `src/features/onboarding/schema.ts` mirroring backend tenancy rules (GSTIN mandatory and state-code matching when GST is enabled) with 3 unit tests.
  - Created `StepProgressBar` component with progress line and step pills.
  - Implemented 3-step wizard in `src/app/onboarding/page.tsx` (Step 1: name & category, Step 2: phone, address, city, pincode, state, Step 3: GSTIN toggle & state auto-linkage, optional UPI ID) with one-time idempotency key `useState(newIdempotencyKey)`, submit to `POST /tenancy/onboard/`, session update & shop selection, and welcome celebration screen linking to `/home/`.
  - Added 49 onboarding i18n keys across `en`, `hi`, and `hi-Latn` with 100% key parity (153 keys).
  - All 52 frontend tests passing; 71 backend tests passing; static export (10/10 pages) and lint passing with 0 errors.
- **Auth Screens (Subphase 0.12):**
  - Saved previous HomePage JSX mock to `src/features/home/HomeMock.tsx` for reuse in 0.14.
  - Pure routing rule `nextRoute` in `src/lib/auth/route.ts` with 6 unit tests covering all status branches (booting, signedOut, no name, no shops, pending invites, home).
  - Wrapped `@capacitor/haptics` with web fallback in `src/native/haptics.ts`.
  - Form validation Zod schemas (`phoneSchema`, `otpSchema`, `profileSchema`) in `src/features/auth/schemas.ts` with 7 unit tests.
  - Tactile `NumericKeypad` (3x4 grid, 64px keys, backspace, haptic tick) and `OtpInput` (6 auto-advancing boxes, paste support, backspace navigation, auto-focus).
  - Added 28 auth and error strings across `en`, `hi`, and `hi-Latn` catalogs with 100% key parity (104 keys).
  - Implemented `/` (splash with logo, pulse animation, and 3 feature pills, auto-routing via nextRoute).
  - Implemented `/welcome/` (hero illustration, title, subtitle, trust badge, language switcher, "Continue with phone" button).
  - Implemented `/login/` (+91 country chip, 10-digit display, keypad, SendOTP integration, 429 rate-limit handling).
  - Implemented `/verify/` (OtpInput, 30s resend countdown timer, VerifyOTP integration, attempt countdown warning, session persistence, nextRoute navigation).
  - Implemented `/profile-setup/` (React Hook Form + Zod, name input, optional email input, language switcher, PatchMe integration, nextRoute navigation).
  - All 42 frontend tests passing; 71 backend tests passing; static export (9/9 pages) and lint passing with 0 errors.
- **API Client, Session Store, Secure Storage & Native Layer (Subphase 0.11):**
  - Native service layer in `src/native/` (`platform.ts`, `secure-storage.ts`, `preferences.ts`, `device.ts`, `network.ts`) with `@aparajita/capacitor-secure-storage` on native and `localStorage` fallback on web with explicit security comment. Choice documented in `docs/decisions.md`.
  - Session Zustand store in `src/lib/auth/store.ts` (`useAuthStore`, `useCurrentShop`, `usePermission`).
  - API client in `src/lib/api/client.ts` with `api`, `apiList`, `ApiError`, `request`, single-flight refresh token rotation on parallel 401s via `refreshTokens`, idempotency keys (`Idempotency-Key`), optimistic concurrency (`If-Match`), language (`Accept-Language`), and tenant (`X-Shop-Id`) headers.
  - Query client and session boot in `src/app/providers.tsx` with `SessionBoot.tsx` splash and token validation (`/auth/me/`), `QueryClientProvider` with 30s stale time, `IntlProvider`, and `Toaster`.
  - Generated full TypeScript API schema types from backend OpenAPI spec into `src/lib/api/schema.d.ts` and added `gen:api` npm script.
  - Comprehensive unit test suite in `src/lib/api/client.test.ts` (7 tests covering `api()`, `apiList()`, `ApiError`, offline handling, single-flight refresh, 401 signOut, and headers).
  - All 29 frontend tests passing; 71 backend tests passing; static export build and lint passing with 0 errors.
- **i18n & Indian Formatters (Subphase 0.10):**
  - Locale config and Zustand persisted store for `en` (English), `hi` (Hindi), and `hi-Latn` (Hinglish).
  - Complete message catalogs across 9 namespaces (`common`, `nav`, `states`, `errors`, `auth`, `onboarding`, `home`, `more`, `settings`) with all 33 error codes from `docs/error-codes.md`.
  - NextIntlClientProvider integration via `IntlProvider` in `app/providers.tsx`.
  - `LanguageSwitcher` radio selection component.
  - Translation key checker in `scripts/check-i18n.mjs` verifying 100% key parity across all 3 locales, wired into `pnpm lint`.
  - Indian currency formatters in `src/lib/format/money.ts` (`formatPaise`, `formatPaiseCompact`, `rupeesToPaise`, `paiseToRupeesInput`), date/time formatters in `src/lib/format/date.ts` (`formatDate`, `formatDateTime`, `todayIst`), and phone formatters in `src/lib/format/phone.ts` (`formatPhone`, `toWhatsAppDigits`).
  - 13 formatter unit tests (22/22 total frontend vitest tests passing).
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
