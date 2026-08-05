#!/usr/bin/env bash
# =============================================================================
# Family Tree App – Local Development Script
#
# Menjalankan backend Go + frontend React secara lokal (SQLite, tanpa container).
#
# Usage:
#   ./dev-local.sh                 # Start full dev environment
#   ./dev-local.sh --init          # Install deps + seed demo data
#   ./dev-local.sh --seed          # Re-create demo data saja
#   ./dev-local.sh --stop          # Stop all processes
#   ./dev-local.sh go [args...]    # Run go command di backend/
#   ./dev-local.sh npm [args...]   # Run npm command di frontend/
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()     { echo -e "${GREEN}[dev-local]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[warn]${NC} $*"; }
err()     { echo -e "${RED}[error]${NC} $*"; }

usage() {
  cat <<'EOF'
Usage:
  ./dev-local.sh [--init] [--seed]
  ./dev-local.sh --stop
  ./dev-local.sh go [args...]
  ./dev-local.sh npm [args...]

Options:
  --init       Install dependencies (go mod tidy, npm install) + seed demo data
  --seed       Re-create demo data (go run cmd/seed.go)
  --stop       Stop all running processes
  -h, --help   Show this help

Default behavior:
  1) Jalankan Go backend di :8080
  2) Jalankan Vite dev server (frontend) di :3000
  3) Stop semua proses otomatis saat Ctrl+C
EOF
}

INIT=false
SEED_ONLY=false
STOP_ONLY=false

# ── Command Proxying ──────────────────────────────────────────────────────
if [ "$#" -gt 0 ]; then
  case "$1" in
    go)
      shift
      (cd backend && exec go "$@")
      ;;
    npm|npx)
      CMD="$1"
      shift
      (cd frontend && exec "$CMD" "$@")
      ;;
  esac
fi

# ── Parse options ─────────────────────────────────────────────────────────
for arg in "$@"; do
  case "$arg" in
    --init)     INIT=true ;;
    --seed)     SEED_ONLY=true ;;
    --stop)     STOP_ONLY=true ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      err "Unknown option: $arg"
      usage
      exit 1
      ;;
  esac
done

# ── Helper: forcefully free port 8080 ─────────────────────────────────────
free_port_8080() {
  local pid
  # Find and kill any process listening on port 8080
  pid=$(lsof -ti :8080 2>/dev/null || true)
  if [ -n "$pid" ]; then
    warn "Port 8080 masih dipakai oleh PID: $pid. Killing..."
    kill -9 $pid 2>/dev/null || true
    sleep 0.5
  fi
}

# ── Stop ──────────────────────────────────────────────────────────────────
if [ "$STOP_ONLY" = true ]; then
  log "Stopping all processes..."
  free_port_8080
  pkill -f "vite" 2>/dev/null || true
  log "All stopped."
  exit 0
fi

# ── Seed only ─────────────────────────────────────────────────────────────
if [ "$SEED_ONLY" = true ]; then
  log "Creating demo data..."
  (cd backend && go run cmd/seed.go)
  log "Demo data created."
  exit 0
fi

# ── Init ──────────────────────────────────────────────────────────────────
if [ "$INIT" = true ]; then
  log "Running initial setup..."

  log "go mod tidy (backend)..."
  (cd backend && go mod tidy)

  if [ ! -d "frontend/node_modules" ]; then
    log "npm install (frontend)..."
    (cd frontend && npm install)
  else
    log "frontend/node_modules already exists, skip npm install."
  fi

  log "Creating demo data..."
  (cd backend && go run cmd/seed.go)

  log "Init selesai."
fi

# ── Pre-flight checks ────────────────────────────────────────────────────
if [ ! -f "backend/go.sum" ]; then
  err "backend/go.sum tidak ditemukan. Jalankan: ./dev-local.sh --init"
  exit 1
fi

if [ ! -d "frontend/node_modules" ]; then
  err "frontend/node_modules tidak ditemukan. Jalankan: ./dev-local.sh --init"
  exit 1
fi

# ── Environment variables ─────────────────────────────────────────────────
export JWT_SECRET="${JWT_SECRET:-dev-secret-change-me}"
export ENV="${ENV:-development}"

# ── Cleanup on exit ───────────────────────────────────────────────────────
cleanup() {
  warn "Stopping app processes..."

  # Kill the whole process group of each tracked PID (includes compiled Go binary)
  if [ -n "${BACKEND_PID:-}" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill -TERM -- -"$(ps -o pgid= -p "$BACKEND_PID" 2>/dev/null | tr -d ' ')" 2>/dev/null || true
    sleep 0.5
    kill -KILL -- -"$(ps -o pgid= -p "$BACKEND_PID" 2>/dev/null | tr -d ' ')" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi

  if [ -n "${VITE_PID:-}" ] && kill -0 "$VITE_PID" 2>/dev/null; then
    kill -TERM -- -"$(ps -o pgid= -p "$VITE_PID" 2>/dev/null | tr -d ' ')" 2>/dev/null || true
    sleep 0.5
    kill -KILL -- -"$(ps -o pgid= -p "$VITE_PID" 2>/dev/null | tr -d ' ')" 2>/dev/null || true
    wait "$VITE_PID" 2>/dev/null || true
  fi

  # Fallback: nuke anything still on port 8080
  free_port_8080

  wait 2>/dev/null || true
  log "Stopped."
}

trap cleanup INT TERM EXIT

# ── Start backend ─────────────────────────────────────────────────────────
# Pastikan port 8080 bebas sebelum start
free_port_8080

log "Starting Go backend on http://localhost:8080 ..."
(cd backend && go run cmd/main.go 2>&1 | while IFS= read -r line; do echo -e "  ${CYAN}[backend]${NC} $line"; done) &
BACKEND_PID=$!

# ── Wait for backend to be ready ──────────────────────────────────────────
log "Waiting for backend to be ready..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8080/health >/dev/null 2>&1; then
    success "Backend ready!"
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    err "Backend process died. Check logs above for errors."
    exit 1
  fi
  sleep 1
done

if ! curl -sf http://localhost:8080/health >/dev/null 2>&1; then
  err "Backend failed to start within 30 seconds."
  exit 1
fi

# ── Start frontend ────────────────────────────────────────────────────────
log "Starting Vite dev server on http://localhost:3000 ..."
(cd frontend && npm run dev) &
VITE_PID=$!

# ── Info ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}----------------------------------------------${NC}"
echo -e "${CYAN}Backend     : http://localhost:8080${NC}"
echo -e "${CYAN}Frontend    : http://localhost:3000${NC}"
echo -e "${CYAN}Health      : http://localhost:8080/health${NC}"
echo -e "${CYAN}Database    : SQLite (backend/family_tree.db)${NC}"
echo -e "${CYAN}Press Ctrl+C to stop all processes${NC}"
echo -e "${CYAN}----------------------------------------------${NC}"

wait -n "$BACKEND_PID" "$VITE_PID" 2>/dev/null || true
