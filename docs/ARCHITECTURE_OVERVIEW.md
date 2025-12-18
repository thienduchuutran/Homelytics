# Architecture Overview

## What the App Does

Homelytics is a real estate property search and analytics platform that allows users to browse, filter, and analyze property listings from a MySQL database. The application provides a modern web interface built with Next.js (static export) that connects to PHP API endpoints for data retrieval. Key features include property search with advanced filtering, interactive map exploration, AI-powered conversational search via Google Gemini, market insights dashboards with aggregate statistics, and a favorites system for saving properties locally. The platform is designed for deployment on cPanel with static file hosting, requiring no server-side Next.js runtime.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (User)                           │
│  • Next.js Static Pages (HTML/CSS/JS)                      │
│  • React Components (Client-Side Rendering)                 │
│  • LocalStorage (Favorites)                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTPS Requests
                       │ (CORS-enabled)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Static File Server (cPanel)                    │
│  • /index.html, /houses.html, /map.html, etc.              │
│  • /api/*.php (PHP endpoints)                                │
│  • /_next/static/* (Next.js assets)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ PHP Execution
                       │ (PDO Database Queries)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              MySQL Database (boxgra6_duc)                    │
│  • rets_property (main property listings table)             │
│  • token (OAuth token storage)                             │
│  • app_state (application state/offsets)                    │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Specifics

### Static Export Configuration

The Next.js application is configured with `output: 'export'` in `next.config.ts`, which generates static HTML files during build time. This means:

- No Next.js server is required at runtime
- All pages are pre-rendered as static HTML
- Client-side routing is handled by Next.js router (works with static files)
- API routes are not available (hence PHP endpoints are used)

### cPanel Directory Layout

```
public_html/
├── index.html              # Home page
├── houses.html             # Property listings page
├── map.html                # Map explorer page
├── insights.html           # Market insights dashboard
├── favorites.html          # Saved favorites page
├── properties.html         # Property detail page wrapper
├── api/                    # PHP API endpoints
│   ├── get_properties.php
│   ├── get_property.php
│   ├── get_properties_bbox.php
│   ├── chat_gemini.php
│   ├── insights_summary.php
│   ├── insights_median_by_zip.php
│   ├── insights_price_histogram.php
│   ├── fetch_property.php
│   └── generate_token_duc.php
├── _next/                  # Next.js static assets
│   └── static/
│       ├── chunks/         # JavaScript bundles
│       └── media/          # Fonts, images
└── favicon.ico
```

### Request Resolution on Subdomain

When a user visits `https://titus-duc.calisearch.org`:

1. **Static Page Requests** (e.g., `/houses`):
   - cPanel web server (Apache/Nginx) serves the corresponding HTML file
   - Next.js router handles client-side navigation
   - No server-side rendering occurs

2. **API Requests** (e.g., `/api/get_properties.php`):
   - PHP interpreter executes the script
   - PDO connects to MySQL database
   - JSON response is returned with CORS headers

3. **Asset Requests** (e.g., `/_next/static/chunks/...`):
   - Static files are served directly by web server
   - No processing required

### CORS Configuration

All PHP endpoints set CORS headers to allow cross-origin requests:
```php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');
```

This allows the static frontend (served from any origin) to make API calls to the PHP endpoints.

## Technology Stack

- **Frontend Framework**: Next.js 15.5.5 (App Router, static export)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Maps**: Leaflet.js (client-side)
- **Charts**: Native HTML/CSS (no Chart.js dependency)
- **Backend API**: PHP 8+ with PDO
- **Database**: MySQL (boxgra6_duc)
- **AI Integration**: Google Gemini API (via PHP proxy)
- **Deployment**: cPanel static file hosting

## Key Architectural Decisions

1. **Static Export**: Chosen for cPanel compatibility and simplicity—no Node.js runtime required
2. **PHP Backend**: Leverages existing cPanel PHP support; no need for separate API server
3. **Client-Side State**: React state management, URL query params, and localStorage for favorites
4. **No Server Actions**: All data fetching happens via fetch() calls to PHP endpoints
5. **CORS-Enabled APIs**: Allows frontend to be served from any domain

