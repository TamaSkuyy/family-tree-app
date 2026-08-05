## Quick orientation for AI coding agents

This repository is a two-tier family-tree app: a Go/Gin backend (SQLite + GORM) and a React frontend. Use this file to get productive fast — it highlights the architecture, key files, API surface, conventions, and common workflows.

### Big picture

- Backend: `backend/` — Go, Gin web framework, GORM with SQLite (file `family_tree.db`). DB is initialized in `backend/pkg/database/database.go` using `AutoMigrate`.
- Frontend: `frontend/` — React (plain JS), axios wrapper at `frontend/src/services/api.js` with base URL `http://localhost:8080/api/v1`.
- Data model: `backend/internal/models/person.go` — `Person`, `ParentChild`, `Spouse`. IDs are UUIDs (generated in GORM `BeforeCreate`). Dates use `2006-01-02` format.

### Where the logic lives (high-value files)

- HTTP server / routes: `backend/cmd/main.go` (CORS config, route group `/api/v1`, health at `/health`).
- Demo/seed data: `backend/cmd/seed.go` — creates persons and relationships used by the frontend.
- HTTP layer: `backend/internal/handlers/person_handler.go` — request DTOs, validation (gin binding tags), JSON shapes (snake_case), and error HTTP codes.
- Business layer: `backend/internal/services/person_service.go` — DB operations, relationship logic, GORM `Preload` usage (deep preloads for family tree).
- DB init: `backend/pkg/database/database.go` — opens `family_tree.db` (SQLite) and runs `AutoMigrate`.
- Frontend usage: `frontend/src/components/FamilyTree.js` reads nested `parent_relationships`, `child_relationships`, and `spouse_relationships` from the backend JSON.

### Important conventions & patterns

- API path prefix: `/api/v1` (see `cmd/main.go`) and axios baseURL in `frontend/src/services/api.js` — keep them in sync.
- JSON naming: backend returns snake_case keys (e.g., `first_name`, `birth_date`) — frontend expects those exact keys.
- UUIDs: all primary IDs are UUID strings. Parse/validate before using them in routes (handlers use `uuid.Parse`).
- Relationship operations: separate endpoints for parent-child and spouse relations (POST/DELETE). Service layer prevents duplicate relationships.
- Preloads: services use many chained `Preload` calls to fetch nested relations for the family tree; follow the same Preload chains when adding or debugging deep queries.
- Deletions: `PersonService.DeletePerson` first deletes relationship rows then the person row — preserve that order to avoid FK-like inconsistencies.

### Common developer workflows (commands you can run)

- Backend dev (from repository root):
  - Initialize modules: `cd backend && go mod tidy`
  - Create demo data: `cd backend && go run cmd/seed.go` (creates entries in `backend/family_tree.db`).
  - Run server: `cd backend && go run cmd/main.go` (server listens on `:8080`).
  - Health check: `GET http://localhost:8080/health` responds with status message.
- Frontend dev:
  - Install & run: `cd frontend && npm install && npm start` (dev server on `:3000`).
  - Frontend calls the backend at `http://localhost:8080/api/v1` — ensure backend is running and CORS allows `http://localhost:3000`.

### API surface (examples)

- Persons:
  - GET `/api/v1/persons` — list
  - GET `/api/v1/persons/:id` — single person (UUID)
  - POST `/api/v1/persons` — create (JSON: `first_name`, `last_name`, `gender`, `birth_date`, ...)
  - PUT `/api/v1/persons/:id` — partial updates
  - DELETE `/api/v1/persons/:id`
- Search: `GET /api/v1/search?q=NAME`
- Family tree: `GET /api/v1/family-tree/:id` (returns preloaded nested relations)
- Relationships: add/remove parent-child and spouse via `/relationships/*` endpoints (see `cmd/main.go` routes and `services` logic).

### Pitfalls and gotchas (do not assume defaults)

- Database file path is relative: the SQLite DB used is `backend/family_tree.db`. Run commands from `backend/` or adjust paths.
- Date parsing: handlers expect `YYYY-MM-DD` (`2006-01-02` Go layout). Invalid dates are ignored in handlers.
- Gender is validated to `male` or `female` by binding tags in the handler DTOs.
- Deep `Preload` chains are manual — be careful when altering model relations or renaming fields; update preload paths accordingly.

### Where to change/add features

- Add HTTP endpoints: modify `backend/cmd/main.go` (routes) and implement handlers in `internal/handlers` that call `internal/services`.
- DB changes: update models in `internal/models` and the `AutoMigrate` call in `pkg/database/database.go`.
- Frontend API calls: update `frontend/src/services/api.js` for new endpoints and then use those in components under `frontend/src/components`.

If anything here is unclear or you'd like the file to include brief code snippets showing request/response shapes, tell me which area to expand and I will iterate.
