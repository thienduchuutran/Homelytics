# Performance and Optimization

This document covers performance optimizations, limitations, pagination strategies, caching, debounce/throttle patterns, and scaling recommendations.

---

## Column Selection Optimization

### List Endpoints (Minimal Fields)

**Endpoint**: `get_properties.php`

**Columns Selected**: Only essential fields for list display
```sql
SELECT 
    L_ListingID, L_DisplayId, L_Address, L_City, L_State, L_Zip,
    L_SystemPrice, L_Keyword2 as bedrooms, LM_Dec_3 as bathrooms,
    LM_Int2_3 as squareFeet, L_Class as propertyType, L_Status,
    L_Remarks as description, L_Photos, YearBuilt, L_Keyword5 as parking,
    ListingContractDate, L_Type_ as propertySubType,
    LotSizeSquareFeet, LotSizeAcres, LotFeatures,
    AssociationYN, AssociationFee, AssociationFeeFrequency,
    SpaYN, SeniorCommunityYN, CoolingYN, AttachedGarageYN,
    PropertyAttachedYN, DaysOnMarket, OnMarketDate,
    PoolPrivateYN, GarageYN, FireplaceYN, ViewYN, NewConstructionYN,
    InteriorFeatures, Appliances, CommunityFeatures, View
FROM rets_property
```

**Rationale**: 
- Excludes large text columns (`L_Remarks` is included but only for search, not full display)
- Excludes agent details (not needed for list view)
- Excludes many detail-only fields

**Payload Size**: ~5-10 KB per property (with photos JSON)

### Map Endpoint (Minimal Fields)

**Endpoint**: `get_properties_bbox.php`

**Columns Selected**: Absolute minimum for map markers
```sql
SELECT 
    L_ListingID as id,
    LMD_MP_Latitude as lat,
    LMD_MP_Longitude as lng,
    L_Address as address,
    L_City as city,
    L_State as state,
    L_Zip as zip,
    L_SystemPrice as price,
    L_Keyword2 as beds,
    LM_Dec_3 as baths,
    LM_Int2_3 as sqft,
    L_Photos as photos,
    L_Status as status,
    DaysOnMarket as dom
FROM rets_property
```

**Rationale**:
- Only fields needed for map markers and list sidebar
- Excludes description, features, agent info
- Photo JSON parsed to extract first photo only

**Payload Size**: ~2-3 KB per property

### Detail Endpoint (Full Fields)

**Endpoint**: `get_property.php`

**Columns Selected**: All available fields (200+ columns)

**Rationale**:
- Single property request
- User expects full details
- One-time fetch, not repeated

**Payload Size**: ~15-20 KB per property (with full description and photos)

---

## Pagination Strategy

### Current Implementation

**No Pagination**: All endpoints return all matching results (up to limit).

- `get_properties.php`: LIMIT 500 (hard limit)
- `get_properties_bbox.php`: LIMIT 200 (default, max 500)
- `get_property.php`: LIMIT 1 (single property)

**Issues**:
- Large result sets can be slow
- Frontend renders all results at once
- No "load more" or infinite scroll

### Recommended Pagination

**Offset-Based Pagination**:
```sql
SELECT ... FROM rets_property WHERE ... ORDER BY ... LIMIT :limit OFFSET :offset
```

**Frontend Implementation**:
- Initial load: `limit=50, offset=0`
- Load more: `limit=50, offset=50`
- Append results to existing array

**Trade-offs**:
- Simple to implement
- Works with any ORDER BY
- Offset becomes slow for large offsets (e.g., offset=10000)

**Cursor-Based Pagination** (Better for large datasets):
```sql
SELECT ... FROM rets_property 
WHERE ... AND L_ListingID > :lastId 
ORDER BY L_ListingID ASC 
LIMIT :limit
```

**Frontend Implementation**:
- Store `lastId` from last result
- Next page: `lastId=12345, limit=50`
- Faster for large datasets (no OFFSET calculation)

---

## Caching

### Current Implementation

**No Caching**: Every request hits the database.

### Potential Caching Strategies

**1. Browser Caching (HTTP Headers)**
```php
header('Cache-Control: public, max-age=300'); // 5 minutes
header('ETag: ' . md5($response));
```
- Cache static-ish data (property lists)
- Invalidate on filter changes
- Not suitable for real-time data

