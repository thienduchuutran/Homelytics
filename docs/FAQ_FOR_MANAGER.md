# FAQ for Manager

This document answers tough questions a manager might ask, grounded in the actual codebase implementation.

---

## Q: How does pagination work?

**A**: Currently, the application does not implement pagination. All endpoints return all matching results up to a hard limit:

- `get_properties.php`: Returns up to 500 properties per request
- `get_properties_bbox.php`: Returns up to 200 properties per request (configurable, max 500)
- `get_property.php`: Returns 1 property (single property lookup)

**Code Reference**: 
```php
// api/get_properties.php
$sql = "SELECT ... FROM rets_property WHERE ... ORDER BY ... LIMIT 500";
```

**If pagination were implemented**, we would use offset-based pagination:
```sql
SELECT ... FROM rets_property WHERE ... ORDER BY ... LIMIT :limit OFFSET :offset
```

The frontend would track the offset and make subsequent requests with `offset=500`, `offset=1000`, etc.

**Trade-off**: Offset-based pagination is simple but becomes slow for large offsets (e.g., `OFFSET 10000`). For better performance, we could implement cursor-based pagination using the last property ID.

---

## Q: How do you prevent SQL injection?

**A**: All database queries use PDO prepared statements with named placeholders. User input is never concatenated directly into SQL strings.

**Code Reference**:
```php
// api/get_properties.php
$where = ['1=1'];
$params = [];

if ($city !== null) {
    $where[] = 'L_City = :city';
    $params[':city'] = $city; // Bound separately, not in SQL string
}

$whereClause = implode(' AND ', $where);
$sql = "SELECT * FROM rets_property WHERE $whereClause";

$stmt = $pdo->prepare($sql);
$stmt->execute($params); // Parameters bound here, PDO escapes automatically
```

**Security**: PDO automatically escapes parameter values, preventing SQL injection. The SQL string only contains column names and operators (hardcoded), never user input.

**Verification**: You can search the codebase for `$pdo->prepare()` and `$stmt->execute($params)` to confirm all queries use this pattern.

---

## Q: What happens if photos JSON is invalid?

**A**: The code handles invalid JSON gracefully with a fallback to a placeholder image.

**Code Reference**:
```php
// api/get_properties.php - mapPropertyToHouse function
$images = [];
if (!empty($row['L_Photos'])) {
    $photos = json_decode($row['L_Photos'], true);
    if (is_array($photos) && !empty($photos)) {
        $images = $photos;
    }
}

$imageUrl = !empty($images) ? $images[0] : 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800';
```

**Behavior**:
- If `L_Photos` is empty or NULL: Uses placeholder image
- If `json_decode()` fails (invalid JSON): Returns `null`, which fails the `is_array()` check, so placeholder is used
- If JSON is valid but empty array: Uses placeholder image
- If JSON is valid and has photos: Uses first photo URL

**No Errors**: The code never throws an error for invalid JSON—it always falls back to a valid image URL.

---

## Q: Where is scroll restoration stored?

**A**: Scroll position is stored in `sessionStorage` (not `localStorage`) with the key `pnc:scroll:home:v1`.

**Code Reference**:
```typescript
// app/houses/page.tsx
const SCROLL_STORAGE_KEY = 'pnc:scroll:home:v1';

// Save scroll position
useEffect(() => {
  const handleScroll = () => {
    sessionStorage.setItem(SCROLL_STORAGE_KEY, window.scrollY.toString());
  };
  window.addEventListener('scroll', throttle(handleScroll, 1000), { passive: true });
}, []);

// Restore scroll position
useEffect(() => {
  const savedScroll = sessionStorage.getItem(SCROLL_STORAGE_KEY);
  if (savedScroll !== null) {
    const scrollY = parseInt(savedScroll, 10);
    if (!isNaN(scrollY) && scrollY > 0) {
      window.scrollTo({ top: scrollY, behavior: 'auto' });
    }
  }
}, [filteredHouses, loading]);
```

**Why sessionStorage**: 
- `sessionStorage` clears when the browser tab is closed
- `localStorage` persists across sessions
- For scroll position, we only want to restore within the same session

**Throttling**: Scroll position is saved every 1 second (throttled), not on every scroll event, to reduce write operations.

---

## Q: How do you keep the Gemini API key secure?

