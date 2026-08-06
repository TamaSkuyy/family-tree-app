# Family Tree App — Mini SaaS Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Family Tree app from basic CRUD to a deploy-ready mini SaaS with tests, Docker, CI/CD, rate limiting, Swagger docs, password reset flow, and polished UX.

**Architecture:** The app follows a two-tier structure — Go/Gin backend (SQLite + GORM) and React/Vite frontend. Backend uses handler→service→model layering. Frontend uses component→context→hook decomposition. Infrastructure adds multi-stage Docker builds with nginx reverse proxy for production, and GitHub Actions for CI/CD.

**Tech Stack:** Go 1.24, Gin, GORM + SQLite, JWT (golang-jwt/jwt/v5), swaggo/swag, golang.org/x/time/rate, React 18, Vite 5, Tailwind CSS, daisyUI, react-hook-form, react-hot-toast, react-router-dom v6, axios, Docker, GitHub Actions

## Global Constraints

- All JSON keys are snake_case (`first_name`, `parent_relationships`)
- All IDs are UUID strings — parse with `uuid.Parse()` in handlers
- Date format: `YYYY-MM-DD` (Go layout `2006-01-02`)
- Gender validates as `"male"` or `"female"`
- SQLite DB path is relative: `backend/family_tree.db`
- Frontend token stored in `localStorage.ft_token`, sent as `Bearer` header
- Write endpoints require `JWTAuthMiddleware()`, destructive ones also require `RequireRole("admin")`
- JWT secret from `JWT_SECRET` env var, default `"dev-secret-change-me"` in development

---

## Phase 0: Backend Foundation Cleanup

### Task 0.1: Move middleware to dedicated package

**Files:**
- Create: `backend/internal/middleware/auth.go`
- Create: `backend/internal/middleware/admin.go`
- Modify: `backend/internal/handlers/auth_middleware.go` (delete old code, keep re-exports temporarily)
- Modify: `backend/cmd/main.go:37,48-51` (update import path)

**Interfaces:**
- Produces: `middleware.JWTAuthMiddleware() gin.HandlerFunc`, `middleware.RequireRole(role string) gin.HandlerFunc`

- [ ] **Step 1: Create `backend/internal/middleware/auth.go`**

Move `JWTAuthMiddleware` from `handlers/auth_middleware.go`:

```go
package middleware

import (
    "net/http"
    "strings"

    "family-tree-backend/internal/services"

    "github.com/gin-gonic/gin"
)

func JWTAuthMiddleware() gin.HandlerFunc {
    authService := services.NewAuthService()
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
            return
        }

        token, ok := strings.CutPrefix(authHeader, "Bearer ")
        if !ok {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization header"})
            return
        }

        user, err := authService.GetUserFromToken(token)
        if err != nil {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
            return
        }

        c.Set("user", user)
        c.Next()
    }
}
```

- [ ] **Step 2: Create `backend/internal/middleware/admin.go`**

Move `RequireRole` from `handlers/auth_middleware.go`:

```go
package middleware

import (
    "net/http"

    "family-tree-backend/internal/models"

    "github.com/gin-gonic/gin"
)

func RequireRole(role string) gin.HandlerFunc {
    return func(c *gin.Context) {
        u, exists := c.Get("user")
        if !exists {
            c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
            return
        }

        mu, ok := u.(*models.User)
        if !ok || mu.Role != role {
            c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
            return
        }

        c.Next()
    }
}
```

- [ ] **Step 3: Update `backend/cmd/main.go` imports**

Replace `"family-tree-backend/internal/handlers"` import for middleware usage with `"family-tree-backend/internal/middleware"`.

Change all `handlers.JWTAuthMiddleware()` → `middleware.JWTAuthMiddleware()` and `handlers.RequireRole("admin")` → `middleware.RequireRole("admin")`.

- [ ] **Step 4: Update `backend/internal/handlers/auth_handler.go`**

Replace middleware import: remove local `JWTAuthMiddleware` and `RequireRole` references in the handler file (those are already not referenced — `Me` handler uses `c.Get("user")` directly from context set by middleware).

- [ ] **Step 5: Delete `backend/internal/handlers/auth_middleware.go`**

```bash
rm backend/internal/handlers/auth_middleware.go
```

- [ ] **Step 6: Verify compilation**

```bash
cd backend && go build ./...
```

Expected: Compiles with zero errors.

- [ ] **Step 7: Commit**

```bash
git add backend/internal/middleware/ backend/internal/handlers/ backend/cmd/main.go
git commit -m "refactor: move auth middleware to dedicated middleware package"
```

---

### Task 0.2: Create test helper

**Files:**
- Create: `backend/internal/testutil/helper.go`

**Interfaces:**
- Produces: `func SetupTestDB(t *testing.T) *gorm.DB` — creates in-memory SQLite, runs AutoMigrate, returns DB

- [ ] **Step 1: Create `backend/internal/testutil/helper.go`**

```go
package testutil

import (
    "testing"

    "family-tree-backend/internal/models"
    "family-tree-backend/pkg/database"

    "gorm.io/driver/sqlite"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

func SetupTestDB(t *testing.T) *gorm.DB {
    t.Helper()

    db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
        Logger: logger.Default.LogMode(logger.Silent),
    })
    if err != nil {
        t.Fatalf("failed to open test database: %v", err)
    }

    err = db.AutoMigrate(
        &models.Person{},
        &models.ParentChild{},
        &models.Spouse{},
        &models.User{},
    )
    if err != nil {
        t.Fatalf("failed to migrate test database: %v", err)
    }

    // Override the global DB for service calls
    database.DB = db

    return db
}

func CleanupTables(t *testing.T, db *gorm.DB) {
    t.Helper()
    db.Exec("DELETE FROM spouses")
    db.Exec("DELETE FROM parent_children")
    db.Exec("DELETE FROM people")
    db.Exec("DELETE FROM users")
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd backend && go build ./...
```

- [ ] **Step 3: Commit**

```bash
git add backend/internal/testutil/
git commit -m "feat: add test helper with in-memory SQLite setup"
```

---

## Phase 1: Backend Tests & New Features

### Task 1.1: Auth service tests

**Files:**
- Create: `backend/internal/services/auth_service_test.go`
- Modify: `backend/pkg/database/database.go` (check DB is accessible for override)

**Interfaces:**
- Consumes: `testutil.SetupTestDB(t) *gorm.DB`, `services.AuthService` methods
- Produces: Tests for Register, Authenticate, GenerateToken, ParseToken, GetUserFromToken, GetAllUsers, UpdateUserRole, CreateUser, DeleteUser, UpdateUser

- [ ] **Step 1: Write `auth_service_test.go` — setup + Register tests**

