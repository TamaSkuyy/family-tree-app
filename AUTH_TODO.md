# Authentication & User Improvements — Plan

This file lists a prioritized, incremental roadmap to harden and improve authentication and user features for the Family Tree app. We'll implement these step-by-step (small PRs), verifying each change with a quick local test.

## Goals

- Securely authenticate users with JWT
- Provide a smooth UX for login/registration/auto-logout
- Protect server-side write endpoints
- Prepare for role-based access and token refresh flow
- Add tests and docs

---

## High priority (do in order)

1. Make JWT secret configurable

- Files: `backend/internal/services/auth_service.go`, `README.md`
- Tasks:
  - Read JWT secret from `JWT_SECRET` env var; fallback only allowed for local dev.
  - Fail fast in production if secret missing (or document it clearly).
- Test:
  - Run `JWT_SECRET=test go run ./cmd` and confirm endpoints still work.

2. Add `GET /api/v1/auth/me` and AuthContext (done)

- Confirmed: `AuthContext` in frontend loads user on startup.

3. Protect backend mutation endpoints (done)

- Audit all routes and ensure `handlers.JWTAuthMiddleware()` is applied for writes.

4. Frontend: auto-logout + UX for expired tokens (in-progress)

- Axios response interceptor clears token + redirects to `/login` on 401 and display a toast.

---

## Medium priority

5. Add role-based access control (RBAC)

- Extend `User` model with `role` (enum: `user`, `admin`)
- Seed an admin user in `cmd/seed.go` or via `seed_admin.go` helper
- Add `RequireRole(role)` middleware
- Protect admin-only endpoints (e.g., bulk operations)

6. Add `created_by` / `updated_by` metadata to resources

- DB migration: add `created_by` (UUID) columns where relevant
- Use `c.Get("user")` in handlers to populate fields

7. Registration page & UX polish

- Add `Register.jsx` with client validation
- Auto-login on successful registration

8. Refresh tokens (optional, more complex)

- Implement refresh token rotation using HttpOnly secure cookies
- Endpoints: `/auth/refresh`, `/auth/logout`
- Make access tokens short lived (minutes) and refresh tokens longer

9. Password reset flow

- Request reset, send email (or mock), token-based reset endpoint

---

## Low priority / Nice-to-have

10. Brute-force protections / rate-limiting
11. 2FA (TOTP) for admin accounts
12. Audit logs for login events
13. Tests: unit/integration for AuthService + handlers

---

## First actionable PR (small)

- Make JWT_SECRET configurable and document it in README + `.env.example`.
- Add a small `backend/internal/services/auth_service_test.go` that verifies token generation/parsing.

Commands for local dev

Backend:

```bash
cd backend
# set secret for dev
export JWT_SECRET="dev-secret"
go run ./cmd
```

Frontend:

```bash
cd frontend
npm install
npm run dev -- --force
```

---

If you agree I can implement item 1 now (make the JWT secret env-driven and add `.env.example` and README notes). Or I can start with item 4 (finish auto-logout UX by adding toasts). Which do you prefer?
