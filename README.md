# Arbeitszeittracker

Eine React- und PHP-basierte Webanwendung zur Zeiterfassung und Überstundenverwaltung.

## Features

- 🕒 Live-Zeiterfassung
- ⚡ Automatische Überstundenberechnung
- ⚠️ Gesetzliche Pausenwarnungen (6h/9h Regelung)
- 📊 Verwaltung von Extra-Stunden
- 💾 Persistente Datenspeicherung (SQLite)
- 📱 Multi-Device Support
- 📤 Export/Import von Daten (JSON, CSV)
- 🎯 Überstunden-Startsaldo Management

## Funktionen im Detail

### Zeiterfassung
- Start/Stop der Arbeitszeit mit Live-Tracking
- Manuelle Einträge möglich
- Automatische Pausenberechnung (30min nach 6h, zusätzliche 15min nach 9h)
- Echtzeit-Pausenwarnungen

### Überstundenverwaltung
- Automatische Berechnung basierend auf Sollarbeitszeit
- Separates Extra-Stunden-Feld für manuelle Anpassungen
- Überstunden-Startsaldo einstellbar
- Gesamtübersicht mit Aufschlüsselung

### Datenmanagement
- Automatische Speicherung im Browser (localStorage)
- Export als JSON-Backup oder CSV-Datei
- Import von Backup-Dateien

## Installation & Start

### Entwicklung

```bash
# Dependencies installieren
npm install

# Entwicklungsserver starten
npm start
```

### Production Build

```bash
# Optimierten Build erstellen
npm run build
```

## Deployment-Optionen

### 1. Synology Web Station

#### Voraussetzungen
- Synology NAS mit DSM 7.0 oder höher
- Web Station Paket installiert
- PHP 7.4 oder höher aktiviert
- SQLite3 für PHP installiert

#### Installation Schritt für Schritt

1. **Vorbereitung auf dem Entwicklungsrechner:**
   ```bash
   # Production Build erstellen
   npm run build
   ```

2. **Package-Struktur erstellen:**
   ```
   arbeitszeittracker/
   ├── web/                # React Frontend (build Ordner)
   │   ├── index.html
   │   ├── static/
   │   └── ...
   └── api/                # PHP Backend
       ├── index.php
       ├── entries.php
       ├── settings.php
       ├── config.php
       └── database.sqlite
   ```

3. **Installation auf der Synology:**
   1. **Web Station öffnen:**
      - DSM öffnen → Paket-Zentrum → Web Station
      - Apache HTTP Server muss installiert und aktiv sein
      - PHP aktivieren unter Web Station → Allgemein → PHP

   2. **Virtual Host erstellen:**
      - Web Station → Virtual Host
      - "Erstellen" klicken
      - Port: 80 oder 443 (für HTTPS)
      - Hostname: Ihre Domain oder IP
      - Dokumentstamm: Pfad zum `web` Ordner
      - PHP aktivieren: Version 7.4 oder höher
      - "PHP" als Seiteninhalt wählen

   3. **Dateien übertragen:**
      - FileStation öffnen
      - Zum Web-Ordner navigieren (standard: `/volume1/web/`)
      - Neuen Ordner `arbeitszeittracker` erstellen
      - `web` und `api` Ordner hochladen

   4. **Berechtigungen setzen:**
      ```bash
      # Auf der Synology via SSH oder Terminal
      cd /volume1/web/arbeitszeittracker
      chmod -R 755 web/
      chmod -R 755 api/
      chmod 777 api/database.sqlite
      chown -R http:http api/
      ```

   5. **Apache Konfiguration:**
      - Erstellen Sie eine `.htaccess` Datei im `web` Ordner:
      ```apache
      RewriteEngine On
      RewriteBase /
      RewriteRule ^index\.html$ - [L]
      RewriteCond %{REQUEST_FILENAME} !-f
      RewriteCond %{REQUEST_FILENAME} !-d
      RewriteCond %{REQUEST_FILENAME} !-l
      RewriteRule . /index.html [L]
      ```

#### CORS & API Konfiguration

1. **API Konfiguration anpassen:**
   Öffnen Sie `api/config.php` und passen Sie die CORS-Einstellungen an:
   ```php
   <?php
   header('Access-Control-Allow-Origin: *');
   header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
   header('Access-Control-Allow-Headers: Content-Type');
   ```

2. **Frontend API-URL anpassen:**
   Passen Sie die API-URL in `src/api.js` vor dem Build an:
   ```javascript
   const API_BASE_URL = '/api';
   ```

#### Fertigstellung & Test

1. Öffnen Sie die Anwendung im Browser:
   ```
   http://ihre-synology-ip/arbeitszeittracker/
   ```

2. Testen Sie die API-Verbindung:
   ```
   http://ihre-synology-ip/arbeitszeittracker/api/entries.php
   ```

#### Fehlerbehebung

1. **Fehler 403/404:**
   - Überprüfen Sie die Berechtigungen
   - Apache Logs in der DSM prüfen
   - `.htaccess` Konfiguration prüfen

2. **API-Fehler:**
   - PHP-Logs in der DSM prüfen
   - CORS-Einstellungen überprüfen
   - SQLite Berechtigungen prüfen

3. **Datenbank-Fehler:**
   - SQLite-Erweiterung in PHP prüfen
   - Datenbankberechtigungen prüfen

### 2. Docker Deployment

1. Mit Docker Build:
   ```bash
   # Container bauen
   docker build -t arbeitszeittracker .

   # Container starten
   docker run -d -p 8080:80 arbeitszeittracker
   ```

2. Mit Docker Compose:
   ```bash
   # Container bauen und starten
   docker-compose up -d
   ```

Die Anwendung ist dann unter `http://localhost:8080` (oder Ihrer konfigurierten Domain) erreichbar.

## Docker-Konfiguration

Das Projekt enthält folgende Docker-Dateien:

- `Dockerfile`: Multi-Stage Build für optimierte Image-Größe
- `nginx.conf`: Optimierte Webserver-Konfiguration
- `docker-compose.yml`: Einfache Container-Orchestrierung

### Docker Compose Konfiguration
```yaml
version: '3.8'
services:
  arbeitszeittracker:
    build: .
    container_name: arbeitszeittracker
    ports:
      - "8080:80"
    restart: unless-stopped
```

## Technischer Stack

- React (Frontend Framework)
- Tailwind CSS (Styling)
- localStorage (Datenpersistenz)
- Lucide React (Icons)

## Browser Support

Getestet und kompatibel mit:
- Chrome/Chromium (empfohlen)
- Firefox
- Safari
- Edge

## Wichtige Hinweise

- Backend-Daten werden in SQLite gespeichert
- Live-Tracking-Daten werden lokal im Browser gespeichert
- Regelmäßige Backups über die Export-Funktion werden empfohlen
- Bei Browser-Datenlöschung gehen die Live-Tracking-Daten verloren
- Multi-Device-Synchronisation erfolgt über das Backend