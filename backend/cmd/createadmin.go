package main

// family-tree-createadmin creates (or promotes) an administrator account.
//
// Registration through the public API always produces a regular "user", and
// destructive endpoints require the "admin" role. This CLI breaks that
// chicken-and-egg problem on a fresh production database:
//
//	family-tree-createadmin -email you@example.com -password 'strong-secret'
//	ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='strong-secret' family-tree-createadmin
//
// It is intentionally separate from cmd/seed.go, which also inserts demo family
// data that you do not want in production.

import (
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	"family-tree-backend/internal/models"
	"family-tree-backend/internal/services"
	"family-tree-backend/pkg/database"

	"golang.org/x/crypto/bcrypt"
)

func envOr(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func usage() {
	fmt.Fprintln(os.Stderr, "Create or promote an admin account.")
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "Usage:")
	fmt.Fprintln(os.Stderr, "  family-tree-createadmin -email you@example.com -password 'strong-secret' [-name 'Your Name'] [-reset-password]")
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "Environment variables (used when a flag is omitted):")
	fmt.Fprintln(os.Stderr, "  ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME")
}

func main() {
	nameFlag := flag.String("name", envOr("ADMIN_NAME", ""), "display name for the admin account")
	emailFlag := flag.String("email", envOr("ADMIN_EMAIL", ""), "email for the admin account")
	passwordFlag := flag.String("password", envOr("ADMIN_PASSWORD", ""), "password for the admin account")
	resetPassword := flag.Bool("reset-password", false, "reset the password when the account already exists")
	flag.Usage = usage
	flag.Parse()

	email := strings.ToLower(strings.TrimSpace(*emailFlag))
	password := *passwordFlag
	name := strings.TrimSpace(*nameFlag)

	if email == "" || password == "" {
		usage()
		os.Exit(2)
	}
	if len(password) < 8 {
		log.Fatal("password must be at least 8 characters")
	}

	database.InitDB()

	var existing models.User
	err := database.DB.First(&existing, "email = ?", email).Error

	if err == nil {
		// Account already exists: promote it, and only touch the password on request.
		updates := map[string]any{"role": "admin"}
		if name != "" {
			updates["name"] = name
		}
		if *resetPassword {
			hash, hashErr := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
			if hashErr != nil {
				log.Fatalf("failed to hash password: %v", hashErr)
			}
			updates["password_hash"] = string(hash)
		}
		if updateErr := database.DB.Model(&models.User{}).Where("id = ?", existing.ID).Updates(updates).Error; updateErr != nil {
			log.Fatalf("failed to update admin account: %v", updateErr)
		}
		log.Printf("Admin account ready: %s (role=admin, password_reset=%t)", email, *resetPassword)
		fmt.Printf("ADMIN_READY email=%s\n", email)
		return
	}

	if name == "" {
		name = "Administrator"
	}

	user, regErr := services.NewAuthService().Register(name, email, password)
	if regErr != nil {
		log.Fatalf("failed to create admin account: %v", regErr)
	}
	if dbErr := database.DB.Model(&models.User{}).Where("id = ?", user.ID).Update("role", "admin").Error; dbErr != nil {
		log.Fatalf("account created but granting the admin role failed: %v", dbErr)
	}

	log.Printf("Admin account created: %s (role=admin)", email)
	fmt.Printf("ADMIN_READY email=%s\n", email)
}
