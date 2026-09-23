#!/usr/bin/env bash
# =============================================================================
# Family Tree App — VPS installer (Ubuntu 22.04/24.04+ & Debian 12)
#
# One-shot production install:
#   * installs Docker Engine + Compose plugin (official Docker apt repo)
#   * generates a strong JWT_SECRET and writes .env (chmod 600)
#   * builds the backend + frontend
#   * serves HTTPS either through a bundled Caddy container (default) or through
#     an nginx that is already running on the VPS (--behind-nginx)
#   * creates the first admin account
#
# Typical usage on the VPS, from inside the repository:
#   sudo ./install-vps.sh --domain family.example.com --email you@example.com
#
# If ports 80/443 are already taken by your own nginx/apache:
#   sudo ./install-vps.sh --behind-nginx --port 8080 --install-nginx-vhost \
#        --domain family.example.com --email you@example.com
#
# Non-interactive:
#   sudo ./install-vps.sh --domain example.com --email me@example.com \
#        --admin-email me@example.com --admin-password 'S3cret-Pass' --yes
#
# Re-running is safe: the existing JWT_SECRET and admin account are reused.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="docker-compose.prod.yml"        # Caddy mode (TLS in a container)
NGINX_COMPOSE_FILE="docker-compose.nginx.yml" # --behind-nginx mode (host nginx)
NGINX_TEMPLATE="deploy/nginx-family-tree.conf"
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
  --behind-nginx           Use the nginx already running on this VPS instead of the
                           bundled Caddy container. The app is published on
                           127.0.0.1:<port> and your nginx proxies to it.
  --port <n>               Host port for the app in --behind-nginx mode (default 8080).
  --install-nginx-vhost    In --behind-nginx mode, write the server block into
                           /etc/nginx, test it, and reload nginx (with backup/rollback).
  --skip-certbot           Do not try to obtain a certificate with certbot.
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
  # Ports 80/443 already used by your own nginx:
  sudo ./install-vps.sh --behind-nginx --port 8080 --install-nginx-vhost \
       --domain family.example.com --email me@example.com
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
BEHIND_NGINX="false"
APP_PORT="8080"
APP_PORT_SET="false"
INSTALL_VHOST="false"
SKIP_CERTBOT="false"
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
    --behind-nginx)   BEHIND_NGINX="true"; shift ;;
    --port)           APP_PORT="${2:-}"; APP_PORT_SET="true"; shift 2 ;;
    --install-nginx-vhost) INSTALL_VHOST="true"; shift ;;
    --skip-certbot)   SKIP_CERTBOT="true"; shift ;;
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

# ── Validate mode-specific options ────────────────────────────────────────────
if [ "$INSTALL_VHOST" = "true" ] && [ "$BEHIND_NGINX" != "true" ]; then
  die "--install-nginx-vhost only makes sense together with --behind-nginx."
fi
if [ "$BEHIND_NGINX" = "true" ]; then
  COMPOSE_FILE="$NGINX_COMPOSE_FILE"
fi
MODE_ARGS=""
if [ "$BEHIND_NGINX" = "true" ]; then
  MODE_ARGS="--behind-nginx --port $APP_PORT"
fi

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
if [ "$BEHIND_NGINX" = "true" ]; then
  [ -f "$NGINX_TEMPLATE" ] || die "$NGINX_TEMPLATE not found in $PROJECT_DIR (required in --behind-nginx mode)."
else
  [ -f "Caddyfile" ] || die "Caddyfile not found in $PROJECT_DIR (required for the Caddy HTTPS mode).
       If your VPS already runs nginx on port 80/443, use --behind-nginx instead."
fi

heading "Family Tree App — production installer"
info "Project directory: $PROJECT_DIR"
if [ "$BEHIND_NGINX" = "true" ]; then
  info "Mode: --behind-nginx (your existing nginx terminates TLS; app on 127.0.0.1:$APP_PORT)"
else
  info "Mode: bundled Caddy container (automatic HTTPS on ports 80/443)"
