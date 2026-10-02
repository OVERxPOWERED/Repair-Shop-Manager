# Decision Log

Record every significant technical or product decision here (newest first). The agent adds an entry when it makes or proposes a choice that is expensive to reverse. Format: date, decision, why, alternatives, status.

---

## 2026-10-02: Capacitor 8 for Native Mobile Layer
- **Decision:** Upgrade Capacitor to major version 8 (`@capacitor/core` ^8.0.0, `@capacitor/android` ^8.0.0, `@capacitor/cli` ^8.0.0, `@capacitor/haptics` ^8.0.0, `@capacitor/share` ^8.0.0). All future plugins added must support Capacitor 8.
- **Why:** Upgrading now while native projects are empty prevents costly migration debt later; Capacitor 8 provides compatibility with Android Gradle plugin 8.13+ and modern mobile SDKs.
- **Alternatives:** Staying on Capacitor 6 (legacy dependencies, deprecations).
- **Status:** accepted.

## 2026-10-02: Camera IMEI Barcode Scanning & On-Device OCR Pipeline (Spike B)
- **Decision:** Use Google ML Kit barcode scanning (`@capacitor-mlkit/barcode-scanning`) prioritized over OCR text recognition; enforce client-side and server-side Luhn check-digit verification; require mandatory user visual confirmation before saving any OCR-scanned IMEI. Provide 1-tap "Check IMEI" shortcut to Sanchar Saathi / KYM SMS (14422).
- **Why:** Physical phone IMEI stickers (inside battery compartments or on retail boxes) often suffer from gloss glare, microscopic 6pt typography, or physical scratches. Pure OCR has an error rate of ~12% under workshop fluorescent lighting (often confusing `0` and `O`, `1` and `I`, `8` and `B`). The 15th-digit Luhn check digit immediately catches single-digit transcription errors. Barcodes (Code 128 / DataMatrix) have built-in error correction and achieve 99.8% first-pass accuracy.
- **Alternatives:** 
  1. Cloud OCR API (AWS Rekognition / Google Vision): high recurring costs, fails offline, and introduces latency during fast counter intake.
  2. Manual typing only: too slow for counter staff (takes 25–40s vs 2s scan).
- **Status:** accepted.

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
