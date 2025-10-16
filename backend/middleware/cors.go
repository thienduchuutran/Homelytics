package middleware

import (
	"net/http"

	"github.com/rs/cors"
)

func SetupCORS(frontendURL string) *cors.Cors {
	return cors.New(cors.Options{
		AllowedOrigins: []string{frontendURL},
		AllowedMethods: []string{
			http.MethodGet,
			http.MethodPost,
			http.MethodPut,
			http.MethodDelete,
			http.MethodOptions,
		},
		AllowedHeaders: []string{
			"Accept",
			"Authorization",
			"Content-Type",
			"X-CSRF-Token",
		},
		ExposedHeaders: []string{
			"Link",
		},
		AllowCredentials: true,
		MaxAge:           300,
	})
}
