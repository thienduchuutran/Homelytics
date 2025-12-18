# API Endpoints

This document inventories every PHP endpoint under `/api/`, including their purpose, request/response schemas, SQL queries, security notes, and performance considerations.

---

## `/api/get_properties.php`

**File Path**: `frontend/api/get_properties.php`  
**URL Path**: `https://titus-duc.calisearch.org/api/get_properties.php`

### Purpose
Fetches a list of properties from the `rets_property` table with advanced filtering, sorting, and pagination. Returns up to 500 properties per request.

### Request Method
GET

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `minPrice` | integer | No | Minimum price filter (default: 0) |
| `maxPrice` | integer | No | Maximum price filter (default: 100000000) |
| `bedrooms` | integer | No | Minimum bedrooms (L_Keyword2 >= value) |
| `bathrooms` | float | No | Minimum bathrooms (LM_Dec_3 >= value) |
| `minSqft` | integer | No | Minimum square feet (LM_Int2_3 >= value) |
| `propertyType` | string | No | Property type filter ("all" = no filter, "Residential" uses L_Class, others use L_Type_) |
| `status` | string | No | Listing status ("for-sale" maps to Active/Pending/Sold, "for-rent" maps to Leased/Rental) |
| `search` | string | No | Search term (searches L_Address, L_City, L_State, L_Remarks) |
| `sortBy` | string | No | Sort option: "newest", "oldest", "price-low", "price-high", "bedrooms-low", "bedrooms-high", "bathrooms-low", "bathrooms-high", "sqft-low", "sqft-high" (default: "newest") |
| `minLotSqft` | integer | No | Minimum lot square feet |
| `minLotAcres` | float | No | Minimum lot acres |
| `lotFeatures` | string | No | Comma-separated lot features (searches LotFeatures column) |
| `hasHOA` | boolean | No | Has HOA (AssociationYN = 'Y') |
| `maxHOA` | float | No | Maximum HOA fee |
| `hoaFrequency` | string | No | HOA fee frequency |
| `mustHaveSpa` | boolean | No | Must have spa (SpaYN = 'Y') |
| `mustHaveSeniorCommunity` | boolean | No | Must be senior community (SeniorCommunityYN = 'Y') |
| `mustHaveCooling` | boolean | No | Must have cooling (CoolingYN = 'Y') |
| `mustHaveAttachedGarage` | boolean | No | Must have attached garage (AttachedGarageYN = 'Y') |
| `mustHavePool` | boolean | No | Must have pool (PoolPrivateYN = 'Y') |
| `mustHaveGarage` | boolean | No | Must have garage (GarageYN = 'Y') |
| `mustHaveFireplace` | boolean | No | Must have fireplace (FireplaceYN = 'Y') |
| `mustHaveView` | boolean | No | Must have view (ViewYN = 'Y') |
| `mustHaveNewConstruction` | boolean | No | Must be new construction (NewConstructionYN = 'Y') |
| `maxDaysOnMarket` | integer | No | Maximum days on market |
| `listedAfter` | string | No | Listed after date (YYYY-MM-DD format, OnMarketDate >= value) |
| `attached` | boolean | No | Attached/detached filter (PropertyAttachedYN) |
| `keywords` | string | No | Comma-separated keywords (searches L_Remarks, InteriorFeatures, Appliances, CommunityFeatures, LotFeatures, View) |

### Response JSON Schema

```json
{
  "_NEW_FILE_LOADED": true,
  "_version": "3.0-ENHANCED-FILTERS",
  "_timestamp": "2025-12-17 21:00:00",
  "_debug": {
    "sortBy": "newest",
    "sortColumn": "ListingContractDate",
    "sortDirection": "DESC",
    "orderByClause": "...",
    "sqlPreview": "...",
    "rowCount": 150,
    "houseCount": 150,
    "firstPrice": 350000,
    "lastPrice": 850000,
    "propertyTypeFilter": null,
    "whereClause": "...",
    "uniquePropertyTypesInDB": ["..."]
  },
  "data": [
    {
      "id": "12345",
      "title": "Condominium at 123 Main St",
      "address": "123 Main St",
      "city": "San Diego",
      "state": "CA",
      "zipCode": "92101",
      "price": 450000,
      "bedrooms": 2,
      "bathrooms": 2.5,
      "squareFeet": 1200,
      "propertyType": "Residential",
      "status": "for-sale",
      "description": "Beautiful property...",
      "imageUrl": "https://...",
      "yearBuilt": 2010,
      "parking": 2,
      "amenities": ["Pool", "Garage"],
      "listingDate": "2025-01-15"
    }
  ]
}
```

