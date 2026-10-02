<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Outfit&weight=700&size=34&duration=2500&pause=1000&color=2563EB&center=true&vCenter=true&width=650&height=80&lines=Repair+Shop+Manager;Smart+%E2%80%A2+Simple+%E2%80%A2+Powerful;Built+for+Mobile+%26+Electronics+Shops;Android+%E2%80%A2+iOS+%E2%80%A2+Web+from+One+Codebase" alt="Repair Shop Manager Header Animation" />
</p>

<p align="center">
  <strong>An all-in-one multi-tenant management platform for electronics and mobile repair businesses.</strong><br>
  Digital Job Sheets • Thermal & PDF Invoicing • GST Engine • Cash & UPI Khata • POS & Inventory • Role-Based Access
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Android%20%7C%20iOS%20%7C%20Web-blue?style=for-the-badge&logo=android" alt="Platforms" />
  <img src="https://img.shields.io/badge/Frontend-Next.js%20(Static)-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Mobile-Capacitor-53B987?style=for-the-badge&logo=capacitor" alt="Capacitor" />
  <img src="https://img.shields.io/badge/Backend-Django%20%2B%20DRF-092E20?style=for-the-badge&logo=django" alt="Django" />
  <img src="https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Locale-English%20%7C%20%E0%A4%B9%E0%A4%BF%E0%A4%A8%E0%A5%8D%E0%A4%A6%E0%A5%80%20%7C%20Hinglish-orange?style=for-the-badge" alt="Localization" />
</p>

---

## 🌟 Overview

**Repair Shop Manager** is engineered specifically for the real-world operational challenges of mobile, computer, and electronics repair businesses. Designed to replace scattered paper registers, manual spreadsheets, and clunky legacy software, it delivers a unified, fast, and reliable management system across **Android, iOS, and Web**.

### Key Value Propositions
* 🚀 **Zero App-Fatigue for Customers:** Customers don't need to install an app. They receive an instant live tracking link via SMS or WhatsApp, accessible with a single tap or by scanning a secure QR code on their printed receipt.
* 🖨️ **Bilingual Thermal Printing:** A specialized raster-bitmap pipeline prints Hindi (Devanagari) and English text crisp and clean on 58mm/80mm Bluetooth and BLE thermal printers without font distortion.
* 🇮🇳 **Built for Indian Business Realities:** Native UPI QR codes on bills (`upi://pay`), an optional GST engine with financial-year sequential numbering, Indian number formatting (Lakhs/Crores), and DLT-compliant transactional messaging.
* 🛡️ **Ironclad Multi-Tenant Isolation:** Complete data separation by `shop_id`, field masking (hiding customer numbers and wholesale profit margins from technicians), and immutable issued invoices.

---

## 📋 Feature Showcase

### 🛠️ Repair Operations & Job Intake
* **Live Operational Dashboard:** Real-time metrics for *Today's Intake*, *Pending Repairs*, *Repaired Devices*, and *Delivered Orders*.
* **Comprehensive Job Sheets:** Fast intake workflow capturing customer contact info, device category, brand, model, physical defects, condition notes, and estimated completion date.
* **Triple IMEI & Serial Capture:** Input device identifiers via manual typing, camera barcode/QR scanning, or camera OCR text recognition with Luhn check-digit verification.
* **Encrypted Security Credentials:** Safely record device unlock patterns or PINs with field-level encryption.
* **Accessories Intake Checklist:** Track received SIM trays, power chargers, cases, and memory cards.
* **Quick Intake Modes:**
  * **Rough Reg:** Lightning-fast drop-off entry for high-volume walk-ins.
  * **Quick Bill:** Instant counter invoice without requiring a full job sheet.
  * **Old Buy:** Formal intake records for purchasing used or second-hand devices from customers.
* **Stolen Device Verification:** Built-in shortcut for verifying device legitimacy and IMEI status via official portals.

### 🧾 Invoicing, Payments & Khata (Ledger)
* **Dual Printing Engine:** Instant printing for both Bluetooth/BLE thermal receipts (58mm/80mm) and server-generated A4/A5 PDF invoices with embedded Noto fonts.
* **Optional GST Engine:** Per-shop toggle. Supports CGST/SGST (intra-state) or IGST (inter-state), HSN/SAC codes, and compliant annual numbering sequences. Generates clean non-tax bills when disabled.
* **Hybrid Payment Options:** Record payments across Cash, UPI, Card, Bank Transfer, and Udhaar (credit tracking). Supports advance deposits, partial payments, and refunds.
* **Dynamic UPI QR Codes:** Auto-generates standard UPI QR codes (`upi://pay?pa=...`) on printed slips and the customer web tracking page for zero-fee instant payments.
* **Day-End Register Reconciliation:** Balances expected daily cash, UPI, and card collections against the physical cash drawer before closing shifts.
* **Khata Profit & Expense Tracking:** Track daily and monthly net profit broken down across repairs, retail sales, rough entries, and quick bills, along with supplier payables and customer udhaar.

### 📦 Inventory & Point of Sale (POS)
* **Retail Counter:** Point-of-sale checkout for accessories and packaged goods.
* **Automatic Stock Deduction:** Spare parts (screens, batteries, charging ICs) automatically decrement from inventory when a job sheet is completed.
* **Smart Stock Alerts:** Proactive low-stock warnings and supplier price-drop notifications.
* **Hardware Matcher (H/W Match):** Built-in compatibility lookup mapping which screens, batteries, and components fit various device models.
* **Parts Demands:** Log and track unstocked items requested by walk-in customers.

