# Routes and Pages

This document catalogs every route/page in the Next.js application, their file locations, what they render, what data they fetch, and the user flows that lead to them.

## Route Index

| Route Path | File Path | Description |
|------------|-----------|-------------|
| `/` | `app/page.tsx` | Home/landing page |
| `/houses` | `app/houses/page.tsx` | Property listings with filters |
| `/map` | `app/map/page.tsx` | Interactive map explorer |
| `/insights` | `app/insights/page.tsx` | Market insights dashboard |
| `/favorites` | `app/favorites/page.tsx` | Saved favorites page |
| `/properties` | `app/properties/page.tsx` | Property detail page wrapper |

---

## `/` - Home Page

**File**: `app/page.tsx`

**What it renders**:
- Hero section with "Welcome to Homelytics" heading
- Feature cards (Advanced Search, Smart Filters, Diverse Listings)
- Call-to-action buttons linking to `/houses`

**What data it fetches**:
- None (static content only)

**User flows that reach it**:
- Direct navigation to root URL
- Clicking site logo/brand from any page
- Initial page load

**Components used**:
- Next.js `Link` component for navigation

---

## `/houses` - Property Listings Page

**File**: `app/houses/page.tsx`

**What it renders**:
- Header with navigation (Home, Map, Insights, Favorites links)
- Search bar with debounced input
- Filter panel (`FilterPanel` component) with:
  - Price range (min/max)
  - Bedrooms selector
  - Bathrooms selector
  - Property type dropdown
  - Reset filters button
- Sort dropdown (newest, oldest, price-low, price-high, bedrooms, bathrooms, sqft)
- Results count display
- "See market insights for these filters" button (links to `/insights` with current filters)
- Property cards grid (`HouseCard` component) showing:
  - Property image
  - Address, city, state
  - Price, bedrooms, bathrooms, square feet
  - Favorite button
  - Quick view button
- Loading spinner during fetch
- Error message display
- Chat widget (`ChatWidget` component) - floating button

**What data it fetches**:
- **Endpoint**: `https://titus-duc.calisearch.org/api/get_properties.php`
- **Method**: GET
- **Query Parameters**:
  - `minPrice` (number)
  - `maxPrice` (number)
  - `bedrooms` (number, optional)
  - `bathrooms` (number, optional)
  - `propertyType` (string, optional, "all" means no filter)
  - `search` (string, optional, searches address/city/state/description)
  - `sortBy` (string, optional, default: "newest")
- **Response**: JSON array of property objects (max 500 results)
- **Triggers**: 
  - On mount (with URL params if present)
  - When filters change (debounced)
  - When search term changes (debounced 500ms)
  - When sort option changes

**User flows that reach it**:
- Clicking "Browse Properties" from home page
- Clicking "Houses" in navigation
- Direct URL navigation with query params (e.g., `/houses?minPrice=100000&maxPrice=500000`)
- Returning from other pages with filters preserved in URL

**State management**:
- React `useState` for filters, search term, sort, loading, error
- URL query params (`useSearchParams`) for filter persistence
- `useDebounce` hook for search input (500ms delay)

**Components used**:
- `FilterPanel` - filter controls
- `SearchBar` - search input
- `HouseCard` - property card display
- `FavoriteButton` - favorite toggle
- `PropertyQuickViewDrawer` - quick view modal
- `ChatWidget` - AI chat assistant
- `FavoritesLink` - favorites navigation link

---

## `/map` - Map Explorer Page

**File**: `app/map/page.tsx`

**What it renders**:
- Header with navigation
- Split view:
  - Left side: `MapList` component (scrollable list of properties)
  - Right side: `MapView` component (Leaflet map with markers)
- Property cards in list view
- Map markers (blue for properties, yellow for selected)
- Clicking marker opens quick view drawer
- Clicking list item centers map on property

**What data it fetches**:
- **Endpoint**: `https://titus-duc.calisearch.org/api/get_properties_bbox.php`
- **Method**: GET
- **Query Parameters**:
  - `minLat`, `maxLat`, `minLng`, `maxLng` (required, bounding box)
  - `city` (optional)
  - `zip` (optional)
  - `minPrice`, `maxPrice` (optional)
  - `minBeds`, `minBaths` (optional)
  - `limit` (optional, default: 200, max: 500)
  - `offset` (optional, default: 0)
- **Response**: JSON array of properties with minimal fields (id, lat, lng, address, price, beds, baths, sqft, photo, status, dom)
- **Triggers**:
  - On mount (with default bounding box)
  - When map viewport changes (`moveend` event, debounced)
  - When filters change

**User flows that reach it**:
- Clicking "Map" in navigation
- Direct URL navigation to `/map`

**State management**:
- React `useState` for properties list, selected property, loading, error
- Map bounds stored in Leaflet map instance
- Debounced map moveend handler (500ms) to prevent excessive API calls

**Components used**:
- `MapView` - Leaflet map component
- `MapList` - property list sidebar
- `PropertyQuickViewDrawer` - property detail drawer

---

## `/insights` - Market Insights Dashboard

**File**: `app/insights/page.tsx`

**What it renders**:
- Header with "Market Insights" title
- Subtitle showing active filters summary
- Four KPI cards:
  - Median list price
  - Median $/sqft
  - Average beds
  - Listing count analyzed
- Three charts:
  - Median price by ZIP (bar chart, top 15 ZIPs)
  - Price distribution histogram (buckets)
  - Average $/bedroom by ZIP (bar chart)
- Two to three insight callouts (generated from numbers)
- Filter form (mini-form):
  - City input
  - ZIP input
  - Min/max price inputs
  - Min beds input
  - Min baths input
  - Property type dropdown
  - Submit button
