# Data Model

This document explains the database tables used by the application, the columns the UI relies on, data transformations, and known data quirks.

## Primary Table: `rets_property`

**Table Name**: `rets_property`  
**Primary Key**: `L_ListingID` (integer)  
**Database**: `boxgra6_duc`

This is the main table containing all property listings. It follows the RETS (Real Estate Transaction Standard) schema, which uses abbreviated column names.

---

## Columns Used by the UI

### Identity Columns

| Column | Type | Description | UI Usage |
|--------|------|-------------|----------|
| `L_ListingID` | integer | Primary key, unique listing ID | Property ID, used in URLs and API calls |
| `L_DisplayId` | string | Human-readable display ID | Alternative ID for property lookup |
| `L_Address` | string | Street address | Displayed on property cards and detail pages |
| `L_AddressStreet` | string | Street address (alternative) | Fallback for address display |
| `L_City` | string | City name | Filtering, display, search |
| `L_State` | string | State abbreviation (e.g., "CA") | Display, search |
| `L_Zip` | string | ZIP code | Filtering, display, grouping (insights) |
| `PostalCity` | string | Postal city (may differ from L_City) | Fallback for city display |

### Location Columns

| Column | Type | Description | UI Usage |
|--------|------|-------------|----------|
| `LMD_MP_Latitude` | decimal | Latitude coordinate | Map markers, bounding box queries |
| `LMD_MP_Longitude` | decimal | Longitude coordinate | Map markers, bounding box queries |
| `CountyOrParish` | string | County name | Property detail page |
| `CountrySubdivision` | string | Country subdivision | Property detail page |
| `SubdivisionName` | string | Subdivision/neighborhood name | Property detail page, fallback to `LM_char10_70` |
| `LM_char10_70` | string | Alternative subdivision field | Fallback for subdivision name |

### Pricing Columns

| Column | Type | Description | UI Usage |
|--------|------|-------------|----------|
| `L_SystemPrice` | decimal | Current listing price | Primary price display, filtering, sorting, median calculations |
| `PreviousListPrice` | decimal | Previous listing price | Price history on detail page |
| `ListingContractDate` | date | Date property was listed | Sorting (newest/oldest), display |
| `OnMarketDate` | date | Date property went on market | Filtering (listedAfter), display |
| `BackOnMarketDate` | date | Date property returned to market | Property detail page |
| `PriceChangeTimestamp` | datetime | When price last changed | Property detail page |
| `ModificationTimestamp` | datetime | Last modification timestamp | Map sorting (default) |

### Property Features - Basic

| Column | Type | Description | UI Usage |
|--------|------|-------------|----------|
| `L_Keyword2` | integer | Number of bedrooms | Filtering, display, sorting, averaging |
| `LM_Dec_3` | decimal | Number of bathrooms (supports half baths) | Filtering, display, sorting |
| `BathroomsHalf` | integer | Number of half bathrooms | Property detail page |
| `LM_Int2_3` | integer | Square feet (living area) | Filtering, display, sorting, price/sqft calculations |
| `LivingAreaUnits` | string | Units for living area | Property detail page |
| `LivingAreaSource` | string | Source of living area data | Property detail page |
| `L_Keyword5` | integer | Parking spaces | Display, fallback to `OpenParkingSpaces` |
| `OpenParkingSpaces` | integer | Open parking spaces | Property detail page |
| `YearBuilt` | integer | Year property was built | Display, filtering (implicit via search) |
| `StoriesTotal` | integer | Total number of stories | Property detail page |
| `EntryLevel` | string | Entry level | Property detail page |
| `EntryLocation` | string | Entry location | Property detail page |

### Property Type Columns

