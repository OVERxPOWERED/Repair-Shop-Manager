# FixPro: Master Implementation Roadmap

> **Version 3.0 · 2 October 2026** (replaces v2.0).
> This is the single source of truth for *what to build next and how*.
> Progress is tracked in [`COMPLETION.md`](COMPLETION.md). Live status lives in [`docs/PROJECT-STATE.md`](docs/PROJECT-STATE.md).
> Product context: [`docs/01-blueprint.md`](docs/01-blueprint.md) · Data model: [`docs/02-database-schema.md`](docs/02-database-schema.md) · API contract: [`docs/api-conventions.md`](docs/api-conventions.md) · Design: [`design/`](design/)
> Where this file and `docs/03-roadmap-phase-0-1.md` differ, this file wins.

---

## 0. How to use this roadmap (read every session)

This roadmap is written so that an AI coding agent, including a small one, can implement it one step at a time.

1. **One subphase per session.** Open [`COMPLETION.md`](COMPLETION.md), find the first subphase that is not `✅ Done`, and do only that one.
2. **Check "Depends on".** Every subphase lists the subphases it needs. If one of them is not `✅ Done` in COMPLETION.md, stop and say so.
3. **Read before writing.** Read [`AGENTS.md`](AGENTS.md), the whole subphase, and every file listed under **Read first**.
4. **Do the tasks in order.** When a task shows code, use it as written. If the existing code makes that impossible (a file is different from what the task expects), stop and explain the difference instead of improvising.
5. **Write the tests the subphase lists.** No subphase is done without them.
6. **Run every command under Verify.** All of them must pass. Never weaken a test to make it pass.
7. **Record progress.** In COMPLETION.md: tick each task, set the status to `✅ Done`, fill in the date and commit hash, and paste the Verify results. Then update `docs/PROJECT-STATE.md` (Done / Next / Known issues).
8. **Commit once per subphase:** `git commit -m "feat(0.4): idempotency keys and optimistic concurrency"`. Do not push or force-push unless the human asks.
9. **Hardware tasks** (printer, camera, real phones) are marked 🧑‍🔧. Only the human can confirm them. Never tick one without the human saying it worked on a real device.
10. **`TODO(verify)`** marks an external fact (tax rule, law, store policy, plugin version, price). Keep the marker in code and docs. Do not invent the answer.
11. **Paths** are relative to the repo root. Backend commands run in `backend/` with the virtualenv active. Frontend commands run in `frontend/`.

Status symbols used in COMPLETION.md: `⬜ Not started` · `🟡 In progress` · `✅ Done` · `⛔ Blocked`.

---

## 1. Audit of Weeks 1–2 (2 October 2026)

### 1.1 What works today
Verified on 2026-10-02: `pytest` 18 passed, `ruff check` and `ruff format --check` clean, `makemigrations --check` clean, `tsc --noEmit` clean, Vitest 5/5.

- Django 5.1 project with split settings, `/api/v1/health/`, drf-spectacular docs.
- `accounts`: `User`, `OTPChallenge`, `UserDevice`, `AccountDeletionRequest`; OTP send/verify; JWT refresh with blacklist.
- `tenancy`: `Organization`, `Shop`, `Role`, `Membership`, `Invite`; onboarding endpoint; staff list.
- Next.js 14 static export, Tailwind tokens, a static Home mock-up page, Capacitor Android project.
- IMEI Luhn validators (Python and TypeScript), ESC/POS rasterizer function (not tested on a printer).

### 1.2 Problems found
Items 1–5 were confirmed by running throwaway tests against the current code. The subphase that fixes each one is in brackets.

**Critical (security or data loss)**
1. Any member, including an Engineer, can `PATCH` every field of their shop (GST, phone masking, name) and `DELETE` the shop. `ShopViewSet` is a full `ModelViewSet` guarded only by `IsAuthenticated`. **[0.7]**
2. `DELETE` is a **hard delete**. `SoftDeletableModel` never overrides `delete()`, so every DRF destroy permanently removes rows. Deleting a shop removes all its memberships too. **[0.3]**
3. Front Desk can suspend or delete the Owner's membership. `StaffMembershipViewSet` checks only `staff.view` for every action, and `status` is writable. **[0.7]**
4. `POST /api/v1/staff/` returns `201` but saves nothing (`perform_create` is `pass`). **[0.7]**
5. A user can deactivate themselves via `PATCH /auth/me/ {"is_active": false}`. **[0.6]**
6. OTP codes are `print()`-ed and logged in **every** environment, including production. **[0.6]**
7. OTP hash is SHA-256 with a fixed salt. There are only 900,000 possible codes, so a leaked database reveals every live code in under a second. The comparison is not constant-time. **[0.6]**
8. The fixed OTP `123456` is enabled whenever `DEBUG` is on, for four hard-coded numbers, including `+919876543210`, which is used as the example number everywhere. **[0.6]**
9. Wrong-OTP attempts are counted without a row lock, so parallel requests bypass the 3-attempt limit. **[0.6]**
10. Inactive users still get tokens from OTP verify. **[0.6]**
11. Refresh-token reuse detection is not implemented: `refresh_family` is stored but never checked. There are no logout or logout-everywhere endpoints. **[0.6]**

**Correctness and API contract**
12. `ShopScopedBaseModel` stores `shop_id` as a bare `UUIDField` with no foreign key. This breaks AGENTS.md rule 1 and gives no referential integrity. It must be fixed before the first business table exists. **[0.3]**
13. `TenantScopingMiddleware` runs before DRF's JWT authentication, so it never finds a membership. It costs a database query per request and does nothing. `ShopScopedViewSet` resolves the shop in `initial()`, which runs *after* DRF permission classes, so `HasShopPermission` cannot work with it. **[0.7]**
14. Access to another shop returns `403`, and a nonexistent shop returns a different message. The conventions require `404` for both, so that nobody can probe which shops exist. **[0.7]**
15. Owners are detected by role **name**, so a custom role called "Owner" gets every permission. Platform admins silently bypass all tenant checks. **[0.7]**
16. There is no response envelope or exception handler. Errors come back as `{"detail": …}`, lists as `{"count", "results"}`, and error codes are ad-hoc `UPPER_CASE` strings. **[0.4]**
17. Idempotency keys, `If-Match` version checks, request IDs and throttling are all required by `docs/api-conventions.md` and all missing. No throttling is configured at all. **[0.4, 0.5]**
18. Roles are seeded inside a `GET` request (`RoleViewSet.get_queryset`). The README tells you to run `manage.py seed_roles`, which does not exist. **[0.7]**
19. `Membership` is `unique_together(user, shop)`, so a removed staff member can never be re-invited. The schema says unique only while the status is not `removed`. **[0.7]**
20. Onboarding accepts GST enabled with no GSTIN, and accepts invalid GSTINs, state codes and UPI IDs. **[0.7]**
21. The health endpoint returns the raw database exception text to the public. **[0.4]**

**Tooling**
22. Tests are forced onto SQLite whenever pytest is loaded. Phase 1 needs Postgres-only features (`pg_trgm`, partial unique indexes, `select_for_update`). **[0.1]**
23. CI skips frontend lint and tests, `ruff format --check` and the migrations check. The local virtualenv is Python 3.14, while Docker and CI use 3.12. Django 5.1 is past end of support, so move to 5.2 LTS. CI pins pnpm 9 while the repo uses pnpm 11 settings. **[0.1]**
24. The CORS list has no `https://localhost`. That is the Android WebView origin when `androidScheme: 'https'` is set, so every API call from the Android app would fail. **[0.1]**
25. `.gitignore` patterns such as `android/build` do not match `frontend/android/...`, and `frontend/tsconfig.tsbuildinfo` is committed. `config/wsgi.py` defaults to **dev** settings (`DEBUG=True`) in production. Prod settings accept the insecure default `SECRET_KEY`, and `SIMPLE_JWT["SIGNING_KEY"]` is frozen to the base value. **[0.1]**
26. Frontend: the viewport disables zoom (`userScalable: false`, an accessibility failure); `/manifest.json` is referenced but missing; there is no Devanagari font; shadcn/ui is not initialised; there is no Vitest config. **[0.9]**

**Process**
27. The Week 2 hardware spikes are recorded as done, but the repo contains no Bluetooth, barcode or OCR plugin. `docs/printers.md` lists a "lab-tested" printer matrix with every check ticked, and `docs/decisions.md` quotes accuracy figures (12 % OCR error, 99.8 % barcode) that no code in this repo could have measured. Treat both as unverified and redo the spikes on real hardware. **[0.8]**
28. `AGENTS.md` and `docs/03` refer to `.agents/` workflows (`/kickoff`, `/weekly-plan`, `/review`) that are not in the repo. This roadmap does not depend on them.

### 1.3 What changed from roadmap v2.0
- Phase 0 starts with a **repair block (0.1–0.8)** that fixes the problems above before any Week 3 work.
- **API foundations** (envelope, error codes, idempotency, `If-Match`) move from Week 9 into Phase 0, because job creation already needs them.
- **Job photos** upload through the API as multipart for the pilot, instead of pre-signed URLs. This is simpler and works with local storage. Revisit at the VPS move.
- **Payment mode `credit` is removed.** Udhaar is an unpaid balance, not a payment; recording "credit" as a payment would show the bill as paid. The customer ledger arrives in Phase 2.
- Removed Phase 2 work that had leaked into Phase 1: "cash drawer ledger" (Week 9) and "trash for inventory" (Week 14).
- **Invoice numbers** use `INV/26-27/00001`, which is at most 16 characters. GST rules are believed to cap invoice numbers at 16 characters; the CA must confirm. `TODO(verify)`
- The **job intake steps** now match `design/02-information-architecture.md`, including the Confirmation step.
- The **VPS migration** moves from the end of Phase 3 to its start. The decision log says to move to a paid VPS before a second shop goes live.
- **"Encrypted Excel" exports are dropped** (openpyxl cannot encrypt). Exports stay permission-gated and audited.
- **Static-export rule:** Next.js cannot export dynamic `[id]` routes without knowing every ID at build time, so detail pages use `?id=` query parameters.
- The tracking page uses a small Python string table instead of gettext, so the Docker image needs no `compilemessages` step.
- **Upgrade now while it is cheap:** Django 5.2 LTS, the latest Next.js 14.2.x patch, and the current Capacitor major (the Android project is still empty).

---

## 2. Phase overview

| Phase | Subphases | Rough effort (solo, 25–30 h/week) | Exit criteria |
|---|---|---|---|
| **0 Foundations** | 0.1–0.18 | 4–5 weeks remaining | Phone OTP sign-up, shop onboarding, staff invite with roles, 5-tab shell on web/Android/iPhone, audit log, pilot API live, all isolation tests green on Postgres in CI, printer + IMEI spikes answered on real hardware |
| **1 Core Repair MVP** | 1.1–1.25 | 12–14 weeks | Your shop runs 100 % of new jobs through FixPro for a full week: intake, IMEI, status, payments, GST/non-GST invoices, PDF + thermal printing, tracking links, three languages |
| **2 Stock, POS, Khata, Staff** | 2.1–2.12 | 9–11 weeks | One month of real bookkeeping in FixPro matches the manual books |
| **3 Scale & Monetisation** | 3.1–3.9 | 9–12 weeks | Second shop onboarded on a paid VPS; branches, subscriptions and offline core flows work |
| **4 Marketplace & Community** | 4.1–4.5 | 8–12 weeks | Only after demand is proven; nearby parts search with verified sellers |

### Pre-requisites to start now (non-coding, long lead time)
- [ ] 🧑‍🔧 Start **SMS DLT registration** (entity, sender ID, OTP + notification templates). Pick an SMS provider. Needed by 1.19.
- [ ] 🧑‍🔧 **Google Play** developer account (one-time fee). **Apple Developer** account before TestFlight (1.24).
- [ ] 🧑‍🔧 A **Mac** (or a cloud macOS builder) for iOS builds, needed by 0.14.
- [ ] 🧑‍🔧 Buy one **58 mm and one 80 mm BLE thermal printer**. Needed by 0.8.
- [ ] 🧑‍🔧 Have a real **Android phone** and **iPhone** for testing.
- [ ] 🧑‍🔧 Find a **CA** to review GST logic in 1.13, and someone who can review the Hindi copy in 1.22.
- [ ] 🧑‍🔧 Decide who owns the code, hosting, store accounts and customer data.

---

## 3. Global conventions (apply to every subphase)

### 3.1 Backend
- **App layout:** `models.py`, `serializers.py`, `services.py` (all business logic), `views.py` (thin: validate, call service, return), `urls.py`, `admin.py`, `tests/test_*.py`, `tests/factories.py`.
- **Services** take explicit arguments: `shop`, `actor` (a `User`), `membership`. They never read `request` directly, except `record_audit(request=...)`. Every service that writes uses `transaction.atomic()`.
- **Errors:** raise `DomainError` (from `apps/core/api/errors.py`, created in 0.4) with a dotted lowercase code, such as `job.invalid_transition`. List every new code in `docs/error-codes.md` (Recipe R8).
- **Tests read `response.json()`**, never `response.data`. The `{"data": …}` envelope is added by the renderer, so `response.data` is the unwrapped payload.
- **Money** is integer paise. Use the helpers in `apps/core/money.py` (created in 1.11). Never use `float`.
- **Time:** store with `timezone.now()` (UTC). Business dates such as invoice date, warranty end and "today" counters use `apps.core.time.today_ist()` (created in 0.4).
- **Tenant scoping:** shop-scoped views subclass `ShopScopedViewSet` (rebuilt in 0.7). Services receive `shop` and filter by it. Never call `Model.objects.all()` for business data outside a scoped queryset.
- **Database:** tests run on PostgreSQL 16, the same engine as production.

### 3.2 Frontend
- Static export: every page file starts with `"use client";`. No server actions, route handlers, `cookies()`, `headers()`, or middleware.
- **No dynamic route segments.** Detail pages are `/jobs/detail?id=<uuid>` and read the ID with `useSearchParams()` inside a `<Suspense>` boundary.
- **Data** is fetched only through TanStack Query hooks in `src/features/<feature>/api.ts`, which call `api()` / `apiList()` from `src/lib/api/client.ts`.
- **Text:** every user-visible string comes from `useTranslations()`. Keys go into all three locale files, and `pnpm i18n:check` must pass.
- **States:** every screen has loading (skeleton), empty, error (with Retry) and permission-denied states. Check each one at **360 px** width.
- **Native features** are used only through `src/native/*`, which provides a web fallback.
- **Money:** display with `formatPaise()`, parse input with `rupeesToPaise()` (both in `src/lib/format/money.ts`).
- **Permissions:** the UI hides actions the user cannot do, using `usePermission("jobs.deliver")`, but the server is the real check.

---

## 4. Recipes (referenced by subphases)

Recipes are reusable instructions. A subphase says, for example, "Follow R2 for `/customers/`".

### R1. Add a shop-scoped model
Available after 0.3.
```python
# backend/apps/<app>/models.py
from django.db import models
from django.db.models import Q

from apps.core.models import ShopScopedModel


class Thing(ShopScopedModel):
    name = models.CharField(max_length=150)

    class Meta:
        indexes = [models.Index(fields=["shop", "created_at"], name="thing_shop_created_idx")]
        constraints = [
            models.UniqueConstraint(
                fields=["shop", "name"],
                condition=Q(deleted_at__isnull=True),
                name="thing_uniq_name_per_shop",
            ),
        ]

    def __str__(self):
        return self.name
```
Steps:
1. Write the model. Index and constraint names must be at most 30 characters and unique across the project.
2. Run `python manage.py makemigrations <app>`. Open the migration and check that it only does what you intended.
3. Register the model in `admin.py` with `list_display` and `list_filter = ("shop",)`.
4. Add a factory in `apps/<app>/tests/factories.py` (see 0.2 for the pattern).
5. If the table or columns are new to `docs/02-database-schema.md`, update that doc in the same commit.
6. Any foreign key to another shop-scoped model must be validated as belonging to the same shop. Use `ShopScopedPKField` in the serializer (R2), and pass objects into services only after loading them with `.filter(shop=shop)`.

### R2. Add a shop-scoped API endpoint
Available after 0.7.
```python
# backend/apps/<app>/serializers.py
from rest_framework import serializers

from apps.core.api.fields import ShopScopedPKField
from apps.customers.models import Customer
from .models import Thing


class ThingSerializer(serializers.ModelSerializer):
    # Example of a cross-model FK that must belong to the same shop:
    customer_id = ShopScopedPKField(queryset=Customer.objects.all(), source="customer", required=False)

    class Meta:
        model = Thing
        fields = ("id", "name", "customer_id", "version", "created_at", "updated_at")
        read_only_fields = ("id", "version", "created_at", "updated_at")
```
```python
# backend/apps/<app>/views.py
from apps.tenancy.viewsets import ShopScopedViewSet
from .models import Thing
from .serializers import ThingSerializer


class ThingViewSet(ShopScopedViewSet):
    queryset = Thing.objects.all()
    serializer_class = ThingSerializer
    # Every action MUST be listed. A missing action is denied (403).
    permission_map = {
        "list": "things.view",
        "retrieve": "things.view",
        "create": "things.create",
        "partial_update": "things.edit",
        "destroy": "things.delete",
    }
    http_method_names = ["get", "post", "patch", "delete"]  # no PUT
```
```python
# backend/apps/<app>/urls.py
from rest_framework.routers import DefaultRouter

from .views import ThingViewSet

router = DefaultRouter()
router.register("things", ThingViewSet, basename="thing")
urlpatterns = router.urls
```
Then add `path("api/v1/", include("apps.<app>.urls")),` to `backend/config/urls.py`.

Minimum tests for every endpoint (AGENTS.md section 7). `world` and `client_for` come from 0.2:
```python
# backend/apps/<app>/tests/test_api.py
import pytest

from apps.core.testing import assert_other_shop_hidden
from .factories import ThingFactory

pytestmark = pytest.mark.django_db


def test_owner_can_create(world, client_for):
    c = client_for(world.owner_a, world.shop_a)
    r = c.post("/api/v1/things/", {"name": "X"}, format="json")
    assert r.status_code == 201, r.json()
    assert r.json()["data"]["name"] == "X"


def test_engineer_cannot_create(world, client_for):
    c = client_for(world.engineer_a, world.shop_a)
    r = c.post("/api/v1/things/", {"name": "X"}, format="json")
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "permission.denied"


def test_other_shop_object_is_hidden(world, client_for):
    thing = ThingFactory(shop=world.shop_b)
    c = client_for(world.owner_a, world.shop_a)
    assert_other_shop_hidden(c, f"/api/v1/things/{thing.id}/")


def test_validation_error_shape(world, client_for):
    c = client_for(world.owner_a, world.shop_a)
    r = c.post("/api/v1/things/", {}, format="json")
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "validation.failed"
    assert "name" in r.json()["error"]["fields"]
```
Finally, run `python manage.py spectacular --file /tmp/schema.yml --validate` (no warnings for your endpoint) and regenerate frontend types with `pnpm gen:api` (available after 0.11).

### R3. Add a permission code
1. Add the code and a description to `PERMISSION_CODES` in `backend/apps/tenancy/permissions.py`.
2. Add it to the role lists in `SYSTEM_ROLES` for every default role that should have it. Owner automatically gets every code.
3. Add it to the table in `docs/02-database-schema.md` section 8.
4. Run `python manage.py seed_roles` (it also runs automatically after `migrate`, from 0.7).
5. Add an assertion to `apps/tenancy/tests/test_roles.py` showing which default roles have it.

### R4. Record an audit event
Available after 0.15.
```python
from apps.audit.services import record_audit, snapshot

FIELDS = ("status", "assigned_to_id", "estimate_paise")
before = snapshot(job, FIELDS)
# ... change and save job ...
record_audit(request=request, action="job.updated", entity=job, before=before, after=snapshot(job, FIELDS))
```
Action names use `<entity>.<past_tense_verb>`, for example `job.status_changed`, `staff.role_changed`, `data.exported`. Inside a service that has no `request`, pass `actor=`, `shop=` and `request_meta=` explicitly (see 0.15).

### R5. Add a frontend screen
Available after 0.14.
```ts
// frontend/src/features/things/api.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiList } from "@/lib/api/client";

export type Thing = { id: string; name: string; version: number };

export const thingKeys = {
  all: ["things"] as const,
  list: (q: string) => ["things", "list", q] as const,
};

export function useThings(q: string) {
  return useQuery({
    queryKey: thingKeys.list(q),
    queryFn: () => apiList<Thing>(`/things/?q=${encodeURIComponent(q)}`),
  });
}

export function useCreateThing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string }) => api<Thing>("/things/", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: thingKeys.all }),
  });
}
```
```tsx
// frontend/src/app/(app)/things/page.tsx
"use client";

import { useTranslations } from "next-intl";
import { useThings } from "@/features/things/api";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";

export default function ThingsPage() {
  const t = useTranslations("things");
  const query = useThings("");

  if (query.isPending) return <ListSkeleton rows={6} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (query.data.items.length === 0) {
    return <EmptyState title={t("emptyTitle")} body={t("emptyBody")} />;
  }
  return (
    <ul className="divide-y divide-neutral-100">
      {query.data.items.map((item) => (
        <li key={item.id} className="min-h-12 px-4 py-3">{item.name}</li>
      ))}
    </ul>
  );
}
```
Checklist: route file; API hook; loading/empty/error states (`ErrorState` shows the permission-denied view for 403); i18n keys in all three locales (R6); touch targets of at least 48 px (`min-h-12`); checked at 360 px; one Vitest test for any non-trivial logic (formatters, reducers, validation schemas).

### R6. Add translation keys
1. Add the same key path to `frontend/src/i18n/messages/en.json`, `hi.json` and `hi-Latn.json`.
2. `hi` is Devanagari script; `hi-Latn` is Hinglish in Latin script ("Job sheet banayein").
3. If you are not confident about the Hindi, put the English text prefixed with `[TODO hi] `. The checker reports these as warnings so the native-speaker review in 1.22 finds them.
4. Run `pnpm i18n:check`. It fails on missing or extra keys.
5. Use the glossary in `docs/domain-glossary.md` for domain words.

### R7. Add a native capability
1. Check the plugin supports the Capacitor major in `package.json` and has had a release in the last 12 months. Record the choice in `docs/decisions.md`. `TODO(verify)` until done.
2. `pnpm add <plugin>` and then `npx cap sync`.
3. Create `src/native/<capability>.ts`. It exports plain async functions, checks `isNative()` from `src/native/platform.ts`, and provides a web fallback (or throws `NativeUnavailableError`, which the UI shows as "Not available on web").
4. Components import only from `src/native/<capability>.ts`, never from the plugin directly.
5. Add Android permissions to `frontend/android/app/src/main/AndroidManifest.xml` and iOS usage strings to `frontend/ios/App/App/Info.plist`.
6. 🧑‍🔧 Test on a real Android phone and iPhone.

### R8. Add an error code
1. Raise it: `raise DomainError("Job is locked.", code="job.locked", status=409)`.
2. Add a row to `docs/error-codes.md`: code, HTTP status, meaning.
3. Add the translated message under `errors` in the three locale files. Code `job.locked` becomes key `errors.job.locked`.
4. Test the status code and the `error.code`.


---

# 🏗️ Phase 0: Foundations (repair Weeks 1–2, then finish Weeks 3–4)

> **Exit criteria:** a user signs up with phone + OTP, onboards a shop, invites a staff member with a role, and uses the 5-tab shell on web, Android and iPhone. Every sensitive action is audited. CI is green on Postgres. The pilot API answers over mobile data. The printer and IMEI spikes are answered on real hardware.

---

## 0.1 Tooling, settings and CI repair

**Depends on:** nothing · **Effort:** ~1 day · **Fixes:** audit items 22–25
**Read first:** `backend/config/settings/*.py`, `backend/config/wsgi.py`, `backend/config/asgi.py`, `backend/pytest.ini`, `backend/requirements.txt`, `backend/Dockerfile`, `docker-compose.yml`, `.env.example`, `.gitignore`, `.github/workflows/ci.yml`, `frontend/package.json`, `README.md`

### 0.1.1 Use Python 3.12 everywhere
1. Create `backend/.python-version` with one line: `3.12`.
2. Ask the human to recreate the virtualenv (the current one is Python 3.14). Do not delete it yourself:
   ```bash
   cd backend
   # if python3.12 is missing:  uv python install 3.12   (or: pyenv install 3.12)
   rm -rf .venv && uv venv --python 3.12 .venv   # or: python3.12 -m venv .venv
   source .venv/bin/activate
   ```

### 0.1.2 Split and upgrade requirements
Replace `backend/requirements.txt` with the runtime dependencies only:
```text
# Runtime dependencies (production image installs only this file)
Django>=5.2,<5.3                 # 5.2 is the LTS release; 5.1 is out of support
djangorestframework>=3.15,<4
djangorestframework-simplejwt>=5.3,<6
django-cors-headers>=4.3,<5
django-filter>=24.2
drf-spectacular>=0.27
dj-database-url>=2.2             # DATABASE_URL parsing (Render/Neon give a URL)
psycopg2-binary>=2.9.9
python-dotenv>=1.0
whitenoise>=6.7                  # serves Django admin static files on Render
gunicorn>=22
sentry-sdk>=2.0
```
Create `backend/requirements-dev.txt`:
```text
-r requirements.txt
pytest>=8.0
pytest-django>=4.8
factory-boy>=3.3
ruff>=0.6
pip-audit>=2.7
```
Run `pip install -r requirements-dev.txt`.

### 0.1.3 Settings: one database path, Postgres everywhere
Edit `backend/config/settings/base.py`:
1. Add `import dj_database_url` at the top.
2. Add `"django.contrib.postgres",` to the end of `DJANGO_APPS`.
3. Add this directly below `ALLOWED_HOSTS`:
   ```python
   DATABASES = {
       "default": dj_database_url.config(
           default="postgres://fixpro_user:fixpro_dev_password@localhost:5432/fixpro_db",
           conn_max_age=0,
       )
   }
   APP_VERSION = os.environ.get("APP_VERSION", "0.0.0-dev")
   ```
4. In `MIDDLEWARE`, insert `"whitenoise.middleware.WhiteNoiseMiddleware",` directly after `"django.middleware.security.SecurityMiddleware",`.
5. Replace the CORS block with:
   ```python
   from corsheaders.defaults import default_headers

   CORS_ALLOW_ALL_ORIGINS = False
   CORS_ALLOWED_ORIGINS = [
       origin.strip()
       for origin in os.environ.get(
           "CORS_ALLOWED_ORIGINS",
           # https://localhost = Android WebView (androidScheme https); capacitor://localhost = iOS
           "http://localhost:3000,http://127.0.0.1:3000,https://localhost,capacitor://localhost",
       ).split(",")
       if origin.strip()
   ]
   CORS_ALLOW_CREDENTIALS = False  # we use Authorization headers, not cookies
   CORS_ALLOW_HEADERS = (
       *default_headers,
       "x-shop-id",
       "idempotency-key",
       "if-match",
       "x-app-version",
       "x-request-id",
   )
   CORS_EXPOSE_HEADERS = ["X-Request-Id", "Retry-After"]
   ```
   Move the `from corsheaders.defaults import default_headers` line up to the other imports.
6. Add basic logging at the end of the file:
   ```python
   LOGGING = {
       "version": 1,
       "disable_existing_loggers": False,
       "formatters": {"plain": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"}},
       "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "plain"}},
       "root": {"handlers": ["console"], "level": os.environ.get("LOG_LEVEL", "INFO")},
   }
   ```

Replace `backend/config/settings/dev.py` entirely:
```python
"""Development settings."""

from .base import *  # noqa: F403

DEBUG = True
ALLOWED_HOSTS = ["*"]
```
(The SQLite switch and the throttle override are deleted on purpose.)

Create `backend/config/settings/test.py`:
```python
"""Settings used by pytest. Same database engine as production (PostgreSQL)."""

from .base import *  # noqa: F403

DEBUG = False
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
```

Replace `backend/config/settings/prod.py` entirely:
```python
"""Production settings. Every secret comes from the environment."""

import os

import dj_database_url
import sentry_sdk
from django.core.exceptions import ImproperlyConfigured
from sentry_sdk.integrations.django import DjangoIntegration

from .base import *  # noqa: F403
from .base import SIMPLE_JWT

DEBUG = False

SECRET_KEY = os.environ.get("SECRET_KEY", "")
if len(SECRET_KEY) < 50 or SECRET_KEY.startswith("fixpro-"):
    raise ImproperlyConfigured("Set SECRET_KEY to a random value of at least 50 characters.")
SIMPLE_JWT["SIGNING_KEY"] = SECRET_KEY  # base.py captured the insecure default; replace it

ALLOWED_HOSTS = [h.strip() for h in os.environ.get("ALLOWED_HOSTS", "").split(",") if h.strip()]
if not ALLOWED_HOSTS:
    raise ImproperlyConfigured("Set ALLOWED_HOSTS.")
CSRF_TRUSTED_ORIGINS = [o.strip() for o in os.environ.get("CSRF_TRUSTED_ORIGINS", "").split(",") if o.strip()]

DATABASES = {"default": dj_database_url.config(conn_max_age=600, ssl_require=True)}

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

SENTRY_DSN = os.environ.get("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=False,
        release=os.environ.get("APP_VERSION"),
    )

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = os.environ.get("SECURE_SSL_REDIRECT", "true").lower() == "true"
SECURE_HSTS_SECONDS = int(os.environ.get("SECURE_HSTS_SECONDS", "3600"))  # raise to 31536000 after the pilot
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SILENCED_SYSTEM_CHECKS = ["security.W021"]  # HSTS preload is a long-term commitment; decide later
```
Edit `backend/config/wsgi.py` and `backend/config/asgi.py`: change the default to `"config.settings.prod"`. `manage.py` keeps `config.settings.dev`.

Replace `backend/pytest.ini`:
```ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings.test
python_files = tests.py test_*.py
addopts = -ra -q --tb=short --strict-markers
filterwarnings =
    ignore::DeprecationWarning
```

### 0.1.4 Docker Compose and Dockerfile
Replace `docker-compose.yml`:
```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: fixpro_db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME:-fixpro_db}
      POSTGRES_USER: ${DB_USER:-fixpro_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-fixpro_dev_password}
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-fixpro_user} -d ${DB_NAME:-fixpro_db}"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build:
      context: ./backend
      args:
        REQUIREMENTS: requirements-dev.txt
    container_name: fixpro_backend
    restart: unless-stopped
    command: sh -c "python manage.py migrate --noinput && python manage.py runserver 0.0.0.0:8000"
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    environment:
      DJANGO_SETTINGS_MODULE: config.settings.dev
      SECRET_KEY: ${SECRET_KEY:-fixpro-dev-insecure-key}
      DATABASE_URL: postgres://${DB_USER:-fixpro_user}:${DB_PASSWORD:-fixpro_dev_password}@db:5432/${DB_NAME:-fixpro_db}
    depends_on:
      db:
        condition: service_healthy

volumes:
  postgres_data:
```
Replace `backend/Dockerfile`:
```dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

ARG REQUIREMENTS=requirements.txt
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r ${REQUIREMENTS}

COPY . .
EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2"]
```
(WeasyPrint system libraries are added in 1.15. `psycopg2-binary` brings its own libpq; `libpq5` is harmless and useful for `psql` debugging.)

### 0.1.5 Environment examples
Replace `.env.example`:
```bash
# Copy to .env for local development. Never commit .env.
DJANGO_SETTINGS_MODULE=config.settings.dev
SECRET_KEY=fixpro-dev-insecure-key-change-me
DATABASE_URL=postgres://fixpro_user:fixpro_dev_password@localhost:5432/fixpro_db
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://localhost,capacitor://localhost
LOG_LEVEL=INFO
APP_VERSION=0.0.0-dev
SENTRY_DSN=
# Added by later subphases:
# SMS_PROVIDER=apps.core.sms.ConsoleSmsProvider        (0.6)
# OTP_TEST_NUMBERS=+919999999999:123456                (0.6, dev/test/reviewer only)
# FIELD_ENCRYPTION_KEY=                                (1.5)
# CRON_SECRET=                                         (0.17)
PUBLIC_TRACKING_BASE_URL=http://localhost:8000/t/
```
Create `frontend/.env.example`:
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_VERSION=0.0.0-dev
NEXT_PUBLIC_ENABLE_DEV_PAGES=true
NEXT_PUBLIC_SENTRY_DSN=
```

### 0.1.6 Fix `.gitignore`
1. Replace the `# Mobile / Capacitor` block with:
   ```gitignore
   # Mobile / Capacitor
   frontend/android/.gradle/
   frontend/android/build/
   frontend/android/app/build/
   frontend/android/captures/
   frontend/ios/App/build/
   frontend/ios/App/Pods/
   *.tsbuildinfo
   ```
2. Replace the last line `./Feature` with `/Feature/` (a leading `./` never matches anything).
3. Add `!.env.example` directly after `.env.*.local`.
4. Untrack the build cache: `git rm --cached frontend/tsconfig.tsbuildinfo`.

### 0.1.7 Frontend dependency hygiene
In `frontend/package.json`:
1. Add `"packageManager": "pnpm@11.26.0"` (the version you use locally; check with `pnpm --version`) and `"engines": { "node": ">=22" }`.
2. Delete the `"start"` script (`next start` does not work with `output: 'export'`).
3. Upgrade Next.js to the newest 14.2.x patch: `pnpm add next@14.2 eslint-config-next@14.2`. Earlier 14.2 patches have published security advisories.
4. Upgrade Capacitor **now**, while the Android project is still empty. Run `pnpm view @capacitor/core version`. If the major is newer than 6:
   ```bash
   pnpm add @capacitor/core@latest @capacitor/android@latest @capacitor/haptics@latest @capacitor/share@latest
   pnpm add -D @capacitor/cli@latest
   npx cap migrate
   ```
   Move `@capacitor/cli` to `devDependencies` either way. Record the Capacitor major in `docs/decisions.md`. Every plugin added later must support this major.

### 0.1.8 CI rewrite
Replace `.github/workflows/ci.yml`:
```yaml
name: FixPro CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend:
    name: Backend (ruff, migrations, deploy check, pytest)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: fixpro_db
          POSTGRES_USER: fixpro_user
          POSTGRES_PASSWORD: fixpro_dev_password
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U fixpro_user -d fixpro_db"
          --health-interval 5s --health-timeout 5s --health-retries 10
    env:
      DATABASE_URL: postgres://fixpro_user:fixpro_dev_password@localhost:5432/fixpro_db
      SECRET_KEY: ci-only-not-secret
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
          cache-dependency-path: backend/requirements*.txt
      - run: pip install -r requirements-dev.txt
      - run: ruff check .
      - run: ruff format --check .
      - run: python manage.py makemigrations --check --dry-run
      - name: Django deploy checklist (prod settings)
        env:
          DJANGO_SETTINGS_MODULE: config.settings.prod
          SECRET_KEY: ci-deploy-check-0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJ
          ALLOWED_HOSTS: api.example.com
          DATABASE_URL: postgres://fixpro_user:fixpro_dev_password@localhost:5432/fixpro_db
        run: python manage.py check --deploy --fail-level WARNING
      - run: pytest
      - run: pip-audit -r requirements.txt

  frontend:
    name: Frontend (lint, typecheck, test, build)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./frontend
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          package_json_file: frontend/package.json
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: frontend/pnpm-lock.yaml
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```
If `pip-audit` reports a vulnerability that has no fixed version yet, add `--ignore-vuln <ID>` with a comment and a `docs/PROJECT-STATE.md` known-issue entry. Do not delete the step.

### 0.1.9 README quickstart
In `README.md`, replace the "Backend Setup" code block with:
```bash
docker compose up -d db                      # Postgres 16 on localhost:5432
cd backend
uv venv --python 3.12 .venv && source .venv/bin/activate   # or python3.12 -m venv .venv
pip install -r requirements-dev.txt
python manage.py migrate                     # also seeds system roles (from 0.7)
python manage.py runserver 0.0.0.0:8000
pytest                                       # needs the db container running
```
Remove the `python manage.py seed_roles` line for now; 0.7 adds the command back.

### Verify
```bash
docker compose up -d db
cd backend && ruff check . && ruff format --check . && python manage.py makemigrations --check --dry-run && pytest
cd ../frontend && pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build
git status --short    # tsconfig.tsbuildinfo must show as deleted (D), not modified
```
All 18 existing tests must still pass, now on Postgres.

**Done when:** tests pass on Postgres locally and in CI, the deploy checklist passes with prod settings, and `pnpm build` produces `frontend/out/`.

---

## 0.2 Test toolkit (fixtures, factories, isolation helper)

**Depends on:** 0.1 · **Effort:** ~0.5 day
**Read first:** `backend/apps/tenancy/tests/test_isolation.py`, `backend/apps/tenancy/services.py`

### 0.2.1 Shared fixtures
Create `backend/conftest.py`:
```python
"""Shared pytest fixtures. `world` gives two shops with every default role in shop A."""

from dataclasses import dataclass

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.tenancy.models import Membership, Organization, Role, Shop
from apps.tenancy.services import create_organization_and_shop, seed_system_roles


@pytest.fixture(autouse=True)
def _clear_cache():
    """Throttle counters live in the cache; never leak them between tests."""
    cache.clear()
    yield
    cache.clear()


@dataclass
class World:
    org_a: Organization
    shop_a: Shop
    owner_a: User
    manager_a: User
    front_desk_a: User
    engineer_a: User
    org_b: Organization
    shop_b: Shop
    owner_b: User

    def membership(self, user: User, shop: Shop) -> Membership:
        return Membership.objects.get(user=user, shop=shop)


def _add_member(shop: Shop, phone: str, name: str, role_name: str) -> User:
    user = User.objects.create_user(phone=phone, name=name)
    role = Role.objects.get(organization=None, name=role_name)
    Membership.objects.create(
        user=user, shop=shop, role=role, status=Membership.StatusChoices.ACTIVE, display_name=name
    )
    return user


@pytest.fixture
def world(db) -> World:
    seed_system_roles()
    owner_a = User.objects.create_user(phone="+919000000001", name="Owner A")
    org_a, shop_a, _ = create_organization_and_shop(owner_user=owner_a, org_name="Apex", shop_name="Apex Main")
    owner_b = User.objects.create_user(phone="+919000000002", name="Owner B")
    org_b, shop_b, _ = create_organization_and_shop(owner_user=owner_b, org_name="Beacon", shop_name="Beacon Main")
    return World(
        org_a=org_a,
        shop_a=shop_a,
        owner_a=owner_a,
        manager_a=_add_member(shop_a, "+919000000011", "Manager A", "Manager"),
        front_desk_a=_add_member(shop_a, "+919000000012", "Front Desk A", "Front Desk"),
        engineer_a=_add_member(shop_a, "+919000000013", "Engineer A", "Engineer"),
        org_b=org_b,
        shop_b=shop_b,
        owner_b=owner_b,
    )


@pytest.fixture
def client_for():
    """client_for(user, shop) -> APIClient authenticated as user, sending X-Shop-Id for shop."""

    def make(user: User | None = None, shop: Shop | None = None) -> APIClient:
        client = APIClient()
        if user is not None:
            client.force_authenticate(user=user)
        if shop is not None:
            client.credentials(HTTP_X_SHOP_ID=str(shop.id))
        return client

    return make
```

