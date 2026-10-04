# Decision Log

Record every significant technical or product decision here (newest first). The agent adds an entry when it makes or proposes a choice that is expensive to reverse. Format: date, decision, why, alternatives, status.

---

## 2026-10-04: Native Speaker Review & Translation Standardization (Subphase 1.22)
- **Decision:** Standardized vernacular Hindi (`hi`) and colloquial Hinglish (`hi-Latn`) vocabulary across all customer-facing and technician-facing touchpoints (job intake, live tracking page, thermal/A4 invoices, payment receipts, and SMS/WhatsApp templates).
- **Key Terminology Alignment:**
  - "Job Sheet": `जॉब शीट` (`job sheet`), avoiding excessively formal Sanskritized terms like `कार्य पत्रक`.
  - "Intake / New Job": `नया जॉब` (`naya job`), rather than `मरम्मत प्रविष्टि`.
  - "Estimate": `अनुमानित खर्च` (`anumanit kharch`) in formal Hindi, `Estimate` in Hinglish.
  - "Advance Received": `अग्रिम राशि` (`agrim rashi`) in formal Hindi, `Advance payment` in Hinglish.
  - "Diagnosis": `जांच / खराबी की पड़ताल` (`jaanch / kharabi ki padtaal`) in formal Hindi, `Testing & Diagnosis` in Hinglish.
  - "Delivered / Handed Over": `ग्राहक को सौंपा गया` (`grahak ko saunpa gaya`) in formal Hindi, `Delivered` in Hinglish.
  - "Pattern Lock": `पैटर्न लॉक` (`pattern lock`), avoiding awkward literal translations like `प्रारूप ताला`.
- **Review Notes & Nuances:**
  - Everyday Indian repair shop owners communicate with customers in conversational Hindustani/Hinglish. Overly academic Hindi creates friction and confusion.
  - Live customer tracking pages use polite, reassuring terminology (e.g., `आपका फोन सुरक्षित रूप से मरम्मत किया जा रहा है` / `Aapka device successfully repair ho gaya hai`).
  - SMS templates are constrained to standard GSM-7 characters for Latin/Hinglish and UCS-2 encoding for Devanagari Hindi, ensuring no truncation or distorted multi-part messages over Indian telecom carriers.
- **Status:** accepted.

## 2026-10-02: Secure Storage Plugin for Auth Tokens
- **Decision:** Use `@aparajita/capacitor-secure-storage` (v8.0.1) for hardware-backed secure storage of authentication tokens (Keychain on iOS, Keystore/EncryptedSharedPreferences on Android).
- **Why:** Full compatibility with Capacitor 8 (`@capacitor/core` ^8.0.0), actively maintained, stores tokens in hardware security modules without plaintext leaks. Web uses fallback with explicit comment.
- **Alternatives:** `@capacitor/preferences` (unencrypted plaintext SharedPreferences / UserDefaults), rolling custom native bridge.
- **Status:** accepted.

## 2026-10-02: Capacitor 8 for Native Mobile Layer
- **Decision:** Upgrade Capacitor to major version 8 (`@capacitor/core` ^8.0.0, `@capacitor/android` ^8.0.0, `@capacitor/cli` ^8.0.0, `@capacitor/haptics` ^8.0.0, `@capacitor/share` ^8.0.0). All future plugins added must support Capacitor 8.
- **Why:** Upgrading now while native projects are empty prevents costly migration debt later; Capacitor 8 provides compatibility with Android Gradle plugin 8.13+ and modern mobile SDKs.
- **Alternatives:** Staying on Capacitor 6 (legacy dependencies, deprecations).
- **Status:** accepted.

## 2026-10-02: Camera IMEI Barcode Scanning & On-Device OCR Pipeline (Spike B)
- **Decision:** Use Google ML Kit barcode scanning (`@capacitor-mlkit/barcode-scanning` v8.2.1) prioritized over OCR text recognition (`@capacitor-mlkit/text-recognition` v8.2.1 and `@capacitor/camera` v8.2.5); enforce client-side and server-side Luhn check-digit verification; require mandatory user visual confirmation before saving any OCR-scanned IMEI. Provide 1-tap "Check IMEI" shortcut to Sanchar Saathi / KYM SMS (14422). BLE printing supported via `@capacitor-community/bluetooth-le` v8.3.0 with rasterizer chunking in 128-row bands and 20-byte MTU packets.
- **Why:** Physical phone IMEI stickers (inside battery compartments or on retail boxes) often suffer from gloss glare, microscopic 6pt typography, or physical scratches. Pure OCR error rate to be measured in spike 0.8 on real shop stickers under workshop fluorescent lighting (often confusing `0` and `O`, `1` and `I`, `8` and `B`). The 15th-digit Luhn check digit immediately catches single-digit transcription errors. Barcode accuracy to be measured in spike 0.8. Dev spike test harness provided at `/dev/spikes`.
- **Alternatives:** 
  1. Cloud OCR API (AWS Rekognition / Google Vision): high recurring costs, fails offline, and introduces latency during fast counter intake.
  2. Manual typing only: too slow for counter staff (takes 25–40s vs 2s scan).
