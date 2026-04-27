# Homelytics

### Data-Driven Real Estate Intelligence Platform

Homelytics is a modern real estate platform that helps users discover, evaluate, and compare homes through searchable listings, interactive maps, and market analytics. The app combines a static Next.js frontend with a PHP API layer and MySQL data to deliver a fast, cPanel-friendly deployment model.

## Product Vision

Traditional listing sites return results. Homelytics helps users understand them.

- Insightful: convert housing data into clear, useful analytics
- Practical: combine map-first exploration with advanced filters
- Accessible: ship as static frontend + PHP APIs on standard hosting
- Extensible: support AI-assisted property Q&A and market summaries

## Flagship Features

- Smart property search with filters for city, ZIP, price, beds, baths, type, and keywords
- Interactive map explorer with geographic bounding-box queries
- Property detail experience with photos, listing metadata, and saved favorites
- Market insights pages (median-by-ZIP, trends, histogram, summary stats)
- AI chat assistant flow via Gemini through a PHP proxy endpoint

## Project Structure

```text
Homelytics/
├── frontend/   # Next.js (TypeScript) web application
├── backend/    # Go API server
└── docs/       # Documentation assets
```

## Tech Stack

- Frontend: Next.js (static export), React, TypeScript, Tailwind CSS, Leaflet
- Backend API: PHP endpoints (`frontend/api/*.php`) using PDO
- Data: MySQL
- Deployment: cPanel/static hosting

## Prerequisites

- Node.js 18+
- npm
- PHP 8+ (only if running APIs locally)
- MySQL instance with required tables/data

## Quick Start

### 1) Clone and install frontend dependencies

```bash
git clone <your-repo-url>
cd Homelytics/frontend
npm install
```

### 2) Choose your API mode

Option A (recommended for quick frontend development): use production PHP API.

Create `frontend/.env.local`:

```bash
cd frontend
# On PowerShell:
Set-Content .env.local "NEXT_PUBLIC_USE_PRODUCTION_API=true"
```

Option B: run local PHP APIs under `frontend/api`.

If you want local PHP endpoints, run PHP's built-in server from `frontend`:

```bash
cd frontend
npm run dev:php
```

Then configure DB credentials in the PHP API files or your local include/config setup.

### 3) Run frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at `http://localhost:3000`.

## Available Commands

### Frontend (`frontend/`)

- `npm run dev` - start development server
- `npm run build` - build static export for production
- `npm run start` - run production server
- `npm run lint` - run ESLint
- `npm run dev:php` - run local PHP server (`http://localhost:8000`)

### PHP API (`frontend/api/`)

- Served via cPanel in production under `/api/*.php`
- Optional local run with `php -S localhost:8000 -t .`

## API Endpoints

Common base URLs:

- Production: `https://titus-duc.calisearch.org/api`
- Local PHP: `http://localhost:8000/api`

Primary endpoints:

- `GET /get_properties.php` - list properties with filters/pagination
- `GET /get_property.php` - get property details by ID
- `GET /get_properties_bbox.php` - fetch properties in map bounds
- `GET /insights_summary.php` - aggregate summary metrics
- `GET /insights_median_by_zip.php` - median prices by ZIP
- `GET /insights_price_trend.php` - price trend data
- `GET /insights_price_histogram.php` - histogram/distribution bins
- `POST /chat_gemini.php` - AI chat endpoint proxy

Common `GET /get_properties.php` query params:

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

- The legacy `backend/` Go service exists in the repo but is not the current production runtime.
- Do not commit real credentials to source control.
- Keep environment values in local `.env` files.
- Architecture and deployment details are documented in `docs/ARCHITECTURE_OVERVIEW.md`.
