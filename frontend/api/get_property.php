<?php
/**
 * get_property.php
 * API endpoint to fetch a single property by L_ListingID or L_DisplayId
 * Returns JSON object with full property details
 * ONLY uses columns that exist in the database
 */

declare(strict_types=1);

// Enable error display for debugging
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// Set output buffering to catch any errors
ob_start();

// Handle CORS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept');
    header('Access-Control-Max-Age: 86400');
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

// ---- Get property ID from query parameter
$propertyId = isset($_GET['id']) ? trim($_GET['id']) : null;

if (!$propertyId) {
    jsonError('Property ID is required', 400);
}

// ---- Fetch property by L_ListingID or L_DisplayId
// ONLY using columns that exist in the database
$sql = "SELECT 
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
LIMIT 1";

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':id' => $propertyId]);
    $row = $stmt->fetch();
    
    if (!$row) {
        jsonError('Property not found', 404);
    }
} catch (Throwable $e) {
    jsonError('Query failed: ' . $e->getMessage(), 500);
}

// ---- Map database fields to frontend format
function mapPropertyToDetail(array $row): array {
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
    
    // Map property type - use L_Type_ if available, otherwise L_Class
    $propertyType = !empty($row['L_Type_']) ? $row['L_Type_'] : ($row['L_Class'] ?? 'SingleFamilyResidence');
    
    // Map status
    $statusMap = [
        'Active' => 'for-sale',
        'Pending' => 'for-sale',
        'Sold' => 'for-sale',
        'Leased' => 'for-rent',
        'Rental' => 'for-rent',
    ];
    $status = 'for-sale';
    if (!empty($row['L_Status'])) {
        $dbStatus = $row['L_Status'];
        $status = $statusMap[$dbStatus] ?? 'for-sale';
    }
    
    // Generate title
    $title = !empty($row['L_Address']) ? $row['L_Address'] : 'Property';
    if (!empty($row['L_Type_'])) {
        $title = $row['L_Type_'] . ' at ' . $title;
    }
    
    // Extract amenities
    $amenities = [];
    if (!empty($row['L_Remarks'])) {
        $desc = strtolower($row['L_Remarks']);
        if (strpos($desc, 'pool') !== false) $amenities[] = 'Pool';
        if (strpos($desc, 'garage') !== false) $amenities[] = 'Garage';
        if (strpos($desc, 'fireplace') !== false) $amenities[] = 'Fireplace';
        if (strpos($desc, 'garden') !== false) $amenities[] = 'Garden';
        if (strpos($desc, 'balcony') !== false) $amenities[] = 'Balcony';
    }
    if (!empty($row['PoolPrivateYN'])) $amenities[] = 'Pool';
    if (!empty($row['FireplaceYN'])) $amenities[] = 'Fireplace';
    if (!empty($row['GarageYN'])) $amenities[] = 'Garage';
    if (!empty($row['SpaYN'])) $amenities[] = 'Spa';
    if (empty($amenities)) {
        $amenities = ['Modern Features'];
    }
    
    // Build agent full name - use ListAgentFullName if available, otherwise build from first/last
    $agentFullName = !empty($row['ListAgentFullName']) 
        ? $row['ListAgentFullName'] 
        : trim(($row['agentFullName'] ?? ''));
    
    // Use ListAgentOfficePhone if ListAgentDirectPhone is not available
    $agentPhone = !empty($row['ListAgentDirectPhone']) 
        ? $row['ListAgentDirectPhone'] 
        : ($row['ListAgentOfficePhone'] ?? null);
    
    // Use ListOfficeEmail if ListAgentEmail is not available
    $agentEmail = !empty($row['ListAgentEmail']) 
        ? $row['ListAgentEmail'] 
        : ($row['ListOfficeEmail'] ?? null);
    
    // Use subdivision from LM_char10_70 if SubdivisionName is not available
    $subdivisionName = !empty($row['SubdivisionName']) 
        ? $row['SubdivisionName'] 
        : ($row['LM_char10_70'] ?? null);
    
    return [
        'id' => (string)($row['L_ListingID'] ?? $row['L_DisplayId'] ?? uniqid()),
        'listingId' => $row['L_ListingID'] ?? null,
        'displayId' => $row['L_DisplayId'] ?? null,
        'title' => $title,
        'address' => $row['L_Address'] ?? '',
        'addressStreet' => $row['L_AddressStreet'] ?? null,
        'city' => $row['L_City'] ?? null,
        'postalCity' => $row['PostalCity'] ?? null,
        'state' => $row['L_State'] ?? '',
        'zipCode' => $row['L_Zip'] ?? '',
        'price' => (int)($row['L_SystemPrice'] ?? 0),
        'previousPrice' => !empty($row['PreviousListPrice']) ? (int)$row['PreviousListPrice'] : null,
        'bedrooms' => (int)($row['L_Keyword2'] ?? 0),
        'bathrooms' => (float)($row['LM_Dec_3'] ?? 0),
        'bathroomsHalf' => !empty($row['BathroomsHalf']) ? (int)$row['BathroomsHalf'] : null,
        'squareFeet' => (int)($row['LM_Int2_3'] ?? 0),
        'propertyType' => $propertyType,
        'propertySubType' => $row['L_Type_'] ?? null,
        'propertySubTypeAdditional' => $row['PropertySubTypeAdditional'] ?? null,
        'status' => $status,
        'description' => $row['L_Remarks'] ?? 'No description available.',
        'images' => $images,
        'imageUrl' => $imageUrl,
        'yearBuilt' => !empty($row['YearBuilt']) ? (int)$row['YearBuilt'] : null,
        'parking' => !empty($row['L_Keyword5']) ? (int)$row['L_Keyword5'] : null,
        'openParkingSpaces' => !empty($row['OpenParkingSpaces']) ? (int)$row['OpenParkingSpaces'] : null,
        'amenities' => array_unique($amenities),
        'listingDate' => $row['ListingContractDate'] ?? null,
        'latitude' => !empty($row['LMD_MP_Latitude']) ? (float)$row['LMD_MP_Latitude'] : null,
        'longitude' => !empty($row['LMD_MP_Longitude']) ? (float)$row['LMD_MP_Longitude'] : null,
        'subdivisionName' => $subdivisionName,
        'lotSizeArea' => $row['LotSizeArea'] ?? null,
        'lotSizeAcres' => !empty($row['LotSizeAcres']) ? (float)$row['LotSizeAcres'] : null,
        'lotSizeSquareFeet' => !empty($row['LotSizeSquareFeet']) ? (int)$row['LotSizeSquareFeet'] : null,
        'lotSizeUnits' => $row['LotSizeUnits'] ?? null,
        'levels' => $row['EntryLevel'] ?? null,
        'storiesTotal' => !empty($row['StoriesTotal']) ? (int)$row['StoriesTotal'] : null,
        'entryLevel' => $row['EntryLevel'] ?? null,
        'entryLocation' => $row['EntryLocation'] ?? null,
        'cooling' => $row['Cooling'] ?? null,
        'coolingYN' => !empty($row['CoolingYN']) ? (bool)$row['CoolingYN'] : null,
        'heating' => $row['Heating'] ?? null,
        'heatingYN' => !empty($row['HeatingYN']) ? (bool)$row['HeatingYN'] : null,
        'waterSource' => $row['WaterSource'] ?? null,
        'roof' => $row['Roof'] ?? null,
        'flooring' => $row['Flooring'] ?? null,
        'view' => $row['View'] ?? null,
        'viewYN' => !empty($row['ViewYN']) ? (bool)$row['ViewYN'] : null,
        'interiorFeatures' => $row['InteriorFeatures'] ?? null,
        'lotFeatures' => $row['LotFeatures'] ?? null,
        'patioAndPorchFeatures' => null, // Not in allowed list
        'poolFeatures' => $row['PoolFeatures'] ?? null,
        'fireplaceFeatures' => $row['FireplaceFeatures'] ?? null,
        'appliances' => $row['Appliances'] ?? null,
        'securityFeatures' => $row['SecurityFeatures'] ?? null,
        'communityFeatures' => $row['CommunityFeatures'] ?? null,
        'associationAmenities' => $row['AssociationAmenities'] ?? null,
        'spaFeatures' => $row['SpaFeatures'] ?? null,
        'fencing' => $row['Fencing'] ?? null,
        'architecturalStyle' => $row['ArchitecturalStyle'] ?? null,
        'structureType' => $row['StructureType'] ?? null,
        'propertyCondition' => $row['PropertyCondition'] ?? null,
        'numberOfUnitsTotal' => !empty($row['NumberOfUnitsTotal']) ? (int)$row['NumberOfUnitsTotal'] : null,
        'mainLevelBedrooms' => !empty($row['MainLevelBedrooms']) ? (int)$row['MainLevelBedrooms'] : null,
        'daysOnMarket' => !empty($row['DaysOnMarket']) ? (int)$row['DaysOnMarket'] : null,
        'cumulativeDaysOnMarket' => !empty($row['CumulativeDaysOnMarket']) ? (int)$row['CumulativeDaysOnMarket'] : null,
        'associationFee' => !empty($row['AssociationFee']) ? (float)$row['AssociationFee'] : null,
        'associationFeeFrequency' => $row['AssociationFeeFrequency'] ?? null,
        'associationFee2Frequency' => $row['AssociationFee2Frequency'] ?? null,
        'highSchoolDistrict' => $row['HighSchoolDistrict'] ?? null,
        'countyOrParish' => $row['CountyOrParish'] ?? null,
        'countrySubdivision' => $row['CountrySubdivision'] ?? null,
        'agentFirstName' => $row['LA1_UserFirstName'] ?? null,
        'agentLastName' => $row['LA1_UserLastName'] ?? null,
        'agentFullName' => $agentFullName,
        'officeName' => $row['LO1_OrganizationName'] ?? null,
        'agentEmail' => $agentEmail,
        'agentPhone' => $agentPhone,
        'officeEmail' => $row['ListOfficeEmail'] ?? null,
        'agentKey' => $row['ListAgentKey'] ?? null,
        'agentAOR' => $row['ListAgentAOR'] ?? null,
        'modificationTimestamp' => $row['ModificationTimestamp'] ?? null,
        'onMarketDate' => $row['OnMarketDate'] ?? null,
        'backOnMarketDate' => $row['BackOnMarketDate'] ?? null,
        'priceChangeTimestamp' => $row['PriceChangeTimestamp'] ?? null,
        'statusChangeTimestamp' => $row['StatusChangeTimestamp'] ?? null,
        'majorChangeTimestamp' => $row['MajorChangeTimestamp'] ?? null,
        'standardStatus' => $row['StandardStatus'] ?? null,
        'previousStandardStatus' => $row['PreviousStandardStatus'] ?? null,
        'newConstructionYN' => !empty($row['NewConstructionYN']) ? (bool)$row['NewConstructionYN'] : null,
        'humanModifiedYN' => !empty($row['HumanModifiedYN']) ? (bool)$row['HumanModifiedYN'] : null,
        'seniorCommunityYN' => !empty($row['SeniorCommunityYN']) ? (bool)$row['SeniorCommunityYN'] : null,
        'additionalParcelsYN' => !empty($row['AdditionalParcelsYN']) ? (bool)$row['AdditionalParcelsYN'] : null,
        'landLeaseYN' => !empty($row['LandLeaseYN']) ? (bool)$row['LandLeaseYN'] : null,
        'poolPrivateYN' => !empty($row['PoolPrivateYN']) ? (bool)$row['PoolPrivateYN'] : null,
        'spaYN' => !empty($row['SpaYN']) ? (bool)$row['SpaYN'] : null,
        'garageYN' => !empty($row['GarageYN']) ? (bool)$row['GarageYN'] : null,
        'attachedGarageYN' => !empty($row['AttachedGarageYN']) ? (bool)$row['AttachedGarageYN'] : null,
        'fireplaceYN' => !empty($row['FireplaceYN']) ? (bool)$row['FireplaceYN'] : null,
        'parcelNumber' => $row['ParcelNumber'] ?? null,
        'taxLot' => $row['TaxLot'] ?? null,
        'universalParcelId' => $row['UniversalParcelId'] ?? null,
        'photoCount' => !empty($row['PhotoCount']) ? (int)$row['PhotoCount'] : null,
        'photoTime' => $row['PhotoTime'] ?? null,
        'livingAreaUnits' => $row['LivingAreaUnits'] ?? null,
        'livingAreaSource' => $row['LivingAreaSource'] ?? null,
        'disclosures' => $row['Disclosures'] ?? null,
        'specialListingConditions' => $row['SpecialListingConditions'] ?? null,
        'listingTerms' => $row['ListingTerms'] ?? null,
        'roomType' => $row['RoomType'] ?? null,
        'occupantType' => $row['OccupantType'] ?? null,
        'commonInterest' => $row['CommonInterest'] ?? null,
        'commonWalls' => $row['CommonWalls'] ?? null,
        'propertyAttachedYN' => !empty($row['PropertyAttachedYN']) ? (bool)$row['PropertyAttachedYN'] : null,
        'elevationUnits' => $row['ElevationUnits'] ?? null,
        'associationYN' => !empty($row['AssociationYN']) ? (bool)$row['AssociationYN'] : null,
        'associationName' => $row['AssociationName'] ?? null,
    ];
}

// ---- Transform property
try {
    $property = mapPropertyToDetail($row);
} catch (Throwable $e) {
    jsonError('Error mapping property: ' . $e->getMessage(), 500);
}

// ---- Return JSON
try {
    ob_clean();
    while (ob_get_level()) ob_end_clean();
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-cache, must-revalidate');
    echo json_encode($property, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit(0);
} catch (Throwable $e) {
    ob_clean();
    jsonError('Error encoding JSON: ' . $e->getMessage(), 500);
}