```go
package services

import (
    "testing"

    "family-tree-backend/internal/testutil"

    "github.com/google/uuid"
)

func TestRegister_Success(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    svc := NewAuthService()
    user, err := svc.Register("Test User", "test@example.com", "password123")
    if err != nil {
        t.Fatalf("expected no error, got: %v", err)
    }
    if user.ID == uuid.Nil {
        t.Error("expected non-nil UUID")
    }
    if user.Name != "Test User" {
        t.Errorf("expected name 'Test User', got '%s'", user.Name)
    }
    if user.Email != "test@example.com" {
        t.Errorf("expected email 'test@example.com', got '%s'", user.Email)
    }
    if user.PasswordHash == "" {
        t.Error("expected password hash to be set")
    }
}

func TestRegister_DuplicateEmail(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    svc := NewAuthService()
    _, err := svc.Register("User One", "dup@example.com", "password123")
    if err != nil {
        t.Fatalf("first register should succeed: %v", err)
    }

    _, err = svc.Register("User Two", "dup@example.com", "password456")
    if err == nil {
        t.Fatal("expected duplicate email error, got nil")
    }
}

func TestAuthenticate_Success(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    svc := NewAuthService()
    svc.Register("Test User", "auth@example.com", "mypassword")

    user, err := svc.Authenticate("auth@example.com", "mypassword")
    if err != nil {
        t.Fatalf("expected no error, got: %v", err)
    }
    if user.Email != "auth@example.com" {
        t.Errorf("expected email 'auth@example.com', got '%s'", user.Email)
    }
}

func TestAuthenticate_WrongPassword(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    svc := NewAuthService()
    svc.Register("Test User", "wrongpw@example.com", "correct")

    _, err := svc.Authenticate("wrongpw@example.com", "wrongpassword")
    if err == nil {
        t.Fatal("expected error for wrong password, got nil")
    }
}

func TestGenerateAndParseToken_RoundTrip(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    svc := NewAuthService()
    user, _ := svc.Register("Token User", "token@example.com", "secret123")

    token, err := svc.GenerateToken(user)
    if err != nil {
        t.Fatalf("expected no error generating token: %v", err)
    }
    if token == "" {
        t.Fatal("expected non-empty token")
    }

    parsedUser, err := svc.GetUserFromToken(token)
    if err != nil {
        t.Fatalf("expected no error parsing token: %v", err)
    }
    if parsedUser.ID != user.ID {
        t.Errorf("expected user ID %v, got %v", user.ID, parsedUser.ID)
    }
}

func TestGetUserFromToken_Invalid(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    svc := NewAuthService()
    _, err := svc.GetUserFromToken("this-is-not-a-valid-jwt")
    if err == nil {
        t.Fatal("expected error for invalid token, got nil")
    }
}

func TestUpdateUserRole(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    svc := NewAuthService()
    user, _ := svc.Register("Role User", "role@example.com", "secret123")

    updated, err := svc.UpdateUserRole(user.ID.String(), "admin")
    if err != nil {
        t.Fatalf("expected no error: %v", err)
    }
    if updated.Role != "admin" {
        t.Errorf("expected role 'admin', got '%s'", updated.Role)
    }
}

func TestGetAllUsers(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    svc := NewAuthService()
    svc.Register("User A", "a@example.com", "pass1")
    svc.Register("User B", "b@example.com", "pass2")

    users, err := svc.GetAllUsers()
    if err != nil {
        t.Fatalf("expected no error: %v", err)
    }
    if len(users) != 2 {
        t.Errorf("expected 2 users, got %d", len(users))
    }
}

func TestCreateUser_AsAdmin(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    svc := NewAuthService()
    user, err := svc.CreateUser("Admin Created", "admincreate@example.com", "pass123", "admin")
    if err != nil {
        t.Fatalf("expected no error: %v", err)
    }
    if user.Role != "admin" {
        t.Errorf("expected role 'admin', got '%s'", user.Role)
    }
}

func TestDeleteUser(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    svc := NewAuthService()
    user, _ := svc.Register("Delete Me", "delete@example.com", "pass")

    err := svc.DeleteUser(user.ID.String())
    if err != nil {
        t.Fatalf("expected no error: %v", err)
    }

    _, err = svc.GetUserFromToken("") // verify user gone by checking DB
    users, _ := svc.GetAllUsers()
    if len(users) != 0 {
        t.Errorf("expected 0 users after delete, got %d", len(users))
    }
}

func TestUpdateUser(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    svc := NewAuthService()
    user, _ := svc.Register("Original", "update@example.com", "pass")

    updated, err := svc.UpdateUser(user.ID.String(), "Updated Name", "new@example.com", "newpass", "admin")
    if err != nil {
        t.Fatalf("expected no error: %v", err)
    }
    if updated.Name != "Updated Name" {
        t.Errorf("expected name 'Updated Name', got '%s'", updated.Name)
    }
    if updated.Email != "new@example.com" {
        t.Errorf("expected email 'new@example.com', got '%s'", updated.Email)
    }
    if updated.Role != "admin" {
        t.Errorf("expected role 'admin', got '%s'", updated.Role)
    }
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd backend && go test ./internal/services/ -v -run "TestRegister|TestAuthenticate|TestGenerate|TestGet|TestUpdate|TestGetAll|TestCreate|TestDelete"
```

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/services/auth_service_test.go
git commit -m "test: add auth service tests"
```

---

### Task 1.2: Person service tests

**Files:**
- Create: `backend/internal/services/person_service_test.go`

**Interfaces:**
- Consumes: `testutil.SetupTestDB(t) *gorm.DB`, `services.PersonService` methods
- Produces: Tests for CRUD, relationships, family tree, search

- [ ] **Step 1: Write `person_service_test.go`**

```go
package services

import (
    "testing"
    "time"

    "family-tree-backend/internal/models"
    "family-tree-backend/internal/testutil"

    "github.com/google/uuid"
)

func createTestPerson(t *testing.T, svc *PersonService, first, last string, gender models.Gender) *models.Person {
    t.Helper()
    birth := time.Date(1990, 1, 1, 0, 0, 0, 0, time.UTC)
    p := &models.Person{
        FirstName: first,
        LastName:  last,
        Gender:    gender,
        BirthDate: &birth,
    }
    if err := svc.CreatePerson(p); err != nil {
        t.Fatalf("failed to create person: %v", err)
    }
    return p
}

