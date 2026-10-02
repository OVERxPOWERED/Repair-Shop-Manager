# Project State

> Live status file. The agent updates this at the end of every task. Keep it short and factual.

**Phase:** 0 (Foundations)  **Week:** 1 (Completed) → 2 (Next)  **Last updated:** 2026-10-02

## Done
- Master unified roadmap created: `ROADMAP.md` (unifies architecture, UI screen roadmap, and database milestones)
- Design hub organized in `design/` (with `UI-Information/` symlink) with visual tokens, IA, component specs, and mockup catalog (`1.1-splash`, `1.2-onboarding`, `1.3-image`, `1.4-main-app-shell`)
- Backend scaffolded in `backend/`: Django 5, DRF, split settings (`base.py`, `dev.py`, `prod.py`), `core` app with UUID/soft-delete/scoping models, and `/api/v1/health/` (tested with pytest & verified by Ruff)
- Frontend scaffolded in `frontend/`: Next.js (App Router, static export `out/`), TypeScript, Tailwind CSS with FixPro design tokens, and master 5-tab shell matching `1.4-main-app-shell.png`
- Capacitor mobile shell added: Native Android project generated in `frontend/android/` with `@capacitor/haptics` and `@capacitor/share`
- Infrastructure: `docker-compose.yml`, `.env.example`, and GitHub Actions CI in `.github/workflows/ci.yml`

## In progress
- (none - Week 1 deliverables complete and verified)

## Next
1. Week 2: Tenancy & Auth models (`accounts` & `tenancy` apps: phone OTP login, JWT rotating tokens, organization, shop, membership, roles)
2. Week 2: Tenant scoping middleware & mandatory cross-tenant isolation test suite
3. Week 2 Hardware Spikes: Spike A (BLE thermal printer bitmap pipeline) and Spike B (Camera IMEI barcode scan & OCR)

## Blocked / waiting on
- DLT registration (external approval for commercial SMS in India)
- Real hardware testing on physical BLE thermal printers (Spike A in Week 2)

## Known issues
- (none)

## Lessons / notes
- Pnpm v11+ requires `.npmrc` or `pnpm approve-builds` for dependencies executing post-install scripts (`esbuild`).
- Next.js static export requires `output: 'export'` and unoptimized images when building for Capacitor.

## Verification log
| Date | Command | Result |
|---|---|---|
| 2026-10-02 | `backend/.venv/bin/ruff check backend/` | All checks passed! (0 errors) |
| 2026-10-02 | `backend/.venv/bin/pytest backend/` | 1 passed in 0.18s |
| 2026-10-02 | `pnpm typecheck` (in `frontend/`) | Passed with zero errors |
| 2026-10-02 | `pnpm build` (in `frontend/`) | Static export generated in `out/` (4/4 pages) |
| 2026-10-02 | `cap sync` (in `frontend/`) | Assets copied & Android synced in 0.104s |