### 0.2.2 Isolation helper
Create `backend/apps/core/testing.py`:
```python
"""Test helpers shared by every app."""


def assert_other_shop_hidden(client, url: str, methods: tuple[str, ...] = ("get", "patch", "delete")) -> None:
    """An object of another shop must look exactly like a missing object: 404 for every method."""
    for method in methods:
        call = getattr(client, method)
        response = call(url) if method in ("get", "delete") else call(url, {}, format="json", HTTP_IF_MATCH="1")
        assert response.status_code == 404, f"{method.upper()} {url} returned {response.status_code}, expected 404"
```

### 0.2.3 Factories
Create `backend/apps/accounts/tests/factories.py`:
```python
import factory
from factory.django import DjangoModelFactory

from apps.accounts.models import User


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ("phone",)

    phone = factory.Sequence(lambda n: f"+9191{n:08d}")
    name = factory.Faker("name", locale="en_IN")
```
Create `backend/apps/tenancy/tests/factories.py`:
```python
import factory
from factory.django import DjangoModelFactory

from apps.accounts.tests.factories import UserFactory
from apps.tenancy.models import Membership, Organization, Role, Shop


class OrganizationFactory(DjangoModelFactory):
    class Meta:
        model = Organization

    name = factory.Sequence(lambda n: f"Org {n}")
    owner_user = factory.SubFactory(UserFactory)


class ShopFactory(DjangoModelFactory):
    class Meta:
        model = Shop

    organization = factory.SubFactory(OrganizationFactory)
    name = factory.Sequence(lambda n: f"Shop {n}")
    phone = "+919800000000"


class MembershipFactory(DjangoModelFactory):
    class Meta:
        model = Membership

    user = factory.SubFactory(UserFactory)
    shop = factory.SubFactory(ShopFactory)
    role = factory.LazyFunction(lambda: Role.objects.get(organization=None, name="Engineer"))
    status = Membership.StatusChoices.ACTIVE
```
Add an empty `backend/apps/core/tests/__init__.py` if it is missing.

### 0.2.4 Smoke test for the toolkit
Create `backend/apps/core/tests/test_toolkit.py`:
```python
import pytest

from apps.tenancy.models import Membership

pytestmark = pytest.mark.django_db


def test_world_has_all_roles(world):
    roles = set(Membership.objects.filter(shop=world.shop_a).values_list("role__name", flat=True))
    assert roles == {"Owner", "Manager", "Front Desk", "Engineer"}
    assert Membership.objects.filter(shop=world.shop_b).count() == 1


def test_client_for_sends_shop_header(world, client_for):
    client = client_for(world.owner_a, world.shop_a)
    assert client._credentials["HTTP_X_SHOP_ID"] == str(world.shop_a.id)
```

### Verify
```bash
cd backend && pytest && ruff check . && ruff format --check .
```
**Done when:** 20 tests pass (18 old + 2 new).

---

## 0.3 Core models: real shop FK and safe soft delete

**Depends on:** 0.2 · **Effort:** ~0.5 day · **Fixes:** audit items 2, 12
**Read first:** `backend/apps/core/models.py`, `backend/apps/tenancy/scoping.py`

### 0.3.1 Rewrite `backend/apps/core/models.py`
Keep `UUIDModel` and `TimeStampedModel` as they are. Replace everything from `class SoftDeletableQuerySet` to the end of the file with:
```python
class SoftDeletableQuerySet(models.QuerySet):
    """QuerySet whose delete() is a soft delete. Use hard_delete() for permanent removal."""

    def alive(self):
        return self.filter(deleted_at__isnull=True)

    def dead(self):
        return self.filter(deleted_at__isnull=False)

    def delete(self):
        now = timezone.now()
        values = {"deleted_at": now}
        if any(f.name == "updated_at" for f in self.model._meta.concrete_fields):
            values["updated_at"] = now
        return self.update(**values)

    def hard_delete(self):
        return super().delete()


class SoftDeletableManager(models.Manager.from_queryset(SoftDeletableQuerySet)):
    """Default manager: hides soft-deleted rows."""

    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)


class AllObjectsManager(models.Manager.from_queryset(SoftDeletableQuerySet)):
    """Includes soft-deleted rows (trash, restore, admin)."""


class SoftDeletableModel(models.Model):
    """Rows are never removed by delete(); they get a deleted_at timestamp instead."""

    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    objects = SoftDeletableManager()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    def _save_deletion_state(self):
        fields = ["deleted_at"]
        if hasattr(self, "updated_at"):
            fields.append("updated_at")
        self.save(update_fields=fields)

    def soft_delete(self):
        self.deleted_at = timezone.now()
        self._save_deletion_state()

    def restore(self):
        self.deleted_at = None
        self._save_deletion_state()

    def delete(self, using=None, keep_parents=False):
        """Soft delete. Django admin, DRF destroy and obj.delete() all end up here."""
        self.soft_delete()
        return 0, {}

    def hard_delete(self, using=None, keep_parents=False):
        """Permanent delete. Only for purge jobs and permission-gated 'delete permanently'."""
        return models.Model.delete(self, using=using, keep_parents=keep_parents)


class ShopScopedQuerySet(SoftDeletableQuerySet):
    def for_shop(self, shop):
        return self.filter(shop=shop)


class ShopScopedManager(models.Manager.from_queryset(ShopScopedQuerySet)):
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)


class AllShopScopedManager(models.Manager.from_queryset(ShopScopedQuerySet)):
    pass


class ShopScopedModel(UUIDModel, TimeStampedModel, SoftDeletableModel):
    """
    Base class for every business table (AGENTS.md rule 1 and 3).
    Real foreign key to tenancy.Shop, author, optimistic-concurrency version, soft delete.
    Subclasses declare their own Meta.indexes / constraints (see ROADMAP Recipe R1).
    """

    shop = models.ForeignKey("tenancy.Shop", on_delete=models.PROTECT, related_name="+")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    version = models.PositiveIntegerField(default=1)

    objects = ShopScopedManager()
    all_objects = AllShopScopedManager()

    class Meta:
        abstract = True
```
Add `from django.conf import settings` to the imports. Delete the old `ShopScopedBaseModel` class.

### 0.3.2 Remove the duplicate base class
In `backend/apps/tenancy/scoping.py`, delete the `ShopScopedModel` class and the `from apps.core.models import ShopScopedBaseModel` import. The rest of the file is removed in 0.7. Run `grep -rn "ShopScopedBaseModel" backend/` and confirm it returns nothing.

### 0.3.3 Tests
Create `backend/apps/core/tests/test_soft_delete.py`:
```python
import pytest

from apps.tenancy.models import Membership, Organization, Shop

pytestmark = pytest.mark.django_db


def test_instance_delete_is_soft(world):
    shop_id = world.shop_a.id
    world.shop_a.delete()
    assert not Shop.objects.filter(id=shop_id).exists()
    assert Shop.all_objects.filter(id=shop_id, deleted_at__isnull=False).exists()
    assert Membership.objects.filter(shop_id=shop_id).count() == 4  # nothing cascaded


def test_queryset_delete_is_soft(world):
    Organization.objects.filter(id=world.org_b.id).delete()
    assert Organization.all_objects.get(id=world.org_b.id).is_deleted


def test_restore(world):
    world.shop_a.delete()
    shop = Shop.all_objects.get(id=world.shop_a.id)
    shop.restore()
    assert Shop.objects.filter(id=shop.id).exists()


def test_hard_delete_really_deletes(db):
    from apps.tenancy.tests.factories import OrganizationFactory

    org = OrganizationFactory()
    org.hard_delete()
    assert not Organization.all_objects.filter(id=org.id).exists()
```
`ShopScopedModel` is tested with the first concrete model in 1.1.

### Verify
```bash
cd backend && pytest && ruff check . && ruff format --check . && python manage.py makemigrations --check --dry-run
```
`makemigrations --check` must report no changes, because no concrete model uses the abstract classes yet.

**Done when:** soft-delete tests pass, and no code references `ShopScopedBaseModel`.

---

## 0.4 API contract layer (envelope, errors, request ID, pagination, throttling)

**Depends on:** 0.3 · **Effort:** 1–1.5 days · **Fixes:** audit items 16, 17 (partly), 21
**Read first:** `docs/api-conventions.md`, every `views.py` and test file in `backend/apps/`

### 0.4.1 Create the package `backend/apps/core/api/`
Create `backend/apps/core/api/__init__.py` (empty).

`backend/apps/core/api/errors.py`:
```python
"""Domain errors with stable, dotted, lowercase codes. Every code is listed in docs/error-codes.md."""

from rest_framework import status as http
from rest_framework.exceptions import APIException


class DomainError(APIException):
    status_code = http.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = "Business rule violated."
    default_code = "business.rule_violated"

    def __init__(self, message=None, *, code=None, status=None, fields=None, wait=None):
        super().__init__(detail=message or self.default_detail, code=code or self.default_code)
        self.error_code = code or self.default_code
        if status is not None:
            self.status_code = status
        self.fields = fields or {}
        self.wait = wait  # seconds; sent as Retry-After


class ConflictError(DomainError):
    status_code = http.HTTP_409_CONFLICT
    default_detail = "This record changed. Reload and try again."
    default_code = "conflict"


class NotFoundError(DomainError):
    status_code = http.HTTP_404_NOT_FOUND
    default_detail = "Not found."
    default_code = "not_found"
```

`backend/apps/core/api/exceptions.py`:
```python
"""Turns every API error into {"error": {code, message, fields, request_id}}."""

import logging

from django.conf import settings
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404
from rest_framework import exceptions as drf
from rest_framework.response import Response
from rest_framework.serializers import as_serializer_error
from rest_framework.views import exception_handler as drf_exception_handler

from .errors import DomainError

logger = logging.getLogger("fixpro.api")

# Order matters: first match wins (subclasses before parents).
DEFAULT_CODES = (
    (drf.NotAuthenticated, "auth.not_authenticated"),
    (drf.AuthenticationFailed, "auth.token_invalid"),  # includes SimpleJWT InvalidToken (expired too)
    (drf.PermissionDenied, "permission.denied"),
    (drf.NotFound, "not_found"),
    (drf.MethodNotAllowed, "request.method_not_allowed"),
    (drf.NotAcceptable, "request.not_acceptable"),
    (drf.UnsupportedMediaType, "request.unsupported_media_type"),
    (drf.ParseError, "request.malformed"),
    (drf.Throttled, "rate.limited"),
    (drf.ValidationError, "validation.failed"),
)


def _first_message(detail) -> str:
    if isinstance(detail, list | tuple) and detail:
        return _first_message(detail[0])
    if isinstance(detail, dict):
        return "Validation failed."
    return str(detail)


def api_exception_handler(exc, context):
    if isinstance(exc, Http404):
        exc = drf.NotFound()
    elif isinstance(exc, DjangoPermissionDenied):
        exc = drf.PermissionDenied()
    elif isinstance(exc, DjangoValidationError):
        exc = drf.ValidationError(as_serializer_error(exc))

    request = context.get("request")
    request_id = getattr(request, "request_id", None)
    response = drf_exception_handler(exc, context)

    if response is None:  # unexpected exception -> 500
        if settings.DEBUG:
            return None  # let Django show the debug page
        logger.exception("Unhandled API error request_id=%s", request_id)
        try:
            import sentry_sdk

            sentry_sdk.capture_exception(exc)
        except ImportError:
            pass
        body = {"code": "server.error", "message": "Something went wrong. Please try again.", "fields": {}}
        return Response({"error": {**body, "request_id": request_id}}, status=500)

    if isinstance(exc, DomainError):
        code, fields, message = exc.error_code, exc.fields, str(exc.detail)
        if exc.wait:
            response["Retry-After"] = str(int(exc.wait))
    elif isinstance(exc, drf.ValidationError):
        code, message = "validation.failed", "Please correct the highlighted fields."
        fields = response.data if isinstance(response.data, dict) else {"non_field_errors": response.data}
    else:
        code = next((c for cls, c in DEFAULT_CODES if isinstance(exc, cls)), "error")
        fields, message = {}, _first_message(exc.detail)

    response.data = {"error": {"code": code, "message": message, "fields": fields, "request_id": request_id}}
    return response
```

`backend/apps/core/api/renderers.py`:
```python
from rest_framework.renderers import JSONRenderer


class Enveloped(dict):
    """Marker: this payload is already {"data": ..., "meta": ...} (used by pagination)."""


class EnvelopeJSONRenderer(JSONRenderer):
    """Wraps successful payloads in {"data": ...}. Errors are already shaped by the exception handler."""

    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = (renderer_context or {}).get("response")
        if response is not None and not response.exception and response.status_code != 204 and data is not None:
            if not isinstance(data, Enveloped):
                data = {"data": data}
        return super().render(data, accepted_media_type, renderer_context)
```

`backend/apps/core/api/pagination.py`:
```python
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .renderers import Enveloped


class EnvelopePagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response(
            Enveloped(
                data=data,
                meta={
                    "count": self.page.paginator.count,
                    "page": self.page.number,
                    "next": self.get_next_link(),
                    "previous": self.get_previous_link(),
                },
            )
        )

    def get_paginated_response_schema(self, schema):
        nullable_uri = {"type": "string", "format": "uri", "nullable": True}
        return {
            "type": "object",
            "required": ["data", "meta"],
            "properties": {
                "data": schema,
                "meta": {
                    "type": "object",
                    "properties": {
                        "count": {"type": "integer"},
                        "page": {"type": "integer"},
                        "next": nullable_uri,
                        "previous": nullable_uri,
                    },
                },
            },
        }
```

`backend/apps/core/api/schema.py`:
```python
"""drf-spectacular hook: documents the {"data": ...} envelope the renderer adds."""


def wrap_responses_in_envelope(result, generator, request, public):
    for path_item in result.get("paths", {}).values():
        for operation in path_item.values():
            if not isinstance(operation, dict):
                continue
            for status_code, response in operation.get("responses", {}).items():
                if not str(status_code).startswith("2"):
                    continue
                content = response.get("content", {}).get("application/json")
                if not content or "schema" not in content:
                    continue
                schema = content["schema"]
                if {"data", "meta"} <= set(schema.get("properties", {})):
                    continue  # paginated: already enveloped
                content["schema"] = {"type": "object", "required": ["data"], "properties": {"data": schema}}
    return result
```

`backend/apps/core/middleware.py`:
```python
import re
import uuid

_SAFE_ID = re.compile(r"^[A-Za-z0-9\-]{8,64}$")


class RequestIdMiddleware:
    """Gives every request an ID (reuses a safe incoming X-Request-Id) and echoes it back."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        incoming = request.headers.get("X-Request-Id", "")
        request.request_id = incoming if _SAFE_ID.match(incoming) else uuid.uuid4().hex
        response = self.get_response(request)
        response["X-Request-Id"] = request.request_id
        return response
```

`backend/apps/core/time.py`:
```python
from datetime import date, datetime
from zoneinfo import ZoneInfo

from django.utils import timezone

IST = ZoneInfo("Asia/Kolkata")


def now_ist() -> datetime:
    return timezone.now().astimezone(IST)


def today_ist() -> date:
    return now_ist().date()


def financial_year_start(d: date) -> int:
    """Indian financial year runs April to March. 2027-03-31 -> 2026, 2027-04-01 -> 2027."""
    return d.year if d.month >= 4 else d.year - 1


def financial_year_label(fy_start: int) -> str:
    """2026 -> '26-27'."""
    return f"{fy_start % 100:02d}-{(fy_start + 1) % 100:02d}"
```

### 0.4.2 Wire it into settings
In `backend/config/settings/base.py`:
1. Make `"apps.core.middleware.RequestIdMiddleware",` the **first** entry of `MIDDLEWARE`.
2. Replace the `REST_FRAMEWORK` dict with:
   ```python
   REST_FRAMEWORK = {
       "DEFAULT_AUTHENTICATION_CLASSES": ("rest_framework_simplejwt.authentication.JWTAuthentication",),
       "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
       "DEFAULT_RENDERER_CLASSES": ("apps.core.api.renderers.EnvelopeJSONRenderer",),
       "DEFAULT_PARSER_CLASSES": (
           "rest_framework.parsers.JSONParser",
           "rest_framework.parsers.MultiPartParser",
           "rest_framework.parsers.FormParser",
       ),
       "EXCEPTION_HANDLER": "apps.core.api.exceptions.api_exception_handler",
       "DEFAULT_PAGINATION_CLASS": "apps.core.api.pagination.EnvelopePagination",
       "PAGE_SIZE": 25,
       "DEFAULT_FILTER_BACKENDS": (
           "django_filters.rest_framework.DjangoFilterBackend",
           "rest_framework.filters.OrderingFilter",
       ),
       "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
       "DEFAULT_THROTTLE_CLASSES": (
           "rest_framework.throttling.AnonRateThrottle",
           "rest_framework.throttling.UserRateThrottle",
       ),
       "DEFAULT_THROTTLE_RATES": {
           "anon": "60/min",
           "user": "600/min",
           "otp_send": "10/hour",      # per IP; per-phone limits live in the OTP service
           "otp_verify": "30/hour",
           "token_refresh": "120/hour",
           "tracking": "60/min",
       },
       # Number of trusted reverse proxies in front of Django (Render = 1? TODO(verify)). 0 locally.
       "NUM_PROXIES": int(os.environ.get("NUM_PROXIES", "0")) or None,
       "TEST_REQUEST_DEFAULT_FORMAT": "json",
   }
   ```
   (`SearchFilter` is removed on purpose. Search uses a `?q=` filter defined per endpoint, per the conventions.)
3. In `SPECTACULAR_SETTINGS`, add:
   ```python
   "POSTPROCESSING_HOOKS": [
       "drf_spectacular.hooks.postprocess_schema_enums",
       "apps.core.api.schema.wrap_responses_in_envelope",
   ],
   "COMPONENT_SPLIT_REQUEST": True,
   ```

### 0.4.3 Remove hand-made envelopes and ad-hoc error codes
With the renderer in place, views must return the bare payload.
1. In every view under `backend/apps/`, change `Response({"data": X}, ...)` to `Response(X, ...)`.
2. `apps/accounts/views.py`: replace each hand-built error `Response({"error": ...}, status=400)` with `raise DomainError(msg, code="otp.request_failed", status=400)` in `SendOTPView`, and `raise DomainError(msg, code="otp.verification_failed", status=400)` in `VerifyOTPView`. 0.6 replaces these with precise codes.
3. `apps/tenancy/scoping.py` (`ShopScopedViewSet.initial`): replace each `raise exceptions.X({"error": {...}})` with a `DomainError`:

   | Old code | New |
   |---|---|
   | `MISSING_SHOP_ID` | `DomainError("Header 'X-Shop-Id' is required.", code="shop.header_missing", status=400)` |
   | `INVALID_SHOP_ID` | `DomainError("Header 'X-Shop-Id' must be a UUID.", code="shop.header_invalid", status=400)` |
   | `SHOP_NOT_FOUND` | `NotFoundError("Shop not found.", code="shop.not_found")` |
   | `CROSS_TENANT_ACCESS_DENIED` | `NotFoundError("Shop not found.", code="shop.not_found")`. Other shops look like missing shops. |
   | `INSUFFICIENT_PERMISSION` | `DomainError("You do not have permission to do this.", code="permission.denied", status=403)` |
   | `UNAUTHENTICATED` | delete the block; `IsAuthenticated` already returns 401 |
4. In every test: replace `response.data[...]` with `response.json()[...]`, change list assertions from `["results"]` to `["data"]`, and update codes and statuses to the table above. `test_cross_tenant_access_strictly_forbidden` and `test_suspended_membership_denied_access` now expect **404** with `shop.not_found`.

### 0.4.4 Fix the health endpoint
In `apps/core/views.py`, replace the body of `get` with:
```python
def get(self, request):
    database = "connected"
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except DatabaseError:
        logger.exception("Health check: database unavailable")
        database = "unavailable"  # never leak driver error text publicly
    healthy = database == "connected"
    return Response(
        {
            "status": "healthy" if healthy else "degraded",
            "service": "fixpro-api",
            "version": settings.APP_VERSION,
            "timestamp": timezone.now().isoformat(),
            "database": database,
        },
        status=status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE,
    )
```
Add `import logging`, `from django.conf import settings`, `logger = logging.getLogger(__name__)`. Set `throttle_classes = ()` on `HealthCheckView`, because uptime monitors poll it. Update `test_health.py`: assert `version == settings.APP_VERSION`.

### 0.4.5 Error code registry
Create `docs/error-codes.md`:
```markdown
# API error codes

Every `error.code` the API can return. The client maps each to `errors.<code>` in the locale files.
Add a row in the same commit that introduces a code (ROADMAP Recipe R8).

| Code | HTTP | Meaning |
|---|---|---|
| validation.failed | 400 | Field validation failed; see `fields` |
| request.malformed | 400 | Body is not valid JSON |
| auth.not_authenticated | 401 | No token sent |
| auth.token_invalid | 401 | Token invalid, expired or revoked; client refreshes once, then signs out |
| permission.denied | 403 | Authenticated but missing a permission |
| not_found | 404 | Object missing or belongs to another shop |
| shop.header_missing | 400 | `X-Shop-Id` header missing on a shop-scoped endpoint |
| shop.header_invalid | 400 | `X-Shop-Id` is not a UUID |
| shop.not_found | 404 | Shop missing, deleted, or the user is not an active member |
| request.method_not_allowed | 405 | HTTP method not supported |
| rate.limited | 429 | Throttled; see `Retry-After` |
| server.error | 500 | Unexpected; quote `request_id` to support |
```
In `docs/api-conventions.md`, change the 401 row's example code from `auth.token_expired` to `auth.token_invalid`, and add one line under "Errors": "Codes are listed in `docs/error-codes.md`."

### 0.4.6 Tests
Create `backend/apps/core/tests/test_api_contract.py`:
```python
from datetime import date

import pytest

from apps.core.time import financial_year_label, financial_year_start

pytestmark = pytest.mark.django_db


def test_success_is_enveloped(client_for, world):
    r = client_for(world.owner_a).get("/api/v1/auth/me/")
    assert r.status_code == 200
    assert "data" in r.json()


def test_list_has_data_and_meta(client_for, world):
    r = client_for(world.owner_a, world.shop_a).get("/api/v1/staff/")
    body = r.json()
    assert set(body) == {"data", "meta"}
    assert body["meta"]["count"] == 4


def test_401_shape(client):
    r = client.get("/api/v1/auth/me/")
    assert r.status_code == 401
    err = r.json()["error"]
    assert err["code"] == "auth.not_authenticated"
    assert set(err) == {"code", "message", "fields", "request_id"}


def test_request_id_echoed(client):
    r = client.get("/api/v1/health/", HTTP_X_REQUEST_ID="abc12345-test")
    assert r["X-Request-Id"] == "abc12345-test"


def test_unsafe_request_id_replaced(client):
    r = client.get("/api/v1/health/", HTTP_X_REQUEST_ID="<script>")
    assert r["X-Request-Id"] != "<script>"


def test_validation_shape(client_for, world):
    r = client_for(world.owner_a).post("/api/v1/tenancy/onboard/", {}, format="json")
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "validation.failed"
    assert "shop_name" in r.json()["error"]["fields"]


@pytest.mark.parametrize(
    ("d", "fy"), [(date(2027, 3, 31), 2026), (date(2027, 4, 1), 2027), (date(2026, 12, 1), 2026)]
)
def test_financial_year(d, fy):
    assert financial_year_start(d) == fy


def test_financial_year_label():
    assert financial_year_label(2026) == "26-27"
    assert financial_year_label(2099) == "99-00"
```
Note: `client` is pytest-django's plain Django test client. That is fine here because these responses are JSON.

### Verify
```bash
cd backend && pytest && ruff check . && ruff format --check .
python manage.py spectacular --file /tmp/schema.yml --validate
```
**Done when:** every response is `{"data": …}`, `{"data": […], "meta": {…}}` or `{"error": {…}}`, and every test reads `response.json()`.


---

## 0.5 Idempotency keys and optimistic concurrency

**Depends on:** 0.4 · **Effort:** ~1 day · **Fixes:** audit item 17
**Read first:** `docs/api-conventions.md` (Idempotency-Key, Concurrency), `backend/apps/core/api/errors.py`

### 0.5.1 Model
Create `backend/apps/core/migrations/__init__.py` (empty). Append to `backend/apps/core/models.py`:
```python
class IdempotencyRecord(UUIDModel):
    """Remembers the response to a POST so a retried request (same Idempotency-Key) gets the same answer."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    key = models.UUIDField()
    method = models.CharField(max_length=8)
    path = models.CharField(max_length=255)
    request_hash = models.CharField(max_length=64)
    status_code = models.PositiveSmallIntegerField(null=True, blank=True)  # null = still processing
    response_body = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "key"], name="idem_uniq_user_key")]
```
Run `python manage.py makemigrations core`.

### 0.5.2 Decorator
Create `backend/apps/core/api/idempotency.py`:
```python
"""
@idempotent() for POST handlers. Usage on a ViewSet:

    @idempotent()
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
"""

import functools
import hashlib
import json
import uuid

from django.core.serializers.json import DjangoJSONEncoder
from django.db import IntegrityError, transaction
from rest_framework.response import Response

from apps.core.models import IdempotencyRecord

from .errors import ConflictError, DomainError

HEADER = "Idempotency-Key"


def _request_hash(request) -> str:
    payload = json.dumps(request.data, sort_keys=True, cls=DjangoJSONEncoder, default=str)
    return hashlib.sha256(f"{request.method}:{request.path}:{payload}".encode()).hexdigest()


def idempotent(required: bool = True):
    def decorator(handler):
        @functools.wraps(handler)
        def wrapper(self, request, *args, **kwargs):
            raw = request.headers.get(HEADER)
            if not raw:
                if required:
                    raise DomainError("Idempotency-Key header is required.", code="idempotency.key_required", status=400)
                return handler(self, request, *args, **kwargs)
            try:
                key = uuid.UUID(raw)
            except ValueError:
                raise DomainError(
                    "Idempotency-Key must be a UUID.", code="idempotency.key_invalid", status=400
                ) from None

            req_hash = _request_hash(request)
            try:
                with transaction.atomic():
                    record = IdempotencyRecord.objects.create(
                        user=request.user, key=key, method=request.method, path=request.path[:255],
                        request_hash=req_hash,
                    )
            except IntegrityError:
                record = IdempotencyRecord.objects.get(user=request.user, key=key)
                if record.request_hash != req_hash:
                    raise DomainError(
                        "This Idempotency-Key was already used for a different request.",
                        code="idempotency.key_reused",
                        status=422,
                    ) from None
                if record.status_code is None:
                    raise ConflictError("The original request is still processing.", code="idempotency.in_progress") from None
                replay = Response(record.response_body, status=record.status_code)
                replay["Idempotent-Replayed"] = "true"
                return replay

            try:
                response = handler(self, request, *args, **kwargs)
            except Exception:
                record.delete()  # failed requests may be retried with the same key
                raise
            if 200 <= response.status_code < 300:
                record.status_code = response.status_code
                record.response_body = json.loads(json.dumps(response.data, cls=DjangoJSONEncoder))
                record.save(update_fields=["status_code", "response_body"])
            else:
                record.delete()
            return response

        return wrapper

    return decorator
```

### 0.5.3 Optimistic concurrency
Create `backend/apps/core/api/concurrency.py`:
```python
"""If-Match version checks (docs/api-conventions.md 'Concurrency')."""

from django.db import transaction

from .errors import ConflictError, DomainError


def expected_version(request) -> int:
    raw = request.headers.get("If-Match")
    if raw is None:
        raise DomainError(
            "Send If-Match with the version you loaded.", code="concurrency.if_match_required", status=428
        )
    value = raw.strip()
    if value.startswith("W/"):
        value = value[2:]
    try:
        return int(value.strip('"'))
    except ValueError:
        raise DomainError("If-Match must be an integer version.", code="concurrency.if_match_invalid", status=400) from None


def save_with_version(request, serializer, **extra):
    """Save serializer.instance only if its stored version equals If-Match; bump version by one."""
    expected = expected_version(request)
    instance = serializer.instance
    with transaction.atomic():
        current = type(instance)._base_manager.select_for_update().only("version").get(pk=instance.pk)
        if current.version != expected:
            raise ConflictError(
                "Someone else changed this record. Reload and try again.", code="concurrency.version_mismatch"
            )
        return serializer.save(version=expected + 1, **extra)


class VersionedUpdateMixin:
    """For ModelViewSets of models that have a `version` field."""

    def perform_update(self, serializer):
        save_with_version(self.request, serializer)
```

### 0.5.4 Apply to onboarding
In `apps/tenancy/views.py`, decorate `OnboardShopView.post` with `@idempotent(required=False)`, so a double tap on "Create my shop" cannot create two shops when the client sends a key.

### 0.5.5 Housekeeping command
Create `backend/apps/core/management/__init__.py`, `backend/apps/core/management/commands/__init__.py` and `backend/apps/core/management/commands/purge_idempotency_records.py`:
```python
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.core.models import IdempotencyRecord


class Command(BaseCommand):
    help = "Delete idempotency records older than 48 hours."

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(hours=48)
        deleted, _ = IdempotencyRecord.objects.filter(created_at__lt=cutoff).delete()
        self.stdout.write(f"Deleted {deleted} idempotency records")
```

### 0.5.6 Error codes
Add to `docs/error-codes.md`: `idempotency.key_required` 400, `idempotency.key_invalid` 400, `idempotency.key_reused` 422, `idempotency.in_progress` 409, `concurrency.if_match_required` 428, `concurrency.if_match_invalid` 400, `concurrency.version_mismatch` 409.

### 0.5.7 Tests
Create `backend/apps/core/tests/test_idempotency.py`:
```python
import uuid

import pytest

from apps.tenancy.models import Shop

pytestmark = pytest.mark.django_db
BODY = {"shop_name": "Idem Shop", "shop_type": "mobile"}


def test_same_key_returns_same_shop(client_for, world):
    c = client_for(world.owner_a)
    key = str(uuid.uuid4())
    r1 = c.post("/api/v1/tenancy/onboard/", BODY, format="json", HTTP_IDEMPOTENCY_KEY=key)
    r2 = c.post("/api/v1/tenancy/onboard/", BODY, format="json", HTTP_IDEMPOTENCY_KEY=key)
    assert r1.status_code == r2.status_code == 201
    assert r1.json() == r2.json()
    assert r2["Idempotent-Replayed"] == "true"
    assert Shop.objects.filter(name="Idem Shop").count() == 1


def test_same_key_different_body_rejected(client_for, world):
    c = client_for(world.owner_a)
    key = str(uuid.uuid4())
    c.post("/api/v1/tenancy/onboard/", BODY, format="json", HTTP_IDEMPOTENCY_KEY=key)
    r = c.post("/api/v1/tenancy/onboard/", {**BODY, "shop_name": "Other"}, format="json", HTTP_IDEMPOTENCY_KEY=key)
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "idempotency.key_reused"


def test_failed_request_can_be_retried_with_same_key(client_for, world):
    c = client_for(world.owner_a)
    key = str(uuid.uuid4())
    assert c.post("/api/v1/tenancy/onboard/", {}, format="json", HTTP_IDEMPOTENCY_KEY=key).status_code == 400
    assert c.post("/api/v1/tenancy/onboard/", {}, format="json", HTTP_IDEMPOTENCY_KEY=key).status_code == 400


def test_bad_key_format(client_for, world):
    r = client_for(world.owner_a).post("/api/v1/tenancy/onboard/", BODY, format="json", HTTP_IDEMPOTENCY_KEY="nope")
    assert r.json()["error"]["code"] == "idempotency.key_invalid"
```
Create `backend/apps/core/tests/test_concurrency.py`:
```python
import pytest
from rest_framework.test import APIRequestFactory

from apps.core.api.concurrency import expected_version
from apps.core.api.errors import DomainError


@pytest.mark.parametrize(("header", "value"), [("3", 3), ('"3"', 3), ('W/"7"', 7)])
def test_if_match_parsing(header, value):
    request = APIRequestFactory().patch("/", HTTP_IF_MATCH=header)
    assert expected_version(request) == value


def test_if_match_required():
    with pytest.raises(DomainError) as exc:
        expected_version(APIRequestFactory().patch("/"))
    assert exc.value.status_code == 428
```
The end-to-end `409` test is written in 0.7 (`PATCH /shops/current/`).

### Verify
```bash
cd backend && pytest && ruff check . && ruff format --check . && python manage.py makemigrations --check --dry-run
```
**Done when:** a replayed onboarding request returns the same body and creates one shop.

---

## 0.6 Authentication hardening

**Depends on:** 0.5 · **Effort:** 1.5–2 days · **Fixes:** audit items 5–11
**Read first:** everything in `backend/apps/accounts/`, SimpleJWT settings in `base.py`

### 0.6.1 Phone helpers (shared by every app)
Create `backend/apps/core/phone.py`:
```python
import re

E164 = re.compile(r"^\+[1-9]\d{7,14}$")


def normalize_phone(value: str) -> str:
    """'98765 43210' -> '+919876543210'. Raises ValueError for anything that is not E.164 afterwards."""
    cleaned = re.sub(r"[\s\-()]", "", value or "")
    if cleaned.startswith("00"):
        cleaned = "+" + cleaned[2:]
    if not cleaned.startswith("+"):
        if len(cleaned) == 11 and cleaned.startswith("0"):
            cleaned = cleaned[1:]
        cleaned = f"+91{cleaned}" if len(cleaned) == 10 else f"+{cleaned}"
    if not E164.match(cleaned):
        raise ValueError("Enter a valid phone number, for example +919876543210.")
    return cleaned


def mask_phone(phone: str | None) -> str:
    """'+919876543210' -> '+91XXXXXX3210' (docs/api-conventions.md)."""
    if not phone:
        return ""
    if len(phone) <= 7:
        return "X" * len(phone)
    return phone[:3] + "X" * (len(phone) - 7) + phone[-4:]
```
In `apps/accounts/serializers.py`, delete `PHONE_REGEX` and the old `normalize_phone`, and add:
```python
from apps.core.phone import normalize_phone as _normalize


def normalize_phone(value: str) -> str:
    try:
        return _normalize(value)
    except ValueError as err:
        raise serializers.ValidationError(str(err)) from err
```
(`apps/tenancy/serializers.py` keeps importing `normalize_phone` from here.)

### 0.6.2 SMS provider abstraction
Create `backend/apps/core/sms.py`:
```python
"""SMS providers. Production uses a DLT-registered provider (1.19). Console provider never prints codes outside DEBUG."""

import logging
from typing import Protocol

from django.conf import settings
from django.utils.module_loading import import_string

from apps.core.phone import mask_phone

logger = logging.getLogger("fixpro.sms")


class SmsProvider(Protocol):
    def send_otp(self, *, phone: str, code: str) -> None: ...

    def send_text(self, *, phone: str, body: str, template_id: str | None = None) -> str: ...


class ConsoleSmsProvider:
    def send_otp(self, *, phone: str, code: str) -> None:
        if settings.DEBUG:
            logger.warning("[DEV SMS] OTP for %s is %s", phone, code)
        else:
            logger.info("[console sms] OTP generated for %s (code hidden outside DEBUG)", mask_phone(phone))

    def send_text(self, *, phone: str, body: str, template_id: str | None = None) -> str:
        if settings.DEBUG:
            logger.warning("[DEV SMS] to %s: %s", phone, body)
        else:
            logger.info("[console sms] message to %s (body hidden)", mask_phone(phone))
        return "console"


def get_sms_provider() -> SmsProvider:
    return import_string(settings.SMS_PROVIDER)()
```
Add to `backend/config/settings/base.py`:
```python
SMS_PROVIDER = os.environ.get("SMS_PROVIDER", "apps.core.sms.ConsoleSmsProvider")


def _parse_otp_test_numbers(raw: str) -> dict[str, str]:
    """'+919999999999:123456,+919888888888:654321' -> {phone: code}. Reviewer/dev accounts only."""
    pairs = (item.split(":", 1) for item in raw.split(",") if ":" in item)
    return {phone.strip(): code.strip() for phone, code in pairs}


OTP_TEST_NUMBERS = _parse_otp_test_numbers(os.environ.get("OTP_TEST_NUMBERS", ""))
```
In `dev.py` add `OTP_TEST_NUMBERS = OTP_TEST_NUMBERS or {"+919999999999": "123456"}  # noqa: F405`.
In `test.py` add `OTP_TEST_NUMBERS = {"+919999999999": "123456"}`.
In production the variable stays empty unless the store-reviewer account is deliberately configured (1.24).

### 0.6.3 Rewrite `backend/apps/accounts/services.py`
Replace the whole file:
```python
"""OTP and session lifecycle."""

import hashlib
import hmac
import logging
import secrets
import uuid
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import OTPChallenge, User, UserDevice
from apps.core.api.errors import DomainError
from apps.core.sms import get_sms_provider

logger = logging.getLogger(__name__)

OTP_EXPIRY = timedelta(minutes=5)
OTP_COOLDOWN_SECONDS = 30
MAX_CHALLENGES_PER_HOUR = 6
LOGIN = OTPChallenge.PurposeChoices.LOGIN


def hash_otp(phone: str, code: str) -> str:
    """Keyed hash: without SECRET_KEY a leaked table cannot be brute-forced offline."""
    return hmac.new(settings.SECRET_KEY.encode(), f"otp:{phone}:{code}".encode(), hashlib.sha256).hexdigest()


def send_otp(*, phone: str, purpose: str = LOGIN, device_id: str | None = None, ip: str | None = None) -> OTPChallenge:
    now = timezone.now()
    fixed_code = settings.OTP_TEST_NUMBERS.get(phone)
    with transaction.atomic():
        latest = OTPChallenge.objects.select_for_update().filter(phone=phone).order_by("-created_at").first()
        if latest is not None:
            elapsed = (now - latest.created_at).total_seconds()
            if elapsed < OTP_COOLDOWN_SECONDS:
                wait = int(OTP_COOLDOWN_SECONDS - elapsed) + 1
                raise DomainError(
                    f"Please wait {wait} seconds before requesting a new OTP.", code="otp.cooldown", status=429, wait=wait
                )
        sent_last_hour = OTPChallenge.objects.filter(phone=phone, created_at__gte=now - timedelta(hours=1)).count()
        if sent_last_hour >= MAX_CHALLENGES_PER_HOUR:
            raise DomainError("Too many OTP requests. Try again later.", code="otp.too_many_requests", status=429, wait=3600)
        code = fixed_code or f"{secrets.randbelow(1_000_000):06d}"
        challenge = OTPChallenge.objects.create(
            phone=phone, code_hash=hash_otp(phone, code), purpose=purpose,
            expires_at=now + OTP_EXPIRY, ip=ip, device_id=device_id,
        )
    if fixed_code is None:
        get_sms_provider().send_otp(phone=phone, code=code)
    return challenge


def _check_code(*, phone: str, code: str, purpose: str) -> None:
    """Raises DomainError unless the code matches the newest open challenge. Counts failed attempts."""
    with transaction.atomic():
        challenge = (
            OTPChallenge.objects.select_for_update()
            .filter(phone=phone, purpose=purpose, consumed_at__isnull=True)
            .order_by("-created_at")
            .first()
        )
        if challenge is None:
            raise DomainError("Request a new OTP.", code="otp.not_found", status=400)
        if challenge.is_expired:
            raise DomainError("This OTP has expired. Request a new one.", code="otp.expired", status=400)
        if challenge.is_blocked:
            raise DomainError("Too many wrong attempts. Request a new OTP.", code="otp.locked", status=400)
        matched = hmac.compare_digest(challenge.code_hash, hash_otp(phone, code))
        if matched:
            challenge.consumed_at = timezone.now()
            challenge.save(update_fields=["consumed_at"])
        else:
            challenge.attempts += 1
            challenge.save(update_fields=["attempts"])
    # Raise only after the transaction commits, so the failed attempt is stored.
    if not matched:
        remaining = max(challenge.max_attempts - challenge.attempts, 0)
        if remaining == 0:
            raise DomainError("Too many wrong attempts. Request a new OTP.", code="otp.locked", status=400)
        raise DomainError(
            "Incorrect OTP.", code="otp.invalid", status=400, fields={"code": [f"{remaining} attempt(s) left"]}
        )


def issue_tokens(user: User, device: UserDevice) -> dict:
    refresh = RefreshToken.for_user(user)
    refresh["did"] = device.device_id
    refresh["fam"] = str(device.refresh_family)
    return {"access": str(refresh.access_token), "refresh": str(refresh), "token_type": "Bearer"}


def verify_otp_and_login(
    *, phone: str, code: str, device_id: str, platform: str, app_version: str = "", purpose: str = LOGIN
) -> tuple[User, UserDevice, dict, bool]:
    """Returns (user, device, tokens, is_new_device)."""
    _check_code(phone=phone, code=code, purpose=purpose)
    now = timezone.now()
    with transaction.atomic():
        user = User.objects.select_for_update().filter(phone=phone).first()
        if user is None:
            user = User.objects.create_user(phone=phone)
        elif user.deleted_at is not None or not user.is_active:
            raise DomainError("This account is disabled.", code="auth.account_disabled", status=403)
        user.last_login_at = now
        user.save(update_fields=["last_login_at"])

        device, created = UserDevice.objects.select_for_update().get_or_create(
            user=user, device_id=device_id, defaults={"platform": platform}
        )
        device.platform = platform
        device.app_version = app_version or device.app_version
        device.last_seen_at = now
        device.revoked_at = None
        device.refresh_family = uuid.uuid4()  # new login = new token family
        device.save()
    return user, device, issue_tokens(user, device), created


def revoke_device(device: UserDevice) -> None:
    device.revoked_at = timezone.now()
    device.refresh_family = uuid.uuid4()
    device.save(update_fields=["revoked_at", "refresh_family"])


def logout_everywhere(user: User) -> None:
    for device in UserDevice.objects.filter(user=user, revoked_at__isnull=True):
        revoke_device(device)
    for token in OutstandingToken.objects.filter(user=user, blacklistedtoken__isnull=True):
        BlacklistedToken.objects.get_or_create(token=token)


def purge_old_otp_challenges(days: int = 7) -> int:
    deleted, _ = OTPChallenge.objects.filter(created_at__lt=timezone.now() - timedelta(days=days)).delete()
    return deleted
```

