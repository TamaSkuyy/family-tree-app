package routes

import (
	"github.com/gorilla/mux"
	"github.com/TamaSkuyy/family-tree-app/internal/handlers"
	"github.com/TamaSkuyy/family-tree-app/internal/repository"
)

// SetupRoutes configures all application routes
func SetupRoutes(r *mux.Router) {
	repo := repository.NewMemoryRepository()
	repo.Seed() // Initialize with sample data

	familyHandler := handlers.NewFamilyMembersHandler(repo)
	r.HandleFunc("/health", handlers.HealthCheck).Methods("GET")
	r.HandleFunc("/family-members", familyHandler.GetAllFamilyMembers).Methods("GET")
}