### Error Responses

- **400 Bad Request**: Invalid parameters
- **500 Internal Server Error**: Database connection failed, query failed
  ```json
  { "error": "Query failed: ..." }
  ```

### SQL Query

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
    L_Type_ as propertySubType,
    LotSizeSquareFeet,
    LotSizeAcres,
    LotFeatures,
    AssociationYN,
    AssociationFee,
    AssociationFeeFrequency,
    SpaYN,
    SeniorCommunityYN,
    CoolingYN,
    AttachedGarageYN,
    PropertyAttachedYN,
    DaysOnMarket,
    OnMarketDate,
    PoolPrivateYN,
    GarageYN,
    FireplaceYN,
    ViewYN,
    NewConstructionYN,
    InteriorFeatures,
    Appliances,
    CommunityFeatures,
    View
FROM rets_property 
WHERE [dynamic WHERE clause built from filters]
ORDER BY [dynamic ORDER BY based on sortBy]
LIMIT 500
```

**WHERE Clause Construction**:
- Base: `1=1` (always true, allows easy AND appending)
- Price filters: `L_SystemPrice >= :minPrice AND L_SystemPrice <= :maxPrice`
- Bedrooms: `L_Keyword2 >= :bedrooms`
- Bathrooms: `LM_Dec_3 >= :bathrooms`
- Property type: `TRIM(L_Class) = TRIM(:propertyType)` OR `TRIM(L_Type_) = TRIM(:propertyType)`
- Search: `(L_Address LIKE :search1 OR L_City LIKE :search2 OR L_State LIKE :search3 OR L_Remarks LIKE :search4)`
- Status: `L_Status IN (:status1, :status2, :status3)` (for "for-sale" maps to ['Active', 'Pending', 'Sold'])
- Lot features: `LotFeatures LIKE :lotFeature0 OR LotFeatures LIKE :lotFeature1 ...`
- HOA: `AssociationYN = :hasHOA` (Y/N)
- Must-have booleans: `PoolPrivateYN = 'Y'`, `GarageYN = 'Y'`, etc.
- Keywords: `(L_Remarks LIKE :keyword0_1 OR InteriorFeatures LIKE :keyword0_2 OR ...)`
- When sorting by price: `L_SystemPrice IS NOT NULL AND L_SystemPrice > 0`
- When sorting by date: `ListingContractDate IS NOT NULL AND ListingContractDate != '' AND ListingContractDate != '0000-00-00'`

**ORDER BY Clause**:
- For date columns: `CASE WHEN ListingContractDate IS NULL OR ListingContractDate = '' OR ListingContractDate = '0000-00-00' THEN 1 ELSE 0 END, ListingContractDate DESC, L_ListingID DESC`
- For price: `CASE WHEN L_SystemPrice IS NULL OR L_SystemPrice = 0 THEN 1 ELSE 0 END, CAST(COALESCE(NULLIF(L_SystemPrice, ''), 0) AS DECIMAL(15,2)) DESC, L_ListingID DESC`
- For other numeric: `CASE WHEN [column] IS NULL OR [column] = 0 THEN 1 ELSE 0 END, [column] DESC, L_ListingID DESC`

### Index Usage Notes

**Recommended Indexes** (for optimal performance):
- `L_SystemPrice` - used for price filtering and sorting
- `L_Keyword2` - used for bedrooms filtering
- `LM_Dec_3` - used for bathrooms filtering
- `LM_Int2_3` - used for square feet filtering
- `L_City` - used for city filtering
- `L_Zip` - used for ZIP filtering
- `L_Status` - used for status filtering
- `ListingContractDate` - used for date sorting
- `L_Class`, `L_Type_` - used for property type filtering
- Composite index on `(L_SystemPrice, L_Keyword2, LM_Dec_3)` for common filter combinations

**Performance Considerations**:
- LIMIT 500 prevents excessive result sets
- WHERE clause filters applied before ORDER BY
- NULL handling in ORDER BY ensures valid results first

### Security Notes

- **Prepared Statements**: All parameters use PDO prepared statements with named placeholders (`:paramName`)
- **Input Validation**: 
  - Numeric params cast to int/float with `max(0, ...)` to prevent negatives
  - String params trimmed and validated
  - Date format validated with regex for `listedAfter`
- **CORS**: Headers set to allow all origins (`Access-Control-Allow-Origin: *`)
- **No Rate Limiting**: Endpoint does not implement rate limiting (consider adding for production)
- **SQL Injection Protection**: PDO prepared statements prevent SQL injection
- **Error Handling**: Errors return JSON, no sensitive info leaked (database errors sanitized)

---

## `/api/get_property.php`

**File Path**: `frontend/api/get_property.php`  
**URL Path**: `https://titus-duc.calisearch.org/api/get_property.php`

