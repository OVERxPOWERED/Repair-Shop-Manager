# Release Notes and Checklist

Fill this in during releases. Keep keystores, certificates, API keys and signing profiles **outside** the repo.

## Environments
| Env | Web App URL | API Base URL | Database | Hosting |
|---|---|---|---|---|
| dev | `http://localhost:3000` | `http://localhost:8000/api/v1` | Local PostgreSQL 16 (port 5432) | Docker Compose |
| staging / pilot | `https://fixpro.pages.dev` | `https://fixpro-api.onrender.com/api/v1` | Neon Serverless PostgreSQL (ap-southeast-1) | Cloudflare Pages + Render (free) |
| prod (Phase 2+) | `https://app.fixpro.in` | `https://api.fixpro.in/api/v1` | Dedicated PostgreSQL 16 on VPS | Hetzner / DigitalOcean VPS |

## Secrets Directory (Where Each Secret Lives)
> Secrets never live in the repository. Reference them by name only.

| Secret Name | Location | Purpose |
|---|---|---|
| `SECRET_KEY` | Render Environment | Django cryptographic signing key (50+ random chars) |
| `DATABASE_URL` | Render Environment | Neon pooled database connection string (`sslmode=require`) |
| `NEON_DIRECT_DATABASE_URL` | GitHub Repository Secrets | Direct connection string for `pg_dump` backup workflow |
| `CRON_SECRET` | Render Environment & GitHub Secrets | Shared HMAC secret for triggering maintenance jobs via `/internal/cron/<job>/` |
| `SENTRY_DSN` | Render Environment & Cloudflare Pages | Sentry error reporting DSN for backend and web |
| `BACKUP_AGE_PUBLIC_KEY` | GitHub Repository Secrets | Age recipient public key used to encrypt nightly `pg_dump` |
| `BACKUP_AGE_PRIVATE_KEY` | Password Manager | Age private decryption key (`fixpro-backup.key`) for restore |
| `BACKUP_S3_KEY_ID` / `BACKUP_S3_SECRET` | GitHub Repository Secrets | S3/R2 credentials for storing encrypted backup archives |
| `BACKUP_BUCKET` / `BACKUP_S3_ENDPOINT` | GitHub Repository Secrets | Bucket name and endpoint URL for backup storage |
| `OTP_TEST_NUMBERS` | Render Environment | Comma-separated `phone:code` pairs for pilot/reviewer access |
| `KEYSTORE_PASSWORD` / `KEY_ALIAS` | Password Manager / CI | Android release keystore signing credentials |

## Building Mobile Apps Against Pilot API

1. In `frontend/`, create `frontend/.env.production` (git-ignored):
   ```env
   NEXT_PUBLIC_API_BASE_URL=https://fixpro-api.onrender.com/api/v1
   NEXT_PUBLIC_APP_VERSION=0.17.0
   NEXT_PUBLIC_ENABLE_DEV_PAGES=false
   NEXT_PUBLIC_SENTRY_DSN=https://<public-key>@sentry.io/<project-id>
   ```

2. Generate the static export:
   ```bash
   cd frontend
   pnpm build
   ```

3. Sync web assets into native container projects:
   ```bash
   npx cap sync
   ```

4. Build or run on connected device:
   ```bash
   # Android
   npx cap run android
   # or open in Android Studio:
   npx cap open android

   # iOS
   npx cap open ios
   ```

## Store Accounts
- Google Play Console: TBD
- Apple Developer: TBD (needed for TestFlight/App Store)

## Reviewer Test Account
- Phone: TBD (allowlisted via `OTP_TEST_NUMBERS`, non-production)
- Fixed OTP: stored in password manager, not here

## Pre-submission Checklist
- [ ] Privacy policy URL live
- [ ] Account deletion flow in app + public page
- [ ] Data safety / privacy answers prepared
- [ ] Screenshots (phone sizes) and short description in English and Hindi
- [ ] Demo account works with fixed test OTP
- [ ] Crash reporting enabled, no debug flags

