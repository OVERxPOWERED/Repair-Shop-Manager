# GEMINI.md: Repair Shop Manager

Entry point for Antigravity. Full instructions live in `AGENTS.md`; read it first. Detail lives in `.agents/rules/`, `.agents/workflows/` and `.agents/skills/`.

**Project:** multi-tenant repair-shop management app for India. Next.js static export + Capacitor (Android/iOS/Web), Django REST + PostgreSQL. Solo developer, phased delivery, free hosting during development.

**Always remember:**
- Tenant isolation: every business row has a `shop`; every query is scoped.
- Money in integer paise. UUID keys. Soft delete. Issued invoices immutable.
- All UI strings via i18n (`en`, `hi`, `hi-Latn`).
- Frontend is a static export: no server-only Next.js features.
- Plan before large changes; write tests; update `docs/PROJECT-STATE.md`.
- Ask when unclear; never guess GST, legal or store-policy details.

Start with `/kickoff` in a new session, or `/new-feature` for ongoing work.