### Purpose
Fetches a single property by ID (L_ListingID or L_DisplayId) with all available fields from the database.

### Request Method
GET

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Property ID (L_ListingID or L_DisplayId) |

### Response JSON Schema

```json
{
  "id": "12345",
  "listingId": "12345",
  "displayId": "SD-12345",
  "title": "Condominium at 123 Main St",
  "address": "123 Main St",
  "city": "San Diego",
  "state": "CA",
  "zipCode": "92101",
  "price": 450000,
  "bedrooms": 2,
  "bathrooms": 2.5,
  "bathroomsHalf": 1,
  "squareFeet": 1200,
  "propertyType": "Condominium",
  "propertySubType": "Condominium",
  "status": "for-sale",
  "description": "Beautiful property...",
  "images": ["https://...", "https://..."],
  "imageUrl": "https://...",
  "yearBuilt": 2010,
  "parking": 2,
  "amenities": ["Pool", "Garage"],
  "listingDate": "2025-01-15",
  "latitude": 32.7157,
  "longitude": -117.1611,
  "subdivisionName": "Downtown",
  "lotSizeAcres": 0.1,
  "lotSizeSquareFeet": 4356,
  "cooling": "Central Air",
  "heating": "Forced Air",
  "agentFullName": "John Doe",
  "agentEmail": "john@example.com",
  "agentPhone": "555-1234",
  "daysOnMarket": 45,
  "associationFee": 300,
  "associationFeeFrequency": "Monthly",
  ... (many more fields)
}
```

### Error Responses

- **400 Bad Request**: Missing property ID
  ```json
  { "error": "Property ID is required" }
  ```
- **404 Not Found**: Property not found
  ```json
  { "error": "Property not found" }
  ```
- **500 Internal Server Error**: Database error
  ```json
  { "error": "Query failed: ..." }
  ```

### SQL Query

```sql
SELECT 
    L_ListingID,
    L_DisplayId,
    L_Address,
    L_AddressStreet,
    L_City,
    PostalCity,
    L_State,
    L_Zip,
    LMD_MP_Latitude,
    LMD_MP_Longitude,
    CountyOrParish,
    CountrySubdivision,
    UniversalParcelId,
    ParcelNumber,
    TaxLot,
    L_Class,
    L_Type_,
    PropertySubTypeAdditional,
    StructureType,
    ArchitecturalStyle,
    CommonInterest,
    CommonWalls,
    PropertyAttachedYN,
    L_SystemPrice,
    PreviousListPrice,
    ListingContractDate,
    OnMarketDate,
    BackOnMarketDate,
    PriceChangeTimestamp,
    ModificationTimestamp,
    MajorChangeTimestamp,
    StatusChangeTimestamp,
    L_Status,
    StandardStatus,
    PreviousStandardStatus,
    DaysOnMarket,
    CumulativeDaysOnMarket,
    DaysOnMarketReplication,
    DaysOnMarketReplicationDate,
    DaysOnMarketReplicationIncreasingYN,
    L_Keyword2,
    LM_Dec_3,
    BathroomsHalf,
    MainLevelBedrooms,
    LM_Int2_3,
    LivingAreaUnits,
    LivingAreaSource,
    L_Keyword1,
    LotSizeArea,
    LotSizeSquareFeet,
    LotSizeAcres,
    LotSizeUnits,
    LotFeatures,
    StoriesTotal,
    EntryLevel,
    EntryLocation,
    ElevationUnits,
    YearBuilt,
    NewConstructionYN,
    PropertyCondition,
    HumanModifiedYN,
    LA1_UserFirstName,
    LA1_UserLastName,
    ListAgentFullName,
    ListAgentEmail,
    ListAgentDirectPhone,
    ListAgentOfficePhone,
    ListAgentKey,
    ListAgentAOR,
    LO1_OrganizationName,
    ListOfficeEmail,
    AssociationYN,
    AssociationName,
    AssociationFee,
    AssociationFeeFrequency,
    AssociationFee2Frequency,
    AssociationAmenities,
    Cooling,
    CoolingYN,
    Heating,
    HeatingYN,
    WaterSource,
    Roof,
    Flooring,
    Appliances,
    InteriorFeatures,
    SecurityFeatures,
    Fencing,
    ViewYN,
    View,
    FireplaceYN,
    FireplaceFeatures,
    CommunityFeatures,
    GarageYN,
    AttachedGarageYN,
    L_Keyword5,
    OpenParkingSpaces,
    OccupantType,
    NumberOfUnitsTotal,
    PoolPrivateYN,
    PoolFeatures,
    SpaYN,
    SpaFeatures,
    L_Remarks,
    Disclosures,
    SpecialListingConditions,
    ListingTerms,
    RoomType,
    L_Photos,
    PhotoCount,
    PhotoTime,
    SubdivisionName,
    LM_char10_70,
    HighSchoolDistrict,
    SeniorCommunityYN,
    AdditionalParcelsYN,
    LandLeaseYN,
    created_at,
    updated_at,
    CONCAT(COALESCE(LA1_UserFirstName, ''), ' ', COALESCE(LA1_UserLastName, '')) AS agentFullName
FROM rets_property 
WHERE L_ListingID = :id OR L_DisplayId = :id
LIMIT 1
```

