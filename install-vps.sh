#!/usr/bin/env bash
# =============================================================================
# Family Tree App — VPS installer (Ubuntu 22.04/24.04 & Debian 12)
#
# One-shot production install:
#   * installs Docker Engine + Compose plugin (official Docker apt repo)
#   * generates a strong JWT_SECRET and writes .env (chmod 600)
#   * builds the backend, frontend and Caddy reverse proxy
#   * obtains a Let's Encrypt certificate automatically (via Caddy)
#   * creates the first admin account
#
# Typical usage on the VPS, from inside the repository:
#   sudo ./install-vps.sh --domain family.example.com --email you@example.com
#
# Non-interactive:
#   sudo ./install-vps.sh --domain example.com --email me@example.com \
#        --admin-email me@example.com --admin-password 'S3cret-Pass' --yes
#
# Re-running is safe: the existing JWT_SECRET and admin account are reused.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"
DATA_DIR="data"

# ── Output helpers ────────────────────────────────────────────────────────────
if [ -t 1 ]; then
  GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[0;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
else
  GREEN=''; RED=''; YELLOW=''; CYAN=''; BOLD=''; NC=''
fi
log()     { printf "${GREEN}[OK]${NC}    %s\n" "$*"; }
info()    { printf "${CYAN}[INFO]${NC}  %s\n" "$*"; }
warn()    { printf "${YELLOW}[WARN]${NC}  %s\n" "$*" >&2; }
err()     { printf "${RED}[ERROR]${NC} %s\n" "$*" >&2; }
die()     { err "$*"; exit 1; }
heading() { printf "\n${BOLD}${CYAN}==> %s${NC}\n" "$*"; }

usage() {
  cat <<'EOF'
Family Tree App — VPS installer

Usage:
  sudo ./install-vps.sh [options]

Options:
  --domain <name[,name]>   Domain pointing at this VPS (required).
                           Multiple hostnames: --domain example.com,www.example.com
  --email <address>        Contact email for Let's Encrypt (required).
  --admin-email <address>  Email of the first admin account.
  --admin-password <pass>  Password of the first admin account (min 8 chars).
  --admin-name <name>      Display name of the first admin account.
  --public-mode            Allow anonymous read-only access to the tree.
  --dir <path>             Install directory when cloning (default: /opt/family-tree).
  --repo-url <url>         Clone the repository here if it is not present locally.
  --branch <name>          Branch to clone (default: main).
  --rotate-secret          Generate a new JWT_SECRET (logs out all existing sessions).
  --skip-admin             Do not create/promote an admin account.
  --no-ufw                 Do not touch UFW firewall rules.
  --force                  Continue even if ports 80/443 look occupied.
  --dry-run                Pre-flight only: check DNS/ports and write .env, then stop
                           before installing Docker or starting containers.
  -y, --yes                Non-interactive; accept defaults for anything unset.
  -h, --help               Show this help.

Examples:
  sudo ./install-vps.sh --domain family.example.com --email me@example.com
  sudo ./install-vps.sh --domain example.com,www.example.com --email me@example.com --public-mode
EOF
}

# ── Defaults & argument parsing ───────────────────────────────────────────────
DOMAIN=""
ACME_EMAIL=""
ADMIN_EMAIL=""
ADMIN_PASSWORD=""
ADMIN_NAME=""
PUBLIC_MODE="false"
PUBLIC_MODE_SET="false"
INSTALL_DIR="/opt/family-tree"
REPO_URL=""
BRANCH="main"
ROTATE_SECRET="false"
SKIP_ADMIN="false"
NO_UFW="false"
FORCE="false"
DRY_RUN="false"
ASSUME_YES="false"

while [ $# -gt 0 ]; do
  case "$1" in
    --domain)         DOMAIN="${2:-}"; shift 2 ;;
    --email)          ACME_EMAIL="${2:-}"; shift 2 ;;
    --admin-email)    ADMIN_EMAIL="${2:-}"; shift 2 ;;
    --admin-password) ADMIN_PASSWORD="${2:-}"; shift 2 ;;
    --admin-name)     ADMIN_NAME="${2:-}"; shift 2 ;;
    --public-mode)    PUBLIC_MODE="true"; PUBLIC_MODE_SET="true"; shift ;;
    --dir)            INSTALL_DIR="${2:-}"; shift 2 ;;
    --repo-url)       REPO_URL="${2:-}"; shift 2 ;;
    --branch)         BRANCH="${2:-}"; shift 2 ;;
    --rotate-secret)  ROTATE_SECRET="true"; shift ;;
    --skip-admin)     SKIP_ADMIN="true"; shift ;;
    --no-ufw)         NO_UFW="true"; shift ;;
    --force)          FORCE="true"; shift ;;
    --dry-run)        DRY_RUN="true"; shift ;;
    -y|--yes)         ASSUME_YES="true"; shift ;;
    -h|--help)        usage; exit 0 ;;
    *)                err "Unknown option: $1"; usage; exit 1 ;;
  esac
