import { AppSettings, DEFAULT_SETTINGS, UserProfile, OvertimeEntry } from "../types/app";

const KEYS = {
  SETTINGS: "ot_tracker_settings",
  PROFILE: "ot_tracker_profile",
  ENTRIES: "ot_tracker_entries",
};

export const StorageService = {
  getSettings(): AppSettings {
    const data = localStorage.getItem(KEYS.SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
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

  saveProfile(profile: UserProfile) {
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
    window.dispatchEvent(new Event("profileChanged"));
  },

  getEntries(): OvertimeEntry[] {
    const data = localStorage.getItem(KEYS.ENTRIES);
    return data ? JSON.parse(data) : [];
  },

  saveEntry(entry: OvertimeEntry) {
    const entries = this.getEntries();
    const index = entries.findIndex(e => e.id === entry.id);
    if (index > -1) {
      entries[index] = entry;
    } else {
      entries.push(entry);
    }
    localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
    window.dispatchEvent(new Event("entriesChanged"));
  },

  deleteEntry(id: string) {
    const entries = this.getEntries().filter(e => e.id !== id);
    localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
    window.dispatchEvent(new Event("entriesChanged"));
  },

  clearAllData() {
    localStorage.clear();
    window.location.reload();
  },

  exportData() {
    const data = {
      settings: this.getSettings(),
      profile: this.getProfile(),
      entries: JSON.parse(localStorage.getItem(KEYS.ENTRIES) || "[]"),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `overtime_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};
