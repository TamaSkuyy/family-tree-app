# Family Tree App — Mini SaaS Upgrade

**Date:** 2026-08-05
**Branch:** mini-saas-upgrade
**Type:** Fullstack enhancement

## Overview

Upgrade the existing Family Tree application from a basic CRUD app into a deploy-ready mini SaaS suitable for a portfolio piece. The app remains a single-tenant family tree manager with JWT auth, but gets production-grade infrastructure, tests, UX polish, and a few security features that demonstrate professional competency.

## 1. Architecture

### Structural changes

```
backend/internal/handlers/middleware/   → backend/internal/middleware/
backend/docs/                           ← NEW: Swagger auto-generated
backend/Dockerfile                      ← NEW: multi-stage
backend/.air.toml                       ← NEW: hot reload

frontend/src/hooks/                     ← NEW: useApi, usePagination, useDebounce
frontend/Dockerfile                     ← NEW: nginx + static
frontend/.env.example                   ← NEW: VITE_API_BASE_URL

.github/workflows/ci.yml                ← NEW: CI/CD
docker-compose.yml                      ← NEW: production stack
docker-compose.dev.yml                  ← NEW: dev stack with hot reload
ROADMAP.md                              ← NEW: future phases
```

### Data flow (unchanged)

```
Browser → Nginx (:80) → /api/* → Go backend (:8080) → SQLite
                        → /*     → Static files (SPA)
```

## 2. Backend

### 2.1 New middleware

File: `backend/internal/middleware/`

| Middleware | Library | Behavior |
|---|---|---|
| `auth.go` | — | Moved from `handlers/auth_middleware.go`. Extract Bearer token → validate → `c.Set("user", user)`. |
| `admin.go` | — | Moved `RequireRole("admin")`. |
| `ratelimit.go` | `golang.org/x/time/rate` | Token bucket per IP. Login: 5/min, Register: 3/min, API (auth): 100/min, API (public): 30/min. In-memory map, cleaned every 10 min. |
| `public_mode.go` | — | If `PUBLIC_MODE=true`: allow unauthenticated GET on `/persons`, `/family-tree`, `/search`. If token present, set user context normally. |

### 2.2 New endpoints

| Method | Path | Handler | Auth | Notes |
|---|---|---|---|---|
| POST | `/auth/forgot-password` | `ForgotPassword` | Public | Generate reset token (JWT, 15min TTL), log to console |
| POST | `/auth/reset-password` | `ResetPassword` | Public (token in body) | Validate token, update password |
| GET | `/swagger/*` | gin-swagger | Public | Swagger UI |

### 2.3 Middleware application order

```
Global: CORS → RateLimit
Per-route: PublicMode (optional) → JWTAuth → RequireRole
```

### 2.4 Register endpoint enhancement

Register already exists. After upgrade: auto-login (return token in response — already done). Add duplicate email check (already done).

### 2.5 Swagger

- Library: `swaggo/swag` + `gin-swagger`
- Annotate all handler functions with `@Summary`, `@Param`, `@Success`, `@Failure`
- Generate: `swag init -g cmd/main.go -o docs`
- Serve: `r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))`

## 3. Backend Tests

All tests use SQLite in-memory (`:memory:`) with GORM. No mocking — real DB operations.

Helper: `backend/internal/testutil/helper.go` — `SetupTestDB()` returns `*gorm.DB` with AutoMigrate.

### 3.1 Service tests

**`auth_service_test.go`:**
- Register success / duplicate email
- Authenticate valid / wrong password
- Token generate → parse round-trip
- GetUserFromToken valid / invalid / expired
- UpdateUserRole success / user not found
- GetAllUsers, CreateUser, DeleteUser, UpdateUser

**`person_service_test.go`:**
- CRUD lifecycle (Create → Get → Update → Delete)
- AddParentChild success / duplicate prevention
- AddSpouse success / bidirectional duplicate
- RemoveParentChild / RemoveSpouse
- DeletePerson cleans up all relationships
- GetFamilyTree nested Preload correctness
- Search by first_name, last_name, email

### 3.2 Handler tests