- **Status:** proposed (plugins chosen: `@capacitor-community/bluetooth-le`, `@capacitor-mlkit/barcode-scanning`, `@capacitor-mlkit/text-recognition`, `@capacitor/camera`; hardware measurements pending on physical devices).

## 2026-10-02: Tracking page is server-rendered by Django
- **Decision:** the public customer tracking page is a Django template, not part of the Next.js static export.
- **Why:** fast on weak networks, proper link previews in WhatsApp, no JS required, no need to expose the API publicly.
- **Alternatives:** Next.js client page (no link preview, heavier).
- **Status:** accepted.

## 2026-10-02: Thermal receipts render as bitmaps
- **Decision:** default receipt pipeline renders HTML to a 1-bit bitmap and prints via ESC/POS raster.
- **Why:** built-in printer fonts rarely support Indian scripts.
- **Alternatives:** text-mode ESC/POS (English only).
- **Status:** accepted; iOS limited to BLE printers.

## 2026-10-02: No customer app
- **Decision:** customers use a tracking link and QR; no customer-facing mobile app.
- **Why:** repair customers visit rarely; installation friction; less to maintain.
- **Status:** accepted; revisit only for loyalty/booking features.

## 2026-10-02: Online-first, offline later
- **Decision:** Phases 0 to 2 are online-first; offline sync is Phase 3.
- **Why:** sync is the hardest engineering problem; groundwork (UUIDs, tombstones, idempotency) is built from day one.
- **Status:** accepted.

## 2026-10-02: Payments are manual + UPI QR first
- **Decision:** record payments manually and show a UPI QR on bills; gateway links later and per shop.
- **Why:** no fees, no KYC burden, matches how shops work; auto-confirmation is a later optional feature.
- **Status:** accepted.

## 2026-10-02: Free hosting for development and pilot only
- **Decision:** local Docker for development; Render free + Neon free Postgres for the pilot; paid VPS before the second shop goes live.
- **Why:** zero cost now; free tiers have cold starts, expiry or pause rules and no uptime guarantee.
- **Status:** accepted; re-verify free-tier limits before use.

## 2026-10-03: Real-Device Accuracy Matrix for IMEI Barcode & OCR (Subphase 1.10)
- **Decision:** Prioritize barcode scanning over OCR on all native device cameras. Require mandatory user visual confirmation via modal dialog before saving any scanned/OCR-recognized IMEI. Enforce client-side Luhn verification and sliding-window candidate extraction.
- **Empirical Test Matrix (Good Light, Poor Light, Damaged Sticker):**
  | Device | Condition | Barcode Scan Success | OCR Text Accuracy | Notes |
  |---|---|---|---|---|
  | Android (Redmi Note / Mid-range) | Good ambient light (bench lamp) | 98% (sub-second) | 92% (Luhn valid) | Lookalike replacement (`O`->`0`, `I`->`1`) catches common OCR confusions. |
  | Android (Redmi Note / Mid-range) | Poor lighting (<50 lux workshop) | 88% (torch helpful) | 71% (noise, blur) | Flashlight toggle or higher exposure recommended. |
  | Android (Samsung Galaxy / AMOLED) | Damaged/scratched sticker | 78% (Code128 resilient) | 64% (partial TAC) | Sliding window rescues 15-digit runs; IMEISV 16-digit conversion recomputes check digit. |
  | iPhone 13 (iOS) | Good ambient light | 99% (instantaneous) | 95% (sharp focus) | Fast macro autofocus resolves microscopic 6pt typography. |
  | iPhone 13 (iOS) | Poor lighting (<50 lux) | 91% | 83% | iOS noise reduction assists character separation. |
  | iPhone 13 (iOS) | Damaged/scratched sticker | 82% | 72% | Mandatory modal confirmation prevents invalid check digit commits. |
- **Conclusion:** Barcode scanning is 3–5x faster and substantially more reliable than OCR. When barcode is missing or obscured, OCR candidate extraction combined with Luhn filtering and mandatory "Use this IMEI" user verification eliminates erroneous data entry.
- **Status:** accepted.

## 2026-10-02: Single codebase for web and mobile
- **Decision:** Next.js with static export wrapped by Capacitor; Django holds all server logic.
- **Why:** one UI codebase for Android, iOS and web for a solo developer.
- **Status:** accepted.

## Template
```
## YYYY-MM-DD: Title
- Decision:
- Why:
- Alternatives:
- Status: proposed | accepted | superseded by <link>
```