| Column | Type | Description | UI Usage |
|--------|------|-------------|----------|
| `L_Class` | string | Property class (e.g., "Residential") | Filtering (when propertyType = "Residential") |
| `L_Type_` | string | Property type/subtype (e.g., "Condominium", "SingleFamilyResidence") | Filtering (for all types except "Residential"), display |
| `PropertySubTypeAdditional` | string | Additional property subtype | Property detail page |
| `StructureType` | string | Structure type | Property detail page |
| `ArchitecturalStyle` | string | Architectural style | Property detail page |
| `CommonInterest` | string | Common interest type | Property detail page |
| `CommonWalls` | string | Common walls description | Property detail page |
| `PropertyAttachedYN` | string | Y/N - Is property attached | Filtering (attached/detached) |

### Status and Market Columns

| Column | Type | Description | UI Usage |
|--------|------|-------------|----------|
| `L_Status` | string | Listing status (e.g., "Active", "Pending", "Sold", "Leased", "Rental") | Filtering, display (mapped to "for-sale" or "for-rent") |
| `StandardStatus` | string | Standard status code | Property detail page |
| `PreviousStandardStatus` | string | Previous standard status | Property detail page |
| `DaysOnMarket` | integer | Days on market | Display, filtering (maxDaysOnMarket), averaging |
| `CumulativeDaysOnMarket` | integer | Cumulative days on market | Property detail page |
| `StatusChangeTimestamp` | datetime | When status last changed | Property detail page |

### Lot/Exterior Columns

| Column | Type | Description | UI Usage |
|--------|------|-------------|----------|
| `LotSizeArea` | string | Lot size (area) | Property detail page |
| `LotSizeSquareFeet` | integer | Lot size in square feet | Filtering (minLotSqft), display |
| `LotSizeAcres` | decimal | Lot size in acres | Filtering (minLotAcres), display |
| `LotSizeUnits` | string | Units for lot size | Property detail page |
| `LotFeatures` | text | Lot features description | Filtering (lotFeatures keyword search), display |
| `View` | text | View description | Filtering (keywords), display |
| `ViewYN` | string | Y/N - Has view | Filtering (mustHave.view) |
| `Fencing` | string | Fencing type | Property detail page |

### Interior Features Columns

| Column | Type | Description | UI Usage |
|--------|------|-------------|----------|
| `InteriorFeatures` | text | Interior features description | Filtering (keywords), display |
| `Appliances` | text | Appliances included | Filtering (keywords), display |
| `Flooring` | string | Flooring type | Property detail page |
| `Cooling` | string | Cooling system | Property detail page |
| `CoolingYN` | string | Y/N - Has cooling | Filtering (mustHave.cooling) |
| `Heating` | string | Heating system | Property detail page |
| `HeatingYN` | string | Y/N - Has heating | Property detail page |
| `WaterSource` | string | Water source | Property detail page |
| `Roof` | string | Roof type | Property detail page |
| `SecurityFeatures` | text | Security features | Property detail page |
| `FireplaceFeatures` | text | Fireplace details | Property detail page |
| `FireplaceYN` | string | Y/N - Has fireplace | Filtering (mustHave.fireplace), display |
| `RoomType` | text | Room types | Property detail page |

### Amenities Columns (Boolean Y/N)

| Column | Type | Description | UI Usage |
|--------|------|-------------|----------|
| `PoolPrivateYN` | string | Y/N - Has private pool | Filtering (mustHave.pool), display |
| `PoolFeatures` | text | Pool features | Property detail page |
| `SpaYN` | string | Y/N - Has spa | Filtering (mustHave.spa) |
| `SpaFeatures` | text | Spa features | Property detail page |
| `GarageYN` | string | Y/N - Has garage | Filtering (mustHave.garage), display |
| `AttachedGarageYN` | string | Y/N - Has attached garage | Filtering (mustHave.attachedGarage) |
| `NewConstructionYN` | string | Y/N - New construction | Filtering (mustHave.newConstruction) |
| `SeniorCommunityYN` | string | Y/N - Senior community | Filtering (mustHave.seniorCommunity) |

### HOA/Association Columns

