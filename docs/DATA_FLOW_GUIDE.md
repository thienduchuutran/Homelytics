# Data Flow Guide

This document walks through the complete data flow for key user actions, showing sequence steps and where state is stored.

---

## 1. Home Search → Fetch List → Render Cards

### User Action
User navigates to `/houses` page or applies filters on the houses page.

### Sequence Steps

1. **Page Load** (`app/houses/page.tsx`)
   - Component mounts
   - `useSearchParams()` reads URL query parameters
   - Filters initialized from URL params (or defaults)
   - `useState` stores: `houses`, `loading`, `error`, `filters`, `searchTerm`, `sortBy`

2. **URL Params Parsing**
   - `useSearchParams()` extracts: `minPrice`, `maxPrice`, `bedrooms`, `bathrooms`, `propertyType`, `search`, `sortBy`
   - Filters state updated from URL params

3. **Debounced Search** (if search term exists)
   - `useDebounce` hook delays search term updates by 500ms
   - Prevents excessive API calls while typing

4. **API Call** (`useEffect` triggered by filter/search/sort changes)
   ```typescript
   const apiUrl = `https://titus-duc.calisearch.org/api/get_properties.php?${params.toString()}`;
   const response = await fetch(apiUrl, {
     headers: { 'Accept': 'application/json' },
     mode: 'cors',
     credentials: 'omit',
   });
   ```

5. **PHP Endpoint Processing** (`api/get_properties.php`)
   - Parses query parameters
   - Builds WHERE clause with PDO prepared statements
   - Executes SQL query: `SELECT ... FROM rets_property WHERE ... ORDER BY ... LIMIT 500`
   - Maps database rows to House interface format
   - Returns JSON response

6. **Response Processing**
   - `response.json()` parses JSON
   - Extracts `data` array from response
   - Updates `houses` state with array of House objects

7. **Render**
   - `HouseCard` components render for each house
   - Each card displays: image, address, price, beds, baths, sqft, favorite button, quick view button

### State Storage
- **React State**: `houses`, `loading`, `error`, `filters`, `searchTerm`, `sortBy`
- **URL Query Params**: Filters persisted in URL (e.g., `/houses?minPrice=300000&maxPrice=500000`)
- **Session Storage**: Scroll position saved to `sessionStorage` key `pnc:scroll:home:v1`

### Data Transformation
- Database columns → House interface (see `mapPropertyToHouse` function in PHP)
- `L_Photos` JSON → `imageUrl` (first photo)
- `L_Status` → `status` ("for-sale" or "for-rent")
- `L_Keyword2` → `bedrooms` (integer)
- `LM_Dec_3` → `bathrooms` (float)

---

## 2. Pagination → Next Page → Fetch

### User Action
User scrolls to bottom of results list (or clicks "Load More" if implemented).

### Current Implementation
**Note**: The current implementation does NOT have pagination. The API returns up to 500 results per request, and there is no "next page" functionality. All results are displayed at once.

### If Pagination Were Implemented

**Sequence Steps**:
1. User scrolls to bottom
2. `useEffect` detects scroll position
3. Increment `offset` state (e.g., `offset += 500`)
4. Append `offset` to API URL: `?offset=500&limit=500`
5. Fetch next page
6. Append new results to existing `houses` array
7. Render additional cards

**State Storage**:
- `offset` in React state
- Could persist in URL: `/houses?offset=500`

---

## 3. Open Property Detail → Fetch by ID → Render

### User Action
User clicks property card or "View Details" button.

### Sequence Steps

1. **Navigation** (`HouseCard` component)
   - Click handler: `router.push(`/properties?id=${house.id}`)`
   - Or: Opens `PropertyQuickViewDrawer` (drawer mode)

2. **Page Load** (`app/properties/page.tsx`)
   - `Suspense` boundary wraps `PropertyDetailContent`
   - `useSearchParams()` extracts `id` from URL

3. **Component Render** (`components/PropertyDetailView.tsx`)
   - `useEffect` triggered by `propertyId` change
   - Sets `loading = true`

4. **API Call**
   ```typescript
   const response = await fetch(
     `https://titus-duc.calisearch.org/api/get_property.php?id=${propertyId}`,
     { headers: { 'Accept': 'application/json' }, mode: 'cors' }
   );
   ```

5. **PHP Endpoint Processing** (`api/get_property.php`)
   - Validates `id` parameter
   - Executes SQL: `SELECT ... FROM rets_property WHERE L_ListingID = :id OR L_DisplayId = :id LIMIT 1`
   - Maps all database columns to PropertyDetail interface
   - Returns single property object

6. **Response Processing**
   - `response.json()` parses JSON
   - Updates `property` state with PropertyDetail object
   - Sets `loading = false`

7. **Render**
   - Image gallery (with thumbnail navigation)
   - Property title, address, key stats
   - Description, features sections
   - Agent information
   - Map (if coordinates available)

### State Storage
- **React State**: `property`, `loading`, `error`, `selectedImageIndex`
- **URL Query Param**: `id` in URL (`/properties?id=12345`)

### Data Transformation
- All database columns mapped to PropertyDetail interface
- `L_Photos` JSON → `images` array (full gallery)
- Agent name constructed from `ListAgentFullName` or `LA1_UserFirstName + LA1_UserLastName`
- Coordinates used for Leaflet map (if available)

---

## 4. Quick View Drawer → Fetch → Close

### User Action
User clicks "Quick View" button on property card.

### Sequence Steps

1. **Button Click** (`HouseCard` component)
   - `onClick` handler: `setQuickViewId(house.id)`
   - Updates parent component state

2. **Drawer Open** (`PropertyQuickViewDrawer` component)
   - `open={quickViewId !== null}` prop triggers render
   - `PropertyDetailView` component rendered inside drawer
   - `showHeader={false}` (no header in drawer)
   - `showFullPageLink={true}` (shows link to full page)

3. **Data Fetching**
   - Same as "Open Property Detail" flow (uses `get_property.php`)

4. **Drawer Close**
   - User clicks close button, overlay, or presses Escape
   - `onClose()` handler: `setQuickViewId(null)`
   - Drawer unmounts

### State Storage
- **React State**: `quickViewId` in parent component (e.g., `HousesPage`)
- **No URL Change**: Drawer does not update URL (stays on same page)

### Special Handling
- Body scroll locked when drawer open: `document.body.style.overflow = 'hidden'`
- Focus management: Close button receives focus when drawer opens
- Click outside closes drawer (overlay click handler)

---

## 5. Favorites → localStorage Format + Read/Write

### User Action
User clicks favorite button (heart icon) on property card.

### Sequence Steps

1. **Button Click** (`FavoriteButton` component)
   - `onClick` handler: `toggle(favorite)` from `useFavorites` hook

2. **Hook Processing** (`app/lib/useFavorites.ts`)
   - `toggle()` checks if favorite exists: `isSaved(fav.id)`
   - If exists: calls `remove(id)`
   - If not exists: calls `add(favorite)`

3. **Add Favorite**
   - Creates `Favorite` object:
     ```typescript
     {
       id: house.id,
       savedAt: new Date().toISOString(),
       snapshot: {
         address: house.address,
         city: house.city,
         state: house.state,
         zip: house.zipCode,
         price: house.price,
         beds: house.bedrooms,
         baths: house.bathrooms,
         sqft: house.squareFeet,
         photo: house.imageUrl,
       },
       note: undefined,
       tags: undefined,
     }
     ```
   - Appends to `favorites` array
   - Calls `saveFavorites(updatedFavorites)`

4. **Save to localStorage**
   ```typescript
   localStorage.setItem('pnc:favorites:v1', JSON.stringify(favorites));
   ```

5. **Cross-Tab Sync**
   - Dispatches custom event: `window.dispatchEvent(new CustomEvent('favoritesUpdated', { detail: favorites }))`
   - Other tabs listen for `storage` event and `favoritesUpdated` event

6. **Remove Favorite**
   - Filters out favorite from array: `favorites.filter(f => f.id !== id)`
   - Saves updated array to localStorage

### State Storage
- **localStorage Key**: `pnc:favorites:v1`
- **React State**: `favorites` array in `useFavorites` hook
- **Format**: JSON array of `Favorite` objects

### Data Structure
```typescript
interface Favorite {
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
  note?: string; // Max 300 chars
  tags?: string[]; // Max 10 tags
}
```

### Read Flow
1. Component mounts
2. `useFavorites` hook initializes
3. `loadFavorites()` reads from localStorage
4. `JSON.parse()` converts string to array
5. `setFavorites()` updates React state
6. Components re-render with favorites data

### Write Flow
1. User action (add/remove/update)
2. Hook method updates favorites array
3. `saveFavorites()` writes to localStorage
4. Custom event dispatched for cross-tab sync
5. React state updated

---

## 6. Chatbot → Widget → /api/chat_gemini.php → Gemini → Filters → Property Search

### User Action
User opens chat widget and sends a message like "Find me a 3 bedroom house under 500k in San Diego".

### Sequence Steps

1. **Chat Widget Open** (`components/chat/ChatWidget.tsx`)
   - User clicks floating chat button
   - `setIsOpen(true)`
   - `ChatPanel` component renders

2. **User Message** (`components/chat/ChatPanel.tsx`)
   - User types message in input field
   - Clicks send or presses Enter
   - Message added to `messages` state array

3. **API Call to Gemini Proxy**
   ```typescript
   const response = await fetch('https://titus-duc.calisearch.org/api/chat_gemini.php', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       message: userMessage,
       context: {
         history: messages.slice(-10), // Last 10 messages
         filters: currentFilters, // Existing filters
       },
     }),
   });
   ```

4. **PHP Endpoint Processing** (`api/chat_gemini.php`)
   - Validates request (POST, JSON, message length)
   - Rate limiting check (20 requests per 60 seconds per IP)
   - Reads Gemini API key from config file or environment
   - Builds Gemini API request with:
     - System instruction (filter extraction rules)
     - Chat history (last 5 messages)
     - Current user message
     - JSON response schema
   - Calls Gemini API: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}`
   - Parses JSON response from Gemini
   - Returns: `{ filters: {...}, assistantMessage: "..." }`

