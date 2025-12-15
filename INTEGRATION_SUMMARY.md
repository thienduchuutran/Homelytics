# Property Search Integration Summary

## Overview
This document summarizes the integration of the PHP backend API (`get_properties.php`) with the Next.js frontend, replacing mock data with live database queries.

## Changes Made

### 1. Frontend Changes (`frontend/app/houses/page.tsx`)

#### Fixed API URL Path
- **Before**: `../api/get_properties.php` (relative path, unreliable in static export)
- **After**: `/api/get_properties.php` (absolute path, works correctly on deployed domain)
- **Why**: Static Next.js exports require absolute paths for API calls to work correctly on the server.

#### Added Search Debouncing
- Added 500ms debounce delay for search input
- Reduces API calls while user is typing
- Improves performance and reduces server load

#### Enhanced Error Handling
- Better handling of non-array responses from API
- Clearer error messages for users
- Houses array cleared on error to prevent stale data display

### 2. Backend Changes (`frontend/api/get_properties.php`)

#### Database Configuration
- ✅ Already correctly configured to use `boxgra6_duc` database
- ✅ Credentials: `boxgra6_duc` / `123456` / `localhost`
- ✅ Uses PDO with prepared statements (SQL injection safe)

#### Improved Search Parameter Handling
- **Before**: Single `:search` parameter reused 4 times in LIKE clauses
- **After**: Separate placeholders (`:search1`, `:search2`, `:search3`, `:search4`)
- **Why**: More explicit and avoids potential PDO parameter binding edge cases

#### Enhanced Input Validation
- Added `max()` checks to ensure minPrice ≤ maxPrice
- Added validation for bedrooms/bathrooms (must be ≥ 0)
- Added `trim()` for string inputs to prevent whitespace issues

#### Improved JSON Response
- Added explicit charset header
- Added JSON encoding flags for better Unicode handling
- Consistent error response format

## Data Flow

```
┌─────────────────┐
│   MySQL Database│
│  (boxgra6_duc)  │
│  rets_property  │
└────────┬────────┘
         │
         │ SQL Query (SELECT with filters)
         │
         ▼
┌─────────────────┐
│ get_properties.php│
│  (PHP Endpoint)  │
│                  │
│ 1. Parse GET params│
│ 2. Build WHERE clause│
│ 3. Execute query │
│ 4. Map DB rows → House objects│
│ 5. Return JSON array│
└────────┬────────┘
         │
         │ HTTP GET /api/get_properties.php?...
         │ JSON: House[]
         │
         ▼
┌─────────────────┐
│  Next.js Frontend│
│  (Static Export) │
│                  │
│ 1. User interacts│
│    (filters/search)│
│ 2. useEffect triggers│
│ 3. fetch() to PHP│
│ 4. Parse JSON response│
│ 5. Update React state│
│ 6. Render HouseCard[]│
└─────────────────┘
```

## API Endpoint Details

### URL
```
GET /api/get_properties.php
```

### Query Parameters
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `minPrice` | integer | Minimum price filter | `100000` |
| `maxPrice` | integer | Maximum price filter | `500000` |
| `bedrooms` | integer | Minimum bedrooms (>=) | `3` |
| `bathrooms` | float | Minimum bathrooms (>=) | `2` |
| `propertyType` | string | Property type filter | `house`, `condo`, `townhouse`, `apartment` |
| `status` | string | Listing status | `for-sale`, `for-rent` |
| `search` | string | Free text search (address/city/state/remarks) | `San Francisco` |

### Response Format
```json
[
  {
    "id": "12345",
    "title": "Single Family at 123 Main St",
    "address": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94102",
    "price": 850000,
    "bedrooms": 4,
    "bathrooms": 3,
    "squareFeet": 2500,
    "propertyType": "house",
    "status": "for-sale",
    "description": "Beautiful home...",
    "imageUrl": "https://...",
    "yearBuilt": 2015,
    "parking": 2,
    "amenities": ["Pool", "Garage"],
    "listingDate": "2025-01-15"
  },
  ...
]
```

### Error Response Format
```json
{
  "error": "Database connection failed: ..."
}
```

## SQL Query Structure

The PHP endpoint builds a dynamic WHERE clause based on filters:

