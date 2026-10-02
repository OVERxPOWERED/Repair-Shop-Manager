# FixPro: Master Development Roadmap

> **The Single Source of Truth for Engineering, Visual Design, and Product Delivery.**  
> *Consolidates and unifies the technical blueprints, database schema milestones, and screen-by-screen UI roadmaps into one actionable master journey.*  
> *Version 2.0 · October 2026*

---

## 📌 Master Plan Summary

| Phase | Title | Duration | Core Goal | Primary Deliverables |
|---|---|---|---|---|
| **Phase 0** | **Foundations & App Shell** | Weeks 1–4 | Solid multi-tenant base, auth, CI, design system, and hardware spikes | Repo, Docker, Django core, Next.js static export, Capacitor mobile shells, OTP auth, tenant isolation tests, thermal print & OCR spikes. |
| **Phase 1** | **Core Repair MVP** | Weeks 5–16 | Run 100% of real repair intake and operations at your own shop | Customers, devices (IMEI Luhn), digital job sheets, status machine, payments (cash/UPI), dual printing (thermal & PDF), optional GST, web tracking link. |
| **Phase 2** | **Inventory, POS, Khata & Staff** | Weeks 17–26 | Complete retail sales, parts stock, bookkeeping, and payroll | Parts inventory, auto-stock deduction, H/W matcher, POS counter, day-end cash register close, Khata ledger, customer udhaar, staff payroll & commission. |
| **Phase 3** | **Scale, Sync & Monetization** | Weeks 27–36 | Multi-store scaling, offline resilience, and SaaS subscription billing | Multi-branch switcher, true offline sync (SQLite outbox), subscription plans, store in-app billing, bulk messaging, instant shop website builder, VPS migration. |
| **Phase 4** | **B2B Marketplace & Community** | Weeks 37+ | Local spare parts discovery and wholesale partner network | Nearby shops & wholesalers (PostGIS location search), trusted merchant badges, part listings, B2B community. |

---

## 🧭 Architectural Guardrails & Engineering Standards

Before writing code for any milestone, the following non-negotiables must be adhered to:
1. **Tenant Isolation:** Every business table carries `shop_id`. Every query filters through `ShopScopedModel` and `ShopScopedViewSet`. Automated cross-tenant tests are mandatory.
2. **Integer Currency:** All money fields are stored as integer paise (`bigint` with `_paise` suffix). Never use floats or decimals in storage.
3. **Optimistic Locking:** Editable entities return an integer `version`. Updates send `If-Match: <version>`, returning `409 Conflict` on race conditions.
4. **Document Immutability:** Issued invoices are snapshotted in JSONB and can never be updated or deleted. Corrections are strictly handled via Credit Notes.
5. **FixPro Design Aesthetic:** High-contrast monochrome, clean line-art iconography, tabular figures for currency and numbers, and restrained status badges (Emerald, Amber, Sky, Purple, Rose).
6. **Triple Locale Support:** All UI text is externalized through `next-intl` in English (`en`), Hindi (`hi`), and Hinglish (`hi-Latn`).
7. **Static Export Discipline:** The frontend is a client-side static export (`output: 'export'`) packaged with Capacitor. Server-side rendering (SSR) is strictly reserved for the public tracking template in Django.

---

## 🚀 Pre-Week 1: Parallel Long-Lead Prerequisites

These external non-coding tasks must be initiated in parallel before/during Week 1:
- [ ] **SMS DLT Registration:** Register the business entity, sender ID, OTP template, and notification templates on an Indian DLT portal (e.g. Jio, Airtel, or Vodafone).
- [ ] **Developer Accounts:** Initialize Google Play Console developer account ($25 one-time fee) and prepare Apple Developer account ($99/year).
- [ ] **Hardware Test Lab:** Acquire one 58mm and one 80mm Bluetooth/BLE thermal printer, an Android test device, and an iPhone test device.
- [ ] **App Identifier:** Lock reverse-domain ID (e.g., `in.fixpro.repairshop`) and branding.