- "Apply different filters" section

**What data it fetches**:
- **Endpoint 1**: `https://titus-duc.calisearch.org/api/insights_summary.php`
  - Returns: `{ count, medianPrice, medianPricePerSqft, avgBeds, avgDom }`
- **Endpoint 2**: `https://titus-duc.calisearch.org/api/insights_median_by_zip.php`
  - Returns: Array of `{ zip, count, medianPrice, medianPricePerSqft }` (top 15 ZIPs)
- **Endpoint 3**: `https://titus-duc.calisearch.org/api/insights_price_histogram.php`
  - Returns: Array of `{ bucketMin, bucketMax, count }`
- **Query Parameters** (all three endpoints):
  - `city` (optional)
  - `zip` (optional)
  - `minPrice`, `maxPrice` (optional)
  - `minBeds`, `minBaths` (optional)
  - `propertyType` (optional)
- **Triggers**:
  - On mount (with URL params if present)
  - When filter form is submitted (updates URL and refetches)

**User flows that reach it**:
- Clicking "Insights" in navigation
- Clicking "See market insights for these filters" button from `/houses` page
- Direct URL navigation with query params (e.g., `/insights?city=San Diego&minPrice=300000`)

**State management**:
- React `useState` for summary, zipData, histogram, loading, error, filter form
- URL query params (`useSearchParams`) for filter persistence
- `parseFiltersFromQuery` helper to extract filters from URL

**Components used**:
- Native HTML/CSS for charts (no external charting library)
- `FavoritesLink` - favorites navigation link

---

## `/favorites` - Favorites Page

**File**: `app/favorites/page.tsx`

**What it renders**:
- Header with "My Favorites" title
- Search bar for filtering favorites
- Sort dropdown (newest, oldest, price-low, price-high)
- Compare mode toggle
- Export/Import buttons
- Grid/list of favorite properties with:
  - Property snapshot (address, city, price, beds, baths, sqft, photo)
  - Saved date
  - Note field (editable)
  - Tags (add/remove)
  - Remove button
  - Link to full property detail
- Empty state when no favorites
- Confirmation dialog for deletion

**What data it fetches**:
- **No API calls** - data comes from `localStorage`
- Uses `useFavorites` hook which:
  - Reads from `localStorage` key: `pnc:favorites:v1`
  - Stores array of `Favorite` objects with structure:
    ```typescript
    {
      id: string;
      savedAt: string; // ISO timestamp
      snapshot: {
        address: string;
        city: string;
        state: string;
        zip: string;
        price: number;
        beds: number;
        baths: number;
        sqft: number;
        photo: string;
      };
      note?: string;
      tags?: string[];
    }
    ```

**User flows that reach it**:
- Clicking "Favorites" in navigation
- Clicking favorites link/icon from any page
- Direct URL navigation to `/favorites`

**State management**:
- `useFavorites` hook manages localStorage read/write
- React `useState` for search term, sort, compare mode, editing state
- Cross-tab sync via `storage` event and custom `favoritesUpdated` event

**Components used**:
- `ConfirmDialog` - deletion confirmation
- `Image` (Next.js) - property photos
- `Link` (Next.js) - navigation to property details

---

## `/properties` - Property Detail Page

**File**: `app/properties/page.tsx`

**What it renders**:
- Wrapper page that uses `Suspense` for client-side data fetching
- Renders `PropertyDetailView` component
- Loading spinner fallback

**What data it fetches**:
- **Endpoint**: `https://titus-duc.calisearch.org/api/get_property.php`
- **Method**: GET
- **Query Parameters**:
  - `id` (required) - property ID (L_ListingID or L_DisplayId)
- **Response**: Single property object with full details (all fields from database)

**User flows that reach it**:
- Clicking property card from `/houses` page
- Clicking property from map list
- Clicking "View full details" from quick view drawer
- Direct URL navigation: `/properties?id=12345`

**Components used**:
- `PropertyDetailView` - main detail component
- `Suspense` (React) - loading boundary

---

## Property Detail View Component

**File**: `components/PropertyDetailView.tsx`

**What it renders** (when used in full page mode):
- Header with back button and favorites link
- Property image gallery (with thumbnail navigation)
- Property title and address
- Key stats (price, beds, baths, sqft, year built, parking)
- Description
- Features sections (interior, lot, community, etc.)
- Agent information (if available)
- Map (if coordinates available)
- Favorite button

**What data it fetches**:
- Same as `/properties` page (uses `get_property.php` endpoint)

**Props**:
- `propertyId: string | null` - property ID to fetch
- `showHeader?: boolean` - whether to show header (default: true)
- `showFullPageLink?: boolean` - whether to show link to full page (default: false)

**Used in**:
- `/properties` page (full page mode)
- `PropertyQuickViewDrawer` (drawer mode, `showHeader={false}`)

---

## Navigation Structure

All pages (except home) include a header with navigation links:
- **Home** → `/`
- **Houses** → `/houses`
- **Map** → `/map`
- **Insights** → `/insights`
- **Favorites** → `/favorites` (with count badge)

The header is rendered in each page component individually (not in a shared layout component).

---

## Dynamic Routes

The application does not use Next.js dynamic route segments (e.g., `[id]`). Instead:
- Property details use query parameters: `/properties?id=12345`
- All other routes are static

---

## Client-Side Routing

Next.js App Router handles client-side navigation:
- `Link` components use Next.js router
- Browser back/forward buttons work correctly
- URL changes trigger React re-renders
- Query params are read via `useSearchParams` hook

---

## Page Transitions

- `PageTransition` component (if used) provides fade animations
- No server-side page transitions (static export)

