### Core Functional Modules Understood

#### A. Digital Job Sheet Management (The Core Engine)
* **Intake Flow:** Fast device intake recording customer details, device brand/model, problem description, visual pattern lock/passcode, received accessories checklist, physical condition/scratches, and estimated cost/date.
* **IMEI / Serial Capture:** Three input methods: manual typing, camera barcode/QR scanning, and camera OCR of the IMEI sticker.
* **Repair Lifecycle:** Job status pipeline (`Today`, `Pending`, `Repaired`, `Delivered`).
* **Protection & Integrity:** Locking orders after delivery, staff delivery permissions, and a full audit trail of changes.

#### B. Customer Communication (No Dedicated Customer App)
* **Zero-Friction Web Tracking:** Customers do not need to download an app. Instead, they receive a secure tracking link (`token`-based) sent via WhatsApp or SMS, and can scan a QR code printed on their physical receipt/job sheet.
* **WhatsApp & SMS:** 
  * Direct `wa.me` links or official WhatsApp Business API (avoiding fragile Android Accessibility hacks).
  * Transactional SMS with Indian DLT compliance for status updates, receipts, and OTPs.

#### C. Billing, Invoicing & Dual Printing
* **Invoicing Modes:** Full invoices, "Quick Bill" (instant retail bill), "Rough Reg" (quick drop-off entry), and "Old Buy" (used device purchase records).
* **GST Engine:** Per-shop toggle. If enabled, handles HSN/SAC codes, CGST/SGST/IGST breakdown, and consecutive financial-year invoice numbering. If disabled, produces a clean, non-tax bill. Invoices are snapshotted and never hard-deleted.
* **Dual Printing Support:**
  * **Thermal (58mm/80mm Bluetooth & BLE):** Rendered as bitmaps before sending ESC/POS commands so Hindi and regional Indian scripts print crisply without font corruption.
  * **A4 / PDF Invoices:** Generated server-side with embedded Noto fonts to ensure identical layouts across Android, iOS, and Web.

#### D. Payments & Khata (Accounting)
* **Hybrid Payment System:**
  * Support for Advance, Part-Payment, Balance Due, and Udhaar (credit tracking).
  * Embedded UPI QR codes (`upi://pay?...`) on printed receipts and the web tracking page, depositing funds straight into the shop owner's UPI ID with zero gateway fees.
  * Manual verification flow by staff ("Mark as Paid"). Full gateway integration deferred to later.
* **Day-End Register Closing:** Splitting daily cash, UPI, and card totals to balance the physical cash drawer.
* **Khata Ledger:** Daily/monthly revenue, expenses, and net profit breakdowns across repairs, retail sales, and rough entries.

#### E. Inventory & Spare Parts
* Tracking parts (screens, batteries, ICs, charging ports) with automatic stock deduction when a repair job is marked complete.
* Low-stock warnings, purchase pricing, supplier directory, and hardware matching ("H/W Match").

#### F. Staff & Role-Based Access Control (RBAC)
* Roles: Owner/Admin, Manager, Front Desk, Technician/Engineer.
* **Default Job Visibility:** All staff see all jobs to quickly answer customer queries at the counter, with an optional toggle to restrict technicians to assigned jobs only.
* **Field Masking:** Masking sensitive wholesale parts costs, margins, and optionally customer phone numbers from technicians.
* **Staff Performance:** Tracking repairs completed per technician, commissions, and payroll.

#### G. Multi-Branch & Multi-Tenancy Architecture
* Hierarchy: **Organization (Owner) → Branches / Shops → Memberships & Roles**.
* Starts in single-shop mode by default; multi-branch switcher UI surfaces automatically only when an owner adds a second branch.
