package handlers

import (
	"net/http"

	"family-tree-backend/internal/services"

	"github.com/gin-gonic/gin"
)

type AdminHandler struct {
    service *services.AuthService
}

func NewAdminHandler() *AdminHandler {
    return &AdminHandler{service: services.NewAuthService()}
}

type UpdateRoleRequest struct {
    Role string `json:"role" binding:"required,oneof=admin user"`
}

type CreateUserRequest struct {
    Name     string `json:"name" binding:"required"`
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required,min=6"`
    Role     string `json:"role" binding:"required,oneof=admin user"`
}

// GetUsers returns all registered users (admin only)
func (h *AdminHandler) GetUsers(c *gin.Context) {
    users, err := h.service.GetAllUsers()
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"data": users})
}

// UpdateUserRole updates a user's role
func (h *AdminHandler) UpdateUserRole(c *gin.Context) {
    id := c.Param("id")
    var req UpdateRoleRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    user, err := h.service.UpdateUserRole(id, req.Role)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, gin.H{"data": user})
}

// CreateUser allows admin to create a user
func (h *AdminHandler) CreateUser(c *gin.Context) {
    var req CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    user, err := h.service.CreateUser(req.Name, req.Email, req.Password, req.Role)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusCreated, gin.H{"data": user})
}

// DeleteUser allows admin to delete a user
func (h *AdminHandler) DeleteUser(c *gin.Context) {
    id := c.Param("id")
    if id == "" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "id is required"})
        return
    }
    if err := h.service.DeleteUser(id); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "user deleted"})
}

// UpdateUser updates user's profile (admin)
func (h *AdminHandler) UpdateUser(c *gin.Context) {
    id := c.Param("id")
    var payload struct {
        Name     string `json:"name"`
        Email    string `json:"email"`
        Password string `json:"password"`
        Role     string `json:"role" binding:"omitempty,oneof=admin user"`
    }
    if err := c.ShouldBindJSON(&payload); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    user, err := h.service.UpdateUser(id, payload.Name, payload.Email, payload.Password, payload.Role)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"data": user})
}