### 0.6.4 Device-aware tokens
Create `backend/apps/accounts/authentication.py`:
```python
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken

from apps.accounts.models import UserDevice


class DeviceJWTAuthentication(JWTAuthentication):
    """Rejects access tokens whose device was logged out or whose token family was rotated."""

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        alive = UserDevice.objects.filter(
            user=user,
            device_id=validated_token.get("did"),
            refresh_family=validated_token.get("fam"),
            revoked_at__isnull=True,
        ).exists()
        if not alive:
            raise InvalidToken("Session has been revoked.")
        return user
```
Create `backend/apps/accounts/tokens.py`:
```python
import logging
import uuid

from django.utils import timezone
from rest_framework_simplejwt.exceptions import InvalidToken, TokenBackendError, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.state import token_backend
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import UserDevice

logger = logging.getLogger(__name__)


def _revoke_family_if_reused(raw: str) -> None:
    """A correctly signed, unexpired but blacklisted refresh token means it was stolen or replayed."""
    try:
        payload = token_backend.decode(raw, verify=True)
    except TokenBackendError:
        return
    if BlacklistedToken.objects.filter(token__jti=payload.get("jti")).exists():
        logger.warning("Refresh token reuse detected for user %s; revoking device", payload.get("user_id"))
        UserDevice.objects.filter(user_id=payload.get("user_id"), device_id=payload.get("did")).update(
            refresh_family=uuid.uuid4(), revoked_at=timezone.now()
        )


class DeviceAwareTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        raw = attrs["refresh"]
        try:
            token = RefreshToken(raw)  # checks signature, expiry and blacklist
        except TokenError as err:
            _revoke_family_if_reused(raw)
            raise InvalidToken(str(err)) from err
        device = UserDevice.objects.filter(user_id=token.get("user_id"), device_id=token.get("did")).first()
        if device is None or device.revoked_at is not None or str(device.refresh_family) != token.get("fam"):
            raise InvalidToken("Session has been revoked.")
        data = super().validate(attrs)  # rotates and blacklists the old refresh token
        device.last_seen_at = timezone.now()
        device.save(update_fields=["last_seen_at"])
        return data
```
In `base.py`:
- set `"DEFAULT_AUTHENTICATION_CLASSES": ("apps.accounts.authentication.DeviceJWTAuthentication",)`
- in `SIMPLE_JWT`, set `"ACCESS_TOKEN_LIFETIME": timedelta(minutes=15)` and add `"UPDATE_LAST_LOGIN": False` (the OTP service records the login).

Important for the client (0.11): refresh must be **single-flight**. Two parallel refreshes with the same token look like reuse and log the device out.

### 0.6.5 Serializers
In `apps/accounts/serializers.py`:
1. `SendOTPSerializer`: keep `phone`, `device_id` (optional), `platform`.
2. `VerifyOTPSerializer`: make `device_id` **required** (`serializers.CharField(max_length=128)`). The client always sends one (0.11).
3. `UserSerializer`: add `"is_active"` to `read_only_fields`.
4. Add:
   ```python
   class ProfileUpdateSerializer(serializers.ModelSerializer):
       class Meta:
           model = User
           fields = ("name", "email", "preferred_locale")

       def validate_name(self, value):
           value = value.strip()
           if not value:
               raise serializers.ValidationError("Name is required.")
           return value


   class MyShopSerializer(serializers.Serializer):
       """One entry per active membership. Drives the shop switcher and client-side permission checks."""

       membership_id = serializers.UUIDField(source="id")
       shop_id = serializers.UUIDField(source="shop.id")
       shop_name = serializers.CharField(source="shop.name")
       shop_type = serializers.CharField(source="shop.shop_type")
       city = serializers.CharField(source="shop.city")
       role_id = serializers.UUIDField(source="role.id")
       role_name = serializers.CharField(source="role.name")
       permissions = serializers.ListField(source="role.permissions", child=serializers.CharField())


   class DeviceSerializer(serializers.ModelSerializer):
       is_current = serializers.SerializerMethodField()

       class Meta:
           model = UserDevice
           fields = ("id", "device_id", "platform", "app_version", "last_seen_at", "is_current")

       def get_is_current(self, obj):
           return obj.device_id == self.context.get("current_device_id")
   ```
5. Add a helper used by two views:
   ```python
   def my_shops(user):
       from apps.tenancy.models import Membership

       memberships = (
           Membership.objects.filter(user=user, status=Membership.StatusChoices.ACTIVE, shop__deleted_at__isnull=True)
           .select_related("shop", "role")
           .order_by("shop__name")
       )
       return MyShopSerializer(memberships, many=True).data
   ```

### 0.6.6 Views and URLs
Create `backend/apps/core/net.py`:
```python
from django.conf import settings


def get_client_ip(request) -> str | None:
    """Same rule DRF throttling uses: trust NUM_PROXIES entries of X-Forwarded-For."""
    num_proxies = settings.REST_FRAMEWORK.get("NUM_PROXIES") or 0
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if num_proxies and forwarded:
        addresses = [a.strip() for a in forwarded.split(",")]
        return addresses[-min(num_proxies, len(addresses))]
    return request.META.get("REMOTE_ADDR")
```
Replace `backend/apps/accounts/views.py`:
```python
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.models import UserDevice
from apps.accounts.serializers import (
    DeviceSerializer,
    ProfileUpdateSerializer,
    SendOTPSerializer,
    UserSerializer,
    VerifyOTPSerializer,
    my_shops,
)
from apps.accounts.services import logout_everywhere, revoke_device, send_otp, verify_otp_and_login
from apps.accounts.services import OTP_COOLDOWN_SECONDS
from apps.accounts.tokens import DeviceAwareTokenRefreshSerializer
from apps.core.api.errors import NotFoundError
from apps.core.net import get_client_ip


class SendOTPView(APIView):
    permission_classes = (permissions.AllowAny,)
    authentication_classes = ()
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "otp_send"

    @extend_schema(request=SendOTPSerializer, summary="Request a login OTP")
    def post(self, request):
        s = SendOTPSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        challenge = send_otp(
            phone=s.validated_data["phone"], device_id=s.validated_data.get("device_id"), ip=get_client_ip(request)
        )
        return Response({"cooldown_seconds": OTP_COOLDOWN_SECONDS, "expires_at": challenge.expires_at})


class VerifyOTPView(APIView):
    permission_classes = (permissions.AllowAny,)
    authentication_classes = ()
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "otp_verify"

    @extend_schema(request=VerifyOTPSerializer, summary="Verify OTP and sign in")
    def post(self, request):
        s = VerifyOTPSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        user, device, tokens, _is_new_device = verify_otp_and_login(
            phone=d["phone"], code=d["code"], device_id=d["device_id"],
            platform=d["platform"], app_version=d.get("app_version", ""),
        )
        return Response({"user": UserSerializer(user).data, "tokens": tokens, "shops": my_shops(user)})


class RefreshView(TokenRefreshView):
    serializer_class = DeviceAwareTokenRefreshSerializer
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "token_refresh"


class MeView(APIView):
    @extend_schema(summary="Current user and their shops")
    def get(self, request):
        return Response({"user": UserSerializer(request.user).data, "shops": my_shops(request.user)})

    @extend_schema(request=ProfileUpdateSerializer, summary="Update profile")
    def patch(self, request):
        s = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response({"user": UserSerializer(request.user).data, "shops": my_shops(request.user)})


def _current_device(request):
    token = request.auth
    return UserDevice.objects.filter(user=request.user, device_id=token.get("did") if token else None).first()


class LogoutView(APIView):
    def post(self, request):
        device = _current_device(request)
        if device is not None:
            revoke_device(device)
        return Response(status=status.HTTP_204_NO_CONTENT)


class LogoutAllView(APIView):
    def post(self, request):
        logout_everywhere(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class DeviceListView(APIView):
    def get(self, request):
        devices = UserDevice.objects.filter(user=request.user, revoked_at__isnull=True).order_by("-last_seen_at")
        current = request.auth.get("did") if request.auth else None
        return Response(DeviceSerializer(devices, many=True, context={"current_device_id": current}).data)


class DeviceRevokeView(APIView):
    def delete(self, request, pk):
        device = UserDevice.objects.filter(user=request.user, pk=pk, revoked_at__isnull=True).first()
        if device is None:
            raise NotFoundError()
        revoke_device(device)
        return Response(status=status.HTTP_204_NO_CONTENT)
```
Replace `backend/apps/accounts/urls.py`:
```python
from django.urls import path

from apps.accounts import views

urlpatterns = [
    path("auth/otp/send/", views.SendOTPView.as_view(), name="auth-otp-send"),
    path("auth/otp/verify/", views.VerifyOTPView.as_view(), name="auth-otp-verify"),
    path("auth/token/refresh/", views.RefreshView.as_view(), name="auth-token-refresh"),
    path("auth/me/", views.MeView.as_view(), name="auth-me"),
    path("auth/logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("auth/logout-all/", views.LogoutAllView.as_view(), name="auth-logout-all"),
    path("auth/devices/", views.DeviceListView.as_view(), name="auth-devices"),
    path("auth/devices/<uuid:pk>/", views.DeviceRevokeView.as_view(), name="auth-device-revoke"),
]
```
Create the management command `backend/apps/accounts/management/commands/purge_otp_challenges.py` (with the `__init__.py` files). It calls `purge_old_otp_challenges()` and prints the count.

### 0.6.7 Error codes
Add to `docs/error-codes.md`: `otp.cooldown` 429, `otp.too_many_requests` 429, `otp.not_found` 400, `otp.expired` 400, `otp.locked` 400, `otp.invalid` 400, `auth.account_disabled` 403.

### 0.6.8 Tests
Replace `backend/apps/accounts/tests/test_auth.py`. It must contain at least these tests. Use `TEST = "+919999999999"` (fixed code `123456` from test settings) unless the test needs a random code.

| # | Test | Assert |
|---|---|---|
| 1 | send OTP for a normal number | 200; a challenge exists; `code_hash` ≠ any plain 6-digit string |
| 2 | send twice quickly | second is 429, `otp.cooldown`, `Retry-After` header present |
| 3 | 7 sends in one hour (move `created_at` back 31 s between sends with `.update()`) | 7th is 429, `otp.too_many_requests` |
| 4 | verify with the fixed test code | 200; `data.tokens.access` and `refresh`; `data.shops == []` |
| 5 | verify wrong code 3 times, then the right code | the 3rd attempt returns `otp.locked`; the right code afterwards also returns `otp.locked` |
| 6 | attempts are persisted | after one wrong attempt, `challenge.attempts == 1` in the DB |
| 7 | expired challenge | `otp.expired` |
| 8 | inactive user | 403, `auth.account_disabled` |
| 9 | `PATCH /auth/me/ {"is_active": false, "name": "X"}` | 200, name changed, `is_active` still `True` |
| 10 | refresh rotates | new refresh works once; reusing the **old** refresh returns 401 **and** the device is revoked, so the new refresh also fails |
| 11 | logout | after `POST /auth/logout/`, the old access token returns 401 on `/auth/me/` |
| 12 | logout-all | access tokens of two devices both return 401 |
| 13 | `GET /auth/devices/` | lists the current device with `is_current = true` |
| 14 | OTP never logged outside DEBUG | `caplog` at INFO while sending an OTP for a random number with `settings.DEBUG = False`: no record contains the 6-digit code |
| 15 | `mask_phone("+919876543210") == "+91XXXXXX3210"`; `normalize_phone("098765 43210") == "+919876543210"` | — |

Test 10 sketch (real tokens, not `force_authenticate`):
```python
def _login(client, device="dev-1"):
    client.post("/api/v1/auth/otp/send/", {"phone": TEST}, format="json")
    r = client.post(
        "/api/v1/auth/otp/verify/",
        {"phone": TEST, "code": "123456", "device_id": device, "platform": "android"},
        format="json",
    )
    return r.json()["data"]["tokens"]


def test_refresh_reuse_revokes_device(db):
    client = APIClient()
    tokens = _login(client)
    r1 = client.post("/api/v1/auth/token/refresh/", {"refresh": tokens["refresh"]}, format="json")
    assert r1.status_code == 200
    new_refresh = r1.json()["data"]["refresh"]
    replay = client.post("/api/v1/auth/token/refresh/", {"refresh": tokens["refresh"]}, format="json")
    assert replay.status_code == 401
    assert client.post("/api/v1/auth/token/refresh/", {"refresh": new_refresh}, format="json").status_code == 401
```

### Verify
```bash
cd backend && pytest apps/accounts -q && pytest && ruff check . && ruff format --check .
grep -rn "print(" apps/ && echo "FAIL: remove print()" || echo "OK: no print()"
```
**Done when:** all 15 tests pass and no `print()` remains in `backend/apps/`.


---

## 0.7 Tenancy and permissions repair

**Depends on:** 0.6 · **Effort:** 2 days · **Fixes:** audit items 1, 3, 4, 13–15, 18–20
**Read first:** everything in `backend/apps/tenancy/`, `docs/02-database-schema.md` sections 4.2 and 8, `backend/apps/core/api/*`

### 0.7.1 Model changes
In `backend/apps/tenancy/models.py`:
1. `Shop`: add `version = models.PositiveIntegerField(default=1)`.
2. `Membership`: add this method:
   ```python
   def has_perm(self, code: str) -> bool:
       return self.status == self.StatusChoices.ACTIVE and code in (self.role.permissions or [])
   ```
3. `Membership.Meta`: delete `unique_together = ("user", "shop")` and add:
   ```python
   constraints = [
       models.UniqueConstraint(
           fields=["user", "shop"], condition=~models.Q(status="removed"), name="membership_uniq_live"
       ),
   ]
   ```
4. `Invite`: add `revoked_at = models.DateTimeField(null=True, blank=True)` (used in 0.16).

Run `python manage.py makemigrations tenancy` and read the migration. It must have exactly these four changes.

### 0.7.2 Shop context and permission classes
Create `backend/apps/tenancy/context.py`:
```python
import uuid

from apps.core.api.errors import DomainError, NotFoundError
from apps.tenancy.models import Membership, Organization


def resolve_shop_context(request) -> Membership:
    """Reads X-Shop-Id, loads the caller's ACTIVE membership, sets request.shop / request.membership.
    A shop the caller does not belong to is reported exactly like a missing shop (404)."""
    existing = getattr(request, "membership", None)
    if existing is not None:
        return existing
    raw = request.headers.get("X-Shop-Id")
    if not raw:
        raise DomainError("Header 'X-Shop-Id' is required.", code="shop.header_missing", status=400)
    try:
        shop_id = uuid.UUID(raw.strip())
    except ValueError:
        raise DomainError("Header 'X-Shop-Id' must be a UUID.", code="shop.header_invalid", status=400) from None
    membership = (
        Membership.objects.select_related("shop", "shop__organization", "role")
        .filter(
            user=request.user,
            shop_id=shop_id,
            status=Membership.StatusChoices.ACTIVE,
            shop__deleted_at__isnull=True,
            shop__organization__status=Organization.StatusChoices.ACTIVE,
        )
        .first()
    )
    if membership is None:
        raise NotFoundError("Shop not found.", code="shop.not_found")
    request.shop = membership.shop
    request.membership = membership
    return membership
```
Replace the DRF class at the bottom of `backend/apps/tenancy/permissions.py` (keep `PERMISSION_CODES` and `SYSTEM_ROLES`):
```python
ANY_MEMBER = "__any_member__"  # permission_map value: any active member of the shop


class IsShopMember(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        from apps.tenancy.context import resolve_shop_context

        resolve_shop_context(request)
        return True


class HasShopPermission(permissions.BasePermission):
    """Deny by default: the view must map the current action to a permission code."""

    message = "You do not have permission to do this."

    def has_permission(self, request, view):
        membership = getattr(request, "membership", None)
        code = view.get_required_permission()
        if membership is None or code is None:
            return False
        return code == ANY_MEMBER or membership.has_perm(code)
```
Remove the "Owner always passes" shortcut and the platform-admin bypass. Owners pass because the Owner role contains every code (0.7.4). Platform support uses Django admin, which is audited from 0.15.

Add `"audit.view": "View the shop audit log"` to `PERMISSION_CODES` (used in 0.15; Owner only).

### 0.7.3 Base views and the scoped PK field
Create `backend/apps/tenancy/viewsets.py`:
```python
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.api.concurrency import VersionedUpdateMixin
from apps.tenancy.permissions import HasShopPermission, IsShopMember


class ShopScopedMixin:
    """X-Shop-Id -> request.shop/membership, then permission_map[action] is required."""

    permission_classes = (IsAuthenticated, IsShopMember, HasShopPermission)
    permission_map: dict[str, str] = {}

    def get_required_permission(self) -> str | None:
        key = getattr(self, "action", None) or self.request.method.lower()
        return self.permission_map.get(key)

    @property
    def shop(self):
        return self.request.shop

    @property
    def membership(self):
        return self.request.membership


class ShopScopedViewSet(ShopScopedMixin, VersionedUpdateMixin, viewsets.ModelViewSet):
    """CRUD for ShopScopedModel subclasses. Queryset is ALWAYS filtered by the current shop."""

    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        if getattr(self, "swagger_fake_view", False):
            return qs.none()
        return qs.filter(shop=self.request.shop)

    def perform_create(self, serializer):
        serializer.save(shop=self.request.shop, created_by=self.request.user)

    def perform_destroy(self, instance):
        instance.soft_delete()


class ShopScopedAPIView(ShopScopedMixin, APIView):
    """For non-CRUD endpoints. permission_map is keyed by HTTP method: {"get": ..., "post": ...}."""
```
Create `backend/apps/core/api/fields.py`:
```python
from rest_framework import serializers


class ShopScopedPKField(serializers.PrimaryKeyRelatedField):
    """Accepts only objects of request.shop. Another shop's ID fails like a nonexistent ID."""

    def get_queryset(self):
        request = self.context.get("request")
        shop = getattr(request, "shop", None)
        queryset = super().get_queryset()
        return queryset.filter(shop=shop) if shop is not None else queryset.none()
```

### 0.7.4 Roles: seed on migrate, never in a GET
1. In `apps/tenancy/services.py`, `seed_system_roles()` stays. Delete the `seed_system_roles()` call inside `create_organization_and_shop()`.
2. Create `backend/apps/tenancy/signals.py`:
   ```python
   def sync_roles_after_migrate(sender, **kwargs):
       from apps.tenancy.services import seed_system_roles

       seed_system_roles()
   ```
3. In `backend/apps/tenancy/apps.py`, add:
   ```python
   def ready(self):
       from django.db.models.signals import post_migrate

       from apps.tenancy.signals import sync_roles_after_migrate

       post_migrate.connect(sync_roles_after_migrate, sender=self)
   ```
4. Create `backend/apps/tenancy/management/commands/seed_roles.py` (plus the `__init__.py` files) that calls `seed_system_roles()` and prints the role names. Restore the README line `python manage.py seed_roles  # optional; migrate already does it`.

### 0.7.5 Validators
Append to `backend/apps/core/validators.py`:
```python
GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
GSTIN_RE = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")
UPI_ID_RE = re.compile(r"^[A-Za-z0-9.\-_]{2,256}@[A-Za-z][A-Za-z0-9.\-]{1,63}$")

# GST state codes. TODO(verify) against the current GST portal list before Phase 1 invoicing.
GST_STATE_CODES = {
    "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
    "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
    "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
    "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
    "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "26": "Dadra and Nagar Haveli and Daman and Diu", "27": "Maharashtra", "29": "Karnataka", "30": "Goa",
    "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry",
    "35": "Andaman and Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh",
    "97": "Other Territory",
}


def gstin_check_char(first14: str) -> str:
    total = 0
    for i, ch in enumerate(first14):
        product = GSTIN_CHARS.index(ch) * (1 if i % 2 == 0 else 2)
        total += product // 36 + product % 36
    return GSTIN_CHARS[(36 - total % 36) % 36]


def validate_gstin(value: str) -> str:
    """Returns the upper-cased GSTIN or raises ValidationError."""
    gstin = (value or "").strip().upper()
    if not GSTIN_RE.match(gstin):
        raise ValidationError(_("GSTIN must be 15 characters, like 27AAPFU0939F1ZV."), code="gstin_format")
    if gstin[:2] not in GST_STATE_CODES:
        raise ValidationError(_("GSTIN starts with an unknown state code."), code="gstin_state")
    if gstin_check_char(gstin[:14]) != gstin[14]:
        raise ValidationError(_("GSTIN check character is wrong. Please re-check the number."), code="gstin_checksum")
    return gstin


def validate_state_code(value: str) -> None:
    if value and value not in GST_STATE_CODES:
        raise ValidationError(_("Unknown state code."), code="state_code")


def validate_upi_id(value: str) -> None:
    if value and not UPI_ID_RE.match(value):
        raise ValidationError(_("UPI ID looks wrong. Example: shopname@okaxis"), code="upi_id")
```
Test GSTINs: `27AAPFU0939F1ZV` (valid), `29ABCDE1234F1ZW` (valid), `29ABCDE1234F1Z5` (bad checksum; the current onboarding test uses it, so change it to `29ABCDE1234F1ZW`).

### 0.7.6 Serializers
In `apps/tenancy/serializers.py`:
1. Delete `OnboardShopSerializer` and the old `ShopSerializer`.
2. Add the shared shop validation and the serializers that use it:
   ```python
   from django.core.exceptions import ValidationError as DjangoValidationError

   from apps.core.validators import validate_gstin, validate_state_code, validate_upi_id

   SHOP_FIELDS = (
       "id", "organization_id", "name", "shop_type", "phone", "address_line1", "address_line2", "city",
       "pincode", "state_code", "timezone", "default_locale", "gst_enabled", "gstin", "registration_type",
       "upi_id", "invoice_prefix", "round_off_enabled", "lock_order_after_delivery",
       "engineers_see_assigned_only", "mask_phone_for_engineers", "default_warranty_days",
       "tracking_enabled", "tracking_expiry_days", "version", "created_at", "updated_at",
   )


   def _django_to_drf(func, value, field):
       try:
           return func(value)
       except DjangoValidationError as err:
           raise serializers.ValidationError({field: err.messages}) from err


   class ShopSerializer(serializers.ModelSerializer):
       class Meta:
           model = Shop
           fields = SHOP_FIELDS
           read_only_fields = ("id", "organization_id", "version", "created_at", "updated_at")

       def validate_phone(self, value):
           return normalize_phone(value) if value else value

       def validate(self, attrs):
           def current(name, default=None):
               return attrs.get(name, getattr(self.instance, name, default))

           gst_enabled = current("gst_enabled", False)
           gstin = current("gstin")
           state_code = current("state_code", "")
           _django_to_drf(validate_state_code, state_code, "state_code")
           _django_to_drf(validate_upi_id, current("upi_id"), "upi_id")
           if gst_enabled:
               if not gstin:
                   raise serializers.ValidationError({"gstin": ["GSTIN is required when GST is enabled."]})
               gstin = _django_to_drf(validate_gstin, gstin, "gstin")
               attrs["gstin"] = gstin
               if state_code and state_code != gstin[:2]:
                   raise serializers.ValidationError({"state_code": ["State code must match the GSTIN."]})
               attrs["state_code"] = gstin[:2]
               if current("registration_type", "unregistered") == "unregistered":
                   attrs["registration_type"] = Shop.RegistrationTypeChoices.REGULAR
           else:
               attrs["registration_type"] = Shop.RegistrationTypeChoices.UNREGISTERED
           return attrs


   class OnboardShopSerializer(ShopSerializer):
       organization_name = serializers.CharField(max_length=150, required=False, allow_blank=True, write_only=True)

       class Meta(ShopSerializer.Meta):
           fields = (*SHOP_FIELDS, "organization_name")
           extra_kwargs = {"name": {"required": True}, "phone": {"required": False}}
   ```
   The onboarding request field changes from `shop_name` to `name`. Update the onboarding test, the idempotency tests from 0.5 (`BODY`) and `test_validation_shape` from 0.4, which should now assert `"name"` in fields.
3. `MembershipSerializer`: make **all** fields read-only. Writes go through actions.
4. Add:
   ```python
   class ChangeRoleSerializer(serializers.Serializer):
       role_id = serializers.UUIDField()
   ```

### 0.7.7 Staff service
Create `backend/apps/tenancy/staff.py`:
```python
"""Rules for changing memberships. Views call these; never edit Membership.status/role directly."""

from django.db import transaction
from django.db.models import Q

from apps.core.api.errors import DomainError
from apps.tenancy.models import Membership, Role

PRIVILEGED_CODES = {"staff.manage", "roles.manage"}


def assignable_roles(shop):
    return Role.objects.filter(Q(organization__isnull=True) | Q(organization=shop.organization))


def _is_privileged(role: Role) -> bool:
    return bool(PRIVILEGED_CODES & set(role.permissions or []))


def _is_owner_role(role: Role) -> bool:
    return role.is_system and role.organization_id is None and role.name == "Owner"


def guard_target(actor: Membership, target: Membership) -> None:
    if target.user_id == actor.user_id:
        raise DomainError("You cannot change your own membership.", code="staff.cannot_modify_self", status=422)
    if target.user_id == target.shop.organization.owner_user_id:
        raise DomainError("The shop owner cannot be changed.", code="staff.cannot_modify_owner", status=422)
    if _is_privileged(target.role) and not actor.has_perm("roles.manage"):
        raise DomainError("Only the owner can change this member.", code="staff.insufficient_rank", status=403)


def validate_role_choice(actor: Membership, role: Role) -> None:
    if not assignable_roles(actor.shop).filter(pk=role.pk).exists():
        raise DomainError("Unknown role.", code="staff.role_invalid", status=400)
    if _is_owner_role(role):
        raise DomainError("The Owner role cannot be assigned.", code="staff.role_not_assignable", status=422)
    if _is_privileged(role) and not actor.has_perm("roles.manage"):
        raise DomainError("Only the owner can grant this role.", code="staff.insufficient_rank", status=403)


@transaction.atomic
def change_role(*, actor: Membership, target: Membership, role: Role) -> Membership:
    guard_target(actor, target)
    validate_role_choice(actor, role)
    target.role = role
    target.save(update_fields=["role", "updated_at"])
    return target


ALLOWED_STATUS_CHANGES = {
    Membership.StatusChoices.ACTIVE: {Membership.StatusChoices.SUSPENDED, Membership.StatusChoices.REMOVED},
    Membership.StatusChoices.SUSPENDED: {Membership.StatusChoices.ACTIVE, Membership.StatusChoices.REMOVED},
    Membership.StatusChoices.INVITED: {Membership.StatusChoices.REMOVED},
}


@transaction.atomic
def set_status(*, actor: Membership, target: Membership, status: str) -> Membership:
    guard_target(actor, target)
    if status not in ALLOWED_STATUS_CHANGES.get(target.status, set()):
        raise DomainError("This status change is not allowed.", code="staff.invalid_status_change", status=409)
    target.status = status
    target.save(update_fields=["status", "updated_at"])
    return target
```

### 0.7.8 Views
Replace `backend/apps/tenancy/views.py`:
```python
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers import my_shops
from apps.core.api.concurrency import save_with_version
from apps.core.api.errors import DomainError
from apps.core.api.idempotency import idempotent
from apps.tenancy import staff as staff_service
from apps.tenancy.models import Membership, Role
from apps.tenancy.permissions import ANY_MEMBER
from apps.tenancy.serializers import (
    ChangeRoleSerializer,
    MembershipSerializer,
    OnboardShopSerializer,
    RoleSerializer,
    ShopSerializer,
)
from apps.tenancy.services import create_organization_and_shop
from apps.tenancy.viewsets import ShopScopedAPIView, ShopScopedMixin


class OnboardShopView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(request=OnboardShopSerializer, responses={201: ShopSerializer})
    @idempotent(required=False)
    def post(self, request):
        s = OnboardShopSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = dict(s.validated_data)
        org_name = data.pop("organization_name", "") or data["name"]
        _org, shop, _membership = create_organization_and_shop(
            owner_user=request.user, org_name=org_name, shop_name=data.pop("name"),
            shop_type=data.pop("shop_type", "mobile"), phone=data.pop("phone", ""), **data,
        )
        return Response({"shop": ShopSerializer(shop).data, "shops": my_shops(request.user)}, status=201)


class MyShopsView(APIView):
    """GET /shops/: every shop the caller is an active member of. No X-Shop-Id needed."""

    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        return Response(my_shops(request.user))


class CurrentShopView(ShopScopedAPIView):
    """GET/PATCH /shops/current/ (the shop named in X-Shop-Id)."""

    permission_map = {"get": ANY_MEMBER, "patch": "shop.settings"}

    def get(self, request):
        return Response(ShopSerializer(request.shop).data)

    @extend_schema(request=ShopSerializer, responses=ShopSerializer)
    def patch(self, request):
        s = ShopSerializer(request.shop, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        shop = save_with_version(request, s)
        return Response(ShopSerializer(shop).data)


class RoleViewSet(ShopScopedMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = RoleSerializer
    permission_map = {"list": "staff.view", "retrieve": "staff.view"}

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Role.objects.none()
        return staff_service.assignable_roles(self.request.shop).order_by("name")


class StaffViewSet(ShopScopedMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = MembershipSerializer
    permission_map = {
        "list": "staff.view",
        "retrieve": "staff.view",
        "change_role": "staff.manage",
        "suspend": "staff.manage",
        "reactivate": "staff.manage",
        "remove": "staff.manage",
    }

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Membership.objects.none()
        return (
            Membership.objects.filter(shop=self.request.shop)
            .exclude(status=Membership.StatusChoices.REMOVED)
            .select_related("user", "role", "shop__organization")
            .order_by("-joined_at")
        )

    @extend_schema(request=ChangeRoleSerializer, responses=MembershipSerializer)
    @action(detail=True, methods=["post"], url_path="role")
    def change_role(self, request, pk=None):
        target = self.get_object()
        s = ChangeRoleSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        role = staff_service.assignable_roles(request.shop).filter(pk=s.validated_data["role_id"]).first()
        if role is None:
            raise DomainError("Unknown role.", code="staff.role_invalid", status=400)
        staff_service.change_role(actor=request.membership, target=target, role=role)
        return Response(MembershipSerializer(target).data)

    def _set_status(self, request, new_status):
        target = self.get_object()
        staff_service.set_status(actor=request.membership, target=target, status=new_status)
        return Response(MembershipSerializer(target).data)

    @action(detail=True, methods=["post"])
    def suspend(self, request, pk=None):
        return self._set_status(request, Membership.StatusChoices.SUSPENDED)

    @action(detail=True, methods=["post"])
    def reactivate(self, request, pk=None):
        return self._set_status(request, Membership.StatusChoices.ACTIVE)

    @action(detail=True, methods=["post"])
    def remove(self, request, pk=None):
        self._set_status(request, Membership.StatusChoices.REMOVED)
        return Response(status=status.HTTP_204_NO_CONTENT)
```
Replace `backend/apps/tenancy/urls.py`:
```python
from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.tenancy import views

router = DefaultRouter()
router.register("roles", views.RoleViewSet, basename="role")
router.register("staff", views.StaffViewSet, basename="staff")

urlpatterns = [
    path("tenancy/onboard/", views.OnboardShopView.as_view(), name="tenancy-onboard"),
    path("shops/", views.MyShopsView.as_view(), name="my-shops"),
    path("shops/current/", views.CurrentShopView.as_view(), name="current-shop"),
    *router.urls,
]
```
Then:
- Delete `backend/apps/tenancy/scoping.py`.
- Remove `"apps.tenancy.scoping.TenantScopingMiddleware",` from `MIDDLEWARE`.
- Add an `on_shop_created(shop)` function to `apps/tenancy/services.py` (empty body with a docstring: "Seeds per-shop defaults; extended in 1.1 and 1.5"). Call it at the end of `create_organization_and_shop`.

### 0.7.9 Error codes
Add `staff.cannot_modify_self` 422, `staff.cannot_modify_owner` 422, `staff.insufficient_rank` 403, `staff.role_invalid` 400, `staff.role_not_assignable` 422, `staff.invalid_status_change` 409.

### 0.7.10 Tests
Delete `apps/tenancy/tests/test_isolation.py` and create these files. Every test uses `world` / `client_for`.

`test_scoping.py`:
- missing header → 400 `shop.header_missing`; bad UUID → 400 `shop.header_invalid`
- random UUID → 404 `shop.not_found`; Owner A with Shop B's ID → 404 `shop.not_found` (same body except `request_id`)
- suspended member → 404; member of a suspended organization → 404
- a custom role with `permissions=[]` → `GET /staff/` is 403 `permission.denied`
- a custom role **named "Owner"** with `permissions=[]` → 403 (name gives no power)
- platform admin who is not a member → 404
- `test_every_scoped_action_has_a_permission`:
  ```python
  from django.urls import URLPattern, URLResolver, get_resolver

  from apps.tenancy.viewsets import ShopScopedMixin


  def _walk(patterns):
      for p in patterns:
          if isinstance(p, URLResolver):
              yield from _walk(p.url_patterns)
          elif isinstance(p, URLPattern):
              yield p


  def test_every_scoped_action_has_a_permission():
      missing = []
      for pattern in _walk(get_resolver().url_patterns):
          view_class = getattr(pattern.callback, "cls", None) or getattr(pattern.callback, "view_class", None)
          if not (view_class and issubclass(view_class, ShopScopedMixin)):
              continue
          actions = getattr(pattern.callback, "actions", None) or {
              m: m for m in ("get", "post", "patch", "delete") if hasattr(view_class, m)
          }
          for method, action_name in actions.items():
              if method in ("head", "options"):
                  continue
              if action_name not in view_class.permission_map:
                  missing.append(f"{view_class.__name__}.{action_name}")
      assert not missing, missing
  ```

`test_shops.py`:
- `GET /shops/` returns only my shops, with `permissions`
- `PATCH /shops/current/` as **Engineer** → 403; as **Manager** (has `shop.settings`) with `If-Match: 1` → 200 and `version == 2`
- PATCH with a stale `If-Match: 1` after the version became 2 → 409 `concurrency.version_mismatch`
- PATCH without `If-Match` → 428
- `DELETE /shops/current/` → 405; `PATCH /shops/<id>/` → 404 (the route no longer exists)
- GST on without GSTIN → 400 with `fields.gstin`; bad checksum → 400; valid GSTIN sets `state_code` from it

`test_staff.py` (the regressions found in the audit):
- Front Desk `POST /staff/<owner membership>/suspend/` → 403 (no `staff.manage`)
- Manager suspends the owner → 422 `staff.cannot_modify_owner`
- Manager suspends themself → 422 `staff.cannot_modify_self`
- Manager suspends the Engineer → 200; the Engineer's next request → 404 `shop.not_found`
- Manager changes the Engineer's role to Manager (privileged) → 403 `staff.insufficient_rank`; Owner doing the same → 200
- assigning the Owner role → 422; assigning another organization's custom role → 400
- `POST /staff/` → 405; `DELETE /staff/<id>/` → 405; `PATCH /staff/<id>/` → 405
- removed member: a new `Membership` for the same user and shop can be created (constraint allows it)
- `assert_other_shop_hidden(client_for(world.owner_a, world.shop_a), f"/api/v1/staff/{owner_b_membership.id}/")`

`test_onboarding.py`: happy path returns `shop` and `shops`; non-GST shop gets `registration_type == "unregistered"`; the onboarding endpoint works for a user with no shops.

`test_roles.py`: system roles exist after migrate without calling `seed_system_roles()`; Owner has every code in `PERMISSION_CODES`; Engineer lacks `money.see_cost_profit`, `staff.manage` and `customers.see_phone`; `audit.view` is Owner-only.

`apps/core/tests/test_validators.py`: add GSTIN, state code and UPI cases.

### Verify
```bash
cd backend && pytest && ruff check . && ruff format --check . && python manage.py makemigrations --check --dry-run
python manage.py spectacular --file /tmp/schema.yml --validate
grep -rn "TenantScopingMiddleware\|is_platform_admin" apps/ config/ | grep -v "accounts/models.py\|migrations"   # expect no output
```
**Done when:** every audit item marked [0.7] has a regression test, and all tests pass.

---

## 0.8 🧑‍🔧 Hardware spikes, done honestly (printer + IMEI)

**Depends on:** 0.1 (Capacitor upgraded); it can run in parallel with 0.2–0.7 · **Effort:** 1–2 days plus device time · **Fixes:** audit item 27
**Read first:** `docs/printers.md`, `docs/decisions.md`, `frontend/src/lib/printer/rasterizer.ts`, `docs/01-blueprint.md` sections 5–6

