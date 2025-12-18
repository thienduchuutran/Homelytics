<?php
/**
 * insights_summary.php
 * API endpoint to fetch market insights summary statistics
 * Returns: count, medianPrice, medianPricePerSqft, avgBeds, avgDom
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
$minBaths = isset($_GET['minBaths']) && $_GET['minBaths'] !== '' ? max(0, (float)$_GET['minBaths']) : null;
$propertyType = isset($_GET['propertyType']) && $_GET['propertyType'] !== 'all' ? trim($_GET['propertyType']) : null;

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
if ($minBaths !== null && $minBaths > 0) {
    $where[] = 'LM_Dec_3 >= :minBaths';
    $params[':minBaths'] = $minBaths;
}
if ($propertyType !== null) {
    // "Residential" is stored in L_Class, all other types are in L_Type_
    if ($propertyType === 'Residential') {
        $where[] = 'TRIM(L_Class) = TRIM(:propertyType)';
    } else {
        $where[] = 'TRIM(L_Type_) = TRIM(:propertyType)';
    }
    $params[':propertyType'] = $propertyType;
}

$whereClause = implode(' AND ', $where);

// Safety cap: limit to 50k rows
$safetyLimit = 50000;

// ---- Get count
$countSql = "SELECT COUNT(*) as cnt FROM rets_property WHERE $whereClause LIMIT $safetyLimit";
try {
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $countRow = $countStmt->fetch();
    $count = (int)($countRow['cnt'] ?? 0);
} catch (Throwable $e) {
    jsonError('Count query failed: ' . $e->getMessage(), 500);
}

if ($count === 0) {
    echo json_encode([
        'count' => 0,
        'medianPrice' => null,
        'medianPricePerSqft' => null,
        'avgBeds' => null,
        'avgDom' => null,
    ], JSON_PRETTY_PRINT);
    exit;
}

// ---- Calculate median price
$medianPrice = null;
try {
    // Get total count for median calculation
    $totalCount = $count;
    if ($totalCount > 0) {
        $offset = (int)floor(($totalCount - 1) / 2);
        $limit = ($totalCount % 2 === 0) ? 2 : 1;
        
        $medianSql = "SELECT L_SystemPrice FROM rets_property 
                      WHERE $whereClause 
                      ORDER BY L_SystemPrice ASC 
                      LIMIT $limit OFFSET $offset";
        $medianStmt = $pdo->prepare($medianSql);
        $medianStmt->execute($params);
        $medianRows = $medianStmt->fetchAll();
        
        if (count($medianRows) === 1) {
            $medianPrice = (float)$medianRows[0]['L_SystemPrice'];
        } elseif (count($medianRows) === 2) {
            $medianPrice = ((float)$medianRows[0]['L_SystemPrice'] + (float)$medianRows[1]['L_SystemPrice']) / 2;
        }
    }
} catch (Throwable $e) {
    // Continue without median price if calculation fails
    error_log('Median price calculation failed: ' . $e->getMessage());
}

// ---- Calculate median price per sqft (only where sqft > 0)
$medianPricePerSqft = null;
try {
    $pricePerSqftWhere = $whereClause . ' AND LM_Int2_3 > 0';
    $pricePerSqftCountSql = "SELECT COUNT(*) as cnt FROM rets_property WHERE $pricePerSqftWhere LIMIT $safetyLimit";
    $ppsfCountStmt = $pdo->prepare($pricePerSqftCountSql);
    $ppsfCountStmt->execute($params);
    $ppsfCountRow = $ppsfCountStmt->fetch();
    $ppsfCount = (int)($ppsfCountRow['cnt'] ?? 0);
    
    if ($ppsfCount > 0) {
        $ppsfOffset = (int)floor(($ppsfCount - 1) / 2);
        $ppsfLimit = ($ppsfCount % 2 === 0) ? 2 : 1;
        
        // Calculate price/sqft for each row, then get median
        $ppsfSql = "SELECT (L_SystemPrice / LM_Int2_3) as pricePerSqft 
                    FROM rets_property 
                    WHERE $pricePerSqftWhere 
                    ORDER BY pricePerSqft ASC 
                    LIMIT $ppsfLimit OFFSET $ppsfOffset";
        $ppsfStmt = $pdo->prepare($ppsfSql);
        $ppsfStmt->execute($params);
        $ppsfRows = $ppsfStmt->fetchAll();
        
        if (count($ppsfRows) === 1) {
            $medianPricePerSqft = (float)$ppsfRows[0]['pricePerSqft'];
        } elseif (count($ppsfRows) === 2) {
            $medianPricePerSqft = ((float)$ppsfRows[0]['pricePerSqft'] + (float)$ppsfRows[1]['pricePerSqft']) / 2;
        }
    }
} catch (Throwable $e) {
    error_log('Median price per sqft calculation failed: ' . $e->getMessage());
}

// ---- Calculate average beds
$avgBeds = null;
try {
    $avgBedsSql = "SELECT AVG(L_Keyword2) as avgBeds FROM rets_property WHERE $whereClause AND L_Keyword2 IS NOT NULL AND L_Keyword2 > 0 LIMIT $safetyLimit";
    $avgBedsStmt = $pdo->prepare($avgBedsSql);
    $avgBedsStmt->execute($params);
    $avgBedsRow = $avgBedsStmt->fetch();
    $avgBeds = $avgBedsRow['avgBeds'] !== null ? (float)$avgBedsRow['avgBeds'] : null;
} catch (Throwable $e) {
    error_log('Average beds calculation failed: ' . $e->getMessage());
}

// ---- Calculate average DOM (if DaysOnMarket exists)
$avgDom = null;
try {
    $avgDomSql = "SELECT AVG(DaysOnMarket) as avgDom FROM rets_property WHERE $whereClause AND DaysOnMarket IS NOT NULL AND DaysOnMarket > 0 LIMIT $safetyLimit";
    $avgDomStmt = $pdo->prepare($avgDomSql);
    $avgDomStmt->execute($params);
    $avgDomRow = $avgDomStmt->fetch();
    $avgDom = $avgDomRow['avgDom'] !== null ? (float)$avgDomRow['avgDom'] : null;
} catch (Throwable $e) {
    // DaysOnMarket might not exist, continue without it
    error_log('Average DOM calculation failed: ' . $e->getMessage());
}

// ---- Return JSON
echo json_encode([
    'count' => $count,
    'medianPrice' => $medianPrice,
    'medianPricePerSqft' => $medianPricePerSqft,
    'avgBeds' => $avgBeds,
    'avgDom' => $avgDom,
], JSON_PRETTY_PRINT);