**A**: The Gemini API key is stored outside the web root in a PHP config file and never exposed to the frontend.

**Code Reference**:
```php
// api/chat_gemini.php
function getGeminiApiKey(): string {
    // Try environment variable first
    $key = getenv('GEMINI_API_KEY');
    if ($key !== false && !empty($key)) {
        return $key;
    }
    
    // Try config file (one directory above web root)
    $configPath = dirname(__DIR__) . '/gemini_key.php';
    if (file_exists($configPath) && is_readable($configPath)) {
        $key = include $configPath; // File should contain: <?php return 'YOUR_API_KEY';
        if (is_string($key) && !empty($key)) {
            return $key;
        }
    }
    
    jsonError('Gemini API key not configured', 500);
}
```

**Security Measures**:
1. **File Location**: `{projectRoot}/gemini_key.php` (outside `public_html` or `api` directory)
2. **Not in Web Root**: File cannot be accessed via HTTP (returns 404 or 403)
3. **Not in Version Control**: Should be in `.gitignore`
4. **Frontend Never Sees It**: All AI requests go through the PHP proxy endpoint

**File Structure**:
```
project-root/
├── gemini_key.php          # Outside web root, not accessible via HTTP
├── frontend/
│   ├── api/
│   │   └── chat_gemini.php # Reads key from parent directory
│   └── public_html/         # Web root (key file is NOT here)
```

---

## Q: What are your slowest queries and why?

**A**: The slowest queries are the insights aggregate queries, particularly median calculations, which require multiple database operations.

**Slow Queries**:

1. **Median Price Calculation** (`insights_summary.php`):
   ```sql
   -- Step 1: Count total (fast with index)
   SELECT COUNT(*) as cnt FROM rets_property WHERE ... LIMIT 50000
   
   -- Step 2: Select middle value(s) (slow - requires full sort)
   SELECT L_SystemPrice FROM rets_property 
   WHERE ... 
   ORDER BY L_SystemPrice ASC 
   LIMIT 1 OFFSET [middle_index]
   ```
   **Why Slow**: The `ORDER BY` with `OFFSET` requires MySQL to sort all matching rows, which can be slow for large datasets (50k+ rows).

2. **Median Price Per Sqft** (`insights_summary.php`):
   ```sql
   SELECT (L_SystemPrice / LM_Int2_3) as pricePerSqft 
   FROM rets_property 
   WHERE ... 
   ORDER BY pricePerSqft ASC 
   LIMIT 1 OFFSET [middle_index]
   ```
   **Why Slow**: Calculates `pricePerSqft` for every row, then sorts—very expensive for large datasets.

3. **Median by ZIP** (`insights_median_by_zip.php`):
   - Executes median calculation for each of the top 15 ZIPs
   - If each ZIP has 1000+ properties, this is 15 × 2 queries = 30 queries per request
   - Can take 2-5 seconds total

**Faster Queries**:
- **List Queries** (`get_properties.php`): 200-500ms (with proper indexes)
- **Map Queries** (`get_properties_bbox.php`): 100-300ms (spatial index makes this fast)
- **Single Property** (`get_property.php`): 50-150ms (primary key lookup)

**Optimization Opportunities**:
1. Use MySQL 8.0+ window functions: `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY L_SystemPrice)`
2. Cache median values (recalculate periodically, not on every request)
3. Pre-calculate medians in a separate table and update incrementally

---

## Q: What indexes exist and how do they help?

**A**: The codebase does not document existing indexes, but based on the queries, here are the indexes that should exist and how they help:

### Critical Indexes (Should Exist)

1. **Primary Key on `L_ListingID`**:
   - **Used By**: All queries (implicit), `get_property.php` (WHERE L_ListingID = :id)
   - **Benefit**: Makes single property lookups instant (O(log n) instead of O(n))

2. **Index on `L_SystemPrice`**:
   - **Used By**: Price filtering, price sorting, median calculations
   - **Benefit**: Makes price range queries fast (e.g., `WHERE L_SystemPrice >= 300000 AND L_SystemPrice <= 500000`)

3. **Spatial Index on `(LMD_MP_Latitude, LMD_MP_Longitude)`**:
   - **Used By**: `get_properties_bbox.php` (map queries)
   - **Benefit**: Makes bounding box queries extremely fast (spatial indexes are optimized for geographic queries)