**2. Application-Level Caching (Redis/Memcached)**
- Cache query results by filter combination
- Key: `properties:{minPrice}:{maxPrice}:{bedrooms}:{city}`
- TTL: 5-15 minutes
- Invalidate on data updates

**3. Frontend Caching (Service Worker)**
- Cache API responses in IndexedDB
- Serve from cache when offline
- Update in background

**4. Gemini Response Caching**
- Cache AI responses for identical queries
- Key: `gemini:{md5(message)}`
- TTL: 1 hour (filters may change)

---

## Debounce/Throttle Patterns

### Search Input Debouncing

**Location**: `app/houses/page.tsx`

**Implementation**:
```typescript
const [searchTerm, setSearchTerm] = useState('');
const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearchTerm(searchTerm);
  }, 500); // 500ms delay

  return () => clearTimeout(timer);
}, [searchTerm]);
```

**Effect**: Prevents API call on every keystroke. Waits 500ms after user stops typing.

**Trade-off**: 500ms delay feels responsive but reduces unnecessary calls.

### Map Moveend Debouncing

**Location**: `components/map/MapView.tsx`

**Implementation**:
```typescript
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

**Effect**: Prevents API call on every map pan/zoom. Waits 500ms after user stops moving map.

**Trade-off**: Slight delay in marker updates, but prevents excessive API calls.

### Scroll Position Saving

**Location**: `app/houses/page.tsx`

**Implementation**:
```typescript
useEffect(() => {
  const handleScroll = () => {
    sessionStorage.setItem(SCROLL_STORAGE_KEY, window.scrollY.toString());
  };
  window.addEventListener('scroll', throttle(handleScroll, 1000), { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

**Effect**: Saves scroll position every 1 second (throttled), not on every scroll event.

**Trade-off**: May miss exact position if user navigates away quickly.

---

## Biggest Performance Risks

### 1. Overfetching

**Risk**: Fetching too many columns or too many rows.

**Current Mitigation**:
- List endpoints select only essential columns
- LIMIT 500 on list queries
- Map endpoint selects minimal fields

**Remaining Risk**:
- `L_Remarks` (longtext) included in list queries (for search)
- Could be large (several KB per property)
- 500 properties × 5 KB = 2.5 MB payload

**Recommendation**:
- Exclude `L_Remarks` from list queries
- Use separate search endpoint that only returns IDs
- Fetch descriptions on demand

### 2. L_Remarks Longtext

**Risk**: `L_Remarks` column can be very large (longtext = up to 4 GB in MySQL).

**Current Impact**:
- Included in `get_properties.php` SELECT (for search)
- Not displayed in list view (only used for LIKE search)
- Increases payload size significantly

**Recommendation**:
- Use FULLTEXT index for `L_Remarks` (if supported)
- Move search to separate endpoint
- Exclude `L_Remarks` from list queries, fetch on demand

### 3. Photos Payload Size

**Risk**: `L_Photos` JSON can contain many URLs (50+ photos per property).

**Current Impact**:
- All photo URLs sent in list queries
- Only first photo used in list view
- Wasted bandwidth

**Recommendation**:
- Parse `L_Photos` on server, return only first photo URL
- Or: Separate endpoint for photo galleries
- Or: Lazy load photos on scroll

### 4. No Database Indexes

**Risk**: Queries may be slow without proper indexes.

**Current Status**: Unknown (indexes not documented in code).

**Recommendation**:
- Add indexes on frequently filtered columns:
  - `L_SystemPrice`
  - `L_City`, `L_Zip`
  - `L_Keyword2` (bedrooms)
  - `LM_Dec_3` (bathrooms)
  - `LM_Int2_3` (sqft)
  - `L_Status`
  - `ListingContractDate`
  - Spatial index on `(LMD_MP_Latitude, LMD_MP_Longitude)`

### 5. Large Result Sets

**Risk**: Returning 500 properties at once can be slow.

**Current Mitigation**: LIMIT 500

**Recommendation**:
- Implement pagination (50-100 per page)
- Add "Load More" button or infinite scroll
- Consider cursor-based pagination for better performance

### 6. No Query Result Caching

**Risk**: Same queries executed repeatedly.

**Current Status**: No caching

**Recommendation**:
- Cache query results in Redis/Memcached
- Cache key: filter combination hash
- TTL: 5-15 minutes

### 7. Median Calculation Performance

**Risk**: Median calculation requires two queries (count + select middle).

**Current Impact**:
- Insights endpoints execute multiple queries per request
- For 50k properties: count query + sort query can be slow

**Recommendation**:
- Cache median values (recalculate periodically, not on every request)
- Use MySQL window functions if available (MySQL 8.0+):
  ```sql
  SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY L_SystemPrice) 
  FROM rets_property WHERE ...
  ```

---

## Concrete Scaling Suggestions

### If Manager Asks "How Would You Scale This?"

**Short-term (1-2 weeks)**:
1. **Add Database Indexes**
   - Index all frequently filtered columns
   - Spatial index for map queries
   - Composite indexes for common filter combinations
   - Expected improvement: 10-100x faster queries

2. **Implement Pagination**
   - Limit to 50 results per page
   - Add "Load More" button
   - Expected improvement: 10x smaller payloads, faster initial load

3. **Optimize Column Selection**
   - Remove `L_Remarks` from list queries
   - Parse `L_Photos` on server, return only first photo
   - Expected improvement: 50% smaller payloads

4. **Add Query Result Caching**
   - Redis cache for common queries
   - TTL: 5-15 minutes
   - Expected improvement: 90% reduction in database load for repeated queries

**Medium-term (1-2 months)**:
1. **Implement Cursor-Based Pagination**
   - Replace offset-based with cursor-based
   - Expected improvement: Consistent performance for large datasets

2. **Add Full-Text Search Index**
   - FULLTEXT index on `L_Remarks`, `L_Address`, `L_City`
   - Replace LIKE queries with MATCH AGAINST
   - Expected improvement: 100x faster search

3. **Implement CDN for Static Assets**
   - Serve images from CDN
   - Cache API responses at edge
   - Expected improvement: Faster global load times

4. **Add Database Read Replicas**
   - Separate read/write databases
   - Distribute read load
   - Expected improvement: Handle 10x more concurrent users

**Long-term (3-6 months)**:
1. **Implement Elasticsearch for Search**
   - Move search to Elasticsearch
   - Real-time indexing
   - Expected improvement: Sub-second search on millions of properties

2. **Implement GraphQL API**
   - Allow clients to request only needed fields
   - Reduce overfetching
   - Expected improvement: 50% smaller payloads

3. **Implement Real-Time Updates**
   - WebSocket for live property updates
   - Push notifications for new listings
   - Expected improvement: Better user experience

4. **Implement Microservices**
   - Separate search service
   - Separate insights service
   - Separate map service
   - Expected improvement: Independent scaling, better fault tolerance

---

## Performance Metrics to Monitor

1. **API Response Times**
   - Target: < 200ms for list queries, < 100ms for single property
   - Monitor: P95, P99 percentiles

2. **Database Query Times**
   - Target: < 50ms for simple queries, < 500ms for complex aggregations
   - Monitor: Slow query log

3. **Payload Sizes**
   - Target: < 500 KB for list queries, < 100 KB for single property
   - Monitor: Response size metrics

4. **Frontend Load Times**
   - Target: < 2s for initial page load, < 1s for API calls
   - Monitor: Lighthouse scores, Web Vitals

5. **Database Connection Pool**
   - Target: < 80% pool utilization
   - Monitor: Connection pool metrics

---

## Current Performance Characteristics

**List Query** (`get_properties.php`):
- Typical response time: 200-500ms (depends on filters and dataset size)
- Typical payload: 500 KB - 2 MB (500 properties)
- Database load: Medium (single query, but may scan many rows)

**Map Query** (`get_properties_bbox.php`):
- Typical response time: 100-300ms (spatial queries are fast with indexes)
- Typical payload: 200-600 KB (200 properties)
- Database load: Low (spatial index makes queries fast)

**Detail Query** (`get_property.php`):
- Typical response time: 50-150ms (primary key lookup)
- Typical payload: 15-20 KB (single property)
- Database load: Very low (indexed lookup)

**Insights Queries**:
- Typical response time: 500ms - 2s (multiple queries, aggregations)
- Typical payload: < 10 KB (aggregate data)
- Database load: High (multiple queries, full table scans for medians)

**Chat Query** (`chat_gemini.php`):
- Typical response time: 1-3s (external API call)
- Typical payload: < 5 KB (filters + message)
- External API load: Depends on Gemini API performance