---

# 🏗️ Phase 0: Foundations & App Shell (Weeks 1 to 4)

> **Phase Exit Criteria:** A user can register via phone + OTP, complete shop onboarding, invite a staff member with a role, and navigate the 5-tab application shell across Web, Android, and iOS. Isolation tests pass in CI, and thermal printing & OCR spikes are proven.

---

### **Week 1: Repository, Tooling & Skeletons**
* **Engineering Deliverables:**
  - Initialize Git repository with canonical folder structure (`backend/`, `frontend/`, `docs/`, `design/`).
  - Configure `docker-compose.yml` (PostgreSQL 16 + Django) and `.env.example`.
  - Scaffold Django backend with `core` app (base abstract models, soft-delete querysets) and health check endpoint `/api/v1/health/`.
  - Scaffold Next.js App Router frontend with `output: 'export'`, TypeScript, Tailwind CSS, and shadcn/ui.
  - Initialize Capacitor in `frontend/` and verify the blank web app renders inside an Android emulator or device.
  - Set up GitHub Actions CI for backend (Ruff, Pytest) and frontend (ESLint, TypeScript, Vitest).
  - Configure Sentry crash reporting projects (DSNs in environment only).
* **UI & Design Integration:**
  - Implement base color tokens, typography scales, and CSS variables from [`design/01-design-system.md`](design/01-design-system.md).
* **Done When:** `docker compose up` starts healthy services, CI passes green, and the Android phone renders the Next.js static build.

### **Week 2: Tenancy, Auth & High-Risk Hardware Spikes**
* **Engineering Deliverables:**
  - `accounts` app: `User`, `OTPChallenge`, `UserDevice` models. Phone number + SMS OTP flow with rate-limiting and temporary console provider.
  - JWT authentication using SimpleJWT with rotating refresh tokens and reuse detection.
  - `tenancy` app: `Organization`, `Shop`, `Role`, `Membership`, and `Invite` models.
  - Tenant scoping middleware and base classes: `ShopScopedModel`, `ShopScopedViewSet`, `HasShopPermission`, and `X-Shop-Id` validation.
  - Automated cross-tenant isolation test suite (verifying Shop A cannot access Shop B records).
* **Hardware Spikes (Crucial Risk Reduction):**
  - **Spike A (Thermal Printing):** Render a bilingual test receipt (English + Hindi) to an HTML canvas, convert to a 1-bit monochrome bitmap, and transmit ESC/POS raster data to a BLE printer on Android and iOS. Document results in `docs/printers.md`.
  - **Spike B (IMEI Scanning):** Test camera barcode scanning and text OCR on physical phone IMEI stickers; record accuracy and lighting edge cases in `docs/decisions.md`.
* **Done When:** Isolation test suite passes in CI, and the thermal printing and OCR spikes confirm hardware feasibility.

### **Week 3: Frontend App Shell, i18n & Onboarding Wizard**
* **UI & Screens Deliverables (Reference: [`screens/1.1-splash.png`](design/screens/1.1-splash.png), [`screens/1.2-onboarding.png`](design/screens/1.2-onboarding.png), [`screens/1.3-image.png`](design/screens/1.3-image.png), [`screens/1.4-main-app-shell.png`](design/screens/1.4-main-app-shell.png)):**
  - **Splash Screen:** Technician workbench illustration, FixPro logo, progress loader (`"Setting things up..."`), and 3 feature pills.
  - **Welcome & Auth Sequence:** Phone entry with country flag selector (`🇮🇳 +91 ▾`), in-app numeric keypad, 6-digit OTP input boxes with countdown timer (`Resend (28s)`), and user profile setup.
  - **Shop Setup Wizard:** Multi-step pill progress bar, shop logo uploader, shop type dropdown (`Mobile Repair Shop`), phone number, and address fields.
  - **Main 5-Tab Shell:** Fixed bottom navigation bar with 5 primary destinations (`Home`, `Jobs`, `Customers`, `Inventory`, `More`) and persistent top header (`Shop Switcher ▾`, Notification bell with badge, User avatar).