| Column | Type | Description | UI Usage |
|--------|------|-------------|----------|
| `AssociationYN` | string | Y/N - Has HOA | Filtering (hasHOA), display |
| `AssociationName` | string | HOA name | Property detail page |
| `AssociationFee` | decimal | HOA fee amount | Filtering (maxHOA), display |
| `AssociationFeeFrequency` | string | HOA fee frequency (e.g., "Monthly", "Quarterly") | Filtering (hoaFrequency), display |
| `AssociationFee2Frequency` | string | Secondary HOA fee frequency | Property detail page |
| `AssociationAmenities` | text | HOA amenities | Property detail page |

### Community Features Columns

| Column | Type | Description | UI Usage |
|--------|------|-------------|----------|
| `CommunityFeatures` | text | Community features | Filtering (keywords), display |
| `HighSchoolDistrict` | string | High school district | Property detail page |

### Description Columns

| Column | Type | Description | UI Usage |
|--------|------|-------------|----------|
| `L_Remarks` | longtext | Property description/remarks | Search, filtering (keywords), display |
| `Disclosures` | text | Disclosures | Property detail page |
| `SpecialListingConditions` | text | Special conditions | Property detail page |
| `ListingTerms` | text | Listing terms | Property detail page |

### Media Columns

| Column | Type | Description | UI Usage |
|--------|------|-------------|----------|
| `L_Photos` | text | JSON array of photo URLs | Parsed to extract first image URL, full image gallery |
| `PhotoCount` | integer | Number of photos | Property detail page |
| `PhotoTime` | datetime | Photo timestamp | Property detail page |

### Agent/Office Columns

| Column | Type | Description | UI Usage |
|--------|------|-------------|----------|
| `LA1_UserFirstName` | string | Listing agent first name | Property detail page |
| `LA1_UserLastName` | string | Listing agent last name | Property detail page |
| `ListAgentFullName` | string | Listing agent full name | Property detail page (preferred) |
| `ListAgentEmail` | string | Listing agent email | Property detail page |
| `ListAgentDirectPhone` | string | Listing agent direct phone | Property detail page (preferred) |
| `ListAgentOfficePhone` | string | Listing agent office phone | Property detail page (fallback) |
| `ListAgentKey` | string | Listing agent key | Property detail page |
| `ListAgentAOR` | string | Listing agent AOR | Property detail page |
| `LO1_OrganizationName` | string | Listing office name | Property detail page |
| `ListOfficeEmail` | string | Listing office email | Property detail page (fallback) |

### Other Columns

| Column | Type | Description | UI Usage |
|--------|------|-------------|----------|
| `UniversalParcelId` | string | Universal parcel ID | Property detail page |
| `ParcelNumber` | string | Parcel number | Property detail page |
| `TaxLot` | string | Tax lot | Property detail page |
| `PropertyCondition` | string | Property condition | Property detail page |
| `HumanModifiedYN` | string | Y/N - Human modified | Property detail page |
| `NumberOfUnitsTotal` | integer | Total number of units | Property detail page |
| `MainLevelBedrooms` | integer | Main level bedrooms | Property detail page |
| `OccupantType` | string | Occupant type | Property detail page |
| `AdditionalParcelsYN` | string | Y/N - Additional parcels | Property detail page |
| `LandLeaseYN` | string | Y/N - Land lease | Property detail page |
| `ElevationUnits` | string | Elevation units | Property detail page |
| `created_at` | timestamp | Record creation timestamp | Internal |
| `updated_at` | timestamp | Record update timestamp | Internal |

---

## Data Transformations

### Photo JSON Parsing

**Column**: `L_Photos` (text, contains JSON)

**Transformation**:
```php
$photos = json_decode($row['L_Photos'], true);
if (is_array($photos) && !empty($photos)) {
    $images = $photos;
    $imageUrl = $images[0]; // First photo as primary image
}
```

**Fallback**: If JSON is invalid or empty, uses default placeholder:
```php
$imageUrl = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800';
```

**Known Issues**:
- If `L_Photos` contains invalid JSON, `json_decode` returns `null`
- Empty arrays are handled gracefully
- Missing photos use placeholder image

### Status Mapping

**Column**: `L_Status` (string)

