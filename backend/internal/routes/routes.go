package routes

import (
	"github.com/gorilla/mux"
	"github.com/TamaSkuyy/family-tree-app/internal/handlers"
)

// SetupRoutes configures all application routes
func SetupRoutes(r *mux.Router) {
	// Add your routes here
	// Example:
	// r.HandleFunc("/api/people", handlers.GetPeople).Methods("GET")
	r.HandleFunc("/health", handlers.HealthCheck).Methods("GET")
}