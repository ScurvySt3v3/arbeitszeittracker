# Arbeitszeittracker

Eine React-basierte Webanwendung zur Zeiterfassung und Überstundenverwaltung.

## Features

- 🕒 Live-Zeiterfassung
- ⚡ Automatische Überstundenberechnung
- ⚠️ Gesetzliche Pausenwarnungen (6h/9h Regelung)
- 📊 Verwaltung von Extra-Stunden
- 💾 Automatische Datenspeicherung im Browser
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

1. Production Build erstellen:
   ```bash
   npm run build
   ```

2. In der Synology DSM:
   - Web Station öffnen
   - Neuen Virtual Host erstellen
   - Inhalt des `build`-Ordners in das Webverzeichnis kopieren

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

- Alle Daten werden lokal im Browser gespeichert
- Regelmäßige Backups über die Export-Funktion werden empfohlen
- Bei Browser-Datenlöschung gehen die Daten verloren
- Multi-Device-Synchronisation ist nicht implementiert