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
	
	// Relationships
	ParentRelationships []ParentChild `gorm:"foreignKey:ParentID" json:"parent_relationships,omitempty"`
	ChildRelationships  []ParentChild `gorm:"foreignKey:ChildID" json:"child_relationships,omitempty"`
	
	// Spouse relationships
	SpouseRelationships []Spouse `gorm:"foreignKey:Person1ID" json:"spouse_relationships,omitempty"`
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