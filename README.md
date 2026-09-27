# VORTEX — AI-Powered Crop Disease Guidance Platform

A full-stack, database-backed platform that lets farmers photograph a diseased crop, get an
AI-assisted diagnosis, escalate low-confidence or requested cases to a human plant-pathology
expert, and gives admins real operational visibility — all on top of a **real PostgreSQL
database**, a **real Express/Prisma API**, and a **real, swappable AI-provider abstraction**.

> **No fakes, anywhere.** There is no static JSON, no hardcoded dashboard numbers, no
> localStorage-as-database, no frontend-only auth. Every number on every dashboard is a live
> SQL aggregate. The only thing that can run in a "simulated" mode is the AI diagnosis model
> itself when no `GEMINI_API_KEY`/`OPENAI_API_KEY` is configured — and when it does, every
> mock result is stored with `isMock: true` and is **never** presented to a user as a real
> diagnosis (see [AI provider](#ai-provider-real-vs-mock) below).

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite, Tailwind, React Three Fiber/drei (3D hero + scenes), Zustand, TanStack Query |
| Backend | Node.js + TypeScript, Express, Zod validation, JWT (access + rotating refresh tokens), bcrypt |
| Database | PostgreSQL, accessed through **Prisma 6** in "no Rust engine" mode (`engineType: "client"`) via `@prisma/adapter-pg` (`pg` driver) |
| Storage | Pluggable `StorageProvider` — local-disk implementation included (sharp-based validation/normalization/thumbnailing), swappable for S3/GCS without touching business logic |
| AI | Pluggable `AIProvider` — Gemini / OpenAI / Mock, chosen by `AI_PROVIDER` env, confidence-threshold-driven expert-review routing (`EXPERT_REVIEW_THRESHOLD`, never hardcoded in the frontend) |
| Tests | Vitest + Supertest, run against a real running Express app + real PostgreSQL (see [`backend/tests`](backend/tests)) |

## Project structure

```
vortex/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # 15-model schema (User, FarmerProfile, ExpertProfile,
│   │   │                        #   CropType, Disease, UploadedImage, CropAnalysis, AIResult,
│   │   │                        #   ExpertReview, TreatmentGuidance, Notification,
│   │   │                        #   RefreshToken, ActivityLog, SystemSetting)
│   │   ├── migrations/          # real SQL migrations (applied via `prisma migrate deploy`)
│   │   └── seed.ts              # dev-only seed: crops, diseases, admin/expert/farmer accounts
│   ├── prisma.config.ts         # Prisma 6 config — JS/WASM schema engine + pg driver adapter
│   │                            #   (no native binary download required, works fully offline)
│   ├── src/
│   │   ├── ai/                  # AIProvider abstraction: registry, gemini/openai/mock providers
│   │   ├── storage/             # StorageProvider abstraction: local disk implementation
│   │   ├── modules/             # one folder per REST resource: routes/controller/service/dto
│   │   │   ├── auth/ users/ crops/ diseases/ analyses/ reviews/ notifications/ admin/ media/
│   │   ├── services/            # analysisPipeline (the core AI pipeline), notifications, etc.
│   │   ├── middleware/          # auth (JWT), rbac (role checks), validate (Zod), rateLimit
│   │   └── lib/prisma.ts        # Prisma client singleton (pg Pool + PrismaPg adapter)
│   └── tests/                   # vitest + supertest integration tests (real DB, real HTTP)
├── frontend/
│   └── src/
│       ├── pages/                # public / farmer (`/app/*`) / expert (`/expert/*`) / admin (`/admin/*`)
│       ├── components/3d/        # React Three Fiber hero + workflow scenes
│       ├── api/                  # typed API client (relative URLs, transparent token refresh)
│       └── store/                # zustand auth store
├── docs/API.md                  # full API reference (endpoints, roles, error codes)
├── scripts/
│   ├── setup.sh                 # one-shot: db bring-up → env → install → migrate → seed
│   ├── db-setup.sh              # idempotent local PostgreSQL bring-up (apt, with an offline
│   │                            #   portable-binary fallback for locked-down sandboxes)
│   ├── restore.sh                # re-attach to a persisted PG data dir after an environment reset
│   └── smoke.sh                  # end-to-end HTTP smoke test against a running backend
└── .env.example
```

## Quick start

```bash
npm run setup      # brings up PostgreSQL, installs deps, migrates + seeds the DB
npm run dev        # API on :4000, frontend (Vite) on :5173
```

Then open http://localhost:5173 and log in with one of the seeded **development-only** accounts
(see `backend/prisma/seed.ts`, also printed by `npm run seed`):

| Role | Email | Password | Notes |
|---|---|---|---|
| Farmer | `farmer@vortex.app` | `Farmer@1234` | Ravi Kumar, Sulur, Coimbatore |
| Expert | `expert@vortex.app` | `Expert@1234` | Dr. Meera Krishnan, approved |
| Admin | `admin@vortex.app` | `Admin@1234` | Arjun Nair |
| Expert (pending) | `senthil@vortex.app` | `Expert@1234` | Demonstrates the expert-approval gate — cannot log in until an admin approves it |

### Manual step-by-step (equivalent to `npm run setup`)

```bash
bash scripts/db-setup.sh                          # 1. real local PostgreSQL on :5433
cp .env.example backend/.env                      # 2. copy + edit secrets (see below)
npm install                                       # 3. installs deps (also applies patches/, see below)
npm run prisma:generate                           # 4. generate the Prisma client
npm run prisma:deploy                             # 5. apply migrations to a real database
npm run seed                                       # 6. seed crops/diseases/dev accounts
npm run dev                                        # 7. run API + frontend
```

`backend/.env` must set at minimum: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
`MEDIA_SIGNING_SECRET` (generate each with `openssl rand -hex 32`). See `.env.example` for
every variable and its purpose.

### After an environment/sandbox reset

Source code and the PostgreSQL data directory persist, but installed binaries/`node_modules`
may not, depending on your environment. Run:

```bash
bash scripts/restore.sh && npm run dev
```

## Database

Real PostgreSQL, real Prisma migrations (`backend/prisma/migrations/`), no ORM-less raw SQL
hacks. `scripts/db-setup.sh` is idempotent and tries, in order:

1. **apt** (`postgresql`) — the normal path on any machine/container with standard package
   repository access.
2. **A portable, self-contained PostgreSQL binary fallback** (downloaded from PyPI's
   [`pgserver`](https://pypi.org/project/pgserver/) wheel, which bundles real upstream
   PostgreSQL binaries) — used automatically when `apt` has no network route (e.g. some
   sandboxed CI/dev environments that only allow `pypi.org`/`registry.npmjs.org`). Either way
   you get a genuine `postgres` server process; nothing here is mocked or emulated.

Prisma 6 is configured in **"no Rust engine" mode** (`engineType: "client"` in
`schema.prisma`, `backend/prisma.config.ts` wires up `@prisma/adapter-pg` for both the CLI's
schema engine and the runtime client). This means `npx prisma generate` / `migrate deploy`
work fully offline — no dependency on `binaries.prisma.sh` being reachable. A one-line upstream
`@prisma/adapter-pg` bug (missing PostgreSQL `name` OID column-type mapping,
[prisma/prisma#27403](https://github.com/prisma/prisma/issues/27403)) is patched automatically
via `patch-package` (`patches/@prisma+adapter-pg+6.19.3.patch`, re-applied on every
`npm install` via the root `postinstall` script).

## AI provider — real vs. mock

`backend/src/ai/registry.ts` picks a provider at boot based on `AI_PROVIDER`
(`auto` | `gemini` | `openai` | `mock`) and the presence of `GEMINI_API_KEY` / `OPENAI_API_KEY`.

- **Real mode** (a key is configured): calls the actual Gemini/OpenAI vision API, stores the
  real model's label/confidence/reasoning, `isMock: false`.
- **Mock mode** (no key — the default for this checkout): a deterministic, sharp-based pixel
  analysis (not random) produces a plausible label/confidence, but it is **always** persisted
  with `isMock: true` and the provider name `"mock"`. The health check
  (`GET /api/v1/health`) and every `aiResult` payload expose this flag — the frontend is
  expected to render a visible "Development Mock Analysis" badge whenever `isMock` is true, and
  must never claim it is a real diagnosis.

Dropping in a real key later requires **zero code changes** — just set `GEMINI_API_KEY` or
`OPENAI_API_KEY` in `backend/.env` and restart the API.

The confidence threshold that routes a result to human expert review
(`EXPERT_REVIEW_THRESHOLD`, default `0.75`) is a **server-side environment variable** — it is
never hardcoded in frontend code, and can also be overridden live via
`PUT /api/v1/admin/settings`.

## Testing

```bash
npm test            # backend/tests — vitest + supertest against a real running app + real DB
bash scripts/smoke.sh   # black-box HTTP smoke test against an already-running backend
```

`backend/tests/` covers: registration/login/JWT (`auth.test.ts`), role-based access control —
401 vs 403 vs 200 across farmer/expert/admin (`authorization.test.ts`), the full upload →
AI-pipeline → result flow plus per-farmer data isolation (`analyses.test.ts`), and Prisma
model relationships/CRUD/cascade behavior directly against PostgreSQL (`database.test.ts`).

## API documentation

See [`docs/API.md`](docs/API.md) for the full endpoint reference: method, required role,
request/response shapes, and error codes for every route.

## Security notes

- Passwords hashed with bcrypt; JWT access tokens are short-lived, refresh tokens are rotated
  and revocable (`RefreshToken` table), delivered via httpOnly cookie + response body.
- Every role check (`requireAuth`, `requireRole`) is enforced **server-side** — frontend route
  guards (`ProtectedRoute`) are a UX convenience only, never the source of truth.
- Uploaded images are validated by real magic-byte sniffing (not just file extension/MIME
  header), re-encoded, EXIF-stripped, and served only via short-lived HMAC-signed URLs — never
  a public/guessable path.
- Rate limiting (`express-rate-limit`) on auth, analysis creation, and contact-form submission.
- No secrets are ever sent to the frontend; the frontend talks to the backend only via relative
  URLs (see `frontend/vite.config.ts` dev proxy / same-origin production build).