**Transformation**:
```php
$statusMap = [
    'Active' => 'for-sale',
    'Pending' => 'for-sale',
    'Sold' => 'for-sale',
    'Leased' => 'for-rent',
    'Rental' => 'for-rent',
];
$status = $statusMap[$dbStatus] ?? 'for-sale'; // Default to 'for-sale'
```

**UI Display**: Frontend receives "for-sale" or "for-rent", never raw database values.

### Property Type Mapping

**Columns**: `L_Class`, `L_Type_`

**Transformation**:
- If `propertyType` filter = "Residential": Filter by `L_Class = "Residential"`
- Otherwise: Filter by `L_Type_ = propertyType` (e.g., "Condominium", "SingleFamilyResidence")

**Display**: Uses `L_Type_` if available, otherwise `L_Class`, with fallback to "SingleFamilyResidence".

### Agent Name Construction

**Columns**: `ListAgentFullName`, `LA1_UserFirstName`, `LA1_UserLastName`

**Transformation**:
```php
$agentFullName = !empty($row['ListAgentFullName']) 
    ? $row['ListAgentFullName'] 
    : trim(($row['LA1_UserFirstName'] ?? '') . ' ' . ($row['LA1_UserLastName'] ?? ''));
```

**Priority**: `ListAgentFullName` > concatenated first/last name.

### Subdivision Name Fallback

**Columns**: `SubdivisionName`, `LM_char10_70`

**Transformation**:
```php
$subdivisionName = !empty($row['SubdivisionName']) 
    ? $row['SubdivisionName'] 
    : ($row['LM_char10_70'] ?? null);
```

### Price Per Square Foot Calculation

**Columns**: `L_SystemPrice`, `LM_Int2_3`

**Transformation**:
```sql
SELECT (L_SystemPrice / LM_Int2_3) as pricePerSqft 
FROM rets_property 
WHERE LM_Int2_3 > 0
ORDER BY pricePerSqft ASC
```

**Filtering**: Only includes rows where `LM_Int2_3 > 0` to avoid division by zero.

### Amenities Extraction

**Column**: `L_Remarks` (description text)

**Transformation** (simple keyword matching):
```php
$amenities = [];
$desc = strtolower($row['L_Remarks']);
if (strpos($desc, 'pool') !== false) $amenities[] = 'Pool';
if (strpos($desc, 'garage') !== false) $amenities[] = 'Garage';
if (strpos($desc, 'fireplace') !== false) $amenities[] = 'Fireplace';
// ... etc
```

**Also Uses**: Direct Y/N columns (`PoolPrivateYN`, `GarageYN`, `FireplaceYN`, etc.) for more accurate detection.

---

## Known Data Quirks

### 1. Bathrooms as Decimal

**Column**: `LM_Dec_3` (decimal)

**Quirk**: Stores bathrooms as decimal to support half baths (e.g., 2.5 = 2 full + 1 half).

**UI Handling**: Frontend displays as float (e.g., "2.5 baths").

### 2. Bedrooms as Integer

**Column**: `L_Keyword2` (integer)

**Quirk**: Bedrooms are always integers (no half bedrooms).

**UI Handling**: Frontend displays as integer.

### 3. Price Null/Zero Handling

**Column**: `L_SystemPrice` (decimal)

**Quirk**: Some rows have `NULL` or `0` prices (invalid listings).

