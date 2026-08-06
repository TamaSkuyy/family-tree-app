package main

// @title           Family Tree API
// @version         1.0
// @description     A family tree management API with authentication and role-based access.
// @host            localhost:8080
// @BasePath        /api/v1
// @securityDefinitions.apikey BearerAuth
// @in              header
// @name            Authorization

import (
	"family-tree-backend/internal/handlers"
	"family-tree-backend/internal/middleware"
	"family-tree-backend/pkg/database"
	"log"
	"os"

	_ "family-tree-backend/docs"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
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
	api.Use(middleware.RateLimitMiddleware())
	{
		// Auth (public)
		api.POST("/auth/register", authHandler.Register)
		api.POST("/auth/login", authHandler.Login)
		api.POST("/auth/forgot-password", authHandler.ForgotPassword)
		api.POST("/auth/reset-password", authHandler.ResetPassword)
		api.GET("/auth/me", middleware.JWTAuthMiddleware(), authHandler.Me)

		// Public read-only routes (with optional public mode)
		public := api.Group("")
		public.Use(middleware.PublicModeMiddleware())
		{
			public.GET("/persons", personHandler.GetPersons)
			public.GET("/persons/:id", personHandler.GetPerson)
			public.GET("/search", personHandler.SearchPersons)
			public.GET("/family-tree/:id", personHandler.GetFamilyTree)
		}

		// Person write routes (auth required)
		api.POST("/persons", middleware.JWTAuthMiddleware(), personHandler.CreatePerson)
		api.PUT("/persons/:id", middleware.JWTAuthMiddleware(), personHandler.UpdatePerson)
		api.DELETE("/persons/:id", middleware.JWTAuthMiddleware(), middleware.RequireRole("admin"), personHandler.DeletePerson)

		// Relationships (protected)
		api.POST("/relationships/parent-child", middleware.JWTAuthMiddleware(), personHandler.AddParentChild)
		api.DELETE("/relationships/parent-child/:parentId/:childId", middleware.JWTAuthMiddleware(), middleware.RequireRole("admin"), personHandler.RemoveParentChild)
		api.POST("/relationships/spouse", middleware.JWTAuthMiddleware(), personHandler.AddSpouse)
		api.DELETE("/relationships/spouse/:person1Id/:person2Id", middleware.JWTAuthMiddleware(), middleware.RequireRole("admin"), personHandler.RemoveSpouse)

		// Admin user management
		api.GET("/admin/users", middleware.JWTAuthMiddleware(), middleware.RequireRole("admin"), adminHandler.GetUsers)
		api.PUT("/admin/users/:id/role", middleware.JWTAuthMiddleware(), middleware.RequireRole("admin"), adminHandler.UpdateUserRole)
		api.POST("/admin/users", middleware.JWTAuthMiddleware(), middleware.RequireRole("admin"), adminHandler.CreateUser)
		api.PUT("/admin/users/:id", middleware.JWTAuthMiddleware(), middleware.RequireRole("admin"), adminHandler.UpdateUser)
		api.DELETE("/admin/users/:id", middleware.JWTAuthMiddleware(), middleware.RequireRole("admin"), adminHandler.DeleteUser)
	}

	// Swagger docs
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

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