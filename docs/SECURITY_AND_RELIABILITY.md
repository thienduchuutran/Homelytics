# Security and Reliability

This document covers security measures, secret management, CORS policies, rate limiting, input validation, error handling, and reliability patterns.

---

## Secret Management

### Gemini API Key

**Location**: 
- Config file: `{projectRoot}/gemini_key.php` (outside web root)
- Environment variable: `GEMINI_API_KEY` (fallback)

**Security Measures**:
- File stored outside public web root (not accessible via HTTP)
- File should contain: `<?php return 'YOUR_API_KEY';`
- Environment variable as fallback (useful for different environments)
- Never exposed to frontend (all API calls go through PHP proxy)

**Access Control**:
- File permissions: `600` (read/write for owner only)
- Not in version control (should be in `.gitignore`)

**Code Reference** (`api/chat_gemini.php`):
```php
function getGeminiApiKey(): string {
    $key = getenv('GEMINI_API_KEY');
    if ($key !== false && !empty($key)) {
        return $key;
    }
    
    $configPath = dirname(__DIR__) . '/gemini_key.php';
    if (file_exists($configPath) && is_readable($configPath)) {
        $key = include $configPath;
        if (is_string($key) && !empty($key)) {
            return $key;
        }
    }
    
    jsonError('Gemini API key not configured', 500);
}
```

### Database Credentials

**Current Implementation**: Hardcoded in PHP files

**Location**: All API endpoints
```php
$db_host = 'localhost';
$db_name = 'boxgra6_duc';
$db_user = 'boxgra6_duc';
$db_pass = '123456';
```

**Security Risk**: Credentials exposed in source code

**Recommendation**: Move to environment variables or secure config file
```php
$db_host = getenv('DB_HOST') ?: 'localhost';
$db_name = getenv('DB_NAME') ?: 'boxgra6_duc';
$db_user = getenv('DB_USER') ?: 'boxgra6_duc';
$db_pass = getenv('DB_PASS') ?: '';
```

### OAuth Credentials (Trestle API)

**Location**: `/home/boxgra5/.idx_secrets.php` (outside web root)

**Used By**: `generate_token_duc.php`, `fetch_property.php`

**Security**: File outside web root, not accessible via HTTP

---

## CORS Policy

### Current Implementation

**All Endpoints**: Allow all origins
```php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');
header('Access-Control-Max-Age: 86400'); // 24 hours
```

### Security Considerations

**Risk**: `Access-Control-Allow-Origin: *` allows any website to make requests

**Mitigation**:
- All endpoints are read-only (GET requests)
- No sensitive data returned (public property listings)
- No authentication required

**Recommendation for Production**:
```php
$allowedOrigins = [
    'https://titus-duc.calisearch.org',
    'https://www.titus-duc.calisearch.org',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
}
```

### Preflight Requests

**Handling**: All endpoints handle OPTIONS requests
```php
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept');
    header('Access-Control-Max-Age: 86400');
    http_response_code(200);
    exit;
}
```

---

## Rate Limiting

### Current Implementation

**Only on Chat Endpoint**: `api/chat_gemini.php`

**Mechanism**: File-based rate limiting
```php
function checkRateLimit(string $ip): void {
    $rateLimitFile = sys_get_temp_dir() . '/gemini_rate_' . md5($ip) . '.txt';
    $maxRequests = 20;
    $windowSeconds = 60;
    
    // Read existing requests
    $requests = [];
    if (file_exists($rateLimitFile)) {
        $data = file_get_contents($rateLimitFile);
        $requests = json_decode($data, true) ?: [];
        // Remove old entries
        $requests = array_filter($requests, fn($t) => ($now - $t) < $windowSeconds);
    }
    
    if (count($requests) >= $maxRequests) {
        jsonError('Rate limit exceeded. Please try again later.', 429);
    }
    
    $requests[] = $now;
    file_put_contents($rateLimitFile, json_encode($requests));
}
```

**Limits**:
- 20 requests per 60 seconds per IP
- Sliding window (removes old entries)

**Storage**: Temporary files (cleared on server restart)

### Other Endpoints

**No Rate Limiting**: All other endpoints have no rate limiting

**Risk**: Potential for abuse (excessive API calls)

**Recommendation**: Add rate limiting to all public endpoints
- Use Redis for distributed rate limiting
- Or: Use web server rate limiting (nginx, Apache mod_evasive)

---

## Input Validation

### Query Parameter Validation