* **Engineering Deliverables:**
  - Setup `next-intl` with English (`en`), Hindi (`hi`), and Hinglish (`hi-Latn`).
  - Implement Indian number and currency formatters (`formatPaise(450000)` → `₹4,500.00`).
  - Secure token storage integration (Keychain on iOS, Keystore on Android, web fallback).
* **Done When:** A user can complete the entire authentication and onboarding sequence on Web, Android, and iOS, switch languages, and view translated UI copy.

### **Week 4: Staff Management, Audit Log & Free Cloud Pilot**
* **Engineering Deliverables:**
  - `audit` app: Append-only `AuditLog` recording actor, action, before/after JSONB diffs, IP address, and request ID.
  - Staff invitation workflow: Owner invites technician by phone number and role; technician logs in and accepts membership.
  - Seed default roles: Owner, Manager, Front Desk, and Engineer with pre-configured permissions.
  - Deploy backend to the free pilot stack (Render free web service + Neon serverless Postgres).
  - Set up automated daily database backup script via GitHub Actions to secure private storage.
* **Done When:** An invited engineer logs in on a second device, sees only their assigned shop, actions generate audit records, and the cloud API responds over public mobile data.

---

# 📱 Phase 1: Core Repair MVP (Weeks 5 to 16)

> **Phase Exit Criteria:** 100% of real walk-in repairs at your shop are processed through FixPro for one full week. Job intake, IMEI validation, status tracking, payments, dual printing (thermal & PDF), and customer web tracking links operate smoothly.

---

### **Week 5: Customers & Devices**
* **Backend:**
  - `customers` app: `Customer` model with trigram search indexes (`pg_trgm`) on name and phone.
  - `devices` app: `Device` and `DeviceIdentifier` models (`imei1`, `imei2`, `serial`, `meid`).
  - Server-side and client-side **Luhn algorithm check-digit validation** on the 15th IMEI digit.
* **UI & Screens Deliverables:**
  - Customers list screen with search bar, filter chips (`All 328`, `Active 28`, `Pending Payment 16`), monogram avatar rows, and red/green due balance indicators.
  - Customer detail view showing device list, historical repairs, and balance summary.
  - New Customer & Device modal with brand picker seeded from `shop_brand`.
* **Done When:** Customers and devices can be created and found within milliseconds via partial phone number or last 4 digits of IMEI.

### **Week 6: Digital Job Sheet Intake (The Core Engine)**
* **Backend:**
  - `jobs` app: `Job`, `JobCounter`, `JobAccessory`, `JobPhoto`, `JobNote`, and `JobStatusHistory`.
  - Concurrency-safe job number allocation (`select_for_update` on `job_counter`) to guarantee sequential numbering under simultaneous counter intake.
  - Field-level encryption for device unlock passwords/patterns (`lock_value_enc`).
* **UI & Screens Deliverables:**
  - 8-step progressive job intake flow: Customer → Device → IMEI → Condition Checklist → Problem Diagnosis → Accessories Received → Cost Estimate → Engineer Assignment.
  - Photo attachment capture with client-side compression and pre-signed upload URLs.
* **Done When:** A complete job sheet can be created at the shop counter in under 60 seconds with zero input lag.

### **Week 7: Status Workflow, Assignment & Visibility Controls**
* **Backend:**
  - Finite State Machine: `received` → `diagnosing` → `awaiting_approval` → `awaiting_parts` → `in_repair` → `repaired` → `ready_for_pickup` → `delivered`.
  - Exits: `cancelled`, `returned_unrepaired`. Reopening delivered jobs requires `jobs.reopen` permission.
  - Role-based serializer masking: Customer phone numbers masked (`+91XXXXXX3210`) and wholesale part costs/profits hidden from technicians.
  - "Lock Order After Delivery" setting to freeze delivered jobs from unauthorized alterations.
