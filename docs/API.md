# VORTEX API Reference

Base URL: `/api/v1` (proxied by the frontend dev server; same-origin in production).

All endpoints return the same envelope:

```json
// success
{ "success": true, "data": { }, "message"?: "..." }

// paginated success
{ "success": true, "data": [...], "meta": { "page": 1, "pageSize": 12, "total": 42, "totalPages": 4 } }

// error
{ "success": false, "error": { "code": "SOME_CODE", "message": "Human readable", "details"?: [...] } }
```

**Status codes used throughout:** `200` OK · `201` Created · `202` Accepted (async work queued) ·
`400` Bad request · `401` Unauthenticated · `403` Authenticated but not authorized ·
`404` Not found · `409` Conflict (e.g. duplicate email) · `413` File too large ·
`422` Validation error · `429` Rate limited · `500` Server error (message hidden in production).

Authentication: `Authorization: Bearer <accessToken>` header. Access tokens are short-lived
JWTs (`ACCESS_TOKEN_TTL_MIN`, default 15 min); refresh tokens are opaque, stored hashed in
`RefreshToken`, and delivered both in the JSON body and as an httpOnly cookie
(`vortex_refresh`).

---

## Auth — `/api/v1/auth` (public)

| Method | Path | Auth | Role | Body | Notes |
|---|---|---|---|---|---|
| POST | `/register` | — | — | `{ fullName, email, password, role: FARMER\|EXPERT, phone?, village?, district?, state?, farmSizeAcres?, specialization? (required if EXPERT), qualification?, licenseNumber?, yearsExperience?, bio? }` | Farmers are active immediately and receive tokens. **Experts are created `isActive:false`** and must be approved by an admin (`POST /admin/experts/:id/approve`) before they can log in. `409 EMAIL_EXISTS` on duplicate. `422 VALIDATION_ERROR` on weak password / bad shape. |
| POST | `/login` | — | — | `{ email, password }` | `401 CREDENTIALS_INVALID` for both unknown email and wrong password (no account enumeration). `403 ACCOUNT_PENDING_APPROVAL` / `ACCOUNT_INACTIVE` if the account exists but is deactivated/unapproved. |
| POST | `/refresh` | refresh token (body or cookie) | — | `{ refreshToken? }` | Rotates the refresh token; issues a new access token. |
| POST | `/logout` | refresh token (body or cookie) | — | — | Revokes the refresh token server-side, clears the cookie. |
| GET | `/me` | Bearer | any | — | Returns the current user (never includes `passwordHash`), with `farmerProfile`/`expertProfile` if present. `401` if no/invalid token. |

## Users — `/api/v1/users` (any authenticated role)

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/me` | — | Full profile incl. role-specific profile row. |
| PATCH | `/me` | `{ fullName?, phone?, village?, district?, state?, farmSizeAcres?, preferredLanguage?, specialization?, qualification?, licenseNumber?, yearsExperience?, bio? }` | Users may only ever update **their own** row — there is no `:id` param, it always operates on `req.user.id`. |
| PATCH | `/me/password` | `{ currentPassword, newPassword }` | Verifies the current password (bcrypt) before rotating the hash. |

## Crops (catalogue) — `/api/v1/crops` (public, read-only)

| Method | Path | Notes |
|---|---|---|
| GET | `/` | All active crops with `diseaseCount`. |
| GET | `/:id` | Crop detail + its active diseases. `404 CROP_NOT_FOUND`. |
| GET | `/:id/diseases` | Diseases for one crop. |

## Diseases (catalogue) — `/api/v1/diseases` (public, read-only)

| Method | Path | Query | Notes |
|---|---|---|---|
| GET | `/` | `?cropId=` | Disease list, optionally filtered by crop. |
| GET | `/:id` | — | Disease detail with parent crop. `404 DISEASE_NOT_FOUND`. |

## Analyses — `/api/v1/analyses` (role: **FARMER**)

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/` | multipart/form-data: `image` (file), `cropTypeId`, `symptoms?`, `locationText?`, `latitude?`, `longitude?`, `notes?`, `requestExpertReview?` | **Combines upload + create in one atomic call.** Validates the image (magic bytes via `sharp`, size ≤ `MAX_UPLOAD_MB`, JPEG/PNG/WebP only), stores it (real file on disk + SHA-256 + thumbnail), creates the `CropAnalysis` row as `PROCESSING`, and schedules the async AI pipeline. Returns `202 Accepted` with `{ id, status: "PROCESSING", createdAt }` immediately — **no fake timeout, the client polls `GET /:id` for the real result.** `422 IMAGE_REQUIRED` / `CROP_NOT_FOUND` / `INVALID_FILE_TYPE`. |
| GET | `/` | query: `page, pageSize, status?, cropTypeId?` | Own analysis history only. |
| GET | `/:id` | — | Full result payload: crop, signed image/thumb URLs, `aiResult` (with `isMock`/`provider` always present), `expertReview` (if any), `guidances`, and a `timeline`. Only the owning farmer (or an admin) may view it — `403 ANALYSIS_FORBIDDEN` otherwise. |
| POST | `/:id/request-review` | — | Farmer explicitly asks for a human expert to validate a completed AI result. |

