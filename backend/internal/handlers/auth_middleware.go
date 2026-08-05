package handlers

import (
	"net/http"

	"family-tree-backend/internal/models"
	"family-tree-backend/internal/services"

	"github.com/gin-gonic/gin"
)

func JWTAuthMiddleware() gin.HandlerFunc {
    authService := services.NewAuthService()
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
            return
        }

        // Expect Bearer <token>
        var token string
        if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
            token = authHeader[7:]
        } else {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization header"})
            return
        }

        user, err := authService.GetUserFromToken(token)
        if err != nil {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
            return
        }

        // Put user in context for downstream handlers
        c.Set("user", user)
        c.Next()
    }
}

// RequireRole returns a middleware that requires the current user to have the given role
func RequireRole(role string) gin.HandlerFunc {
    return func(c *gin.Context) {
        u, exists := c.Get("user")
        if !exists {
            c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
            return
        }

        mu, ok := u.(*models.User)
        if !ok {
            c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
            return
        }

        if mu.Role != role {
            c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
            return
        }

        c.Next()
    }
}