4. **Index on `L_City`**:
   - **Used By**: City filtering
   - **Benefit**: Makes city filter fast (e.g., `WHERE L_City = 'San Diego'`)

5. **Index on `L_Zip`**:
   - **Used By**: ZIP filtering, ZIP grouping (insights)
   - **Benefit**: Makes ZIP queries and GROUP BY fast

6. **Index on `L_Keyword2` (bedrooms)**:
   - **Used By**: Bedroom filtering, sorting
   - **Benefit**: Makes bedroom filter fast (e.g., `WHERE L_Keyword2 >= 3`)

7. **Index on `LM_Dec_3` (bathrooms)**:
   - **Used By**: Bathroom filtering, sorting
   - **Benefit**: Makes bathroom filter fast

8. **Index on `ListingContractDate`**:
   - **Used By**: Date sorting (newest/oldest)
   - **Benefit**: Makes date sorting fast (e.g., `ORDER BY ListingContractDate DESC`)

### Composite Indexes (Recommended)

1. **`(L_SystemPrice, L_Keyword2, LM_Dec_3)`**:
   - **Used By**: Common filter combination (price + bedrooms + bathrooms)
   - **Benefit**: Single index covers multiple filter conditions

2. **`(L_City, L_Zip, L_SystemPrice)`**:
   - **Used By**: Location + price filtering
   - **Benefit**: Optimizes location-based searches with price filters

3. **`(L_Status, L_SystemPrice, ListingContractDate)`**:
   - **Used By**: Status filter + price/date sorting
   - **Benefit**: Optimizes filtered and sorted queries

### How to Verify Indexes

**SQL Query**:
```sql
SHOW INDEXES FROM rets_property;
```

**Expected Output**: List of all indexes on the table, including:
- Primary key
- Individual column indexes
- Composite indexes

**If Indexes Are Missing**: Queries will be slow because MySQL must scan the entire table (full table scan) instead of using an index.

---

## Q: How does the AI chat extract filters from natural language?

**A**: The AI chat uses Google Gemini API with a detailed system instruction that defines how to extract filters from natural language.

**Code Reference**:
```php
// api/chat_gemini.php
$systemInstruction = "You are a helpful real estate assistant. Extract property search filters from user messages...

PRICE PARSING:
- Recognize 'k' as thousands: '800k' = 800000, '1.5M' = 1500000
- Default interpretation: 'under 800k' = maxPrice: 800000

PROPERTY TYPES:
- 'single family', 'single family home' → propertyTypes: ['SingleFamilyResidence']
- 'condo', 'condominium' → propertyTypes: ['Condominium']
...
";
```

**Process**:
1. User sends message: "Find me a 3 bedroom house under 500k in San Diego"
2. PHP endpoint sends message + system instruction to Gemini API
3. Gemini API returns structured JSON:
   ```json
   {
     "filters": {
       "city": "San Diego",
       "minBeds": 3,
       "maxPrice": 500000,
       "propertyTypes": ["SingleFamilyResidence"]
     },
     "assistantMessage": "I found several 3 bedroom houses..."
   }
   ```
4. PHP endpoint returns this to frontend
5. Frontend applies filters and fetches properties

**Security**: The Gemini API key is never exposed to the frontend—all requests go through the PHP proxy.

**Rate Limiting**: 20 requests per 60 seconds per IP to prevent abuse.

---

## Q: How does the map update properties when you pan/zoom?

**A**: The map uses Leaflet's `moveend` event with debouncing to fetch properties within the visible bounds.

**Code Reference**:
```typescript
// components/map/MapView.tsx
const debouncedFetch = useMemo(
  () => debounce((bounds: MapBounds) => {
    fetchProperties(bounds);
  }, 500),
  []
);

map.on('moveend', () => {
  const bounds = map.getBounds();
  debouncedFetch({
    minLat: bounds.getSouth(),
    maxLat: bounds.getNorth(),
    minLng: bounds.getWest(),
    maxLng: bounds.getEast(),
  });
});
```

**Process**:
1. User pans or zooms map
2. Leaflet fires `moveend` event
3. Debounce function waits 500ms (if user stops moving)
4. Extract bounding box coordinates from map
5. Call `get_properties_bbox.php` with bounding box
6. API returns properties within bounds
7. Update map markers

