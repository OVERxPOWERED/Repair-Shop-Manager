# Roadmap: Phase 0 and Phase 1 (Week by Week)

*Document 3 of 3 · Version 1.0 · 2 October 2026*  
> 📢 **Superseded:** [ROADMAP.md](../ROADMAP.md) v3.0 (2 October 2026) is the authoritative plan, with step-by-step subphases tracked in [COMPLETION.md](../COMPLETION.md). This file is kept for history; where the two differ, ROADMAP.md wins.

Assumes one developer at roughly 25 to 30 focused hours per week, using Antigravity with the files in `.agents/`. Durations are rough. If a week slips, use the "if behind" note instead of adding hours.

**How to use this file:** at the start of each week run `/weekly-plan`, paste the week's agent prompt, and tick tasks off as you go. At the end of the week run `/review` and update `docs/PROJECT-STATE.md`.

---

## Before Week 1: do these in parallel (non-coding, long lead time)

- [ ] Start **SMS DLT registration** (entity, sender ID, OTP and notification templates). Approval can take days. Pick an SMS provider.
- [ ] Create a **Google Play developer account** (one-time fee).
- [ ] Decide when to pay for the **Apple Developer account** (needed for TestFlight/App Store; a free Apple ID can run builds on your own device for short periods).
- [ ] Buy or borrow a **Mac** (or choose a cloud macOS builder) for iOS builds.
- [ ] Buy two **BLE thermal printers** (one 58 mm, one 80 mm) and note the models for `docs/printers.md`.
- [ ] Get a real **Android phone** and an **iPhone** for testing.
- [ ] Decide **ownership** of code, hosting, store accounts and customer data with the client.
- [ ] Pick the app name and reverse-domain id (for example `in.yourcompany.repairshop`); changing it later creates a different store app.

---

# Phase 0: Foundations (Weeks 1 to 4)

**Phase goal:** a signed-in user can create a shop and invite staff, on web, Android and iPhone, with i18n, audit logging and CI in place. Two risky spikes (printer, OCR) are answered early.

## Week 1: Repository, tooling, skeleton

**Goal:** everything runs locally and in CI; Capacitor shows a blank app on a real Android phone.

- [ ] Create the repo with the structure from `AGENTS.md`; copy in `docs/`, `.agents/`, `AGENTS.md`, `GEMINI.md`
- [ ] `docker-compose.yml` with Postgres and Django; `.env.example`; settings split (`base`, `dev`, `prod`)
- [ ] Django project, `core` app (base models, soft-delete queryset), `/api/v1/health/`
- [ ] Next.js app with `output: 'export'`, TypeScript, Tailwind, shadcn/ui, ESLint, Vitest
- [ ] Capacitor added; app runs on a real Android phone
- [ ] GitHub Actions: backend (ruff, pytest) and frontend (lint, typecheck, test, build)
- [ ] pre-commit hooks (ruff, prettier)
- [ ] Sentry projects created (backend + frontend), DSNs in env only

**Done when:** `docker compose up` works, CI is green, the Android phone shows the web app from `out/`.
**If behind:** skip pre-commit and Sentry; do them in Week 4.

**Agent prompt:**
```
/kickoff
Then scaffold Week 1 from docs/03-roadmap-phase-0-1.md. Plan first: list the files and commands you will create/run. Do not add features beyond the skeleton. Follow AGENTS.md and the rules in .agents/rules.
```

## Week 2: Tenancy, auth, API foundation, and the printer spike

**Goal:** OTP login works (console provider), tenant scoping is enforced and tested, and you know whether your printer + OCR plan is viable.

- [ ] `accounts`: `User`, `OTPChallenge`, `UserDevice`; OTP request/verify endpoints; `ConsoleSmsProvider`; throttles
- [ ] JWT with rotating refresh and reuse detection; logout; logout-everywhere
- [ ] `tenancy`: `Organization`, `Shop`, `Role`, `Membership`, `Invite`; system roles seeded
- [ ] `ShopScopedModel`, `ShopScopedViewSet`, `HasShopPermission`, `X-Shop-Id` handling
- [ ] API conventions implemented: envelope, error handler, pagination, idempotency key middleware
- [ ] **Isolation test suite** (two shops, three roles) running in CI
- [ ] **Spike A:** print a bitmap receipt (English + Hindi) to your BLE printer from Android, then iPhone
- [ ] **Spike B:** barcode scan and OCR of an IMEI sticker on a real phone; note accuracy and plugin choices in `docs/decisions.md`

**Done when:** OTP login works via API tests; isolation tests pass; you have written down what works and what does not for printing and OCR.
**If behind:** keep Spike B to a 2-hour feasibility test; finish Spike A only on Android first.