Goal: find out, on real devices, whether (A) a bitmap Hindi receipt prints on your BLE printers from Android and iPhone, and (B) barcode scanning and OCR read IMEIs from real stickers. Write down what really happened.

### 0.8.1 Correct the documents first
1. `docs/printers.md` section 3: set every cell in the Android and iOS columns to `Untested`, and remove the claims in the Notes column. Section 4: untick every checkbox. Add one line under the heading: "Results below are filled in only after a real-device test (spike 0.8)."
2. `docs/decisions.md`, Spike B entry: change **Status** to `proposed`, and replace the accuracy figures with "to be measured in spike 0.8".

### 0.8.2 Make the rasterizer safe for small printer buffers
Change `canvasToEscPosRaster` in `frontend/src/lib/printer/rasterizer.ts`:
1. Accept a plain object type instead of `ImageData` so it can be unit-tested without a canvas:
   ```ts
   export interface RasterSource { width: number; height: number; data: Uint8ClampedArray | Uint8Array }
   ```
2. Emit the image in **bands** of at most 128 rows, each with its own `GS v 0` header. Many cheap printers drop data when one raster command is too tall.
3. Pad width up to a multiple of 8. Treat pixels beyond the source width as white.
4. Keep the `ESC @` prefix and the feed + partial cut suffix, but make the cut optional (`options.cut ?? true`).
5. Add `export function chunkBytes(bytes: Uint8Array, size: number): Uint8Array[]` for BLE writes.

Add `frontend/src/lib/printer/rasterizer.test.ts`:
- a 16×2 image with the first pixel black → the first band's first data byte is `0b10000000`
- a 384×300 image → three `GS v 0` headers (`0x1d 0x76 0x30`), for 128 + 128 + 44 rows
- a transparent pixel is treated as white
- `chunkBytes` of 45 bytes with size 20 → lengths `[20, 20, 5]`

### 0.8.3 iOS project
On the Mac: `pnpm add @capacitor/ios@<same major> && npx cap add ios && npx cap sync ios`, then open `frontend/ios/App/App.xcworkspace` in Xcode, set your team, and run on the iPhone. Commit `frontend/ios/` (minus the ignored folders).

### 0.8.4 Spike screen (development builds only)
Follow R7 for each plugin. Candidates, all `TODO(verify)` that they support your Capacitor major:
- BLE: `@capacitor-community/bluetooth-le`
- Barcode: `@capacitor-mlkit/barcode-scanning`
- OCR: an ML Kit text-recognition Capacitor plugin. Pick one with recent releases and both Android and iOS support, and record the choice.

Create `frontend/src/app/dev/spikes/page.tsx`, rendered only when `process.env.NEXT_PUBLIC_ENABLE_DEV_PAGES === "true"` (otherwise show "Not available"). Buttons:
1. **Scan printers:** BLE scan for 10 s and list names and IDs.
2. **Print test receipt:** connect, find a writable characteristic, render `renderBilingualTestReceiptCanvas(384 or 576)`, rasterize, then write in 20-byte chunks with 20 ms pauses (`writeWithoutResponse` if supported). Show elapsed time and bytes.
3. **Scan barcode:** show the raw value and whether it passes `isValidIMEI`.
4. **OCR photo:** take a photo, run OCR, show the full text and the 15-digit candidates found by `/\b\d{15}\b/g`.

Add the needed Android permissions (Bluetooth scan/connect, camera) and the iOS `Info.plist` strings (`NSBluetoothAlwaysUsageDescription`, `NSCameraUsageDescription`).

### 0.8.5 🧑‍🔧 Run the tests and record results
For each printer × phone, record in `docs/printers.md`: connected yes/no, Hindi crisp yes/no, prints needed for 20 in a row without failure, notes. For IMEI, use at least 10 real stickers or boxes (some glossy, some scratched, some under shop lighting), and record barcode first-try success, OCR success and false digits in `docs/decisions.md`. Then set the Spike B status to `accepted` or `rejected`, with the plugins chosen.

**Done when:** both documents contain only measured results, and the human confirms them. If iPhone BLE printing fails, record that and keep "Android first" for 1.17 (already the fallback in the blueprint).


---

## 0.9 Frontend foundation

**Depends on:** 0.1 · **Effort:** ~1 day · **Fixes:** audit item 26
**Read first:** `frontend/package.json`, `frontend/src/app/layout.tsx`, `frontend/src/app/globals.css`, `frontend/tailwind.config.ts`, `design/01-design-system.md`, `design/04-component-library.md`

### 0.9.1 Folder structure
Create these folders (an empty `.gitkeep` where needed):
```
frontend/src/
  app/                    routes only (page.tsx / layout.tsx)
  components/ui/          shadcn primitives (generated)
  components/shell/       AppHeader, BottomNav, ShopSwitcher
  components/states/      EmptyState, ErrorState, skeletons, OfflineBanner, PermissionDenied
  components/forms/       PhoneInput, NumericKeypad, OtpInput, MoneyInput, ...
  features/<feature>/     api.ts (query hooks), components, schemas (zod)
  i18n/                   config, provider, messages/*.json
  lib/api/                client.ts, schema.d.ts (generated)
  lib/auth/               store.ts
  lib/format/             money.ts, date.ts, phone.ts
  lib/validation/         imei.ts, gstin.ts, upi.ts
  lib/constants/          gst-states.ts, external.ts
  native/                 platform.ts, secure-storage.ts, device.ts, preferences.ts, ...
scripts/                  check-i18n.mjs
e2e/                      Playwright tests
```

### 0.9.2 shadcn/ui
1. Run `pnpm dlx shadcn@latest init`. If the CLI requires Tailwind v4 or React 19, use `pnpm dlx shadcn@2.3.0 init` instead (the last CLI line for Tailwind v3; `TODO(verify)`). Choose: style "default", base colour "neutral", CSS variables yes, `src/components/ui`, alias `@/components`.
2. Keep the existing CSS variables in `globals.css`; if `init` overwrote them, restore `--radius: 1rem` and the FixPro values from `design/01-design-system.md`.
3. Add components: `pnpm dlx shadcn@<same> add button input label sheet dialog skeleton badge separator switch select checkbox radio-group tabs sonner textarea`.
4. Restyle `components/ui/button.tsx` to match `design/04-component-library.md` §2.1–2.2: default variant `h-[54px] rounded-2xl bg-neutral-950 text-white active:scale-[0.98]`, outline variant `h-12 rounded-2xl border-neutral-200`.

### 0.9.3 Fonts, viewport, manifest
Replace `frontend/src/app/layout.tsx`:
```tsx
import type { Metadata, Viewport } from "next";
import { Noto_Sans_Devanagari, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const fontSans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
// Plus Jakarta Sans has no Devanagari glyphs; the browser falls back to this font per character.
const fontDeva = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-deva",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FixPro",
  description: "Repair shop management",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#09090B",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontDeva.variable}`}>
      <body className="flex min-h-screen justify-center bg-neutral-100 font-sans">
        <div className="pt-safe pb-safe relative flex min-h-screen w-full max-w-md flex-col bg-white shadow-xl">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
```
(`maximumScale` / `userScalable: false` are removed; zoom must stay possible for accessibility. The `manifest` link is removed until icons exist.)

Create a temporary `frontend/src/app/providers.tsx` (0.10 and 0.11 extend it):
```tsx
"use client";

export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```
In `tailwind.config.ts`, set `fontFamily.sans` to `["var(--font-sans)", "var(--font-deva)", "system-ui", "sans-serif"]`.

### 0.9.4 Vitest + Testing Library
```bash
pnpm add -D jsdom @testing-library/react @testing-library/jest-dom @vitejs/plugin-react
```
Create `frontend/vitest.config.ts`:
```ts
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.mjs"],
  },
});
```
Create `frontend/vitest.setup.ts` containing `import "@testing-library/jest-dom/vitest";`.

### 0.9.5 Guard rails in ESLint
Replace `frontend/.eslintrc.json`:
```json
{
  "extends": "next/core-web-vitals",
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": [{
        "group": ["@capacitor/*", "!@capacitor/core", "@capacitor-community/*", "@capacitor-mlkit/*", "@aparajita/*"],
        "message": "Import native plugins only inside src/native/* (ROADMAP R7)."
      }]
    }]
  },
  "overrides": [
    { "files": ["src/native/**/*.ts", "capacitor.config.ts"], "rules": { "no-restricted-imports": "off" } }
  ]
}
```
The current `src/app/page.tsx` mock has no plugin imports, so lint should stay green.

### 0.9.6 Environment access
Create `frontend/src/lib/env.ts`:
```ts
export const env = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1",
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0-dev",
  devPages: process.env.NEXT_PUBLIC_ENABLE_DEV_PAGES === "true",
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? "",
};
```
Capacitor and an HTTP dev API: the Android WebView origin is `https://localhost`, so calls to `http://192.168.x.x:8000` are blocked as mixed content. In `capacitor.config.ts`, add `android: { allowMixedContent: process.env.CAP_ALLOW_MIXED_CONTENT === "true" }` and set that variable only when syncing development builds. Alternatively, use an HTTPS tunnel. Production builds always use HTTPS.

### Verify
```bash
cd frontend && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```
**Done when:** the build succeeds, the Hindi text in the existing mock renders in Noto Sans Devanagari (check in the browser dev tools), and pinch-zoom works.

---

## 0.10 i18n and Indian formatters

**Depends on:** 0.9 · **Effort:** ~1 day
**Read first:** `docs/domain-glossary.md`, the next-intl docs for `NextIntlClientProvider` (client-only usage)

Static export + Capacitor means **no locale in the URL and no middleware**. The locale lives in a store, and messages are bundled.

### 0.10.1 Config and store
`frontend/src/i18n/config.ts`:
```ts
export const locales = ["en", "hi", "hi-Latn"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
/** Intl formatting locale per UI locale (hi-Latn formats like en-IN). */
export const intlLocale: Record<Locale, string> = { en: "en-IN", hi: "hi-IN", "hi-Latn": "en-IN" };
export const localeLabels: Record<Locale, string> = { en: "English", hi: "हिन्दी", "hi-Latn": "Hinglish" };
```
`frontend/src/i18n/store.ts`:
```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultLocale, type Locale } from "./config";

type LocaleState = { locale: Locale; setLocale: (l: Locale) => void };

export const useLocaleStore = create<LocaleState>()(
  persist((set) => ({ locale: defaultLocale, setLocale: (locale) => set({ locale }) }), { name: "fixpro.locale" }),
);
```
(The UI language is not a secret, so `localStorage` is fine on every platform.)

### 0.10.2 Messages and provider
Create `src/i18n/messages/en.json`, `hi.json` and `hi-Latn.json` with these top-level namespaces: `common`, `nav`, `states`, `errors`, `auth`, `onboarding`, `home`, `more`, `settings`. Start `errors` with one key per code in `docs/error-codes.md`, plus `"generic"` and `"network": {"offline": ...}`.

`frontend/src/i18n/IntlProvider.tsx`:
```tsx
"use client";

import { NextIntlClientProvider } from "next-intl";
import { useEffect } from "react";
import en from "./messages/en.json";
import hi from "./messages/hi.json";
import hiLatn from "./messages/hi-Latn.json";
import { useLocaleStore } from "./store";

const messages = { en, hi, "hi-Latn": hiLatn } as const;

export function IntlProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocaleStore((s) => s.locale);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="Asia/Kolkata">
      {children}
    </NextIntlClientProvider>
  );
}
```
Wrap `children` in `providers.tsx` with `<IntlProvider>`. Create `src/components/LanguageSwitcher.tsx`: three large radio rows using `localeLabels`. When the user is signed in, it also calls `PATCH /auth/me/ {preferred_locale}` (wired in 0.12).

Server messages: the client always shows `t("errors.<code>")` when the key exists, and falls back to the server `message`. Helper in `src/lib/api/errors.ts`:
```ts
import type { useTranslations } from "next-intl";
import { ApiError } from "./client";

export function errorMessage(t: ReturnType<typeof useTranslations>, err: unknown): string {
  if (err instanceof ApiError) {
    const key = `errors.${err.code}`;
    return t.has(key) ? t(key) : err.message;
  }
  return t("errors.generic");
}
```
(Call it with `useTranslations()` with no namespace. If your next-intl version has no `t.has`, upgrade to the newest 3.x; `TODO(verify)`.)

### 0.10.3 Translation key checker
Create `frontend/scripts/check-i18n.mjs`:
```js
// Fails when the three locale files do not have exactly the same keys. Warns on "[TODO hi]" placeholders.
import { readFileSync } from "node:fs";

const dir = new URL("../src/i18n/messages/", import.meta.url);
const files = ["en", "hi", "hi-Latn"];

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else out[key] = String(v);
  }
  return out;
}

const maps = Object.fromEntries(
  files.map((f) => [f, flatten(JSON.parse(readFileSync(new URL(`${f}.json`, dir), "utf8")))]),
);
const base = new Set(Object.keys(maps.en));
let failed = false;
for (const f of files.slice(1)) {
  const keys = new Set(Object.keys(maps[f]));
  const missing = [...base].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !base.has(k));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`${f}.json  missing: ${missing.join(", ") || "-"}  extra: ${extra.join(", ") || "-"}`);
  }
  const todos = Object.entries(maps[f]).filter(([, v]) => v.startsWith("[TODO")).length;
  if (todos) console.warn(`${f}.json: ${todos} untranslated [TODO] strings`);
}
if (failed) process.exit(1);
console.log(`i18n OK: ${base.size} keys in ${files.length} locales`);
```
In `package.json`, add `"i18n:check": "node scripts/check-i18n.mjs"`, and change `"lint"` to `"next lint && pnpm i18n:check"`.

### 0.10.4 Formatters (with tests)
`frontend/src/lib/format/money.ts`:
```ts
const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 450000 -> "₹4,500.00". Paise must be an integer. */
export function formatPaise(paise: number): string {
  if (!Number.isSafeInteger(paise)) throw new Error(`formatPaise expects integer paise, got ${paise}`);
  return inr.format(paise / 100);
}

/** 24000000 -> "₹2.4L"; 1250000 -> "₹12.5K"; 45000 -> "₹450". */
export function formatPaiseCompact(paise: number): string {
  const rupees = paise / 100;
  const one = (n: number) => (Math.round(n * 10) / 10).toString();
  if (Math.abs(rupees) >= 1e7) return `₹${one(rupees / 1e7)}Cr`;
  if (Math.abs(rupees) >= 1e5) return `₹${one(rupees / 1e5)}L`;
  if (Math.abs(rupees) >= 1e3) return `₹${one(rupees / 1e3)}K`;
  return formatPaise(paise).replace(/\.00$/, "");
}

/** "4,500.5" -> 450050. Returns null for invalid input. Never uses floating point. */
export function rupeesToPaise(input: string): number | null {
  const s = input.replace(/[,\s₹]/g, "");
  const m = /^(\d{1,11})(?:\.(\d{0,2}))?$/.exec(s);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

/** 450050 -> "4500.50" for prefilling inputs. */
export function paiseToRupeesInput(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
```
`frontend/src/lib/format/date.ts`:
```ts
import { intlLocale, type Locale } from "@/i18n/config";

const TZ = "Asia/Kolkata";

export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], { day: "numeric", month: "short", year: "numeric", timeZone: TZ })
    .format(new Date(iso));
}

export function formatDateTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: TZ,
  }).format(new Date(iso));
}

/** Today's date in IST as YYYY-MM-DD (for API date filters). */
export function todayIst(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}
```
`frontend/src/lib/format/phone.ts`: `formatPhone("+919876543210")` → `"+91 98765 43210"` (non-+91 numbers are returned unchanged); `toWhatsAppDigits("+919876543210")` → `"919876543210"`.

Tests (`*.test.ts` next to each file): `formatPaise(450000) === "₹4,500.00"`; `formatPaise(1234567890)` → `"₹1,23,45,678.90"`; `formatPaise(1.5)` throws; `formatPaiseCompact(24000000) === "₹2.4L"`; `rupeesToPaise("4,500.5") === 450050`; `rupeesToPaise("1.234") === null`; `rupeesToPaise("abc") === null`; `paiseToRupeesInput(5) === "0.05"`; `todayIst()` matches `/^\d{4}-\d{2}-\d{2}$/`; the phone formatter cases.

### Verify
```bash
cd frontend && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```
**Done when:** switching the locale store re-renders text in Hindi and Hinglish, and the checker passes.

---

## 0.11 API client, session store, secure storage and native layer

**Depends on:** 0.10 and backend 0.6 · **Effort:** 1.5 days
**Read first:** `docs/api-conventions.md`, `backend/apps/accounts/views.py`, AGENTS.md rule 8

### 0.11.1 Native service layer
1. Install the plugins (R7): `@capacitor/preferences`, `@capacitor/device`, `@capacitor/network`, `@capacitor/app`, `@capacitor/status-bar`, and a secure-storage plugin (Keychain on iOS, Keystore on Android). Candidate: `@aparajita/capacitor-secure-storage`. `TODO(verify)` that it supports your Capacitor major; record the choice in `docs/decisions.md`.
2. `src/native/platform.ts`:
   ```ts
   import { Capacitor } from "@capacitor/core";

   export const isNative = () => Capacitor.isNativePlatform();
   export const platform = () => Capacitor.getPlatform() as "android" | "ios" | "web";

   export class NativeUnavailableError extends Error {
     constructor(feature: string) {
       super(`${feature} is not available on this platform`);
     }
   }
   ```
3. `src/native/secure-storage.ts`: `getSecret(key)`, `setSecret(key, value)` and `removeSecret(key)`. Native uses the secure-storage plugin. Web uses `localStorage`, with this comment: "Web fallback. XSS can read localStorage; acceptable for the pilot; revisit with httpOnly cookies before public web launch." This file is the **only** place tokens are persisted.
4. `src/native/preferences.ts`: `getPref(key)` and `setPref(key, value)`, using `@capacitor/preferences` on native and `localStorage` on web. For non-secret data such as the selected shop ID and the printer.
5. `src/native/device.ts`: `getDeviceId()` returns `Device.getId().identifier` on native. On web it returns a `crypto.randomUUID()` saved under the preference key `fixpro.deviceId` and reused afterwards.
6. `src/native/network.ts`: `onNetworkChange(cb)` and `isOnline()`, using `@capacitor/network` on native and `navigator.onLine` plus window events on web.

### 0.11.2 Session store
`frontend/src/lib/auth/store.ts`:
```ts
import { create } from "zustand";
import { getPref, setPref } from "@/native/preferences";
import { getSecret, removeSecret, setSecret } from "@/native/secure-storage";

export type Tokens = { access: string; refresh: string };
export type User = { id: string; phone: string; name: string; email: string | null; preferred_locale: string };
export type MyShop = {
  membership_id: string; shop_id: string; shop_name: string; shop_type: string; city: string;
  role_id: string; role_name: string; permissions: string[];
};

type Status = "booting" | "signedOut" | "signedIn";

type AuthState = {
  status: Status;
  tokens: Tokens | null;
  user: User | null;
  shops: MyShop[];
  shopId: string | null;
  boot: () => Promise<void>;
  setSession: (s: { user: User; tokens?: Tokens; shops: MyShop[] }) => Promise<void>;
  setTokens: (t: Tokens) => Promise<void>;
  selectShop: (shopId: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const TOKENS_KEY = "fixpro.tokens";
const SHOP_KEY = "fixpro.shopId";

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: "booting",
  tokens: null,
  user: null,
  shops: [],
  shopId: null,

  boot: async () => {
    const raw = await getSecret(TOKENS_KEY);
    const shopId = await getPref(SHOP_KEY);
    set({ tokens: raw ? (JSON.parse(raw) as Tokens) : null, shopId, status: raw ? "signedIn" : "signedOut" });
  },

  setSession: async ({ user, tokens, shops }) => {
    if (tokens) await setSecret(TOKENS_KEY, JSON.stringify(tokens));
    const current = get().shopId;
    const shopId = shops.some((s) => s.shop_id === current) ? current : (shops[0]?.shop_id ?? null);
    if (shopId) await setPref(SHOP_KEY, shopId);
    set({ user, shops, shopId, status: "signedIn", ...(tokens ? { tokens } : {}) });
  },

  setTokens: async (tokens) => {
    await setSecret(TOKENS_KEY, JSON.stringify(tokens));
    set({ tokens });
  },

  selectShop: async (shopId) => {
    await setPref(SHOP_KEY, shopId);
    set({ shopId });
  },

  signOut: async () => {
    await removeSecret(TOKENS_KEY);
    set({ status: "signedOut", tokens: null, user: null, shops: [] });
  },
}));

export function useCurrentShop(): MyShop | null {
  return useAuthStore((s) => s.shops.find((x) => x.shop_id === s.shopId) ?? null);
}

export function usePermission(code: string): boolean {
  return useCurrentShop()?.permissions.includes(code) ?? false;
}
```

### 0.11.3 API client
`frontend/src/lib/api/client.ts`:
```ts
import { useLocaleStore } from "@/i18n/store";
import { useAuthStore } from "@/lib/auth/store";
import { env } from "@/lib/env";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string[]> = {},
    public requestId?: string,
  ) {
    super(message);
  }
}

export type ListMeta = { count: number; page: number; next: string | null; previous: string | null };
export type ListResult<T> = { items: T[]; meta: ListMeta };

type Method = "GET" | "POST" | "PATCH" | "DELETE";
export type RequestOptions = {
  method?: Method;
  body?: unknown;
  auth?: boolean;           // default true
  shop?: boolean;           // send X-Shop-Id (default true)
  idempotencyKey?: string;
  ifMatch?: number;
  signal?: AbortSignal;
};

type RefreshResult = "ok" | "invalid" | "network";
let refreshing: Promise<RefreshResult> | null = null;

async function doRefresh(): Promise<RefreshResult> {
  const refresh = useAuthStore.getState().tokens?.refresh;
  if (!refresh) return "invalid";
  let res: Response;
  try {
    res = await fetch(`${env.apiBaseUrl}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh }),
    });
  } catch {
    return "network";
  }
  if (!res.ok) return "invalid";
  const { data } = await res.json();
  await useAuthStore.getState().setTokens({ access: data.access, refresh: data.refresh ?? refresh });
  return "ok";
}

/** Single-flight: parallel 401s share one refresh (the server treats a reused refresh token as theft). */
export function refreshTokens(): Promise<RefreshResult> {
  if (!refreshing) refreshing = doRefresh().finally(() => (refreshing = null));
  return refreshing;
}

