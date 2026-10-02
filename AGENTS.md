# AGENTS.md: Repair Shop Manager

> Canonical instructions for every AI agent working in this repo. `GEMINI.md` is a short pointer to this file.
> Rules change by agreement with the human owner, never by an agent editing them mid-task.

## 1. What this project is
A multi-tenant management product for mobile/computer/appliance repair shops in India: job sheets, customers, devices (IMEI), invoices (optional GST), payments (cash/UPI), printing (thermal + A4 PDF), staff roles, and later inventory/POS/khata, subscriptions, offline sync and a parts marketplace.
Delivered as **Android + iOS + Web** from one Next.js codebase wrapped by Capacitor, with a Django REST backend. Built by one developer, phase by phase, hosted free during development.

Full context: `docs/01-blueprint.md`. Data model: `docs/02-database-schema.md`. Weekly plan: `docs/03-roadmap-phase-0-1.md`.

## 2. Stack
| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) with `output: 'export'`, TypeScript, Tailwind, shadcn/ui, TanStack Query, Zustand, React Hook Form + Zod, next-intl |
| Mobile | Capacitor (Android + iOS), native features behind a service layer with web fallbacks |
| Backend | Python, Django, Django REST Framework, SimpleJWT, PostgreSQL |
| Tasks | Inline / Postgres-backed queue first; Celery + Redis only after moving to a VPS |
| PDF | WeasyPrint on the server, embedded Noto fonts |
| Infra | Docker Compose locally; Render (free) + Neon (free Postgres) for the pilot |
| Quality | pytest, ruff, Vitest, Playwright, Sentry |

## 3. Repository layout
```
backend/            Django project (apps: accounts, tenancy, customers, devices, jobs, billing, messaging, audit, ...)
frontend/           Next.js app + Capacitor (android/, ios/ are generated)
docs/               Blueprint, schema, roadmap, API conventions, glossary, PROJECT-STATE.md
.agents/rules/      Detail behind this file (some always on, some by file glob)
.agents/workflows/  Slash-command playbooks (/kickoff, /new-feature, /add-model, ...)
.agents/skills/     Task-specific expertise loaded on demand
docker-compose.yml  Postgres + backend (+ Redis later)
```

## 4. Commands
```
# Backend (run inside backend/ or via docker compose exec backend ...)
docker compose up -d
pytest -q
ruff check . && ruff format --check .
python manage.py makemigrations --check --dry-run

# Frontend (run inside frontend/)
pnpm dev
pnpm lint && pnpm typecheck && pnpm test
pnpm build                # static export to out/
npx cap sync              # copy web build into native projects
npx cap run android
```
If a command above fails because tooling is not set up yet, say so and propose the fix. Do not invent substitute commands silently.

## 5. Non-negotiable rules
1. **Tenant isolation.** Every business table has a `shop` FK. Every queryset is filtered by the requesting user's shop memberships through the shared scoping layer. Never write a raw unscoped query for business data.
2. **Money is integer paise** (`BigIntegerField`). No floats, no `Decimal` in storage.
3. **UUID primary keys**, plus `created_at`, `updated_at`, `deleted_at` (soft delete) on all business tables.
4. **Issued invoices are immutable.** Corrections are credit notes. Never delete or edit an issued invoice.
5. **Audit** status changes, edits, deletes, permission changes and exports.
6. **API is versioned** under `/api/v1/` and follows `docs/api-conventions.md`.
7. **Every user-facing string goes through i18n.** Locales: `en`, `hi`, `hi-Latn` (Hinglish). No hardcoded UI text.
8. **No browser storage of auth tokens on native**; use secure storage.
9. **Store UTC, display IST.** Financial year is April to March.
10. **Permissions are checked on the server.** Hiding a button is never access control.
11. **Secrets never in the repo.** Use environment variables and `.env.example`.

## 6. How to work
- **Plan first.** For anything bigger than a small fix, write a short plan (files to touch, tests to add, risks) and wait for approval.
- **Small steps.** One feature or fix per change. Keep diffs reviewable.
- **Read before writing.** Check `docs/PROJECT-STATE.md`, the relevant schema section and existing code patterns.
- **Tests with code.** Backend changes ship with pytest tests; permission and tenant-isolation tests are mandatory for new endpoints.
- **Ask when unclear.** If a requirement, GST rule, or policy detail is ambiguous, ask instead of guessing. Mark unverified external facts with `TODO(verify)`.
- **Update `docs/PROJECT-STATE.md`** at the end of every task: what was done, what is next, known issues.
- **Follow the phase.** Do not build Phase 2+ features while Phase 1 is open unless asked.

## 7. Definition of done
- Code compiles; lint, typecheck and tests pass
- New endpoints: serializer validation, permission class, scoping, tests (happy path, forbidden, other-shop)
- New screens: loading, empty and error states; i18n keys in all three locales; works at 360 px width
- Migrations reviewed and reversible where practical
- Docs updated if behaviour or schema changed
- `docs/PROJECT-STATE.md` updated

## 8. Never do
- Disable or bypass tenant scoping, permissions or throttling to make something "work"
- Commit secrets, keys, real customer data or production dumps
- Add a dependency without stating why and checking it is maintained
- Use Next.js server features (server actions, route handlers, SSR-only APIs) in `frontend/`; the app is a static export
- Store OTPs, lock patterns or PINs in plain text
- Auto-save OCR output without user confirmation
- Run destructive commands (drop database, `rm -rf`, force-push) without explicit approval

## 9. Doc index
`docs/01-blueprint.md` product and architecture · `docs/02-database-schema.md` data model · `docs/03-roadmap-phase-0-1.md` weekly plan · `docs/api-conventions.md` API contract · `docs/domain-glossary.md` repair-shop vocabulary · `docs/decisions.md` decision log · `docs/PROJECT-STATE.md` live status
