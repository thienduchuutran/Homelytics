<?php
/**
 * insights_median_by_zip.php
 * API endpoint to fetch median price and price/sqft by ZIP code
 * Returns: array of { zip, count, medianPrice, medianPricePerSqft }
 * Limited to top 15 ZIPs by count
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

// ---- Build WHERE clause
$where = ['1=1'];
$params = [];

// Exclude null/0 prices
$where[] = 'L_SystemPrice IS NOT NULL AND L_SystemPrice > 0';
$where[] = 'L_Zip IS NOT NULL AND L_Zip != ""';

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

// ---- Get top 15 ZIPs by count
try {
    $zipCountSql = "SELECT L_Zip, COUNT(*) as cnt 
                    FROM rets_property 
                    WHERE $whereClause 
                    GROUP BY L_Zip 
                    ORDER BY cnt DESC 
                    LIMIT 15";
    $zipCountStmt = $pdo->prepare($zipCountSql);
    $zipCountStmt->execute($params);
    $zipCountRows = $zipCountStmt->fetchAll();
} catch (Throwable $e) {
    jsonError('ZIP count query failed: ' . $e->getMessage(), 500);
}

$results = [];

foreach ($zipCountRows as $zipRow) {
    $currentZip = $zipRow['L_Zip'];
    $zipCount = (int)$zipRow['cnt'];
    
    // Build WHERE clause for this specific ZIP
    $zipWhere = $whereClause . ' AND L_Zip = :zipCode';
    $zipParams = array_merge($params, [':zipCode' => $currentZip]);
    
    // Calculate median price for this ZIP
    $medianPrice = null;
    try {
        $zipTotalCount = $zipCount;
        if ($zipTotalCount > 0) {
            $zipOffset = (int)floor(($zipTotalCount - 1) / 2);
            $zipLimit = ($zipTotalCount % 2 === 0) ? 2 : 1;
            
            $zipMedianSql = "SELECT L_SystemPrice FROM rets_property 
                            WHERE $zipWhere 
                            ORDER BY L_SystemPrice ASC 
                            LIMIT $zipLimit OFFSET $zipOffset";
            $zipMedianStmt = $pdo->prepare($zipMedianSql);
            $zipMedianStmt->execute($zipParams);
            $zipMedianRows = $zipMedianStmt->fetchAll();
            
            if (count($zipMedianRows) === 1) {
                $medianPrice = (float)$zipMedianRows[0]['L_SystemPrice'];
            } elseif (count($zipMedianRows) === 2) {
                $medianPrice = ((float)$zipMedianRows[0]['L_SystemPrice'] + (float)$zipMedianRows[1]['L_SystemPrice']) / 2;
            }
        }
    } catch (Throwable $e) {
        error_log("Median price calculation failed for ZIP $currentZip: " . $e->getMessage());
    }
    
    // Calculate median price per sqft for this ZIP
    $medianPricePerSqft = null;
    try {
        $zipPpsfWhere = $zipWhere . ' AND LM_Int2_3 > 0';
        $zipPpsfCountSql = "SELECT COUNT(*) as cnt FROM rets_property WHERE $zipPpsfWhere LIMIT $safetyLimit";
        $zipPpsfCountStmt = $pdo->prepare($zipPpsfCountSql);
        $zipPpsfCountStmt->execute($zipParams);
        $zipPpsfCountRow = $zipPpsfCountStmt->fetch();
        $zipPpsfCount = (int)($zipPpsfCountRow['cnt'] ?? 0);
        
        if ($zipPpsfCount > 0) {
            $zipPpsfOffset = (int)floor(($zipPpsfCount - 1) / 2);
            $zipPpsfLimit = ($zipPpsfCount % 2 === 0) ? 2 : 1;
            
            $zipPpsfSql = "SELECT (L_SystemPrice / LM_Int2_3) as pricePerSqft 
                          FROM rets_property 
                          WHERE $zipPpsfWhere 
                          ORDER BY pricePerSqft ASC 
                          LIMIT $zipPpsfLimit OFFSET $zipPpsfOffset";
            $zipPpsfStmt = $pdo->prepare($zipPpsfSql);
            $zipPpsfStmt->execute($zipParams);
            $zipPpsfRows = $zipPpsfStmt->fetchAll();
            
            if (count($zipPpsfRows) === 1) {
                $medianPricePerSqft = (float)$zipPpsfRows[0]['pricePerSqft'];
            } elseif (count($zipPpsfRows) === 2) {
                $medianPricePerSqft = ((float)$zipPpsfRows[0]['pricePerSqft'] + (float)$zipPpsfRows[1]['pricePerSqft']) / 2;
            }
        }
    } catch (Throwable $e) {
        error_log("Median price per sqft calculation failed for ZIP $currentZip: " . $e->getMessage());
    }
    
    $results[] = [
        'zip' => $currentZip,
        'count' => $zipCount,
        'medianPrice' => $medianPrice,
        'medianPricePerSqft' => $medianPricePerSqft,
    ];
}

// Sort by count descending
usort($results, function($a, $b) {
    return $b['count'] - $a['count'];
});

echo json_encode($results, JSON_PRETTY_PRINT);

