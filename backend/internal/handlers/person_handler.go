package handlers

import (
	"family-tree-backend/internal/models"
	"family-tree-backend/internal/services"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type PersonHandler struct {
	service *services.PersonService
}

func NewPersonHandler() *PersonHandler {
	return &PersonHandler{
		service: services.NewPersonService(),
	}
}

// DTOs for request/response
type CreatePersonRequest struct {
	FirstName string    `json:"first_name" binding:"required"`
	LastName  string    `json:"last_name" binding:"required"`
	Gender    string    `json:"gender" binding:"required,oneof=male female"`
	BirthDate string    `json:"birth_date"`
	DeathDate string    `json:"death_date"`
	Email     string    `json:"email"`
	Phone     string    `json:"phone"`
	Photo     string    `json:"photo"`
	Notes     string    `json:"notes"`
}

type UpdatePersonRequest struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Gender    string `json:"gender" binding:"omitempty,oneof=male female"`
	BirthDate string `json:"birth_date"`
	DeathDate string `json:"death_date"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	Photo     string `json:"photo"`
	Notes     string `json:"notes"`
}

type RelationshipRequest struct {
	ParentID string `json:"parent_id" binding:"required"`
	ChildID  string `json:"child_id" binding:"required"`
}

type SpouseRequest struct {
	Person1ID string `json:"person1_id" binding:"required"`
	Person2ID string `json:"person2_id" binding:"required"`
}

// Get all persons
func (h *PersonHandler) GetPersons(c *gin.Context) {
	persons, err := h.service.GetAllPersons()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": persons})
}

// Get person by ID
func (h *PersonHandler) GetPerson(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	person, err := h.service.GetPerson(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Person not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": person})
}

// Create new person
func (h *PersonHandler) CreatePerson(c *gin.Context) {
	var req CreatePersonRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	person := &models.Person{
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Gender:    models.Gender(req.Gender),
		Email:     req.Email,
		Phone:     req.Phone,
		Photo:     req.Photo,
		Notes:     req.Notes,
	}

	// Parse dates if provided
	if req.BirthDate != "" {
		if birthDate, err := parseDate(req.BirthDate); err == nil {
			person.BirthDate = birthDate
		}
	}
	if req.DeathDate != "" {
		if deathDate, err := parseDate(req.DeathDate); err == nil {
			person.DeathDate = deathDate
		}
	}

	if err := h.service.CreatePerson(person); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": person})
}

// Update person
func (h *PersonHandler) UpdatePerson(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var req UpdatePersonRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := &models.Person{}
	if req.FirstName != "" {
		updates.FirstName = req.FirstName
	}
	if req.LastName != "" {
		updates.LastName = req.LastName
	}
	if req.Gender != "" {
		updates.Gender = models.Gender(req.Gender)
	}
	if req.Email != "" {
		updates.Email = req.Email
	}
	if req.Phone != "" {
		updates.Phone = req.Phone
	}
	if req.Photo != "" {
		updates.Photo = req.Photo
	}
	if req.Notes != "" {
		updates.Notes = req.Notes
	}

	// Parse dates if provided
	if req.BirthDate != "" {
		if birthDate, err := parseDate(req.BirthDate); err == nil {
			updates.BirthDate = birthDate
		}
	}
	if req.DeathDate != "" {
		if deathDate, err := parseDate(req.DeathDate); err == nil {
			updates.DeathDate = deathDate
		}
	}

	if err := h.service.UpdatePerson(id, updates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Person updated successfully"})
}

// Delete person
func (h *PersonHandler) DeletePerson(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	if err := h.service.DeletePerson(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Person deleted successfully"})
}

// Add parent-child relationship
func (h *PersonHandler) AddParentChild(c *gin.Context) {
	var req RelationshipRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	parentID, err := uuid.Parse(req.ParentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid parent ID"})
		return
	}

	childID, err := uuid.Parse(req.ChildID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid child ID"})
		return
	}

	if err := h.service.AddParentChild(parentID, childID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Parent-child relationship added"})
}

// Remove parent-child relationship
func (h *PersonHandler) RemoveParentChild(c *gin.Context) {
	parentID, err := uuid.Parse(c.Param("parentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid parent ID"})
		return
	}

	childID, err := uuid.Parse(c.Param("childId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid child ID"})
		return
	}

	if err := h.service.RemoveParentChild(parentID, childID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Parent-child relationship removed"})
}

// Add spouse relationship
func (h *PersonHandler) AddSpouse(c *gin.Context) {
	var req SpouseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	person1ID, err := uuid.Parse(req.Person1ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid person1 ID"})
		return
	}

	person2ID, err := uuid.Parse(req.Person2ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid person2 ID"})
		return
	}

	if err := h.service.AddSpouse(person1ID, person2ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Spouse relationship added"})
}

// Remove spouse relationship
func (h *PersonHandler) RemoveSpouse(c *gin.Context) {
	person1ID, err := uuid.Parse(c.Param("person1Id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid person1 ID"})
		return
	}

	person2ID, err := uuid.Parse(c.Param("person2Id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid person2 ID"})
		return
	}

	if err := h.service.RemoveSpouse(person1ID, person2ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Spouse relationship removed"})
}

// Get family tree
func (h *PersonHandler) GetFamilyTree(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	tree, err := h.service.GetFamilyTree(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Person not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": tree})
}

// Search persons
func (h *PersonHandler) SearchPersons(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Search query is required"})
		return
	}

	persons, err := h.service.SearchPersons(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": persons})
}

// Helper function to parse date strings
func parseDate(dateStr string) (*time.Time, error) {
	parsedTime, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return nil, err
	}
	return &parsedTime, nil
}