* **UI & Screens Deliverables:**
  - Home dashboard dark hero card with live counters (*In Progress*, *Pending*, *Repaired*, *Delivered*).
  - Jobs list screen with horizontal status pill filter carousel (`All`, `Pending`, `In Progress`, `Repaired`).
  - Job detail screen with interactive repair timeline, status change drawer, and internal notes.
* **Done When:** Changing job status writes an audit record, updates live dashboard counters, and technicians see only the data permitted by shop settings.

### **Week 8: Native Barcode Scanner, OCR & "Check IMEI"**
* **Engineering Deliverables:**
  - Native service integration for `@capacitor-mlkit/barcode-scanning` with camera viewfinder.
  - On-device text recognition (OCR) targeting smartphone IMEI box/back stickers with regex extraction of 15-digit numbers.
  - Mandatory visual confirmation dialog before saving OCR-extracted IMEI values.
  - Duplicate IMEI detection across existing shop repair records.
  - "Check IMEI" shortcut opening a pre-filled KYM SMS (to 14422) or official Sanchar Saathi verification portal.
* **Done When:** Scanning a physical box barcode or sticker inputs the IMEI accurately into the job sheet with check-digit validation.

### **Week 9: Line Items, Estimates & Payments**
* **Backend:**
  - `job_line_item`: Parts, labour, and miscellaneous line items with cost and retail price tracking.
  - `billing.payment`: Support for payment modes `cash`, `upi`, `card`, `bank`, and `credit` (udhaar).
  - Payment tracking: Advance deposits, partial payments, balance due, and refund ledger.
  - Idempotency key middleware on all payment endpoints to prevent double-charging on network retries.
* **UI & Screens Deliverables:**
  - Line item manager inside Job Detail (add labour fee, select parts, apply discount).
  - Payment modal with mode selector and balance calculation.
  - Dynamic UPI QR Code generator (`upi://pay?pa=...&am=...&tn=...`) rendered on screen for instant customer scanning.
* **Done When:** A job can accept an advance deposit and two partial payments, correctly reflecting the remaining balance due and updating the cash drawer ledger.

### **Week 10: Invoicing & Optional GST Engine**
* **Backend:**
  - `billing.invoice`, `invoice_series`, and `invoice_line` models.
  - Per-shop GST toggle:
    - **GST Enabled:** HSN/SAC codes, CGST/SGST (intra-state) or IGST (inter-state), and sequential financial-year numbering (`INV/2026-27/0001`).
    - **GST Disabled:** Clean, non-tax retail bills.
  - Immutability constraint: Issued invoices freeze customer, shop, and tax snapshots in JSONB. Corrections must be issued via Credit Notes.
* **UI & Screens Deliverables:**
  - Invoice preview, draft editor, and issue confirmation screen.
  - Credit Note generation modal.
  - **Chartered Accountant (CA) Review:** Verify GST rounding, reverse-charge indicators, and tax calculation logic against current regulations.
* **Done When:** Both GST and non-GST shops produce valid invoices, and issued invoices cannot be edited or hard-deleted.

### **Week 11: Server-Side PDF Generation & Sharing**
* **Backend:**
  - WeasyPrint template pipeline generating pixel-perfect A4 and A5 PDF documents.
  - Embedded Google Noto fonts (Noto Sans Devanagari) to guarantee Hindi customer names and addresses render crisp without glyph corruption.
  - Templates for Job Intake Receipts and Final Tax Invoices featuring shop logo, terms, signature block, UPI QR, and tracking QR.
* **Frontend & Mobile:**
  - Native share sheet integration (`@capacitor/share`) and direct WhatsApp sharing (`wa.me` message + PDF).
* **Done When:** The generated PDF invoice renders identically across Android, iOS, and Web with crisp Hindi typography.