fi

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
EXISTING_APP_PORT=""
if [ -f "$ENV_FILE" ]; then
  EXISTING_JWT_SECRET="$(env_get JWT_SECRET)"
  EXISTING_DOMAIN="$(env_get DOMAIN)"
  EXISTING_ACME_EMAIL="$(env_get ACME_EMAIL)"
  EXISTING_ADMIN_EMAIL="$(env_get ADMIN_EMAIL)"
  EXISTING_PUBLIC_MODE="$(env_get PUBLIC_MODE)"
  EXISTING_APP_PORT="$(env_get APP_PORT)"
  info "Found an existing .env; values from it are used for anything not passed as a flag."
fi

# Flags win over the previous .env, which wins over prompting.
[ -n "$DOMAIN" ]     || DOMAIN="$EXISTING_DOMAIN"
[ -n "$ACME_EMAIL" ] || ACME_EMAIL="$EXISTING_ACME_EMAIL"
if [ "$PUBLIC_MODE_SET" != "true" ] && [ -n "$EXISTING_PUBLIC_MODE" ]; then
  PUBLIC_MODE="$EXISTING_PUBLIC_MODE"
fi
if [ "$APP_PORT_SET" != "true" ] && [ -n "$EXISTING_APP_PORT" ]; then
  APP_PORT="$EXISTING_APP_PORT"
fi

# Validate the port here so a hand-edited .env cannot slip through either.
case "$APP_PORT" in
  ''|*[!0-9]*) die "--port must be a number (got '$APP_PORT')." ;;
esac
if [ "$APP_PORT" -lt 1 ] || [ "$APP_PORT" -gt 65535 ]; then
  die "--port must be between 1 and 65535 (got '$APP_PORT')."
fi
if [ "$BEHIND_NGINX" = "true" ]; then
  MODE_ARGS="--behind-nginx --port $APP_PORT"
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
  if [ "$BEHIND_NGINX" = "true" ]; then
    warn "The app will still start; after the A record is live run the certbot command printed at the end."
  else
    warn "The app will still start; fix DNS and run 'docker compose -f $COMPOSE_FILE restart caddy' afterwards."
  fi
fi

# ── Pre-flight: ports ─────────────────────────────────────────────────────────
port_owner() {
  # `ss -ltnp` only shows the owning process when we can read /proc (root). Fall
  # back to a clear message instead of returning an unrelated column.
  local line
  line="$(ss -H -ltnp 2>/dev/null | awk -v p=":$1" '$4 ~ p"$" {print; exit}')"
  if printf '%s' "$line" | grep -q 'users:'; then
    printf '%s' "$line" | sed 's/.*users:/users:/'
  elif [ -n "$line" ]; then
    printf 'unknown process (re-run as root to identify it)'
  fi
}

if [ "$BEHIND_NGINX" = "true" ]; then
  # 80/443 are supposed to be taken by the host nginx; we only need APP_PORT.
  heading "Checking port $APP_PORT (host nginx keeps 80/443)"
  owner="$(port_owner "$APP_PORT" || true)"
  if [ -n "$owner" ]; then
    case "$owner" in
      *docker-proxy*)
        info "Port $APP_PORT is held by the Docker stack (expected on re-runs)." ;;
      *)
        if [ "$FORCE" = "true" ]; then
          warn "Port $APP_PORT is in use by: $owner (continuing because --force was given)."
        else
          die "Port $APP_PORT is already in use by: $owner
       Choose another one with --port <n>, or stop that service."
        fi ;;
    esac
  else
    log "Port $APP_PORT is free."
  fi
  info "Your existing nginx stays on 80/443 and will proxy to 127.0.0.1:$APP_PORT."
else
  heading "Checking ports 80 and 443"
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
       If that is your own nginx, re-run with --behind-nginx (it proxies to the app
       instead of fighting over the port):
         sudo ./install-vps.sh --behind-nginx --port 8080 --install-nginx-vhost \\
              --domain $DOMAIN --email $ACME_EMAIL
       Otherwise stop that service, for example:
         sudo systemctl disable --now nginx apache2 httpd"
          fi
          ;;
      esac
    else
      log "Port $p is free."
    fi
  done
