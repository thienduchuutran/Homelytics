# Homelytics

Homelytics is a full-stack real estate analytics platform with a Next.js frontend and Go REST API backend. It is designed for browsing and filtering property listings with map support and data-driven insights.

## Project Structure

```text
Homelytics/
├── frontend/   # Next.js (TypeScript) web application
├── backend/    # Go API server
└── docs/       # Documentation assets
```

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS, Recharts, Leaflet
- Backend: Go, Gorilla Mux
- Data: MySQL

## Prerequisites

- Node.js 18+
- npm
- Go 1.22+
- MySQL instance with required tables/data

## Quick Start

### 1) Clone and install frontend dependencies

```bash
git clone <your-repo-url>
cd Homelytics/frontend
npm install
```

### 2) Configure backend environment

In `backend/`, copy `.env.example` to `.env` and fill in your own values:

```bash
cd ../backend
# On PowerShell, use: Copy-Item .env.example .env
cp .env.example .env
```

Required variables:

```env
PORT=8080
ENVIRONMENT=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
FRONTEND_URL=http://localhost:3000
```

### 3) Run backend

```bash
go mod download
go run main.go
```

API will be available at `http://localhost:8080`.

### 4) Run frontend

Open a new terminal:

```bash
cd frontend
npm run dev
```

Frontend will be available at `http://localhost:3000`.

## Available Commands

### Frontend (`frontend/`)

- `npm run dev` - start development server
- `npm run build` - build for production
- `npm run start` - run production server
- `npm run lint` - run ESLint

### Backend (`backend/`)

- `go run main.go` - start API server
- `go test ./...` - run tests
- `go build -o homelytics-api` - build binary

## API Endpoints

Base URL: `http://localhost:8080/api`

- `GET /health` - health check
- `GET /properties` - list properties with filters and pagination
- `GET /properties/{id}` - get property details by ID

Common `GET /properties` query params:

- `city`
- `zip_code`
- `min_price`
- `max_price`
- `bedrooms`
- `bathrooms`
- `property_type`
- `keyword`
- `page`
- `limit`

## Notes

- Do not commit real credentials to source control.
- Keep environment values in local `.env` files.
- Backend-specific details are also documented in `backend/README.md`.
