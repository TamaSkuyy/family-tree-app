# syntax=docker/dockerfile:1
# Build stage.
#
# Debian (glibc) rather than Alpine (musl) on purpose: gorm.io/driver/sqlite is
# backed by github.com/mattn/go-sqlite3, whose C sources use glibc types such as
# off64_t/pread64 that musl does not provide. On Alpine the CGO build fails with
# "unknown type name 'off64_t'". Building and running on the same Debian release
# also means the binary links against a matching glibc at runtime.
#
# CGO cannot be disabled: with CGO_ENABLED=0 the SQLite driver compiles to a stub
# and the server dies at startup with
#   "Binary was compiled with 'CGO_ENABLED=0', go-sqlite3 requires cgo to work".
FROM golang:1.25-bookworm AS builder
RUN apt-get update \
 && apt-get install -y --no-install-recommends gcc libc6-dev \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build -ldflags="-s -w" -o /out/family-tree-api ./cmd/main.go \
 && CGO_ENABLED=1 GOOS=linux go build -ldflags="-s -w" -o /out/family-tree-createadmin ./cmd/createadmin.go

# Runtime stage — runs as an unprivileged user.
FROM debian:bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates tzdata wget \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --system --create-home --shell /usr/sbin/nologin app \
 && mkdir -p /data && chown app:app /data
COPY --from=builder /out/family-tree-api /usr/local/bin/family-tree-api
COPY --from=builder /out/family-tree-createadmin /usr/local/bin/family-tree-createadmin
USER app
# The SQLite database is stored relative to the working directory, so keep it at
# /data and bind-mount a host directory there (see docker-compose.prod.yml).
WORKDIR /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1
ENTRYPOINT ["family-tree-api"]
