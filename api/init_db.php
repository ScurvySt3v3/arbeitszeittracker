<?php
require_once 'config.php';

try {
    $db = getDB();
    
    // Tabelle für Arbeitszeit-Einträge
    $db->exec('CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        datum DATE NOT NULL,
        start TIME NOT NULL,
        ende TIME NOT NULL,
        pause INTEGER NOT NULL,
        netto TEXT NOT NULL,
        dezimal REAL NOT NULL,
        ueberstunden REAL NOT NULL,
        extra_stunden TEXT,
        extra_positiv INTEGER,
        type TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    
    // Tabelle für Benutzereinstellungen
    $db->exec('CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        soll_stunden REAL NOT NULL DEFAULT 8,
        ueberstunden_start_saldo REAL NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )');
    
    // Standardeinstellungen einfügen, falls nicht vorhanden
    $db->exec('INSERT OR IGNORE INTO settings (id, soll_stunden, ueberstunden_start_saldo) VALUES (1, 8, 0)');
    
    echo json_encode(['message' => 'Datenbank erfolgreich initialisiert']);
} catch (Exception $e) {
    sendError('Fehler beim Initialisieren der Datenbank: ' . $e->getMessage());
}
?>