**`auth_handler_test.go`:** Test Register, Login, Me, ForgotPassword, ResetPassword via `httptest` + Gin test mode — valid body, invalid body, missing fields, wrong content type.

**`person_handler_test.go`:** Test all CRUD endpoints, search, family tree, relationships — with/without auth, with/without admin role.

### 3.3 Running tests

```bash
cd backend
go test ./... -v
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out
```

Target: 80%+ services, 60%+ handlers.

## 4. Frontend

### 4.1 Environment config

`frontend/.env.example`:
```
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

`frontend/src/services/api.js` reads `import.meta.env.VITE_API_BASE_URL`.

### 4.2 Custom hooks

| Hook | Purpose |
|---|---|
| `useApi(fetchFn, deps)` | Returns `{ data, error, isLoading, isEmpty, refetch }`. Manages all 4 states. |
| `usePagination(items, perPage)` | Returns `{ page, totalPages, paginatedItems, nextPage, prevPage }`. |
| `useDebounce(value, delay)` | Debounced search input. |

### 4.3 State matrix (every data component)

| State | UI |
|---|---|
| Loading | Skeleton placeholder |
| Error | Error message + retry button |
| Empty | Illustration + CTA ("Belum ada data...") |
| Data | Normal content |

### 4.4 New pages

**Register (`/register`):**
- react-hook-form: name, email, password, confirm password
- Client validation: required fields, email format, password min 6, confirm match
- On success: auto-login → redirect `/`
- On error: inline field errors + toast

**Forgot Password (`/forgot-password`):**
- Email input → POST `/auth/forgot-password` → toast "Cek console untuk reset link"
- Link back to login

**Reset Password (`/reset-password?token=xxx`):**
- New password + confirm → POST `/auth/reset-password` → toast sukses → redirect `/login`

### 4.5 Component updates

| Component | Changes |
|---|---|
| `PersonList` | Pagination (10/page), debounced search, skeleton, empty state, error+retry |
| `FamilyTree` | Skeleton loading, error state, hide edit controls in public mode |
| `Login` | react-hook-form validation, link to register + forgot password |
| `ProtectedRoute` | Spinner while loading, redirect to login |
| `Header` | User dropdown (name, role badge, logout), admin link for role=admin |
| `AdminUsers` | Skeleton, error state, empty state |
| `Toast` | Success (green), error (red), warning (yellow), info (blue) variants via react-hot-toast |

## 5. DevOps

### 5.1 Dockerfiles

**`backend/Dockerfile`** — multi-stage:
- Build: `golang:1.24-alpine`, CGO_ENABLED=0, strip with `-ldflags="-s -w"`
- Run: `alpine:3.20`, non-root user (uid 1000), HEALTHCHECK `/health`

**`frontend/Dockerfile`** — multi-stage:
- Build: `node:22-alpine`, `npm ci && npm run build`
- Run: `nginx:alpine`, custom `nginx.conf` (SPA fallback `try_files $uri /index.html`, proxy `/api` to backend)

### 5.2 Docker Compose

**`docker-compose.yml`** (production):
- `backend` service: env vars from host, volume `./data:/data` for SQLite persistence
- `frontend` service: port 80, depends_on backend, reads `VITE_API_BASE_URL` at build time

**`docker-compose.dev.yml`** (development):
- `backend`: source mount + air hot reload, port 8080
- `frontend`: source mount + Vite HMR, port 3000

### 5.3 CI/CD

`.github/workflows/ci.yml`:
```
push/PR → test-backend (go test + coverage) ∥ test-frontend (build)
         ↓ (on main only)
         build-and-push (docker build + push to GHCR)
```

## 6. ROADMAP.md

Phase-based future development document:
- **Phase 1** (this spec): Tests, Docker, CI/CD, UX polish, public mode, rate limiting, Swagger, forgot/reset password, registration page
- **Phase 2**: Refresh token rotation, 2FA, audit logs, photo upload, bulk CSV import, email service
- **Phase 3**: Multi-tenancy, i18n, PWA, mobile app, social login

## 7. Non-goals

- Real email sending (mock only — console log)
- Multi-tenancy / family groups
- Real-time collaboration
- Mobile app
- Payment/subscription