### Index Usage Notes

**Recommended Indexes**:
- `L_ListingID` (primary key) - used for ID lookup
- `L_DisplayId` - used as alternative ID lookup

### Security Notes

- **Prepared Statements**: Uses PDO prepared statement with `:id` parameter
- **Input Validation**: ID is trimmed, no other validation (assumes numeric/string ID)
- **CORS**: Headers set to allow all origins
- **No Rate Limiting**: Consider adding for production
- **SQL Injection Protection**: PDO prepared statements

---

## `/api/get_properties_bbox.php`

**File Path**: `frontend/api/get_properties_bbox.php`  
**URL Path**: `https://titus-duc.calisearch.org/api/get_properties_bbox.php`

### Purpose
Fetches properties within a geographic bounding box (for map view). Returns minimal fields optimized for map markers and list display.

### Request Method
GET

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `minLat` | float | Yes | Minimum latitude (south boundary) |
| `maxLat` | float | Yes | Maximum latitude (north boundary) |
| `minLng` | float | Yes | Minimum longitude (west boundary) |
| `maxLng` | float | Yes | Maximum longitude (east boundary) |
| `city` | string | No | City filter (LIKE search) |
| `zip` | string | No | ZIP code filter (exact match) |
| `minPrice` | integer | No | Minimum price |
| `maxPrice` | integer | No | Maximum price |
| `minBeds` | integer | No | Minimum bedrooms |
| `minBaths` | float | No | Minimum bathrooms |
| `status` | string | No | Listing status filter |
| `limit` | integer | No | Result limit (default: 200, max: 500) |
| `offset` | integer | No | Pagination offset (default: 0) |

### Response JSON Schema

```json
[
  {
    "id": "12345",
    "lat": 32.7157,
    "lng": -117.1611,
    "address": "123 Main St",
    "city": "San Diego",
    "state": "CA",
    "zip": "92101",
    "price": 450000,
    "beds": 2,
    "baths": 2.5,
    "sqft": 1200,
    "photo": "https://...",
    "status": "Active",
    "dom": 45
  }
]
```

### Error Responses

- **400 Bad Request**: Missing or invalid bounding box parameters
  ```json
  { "error": "Missing required parameters: minLat, maxLat, minLng, maxLng" }
  ```
  ```json
  { "error": "Invalid bounding box: minLat must be < maxLat and minLng must be < maxLng" }
  ```
- **500 Internal Server Error**: Database error
  ```json
  { "error": "Query failed: ..." }
  ```