done

# ── Require root (re-exec with sudo when available) ───────────────────────────
if [ "$(id -u)" -ne 0 ]; then
  if command -v sudo >/dev/null 2>&1; then
    info "Root privileges are required; re-running with sudo..."
    exec sudo -E bash "${BASH_SOURCE[0]}" "$@"
  fi
  die "Run this script as root (or install sudo)."
fi

# ── Locate the project (clone it first when needed) ───────────────────────────
cd "$SCRIPT_DIR"

if [ ! -f "$COMPOSE_FILE" ]; then
  if [ -z "$REPO_URL" ]; then
    die "$COMPOSE_FILE not found in $SCRIPT_DIR. Either run the script from inside the repository, or pass --repo-url <git-url> to clone it."
  fi
  command -v git >/dev/null 2>&1 || { apt-get update -qq && apt-get install -y -qq git; }
  heading "Cloning repository into $INSTALL_DIR"
  if [ -d "$INSTALL_DIR/.git" ]; then
    git -C "$INSTALL_DIR" fetch --all --prune
    git -C "$INSTALL_DIR" checkout "$BRANCH"
    git -C "$INSTALL_DIR" pull --ff-only
  else
    mkdir -p "$(dirname "$INSTALL_DIR")"
    git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$INSTALL_DIR"
  fi
  cd "$INSTALL_DIR"
  [ -f "$COMPOSE_FILE" ] || die "$COMPOSE_FILE still missing after cloning — is the branch correct?"
fi

PROJECT_DIR="$PWD"
ENV_FILE="$PROJECT_DIR/.env"
DATA_DIR="$PROJECT_DIR/data"
[ -f "Caddyfile" ] || die "Caddyfile not found in $PROJECT_DIR (required for the HTTPS reverse proxy)."

heading "Family Tree App — production installer"
info "Project directory: $PROJECT_DIR"

# ── Reuse settings from an existing .env ──────────────────────────────────────
# Read individual keys instead of sourcing the file: sourcing would overwrite the
# values passed as CLI flags, and would execute whatever the file contains.
env_get() {
  local key="$1"
  [ -f "$ENV_FILE" ] || return 0
  sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1
}

EXISTING_JWT_SECRET=""
EXISTING_DOMAIN=""
EXISTING_ACME_EMAIL=""
EXISTING_ADMIN_EMAIL=""
EXISTING_PUBLIC_MODE=""
if [ -f "$ENV_FILE" ]; then
  EXISTING_JWT_SECRET="$(env_get JWT_SECRET)"
  EXISTING_DOMAIN="$(env_get DOMAIN)"
  EXISTING_ACME_EMAIL="$(env_get ACME_EMAIL)"
  EXISTING_ADMIN_EMAIL="$(env_get ADMIN_EMAIL)"
  EXISTING_PUBLIC_MODE="$(env_get PUBLIC_MODE)"
  info "Found an existing .env; values from it are used for anything not passed as a flag."
fi

# Flags win over the previous .env, which wins over prompting.
[ -n "$DOMAIN" ]     || DOMAIN="$EXISTING_DOMAIN"
[ -n "$ACME_EMAIL" ] || ACME_EMAIL="$EXISTING_ACME_EMAIL"
if [ "$PUBLIC_MODE_SET" != "true" ] && [ -n "$EXISTING_PUBLIC_MODE" ]; then
  PUBLIC_MODE="$EXISTING_PUBLIC_MODE"
fi

# ── Interactive prompts for anything still missing ────────────────────────────
INTERACTIVE="false"
if [ "$ASSUME_YES" != "true" ] && [ -r /dev/tty ] && [ -t 1 ]; then
  INTERACTIVE="true"
fi