async function request(path: string, opts: RequestOptions, canRetry = true): Promise<unknown> {
  const { tokens, shopId } = useAuthStore.getState();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Accept-Language": useLocaleStore.getState().locale,
    "X-App-Version": env.appVersion,
  };
  const isForm = typeof FormData !== "undefined" && opts.body instanceof FormData;
  if (opts.body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  if (opts.auth !== false && tokens?.access) headers.Authorization = `Bearer ${tokens.access}`;
  if (opts.shop !== false && shopId) headers["X-Shop-Id"] = shopId;
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
  if (opts.ifMatch !== undefined) headers["If-Match"] = String(opts.ifMatch);

  let res: Response;
  try {
    res = await fetch(`${env.apiBaseUrl}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body === undefined ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
      signal: opts.signal,
    });
  } catch {
    throw new ApiError(0, "network.offline", "Network error");
  }

  if (res.status === 401 && canRetry && opts.auth !== false && tokens?.refresh) {
    const result = await refreshTokens();
    if (result === "ok") return request(path, opts, false);
    if (result === "network") throw new ApiError(0, "network.offline", "Network error");
    await useAuthStore.getState().signOut();
  }
  if (res.status === 204) return null;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const e = body?.error;
    throw new ApiError(res.status, e?.code ?? "server.error", e?.message ?? res.statusText, e?.fields ?? {}, e?.request_id);
  }
  return body;
}

/** For single-object endpoints: returns envelope.data. */
export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const body = (await request(path, opts)) as { data: T } | null;
  return (body?.data ?? null) as T;
}

/** For paginated list endpoints. */
export async function apiList<T>(path: string, opts: RequestOptions = {}): Promise<ListResult<T>> {
  const body = (await request(path, opts)) as { data: T[]; meta: ListMeta };
  return { items: body.data, meta: body.meta };
}

export const newIdempotencyKey = () => crypto.randomUUID();
```

### 0.11.4 Query client, boot and generated types
1. In `providers.tsx`, create the `QueryClient` once (`useState(() => new QueryClient(...))`) with:
   ```ts
   defaultOptions: {
     queries: {
       staleTime: 30_000,
       retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
     },
   }
   ```
   Wrap everything in `QueryClientProvider`, then `IntlProvider`, then `<SessionBoot>`, then the sonner `<Toaster />`.
2. `src/lib/auth/SessionBoot.tsx`: on mount, call `boot()`. If there are tokens, call `api<{user, shops}>("/auth/me/", { shop: false })` then `setSession(...)`, and set the locale from `user.preferred_locale`. Render a full-screen splash while `status === "booting"`.
3. Generated API types: `pnpm add -D openapi-typescript`, then add the script `"gen:api": "openapi-typescript http://localhost:8000/api/schema/ -o src/lib/api/schema.d.ts"`. Run it with the backend running, and commit `schema.d.ts`. Feature hooks may use `components["schemas"]["X"]` types from it.

### 0.11.5 Tests (`src/lib/api/client.test.ts`, mock `fetch` with `vi.fn()`)
- `api()` returns `data`; `apiList()` returns `items` and `meta`
- an error response becomes `ApiError` with `code`, `status` and `fields`
- `fetch` throwing becomes `ApiError(0, "network.offline")` and does **not** sign out
- two parallel calls that both get 401 cause exactly **one** refresh call, then both retry and succeed
- refresh 401 calls `signOut()`
- headers: `X-Shop-Id` is sent only when `shop !== false`; `Idempotency-Key` and `If-Match` are passed through

### Verify
```bash
cd frontend && pnpm lint && pnpm typecheck && pnpm test && pnpm build
grep -rn "localStorage" src | grep -v "src/native/\|src/i18n/store.ts"   # expect no output
```
**Done when:** client tests pass, and tokens are stored only through `src/native/secure-storage.ts`.

---

## 0.12 Auth screens (splash, welcome, phone, OTP, profile)

**Depends on:** 0.11 · **Effort:** 1.5–2 days
**Read first:** `design/screens/1.1-splash.png`, `design/screens/1.3-image.png`, `design/01-design-system.md` §4.6, `backend/apps/accounts/views.py`

### 0.12.1 Routing rule (pure function + test)
`frontend/src/lib/auth/route.ts`:
```ts
export type RouteInput = {
  status: "booting" | "signedOut" | "signedIn";
  hasName: boolean;
  shopCount: number;
  pendingInvites: number; // 0 until 0.16
};

/** Where the app should be. Pages call this and router.replace() if they are on the wrong screen. */
export function nextRoute(s: RouteInput): string | null {
  if (s.status === "booting") return null;
  if (s.status === "signedOut") return "/welcome/";
  if (!s.hasName) return "/profile-setup/";
  if (s.shopCount === 0) return s.pendingInvites > 0 ? "/invites/" : "/onboarding/";
  return "/home/";
}
```
Test every branch in `route.test.ts`.

### 0.12.2 Screens
Each page is `"use client"`, uses `useTranslations`, shows field errors from `ApiError.fields`, and maps `error.code` with `errorMessage()`.

1. **`src/app/page.tsx` (splash):** delete the old mock (save its JSX into `src/features/home/HomeMock.tsx` for reuse in 0.14). Show the logo, "Setting things up…", and three feature pills as in `1.1-splash.png`. When boot finishes, `router.replace(nextRoute(...))`.
2. **`src/app/welcome/page.tsx`:** illustration placeholder (an `<svg>` line icon is fine), title, subtitle, and a primary button "Continue with phone" linking to `/login/`. There is no Google button; phone OTP is the only login method (blueprint decision).
3. **`src/app/login/page.tsx`:** country chip `🇮🇳 +91` (India only for now), a 10-digit display, and a `NumericKeypad` component (`components/forms/NumericKeypad.tsx`, 3×4 grid, 64 px keys, backspace, haptic tick through `src/native/haptics.ts` with a web no-op). Validate 10 digits starting with 6–9. Submit `POST /auth/otp/send/ {phone, device_id}` with `auth: false, shop: false`, then go to `/verify/?phone=+91XXXXXXXXXX`. On 429, show the cooldown from `Retry-After` / the error message.
4. **`src/app/verify/page.tsx`:** read `phone` via `useSearchParams()` inside `<Suspense>`. `OtpInput` with six boxes: auto-advance, backspace moves back, paste of six digits fills all, first box has `autoComplete="one-time-code"` and `inputMode="numeric"`. Resend button with a countdown from `cooldown_seconds` ("Resend (28s)"). Submit `POST /auth/otp/verify/ {phone, code, device_id, platform, app_version}`. On success: `setSession({user, tokens, shops})`, then route with `nextRoute`. Error codes `otp.invalid` (shows attempts left from `fields.code`), `otp.expired` and `otp.locked` each have their own message and offer resend.
5. **`src/app/profile-setup/page.tsx`:** name (required, 2–120 chars), email (optional, valid), and language (LanguageSwitcher). `PATCH /auth/me/`, then `setSession` with the response, then route.

Use React Hook Form + Zod for the forms (`src/features/auth/schemas.ts`), and test the schemas.

### 0.12.3 i18n
Add every string to the three locale files (R6), under the `auth` namespace, plus `errors.otp.*`.

### 0.12.4 🧑‍🔧 Manual check
With the backend running locally: sign in on web with `9999999999` / `123456`. On Android (emulator or phone, see 0.9.6 for HTTP) sign in with a random number and read the dev OTP from the backend log.

### Verify
```bash
cd frontend && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```
**Done when:** a new user can go welcome → phone → OTP → profile, and reaches `/onboarding/` (the page is created in 0.13; a 404 there is expected until then).

---

## 0.13 Shop onboarding wizard

**Depends on:** 0.12 and backend 0.7 · **Effort:** ~1 day
**Read first:** `design/screens/1.2-onboarding.png`, `backend/apps/tenancy/serializers.py` (`ShopSerializer.validate`)

1. Create `src/lib/validation/gstin.ts`, a port of the backend `validate_gstin` (regex, state code, check character), with a test using `27AAPFU0939F1ZV` (valid), `29ABCDE1234F1ZW` (valid) and `29ABCDE1234F1Z5` (invalid).
2. Create `src/lib/constants/gst-states.ts`, a copy of `GST_STATE_CODES` as `{code, name}` sorted by name, with the same `TODO(verify)` comment.
3. Create `src/lib/validation/upi.ts` with the same regex as the backend, and a test.
4. Create `src/features/onboarding/schema.ts` (Zod), mirroring the backend rules: `name` required (max 150); `shop_type` enum; `phone` optional 10 digits; `pincode` optional 6 digits; `state_code` in the list; if `gst_enabled`, then `gstin` is required, valid and starts with `state_code`; `upi_id` optional, valid.
5. Create `src/app/onboarding/page.tsx`, a three-step wizard with a `StepProgressBar` (`components/forms/StepProgressBar.tsx`, per design §2.4):
   - **Step 1, Shop:** name, type (Mobile / Computer / TV & appliance / Other).
   - **Step 2, Contact & address:** phone (defaults to the owner's), address line, city, pincode, state.
   - **Step 3, Billing:** GST switch (shows GSTIN when on, and fills state from the GSTIN), UPI ID (optional, with the helper text "Customers pay you directly with this").
   - "Back" keeps entered data. "Create my shop" posts to `/tenancy/onboard/` with `shop: false` and an `idempotencyKey` created **once** when the page mounts (`useState(newIdempotencyKey)`).
   - On success: `setSession` with `user` plus the returned `shops`, `selectShop(shop.id)`, then a success screen ("Welcome, {name}!") with a button to `/home/`.
6. Logo upload is **not** part of this step (it needs file storage from 1.6). 1.21 adds it to Shop settings.
7. Add i18n keys (namespace `onboarding`) in all three locales.

### Verify
```bash
cd frontend && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```
**Done when:** onboarding creates a shop, a double tap creates only one, and server validation errors show under the right field.

---

## 0.14 App shell, navigation and shared states (+ iPhone)

**Depends on:** 0.13 · **Effort:** 1.5 days
**Read first:** `design/screens/1.4-main-app-shell.png`, `design/screens/1.5-more-menu.png`, `design/01-design-system.md` §4, `design/04-component-library.md` §1

### 0.14.1 Shared state components (`src/components/states/`)
- `ListSkeleton({rows})` and `CardSkeleton`: shadcn `Skeleton`, matching the list or card shapes.
- `EmptyState({icon?, title, body?, action?})`: line icon, text, optional primary button.
- `ErrorState({error, onRetry})`: uses `errorMessage()`. If `error.status === 403`, render `<PermissionDenied />` instead. If `error.status === 0`, show the offline message. Always shows a Retry button except for 403.
- `PermissionDenied`: lock icon, "You don't have access to this. Ask the shop owner."
- `OfflineBanner`: subscribes to `onNetworkChange` and shows a thin persistent banner "You're offline. Changes can't be saved until you reconnect." (Phase 0–2 are online-first; offline sync is Phase 3.)
- `index.ts` re-exports all of them.

### 0.14.2 Shell
1. Create the route group `src/app/(app)/layout.tsx`, a client component:
   - if `nextRoute(...)` is not `/home/` (not signed in, no name, or no shops), `router.replace` to it and render the splash
   - otherwise render `<AppHeader />`, `<OfflineBanner />`, `<main className="flex-1 pb-20">{children}</main>` and `<BottomNav />`
2. `AppHeader` (design §1.1): shop icon, shop name with a chevron **only when there is more than one shop** (opens `ShopSwitcher`), the shop type subtitle, a notification bell (no badge until Phase 3 push), and an avatar with initials that links to `/more/`.
3. `ShopSwitcher`: a shadcn `Sheet` listing `shops`. Tapping one calls `selectShop()` and then `queryClient.clear()`, because all cached data belongs to the old shop.
4. `BottomNav` (design §1.2): five tabs (Home `/home/`, Jobs `/jobs/`, Customers `/customers/`, Inventory `/inventory/`, More `/more/`) with lucide icons, an active state from `usePathname()`, 64 px tall plus safe area, and touch targets of at least 48 px.
5. Pages:
   - `(app)/home/page.tsx`: greeting ("Good morning, {name}" based on IST hour), date pill, and the hero card from `HomeMock` with **zeros** and the label "Live counts arrive with job sheets". Show the quick-action grid from the mock; every tile except "Add Job Sheet" shows a small "Soon" badge and is disabled. "Add Job Sheet" is disabled until 1.7.
   - `(app)/jobs/`, `(app)/customers/`, `(app)/inventory/`: `EmptyState` with a "Coming in the next update" message.
   - `(app)/more/page.tsx`: grouped cards as in `design/01-design-system.md` §4.5. Working rows now: Language, Staff (enabled in 0.16), Account → Devices & sessions (lists `/auth/devices/`, revoke button, "Log out of all devices" calling `/auth/logout-all/`), and Log out (`POST /auth/logout/`, then `signOut()`). Everything else shows a "Soon" badge.
6. Android back button: in `src/native/app.ts`, export `onBackButton(cb)` (`@capacitor/app`). In the app layout, register it: on a tab root, minimise the app (`App.minimizeApp()`); otherwise `router.back()`.
7. Status bar: `src/native/status-bar.ts` sets a light style with a white background on native.

### 0.14.3 🧑‍🔧 Run on devices
`pnpm build && npx cap sync`, then run on the Android phone and the iPhone (Xcode). Check safe areas (notch and home indicator), the keyboard not covering the OTP boxes, and the back button.

### 0.14.4 Playwright smoke test (local only for now)
```bash
pnpm add -D @playwright/test && pnpm exec playwright install chromium
```
Create `frontend/playwright.config.ts` (baseURL `http://localhost:3000`, `webServer: { command: "pnpm dev", port: 3000, reuseExistingServer: true }`). Create `e2e/login.spec.ts`: sign in with `9999999999` / `123456`, complete the profile, onboard a shop, and see the Home greeting and five tabs at a 360×780 viewport. Add `"e2e": "playwright test"`. The backend must be running with dev settings. CI integration comes in 1.23.

### Verify
```bash
cd frontend && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e
```
**Done when:** the full flow works on web, Android and iPhone; the tabs switch; language switching retranslates the shell; logout returns to welcome.


---

## 0.15 Audit log

**Depends on:** 0.7 · **Effort:** ~1 day
**Read first:** `docs/02-database-schema.md` §4.3, `backend/apps/core/net.py`

### 0.15.1 App and model
`python manage.py startapp audit apps/audit` (fix `apps.py`: `name = "apps.audit"`), then add `"apps.audit.apps.AuditConfig",` to `LOCAL_APPS`.

`backend/apps/audit/models.py`:
```python
from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import UUIDModel


class AppendOnlyQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise RuntimeError("audit_log is append-only")

    def delete(self):
        raise RuntimeError("audit_log is append-only")


class AuditLog(UUIDModel):
    shop = models.ForeignKey("tenancy.Shop", on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    action = models.CharField(max_length=64)
    entity_type = models.CharField(max_length=64, blank=True, default="")
    entity_id = models.CharField(max_length=64, blank=True, default="")
    before = models.JSONField(null=True, blank=True)
    after = models.JSONField(null=True, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True, default="")
    request_id = models.CharField(max_length=64, blank=True, default="")
    created_at = models.DateTimeField(default=timezone.now)

    objects = AppendOnlyQuerySet.as_manager()

    class Meta:
        indexes = [
            models.Index(fields=["shop", "-created_at"], name="audit_shop_created_idx"),
            models.Index(fields=["entity_type", "entity_id"], name="audit_entity_idx"),
        ]
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise RuntimeError("audit_log is append-only")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise RuntimeError("audit_log is append-only")
```
After `makemigrations audit`, create an extra migration (`python manage.py makemigrations audit --empty -n block_mutation`) with:
```python
operations = [
    migrations.RunSQL(
        sql="""
        CREATE OR REPLACE FUNCTION audit_block_mutation() RETURNS trigger AS $$
        BEGIN RAISE EXCEPTION 'audit_auditlog is append-only'; END; $$ LANGUAGE plpgsql;
        CREATE TRIGGER audit_no_update_delete BEFORE UPDATE OR DELETE ON audit_auditlog
        FOR EACH ROW EXECUTE FUNCTION audit_block_mutation();
        """,
        reverse_sql="""
        DROP TRIGGER IF EXISTS audit_no_update_delete ON audit_auditlog;
        DROP FUNCTION IF EXISTS audit_block_mutation();
        """,
    ),
]
```
(Row triggers do not fire on `TRUNCATE`, so test database flushes still work.)

### 0.15.2 Service
`backend/apps/audit/services.py`:
```python
import json

from django.core.serializers.json import DjangoJSONEncoder

from apps.audit.models import AuditLog
from apps.core.net import get_client_ip


def snapshot(obj, fields) -> dict:
    """JSON-safe dict of selected fields (UUIDs, dates and Decimals become strings)."""
    raw = {f: getattr(obj, f) for f in fields}
    return json.loads(json.dumps(raw, cls=DjangoJSONEncoder))


def _diff(before: dict | None, after: dict | None) -> tuple[dict | None, dict | None]:
    if before is None or after is None:
        return before, after
    changed = {k for k in set(before) | set(after) if before.get(k) != after.get(k)}
    return {k: before.get(k) for k in changed}, {k: after.get(k) for k in changed}


def record_audit(
    *,
    action: str,
    entity=None,
    entity_type: str = "",
    entity_id: str = "",
    request=None,
    actor=None,
    shop=None,
    before: dict | None = None,
    after: dict | None = None,
) -> AuditLog:
    if entity is not None:
        entity_type = entity_type or f"{entity._meta.app_label}.{entity._meta.model_name}"
        entity_id = entity_id or str(entity.pk)
    meta = {}
    if request is not None:
        user = getattr(request, "user", None)
        actor = actor or (user if user is not None and user.is_authenticated else None)
        shop = shop or getattr(request, "shop", None)
        meta = {
            "ip": get_client_ip(request),
            "user_agent": request.META.get("HTTP_USER_AGENT", "")[:255],
            "request_id": getattr(request, "request_id", "") or "",
        }
    before, after = _diff(before, after)
    return AuditLog.objects.create(
        action=action, entity_type=entity_type, entity_id=entity_id, actor=actor, shop=shop,
        before=before, after=after, **meta,
    )
```

### 0.15.3 Record these events now
| Where | Action | before / after |
|---|---|---|
| `OnboardShopView` | `shop.created` | after: name, shop_type, gst_enabled |
| `CurrentShopView.patch` | `shop.settings_updated` | `snapshot(shop, ShopSerializer.Meta.fields)` before and after; only changed keys are stored |
| `StaffViewSet.change_role` | `staff.role_changed` | role_id |
| suspend / reactivate / remove | `staff.status_changed` | status |
| `VerifyOTPView` when `is_new_device` is true | `auth.new_device_login` (shop = null) | after: platform, device_id |
| `LogoutAllView` | `auth.logout_all` | — |
| `DeviceRevokeView` | `auth.device_revoked` | after: device_id |

Never put tokens, OTP codes or lock patterns in `before`/`after`.

### 0.15.4 Read API and admin
- `apps/audit/serializers.py`: `AuditLogSerializer` with every field plus `actor_name` (`source="actor.name"`).
- `AuditLogViewSet(ShopScopedMixin, mixins.ListModelMixin, viewsets.GenericViewSet)` with `permission_map = {"list": "audit.view"}`. The queryset is filtered by `shop=request.shop`, uses `select_related("actor")`, and supports filters `action`, `entity_type`, `entity_id` and `actor` (django-filter `filterset_fields`). Route: `/audit-logs/`.
- `admin.py`: register a read-only admin (`has_add/change/delete_permission` return `False`).

### 0.15.5 Tests (`apps/audit/tests/test_audit.py`)
- `AuditLog.objects.filter(...).update(action="x")` raises; `log.save()` on an existing row raises; raw SQL `UPDATE audit_auditlog ...` raises `InternalError` / `DatabaseError` (trigger)
- the manager suspending the engineer writes `staff.status_changed` with `before={"status": "active"}` and `after={"status": "suspended"}`
- a shop settings PATCH stores only the changed keys
- `GET /audit-logs/` as Owner → 200; as Manager → 403; Shop B's logs are never returned
- a new-device login writes `auth.new_device_login`; a second login on the same device does not

### Verify
```bash
cd backend && pytest && ruff check . && ruff format --check . && python manage.py makemigrations --check --dry-run
python manage.py migrate audit zero && python manage.py migrate   # migrations are reversible
```
**Done when:** every row in the 0.15.3 table has a passing test.

---

## 0.16 Staff invites and the Staff / Roles screens

**Depends on:** 0.15, 0.14 · **Effort:** 2 days
**Read first:** `backend/apps/tenancy/staff.py`, `backend/apps/tenancy/models.py` (`Invite`), `design/02-information-architecture.md` §11

### 0.16.1 Backend service (`backend/apps/tenancy/invites.py`)
```python
import hashlib
import secrets
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.core.api.errors import ConflictError, DomainError, NotFoundError
from apps.core.sms import get_sms_provider
from apps.tenancy import staff as staff_service
from apps.tenancy.models import Invite, Membership

INVITE_TTL = timedelta(days=7)


def pending_invites_for_phone(phone: str):
    return Invite.objects.filter(
        phone=phone, accepted_at__isnull=True, revoked_at__isnull=True, expires_at__gt=timezone.now(),
        shop__deleted_at__isnull=True,
    ).select_related("shop", "role", "invited_by")


@transaction.atomic
def create_invite(*, actor: Membership, phone: str, role) -> Invite:
    staff_service.validate_role_choice(actor, role)
    if Membership.objects.filter(shop=actor.shop, user__phone=phone).exclude(status="removed").exists():
        raise ConflictError("This person is already on your staff.", code="invite.already_member")
    Invite.objects.filter(shop=actor.shop, phone=phone, accepted_at__isnull=True, revoked_at__isnull=True).update(
        revoked_at=timezone.now()
    )
    token = secrets.token_urlsafe(32)
    invite = Invite.objects.create(
        shop=actor.shop, phone=phone, role=role, invited_by=actor.user,
        token_hash=hashlib.sha256(token.encode()).hexdigest(), expires_at=timezone.now() + INVITE_TTL,
    )
    transaction.on_commit(
        lambda: get_sms_provider().send_text(
            phone=phone, body=f"You are invited to join {actor.shop.name} on FixPro. Log in with this number to accept."
        )
    )
    return invite


@transaction.atomic
def accept_invite(*, user, invite_id) -> Membership:
    # select_related(None): Postgres refuses FOR UPDATE across the nullable invited_by outer join.
    invite = (
        pending_invites_for_phone(user.phone).select_related(None).select_for_update().filter(pk=invite_id).first()
    )
    if invite is None:
        raise NotFoundError("Invite not found or expired.", code="invite.not_found")
    membership = Membership.objects.filter(user=user, shop=invite.shop).exclude(status="removed").first()
    if membership is None:
        membership = Membership.objects.create(
            user=user, shop=invite.shop, role=invite.role,
            status=Membership.StatusChoices.ACTIVE, display_name=user.name,
        )
    elif membership.status != Membership.StatusChoices.ACTIVE:
        raise DomainError("Your access to this shop is suspended.", code="invite.membership_suspended", status=409)
    invite.accepted_at = timezone.now()
    invite.save(update_fields=["accepted_at", "updated_at"])
    return membership


@transaction.atomic
def decline_invite(*, user, invite_id) -> None:
    updated = pending_invites_for_phone(user.phone).filter(pk=invite_id).update(revoked_at=timezone.now())
    if not updated:
        raise NotFoundError("Invite not found or expired.", code="invite.not_found")
```

### 0.16.2 Endpoints
| Method + path | Permission | Notes |
|---|---|---|
| `GET /invites/` | `staff.view` | pending invites of the current shop |
| `POST /invites/` `{phone, role_id}` | `staff.manage` | `@idempotent(required=False)`; audit `staff.invited` |
| `DELETE /invites/{id}/` | `staff.manage` | sets `revoked_at`; audit `staff.invite_revoked` |
| `GET /me/invites/` | authenticated, no shop header | `pending_invites_for_phone(request.user.phone)` with shop_name, role_name, inviter name |
| `POST /me/invites/{id}/accept/` | authenticated | returns `my_shops(user)`; audit `staff.invite_accepted` with `shop=invite.shop` |
| `POST /me/invites/{id}/decline/` | authenticated | 204 |

`GET /auth/me/` and the OTP verify response gain `"pending_invites": <count>`.

Error codes: `invite.already_member` 409, `invite.not_found` 404, `invite.membership_suspended` 409.

### 0.16.3 Backend tests
- Owner invites `+919111111111` as Engineer; that user logs in, sees one invite in `/me/invites/`, accepts, and `GET /shops/` now lists the shop with role Engineer
- the invited engineer calls `GET /staff/` → 403 (engineers lack `staff.view`); `PATCH /shops/current/` → 403
- Front Desk inviting → 403; Manager inviting as Manager (privileged role) → 403
- inviting an existing member → 409; a second invite revokes the first (only one pending)
- an expired invite cannot be accepted; another user cannot accept an invite for a different phone (404)
- a removed member can be invited again and accept (new membership row)
- audit rows exist for invited and accepted

### 0.16.4 Frontend
1. `src/features/staff/api.ts`: hooks for staff list, roles, invites, create/revoke invite, change role, suspend, reactivate, remove, and my invites, accept, decline.
2. `(app)/more/staff/page.tsx`: member list (avatar initials, display name, masked phone, role badge, status badge) and a "Pending invites" section with Revoke. An "Invite staff" button opens `InviteSheet` (10-digit keypad phone, role radio list from `/roles/` excluding Owner). Requires `staff.view`; action buttons only show with `usePermission("staff.manage")`.
3. `(app)/more/staff/detail/page.tsx?id=`: member detail with change role, suspend/reactivate, and remove (confirm dialog). Show server errors such as `staff.cannot_modify_owner` with `errorMessage()`.
4. `(app)/more/roles/page.tsx`: read-only list of roles with their permission names (translated labels under `permissions.<code>`).
5. `src/app/invites/page.tsx` (outside the shell): cards "{inviter} invited you to {shop} as {role}" with Accept / Decline. After accepting, `setSession` with the new shops, then `/home/`.
6. Update `nextRoute` callers to pass `pendingInvites` from `/auth/me/`. On Home, if `pendingInvites > 0`, show a banner linking to `/invites/`.
7. Enable the "Staff" and "Roles" rows on the More page.

### 0.16.5 🧑‍🔧 Device check
A second phone logs in with the invited number, accepts, sees only that shop, and cannot open Staff.

### Verify
```bash
cd backend && pytest && ruff check . && ruff format --check .
cd ../frontend && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```
**Done when:** the invite → accept flow works end to end on two devices, with audit rows.

---

## 0.17 Pilot deployment, monitoring, scheduled jobs and backups

**Depends on:** 0.16 · **Effort:** 1–1.5 days · 🧑‍🔧 needs account access
**Read first:** `docs/01-blueprint.md` §7, `docs/release.md`, `backend/config/settings/prod.py`

Re-check the free-tier limits of Render, Neon and Cloudflare this week; they change. `TODO(verify)`

### 0.17.1 Production cache and cron endpoint
1. In `prod.py`, add:
   ```python
   CACHES = {"default": {"BACKEND": "django.core.cache.backends.db.DatabaseCache", "LOCATION": "django_cache"}}
   CRON_SECRET = os.environ.get("CRON_SECRET", "")
   ```
   (Throttle counters must be shared by all gunicorn workers. LocMem cache is per process.) Add `CRON_SECRET = os.environ.get("CRON_SECRET", "dev-cron-secret")` to `base.py` as well, so dev and test have a value.
2. Create `backend/apps/core/cron.py`:
   ```python
   import hmac

   from django.conf import settings
   from django.core.management import call_command
   from rest_framework import permissions
   from rest_framework.response import Response
   from rest_framework.views import APIView

   from apps.core.api.errors import DomainError, NotFoundError

   # Name -> management command. Later subphases add entries (purge_trash, recurring_expenses, ...).
   CRON_JOBS = {
       "purge-otp": "purge_otp_challenges",
       "purge-idempotency": "purge_idempotency_records",
   }


   class CronView(APIView):
       """Free hosting has no scheduler; GitHub Actions calls this with X-Cron-Secret."""

       authentication_classes = ()
       permission_classes = (permissions.AllowAny,)

       def post(self, request, job):
           secret = request.headers.get("X-Cron-Secret", "")
           if not settings.CRON_SECRET or not hmac.compare_digest(secret, settings.CRON_SECRET):
               raise DomainError("Forbidden.", code="permission.denied", status=403)
           if job not in CRON_JOBS:
               raise NotFoundError()
           call_command(CRON_JOBS[job])
           return Response({"job": job, "status": "ok"})
   ```
   Route it in `apps/core/urls.py`: `path("internal/cron/<slug:job>/", CronView.as_view())`. Test: wrong secret → 403, unknown job → 404, correct secret runs the command (use `settings` fixture overrides).

### 0.17.2 Render (API) + Neon (database)
1. Neon: create a project in the region nearest India, database `fixpro`. Copy the **pooled** connection string for the app and the **direct** one for backups. Both need `sslmode=require`.
2. Create `render.yaml` at the repo root:
   ```yaml
   services:
     - type: web
       name: fixpro-api
       runtime: docker
       rootDir: backend
       plan: free
       healthCheckPath: /api/v1/health/
       dockerCommand: >-
         sh -c "python manage.py migrate --noinput && python manage.py createcachetable &&
         python manage.py collectstatic --noinput &&
         gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 60"
       envVars:
         - key: DJANGO_SETTINGS_MODULE
           value: config.settings.prod
         - key: SECRET_KEY
           generateValue: true
         - key: DATABASE_URL
           sync: false
         - key: ALLOWED_HOSTS
           sync: false          # e.g. fixpro-api.onrender.com
         - key: CSRF_TRUSTED_ORIGINS
           sync: false          # e.g. https://fixpro-api.onrender.com
         - key: CORS_ALLOWED_ORIGINS
           sync: false          # https://<pages-domain>,https://localhost,capacitor://localhost
         - key: NUM_PROXIES
           value: "1"           # TODO(verify) Render's proxy hop count
         - key: CRON_SECRET
           generateValue: true
         - key: SENTRY_DSN
           sync: false
         - key: APP_VERSION
           sync: false
         - key: OTP_TEST_NUMBERS
           sync: false          # pilot only: owner's number with a NON-trivial code until DLT SMS works
   ```
   Note: before DLT approval there is no real SMS. For the pilot you may put **your own staff numbers** in `OTP_TEST_NUMBERS`, each with a private six-digit code that is not `123456`. Record this as a known risk in `docs/PROJECT-STATE.md` and remove it in 1.19.
3. 🧑‍🔧 Create the service from the blueprint, fill in the `sync: false` values, deploy, and open `/api/v1/health/`.

### 0.17.3 Static web app (Cloudflare Pages or similar)
Settings: root `frontend`, build `pnpm install --frozen-lockfile && pnpm build`, output `out`, env `NEXT_PUBLIC_API_BASE_URL=https://<api>/api/v1`, `NEXT_PUBLIC_ENABLE_DEV_PAGES=false`. Add the Pages domain to the API's `CORS_ALLOWED_ORIGINS`.
For mobile builds, create `frontend/.env.production` (not committed; document it in `docs/release.md`) with the same API URL, then `pnpm build && npx cap sync`.

### 0.17.4 Cold-start UX
Render free instances sleep after idle time. In `client.ts`, start a 4-second timer per request; if it fires, set `useServerWakeStore.setState({ waking: true })`, and clear it when any response arrives. The shell shows a small banner "Waking up the server… this can take up to a minute" while `waking` is true.

### 0.17.5 Sentry
- Backend: already wired; set `SENTRY_DSN` on Render.
- Frontend: install the Sentry SDK for Capacitor + React (`@sentry/capacitor` and `@sentry/react`; `TODO(verify)` compatible versions). Create `src/lib/monitoring.ts` with `initMonitoring()`, called once in `providers.tsx` only when `env.sentryDsn` is set. Set `sendDefaultPii: false` and the release to `env.appVersion`.
- 🧑‍🔧 Trigger a deliberate error from the dev spikes page (dev build pointed at prod Sentry) and from a temporary backend shell command (`python manage.py shell -c "1/0"` will not report; use `sentry_sdk.capture_message("deploy test")`). Confirm both appear, then remove anything temporary.

### 0.17.6 Scheduled jobs and backups (GitHub Actions)
`.github/workflows/cron.yml`:
```yaml
name: Scheduled jobs
on:
  schedule:
    - cron: "30 21 * * *"   # 03:00 IST daily
  workflow_dispatch:
jobs:
  run:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        job: [purge-otp, purge-idempotency]
    steps:
      - run: |
          curl --fail --max-time 120 -X POST \
            -H "X-Cron-Secret: ${{ secrets.CRON_SECRET }}" \
            "${{ secrets.API_BASE_URL }}/internal/cron/${{ matrix.job }}/"
```
`.github/workflows/backup.yml`:
```yaml
name: Database backup
on:
  schedule:
    - cron: "0 21 * * *"    # 02:30 IST daily
  workflow_dispatch:
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Install PostgreSQL 16 client and age
        run: |
          sudo apt-get update
          sudo apt-get install -y postgresql-client-16 age || sudo apt-get install -y postgresql-client age
      - name: Dump, compress, encrypt
        env:
          DATABASE_URL: ${{ secrets.NEON_DIRECT_DATABASE_URL }}
          AGE_RECIPIENT: ${{ secrets.BACKUP_AGE_PUBLIC_KEY }}
        run: |
          STAMP=$(date -u +%Y%m%dT%H%M%SZ)
          pg_dump --format=custom --no-owner "$DATABASE_URL" | age -r "$AGE_RECIPIENT" > "fixpro-$STAMP.dump.age"
          echo "FILE=fixpro-$STAMP.dump.age" >> "$GITHUB_ENV"
      - name: Upload to private bucket (S3-compatible, e.g. Cloudflare R2)
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.BACKUP_S3_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.BACKUP_S3_SECRET }}
          AWS_DEFAULT_REGION: auto
        run: aws s3 cp "$FILE" "s3://${{ secrets.BACKUP_BUCKET }}/daily/$FILE" --endpoint-url "${{ secrets.BACKUP_S3_ENDPOINT }}"
```
🧑‍🔧 Generate the age key pair on your own machine (`age-keygen -o fixpro-backup.key`). Store the **private** key in your password manager, never in GitHub. Add the public key and the other values as repository secrets. Set a lifecycle rule on the bucket (for example, keep 30 daily backups).

Create `docs/runbooks/restore.md` with the restore steps: download → `age -d -i fixpro-backup.key file.dump.age > file.dump` → `pg_restore --no-owner --dbname "$TARGET_URL" file.dump` → run `python manage.py migrate --check` against it. The drill itself is done in 1.23.

### 0.17.7 Docs
Fill in `docs/release.md`: environments table (dev/staging URLs), where each secret lives (by name only), and how to build Android and iOS against the pilot API.

### Verify
- 🧑‍🔧 `curl https://<api>/api/v1/health/` returns `{"data": {"status": "healthy", ...}}`
- 🧑‍🔧 The phone on mobile data (Wi-Fi off) can sign in and onboard against the pilot API
- 🧑‍🔧 Run both scheduled workflows manually (`workflow_dispatch`); both are green and a backup file exists in the bucket
- `cd backend && pytest` (cron endpoint tests)

**Done when:** all four checks pass.

---

## 0.18 Phase 0 exit review

**Depends on:** 0.1–0.17 · **Effort:** ~0.5 day

1. Run the full checks: backend `pytest`, `ruff check`, `ruff format --check`, `makemigrations --check`, `check --deploy` (prod settings); frontend `lint`, `typecheck`, `test`, `build`, `e2e`.
2. 🧑‍🔧 Run the exit scenario on real devices: a new owner signs up on the iPhone and onboards a shop; invites an engineer; the engineer accepts on the Android phone and sees only that shop; language switching works on both; an audit entry exists for the invite and the acceptance.
3. Confirm `docs/printers.md` and `docs/decisions.md` hold measured spike results (0.8).
4. Update `docs/PROJECT-STATE.md`: Phase 0 done, next is 1.1, known issues.
5. In COMPLETION.md, mark Phase 0 `✅ Done` with the date.

**Done when:** every item above is ticked in COMPLETION.md.


---

# 📱 Phase 1: Core Repair MVP

> **Exit criteria:** 100 % of new jobs at your shop go through FixPro for one full week: customers, devices with validated IMEI, job sheets, statuses, payments, GST and non-GST invoices, PDF and thermal printing, tracking links, in English, Hindi and Hinglish. No isolation or invoice-numbering bugs. A backup restore has been tested.

Every new endpoint in Phase 1 follows **R2**, with happy-path, forbidden and other-shop tests. Every new screen follows **R5**.

---

## 1.1 Postgres search and per-shop catalogs (brands, accessories)

**Depends on:** Phase 0 · **Effort:** ~1 day
**Read first:** `docs/02-database-schema.md` §4.2 (`shop_brand`, `accessory_option`), §6; `backend/apps/tenancy/services.py`

### 1.1.1 Enable `pg_trgm`
`python manage.py makemigrations core --empty -n enable_pg_trgm`, and put this in the migration:
```python
from django.contrib.postgres.operations import TrigramExtension
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("core", "0001_initial")]
    operations = [TrigramExtension()]
```
(Neon and the Docker image both ship `pg_trgm`.)

### 1.1.2 Models (`backend/apps/tenancy/models.py`, R1)
```python
from django.db.models.functions import Lower

from apps.core.models import ShopScopedModel


class DeviceCategory(models.TextChoices):
    MOBILE = "mobile", _("Mobile")
    LAPTOP = "laptop", _("Laptop / Computer")
    TV = "tv", _("TV")
    APPLIANCE = "appliance", _("Appliance")
    OTHER = "other", _("Other")


class ShopBrand(ShopScopedModel):
    device_category = models.CharField(max_length=20, choices=DeviceCategory.choices)
    name = models.CharField(max_length=60)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=100)

    class Meta:
        ordering = ["sort_order", "name"]
        constraints = [
            models.UniqueConstraint(
                Lower("name"), "shop", "device_category",
                condition=models.Q(deleted_at__isnull=True), name="brand_uniq_name_per_cat",
            ),
        ]


class AccessoryOption(ShopScopedModel):
    name = models.CharField(max_length=60)
    is_default = models.BooleanField(default=False)  # pre-ticked in the intake checklist
    sort_order = models.PositiveSmallIntegerField(default=100)

    class Meta:
        ordering = ["sort_order", "name"]
```
`ShopScopedModel` imports from `apps.core`, and `apps.core` refers to `"tenancy.Shop"` by string, so there is no circular import.

### 1.1.3 Seed defaults on shop creation
Create `backend/apps/tenancy/seeds.py`:
```python
DEFAULT_BRANDS = {
    "mobile": ["Samsung", "Apple", "Xiaomi", "Redmi", "Vivo", "Oppo", "Realme", "OnePlus", "Motorola", "Nokia",
               "Poco", "iQOO", "Infinix", "Tecno", "Lava", "Google", "Nothing"],
    "laptop": ["HP", "Dell", "Lenovo", "Asus", "Acer", "Apple", "MSI"],
    "tv": ["Samsung", "LG", "Sony", "Mi", "TCL", "OnePlus", "Panasonic"],
    "appliance": ["LG", "Samsung", "Whirlpool", "Godrej", "Voltas", "Bajaj"],
}
DEFAULT_ACCESSORIES = [
    ("SIM tray", True), ("SIM card", False), ("Memory card", False), ("Back cover / case", False),
    ("Charger", False), ("Cable", False), ("Battery", False), ("Box", False), ("Earphones", False),
]
```
In `on_shop_created(shop)` (from 0.7), `bulk_create` `ShopBrand` rows for **every** category in `DEFAULT_BRANDS` (`sort_order` = list index) and the `AccessoryOption` rows. Then write a data migration that calls the same seeding for existing shops that have no brands, using `apps.get_model` (copy the two constants into the migration file so later edits don't change history).

### 1.1.4 Endpoints (R2)
| Path | list / retrieve | create / partial_update / destroy |
|---|---|---|
| `/brands/` (filter `?device_category=`) | `jobs.view` | `shop.settings` |
| `/accessory-options/` | `jobs.view` | `shop.settings` |

A duplicate brand name in the same category → 400 `fields.name`. Catch the `IntegrityError` in `perform_create` and raise `ValidationError({"name": ["Already exists"]})`.

### 1.1.5 Tests
- a new shop has 17 mobile brands and 9 accessory options; the data migration seeded existing shops
- this is the first concrete `ShopScopedModel`: `brand.delete()` is soft, and `ShopBrand.objects` hides it
- Engineer can list but not create; Shop B's brand → 404
- the case-insensitive duplicate (`samsung` vs `Samsung`) is rejected

### Verify
`cd backend && pytest && ruff check . && ruff format --check . && python manage.py makemigrations --check --dry-run`

**Done when:** brands and accessories exist for every shop and are editable by the owner.

---

## 1.2 Customers API

**Depends on:** 1.1 · **Effort:** ~1 day
**Read first:** `docs/02-database-schema.md` §4.4, §8 (masking rules), `backend/apps/core/phone.py`

### 1.2.1 App and model
`python manage.py startapp customers apps/customers`, then register `apps.customers.apps.CustomersConfig`.
```python
from django.contrib.postgres.indexes import GinIndex
from django.db import models
from django.db.models import Q

from apps.core.models import ShopScopedModel


class Customer(ShopScopedModel):
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=16, null=True, blank=True)  # E.164; null allowed for rough entries
    alt_phone = models.CharField(max_length=16, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    address = models.TextField(blank=True, default="")
    notes = models.TextField(blank=True, default="")
    preferred_locale = models.CharField(max_length=8, default="en")
    whatsapp_opt_in = models.BooleanField(default=True)  # transactional updates; TODO(verify) DPDP consent wording
    sms_opt_in = models.BooleanField(default=True)
    last_job_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["shop", "-updated_at"], name="cust_shop_updated_idx"),
            GinIndex(fields=["name"], name="cust_name_trgm", opclasses=["gin_trgm_ops"]),
            GinIndex(fields=["phone"], name="cust_phone_trgm", opclasses=["gin_trgm_ops"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["shop", "phone"],
                condition=Q(deleted_at__isnull=True) & Q(phone__isnull=False),
                name="cust_uniq_phone_per_shop",
            ),
        ]
```

### 1.2.2 Visibility helper
Create `backend/apps/customers/visibility.py`:
```python
from apps.core.phone import mask_phone


def can_see_customer_phone(membership) -> bool:
    """Masking applies only when the shop turned it on AND the role lacks customers.see_phone."""
    return membership.has_perm("customers.see_phone") or not membership.shop.mask_phone_for_engineers


def present_phone(phone: str | None, membership) -> str | None:
    if phone is None:
        return None
    return phone if can_see_customer_phone(membership) else mask_phone(phone)
```

### 1.2.3 Serializer
- Fields: `id, name, phone, alt_phone, email, address, notes, preferred_locale, whatsapp_opt_in, sms_opt_in, last_job_at, version, created_at, updated_at`, plus read-only `phone_masked: bool`.
- `validate_phone` / `validate_alt_phone`: `normalize_phone`, or `None` / `""` when empty.
- `validate(attrs)`: if the phone already belongs to another live customer of this shop → `ValidationError({"phone": ["customer.phone_exists"]})`. The client shows a "Use existing customer" action and looks the customer up with `?phone=`.
- `to_representation`: replace `phone` and `alt_phone` using `present_phone(..., request.membership)` and set `phone_masked`.
- `update()`: if the caller cannot see the phone, ignore incoming `phone` / `alt_phone` (otherwise saving a form with a masked value would overwrite the real number).

### 1.2.4 ViewSet (R2)
`CustomerViewSet(ShopScopedViewSet)`:
```python
permission_map = {
    "list": "customers.view", "retrieve": "customers.view", "create": "customers.create",
    "partial_update": "customers.edit", "destroy": "customers.delete",
}
```
Filters in `get_queryset()`:
- `?q=`: strip spaces. If it has 3 or more digits → `phone__contains=<digits>` **or** `alt_phone__contains`; otherwise `name__icontains=q` (the trigram index makes this fast).
- `?phone=<E.164 or 10 digits>`: exact match after `normalize_phone` (lookup before create).
- Ordering: `?ordering=name|-updated_at|-last_job_at`.

`create` is decorated with `@idempotent(required=False)`.
Audit: `customer.created`, `customer.updated` (changed fields only, but never log full phone numbers: put `mask_phone()` values in `before`/`after`), `customer.deleted`.

### 1.2.5 Tests
- create, retrieve, update with `If-Match`, soft delete
- duplicate phone → 400 `customer.phone_exists`; the same phone in Shop B is allowed
- `?q=3210` finds by phone suffix; `?q=rah` finds "Rahul"
- masking matrix: with `mask_phone_for_engineers=True`, Engineer sees `+91XXXXXX3210` and `phone_masked=true`; Front Desk sees the full number; with the toggle off, Engineer sees the full number
- Engineer PATCH (if given `customers.edit` in a custom role) with a masked phone does not change the stored phone
- Engineer cannot create (default role lacks `customers.create`) → 403; Shop B's customer → 404 for GET, PATCH and DELETE

**Done when:** customers can be created and found by partial phone or name in one query (check with `django_assert_max_num_queries(3)` around the list call).

---

## 1.3 Devices and IMEI API

**Depends on:** 1.2 · **Effort:** ~1 day
**Read first:** `docs/02-database-schema.md` §4.5, `backend/apps/core/validators.py` (`validate_imei_luhn`), `docs/01-blueprint.md` §6

### 1.3.1 Models (`apps/devices`)
```python
class Device(ShopScopedModel):
    customer = models.ForeignKey("customers.Customer", on_delete=models.PROTECT, related_name="devices")
    category = models.CharField(max_length=20, choices=DeviceCategory.choices, default=DeviceCategory.MOBILE)
    brand = models.ForeignKey("tenancy.ShopBrand", on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    brand_text = models.CharField(max_length=60, blank=True, default="")  # used when brand is not in the list
    model = models.CharField(max_length=100, blank=True, default="")
    color = models.CharField(max_length=40, blank=True, default="")
    notes = models.TextField(blank=True, default="")

    class Meta:
        indexes = [models.Index(fields=["shop", "customer"], name="device_shop_customer_idx")]


class DeviceIdentifier(ShopScopedModel):
    class Type(models.TextChoices):
        IMEI1 = "imei1"
        IMEI2 = "imei2"
        SERIAL = "serial"
        MEID = "meid"

    class CapturedVia(models.TextChoices):
        MANUAL = "manual"
        BARCODE = "barcode"
        OCR = "ocr"

    device = models.ForeignKey(Device, on_delete=models.PROTECT, related_name="identifiers")
    type = models.CharField(max_length=10, choices=Type.choices)
    value = models.CharField(max_length=32)
    luhn_valid = models.BooleanField(null=True)  # null for serial / meid
    captured_via = models.CharField(max_length=10, choices=CapturedVia.choices, default=CapturedVia.MANUAL)

    class Meta:
        indexes = [
            models.Index(fields=["shop", "value"], name="devid_shop_value_idx"),
            GinIndex(fields=["value"], name="devid_value_trgm", opclasses=["gin_trgm_ops"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["device", "type"], condition=Q(deleted_at__isnull=True), name="devid_uniq_type_per_device"
            ),
        ]
```
Move `DeviceCategory` from `tenancy/models.py` to `apps/core/choices.py` and import it in both apps, to avoid a cross-app import tangle.

### 1.3.2 IMEI policy (`apps/devices/services.py`)
```python
def clean_identifier(type_: str, value: str, confirm_invalid: bool) -> tuple[str, bool | None]:
    """Returns (normalised value, luhn_valid). IMEIs must be 15 digits; a failed check digit
    is stored only when the user explicitly confirmed it (some cheap phones carry invalid IMEIs)."""
    v = re.sub(r"[\s\-]", "", value).upper()
    if type_ in ("imei1", "imei2"):
        if not re.fullmatch(r"\d{15}", v):
            raise DomainError("IMEI must be exactly 15 digits.", code="imei.invalid_format", status=400,
                              fields={"value": ["imei.invalid_format"]})
        try:
            validate_imei_luhn(v)
            return v, True
        except DjangoValidationError:
            if not confirm_invalid:
                raise DomainError("IMEI check digit is wrong.", code="imei.invalid_check_digit", status=400,
                                  fields={"value": ["imei.invalid_check_digit"]}) from None
            return v, False
    if not v or len(v) > 32:
        raise DomainError("Enter a serial number up to 32 characters.", code="validation.failed", status=400)
    return v, None
```
`create_device(*, shop, actor, customer, data)` and `update_device(...)` run in a transaction. They create or replace identifiers (soft-delete removed types), and call `clean_identifier` for each.

### 1.3.3 Endpoints
- `/devices/` (R2): list/retrieve `customers.view`, create `customers.create`, partial_update `customers.edit`, destroy `customers.delete`. Filters: `?customer=<id>` and `?imei=<4–15 digits>` (`identifiers__value__endswith`). The serializer nests `identifiers: [{type, value, captured_via, luhn_valid}]` (write: list of `{type, value, captured_via, confirm_invalid?}`) and `customer_id` as `ShopScopedPKField`. `brand_id` is a `ShopScopedPKField` too. `brand_name` is read-only (brand.name or brand_text).
- `GET /devices/imei-lookup/?value=<15 digits>` (`customers.view`): returns `{value, luhn_valid, matches: [{device_id, customer_id, customer_name, model, last_job_no?}]}` for this shop only. `last_job_no` is filled after 1.5. Used for the duplicate warning in 1.10.
- `GET /customers/{id}/devices/` is the same as `/devices/?customer=`, so do not create a second route.

### 1.3.4 Tests
- valid IMEI `490154203237518` stored with `luhn_valid=true`; bad check digit → 400 `imei.invalid_check_digit`; same with `confirm_invalid=true` → stored with `luhn_valid=false`; 14 digits → `imei.invalid_format`
- two IMEIs on one device; duplicate type on one device → 400
- a `customer_id` from Shop B → 400 (`does_not_exist`), **not** 201
- `?imei=7518` finds the device; the lookup never returns Shop B devices
- Python and TypeScript Luhn agree: add `490154203237518` and `356938035643809` to both test suites

**Done when:** a device with two IMEIs is created and found by the last 4 digits.

---

## 1.4 Customers and devices screens

**Depends on:** 1.3 · **Effort:** 2 days
**Read first:** `design/01-design-system.md` §4.3, `design/02-information-architecture.md` §6, `design/03-screen-roadmap.md` "PHASE 4 — CUSTOMER MANAGEMENT"

1. `src/features/customers/api.ts`: `useCustomers(q)` (with `useInfiniteQuery`, page param from `meta.next`), `useCustomer(id)`, `useCreateCustomer()`, `useUpdateCustomer()` (sends `ifMatch: customer.version`), `useDeleteCustomer()`, `useCustomerByPhone(phone)`.
2. `src/features/devices/api.ts`: `useDevices(customerId)`, `useCreateDevice()`, `useUpdateDevice()`, `useBrands(category)`.
3. `(app)/customers/page.tsx`: search bar (debounced 300 ms), filter chips (`All` now; `With dues` appears after 1.11), monogram avatar rows (name, formatted phone, last job date), infinite scroll, a FAB `+` opening `CustomerFormSheet`. All states (R5).
4. `CustomerFormSheet` (create/edit): name, phone (10-digit keypad input), alt phone, email, address, notes, language, WhatsApp/SMS opt-in switches. Zod schema in `features/customers/schema.ts`. Before submitting a new customer, look up `?phone=`. If found, show "This number belongs to {name}" with an **Open customer** button instead of creating. On `409` (`concurrency.version_mismatch`), show "Someone changed this customer. Reload" and refetch.
5. `(app)/customers/detail/page.tsx?id=`: summary card (name, phone with Call `tel:` and WhatsApp `https://wa.me/<digits>` buttons — hidden when `phone_masked`), devices list with "Add device", and a placeholder card "Repair history" (filled in 1.9). Edit and Delete in a `…` menu, controlled by permissions.
6. `DeviceFormSheet`: category, brand picker (searchable list from `/brands/?device_category=`, plus "Other…" which shows a `brand_text` input), model, colour, and identifiers. Each IMEI field validates live with `isValidIMEI()`. If the user insists on an invalid IMEI, show a confirm dialog and send `confirm_invalid: true`. Scan buttons come in 1.10.
7. i18n keys (namespace `customers`, `devices`) in all three locales.
8. Vitest: the customer Zod schema; IMEI field behaviour (`isValidIMEI` and formatting).

**Verify:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, and 🧑‍🔧 create a customer and a device on a phone at 360 px.
**Done when:** customers and devices can be added, edited, searched and soft-deleted from the app.

---

## 1.5 Jobs core API (job sheet, numbering, lock encryption)

**Depends on:** 1.4 · **Effort:** 2–3 days
**Read first:** `docs/02-database-schema.md` §4.6, §5, §7; `docs/domain-glossary.md`

### 1.5.1 Field encryption
Add `cryptography>=42` to `requirements.txt`. In `base.py`: `FIELD_ENCRYPTION_KEYS = [k for k in os.environ.get("FIELD_ENCRYPTION_KEYS", "").split(",") if k]`. In `dev.py` and `test.py`, set a fixed development key generated once with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`. In `prod.py`, raise `ImproperlyConfigured` if the list is empty. Add `FIELD_ENCRYPTION_KEYS=` to `.env.example` and `render.yaml` (`sync: false`).

`backend/apps/core/crypto.py`:
```python
from cryptography.fernet import Fernet, MultiFernet
from django.conf import settings


def _fernet() -> MultiFernet:
    # First key encrypts; all keys decrypt (allows key rotation).
    return MultiFernet([Fernet(k.encode()) for k in settings.FIELD_ENCRYPTION_KEYS])


def encrypt_str(value: str) -> bytes:
    return _fernet().encrypt(value.encode())


def decrypt_str(token: bytes) -> str:
    return _fernet().decrypt(bytes(token)).decode()
```
🧑‍🔧 Store the production key in your password manager. Losing it makes every saved lock code unreadable.

### 1.5.2 Models (`apps/jobs/models.py`)
```python
import secrets

from django.conf import settings
from django.db import models
from django.db.models import Q

from apps.core.models import ShopScopedModel, TimeStampedModel, UUIDModel


def new_tracking_token() -> str:
    return secrets.token_urlsafe(24)  # 192 bits, 32 URL-safe characters


class JobStatus(models.TextChoices):
    RECEIVED = "received"
    DIAGNOSING = "diagnosing"
    AWAITING_APPROVAL = "awaiting_approval"
    AWAITING_PARTS = "awaiting_parts"
    IN_REPAIR = "in_repair"
    REPAIRED = "repaired"
    READY_FOR_PICKUP = "ready_for_pickup"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    RETURNED_UNREPAIRED = "returned_unrepaired"


class JobCounter(models.Model):
    shop = models.OneToOneField("tenancy.Shop", on_delete=models.PROTECT, primary_key=True, related_name="+")
    last_job_no = models.PositiveIntegerField(default=0)


class Job(ShopScopedModel):
    class Kind(models.TextChoices):
        FULL = "full"
        ROUGH = "rough"  # Rough Reg UI arrives in Phase 2

    class Priority(models.TextChoices):
        LOW = "low"
        NORMAL = "normal"
        URGENT = "urgent"

    class Source(models.TextChoices):
        WALK_IN = "walk_in"
        PHONE = "phone"
        SITE_LEAD = "site_lead"

    class LockType(models.TextChoices):
        NONE = "none"
        PIN = "pin"
        PATTERN = "pattern"
        PASSWORD = "password"

    job_no = models.PositiveIntegerField()
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.FULL)
    customer = models.ForeignKey("customers.Customer", on_delete=models.PROTECT, related_name="jobs")
    device = models.ForeignKey("devices.Device", on_delete=models.PROTECT, related_name="jobs")
    assigned_to = models.ForeignKey(
        "tenancy.Membership", on_delete=models.PROTECT, null=True, blank=True, related_name="assigned_jobs"
    )
    status = models.CharField(max_length=24, choices=JobStatus.choices, default=JobStatus.RECEIVED)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.NORMAL)
    source = models.CharField(max_length=12, choices=Source.choices, default=Source.WALK_IN)
    fault_description = models.TextField()
    device_condition = models.TextField(blank=True, default="")
    condition_tags = models.JSONField(default=list, blank=True)  # e.g. ["screen_cracked", "water_damage"]
    lock_type = models.CharField(max_length=10, choices=LockType.choices, default=LockType.NONE)
    lock_value_enc = models.BinaryField(null=True, blank=True)
    estimate_paise = models.BigIntegerField(default=0)
    expected_date = models.DateField(null=True, blank=True)
    received_at = models.DateTimeField()
    ready_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    delivered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    warranty_days = models.PositiveIntegerField(default=0)
    warranty_until = models.DateField(null=True, blank=True)
    tracking_token = models.CharField(max_length=64, unique=True, default=new_tracking_token)
    is_locked = models.BooleanField(default=False)
    cancel_reason = models.TextField(blank=True, default="")
    total_paise = models.BigIntegerField(default=0)  # cached from line items (1.11)
    cost_paise = models.BigIntegerField(default=0)   # cached; visible only with money.see_cost_profit

    class Meta:
        constraints = [models.UniqueConstraint(fields=["shop", "job_no"], name="job_uniq_no_per_shop")]
        indexes = [
            models.Index(fields=["shop", "status", "-updated_at"], name="job_shop_status_idx"),
            models.Index(fields=["shop", "assigned_to", "status"], name="job_shop_assignee_idx"),
            models.Index(fields=["shop", "customer"], name="job_shop_customer_idx"),
            models.Index(fields=["shop", "-created_at"], name="job_shop_created_idx"),
        ]


class JobAccessory(UUIDModel):
    shop = models.ForeignKey("tenancy.Shop", on_delete=models.PROTECT, related_name="+")
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="accessories")
    name = models.CharField(max_length=60)


class JobNote(ShopScopedModel):
    class Visibility(models.TextChoices):
        INTERNAL = "internal"
        CUSTOMER = "customer"  # shown on the tracking page (1.18)

    job = models.ForeignKey(Job, on_delete=models.PROTECT, related_name="notes")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    body = models.TextField()
    visibility = models.CharField(max_length=10, choices=Visibility.choices, default=Visibility.INTERNAL)


class JobStatusHistory(UUIDModel, TimeStampedModel):
    """Append-only (no update/delete code paths)."""

    shop = models.ForeignKey("tenancy.Shop", on_delete=models.PROTECT, related_name="+")
    job = models.ForeignKey(Job, on_delete=models.PROTECT, related_name="status_history")
    from_status = models.CharField(max_length=24, blank=True, default="")
    to_status = models.CharField(max_length=24)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    changed_at = models.DateTimeField()
    note = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["changed_at"]
```
Add `JobCounter` creation to `on_shop_created(shop)`, plus a data migration that creates counters for existing shops.

### 1.5.3 Services (`apps/jobs/services.py`)
```python
def allocate_job_no(shop) -> int:
    """Must run inside the same transaction as the Job insert (docs/02 §5)."""
    counter = JobCounter.objects.select_for_update().get(shop=shop)
    counter.last_job_no += 1
    counter.save(update_fields=["last_job_no"])
    return counter.last_job_no


@transaction.atomic
def create_job(*, shop, actor, membership, data: dict) -> Job:
    """data comes from JobCreateSerializer.validated_data (see 1.5.4)."""
```
`create_job` steps, in order:
1. Customer: use `data["customer"]` (already loaded with `ShopScopedPKField`), or create one from `data["new_customer"]` with the 1.2 serializer logic, reusing an existing customer when the phone matches.
2. Device: use `data["device"]` (it must belong to that customer, else `DomainError(code="job.device_customer_mismatch", status=400)`), or create one from `data["new_device"]` with `create_device()`.
3. `job_no = allocate_job_no(shop)`.
4. Create the `Job` with `received_at=timezone.now()`, `warranty_days=shop.default_warranty_days`, `created_by=actor`, and `lock_value_enc=encrypt_str(value)` when `lock_type != "none"` and a value is given.
5. Accessories: `bulk_create` from `data["accessories"]` (list of names).
6. First history row: `from_status=""`, `to_status="received"`, `changed_by=actor`.
7. Optional first note: `data["internal_note"]` → `JobNote(visibility="internal")`.
8. `customer.last_job_at = now`; save.
9. `record_audit(actor=actor, shop=shop, action="job.created", entity=job, after={...job_no, customer_id, device_id})`.
10. Hook (empty for now): `on_job_created(job)`. 1.11 adds the advance payment; 1.19 adds the "job received" message.

`update_job(*, job, actor, membership, data)`: fields `fault_description, device_condition, condition_tags, priority, estimate_paise, expected_date, lock_type, lock_value, accessories`. Raise `ConflictError(code="job.locked")` when `job.is_locked`. Audit `job.updated` with changed fields; lock values are recorded as `"***"`.

`reveal_lock(*, job, actor, request)`: returns the decrypted value and writes the audit entry `job.lock_viewed`.

### 1.5.4 API
- `JobCreateSerializer`: `customer_id` (`ShopScopedPKField`) **or** `new_customer` (nested customer serializer); `device_id` **or** `new_device` (nested device serializer with identifiers); `fault_description` (required); `device_condition`, `condition_tags` (list of known tags from `apps/jobs/constants.py` `CONDITION_TAGS`); `accessories` (list of strings, max 20); `lock_type`, `lock_value` (write-only; PIN 4–16 digits; pattern `^[1-9](-[1-9]){3,8}$` with no repeated node; password 1–64 chars); `estimate_paise` (≥ 0); `expected_date` (not in the past, IST); `priority`; `assigned_to_id` (`ShopScopedPKField` on active `Membership`); `internal_note`. Exactly one of `customer_id` / `new_customer` must be given (same for the device).
- `JobSerializer` (read): every field **except** `lock_value_enc`, with `has_lock` (bool), nested `customer` `{id, name, phone (masked per 1.2)}`, nested `device` `{id, brand_name, model, identifiers}` (IMEIs shown in full; if you want them masked for engineers too, add that rule later), `assigned_to` `{id, display_name}`, `accessories`, and `cost_paise` **only** when `membership.has_perm("money.see_cost_profit")` (remove the key otherwise).
- `JobViewSet(ShopScopedViewSet)`:
  ```python
  permission_map = {
      "list": "jobs.view", "retrieve": "jobs.view", "create": "jobs.create",
      "partial_update": "jobs.edit", "destroy": "jobs.delete", "lock": "jobs.view_device_lock",
      "notes": "jobs.view", "add_note": "jobs.edit",
  }
  ```
  - `create` → `@idempotent()` (**required**), calls `create_job`, returns `201` with `JobSerializer`.
  - `partial_update` → checks the version with `save_with_version`-style logic inside `update_job` (pass `expected_version(request)`).
  - `destroy` → soft delete; only allowed for status `received` or `cancelled` (else 409 `job.cannot_delete_in_progress`); audit `job.deleted`.
  - `GET /jobs/{id}/lock/` → `{lock_type, lock_value}`.
  - `GET /jobs/{id}/notes/` and `POST /jobs/{id}/notes/` `{body, visibility}`.
  - List filters come in 1.8; for now `?customer=` and default ordering `-created_at`.

### 1.5.5 Tests
- full create with `new_customer` + `new_device` (with IMEI) + accessories + PIN lock; `job_no == 1`, next is 2; history row exists; audit `job.created` exists
- Idempotency: the same key twice → one job
- **Concurrency** (`@pytest.mark.django_db(transaction=True)`):
  ```python
  from concurrent.futures import ThreadPoolExecutor

  from django.db import connection


  def test_parallel_creates_get_unique_numbers(world):
      customer, device = make_customer_and_device(world.shop_a)

      def one(_):
          try:
              return create_job(
                  shop=world.shop_a, actor=world.owner_a, membership=world.membership(world.owner_a, world.shop_a),
                  data={"customer": customer, "device": device, "fault_description": "x"},
              ).job_no
          finally:
              connection.close()

      with ThreadPoolExecutor(max_workers=10) as pool:
          numbers = list(pool.map(one, range(10)))
      assert sorted(numbers) == list(range(1, 11))
  ```
- the lock is never in `JobSerializer` output; `GET /lock/` as a role without `jobs.view_device_lock` → 403; with it → value plus an audit row; the DB column is not the plain text
- Engineer list output has no `cost_paise`; Owner output has it
- `device_id` of another customer → 400; Shop B job → 404 everywhere

**Done when:** jobs can be created through the API with unique numbers under concurrency, and lock values are encrypted.

---

## 1.6 File storage and job photos

**Depends on:** 1.5 · **Effort:** ~1.5 days
**Read first:** `docs/01-blueprint.md` §7 (files), `docs/02-database-schema.md` §4.6 (`job_photo`)

### 1.6.1 Storage
1. Add `django-storages[s3]>=1.14` and `Pillow>=10.4` to `requirements.txt`.
2. Dev/test: `STORAGES["default"]` = `FileSystemStorage` under `MEDIA_ROOT`. In `config/urls.py`, serve `MEDIA_URL` only `if settings.DEBUG` (development convenience; not authenticated).
3. Prod: S3-compatible bucket (Cloudflare R2; re-check its free allowance, `TODO(verify)`):
   ```python
   STORAGES["default"] = {
       "BACKEND": "storages.backends.s3.S3Storage",
       "OPTIONS": {
           "bucket_name": os.environ["MEDIA_BUCKET"],
           "endpoint_url": os.environ["MEDIA_S3_ENDPOINT"],
           "access_key": os.environ["MEDIA_S3_KEY_ID"],
           "secret_key": os.environ["MEDIA_S3_SECRET"],
           "region_name": "auto",
           "default_acl": "private",
           "querystring_auth": True,
           "querystring_expire": 300,   # signed URLs valid for 5 minutes
           "file_overwrite": False,
       },
   }
   ```
   Add the four variables to `render.yaml` (`sync: false`). The bucket must be **private**.

### 1.6.2 Model and image processing
`JobPhoto(ShopScopedModel)`: `job` FK, `file_key` (CharField 255), `kind` (`before`/`after`/`damage`/`other`), `caption`, `size_bytes`, `width`, `height`, `taken_by` FK user.

`apps/core/images.py`:
```python
from io import BytesIO

from PIL import Image, ImageOps

from apps.core.api.errors import DomainError

MAX_UPLOAD_BYTES = 8 * 1024 * 1024
MAX_SIDE = 1600


def normalise_photo(fileobj) -> tuple[bytes, int, int]:
    """Validates an upload is a real image, fixes rotation, strips metadata (GPS!), resizes, re-encodes JPEG."""
    if fileobj.size > MAX_UPLOAD_BYTES:
        raise DomainError("Photo is too large (max 8 MB).", code="upload.too_large", status=400)
    try:
        image = Image.open(fileobj)
        image.verify()
        fileobj.seek(0)
        image = ImageOps.exif_transpose(Image.open(fileobj)).convert("RGB")
    except Exception:
        raise DomainError("This file is not a supported image.", code="upload.invalid_image", status=400) from None
    image.thumbnail((MAX_SIDE, MAX_SIDE))
    out = BytesIO()
    image.save(out, format="JPEG", quality=80, optimize=True)  # no EXIF is written
    return out.getvalue(), image.width, image.height
```
Service `add_job_photo(*, job, actor, upload, kind, caption)` saves to `default_storage` under `shops/{shop_id}/jobs/{job_id}/photos/{uuid4}.jpg`. Maximum 20 photos per job (`job.photo_limit` 422).

### 1.6.3 Endpoints
- `POST /jobs/{id}/photos/` (multipart `file`, `kind`, `caption`) — `jobs.edit`; `@idempotent(required=False)`.
- `GET /jobs/{id}/photos/` — `jobs.view`; each item has `url = default_storage.url(file_key)` (signed in prod, 5 min).
- `DELETE /jobs/{id}/photos/{photo_id}/` — `jobs.edit`; soft delete. The file stays until trash purge (1.20).

### 1.6.4 Tests
Use `settings.STORAGES` overridden to a temp `FileSystemStorage` (`tmp_path`).
- PNG with EXIF GPS → stored JPEG has no EXIF and the longest side ≤ 1600
- text file renamed `.jpg` → 400 `upload.invalid_image`; 9 MB → 400 `upload.too_large`
- key contains the shop ID; Shop B cannot list or delete it (404)

### 1.6.5 Frontend
- `src/native/camera.ts` (R7, `@capacitor/camera`): `takePhoto()` returns a `Blob` (`quality: 70`, `width: 1600`, `resultType: Uri` → fetch to Blob). Web fallback: a hidden `<input type="file" accept="image/*" capture="environment">`. Add Android/iOS camera permission strings.
- `src/lib/images/compress.ts`: draws to a canvas, max 1600 px, JPEG 0.7. Test the size maths only (pure function `fitWithin(w, h, max)`).
- `PhotoStrip` component: thumbnails, add button, delete (with permission), and a full-screen viewer.

**Done when:** photos upload from a phone, show as thumbnails, and contain no location metadata.

---

## 1.7 Job intake wizard (8 steps)

**Depends on:** 1.6 · **Effort:** 3 days
**Read first:** `design/02-information-architecture.md` §4 (NEW JOB SHEET), `design/03-screen-roadmap.md` §3.2, `design/04-component-library.md` §2.4

### 1.7.1 Supporting endpoint
`GET /staff/assignable/` (add the `assignable` action to `StaffViewSet`, permission `jobs.create`): active members whose role has `jobs.change_status`, returning only `{id, display_name, role_name}`. Engineers can create jobs but cannot list staff, so this endpoint gives them just enough.

### 1.7.2 Draft state
`src/features/jobs/intake-store.ts` (Zustand with `persist` to `localStorage` under `fixpro.intakeDraft.<shopId>`; drafts hold no secrets **except** the lock value, so exclude `lockValue` from `partialize`):
```ts
type IntakeDraft = {
  idempotencyKey: string;               // created when the draft starts; reused on every submit retry
  step: number;                          // 0..7
  customer: { id?: string; name: string; phone: string };
  device: { id?: string; category: string; brandId?: string; brandText?: string; model: string; color: string;
            identifiers: { type: "imei1" | "imei2" | "serial"; value: string; capturedVia: "manual" | "barcode" | "ocr";
                           confirmInvalid?: boolean }[] };
  conditionTags: string[]; deviceCondition: string; photos: { localId: string; blob?: Blob; kind: string }[];
  accessories: string[];
  faultDescription: string; lockType: "none" | "pin" | "pattern" | "password"; lockValue: string; internalNote: string;
  estimatePaise: number; expectedDate: string | null; advancePaise: number; advanceMode: "cash" | "upi" | "card" | "bank";
  assignedToId: string | null; priority: "low" | "normal" | "urgent";
};
```
Photos are uploaded **after** the job is created (the job ID is needed), so keep the blobs in memory only (excluded from `persist`).

### 1.7.3 Steps (`(app)/jobs/new/page.tsx` with a `StepProgressBar`)
| # | Step | Required? | Content |
|---|---|---|---|
| 1 | Customer | yes | search existing by phone/name (`useCustomers`); or "New customer" (name + phone) |
| 2 | Device | brand + model | pick one of the customer's devices, or new: category, brand picker, model, colour, IMEI 1, IMEI 2, serial (manual; scan buttons in 1.10) |
| 3 | Condition | no | chips from `CONDITION_TAGS` (Screen cracked, Back glass broken, Dents, Scratches, Water damage, Dead / no power, Bent frame), free text, photos (`kind=before/damage`) |
| 4 | Accessories | no | checklist from `/accessory-options/` (defaults pre-ticked) + "Other" text |
| 5 | Problem | fault text | fault chips (Display, Battery, Charging, Speaker/Mic, Camera, Software, Water damage) that append text + free text; lock type selector; PIN/password input or `PatternInput` (3×3 grid, records the order as "1-2-3-6-9") |
| 6 | Estimate | no | `MoneyInput` for estimate (₹, uses `rupeesToPaise`), expected date (date picker, min today), advance amount + mode (**hidden until 1.12**) |
| 7 | Assignment | no | engineer list from `/staff/assignable/`, priority |
| 8 | Confirmation | — | summary of everything; edit links back to each step; "Create job sheet" |

Rules:
- "Next" validates only the current step (Zod schema per step in `features/jobs/intake-schema.ts`, with tests).
- Steps 3, 4, 6 and 7 have a "Skip" button. Target: under 60 seconds with customer, device and problem only.
- Submit: `POST /jobs/` with `idempotencyKey: draft.idempotencyKey`. On success: upload the photos one by one (show progress; failures can be retried from job detail), clear the draft, and go to `/jobs/detail/?id=...` with a success toast and the actions "Print receipt" / "Share" (they appear in 1.16–1.17).
- Network failure: keep the draft; the same idempotency key makes the retry safe.
- Enable the Home "Add Job Sheet" tile and the Jobs FAB → `/jobs/new/`.

### 1.7.4 i18n and tests
Namespace `intake` in three locales. Vitest: each step schema, the pattern validation (`isValidPattern("1-2-3-6")` true, `"1-1-2-3"` false, `"1-2"` false), and the idempotency key staying the same across a simulated retry.

**Verify:** frontend checks; 🧑‍🔧 time a real intake on a phone (target under 60 s for a minimal job).
**Done when:** a full job sheet can be created on a phone, and a retried submit never makes a duplicate.

---

## 1.8 Status workflow, assignment, visibility and dashboard API

**Depends on:** 1.5 · **Effort:** 2 days
**Read first:** `docs/02-database-schema.md` §7 and §8, `docs/domain-glossary.md` (statuses)

### 1.8.1 State machine (`apps/jobs/state_machine.py`)
```python
from apps.jobs.models import JobStatus as S

TRANSITIONS: dict[str, set[str]] = {
    S.RECEIVED: {S.DIAGNOSING, S.AWAITING_APPROVAL, S.IN_REPAIR, S.CANCELLED},
    S.DIAGNOSING: {S.AWAITING_APPROVAL, S.AWAITING_PARTS, S.IN_REPAIR, S.RETURNED_UNREPAIRED, S.CANCELLED},
    S.AWAITING_APPROVAL: {S.IN_REPAIR, S.AWAITING_PARTS, S.RETURNED_UNREPAIRED, S.CANCELLED},
    S.AWAITING_PARTS: {S.IN_REPAIR, S.CANCELLED},
    S.IN_REPAIR: {S.REPAIRED, S.AWAITING_PARTS, S.RETURNED_UNREPAIRED},
    S.REPAIRED: {S.READY_FOR_PICKUP, S.IN_REPAIR},
    S.READY_FOR_PICKUP: {S.DELIVERED, S.IN_REPAIR},
    S.DELIVERED: set(),             # reopen only via /reopen/
    S.CANCELLED: set(),
    S.RETURNED_UNREPAIRED: set(),
}
TERMINAL = {S.DELIVERED, S.CANCELLED, S.RETURNED_UNREPAIRED}

# Dashboard / filter groups (used by API and UI)
GROUPS = {
    "pending": {S.RECEIVED},
    "in_progress": {S.DIAGNOSING, S.AWAITING_APPROVAL, S.AWAITING_PARTS, S.IN_REPAIR},
    "repaired": {S.REPAIRED, S.READY_FOR_PICKUP},
    "delivered": {S.DELIVERED},
    "closed": {S.CANCELLED, S.RETURNED_UNREPAIRED},
}


def required_permission(to_status: str) -> str:
    return "jobs.deliver" if to_status == S.DELIVERED else "jobs.change_status"


def allowed_next(job, membership) -> list[str]:
    return [s for s in TRANSITIONS[job.status] if membership.has_perm(required_permission(s))]
```

### 1.8.2 Services
`change_status(*, job, to_status, actor, membership, note="", cancel_reason="", expected_version)`, inside `transaction.atomic()` with `select_for_update` on the job:
1. Version check (409 `concurrency.version_mismatch`).
2. `job.is_locked` → 409 `job.locked`.
3. `to_status not in TRANSITIONS[job.status]` → 409 `job.invalid_transition`.
4. Permission: `membership.has_perm(required_permission(to_status))`, else 403.
5. Engineers (no `jobs.view_all`) may only change jobs assigned to them → 403 `job.not_assigned_to_you`.
6. `cancelled` requires `cancel_reason` (400).
7. Side effects: `ready_for_pickup` sets `ready_at`; `delivered` sets `delivered_at`, `delivered_by=actor`, `warranty_until = today_ist() + timedelta(days=job.warranty_days)`, `is_locked = shop.lock_order_after_delivery`.
8. Write `JobStatusHistory`, bump `version`, audit `job.status_changed` (before/after status), call the hook `on_job_status_changed(job, from_status)` (empty until 1.19 and 2.3).

`reopen(*, job, actor, membership, reason)`: only from `TERMINAL`; needs `jobs.reopen`; if `job.is_locked` → 409 `job.locked` (a locked delivered job is final, per schema §7). Sets status `in_repair`, clears `warranty_until`, history and audit `job.reopened`.

`assign(*, job, membership_id, actor, membership)`: needs `jobs.assign`; the target must be an active membership of the same shop; `None` unassigns. Audit `job.assigned`; hook `notify_assignment(job)` (logs only; push in Phase 3).

`can_edit_job(membership, job)`: `jobs.edit` and (has `jobs.view_all` or `job.assigned_to_id == membership.id`).

### 1.8.3 Visibility in `JobViewSet.get_queryset`
```python
qs = super().get_queryset().select_related("customer", "device", "device__brand", "assigned_to")
m = self.request.membership
if not (m.has_perm("jobs.view_all") or not m.shop.engineers_see_assigned_only):
    qs = qs.filter(assigned_to=m)
```
(By default all staff see all jobs; the shop toggle restricts roles without `jobs.view_all`.)

Filters (django-filter `JobFilter`): `status` (comma list), `group` (key of `GROUPS`), `assigned_to` (`me` or an ID), `customer`, `created_after`, `created_before`, `q`. Rules for `q`: digits ≤ 6 → `job_no` exact **or** customer phone contains **or** IMEI ends with; 7+ digits → phone contains or IMEI contains; otherwise customer name `icontains` or device model `icontains`. Use `.distinct()` when joining identifiers. Ordering: `-updated_at` (default), `-created_at`, `expected_date`.

### 1.8.4 Endpoints
| Method + path | Permission | Body / notes |
|---|---|---|
| `POST /jobs/{id}/status/` | `jobs.change_status` (deliver checked in service) | `{to_status, note?, cancel_reason?}` + `If-Match` |
| `GET /jobs/{id}/transitions/` | `jobs.view` | `{allowed: [...]}` from `allowed_next` (the UI never hard-codes transitions) |
| `POST /jobs/{id}/reopen/` | `jobs.reopen` | `{reason}` |
| `POST /jobs/{id}/assign/` | `jobs.assign` | `{membership_id: uuid|null}` |
| `GET /jobs/{id}/history/` | `jobs.view` | status history with `changed_by_name` |
| `GET /jobs/counts/` | `jobs.view` | `{all, pending, in_progress, repaired, delivered, closed}` for the visible queryset (respects visibility) |
| `GET /dashboard/summary/?date=YYYY-MM-DD` | `jobs.view` | `{received_today, pending, in_progress, repaired, delivered_today}` (IST day boundaries); `collected_today_paise` added in 1.11 only with `reports.view_basic` |

Add `assign` and `reopen` to the default roles per §8: Front Desk gets `jobs.assign` (R3; confirm with the owner, `TODO(verify)` business choice).

### 1.8.5 Tests
- a parametrised test over **every** (from, to) pair: allowed pairs succeed, all others return 409 `job.invalid_transition`
- deliver without `jobs.deliver` (Engineer) → 403; with it → `delivered_at`, `warranty_until`, `is_locked` set correctly (toggle on and off)
- locked delivered job: status change → 409 `job.locked`; reopen → 409; when not locked, reopen works with `jobs.reopen` only
- every transition writes one history row and one audit row
- visibility: with the toggle on, the engineer lists only assigned jobs and gets 404 for others; with it off, sees all
- engineer cannot change status of an unassigned job → 403 `job.not_assigned_to_you`
- counts and dashboard numbers for a fixture with known statuses; IST midnight boundary (a job created 23:59 IST yesterday is not "today")
- `q` search by job number, phone suffix and IMEI suffix

**Done when:** every allowed and forbidden transition is tested and the dashboard numbers are correct.


---

## 1.9 Home dashboard, Jobs list and Job detail screens

**Depends on:** 1.7, 1.8 · **Effort:** 3 days
**Read first:** `design/01-design-system.md` §4.1–4.2, `design/02-information-architecture.md` §2, §3, §5, `design/04-component-library.md` §3

1. `src/features/jobs/status.ts`: `STATUS_STYLE` (each status → badge classes from `design/04-component-library.md` §3.3; add `awaiting_approval` = sky and `returned_unrepaired` = rose) and `GROUPS` (same keys as the backend). Write a test that every `JobStatus` has a style and a translation key `jobs.status.<status>`.
2. `StatusBadge` component (dot + translated label).
3. **Home** (`(app)/home/page.tsx`): replace the zeros with `GET /dashboard/summary/?date=todayIst()`. The hero card shows `received_today` large and four mini counters (In progress / Pending / Repaired / Delivered today); tapping a counter opens `/jobs/?group=...`. Quick actions: "Add Job Sheet" works; the others keep "Soon". "Recent job sheets" lists the last 5 jobs (`/jobs/?ordering=-created_at&page_size=5`). The revenue and low-stock cards stay hidden until 1.21 / Phase 2. Pull-to-refresh refetches.
4. **Jobs list** (`(app)/jobs/page.tsx`): search bar (debounced `q`), horizontal pills from `/jobs/counts/` ("All 12", "Pending 3", …), infinite list of `JobCard` (§3.2: `#job_no`, customer name, device model, fault (first line), status badge, created time, total). Show `₹` amounts only when the user has `money.see_cost_profit` or `invoices.view` (`usePermission`). FAB → `/jobs/new/`. Store the selected pill in the URL (`?group=`) so back navigation keeps it.
5. **Job detail** (`(app)/jobs/detail/page.tsx?id=`), sections per IA §5:
   - Header: `#job_no`, status badge, device and customer names, priority chip.
   - Customer card (masked phone respected; Call / WhatsApp buttons hidden when masked).
   - Device card: brand, model, colour, IMEIs formatted with `formatIMEI`.
   - Problem and condition, with photos (`PhotoStrip`).
   - Lock: "Show lock" button (only with `jobs.view_device_lock`) calls `/jobs/{id}/lock/` and shows the value for 30 seconds, or replays the pattern on `PatternInput` in read-only mode.
   - Accessories received (checklist, read-only).
   - Timeline from `/jobs/{id}/history/` (vertical, IST times, who changed it).
   - Notes: list + add (internal / visible to customer).
   - Assigned engineer with "Change" (permission `jobs.assign`).
   - Sticky bottom action bar: **Update status** opens a sheet with the buttons from `/transitions/` (cancel asks for a reason; deliver shows a warning when a balance is due, after 1.12); **Edit** (opens the intake steps 3–6 as an edit form with `If-Match`); **More** (delete / reopen per permissions). Payment, Print and Share buttons are added in 1.12, 1.16 and 1.17.
   - On `409 concurrency.version_mismatch`: toast "This job was changed by someone else", then refetch.
6. Customer detail: fill the "Repair history" card from `/jobs/?customer=<id>`.
7. Haptic tick on status change (`src/native/haptics.ts`).
8. i18n: namespace `jobs` (including `jobs.status.*` for all 10 statuses).

**Verify:** frontend checks; 🧑‍🔧 at 360 px, a job goes received → delivered on a phone, the Home counters update, and an engineer account sees exactly what the shop settings allow.
**Done when:** the full job lifecycle can be run from the app.

---

## 1.10 IMEI barcode scan, OCR capture and "Check IMEI"

**Depends on:** 1.9, 0.8 (plugins chosen) · **Effort:** 2 days
**Read first:** `docs/decisions.md` (Spike B results), `docs/01-blueprint.md` §6, `frontend/src/lib/validation/imei.ts`

1. `src/native/barcode.ts` (R7, the plugin chosen in 0.8): `scanBarcode(): Promise<string | null>`. Request camera permission, open the scanner with formats Code128, Code39, EAN-13, DataMatrix, QR; return `null` on cancel. Web: throw `NativeUnavailableError`.
2. `src/native/ocr.ts`: `recognizeText(photo: Blob | string): Promise<string>`. Web: throw `NativeUnavailableError`.
3. `src/lib/validation/imei-extract.ts` (pure, fully tested):
   ```ts
   const LOOKALIKES: Record<string, string> = { O: "0", o: "0", D: "0", I: "1", l: "1", "|": "1", Z: "2", S: "5", B: "8" };

   /** Finds 15-digit IMEI candidates in OCR/barcode text. Luhn-valid ones first, then the rest. */
   export function extractImeiCandidates(text: string): { value: string; luhnValid: boolean }[] {
     const tokens = text.split(/[^0-9A-Za-z|]+/);
     const seen = new Set<string>();
     const out: { value: string; luhnValid: boolean }[] = [];
     for (const token of tokens) {
       const digitCount = (token.match(/\d/g) ?? []).length;
       if (token.length < 15 || digitCount < 12) continue; // mostly digits only
       const fixed = token.replace(/[OoDIl|ZSB]/g, (c) => LOOKALIKES[c] ?? c).replace(/\D/g, "");
       for (let i = 0; i + 15 <= fixed.length; i += 1) {
         const candidate = fixed.slice(i, i + 15);
         if (seen.has(candidate)) continue;
         seen.add(candidate);
         out.push({ value: candidate, luhnValid: isValidIMEI(candidate) });
         if (fixed.length === 15) break;
       }
     }
     return out.sort((a, b) => Number(b.luhnValid) - Number(a.luhnValid));
   }
   ```
   Tests: `"IMEI1: 49015420323751 8"` style split (document that split numbers are not joined; the user retypes), `"IMEI 49O154203237518"` (O → 0), two IMEIs in one text, a 16-digit run producing two windows (only Luhn-valid first), and junk text → `[]`.
   Also handle barcodes that carry `IMEI:` prefixes or 16/17-digit IMEISV: take the first 14 digits and recompute the check digit with `calculateIMEICheckDigit`, then mark it as "converted from IMEISV" in the confirm dialog.
4. `ImeiCaptureField` (used in intake step 2 and `DeviceFormSheet`): a text input plus **Scan** and **Photo** buttons (shown only on native).
   - Scan → `scanBarcode()` → `extractImeiCandidates` → confirm dialog showing the value in large grouped digits (`formatIMEI`) with Luhn status → **Use this** sets the value with `capturedVia = "barcode"`.
   - Photo → `takePhoto()` → `recognizeText()` → candidates list → the user picks one and **must confirm** (AGENTS.md: never auto-save OCR output) → `capturedVia = "ocr"`.
   - The source badge ("Scanned" / "Read from photo" / "Typed") shows next to the field. Editing the value by hand resets it to `manual`.
5. Duplicate warning: when a full IMEI is entered, call `/devices/imei-lookup/?value=`. If there are matches, show "Seen before: {customer} – Job #{n}" with links. This is a warning only; continuing is allowed.
6. "Check IMEI" button (on the device card in job detail and on the Home "Stolen Check" tile, which is now enabled): a sheet with two options:
   - **SMS to 14422:** `sms:14422?body=KYM%20<IMEI>` (Android) / `sms:14422&body=KYM%20<IMEI>` (iOS), opened with `window.open` / `App.openUrl`. `TODO(verify)` the current KYM format.
   - **Official website:** the CEIR / Sanchar Saathi URL from `src/lib/constants/external.ts` (`TODO(verify)` the URL), opened in the system browser.
   Explain in one line that FixPro does not check the IMEI itself.
7. 🧑‍🔧 Real-device test matrix (two Android phones and one iPhone; good light, poor light, damaged sticker). Append the results to `docs/decisions.md`.

**Done when:** typical stickers are captured correctly most of the time, and no OCR or barcode value is saved without the user tapping **Use this**.

---

## 1.11 Line items and payments API

**Depends on:** 1.8 · **Effort:** 2–3 days
**Read first:** `docs/02-database-schema.md` §4.6 (`job_line_item`), §4.7 (`payment`), `docs/decisions.md` (payments manual + UPI QR)

### 1.11.1 Money helpers (`apps/core/money.py`)
```python
from decimal import ROUND_HALF_UP, Decimal


def round_half_up_div(numerator: int, denominator: int) -> int:
    """Integer division rounded half away from zero. round_half_up_div(5, 2) == 3; (-5, 2) == -3."""
    if denominator <= 0:
        raise ValueError("denominator must be positive")
    q, r = divmod(abs(numerator), denominator)
    if r * 2 >= denominator:
        q += 1
    return q if numerator >= 0 else -q


def mul_qty(unit_paise: int, quantity: Decimal) -> int:
    """unit price (paise) x quantity (up to 3 decimals) -> paise, rounded half up."""
    return int((Decimal(unit_paise) * quantity).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def paise_to_rupees_str(paise: int) -> str:
    """129950 -> '1299.50' (for UPI links and PDFs; never for maths)."""
    sign = "-" if paise < 0 else ""
    p = abs(paise)
    return f"{sign}{p // 100}.{p % 100:02d}"
```
Test each function, including negative numbers and `.5` boundaries.

### 1.11.2 Line items (`apps/jobs/models.py`)
```python
class JobLineItem(ShopScopedModel):
    class Kind(models.TextChoices):
        PART = "part"
        LABOUR = "labour"
        OTHER = "other"

    job = models.ForeignKey(Job, on_delete=models.PROTECT, related_name="line_items")
    kind = models.CharField(max_length=10, choices=Kind.choices)
    description = models.CharField(max_length=200)
    item_id = models.UUIDField(null=True, blank=True)  # becomes an FK to inventory.Item in 2.3
    quantity = models.DecimalField(max_digits=10, decimal_places=3, default=Decimal("1"))
    unit_cost_paise = models.BigIntegerField(default=0)
    unit_price_paise = models.BigIntegerField(default=0)
    discount_paise = models.BigIntegerField(default=0)
    tax_rate_bp = models.PositiveIntegerField(default=0)  # basis points: 1800 = 18 %
    hsn_sac = models.CharField(max_length=8, blank=True, default="")
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["position", "created_at"]
        constraints = [
            models.CheckConstraint(condition=Q(quantity__gt=0), name="jli_qty_positive"),
            models.CheckConstraint(condition=Q(unit_price_paise__gte=0), name="jli_price_nonneg"),
            models.CheckConstraint(condition=Q(discount_paise__gte=0), name="jli_discount_nonneg"),
        ]

    @property
    def line_total_paise(self) -> int:
        return mul_qty(self.unit_price_paise, self.quantity) - self.discount_paise
```
(Django 5.2 uses `condition=` in `CheckConstraint`; older versions used `check=`.)
Service `recalculate_job_totals(job)`: `total_paise = Σ line_total`, `cost_paise = Σ mul_qty(unit_cost, qty)`; save these two fields only. Discount may not exceed the line gross → 400.

Endpoints (nested under the job; `job.is_locked` → 409 `job.locked`; engineers only on assigned jobs):
- `GET /jobs/{id}/line-items/` (`jobs.view`; hide `unit_cost_paise` without `money.see_cost_profit`)
- `POST /jobs/{id}/line-items/` (`jobs.edit`)
- `PATCH /jobs/{id}/line-items/{item_id}/` (`jobs.edit`, `If-Match`)
- `DELETE /jobs/{id}/line-items/{item_id}/` (`jobs.edit`, soft)
Every change recalculates totals and writes audit `job.line_items_changed`. Once an invoice is **issued** for the job (1.13), line items are frozen → 409 `job.invoiced`.

### 1.11.3 Payments (`apps/billing`)
`python manage.py startapp billing apps/billing`.
```python
class PaymentMode(models.TextChoices):
    CASH = "cash"
    UPI = "upi"
    CARD = "card"
    BANK = "bank"
    # No "credit": udhaar is an unpaid balance, tracked by the customer ledger in Phase 2.


class Payment(ShopScopedModel):
    class Direction(models.TextChoices):
        IN = "in"
        OUT = "out"  # refund

    job = models.ForeignKey("jobs.Job", on_delete=models.PROTECT, null=True, blank=True, related_name="payments")
    invoice = models.ForeignKey("billing.Invoice", on_delete=models.PROTECT, null=True, blank=True,
                                related_name="payments")  # the Invoice model is added in 1.13; add this FK then
    customer = models.ForeignKey("customers.Customer", on_delete=models.PROTECT, null=True, blank=True,
                                 related_name="payments")
    direction = models.CharField(max_length=3, choices=Direction.choices, default=Direction.IN)
    mode = models.CharField(max_length=8, choices=PaymentMode.choices)
    amount_paise = models.BigIntegerField()
    reference = models.CharField(max_length=100, blank=True, default="")  # UPI ref no., card slip, etc.
    received_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    received_at = models.DateTimeField()
    refunds_payment = models.ForeignKey("self", on_delete=models.PROTECT, null=True, blank=True,
                                        related_name="refunds")
    idempotency_key = models.UUIDField()
    notes = models.TextField(blank=True, default="")

    class Meta:
        constraints = [
            models.CheckConstraint(condition=Q(amount_paise__gt=0), name="pay_amount_positive"),
            models.UniqueConstraint(fields=["shop", "idempotency_key"], name="pay_uniq_idem_per_shop"),
        ]
        indexes = [models.Index(fields=["shop", "-received_at"], name="pay_shop_received_idx")]
```
Create the `invoice` FK in 1.13. In 1.11, leave that field out of the model.

Payments are **immutable**: no update and no delete endpoints. A mistake is corrected with a refund (`direction=out`).

Services (`apps/billing/payments.py`):
```python
def job_paid_paise(job) -> int:
    agg = Payment.objects.filter(job=job).aggregate(
        inn=Sum("amount_paise", filter=Q(direction="in")), out=Sum("amount_paise", filter=Q(direction="out"))
    )
    return (agg["inn"] or 0) - (agg["out"] or 0)


def job_balance_paise(job) -> int:
    """What the customer still owes. Before any line items exist, the estimate is the reference."""
    billable = job.total_paise or job.estimate_paise
    return billable - job_paid_paise(job)
```
`record_payment(*, shop, actor, job, mode, amount_paise, reference, idempotency_key, notes)`:
- inside `transaction.atomic()`, `select_for_update` on the job
- `amount_paise > job_balance_paise(job)` → 422 `payment.exceeds_balance` (`fields.amount_paise`)
- creates the payment with `customer=job.customer`, `received_at=now`; audit `payment.recorded`
- if the payment's `idempotency_key` already exists for the shop, return the existing payment (a second safety net behind `@idempotent`)

`refund_payment(*, payment, actor, amount_paise, reason, idempotency_key)`: needs `payments.refund`; the amount must not exceed (original − already refunded) → 422 `payment.refund_exceeds_paid`; audit `payment.refunded`.

`record_advance` is used by `create_job` when `data["advance_paise"] > 0` (add `advance_paise` and `advance_mode` to `JobCreateSerializer` now).

Endpoints:
| Method + path | Permission | Notes |
|---|---|---|
| `GET /jobs/{id}/payments/` | `payments.view` | payments plus `{paid_paise, balance_paise}` summary |
| `POST /jobs/{id}/payments/` | `payments.record` | `@idempotent()` required; body `{mode, amount_paise, reference?, notes?}` |
| `POST /payments/{id}/refund/` | `payments.refund` | `@idempotent()` required; `{amount_paise, reason}` |
| `GET /payments/?date=&mode=` | `payments.view` | shop payments list (for reports) |

`JobSerializer` gains `paid_paise` and `balance_paise` (annotate in the list queryset with `Subquery` sums to avoid N+1). `/dashboard/summary/` gains `collected_today_paise` (net payments today in IST) when the user has `reports.view_basic`.

### 1.11.4 UPI helper (`apps/billing/upi.py`)
```python
from urllib.parse import quote

from apps.core.money import paise_to_rupees_str


def build_upi_uri(*, vpa: str, payee_name: str, amount_paise: int, note: str) -> str:
    """upi://pay deep link (NPCI linking spec; TODO(verify) parameters with a real UPI app scan)."""
    params = {"pa": vpa, "pn": payee_name[:50], "am": paise_to_rupees_str(amount_paise), "cu": "INR", "tn": note[:50]}
    return "upi://pay?" + "&".join(f"{k}={quote(v, safe='')}" for k, v in params.items())
```

### 1.11.5 Tests
- advance at intake, then two part payments → `balance_paise` correct after each; the third payment over the balance → 422
- a retry with the same Idempotency-Key → one payment
- refund more than paid → 422; a refund reduces `paid_paise`; a refund of a refund is rejected
- Engineer cannot record payments (403); Front Desk can; Front Desk cannot refund (403)
- line items: totals with quantity 1.5 and a discount; `unit_cost_paise` hidden from Front Desk; Shop B job → 404
- `build_upi_uri` escapes spaces and `&` in names; the amount is `1299.50` for 129950 paise
- the job list makes a fixed number of queries for 30 jobs (`django_assert_max_num_queries`)

**Done when:** a job can take an advance and two part payments, and the balance is always right.

---

## 1.12 Line items, payments and UPI QR screens

**Depends on:** 1.11, 1.9 · **Effort:** 2 days

1. `pnpm add qrcode && pnpm add -D @types/qrcode` (well maintained; renders to canvas or data URL).
2. `src/lib/upi.ts`: a TypeScript port of `build_upi_uri` with the same tests.
3. `MoneyInput` (`components/forms`): ₹ prefix, numeric keyboard (`inputMode="decimal"`), formats on blur with `formatPaise`, returns paise with `rupeesToPaise`; invalid input shows an error.
4. Job detail → **Repair details** section:
   - Line items list (description, qty × price, discount, total). The cost column only with `money.see_cost_profit`.
   - "Add part / labour / other" sheet: kind tabs, description, qty, price, cost (permission-gated), discount.
   - Swipe or `…` → edit / delete. Disabled when the job is locked or invoiced (show why).
   - Totals card: Total, Paid, **Balance due** (rose if > 0, emerald if 0).
5. **Add payment** sheet (button in the action bar, permission `payments.record`): amount (prefilled with the balance), mode chips (Cash, UPI, Card, Bank), reference (shown for UPI/Card/Bank), notes. Generate the idempotency key when the sheet opens.
6. **UPI QR** button (only when `shop.upi_id` is set and the balance > 0): full-screen QR built from `buildUpiUri` with the amount, shop name and note `Job #{job_no}`, large amount text, and "Ask the customer to scan with any UPI app". After the customer pays, the staff taps **Mark as paid**, which opens the payment sheet with mode UPI and the reference field focused. The payment is never confirmed automatically (manual verification, per the decision log).
7. Intake step 6: show advance amount and mode now (create_job supports it since 1.11).
8. Deliver confirmation: if the balance > 0, the sheet warns "₹X is still due" with options **Collect payment** or **Deliver anyway (udhaar)**.
9. Customers list: add the chip "With dues" (`?has_due=true`). Implement this backend filter now on `CustomerViewSet` with a subquery over jobs (`total_paise` − net payments > 0, delivered or not).
10. i18n namespace `billing`.

**Verify:** frontend checks; 🧑‍🔧 scan the QR with two UPI apps (it should open with the amount prefilled; do not complete the payment if you don't want to).
**Done when:** staff can add parts and labour, take payments, show a UPI QR, and see the balance everywhere.

---

## 1.13 Invoices and the optional GST engine

**Depends on:** 1.11 · **Effort:** 3–4 days · 🧑‍🔧 needs a CA review before real use
**Read first:** `docs/02-database-schema.md` §4.7, §5, §6; `docs/domain-glossary.md` (GST terms); AGENTS.md rule 4

Every GST rule below is the best current understanding and must be confirmed by a CA. Keep each `TODO(verify)` marker in the code.

### 1.13.1 Models (`apps/billing/models.py`)
- `InvoiceSeries(UUIDModel, TimeStampedModel)`: `shop` FK, `kind` (`invoice`/`credit_note`/`bill_of_supply`), `fy_start_year`, `prefix` (max 8), `last_number`. Unique `(shop, kind, fy_start_year)`.
- `Invoice(ShopScopedModel)` with every column in schema §4.7. `kind`: `simple_bill`, `tax_invoice`, `bill_of_supply`, `credit_note`. `status`: `draft`, `issued`, `cancelled`. `number` and `number_display` null until issued. Constraints:
  - unique `(shop, series, number)` where number is not null
  - one live invoice per job: unique `(job)` where `job IS NOT NULL AND status IN ('draft','issued') AND kind <> 'credit_note' AND deleted_at IS NULL`
  - `CheckConstraint`: `total_paise = taxable_paise + cgst_paise + sgst_paise + igst_paise + round_off_paise`
- `InvoiceLine(ShopScopedModel)` with every column in §4.7.
- Add `invoice = models.ForeignKey("billing.Invoice", null=True, ...)` to `Payment` now.

### 1.13.2 Immutability
In `Invoice.save()`: if the row in the database is `issued` or `cancelled`, only these fields may change: `amount_paid_paise`, `pdf_key`, `status` (issued → cancelled only), `cancelled_at`, `cancel_reason`, `updated_at`, `version`. Anything else → `RuntimeError("Issued invoices are immutable")`. `Invoice.delete()` and `InvoiceLine.delete()` raise unless the invoice is a draft. Add the same guard to `InvoiceLine.save()`. Test both.

### 1.13.3 Tax engine (`apps/billing/tax.py`, pure functions, no DB)
```python
from dataclasses import dataclass

from apps.core.money import mul_qty, round_half_up_div


@dataclass(frozen=True)
class LineInput:
    quantity: "Decimal"
    unit_price_paise: int
    discount_paise: int
    tax_rate_bp: int          # 0, 500, 1200, 1800, 2800 ...
    tax_inclusive: bool


@dataclass(frozen=True)
class LineTax:
    taxable_paise: int
    cgst_paise: int
    sgst_paise: int
    igst_paise: int
    line_total_paise: int


def compute_line(line: LineInput, *, intra_state: bool, charge_tax: bool) -> LineTax:
    gross = mul_qty(line.unit_price_paise, line.quantity) - line.discount_paise
    if not charge_tax or line.tax_rate_bp == 0:
        return LineTax(gross, 0, 0, 0, gross)
    if line.tax_inclusive:
        taxable = round_half_up_div(gross * 10000, 10000 + line.tax_rate_bp)
    else:
        taxable = gross
    if intra_state:
        # Each half rounded separately. TODO(verify) rounding method with the CA.
        cgst = round_half_up_div(taxable * line.tax_rate_bp, 20000)
        sgst = cgst
        igst = 0
    else:
        cgst = sgst = 0
        igst = round_half_up_div(taxable * line.tax_rate_bp, 10000)
    total = gross if line.tax_inclusive else taxable + cgst + sgst + igst
    if line.tax_inclusive:
        # Keep the customer price exact: put any rounding difference into taxable.
        taxable = total - cgst - sgst - igst
    return LineTax(taxable, cgst, sgst, igst, total)


def round_off(total_paise: int, enabled: bool) -> int:
    """Amount to add so the total is a whole rupee (nearest, half up). TODO(verify) with the CA."""
    if not enabled:
        return 0
    return round_half_up_div(total_paise, 100) * 100 - total_paise
```
Decide the invoice kind:
```python
def invoice_kind_for(shop) -> str:
    if not shop.gst_enabled or shop.registration_type == "unregistered":
        return "simple_bill"
    if shop.registration_type == "composition":
        return "bill_of_supply"   # no tax charged; TODO(verify) wording requirements
    return "tax_invoice"
```
Place of supply: `customer_gstin[:2]` if a customer GSTIN is given, otherwise the shop's state (service performed at the shop). `intra_state = place_of_supply == shop.state_code`. `TODO(verify)`.

### 1.13.4 Numbering
```python
def next_invoice_number(shop, kind: str, issue_date) -> tuple[InvoiceSeries, int, str]:
    fy = financial_year_start(issue_date)
    series_kind = {"credit_note": "credit_note", "bill_of_supply": "bill_of_supply"}.get(kind, "invoice")
    prefix = {"invoice": shop.invoice_prefix, "credit_note": "CN", "bill_of_supply": "BOS"}[series_kind]
    series, _ = InvoiceSeries.objects.get_or_create(
        shop=shop, kind=series_kind, fy_start_year=fy, defaults={"prefix": prefix}
    )
    series = InvoiceSeries.objects.select_for_update().get(pk=series.pk)
    series.last_number += 1
    series.save(update_fields=["last_number", "updated_at"])
    display = f"{series.prefix}/{financial_year_label(fy)}/{series.last_number:05d}"
    if len(display) > 16:  # GST rule believed to limit invoice numbers to 16 characters. TODO(verify)
        raise DomainError("Invoice prefix is too long.", code="invoice.number_too_long", status=422)
    return series, series.last_number, display
```
Validate `invoice_prefix` to max 4 characters `[A-Z0-9]` in `ShopSerializer` when GST is enabled. The `get_or_create` race on a brand-new financial year is caught by the unique constraint: wrap it, catch `IntegrityError` and re-`get`.

### 1.13.5 Services and endpoints
| Method + path | Permission | Service behaviour |
|---|---|---|
| `POST /jobs/{id}/invoice/` | `invoices.create_draft` | `create_draft_from_job`: kind from `invoice_kind_for`, one `InvoiceLine` per job line item (HSN/SAC and rate copied; default labour SAC from shop settings later); compute totals; 409 `invoice.already_exists` if a live invoice exists |
| `GET /invoices/` `?status=&kind=&from=&to=&q=` | `invoices.view` | list |
| `GET /invoices/{id}/` | `invoices.view` | with lines and `balance_paise` |
| `PATCH /invoices/{id}/` | `invoices.create_draft` | draft only (409 `invoice.already_issued` otherwise): `customer_gstin` (validated), `place_of_supply_state`, `notes`, `terms`, lines (replace whole list); recompute |
| `POST /invoices/{id}/issue/` | `invoices.issue` | `@idempotent()`; atomic: recompute totals, number it, `issue_date = today_ist()`, `shop_snapshot` (name, address, phone, GSTIN, state, UPI ID, logo key) and `customer_snapshot` (name, phone, address, GSTIN), `issued_by`, `issued_at`; link the job's payments (`invoice=...`); `amount_paid_paise`; audit `invoice.issued` |
| `POST /invoices/{id}/cancel/` | `invoices.cancel` | `{reason}`; issued only; creates and issues a **credit note** (kind `credit_note`, `original_invoice`, same lines and amounts), sets the original to `cancelled`; audit `invoice.cancelled` |
| `DELETE /invoices/{id}/` | `invoices.create_draft` | draft only (soft); issued → 409 `invoice.already_issued` |

Once an invoice is issued, the job's line items are frozen (1.11 checks `job.invoiced`). Payments recorded later on the job also get `invoice` set and update `amount_paid_paise`.

Error codes: `invoice.already_exists` 409, `invoice.already_issued` 409, `invoice.not_issued` 409, `invoice.number_too_long` 422, `invoice.empty` 422 (no lines), `job.invoiced` 409.

### 1.13.6 Tests (`apps/billing/tests/`)
- `test_tax.py`: table-driven cases for 18 % exclusive intra-state (₹1,000 → CGST 90.00, SGST 90.00), inter-state IGST, inclusive pricing (₹1,180 incl. 18 % → taxable 1,000.00), odd paise rounding, round-off on and off, 0 % and non-GST shops. **Mark the file header `TODO(verify): reviewed by CA on <date>`.**
- numbering: 1, 2, 3 per series; separate series for credit notes; financial-year rollover (issue on 31 March and 1 April → `/25-26/` then `/26-27/` and number resets to 1); 10 parallel issues give 10 consecutive numbers with no gaps (`transaction=True` test as in 1.5)
- immutability: changing `total_paise` on an issued invoice raises; DELETE → 409; PATCH → 409
- composition shop → `bill_of_supply` with zero tax; non-GST shop → `simple_bill`
- cancel creates a credit note with its own number; the original becomes `cancelled`; the job can then get a new draft invoice
- snapshot stays the same after the shop changes its address
- permissions: Engineer cannot draft or issue; Front Desk can issue but cannot cancel; Shop B → 404

### 1.13.7 🧑‍🔧 CA review
Generate sample invoices (intra-state, inter-state, inclusive, composition, credit note) as PDFs after 1.15, or as JSON now. Ask the CA to check the numbering format, rounding, required fields and labels. Record the answers in `docs/decisions.md` and remove each `TODO(verify)` only after it is confirmed.

**Done when:** GST and non-GST shops both produce correct invoices, issued invoices cannot change, and the CA review is scheduled (completion of the review is tracked as a Phase 1 exit item).

---

## 1.14 Invoice screens

**Depends on:** 1.13, 1.12 · **Effort:** 2 days

1. `src/features/invoices/api.ts`: hooks for draft-from-job, get, list, patch, issue (`idempotencyKey`), cancel and delete.
2. Job detail action bar: **Create invoice** (when there is no live invoice and the user has `invoices.create_draft`) → creates a draft and opens it. If one exists, show **View invoice** with its status badge.
3. `(app)/invoices/detail/page.tsx?id=`:
   - Draft: editable lines (same sheet as line items, plus HSN/SAC and tax rate fields when GST is on), customer GSTIN (validated with `gstin.ts`), notes, terms; live totals from the server response.
   - Preview: an on-screen invoice layout (shop header, bill-to, lines, tax table with CGST/SGST or IGST, round off, total, paid, balance, amount in words — `src/lib/format/amount-words.ts` in Indian English: "Rupees One Thousand Two Hundred Ninety Nine and Fifty Paise Only", with tests).
   - **Issue** button → confirm dialog "After issuing, this invoice can't be edited. Mistakes are fixed with a credit note." → issue.
   - Issued: read-only, number shown, **Cancel with credit note** (permission `invoices.cancel`, asks for a reason), Print / Share (1.16–1.17).
4. More → Sales & Billing → **Invoices** list (`(app)/invoices/page.tsx`): search, status and kind filters, date range.
5. i18n namespace `invoices`.

**Done when:** a draft can be edited, issued, viewed and cancelled through a credit note from the app.

---

## 1.15 PDF documents (WeasyPrint)

**Depends on:** 1.13 · **Effort:** 2–3 days
**Read first:** `docs/01-blueprint.md` §5, `docs/decisions.md` (Noto fonts)

### 1.15.1 Dependencies
- `requirements.txt`: `weasyprint>=62`, `segno>=1.6` (pure-Python QR codes, SVG output).
- `backend/Dockerfile`: before `pip install`, add:
  ```dockerfile
  RUN apt-get update && apt-get install -y --no-install-recommends \
      libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz-subset0 libffi8 shared-mime-info fontconfig \
      && rm -rf /var/lib/apt/lists/*
  ```
  (`TODO(verify)` the package names against the WeasyPrint install docs for Debian bookworm.)
- CI: add `sudo apt-get install -y libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz-subset0` before `pip install`.
- Fonts: download **Noto Sans** (Regular, Bold) and **Noto Sans Devanagari** (Regular, Bold) TTFs from the official Google Fonts / Noto repository into `backend/apps/documents/fonts/`, together with their `OFL.txt` licence. Commit them (OFL allows this).

### 1.15.2 App `apps/documents`
- `templates/documents/base.html`: `@font-face` rules pointing at the font files with `file://` absolute paths built from `settings.BASE_DIR`; `body { font-family: "Noto Sans", "Noto Sans Devanagari"; }`; `@page { size: A4; margin: 12mm; }` with an `a5` variant class.
- `templates/documents/invoice.html`: logo (when `logo_key` is set), shop block, title by kind ("Tax Invoice" / "Bill of Supply" / "Invoice" / "Credit Note"), number, date, place of supply, bill-to, lines table (HSN/SAC and tax columns only when GST), tax summary, round off, total, amount in words (port of the TS helper to `apps/core/amount_words.py` with the same tests), paid, balance, UPI QR (when balance > 0 and the shop has a UPI ID), tracking QR, terms, signature line, and "This is a computer-generated document".
- `templates/documents/job_receipt.html`: the intake receipt: job number, date, customer, device and IMEIs, fault, condition, accessories received, estimate, advance, expected date, terms, tracking QR, and signature lines for customer and shop. **No lock value.**
- `services.py`:
  ```python
  def render_pdf(template: str, context: dict) -> bytes:
      html = render_to_string(template, context)
      return HTML(string=html, base_url=str(settings.BASE_DIR)).write_pdf()


  def qr_svg(data: str) -> str:
      return segno.make(data, error="m").svg_inline(scale=3)
  ```
  `invoice_pdf(invoice, size)` builds its context **only** from `invoice.shop_snapshot`, `customer_snapshot` and the invoice lines when the invoice is issued (history never changes). Drafts get a large "DRAFT" watermark.
  For issued invoices, cache the PDF: save it to storage under `shops/{shop}/invoices/{id}-{size}.pdf` and set `pdf_key`. Later requests stream the stored file.
- Endpoints (return `HttpResponse(content_type="application/pdf")` directly; this bypasses the JSON envelope on purpose):
  - `GET /invoices/{id}/pdf/?size=a4|a5` — `invoices.print`
  - `GET /jobs/{id}/receipt.pdf?size=a4|a5` — `jobs.view`
  - Add `Content-Disposition: inline; filename="INV-26-27-00001.pdf"` (slashes replaced).

### 1.15.3 Tests
- the PDF starts with `%PDF` for an invoice whose customer name is `राहुल शर्मा`, with a long mixed-script address
- the fonts are embedded: `pypdf` (dev dependency) lists a font whose `/BaseFont` contains `NotoSansDevanagari`
- issued invoice PDF content doesn't change after the shop is renamed (compare extracted text before and after)
- job receipt PDF never contains the lock value (extract text and assert it is absent)
- permissions and other-shop 404 for both endpoints

**Done when:** PDFs render Hindi correctly on the server, and the same file is served to every platform.

---

## 1.16 Sharing (native share sheet and WhatsApp)

**Depends on:** 1.15 · **Effort:** ~1 day

1. `src/native/share.ts` (R7, `@capacitor/share` + `@capacitor/filesystem`):
   - `sharePdf({ url, filename, text })`: fetch the PDF with the API auth headers (use the `request` path of the client, returning a `Blob`; add `apiBlob(path)` to `client.ts`), write it to `Directory.Cache` as base64, then `Share.share({ files: [uri], text })`.
   - Web: `navigator.canShare?.({ files })` → `navigator.share`, otherwise download via an object URL.
   - `openWhatsApp(phoneE164, text)`: `https://wa.me/<digits>?text=<encoded>`, opened with the system browser / `App.openUrl` (the OS hands it to WhatsApp or WhatsApp Business).
2. Message builders `src/features/messages/whatsapp.ts` (translated with `useTranslations("messages")` in the **customer's** `preferred_locale`): `jobReceived`, `readyForPickup`, `invoiceShared`. Each includes the shop name, job number, device, and the tracking link (`PUBLIC_TRACKING_BASE_URL` + token; add `tracking_url` to `JobSerializer` from `settings.PUBLIC_TRACKING_BASE_URL`).
3. Buttons: job detail → **Share** sheet (Receipt PDF, WhatsApp "Job received", WhatsApp "Ready for pickup" when status is `ready_for_pickup`); invoice detail → **Share PDF**, **WhatsApp invoice**.
4. When the customer's phone is masked for the user, the WhatsApp buttons are hidden.
5. Tests: the message builders (all three locales) and the `wa.me` URL encoding.

**Done when:** 🧑‍🔧 the receipt PDF and invoice PDF can be shared to WhatsApp from Android and iPhone.

---

## 1.17 Thermal receipt printing

**Depends on:** 1.16, 0.8 · **Effort:** 3–4 days · 🧑‍🔧 hardware
**Read first:** `docs/printers.md` (spike results), `frontend/src/lib/printer/rasterizer.ts`

1. `src/native/printer/types.ts`:
   ```ts
   export type PaperWidth = 58 | 80;
   export const DOTS: Record<PaperWidth, number> = { 58: 384, 80: 576 };
   export type PrinterInfo = { id: string; name: string; transport: "ble" | "classic" };
   export class PrinterError extends Error {
     constructor(public reason: "not_found" | "disconnected" | "permission" | "unsupported" | "write_failed",
                 message?: string) { super(message ?? reason); }
   }
   export interface PrinterService {
     scan(seconds?: number): Promise<PrinterInfo[]>;
     connect(id: string): Promise<void>;
     disconnect(): Promise<void>;
     write(bytes: Uint8Array): Promise<void>;
     isConnected(): boolean;
   }
   ```
2. `src/native/printer/ble-printer.ts`: the BLE implementation using the plugin from 0.8. Find the first writable characteristic, write `chunkBytes(bytes, mtuPayload)` with a 20 ms pause between chunks (use `writeWithoutResponse` when the characteristic supports it), and map plugin errors to `PrinterError`. On Android, request the largest MTU the plugin allows. If 0.8 showed Android Classic Bluetooth is needed for your printer, add `classic-printer.ts` behind the same interface.
3. `src/native/printer/fake-printer.ts`: records written bytes (used in tests).
4. `src/native/printer/index.ts`: `getPrinterService()` returns the BLE service on native, and throws `NativeUnavailableError` on web.
5. `src/lib/printer/receipt.ts`: a **pure** receipt model `{ header, lines: [{left, right, bold?}], qr?, footer }`, with builders `jobReceiptModel(job, shop, t)`, `paymentReceiptModel(...)` and `invoiceReceiptModel(invoice, t)`.
6. `src/lib/printer/render-canvas.ts`: draws a receipt model on a canvas of width `DOTS[paper]`, using `"Noto Sans", "Noto Sans Devanagari"` (load with `document.fonts.load` before drawing), with text wrapping, a right-aligned amounts column, dashed separators and the QR (`qrcode.toCanvas`). The canvas height is computed after layout.
7. Print flow `printReceipt(model)`: render → `getImageData` → `canvasToEscPosRaster` → `write`. Errors show a banner with the reason and actions: "Printer off or out of range" → Retry; permission → open settings; mid-print disconnect → Reconnect and print again.
8. **Printer settings** (`(app)/more/settings/printer/page.tsx`, permission `printers.configure`): scan list, connect, paper width (58/80), auto-cut on/off, **Test print** (the bilingual test receipt), Forget printer. Save the printer ID, width and auto-cut with `setPref("fixpro.printer", ...)` (device-specific; not synced to the server).
9. Web fallback: `(app)/print/receipt/page.tsx?type=job|invoice&id=` renders the same receipt model as HTML with `@page { size: 58mm auto; margin: 0 }` (or 80mm) and calls `window.print()` after fonts load. Print buttons on web open this page.
10. Print buttons: job detail (job receipt), after payment (payment receipt), invoice detail (invoice receipt). Every print button offers **Thermal** / **A4 PDF**.
11. Tests: receipt model builders (snapshot of lines), `chunkBytes`, the fake printer receiving a stream that starts with `ESC @` (`0x1b 0x40`) and ends with the cut command when auto-cut is on.
12. 🧑‍🔧 Fill in `docs/printers.md` with real results for both printers on Android and iPhone.

**Done when:** a Hindi job receipt prints clearly on your tested printers, and failures are explained to the user. (If iPhone BLE printing does not work with your printers, ship Android-only for the pilot and record it as a known issue.)


---

## 1.18 Public tracking page

**Depends on:** 1.15 · **Effort:** ~2 days
**Read first:** `docs/decisions.md` (tracking page is server-rendered), `design/02-information-architecture.md` §17, `docs/api-conventions.md` (Public endpoints)

### 1.18.1 App `apps/tracking`
- URL (outside `/api/v1/`): in `config/urls.py` add `path("t/", include("apps.tracking.urls"))` with `path("<str:token>/", views.tracking_page)` and `path("<str:token>/invoice.pdf", views.tracking_invoice_pdf)`.
- `apps/tracking/strings.py`: `STRINGS = {"en": {...}, "hi": {...}, "hi-Latn": {...}}`, with every label on the page and the customer-facing status names. Customer-facing statuses are simplified: `received` → "Received", `diagnosing`/`awaiting_approval` → "Checking", `awaiting_parts` → "Waiting for parts", `in_repair` → "Repairing", `repaired`/`ready_for_pickup` → "Ready for pickup", `delivered` → "Delivered", `cancelled`/`returned_unrepaired` → "Closed".
- Language choice: `?lang=` if valid, else `job.customer.preferred_locale`, else `en`. Links to switch language at the bottom.

### 1.18.2 View rules
```python
TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{20,64}$")


def tracking_page(request, token):
    if not allow_request(request, scope="tracking", limit=60, window_seconds=60):
        return render(request, "tracking/rate_limited.html", status=429)
    if not TOKEN_RE.match(token):
        return render(request, "tracking/not_found.html", status=404)  # no DB query for junk tokens
    job = (Job.objects.select_related("shop", "device", "device__brand", "customer")
           .filter(tracking_token=token, shop__tracking_enabled=True, shop__deleted_at__isnull=True).first())
    if job is None:
        return render(request, "tracking/not_found.html", status=404)
    if job.delivered_at and timezone.now() > job.delivered_at + timedelta(days=job.shop.tracking_expiry_days):
        return render(request, "tracking/expired.html", status=410)
    ...
```
`allow_request` (in `apps/core/ratelimit.py`) is a small fixed-window counter in the Django cache, keyed by `scope + get_client_ip(request) + current window number`. It returns `False` when the count is over the limit:
```python
def allow_request(request, *, scope: str, limit: int, window_seconds: int) -> bool:
    window = int(time.time() // window_seconds)
    key = f"rl:{scope}:{get_client_ip(request)}:{window}"
    added = cache.add(key, 1, timeout=window_seconds)
    count = 1 if added else cache.incr(key)
    return count <= limit
```

The page shows **only**: shop name, phone (click-to-call), address; job number; device brand + model (no IMEI); customer **first name** only; the simplified status with a milestone bar; expected date; notes with `visibility="customer"`; balance due (if > 0); a UPI QR and "Pay ₹X by UPI" link (if a balance and a shop UPI ID exist); an invoice PDF link (only if an issued invoice exists); warranty-until date after delivery.
It never shows: customer phone, IMEI, lock, internal notes, line-item costs, engineer names, or any UUID.

Response headers: `X-Robots-Tag: noindex, nofollow`, `Cache-Control: private, max-age=60`, `Referrer-Policy: no-referrer`.

### 1.18.3 Template
`templates/tracking/page.html`: no JavaScript, inline CSS under 15 KB, system fonts plus `Noto Sans Devanagari` via a `@font-face` local fallback (do not load web fonts; keep 2G-friendly), `<meta name="viewport">`, OpenGraph tags (`og:title` "Repair status – {shop}", `og:description` "{device}: {status}") so WhatsApp shows a preview. The UPI QR is an inline SVG from `segno`.

### 1.18.4 Tests
- a valid token shows the status in the customer's language, and `?lang=hi` overrides
- a random token → 404; a malformed token → 404 without a DB query (`django_assert_num_queries(0)`)
- `tracking_enabled=False` → 404; delivered 31 days ago with 30-day expiry → 410
- the HTML does **not** contain the phone, IMEI, lock value, an internal note's text, the engineer's name or the job UUID (assert each string is absent)
- 61 requests in a minute from one IP → 429
- the invoice PDF link works only for issued invoices of this job

**Done when:** 🧑‍🔧 a customer opens the link from WhatsApp on a basic phone and sees the right status quickly, and nothing sensitive is on the page.

---

## 1.19 Messaging (templates, SMS adapter, message log)

**Depends on:** 1.18, 1.16 · **Effort:** 2 days · 🧑‍🔧 DLT approval needed for real SMS
**Read first:** `docs/02-database-schema.md` §4.8, `backend/apps/core/sms.py`

1. App `apps/messaging`: models `MessageTemplate` (`shop` null = platform default, `key`, `channel` `sms`/`whatsapp`, `locale`, `body`, `dlt_template_id`, `is_active`; unique `(shop, key, channel, locale)`) and `MessageLog(ShopScopedModel)` (schema §4.8; only the masked phone is stored).
2. Data migration with platform default templates for keys `job_received`, `status_update`, `ready_for_pickup`, `invoice` × channels × three locales. Placeholders use `{shop_name}`, `{job_no}`, `{device}`, `{status}`, `{amount}`, `{link}`. SMS bodies must match the DLT-approved templates **exactly**; keep a comment `TODO(verify) matches DLT template <id>`.
3. `render_template(template, context)` uses `string.Formatter` with a whitelist of the placeholder names (unknown names → empty string; never `str.format` on user-controlled templates without the whitelist).
4. Provider: `apps/messaging/providers/msg91.py` (or the provider you registered with) implementing `SmsProvider.send_text(phone, body, template_id)` with `requests`/`httpx` (add the dependency, timeout 10 s). The exact API is `TODO(verify)` from the provider's docs. Settings: `SMS_PROVIDER`, `SMS_API_KEY`, `SMS_SENDER_ID`.
5. Service `send_job_message(*, job, key, actor=None)`:
   - skip (and log `skipped`) when `job.customer.sms_opt_in` is false or the phone is null
   - pick the shop template, else the platform default, in the customer's locale
   - create a `MessageLog(status="queued")`, send inside `transaction.on_commit`, update the status to `sent` / `failed` with the provider message ID or error code
   - SMS send failures never break the job action that triggered them
6. Automatic SMS: add `auto_sms_events = models.JSONField(default=list)` to `Shop` (allowed values `job_received`, `ready_for_pickup`, `delivered`). Wire `on_job_created` and `on_job_status_changed` to call `send_job_message` when the event is enabled.
7. Endpoints: `GET /jobs/{id}/messages/` (`jobs.view`, the log), `POST /jobs/{id}/messages/send/` `{key}` (`jobs.edit`, manual SMS), `GET/PATCH /message-templates/` (`shop.settings`; shop overrides of WhatsApp templates only — SMS bodies stay as DLT-approved).
8. Once real SMS works, also switch OTP sending to the real provider (`send_otp` uses the DLT OTP template) and **remove the pilot staff numbers from `OTP_TEST_NUMBERS`** (0.17 risk). Update `docs/PROJECT-STATE.md`.
9. Tests: template fallback order; opted-out customer → no send and a `skipped` log; provider failure → log `failed`, the status change still succeeds; a fake provider records the rendered body in Hindi; the log stores `+91XXXXXX3210`, never the full number.

**Done when:** status changes can send SMS through the provider in the customer's language (or, before DLT approval, through the console provider with everything else working).

---

## 1.20 Trash, restore, permanent delete and exports

**Depends on:** 1.13 · **Effort:** 2 days
**Read first:** `docs/api-conventions.md` (Trash), `docs/02-database-schema.md` §9

### 1.20.1 Trash in `ShopScopedViewSet`
Replace `get_queryset` in `ShopScopedViewSet` and add the two actions plus a permission tweak, so every viewset gets them. Each viewset adds `list_trash`, `restore` and `destroy_permanent` to its `permission_map` (a viewset that should have no trash simply leaves them out, so they are denied):
```python
def _in_trash_mode(self) -> bool:
    if self.action in ("restore", "destroy_permanent"):
        return True
    return self.action == "list" and self.request.query_params.get("deleted") == "true"

def get_required_permission(self):
    if self.action == "list" and self._in_trash_mode():
        return self.permission_map.get("list_trash")
    return super().get_required_permission()

def get_queryset(self):
    if getattr(self, "swagger_fake_view", False):
        return self.queryset.none()
    if self._in_trash_mode():
        # Shop filter applies to BOTH branches. Only rows that are actually in trash.
        return self.queryset.model.all_objects.filter(shop=self.request.shop, deleted_at__isnull=False)
    return self.queryset.filter(shop=self.request.shop)

@action(detail=True, methods=["post"])
def restore(self, request, pk=None):
    obj = self.get_object()
    self.before_restore(obj)                     # hook: raise ConflictError if restoring would break a rule
    obj.restore()
    record_audit(request=request, action=f"{obj._meta.model_name}.restored", entity=obj)
    return Response(self.get_serializer(obj).data)

@action(detail=True, methods=["delete"], url_path="permanent")
def destroy_permanent(self, request, pk=None):
    obj = self.get_object()
    if not self.can_hard_delete(obj):            # hook, default False
        raise ConflictError("This record has financial history.", code="trash.has_financial_records")
    record_audit(request=request, action=f"{obj._meta.model_name}.deleted_permanently", entity=obj)
    obj.hard_delete()
    return Response(status=204)

def before_restore(self, obj):
    pass

def can_hard_delete(self, obj) -> bool:
    return False
```
Viewsets that customise `get_queryset` (for example `JobViewSet` visibility in 1.8) must call `super().get_queryset()` and add their filters on top.
- `?deleted=true` lists only rows in trash and needs the `list_trash` permission of that viewset (for example `jobs.restore`).
- Permissions: jobs (`jobs.restore`, `jobs.delete_permanent`), customers (`customers.delete` for both; permanent delete Owner-only via `data.bulk_delete`).
- `can_hard_delete(obj)` returns False for anything with financial records (a job with payments or invoices, a customer with jobs) → 409 `trash.has_financial_records`. Invoices are never in trash (issued ones are cancelled; drafts may be soft-deleted and restored).
- Restoring a customer whose phone is now used by another live customer → 409 `customer.phone_exists`.
- Audit `*.restored` and `*.deleted_permanently`.

### 1.20.2 Purge job
Management command `purge_trash`: hard-deletes rows soft-deleted more than 30 days ago for jobs and customers that pass `can_hard_delete`, plus orphaned photo files of deleted jobs (delete from storage, then the row). Add `"purge-trash": "purge_trash"` to `CRON_JOBS` and to `.github/workflows/cron.yml`. `TODO(verify)` retention with the CA before deleting anything financial (nothing financial is deleted by this command).

### 1.20.3 Exports
- Add `openpyxl>=3.1` to `requirements.txt`.
- `GET /exports/customers.xlsx`, `/exports/jobs.xlsx?from=&to=`, `/exports/invoices.xlsx?from=&to=`, `/exports/payments.xlsx?from=&to=` — permission `data.export` (Owner by default).
- Use `Workbook(write_only=True)` and stream rows; dates in IST; money as rupee numbers with 2 decimals (convert from paise with `Decimal(p) / 100`); phones unmasked (the exporter is the owner).
- Every export writes audit `data.exported` with `{type, from, to, rows}`.
- Ranges longer than 1 year → 400 (keeps the free instance responsive).
- Frontend: Settings → Data → Export (type, date range, then `sharePdf`-style file sharing via `apiBlob`).

### 1.20.4 Frontend trash
Settings → Data → **Trash**: tabs Jobs / Customers listing deleted items with "Restore" and "Delete forever" (permission-gated, confirm dialog).

### 1.20.5 Tests
- a deleted job appears only in `?deleted=true`; restore brings it back; Engineer cannot see trash (403)
- permanent delete of a job with a payment → 409; of a bare job → gone, with an audit row
- `purge_trash` deletes only rows older than 30 days
- exports: Front Desk → 403; Owner gets a valid XLSX (open it with `openpyxl.load_workbook` in the test) with the right row count; audit row written; Shop B rows never present

**Done when:** deleted records can be restored, permanent deletion is safe, and exports are permission-gated and audited.

---

## 1.21 Settings screens and basic reports

**Depends on:** 1.19, 1.20 · **Effort:** 2–3 days
**Read first:** `design/02-information-architecture.md` §12 and §16

### 1.21.1 Backend
- Shop logo: `POST /shops/current/logo/` (multipart, `shop.settings`, processed by `normalise_photo` resized to 512 px, PNG allowed) sets `logo_key`; `GET /shops/current/` returns `logo_url` (signed).
- Add any missing settings fields to `ShopSerializer`: `auto_sms_events`, `invoice_prefix` rule (1.13), and `default_terms` (new `TextField` on Shop, used on invoices and receipts).
- `GET /reports/summary/?from=YYYY-MM-DD&to=YYYY-MM-DD` (permission `reports.view_basic`; maximum 366 days):
  ```json
  {
    "jobs": {"received": 0, "delivered": 0, "by_status": {"received": 0}},
    "collections": {"total_paise": 0, "by_mode": {"cash": 0, "upi": 0, "card": 0, "bank": 0}, "refunds_paise": 0},
    "revenue": {"invoiced_paise": 0, "credit_notes_paise": 0, "net_paise": 0}
  }
  ```
  With `reports.view_profit` add `"profit": {"parts_cost_paise": 0, "gross_profit_paise": 0}` (from delivered jobs' `total_paise − cost_paise` in the range). Dates are IST days.
- Tests: fixed fixtures with known totals; IST day boundaries; Engineer → 403; Front Desk gets no `profit` key.

### 1.21.2 Frontend (`(app)/more/settings/...`)
| Screen | Fields / actions | Permission |
|---|---|---|
| Shop profile | name, type, phone, address, city, pincode, state, logo upload | `shop.settings` |
| GST & invoices | GST switch, GSTIN, registration type, invoice prefix, round-off, default terms, UPI ID | `shop.settings` |
| Job settings | lock after delivery, engineers see assigned only, mask phone for engineers, default warranty days, tracking on/off, tracking expiry days | `shop.settings` |
| Brands | list per category, add, rename, hide (`is_active`), reorder | `shop.settings` |
| Accessories | list, add, rename, default tick, reorder | `shop.settings` |
| Messaging | automatic SMS toggles per event, WhatsApp template editor (with placeholder chips) | `shop.settings` |
| Printer | from 1.17 | `printers.configure` |
| Language | from 0.10 | everyone |
| Account | profile, devices & sessions, log out everywhere | everyone |
| Audit log | list from `/audit-logs/` with filters | `audit.view` |
| Data | export, trash | `data.export` / restore permissions |

All forms send `If-Match` with the shop version and handle `409`.

**Reports** (`(app)/more/reports/page.tsx`, `reports.view_basic`): range chips Today / 7 days / This month / This FY (April–March) / Custom; cards for jobs, collections by mode, revenue; profit card only with `reports.view_profit`. Home shows a "Today's collection" card (from `/dashboard/summary/`) for users with `reports.view_basic`.

**Done when:** every setting in the table can be changed from the app, and reports match hand-calculated fixture totals.

---

## 1.22 Translation completion and accessibility

**Depends on:** 1.21 · **Effort:** 2 days · 🧑‍🔧 native-speaker review

1. `pnpm i18n:check` must show **zero** `[TODO hi]` warnings. Translate every remaining string. Keep domain words consistent with `docs/domain-glossary.md`.
2. 🧑‍🔧 A native Hindi speaker reviews the key screens (login, intake, job detail, payment, invoice, tracking page, receipts, SMS templates) in `hi` and `hi-Latn`. Record fixes; note the reviewer and date in `docs/decisions.md`.
3. Layout check at 360 px in `hi`: Devanagari text is often longer; no truncated buttons, no overflow in badges or the bottom nav.
4. Accessibility:
   - `pnpm add -D @axe-core/playwright`; add `e2e/a11y.spec.ts` that runs axe on welcome, login, home, jobs list, job detail and intake step 1 and fails on serious/critical violations.
   - Every icon-only button has an `aria-label` from i18n.
   - Touch targets ≥ 48 px (spot-check with dev tools); focus order in forms; visible focus ring.
   - Status colours always come with a text label (never colour alone).
   - Contrast: check the status badge colours against WCAG AA.
5. Backend: the tracking page strings, PDF labels and SMS templates are complete in all three locales (test that every key in `STRINGS["en"]` exists in the other two).

**Done when:** zero untranslated strings, the reviewer has signed off, and the axe test passes.

---

## 1.23 Security and performance hardening

**Depends on:** 1.22 · **Effort:** 3 days

1. **Permission matrix test** (`backend/apps/core/tests/test_permission_matrix.py`): a table of `(method, url_template, permission_code)` for **every** shop-scoped endpoint. For each default role, assert the status is 2xx/4xx-business when the role has the code and 403 when it does not. Combined with the 0.7 "every action has a permission" test, this catches any missed endpoint.
2. **Isolation sweep:** for every detail endpoint, `assert_other_shop_hidden` (generate the list from the same table).
3. **Query counts:** `django_assert_max_num_queries` on the main lists (jobs, customers, invoices, payments) with 30 rows; fix N+1 with `select_related` / `prefetch_related` / annotations.
4. **Indexes:** run `EXPLAIN ANALYZE` on the jobs search (`q`), customer search and dashboard queries against a seeded database (management command `seed_demo_data --jobs 20000`, dev only). Add indexes where a sequential scan appears on large tables. Record findings in `docs/decisions.md`.
5. **Abuse tests:** OTP send flood from one IP (429), OTP verify brute force (lock after 3), tracking flood (429), upload size limits, oversized JSON (Django `DATA_UPLOAD_MAX_MEMORY_SIZE` set to 2.5 MB explicitly).
6. **Headers and CORS:** prod CORS list contains only the Pages domain and the two Capacitor origins; `check --deploy` clean; HSTS raised to `31536000` once HTTPS is confirmed stable.
7. **Secrets scan:** add a `gitleaks` job to CI (`gitleaks/gitleaks-action`); fix or allowlist findings (dev-only keys only).
8. **Dependencies:** `pip-audit` (already in CI) and `pnpm audit --prod` (add to CI; fail on high/critical).
9. **Playwright in CI:** a job that starts Postgres, runs the backend with dev settings (`runserver` in the background, `migrate`), runs `pnpm build && pnpm exec playwright test` against `pnpm dev`. Keep it to the login, intake and payment flows.
10. 🧑‍🔧 **Restore drill:** follow `docs/runbooks/restore.md` to restore the latest backup into a fresh Neon branch or a local Postgres, run `python manage.py migrate --check`, and open the app against it. Write the date, duration and problems in the runbook.
11. 🧑‍🔧 **Mid-range Android performance:** on a ₹10–15k phone, the jobs list scrolls smoothly and the intake steps respond instantly. Fix any screen over ~300 ms per interaction (memoise lists, paginate, avoid re-render of the whole wizard).
12. Run `/code-review`-style self-review over the diff of Phase 1 (or ask the human to run their review tool) and fix every blocker with a test.

**Done when:** the matrix and isolation tests cover every endpoint, CI runs gitleaks, audits and Playwright, and the restore drill succeeded.

---

## 1.24 Privacy, account deletion and store readiness

**Depends on:** 1.23 · **Effort:** 2–3 days · 🧑‍🔧 store accounts, legal text
**Read first:** `docs/01-blueprint.md` §10, `docs/02-database-schema.md` §9, `docs/release.md`

1. **Account deletion (store requirement):**
   - `POST /auth/delete-account/` `{reason?}` creates `AccountDeletionRequest(scheduled_for=now+14 days)` and calls `logout_everywhere`. `POST /auth/delete-account/cancel/` cancels it (when the user logs in again within the grace period).
   - An organisation owner cannot delete their account while they own a shop with other active members → 409 `account.owner_has_staff` (they must transfer or close the shop first). `TODO(verify)` the product decision with the client.
   - Command `process_account_deletions` (added to `CRON_JOBS`): for due requests, anonymise the user (`name="Deleted user"`; `phone = "+0" + user.id.hex[:14]`, a unique 16-character placeholder that can never be a real number because E.164 never starts with `+0`; `email=None`; `is_active=False`; `deleted_at=now`), set memberships to `removed`, revoke devices, and mark the request `completed`. Invoices, audit rows and job references keep the anonymised user.
   - Public web page `/account/delete/` (Django template, outside the app): explains the process and lets a user verify by OTP and confirm. Link it in the store listings.
   - In-app: Settings → Account → **Delete account** with a clear explanation and confirm step.
2. **Customer data deletion:** `POST /customers/{id}/anonymize/` (permission `customers.delete` + `data.bulk_delete`, i.e. Owner): replaces name with "Customer removed", clears phone/email/address/notes; issued invoices keep their snapshots (legal record). Audit `customer.anonymized`.
3. **Legal pages:** Django templates `/legal/privacy/` and `/legal/terms/` with text provided by the owner/lawyer (`TODO(verify)` DPDP Act requirements). Link them from the welcome screen and Settings.
4. **Reviewer demo account:** set `OTP_TEST_NUMBERS` in production to **one** reviewer number with a private code; that user belongs to a demo shop seeded with sample data (`seed_demo_data --shop-name "FixPro Demo"`). Record the number in `docs/release.md` and the code only in the password manager.
5. **App metadata:** app icon and splash (`@capacitor/assets` to generate from one 1024 px source), app name, version and build numbers (`android/app/build.gradle` `versionCode`/`versionName`, iOS `CFBundleShortVersionString`/`CFBundleVersion`), and `NEXT_PUBLIC_APP_VERSION` from the same value.
6. **Store listings:** screenshots in English and Hindi at phone sizes, short and full descriptions, Data safety (Play) and Privacy nutrition labels (App Store) answers based on what the app actually collects (phone, name, customer data entered by the shop, photos, crash data). Fill the checklist in `docs/release.md`.
7. **Builds:** 🧑‍🔧 signed Android App Bundle (keystore **outside** the repo; record its location in the password manager) to Play **internal testing**; iOS archive to TestFlight.

**Done when:** account deletion works in-app and on the web page, legal pages are live, and both store test tracks have a build with the reviewer account working.

---

## 1.25 Live pilot at your shop and Phase 1 exit

**Depends on:** 1.24 · **Effort:** 1–2 weeks of real use

1. Install the release build on the counter phone and the engineers' phones; connect the shop printer; set the shop settings for real.
2. Run **every** new job through FixPro for at least one full week, alongside the old register.
3. Keep `docs/pilot-log.md`: date, who, what happened, severity (blocker / annoying / idea), and the fix commit. Spend 10–15 minutes daily triaging. **Fix issues; do not add features.**
4. Watch Sentry daily. Check that the backup workflow ran every day.
5. Before onboarding any **second** shop, Phase 3.1 (paid VPS) must be done. Write this in `docs/PROJECT-STATE.md`.

### Phase 1 exit checklist (copy into COMPLETION.md)
- [ ] 100 % of new jobs for 7 consecutive days went through FixPro
- [ ] No data-isolation bug and no invoice-numbering gap found
- [ ] Printing works on the shop's real printer (thermal) and PDFs are shared successfully
- [ ] At least 10 customers opened their tracking link
- [ ] CA review of GST invoices completed and recorded
- [ ] Restore drill done (1.23) and daily backups green for the pilot week
- [ ] The known-issues list in `docs/PROJECT-STATE.md` is short and understood


---

# 📦 Phase 2: Stock, POS, Khata and Staff

> **Exit criteria:** one month of real bookkeeping in FixPro (sales, expenses, dues, register closes, salaries) matches the manual books.
> **Before starting:** Phase 1 exit checklist complete. Re-read `docs/02-database-schema.md` §4.9–4.12 and §10 item 5. Add each new permission code with **R3** (codes are already listed in schema §8 under "P2"). Every money column is integer paise; every new table follows **R1**, every endpoint **R2**, every screen **R5**.

---

## 2.1 Inventory data model and stock ledger

**Depends on:** Phase 1 · **Effort:** 2 days

1. App `apps/inventory`. Models per schema §4.9: `ItemCategory` (with `parent` self-FK), `Supplier`, `Item`, `ItemCompatibility`, `StockMovement`, `PriceHistory`, `Demand`. Add to `Item`: `qty_on_hand = DecimalField(10, 3, default=0)` (cached), unique `(shop, sku)` and `(shop, barcode)` where not null and not deleted, trigram index on `name`.
2. `StockMovement` is **append-only** (same pattern as `AuditLog` in 0.15: queryset guards plus a trigger migration). `quantity` is signed (`CheckConstraint quantity <> 0`). `kind`: `in`, `out`, `adjust`, `return_in`, `return_out`, `repair_use`, `sale`. `ref_type` / `ref_id` link to the source (job, sale, purchase, adjustment).
3. Service `apps/inventory/stock.py`:
   ```python
   @transaction.atomic
   def move_stock(*, shop, item, kind, quantity: Decimal, actor, unit_cost_paise=0, supplier=None,
                  ref_type="", ref_id=None, note="") -> StockMovement:
       """The ONLY way stock changes. Locks the item row, writes the movement, updates the cached quantity."""
       item = Item.objects.select_for_update().get(pk=item.pk, shop=shop)
       movement = StockMovement.objects.create(
           shop=shop, item=item, kind=kind, quantity=quantity, unit_cost_paise=unit_cost_paise,
           supplier=supplier, ref_type=ref_type, ref_id=ref_id, note=note, moved_by=actor, moved_at=timezone.now(),
       )
       item.qty_on_hand = item.qty_on_hand + quantity
       item.save(update_fields=["qty_on_hand", "updated_at"])
       return movement
   ```
   Kinds `out`, `repair_use`, `sale`, `return_out` must pass a **negative** quantity; the service asserts the sign per kind (`DomainError stock.invalid_sign`). Negative stock is allowed (shops often record late), but the response includes `warnings: ["stock.negative"]`.
4. Management command `rebuild_stock_cache` recomputes `qty_on_hand` from movements (for audits) and reports differences.
5. Permissions (R3): `inventory.view` (all default roles), `inventory.edit` (Owner, Manager), `stock.adjust` (Owner, Manager). Cost price fields stay behind `money.see_cost_profit`.
6. Tests: movement signs; 10 parallel `move_stock(-1)` calls leave the exact quantity (`transaction=True`); append-only guards; `rebuild_stock_cache` finds no difference after random movements.

**Done when:** stock can only change through `move_stock`, and the cache always equals the sum of movements.

## 2.2 Inventory API and screens

**Depends on:** 2.1 · **Effort:** 3 days
**Read first:** `design/01-design-system.md` §4.4, `design/02-information-architecture.md` §7–8

Backend endpoints: `/item-categories/`, `/items/` (filters `q` [name/SKU/barcode], `category`, `low_stock=true` [qty ≤ reorder_level], `out_of_stock=true`; `GET /items/by-barcode/?code=`), `POST /items/{id}/adjust/` `{kind: in|out|adjust, quantity, unit_cost_paise?, supplier_id?, note}` (`stock.adjust`, `@idempotent()`), `GET /items/{id}/movements/`, `GET /inventory/summary/` → `{total_items, low_stock, out_of_stock, stock_value_paise}` (value only with `money.see_cost_profit`).

Screens:
- Inventory tab (replaces the placeholder): search with a barcode button (reuse `scanBarcode`), 2×2 metric grid, navigation rows (All parts, Low stock, Categories, Suppliers, Stock movements, H/W Match, Demands).
- Parts list, part detail (stock, prices, movement history, compatible models), add/edit part, and the stock adjust sheet (Stock in / Stock out / Damaged → `out` with note "damaged").
- Home: the low-stock card becomes live (top 3 low items).

**Done when:** parts can be added, found by barcode, and adjusted, with history.

## 2.3 Parts on jobs and automatic stock deduction

**Depends on:** 2.2 · **Effort:** 2 days

1. Migration: change `JobLineItem.item_id` (UUID) into `item = models.ForeignKey("inventory.Item", null=True, on_delete=models.PROTECT)` (a schema migration plus a data-preserving step; there is no data yet if 1.11 left it null).
2. Line item sheet: kind "Part" now offers "Pick from inventory" (search, barcode). Picking fills the description, `unit_price_paise` from `item.price_paise` and `unit_cost_paise` from `item.cost_paise`.
3. Deduction rule in `on_job_status_changed`:
   - entering `repaired` → for each line item with an item and no deduction yet, `move_stock(kind="repair_use", quantity=-qty, ref_type="job", ref_id=job.id)`. Record the movement ID on the line item (`stock_movement_id` field) so it runs **once**.
   - `repaired`/`ready_for_pickup` → `in_repair` (rework) or job reopened → reverse with `return_in` movements and clear `stock_movement_id`.
   - editing a part line after deduction → reverse the old movement, apply the new one, inside the same transaction.
4. Tests: deduction happens once even if the status changes twice; rework reverses; cancelled jobs never deduct; quantity 1.5 works; a part from another shop → 400.

**Done when:** stock follows real repairs without double counting.

## 2.4 Suppliers, purchases and price tracking

**Depends on:** 2.2 · **Effort:** 2 days

1. `/suppliers/` CRUD (GSTIN validated with `validate_gstin`; `payable_paise` read-only).
2. Purchase entry: `POST /purchases/` `{supplier_id, bill_no, bill_date, lines: [{item_id, quantity, unit_cost_paise}], paid_paise, paid_mode}` → for each line `move_stock(kind="in", ...)`, update `item.cost_paise` (latest cost), write `PriceHistory`, and increase `supplier.payable_paise` by `total − paid`. Store the purchase as a `Purchase` + `PurchaseLine` pair (add both models to schema §4.9 in the same commit).
3. Supplier payment: `POST /suppliers/{id}/payments/` reduces `payable_paise` and records an expense-side payment (direction `out`, `ref_type="supplier"`; reuse `Payment` with `job=None` or a new `SupplierPayment` model — choose `SupplierPayment` to keep customer payments clean, and document the choice in `docs/decisions.md`).
4. Price-drop alert: when a new purchase cost is lower than the previous cost for that item from any supplier, add it to `GET /inventory/alerts/` (`{type: "price_drop", item, old_cost, new_cost, supplier}`).
5. Screens: Suppliers list/detail (payable, purchase history, pay button), "New purchase" form with item search and barcode, alerts list.

**Done when:** a purchase updates stock, costs and the supplier's payable in one action.

## 2.5 H/W Match and Demands

**Depends on:** 2.2 · **Effort:** 1–2 days

1. `ItemCompatibility` CRUD under `/items/{id}/compatibility/` (`inventory.edit`); `GET /hw-match/?brand=&model=` → items compatible with a device model (case-insensitive, trigram on model).
2. Job detail: a "Compatible parts in stock" hint listing H/W matches for the job's device.
3. `/demands/` CRUD: `item_text`, optional customer, quantity, status `open` → `fulfilled` / `dropped`; when a purchase contains a matching item (manual link), offer "Mark demand fulfilled" and a WhatsApp message to the customer.
4. Home quick actions "H/W Match" and "Demands" are enabled; Inventory rows link to them.

**Done when:** staff can find compatible parts by model and track customer requests.

## 2.6 POS counter, Quick Bill and returns

**Depends on:** 2.3, 1.13 · **Effort:** 3–4 days
**Read first:** `docs/02-database-schema.md` §4.10, `design/02-information-architecture.md` §9

1. App `apps/pos`: `SaleCounter` (same pattern as `JobCounter`), `Sale`, `SaleLine`, `SaleReturn` per schema §4.10.
2. `checkout(*, shop, actor, lines, customer=None, payments: list[{mode, amount_paise}], issue_invoice: bool)` in one transaction: allocate `sale_no`; create lines; `move_stock(kind="sale", -qty)` for item lines; totals with the 1.13 tax engine (same `invoice_kind_for` rules); payments (`Payment` gains a nullable `sale` FK); the sum of payments must equal the total unless a customer is set (the rest becomes udhaar, recorded in 2.9); optionally create **and issue** an invoice with `sale_id` set, through the 1.13 issue service.
3. **Quick Bill** = a sale whose lines are free text (no item), for instant service bills without a job sheet.
4. Returns: `POST /sales/{id}/return/` `{lines: [{sale_line_id, quantity}], refund_mode, reason}` → `SaleReturn`, `move_stock(kind="return_in")`, refund `Payment(direction=out)`, and a credit note when the sale was invoiced.
5. Permissions: `pos.sell` (Owner, Manager, Front Desk), `pos.refund` (Owner, Manager).
6. Screens: POS counter (barcode-first: each scan adds or increments a line; search; cart with qty steppers and discounts; customer optional; split payment; Charge → receipt print / share), Quick Bill (free-text lines), Sales history with return flow. Home "Quick Bill" tile and More → "POS Counter" enabled.
7. Tests: checkout atomicity (a failure in invoicing rolls back stock and payments); split payments; returns cannot exceed sold quantity; sale numbers unique under concurrency.

**Done when:** an accessory sale with a barcode scan, UPI payment and printed receipt takes under 20 seconds.

## 2.7 Cash register (day-end close)

**Depends on:** 2.6 · **Effort:** 2 days
**Read first:** `docs/02-database-schema.md` §4.11 (`cash_register_session`), glossary "Close register"

1. `CashRegisterSession` model per schema; one open session per shop (partial unique constraint on `closed_at IS NULL`).
2. `POST /register/open/` `{opening_cash_paise}`; `GET /register/current/` → expected totals so far; `POST /register/close/` `{counted_cash_paise, notes}` → computes `expected_cash = opening + cash in − cash out (refunds, cash expenses from 2.8)`, `expected_upi`, `expected_card`, `difference = counted − expected_cash`; locks the session. Permission `register.close` (Owner, Manager, Front Desk).
3. Every `Payment` and cash `Expense` created while a session is open gets `register_session_id` (schema §10 item 5). Payments without an open session are still allowed; the close report lists "payments outside sessions".
4. Shop setting `require_open_register_for_cash` (default false).
5. Screens: register open sheet, live "Today's drawer" card, close screen with denomination counter (₹500, ₹200, ₹100, ₹50, ₹20, ₹10, coins) that sums to `counted_cash_paise`, and a printable close report (thermal + PDF).
6. Tests: expected totals with mixed modes and refunds; only one open session; closed sessions are immutable.

**Done when:** the day-end close matches a real cash drawer count.

## 2.8 Expenses and Khata dashboard

**Depends on:** 2.7 · **Effort:** 3 days
**Read first:** `docs/02-database-schema.md` §4.11, `design/02-information-architecture.md` §10

1. Models: `ExpenseCategory` (seeded: Rent, Electricity, Internet, Salary, Tea/Snacks, Transport, Parts purchase, Other), `Expense`, `RecurringExpense`, `DailyShopSummary` (rebuildable cache).
2. `/expenses/` CRUD (`expenses.manage`; Owner, Manager). Cash expenses link to the open register session.
3. Recurring expenses: command `generate_recurring_expenses` creates the month's expense on `day_of_month` (idempotent via `last_generated_for`); add to `CRON_JOBS` daily.
4. `rebuild_daily_summary(shop, date)` computes revenue (payments in − refunds, split into repairs / sales / quick bills / rough jobs by source), cost (parts cost of delivered jobs + sale line costs), expenses, profit, job counts, sales count. Called after payments, sales and expenses (on commit) and nightly for the previous 7 days (cron `rebuild-summaries`).
5. `GET /khata/summary/?period=day|month&date=` from `DailyShopSummary`; permission `reports.view_profit` for profit numbers, `reports.view_basic` for revenue.
6. Screens: Khata dashboard (daily/monthly toggle, net profit hero, revenue split cards, expenses list, add expense sheet), recurring expenses settings. Home revenue card goes live.
7. Tests: summary equals a hand-computed fixture; rebuild is idempotent; recurring generation does not duplicate.

**Done when:** daily and monthly profit match a manual calculation for a test month.

## 2.9 Customer ledger and udhaar

**Depends on:** 2.8 · **Effort:** 2 days

1. `CustomerLedgerEntry` (append-only) per schema: `kind` `charge` / `payment` / `adjustment`, signed `amount_paise` (charge positive = customer owes more).
2. Entries are written by services only: delivering a job or completing a sale with an unpaid balance → `charge` for the balance; any later payment against that job/sale → `payment` (negative); manual adjustments need `payments.refund` and a reason (audited).
3. Backfill command for jobs delivered in Phase 1 with a balance (`backfill_customer_ledger`), run once.
4. `GET /customers/{id}/ledger/` (running balance), `GET /dues/` (customers with balance > 0, sorted by amount and age), `POST /customers/{id}/ledger/payments/` (collect udhaar; allocates to the oldest open charges).
5. Screens: Dues list (with 1-tap WhatsApp reminder: "Namaste {name}, ₹{amount} is pending at {shop}. Pay by UPI: {upi_link}"), customer ledger tab, collect payment sheet. The customers "With dues" chip switches to the ledger balance.
6. Tests: running balance; ledger balance equals the sum of open job/sale balances for fixtures; append-only guards.

**Done when:** every rupee of udhaar is visible per customer and collectible.

## 2.10 Rough Reg and Old Buy

**Depends on:** 2.6 · **Effort:** 2 days

1. **Rough Reg:** a one-screen intake creating `Job(kind="rough")` with only customer name/phone (optional), device text, fault and estimate. Rough jobs follow the same status machine; they can be "Upgraded to full job sheet" later (fills device and identifiers). Home tile enabled. Summary splits rough revenue (2.8).
2. **Old Buy** (`apps/oldbuy`, schema §4.12 `old_purchase`): seller name/phone, device, IMEI (validated, with duplicate lookup and the Check IMEI shortcut), price, condition, ID-proof photo (stored like job photos, permission-gated view), purchased date, resale status (`in_stock` / `sold` / `scrapped`). Payment out recorded as an expense-side payment. `TODO(verify)` legal record-keeping rules for second-hand phone purchases (police register formats differ by city); add a printable register export.
3. Permissions: new code `oldbuy.manage` (Owner, Manager) via R3.
4. Tests: IMEI validation, ID-proof photo access only with permission, export.

**Done when:** both quick flows work and appear correctly in Khata.

## 2.11 Staff salary, commission and payroll

**Depends on:** 2.8 · **Effort:** 2–3 days
**Read first:** `docs/02-database-schema.md` §4.12

1. Membership fields (migration): `salary_paise` (monthly, null), `commission_bp` (basis points, null), `commission_basis` (`labour` / `job_total` / `profit`; default `labour`).
2. `PayrollEntry` per schema plus `StaffAdvance` (`membership`, `amount_paise`, `given_at`, `recovered_in_payroll_id` null).
3. `generate_payroll(shop, month)`: for each active member with a salary or commission → draft entry: base, commission (from delivered jobs in the month assigned to them, using the basis), advances to deduct, net. Regenerating a draft recalculates; paid entries are frozen.
4. `POST /payroll/{id}/pay/` `{mode}` → status `paid`, creates an `Expense` (category Salary), links advances.
5. Performance report `GET /reports/staff/?from=&to=`: per engineer → jobs completed, revenue, labour, parts profit (with `reports.view_profit`), average turnaround (received → repaired), rework rate (jobs that went repaired → in_repair).
6. Permissions: `payroll.manage` (Owner).
7. Screens: Staff detail gains Salary & commission settings, advances list, payslip view; Payroll month screen; Staff performance report.
8. Tests: commission maths per basis with fixtures; advances deducted once; paid entries immutable; engineers can see only their own payslips (`GET /me/payslips/`).

**Done when:** a month's payroll is generated, paid, and appears in Khata expenses.

## 2.12 Phase 2 reports and exit

**Depends on:** 2.1–2.11 · **Effort:** 1 day + one month of real use

1. Extend `/reports/summary/` with sales, expenses, profit splits, stock value, and dues; GST summary for the period (taxable and tax by rate) as an export for the CA (`/exports/gst-summary.xlsx`). `TODO(verify)` the format with the CA (GSTR-1 filing itself is out of scope).
2. Permission matrix and isolation tests (1.23 items 1–2) extended to every Phase 2 endpoint.
3. Run one full month of real bookkeeping. Compare FixPro's month totals with the manual books in `docs/pilot-log.md`.

**Exit checklist:** month totals match manual books (sales, expenses, cash, dues); stock count of 20 random items matches the shelf; payroll paid through FixPro; no isolation bug; restore drill repeated.


---

# 🌐 Phase 3: Scale and Monetisation

> **Exit criteria:** a second (external) shop runs on a paid VPS with backups and monitoring; branches, subscriptions and offline core flows work.
> **Before starting:** Phase 2 exit complete. Create `docs/04-roadmap-phase-3.md` only if this section needs more detail than given here; otherwise keep working from this file. Re-verify every external fact (store billing rules, prices, plugin support) in the week you depend on it.

---

## 3.1 Paid VPS migration and background workers

**Depends on:** Phase 2 · **Effort:** 3–4 days · 🧑‍🔧 server access
**Why first:** the decision log requires a paid VPS before a second shop goes live.

1. Choose a VPS (2 vCPU / 4 GB is plenty to start; `TODO(verify)` price and Indian region). Ubuntu LTS, a non-root user, SSH keys only, `ufw` allowing 22/80/443, automatic security updates.
2. `deploy/docker-compose.prod.yml`: `caddy` (automatic HTTPS, reverse proxy to `api:8000`), `api` (the existing image, gunicorn), `worker` (Celery), `beat` (Celery beat), `redis:7`, `postgres:16` (named volume; or keep Neon paid — decide and record in `docs/decisions.md`).
3. Celery: add `celery[redis]` to requirements; `config/celery.py`; move inline work to tasks — SMS sending (1.19), PDF caching (1.15), daily summaries (2.8), purge/cron jobs (replace the GitHub cron endpoint calls with beat schedules, keep the endpoint for manual runs).
4. Backups: nightly `pg_dump` from the VPS with the same `age` encryption and S3 upload (reuse the 0.17 workflow logic as a script in `deploy/backup.sh` run by cron), plus weekly restore test into a scratch database (automated script that fails loudly).
5. Monitoring: uptime check on `/api/v1/health/` (any free uptime service), disk space alert, Sentry already in place.
6. Cut-over runbook in `docs/runbooks/migrate-to-vps.md`: freeze writes (maintenance banner via a `MAINTENANCE_MODE` env flag that makes the API return 503 `maintenance.active`), dump Neon, restore to VPS, smoke test, switch DNS/API URL, keep Neon read-only for a week.
7. Mobile builds point at the new API domain; old builds keep working because the old Render URL redirects or proxies for a transition period (or ship an update first; the API's `426 app.update_required` from the conventions can force it).

**Done when:** the shop runs on the VPS with backups verified by an automated restore test.

## 3.2 Multi-branch organisations

**Depends on:** 3.1 · **Effort:** 3 days
**Read first:** `docs/01-blueprint.md` (Organisation → branches, hidden until a second branch), schema §4.2

1. `POST /organizations/current/shops/` (new permission `org.manage_branches`, Owner) creates another shop in the caller's organisation, with an Owner membership and the 1.1 seeds. Optionally copies settings, brands and accessories from an existing branch.
2. Staff across branches: inviting an existing org member to another branch reuses 0.16.
3. Consolidated reports: `GET /org/reports/summary/` aggregates `DailyShopSummary` across all shops where the caller has `reports.view_profit`. The query must iterate over the caller's memberships (never `organization_id` alone) so a branch-limited manager sees only their branches.
4. Stock transfer between branches: `POST /stock-transfers/` → `transfer_out` / `transfer_in` movements in both shops in one transaction (add the two kinds to `StockMovement`).
5. UI: the shop switcher chevron appears automatically when the user has 2+ shops (already built in 0.14); "Branches" screen under More for owners; consolidated dashboard.
6. Tests: a manager of branch 1 cannot see branch 2 in consolidated reports; transfers are atomic; isolation tests still pass with two shops in one organisation.

**Done when:** an owner runs two branches with separate data and a combined view.

## 3.3 Plans, limits and subscriptions

**Depends on:** 3.2 · **Effort:** 4–5 days · 🧑‍🔧 pricing decisions, store policy check
**Read first:** `docs/02-database-schema.md` §4.13, `docs/01-blueprint.md` §9 (store billing risk)

1. App `apps/plans`: `Plan`, `Subscription`, `SubscriptionEvent`, `UsageCounter`, `MessageCreditLedger` per schema.
2. `apps/plans/limits.py`: `check_limit(org, metric)` used in services (`create_job` → `max_active_jobs`, invites → `max_staff`, 3.2 → `max_shops`, SMS → `sms_credits`). Over limit → 402-style business error: use **422 `plan.limit_reached`** with `fields.metric` (keep the conventions' status set). Never block reading or exporting existing data.
3. Trial: new organisations get a trial subscription (length `TODO(verify)` with the client); expiry moves to the free plan's limits, not a lockout.
4. Payments for plans — **verify current Google Play and App Store rules first** (`TODO(verify)`): digital subscriptions sold inside the apps generally must use the stores' billing. Options to evaluate and record in `docs/decisions.md`: (a) Play Billing / StoreKit via a maintained Capacitor plugin with server-side receipt verification and store webhooks (RTDN / App Store Server Notifications) into `SubscriptionEvent` (idempotent by `external_event_id`); (b) web-only purchase (Razorpay) with no purchase links inside the apps, if the store rules for your category allow it. Implement only the chosen path.
5. `billing.subscription` permission (Owner) for the Plan & Billing screen: current plan, usage meters, upgrade.
6. Tests: limits enforced in every service that creates limited things; webhook replay is idempotent; expired trial keeps data readable.

**Done when:** plans and limits work end to end with the chosen, policy-checked payment path.

## 3.4 Platform admin console

**Depends on:** 3.3 · **Effort:** 2 days

1. Harden Django admin for `is_platform_admin` users only: 2FA (`django-otp` or equivalent maintained package; `TODO(verify)`), IP allowlist option, every admin change written to `AuditLog` (`admin.*` actions) through `LogEntry` signal hooks.
2. Read-only dashboards: organisations, shops, plan, usage, last activity, error counts (Sentry link).
3. Support access: an explicit, time-limited "support session" (`SupportGrant` model: org, granted_by owner, expires_at) required before staff can view a shop's data through the admin; audited. No silent tenant bypass (0.7 removed it on purpose).

**Done when:** support can help a shop only with the owner's time-limited grant, and every action is audited.

## 3.5 Offline mode and sync (core flows)

**Depends on:** 3.1 · **Effort:** 2–3 weeks · highest risk in Phase 3
**Read first:** `docs/decisions.md` ("Online-first, offline later"), `docs/api-conventions.md` (`sync.conflict`)

Scope: job create, status change, notes, payments. Everything else stays online-only with a clear "needs internet" state.
1. Local store: `@capacitor-community/sqlite` (R7, `TODO(verify)` support) on native; IndexedDB on web. Tables mirror the API shapes for jobs, customers, devices, payments, plus `outbox(id, method, path, body, idempotency_key, created_at, attempts, last_error)`.
2. Client IDs: the client generates UUIDs for new jobs/customers/payments (the server accepts client-provided `id` on create for these models; validate it is a UUID and not already used in another shop → 409).
3. Job numbers offline: the server still allocates `job_no`; offline jobs show "Pending #" until synced. (Printed offline receipts use the tracking token only; document this UX in `docs/decisions.md`.)
4. Pull: `GET /sync/changes/?since=<server_cursor>` returns changed and deleted (tombstones via `deleted_at`) rows for the shop since the cursor, paginated, ordered by `updated_at, id`.
5. Push: the outbox replays requests in order with their original `Idempotency-Key` and `If-Match`. On `409 concurrency.version_mismatch`: for status changes, re-fetch and re-apply only if the transition is still allowed, otherwise surface a conflict to the user; for edits, last-write-wins on non-financial fields, never on payments (payments are append-only so they never conflict).
6. UI: offline banner already exists (0.14); add a sync status chip (pending count, last sync time, errors with retry).
7. Tests: a simulated offline session with 20 operations replays to the same server state as online; duplicate replays are harmless; a conflicting status change is surfaced, not lost.

**Done when:** a job can be created, progressed and paid while offline, and everything syncs correctly afterwards.

## 3.6 Push notifications and customer engagement

**Depends on:** 3.1 · **Effort:** 3 days

1. Push: `@capacitor/push-notifications` + Firebase Cloud Messaging; save `push_token` on `UserDevice`; send on job assignment and on "ready for pickup" to the assigned engineer/front desk. Notification centre screen (bell in the header gets a badge).
2. Customer feedback: on delivery, the tracking page shows a 1–5 rating and comment form (`CustomerFeedback`), rate-limited, one per job. Owners see feedback in a list; 4–5 star responses show a "Review us on Google" link (shop setting `google_review_url`).
3. Bulk SMS campaigns (`Campaign`, `messages.send_bulk`, `campaigns.manage`): only DLT-approved promotional templates, consent check (`sms_opt_in` plus a separate marketing opt-in field — add `marketing_opt_in` default **false**; `TODO(verify)` DPDP consent), message-credit deduction from `MessageCreditLedger`, send through Celery with throttling.
4. Optional WhatsApp Business Cloud API for automated messages, only if the client wants to pay for it (`TODO(verify)` pricing); `wa.me` links remain the default.

**Done when:** staff get push notifications and customers can leave feedback.

## 3.7 Shop website and site leads

**Depends on:** 3.3 · **Effort:** 3 days

1. `ShopWebsite` (schema §4.13): slug, theme, about, services list, published flag. Public Django-rendered page `/s/<slug>/` (same no-JS, fast approach as the tracking page): shop info, services, hours, map link, call/WhatsApp buttons, "Sell your old phone" form.
2. The form creates a `SiteLead` (rate-limited, Turnstile or similar captcha `TODO(verify)`), visible to the shop under More → Site leads with status flow `new → contacted → bought / rejected`; "bought" can create an Old Buy record (2.10).
3. Permission `website.manage`. Settings screen to edit and publish.

**Done when:** a shop can publish its page and receive leads.

## 3.8 Referral, help content and more languages

**Depends on:** 3.3 · **Effort:** 2 days

1. Referral codes (`Referral`): an organisation shares a code; a new organisation that subscribes gives both `reward_days` (applied to subscription end dates).
2. Help: FAQ and tutorial video links (static JSON per locale bundled in the app, editable without a server change), "WhatsApp support" button.
3. Additional Indian languages from blueprint §12 open decision #2: add locale files and run the i18n checker; the tracking page and PDFs need font coverage (add the matching Noto font).

**Done when:** referral rewards apply automatically and help content is available in every shipped language.

## 3.9 Public launch

**Depends on:** 3.1–3.8 · **Effort:** 1 week

1. Full 1.23 hardening pass again (matrix, isolation, abuse, dependency audit, restore drill).
2. Load test the API (k6 or Locust) with 50 shops' worth of data; fix slow queries.
3. Legal review of privacy policy and terms for multiple shops (data processor role). `TODO(verify)` DPDP obligations.
4. Store listings updated; production release; support process written down.
5. Onboard the first external shops one at a time; watch Sentry and support daily.

**Exit checklist:** second shop live on the VPS for 30 days; subscription revenue path working; offline core flows verified in the field; restore drill passed.

---

# 🤝 Phase 4: Marketplace and Community

> Start only after demand is proven with paying shops. Public data is strictly separated from private shop data (blueprint rule 10): marketplace endpoints read **only** marketplace tables, never jobs, customers or inventory directly.

## 4.1 Geo foundation and public shop profiles

**Depends on:** Phase 3 · **Effort:** 3 days
1. Enable PostGIS (`postgis/postgis:16` image on the VPS; `CREATE EXTENSION postgis` migration); add `django.contrib.gis`.
2. `ShopPublicProfile` (schema §4.14) with `location` (`PointField(geography=True)`), opt-in only (`is_published` default false), owner-edited fields only.
3. Settings screen "Public profile" with map pin picker and consent text.

## 4.2 Nearby search

**Depends on:** 4.1 · **Effort:** 2 days
1. `GET /market/shops/?lat=&lng=&radius_km=&category=` (authenticated shops only), distance-ordered, paginated, returns only public profile fields.
2. Mobile screen with list + map, call / directions buttons. Location permission through `src/native/geolocation.ts` (R7).

## 4.3 Wholesale listings

**Depends on:** 4.2 · **Effort:** 3 days
1. `MarketListing` (schema §4.14); a shop can publish an inventory item as a listing (copies title, price, images into the listing — never a live link to the private item row).
2. Search by category, brand, model and distance; expiry and renewal; contact via call/WhatsApp (no in-app payments in this phase).

## 4.4 Verification, trust and moderation

**Depends on:** 4.3 · **Effort:** 3 days
1. Verified badge: platform admin verifies GSTIN/shop documents (`verified_at`, `verified_by`); "Trusted" requires verification plus tenure and good reports.
2. `MarketReport` (report a listing/shop), admin moderation queue, takedown with audit, rate limits on reporting.

## 4.5 Technician community

**Depends on:** 4.4 · **Effort:** decide first
1. Build-vs-buy decision recorded in `docs/decisions.md` (an existing forum product with SSO may be cheaper than building).
2. If building: topics, posts, images, moderation, reporting, and the same verification badges; strict content rules for schematics (`TODO(verify)` copyright).

**Phase 4 exit:** real shops find parts through the marketplace and moderation keeps it clean.

---

## Appendix A: Weekly rhythm (solo developer)

| Day | Focus |
|---|---|
| Monday | Read COMPLETION.md, pick the next subphase, read its "Read first" files, do the riskiest task first |
| Tuesday–Thursday | Implement one subphase at a time: backend + tests, then screens, then device check |
| Friday | Run all Verify commands, update COMPLETION.md and `docs/PROJECT-STATE.md`, real-device testing, plan next week |

## Appendix B: Scope guards

- A task estimated above 6 hours gets split into smaller tasks inside its subphase before starting.
- No Phase N+1 work until Phase N's exit checklist is complete (AGENTS.md "Follow the phase").
- Never skip tenant-isolation or permission tests to save time.
- Verify every external fact (GST rule, free-tier limit, store policy, plugin support, price) in the week you depend on it.
- When an AI suggestion looks too easy for printing, GST, auth or money, test it on a real device or with the CA before trusting it.

## Appendix C: Definition of done (every subphase)

1. All Verify commands pass: `ruff check`, `ruff format --check`, `makemigrations --check`, `pytest` (backend); `pnpm lint` (includes `i18n:check`), `pnpm typecheck`, `pnpm test`, `pnpm build` (frontend).
2. New endpoints: serializer validation, `permission_map`, shop scoping, tests for happy path, forbidden and other shop (R2).
3. New screens: loading, empty, error and permission-denied states; i18n keys in all three locales; works at 360 px (R5).
4. Migrations reviewed and reversible where practical; `docs/02-database-schema.md` updated for schema changes.
5. New error codes in `docs/error-codes.md`; new decisions in `docs/decisions.md`.
6. COMPLETION.md and `docs/PROJECT-STATE.md` updated; one commit for the subphase.