### SQL Query

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
WHERE LMD_MP_Latitude IS NOT NULL 
  AND LMD_MP_Latitude != 0
  AND LMD_MP_Longitude IS NOT NULL 
  AND LMD_MP_Longitude != 0
  AND LMD_MP_Latitude >= :minLat 
  AND LMD_MP_Latitude <= :maxLat
  AND LMD_MP_Longitude >= :minLng 
  AND LMD_MP_Longitude <= :maxLng
  [optional filters: city, zip, price, beds, baths, status]
ORDER BY ModificationTimestamp DESC, L_ListingID DESC
LIMIT :limit OFFSET :offset
```

### Index Usage Notes

**Critical Indexes** (for map performance):
- **Spatial Index** on `(LMD_MP_Latitude, LMD_MP_Longitude)` - essential for bounding box queries
- `L_City` - for city filtering
- `L_Zip` - for ZIP filtering
- `L_SystemPrice` - for price filtering
- `ModificationTimestamp` - for sorting

**Performance Considerations**:
- Bounding box queries are fast with spatial indexes
- LIMIT/OFFSET used for pagination (consider cursor-based pagination for very large datasets)
- Only essential fields selected (reduces payload size)

### Security Notes

- **Prepared Statements**: All parameters use PDO prepared statements
- **Input Validation**: 
  - Bounding box validated (min < max)
  - Coordinates cast to float
  - Limit capped at 500
- **CORS**: Headers set to allow all origins
- **No Rate Limiting**: Consider adding for production

---

## `/api/chat_gemini.php`

**File Path**: `frontend/api/chat_gemini.php`  
**URL Path**: `https://titus-duc.calisearch.org/api/chat_gemini.php`

### Purpose
PHP proxy for Google Gemini API that handles conversational property search. Takes natural language user messages and returns structured filters and assistant responses.

### Request Method
POST

### Request Body Schema

```json
{
  "message": "Find me a 3 bedroom house under 500k in San Diego",
  "context": {
    "history": [
      { "role": "user", "content": "..." },
      { "role": "assistant", "content": "..." }
    ],
    "filters": {
      "minPrice": 300000,
      "maxPrice": 500000
    }
  }
}
```

### Response JSON Schema

```json
{
  "filters": {
    "city": "San Diego",
    "minBeds": 3,
    "maxPrice": 500000,
    "propertyTypes": ["SingleFamilyResidence"],
    "mustHave": {
      "pool": false,
      "garage": true
    }
  },
  "assistantMessage": "I found several 3 bedroom houses in San Diego under $500,000. Here are the results...",
  "debug": {
    "model": "gemini-2.5-flash"
  }
}
```

### Error Responses

- **400 Bad Request**: Missing or invalid message
  ```json
  { "error": "Missing or invalid message" }
  ```
  ```json
  { "error": "Message cannot be empty" }
  ```
  ```json
  { "error": "Message too long (max 500 characters)" }
  ```
- **405 Method Not Allowed**: Not POST request
  ```json
  { "error": "Method not allowed" }
  ```
- **429 Too Many Requests**: Rate limit exceeded
  ```json
  { "error": "Rate limit exceeded. Please try again later." }
  ```
- **500 Internal Server Error**: Gemini API error, missing API key
  ```json
  { "error": "Gemini API key not configured" }
  ```
  ```json
  { "error": "Service error occurred" }
  ```

### Rate Limiting

**Implementation**: File-based rate limiting
- **Max Requests**: 20 per IP
- **Window**: 60 seconds
- **Storage**: Temporary files in `sys_get_temp_dir()`
- **File Pattern**: `gemini_rate_{md5(ip)}.txt`

**Logic**:
1. Read existing request timestamps from file
2. Filter out timestamps older than 60 seconds
3. If count >= 20, return 429 error
4. Append current timestamp and save

### API Key Management

**Location**: 
- Environment variable: `GEMINI_API_KEY`
- Config file: `{projectRoot}/gemini_key.php` (outside web root)

**Security**:
- API key never exposed to frontend
- Config file should be outside public web root
- Falls back to environment variable if config file not found

### Gemini API Call

**Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}`

**Models Used**:
- Primary: `gemini-2.5-flash`
- Fallback: `gemini-2.0-flash` (if primary not available)

**Request Payload**:
- `systemInstruction`: Detailed prompt for filter extraction
- `contents`: Chat history (last 5 messages) + current user message
- `generationConfig`: 
  - `temperature`: 0.2 (low for consistent output)
  - `responseMimeType`: "application/json"
  - `responseSchema`: Structured JSON schema for filters

**Response Parsing**:
- Extracts JSON from `candidates[0].content.parts[0].text`
- Validates structure (must have `filters` and `assistantMessage`)

### Security Notes

- **Rate Limiting**: 20 requests per 60 seconds per IP
- **Input Validation**: 
  - Message max length: 500 characters
  - Message trimmed and validated
  - JSON request body validated
- **API Key Security**: Stored outside web root, never exposed to client
- **CORS**: Headers set to allow all origins
- **Error Handling**: Generic error messages (no sensitive info leaked)
- **Timeout**: 30 seconds for Gemini API call, 10 seconds connect timeout

---

## `/api/insights_summary.php`

**File Path**: `frontend/api/insights_summary.php`  
**URL Path**: `https://titus-duc.calisearch.org/api/insights_summary.php`

### Purpose
Calculates aggregate market insights: count, median price, median price per sqft, average bedrooms, average days on market.

### Request Method
GET

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `city` | string | No | City filter (exact match) |
| `zip` | string | No | ZIP code filter (exact match) |
| `minPrice` | integer | No | Minimum price |
| `maxPrice` | integer | No | Maximum price |
| `minBeds` | integer | No | Minimum bedrooms |
| `minBaths` | float | No | Minimum bathrooms |
| `propertyType` | string | No | Property type filter |

### Response JSON Schema

```json
{
  "count": 1250,
  "medianPrice": 425000,
  "medianPricePerSqft": 350,
  "avgBeds": 3.2,
  "avgDom": 45
}
```

### Error Responses

- **500 Internal Server Error**: Database error
  ```json
  { "error": "Database connection failed: ..." }
  ```

### SQL Queries

**1. Count Total Properties**:
```sql
SELECT COUNT(*) as cnt 
FROM rets_property 
WHERE [WHERE clause with filters]
  AND L_SystemPrice IS NOT NULL 
  AND L_SystemPrice > 0
LIMIT 50000
```

**2. Calculate Median Price** (two-step process):
```sql
-- Step 1: Get total count
SELECT COUNT(*) as cnt 
FROM rets_property 
WHERE [WHERE clause]
  AND L_SystemPrice IS NOT NULL 
  AND L_SystemPrice > 0
LIMIT 50000

-- Step 2: Get middle value(s)
SELECT L_SystemPrice 
FROM rets_property 
WHERE [WHERE clause]
  AND L_SystemPrice IS NOT NULL 
  AND L_SystemPrice > 0
ORDER BY L_SystemPrice ASC 
LIMIT [1 or 2] OFFSET [middle index]
```

**3. Calculate Median Price Per Sqft** (only where sqft > 0):
```sql
-- Step 1: Get count
SELECT COUNT(*) as cnt 
FROM rets_property 
WHERE [WHERE clause]
  AND L_SystemPrice IS NOT NULL 
  AND L_SystemPrice > 0
  AND LM_Int2_3 > 0
LIMIT 50000

-- Step 2: Get middle value(s) of calculated price/sqft
SELECT (L_SystemPrice / LM_Int2_3) as pricePerSqft 
FROM rets_property 
WHERE [WHERE clause]
  AND L_SystemPrice IS NOT NULL 
  AND L_SystemPrice > 0
  AND LM_Int2_3 > 0
ORDER BY pricePerSqft ASC 
LIMIT [1 or 2] OFFSET [middle index]
```

**4. Average Bedrooms**:
```sql
SELECT AVG(L_Keyword2) as avgBeds 
FROM rets_property 
WHERE [WHERE clause]
  AND L_SystemPrice IS NOT NULL 
  AND L_SystemPrice > 0
  AND L_Keyword2 IS NOT NULL 
  AND L_Keyword2 > 0
LIMIT 50000
```

**5. Average Days on Market**:
```sql
SELECT AVG(DaysOnMarket) as avgDom 
FROM rets_property 
WHERE [WHERE clause]
  AND L_SystemPrice IS NOT NULL 
  AND L_SystemPrice > 0
  AND DaysOnMarket IS NOT NULL 
  AND DaysOnMarket > 0
LIMIT 50000
```

### Median Calculation Logic

Since MySQL may not support window functions (depending on version), median is calculated manually:
1. Count total rows
2. Calculate middle index: `offset = floor((count - 1) / 2)`
3. If count is even, fetch 2 rows (average them)
4. If count is odd, fetch 1 row

