package repository

import (
	"github.com/TamaSkuyy/family-tree-app/internal/models"
	"sync"
)

type MemoryRepository struct {
	familyMembers map[string]models.FamilyMember
	mu            sync.RWMutex
}

func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{
		familyMembers: make(map[string]models.FamilyMember),
	}
}

func (r *MemoryRepository) GetAllFamilyMembers() ([]models.FamilyMember, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	members := make([]models.FamilyMember, 0, len(r.familyMembers))
	for _, member := range r.familyMembers {
		members = append(members, member)
	}
	return members, nil
}

// Seed with initial data
func (r *MemoryRepository) Seed() {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.familyMembers["1"] = models.FamilyMember{
		ID:        "1",
		FirstName: "John",
		LastName:  "Doe",
		Gender:    "male",
		BirthDate: "1970-01-01",
	}

	r.familyMembers["2"] = models.FamilyMember{
		ID:        "2",
		FirstName: "Jane",
		LastName:  "Doe",
		Gender:    "female",
		BirthDate: "1972-05-15",
		SpouseID:  "1",
	}
}