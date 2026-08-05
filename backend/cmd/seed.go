package main

import (
	"family-tree-backend/internal/models"
	"family-tree-backend/internal/services"
	"family-tree-backend/pkg/database"
	"log"
	"time"
)

func main() {
	// Initialize database
	database.InitDB()

	// Ensure admin user exists
	var admin models.User
	if err := database.DB.First(&admin, "email = ?", "admin@example.com").Error; err != nil {
		// create default admin with password 'admin123' for demo
		hash, _ := services.NewAuthService().Register("Admin", "admin@example.com", "admin123")
		_ = hash
		log.Println("Created demo admin: admin@example.com / admin123")
	}

	personService := services.NewPersonService()

	// Create sample family members
	familyMembers := []struct {
		firstName string
		lastName  string
		gender    models.Gender
		birthDate string
		deathDate string
		email     string
	}{
		{"Robert", "Johnson", models.GenderMale, "1945-03-15", "", "robert.j@example.com"},
		{"Mary", "Johnson", models.GenderFemale, "1948-07-22", "", "mary.j@example.com"},
		{"David", "Johnson", models.GenderMale, "1972-11-30", "", "david.j@example.com"},
		{"Sarah", "Johnson", models.GenderFemale, "1975-02-14", "", "sarah.j@example.com"},
		{"James", "Johnson", models.GenderMale, "2000-06-08", "", "james.j@example.com"},
		{"Emma", "Johnson", models.GenderFemale, "2003-09-25", "", "emma.j@example.com"},
		{"Michael", "Smith", models.GenderMale, "1970-12-01", "", "michael.s@example.com"},
		{"Lisa", "Johnson", models.GenderFemale, "1978-04-18", "", "lisa.j@example.com"},
		{"Oliver", "Johnson", models.GenderMale, "2005-08-12", "", "oliver.j@example.com"},
		{"Sophia", "Johnson", models.GenderFemale, "2008-01-30", "", "sophia.j@example.com"},
	}

	var createdPersons []models.Person

	// Create persons
	for _, member := range familyMembers {
		person := &models.Person{
			FirstName: member.firstName,
			LastName:  member.lastName,
			Gender:    member.gender,
			Email:     member.email,
		}

		// Parse birth date
		if birthDate, err := time.Parse("2006-01-02", member.birthDate); err == nil {
			person.BirthDate = &birthDate
		}

		// Parse death date if provided
		if member.deathDate != "" {
			if deathDate, err := time.Parse("2006-01-02", member.deathDate); err == nil {
				person.DeathDate = &deathDate
			}
		}

		if err := personService.CreatePerson(person); err != nil {
			log.Printf("Error creating person %s: %v", member.firstName, err)
		} else {
			createdPersons = append(createdPersons, *person)
			log.Printf("Created person: %s %s", person.FirstName, person.LastName)
		}
	}

	// Create relationships
	if len(createdPersons) >= 10 {
		// Robert and Mary are spouses (parents)
		if err := personService.AddSpouse(createdPersons[0].ID, createdPersons[1].ID); err != nil {
			log.Printf("Error adding spouse relationship: %v", err)
		} else {
			log.Println("Added spouse relationship: Robert & Mary Johnson")
		}

		// David and Sarah are children of Robert and Mary
		if err := personService.AddParentChild(createdPersons[0].ID, createdPersons[2].ID); err != nil {
			log.Printf("Error adding parent-child relationship: %v", err)
		} else {
			log.Println("Added parent-child relationship: Robert -> David")
		}

		if err := personService.AddParentChild(createdPersons[1].ID, createdPersons[2].ID); err != nil {
			log.Printf("Error adding parent-child relationship: %v", err)
		} else {
			log.Println("Added parent-child relationship: Mary -> David")
		}

		if err := personService.AddParentChild(createdPersons[0].ID, createdPersons[3].ID); err != nil {
			log.Printf("Error adding parent-child relationship: %v", err)
		} else {
			log.Println("Added parent-child relationship: Robert -> Sarah")
		}

		if err := personService.AddParentChild(createdPersons[1].ID, createdPersons[3].ID); err != nil {
			log.Printf("Error adding parent-child relationship: %v", err)
		} else {
			log.Println("Added parent-child relationship: Mary -> Sarah")
		}

		// David and Lisa are spouses
		if err := personService.AddSpouse(createdPersons[2].ID, createdPersons[7].ID); err != nil {
			log.Printf("Error adding spouse relationship: %v", err)
		} else {
			log.Println("Added spouse relationship: David & Lisa Johnson")
		}

		// James and Emma are children of David and Lisa
		if err := personService.AddParentChild(createdPersons[2].ID, createdPersons[4].ID); err != nil {
			log.Printf("Error adding parent-child relationship: %v", err)
		} else {
			log.Println("Added parent-child relationship: David -> James")
		}

		if err := personService.AddParentChild(createdPersons[7].ID, createdPersons[4].ID); err != nil {
			log.Printf("Error adding parent-child relationship: %v", err)
		} else {
			log.Println("Added parent-child relationship: Lisa -> James")
		}

		if err := personService.AddParentChild(createdPersons[2].ID, createdPersons[5].ID); err != nil {
			log.Printf("Error adding parent-child relationship: %v", err)
		} else {
			log.Println("Added parent-child relationship: David -> Emma")
		}

		if err := personService.AddParentChild(createdPersons[7].ID, createdPersons[5].ID); err != nil {
			log.Printf("Error adding parent-child relationship: %v", err)
		} else {
			log.Println("Added parent-child relationship: Lisa -> Emma")
		}

		// Sarah and Michael are spouses
		if err := personService.AddSpouse(createdPersons[3].ID, createdPersons[6].ID); err != nil {
			log.Printf("Error adding spouse relationship: %v", err)
		} else {
			log.Println("Added spouse relationship: Sarah & Michael Smith")
		}

		// Oliver and Sophia are children of Sarah and Michael
		if err := personService.AddParentChild(createdPersons[3].ID, createdPersons[8].ID); err != nil {
			log.Printf("Error adding parent-child relationship: %v", err)
		} else {
			log.Println("Added parent-child relationship: Sarah -> Oliver")
		}

		if err := personService.AddParentChild(createdPersons[6].ID, createdPersons[8].ID); err != nil {
			log.Printf("Error adding parent-child relationship: %v", err)
		} else {
			log.Println("Added parent-child relationship: Michael -> Oliver")
		}

		if err := personService.AddParentChild(createdPersons[3].ID, createdPersons[9].ID); err != nil {
			log.Printf("Error adding parent-child relationship: %v", err)
		} else {
			log.Println("Added parent-child relationship: Sarah -> Sophia")
		}

		if err := personService.AddParentChild(createdPersons[6].ID, createdPersons[9].ID); err != nil {
			log.Printf("Error adding parent-child relationship: %v", err)
		} else {
			log.Println("Added parent-child relationship: Michael -> Sophia")
		}
	}

	log.Println("✅ Demo data created successfully!")
	log.Println("📊 Created family tree with 3 generations")
	log.Println("👴 Grandparents: Robert & Mary Johnson")
	log.Println("👨 Parents: David & Lisa Johnson, Sarah & Michael Smith")
	log.Println("👶 Children: James, Emma, Oliver, Sophia")
}