**Agent prompt:**
```
/new-feature
Feature: accounts + tenancy foundation (phone OTP login, organizations, shops, memberships, roles) per docs/02-database-schema.md sections 4.1 and 4.2 and the otp-auth and django-multitenant-api skills. Include the cross-shop isolation tests. Plan first.
```

## Week 3: Frontend shell, i18n, onboarding

**Goal:** a usable app shell with login, language switching and a shop onboarding wizard.

- [ ] Design tokens, typography (Noto fonts), colour system, light/dark if desired, safe-area handling
- [ ] API client: token storage (secure storage on native), refresh, `X-Shop-Id`, error-code mapping
- [ ] `next-intl` set up with `en`, `hi`, `hi-Latn`; language switcher; Indian number/date helpers (`formatPaise`, `formatDate`)
- [ ] Screens: phone entry, OTP entry (autofill attributes), onboarding wizard (shop name, type, address, state, GST toggle, UPI ID), brand setup
- [ ] App shell: bottom navigation, shop switcher placeholder, settings skeleton
- [ ] Capacitor on iPhone (real device) via Xcode
- [ ] Playwright: login flow with the test OTP

**Done when:** you can sign up on web, Android and iPhone, create a shop, switch language, and see translated labels.
**If behind:** ship English + Hinglish first; add Devanagari translations in Week 14.

**Agent prompt:**
```
/add-screen
Build the login (phone + OTP) and shop onboarding wizard screens using the API from Week 2. Use next-intl with en, hi, hi-Latn. Mobile first at 360px. Plan first and list i18n keys.
```

## Week 4: Staff, audit, free deployment, phase review

**Goal:** staff can be invited with roles; every sensitive action is audited; a pilot backend is reachable on the internet.

- [ ] `audit` app: `AuditLog` writes for role/permission/staff changes and login on a new device
- [ ] Staff invite flow (owner adds phone and role; staff logs in and accepts)
- [ ] Roles screen (view default roles; custom roles can wait)
- [ ] Soft-delete managers and trash utilities in `core`
- [ ] Deploy backend to the **free pilot stack** (Render free web service + Neon free Postgres), with CORS for Capacitor origins; document steps in `docs/release.md`
- [ ] Scheduled `pg_dump` backup via GitHub Actions to private storage
- [ ] Sentry connected and tested with a deliberate error
- [ ] Phase 0 review: update `docs/PROJECT-STATE.md`, `docs/decisions.md`, `docs/printers.md`

**Done when:** a second phone logs in as staff, sees only the shop it was invited to, and an audit entry exists for the invite; the free-hosted API responds from your phone on mobile data.
**If behind:** defer the roles screen and backups to Week 15.

**Agent prompt:**
```
/new-feature
Feature: staff invites + audit log (docs/02-database-schema.md sections 4.2 and 4.3). Include tests that an invited engineer cannot access owner-only endpoints and that every role change writes an AuditLog row.
```

---

# Phase 1: Core Repair MVP (Weeks 5 to 16)

**Phase goal:** your own shop runs daily on the app: customers, devices, job sheets, statuses, invoices (optional GST), payments, printing, tracking links, in three languages.

## Week 5: Customers and devices

- [ ] `customers` and `devices` apps per schema; trigram search indexes
- [ ] Customer create/edit/list with search by name or phone; duplicate phone handling
- [ ] Device create with brand picker (from `shop_brand`), model, identifiers (manual IMEI first, Luhn validation on server and client)
- [ ] Customer detail shows devices and (later) job history
- [ ] Tests: validation, duplicate phones, other-shop isolation, Luhn cases

**Done when:** you can add a customer with a device and find them by partial phone or IMEI suffix.
**Prompt:** `/new-feature` Customers + devices + IMEI manual entry with validation, per schema 4.4 and 4.5 and the imei-capture skill.

## Week 6: Job sheet creation

- [ ] `jobs` app: `job`, `job_counter`, accessories, photos, notes
- [ ] Create job flow: customer, device, fault, condition, accessories checklist, lock info (encrypted), estimate, advance, expected date, assign engineer
- [ ] Photo capture with on-device compression and upload via signed URLs
- [ ] Job number allocation under concurrency (test it)
- [ ] Job detail screen; edit (respecting `version` conflicts)

**Done when:** the whole job sheet can be created in under a minute and 10 parallel creates give unique job numbers.
**Prompt:** `/new-feature` Job sheet create/edit per schema 4.6; field-level encryption for lock value; photo upload; concurrency test for job numbers.

## Week 7: Status workflow, assignment, dashboard, visibility