func TestPersonCRUD(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    svc := NewPersonService()

    // Create
    p := createTestPerson(t, svc, "John", "Doe", models.GenderMale)
    if p.ID == uuid.Nil {
        t.Error("expected non-nil UUID on create")
    }

    // Get
    fetched, err := svc.GetPerson(p.ID)
    if err != nil {
        t.Fatalf("expected no error getting person: %v", err)
    }
    if fetched.FirstName != "John" {
        t.Errorf("expected 'John', got '%s'", fetched.FirstName)
    }

    // Update
    fetched.FirstName = "Johnny"
    if err := svc.UpdatePerson(p.ID, fetched); err != nil {
        t.Fatalf("expected no error updating: %v", err)
    }
    updated, _ := svc.GetPerson(p.ID)
    if updated.FirstName != "Johnny" {
        t.Errorf("expected 'Johnny', got '%s'", updated.FirstName)
    }

    // Delete
    if err := svc.DeletePerson(p.ID); err != nil {
        t.Fatalf("expected no error deleting: %v", err)
    }
    _, err = svc.GetPerson(p.ID)
    if err == nil {
        t.Fatal("expected error getting deleted person, got nil")
    }
}

func TestAddParentChild_Success(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    svc := NewPersonService()
    parent := createTestPerson(t, svc, "Parent", "One", models.GenderMale)
    child := createTestPerson(t, svc, "Child", "One", models.GenderFemale)

    err := svc.AddParentChild(parent.ID, child.ID)
    if err != nil {
        t.Fatalf("expected no error: %v", err)
    }
}

func TestAddParentChild_Duplicate(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    svc := NewPersonService()
    parent := createTestPerson(t, svc, "P", "Dup", models.GenderMale)
    child := createTestPerson(t, svc, "C", "Dup", models.GenderFemale)

    svc.AddParentChild(parent.ID, child.ID)
    err := svc.AddParentChild(parent.ID, child.ID)
    if err == nil {
        t.Fatal("expected duplicate error, got nil")
    }
}

func TestAddSpouse_BidirectionalPreventDuplicate(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    svc := NewPersonService()
    a := createTestPerson(t, svc, "A", "Spouse", models.GenderMale)
    b := createTestPerson(t, svc, "B", "Spouse", models.GenderFemale)

    if err := svc.AddSpouse(a.ID, b.ID); err != nil {
        t.Fatalf("expected no error: %v", err)
    }

    // Try reverse order
    err := svc.AddSpouse(b.ID, a.ID)
    if err == nil {
        t.Fatal("expected duplicate spouse error for reverse order, got nil")
    }
}

func TestDeletePerson_CleansUpRelationships(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    svc := NewPersonService()
    a := createTestPerson(t, svc, "A", "Cleanup", models.GenderMale)
    b := createTestPerson(t, svc, "B", "Cleanup", models.GenderFemale)
    svc.AddSpouse(a.ID, b.ID)

    if err := svc.DeletePerson(a.ID); err != nil {
        t.Fatalf("expected no error: %v", err)
    }

    // Verify spouse row also gone
    var count int64
    db.Model(&models.Spouse{}).Count(&count)
    if count != 0 {
        t.Errorf("expected 0 spouse rows, got %d", count)
    }
}

func TestGetFamilyTree(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    svc := NewPersonService()
    grandparent := createTestPerson(t, svc, "Grand", "Parent", models.GenderMale)
    parent := createTestPerson(t, svc, "Mid", "Parent", models.GenderMale)
    child := createTestPerson(t, svc, "Young", "Parent", models.GenderFemale)

    svc.AddParentChild(grandparent.ID, parent.ID)
    svc.AddParentChild(parent.ID, child.ID)

    tree, err := svc.GetFamilyTree(grandparent.ID)
    if err != nil {
        t.Fatalf("expected no error: %v", err)
    }
    if tree.ID != grandparent.ID {
        t.Errorf("expected root to be grandparent")
    }
    if len(tree.ChildRelationships) == 0 {
        t.Error("expected child relationships to be preloaded")
    }
}

func TestSearchPersons(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    svc := NewPersonService()
    createTestPerson(t, svc, "Alice", "Smith", models.GenderFemale)
    createTestPerson(t, svc, "Bob", "Johnson", models.GenderMale)
    createTestPerson(t, svc, "Charlie", "Smithson", models.GenderMale)

    results, err := svc.SearchPersons("Smith")
    if err != nil {
        t.Fatalf("expected no error: %v", err)
    }
    if len(results) < 2 {
        t.Errorf("expected at least 2 results for 'Smith', got %d", len(results))
    }
}

func TestRemoveParentChild(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    svc := NewPersonService()
    parent := createTestPerson(t, svc, "P", "Remove", models.GenderMale)
    child := createTestPerson(t, svc, "C", "Remove", models.GenderFemale)
    svc.AddParentChild(parent.ID, child.ID)

    if err := svc.RemoveParentChild(parent.ID, child.ID); err != nil {
        t.Fatalf("expected no error removing: %v", err)
    }

    var count int64
    db.Model(&models.ParentChild{}).Count(&count)
    if count != 0 {
        t.Errorf("expected 0 parent-child rows, got %d", count)
    }
}

func TestRemoveSpouse(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    svc := NewPersonService()
    a := createTestPerson(t, svc, "A", "RemoveSp", models.GenderMale)
    b := createTestPerson(t, svc, "B", "RemoveSp", models.GenderFemale)
    svc.AddSpouse(a.ID, b.ID)

    if err := svc.RemoveSpouse(a.ID, b.ID); err != nil {
        t.Fatalf("expected no error: %v", err)
    }

    // Verify reverse also works
    svc.AddSpouse(a.ID, b.ID)
    if err := svc.RemoveSpouse(b.ID, a.ID); err != nil {
        t.Fatalf("reverse remove should also work: %v", err)
    }
}
```

- [ ] **Step 2: Run tests**

```bash
cd backend && go test ./internal/services/ -v -run "TestPerson|TestAdd|TestDelete|TestGet|TestSearch|TestRemove"
```

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/services/person_service_test.go
git commit -m "test: add person service tests"
```

---

### Task 1.3: Rate limit middleware

**Files:**
- Create: `backend/internal/middleware/ratelimit.go`
- Modify: `backend/cmd/main.go` (add RateLimitMiddleware to global middleware chain)

**Interfaces:**
- Consumes: `golang.org/x/time/rate` library
- Produces: `middleware.RateLimitMiddleware() gin.HandlerFunc`

- [ ] **Step 1: Add dependency**

```bash
cd backend && go get golang.org/x/time/rate
```

- [ ] **Step 2: Create `backend/internal/middleware/ratelimit.go`**