fi

# ── Install Docker ────────────────────────────────────────────────────────────
heading "Docker"
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  log "Docker $(docker --version | awk '{print $3}' | tr -d ,) with the Compose plugin is already installed."
elif [ "$DRY_RUN" = "true" ]; then
  warn "Docker is not installed; --dry-run stops before installing it."
else
  info "Installing Docker Engine and the Compose plugin..."
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg openssl >/dev/null

  if curl -fsS -o /dev/null --max-time 20 "https://download.docker.com/linux/${OS_ID}/dists/${OS_CODENAME}/Release"; then
    info "Using Docker's apt repository for ${OS_ID} ${OS_CODENAME}..."
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL "https://download.docker.com/linux/${OS_ID}/gpg" -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${OS_ID} ${OS_CODENAME} stable" \
      > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null
  else
    # Brand-new Ubuntu releases are often missing from Docker's apt repo for a
    # while (e.g. 26.04 right after release), which makes `apt-get update` fail.
    warn "Docker's apt repository has no '${OS_CODENAME}' release yet; using Docker's official convenience script instead."
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sh /tmp/get-docker.sh
    rm -f /tmp/get-docker.sh
  fi

  systemctl enable --now docker
  log "Docker installed: $(docker --version)"
fi
# The convenience script and some minimal images ship docker without the Compose
# plugin; make sure it is available before we build.
if ! docker compose version >/dev/null 2>&1; then
  if [ "$DRY_RUN" = "true" ]; then
    warn "The docker compose plugin is missing (a real run would install it)."
  else
    apt-get install -y -qq docker-compose-plugin >/dev/null 2>&1 \
      || die "The Docker Compose plugin is missing and could not be installed. Install it manually: https://docs.docker.com/compose/install/linux/"
    docker compose version >/dev/null 2>&1 || die "docker compose is still unavailable after installing docker-compose-plugin."
    log "Docker Compose plugin installed."
  fi
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

# Origins a browser will actually use to reach this app. Same-origin requests
# work without this, but listing them keeps login/register working when a proxy
# rewrites the Host header, and lets you add extra hostnames later.
CORS_ORIGINS=""
for d in $(printf '%s' "$DOMAIN" | tr ',' ' '); do
  CORS_ORIGINS="${CORS_ORIGINS:+$CORS_ORIGINS,}https://$d,http://$d"
done

{
cat <<EOF
# Generated by install-vps.sh on $(date -u '+%Y-%m-%d %H:%M:%S UTC')
# This file contains secrets — keep it private and out of version control.

# Domain(s) this app is served on (comma-separated).
DOMAIN=$DOMAIN

# Contact address for Let's Encrypt certificate notices.
ACME_EMAIL=$ACME_EMAIL

# Signs the JWT auth tokens. Changing it logs every user out.
JWT_SECRET=$JWT_SECRET

# true = anonymous visitors may read the tree; write actions still need login.
PUBLIC_MODE=$PUBLIC_MODE

# Browser origins allowed to call the API (comma-separated). The backend rejects
# any other Origin with 403 — this is what login/register failures look like when
# a hostname is missing here.
CORS_ORIGINS=$CORS_ORIGINS
EOF
if [ "$BEHIND_NGINX" = "true" ]; then
cat <<EOF

# Host port the app's frontend is published on, bound to 127.0.0.1. Your own
# nginx reverse-proxies the domain to http://127.0.0.1:\$APP_PORT.
APP_PORT=$APP_PORT
EOF
fi
cat <<EOF

# Recorded for the installer; not read by the application.
ADMIN_EMAIL=${ADMIN_EMAIL:-}
EOF
} > "$ENV_FILE"
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
  if [ "$BEHIND_NGINX" = "true" ]; then
    MODE_LABEL="behind-nginx (app on 127.0.0.1:$APP_PORT)"
  else
    MODE_LABEL="bundled Caddy (ports 80/443)"
  fi
  printf "\n${BOLD}${GREEN}==> Dry run complete — nothing was installed or started.${NC}\n\n"
  printf "  Mode            : %s\n" "$MODE_LABEL"
  printf "  Domain          : %s\n" "$DOMAIN"
  printf "  ACME email      : %s\n" "$ACME_EMAIL"
  printf "  Project dir     : %s\n" "$PROJECT_DIR"
  printf "  Public mode     : %s\n" "$PUBLIC_MODE"
  printf "  Admin email     : %s\n" "${ADMIN_EMAIL:-<skipped>}"
  printf "  Env file        : %s (written)\n" "$ENV_FILE"
  REPLAY="sudo ./install-vps.sh"
  if [ -n "$MODE_ARGS" ]; then
    REPLAY="$REPLAY $MODE_ARGS"
  fi
  cat <<EOF