**Pipeline (server-side, fully async, real DB writes at every step):**
`PROCESSING` → AI provider call → disease-label matching against the crop's catalogue →
persist `AIResult` (+ `provider`, `isMock`) → confidence vs `EXPERT_REVIEW_THRESHOLD`
(env-configurable, never hardcoded in the frontend) → either `AI_COMPLETED` or
`EXPERT_REVIEW_PENDING` (+ creates an `ExpertReview` row, notifies all experts) →
`Notification` created for the farmer either way.

## Expert reviews — `/api/v1/expert/reviews` (role: **EXPERT**)

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/` | query: `status? (PENDING\|CLAIMED\|COMPLETED\|ALL), mine?, page, pageSize` | Review queue, newest-pending-first. |
| GET | `/stats` | — | This expert's dashboard counters (pending pool size, claimed-by-me, completed-by-me, recent). |
| GET | `/:id` | — | Full case detail (analysis + AI result + review state). |
| POST | `/:id/claim` | — | Race-safe optimistic claim (`updateMany` guarded by `status: PENDING`) — only one expert can win; `409 ALREADY_CLAIMED` for the loser. |
| PUT | `/:id` | `{ decision: APPROVE_AI\|CORRECTED, finalDiseaseId? (required if CORRECTED — must belong to the same crop), finalSeverity?, treatmentGuidance, preventiveAdvice, comments? }` | **Runs in a single DB transaction:** updates `ExpertReview` → `COMPLETED`, updates `CropAnalysis` → `EXPERT_REVIEWED`, inserts an `EXPERT`-sourced `TreatmentGuidance` row. After the transaction commits, creates a `Notification` for the farmer. `409 NOT_CLAIMED` / `REVIEW_COMPLETED`, `403 NOT_YOUR_CASE`. |

## Notifications — `/api/v1/notifications` (any authenticated role)

| Method | Path | Notes |
|---|---|---|
| GET | `/` | query: `page, pageSize, unreadOnly?`. Own notifications only. |
| GET | `/unread-count` | `{ count }` for the bell badge. |
| PATCH | `/:id/read` | Marks one as read (own only — `404` otherwise). |
| PATCH | `/read-all` | Marks all unread as read. |

## Media — `/api/v1/media/:key` (capability-based, no bearer token)

Images are never served from a public/guessable path. Result payloads embed
HMAC-signed, time-limited URLs (`MEDIA_SIGNING_SECRET`, 6h TTL) — `?exp=...&sig=...`.
`400 MEDIA_PARAMS_MISSING`, `403` on bad/expired signature, `404 MEDIA_NOT_FOUND`.

## Admin — `/api/v1/admin/*` (role: **ADMIN**, farmers/experts → `403 ROLE_FORBIDDEN`)

| Method | Path | Notes |
|---|---|---|
| GET | `/stats` | Real-time dashboard: user/role counts, analysis counts by status, review counts, top diseases, 14-day analyses trend, mock-vs-real AI split — **all `SELECT COUNT(*)` / `GROUP BY` against PostgreSQL, never hardcoded.** |
| GET | `/activity` | Recent `ActivityLog` feed (`?limit=`). |
| GET | `/users` | query: `page, pageSize, role?, active?, q?` |
| PATCH | `/users/:id` | Update role/active flag/profile fields for any user. |
| GET | `/experts?status=pending\|active\|all` | Expert roster with verification status. |
| POST | `/experts/:id/approve` | Activates a pending expert account (+ notification). |
| POST | `/experts/:id/deactivate` | Deactivates an expert. |
| GET/POST/PATCH/DELETE | `/crops`, `/crops/:id` | Full CRUD on the crop catalogue. |
| GET/POST/PATCH/DELETE | `/diseases`, `/diseases/:id` | Full CRUD on the disease catalogue (each disease is scoped to one crop). |
| GET | `/analyses` | query: `page, pageSize, status?, provider?` — platform-wide monitor. |
| GET | `/analyses/:id` | Full detail (admin implicitly authorized in `canViewAnalysis`). |
| GET | `/reviews` | query: `status?, page, pageSize, mine?` — platform-wide review monitor. |
| GET | `/reports?type=analyses\|diseases\|users&from=&to=` | Streams a CSV export built live from PostgreSQL. |
| GET/PUT | `/settings` | Read/update `SystemSetting` rows (e.g. `EXPERT_REVIEW_THRESHOLD` override) — audited via `updatedBy`. |

## Health — `/api/v1/health` (public)

`GET /health` → `{ status, database: "connected"|"unreachable", ai: { provider, isMock, configured }, uptimeSec, timestamp }`.
Returns `503` if PostgreSQL is unreachable. Used for uptime checks — never fakes a green status.

## Contact — `POST /api/v1/contact` (public, rate-limited)

`{ name, email, message }` → persists an `ActivityLog` entry and notifies all admins. No fake "sent!" toast without a real DB write.

---

## Error codes quick reference

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Zod schema failed — `details[]` has one entry per invalid field. |
| `AUTH_REQUIRED` / `TOKEN_INVALID` | 401 | Missing/expired/invalid bearer token. |
| `ROLE_FORBIDDEN` | 403 | Authenticated, wrong role for this route. |
| `ACCOUNT_PENDING_APPROVAL` / `ACCOUNT_INACTIVE` | 403 | Login blocked pending admin approval / deactivation. |
| `ANALYSIS_FORBIDDEN` / `NOT_YOUR_CASE` | 403 | Cross-user/cross-expert access blocked. |
| `EMAIL_EXISTS` / `CONFLICT` / `ALREADY_CLAIMED` / `REVIEW_COMPLETED` | 409 | Unique constraint / race lost. |
| `*_NOT_FOUND` | 404 | Resource doesn't exist or isn't visible to this viewer. |
| `IMAGE_REQUIRED` / `INVALID_FILE_TYPE` / `IMAGE_UNREADABLE` / `IMAGE_TOO_SMALL` | 422 | Upload validation (real magic-byte sniffing via `sharp`, not just extension). |
| `FILE_TOO_LARGE` | 413 | Exceeds `MAX_UPLOAD_MB`. |
| `RATE_LIMITED` | 429 | Too many requests in the current window. |
| `INTERNAL` / `DATABASE_ERROR` | 500 | Unexpected failure — message is sanitized in production (`NODE_ENV=production`), full message in development. |

## Required role summary

| Area | FARMER | EXPERT | ADMIN |
|---|---|---|---|
| `/auth/*`, `/crops`, `/diseases`, `/health` | ✅ (public) | ✅ | ✅ |
| `/users/me*` | ✅ (own row only) | ✅ (own row only) | ✅ (own row only) |
| `/analyses/*` | ✅ | ❌ 403 | ❌ 403 (use `/admin/analyses`) |
| `/expert/reviews/*` | ❌ 403 | ✅ | ❌ 403 (use `/admin/reviews`) |
| `/admin/*` | ❌ 403 | ❌ 403 | ✅ |
| `/notifications/*` | ✅ (own) | ✅ (own) | ✅ (own) |

See `backend/src/middleware/auth.ts` (`requireAuth`) and `backend/src/middleware/rbac.ts`
(`requireRole`) for the enforcing implementation — every rule above is enforced
**server-side**, independent of the frontend route guards in `frontend/src/components/layout/ProtectedRoute.tsx`.