ask() { # ask <var-name> <prompt> [default]
  local __var="$1" __prompt="$2" __default="${3:-}" __answer=""
  if [ -n "${!__var}" ]; then return 0; fi
  if [ "$INTERACTIVE" != "true" ]; then
    if [ -n "$__default" ]; then
      printf -v "$__var" '%s' "$__default"
      return 0
    fi
    die "Missing required value for '$__prompt'. Pass it as a flag (see --help), or run the script in an interactive terminal."
  fi
  if [ -n "$__default" ]; then
    read -r -p "$__prompt [$__default]: " __answer </dev/tty || true
    __answer="${__answer:-$__default}"
  else
    while [ -z "$__answer" ]; do
      read -r -p "$__prompt: " __answer </dev/tty || true
    done
  fi
  printf -v "$__var" '%s' "$__answer"
}

ask DOMAIN "Domain for this app (e.g. family.example.com)"

# Normalise: strip scheme/whitespace so a pasted URL still works.
DOMAIN="$(printf '%s' "$DOMAIN" | tr -d '[:space:]' | sed -e 's#^https\?://##' -e 's#/.*$##')"
[ -n "$DOMAIN" ] || die "Domain cannot be empty."
# Each hostname must contain at least one dot: catches typos like "myfamily"
# before Docker is installed, and a single-label name could not get a
# Let's Encrypt certificate anyway.
DOMAIN_RE='^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+(,[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+)*$'
if ! printf '%s' "$DOMAIN" | grep -qE "$DOMAIN_RE"; then
  die "That does not look like a valid domain list: '$DOMAIN'
       Expected something like: family.example.com  (or: example.com,www.example.com)"
fi
PRIMARY_DOMAIN="${DOMAIN%%,*}"

ask ACME_EMAIL "Email for Let's Encrypt expiry notices" "admin@${PRIMARY_DOMAIN#www.}"
printf '%s' "$ACME_EMAIL" | grep -qE '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' || die "Invalid email: '$ACME_EMAIL'"

if [ "$SKIP_ADMIN" != "true" ]; then
  ADMIN_EMAIL="${ADMIN_EMAIL:-$EXISTING_ADMIN_EMAIL}"
  ask ADMIN_EMAIL "Email for the first admin account" "admin@${PRIMARY_DOMAIN#www.}"
  if [ -z "$ADMIN_PASSWORD" ]; then
    # openssl may not be present yet on a minimal image (it is installed later
    # together with Docker), so fall back to /dev/urandom.
    if command -v openssl >/dev/null 2>&1; then
      ADMIN_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=\n' | cut -c1-20)"
    else
      ADMIN_PASSWORD="$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 20)"
    fi
    warn "No --admin-password given; generated one (shown in the summary below)."
  fi
  [ "${#ADMIN_PASSWORD}" -ge 8 ] || die "Admin password must be at least 8 characters."
fi

# ── Pre-flight: OS ────────────────────────────────────────────────────────────
[ -r /etc/os-release ] || die "Cannot read /etc/os-release; unsupported system."
# shellcheck disable=SC1091
OS_ID="$(. /etc/os-release && printf '%s' "${ID:-}")"
OS_CODENAME="$(. /etc/os-release && printf '%s' "${VERSION_CODENAME:-}")"
OS_PRETTY="$(. /etc/os-release && printf '%s' "${PRETTY_NAME:-$OS_ID}")"
case "$OS_ID" in
  ubuntu|debian) info "Detected OS: $OS_PRETTY" ;;
  *) warn "Untested OS '$OS_PRETTY'. The script targets Ubuntu 22.04/24.04 and Debian 12; continuing anyway." ;;
esac
[ -n "$OS_CODENAME" ] || OS_CODENAME="$(lsb_release -cs 2>/dev/null || echo stable)"

# ── Pre-flight: DNS ───────────────────────────────────────────────────────────
heading "Checking DNS"
PUBLIC_IP="$(curl -fsS --max-time 8 https://api.ipify.org 2>/dev/null || curl -fsS --max-time 8 https://ifconfig.me 2>/dev/null || true)"
[ -n "$PUBLIC_IP" ] || PUBLIC_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
info "This server's public IP: ${PUBLIC_IP:-unknown}"

DNS_OK="true"
for host in $(printf '%s' "$DOMAIN" | tr ',' ' '); do
  resolved="$(getent ahostsv4 "$host" 2>/dev/null | awk '{print $1}' | sort -u | head -1 || true)"
  if [ -z "$resolved" ]; then
    warn "DNS: $host does not resolve yet."
    DNS_OK="false"
  elif [ -n "$PUBLIC_IP" ] && [ "$resolved" != "$PUBLIC_IP" ]; then
    warn "DNS: $host resolves to $resolved, but this server is $PUBLIC_IP."
    DNS_OK="false"
  else
    log "DNS: $host -> $resolved"
  fi
