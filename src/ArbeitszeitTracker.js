import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Download, Upload, Plus, Trash2, Settings, Play, Square, Edit2, Check, X } from 'lucide-react';
import { api } from './api';

const ArbeitszeitTracker = () => {
  const [entries, setEntries] = useState([]);
  const [sollStunden, setSollStunden] = useState(8);
  const [showSettings, setShowSettings] = useState(false);
  const [ueberstundenStartSaldo, setUeberstundenStartSaldo] = useState(0);


  // Hilfsfunktionen für Zeitkonvertierung
  const dezimalToHHMM = (dezimal) => {
    if (dezimal === null || dezimal === undefined || isNaN(dezimal)) {
      return '00:00';
    }
    const stunden = Math.floor(Math.abs(dezimal));
    const minuten = Math.round((Math.abs(dezimal) - stunden) * 60);
    return `${stunden.toString().padStart(2, '0')}:${minuten.toString().padStart(2, '0')}`;
  };

  const hhmmToDezimal = (hhmm) => {
    const [stunden, minuten] = hhmm.split(':').map(Number);
    return stunden + (minuten / 60);
  };

  const berechneFeierabendZeit = (startZeit, arbeitszeitInStunden) => {
    const [startH, startM] = startZeit.split(':').map(Number);
    let arbeitsMinuten = arbeitszeitInStunden * 60;
    
    // Pausenberechnung
    if (arbeitszeitInStunden > 9) {
      arbeitsMinuten += 45; // 30 + 15 Minuten Pause
    } else if (arbeitszeitInStunden > 6) {
      arbeitsMinuten += 30; // 30 Minuten Pause
    }
    
    let endeMinuten = startH * 60 + startM + arbeitsMinuten;
    const endeStunden = Math.floor(endeMinuten / 60);
    endeMinuten = Math.round(endeMinuten % 60);
    
    return `${endeStunden.toString().padStart(2, '0')}:${endeMinuten.toString().padStart(2, '0')}`;
  };
  const [newEntry, setNewEntry] = useState({
    datum: new Date().toISOString().split('T')[0],
    start: '09:00',
    ende: '17:00'
  });
  
  // Live Tracking State
  const [isTracking, setIsTracking] = useState(false);
  const [trackingStart, setTrackingStart] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showStartTimeEdit, setShowStartTimeEdit] = useState(false);
  
  // Aktualisiere die Startzeit beim Öffnen des Dialogs
  const openStartDialog = () => {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    setCustomStartTime(currentTime);
    setShowStartTimeEdit(true);
  };
  const [customStartTime, setCustomStartTime] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);

  // Funktion zum Starten der Bearbeitung eines Eintrags
  const startEditingEntry = (entry) => {
    setEditingEntry({
      ...entry,
      extraStunden: entry.extraStunden || '00:00',
      extraPositiv: entry.extraPositiv !== undefined ? entry.extraPositiv : true
    });
  };

  // Funktion zum Speichern des bearbeiteten Eintrags
  const saveEditedEntry = async () => {
    if (!editingEntry) return;

    try {
      const arbeitszeit = berechneArbeitszeit(editingEntry.start, editingEntry.ende);
      const autoUeberstunden = parseFloat(arbeitszeit.dezimal) - sollStunden;
      
      let extraStundenDezimal = 0;
      if (editingEntry.extraStunden && editingEntry.extraStunden !== '00:00') {
        extraStundenDezimal = hhmmToDezimal(editingEntry.extraStunden);
        if (!editingEntry.extraPositiv) {
          extraStundenDezimal = -extraStundenDezimal;
        }
      }

      const updatedEntry = {
        ...editingEntry,
        ...arbeitszeit,
        extraStunden: editingEntry.extraStunden || '00:00',
        extraPositiv: editingEntry.extraPositiv !== undefined ? editingEntry.extraPositiv : true,
        ueberstunden: (autoUeberstunden + extraStundenDezimal).toFixed(2)
      };

      const savedEntry = await api.updateEntry(updatedEntry);
      // Bestehende Einträge aktualisieren und nach Datum sortieren
      setEntries(prev => prev.map(e => 
        e.id === savedEntry.id ? savedEntry : e
      ).sort((a, b) => new Date(b.datum) - new Date(a.datum)));

      setEditingEntry(null);
    } catch (err) {
      alert('Fehler beim Aktualisieren des Eintrags: ' + err.message);
    }
  };

  // Lade Daten beim Start
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Lade Einstellungen
        const settings = await api.getSettings();
        setSollStunden(settings.soll_stunden);
        setUeberstundenStartSaldo(settings.ueberstunden_start_saldo);

        // Lade Einträge
        const loadedEntries = await api.getEntries();
        setEntries(loadedEntries);

        // Lade Tracking-Status aus localStorage (bleibt lokal)
        const savedTracking = localStorage.getItem('isTracking');
        const savedTrackingStart = localStorage.getItem('trackingStart');
        if (savedTracking === 'true' && savedTrackingStart) {
          setIsTracking(true);
          setTrackingStart(savedTrackingStart);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Aktualisiere Einstellungen auf dem Server
  useEffect(() => {
    const updateSettings = async () => {
      try {
        await api.updateSettings({
          soll_stunden: sollStunden,
          ueberstunden_start_saldo: ueberstundenStartSaldo
        });
      } catch (err) {
        console.error('Fehler beim Speichern der Einstellungen:', err);
      }
    };

    updateSettings();
  }, [sollStunden, ueberstundenStartSaldo]);


  useEffect(() => {
    localStorage.setItem('isTracking', isTracking.toString());
    if (trackingStart) {
      localStorage.setItem('trackingStart', trackingStart);
    } else {
      localStorage.removeItem('trackingStart');
    }
  }, [isTracking, trackingStart]);

  // Timer für Live-Anzeige
  useEffect(() => {
    if (isTracking) {
      const timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isTracking]);

  const berechneArbeitszeit = (start, ende) => {
    if (!start || !ende) {
      throw new Error('Start- und Endzeit müssen angegeben werden');
    }

    const [startH, startM] = start.split(':').map(Number);
    const [endeH, endeM] = ende.split(':').map(Number);

    if (isNaN(startH) || isNaN(startM) || isNaN(endeH) || isNaN(endeM) ||
        startH < 0 || startH > 23 || startM < 0 || startM > 59 ||
        endeH < 0 || endeH > 23 || endeM < 0 || endeM > 59) {
      throw new Error('Ungültiges Zeitformat oder Werte außerhalb des gültigen Bereichs');
    }
    
    let startMinuten = startH * 60 + startM;
    let endeMinuten = endeH * 60 + endeM;

    // Wenn die Endzeit vor der Startzeit liegt, addiere 24 Stunden (für Übernacht-Arbeitszeiten)
    if (endeMinuten < startMinuten) {
      endeMinuten += 24 * 60;
    }
    
    const bruttoMinuten = endeMinuten - startMinuten;
    const bruttoStunden = Math.round(bruttoMinuten) / 60; // Runden auf volle Minuten
    let pause = 0;
    
    if (bruttoStunden >= 9) {
      pause = 45; // 30 + 15 Minuten Pause
    } else if (bruttoStunden >= 6) {
      pause = 30; // 30 Minuten Pause
    }
    
    const nettoMinuten = Math.round(bruttoMinuten - pause); // Runden auf volle Minuten
    const stunden = Math.floor(Math.abs(nettoMinuten) / 60);
    const minuten = Math.abs(nettoMinuten) % 60;
    
    return {
      netto: `${stunden.toString().padStart(2, '0')}:${minuten.toString().padStart(2, '0')}`, // Beide Werte mit Nullen auffüllen
      dezimal: (nettoMinuten / 60).toFixed(2),
      pause,
      brutto: bruttoStunden.toFixed(2)
    };
  };

  const berechneLiveStatus = () => {
    if (!isTracking || !trackingStart) return null;

    const now = currentTime;
    const [startH, startM] = trackingStart.split(':').map(Number);
    const startDate = new Date(now);
    startDate.setHours(startH, startM, 0, 0);

    const vergangeneMs = now - startDate;
    const vergangeneMinuten = Math.floor(vergangeneMs / 1000 / 60);
    const vergangeneStunden = vergangeneMinuten / 60;

    // Pause berechnen
    let pause = 0;
    let ersteZwangspause = 0;
    let zweiteZwangspause = 0;
    
    if (vergangeneStunden >= 6) {
      ersteZwangspause = 30;
      pause += 30;
    }
    if (vergangeneStunden >= 9) {
      zweiteZwangspause = 15;
      pause += 15;
    }
    
    // Berechne die Uhrzeiten für die Zwangspausen
    const erstePauseZeit = new Date(startDate);
    erstePauseZeit.setHours(startH);
    erstePauseZeit.setMinutes(startM);
    erstePauseZeit.setHours(erstePauseZeit.getHours() + 6);
    
    const zweitePauseZeit = new Date(startDate);
    zweitePauseZeit.setHours(startH);
    zweitePauseZeit.setMinutes(startM);
    zweitePauseZeit.setHours(zweitePauseZeit.getHours() + 9);
    
    const formatZeit = (date) => `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    const erstePauseUhrzeit = formatZeit(erstePauseZeit);
    const zweitePauseUhrzeit = formatZeit(zweitePauseZeit);

    const nettoMinuten = vergangeneMinuten - pause;
    const nettoStunden = nettoMinuten / 60;

    // Zeit bis Feierabend (mit Berücksichtigung der noch kommenden Pause)
    const sollMinuten = sollStunden * 60;
    const verbleibendeMinuten = sollMinuten - nettoMinuten;
    
    // Berechne, ob noch eine Pause bevorsteht
    const restlichePause = vergangeneStunden < 6 ? 
      (vergangeneStunden + (verbleibendeMinuten / 60) >= 6 ? 30 : 0) : // Wenn wir über 6h kommen
      vergangeneStunden < 9 ?
      (vergangeneStunden + (verbleibendeMinuten / 60) >= 9 ? 15 : 0) : // Wenn wir über 9h kommen (noch 15min zusätzlich)
      0;
    
    const stunden = Math.floor(Math.abs(nettoMinuten) / 60);
    const minuten = Math.abs(nettoMinuten) % 60;
    const sekunden = Math.floor((Math.abs(vergangeneMs) / 1000) % 60);

    const verbleibendStunden = Math.floor(Math.abs(verbleibendeMinuten + restlichePause) / 60);
    const verbleibendMinuten = Math.abs(verbleibendeMinuten + restlichePause) % 60;
    
    // Berechne Feierabend-Uhrzeit basierend auf Startzeit
    const feierabendZeit = new Date(now);
    feierabendZeit.setHours(startH);
    feierabendZeit.setMinutes(startM);
    feierabendZeit.setSeconds(0);
    // Addiere Sollarbeitszeit plus Pausen
    feierabendZeit.setMinutes(feierabendZeit.getMinutes() + (sollStunden * 60) + (restlichePause || pause));
    const feierabendUhrzeit = `${feierabendZeit.getHours().toString().padStart(2, '0')}:${feierabendZeit.getMinutes().toString().padStart(2, '0')}`;

    return {
      gearbeitet: `${stunden.toString().padStart(2, '0')}:${minuten.toString().padStart(2, '0')}:${sekunden.toString().padStart(2, '0')}`,
      verbleibend: verbleibendeMinuten < 0 ? 
        `+${verbleibendStunden.toString().padStart(2, '0')}:${verbleibendMinuten.toString().padStart(2, '0')}:00` :
        `-${verbleibendStunden.toString().padStart(2, '0')}:${verbleibendMinuten.toString().padStart(2, '0')}:00`,
      ueberstunden: nettoStunden - sollStunden,
      istUeberstunden: nettoStunden >= sollStunden,
      pause,
      bruttoStunden: vergangeneStunden,
      feierabendUhrzeit,
      restlichePause,
      erstePauseUhrzeit,
      zweitePauseUhrzeit,
      ersteZwangspause,
      zweiteZwangspause
    };
  };

  const startTracking = (customTime = null) => {
    const now = new Date();
    let startTime;
    
    if (customTime) {
      startTime = customTime;
    } else {
      startTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }


    
    setTrackingStart(startTime);
    setIsTracking(true);
    setShowStartTimeEdit(false);
    setCustomStartTime('');
  };

  const stopTracking = async () => {
    if (!trackingStart) {
      alert('Keine Startzeit vorhanden.');
      return;
    }

    try {
      const now = new Date();
      const endeTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const arbeitszeit = berechneArbeitszeit(trackingStart, endeTime);
      const ueberstunden = parseFloat(arbeitszeit.dezimal) - sollStunden;
      
      const newEntry = {
        datum: now.toISOString().split('T')[0],
        start: trackingStart,
        ende: endeTime,
        pause: arbeitszeit.pause,
        netto: arbeitszeit.netto,
        dezimal: arbeitszeit.dezimal,
        brutto: arbeitszeit.brutto,
        extraStunden: '00:00',
        extraPositiv: true,
        ueberstunden: ueberstunden.toFixed(2)
      };
      
      console.log('Stopping tracking with entry:', newEntry);
      
      const createdEntry = await api.createEntry(newEntry);
      // Neuen Eintrag zur Liste hinzufügen und nach Datum sortieren
      setEntries(prev => [createdEntry, ...prev].sort((a, b) => new Date(b.datum) - new Date(a.datum)));
      setIsTracking(false);
      setTrackingStart(null);
    } catch (err) {
      alert('Fehler beim Speichern des Eintrags: ' + err.message);
    }
  };

    const [isSubmitting, setIsSubmitting] = useState(false);

  const addEntry = async () => {
      // Validiere die Eingaben
      if (!newEntry.datum || !newEntry.start || !newEntry.ende) {
        alert('Bitte füllen Sie alle Felder aus.');
        return;
      }

      if (isSubmitting) {
        return;
      }
      
      // Validiere das Zeitformat
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(newEntry.start) || !timeRegex.test(newEntry.ende)) {
      alert('Bitte geben Sie gültige Uhrzeiten ein (HH:MM).');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const arbeitszeit = berechneArbeitszeit(newEntry.start, newEntry.ende);
      if (!arbeitszeit || !arbeitszeit.dezimal) {
        throw new Error('Fehler bei der Arbeitszeitberechnung');
      }
      const ueberstunden = (parseFloat(arbeitszeit.dezimal) - parseFloat(sollStunden)).toFixed(2);
      
      const entry = {
        ...newEntry,
        pause: arbeitszeit.pause,
        netto: arbeitszeit.netto,
        dezimal: arbeitszeit.dezimal,
        brutto: arbeitszeit.brutto,
        extraStunden: '00:00',
        extraPositiv: true,
        ueberstunden: ueberstunden
      };
      
      console.log('Sending entry:', entry);
      
      const createdEntry = await api.createEntry(entry);
      // Neuen Eintrag zur Liste hinzufügen und nach Datum sortieren
      setEntries(prev => [createdEntry, ...prev].sort((a, b) => new Date(b.datum) - new Date(a.datum)));
      setNewEntry({
        datum: new Date().toISOString().split('T')[0],
        start: '09:00',
        ende: '17:00'
      });
    } catch (err) {
      console.error('Error creating entry:', err);
      alert('Fehler beim Hinzufügen des Eintrags: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteEntry = async (id) => {
    try {
      await api.deleteEntry(id);
      // Eintrag aus der Liste entfernen
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      alert('Fehler beim Löschen des Eintrags: ' + err.message);
    }
  };


  const ueberstundenAusEintraegen = entries.reduce((sum, e) => {
    const ueberstunden = parseFloat(e.ueberstunden);
    return sum + (isNaN(ueberstunden) ? 0 : ueberstunden);
  }, 0);
  const gesamtUeberstundenAusEintraegen = parseFloat(ueberstundenStartSaldo) + ueberstundenAusEintraegen;
  const gesamtStunden = entries.reduce((sum, e) => {
    const dezimal = parseFloat(e.dezimal);
    return sum + (isNaN(dezimal) ? 0 : dezimal);
  }, 0);
  const liveStatus = berechneLiveStatus();

  const exportBackup = () => {
    const backup = {
      entries,
      sollStunden,
      ueberstundenStartSaldo,
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `arbeitszeittracker_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const importBackup = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target.result);
        if (backup.version === '1.0') {
          setEntries(backup.entries);
          setSollStunden(backup.sollStunden);
          if (backup.ueberstundenStartSaldo !== undefined) {
            setUeberstundenStartSaldo(backup.ueberstundenStartSaldo);
          }
          alert('Backup erfolgreich importiert!');
        } else {
          alert('Ungültiges oder nicht unterstütztes Backup-Format');
        }
      } catch (error) {
        alert('Fehler beim Import: ' + error.message);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  };

  const exportCSV = () => {
    const headers = ['Datum', 'Typ', 'Start', 'Ende', 'Pause (Min)', 'Arbeitszeit', 'Dezimal', 'Überstunden'];
    const rows = entries.map(e => [
      e.datum,
      e.type === 'correction' ? 'Korrektur' : 'Arbeitszeit',
      e.start,
      e.ende,
      e.pause,
      e.netto,
      e.dezimal,
      e.ueberstunden
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `arbeitszeiten_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {error ? (
          <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
            <div className="text-red-600 text-center">
              <h2 className="text-xl font-bold mb-2">Fehler beim Laden der Daten</h2>
              <p>{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition">
                Neu laden
              </button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-indigo-600" />
              <h1 className="text-3xl font-bold text-gray-800">Arbeitszeittracker</h1>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <Settings className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {showSettings && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sollarbeitszeit pro Tag (Stunden)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={sollStunden}
                  onChange={(e) => setSollStunden(parseFloat(e.target.value))}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Überstunden-Startsaldo (Stunden)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setUeberstundenStartSaldo(Math.abs(ueberstundenStartSaldo))}
                    className={`px-3 py-2 rounded-lg ${ueberstundenStartSaldo >= 0 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'} hover:opacity-80`}
                  >
                    +
                  </button>
                  <button
                    onClick={() => setUeberstundenStartSaldo(-Math.abs(ueberstundenStartSaldo))}
                    className={`px-3 py-2 rounded-lg ${ueberstundenStartSaldo < 0 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'} hover:opacity-80`}
                  >
                    -
                  </button>
                  <input
                    type="time"
                    value={dezimalToHHMM(Math.abs(ueberstundenStartSaldo))}
                    onChange={(e) => {
                      const [h, m] = e.target.value.split(':').map(Number);
                      const newValue = h + (m / 60);
                      setUeberstundenStartSaldo(ueberstundenStartSaldo >= 0 ? newValue : -newValue);
                    }}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    step="300"
                  />
                </div>
              </div>

            </div>
          )}

          {/* Live Tracking Section */}
          <div className="mb-6 p-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg text-white">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6" />
              Live Tracking
            </h2>

            {/* Pausenwarnungen */}
            {isTracking && liveStatus && (
              <div className="mb-4 space-y-2">
                {/* Erste Pausenwarnung (6 Stunden) */}
                {liveStatus.bruttoStunden >= 5.5 && liveStatus.bruttoStunden < 6 && (
                  <div className="px-4 py-2 rounded-lg text-sm text-white shadow-lg"
                       style={{
                         backgroundColor: liveStatus.bruttoStunden >= 5.92 ? '#EF4444' : // 5min vor 6h
                                           liveStatus.bruttoStunden >= 5.83 ? '#F59E0B' : // 10min vor 6h
                                           '#FCD34D' // 30min vor 6h (5.5h)
                       }}>
                    {liveStatus.bruttoStunden >= 5.92 ? 
                      `ACHTUNG: 30-min Pause sofort erforderlich! (spätestens um ${liveStatus.erstePauseUhrzeit})` :
                      liveStatus.bruttoStunden >= 5.83 ? 
                      `Wichtig: 30-min Pause in weniger als 10 Minuten erforderlich (um ${liveStatus.erstePauseUhrzeit})` :
                      `Hinweis: 30-min Pausenpflicht um ${liveStatus.erstePauseUhrzeit}`}
                  </div>
                )}
                {/* Zweite Pausenwarnung (9 Stunden) */}
                {liveStatus.bruttoStunden >= 8.5 && liveStatus.bruttoStunden < 9 && (
                  <div className="px-4 py-2 rounded-lg text-sm text-white shadow-lg"
                       style={{
                         backgroundColor: liveStatus.bruttoStunden >= 8.92 ? '#EF4444' : // 5min vor 9h
                                           liveStatus.bruttoStunden >= 8.83 ? '#F59E0B' : // 10min vor 9h
                                           '#FCD34D' // 30min vor 9h (8.5h)
                       }}>
                    {liveStatus.bruttoStunden >= 8.92 ? 
                      `ACHTUNG: Zusätzliche 15-min Pause sofort erforderlich! (spätestens um ${liveStatus.zweitePauseUhrzeit})` :
                      liveStatus.bruttoStunden >= 8.83 ? 
                      `Wichtig: Zusätzliche 15-min Pause in weniger als 10 Minuten erforderlich (um ${liveStatus.zweitePauseUhrzeit})` :
                      `Hinweis: Zusätzliche 15-min Pausenpflicht um ${liveStatus.zweitePauseUhrzeit}`}
                  </div>
                )}
              </div>
            )}
            
            {!isTracking ? (
              <div className="text-center">
                <p className="mb-4 text-lg">Starte das Tracking für deinen aktuellen Arbeitstag</p>
                
                {!showStartTimeEdit ? (
                  <div className="flex justify-center">
                    <button
                      onClick={openStartDialog}
                      className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition flex items-center gap-2"
                    >
                      <Play className="w-5 h-5" />
                      Arbeitszeit starten
                    </button>
                  </div>
                ) : (
                  <div className="bg-white bg-opacity-20 backdrop-blur p-4 rounded-lg max-w-md mx-auto space-y-4">
                    <div>
                      <label className="block text-sm mb-2">Startzeit eingeben:</label>
                      <div className="flex gap-2">
                        <input
                          type="time"
                          value={customStartTime}
                          onChange={(e) => setCustomStartTime(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="bg-gray-700 p-4 rounded-lg">
                        <div className="space-y-3">
                          <div>
                            <div className="text-sm text-gray-300 mb-1">Regulärer Feierabend:</div>
                            <div className="text-xl font-bold">{berechneFeierabendZeit(customStartTime, 8)}</div>
                            <div className="text-xs text-gray-400">(8:00 Stunden + 30 Minuten Pause)</div>
                          </div>
                          {gesamtUeberstundenAusEintraegen !== 0 && (
                            <div>
                              <div className="text-sm text-gray-300 mb-1">Feierabend mit Überstunden{gesamtUeberstundenAusEintraegen < 0 ? ' (Nacharbeit)' : ''}:</div>
                              <div className="text-xl font-bold">
                                {berechneFeierabendZeit(customStartTime, 8 - gesamtUeberstundenAusEintraegen)}
                              </div>
                              <div className="text-xs text-gray-400">
                                ({dezimalToHHMM(8 - gesamtUeberstundenAusEintraegen)} Stunden
                                {8 - gesamtUeberstundenAusEintraegen > 6 ? ' + Pause' : ''}
                                {gesamtUeberstundenAusEintraegen >= 0 ? ' durch ' + dezimalToHHMM(Math.abs(gesamtUeberstundenAusEintraegen)) + 'h Überstundenausgleich' : ''})
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (customStartTime) {
                            startTracking(customStartTime);
                          }
                        }}
                        className="flex-1 bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
                      >
                        Start
                      </button>
                      <button
                        onClick={() => {
                          setShowStartTimeEdit(false);
                          setCustomStartTime('');
                        }}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white bg-opacity-20 p-4 rounded-lg backdrop-blur">
                    <div className="text-sm opacity-90 mb-1">Arbeitsbeginn</div>
                    <div className="text-3xl font-bold">{trackingStart}</div>
                  </div>
                  <div className="bg-white bg-opacity-20 p-4 rounded-lg backdrop-blur relative">
                    <div className="text-sm opacity-90 mb-1">Gearbeitet (netto)</div>
                    <div className="text-3xl font-bold font-mono">{liveStatus?.gearbeitet}</div>
                    <div className="text-xs opacity-75 mt-1">Pause: {liveStatus?.pause} Min</div>

                  </div>
                  <div className={`bg-white bg-opacity-20 p-4 rounded-lg backdrop-blur ${liveStatus?.istUeberstunden ? 'ring-2 ring-green-300' : ''}`}>
                    <div className="text-sm opacity-90 mb-1">Zeit bis Feierabend</div>
                    <div className="text-3xl font-bold font-mono">{liveStatus?.verbleibend}</div>
                    <div className="text-sm mt-1">
                      Feierabend um: <span className="font-bold">{liveStatus?.feierabendUhrzeit}</span>
                      {liveStatus?.restlichePause > 0 && (
                        <span className="text-xs ml-2">(inkl. {liveStatus.restlichePause} Min Pause)</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white bg-opacity-20 p-4 rounded-lg backdrop-blur mb-4">
                  <div className="text-sm opacity-90 mb-1">Überstunden gesamt (live)</div>
                  <div className={`text-4xl font-bold font-mono ${(parseFloat(gesamtUeberstundenAusEintraegen) + (liveStatus?.ueberstunden || 0)) >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {(parseFloat(gesamtUeberstundenAusEintraegen) + (liveStatus?.ueberstunden || 0)) >= 0 ? '+' : '-'}
                    {dezimalToHHMM(Math.abs(parseFloat(gesamtUeberstundenAusEintraegen) + (parseFloat(liveStatus?.ueberstunden) || 0)))}
                  </div>
                  <div className="text-xs opacity-75 mt-2 space-y-1">
                    <div>Startsaldo: {ueberstundenStartSaldo >= 0 ? '+' : '-'}{dezimalToHHMM(Math.abs(ueberstundenStartSaldo))}</div>
                    <div>Aus Einträgen: {ueberstundenAusEintraegen >= 0 ? '+' : '-'}{dezimalToHHMM(Math.abs(ueberstundenAusEintraegen))}</div>
                    <div>Heute aktuell: {liveStatus?.istUeberstunden ? '+' : '-'}{dezimalToHHMM(Math.abs(liveStatus?.ueberstunden || 0))}</div>
                  </div>
                </div>

                <button
                  onClick={stopTracking}
                  className="bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition flex items-center gap-2 mx-auto"
                >
                  <Square className="w-5 h-5" />
                  Arbeitstag beenden
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Gesamtstunden</div>
              <div className="text-2xl font-bold text-indigo-600">{dezimalToHHMM(gesamtStunden)}</div>
            </div>
            <div className={`p-4 rounded-lg ${gesamtUeberstundenAusEintraegen >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="text-sm text-gray-600 mb-1">Überstunden (gesamt)</div>
              <div className={`text-2xl font-bold ${gesamtUeberstundenAusEintraegen >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {gesamtUeberstundenAusEintraegen >= 0 ? '+' : '-'}{dezimalToHHMM(Math.abs(gesamtUeberstundenAusEintraegen))}
              </div>
              <div className="text-xs text-gray-500 mt-1 space-y-1">
                <div>Startsaldo: {ueberstundenStartSaldo >= 0 ? '+' : '-'}{dezimalToHHMM(Math.abs(ueberstundenStartSaldo))}</div>
                <div>Aus Einträgen: {ueberstundenAusEintraegen >= 0 ? '+' : '-'}{dezimalToHHMM(Math.abs(ueberstundenAusEintraegen))}</div>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Einträge</div>
              <div className="text-2xl font-bold text-blue-600">{entries.length}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Ø pro Tag</div>
              <div className="text-2xl font-bold text-purple-600">
                {entries.length > 0 ? dezimalToHHMM(gesamtStunden / entries.length) : '00:00'}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Manuell eintragen
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Datum</label>
                <input
                  type="date"
                  value={newEntry.datum}
                  onChange={(e) => setNewEntry({...newEntry, datum: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start</label>
                <input
                  type="time"
                  value={newEntry.start}
                  onChange={(e) => setNewEntry({...newEntry, start: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ende</label>
                <input
                  type="time"
                  value={newEntry.ende}
                  onChange={(e) => setNewEntry({...newEntry, ende: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={addEntry}
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                  {isSubmitting ? 'Wird gespeichert...' : 'Hinzufügen'}
                </button>
              </div>
            </div>
          </div>

          <div className="mb-4 flex gap-4 items-center">
            <button
              onClick={exportBackup}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Backup exportieren
            </button>

            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={importBackup}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <button
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Backup importieren
              </button>
            </div>

            {entries.length > 0 && (
              <button
                onClick={exportCSV}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Als CSV exportieren
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Datum</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Typ</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Start</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ende</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Pause</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Arbeitszeit (HH:MM)</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Dezimal (h)</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Überstunden (HH:MM)</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {editingEntry?.id === entry.id ? (
                        <input
                          type="date"
                          value={editingEntry.datum}
                          onChange={(e) => setEditingEntry({...editingEntry, datum: e.target.value})}
                          className="w-full px-2 py-1 border rounded"
                        />
                      ) : entry.datum}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {entry.type === 'correction' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          Korrektur
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {editingEntry?.id === entry.id ? (
                        <input
                          type="time"
                          value={editingEntry.start}
                          onChange={(e) => setEditingEntry({...editingEntry, start: e.target.value})}
                          className="w-full px-2 py-1 border rounded"
                        />
                      ) : entry.isExtraHours ? '* Extra Überstunden' : entry.start}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {editingEntry?.id === entry.id ? (
                        <input
                          type="time"
                          value={editingEntry.ende}
                          onChange={(e) => setEditingEntry({...editingEntry, ende: e.target.value})}
                          className="w-full px-2 py-1 border rounded"
                        />
                      ) : entry.isExtraHours ? '→ ' + entry.ende : entry.ende}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.pause} Min</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{entry.netto}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.dezimal}h</td>
                    <td className={`px-4 py-3 text-sm ${parseFloat(entry.ueberstunden) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <div className="space-y-2">
                        <div className="font-semibold">
                          Auto: {parseFloat(entry.ueberstunden) >= 0 ? '+' : '-'}{dezimalToHHMM(Math.abs(parseFloat(entry.ueberstunden)))}
                        </div>
                        {editingEntry?.id === entry.id ? (
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-600">Extra:</div>
                            <button
                              onClick={() => setEditingEntry({...editingEntry, extraPositiv: true})}
                              className={`px-2 py-0.5 rounded ${editingEntry.extraPositiv ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'} hover:opacity-80 text-xs`}
                            >
                              +
                            </button>
                            <button
                              onClick={() => setEditingEntry({...editingEntry, extraPositiv: false})}
                              className={`px-2 py-0.5 rounded ${!editingEntry.extraPositiv ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'} hover:opacity-80 text-xs`}
                            >
                              -
                            </button>
                            <input
                              type="time"
                              value={editingEntry.extraStunden || '00:00'}
                              onChange={(e) => setEditingEntry({...editingEntry, extraStunden: e.target.value})}
                              className="w-20 px-1 py-0.5 border rounded text-gray-900"
                              step="300"
                            />
                          </div>
                        ) : entry.extraStunden ? (
                          <div className="text-xs text-gray-500">
                            Extra: {entry.extraPositiv ? '+' : '-'}{entry.extraStunden}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm space-x-2">
                      {editingEntry?.id === entry.id ? (
                        <>
                          <button
                            onClick={() => saveEditedEntry()}
                            className="text-green-600 hover:text-green-800 transition"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingEntry(null)}
                            className="text-gray-600 hover:text-gray-800 transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditingEntry(entry)}
                            className="text-blue-600 hover:text-blue-800 transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="text-red-600 hover:text-red-800 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {entries.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Noch keine Einträge vorhanden.</p>
              <p className="text-sm">Füge deine erste Arbeitszeit hinzu!</p>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
};

export default ArbeitszeitTracker;