### **Week 12: Thermal Receipt Printing Engine**
* **Engineering Deliverables:**
  - `PrinterService` abstraction supporting Capacitor Bluetooth/BLE plugins on mobile and browser print dialog on web.
  - Raster Bitmap Printing Pipeline: Render thermal receipt HTML to canvas, convert to 1-bit monochrome bitmap, and generate ESC/POS raster commands.
  - Printer settings screen: Bluetooth scan, device pairing, paper width selector (58mm vs 80mm), test print, and auto-cut.
  - Connection resilience: Handle printer offline, paper out, and mid-print Bluetooth disconnections with user-friendly error banners.
* **Done When:** A bilingual (English + Hindi) receipt prints cleanly from an Android phone and an iPhone to tested thermal printers.

### **Week 13: Customer Web Tracking Page & Messaging**
* **Backend:**
  - Lightweight Django server-rendered template at `/t/{token}/` (ultra-fast loading on 2G/3G networks, zero JavaScript dependencies, full WhatsApp OpenGraph link preview).
  - Secure, unguessable high-entropy tokens (128-bit) with rate-limiting and configurable expiration (e.g. 30 days post-delivery).
  - Messaging service: Transactional SMS provider adapter (MSG91 / Fast2SMS) linked to approved DLT templates.
* **UI & Screens Deliverables:**
  - Public customer tracking view: Device info, live milestone progress bar, estimated completion date, balance due, shop address, and click-to-call.
  - 1-tap WhatsApp status update triggers (`wa.me`) for *Job Received*, *Ready for Pickup*, and *Invoice*.
* **Done When:** A customer opens their tracking link from WhatsApp, views real-time repair progress, and can scan the embedded UPI QR to pay.

### **Week 14: System Trash, Data Exports & Language Polish**
* **Engineering Deliverables:**
  - Soft-delete Trash management with 30-day retention and restore functionality for jobs, customers, and inventory.
  - Audited data export engine generating encrypted Excel (`openpyxl`) and PDF files for customer directories, repair histories, and sales reports.
  - Complete localization pass: 100% translation coverage across English (`en`), Hindi (`hi`), and Hinglish (`hi-Latn`).
  - Accessibility audit: Touch target minimums (48px), contrast ratios (WCAG AA), and keyboard/screen reader navigability.
* **Done When:** All deleted records can be restored from Trash, data exports run safely under permission controls, and every visible string is translated.

### **Week 15: Security Hardening & Store Readiness**
* **Engineering Deliverables:**
  - Comprehensive permission sweep: Automated verification that technicians and front-desk staff cannot breach owner endpoints or access other shops' data.
  - Security audit: Throttling abuse tests, OTP brute-force limits, CORS origin lockdown, and static secrets scan.
  - App Store reviewer demo account with an allowlisted phone number and fixed verification OTP.
  - Mandatory Apple/Google account deletion workflow (both in-app self-service and a dedicated public web URL).
  - Complete database backup restore drill: Recreate database from automated backup to prove disaster recovery readiness.
* **Done When:** Store pre-submission checklist is 100% satisfied with privacy policy, terms of service, and reviewer test accounts active.

### **Week 16: Live Pilot at Your Own Shop**
* **Execution:**
  - Deploy signed Android APK/bundle to your physical shop counter and technician devices.
  - Run 100% of real repair intake through FixPro for one full week alongside legacy paper/register records.
  - Daily 15-minute triage meetings: Address workflow friction, printer reconnect hiccups, or confusing form fields.
  - Phase 1 Exit Certification: Zero data isolation bugs, zero invoice numbering gaps, flawless thermal printing, and enthusiastic counter staff adoption.

---

# 📦 Phase 2: Inventory, POS, Khata & Staff (Weeks 17 to 26)

> **Phase Goal:** Expand FixPro from a repair tracking tool into a comprehensive workshop retail, inventory, financial bookkeeping, and technician payroll suite.

---

### **Weeks 17–18: Spare Parts Inventory & Stock Movements**
* **Database & Logic:** `inventory.item`, `item_category`, `stock_movement` (append-only), and `price_history`.
* **Features:**
  - Spare parts catalog (screens, batteries, charging ports, camera modules, ICs) with SKU, brand, and unit cost.
  - Automatic inventory deduction: When a repair job is marked `repaired`, parts attached to line items automatically generate `repair_use` stock movements.
  - Low-stock threshold alerts and supplier price-drop tracking.
