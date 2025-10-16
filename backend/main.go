package main

import (
	"log"
	"net/http"

	"homelytics-backend/config"
	"homelytics-backend/handlers"
	"homelytics-backend/middleware"

	"github.com/gorilla/mux"
)

func main() {
	// Load configuration
	cfg := config.LoadConfig()
	log.Printf("Starting Homelytics API on port %s", cfg.Port)

	// Connect to database
	db, err := config.NewDatabase(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize handlers
	propertyHandler := handlers.NewPropertyHandler(db.DB)

	// Setup router
	router := mux.NewRouter()

	// API routes
	api := router.PathPrefix("/api").Subrouter()

	// Health check
	api.HandleFunc("/health", propertyHandler.HealthCheck).Methods("GET")

	// Property routes
	api.HandleFunc("/properties", propertyHandler.GetProperties).Methods("GET")
	api.HandleFunc("/properties/{id}", propertyHandler.GetPropertyByID).Methods("GET")

	// Setup CORS
	corsHandler := middleware.SetupCORS(cfg.FrontendURL)

	// Apply middleware
	handler := middleware.Logger(corsHandler.Handler(router))

	// Start server
	log.Printf("Server running on http://localhost:%s", cfg.Port)
	log.Printf("Accepting requests from frontend: %s", cfg.FrontendURL)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, handler))
}
