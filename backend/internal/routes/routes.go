package routes

import (
	"github.com/gorilla/mux"
	"github.com/TamaSkuyy/family-tree-app/internal/handlers"
)

func SetupRoutes(r *mux.Router) {
	r.HandleFunc("/health", handlers.HealthCheck).Methods("GET")
	// Future routes will go here
}