```sql
SELECT 
  L_ListingID,
  L_DisplayId,
  L_Address,
  L_City,
  L_State,
  L_Zip,
  L_SystemPrice,
  L_Keyword2 as bedrooms,
  LM_Dec_3 as bathrooms,
  LM_Int2_3 as squareFeet,
  L_Class as propertyType,
  L_Status,
  L_Remarks as description,
  L_Photos,
  YearBuilt,
  L_Keyword5 as parking,
  ListingContractDate,
  L_Type_ as propertySubType
FROM rets_property 
WHERE [dynamic filters]
ORDER BY ListingContractDate DESC, L_ListingID DESC
LIMIT 500
```

### Filter Mappings

#### Property Type (Frontend → Database)
- `house` → `Residential`
- `condo` → `Condo/Co-op`
- `townhouse` → `Townhouse`
- `apartment` → `Apartment`

#### Status (Frontend → Database)
- `for-sale` → `Active`, `Pending`, `Sold`
- `for-rent` → `Leased`, `Rental`

## Frontend State Management

The `houses/page.tsx` component manages:
- **`houses`**: Array of `House` objects from API
- **`loading`**: Boolean for loading spinner
- **`error`**: String for error messages
- **`searchTerm`**: Raw search input (debounced to `debouncedSearchTerm`)
- **`filters`**: `FilterOptions` object with all filter values
- **`showFilters`**: Boolean to toggle filter panel visibility

## Deployment Notes

### ✅ Ready for Deployment
- All paths use absolute URLs (`/api/...`)
- No Node.js runtime dependencies
- Works with static Next.js export
- CORS headers configured in PHP

### ⚠️ Pre-Deployment Checklist
1. **Verify PHP file location**: Ensure `get_properties.php` is in `/api/` folder on server
2. **Database connection**: Test that PHP can connect to `boxgra6_duc` database
3. **File permissions**: Ensure PHP files are executable (typically `644` or `755`)
4. **Test API endpoint**: Visit `https://titus-duc.calisearch.org/api/get_properties.php` directly to verify it returns JSON
5. **Check CORS**: If testing from different domain, verify CORS headers work

### 🔍 Testing the Integration

1. **Test API directly**:
   ```bash
   curl "https://titus-duc.calisearch.org/api/get_properties.php?bedrooms=3&minPrice=100000"
   ```

2. **Test from browser console**:
   ```javascript
   fetch('/api/get_properties.php?bedrooms=3')
     .then(r => r.json())
     .then(console.log)
   ```

3. **Test filters in UI**:
   - Open `/houses` page
   - Apply filters (price, bedrooms, etc.)
   - Verify results update
   - Check browser Network tab for API calls

## Future Enhancements (Designed For)

The current implementation is structured to easily add:

### 1. Pagination
- **Backend**: Add `page` and `perPage` params, return `{total, page, perPage, data}`
- **Frontend**: Add pagination controls, update `useEffect` dependencies

### 2. Sorting
- **Backend**: Add `sortBy` and `sortOrder` params, modify `ORDER BY` clause
- **Frontend**: Add sort dropdown, update API call

### 3. Property Detail Page
- **Backend**: Create `get_property.php?id=...` endpoint
- **Frontend**: Add `/houses/[id]` route, fetch single property

### 4. Saved Favorites
- **Frontend**: Use `localStorage` to store favorite IDs
- **Frontend**: Add favorite toggle button on `HouseCard`
- **Frontend**: Filter/sort by favorites

## Troubleshooting

### Issue: "Failed to fetch properties"
- **Check**: PHP file exists at `/api/get_properties.php`
- **Check**: Database connection credentials
- **Check**: Browser console for CORS errors
- **Check**: Server error logs

### Issue: No results returned
- **Check**: Database has data in `rets_property` table
- **Check**: Filters aren't too restrictive
- **Check**: SQL query in PHP logs (if enabled)

### Issue: Images not loading
- **Check**: `L_Photos` JSON is valid in database
- **Check**: Image URLs are accessible (not blocked by CORS)
- **Check**: Default Unsplash fallback URL is working

## Code Quality Notes

- ✅ TypeScript types match PHP response
- ✅ Error handling on both frontend and backend
- ✅ SQL injection protection (PDO prepared statements)
- ✅ Input validation and sanitization
- ✅ Debouncing to reduce API calls
- ✅ Loading and error states in UI
- ✅ Responsive design maintained

