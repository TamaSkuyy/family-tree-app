package middleware

import (
	"os"

	"github.com/gin-gonic/gin"
)

func PublicModeMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if os.Getenv("PUBLIC_MODE") == "true" {
			authHeader := c.GetHeader("Authorization")
			if authHeader == "" {
				c.Next()
				return
			}
		}
		c.Next()
	}
}