```go
package middleware

import (
    "net/http"
    "sync"
    "time"

    "github.com/gin-gonic/gin"
    "golang.org/x/time/rate"
)

type visitor struct {
    limiter  *rate.Limiter
    lastSeen time.Time
}

type RateLimiter struct {
    mu       sync.Mutex
    visitors map[string]*visitor
}

var defaultLimiter = &RateLimiter{
    visitors: make(map[string]*visitor),
}

const (
    loginLimit    = 5  // requests per minute
    registerLimit = 3
    authAPILimit  = 100
    publicAPILimit = 30
)

func init() {
    go func() {
        for {
            time.Sleep(10 * time.Minute)
            defaultLimiter.cleanup()
        }
    }()
}

func (rl *RateLimiter) getVisitor(ip string, limit rate.Limit) *rate.Limiter {
    rl.mu.Lock()
    defer rl.mu.Unlock()

    v, exists := rl.visitors[ip]
    if !exists {
        lim := rate.NewLimiter(limit, int(limit))
        rl.visitors[ip] = &visitor{limiter: lim, lastSeen: time.Now()}
        return lim
    }
    v.lastSeen = time.Now()
    return v.limiter
}

func (rl *RateLimiter) cleanup() {
    rl.mu.Lock()
    defer rl.mu.Unlock()
    for ip, v := range rl.visitors {
        if time.Since(v.lastSeen) > 10*time.Minute {
            delete(rl.visitors, ip)
        }
    }
}

func RateLimitMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        ip := c.ClientIP()
        path := c.Request.URL.Path

        var lim *rate.Limiter
        switch {
        case matchPath(path, "/auth/login"):
            lim = defaultLimiter.getVisitor(ip+"_login", loginLimit)
        case matchPath(path, "/auth/register"):
            lim = defaultLimiter.getVisitor(ip+"_register", registerLimit)
        default:
            // Check if user is authenticated
            authHeader := c.GetHeader("Authorization")
            if authHeader != "" {
                lim = defaultLimiter.getVisitor(ip, authAPILimit)
            } else {
                lim = defaultLimiter.getVisitor(ip, publicAPILimit)
            }
        }

        if !lim.Allow() {
            c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
                "error": "rate limit exceeded, try again later",
            })
            return
        }
        c.Next()
    }
}

func matchPath(path, target string) bool {
    return len(path) >= len(target) && path[:len(target)] == target
}
```

- [ ] **Step 3: Wire into `cmd/main.go`**

Add `api.Use(middleware.RateLimitMiddleware())` after the route group definition (after line `api := r.Group("/api/v1")`).

```go
api := r.Group("/api/v1")
api.Use(middleware.RateLimitMiddleware())
{
    // ... existing routes
}
```

- [ ] **Step 4: Verify compilation**

```bash
cd backend && go build ./...
```

- [ ] **Step 5: Commit**

```bash
git add backend/internal/middleware/ratelimit.go backend/cmd/main.go backend/go.mod backend/go.sum
git commit -m "feat: add rate limiting middleware"
```

---

### Task 1.4: Public mode middleware

**Files:**
- Create: `backend/internal/middleware/public_mode.go`
- Modify: `backend/cmd/main.go` (apply PublicModeMiddleware to GET routes)

**Interfaces:**
- Produces: `middleware.PublicModeMiddleware() gin.HandlerFunc`

- [ ] **Step 1: Create `backend/internal/middleware/public_mode.go`**

```go
package middleware

import (
    "os"

    "github.com/gin-gonic/gin"
)

func PublicModeMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        if os.Getenv("PUBLIC_MODE") == "true" {
            // If token is present, still try to set user context
            authHeader := c.GetHeader("Authorization")
            if authHeader == "" {
                // No token, allow through without auth
                c.Next()
                return
            }
        }
        c.Next()
    }
}
```

- [ ] **Step 2: Apply to public GET routes in `cmd/main.go`**

Update read-only routes to add `middleware.PublicModeMiddleware()` before `middleware.JWTAuthMiddleware()`:

```go
// Public-mode enabled GET routes
public := api.Group("")
public.Use(middleware.PublicModeMiddleware())
{
    public.GET("/persons", personHandler.GetPersons)
    public.GET("/persons/:id", personHandler.GetPerson)
    public.GET("/search", personHandler.SearchPersons)
    public.GET("/family-tree/:id", personHandler.GetFamilyTree)
}
```

Remove the old standalone route declarations for these endpoints.

- [ ] **Step 3: Verify compilation**

```bash
cd backend && go build ./...
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/middleware/public_mode.go backend/cmd/main.go
git commit -m "feat: add public mode middleware for unauthenticated read access"
```

---

### Task 1.5: Forgot & Reset password endpoints

**Files:**
- Modify: `backend/internal/services/auth_service.go` (add ForgotPassword, ResetPassword)
- Modify: `backend/internal/handlers/auth_handler.go` (add handler methods)
- Modify: `backend/cmd/main.go` (add routes)

**Interfaces:**
- Consumes: `AuthService.GenerateToken`, `AuthService.ParseToken`
- Produces: `POST /auth/forgot-password`, `POST /auth/reset-password`

- [ ] **Step 1: Add methods to `auth_service.go`**

```go
import (
    "fmt"
    "log"
)

// ForgotPassword generates a reset token and logs it (mock email)
func (s *AuthService) ForgotPassword(email string) error {
    var user models.User
    if err := database.DB.First(&user, "email = ?", email).Error; err != nil {
        // Don't reveal if email exists — always return nil
        log.Printf("[FORGOT-PASSWORD] Request for email: %s (user %s)", email,
            map[bool]string{true: "found", false: "not found"}[err == nil])
        return nil
    }

    resetToken, err := s.GenerateToken(&user)
    if err != nil {
        return err
    }

    // Mock: log reset link to console
    log.Printf("══════════════════════════════════════════")
    log.Printf("📧 PASSWORD RESET FOR: %s (%s)", user.Name, user.Email)
    log.Printf("🔗 RESET LINK: http://localhost:3000/reset-password?token=%s", resetToken)
    log.Printf("⏰ Token expires in 15 minutes")
    log.Printf("══════════════════════════════════════════")

    return nil
}

// ResetPassword validates the reset token and updates the password
func (s *AuthService) ResetPassword(tokenStr, newPassword string) error {
    parsed, err := s.ParseToken(tokenStr)
    if err != nil || !parsed.Valid {
        return fmt.Errorf("invalid or expired reset token")
    }

    claims, ok := parsed.Claims.(jwt.MapClaims)
    if !ok {
        return fmt.Errorf("invalid token claims")
    }

    sub, ok := claims["sub"].(string)
    if !ok || sub == "" {
        return fmt.Errorf("invalid subject in token")
    }

    hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
    if err != nil {
        return err
    }

    return database.DB.Model(&models.User{}).Where("id = ?", sub).
        Update("password_hash", string(hash)).Error
}
```

- [ ] **Step 2: Add handlers to `auth_handler.go`**