done
if [ "$DNS_OK" != "true" ]; then
  warn "Let's Encrypt cannot issue a certificate until every domain points here (A record -> $PUBLIC_IP)."
  warn "The app will still start; fix DNS and run 'docker compose -f $COMPOSE_FILE restart caddy' afterwards."
fi

# ── Pre-flight: ports 80/443 ──────────────────────────────────────────────────
heading "Checking ports 80 and 443"
port_owner() { ss -H -ltnp 2>/dev/null | awk -v p=":$1" '$4 ~ p"$" {print $NF; exit}'; }
for p in 80 443; do
  owner="$(port_owner "$p" || true)"
  if [ -n "$owner" ]; then
    case "$owner" in
      *docker-proxy*|*caddy*)
        info "Port $p is held by the Docker/Caddy stack (expected on re-runs)." ;;
      *)
        if [ "$FORCE" = "true" ]; then
          warn "Port $p is in use by: $owner (continuing because --force was given)."
        else
          die "Port $p is already in use by: $owner
       Stop or remove that service first, for example:
         sudo systemctl disable --now nginx apache2 httpd
       Then re-run this script (or pass --force to try anyway)."
        fi
        ;;
    esac
  else
    log "Port $p is free."
  fi
done

# ── Install Docker ────────────────────────────────────────────────────────────
heading "Docker"
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  log "Docker $(docker --version | awk '{print $3}' | tr -d ,) with the Compose plugin is already installed."
elif [ "$DRY_RUN" = "true" ]; then
  warn "Docker is not installed; --dry-run stops before installing it."
else
  info "Installing Docker Engine and the Compose plugin from Docker's official apt repository..."
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg openssl >/dev/null
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/${OS_ID}/gpg" -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${OS_ID} ${OS_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null
  systemctl enable --now docker
  log "Docker installed: $(docker --version)"
fi
if ! command -v openssl >/dev/null 2>&1; then
  if [ "$DRY_RUN" = "true" ]; then
    warn "openssl is missing (a real run would install it)."
  else
    apt-get update -qq && apt-get install -y -qq openssl
  fi
fi

DC=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

# ── Write .env ────────────────────────────────────────────────────────────────
heading "Environment file"
if [ "$ROTATE_SECRET" = "true" ] || [ -z "$EXISTING_JWT_SECRET" ]; then
  JWT_SECRET="$(openssl rand -hex 48)"
  log "Generated a new JWT_SECRET (96 hex chars)."
else
  JWT_SECRET="$EXISTING_JWT_SECRET"
  log "Reusing the existing JWT_SECRET."
fi

umask 077
cat > "$ENV_FILE" <<EOF
# Generated by install-vps.sh on $(date -u '+%Y-%m-%d %H:%M:%S UTC')
# This file contains secrets — keep it private and out of version control.

# Domain(s) served with automatic HTTPS (comma-separated).
DOMAIN=$DOMAIN

# Contact address for Let's Encrypt certificate notices.
ACME_EMAIL=$ACME_EMAIL

# Signs the JWT auth tokens. Changing it logs every user out.
JWT_SECRET=$JWT_SECRET

# true = anonymous visitors may read the tree; write actions still need login.
PUBLIC_MODE=$PUBLIC_MODE

# Recorded for the installer; not read by the application.
ADMIN_EMAIL=${ADMIN_EMAIL:-}
EOF
chmod 600 "$ENV_FILE"
log "Wrote $ENV_FILE (permissions 600)."

# ── Firewall ──────────────────────────────────────────────────────────────────
if [ "$DRY_RUN" = "true" ]; then
  info "Skipping firewall changes (--dry-run)."
elif [ "$NO_UFW" != "true" ] && command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "^Status: active"; then
  heading "Firewall (UFW is active)"
  for rule in "OpenSSH" "80/tcp" "443/tcp"; do
    ufw allow "$rule" >/dev/null 2>&1 && log "ufw allow $rule" || warn "Could not add UFW rule for $rule"
  done
elif command -v ufw >/dev/null 2>&1; then
  info "UFW is installed but inactive — leaving the firewall untouched."
fi

# ── Data directory ────────────────────────────────────────────────────────────
heading "Preparing the data directory"
mkdir -p "$DATA_DIR"
log "Using $DATA_DIR for the SQLite database."