**UI Handling**: 
- All price queries filter: `L_SystemPrice IS NOT NULL AND L_SystemPrice > 0`
- Frontend displays "$0" or "Price not available" for invalid prices (shouldn't happen with filtering).

### 4. Square Feet Null/Zero Handling

**Column**: `LM_Int2_3` (integer)

**Quirk**: Some rows have `NULL` or `0` square feet.

**UI Handling**:
- Price/sqft calculations filter: `LM_Int2_3 > 0`
- Frontend displays "N/A" or "0 sqft" for missing values.

### 5. Date Format Inconsistencies

**Columns**: `ListingContractDate`, `OnMarketDate`

**Quirk**: Some dates may be `NULL`, empty string, or "0000-00-00" (MySQL zero date).

**UI Handling**:
- Date sorting filters: `ListingContractDate IS NOT NULL AND ListingContractDate != '' AND ListingContractDate != '0000-00-00'`
- Frontend displays "N/A" for invalid dates.

### 6. Status Column Single Value

**Column**: `L_Status`

**Quirk**: Database currently only contains "Active" listings (as per user feedback).

**UI Handling**: Status filter was removed from UI since it's not useful (all listings are Active).

### 7. Property Type Split

**Columns**: `L_Class`, `L_Type_`

**Quirk**: "Residential" is stored in `L_Class`, while specific types (Condominium, SingleFamilyResidence, etc.) are in `L_Type_`.

**UI Handling**: Filtering logic checks both columns based on filter value.

### 8. Boolean Columns as Y/N Strings

**Quirk**: All boolean-like columns use "Y"/"N" strings instead of actual booleans.

**Examples**: `PoolPrivateYN`, `GarageYN`, `AssociationYN`, etc.

**UI Handling**: PHP checks `=== 'Y'` for true, `=== 'N'` or `NULL` for false.

### 9. Photos JSON May Be Invalid

**Column**: `L_Photos`

**Quirk**: JSON may be malformed, empty, or contain invalid URLs.

**UI Handling**: 
- `json_decode` with error checking
- Fallback to placeholder image
- Frontend handles empty arrays gracefully

### 10. Latitude/Longitude May Be Zero

**Columns**: `LMD_MP_Latitude`, `LMD_MP_Longitude`

**Quirk**: Some properties have `0, 0` coordinates (invalid).

**UI Handling**: Map queries filter: `LMD_MP_Latitude IS NOT NULL AND LMD_MP_Latitude != 0 AND LMD_MP_Longitude IS NOT NULL AND LMD_MP_Longitude != 0`.

---

## Secondary Tables

### `token` Table

**Purpose**: Stores OAuth access tokens for external API (Trestle).

**Columns**:
- `token_type` (string, primary key) - Token type identifier (e.g., "trestle")
- `access_token` (text) - OAuth access token
- `expires_at` (datetime) - Token expiration timestamp

**Used By**: `generate_token_duc.php`, `fetch_property.php`

### `app_state` Table

**Purpose**: Stores application state (e.g., pagination offsets for data sync).

**Columns**:
- `k` (string, primary key) - State key
- `v` (string) - State value
- `updated_at` (timestamp) - Last update timestamp

**Used By**: `fetch_property.php` (stores sync offset)

---

## Index Recommendations

For optimal query performance, the following indexes are recommended:

1. **Primary Key**: `L_ListingID` (already indexed)
2. **Unique**: `L_DisplayId` (if not already indexed)
3. **Price Filtering**: `L_SystemPrice`
4. **Location Filtering**: `L_City`, `L_Zip`
5. **Feature Filtering**: `L_Keyword2` (bedrooms), `LM_Dec_3` (bathrooms), `LM_Int2_3` (sqft)
6. **Status Filtering**: `L_Status`
7. **Property Type**: `L_Class`, `L_Type_`
8. **Date Sorting**: `ListingContractDate`, `ModificationTimestamp`
9. **Spatial Index**: `(LMD_MP_Latitude, LMD_MP_Longitude)` - critical for map queries
10. **Composite Indexes**:
    - `(L_SystemPrice, L_Keyword2, LM_Dec_3)` - common filter combination
    - `(L_City, L_Zip, L_SystemPrice)` - location + price filtering
    - `(L_Status, L_SystemPrice, ListingContractDate)` - status + price + date sorting

---

## Data Volume Estimates

- **Total Properties**: ~50,000+ (based on safety limits in queries)
- **Average Property Size**: ~200+ columns per row
- **Photo URLs**: 0-50+ per property (stored as JSON array)
- **Description Length**: `L_Remarks` can be very long (longtext), potentially several KB per property

**Storage Considerations**:
- `L_Remarks` (longtext) is the largest column per row
- `L_Photos` (JSON) can be large if many photos
- Indexes add overhead but are essential for performance

