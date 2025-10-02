<?php
// Fehlermeldungen aktivieren (in Produktion deaktivieren)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Datenbank-Konfiguration
define('DB_PATH', __DIR__ . '/db/arbeitszeittracker.db');
define('DB_DIR', __DIR__ . '/db');

// CORS-Einstellungen
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');

// OPTIONS-Request sofort beantworten
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Hilfsfunktion für Datenbankverbindung
function getDB() {
    if (!file_exists(DB_DIR)) {
        mkdir(DB_DIR, 0777, true);
    }
    
    $db = new SQLite3(DB_PATH);
    $db->enableExceptions(true);
    return $db;
}

// Hilfsfunktion für JSON-Antworten
function sendJSON($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

// Hilfsfunktion für Fehlerantworten
function sendError($message, $statusCode = 400) {
    sendJSON(['error' => $message], $statusCode);
}
?>