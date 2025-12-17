<?php
/**
 * chat_gemini.php
 * PHP proxy for Gemini API to handle conversational property search
 * Returns structured filters and assistant messages
 */

declare(strict_types=1);

// Enable error display for debugging (disable in production)
ini_set('display_errors', '0');
error_reporting(E_ALL);

// Handle CORS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept');
    header('Access-Control-Max-Age: 86400');
    http_response_code(200);
    exit;
}

// Set JSON headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

// Error handler
function jsonError($message, $code = 500) {
    http_response_code($code);
    echo json_encode(['error' => $message], JSON_PRETTY_PRINT);
    exit;
}

// Get API key from environment or config file
function getGeminiApiKey(): string {
    // Try environment variable first
    $key = getenv('GEMINI_API_KEY');
    if ($key !== false && !empty($key)) {
        return $key;
    }
    
    // Try config file (one directory above web root)
    $configPath = dirname(__DIR__) . '/gemini_key.php';
    if (file_exists($configPath) && is_readable($configPath)) {
        // File should contain: <?php return 'YOUR_API_KEY';
        $key = include $configPath;
        if (is_string($key) && !empty($key)) {
            return $key;
        }
    }
    
    jsonError('Gemini API key not configured', 500);
}

// Rate limiting (simple file-based)
function checkRateLimit(string $ip): void {
    $rateLimitFile = sys_get_temp_dir() . '/gemini_rate_' . md5($ip) . '.txt';
    $maxRequests = 20;
    $windowSeconds = 60;
    
    $now = time();
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

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

// Get request body
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    jsonError('Invalid JSON', 400);
}

// Validate input
if (!isset($data['message']) || !is_string($data['message'])) {
    jsonError('Missing or invalid message', 400);
}

$message = trim($data['message']);
if (empty($message)) {
    jsonError('Message cannot be empty', 400);
}

// Max message length
if (strlen($message) > 500) {
    jsonError('Message too long (max 500 characters)', 400);
}

$context = $data['context'] ?? [];
$history = $context['history'] ?? [];
$existingFilters = $context['filters'] ?? [];

// Rate limiting
$clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
checkRateLimit($clientIp);

// Get API key
$apiKey = getGeminiApiKey();

// Build chat history for context (last 5 messages)
$chatHistory = [];
if (is_array($history) && count($history) > 0) {
    $recentHistory = array_slice($history, -5);
    foreach ($recentHistory as $msg) {
        if (isset($msg['role']) && isset($msg['content'])) {
            $chatHistory[] = [
                'role' => $msg['role'] === 'user' ? 'user' : 'model',
                'parts' => [['text' => $msg['content']]]
            ];
        }
    }
}

// Build system instruction
$systemInstruction = "You are a helpful real estate assistant. Extract property search filters from user messages and respond conversationally.

IMPORTANT: You MUST return ONLY valid JSON matching the exact schema. Do not include any markdown, code blocks, or extra text.

Current filters context: " . json_encode($existingFilters) . "

Extract and return filters based on the user's request. If user says 'reset', clear all filters. Otherwise, merge new filters with existing ones.

Property types: SingleFamilyResidence, Condominium, Townhouse, Duplex, Triplex, Cabin, ManufacturedHome, ManufacturedOnLand, MobileHome, MixedUse, StockCooperative, Residential

Respond naturally but always return valid JSON.";

// Build Gemini request
$geminiRequest = [
    'systemInstruction' => [
        'parts' => [['text' => $systemInstruction]]
    ],
    'contents' => array_merge($chatHistory, [
        [
            'role' => 'user',
            'parts' => [['text' => $message]]
        ]
    ]),
    'generationConfig' => [
        'temperature' => 0.2,
        'responseMimeType' => 'application/json',
        'responseSchema' => [
            'type' => 'object',
            'properties' => [
                'filters' => [
                    'type' => 'object',
                    'properties' => [
                        'city' => ['type' => 'string', 'nullable' => true],
                        'zip' => ['type' => 'string', 'nullable' => true],
                        'minPrice' => ['type' => 'number', 'nullable' => true],
                        'maxPrice' => ['type' => 'number', 'nullable' => true],
                        'minBeds' => ['type' => 'number', 'nullable' => true],
                        'minBaths' => ['type' => 'number', 'nullable' => true],
                        'minSqft' => ['type' => 'number', 'nullable' => true],
                        'type' => ['type' => 'string', 'nullable' => true],
                        'mustHave' => [
                            'type' => 'object',
                            'properties' => [
                                'pool' => ['type' => 'boolean', 'nullable' => true],
                                'garage' => ['type' => 'boolean', 'nullable' => true],
                                'fireplace' => ['type' => 'boolean', 'nullable' => true],
                                'view' => ['type' => 'boolean', 'nullable' => true],
                                'hoa' => ['type' => 'boolean', 'nullable' => true],
                                'newConstruction' => ['type' => 'boolean', 'nullable' => true]
                            ],
                            'nullable' => true
                        ]
                    ],
                    'nullable' => true
                ],
                'assistantMessage' => ['type' => 'string']
            ],
            'required' => ['assistantMessage', 'filters']
        ]
    ]
];

// Call Gemini API
function callGemini(string $apiKey, array $payload, string $model = 'gemini-2.5-flash'): array {
    $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";
    
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json'
        ],
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 10
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($curlError) {
        throw new Exception("CURL error: {$curlError}");
    }
    
    if ($httpCode !== 200) {
        $errorData = json_decode($response, true);
        $errorMsg = $errorData['error']['message'] ?? "HTTP {$httpCode}";
        throw new Exception($errorMsg, $httpCode);
    }
    
    $data = json_decode($response, true);
    if (!isset($data['candidates'][0]['content']['parts'][0]['text'])) {
        throw new Exception('Invalid response format from Gemini');
    }
    
    $jsonText = $data['candidates'][0]['content']['parts'][0]['text'];
    $parsed = json_decode($jsonText, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Failed to parse JSON from Gemini: ' . json_last_error_msg());
    }
    
    return $parsed;
}

// Try primary model, fallback to gemini-2.0-flash if needed
$result = null;
$modelUsed = 'gemini-2.5-flash';

try {
    $result = callGemini($apiKey, $geminiRequest, 'gemini-2.5-flash');
} catch (Exception $e) {
    // Check if it's a model not found error
    if (strpos($e->getMessage(), 'model') !== false || $e->getCode() === 404) {
        try {
            $result = callGemini($apiKey, $geminiRequest, 'gemini-2.0-flash');
            $modelUsed = 'gemini-2.0-flash';
        } catch (Exception $e2) {
            jsonError('Service temporarily unavailable', 503);
        }
    } else {
        // Other errors (quota, rate limit, etc.)
        if ($e->getCode() === 429) {
            jsonError('Service rate limit exceeded. Please try again later.', 429);
        } elseif ($e->getCode() === 403) {
            jsonError('Service access denied', 403);
        } else {
            jsonError('Service error occurred', 500);
        }
    }
}

// Validate result structure
if (!isset($result['assistantMessage']) || !isset($result['filters'])) {
    jsonError('Invalid response from AI service', 500);
}

// Return result
echo json_encode([
    'filters' => $result['filters'],
    'assistantMessage' => $result['assistantMessage'],
    'debug' => [
        'model' => $modelUsed
    ]
], JSON_PRETTY_PRINT);


