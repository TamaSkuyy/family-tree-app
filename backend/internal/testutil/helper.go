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