### Index Usage Notes

**Recommended Indexes**:
- `L_SystemPrice` - for price filtering and sorting
- `LM_Int2_3` - for square feet filtering (used in price/sqft calculation)
- `L_Keyword2` - for bedrooms filtering and averaging
- `DaysOnMarket` - for DOM averaging
- Composite indexes on filter combinations

### Security Notes

- **Prepared Statements**: All parameters use PDO prepared statements
- **Safety Cap**: LIMIT 50000 on all queries prevents excessive processing
- **Input Validation**: Numeric params validated and cast
- **CORS**: Headers set to allow all origins
- **No Rate Limiting**: Consider adding for production

---

## `/api/insights_median_by_zip.php`

**File Path**: `frontend/api/insights_median_by_zip.php`  
**URL Path**: `https://titus-duc.calisearch.org/api/insights_median_by_zip.php`

### Purpose
Returns median price and median price per sqft grouped by ZIP code. Limited to top 15 ZIPs by property count.

### Request Method
GET

### Query Parameters

Same as `insights_summary.php` (city, zip, minPrice, maxPrice, minBeds, minBaths, propertyType)

### Response JSON Schema

```json
[
  {
    "zip": "92101",
    "count": 150,
    "medianPrice": 450000,
    "medianPricePerSqft": 375
  },
  {
    "zip": "92102",
    "count": 120,
    "medianPrice": 420000,
    "medianPricePerSqft": 350
  }
]
```

### SQL Queries

**1. Get Top 15 ZIPs by Count**:
```sql
SELECT L_Zip, COUNT(*) as cnt 
FROM rets_property 
WHERE [WHERE clause]
  AND L_SystemPrice IS NOT NULL 
  AND L_SystemPrice > 0
  AND L_Zip IS NOT NULL 
  AND L_Zip != ""
GROUP BY L_Zip
ORDER BY cnt DESC 
LIMIT 15
```

**2. For Each ZIP, Calculate Median Price**:
```sql
-- Step 1: Count for this ZIP
SELECT COUNT(*) as cnt 
FROM rets_property 
WHERE [WHERE clause]
  AND L_Zip = :zipCode
  AND L_SystemPrice IS NOT NULL 
  AND L_SystemPrice > 0
LIMIT 50000

-- Step 2: Get median
SELECT L_SystemPrice 
FROM rets_property 
WHERE [WHERE clause]
  AND L_Zip = :zipCode
  AND L_SystemPrice IS NOT NULL 
  AND L_SystemPrice > 0
ORDER BY L_SystemPrice ASC 
LIMIT [1 or 2] OFFSET [middle index]
```

**3. For Each ZIP, Calculate Median Price Per Sqft**:
```sql
-- Step 1: Count for this ZIP (with sqft > 0)
SELECT COUNT(*) as cnt 
FROM rets_property 
WHERE [WHERE clause]
  AND L_Zip = :zipCode
  AND L_SystemPrice IS NOT NULL 
  AND L_SystemPrice > 0
  AND LM_Int2_3 > 0
LIMIT 50000

-- Step 2: Get median
SELECT (L_SystemPrice / LM_Int2_3) as pricePerSqft 
FROM rets_property 
WHERE [WHERE clause]
  AND L_Zip = :zipCode
  AND L_SystemPrice IS NOT NULL 
  AND L_SystemPrice > 0
  AND LM_Int2_3 > 0
ORDER BY pricePerSqft ASC 
LIMIT [1 or 2] OFFSET [middle index]
```

### Index Usage Notes

**Recommended Indexes**:
- `L_Zip` - critical for grouping and filtering
- `L_SystemPrice` - for price calculations
- `LM_Int2_3` - for sqft calculations
- Composite index on `(L_Zip, L_SystemPrice)` for efficient ZIP-based queries

### Security Notes

- **Prepared Statements**: All parameters use PDO prepared statements
- **Safety Cap**: LIMIT 50000 on all queries
- **Input Validation**: Numeric params validated
- **CORS**: Headers set to allow all origins
- **No Rate Limiting**: Consider adding for production

---

## `/api/insights_price_histogram.php`

**File Path**: `frontend/api/insights_price_histogram.php`  
**URL Path**: `https://titus-duc.calisearch.org/api/insights_price_histogram.php`

### Purpose
Returns price distribution in predefined buckets for histogram visualization.

