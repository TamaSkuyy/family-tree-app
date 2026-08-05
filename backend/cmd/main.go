package main

import (
	"family-tree-backend/internal/handlers"
	"family-tree-backend/pkg/database"
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Ensure JWT secret in production
	if os.Getenv("ENV") == "production" {
		if os.Getenv("JWT_SECRET") == "" {
			log.Fatal("JWT_SECRET environment variable must be set in production")
		}
	}

	// Initialize database
	database.InitDB()

	// Create Gin router
	r := gin.Default()

	// Configure CORS
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000", "http://127.0.0.1:3000"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	r.Use(cors.New(config))

	// Initialize handlers
	personHandler := handlers.NewPersonHandler()
	authHandler := handlers.NewAuthHandler()
    adminHandler := handlers.NewAdminHandler()

	// API routes
	api := r.Group("/api/v1")
	{
		// Auth
		api.POST("/auth/register", authHandler.Register)
		api.POST("/auth/login", authHandler.Login)
		api.GET("/auth/me", handlers.JWTAuthMiddleware(), authHandler.Me)

	// Person routes
	api.GET("/persons", personHandler.GetPersons)
	api.GET("/persons/:id", personHandler.GetPerson)
	api.POST("/persons", handlers.JWTAuthMiddleware(), personHandler.CreatePerson)
	api.PUT("/persons/:id", handlers.JWTAuthMiddleware(), personHandler.UpdatePerson)
	api.DELETE("/persons/:id", handlers.JWTAuthMiddleware(), handlers.RequireRole("admin"), personHandler.DeletePerson)
		
		// Search
		api.GET("/search", personHandler.SearchPersons)
		
		// Family tree
		api.GET("/family-tree/:id", personHandler.GetFamilyTree)
		
	// Relationships (protected)
	api.POST("/relationships/parent-child", handlers.JWTAuthMiddleware(), personHandler.AddParentChild)
	api.DELETE("/relationships/parent-child/:parentId/:childId", handlers.JWTAuthMiddleware(), handlers.RequireRole("admin"), personHandler.RemoveParentChild)
	api.POST("/relationships/spouse", handlers.JWTAuthMiddleware(), personHandler.AddSpouse)
	api.DELETE("/relationships/spouse/:person1Id/:person2Id", handlers.JWTAuthMiddleware(), handlers.RequireRole("admin"), personHandler.RemoveSpouse)

	// Admin user management
	api.GET("/admin/users", handlers.JWTAuthMiddleware(), handlers.RequireRole("admin"), adminHandler.GetUsers)
	api.PUT("/admin/users/:id/role", handlers.JWTAuthMiddleware(), handlers.RequireRole("admin"), adminHandler.UpdateUserRole)
	api.POST("/admin/users", handlers.JWTAuthMiddleware(), handlers.RequireRole("admin"), adminHandler.CreateUser)
	api.PUT("/admin/users/:id", handlers.JWTAuthMiddleware(), handlers.RequireRole("admin"), adminHandler.UpdateUser)
	api.DELETE("/admin/users/:id", handlers.JWTAuthMiddleware(), handlers.RequireRole("admin"), adminHandler.DeleteUser)
	}

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "OK",
			"message": "Family Tree API is running",
		})
	})

	// Start server
	log.Println("Server starting on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}