Re-run without --dry-run to build and start everything:
  $REPLAY --domain $DOMAIN --email $ACME_EMAIL

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

CERT_OK="false"
DOMAIN_SPACED="$(printf '%s' "$DOMAIN" | tr ',' ' ')"

if [ "$BEHIND_NGINX" = "true" ]; then
  heading "Checking the app on 127.0.0.1:$APP_PORT"
  APP_OK="false"
  for i in $(seq 1 12); do
    if curl -fsS --max-time 8 -o /dev/null "http://127.0.0.1:${APP_PORT}/health"; then APP_OK="true"; break; fi
    sleep 3
  done
  if [ "$APP_OK" = "true" ]; then
    log "http://127.0.0.1:${APP_PORT}/health responds."
  else
    warn "The app did not answer on 127.0.0.1:${APP_PORT}."
    warn "Check with: ${DC[*]} logs --tail 50"
  fi

  # ── Host nginx: vhost + certificate ─────────────────────────────────────────
  heading "Host nginx reverse proxy"
  if [ "$INSTALL_VHOST" = "true" ]; then
    command -v nginx >/dev/null 2>&1 || die "nginx is not installed, but --install-nginx-vhost was given."
    if [ -d /etc/nginx/sites-available ] && [ -d /etc/nginx/sites-enabled ]; then
      VHOST_TARGET="/etc/nginx/sites-available/family-tree.conf"
      VHOST_LINK="/etc/nginx/sites-enabled/family-tree.conf"
    else
      VHOST_TARGET="/etc/nginx/conf.d/family-tree.conf"
      VHOST_LINK=""
    fi

    VHOST_BACKUP=""
    if [ -f "$VHOST_TARGET" ]; then
      VHOST_BACKUP="${VHOST_TARGET}.bak.$(date +%s)"
      cp -a "$VHOST_TARGET" "$VHOST_BACKUP"
      info "Backed up the existing vhost to $VHOST_BACKUP"
    fi

    sed -e "s/__DOMAIN__/${DOMAIN_SPACED}/g" -e "s/__APP_PORT__/${APP_PORT}/g" \
      "$NGINX_TEMPLATE" > "$VHOST_TARGET"
    if [ -n "$VHOST_LINK" ]; then
      ln -sf "$VHOST_TARGET" "$VHOST_LINK"
    fi

    if nginx -t >/dev/null 2>&1; then
      systemctl reload nginx 2>/dev/null || nginx -s reload
      log "nginx vhost enabled for: $DOMAIN_SPACED -> 127.0.0.1:$APP_PORT"
    else
      err "nginx rejected the generated config:"
      nginx -t || true
      if [ -n "$VHOST_BACKUP" ]; then
        mv -f "$VHOST_BACKUP" "$VHOST_TARGET"
        warn "Restored your previous vhost."
      else
        rm -f "$VHOST_TARGET"
        if [ -n "$VHOST_LINK" ]; then
          rm -f "$VHOST_LINK"
        fi
        warn "Removed the generated vhost."
      fi
      die "Aborted without reloading nginx; your existing sites are untouched."
    fi
  else
    info "Not touching /etc/nginx (pass --install-nginx-vhost to do it automatically)."
    printf '       Manual install:\n'
    printf '         sudo cp %s /etc/nginx/sites-available/family-tree.conf\n' "$NGINX_TEMPLATE"
    printf "         sudo sed -i 's/__DOMAIN__/%s/; s/__APP_PORT__/%s/' /etc/nginx/sites-available/family-tree.conf\n" "$DOMAIN_SPACED" "$APP_PORT"
    printf '         sudo ln -sf /etc/nginx/sites-available/family-tree.conf /etc/nginx/sites-enabled/\n'
    printf '         sudo nginx -t && sudo systemctl reload nginx\n'
  fi

  # ── Certificate ─────────────────────────────────────────────────────────────
  if [ "$SKIP_CERTBOT" = "true" ]; then
    info "Skipping certbot (--skip-certbot)."
  elif ! command -v certbot >/dev/null 2>&1; then
    warn "certbot is not installed, so HTTPS is not enabled yet. Run:"
    printf '         sudo apt-get install -y certbot python3-certbot-nginx\n'
    printf '         sudo certbot --nginx -d %s --agree-tos -m %s --redirect\n' "$DOMAIN_SPACED" "$ACME_EMAIL"
  elif [ "$DNS_OK" != "true" ]; then
    warn "certbot skipped: DNS does not point here yet. Once the A record is live, run:"
    printf '         sudo certbot --nginx -d %s --agree-tos -m %s --redirect\n' "$DOMAIN_SPACED" "$ACME_EMAIL"
  elif [ "$INSTALL_VHOST" != "true" ]; then
    warn "certbot skipped: the nginx vhost is not installed yet. Add it first (see above), then run:"
    printf '         sudo certbot --nginx -d %s --agree-tos -m %s --redirect\n' "$DOMAIN_SPACED" "$ACME_EMAIL"
  else
    heading "Requesting the Let's Encrypt certificate"
    CERTBOT_ARGS=(--nginx --non-interactive --agree-tos -m "$ACME_EMAIL" --redirect)
    for d in $DOMAIN_SPACED; do CERTBOT_ARGS+=(-d "$d"); done
    if certbot "${CERTBOT_ARGS[@]}"; then
      CERT_OK="true"
      log "HTTPS enabled for: $DOMAIN_SPACED"
    else
      warn "certbot failed, but the app itself is running."
      warn "Inspect with: sudo certbot certificates   /   sudo tail -50 /var/log/letsencrypt/letsencrypt.log"
    fi
  fi