```go
type ForgotPasswordRequest struct {
    Email string `json:"email" binding:"required,email"`
}

type ResetPasswordRequest struct {
    Token       string `json:"token" binding:"required"`
    NewPassword string `json:"new_password" binding:"required,min=6"`
}

func (h *AuthHandler) ForgotPassword(c *gin.Context) {
    var req ForgotPasswordRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    if err := h.service.ForgotPassword(req.Email); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "If the email is registered, a reset link has been sent. Check server logs for the link."})
}

func (h *AuthHandler) ResetPassword(c *gin.Context) {
    var req ResetPasswordRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    if err := h.service.ResetPassword(req.Token, req.NewPassword); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Password has been reset successfully"})
}
```

- [ ] **Step 3: Add routes in `cmd/main.go`**

```go
api.POST("/auth/forgot-password", authHandler.ForgotPassword)
api.POST("/auth/reset-password", authHandler.ResetPassword)
```

- [ ] **Step 4: Verify compilation**

```bash
cd backend && go build ./...
```

- [ ] **Step 5: Commit**

```bash
git add backend/internal/services/auth_service.go backend/internal/handlers/auth_handler.go backend/cmd/main.go
git commit -m "feat: add forgot & reset password endpoints (mock email)"
```

---

### Task 1.6: Swagger annotations & setup

**Files:**
- Modify: `backend/internal/handlers/*.go` (add Swagger annotations)
- Modify: `backend/cmd/main.go` (add Swagger route)
- Create: `backend/docs/` (auto-generated)

**Interfaces:**
- Consumes: `swaggo/swag`, `swaggo/gin-swagger`

- [ ] **Step 1: Install swag**

```bash
cd backend
go get github.com/swaggo/swag github.com/swaggo/gin-swagger github.com/swaggo/files
go install github.com/swaggo/swag/cmd/swag@latest
```

- [ ] **Step 2: Add annotations to `cmd/main.go`**

Add at top of file (after package declaration):

```go
// @title           Family Tree API
// @version         1.0
// @description     A family tree management API with authentication
// @host            localhost:8080
// @BasePath        /api/v1
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
func main() {
```

- [ ] **Step 3: Annotate `auth_handler.go`**

```go
// @Summary      Register user
// @Description  Create a new user account
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body body RegisterRequest true "Registration data"
// @Success      201 {object} gin.H
// @Failure      400 {object} gin.H
// @Router       /auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {

// @Summary      Login
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body body LoginRequest true "Login credentials"
// @Success      200 {object} gin.H
// @Failure      401 {object} gin.H
// @Router       /auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {

// @Summary      Get current user
// @Tags         auth
// @Security     BearerAuth
// @Produce      json
// @Success      200 {object} gin.H
// @Failure      401 {object} gin.H
// @Router       /auth/me [get]
func (h *AuthHandler) Me(c *gin.Context) {

// @Summary      Forgot password
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body body ForgotPasswordRequest true "Email"
// @Success      200 {object} gin.H
// @Router       /auth/forgot-password [post]
func (h *AuthHandler) ForgotPassword(c *gin.Context) {

// @Summary      Reset password
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body body ResetPasswordRequest true "Reset data"
// @Success      200 {object} gin.H
// @Failure      400 {object} gin.H
// @Router       /auth/reset-password [post]
func (h *AuthHandler) ResetPassword(c *gin.Context) {
```

- [ ] **Step 4: Annotate `person_handler.go`**

```go
// @Summary      List all persons
// @Tags         persons
// @Produce      json
// @Success      200 {object} gin.H
// @Router       /persons [get]
func (h *PersonHandler) GetPersons(c *gin.Context) {

// @Summary      Get person by ID
// @Tags         persons
// @Produce      json
// @Param        id path string true "Person UUID"
// @Success      200 {object} gin.H
// @Failure      404 {object} gin.H
// @Router       /persons/{id} [get]
func (h *PersonHandler) GetPerson(c *gin.Context) {

// ... (annotate CreatePerson, UpdatePerson, DeletePerson, SearchPersons, GetFamilyTree, AddParentChild, RemoveParentChild, AddSpouse, RemoveSpouse similarly)
```

- [ ] **Step 5: Generate Swagger docs**

```bash
cd backend && swag init -g cmd/main.go -o docs
```

- [ ] **Step 6: Add Swagger route in `cmd/main.go`**

```go
import (
    swaggerFiles "github.com/swaggo/files"
    ginSwagger "github.com/swaggo/gin-swagger"
    _ "family-tree-backend/docs"
)

// In main(), before r.Run():
r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
```

- [ ] **Step 7: Verify**

```bash
cd backend && go build ./...
```

- [ ] **Step 8: Commit**

```bash
git add backend/ backend/docs/
git commit -m "feat: add Swagger API documentation"
```

---

### Task 1.7: Backend handler tests

**Files:**
- Create: `backend/internal/handlers/auth_handler_test.go`
- Create: `backend/internal/handlers/person_handler_test.go`

**Interfaces:**
- Consumes: `testutil.SetupTestDB`, Gin test mode

- [ ] **Step 1: Write `auth_handler_test.go`**

```go
package handlers

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "family-tree-backend/internal/testutil"

    "github.com/gin-gonic/gin"
)

func setupAuthRouter() *gin.Engine {
    gin.SetMode(gin.TestMode)
    r := gin.Default()
    h := NewAuthHandler()
    r.POST("/auth/register", h.Register)
    r.POST("/auth/login", h.Login)
    return r
}

func TestRegisterHandler_Success(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    router := setupAuthRouter()
    body := map[string]string{
        "name": "Test User", "email": "register@test.com", "password": "secret123",
    }
    jsonBody, _ := json.Marshal(body)

    req, _ := http.NewRequest("POST", "/auth/register", bytes.NewBuffer(jsonBody))
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()
    router.ServeHTTP(w, req)

    if w.Code != http.StatusCreated {
        t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
    }
}

func TestRegisterHandler_DuplicateEmail(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    router := setupAuthRouter()
    body := map[string]string{
        "name": "Dup", "email": "dup@test.com", "password": "secret123",
    }
    jsonBody, _ := json.Marshal(body)

    // First registration
    req1, _ := http.NewRequest("POST", "/auth/register", bytes.NewBuffer(jsonBody))
    req1.Header.Set("Content-Type", "application/json")
    w1 := httptest.NewRecorder()
    router.ServeHTTP(w1, req1)

    // Duplicate
    req2, _ := http.NewRequest("POST", "/auth/register", bytes.NewBuffer(jsonBody))
    req2.Header.Set("Content-Type", "application/json")
    w2 := httptest.NewRecorder()
    router.ServeHTTP(w2, req2)

    if w2.Code != http.StatusBadRequest {
        t.Errorf("expected 400 for duplicate, got %d", w2.Code)
    }
}

func TestLoginHandler_Success(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    router := setupAuthRouter()

    // Register first
    regBody := map[string]string{
        "name": "LoginUser", "email": "login@test.com", "password": "mypassword",
    }
    regJSON, _ := json.Marshal(regBody)
    regReq, _ := http.NewRequest("POST", "/auth/register", bytes.NewBuffer(regJSON))
    regReq.Header.Set("Content-Type", "application/json")
    regW := httptest.NewRecorder()
    router.ServeHTTP(regW, regReq)

    // Login
    loginBody := map[string]string{"email": "login@test.com", "password": "mypassword"}
    loginJSON, _ := json.Marshal(loginBody)
    req, _ := http.NewRequest("POST", "/auth/login", bytes.NewBuffer(loginJSON))
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()
    router.ServeHTTP(w, req)

    if w.Code != http.StatusOK {
        t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
    }
}

func TestLoginHandler_InvalidCredentials(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    router := setupAuthRouter()
    body := map[string]string{"email": "nobody@test.com", "password": "wrong"}
    jsonBody, _ := json.Marshal(body)

    req, _ := http.NewRequest("POST", "/auth/login", bytes.NewBuffer(jsonBody))
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()
    router.ServeHTTP(w, req)

    if w.Code != http.StatusUnauthorized {
        t.Errorf("expected 401, got %d", w.Code)
    }
}
```

