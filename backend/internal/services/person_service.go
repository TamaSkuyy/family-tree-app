package services

import (
	"errors"
	"family-tree-backend/internal/models"
	"family-tree-backend/pkg/database"
	"time"

	"github.com/google/uuid"
)

type PersonService struct{}

func NewPersonService() *PersonService {
	return &PersonService{}
}

func (s *PersonService) CreatePerson(person *models.Person) error {
	return database.DB.Create(person).Error
}

func (s *PersonService) GetPerson(id uuid.UUID) (*models.Person, error) {
	var person models.Person
	err := database.DB.Preload("ParentRelationships.Child").
		Preload("ChildRelationships.Parent").
		Preload("SpouseRelationships.Person2").
		First(&person, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	person.PopulateComputed()
	return &person, nil
}

func (s *PersonService) GetAllPersons() ([]models.Person, error) {
	var persons []models.Person
	err := database.DB.
		Preload("ParentRelationships.Child").
		Preload("ChildRelationships.Parent").
		Preload("SpouseRelationships.Person2").
		Find(&persons).Error
	if err != nil {
		return nil, err
	}
	for i := range persons {
		persons[i].PopulateComputed()
	}
	return persons, err
}

func (s *PersonService) UpdatePerson(id uuid.UUID, updates *models.Person) error {
	return database.DB.Model(&models.Person{}).Where("id = ?", id).Updates(updates).Error
}

func (s *PersonService) DeletePerson(id uuid.UUID) error {
	// First delete relationships
	database.DB.Where("parent_id = ?", id).Delete(&models.ParentChild{})
	database.DB.Where("child_id = ?", id).Delete(&models.ParentChild{})
	database.DB.Where("person1_id = ?", id).Delete(&models.Spouse{})
	database.DB.Where("person2_id = ?", id).Delete(&models.Spouse{})
	
	// Then delete person
	return database.DB.Delete(&models.Person{}, "id = ?", id).Error
}

func (s *PersonService) AddParentChild(parentID, childID uuid.UUID) error {
	// Check if relationship already exists
	var existing models.ParentChild
	err := database.DB.Where("parent_id = ? AND child_id = ?", parentID, childID).First(&existing).Error
	if err == nil {
		return errors.New("relationship already exists")
	}

	relationship := &models.ParentChild{
		ParentID: parentID,
		ChildID:  childID,
	}
	return database.DB.Create(relationship).Error
}

func (s *PersonService) RemoveParentChild(parentID, childID uuid.UUID) error {
	return database.DB.Where("parent_id = ? AND child_id = ?", parentID, childID).Delete(&models.ParentChild{}).Error
}

func (s *PersonService) AddSpouse(person1ID, person2ID uuid.UUID) error {
	// Check if relationship already exists
	var existing models.Spouse
	err := database.DB.Where("(person1_id = ? AND person2_id = ?) OR (person1_id = ? AND person2_id = ?)", 
		person1ID, person2ID, person2ID, person1ID).First(&existing).Error
	if err == nil {
		return errors.New("spouse relationship already exists")
	}

	relationship := &models.Spouse{
		Person1ID: person1ID,
		Person2ID: person2ID,
		StartDate: func() *time.Time { t := time.Now(); return &t }(),
	}
	return database.DB.Create(relationship).Error
}

func (s *PersonService) RemoveSpouse(person1ID, person2ID uuid.UUID) error {
	return database.DB.Where("(person1_id = ? AND person2_id = ?) OR (person1_id = ? AND person2_id = ?)", 
		person1ID, person2ID, person2ID, person1ID).Delete(&models.Spouse{}).Error
}

func (s *PersonService) GetFamilyTree(rootID uuid.UUID) (*models.Person, error) {
	var root models.Person
	err := database.DB.
		// Parents (root is child → rel.Parent is parent) + grandparents
		Preload("ChildRelationships.Parent.ChildRelationships.Parent").
		// Parents + their other children (root's siblings)
		Preload("ChildRelationships.Parent.ParentRelationships.Child").
		// Children (root is parent → rel.Child is child) + grandchildren
		Preload("ParentRelationships.Child.ParentRelationships.Child").
		// Children + their other parents (co-parents)
		Preload("ParentRelationships.Child.ChildRelationships.Parent").
		// Spouses
		Preload("SpouseRelationships.Person2").
		First(&root, "id = ?", rootID).Error
	if err != nil {
		return nil, err
	}
	root.PopulateComputed()
	s.populateSiblings(&root)
	return &root, nil
}

// populateSiblings finds people who share at least one parent with this person.
func (s *PersonService) populateSiblings(p *models.Person) {
	if len(p.Parents) == 0 {
		return
	}
	parentIDs := make([]string, 0, len(p.Parents))
	for _, parent := range p.Parents {
		parentIDs = append(parentIDs, parent.ID.String())
	}
	var rels []models.ParentChild
	database.DB.Preload("Child").Where("parent_id IN ? AND child_id != ?", parentIDs, p.ID.String()).Find(&rels)
	seen := make(map[string]bool)
	spouseIDs := make(map[string]bool)
	for _, s := range p.Spouses {
		spouseIDs[s.ID.String()] = true
	}
	p.Siblings = make([]models.Person, 0)
	for _, rel := range rels {
		id := rel.Child.ID.String()
		if seen[id] || spouseIDs[id] {
			continue
		}
		seen[id] = true
		p.Siblings = append(p.Siblings, rel.Child)
	}
}

func (s *PersonService) SearchPersons(query string) ([]models.Person, error) {
	var persons []models.Person
	searchPattern := "%" + query + "%"
	err := database.DB.
		Preload("ParentRelationships.Child").
		Preload("ChildRelationships.Parent").
		Preload("SpouseRelationships.Person2").
		Where("first_name LIKE ? OR last_name LIKE ? OR email LIKE ?",
			searchPattern, searchPattern, searchPattern).Find(&persons).Error
	if err != nil {
		return nil, err
	}
	for i := range persons {
		persons[i].PopulateComputed()
	}
	return persons, err
}