else
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
if [ "$BEHIND_NGINX" = "true" ]; then
  if [ "${CERT_OK:-false}" = "true" ]; then
    printf "  URL            : https://%s\n" "$PRIMARY_DOMAIN"
  else
    printf "  URL            : https://%s  (HTTPS belum aktif — lihat catatan di bawah)\n" "$PRIMARY_DOMAIN"
  fi
  printf "  Backend app    : http://127.0.0.1:%s  (dipakai oleh nginx host)\n" "$APP_PORT"
  printf "  Swagger UI     : https://%s/swagger/index.html\n" "$PRIMARY_DOMAIN"
else
  printf "  URL            : https://%s\n" "$PRIMARY_DOMAIN"
  printf "  Swagger UI     : https://%s/swagger/index.html\n" "$PRIMARY_DOMAIN"
fi
printf "  Project dir    : %s\n" "$PROJECT_DIR"
printf "  Database file  : %s/family_tree.db\n" "$DATA_DIR"
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
  * Rotate the secret: sudo ./install-vps.sh $MODE_ARGS --domain $DOMAIN --email $ACME_EMAIL --rotate-secret
EOF
if [ "$BEHIND_NGINX" = "true" ] && [ "${CERT_OK:-false}" != "true" ]; then
  cat <<EOF
  * Enable HTTPS     : sudo certbot --nginx -d $DOMAIN_SPACED --agree-tos -m $ACME_EMAIL --redirect
                       (jalankan setelah A record $PRIMARY_DOMAIN mengarah ke IP VPS ini)

Host nginx untuk domain ini belum tentu aktif. Kalau https belum jalan, pastikan
vhost-nya terpasang (deploy/nginx-family-tree.conf) dan DNS sudah benar.
EOF
fi
cat <<EOF

EOF
