Notes:
- AUTH API
Quick notes / next options
The middleware currently returns 401 if token is missing/invalid. If you want finer-grained RBAC (roles, or allowing read-only access without auth), we can:
Add separate middleware (e.g., RequireAuth vs OptionalAuth), or
Add role checks (e.g., admin only).
If you want the frontend to handle 401 responses and redirect to /login automatically, I can add an axios response interceptor in api.js to clear token and navigate to /login on 401.
The middleware already sets the user object into context (c.Set("user", user)). If you want handlers to read that user (e.g., to limit updates to owners), I can show examples in person handlers.

- TODO
A) Add frontend axios interceptor to auto-logout on 401 and redirect to /login, or
B) Add role-based checks to certain backend endpoints, or
C) Add an example of using c.Get("user") in person_handler.go to attach created_by metadata or limit updates?