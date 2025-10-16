package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"

	"homelytics-backend/models"

	"github.com/gorilla/mux"
)

type PropertyHandler struct {
	DB *sql.DB
}

func NewPropertyHandler(db *sql.DB) *PropertyHandler {
	return &PropertyHandler{DB: db}
}

// GetProperties returns a paginated list of properties with optional filters
func (h *PropertyHandler) GetProperties(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	params := models.PropertySearchParams{
		City:         r.URL.Query().Get("city"),
		ZipCode:      r.URL.Query().Get("zip_code"),
		PropertyType: r.URL.Query().Get("property_type"),
		Keyword:      r.URL.Query().Get("keyword"),
		Page:         1,
		Limit:        20,
	}

	// Parse numeric parameters
	if page := r.URL.Query().Get("page"); page != "" {
		if p, err := strconv.Atoi(page); err == nil && p > 0 {
			params.Page = p
		}
	}

	if limit := r.URL.Query().Get("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil && l > 0 && l <= 100 {
			params.Limit = l
		}
	}

	if minPrice := r.URL.Query().Get("min_price"); minPrice != "" {
		if mp, err := strconv.ParseFloat(minPrice, 64); err == nil {
			params.MinPrice = mp
		}
	}

	if maxPrice := r.URL.Query().Get("max_price"); maxPrice != "" {
		if mp, err := strconv.ParseFloat(maxPrice, 64); err == nil {
			params.MaxPrice = mp
		}
	}

	if bedrooms := r.URL.Query().Get("bedrooms"); bedrooms != "" {
		if b, err := strconv.Atoi(bedrooms); err == nil {
			params.Bedrooms = b
		}
	}

	if bathrooms := r.URL.Query().Get("bathrooms"); bathrooms != "" {
		if b, err := strconv.ParseFloat(bathrooms, 64); err == nil {
			params.Bathrooms = b
		}
	}

	// Build query
	query, args := h.buildSearchQuery(params)

	// Get total count
	countQuery := strings.Replace(query, "SELECT *", "SELECT COUNT(*)", 1)
	countQuery = strings.Split(countQuery, "ORDER BY")[0]
	countQuery = strings.Split(countQuery, "LIMIT")[0]

	var total int
	err := h.DB.QueryRow(countQuery, args...).Scan(&total)
	if err != nil {
		log.Printf("Error counting properties: %v", err)
		http.Error(w, "Error fetching properties", http.StatusInternalServerError)
		return
	}

	// Get paginated results
	offset := (params.Page - 1) * params.Limit
	query += fmt.Sprintf(" ORDER BY listing_date DESC LIMIT %d OFFSET %d", params.Limit, offset)

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		log.Printf("Error querying properties: %v", err)
		http.Error(w, "Error fetching properties", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	properties := []models.Property{}
	for rows.Next() {
		var p models.Property
		err := rows.Scan(
			&p.ID, &p.MLSNumber, &p.Address, &p.City, &p.State, &p.ZipCode,
			&p.Price, &p.Bedrooms, &p.Bathrooms, &p.SquareFeet, &p.LotSize,
			&p.YearBuilt, &p.PropertyType, &p.Description, &p.PhotoURL,
			&p.ListingDate, &p.Status, &p.Latitude, &p.Longitude,
		)
		if err != nil {
			log.Printf("Error scanning property: %v", err)
			continue
		}
		properties = append(properties, p)
	}

	// Calculate total pages
	totalPages := int(math.Ceil(float64(total) / float64(params.Limit)))

	response := models.PropertyResponse{
		Properties: properties,
		Total:      total,
		Page:       params.Page,
		Limit:      params.Limit,
		TotalPages: totalPages,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetPropertyByID returns a single property by ID
func (h *PropertyHandler) GetPropertyByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	query := `SELECT id, mls_number, address, city, state, zip_code, price,
	          bedrooms, bathrooms, square_feet, lot_size, year_built,
	          property_type, description, photo_url, listing_date, status,
	          latitude, longitude FROM rets_property WHERE id = ?`

	var p models.Property
	err := h.DB.QueryRow(query, id).Scan(
		&p.ID, &p.MLSNumber, &p.Address, &p.City, &p.State, &p.ZipCode,
		&p.Price, &p.Bedrooms, &p.Bathrooms, &p.SquareFeet, &p.LotSize,
		&p.YearBuilt, &p.PropertyType, &p.Description, &p.PhotoURL,
		&p.ListingDate, &p.Status, &p.Latitude, &p.Longitude,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "Property not found", http.StatusNotFound)
		return
	}

	if err != nil {
		log.Printf("Error fetching property: %v", err)
		http.Error(w, "Error fetching property", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

// buildSearchQuery constructs the SQL query based on search parameters
func (h *PropertyHandler) buildSearchQuery(params models.PropertySearchParams) (string, []interface{}) {
	query := `SELECT id, mls_number, address, city, state, zip_code, price,
	          bedrooms, bathrooms, square_feet, lot_size, year_built,
	          property_type, description, photo_url, listing_date, status,
	          latitude, longitude FROM rets_property WHERE 1=1`

	args := []interface{}{}

	if params.City != "" {
		query += " AND LOWER(city) = LOWER(?)"
		args = append(args, params.City)
	}

	if params.ZipCode != "" {
		query += " AND zip_code = ?"
		args = append(args, params.ZipCode)
	}

	if params.MinPrice > 0 {
		query += " AND price >= ?"
		args = append(args, params.MinPrice)
	}

	if params.MaxPrice > 0 {
		query += " AND price <= ?"
		args = append(args, params.MaxPrice)
	}

	if params.Bedrooms > 0 {
		query += " AND bedrooms >= ?"
		args = append(args, params.Bedrooms)
	}

	if params.Bathrooms > 0 {
		query += " AND bathrooms >= ?"
		args = append(args, params.Bathrooms)
	}

	if params.PropertyType != "" {
		query += " AND LOWER(property_type) = LOWER(?)"
		args = append(args, params.PropertyType)
	}

	if params.Keyword != "" {
		query += " AND (LOWER(address) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?) OR LOWER(city) LIKE LOWER(?))"
		keyword := "%" + params.Keyword + "%"
		args = append(args, keyword, keyword, keyword)
	}

	return query, args
}

// HealthCheck endpoint
func (h *PropertyHandler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	// Test database connection
	if err := h.DB.Ping(); err != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]string{
			"status": "unhealthy",
			"error":  "database connection failed",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
		"database": "connected",
	})
}
