<?php
/**
 * insights_price_histogram.php
 * API endpoint to fetch price distribution histogram
 * Returns: array of { bucketMin, bucketMax, count }
 * Bucket size: 50k (configurable)
 */

declare(strict_types=1);

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

// ---- Get filter parameters
$city = isset($_GET['city']) && $_GET['city'] !== '' ? trim($_GET['city']) : null;
$zip = isset($_GET['zip']) && $_GET['zip'] !== '' ? trim($_GET['zip']) : null;
$minPrice = isset($_GET['minPrice']) && $_GET['minPrice'] !== '' ? max(0, (int)$_GET['minPrice']) : null;
$maxPrice = isset($_GET['maxPrice']) && $_GET['maxPrice'] !== '' ? max(0, (int)$_GET['maxPrice']) : null;
$minBeds = isset($_GET['minBeds']) && $_GET['minBeds'] !== '' ? max(0, (int)$_GET['minBeds']) : null;

// Bucket size (default 50000, can be overridden)
$bucketSize = isset($_GET['bucketSize']) && $_GET['bucketSize'] !== '' ? max(10000, (int)$_GET['bucketSize']) : 50000;

// ---- Build WHERE clause
$where = ['1=1'];
$params = [];

// Exclude null/0 prices
$where[] = 'L_SystemPrice IS NOT NULL AND L_SystemPrice > 0';

if ($city !== null) {
    $where[] = 'L_City = :city';
    $params[':city'] = $city;
}
if ($zip !== null) {
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
if ($minBeds !== null && $minBeds > 0) {
    $where[] = 'L_Keyword2 >= :minBeds';
    $params[':minBeds'] = $minBeds;
}

$whereClause = implode(' AND ', $where);

// Safety cap
$safetyLimit = 50000;

// ---- Get min and max prices to determine bucket range
try {
    $rangeSql = "SELECT MIN(L_SystemPrice) as minPrice, MAX(L_SystemPrice) as maxPrice 
                 FROM rets_property 
                 WHERE $whereClause 
                 LIMIT $safetyLimit";
    $rangeStmt = $pdo->prepare($rangeSql);
    $rangeStmt->execute($params);
    $rangeRow = $rangeStmt->fetch();
    
    $actualMinPrice = $rangeRow['minPrice'] !== null ? (int)$rangeRow['minPrice'] : 0;
    $actualMaxPrice = $rangeRow['maxPrice'] !== null ? (int)$rangeRow['maxPrice'] : 0;
} catch (Throwable $e) {
    jsonError('Price range query failed: ' . $e->getMessage(), 500);
}

if ($actualMinPrice === 0 && $actualMaxPrice === 0) {
    echo json_encode([], JSON_PRETTY_PRINT);
    exit;
}

// ---- Create buckets
$buckets = [];
$currentMin = $actualMinPrice;

// Round down to nearest bucket boundary
$currentMin = (int)(floor($currentMin / $bucketSize) * $bucketSize);

while ($currentMin <= $actualMaxPrice) {
    $bucketMax = $currentMin + $bucketSize - 1;
    
    // Count properties in this bucket
    $bucketWhere = $whereClause . ' AND L_SystemPrice >= :bucketMin AND L_SystemPrice <= :bucketMax';
    $bucketParams = array_merge($params, [
        ':bucketMin' => $currentMin,
        ':bucketMax' => $bucketMax,
    ]);
    
    try {
        $bucketCountSql = "SELECT COUNT(*) as cnt FROM rets_property WHERE $bucketWhere LIMIT $safetyLimit";
        $bucketCountStmt = $pdo->prepare($bucketCountSql);
        $bucketCountStmt->execute($bucketParams);
        $bucketCountRow = $bucketCountStmt->fetch();
        $bucketCount = (int)($bucketCountRow['cnt'] ?? 0);
        
        if ($bucketCount > 0) {
            $buckets[] = [
                'bucketMin' => $currentMin,
                'bucketMax' => $bucketMax,
                'count' => $bucketCount,
            ];
        }
    } catch (Throwable $e) {
        error_log("Bucket count calculation failed for range $currentMin-$bucketMax: " . $e->getMessage());
    }
    
    $currentMin += $bucketSize;
}

echo json_encode($buckets, JSON_PRETTY_PRINT);

