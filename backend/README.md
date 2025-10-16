# Homelytics Backend

Go REST API for the Homelytics real estate platform.

## Prerequisites

- Go 1.22 or higher
- MySQL database with CRMLS dataset

## Installation

1. Install Go from [https://golang.org/dl/](https://golang.org/dl/)

2. Install dependencies:
```bash
go mod download
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update the `.env` file with your database credentials:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
```

## Running the Server

```bash
go run main.go
```

The server will start on `http://localhost:8080`

## API Endpoints

### Health Check
- `GET /api/health` - Check server and database status

### Properties
- `GET /api/properties` - Get all properties with pagination and filters
  - Query parameters:
    - `city` - Filter by city
    - `zip_code` - Filter by ZIP code
    - `min_price` - Minimum price
    - `max_price` - Maximum price
    - `bedrooms` - Minimum number of bedrooms
    - `bathrooms` - Minimum number of bathrooms
    - `property_type` - Property type (e.g., house, condo)
    - `keyword` - Search keyword
    - `page` - Page number (default: 1)
    - `limit` - Items per page (default: 20, max: 100)

- `GET /api/properties/{id}` - Get a single property by ID

### Example Requests

```bash
# Get all properties
curl http://localhost:8080/api/properties

# Search properties in a city
curl http://localhost:8080/api/properties?city=Los Angeles

# Filter by price range
curl http://localhost:8080/api/properties?min_price=300000&max_price=500000

# Filter by bedrooms and bathrooms
curl http://localhost:8080/api/properties?bedrooms=3&bathrooms=2

# Search with keyword
curl http://localhost:8080/api/properties?keyword=pool

# Get property by ID
curl http://localhost:8080/api/properties/1

# Health check
curl http://localhost:8080/api/health
```

## Project Structure

```
backend/
├── config/          # Configuration and database setup
│   ├── config.go    # Environment configuration
│   └── database.go  # Database connection
├── handlers/        # HTTP request handlers
│   └── properties.go
├── middleware/      # HTTP middleware
│   ├── cors.go      # CORS configuration
│   └── logger.go    # Request logging
├── models/          # Data models
│   └── property.go
├── main.go          # Application entry point
├── go.mod           # Go module definition
└── .env             # Environment variables

```

## Database Schema

The API expects the following MySQL tables:

### rets_property
Main property listings table with columns:
- id, mls_number, address, city, state, zip_code
- price, bedrooms, bathrooms, square_feet, lot_size
- year_built, property_type, description, photo_url
- listing_date, status, latitude, longitude

### rets_openhouse
Open house events table with columns:
- id, mls_number, start_time, end_time, description

## Development

Run tests:
```bash
go test ./...
```

Build for production:
```bash
go build -o homelytics-api
```

## CORS Configuration

The API is configured to accept requests from `http://localhost:3000` (Next.js frontend).
Update `FRONTEND_URL` in `.env` to change the allowed origin.
