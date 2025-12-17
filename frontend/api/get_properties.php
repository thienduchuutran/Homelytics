<?php
/**
 * get_properties.php
 * API endpoint to fetch properties from rets_property table
 * Returns JSON array of properties formatted for frontend
 * VERSION: 2.0 - WITH SORTING AND DEBUG
 */

declare(strict_types=1);

// TEMPORARY: Enable error display to debug
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// FORCE VERSION CHECK - if you see this in response, new file is loaded
$FILE_VERSION = '3.0-ENHANCED-FILTERS';

// Set output buffering to catch any errors
ob_start();

// Handle CORS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept');
    header('Access-Control-Max-Age: 86400'); // 24 hours
    http_response_code(200);
    exit;
}

// Set JSON headers early
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

// Error handler to return JSON on errors
function jsonError($message, $code = 500) {
    http_response_code($code);
    echo json_encode(['error' => $message], JSON_PRETTY_PRINT);
    exit;
}

// ---- Load .env from project root (if present)
$projectRoot = dirname(__DIR__);
$envPath = $projectRoot . '/.env';
if (is_file($envPath) && is_readable($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || substr($line, 0, 1) === '#') continue;
            $pos = strpos($line, '=');
            if ($pos === false) continue;
            $key = trim(substr($line, 0, $pos));
            $val = trim(substr($line, $pos + 1));
            if ($val !== '' && ($val[0] === '"' || $val[0] === "'")) {
                $val = trim($val, "\"'");
            }
            if ($key !== '') {
                putenv($key . '=' . $val);
                $_ENV[$key] = $val;
                $_SERVER[$key] = $val;
            }
        }
    }
}

// ---- Database configuration from environment (falls back to fetch_property defaults)
$db_host = 'localhost';          // or 127.0.0.1 if you ever had 2002 errors
$db_port = '';                   // empty means default
$db_name = 'boxgra6_duc';
$db_user = 'boxgra6_duc';
$db_pass = '123456';

// ---- Connect to database via PDO
if ($db_port !== '') {
    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $db_host, $db_port, $db_name);
} else {
    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $db_host, $db_name);
}