**Numeric Parameters**:
```php
$minPrice = isset($_GET['minPrice']) ? max(0, (int)$_GET['minPrice']) : 0;
$maxPrice = isset($_GET['maxPrice']) ? max($minPrice, (int)$_GET['maxPrice']) : 100000000;
$bedrooms = isset($_GET['bedrooms']) && $_GET['bedrooms'] !== '' ? max(0, (int)$_GET['bedrooms']) : null;
```

**Validation**:
- Cast to int/float
- Use `max(0, ...)` to prevent negatives
- Default values for missing parameters

**String Parameters**:
```php
$city = isset($_GET['city']) && $_GET['city'] !== '' ? trim($_GET['city']) : null;
$propertyType = isset($_GET['propertyType']) && $_GET['propertyType'] !== 'all' ? trim($_GET['propertyType']) : null;
```

**Validation**:
- Trim whitespace
- Check for empty strings
- No length limits (could be added)

**Date Parameters**:
```php
$listedAfter = isset($_GET['listedAfter']) ? trim($_GET['listedAfter']) : null;
if ($listedAfter !== null && $listedAfter !== '') {
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $listedAfter)) {
        $where[] = 'OnMarketDate >= :listedAfter';
        $params[':listedAfter'] = $listedAfter;
    }
}
```

**Validation**:
- Regex pattern: `YYYY-MM-DD`
- Only applied if format matches

**Boolean Parameters**:
```php
$hasHOA = isset($_GET['hasHOA']) && $_GET['hasHOA'] !== '' 
    ? filter_var($_GET['hasHOA'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) 
    : null;
```

**Validation**:
- `filter_var()` with `FILTER_VALIDATE_BOOLEAN`
- Returns `true`, `false`, or `null`

### Request Body Validation (Chat Endpoint)

**Message Validation**:
```php
if (!isset($data['message']) || !is_string($data['message'])) {
    jsonError('Missing or invalid message', 400);
}

$message = trim($data['message']);
if (empty($message)) {
    jsonError('Message cannot be empty', 400);
}

if (strlen($message) > 500) {
    jsonError('Message too long (max 500 characters)', 400);
}
```

**Validation**:
- Type check (must be string)
- Not empty
- Max length: 500 characters

**JSON Validation**:
```php
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    jsonError('Invalid JSON', 400);
}
```

---

## SQL Injection Protection

### Prepared Statements

**All Queries**: Use PDO prepared statements with named placeholders

**Example**:
```php
$where = ['1=1'];
$params = [];

if ($city !== null) {
    $where[] = 'L_City = :city';
    $params[':city'] = $city;
}

$whereClause = implode(' AND ', $where);
$sql = "SELECT * FROM rets_property WHERE $whereClause";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
```

**Security**:
- Parameters bound separately from SQL
- PDO escapes values automatically
- No string concatenation of user input into SQL

### Dynamic WHERE Clause Construction

**Pattern**: Build WHERE clause array, then implode

**Security**: Only column names and operators in SQL string, all values in parameters

**Example**:
```php
$where[] = 'L_SystemPrice >= :minPrice';
$params[':minPrice'] = $minPrice;
```

**Not Vulnerable**: Column names are hardcoded, not from user input

---

## Error Handling

### Error Response Format

**Standard Format**:
```php
function jsonError($message, $code = 500) {
    http_response_code($code);
    echo json_encode(['error' => $message], JSON_PRETTY_PRINT);
    exit;
}
```

**Security**: Generic error messages, no sensitive info leaked

### Database Errors

**Handling**:
```php
try {
    $pdo = new PDO($dsn, $db_user, $db_pass, [...]);
} catch (Throwable $e) {
    jsonError('Database connection failed: ' . $e->getMessage(), 500);
}
```

**Risk**: Database error messages may leak information

**Recommendation**: Log full error, return generic message
```php
try {
    // ...
} catch (Throwable $e) {
    error_log('Database error: ' . $e->getMessage());
    jsonError('Database connection failed', 500);
}
```

### Query Errors

**Handling**:
```php
try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
} catch (Throwable $e) {
    error_log("SQL Error: " . $e->getMessage());
    error_log("SQL: " . $sql);
    jsonError('Query failed: ' . $e->getMessage(), 500);
}
```

**Risk**: SQL and error details logged, but also returned to client

**Recommendation**: Return generic error, log details
```php
catch (Throwable $e) {
    error_log("SQL Error: " . $e->getMessage());
    error_log("SQL: " . $sql);
    jsonError('Query failed', 500);
}
```

### Gemini API Errors

**Handling**:
```php
try {
    $result = callGemini($apiKey, $geminiRequest, 'gemini-2.5-flash');
} catch (Exception $e) {
    if ($e->getCode() === 429) {
        jsonError('Service rate limit exceeded. Please try again later.', 429);
    } elseif ($e->getCode() === 403) {
        jsonError('Service access denied', 403);
    } else {
        jsonError('Service error occurred', 500);
    }
}
```