5. **Response Processing**
   - `response.json()` parses JSON
   - Extracts `filters` and `assistantMessage`
   - Updates `messages` state with assistant response
   - Updates `filters` state with extracted filters

6. **Property Search** (if filters changed)
   - `useEffect` triggered by `filters` change
   - Calls `fetchProperties(filters)` function
   - Makes API call to `get_properties.php` with filters
   - Updates `properties` state with results

7. **Display Results**
   - Properties displayed in chat panel
   - User can click property to open quick view

### State Storage
- **React State**: `messages`, `filters`, `properties`, `loading` in `ChatPanel`
- **No localStorage**: Chat history not persisted (cleared on page refresh)
- **Rate Limiting**: Stored in temp files (`sys_get_temp_dir()/gemini_rate_{md5(ip)}.txt`)

### Data Transformation
- Natural language → Structured filters (via Gemini AI)
- Filters → SQL WHERE clause (in `get_properties.php`)
- Properties → Display in chat panel

### Example Filter Extraction
**User Input**: "Find me a 3 bedroom house under 500k in San Diego"

**Gemini Output**:
```json
{
  "filters": {
    "city": "San Diego",
    "minBeds": 3,
    "maxPrice": 500000,
    "propertyTypes": ["SingleFamilyResidence"]
  },
  "assistantMessage": "I found several 3 bedroom houses in San Diego under $500,000..."
}
```

