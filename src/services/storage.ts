import { AppSettings, DEFAULT_SETTINGS, UserProfile, OvertimeEntry, HistoryEntry } from "../types/app";
import { db, doc, setDoc, getDoc, collection, getDocs, query, where, deleteDoc, OperationType, handleFirestoreError } from "../firebase";

const KEYS = {
  SETTINGS: "ot_tracker_settings",
  PROFILE: "ot_tracker_profile",
  ENTRIES: "ot_tracker_entries",
  HISTORY: "ot_tracker_history",
};

export const StorageService = {
  getSettings(): AppSettings {
    const data = localStorage.getItem(KEYS.SETTINGS);
    if (!data) return DEFAULT_SETTINGS;
    
    const saved = JSON.parse(data);
    // Deep merge with defaults to ensure all keys exist
    const settings: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...saved,
      notifications: { ...DEFAULT_SETTINGS.notifications, ...saved.notifications },
      overtime: { ...DEFAULT_SETTINGS.overtime, ...saved.overtime },
      timeFormat: { ...DEFAULT_SETTINGS.timeFormat, ...saved.timeFormat },
      security: { ...DEFAULT_SETTINGS.security, ...saved.security },
      appearance: { ...DEFAULT_SETTINGS.appearance, ...saved.appearance },
    };
    return settings;
  },

  saveSettings(settings: AppSettings) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    // Dispatch event for reactive updates
    window.dispatchEvent(new Event("settingsChanged"));
  },

  getProfile(): UserProfile | null {
    const data = localStorage.getItem(KEYS.PROFILE);
    return data ? JSON.parse(data) : null;
  },

  saveProfile(profile: UserProfile, userId?: string) {
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
    window.dispatchEvent(new Event("profileChanged"));
    
    if (userId) {
      setDoc(doc(db, 'users', userId), profile, { merge: true })
        .catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`));
    }
  },

  getEntries(): OvertimeEntry[] {
    const data = localStorage.getItem(KEYS.ENTRIES);
    return data ? JSON.parse(data) : [];
  },

  saveEntries(entries: OvertimeEntry[], userId?: string) {
    localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
    window.dispatchEvent(new Event("entriesChanged"));
    
    // If we have a userId, we should ideally sync individual entries
    // but for simplicity in this bulk save, we'll just update local
  },

  async saveEntry(entry: OvertimeEntry, userId?: string) {
    const entries = this.getEntries();
    const index = entries.findIndex(e => e.id === entry.id);
    if (index > -1) {
      entries[index] = entry;
    } else {
      entries.push(entry);
    }
    localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
    window.dispatchEvent(new Event("entriesChanged"));

    if (userId) {
      try {
        await setDoc(doc(db, `users/${userId}/entries`, entry.id), {
          ...entry,
          userId,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${userId}/entries/${entry.id}`);
      }
    }
  },

  async deleteEntry(id: string, userId?: string) {
    const entries = this.getEntries().filter(e => e.id !== id);
    localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
    window.dispatchEvent(new Event("entriesChanged"));

    if (userId) {
      try {
        await deleteDoc(doc(db, `users/${userId}/entries`, id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${userId}/entries/${id}`);
      }
    }
  },

  async syncEntriesFromFirestore(userId: string) {
    try {
      const q = query(collection(db, `users/${userId}/entries`));
      const snapshot = await getDocs(q);
      const firestoreEntries = snapshot.docs.map(doc => doc.data() as OvertimeEntry);
      
      if (firestoreEntries.length > 0) {
        // Merge with local entries, preferring firestore for now
        // In a real app, you'd use timestamps to decide
        localStorage.setItem(KEYS.ENTRIES, JSON.stringify(firestoreEntries));
        window.dispatchEvent(new Event("entriesChanged"));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `users/${userId}/entries`);
    }
  },

  getHistory(): HistoryEntry[] {
    const data = localStorage.getItem(KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  },

  saveHistory(history: HistoryEntry[]) {
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
    window.dispatchEvent(new Event("historyChanged"));
  },

  closeCalculation(totalHours: number, totalEarnings: number, userId?: string): HistoryEntry | null {
    const entries = this.getEntries();
    if (entries.length === 0) return null;

    const sortedEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const startDate = sortedEntries[0].date;
    const endDate = sortedEntries[sortedEntries.length - 1].date;

    const historyEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      startDate,
      endDate,
      totalHours,
      totalEarnings,
      entries,
      closedAt: new Date().toISOString(),
    };

    const history = this.getHistory();
    history.unshift(historyEntry); // Add to beginning
    this.saveHistory(history);

    // Clear current entries
    this.saveEntries([], userId);
    
    // If userId, we should also clear firestore entries (or move them to history)
    // For now, we'll just clear local.
    
    return historyEntry;
  },

  clearAllData() {
    localStorage.clear();
    window.location.reload();
  },

  exportData() {
    const data = {
      settings: this.getSettings(),
      profile: this.getProfile(),
      entries: this.getEntries(),
      history: this.getHistory(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `overtime_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async importData(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.settings) localStorage.setItem(KEYS.SETTINGS, JSON.stringify(data.settings));
      if (data.profile) localStorage.setItem(KEYS.PROFILE, JSON.stringify(data.profile));
      if (data.entries) localStorage.setItem(KEYS.ENTRIES, JSON.stringify(data.entries));
      if (data.history) localStorage.setItem(KEYS.HISTORY, JSON.stringify(data.history));
      
      window.location.reload();
      return true;
    } catch (error) {
      console.error("Import failed:", error);
      return false;
    }
  }
};