* **UI Deliverables:**
  - Inventory dashboard (4 metric cards: Total Items, Low Stock, Out of Stock, Total Stock Value).
  - Stock adjustment modal (`Stock In`, `Stock Out`, `Damaged/Scrap`).

### **Weeks 19–20: H/W Match, Supplier Directory & Demands**
* **Features:**
  - **Hardware Matcher (H/W Match):** Compatibility matrix showing which screens, batteries, and connectors can be cross-utilized across phone models.
  - **Supplier Directory:** Manage local wholesale vendors, contact info, GSTIN, and current accounts payable.
  - **Customer Demands:** Log unstocked parts requested by walk-in customers and track fulfillment status (`Open` → `Fulfilled`).

### **Weeks 21–22: Point of Sale (POS) Counter & Day-End Register**
* **Database & Logic:** `pos.sale`, `sale_line`, `sale_return`, and `khata.cash_register_session`.
* **Features:**
  - Rapid retail checkout counter for phone accessories (chargers, tempered glass, cables) with barcode scanning.
  - Instant receipt generation (thermal & A4).
  - **Close Register (Day End):** Cash drawer reconciliation balancing opening cash, expected cash/UPI/card sales against physical drawer count before shift locking.

### **Weeks 23–24: Smart Khata Book (Accounting & Ledger)**
* **Database & Logic:** `khata.expense`, `recurring_expense`, `customer_ledger_entry`, and `daily_shop_summary`.
* **Features:**
  - Real-time financial dashboard displaying Daily and Monthly Net Profit (Revenue minus Expenses).
  - Revenue breakdown cards: Profit split across Repairs, Retail POS, Rough Entries, and Quick Bills.
  - **Customer Udhaar Tracker:** Outstanding credit dues with 1-tap WhatsApp payment reminders.
  - Shop expense tracker: Record daily petty cash expenses and monthly fixed overheads (shop rent, electricity, Wi-Fi).

### **Weeks 25–26: Staff Payroll, Commission & Performance Analytics**
* **Database & Logic:** `staff.payroll_entry` and technician performance metrics on `membership`.
* **Features:**
  - Automated commission calculation: Track percentage commission per technician based on completed repair revenue or labour fees.
  - Monthly payroll generation combining base salary, commission bonuses, and advance deductions.
  - Advanced performance reports: Profit generated per technician, turnaround time per device brand, and rework rates.

---

# 🌐 Phase 3: Scale, Multi-Branch, Sync & Monetization (Weeks 27 to 36)

> **Phase Goal:** Transform FixPro into a scalable multi-branch SaaS platform with offline resilience and subscription monetisation.

---

### **Weeks 27–28: Multi-Branch Organization Architecture**
* Enable multi-branch management under single parent organization accounts.
* Branch switcher UI component (`M Solution - Branch 1 ▾`).
* Consolidated owner analytics: Compare revenue, repair turnaround times, and stock across multiple shop locations.

### **Weeks 29–31: True Offline Sync Engine**
* Local device storage using `@capacitor-community/sqlite`.
* Outbox queue pattern: Record job sheets, payments, and status changes locally while disconnected from internet.
* Background synchronization engine with conflict resolution (last-write-wins with optimistic concurrency tags).

### **Weeks 32–33: Subscription Plans & In-App Billing Compliance**
* Tiered plans: Free tier (capped active jobs), Monthly, Quarterly, Annual, and high-value Lifetime licenses.
* Compliance with Google Play Billing and Apple App Store in-app purchase guidelines for mobile digital subscriptions.
* Platform super-admin dashboard to monitor tenant usage, active subscriptions, and support tickets.

