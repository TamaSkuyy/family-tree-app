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
