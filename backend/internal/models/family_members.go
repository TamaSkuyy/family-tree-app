package models

type FamilyMember struct {
	ID        string `json:"id"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Gender    string `json:"gender"` // "male", "female", "other"
	BirthDate string `json:"birthDate"` // Format: "YYYY-MM-DD"
	ParentID  string `json:"parentId,omitempty"` // References another FamilyMember
	SpouseID  string `json:"spouseId,omitempty"`
}