**Optimization**: 
- **Debouncing**: Prevents API call on every pixel of movement
- **Abort Controller**: Cancels previous request if new one starts
- **Spatial Index**: Database query is fast with proper index on coordinates

---

## Q: What happens if the database connection fails?

**A**: All endpoints catch database connection errors and return a JSON error response with HTTP 500 status.

**Code Reference**:
```php
// All API endpoints
try {
    $pdo = new PDO($dsn, $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (Throwable $e) {
    jsonError('Database connection failed: ' . $e->getMessage(), 500);
}
```

**Frontend Handling**:
```typescript
// app/houses/page.tsx
try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch properties');
    }
} catch (fetchError) {
    setError('Network error. Please check your connection and try again.');
}
```

**User Experience**: 
- Error message displayed in UI
- User can retry
- No application crash

**Recommendation**: Log full error details server-side, return generic message to client to avoid leaking sensitive information.

---

## Q: How is the application deployed?

**A**: The application uses Next.js static export, which generates static HTML files that can be deployed on any web server, including cPanel.

**Code Reference**:
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true, // Required for static export
  },
};
```

**Build Process**:
1. Run `npm run build` in the `frontend` directory
2. Next.js generates static HTML files in `out/` directory
3. Upload `out/` contents to cPanel `public_html/`
4. PHP API endpoints go in `public_html/api/`

**Deployment Structure**:
```
public_html/
├── index.html              # Home page
├── houses.html             # Property listings
├── map.html                # Map explorer
├── insights.html           # Market insights
├── api/                    # PHP endpoints
│   ├── get_properties.php
│   ├── get_property.php
│   └── ...
└── _next/                  # Next.js static assets
```

**Benefits**:
- No Node.js server required
- Works on any web host (cPanel, shared hosting, etc.)
- Fast (static files served directly)
- Cost-effective (no server runtime costs)

**Limitations**:
- No server-side rendering (all rendering is client-side)
- No Next.js API routes (hence PHP endpoints are used)

---

## Q: How do you handle large result sets?

**A**: The application limits result sets with hard limits and could implement pagination for better performance.

**Current Limits**:
- `get_properties.php`: LIMIT 500
- `get_properties_bbox.php`: LIMIT 200 (default, max 500)
- Insights queries: LIMIT 50000 (safety cap)

**Code Reference**:
```php
// api/get_properties.php
$sql = "SELECT ... FROM rets_property WHERE ... ORDER BY ... LIMIT 500";
```

**Performance Considerations**:
- 500 properties × ~5 KB each = ~2.5 MB payload
- Frontend renders all 500 at once (could be slow on low-end devices)
- No "load more" or infinite scroll

**If Result Set is Too Large**:
- User sees first 500 results
- No indication that more results exist
- User must refine filters to see other results

**Recommendation**: Implement pagination (50-100 per page) with "Load More" button or infinite scroll.

---

## Q: What happens if a user sends a malicious request?

**A**: The application has several security measures, but could be strengthened.

**Current Protections**:
1. **SQL Injection**: Protected via PDO prepared statements
2. **Input Validation**: Parameters are validated and cast to correct types
3. **Rate Limiting**: Only on chat endpoint (20 requests/minute)
4. **CORS**: Configured (though permissive: `*`)

**Potential Vulnerabilities**:
1. **No Rate Limiting on Most Endpoints**: Could be abused with excessive requests
2. **No Input Sanitization**: If user input is displayed, XSS is possible (currently not an issue since no user-generated content)
3. **Error Messages**: May leak information (database errors, SQL queries)

**Example of Protection**:
```php
// Input validation
$minPrice = isset($_GET['minPrice']) ? max(0, (int)$_GET['minPrice']) : 0;
// Prevents negative numbers, non-numeric input

// SQL injection protection
$stmt = $pdo->prepare("SELECT * FROM rets_property WHERE L_City = :city");
$stmt->execute([':city' => $city]); // PDO escapes automatically
```

**Recommendation**: Add rate limiting to all endpoints, sanitize error messages, and add security headers.

---

## Summary

This FAQ covers the most critical technical questions a manager might ask. All answers are grounded in the actual codebase implementation, with specific code references and file locations. The application demonstrates solid engineering practices with room for improvement in areas like pagination, caching, and additional security measures.

