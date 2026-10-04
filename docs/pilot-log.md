# FixPro Pilot Log (Live Workshop Trial)

> Daily record for the 7-day shop pilot at the founder's workshop.
> Rule: **Fix issues; do not add features.** Spend 10–15 minutes daily triaging.

---

## Pilot Configuration

- **Workshop:** Founder's Workshop / Live Repair Desk
- **Build:** Release 1.0.0 (Android APK / Web App)
- **Pilot Window:** October 2026 (7 consecutive operational days)
- **Printer Hardware:** 58mm / 80mm Bluetooth ESC/POS Thermal Printer
- **Daily Checklist:**
  1. [ ] Check Sentry dashboard for uncaught exceptions or client errors.
  2. [ ] Verify daily automated PostgreSQL backup completed cleanly.
  3. [ ] Confirm 100% of new customer intakes, repair tickets, and invoices went through FixPro.
  4. [ ] Note any customer feedback regarding tracking SMS / WhatsApp messages.

---

## Log Entries

| Date | Time | Reporter | Summary / What Happened | Severity | Status / Fix Commit |
|---|---|---|---|---|---|
| 2026-10-04 | 10:00 | Owner | Installed release build on counter tablet and technician phones. Connected Bluetooth 58mm thermal printer. | Info | Verified (`ab19828`) |
| 2026-10-04 | 12:30 | Front Desk | First live intake: Display replacement for Samsung A14 with pattern lock and cracked glass photos. Receipt printed via thermal printer. | Normal | Verified |
| 2026-10-04 | 15:45 | Customer | Customer opened public tracking link from SMS; viewed real-time DIAGNOSING status and technician estimate. | Normal | Verified |
| 2026-10-04 | 18:00 | Owner | Issued cash invoice with round-off and QR code; marked delivered; stock and cash recorded. | Normal | Verified |

---

## Severity Definitions

- **Blocker:** Workshop operations cannot proceed (e.g. intake form fails to submit, invoice print fails completely, crash on boot). *Fix immediately before next customer.*
- **Annoying:** Feature works but requires extra taps, slow loading, or non-optimal UX (e.g. keyboard covering input, slight print margin offset). *Triage in evening.*
- **Idea:** Suggested new feature or enhancement. *Log in roadmap backlog; DO NOT implement during pilot.*

---

## Daily Pilot Reviews

### Day 1
- **Jobs Intake:** Real repair intake processed end-to-end.
- **Printing:** 58mm thermal ticket printed cleanly with shop header, job barcode, fault, and signature line.
- **Sentry Status:** Zero critical events.
- **Backups:** Local & remote snapshots verified.

### Day 2 to Day 7 (Ongoing live monitoring)
- Daily review protocol: check Sentry, verify backup integrity, resolve any blockers immediately.

---

## Mandatory Rule Before Second Shop Onboarding

> ⚠️ **CRITICAL ARCHITECTURAL REQUIREMENT:**
> **Before onboarding any second shop or expanding beyond the pilot workshop, Phase 3.1 (Migration to a paid dedicated VPS with hardened Redis, automated backups, and uptime monitoring) MUST be completed.** Free tier development hosting (Render/Neon free) is strictly capped and not permitted for multi-shop production workloads.
