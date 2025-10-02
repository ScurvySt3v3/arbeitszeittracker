// Automatische API-URL-Erkennung basierend auf Umgebung
const getApiBaseUrl = () => {
    if (process.env.NODE_ENV === 'production') {
        // In Produktion: Relative URL verwenden
        return '/api';
    } else {
        // In Entwicklung: PHP-Server auf Port 8000
        return 'http://localhost:8000';
    }
};

const API_BASE_URL = getApiBaseUrl();

export const api = {
    // Einträge
    async getEntries() {
        try {
            const response = await fetch(`${API_BASE_URL}/entries.php`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            if (!response.ok) {
                console.error('Server response:', response.status, response.statusText);
                throw new Error('Fehler beim Laden der Einträge');
            }
            return response.json();
        } catch (error) {
            console.error('Network error:', error);
            throw error;
        }
    },

    async createEntry(entry) {
        console.log('Sending entry:', entry);
        const response = await fetch(`${API_BASE_URL}/entries.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(entry),
        });
        if (!response.ok) throw new Error('Fehler beim Erstellen des Eintrags');
        return response.json();
    },

    async updateEntry(entry) {
        const response = await fetch(`${API_BASE_URL}/entries.php`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(entry),
        });
        if (!response.ok) throw new Error('Fehler beim Aktualisieren des Eintrags');
        return response.json();
    },

    async deleteEntry(id) {
        const response = await fetch(`${API_BASE_URL}/entries.php?id=${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Fehler beim Löschen des Eintrags');
        return response.json();
    },

    // Einstellungen
    async getSettings() {
        const response = await fetch(`${API_BASE_URL}/settings.php`);
        if (!response.ok) throw new Error('Fehler beim Laden der Einstellungen');
        return response.json();
    },

    async updateSettings(settings) {
        const response = await fetch(`${API_BASE_URL}/settings.php`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(settings),
        });
        if (!response.ok) throw new Error('Fehler beim Aktualisieren der Einstellungen');
        return response.json();
    },
};