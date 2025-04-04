package handlers

import (
	"encoding/json"
	"net/http"
	"github.com/TamaSkuyy/family-tree-app/internal/repository"
)

type FamilyMembersHandler struct {
	repo *repository.MemoryRepository
}

func NewFamilyMembersHandler(repo *repository.MemoryRepository) *FamilyMembersHandler {
	return &FamilyMembersHandler{repo: repo}
}

func (h *FamilyMembersHandler) GetAllFamilyMembers(w http.ResponseWriter, r *http.Request) {
	members, err := h.repo.GetAllFamilyMembers()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(members)
}