# Release and Pilot Checklist (human tasks for Phase 1)

Owner does the items marked 🧑‍🔧. Tick only what you actually did and saw work. Then tell the agent so `COMPLETION.md` can be updated.

## A. Before building (agent or you)
- [ ] 🧑‍🔧 Decide brand icon and splash (1024x1024 PNG icon, 2732x2732 splash). Capacitor default icons are still in use. Then run `npx @capacitor/assets generate` (adds a dev dependency; agent will ask before adding).
- [ ] Production API is deployed and `GET <API>/health/` returns OK.
- [ ] `CORS_ALLOWED_ORIGINS` includes `https://localhost` and `capacitor://localhost`; `OTP_TEST_NUMBERS` is set only for the reviewer number.
- [ ] Real SMS provider decision: DLT approval is pending. Until then OTP login for real staff will not work, so use the test number or get DLT done first (blocker for the pilot unless you only use the reviewer/test login).
- [ ] Set `NEXT_PUBLIC_API_BASE_URL` to the production API (https) and `NEXT_PUBLIC_ENABLE_DEV_PAGES=false`.
- [ ] Legal placeholders replaced: contact emails, privacy and terms text reviewed (`TODO(verify) legal`).
- [ ] Hardcoded English strings moved to i18n (known debt).

## B. Android build (Play internal testing)
- [ ] 🧑‍🔧 `cd frontend && pnpm build && npx cap sync android`
- [ ] 🧑‍🔧 Android Studio: Build > Generate Signed Bundle (AAB). Keep the keystore and passwords in a safe place outside the repo.
- [ ] Bump `versionCode` in `android/app/build.gradle` for each upload (now 1, name 1.0).
- [ ] 🧑‍🔧 Upload to Play Console internal testing; fill Data Safety from `docs/store-readiness.md`; add privacy policy and account deletion URLs.
- [ ] 🧑‍🔧 Install on the counter phone and the engineers' phones; log in.

## C. iOS build (TestFlight)
- [ ] 🧑‍🔧 Needs a Mac with Xcode and a paid Apple developer account.
- [ ] 🧑‍🔧 `npx cap sync ios`, archive, upload, add testers.

## D. Shop setup on day 0
- [ ] 🧑‍🔧 Shop Profile (name, address, logo), Billing and GST (CA confirms GSTIN, scheme, prefix), Jobs settings, brands, accessories.
- [ ] 🧑‍🔧 Invite staff with correct roles.
- [ ] 🧑‍🔧 Pair the Bluetooth printer; test print a job receipt and an invoice; confirm Hindi text prints.
- [ ] 🧑‍🔧 Create one test job end to end: intake, photos, status changes, payment, invoice issue, PDF share, tracking link opened on a customer phone.

## E. Daily during the 7-day pilot (10 to 15 minutes)
- [ ] Every new job went through FixPro today.
- [ ] Check Sentry for new errors.
- [ ] Check the backup workflow ran (GitHub Actions) and the cron workflow ran.
- [ ] Add real entries to `docs/pilot-log.md` (date, who, what, severity, fix commit). Fix issues, do not add features.

## F. Exit (all must be true before Phase 2 resumes)
- [ ] 7 consecutive days, 100% of new jobs in FixPro
- [ ] No data-isolation bug, no invoice-number gap
- [ ] Thermal printing and PDF sharing work
- [ ] At least 10 customers opened tracking links
- [ ] 🧑‍🔧 CA reviewed GST invoices (record the date and name)
- [ ] 🧑‍🔧 Restore drill done per `docs/runbooks/restore.md` and daily backups green
- [ ] Known-issues list short and understood
- [ ] A paid VPS is in place before any second shop is added