- [ ] **Step 2: Write `person_handler_test.go`**

```go
package handlers

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "family-tree-backend/internal/testutil"

    "github.com/gin-gonic/gin"
)

func setupPersonRouter() *gin.Engine {
    gin.SetMode(gin.TestMode)
    r := gin.Default()
    h := NewPersonHandler()
    r.GET("/persons", h.GetPersons)
    r.GET("/persons/:id", h.GetPerson)
    r.POST("/persons", h.CreatePerson)
    return r
}

func TestGetPersons_Empty(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    router := setupPersonRouter()
    req, _ := http.NewRequest("GET", "/persons", nil)
    w := httptest.NewRecorder()
    router.ServeHTTP(w, req)

    if w.Code != http.StatusOK {
        t.Errorf("expected 200, got %d", w.Code)
    }
}

func TestCreatePerson_Success(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    router := setupPersonRouter()
    body := map[string]string{
        "first_name": "John",
        "last_name":  "Doe",
        "gender":     "male",
        "birth_date": "1990-01-15",
    }
    jsonBody, _ := json.Marshal(body)

    req, _ := http.NewRequest("POST", "/persons", bytes.NewBuffer(jsonBody))
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()
    router.ServeHTTP(w, req)

    if w.Code != http.StatusCreated {
        t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
    }
}

func TestCreatePerson_MissingRequired(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    router := setupPersonRouter()
    body := map[string]string{"first_name": "NoLastName"}
    jsonBody, _ := json.Marshal(body)

    req, _ := http.NewRequest("POST", "/persons", bytes.NewBuffer(jsonBody))
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()
    router.ServeHTTP(w, req)

    if w.Code != http.StatusBadRequest {
        t.Errorf("expected 400, got %d", w.Code)
    }
}

func TestGetPerson_NotFound(t *testing.T) {
    db := testutil.SetupTestDB(t)
    defer testutil.CleanupTables(t, db)

    router := setupPersonRouter()
    req, _ := http.NewRequest("GET", "/persons/00000000-0000-0000-0000-000000000000", nil)
    w := httptest.NewRecorder()
    router.ServeHTTP(w, req)

    if w.Code != http.StatusNotFound {
        t.Errorf("expected 404, got %d", w.Code)
    }
}
```

- [ ] **Step 3: Run all tests**