### **Weeks 34–35: Automated Marketing, Reviews & Instant Website Builder**
* Bulk SMS campaigns via DLT-approved templates for festive offers and customer follow-ups.
* Automated Google Review booster: Send WhatsApp review link upon device delivery.
* Instant shop website generator: Auto-generate a modern mobile-friendly landing page from shop profile details and repair service offerings.

### **Week 36: Dedicated VPS Migration & Public Launch**
* Migrate from free pilot tiers to high-performance dedicated VPS (PostgreSQL, Redis, Celery, Nginx/Caddy, WeasyPrint).
* Onboard external commercial repair shops.

---

# 🤝 Phase 4: B2B Marketplace & Community (Weeks 37+)

> **Phase Goal:** Connect local repair shops with spare parts wholesalers, verified component dealers, and peer technicians.

---

* **Nearby Spare Market:** PostGIS-powered geographic search for nearby wholesale spare parts distributors and component suppliers.
* **Verified Merchant Badges:** "Trusted" and "Verified" seller certifications.
* **Wholesale Part Listings:** Allow wholesalers to publish live inventory with price and location.
* **Technician Community:** Moderated discussion forum for troubleshooting complex motherboards, IC schematics, and jumper solutions.

---

## 🎨 Master UI Screen Families & Visual References

Every screen built across the phases derives strictly from the **FixPro** visual mockups in [`design/screens/`](design/screens/):

```text
design/screens/
├── 1.1-splash.png          # Phase 0, Week 3 (Brand splash & value propositions)
├── 1.2-onboarding.png      # Phase 0, Week 3 (Welcome, shop setup, shop details)
├── 1.3-image.png           # Phase 0, Week 2-3 (Auth flow, numeric keypad, 6-digit OTP, profile)
└── 1.4-main-app-shell.png  # Phase 0-2 (Home dashboard, Jobs list, Customers CRM, Inventory, More)
```

### System States Required for Every Major Screen:
For every screen family, the following state variants must be implemented:
1. **Normal State:** Standard data populated with clean cards and tabular numbers.
2. **Empty State:** Friendly technical line illustration + clear call-to-action (e.g., *"No jobs in progress yet. Tap + to create your first job sheet."*).
3. **Loading State:** Content-matched skeleton loaders (never full-screen blocking spinners).
4. **Error State:** Human-readable error message with immediate `[ Retry ]` button.
5. **Offline State:** Subtle persistent offline banner (`"Working offline. Changes will sync when reconnected."`).
6. **Permission Denied State:** Informative lock icon with action request CTA.

---

## 📅 Solo Developer Weekly Cadence

To maintain steady progress at 25–30 focused hours per week:

| Day | Primary Focus | Output |
|---|---|---|
| **Monday** | Planning & Spike | Review week objectives, run `/weekly-plan`, solve the riskiest architectural or design hurdle first. |
| **Tuesday** | Backend & Database | Build Django models, serializers, business services, and write unit/isolation tests. |
| **Wednesday** | Frontend & UI | Implement Next.js screens, shadcn components, forms, and validation adhering to FixPro tokens. |
| **Thursday** | Integration & Hardware | Wire API client with UI, test native Capacitor plugins (camera, printer, share) on real devices. |
| **Friday** | Review & Verification | Run `/review`, execute test suite, update `docs/PROJECT-STATE.md`, commit clean code. |

---

## ✅ Definition of Done (DoD) for Every Milestone

A task or week is only marked **Complete** when:
1. Code compiles cleanly with zero linting (`ruff check`, `pnpm lint`) or type errors (`tsc --noEmit`).
2. Unit and isolation tests pass (`pytest`, `vitest`).
3. Form validation covers empty, invalid, and edge-case inputs with user-friendly errors.
4. UI screens look balanced on mobile viewports (tested at 360px width) and support light mode cleanly.
5. All visible user strings are registered in `en`, `hi`, and `hi-Latn` translation dictionaries.
6. Database migrations are reversible and follow standard naming conventions.
7. [`docs/PROJECT-STATE.md`](docs/PROJECT-STATE.md) is updated with completed work and next priorities.