# ── Dry run stops here ────────────────────────────────────────────────────────
if [ "$DRY_RUN" = "true" ]; then
  printf "\n${BOLD}${GREEN}==> Dry run complete — nothing was installed or started.${NC}\n\n"
  printf "  Domain          : %s\n" "$DOMAIN"
  printf "  ACME email      : %s\n" "$ACME_EMAIL"
  printf "  Project dir     : %s\n" "$PROJECT_DIR"
  printf "  Public mode     : %s\n" "$PUBLIC_MODE"
  printf "  Admin email     : %s\n" "${ADMIN_EMAIL:-<skipped>}"
  printf "  Env file        : %s (written)\n" "$ENV_FILE"
  cat <<EOF

Re-run without --dry-run to build and start everything:
  sudo ./install-vps.sh --domain $DOMAIN --email $ACME_EMAIL

EOF
  exit 0
fi

# ── Build ─────────────────────────────────────────────────────────────────────
heading "Building images (first run takes a few minutes)"
"${DC[@]}" build

# The backend runs as the unprivileged 'app' user, but Docker creates the bind
# mount as root. Without this fix SQLite cannot create family_tree.db.
"${DC[@]}" run --rm --no-deps --user root --entrypoint chown backend -R app:app /data
log "Ownership of $DATA_DIR set to the container's app user."

# ── Start ─────────────────────────────────────────────────────────────────────
heading "Starting containers"
"${DC[@]}" up -d --remove-orphans
"${DC[@]}" ps

# ── Wait for health ───────────────────────────────────────────────────────────
heading "Waiting for the backend to become healthy"
HEALTHY="false"
for i in $(seq 1 24); do
  state="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q backend 2>/dev/null | head -1)" 2>/dev/null || true)"
  if [ "$state" = "healthy" ]; then HEALTHY="true"; log "Backend is healthy."; break; fi
  printf '.'
  sleep 5
done
printf '\n'
if [ "$HEALTHY" != "true" ]; then
  warn "Backend did not report healthy in time. Recent logs:"
  "${DC[@]}" logs --tail 40 backend || true
fi

heading "Checking HTTPS"
HTTPS_OK="false"
for i in $(seq 1 12); do
  if curl -fsS --max-time 8 -o /dev/null "https://${PRIMARY_DOMAIN}/health"; then HTTPS_OK="true"; break; fi
  sleep 5
done
if [ "$HTTPS_OK" = "true" ]; then
  log "https://${PRIMARY_DOMAIN}/health responds."
else
  warn "Could not reach https://${PRIMARY_DOMAIN}/health yet."
  warn "Most common cause: DNS not pointing here, or ports 80/443 blocked at the provider."
  warn "Check with: ${DC[*]} logs --tail 50 caddy"
fi

# ── First admin account ───────────────────────────────────────────────────────
if [ "$SKIP_ADMIN" != "true" ]; then
  heading "Creating the admin account"
  ADMIN_ARGS=(-email "$ADMIN_EMAIL" -password "$ADMIN_PASSWORD")
  [ -n "$ADMIN_NAME" ] && ADMIN_ARGS+=(-name "$ADMIN_NAME")
  if "${DC[@]}" exec -T backend family-tree-createadmin "${ADMIN_ARGS[@]}"; then
    log "Admin account ready: $ADMIN_EMAIL"
  else
    warn "Could not create the admin account. Retry later with:"
    warn "  ${DC[*]} exec backend family-tree-createadmin -email '$ADMIN_EMAIL' -password '<password>'"
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
printf "\n${BOLD}${GREEN}================= Installation complete =================${NC}\n\n"
printf "  URL            : https://%s\n" "$PRIMARY_DOMAIN"
printf "  Project dir    : %s\n" "$PROJECT_DIR"
printf "  Database file  : %s/family_tree.db\n" "$DATA_DIR"
printf "  Swagger UI     : https://%s/swagger/index.html\n" "$PRIMARY_DOMAIN"
if [ "$SKIP_ADMIN" != "true" ]; then
  printf "  Admin login    : %s\n" "$ADMIN_EMAIL"
  printf "  Admin password : %s\n" "$ADMIN_PASSWORD"
fi
printf "  Public mode    : %s\n" "$PUBLIC_MODE"
cat <<EOF

Next steps
  * Back up the database by copying: $DATA_DIR/family_tree.db
  * View logs        : ${DC[*]} logs -f
  * Restart          : ${DC[*]} restart
  * Update the app   : git pull && ${DC[*]} up -d --build
  * Rotate the secret: sudo ./install-vps.sh --domain $DOMAIN --email $ACME_EMAIL --rotate-secret

EOF
