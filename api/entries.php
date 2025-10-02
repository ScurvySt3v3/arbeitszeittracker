<?php
require_once 'config.php';

// OPTIONS: CORS-Preflight-Anfrage
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// GET: Alle Einträge abrufen
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $db = getDB();
        $results = $db->query('SELECT * FROM entries ORDER BY datum DESC, created_at DESC');
        
        $entries = [];
        while ($row = $results->fetchArray(SQLITE3_ASSOC)) {
            $entries[] = $row;
        }
        
        sendJSON($entries);
    } catch (Exception $e) {
        sendError('Fehler beim Abrufen der Einträge: ' . $e->getMessage());
    }
}

// POST: Neuen Eintrag erstellen
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $input = file_get_contents('php://input');
        error_log('Received data: ' . $input);
        $data = json_decode($input, true);
        error_log('Decoded data: ' . print_r($data, true));
        if (!$data) {
            sendError('Ungültige Eingabedaten');
        }
        
        // Validiere erforderliche Felder
        $requiredFields = ['datum', 'start', 'ende', 'pause', 'netto', 'dezimal', 'ueberstunden'];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                sendError('Fehlende oder leere Pflichtfelder: ' . $field);
            }
        }
        
        // Validiere Zeitformate
        if (!preg_match('/^\d{2}:\d{2}$/', $data['start']) || !preg_match('/^\d{2}:\d{2}$/', $data['ende'])) {
            sendError('Ungültiges Zeitformat für Start oder Ende (HH:MM erforderlich)');
        }
        
        $db = getDB();
        $stmt = $db->prepare('INSERT INTO entries (
            datum, start, ende, pause, netto, dezimal, ueberstunden, 
            extra_stunden, extra_positiv, type
        ) VALUES (
            :datum, :start, :ende, :pause, :netto, :dezimal, :ueberstunden,
            :extra_stunden, :extra_positiv, :type
        )');
        
        $stmt->bindValue(':datum', $data['datum']);
        $stmt->bindValue(':start', $data['start']);
        $stmt->bindValue(':ende', $data['ende']);
        $stmt->bindValue(':pause', $data['pause']);
        $stmt->bindValue(':netto', $data['netto']);
        $stmt->bindValue(':dezimal', $data['dezimal']);
        $stmt->bindValue(':ueberstunden', $data['ueberstunden']);
        $stmt->bindValue(':extra_stunden', $data['extra_stunden'] ?? null);
        $stmt->bindValue(':extra_positiv', $data['extra_positiv'] ?? null);
        $stmt->bindValue(':type', $data['type'] ?? null);
        
        $result = $stmt->execute();
        $newId = $db->lastInsertRowID();
        
        // Den vollständigen Eintrag zurückgeben
        $stmt = $db->prepare('SELECT * FROM entries WHERE id = :id');
        $stmt->bindValue(':id', $newId);
        $result = $stmt->execute();
        $entry = $result->fetchArray(SQLITE3_ASSOC);
        
        sendJSON($entry, 201);
    } catch (Exception $e) {
        sendError('Fehler beim Erstellen des Eintrags: ' . $e->getMessage());
    }
}

// PUT: Eintrag aktualisieren
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data || !isset($data['id'])) {
            sendError('Ungültige Eingabedaten');
        }
        
        $db = getDB();
        $stmt = $db->prepare('UPDATE entries SET 
            datum = :datum,
            start = :start,
            ende = :ende,
            pause = :pause,
            netto = :netto,
            dezimal = :dezimal,
            ueberstunden = :ueberstunden,
            extra_stunden = :extra_stunden,
            extra_positiv = :extra_positiv,
            type = :type
            WHERE id = :id');
        
        $stmt->bindValue(':id', $data['id']);
        $stmt->bindValue(':datum', $data['datum']);
        $stmt->bindValue(':start', $data['start']);
        $stmt->bindValue(':ende', $data['ende']);
        $stmt->bindValue(':pause', $data['pause']);
        $stmt->bindValue(':netto', $data['netto']);
        $stmt->bindValue(':dezimal', $data['dezimal']);
        $stmt->bindValue(':ueberstunden', $data['ueberstunden']);
        $stmt->bindValue(':extra_stunden', $data['extra_stunden'] ?? null);
        $stmt->bindValue(':extra_positiv', $data['extra_positiv'] ?? null);
        $stmt->bindValue(':type', $data['type'] ?? 'regular');
        
        $stmt->execute();
        
        // Den aktualisierten Eintrag zurückgeben
        $stmt = $db->prepare('SELECT * FROM entries WHERE id = :id');
        $stmt->bindValue(':id', $data['id']);
        $result = $stmt->execute();
        $entry = $result->fetchArray(SQLITE3_ASSOC);
        
        if (!$entry) {
            sendError('Eintrag wurde aktualisiert, konnte aber nicht geladen werden');
        }
        
        sendJSON($entry);
    } catch (Exception $e) {
        sendError('Fehler beim Aktualisieren des Eintrags: ' . $e->getMessage());
    }
}

// DELETE: Eintrag löschen
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            sendError('Keine ID angegeben');
        }
        
        $db = getDB();
        $stmt = $db->prepare('DELETE FROM entries WHERE id = :id');
        $stmt->bindValue(':id', $id);
        $stmt->execute();
        
        sendJSON(['message' => 'Eintrag gelöscht']);
    } catch (Exception $e) {
        sendError('Fehler beim Löschen des Eintrags: ' . $e->getMessage());
    }
}
?>