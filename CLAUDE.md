# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick reference

```bash
# Backend (Go 1.24, Gin framework, GORM + SQLite)
cd backend
go mod tidy
go run cmd/seed.go          # populate demo data → backend/family_tree.db
go run cmd/main.go          # listen on :8080

# Frontend (React 18, Vite, Tailwind CSS + daisyUI)
cd frontend
npm install
npm run dev                 # Vite dev server on :3000

# Health check
curl http://localhost:8080/health

# Helper scripts (recommended)
./dev-local.sh --init          # first-time setup: install deps + seed data
./dev-local.sh                 # start both backend + frontend
./dev-local.sh --seed          # re-create demo data only
./dev-local.sh --stop          # stop all processes
./dev-local.sh go [args...]    # run arbitrary go command in backend/
./dev-local.sh npm [args...]   # run arbitrary npm command in frontend/

# Production build
./deploy-production.sh         # build artefacts to build/

# Tests
cd backend
go test $(go list ./... | grep -v /cmd) -v
go test $(go list ./... | grep -v /cmd) -coverprofile=coverage.out
go tool cover -html=coverage.out

# Docker (production)
docker compose up -d --build    # start on :80
docker compose down             # stop

# Docker (development)
docker compose -f docker-compose.dev.yml up --build   # backend :8080, frontend :3000

# Swagger UI
open http://localhost:8080/swagger/index.html
```

## Architecture

**Backend** follows a three-layer pattern:

```
cmd/          → entry points (main server, seed data)
handlers/     → HTTP layer: request DTOs, validation (Gin binding tags), JSON serialization, HTTP status
services/     → business logic: DB operations, relationship rules, JWT token generation/parsing
models/       → GORM models: Person, ParentChild, Spouse, User (all UUID PKs via BeforeCreate hook)
pkg/database/ → global `database.DB`, InitDB() with AutoMigrate
```

- Routes registered in `cmd/main.go` under `/api/v1`, health at `/health`.
- All JSON keys are **snake_case** (`first_name`, `birth_date`, `parent_relationships`).
- All IDs are UUID strings. Handlers parse with `uuid.Parse()`.
- Gender validates as `"male"` or `"female"`.
- Date format: `YYYY-MM-DD` (Go layout `2006-01-02`).
- **Auth**: JWT stored in `localStorage.ft_token`, sent as `Bearer` header. Read/GET endpoints are public; write endpoints require `JWTAuthMiddleware()`. Destructive endpoints (delete person, remove relationships) additionally require `RequireRole("admin")`.

**Frontend** is a standard React SPA:

```
contexts/     → AuthContext (user state, login/logout, loads /auth/me on mount via ft_token)
               → ToastContext (react-hot-toast wrapper)
components/   → PersonList, FamilyTree, Header, ProtectedRoute, ConfirmModal, Toast, UserModal
pages/        → Login, AdminUsers
services/api.js → axios instance with interceptors (auto-attach token, 401 → clear token + redirect /login)
```

- Vite configured to treat `.js` as JSX.
- Uses Tailwind CSS + daisyUI for styling.
- React Router v6 manages routing; `ProtectedRoute` wraps authenticated pages.

## Key conventions & gotchas

- **SQLite DB path is relative**: `backend/family_tree.db`. Run backend commands from `backend/` or the DB won't be found.
- **Preload chains** in `person_service.go` are manual and deep. `GetFamilyTree` uses 2-level nested Preloads on ParentRelationships and ChildRelationships. When modifying model relations, update all Preload paths.
- **Delete order matters**: `DeletePerson` removes relationship rows (parent-child, spouse) first, then the person row.
- **Duplicate prevention**: `AddParentChild` and `AddSpouse` check for existing relationships before creating. Spouse checks both `(p1,p2)` and `(p2,p1)` orderings.
- **JWT secret**: defaults to `"dev-secret-change-me"` if `JWT_SECRET` env var is not set. In production (`ENV=production`), the server fatally exits if `JWT_SECRET` is unset.
- **CORS**: configured for `localhost:3000` and `127.0.0.1:3000` only.
- **No tests exist yet** — the frontend test script is a no-op stub.
- **User role** is a string enum: `"user"` or `"admin"`.