### 👥 Staff, Security & Multi-Store Management
* **Role-Based Access Control (RBAC):** Configurable permissions across Owner/Admin, Manager, Front Desk, and Technician roles.
* **Technician Privacy Controls:** Mask wholesale part costs, repair profit margins, and optionally customer phone numbers from technicians.
* **Delivery Permissions:** Dedicated toggle to specify whether staff can mark orders as delivered.
* **System Trash & Audit Trail:** 30-day soft-delete protection with full recovery and immutable audit logs for all sensitive actions.
* **Multi-Store Ready:** Seamlessly manage multiple shop branches under a single parent organization.

---

## ⚡ Core Modules

<details open>
<summary><h3>📱 1. Digital Job Sheet Engine (Intake to Delivery)</h3></summary>

* **Fast Device Intake:** Record customer details, device category, brand, model, and physical defects.
* **IMEI & Serial Capture:** Three input modes: Manual entry, Camera Barcode/QR scanning, and Camera OCR sticker scanning with Luhn algorithm check-digit verification.
* **Pattern Lock & Security:** Visual pattern/PIN recorder stored with field-level encryption.
* **Accessories Checklist:** Track received SIM trays, chargers, back covers, and memory cards.
* **Lifecycle State Machine:** `Received` → `Diagnosing` → `Awaiting Approval` → `Awaiting Parts` → `In Repair` → `Repaired` → `Ready for Pickup` → `Delivered`.
* **Delivery Safeguards:** "Lock Order after Delivery" toggle to freeze delivered jobs from unauthorized tampering.
</details>

<details open>
<summary><h3>🧾 2. Invoicing, Payments & Dual Printing</h3></summary>

* **Dual Printing Engine:**
  * **Thermal (58mm / 80mm):** ESC/POS raster-bitmap printing for flawless Hindi and English font rendering over Bluetooth & BLE.
  * **A4 / A5 PDF:** Server-generated via WeasyPrint with embedded Google Noto fonts and direct WhatsApp sharing.
* **Flexible Billing Modes:** Full Job Sheet Invoices, **Quick Bill** (instant counter sale), **Rough Reg** (fast walk-in drop-off), and **Old Buy** (used phone purchase).
* **Optional GST Engine:** Per-shop toggle. If enabled, calculates CGST/SGST or IGST, HSN/SAC codes, and auto-generates consecutive financial-year numbers (`INV/2026-27/0001`). If disabled, prints clean non-tax bills.
* **Payments & Dynamic UPI QR:** Record Cash, UPI, Card, Bank, and Udhaar (credit). Every bill generates a zero-fee standard UPI QR (`upi://pay?pa=...`) for instant customer scanning.
</details>

<details>
<summary><h3>📊 3. POS Counter, Inventory & Day-End Register</h3></summary>

* **POS Sales & Stock Deduction:** Retail sales counter with automatic stock deduction when spare parts are used in repair jobs.
* **Low-Stock & Price-Drop Alerts:** Proactive notifications when parts run low or supplier prices fluctuate.
* **Close Register (Day End):** Reconcile expected cash, UPI, and card collections against physical cash drawer before shift lock.
* **H/W Match & Part Finder:** Compatibility matrix mapping which screens, batteries, and ICs fit various phone models.
</details>

<details>
<summary><h3>📚 4. Khata Ledger & Accounting</h3></summary>

* **Profit & Revenue Analytics:** Real-time breakdown of daily and monthly net profit across repairs, retail sales, rough entries, and quick bills.
* **Customer Udhaar (Dues):** Track outstanding customer dues with 1-tap reminders.
* **Supplier & Expense Manager:** Track daily shop expenses, monthly fixed overheads (rent, electricity), and supplier payables.
</details>

<details>
<summary><h3>🔐 5. Role-Based Access Control & Multi-Tenancy</h3></summary>

* **Hierarchy:** `Organization` (Owner) → `Shops` (Branches) → `Memberships` (Staff).
* **Granular Permissions:** Pre-configured roles for Owner, Manager, Front Desk, and Technicians/Engineers.
* **Field Masking:** Sensitive wholesale parts costs, profit margins, and customer phone numbers can be masked from technicians.
* **System Trash & Audit Log:** Soft-delete recovery within 30 days and immutable append-only logs for all sensitive actions.
</details>

---

## 🗺️ Master Development Roadmap

For the comprehensive week-by-week engineering milestones, visual design system, screen catalog, and delivery phases, consult [**ROADMAP.md**](ROADMAP.md).

---

## 🚀 Quickstart & Local Development

### Prerequisites
* **Python 3.12+**
* **Node.js 20+** & **pnpm 9+**
* **PostgreSQL 15+** (or Docker)

### 1. Backend Setup
```bash
docker compose up -d db                      # Postgres 16 on localhost:5432
cd backend
uv venv --python 3.12 .venv && source .venv/bin/activate   # or python3.12 -m venv .venv
pip install -r requirements-dev.txt
python manage.py migrate                     # also seeds system roles (from 0.7)
python manage.py runserver 0.0.0.0:8000
pytest                                       # needs the db container running
```

### 2. Frontend Setup
```bash
cd frontend
pnpm install

# Start local web development server
pnpm dev

# Build static output for mobile & production
pnpm build
```

### 3. Mobile Run (Android)
```bash
cd frontend
npx cap sync
npx cap run android
```

---

<p align="center">
  <sub>Built with ❤️ for repair shop technicians and store owners across India.</sub>
</p>
