# 🌳 Family Tree App

A fullstack family tree management application built with **Go** (Gin + GORM + SQLite) and **React** (Vite + Tailwind CSS + daisyUI). Create, manage, and visualize family relationships across generations.

## ✨ Features

- **Family Tree Visualization** — Interactive tree view of parents, children, and spouses
- **Person Management** — CRUD operations with search and filtering
- **Relationship Management** — Add/remove parent-child and spouse relationships
- **Authentication** — JWT-based login/register with role-based access (admin/user)
- **Admin Panel** — User management with role control
- **Public Mode** — Optional read-only access for showcasing family trees
- **API Documentation** — Auto-generated Swagger docs

## 🚀 Quick Start

### Prerequisites

- **Go** 1.21+
- **Node.js** 16+
- **npm**

### One-command setup

```bash
# First time: install dependencies + seed demo data
./dev-local.sh --init

# Start both backend & frontend
./dev-local.sh
```

Backend runs on `http://localhost:8080`, frontend on `http://localhost:3000`. Press `Ctrl+C` to stop.

### Manual setup

```bash
# Backend (terminal 1)
cd backend
go mod tidy
go run cmd/seed.go        # optional: create demo data
go run cmd/main.go        # server on :8080

# Frontend (terminal 2)
cd frontend
npm install
npm run dev               # Vite on :3000
```

### Verify

```bash
curl http://localhost:8080/health
```

## 📊 Demo Data

Running `go run cmd/seed.go` creates a 3-generation Johnson family:

```
Robert & Mary Johnson (grandparents)
├── David & Lisa Johnson
│   ├── James Johnson
│   └── Emma Johnson
└── Sarah & Michael Smith
    ├── Oliver Johnson
    └── Sophia Johnson
```

Default admin: `admin@example.com` / `admin123`

## 📚 API

Base URL: `http://localhost:8080/api/v1`

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | — | Register new user |
| `POST` | `/auth/login` | — | Login, returns JWT |
| `GET` | `/auth/me` | Bearer | Get current user |

### Persons

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/persons` | — | List all persons |
| `GET` | `/persons/:id` | — | Get person by ID |
| `POST` | `/persons` | Bearer | Create person |
| `PUT` | `/persons/:id` | Bearer | Update person |
| `DELETE` | `/persons/:id` | Admin | Delete person |

### Relationships

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/relationships/parent-child` | Bearer | Add parent-child |
| `DELETE` | `/relationships/parent-child/:parentId/:childId` | Admin | Remove parent-child |
| `POST` | `/relationships/spouse` | Bearer | Add spouse |
| `DELETE` | `/relationships/spouse/:person1Id/:person2Id` | Admin | Remove spouse |

### Other

| Method | Path | Description |
|---|---|---|
| `GET` | `/family-tree/:id` | Get nested family tree |
| `GET` | `/search?q=name` | Search persons |
| `GET` | `/health` | Health check |
| `GET` | `/admin/users` | Admin: list users |

## 🏗️ Architecture

```
backend/                    Go / Gin / GORM / SQLite
├── cmd/                    Entry points (server, seed)
├── internal/
│   ├── handlers/           HTTP layer (DTOs, validation)
│   ├── middleware/          Auth, rate limiting, RBAC
│   ├── models/             GORM models (Person, User, relationships)
│   └── services/           Business logic + DB operations
└── pkg/database/           DB connection + AutoMigrate

frontend/                   React 18 / Vite / Tailwind + daisyUI
├── src/
│   ├── components/         UI components
│   ├── contexts/           Auth + Toast providers
│   ├── hooks/              Custom hooks (useApi, usePagination)
│   ├── pages/              Route pages
│   └── services/           Axios API client
```

## 🔧 Scripts

| Script | Purpose |
|---|---|
| `./dev-local.sh` | Start dev environment (backend + frontend) |
| `./dev-local.sh --init` | Install deps + seed demo data |
| `./dev-local.sh --stop` | Stop all processes |
| `./dev-local.sh go [args]` | Run go commands in backend/ |
| `./dev-local.sh npm [args]` | Run npm commands in frontend/ |
| `./deploy-production.sh` | Build production artefacts to `build/` (needs gcc, see below) |
| `./install-vps.sh` | One-shot VPS install: Docker + HTTPS + admin account |

## 🚀 Deploy to a VPS (Docker + automatic HTTPS)

See **[DEPLOY_VPS.md](DEPLOY_VPS.md)** for the full walkthrough. Short version, on the VPS:

```bash
sudo ./install-vps.sh --domain family.example.com --email you@example.com
```

That installs Docker, writes `.env`, builds the stack, obtains a Let's Encrypt
certificate via Caddy, and creates the first admin account.

```bash
# Manual equivalent (no automatic HTTPS, serves plain :80)
docker compose -f docker-compose.prod.yml up -d --build

# Stop
docker compose -f docker-compose.prod.yml down
```

## 🐳 Docker (simple, HTTP only)

```bash
docker compose up -d --build   # frontend on :80, backend proxied through nginx
docker compose down
```

Frontend on `:80`, backend proxied through nginx. Use `docker-compose.prod.yml`
instead when you have a domain and want TLS.

> **Note:** the SQLite driver (`gorm.io/driver/sqlite` → `mattn/go-sqlite3`) needs
> CGO, so the backend image is built on Debian with `CGO_ENABLED=1`. Building with
> `CGO_ENABLED=0` compiles a stub that fails at startup with *"go-sqlite3 requires
> cgo to work"*, and building on Alpine/musl fails with *"unknown type name
> 'off64_t'"*.

## 🔑 Environment Variables

```bash
ENV=production            # Set to 'production' for strict JWT_SECRET check
JWT_SECRET=<secret>       # Required, min 16 chars in production
PUBLIC_MODE=true          # Optional: allow read-only access without login

# Used by docker-compose.prod.yml (written automatically by install-vps.sh)
DOMAIN=family.example.com # Domain(s) served with HTTPS, comma-separated
ACME_EMAIL=you@example.com # Contact address for Let's Encrypt
```

## 🧪 Testing

```bash
cd backend
go test ./... -v
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out
```

## 📋 Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features and future development phases.

## 📄 License

MIT
