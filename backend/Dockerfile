FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /family-tree-api ./cmd/main.go

FROM alpine:3.20
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder /family-tree-api /family-tree-api
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8080/health || exit 1
ENTRYPOINT ["/family-tree-api"]