### Request Method
GET

### Query Parameters

Same as `insights_summary.php` (city, zip, minPrice, maxPrice, minBeds, minBaths, propertyType)

### Response JSON Schema

```json
[
  {
    "bucketMin": 0,
    "bucketMax": 200000,
    "count": 50
  },
  {
    "bucketMin": 200000,
    "bucketMax": 400000,
    "count": 200
  },
  {
    "bucketMin": 400000,
    "bucketMax": 600000,
    "count": 300
  }
]
```

### SQL Queries

**1. Get Price Range**:
```sql
SELECT MIN(L_SystemPrice) as minPrice, MAX(L_SystemPrice) as maxPrice 
FROM rets_property 
WHERE [WHERE clause]
  AND L_SystemPrice IS NOT NULL 
  AND L_SystemPrice > 0
LIMIT 50000
```

**2. Calculate Buckets and Count Properties in Each**:
```sql
SELECT COUNT(*) as cnt 
FROM rets_property 
WHERE [WHERE clause]
  AND L_SystemPrice IS NOT NULL 
  AND L_SystemPrice > 0
  AND L_SystemPrice >= :bucketMin 
  AND L_SystemPrice <= :bucketMax
LIMIT 50000
```

**Bucket Calculation Logic**:
- If maxPrice <= 500000: 10 buckets of $50k each
- If maxPrice <= 1000000: 10 buckets of $100k each
- If maxPrice <= 2000000: 10 buckets of $200k each
- If maxPrice <= 5000000: 10 buckets of $500k each
- Otherwise: 10 buckets of $1M each

### Index Usage Notes

**Recommended Indexes**:
- `L_SystemPrice` - critical for price range and bucket filtering
- Composite indexes on filter combinations

### Security Notes

- **Prepared Statements**: All parameters use PDO prepared statements
- **Safety Cap**: LIMIT 50000 on all queries
- **Input Validation**: Numeric params validated
- **CORS**: Headers set to allow all origins
- **No Rate Limiting**: Consider adding for production

---

## `/api/fetch_property.php`

**File Path**: `frontend/api/fetch_property.php`  
**URL Path**: `https://titus-duc.calisearch.org/api/fetch_property.php`

### Purpose
Backend data synchronization endpoint. Fetches property listings from external API (Trestle) using OAuth token, and upserts into `rets_property` table. Not called by frontend—used for data updates.

### Request Method
GET (or CLI)

### Notes
- Reads OAuth token from `token` table
- Fetches listings from external API
- Upserts into `rets_property` table
- Persists offset in `app_state` table
- Not documented in detail as it's not part of frontend API surface

---

## `/api/generate_token_duc.php`

**File Path**: `frontend/api/generate_token_duc.php`  
**URL Path**: `https://titus-duc.calisearch.org/api/generate_token_duc.php`

### Purpose
Generates and caches OAuth access token for external API (Trestle). Checks if cached token is still valid, otherwise requests new token and stores in `token` table.

### Request Method
GET (or CLI)

### Notes
- Reads OAuth credentials from `/home/boxgra5/.idx_secrets.php` (outside web root)
- Caches token in `token` table with expiration
- Returns "OK" if token is valid or newly generated
- Not called by frontend—used for backend data sync

---

## Common Patterns Across All Endpoints

### Database Connection

All endpoints use the same PDO connection pattern:
```php
$db_host = 'localhost';
$db_name = 'boxgra6_duc';
$db_user = 'boxgra6_duc';
$db_pass = '123456';

$dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $db_host, $db_name);
$pdo = new PDO($dsn, $db_user, $db_pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);
```

### CORS Headers

All endpoints set CORS headers:
```php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');
```

### Error Handling

All endpoints use a common error handler:
```php
function jsonError($message, $code = 500) {
    http_response_code($code);
    echo json_encode(['error' => $message], JSON_PRETTY_PRINT);
    exit;
}
```

### Security Recommendations

1. **Rate Limiting**: Add rate limiting to all public endpoints (currently only `chat_gemini.php` has it)
2. **Input Validation**: Strengthen validation for all string inputs (currently basic)
3. **Database Credentials**: Move to environment variables or secure config file (currently hardcoded)
4. **Error Messages**: Ensure no sensitive information leaked in error responses
5. **SQL Injection**: Already protected via PDO prepared statements (maintain this pattern)