try {
    $pdo = new PDO($dsn, $db_user, $db_pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (Throwable $e) {
    jsonError('Database connection failed: ' . $e->getMessage(), 500);
}

// Get distinct property types for debugging (check both L_Class and L_Type_)
$distinctPropertyTypes = [];
try {
    // Get distinct L_Class values (parent category like "Residential")
    $classStmt = $pdo->query("SELECT DISTINCT L_Class, COUNT(*) as count FROM rets_property WHERE L_Class IS NOT NULL AND L_Class != '' GROUP BY L_Class ORDER BY L_Class");
    $classRows = $classStmt->fetchAll();
    $classTypes = array_map(function($row) {
        return 'L_Class: ' . $row['L_Class'] . ' (' . $row['count'] . ')';
    }, $classRows);
    
    // Get distinct L_Type_ values (specific types like Condominium, Cabin, etc.)
    $typeStmt = $pdo->query("SELECT DISTINCT L_Type_, COUNT(*) as count FROM rets_property WHERE L_Type_ IS NOT NULL AND L_Type_ != '' GROUP BY L_Type_ ORDER BY L_Type_");
    $typeRows = $typeStmt->fetchAll();
    $subTypes = array_map(function($row) {
        return 'L_Type_: ' . $row['L_Type_'] . ' (' . $row['count'] . ')';
    }, $typeRows);
    
    $distinctPropertyTypes = array_merge($classTypes, $subTypes);
} catch (Throwable $e) {
    // Ignore errors in debug query
    $distinctPropertyTypes = ['Error fetching distinct types: ' . $e->getMessage()];
}

// ---- Get query parameters for filtering
$minPrice = isset($_GET['minPrice']) ? max(0, (int)$_GET['minPrice']) : 0;
$maxPrice = isset($_GET['maxPrice']) ? max($minPrice, (int)$_GET['maxPrice']) : 100000000;
$bedrooms = isset($_GET['bedrooms']) && $_GET['bedrooms'] !== '' ? max(0, (int)$_GET['bedrooms']) : null;
$bathrooms = isset($_GET['bathrooms']) && $_GET['bathrooms'] !== '' ? max(0, (float)$_GET['bathrooms']) : null;
$propertyType = isset($_GET['propertyType']) && $_GET['propertyType'] !== 'all' ? trim($_GET['propertyType']) : null;
$status = isset($_GET['status']) && $_GET['status'] !== 'all' ? trim($_GET['status']) : null;
$searchTerm = isset($_GET['search']) ? trim($_GET['search']) : '';

// ---- New filter parameters
// Lot/Yard filters
$minLotSqft = isset($_GET['minLotSqft']) && $_GET['minLotSqft'] !== '' ? max(0, (int)$_GET['minLotSqft']) : null;
$minLotAcres = isset($_GET['minLotAcres']) && $_GET['minLotAcres'] !== '' ? max(0, (float)$_GET['minLotAcres']) : null;
$lotFeatures = isset($_GET['lotFeatures']) ? trim($_GET['lotFeatures']) : null; // Comma-separated or single value

// HOA filters
$hasHOA = isset($_GET['hasHOA']) && $_GET['hasHOA'] !== '' ? filter_var($_GET['hasHOA'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;
$maxHOA = isset($_GET['maxHOA']) && $_GET['maxHOA'] !== '' ? max(0, (float)$_GET['maxHOA']) : null;
$hoaFrequency = isset($_GET['hoaFrequency']) ? trim($_GET['hoaFrequency']) : null;

// Extended must-have filters
$mustHaveSpa = isset($_GET['mustHaveSpa']) && $_GET['mustHaveSpa'] !== '' ? filter_var($_GET['mustHaveSpa'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;
$mustHaveSeniorCommunity = isset($_GET['mustHaveSeniorCommunity']) && $_GET['mustHaveSeniorCommunity'] !== '' ? filter_var($_GET['mustHaveSeniorCommunity'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;
$mustHaveCooling = isset($_GET['mustHaveCooling']) && $_GET['mustHaveCooling'] !== '' ? filter_var($_GET['mustHaveCooling'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;
$mustHaveAttachedGarage = isset($_GET['mustHaveAttachedGarage']) && $_GET['mustHaveAttachedGarage'] !== '' ? filter_var($_GET['mustHaveAttachedGarage'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;
$mustHavePool = isset($_GET['mustHavePool']) && $_GET['mustHavePool'] !== '' ? filter_var($_GET['mustHavePool'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;
$mustHaveGarage = isset($_GET['mustHaveGarage']) && $_GET['mustHaveGarage'] !== '' ? filter_var($_GET['mustHaveGarage'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;
$mustHaveFireplace = isset($_GET['mustHaveFireplace']) && $_GET['mustHaveFireplace'] !== '' ? filter_var($_GET['mustHaveFireplace'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;
$mustHaveView = isset($_GET['mustHaveView']) && $_GET['mustHaveView'] !== '' ? filter_var($_GET['mustHaveView'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;
$mustHaveNewConstruction = isset($_GET['mustHaveNewConstruction']) && $_GET['mustHaveNewConstruction'] !== '' ? filter_var($_GET['mustHaveNewConstruction'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;

// Time/Market filters
$maxDaysOnMarket = isset($_GET['maxDaysOnMarket']) && $_GET['maxDaysOnMarket'] !== '' ? max(0, (int)$_GET['maxDaysOnMarket']) : null;
$listedAfter = isset($_GET['listedAfter']) ? trim($_GET['listedAfter']) : null; // YYYY-MM-DD format

// Attached/Detached filter
$attached = isset($_GET['attached']) && $_GET['attached'] !== '' ? filter_var($_GET['attached'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;

// Keywords filter (comma-separated, searches multiple fields)
$keywords = isset($_GET['keywords']) ? trim($_GET['keywords']) : null;

// TEST: Uncomment this to verify new file is loaded
// header('Content-Type: application/json');
// echo json_encode(['_test' => 'NEW FILE LOADED', 'version' => $FILE_VERSION]);
// exit;

// ---- Get sorting parameter
$sortBy = isset($_GET['sortBy']) ? trim($_GET['sortBy']) : 'newest';

// ---- Build WHERE clause
$where = ['1=1'];
$params = [];

if ($minPrice > 0) {
    $where[] = 'L_SystemPrice >= :minPrice';
    $params[':minPrice'] = $minPrice;
}
if ($maxPrice < 100000000) {
    $where[] = 'L_SystemPrice <= :maxPrice';
    $params[':maxPrice'] = $maxPrice;
}
if ($bedrooms !== null) {
    $where[] = 'L_Keyword2 >= :bedrooms';
    $params[':bedrooms'] = $bedrooms;
}
if ($bathrooms !== null) {
    $where[] = 'LM_Dec_3 >= :bathrooms';
    $params[':bathrooms'] = $bathrooms;
}
// Square feet filter (minSqft)
$minSqft = isset($_GET['minSqft']) && $_GET['minSqft'] !== '' ? max(0, (int)$_GET['minSqft']) : null;
if ($minSqft !== null && $minSqft > 0) {
    $where[] = 'LM_Int2_3 >= :minSqft';
    $params[':minSqft'] = $minSqft;
}
if ($propertyType !== null) {
    // Check propertyTypeFilter value to determine which column to filter
    // "Residential" is stored in L_Class, all other types (Condominium, Cabin, etc.) are in L_Type_
    if ($propertyType === 'Residential') {
        $where[] = 'TRIM(L_Class) = TRIM(:propertyType)';
    } else {
        // All specific types (Condominium, Cabin, Duplex, etc.) are in L_Type_ (PropertySubType)
        $where[] = 'TRIM(L_Type_) = TRIM(:propertyType)';
    }
    $params[':propertyType'] = $propertyType;
}
if ($status !== null) {
    // Map frontend status to database values
    $statusMap = [
        'for-sale' => ['Active', 'Pending', 'Sold'],
        'for-rent' => ['Leased', 'Rental'],
    ];
    if (isset($statusMap[$status])) {
        $placeholders = [];
        foreach ($statusMap[$status] as $idx => $dbStatus) {
            $key = ':status' . $idx;
            $placeholders[] = $key;
            $params[$key] = $dbStatus;
        }
        $where[] = 'L_Status IN (' . implode(',', $placeholders) . ')';
    } else {
        $where[] = 'L_Status = :status';
        $params[':status'] = $status;
    }
}
if ($searchTerm !== '') {
    // Use separate placeholders for each field to avoid potential PDO issues
    $searchPattern = '%' . $searchTerm . '%';
    $where[] = '(L_Address LIKE :search1 OR L_City LIKE :search2 OR L_State LIKE :search3 OR L_Remarks LIKE :search4)';
    $params[':search1'] = $searchPattern;
    $params[':search2'] = $searchPattern;
    $params[':search3'] = $searchPattern;
    $params[':search4'] = $searchPattern;
}

// ---- Lot/Yard filters
if ($minLotSqft !== null && $minLotSqft > 0) {
    $where[] = 'LotSizeSquareFeet >= :minLotSqft';
    $params[':minLotSqft'] = $minLotSqft;
}
if ($minLotAcres !== null && $minLotAcres > 0) {
    $where[] = 'LotSizeAcres >= :minLotAcres';
    $params[':minLotAcres'] = $minLotAcres;
}
if ($lotFeatures !== null && $lotFeatures !== '') {
    // Split comma-separated features and search in LotFeatures column
    $features = array_map('trim', explode(',', $lotFeatures));
    $featureConditions = [];
    foreach ($features as $idx => $feature) {
        if (!empty($feature)) {
            $key = ':lotFeature' . $idx;
            $featureConditions[] = "LotFeatures LIKE $key";
            $params[$key] = '%' . $feature . '%';
        }
    }
    if (!empty($featureConditions)) {
        $where[] = '(' . implode(' OR ', $featureConditions) . ')';
    }
}

// ---- HOA filters
if ($hasHOA !== null) {
    if ($hasHOA === true) {
        $where[] = 'AssociationYN = :hasHOA';
        $params[':hasHOA'] = 'Y';
    } else {
        $where[] = '(AssociationYN IS NULL OR AssociationYN = :hasHOA)';
        $params[':hasHOA'] = 'N';
    }
}
if ($maxHOA !== null && $maxHOA > 0) {
    $where[] = 'AssociationFee <= :maxHOA';
    $params[':maxHOA'] = $maxHOA;
}
if ($hoaFrequency !== null && $hoaFrequency !== '') {
    $where[] = 'AssociationFeeFrequency = :hoaFrequency';
    $params[':hoaFrequency'] = $hoaFrequency;
}

// ---- Extended must-have filters
if ($mustHaveSpa === true) {
    $where[] = 'SpaYN = :mustHaveSpa';
    $params[':mustHaveSpa'] = 'Y';
}
if ($mustHaveSeniorCommunity === true) {
    $where[] = 'SeniorCommunityYN = :mustHaveSeniorCommunity';
    $params[':mustHaveSeniorCommunity'] = 'Y';
}
if ($mustHaveCooling === true) {
    $where[] = 'CoolingYN = :mustHaveCooling';
    $params[':mustHaveCooling'] = 'Y';
}
if ($mustHaveAttachedGarage === true) {
    $where[] = 'AttachedGarageYN = :mustHaveAttachedGarage';
    $params[':mustHaveAttachedGarage'] = 'Y';
}
if ($mustHavePool === true) {
    $where[] = 'PoolPrivateYN = :mustHavePool';
    $params[':mustHavePool'] = 'Y';
}
if ($mustHaveGarage === true) {
    $where[] = 'GarageYN = :mustHaveGarage';
    $params[':mustHaveGarage'] = 'Y';
}
if ($mustHaveFireplace === true) {
    $where[] = 'FireplaceYN = :mustHaveFireplace';
    $params[':mustHaveFireplace'] = 'Y';
}
if ($mustHaveView === true) {
    $where[] = 'ViewYN = :mustHaveView';
    $params[':mustHaveView'] = 'Y';
}
if ($mustHaveNewConstruction === true) {
    $where[] = 'NewConstructionYN = :mustHaveNewConstruction';
    $params[':mustHaveNewConstruction'] = 'Y';
}

// ---- Time/Market filters
if ($maxDaysOnMarket !== null && $maxDaysOnMarket > 0) {
    $where[] = 'DaysOnMarket <= :maxDaysOnMarket';
    $params[':maxDaysOnMarket'] = $maxDaysOnMarket;
}
if ($listedAfter !== null && $listedAfter !== '') {
    // Validate date format YYYY-MM-DD
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $listedAfter)) {
        $where[] = 'OnMarketDate >= :listedAfter';
        $params[':listedAfter'] = $listedAfter;
    }
}

// ---- Attached/Detached filter
if ($attached !== null) {
    if ($attached === true) {
        $where[] = 'PropertyAttachedYN = :attached';
        $params[':attached'] = 'Y';
    } else {
        $where[] = '(PropertyAttachedYN IS NULL OR PropertyAttachedYN = :attached)';
        $params[':attached'] = 'N';
    }
}

// ---- Keywords filter (searches in multiple text fields)
if ($keywords !== null && $keywords !== '') {
    $keywordTerms = array_map('trim', explode(',', $keywords));
    $keywordConditions = [];
    foreach ($keywordTerms as $idx => $keyword) {
        if (!empty($keyword)) {
            $keywordPattern = '%' . $keyword . '%';
            $keywordConditions[] = "(L_Remarks LIKE :keyword{$idx}_1 OR InteriorFeatures LIKE :keyword{$idx}_2 OR Appliances LIKE :keyword{$idx}_3 OR CommunityFeatures LIKE :keyword{$idx}_4 OR LotFeatures LIKE :keyword{$idx}_5 OR View LIKE :keyword{$idx}_6)";
            $params[":keyword{$idx}_1"] = $keywordPattern;
            $params[":keyword{$idx}_2"] = $keywordPattern;
            $params[":keyword{$idx}_3"] = $keywordPattern;
            $params[":keyword{$idx}_4"] = $keywordPattern;
            $params[":keyword{$idx}_5"] = $keywordPattern;
            $params[":keyword{$idx}_6"] = $keywordPattern;
        }
    }
    if (!empty($keywordConditions)) {
        $where[] = '(' . implode(' OR ', $keywordConditions) . ')';
    }
}

// When sorting by price, exclude NULL and zero prices for better results
if ($sortBy === 'price-low' || $sortBy === 'price-high') {
    $where[] = 'L_SystemPrice IS NOT NULL AND L_SystemPrice > 0';
}

// When sorting by date, exclude NULL and invalid dates for better results
if ($sortBy === 'newest' || $sortBy === 'oldest') {
    $where[] = "ListingContractDate IS NOT NULL AND ListingContractDate != '' AND ListingContractDate != '0000-00-00' AND ListingContractDate != '0000-00-00 00:00:00'";
}

$whereClause = implode(' AND ', $where);

// ---- Build ORDER BY clause based on sortBy parameter
// Map sortBy to column and direction
$sortColumn = 'ListingContractDate';
$sortDirection = 'DESC';
$secondarySort = 'L_ListingID DESC';

switch ($sortBy) {
    case 'newest':
        $sortColumn = 'ListingContractDate';
        $sortDirection = 'DESC';
        $secondarySort = 'L_ListingID DESC';
        break;
    case 'oldest':
        $sortColumn = 'ListingContractDate';
        $sortDirection = 'ASC';
        $secondarySort = 'L_ListingID ASC';
        break;
    case 'price-low':
        $sortColumn = 'L_SystemPrice';
        $sortDirection = 'ASC';
        $secondarySort = 'L_ListingID ASC';
        break;
    case 'price-high':
        $sortColumn = 'L_SystemPrice';
        $sortDirection = 'DESC';
        $secondarySort = 'L_ListingID DESC';
        break;
    case 'bedrooms-low':
        $sortColumn = 'L_Keyword2';
        $sortDirection = 'ASC';
        $secondarySort = 'L_ListingID ASC';
        break;
    case 'bedrooms-high':
        $sortColumn = 'L_Keyword2';
        $sortDirection = 'DESC';
        $secondarySort = 'L_ListingID DESC';
        break;
    case 'bathrooms-low':
        $sortColumn = 'LM_Dec_3';
        $sortDirection = 'ASC';
        $secondarySort = 'L_ListingID ASC';
        break;
    case 'bathrooms-high':
        $sortColumn = 'LM_Dec_3';
        $sortDirection = 'DESC';
        $secondarySort = 'L_ListingID DESC';
        break;
    case 'sqft-low':
        $sortColumn = 'LM_Int2_3';
        $sortDirection = 'ASC';
        $secondarySort = 'L_ListingID ASC';
        break;
    case 'sqft-high':
        $sortColumn = 'LM_Int2_3';
        $sortDirection = 'DESC';
        $secondarySort = 'L_ListingID DESC';
        break;
    default:
        $sortColumn = 'ListingContractDate';
        $sortDirection = 'DESC';
        $secondarySort = 'L_ListingID DESC';
}

// Build ORDER BY with NULL handling - put NULLs last
// For date columns, use different NULL handling
if ($sortColumn === 'ListingContractDate') {
    // Date column - ensure proper date comparison
    // Put NULL/empty/invalid dates at the end regardless of sort direction
    // MySQL DATE/DATETIME comparison works correctly, but handle edge cases
    $orderByClause = "CASE 
        WHEN $sortColumn IS NULL OR $sortColumn = '' OR $sortColumn = '0000-00-00' OR $sortColumn = '0000-00-00 00:00:00' THEN 1 
        ELSE 0 
    END, 
    $sortColumn $sortDirection, 
    $secondarySort";
} else {
    // Numeric columns - use IS NULL check, handle empty strings and zeros
    if ($sortColumn === 'L_SystemPrice') {
        // For price sorting, ensure proper numeric comparison using DECIMAL
        // Put NULL/zero prices at the end (but WHERE clause already filters these for price sorts)
        $orderByClause = "CASE 
            WHEN $sortColumn IS NULL OR $sortColumn = 0 OR $sortColumn = '' THEN 1 
            ELSE 0 
        END, 
        CAST(COALESCE(NULLIF($sortColumn, ''), 0) AS DECIMAL(15,2)) $sortDirection, 
        $secondarySort";
    } else {
        // Other numeric columns - put NULLs/zeros at the end
        $orderByClause = "CASE 
            WHEN $sortColumn IS NULL OR $sortColumn = 0 OR $sortColumn = '' THEN 1 
            ELSE 0 
        END, 
        $sortColumn $sortDirection, 
        $secondarySort";
    }
}

// ---- Fetch properties
$sql = "SELECT 
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
WHERE $whereClause
ORDER BY " . $orderByClause . "
LIMIT 500";

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
} catch (Throwable $e) {
    // Log the error with full details
    error_log("SQL Error for sortBy=$sortBy: " . $e->getMessage());
    error_log("SQL: " . $sql);
    error_log("ORDER BY clause: " . $orderByClause);
    jsonError('Query failed: ' . $e->getMessage() . ' | SortBy: ' . $sortBy . ' | ORDER BY: ' . $orderByClause, 500);
}

// ---- Map database fields to House interface
function mapPropertyToHouse(array $row): array {
    // Parse photos JSON
    $images = [];
    if (!empty($row['L_Photos'])) {
        $photos = json_decode($row['L_Photos'], true);
        if (is_array($photos) && !empty($photos)) {
            $images = $photos;
        }
    }
    
    // Default image if none available
    $imageUrl = !empty($images) ? $images[0] : 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800';
    
    // Use database property type value directly (frontend handles display mapping)
    $propertyType = !empty($row['propertyType']) ? $row['propertyType'] : 'SingleFamilyResidence';
    
    // Map status
    $statusMap = [
        'Active' => 'for-sale',
        'Pending' => 'for-sale',
        'Sold' => 'for-sale',
        'Leased' => 'for-rent',
        'Rental' => 'for-rent',
    ];
    $status = 'for-sale'; // default
    if (!empty($row['L_Status'])) {
        $dbStatus = $row['L_Status'];
        $status = $statusMap[$dbStatus] ?? 'for-sale';
    }
    
    // Generate title from address
    $title = !empty($row['L_Address']) ? $row['L_Address'] : 'Property';
    if (!empty($row['propertySubType'])) {
        $title = $row['propertySubType'] . ' at ' . $title;
    }
    
    // Extract amenities from description and other fields
    $amenities = [];
    if (!empty($row['description'])) {
        $desc = strtolower($row['description']);
        if (strpos($desc, 'pool') !== false) $amenities[] = 'Pool';
        if (strpos($desc, 'garage') !== false) $amenities[] = 'Garage';
        if (strpos($desc, 'fireplace') !== false) $amenities[] = 'Fireplace';
        if (strpos($desc, 'garden') !== false) $amenities[] = 'Garden';
        if (strpos($desc, 'balcony') !== false) $amenities[] = 'Balcony';
    }
    if (empty($amenities)) {
        $amenities = ['Modern Features'];
    }
    
    return [
        'id' => (string)($row['L_ListingID'] ?? $row['L_DisplayId'] ?? uniqid()),
        'title' => $title,
        'address' => $row['L_Address'] ?? '',
        'city' => $row['L_City'] ?? '',
        'state' => $row['L_State'] ?? '',
        'zipCode' => $row['L_Zip'] ?? '',
        'price' => (int)($row['L_SystemPrice'] ?? 0),
        'bedrooms' => (int)($row['bedrooms'] ?? 0),
        'bathrooms' => (float)($row['bathrooms'] ?? 0),
        'squareFeet' => (int)($row['squareFeet'] ?? 0),
        'propertyType' => $propertyType,
        'status' => $status,
        'description' => $row['description'] ?? 'No description available.',
        'imageUrl' => $imageUrl,
        'yearBuilt' => !empty($row['YearBuilt']) ? (int)$row['YearBuilt'] : null,
        'parking' => !empty($row['parking']) ? (int)$row['parking'] : null,
        'amenities' => $amenities,
        'listingDate' => $row['ListingContractDate'] ?? date('Y-m-d'),
    ];
}

// ---- Transform all properties
try {
    $houses = array_map('mapPropertyToHouse', $rows);
} catch (Throwable $e) {
    jsonError('Error mapping properties: ' . $e->getMessage(), 500);
}

// ---- Return JSON with debug info (temporary)
// FORCE DEBUG FORMAT - this proves the new file is running
try {
    // Clear any output buffer
    ob_clean();
    
    // ALWAYS return debug format - FORCE IT
    // If you see this structure, new file is definitely loaded
    $response = [
        '_NEW_FILE_LOADED' => true,
        '_version' => $FILE_VERSION,
        '_timestamp' => date('Y-m-d H:i:s'),
        '_debug' => [
            'sortBy' => $sortBy,
            'sortColumn' => isset($sortColumn) ? $sortColumn : 'ERROR: NOT SET',
            'sortDirection' => isset($sortDirection) ? $sortDirection : 'ERROR: NOT SET',
            'orderByClause' => isset($orderByClause) ? $orderByClause : 'ERROR: NOT SET',
            'sqlPreview' => isset($sql) ? substr($sql, 0, 400) : 'ERROR: SQL NOT SET',
            'rowCount' => isset($rows) ? count($rows) : 0,
            'houseCount' => isset($houses) ? count($houses) : 0,
            'firstPrice' => !empty($rows[0]['L_SystemPrice']) ? (float)$rows[0]['L_SystemPrice'] : null,
            'lastPrice' => !empty($rows[count($rows)-1]['L_SystemPrice']) ? (float)$rows[count($rows)-1]['L_SystemPrice'] : null,
            'propertyTypeFilter' => $propertyType,
            'whereClause' => isset($whereClause) ? $whereClause : 'ERROR: NOT SET',
            'uniquePropertyTypes' => !empty($rows) ? array_values(array_unique(array_filter(array_column($rows, 'propertyType')))) : [],
            'distinctPropertyTypesInDB' => $distinctPropertyTypes,
            'params' => $params,
        ],
        'data' => isset($houses) ? $houses : [],
    ];
    
    // Clear buffer and force JSON
    while (ob_get_level()) ob_end_clean();
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-cache, must-revalidate');
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit(0);
} catch (Throwable $e) {
    ob_clean();
    jsonError('Error encoding JSON: ' . $e->getMessage(), 500);
}

