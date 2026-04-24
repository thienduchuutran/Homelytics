<?php
/**
 * insights_price_trend.php
 *
 * Returns the last up-to-6 months of average list price, honoring the same
 * filter parameters as insights_summary.php (city, zip, price range, beds,
 * baths, propertyType).
 *
 * We anchor the trend to the most recent month with listings in the filtered
 * set (rather than CURDATE()) so the sparkline still has data when the RETS
 * feed is a few weeks stale.
 *
 * Response shape:
 *   {
 *     "trend": [
 *       { "month": "YYYY-MM", "avgPrice": 123456.78, "count": 42 },
 *       ...
 *     ]
 *   }
 * Months are returned in ascending chronological order. Up to 6 entries.
 */

declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept');
    header('Access-Control-Max-Age: 86400');
    http_response_code(200);
    exit;
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

function jsonError($message, $code = 500) {
    http_response_code($code);
    echo json_encode(['error' => $message], JSON_PRETTY_PRINT);
    exit;
}

// ---- Database configuration (matches other insights_*.php endpoints)
$db_host = 'localhost';
$db_port = '';
$db_name = 'boxgra6_duc';
$db_user = 'boxgra6_duc';
$db_pass = '123456';

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

// ---- Filter parameters (same contract as insights_summary.php)
$city = isset($_GET['city']) && $_GET['city'] !== '' ? trim($_GET['city']) : null;
$zip = isset($_GET['zip']) && $_GET['zip'] !== '' ? trim($_GET['zip']) : null;
$minPrice = isset($_GET['minPrice']) && $_GET['minPrice'] !== '' ? max(0, (int)$_GET['minPrice']) : null;
$maxPrice = isset($_GET['maxPrice']) && $_GET['maxPrice'] !== '' ? max(0, (int)$_GET['maxPrice']) : null;
$minBeds = isset($_GET['minBeds']) && $_GET['minBeds'] !== '' ? max(0, (int)$_GET['minBeds']) : null;
$minBaths = isset($_GET['minBaths']) && $_GET['minBaths'] !== '' ? max(0, (float)$_GET['minBaths']) : null;
$propertyType = isset($_GET['propertyType']) && $_GET['propertyType'] !== 'all' ? trim($_GET['propertyType']) : null;

// ---- WHERE clause
$where = ['1=1'];
$params = [];

$where[] = 'L_SystemPrice IS NOT NULL AND L_SystemPrice > 0';

// Only rows with a usable OnMarketDate — that's our time anchor.
$where[] = "OnMarketDate IS NOT NULL";
$where[] = "OnMarketDate != ''";
$where[] = "OnMarketDate != '0000-00-00'";
$where[] = "OnMarketDate != '0000-00-00 00:00:00'";

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
    if ($propertyType === 'Residential') {
        $where[] = 'TRIM(L_Class) = TRIM(:propertyType)';
    } else {
        $where[] = 'TRIM(L_Type_) = TRIM(:propertyType)';
    }
    $params[':propertyType'] = $propertyType;
}

$whereClause = implode(' AND ', $where);

// ---- Query: group by YYYY-MM, take the 6 most recent months.
//
// ORDER BY ym DESC + LIMIT 6 returns the freshest slice of data even if the
// dataset is sparse or the RETS feed is a bit behind the wall clock.
try {
    $sql = "SELECT
                DATE_FORMAT(OnMarketDate, '%Y-%m') AS ym,
                AVG(L_SystemPrice) AS avgPrice,
                COUNT(*) AS cnt
            FROM rets_property
            WHERE $whereClause
            GROUP BY ym
            ORDER BY ym DESC
            LIMIT 6";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
} catch (Throwable $e) {
    jsonError('Trend query failed: ' . $e->getMessage(), 500);
}

// Reverse so the frontend gets an ascending timeline: oldest → newest.
$rows = array_reverse($rows);

$trend = [];
foreach ($rows as $r) {
    $trend[] = [
        'month'    => (string)$r['ym'],
        'avgPrice' => $r['avgPrice'] !== null ? (float)$r['avgPrice'] : null,
        'count'    => (int)$r['cnt'],
    ];
}

echo json_encode(['trend' => $trend], JSON_PRETTY_PRINT);
