<?php
/**
 * get_properties_bbox.php
 * API endpoint to fetch properties within map bounding box
 * Returns JSON array of properties with minimal fields for map/list display
 */

declare(strict_types=1);

// Enable error display for debugging (disable in production)
ini_set('display_errors', '0');
error_reporting(E_ALL);

// Handle CORS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept');
    header('Access-Control-Max-Age: 86400');
    http_response_code(200);
    exit;
}

// Set JSON headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

// Error handler
function jsonError($message, $code = 500) {
    http_response_code($code);
    echo json_encode(['error' => $message], JSON_PRETTY_PRINT);
    exit;
}

// ---- Database configuration
$db_host = 'localhost';
$db_port = '';
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

// ---- Get required bounding box parameters
$minLat = isset($_GET['minLat']) ? (float)$_GET['minLat'] : null;
$maxLat = isset($_GET['maxLat']) ? (float)$_GET['maxLat'] : null;
$minLng = isset($_GET['minLng']) ? (float)$_GET['minLng'] : null;
$maxLng = isset($_GET['maxLng']) ? (float)$_GET['maxLng'] : null;

// Validate required parameters
if ($minLat === null || $maxLat === null || $minLng === null || $maxLng === null) {
    jsonError('Missing required parameters: minLat, maxLat, minLng, maxLng', 400);
}

// Validate bounds
if ($minLat >= $maxLat || $minLng >= $maxLng) {
    jsonError('Invalid bounding box: minLat must be < maxLat and minLng must be < maxLng', 400);
}

// ---- Get optional filter parameters
$city = isset($_GET['city']) ? trim($_GET['city']) : null;
$zip = isset($_GET['zip']) ? trim($_GET['zip']) : null;
$minPrice = isset($_GET['minPrice']) ? max(0, (int)$_GET['minPrice']) : null;
$maxPrice = isset($_GET['maxPrice']) ? max(0, (int)$_GET['maxPrice']) : null;
$minBeds = isset($_GET['minBeds']) && $_GET['minBeds'] !== '' ? max(0, (int)$_GET['minBeds']) : null;
$minBaths = isset($_GET['minBaths']) && $_GET['minBaths'] !== '' ? max(0, (float)$_GET['minBaths']) : null;
$status = isset($_GET['status']) && $_GET['status'] !== 'all' ? trim($_GET['status']) : null;

// Pagination
$limit = isset($_GET['limit']) ? min(500, max(1, (int)$_GET['limit'])) : 200;
$offset = isset($_GET['offset']) ? max(0, (int)$_GET['offset']) : 0;

// ---- Build WHERE clause
$where = ['1=1'];
$params = [];

// Bounding box filter (required)
$where[] = 'LMD_MP_Latitude IS NOT NULL AND LMD_MP_Latitude != 0';
$where[] = 'LMD_MP_Longitude IS NOT NULL AND LMD_MP_Longitude != 0';
$where[] = 'LMD_MP_Latitude >= :minLat AND LMD_MP_Latitude <= :maxLat';
$where[] = 'LMD_MP_Longitude >= :minLng AND LMD_MP_Longitude <= :maxLng';
$params[':minLat'] = $minLat;
$params[':maxLat'] = $maxLat;
$params[':minLng'] = $minLng;
$params[':maxLng'] = $maxLng;

// Optional filters
if ($city !== null && $city !== '') {
    $where[] = 'L_City LIKE :city';
    $params[':city'] = '%' . $city . '%';
}

if ($zip !== null && $zip !== '') {
    $where[] = 'L_Zip = :zip';
    $params[':zip'] = $zip;
}

if ($minPrice !== null && $minPrice > 0) {
    $where[] = 'L_SystemPrice >= :minPrice';
    $params[':minPrice'] = $minPrice;
}

if ($maxPrice !== null && $maxPrice > 0) {
    $where[] = 'L_SystemPrice <= :maxPrice';
    $params[':maxPrice'] = $maxPrice;
}

if ($minBeds !== null) {
    $where[] = 'L_Keyword2 >= :minBeds';
    $params[':minBeds'] = $minBeds;
}

if ($minBaths !== null) {
    $where[] = 'LM_Dec_3 >= :minBaths';
    $params[':minBaths'] = $minBaths;
}

if ($status !== null) {
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

$whereClause = implode(' AND ', $where);

// ---- Fetch properties
$sql = "SELECT 
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
WHERE $whereClause
ORDER BY ModificationTimestamp DESC, L_ListingID DESC
LIMIT :limit OFFSET :offset";

try {
    $stmt = $pdo->prepare($sql);
    
    // Bind limit and offset separately (PDO doesn't support them in execute for some drivers)
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    
    $stmt->execute();
    $rows = $stmt->fetchAll();
} catch (Throwable $e) {
    jsonError('Query failed: ' . $e->getMessage(), 500);
}

// ---- Map database fields to response format
function mapPropertyForMap(array $row): array {
    // Parse photos JSON
    $photoUrl = null;
    if (!empty($row['photos'])) {
        $photos = json_decode($row['photos'], true);
        if (is_array($photos) && !empty($photos) && isset($photos[0])) {
            $photoUrl = $photos[0];
        }
    }
    
    // Default image if none available
    if (!$photoUrl) {
        $photoUrl = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800';
    }
    
    return [
        'id' => (string)$row['id'],
        'lat' => (float)$row['lat'],
        'lng' => (float)$row['lng'],
        'address' => $row['address'] ?? '',
        'city' => $row['city'] ?? '',
        'state' => $row['state'] ?? '',
        'zip' => $row['zip'] ?? '',
        'price' => (int)($row['price'] ?? 0),
        'beds' => (int)($row['beds'] ?? 0),
        'baths' => (float)($row['baths'] ?? 0),
        'sqft' => (int)($row['sqft'] ?? 0),
        'photo' => $photoUrl,
        'status' => $row['status'] ?? 'Active',
        'dom' => !empty($row['dom']) ? (int)$row['dom'] : null,
    ];
}

// ---- Transform all properties
try {
    $properties = array_map('mapPropertyForMap', $rows);
} catch (Throwable $e) {
    jsonError('Error mapping properties: ' . $e->getMessage(), 500);
}

// ---- Return JSON
echo json_encode($properties, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