- [ ] Status transition table in one service; `job_status_history`; audit
- [ ] Assign/reassign engineers; push notification stub on assignment
- [ ] Dashboard counters (today, pending, repaired, delivered) and filtered job lists
- [ ] Visibility rules: `engineers_see_assigned_only`, `mask_phone_for_engineers`, device-lock visibility; enforced in serializers
- [ ] "Lock order after delivery" and reopen permission
- [ ] Tests: every allowed/forbidden transition, visibility matrix, other-shop isolation

**Done when:** an engineer account sees exactly what the settings allow and cannot see cost, profit, or masked phones.
**Prompt:** `/new-feature` Status workflow + assignment + dashboard counters + visibility rules per schema sections 7 and 8.

## Week 8: IMEI barcode scan and OCR, "Check IMEI" shortcut

- [ ] `src/native/barcode.ts` and `ocr.ts` services with web fallback
- [ ] IMEI capture UI: type / scan / OCR; confirm screen; dual IMEI; source badge
- [ ] Duplicate IMEI warning with previous jobs
- [ ] "Check IMEI" button (prefilled SMS or official portal link from a constants file)
- [ ] Real-device test matrix: two Android phones, one iPhone, bad lighting, damaged sticker
- [ ] Document accuracy findings in `docs/decisions.md`

**Done when:** a typical sticker is captured correctly most of the time and a wrong OCR result can never be saved without confirmation.
**If behind:** keep barcode + manual; ship OCR as "beta" in Week 15.
**Prompt:** `/new-feature` IMEI barcode and OCR capture per the imei-capture skill. Native logic only in src/native; unit-test the parsing and Luhn logic.

## Week 9: Line items, estimates, payments

- [ ] `job_line_item` (parts, labour, other) with cost and price
- [ ] Estimate vs final amount; customer approval note
- [ ] `payment` with modes cash/UPI/card/bank/credit, advance, partial, refund; idempotency keys
- [ ] Balance due on job and invoice; UPI QR generator using the shop's UPI ID
- [ ] Tests per the payments-upi-ledger skill (paise math, retries, overpayment rules)

**Done when:** a job can take an advance and two part-payments and the balance is always correct.
**Prompt:** `/new-feature` Line items + payments + UPI QR per schema 4.6 and 4.7 and the payments-upi-ledger skill.

## Week 10: Invoices and GST toggle

- [ ] `invoice_series`, `invoice`, `invoice_line`; draft → issue → credit note
- [ ] Tax service per the gst-invoicing skill; shop GST toggle; CGST/SGST vs IGST
- [ ] Immutable issued invoices with snapshots; numbering per financial year
- [ ] Invoice screens (draft edit, preview, issue, cancel via credit note)
- [ ] **Have a CA review** the tax calculation tests and number format before real use
- [ ] Tests: financial-year rollover, concurrent issue, composition shop, rounding

**Done when:** a GST and a non-GST shop each produce correct invoices and an issued invoice cannot be edited.
**Prompt:** `/new-feature` Invoices with optional GST per the gst-invoicing skill and schema 4.7. Mark every unverified GST rule as TODO(verify) rather than guessing.

## Week 11: PDF output and sharing

- [ ] WeasyPrint templates (A4 and A5) with embedded Noto fonts, logo, UPI QR, tracking QR, terms, signature
- [ ] Hindi/Hinglish rendering test with long names and mixed scripts
- [ ] Share via native share sheet and WhatsApp (`wa.me` text + PDF share)
- [ ] Job sheet PDF (intake receipt) in addition to the invoice
- [ ] Store `pdf_key` and regenerate safely (issued invoice PDF is generated from the snapshot)

**Done when:** the same PDF looks identical on web, Android and iPhone, and Devanagari text renders correctly.
**Prompt:** `/new-feature` Server-side PDF generation for invoice and job sheet using WeasyPrint with embedded Noto fonts; include a test that renders Hindi text.

## Week 12: Thermal printing

- [ ] `PrinterService` interface with native (plugin) and web (print dialog) implementations
- [ ] Bitmap receipt pipeline (HTML → canvas → 1-bit → ESC/POS raster) per the thermal-printing skill
- [ ] Printer settings screen: scan, connect, paper width, test print, auto-cut, remembered printer
- [ ] Android first, then iPhone BLE; fill `docs/printers.md` with real results
- [ ] Failure handling: printer off, out of range, mid-print disconnect
- [ ] Web fallback receipt page (`@page` for 58/80 mm)

