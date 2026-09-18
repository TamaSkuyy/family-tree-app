#!/usr/bin/env bash
# =============================================================================
# Family Tree App – Production Deployment Script
#
# Build backend binary + frontend static files. Menghasilkan artefak siap
# deploy ke VPS/server production dengan nginx reverse proxy + systemd.
#
# Usage:
#   ./deploy-production.sh              # Build production artefacts
#   ./deploy-production.sh --run        # Build & jalankan langsung di local
#   ./deploy-production.sh --clean      # Hapus folder build/
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

BUILD_DIR="build"
BACKEND_BINARY="family-tree-api"

log()     { echo -e "${GREEN}[DEPLOY]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()     { echo -e "${RED}[ERROR]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }

usage() {
  cat <<'EOF'
Usage:
  ./deploy-production.sh              # Build production artefacts ke build/
  ./deploy-production.sh --run        # Build & jalankan langsung
  ./deploy-production.sh --clean      # Hapus folder build/
  ./deploy-production.sh --help       # Show this help
EOF
}

ACTION="build"

for arg in "$@"; do
  case "$arg" in
    --run)   ACTION="run" ;;
    --clean) ACTION="clean" ;;
    --help|-h)
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

# ── Clean ─────────────────────────────────────────────────────────────────
if [ "$ACTION" = "clean" ]; then
  log "Cleaning build directory..."
  rm -rf "${BUILD_DIR}"
  success "Build directory removed."
  exit 0
fi

# ── Pre-flight: env check ─────────────────────────────────────────────────
if [ "${JWT_SECRET:-}" = "" ] || [ "$JWT_SECRET" = "dev-secret-change-me" ] || [ "$JWT_SECRET" = "replace-this-with-a-strong-secret" ]; then
  err "JWT_SECRET harus diset dengan secret yang kuat untuk production!"
  echo "  export JWT_SECRET=\"\$(openssl rand -base64 64)\""
  exit 1
fi

if [ "${#JWT_SECRET}" -lt 16 ]; then
  err "JWT_SECRET terlalu pendek! Minimal 16 karakter."
  exit 1
fi

log "JWT_SECRET: OK (${#JWT_SECRET} chars)"

# ── Pre-flight: tools check ───────────────────────────────────────────────
command -v go   >/dev/null 2>&1 || { err "Go tidak ditemukan. Install Go 1.21+."; exit 1; }
command -v node >/dev/null 2>&1 || { err "Node.js tidak ditemukan. Install Node.js 16+."; exit 1; }
command -v npm  >/dev/null 2>&1 || { err "npm tidak ditemukan."; exit 1; }
# gorm.io/driver/sqlite memakai github.com/mattn/go-sqlite3 yang butuh CGO.
# Tanpa gcc, build akan gagal; dengan CGO_ENABLED=0 binary-nya jalan tapi SQLite
# langsung error saat start ("go-sqlite3 requires cgo to work").
command -v gcc  >/dev/null 2>&1 || { err "gcc tidak ditemukan (dibutuhkan go-sqlite3 via CGO). Install build-essential / gcc."; exit 1; }

# ── Build ─────────────────────────────────────────────────────────────────
echo -e "${CYAN}"
echo "========================================"
echo "  Family Tree App – Production Build"
echo "========================================"
echo -e "${NC}"

# Prepare build directory
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"

# --- Build Go backend ---
# CGO_ENABLED=1 wajib (SQLite). Karena itu build ini TIDAK cross-compile: jalankan
# di host linux/amd64 dengan gcc, atau pakai Docker (docker-compose.prod.yml) yang
# jadi jalur yang direkomendasikan.
log "Building Go backend binary..."
(
  cd backend
  CGO_ENABLED=1 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -o "../${BUILD_DIR}/${BACKEND_BINARY}" ./cmd/main.go
  CGO_ENABLED=1 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -o "../${BUILD_DIR}/family-tree-createadmin" ./cmd/createadmin.go
)
BACKEND_SIZE=$(du -h "${BUILD_DIR}/${BACKEND_BINARY}" | cut -f1)
success "Backend binary: ${BUILD_DIR}/${BACKEND_BINARY} (${BACKEND_SIZE})"
success "Admin CLI:      ${BUILD_DIR}/family-tree-createadmin"

# --- Build React frontend ---
log "Building React frontend (Vite)..."
(
  cd frontend
  npm install --silent
  npm run build
)
cp -r frontend/dist "${BUILD_DIR}/static"
success "Frontend static files: ${BUILD_DIR}/static/"

# --- Copy SQLite database jika ada ---
if [ -f "backend/family_tree.db" ]; then
  cp backend/family_tree.db "${BUILD_DIR}/"
  warn "family_tree.db disalin ke build/. (Production sebaiknya upload/mount DB sendiri.)"
fi

# --- Copy .env.example sebagai referensi ---
cp .env.example "${BUILD_DIR}/.env.example"

# ── Summary ───────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}========================================${NC}"
success "Build selesai!"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "  Artefak di: ${GREEN}${BUILD_DIR}/${NC}"
echo ""
echo "  Struktur build/:"
echo "    build/${BACKEND_BINARY}      — Go backend binary"
echo "    build/static/                — Frontend static files"
echo "    build/.env.example           — Env reference"
echo ""
echo -e "  ${YELLOW}Deploy ke server:${NC}"
echo "    1. Copy folder build/ ke server (scp/rsync)"
echo "    2. Set ENV=production dan JWT_SECRET di environment"
echo "    3. Jalankan ./${BACKEND_BINARY} (listen :8080)"
echo "    4. Serve build/static/ lewat nginx/Caddy di port 80/443"
echo "    5. Reverse-proxy /api/v1/* ke localhost:8080"
echo ""
echo -e "  Contoh nginx config:"
echo "    server {"
echo "      listen 80;"
echo "      server_name example.com;"
echo "      root /opt/family-tree/static;"
echo "      location /api/ { proxy_pass http://127.0.0.1:8080; }"
echo "      location / { try_files \$uri /index.html; }"
echo "    }"
echo ""
echo -e "  Contoh systemd service (/etc/systemd/system/family-tree.service):"
echo "    [Service]"
echo "    Environment=ENV=production"
echo "    Environment=JWT_SECRET=<your-secret>"
echo "    ExecStart=/opt/family-tree/${BACKEND_BINARY}"
echo "    WorkingDirectory=/opt/family-tree"
echo "    Restart=always"
echo ""

# ── Run (opsional) ────────────────────────────────────────────────────────
if [ "$ACTION" = "run" ]; then
  log "Menjalankan production build secara lokal..."
  (
    cd "${BUILD_DIR}"
    export ENV="production"
    ./"${BACKEND_BINARY}"
  )
fi
