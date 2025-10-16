package models

import "time"

// Property represents a real estate listing from rets_property table
type Property struct {
	ID              int       `json:"id"`
	MLSNumber       string    `json:"mls_number"`
	Address         string    `json:"address"`
	City            string    `json:"city"`
	State           string    `json:"state"`
	ZipCode         string    `json:"zip_code"`
	Price           float64   `json:"price"`
	Bedrooms        int       `json:"bedrooms"`
	Bathrooms       float64   `json:"bathrooms"`
	SquareFeet      int       `json:"square_feet"`
	LotSize         float64   `json:"lot_size"`
	YearBuilt       int       `json:"year_built"`
	PropertyType    string    `json:"property_type"`
	Description     string    `json:"description"`
	PhotoURL        string    `json:"photo_url"`
	ListingDate     time.Time `json:"listing_date"`
	Status          string    `json:"status"`
	Latitude        float64   `json:"latitude"`
	Longitude       float64   `json:"longitude"`
}

// PropertySearchParams represents search filter parameters
type PropertySearchParams struct {
	City         string  `json:"city"`
	ZipCode      string  `json:"zip_code"`
	MinPrice     float64 `json:"min_price"`
	MaxPrice     float64 `json:"max_price"`
	Bedrooms     int     `json:"bedrooms"`
	Bathrooms    float64 `json:"bathrooms"`
	PropertyType string  `json:"property_type"`
	Keyword      string  `json:"keyword"`
	Page         int     `json:"page"`
	Limit        int     `json:"limit"`
}

// PropertyResponse represents paginated property results
type PropertyResponse struct {
	Properties []Property `json:"properties"`
	Total      int        `json:"total"`
	Page       int        `json:"page"`
	Limit      int        `json:"limit"`
	TotalPages int        `json:"total_pages"`
}

// OpenHouse represents an open house event from rets_openhouse table
type OpenHouse struct {
	ID          int       `json:"id"`
	MLSNumber   string    `json:"mls_number"`
	StartTime   time.Time `json:"start_time"`
	EndTime     time.Time `json:"end_time"`
	Description string    `json:"description"`
}
