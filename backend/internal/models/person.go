package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Gender string

const (
	GenderMale   Gender = "male"
	GenderFemale Gender = "female"
)

type Person struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	FirstName string    `gorm:"not null" json:"first_name"`
	LastName  string    `gorm:"not null" json:"last_name"`
	Gender    Gender    `gorm:"not null" json:"gender"`
	BirthDate *time.Time `json:"birth_date"`
	DeathDate *time.Time `json:"death_date"`
	Email     string    `json:"email"`
	Phone     string    `json:"phone"`
	Photo     string    `json:"photo"`
	Notes     string    `json:"notes"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Raw GORM relationships (used for Preload, hidden from JSON)
	ParentRelationships []ParentChild `gorm:"foreignKey:ParentID" json:"-"`
	ChildRelationships  []ParentChild `gorm:"foreignKey:ChildID" json:"-"`
	SpouseRelationships []Spouse      `gorm:"foreignKey:Person1ID" json:"-"`

	// Computed fields — intuitive API (populated by PopulateComputed)
	Parents  []Person `gorm:"-" json:"parents,omitempty"`
	Children []Person `gorm:"-" json:"children,omitempty"`
	Spouses  []Person `gorm:"-" json:"spouses,omitempty"`
	Siblings []Person `gorm:"-" json:"siblings,omitempty"`
}

// PopulateComputed fills the intuitive Parents/Children/Spouses fields
// from the raw GORM relationship arrays. Call this after Preload queries.
func (p *Person) PopulateComputed() {
	// Parents = where person IS the child → rel.Parent is the parent
	p.Parents = make([]Person, 0, len(p.ChildRelationships))
	for _, rel := range p.ChildRelationships {
		if rel.Parent.ID != uuid.Nil {
			rel.Parent.PopulateComputed()
			p.Parents = append(p.Parents, rel.Parent)
		}
	}

	// Children = where person IS the parent → rel.Child is the child
	p.Children = make([]Person, 0, len(p.ParentRelationships))
	for _, rel := range p.ParentRelationships {
		if rel.Child.ID != uuid.Nil {
			rel.Child.PopulateComputed()
			p.Children = append(p.Children, rel.Child)
		}
	}

	// Spouses = the other person in the relationship
	p.Spouses = make([]Person, 0, len(p.SpouseRelationships))
	for _, rel := range p.SpouseRelationships {
		if rel.Person2.ID != uuid.Nil {
			p.Spouses = append(p.Spouses, rel.Person2)
		}
	}
}

type ParentChild struct {
	ID       uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	ParentID uuid.UUID `gorm:"type:uuid;not null" json:"parent_id"`
	ChildID  uuid.UUID `gorm:"type:uuid;not null" json:"child_id"`
	
	Parent Person `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Child  Person `gorm:"foreignKey:ChildID" json:"child,omitempty"`
	
	CreatedAt time.Time `json:"created_at"`
}

type Spouse struct {
	ID       uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	Person1ID uuid.UUID `gorm:"type:uuid;not null" json:"person1_id"`
	Person2ID uuid.UUID `gorm:"type:uuid;not null" json:"person2_id"`
	
	Person1 Person `gorm:"foreignKey:Person1ID" json:"person1,omitempty"`
	Person2 Person `gorm:"foreignKey:Person2ID" json:"person2,omitempty"`
	
	StartDate *time.Time `json:"start_date"`
	EndDate   *time.Time `json:"end_date"`
	CreatedAt time.Time  `json:"created_at"`
}

// GORM callbacks
func (p *Person) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

func (pc *ParentChild) BeforeCreate(tx *gorm.DB) error {
	if pc.ID == uuid.Nil {
		pc.ID = uuid.New()
	}
	return nil
}

func (s *Spouse) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}