---

## 7. Map Flow: Viewport Bounds → bbox Endpoint → Markers

### User Action
User navigates to `/map` page or pans/zooms the map.

### Sequence Steps

1. **Page Load** (`app/map/page.tsx`)
   - Component mounts
   - `MapView` component renders (dynamically imported, no SSR)
   - Leaflet map initializes with default center/zoom

2. **Initial Bounds**
   - Map fires `moveend` event after initial load
   - `MapView` component gets bounds: `map.getBounds()`
   - Extracts: `minLat`, `maxLat`, `minLng`, `maxLng`

3. **API Call** (`fetchProperties` function)
   ```typescript
   const params = new URLSearchParams();
   params.append('minLat', bounds.minLat.toString());
   params.append('maxLat', bounds.maxLat.toString());
   params.append('minLng', bounds.minLng.toString());
   params.append('maxLng', bounds.maxLng.toString());
   params.append('limit', '200');
   
   const response = await fetch(
     `https://titus-duc.calisearch.org/api/get_properties_bbox.php?${params.toString()}`,
     { headers: { 'Accept': 'application/json' }, mode: 'cors' }
   );
   ```

4. **PHP Endpoint Processing** (`api/get_properties_bbox.php`)
   - Validates bounding box parameters
   - Builds WHERE clause with spatial filters:
     ```sql
     WHERE LMD_MP_Latitude >= :minLat 
       AND LMD_MP_Latitude <= :maxLat
       AND LMD_MP_Longitude >= :minLng 
       AND LMD_MP_Longitude <= :maxLng
     ```
   - Executes SQL query
   - Returns minimal fields: id, lat, lng, address, price, beds, baths, sqft, photo, status

5. **Response Processing**
   - `response.json()` parses JSON array
   - Updates `properties` state

6. **Marker Creation**
   - `MapView` component iterates over properties
   - Creates Leaflet markers for each property
   - Blue marker for normal properties
   - Yellow marker for selected property
   - Click handler: Opens quick view drawer

7. **Map Pan/Zoom** (debounced)
   - User pans or zooms map
   - `moveend` event fires
   - Debounced handler (500ms delay) prevents excessive API calls
   - New bounds extracted
   - New API call made
   - Old markers removed, new markers added

### State Storage
- **React State**: `properties`, `selectedPropertyId`, `loading`, `error` in `MapPage`
- **Leaflet Map Instance**: Bounds stored in map object (not React state)
- **No URL Persistence**: Map bounds not stored in URL (could be added)

### Data Transformation
- Map bounds (Leaflet LatLngBounds) → Query parameters (minLat, maxLat, minLng, maxLng)
- Database rows → MapProperty interface (minimal fields)
- `L_Photos` JSON → `photo` (first photo URL)

### Performance Optimizations
- **Debouncing**: Map moveend events debounced by 500ms
- **Abort Controller**: Previous API requests cancelled when new request starts
- **Limit**: Max 200 properties per request (configurable, max 500)
- **Minimal Fields**: Only essential fields selected (reduces payload size)

---

## State Management Summary

### React State (Component-Level)
- **Pages**: `houses`, `loading`, `error`, `filters`, `searchTerm`, `sortBy`
- **Map**: `properties`, `selectedPropertyId`, `currentBounds`
- **Favorites**: Managed by `useFavorites` hook
- **Chat**: `messages`, `filters`, `properties`

### URL Query Parameters
- **Houses Page**: `minPrice`, `maxPrice`, `bedrooms`, `bathrooms`, `propertyType`, `search`, `sortBy`
- **Insights Page**: `city`, `zip`, `minPrice`, `maxPrice`, `minBeds`, `minBaths`, `propertyType`
- **Properties Page**: `id`
- **Map Page**: None (could add bounds persistence)

### localStorage
- **Favorites**: `pnc:favorites:v1` (JSON array)
- **Scroll Position**: `pnc:scroll:home:v1` (sessionStorage, not localStorage)

### Session Storage
- **Scroll Position**: `pnc:scroll:home:v1` (scroll Y position as integer)

### Server-Side State
- **Rate Limiting**: Temp files in `sys_get_temp_dir()`
- **OAuth Tokens**: `token` table in database
- **Sync Offset**: `app_state` table in database

---

## Error Handling Flow

### Network Errors
1. `fetch()` throws error (CORS, connection refused, etc.)
2. Catch block sets `error` state
3. UI displays error message
4. User can retry

### API Errors
1. Response status !== 200
2. `response.json()` parses error object: `{ error: "..." }`
3. `error` state updated
4. UI displays error message

### Invalid Data
1. JSON parsing fails → `error` state
2. Missing required fields → Fallback values or error
3. Invalid photo JSON → Placeholder image
4. Invalid coordinates → Property excluded from map

---

## Caching Strategy

**Current Implementation**: No caching implemented.

**Potential Improvements**:
- Cache API responses in browser (service worker, IndexedDB)
- Cache Gemini responses (same query = same filters)
- Cache map markers (same bounds = same properties)
- Cache property details (by ID)

**Trade-offs**:
- Fresh data vs. performance
- Storage limits
- Cache invalidation complexity

