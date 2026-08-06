# 🌳 Family Tree App — Roadmap

## ✅ Phase 1 — Mini SaaS Foundation (current)

- [x] JWT authentication (register, login, me)
- [x] Role-based access control (admin/user)
- [x] Family tree visualization
- [x] CRUD persons + relationships
- [x] Search with debounce
- [x] Admin user management panel
- [x] Rate limiting (token bucket per IP)
- [x] Public read-only mode (`PUBLIC_MODE=true`)
- [x] Forgot/reset password flow (mock email)
- [x] Swagger API documentation
- [x] Docker multi-stage builds (backend + frontend)
- [x] Docker Compose (development + production)
- [x] GitHub Actions CI/CD (test → build → push)
- [x] Backend integration tests (services + handlers)
- [x] Custom React hooks (useApi, usePagination, useDebounce)
- [x] Registration page with form validation
- [x] Loading/error/empty states on data components
- [x] User dropdown with role badge

## 🔜 Phase 2 — Security & Polish

- [ ] Refresh token rotation (HttpOnly secure cookies)
- [ ] Two-factor authentication (TOTP) for admin accounts
- [ ] Audit logs for login events and mutations
- [ ] Photo upload for person profiles
- [ ] Bulk import/export CSV
- [ ] Real email service (SendGrid / Mailgun / Resend)
- [ ] Input sanitization middleware
- [ ] Frontend E2E tests (Playwright)
- [ ] Dark mode support
- [ ] API versioning strategy

## 💭 Phase 3 — Platform Expansion

- [ ] Multi-tenancy (family groups with invitations)
- [ ] Internationalization (i18n)
- [ ] Progressive Web App (PWA) with offline support
- [ ] Mobile app (React Native)
- [ ] Social login (Google, GitHub OAuth)
- [ ] Collaborative editing
- [ ] PDF export of family trees
- [ ] Public sharing with expiring links

---

_Last updated: 2026-08-05_
