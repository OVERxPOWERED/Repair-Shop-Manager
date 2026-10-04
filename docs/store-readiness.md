# FixPro - Store Readiness & Compliance

> Canonical documentation for Google Play Store and Apple App Store submissions, privacy compliance, reviewer credentials, and permission rationales.

---

## 1. App Listing Metadata

| Field | Google Play | Apple App Store |
|---|---|---|
| **App Title** | FixPro - Repair Shop Manager | FixPro: Repair Shop Manager |
| **Subtitle / Short Description** | Multi-tenant repair shop manager: job sheets, billing, customers & tracking. (80 chars) | Repair shop jobs, bills & tracking |
| **Category** | Business / Productivity | Business |
| **Content Rating** | Everyone (3+) | 4+ |
| **Contact Email** | support@fixpro.in *(TODO(verify) legal)* | support@fixpro.in *(TODO(verify) legal)* |
| **Privacy Policy URL** | `https://api.fixpro.in/privacy/` *(or in-app `/privacy`)* | `https://api.fixpro.in/privacy/` |
| **Account Deletion URL** | `https://api.fixpro.in/account/delete/` | `https://api.fixpro.in/account/delete/` |
| **Supported Locales** | English (`en`), Hindi (`hi`), Hinglish (`hi-Latn`) | English (`en`), Hindi (`hi`), Hinglish (`hi-Latn`) |

### Full Description (Store Copy)
```
FixPro is the all-in-one shop management app built specifically for mobile phone, computer, and electronics repair shops in India.

Replace paper registers and lost repair slips with a modern, fast digital workflow:
• Digital Job Sheets: Record customer complaints, device condition, intake photos, pattern lock, and diagnostic notes in seconds.
• Customer SMS & WhatsApp Updates: Keep customers informed automatically as repairs move from Diagnosing to Repaired to Delivered.
• GST & Simple Invoicing: Generate professional bills, Bills of Supply, or GST tax invoices with HSN/SAC codes, cash/UPI payments, and QR codes.
• Thermal Receipt Printing: Print 58mm and 80mm job intake slips and invoices via Bluetooth ESC/POS printers.
• Team Roles: Separate permissions for Technicians, Front Desk Staff, Managers, and Owners.
• Privacy & Data Isolation: Complete multi-tenant security ensuring your business records and customer contacts are completely private to your shop.
• Trilingual Experience: Full support for English, Hindi (हिंदी), and Hinglish.

Take control of your repair workshop with FixPro!
```

---

## 2. Reviewer Demo Credentials

For Google Play Console and Apple App Store Review teams:

| Property | Value |
|---|---|
| **Demo Phone Number** | `+919999999999` |
| **Fixed Verification OTP** | `123456` |
| **Assigned Role** | Shop Owner |
| **Pre-populated Shop** | `FixPro Reviewer Demo` |
| **Reviewer Note** | *Enter the mobile number `9999999999` and submit OTP `123456`. The demo account is fully provisioned with sample customers, repair devices with valid IMEI numbers, open jobs across all workflow states, and thermal print previews. No credit card or active telecom SMS is required.* |

To seed/reseed the reviewer demo data in local or staging environments:
```bash
python manage.py seed_demo_data --reviewer
```

---

## 3. Google Play Data Safety Declarations

| Data Category | Data Type | Collected? | Shared? | Purpose | Ephemeral? |
|---|---|---|---|---|---|
| **Personal Info** | Name | Yes | No | App functionality, Account management | No |
| **Personal Info** | Phone number | Yes | No | Authentication (OTP), SMS transactional notices | No |
| **Financial Info** | Purchase history / Invoices | Yes | No | Invoicing, Accounting, Tax compliance | No |
| **Photos & Videos** | Photos | Yes (Optional) | No | Device condition intake documentation | No |
| **Device & other IDs** | Device ID, IP address | Yes | No | Account security, multi-device session management | No |
| **Location** | Precise / Approx | No | No | N/A | N/A |
| **Contacts** | Contacts list | No | No | N/A | N/A |

### Data Deletion & Privacy Policy Answers
- **Does your app provide a way for users to request that their data is deleted?** **Yes.**
- **Deletion URL:** `https://api.fixpro.in/account/delete/`
- **In-App Flow:** *More → Account & Security → Delete Account*.
- **Retention Disclosure:** In compliance with Indian taxation laws (CGST Act 2017 Section 36), issued tax invoices and financial ledgers are retained for statutory periods. All personal phone numbers and user identifying details are anonymized permanently (`+00...`) after a 7-day grace period.

---

## 4. Apple App Store Privacy Nutrition Labels

- **Data Used to Track You:** None (FixPro does not use IDFA or track users across third-party apps).
- **Data Linked to You:**
  - **Contact Info:** Phone Number, Name
  - **User Content:** Photos (Job intake condition)
  - **Financial Info:** Payment History (Cash/UPI receipts)
  - **Identifiers:** User ID, Device ID

---

## 5. Mobile Native Permissions Rationale

| Permission | Platform | Rationale |
|---|---|---|
| `CAMERA` | Android / iOS | Allows technicians to photograph physical damage/scratches on devices during intake and scan barcode/QR IMEI stickers. |
| `BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN` | Android | Discovers and pairs with 58mm / 80mm wireless ESC/POS thermal printers for printing job receipts. |
| `READ_MEDIA_IMAGES` / Photo Library | Android / iOS | Enables uploading previously captured photos or shop logos. |
| `INTERNET`, `ACCESS_NETWORK_STATE` | Android / iOS | Connects to the secure multi-tenant Django REST API backend. |

---

## 6. Versioning & Build Standards

- **Android Version Name:** `1.0` (current)
- **Android Version Code:** `1` (current in `android/app/build.gradle`)
- **iOS Marketing Version:** `1.0` (current)
- **iOS Build Number:** `1`
- **Capacitor App ID:** `in.fixpro.repairshop`