**Done when:** a Hindi receipt prints correctly on your tested printers and the app explains failures clearly.
**If behind:** support Android only for Phase 1 pilot; keep iPhone printing as a Phase 2 task.
**Prompt:** `/new-feature` Thermal printing with the bitmap pipeline per the thermal-printing skill. Use a fake printer for tests; do not claim hardware works until I confirm on a real device.

## Week 13: Tracking link, WhatsApp share, SMS notifications

- [ ] Server-rendered tracking page `/t/{token}/` (minimal data, throttled, expiry), QR on job sheet
- [ ] WhatsApp share via `wa.me` for: job received, ready for pickup, invoice
- [ ] `messaging` app: templates per language, `message_log`, console provider in dev
- [ ] SMS provider adapter wired once DLT templates are approved; opt-out handling
- [ ] Settings: which events send automatic SMS; default WhatsApp app choice (client preference)
- [ ] Tests: token unguessability, expiry, no internal IDs exposed, rate limiting

**Done when:** a customer opens the link from WhatsApp, sees the right status in their language, and nothing sensitive leaks.
**Prompt:** `/new-feature` Public tracking page (Django template) + message templates + WhatsApp share links + SMS adapter per schema 4.8 and the decision log.

## Week 14: Trash, export, settings, language pass

- [ ] Trash and restore for jobs, customers, invoices (invoices only as cancelled, never deleted)
- [ ] Export jobs/customers/invoices to Excel and PDF (permission-gated, audited)
- [ ] Settings screens: accessories list, GST, printer, notification toggles, lock-after-delivery, visibility toggles
- [ ] Complete `hi` and `hi-Latn` translations; native speaker review of key screens
- [ ] Basic reports: jobs by status, daily collection by payment mode, revenue by period
- [ ] Accessibility pass (labels, contrast, focus order, touch targets)

**Done when:** every visible string is translated, exports work, and trash/restore is safe.
**Prompt:** `/new-feature` Trash/restore, exports and settings screens per schema sections 6 and 9; audit every export.

## Week 15: Hardening, security, store readiness

- [ ] Permission sweep: run the full isolation + role test matrix; fix gaps
- [ ] Performance: query counts, missing indexes, slow screens on a mid-range Android
- [ ] Security checklist: OTP abuse tests, token reuse, upload limits, CORS, secrets scan
- [ ] Backups restored once into a clean database (prove they work)
- [ ] Privacy policy and terms pages; **account deletion flow** (in-app + public page)
- [ ] Reviewer demo account with fixed test OTP (allowlist)
- [ ] Store listing assets: icon, screenshots (en + hi), descriptions
- [ ] Finish anything deferred from earlier weeks

**Done when:** `/review` over the whole repo returns no blockers and a restore drill succeeds.
**Prompt:** `/review` Run against the entire repository and report Blocker/Should fix/Nit with file references. Then fix blockers one at a time with tests.

## Week 16: Pilot at your own shop

- [ ] Build signed Android bundle for Play **internal testing**; iOS via TestFlight (paid account)
- [ ] Run real jobs for at least one full week alongside the old process
- [ ] Daily 10-minute review: crashes, confusing screens, slow steps; log every issue
- [ ] Fix top issues; do not add features
- [ ] Before onboarding a **second** shop: move from free hosting to a paid VPS with backups and monitoring

**Exit criteria for Phase 1**
- [ ] 100 percent of the shop's new jobs go through the app for a week
- [ ] No data-isolation or invoice-numbering bugs
- [ ] Printing works on the shop's real printer
- [ ] Customers successfully use tracking links
- [ ] Backup restore tested
- [ ] Known-issue list is short and understood

**Prompt:** `/release-build` then `/weekly-plan` to triage pilot feedback.

---

## Weekly rhythm (solo)

| Day | Focus |
|---|---|
| Monday | `/weekly-plan`; pick the riskiest task first |
| Tuesday to Thursday | Build with `/new-feature`; one vertical slice at a time (API + UI + tests) |
| Friday | `/review`, real-device testing, update `docs/PROJECT-STATE.md`, plan next week |

## Scope guards

- If a task is estimated above 6 hours, split it.
- No Phase 2+ work until the Phase 1 exit criteria are met.
- Never skip tenant-isolation tests to save time.
- Verify every external fact (GST rule, free-tier limit, store policy, price) the week you depend on it.
- When an AI suggestion looks too easy for printing, GST or auth, test it on a real device or with an accountant before trusting it.

## After Phase 1

Phase 2 (inventory, POS, khata, staff payroll) starts only after the pilot exit criteria. Create `docs/04-roadmap-phase-2.md` using the same format; ask the agent to draft it from `docs/01-blueprint.md` section 2 and the P2 tables in `docs/02-database-schema.md`.