```bash
cd backend && go test ./... -v
```

Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add backend/internal/handlers/*_test.go
git commit -m "test: add handler integration tests"
```

---

## Phase 2: Frontend Upgrade

### Task 2.1: Environment config + API base URL

**Files:**
- Create: `frontend/.env.example`
- Modify: `frontend/src/services/api.js:3`

- [ ] **Step 1: Create `frontend/.env.example`**

```
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

- [ ] **Step 2: Update `api.js`**

Change:
```js
const API_BASE_URL = 'http://localhost:8080/api/v1';
```
To:
```js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
```

- [ ] **Step 3: Verify build**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add frontend/.env.example frontend/src/services/api.js
git commit -m "feat: use VITE_API_BASE_URL env var for API base URL"
```

---

### Task 2.2: Custom hooks

**Files:**
- Create: `frontend/src/hooks/useApi.js`
- Create: `frontend/src/hooks/usePagination.js`
- Create: `frontend/src/hooks/useDebounce.js`

- [ ] **Step 1: Create `useApi.js`**

```js
import { useState, useEffect, useCallback } from "react";

export function useApi(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchFn();
      setData(res?.data?.data ?? res?.data ?? null);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, deps);

  useEffect(() => {
    execute();
  }, [execute]);

  const isEmpty = !isLoading && !error && (!data || (Array.isArray(data) && data.length === 0));

  return { data, error, isLoading, isEmpty, refetch: execute };
}
```

- [ ] **Step 2: Create `usePagination.js`**

```js
import { useState, useMemo } from "react";

export function usePagination(items = [], perPage = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * perPage;
    return items.slice(start, start + perPage);
  }, [items, page, perPage]);

  const nextPage = () => setPage((p) => Math.min(p + 1, totalPages));
  const prevPage = () => setPage((p) => Math.max(p - 1, 1));
  const goToPage = (n) => setPage(Math.max(1, Math.min(n, totalPages)));

  return { page, totalPages, paginatedItems, nextPage, prevPage, goToPage };
}
```

- [ ] **Step 3: Create `useDebounce.js`**

```js
import { useState, useEffect } from "react";

export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/
git commit -m "feat: add useApi, usePagination, and useDebounce hooks"
```

---

### Task 2.3: Register, Forgot & Reset password pages

**Files:**
- Create: `frontend/src/pages/Register.jsx`
- Create: `frontend/src/pages/ForgotPassword.jsx`
- Create: `frontend/src/pages/ResetPassword.jsx`
- Modify: `frontend/src/App.jsx` (add routes)
- Modify: `frontend/src/services/api.js` (add forgot/reset password API calls)

- [ ] **Step 1: Add auth API methods to `api.js`**

```js
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    me: () => api.get('/auth/me'),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token, new_password) => api.post('/auth/reset-password', { token, new_password }),
};
```

- [ ] **Step 2: Create `Register.jsx`**

```jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../contexts/AuthContext";
import { authAPI } from "../services/api";
import toast from "react-hot-toast";

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await authAPI.register(data);
      const token = res?.data?.data?.token;
      if (token) {
        localStorage.setItem("ft_token", token);
        await login({ email: data.email, password: data.password });
        toast.success("Account created!");
        navigate("/");
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">Create Account</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="card bg-base-100 shadow-xl p-6 space-y-4">
        <div className="form-control">
          <label className="label">Name</label>
          <input {...register("name", { required: "Name is required" })} className="input input-bordered" />
          {errors.name && <span className="text-error text-sm mt-1">{errors.name.message}</span>}
        </div>
        <div className="form-control">
          <label className="label">Email</label>
          <input {...register("email", { required: "Email is required" })} type="email" className="input input-bordered" />
          {errors.email && <span className="text-error text-sm mt-1">{errors.email.message}</span>}
        </div>
        <div className="form-control">
          <label className="label">Password</label>
          <input {...register("password", { required: "Password is required", minLength: { value: 6, message: "Min 6 characters" } })} type="password" className="input input-bordered" />
          {errors.password && <span className="text-error text-sm mt-1">{errors.password.message}</span>}
        </div>
        <div className="form-control">
          <label className="label">Confirm Password</label>
          <input {...register("confirm", { validate: (v) => v === watch("password") || "Passwords do not match" })} type="password" className="input input-bordered" />
          {errors.confirm && <span className="text-error text-sm mt-1">{errors.confirm.message}</span>}
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? <span className="loading loading-spinner" /> : "Create Account"}
        </button>
        <p className="text-center text-sm">
          Already have an account? <Link to="/login" className="link link-primary">Login</Link>
        </p>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Create `ForgotPassword.jsx`**

```jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { authAPI } from "../services/api";
import toast from "react-hot-toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error("Email is required");
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      toast.success("If the email is registered, check server logs for the reset link");
      setEmail("");
    } catch {
      toast.success("If the email is registered, check server logs for the reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">Forgot Password</h1>
      <form onSubmit={handleSubmit} className="card bg-base-100 shadow-xl p-6 space-y-4">
        <p className="text-sm text-gray-500">Enter your email and we'll send a reset link.</p>
        <div className="form-control">
          <label className="label">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input input-bordered" required />
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? <span className="loading loading-spinner" /> : "Send Reset Link"}
        </button>
        <p className="text-center text-sm">
          <Link to="/login" className="link link-primary">Back to Login</Link>
        </p>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Create `ResetPassword.jsx`**

```jsx
import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import toast from "react-hot-toast";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords do not match");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    setLoading(true);
    try {
      await authAPI.resetPassword(token, password);
      toast.success("Password reset successful! Please login.");
      navigate("/login");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return <div className="text-center py-8"><p className="text-error">Invalid or missing reset token.</p></div>;
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">Reset Password</h1>
      <form onSubmit={handleSubmit} className="card bg-base-100 shadow-xl p-6 space-y-4">
        <div className="form-control">
          <label className="label">New Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input input-bordered" required minLength={6} />
        </div>
        <div className="form-control">
          <label className="label">Confirm Password</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input input-bordered" required />
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? <span className="loading loading-spinner" /> : "Reset Password"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Add routes to `App.jsx`**

```jsx
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Inside <Routes>:
<Route path="/register" element={<Register />} />
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password" element={<ResetPassword />} />
```

- [ ] **Step 6: Verify build**

```bash
cd frontend && npm run build
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/ frontend/src/App.jsx frontend/src/services/api.js
git commit -m "feat: add register, forgot password, and reset password pages"
```

---

### Task 2.4: Polish existing components

**Files:**
- Modify: `frontend/src/components/Login.jsx` (react-hook-form, links)
- Modify: `frontend/src/components/PersonList.jsx` (useApi, usePagination, useDebounce, states)
- Modify: `frontend/src/components/FamilyTree.jsx` (useApi, states)
- Modify: `frontend/src/components/Header.jsx` (user dropdown, role badge)
- Modify: `frontend/src/components/ProtectedRoute.jsx` (spinner)
- Modify: `frontend/src/components/AdminUsers.jsx` (states)

- [ ] **Step 1: Update `Login.jsx`**

Add react-hook-form validation and links to register/forgot-password:

```jsx
import { useForm } from "react-hook-form";
// ... existing imports
import { Link } from "react-router-dom";

// Replace existing form with:
const { register, handleSubmit, formState: { errors } } = useForm();

// ... inside form:
<input {...register("email", { required: "Email is required" })} type="email" className="input input-bordered" />
{errors.email && <span className="text-error text-sm">{errors.email.message}</span>}

// At bottom of form, before submit button:
<p className="text-center text-sm space-x-2">
  <Link to="/register" className="link link-primary">Register</Link>
  <span>·</span>
  <Link to="/forgot-password" className="link link-primary">Forgot Password?</Link>
</p>
```

- [ ] **Step 2: Update `PersonList.jsx`**

Integrate `useApi`, `usePagination`, `useDebounce`, add skeleton/error/empty states:

```jsx
import { useApi } from "../hooks/useApi";
import { usePagination } from "../hooks/usePagination";
import { useDebounce } from "../hooks/useDebounce";
import { personAPI } from "../services/api";

// Loading skeleton
const Skeleton = () => (
  <div className="animate-pulse space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-16 bg-gray-200 rounded" />
    ))}
  </div>
);

// Inside component:
const [search, setSearch] = useState("");
const debouncedSearch = useDebounce(search, 300);

const fetchPersons = useCallback(() => {
  return debouncedSearch ? personAPI.search(debouncedSearch) : personAPI.getAll();
}, [debouncedSearch]);

const { data: persons, error, isLoading, isEmpty, refetch } = useApi(fetchPersons, [debouncedSearch]);
const { page, totalPages, paginatedItems, nextPage, prevPage } = usePagination(persons || [], 10);

// Render:
if (isLoading) return <Skeleton />;
if (error) return <div className="text-center py-8"><p className="text-error">{error}</p><button onClick={refetch} className="btn btn-outline mt-2">Retry</button></div>;
if (isEmpty) return <div className="text-center py-8"><p className="text-gray-400">No family members yet. Add your first person!</p></div>;
// ... render paginatedItems with pagination controls
```

- [ ] **Step 3: Update `FamilyTree.jsx`**

Add useApi-based loading/error/empty states. Hide edit controls when user is not authenticated (public mode).

- [ ] **Step 4: Update `Header.jsx`**

Add user dropdown with name, role badge, admin link (if admin), logout:

```jsx
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";

// Inside Header:
const { user, logout } = useAuth();
const navigate = useNavigate();

// Replace static nav with:
{user ? (
  <div className="dropdown dropdown-end">
    <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
      <div className="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold">
        {user.name?.charAt(0).toUpperCase()}
      </div>
    </label>
    <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 mt-2">
      <li className="menu-title"><span>{user.name}</span></li>
      <li className="menu-title"><span className="badge badge-sm">{user.role}</span></li>
      <div className="divider my-0" />
      {user.role === "admin" && <li><Link to="/admin/users">Manage Users</Link></li>}
      <li><button onClick={() => { logout(); navigate("/login"); }}>Logout</button></li>
    </ul>
  </div>
) : (
  <Link to="/login" className="btn btn-ghost">Login</Link>
)}
```

- [ ] **Step 5: Update `ProtectedRoute.jsx`**

Add loading spinner:

```jsx
import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}
```

- [ ] **Step 6: Update `AdminUsers.jsx`**

Add useApi-based skeleton, error, empty states.

- [ ] **Step 7: Verify build**

```bash
cd frontend && npm run build
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/ frontend/src/pages/Login.jsx
git commit -m "feat: polish components with loading/error/empty states and user dropdown"
```

---

## Phase 3: DevOps

### Task 3.1: Dockerfiles

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.air.toml`
- Create: `frontend/Dockerfile`
- Create: `frontend/nginx.conf`

- [ ] **Step 1: Create `backend/Dockerfile`**

```dockerfile
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
```

- [ ] **Step 2: Create `backend/.air.toml`**

```toml
root = "."
testdata_dir = "testdata"
tmp_dir = "tmp"

[build]
  args_bin = []
  bin = "./tmp/main"
  cmd = "go build -o ./tmp/main ./cmd/main.go"
  delay = 1000
  exclude_dir = ["tmp", "vendor"]
  exclude_file = []
  exclude_regex = ["_test.go"]
  exclude_unchanged = false
  follow_symlink = false
  full_bin = ""
  include_dir = []
  include_ext = ["go", "tpl", "tmpl", "html"]
  include_file = []
  kill_delay = "0s"
  log = "build-errors.log"
  poll = false
  poll_interval = 0
  rerun = false
  rerun_delay = 500
  send_interrupt = false
  stop_on_error = false

[color]
  app = ""
  build = "yellow"
  main = "magenta"
  runner = "green"
  watcher = "cyan"

[log]
  main_only = false
  time = false

[misc]
  clean_on_exit = false

[screen]
  clear_on_rebuild = false
  keep_scroll = true
```

- [ ] **Step 3: Create `frontend/Dockerfile`**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

- [ ] **Step 4: Create `frontend/nginx.conf`**

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /health {
        proxy_pass http://backend:8080/health;
    }

    location /swagger/ {
        proxy_pass http://backend:8080/swagger/;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/Dockerfile backend/.air.toml frontend/Dockerfile frontend/nginx.conf
git commit -m "feat: add multi-stage Dockerfiles for backend and frontend"
```

---

### Task 3.2: Docker Compose files

**Files:**
- Create: `docker-compose.yml`
- Create: `docker-compose.dev.yml`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
services:
  backend:
    build: ./backend
    restart: unless-stopped
    environment:
      - ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - PUBLIC_MODE=${PUBLIC_MODE:-false}
    volumes:
      - ./data:/data
    working_dir: /data
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  frontend:
    build: ./frontend
    restart: unless-stopped
    ports:
      - "${PORT:-80}:80"
    depends_on:
      - backend
```

- [ ] **Step 2: Create `docker-compose.dev.yml`**

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: builder
    command: go run ./cmd/main.go
    volumes:
      - ./backend:/app
    ports:
      - "8080:8080"
    environment:
      - ENV=development
      - JWT_SECRET=dev-secret
      - PUBLIC_MODE=true
    working_dir: /app

  frontend:
    image: node:22-alpine
    command: npm run dev -- --host
    volumes:
      - ./frontend:/app
    ports:
      - "3000:3000"
    working_dir: /app
    environment:
      - VITE_API_BASE_URL=http://localhost:8080/api/v1
```

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml docker-compose.dev.yml
git commit -m "feat: add docker-compose for production and development"
```

---

### Task 3.3: GitHub Actions CI/CD

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: "1.24"
      - run: go test ./... -v -coverprofile=coverage.out
      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: backend/coverage.out

  test-frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: npm ci
      - run: npm run build

  build-and-push:
    needs: [test-backend, test-frontend]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build and push backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ghcr.io/${{ github.repository }}/backend:latest
      - name: Build and push frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: ghcr.io/${{ github.repository }}/frontend:latest
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow for test, build, and push"
```

---

## Phase 4: Documentation

### Task 4.1: ROADMAP.md and final updates

**Files:**
- Create: `ROADMAP.md`
- Modify: `CLAUDE.md` (add new scripts and commands)

- [ ] **Step 1: Create `ROADMAP.md`**

```markdown
# 🌳 Family Tree App — Roadmap

## ✅ Phase 1 — Mini SaaS Foundation (current)

- [x] JWT authentication (register, login, me)
- [x] Role-based access (admin/user)
- [x] Family tree visualization
- [x] CRUD persons + relationships
- [x] Search
- [x] Admin user management
- [x] Rate limiting (token bucket per IP)
- [x] Public read-only mode
- [x] Forgot/reset password (mock email)
- [x] Swagger API documentation
- [x] Docker multi-stage builds
- [x] Docker Compose (dev + production)
- [x] GitHub Actions CI/CD
- [x] Backend service + handler tests
- [x] Frontend hooks (useApi, usePagination, useDebounce)
- [x] Registration page with form validation
- [x] Loading/error/empty states on all components

## 🔜 Phase 2 — Security & Polish

- [ ] Refresh token rotation (HttpOnly cookies)
- [ ] Two-factor authentication (TOTP) for admin
- [ ] Audit logs (login events, mutations)
- [ ] Photo upload for person profiles
- [ ] Bulk import/export CSV
- [ ] Real email service (SendGrid/Mailgun)
- [ ] Input sanitization middleware
- [ ] Frontend E2E tests (Playwright)
- [ ] Dark mode

## 💭 Phase 3 — Platform

- [ ] Multi-tenancy (family groups)
- [ ] Internationalization (i18n)
- [ ] Progressive Web App (PWA)
- [ ] Mobile app (React Native)
- [ ] Social login (Google, GitHub)
```

- [ ] **Step 2: Update `CLAUDE.md`**

Add references to new Docker commands, test commands, and the ROADMAP.

- [ ] **Step 3: Commit**

```bash
git add ROADMAP.md CLAUDE.md
git commit -m "docs: add ROADMAP.md and update CLAUDE.md"
```

---

## Final Verification

- [ ] Run all backend tests: `cd backend && go test ./... -v`
- [ ] Run frontend build: `cd frontend && npm run build`
- [ ] Verify Docker builds: `docker compose build`
- [ ] Start with dev script: `./dev-local.sh`

---

## Implementation Order

```
Phase 0:  0.1 → 0.2           ← Foundation (must be first)
Phase 1:  1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7   ← Backend
Phase 2:  2.1 → 2.2 → 2.3 → 2.4                         ← Frontend
Phase 3:  3.1 → 3.2 → 3.3                                ← DevOps
Phase 4:  4.1                                              ← Docs
```