**Security**: Generic error messages, no API key or internal details leaked

---

## Reliability Patterns

### Abort Controller (Frontend)

**Usage**: Cancel in-flight requests when new request starts

**Example** (`app/map/page.tsx`):
```typescript
const fetchAbortControllerRef = useRef<AbortController | null>(null);

const fetchProperties = useCallback(async (bounds: MapBounds) => {
    if (fetchAbortControllerRef.current) {
        fetchAbortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    fetchAbortControllerRef.current = abortController;
    
    const response = await fetch(url, {
        signal: abortController.signal,
        // ...
    });
    
    if (abortController.signal.aborted) return;
    // ...
}, []);
```

**Benefit**: Prevents race conditions, reduces unnecessary processing

### Error Boundaries (Frontend)

**Current Status**: No error boundaries implemented

**Recommendation**: Add React error boundaries to catch component errors
```typescript
class ErrorBoundary extends React.Component {
    componentDidCatch(error, errorInfo) {
        console.error('Error caught:', error, errorInfo);
        // Log to error tracking service
    }
    
    render() {
        if (this.state.hasError) {
            return <div>Something went wrong. Please refresh the page.</div>;
        }
        return this.props.children;
    }
}
```

### Retry Logic

**Current Status**: No retry logic implemented

**Recommendation**: Add retry for transient failures
```typescript
async function fetchWithRetry(url, options, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response;
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}
```

### Timeout Handling

**Current Status**: No timeouts on frontend fetch calls

**Recommendation**: Add timeout to prevent hanging requests
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

try {
    const response = await fetch(url, {
        signal: controller.signal,
        // ...
    });
} finally {
    clearTimeout(timeoutId);
}
```

**Backend**: Gemini API call has timeout (30s)
```php
curl_setopt_array($ch, [
    CURLOPT_TIMEOUT => 30,
    CURLOPT_CONNECTTIMEOUT => 10,
]);
```

---

## Data Validation

### Frontend Validation

**Current Status**: Basic validation (type checking, empty checks)

**Recommendation**: Add more robust validation
- Price ranges: min < max
- Date formats: YYYY-MM-DD
- ZIP codes: 5 digits
- Email validation (if agent emails displayed)

### Backend Validation

**Current Status**: Basic validation (type casting, trimming)

**Recommendation**: Add stricter validation
- String length limits
- Numeric ranges (e.g., price > 0, price < 1 billion)
- Enum validation (e.g., propertyType in allowed list)
- Sanitization (remove HTML tags, escape special chars)

---

## Security Headers

### Current Implementation

**No Security Headers**: Only CORS headers set

**Recommendation**: Add security headers
```php
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Content-Security-Policy: default-src \'self\'');
```

---

## Logging

### Current Implementation

**Error Logging**: `error_log()` used for some errors

**Example**:
```php
error_log('Median price calculation failed: ' . $e->getMessage());
```

**Recommendation**: Structured logging
- Log level (ERROR, WARN, INFO)
- Request ID for tracing
- User context (IP, user agent)
- Log to file or external service (e.g., Sentry, Loggly)

---

## Backup and Recovery

### Database Backups

**Current Status**: Not documented in code

**Recommendation**: 
- Regular automated backups (daily)
- Test restore procedures
- Off-site backup storage

### Data Recovery

**Current Status**: No recovery procedures documented

**Recommendation**:
- Document recovery procedures
- Test recovery from backups
- Have rollback plan for deployments

---

## Monitoring and Alerting

### Current Status

**No Monitoring**: No application monitoring implemented

**Recommendation**:
- Monitor API response times
- Monitor error rates
- Monitor database query performance
- Set up alerts for high error rates or slow queries
- Use tools like New Relic, Datadog, or custom monitoring

---

## Summary of Security Posture

**Strengths**:
- ✅ SQL injection protected (PDO prepared statements)
- ✅ API keys stored outside web root
- ✅ Input validation on all parameters
- ✅ Rate limiting on chat endpoint
- ✅ CORS configured (though permissive)

**Weaknesses**:
- ❌ Database credentials hardcoded
- ❌ No rate limiting on most endpoints
- ❌ Error messages may leak information
- ❌ No security headers
- ❌ No input sanitization (XSS risk if data displayed)
- ❌ No authentication/authorization (if needed in future)

**Recommendations Priority**:
1. **High**: Move database credentials to environment variables
2. **High**: Add rate limiting to all endpoints
3. **Medium**: Sanitize error messages
4. **Medium**: Add security headers
5. **Low**: Add input sanitization (if user-generated content added)

