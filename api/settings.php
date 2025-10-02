<?php
require_once 'config.php';

// OPTIONS: CORS-Preflight-Anfrage
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// GET: Einstellungen abrufen
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $db = getDB();
        $result = $db->query('SELECT * FROM settings WHERE id = 1')->fetchArray(SQLITE3_ASSOC);
        
        if ($result) {
            sendJSON($result);
        } else {
            sendError('Keine Einstellungen gefunden', 404);
        }
    } catch (Exception $e) {
        sendError('Fehler beim Abrufen der Einstellungen: ' . $e->getMessage());
    }
}

// PUT: Einstellungen aktualisieren
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) {
            sendError('Ungültige Eingabedaten');
        }
        
        $db = getDB();
        $stmt = $db->prepare('UPDATE settings SET 
            soll_stunden = :soll_stunden,
            ueberstunden_start_saldo = :ueberstunden_start_saldo,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = 1');
        
        $stmt->bindValue(':soll_stunden', $data['soll_stunden']);
        $stmt->bindValue(':ueberstunden_start_saldo', $data['ueberstunden_start_saldo']);
        
        $stmt->execute();
        sendJSON(['message' => 'Einstellungen aktualisiert']);
    } catch (Exception $e) {
        sendError('Fehler beim Aktualisieren der Einstellungen: ' . $e->getMessage());
    }
}
?>