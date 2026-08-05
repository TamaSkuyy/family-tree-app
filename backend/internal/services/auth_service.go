package services

import (
	"errors"
	"os"
	"time"

	"family-tree-backend/internal/models"
	"family-tree-backend/pkg/database"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var jwtSecret = func() []byte {
    if s := os.Getenv("JWT_SECRET"); s != "" {
        return []byte(s)
    }
    return []byte("dev-secret-change-me")
}()

type AuthService struct{}

func NewAuthService() *AuthService { return &AuthService{} }

func (s *AuthService) Register(name, email, password string) (*models.User, error) {
    // check exists
    var existing models.User
    if err := database.DB.First(&existing, "email = ?", email).Error; err == nil {
        return nil, errors.New("email already registered")
    }

    hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    if err != nil {
        return nil, err
    }

    user := &models.User{
        Name:         name,
        Email:        email,
        PasswordHash: string(hash),
    }

    if err := database.DB.Create(user).Error; err != nil {
        return nil, err
    }
    return user, nil
}

func (s *AuthService) Authenticate(email, password string) (*models.User, error) {
    var user models.User
    if err := database.DB.First(&user, "email = ?", email).Error; err != nil {
        return nil, errors.New("invalid credentials")
    }
    if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
        return nil, errors.New("invalid credentials")
    }
    return &user, nil
}

func (s *AuthService) GenerateToken(user *models.User) (string, error) {
    claims := jwt.MapClaims{
        "sub": user.ID.String(),
        "email": user.Email,
        "exp": time.Now().Add(24 * time.Hour).Unix(),
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(jwtSecret)
}

func (s *AuthService) ParseToken(tokenStr string) (*jwt.Token, error) {
    return jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, errors.New("unexpected signing method")
        }
        return jwtSecret, nil
    })
}

// GetUserFromToken parses token and returns the User referenced by the "sub" claim.
func (s *AuthService) GetUserFromToken(tokenStr string) (*models.User, error) {
    token, err := s.ParseToken(tokenStr)
    if err != nil || token == nil || !token.Valid {
        return nil, errors.New("invalid token")
    }

    claims, ok := token.Claims.(jwt.MapClaims)
    if !ok {
        return nil, errors.New("invalid token claims")
    }

    sub, ok := claims["sub"].(string)
    if !ok || sub == "" {
        return nil, errors.New("invalid subject in token")
    }

    // Lookup user by ID
    var user models.User
    if err := database.DB.First(&user, "id = ?", sub).Error; err != nil {
        return nil, errors.New("user not found")
    }
    return &user, nil
}

// GetAllUsers returns all users in the system (admin use)
func (s *AuthService) GetAllUsers() ([]models.User, error) {
    var users []models.User
    if err := database.DB.Find(&users).Error; err != nil {
        return nil, err
    }
    return users, nil
}

// UpdateUserRole updates the role for a given user id
func (s *AuthService) UpdateUserRole(id string, role string) (*models.User, error) {
    var user models.User
    if err := database.DB.First(&user, "id = ?", id).Error; err != nil {
        return nil, err
    }
    user.Role = role
    if err := database.DB.Save(&user).Error; err != nil {
        return nil, err
    }
    return &user, nil
}

// CreateUser creates a new user with the provided password and role (admin use)
func (s *AuthService) CreateUser(name, email, password, role string) (*models.User, error) {
    var existing models.User
    if err := database.DB.First(&existing, "email = ?", email).Error; err == nil {
        return nil, errors.New("email already registered")
    }

    hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    if err != nil {
        return nil, err
    }

    user := &models.User{
        Name:         name,
        Email:        email,
        PasswordHash: string(hash),
        Role:         role,
    }

    if err := database.DB.Create(user).Error; err != nil {
        return nil, err
    }
    return user, nil
}

// DeleteUser deletes a user by id
func (s *AuthService) DeleteUser(id string) error {
    if err := database.DB.Delete(&models.User{}, "id = ?", id).Error; err != nil {
        return err
    }
    return nil
}

// UpdateUser updates allowed fields for a user. Empty password means no change.
func (s *AuthService) UpdateUser(id string, name, email, password, role string) (*models.User, error) {
    var user models.User
    if err := database.DB.First(&user, "id = ?", id).Error; err != nil {
        return nil, err
    }

    if name != "" {
        user.Name = name
    }
    if email != "" && email != user.Email {
        // check email uniqueness
        var other models.User
        if err := database.DB.First(&other, "email = ?", email).Error; err == nil && other.ID != user.ID {
            return nil, errors.New("email already registered")
        }
        user.Email = email
    }
    if role != "" {
        user.Role = role
    }
    if password != "" {
        hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
        if err != nil {
            return nil, err
        }
        user.PasswordHash = string(hash)
    }

    if err := database.DB.Save(&user).Error; err != nil {
        return nil, err
    }
    return &user, nil
}
