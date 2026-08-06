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
	p := createTestPerson(t, svc, "John", "Doe", models.GenderMale)
	if p.ID == uuid.Nil {
		t.Error("expected non-nil UUID on create")
	}

	fetched, err := svc.GetPerson(p.ID)
	if err != nil {
		t.Fatalf("expected no error getting person: %v", err)
	}
	if fetched.FirstName != "John" {
		t.Errorf("expected 'John', got '%s'", fetched.FirstName)
	}

	fetched.FirstName = "Johnny"
	if err := svc.UpdatePerson(p.ID, fetched); err != nil {
		t.Fatalf("expected no error updating: %v", err)
	}
	updated, _ := svc.GetPerson(p.ID)
	if updated.FirstName != "Johnny" {
		t.Errorf("expected 'Johnny', got '%s'", updated.FirstName)
	}

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

	var count int64
	db.Model(&models.Spouse{}).Count(&count)
	if count != 0 {
		t.Errorf("expected 0 spouse rows after delete, got %d", count)
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
	if len(tree.ParentRelationships) == 0 {
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

	svc.AddSpouse(a.ID, b.ID)
	if err := svc.RemoveSpouse(b.ID, a.ID); err != nil {
		t.Fatalf("reverse remove should also work: %v", err)
	}
}
