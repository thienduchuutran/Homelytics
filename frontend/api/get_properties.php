<?php
/**
 * get_properties.php
 * API endpoint to fetch properties from rets_property table
 * Returns JSON array of properties formatted for frontend
 */

declare(strict_types=1);

// Disable error display IMMEDIATELY - must be first
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

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
            if ($line === '' || str_starts_with($line, '#')) continue;
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

// ---- Get query parameters for filtering
$minPrice = isset($_GET['minPrice']) ? max(0, (int)$_GET['minPrice']) : 0;
$maxPrice = isset($_GET['maxPrice']) ? max($minPrice, (int)$_GET['maxPrice']) : 100000000;
$bedrooms = isset($_GET['bedrooms']) && $_GET['bedrooms'] !== '' ? max(0, (int)$_GET['bedrooms']) : null;
$bathrooms = isset($_GET['bathrooms']) && $_GET['bathrooms'] !== '' ? max(0, (float)$_GET['bathrooms']) : null;
$propertyType = isset($_GET['propertyType']) && $_GET['propertyType'] !== 'all' ? trim($_GET['propertyType']) : null;
$status = isset($_GET['status']) && $_GET['status'] !== 'all' ? trim($_GET['status']) : null;
$searchTerm = isset($_GET['search']) ? trim($_GET['search']) : '';

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
if ($propertyType !== null) {
    // Map frontend property types to database values
    $propertyTypeMap = [
        'house' => 'Residential',
        'condo' => 'Condo/Co-op',
        'townhouse' => 'Townhouse',
        'apartment' => 'Apartment',
    ];
    $dbPropertyType = $propertyTypeMap[$propertyType] ?? $propertyType;
    $where[] = 'L_Class = :propertyType';
    $params[':propertyType'] = $dbPropertyType;
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

$whereClause = implode(' AND ', $where);

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
    L_Type_ as propertySubType
FROM rets_property 
WHERE $whereClause
ORDER BY ListingContractDate DESC, L_ListingID DESC
LIMIT 500";

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
} catch (Throwable $e) {
    jsonError('Query failed: ' . $e->getMessage(), 500);
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
    
    // Map property type
    $propertyTypeMap = [
        'Residential' => 'house',
        'Condo/Co-op' => 'condo',
        'Townhouse' => 'townhouse',
        'Apartment' => 'apartment',
    ];
    $propertyType = 'house'; // default
    if (!empty($row['propertyType'])) {
        $dbType = $row['propertyType'];
        $propertyType = $propertyTypeMap[$dbType] ?? 'house';
    }
    
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

// ---- Return JSON
try {
    // Clear any output buffer
    ob_clean();
    echo json_encode($houses, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    ob_end_flush();
} catch (Throwable $e) {
    ob_clean();
    jsonError('Error encoding JSON: ' . $e->getMessage(), 500);
}

