# FixPro Manual Testing Guide & Checklist

> **Live Production Test Document**  
> **App URL**: `https://repair-shop-manager-13q.pages.dev`  
> **Backend API**: `https://fixpro-api.onrender.com/api/v1`  
> **Target Audience**: Shop Owner, Manager, Front Desk, and Technician testing from mobile phone browser and desktop browser.

---

## 0. Prerequisite: Authorize Cloudflare Domain in Google OAuth

Before tapping "Continue with Google" on your live site, Google Cloud must recognize your Cloudflare Pages domain:

1. Open [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Click on your OAuth 2.0 Web Client (`FixPro Web & Backend`).
3. Under **Authorised JavaScript origins**, click **+ Add URI** and enter:
   ```
   https://repair-shop-manager-13q.pages.dev
   ```
4. Click **Save**. *(Takes 1-2 minutes for Google to update globally).*

---

## Testing Workflow Overview

```
[ Welcome & Language ] ──> [ Google Login ] ──> [ Profile & Shop Setup ]
         │
         ▼
[ Home Dashboard ] ──> [ 8-Step Intake Wizard ] ──> [ Job Sheet Created ]
         │                                                      │
         ▼                                                      ▼
[ Customer Directory ]                                [ Status Progression ]
         │                                                      │
         ▼                                                      ▼
[ Reports & Exports ] <── [ More Settings & Staff ] <── [ Bill / Invoice / UPI ]
```

---

## Step 1: Language Switcher & Welcome Screen

* [ ] **1.1 Open App on Phone Browser**:
  * Navigate to `https://repair-shop-manager-13q.pages.dev` on your mobile browser (Chrome/Safari).
  * Verify the Welcome page loads with FixPro logo and tagline: *"Trusted by 500+ Indian repair shops"*.
* [ ] **1.2 Real-time Language Switcher**:
  * Tap the language dropdown at the top right:
    * Select **हिन्दी (Hindi)**: Verify all text, buttons, and badges switch to Hindi immediately without reloading.
    * Select **Hinglish**: Verify vernacular repair shop Hinglish is displayed (e.g., *"Job sheet banayein"*).
    * Select **English**: Verify clean English is restored.
* [ ] **1.3 UI Responsive Check**:
  * Verify buttons and text fit comfortably on a narrow 360 px phone screen with no horizontal scrolling.

---

## Step 2: Authentication & Identity

* [ ] **2.1 Google Sign-In (Primary Action)**:
  * Tap the official **"Continue with Google"** button (or One-Tap prompt if shown).
  * Select your Google account.
  * Expected: Google validates credentials, backend issues JWT tokens, and redirects new users to `/profile-setup/` or existing users to `/home/`.
* [ ] **2.2 Phone Login Notice**:
  * Notice the Phone Login option displays a "(Coming Soon)" badge or dev notice explaining that SMS OTP is undergoing TRAI DLT registration.

---

## Step 3: Profile Setup & Shop Creation (Onboarding)

* [ ] **3.1 Profile Setup (`/profile-setup/`)**:
  * Enter your Full Name (e.g., `Ramesh Sharma`).
  * Enter your 10-digit mobile number (e.g., `9876543210`).
  * Tap **"Complete Setup"** -> Redirects to Shop Setup Wizard.
* [ ] **3.2 Shop Onboarding Wizard (4 Steps)**:
  * **Step 1 - Basic Info**:
    * Shop Name: `FixPro Mobile Care`
    * Shop Type: Tap `Mobile Repair` (or Computer / Appliance / Multi-service).
    * Tap **Next**.
  * **Step 2 - Location & Contact**:
    * Shop Phone: `9876543210`
    * Address Line 1: `Shop No. 4, Main Market`
    * City: `Jaipur`
    * Pincode: `302001`
    * State: Select `Rajasthan (08)` from the GST state dropdown.
    * Tap **Next**.
  * **Step 3 - Billing & GST**:
    * **GST Registered Toggle**:
      * Leave OFF for simple bill mode, OR
      * Turn ON and enter a valid 15-character GSTIN (e.g. `08AAAAA0000A1Z5`). Notice live validation!
    * **UPI ID (VPA)**: Enter `ramesh@okhdfcbank` (used for customer QR code payments).
    * Tap **Next**.
  * **Step 4 - Review & Create**:
    * Review shop details. Tap **"Create My Shop"**.
    * Expected: Shop is provisioned in database, default brand catalogs and accessories are seeded, and you land on the **Home Dashboard**.

---

## Step 4: Home Dashboard & Navigation

* [ ] **4.1 Counter Cards**:
  * Verify 4 count cards are visible: `Pending`, `In Progress`, `Repaired`, `Delivered`.
  * Tap on any card (e.g., `Pending`): verify it navigates to the Jobs tab filtered to that status.
* [ ] **4.2 Today's Collection Card**:
  * Displays today's net cashflow (Cash + UPI collection) for the Owner.
* [ ] **4.3 Quick Action Tiles**:
  * Verify **"Add Job Sheet"** tile opens the 8-step intake wizard.
  * Verify **"Check IMEI"** tile opens the anti-theft CEIR / Sanchar Saathi lookup sheet.
* [ ] **4.4 5 Navigation Tabs (Bottom Bar)**:
  * Tap each tab: `Home`, `Jobs`, `Customers`, `Inventory` (shows Phase 2 placeholder), `More`.

---

## Step 5: Naya Job Sheet Banana (8-Step Intake Wizard)

Tap **"+"** in the Jobs tab or **"Add Job Sheet"** on Home:

* [ ] **5.1 Step 1 - Customer**:
  * Tap "New Customer". Enter Name: `Suresh Verma`, Phone: `9829012345`.
  * Tap **Next**.
* [ ] **5.2 Step 2 - Device & IMEI**:
  * Brand: Select `Samsung` (from seeded catalog).
  * Model: Type `Galaxy M31`. Color: `Blue`.
  * **IMEI Input & Luhn Check**:
    * Type an invalid 15-digit number (e.g. `123456789012345`): verify the Luhn warning appears.
    * Type a valid Luhn IMEI (e.g. `353918101234567` or use your own phone's IMEI from `*#06#`). Verify green checkmark.
    * Tap **"Check IMEI"**: verify Sanchar Saathi (CEIR) anti-theft portal link and KYM SMS shortcut appear.
  * Tap **Next**.
* [ ] **5.3 Step 3 - Problem / Fault**:
  * Customer complaint: Type `Display broken, touch not working, charging slow`.
  * Pre-existing issues: Type `Back glass scratched`.
  * Tap **Next**.
* [ ] **5.4 Step 4 - Physical Condition & Photos**:
  * Select condition tags: `Screen Cracked`, `Body Scratched`.
  * Tap **Take Photo / Upload**: attach a photo of the device. Verify thumbnail displays cleanly.
  * Tap **Next**.
* [ ] **5.5 Step 5 - Accessories Received**:
  * Tap checklist items: `SIM Card`, `Back Cover`, `Memory Card`.
  * Tap **Next**.
* [ ] **5.6 Step 6 - Estimate & Device Security**:
  * Estimate Amount: Enter `2500` (₹2,500).
  * Advance Payment: Enter `500` (Mode: Cash).
  * Expected Delivery Date: Select tomorrow's date.
  * **Pattern / PIN Lock**: Select `PIN` -> enter `1234` (stored encrypted with AES-256 Fernet).
  * Tap **Next**.
* [ ] **5.7 Step 7 - Technician Assignment**:
  * Select yourself or leave unassigned. Tap **Next**.
* [ ] **5.8 Step 8 - Confirmation & Post-Intake**:
  * Verify all summary details.
  * Tap **"Create Job Sheet"**.
  * Expected: Sequential Job #1 is generated.
  * **Post-Intake Share Sheet opens**:
    * Tap **"Send WhatsApp"**: opens WhatsApp with pre-filled intake slip and tracking link.
    * Tap **"Print Receipt"**: opens thermal 58mm/80mm preview or A4 PDF.

---

## Step 6: Job Detail, Status Flow & Payments

Open Job #1 from the Jobs list:

* [ ] **6.1 Device Lock Reveal**:
  * Tap **"View Lock PIN"**:
  * Notice the 30-second security countdown timer displays `1234`, and an immutable audit event (`job.lock_viewed`) is logged.
* [ ] **6.2 Add Repair Line Items**:
  * Scroll to **Repair Details** -> Tap **"+ Add Item"**:
    * Type: `Part` | Description: `Original Folder/Display` | Qty: `1` | Rate: `1800` | Cost: `1100`.
    * Tap **Save Item**.
  * Tap **"+ Add Item"** again:
    * Type: `Labour` | Description: `Screen Fitting & Cleaning` | Rate: `400`.
    * Tap **Save Item**.
  * Verify Total Billable Amount recalculates automatically to ₹2,200.
* [ ] **6.3 Dynamic UPI QR Code**:
  * Tap **"Collect Payment"** or **"Show UPI QR"**:
  * Verify the live QR code renders on screen with your VPA (`ramesh@okhdfcbank`) and the remaining balance amount (₹1,700, since ₹500 advance was paid).
* [ ] **6.4 Record Final Payment**:
  * In Payment Sheet, select `UPI`, enter Reference/UTR: `UPI987654321`.
  * Tap **Record Payment**.
  * Verify **Balance Due becomes ₹0** with a green Paid badge.
* [ ] **6.5 Workflow Status Progression**:
  * Tap **"Change Status"**:
    1. Select `Diagnosing` -> Tap Update.
    2. Tap Change Status -> Select `In Repair` -> Tap Update.
    3. Tap Change Status -> Select `Repaired` -> Tap Update.
    4. Tap Change Status -> Select `Ready for Pickup` -> Tap Update.
    5. Tap Change Status -> Select `Delivered`:
       * Delivered date and warranty until date are set automatically.
* [ ] **6.6 Terminal State & Reopen**:
  * Verify Delivered job cannot be changed via normal status dropdown.
  * Tap **"Reopen Job"**:
    * Enter reason: `Customer reported speaker crackling sound`.
    * Tap Confirm -> Job status returns to `In Repair` with full audit history.

---

## Step 7: Invoices (Tax / Simple Bill, PDF & Credit Notes)

* [ ] **7.1 Create Draft Invoice**:
  * In Job Detail, tap **"Create Invoice"**.
  * Verify Draft invoice is created with imported line items (`Original Folder` and `Labour`).
  * Verify Place of Supply and GST breakdown (CGST + SGST or non-GST simple bill).
* [ ] **7.2 Issue Invoice (Pakka Bill)**:
  * Tap **"Issue Invoice"**.
  * A confirmation modal warns that issued invoices are **immutable**. Tap Confirm.
  * Status becomes `Issued`. Sequential invoice number allocated: `INV/26-27/00001`.
  * Verify Edit and Delete buttons are now completely disabled.
* [ ] **7.3 Download & View WeasyPrint A4 PDF**:
  * Tap **"View PDF"** / **"Download PDF"**:
  * Verify the server-rendered WeasyPrint PDF includes:
    * Shop name, address, GSTIN, and contact details.
    * Customer details & device IMEI.
    * Line items table with rates and taxes.
    * Total amount in words (*"Rupees Two Thousand Two Hundred Only"*).
    * Dynamic tracking QR code & payment receipt watermark.
* [ ] **7.4 Invoice Cancellation & Compensating Credit Note**:
  * In Invoice Detail, tap **"Cancel Invoice"**.
  * Enter Reason: `Wrong item billed by mistake`.
  * Tap Confirm.
  * Verify original invoice status becomes `Cancelled`.
  * Verify an automatic compensating Credit Note (`CN/26-27/00001`) is issued.

---

## Step 8: Public Customer Tracking Link (`/t/<token>/`)

* [ ] **8.1 Open Tracking Link in Incognito / Other Device**:
  * From Job Detail, tap **Share** -> copy the Tracking Link (e.g. `https://fixpro-api.onrender.com/t/<token>/`).
  * Open this link in an **Incognito window** or a friend's phone (zero login required).
* [ ] **8.2 Privacy & Security Verification**:
  * Customer First Name only is displayed (e.g. `Hello, Suresh`).
  * Device Name (`Samsung Galaxy M31`) and repair milestone progress bar are shown.
  * **STRICT PRIVACY VERIFICATION**:
    * Customer phone number is **NOT** visible.
    * IMEI is **NOT** visible.
    * Technician name is **NOT** visible.
    * Internal shop notes are **NOT** visible.
    * Device lock PIN / pattern is **NOT** visible.
  * If invoice is issued, customer can tap **"Download Bill (PDF)"**.

---

## Step 9: Customer Directory & DPDP Anonymization

* [ ] **9.1 Customers Tab**:
  * Verify `Suresh Verma` is listed with phone number and 1 active device.
  * Tap **"With dues"** filter chip: customers with outstanding balances filter instantly.
* [ ] **9.2 Customer Anonymization (DPDP Compliance)**:
  * Open customer detail -> Tap **"Anonymize Data"** (Owner/Manager role):
  * Notice the prompt explaining personal data erasure. Confirm.
  * Verify name becomes `Anonymized Customer`, phone number is erased (`null`), while previous jobs and tax invoices retain their monetary amounts for legal compliance.

---

## Step 10: More Menu, Reports & Settings

* [ ] **10.1 Reports Dashboard (`More > Reports`)**:
  * Select Date Presets: `Today`, `This Month`, `This FY`.
  * Check **Jobs summary** (Received vs Delivered).
  * Check **Collections summary** (Cash vs UPI split, Refunds).
  * Check **Revenue summary** (Invoiced, Credit Notes, Net).
  * Check **Confidential Profit Card** (Parts cost vs Gross profit — visible to Owner).
* [ ] **10.2 Staff & Roles (`More > Staff`)**:
  * Tap **"Invite Staff Member"**:
    * Phone: `9876500002` | Role: `Engineer` | Display Name: `Vijay Technician`.
  * Verify permissions table shows Engineer can view and update assigned jobs, but **cannot** issue invoices, view profit, or delete records.
* [ ] **10.3 Brand & Accessory Catalogs (`More > Settings`)**:
  * Add a new brand: `OnePlus` (Category: Mobile).
  * Add a new accessory: `Stylus Pen`.
  * Start a new job intake and verify both new options appear in the wizard!
* [ ] **10.4 WhatsApp Messaging Template (`More > Settings > Messaging`)**:
  * Edit WhatsApp template: add custom text with chips like `{customer_name}` and `{job_no}`.
  * Verify the live preview reflects your custom message.
* [ ] **10.5 Trash & Restore (`More > Data > Trash`)**:
  * Soft-delete a test customer or job.
  * Open Trash tab -> Tap **"Restore"**: verify record returns to active list.
  * Permanent Delete: Attempt to permanently purge a job with payments -> Verify system prevents deletion (`trash.has_financial_records`).
* [ ] **10.6 Excel Data Export (`More > Data > Export`)**:
  * Tap **"Export Jobs"** or **"Export Customers"**.
  * Download the `.xlsx` file.
  * Open in Excel / Google Sheets: verify timestamps are in IST (`Asia/Kolkata`) and money amounts are in Rupees (not paise).
* [ ] **10.7 Devices & Account Deletion (`More > Account & Security`)**:
  * View active devices & sessions; test revoking a session.
  * Tap **"Delete Account"**: verify 7-day grace period notice appears with pending cancellation status.
  * Tap **"Cancel Deletion Request"**: verify account is restored to active status.
  * Tap **"Log Out"**: verify JWT tokens are cleared and you return to Welcome screen.

---

## Summary of Results

| # | Feature / Test Suite | Result (Pass / Fail / Notes) |
|---|---|---|
| 1 | Language Switcher & Welcome | |
| 2 | Google Authentication | |
| 3 | Profile & Shop Creation Wizard | |
| 4 | Home Dashboard & Counters | |
| 5 | 8-Step Intake Wizard & Luhn IMEI | |
| 6 | Job Lifecycle & UPI QR Payments | |
| 7 | Invoicing, WeasyPrint PDF & Credit Notes | |
| 8 | Public Tracking Link (`/t/<token>/`) | |
| 9 | Customers & DPDP Anonymization | |
| 10 | Reports, Settings, Trash & Excel Export | |
