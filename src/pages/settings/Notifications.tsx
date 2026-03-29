import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Bell } from "lucide-react";
import { useStrings } from "../../hooks/useStrings";
import { StorageService } from "../../services/storage";
import { NotificationService } from "../../services/notification";
import { AppSettings } from "../../types/app";
import { cn } from "../../lib/utils";

export default function NotificationSettings() {
  const STRINGS = useStrings();
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const isSupported = NotificationService.isSupported();

  useEffect(() => {
    if (!isSupported) {
      setPermissionGranted(false);
      return;
    }
    const checkPermissions = async () => {
      const granted = await NotificationService.requestPermissions();
      setPermissionGranted(granted);
    };
    checkPermissions();
  }, [isSupported]);

  const updateSettings = async (updates: Partial<AppSettings['notifications']>) => {
    if (!isSupported) return;

    const newSettings = {
      ...settings,
      notifications: { ...settings.notifications, ...updates }
    };
    
    if (updates.enabled && !permissionGranted) {
      const granted = await NotificationService.requestPermissions();
      setPermissionGranted(granted);
      if (!granted) return;
    }

    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
    
    // Schedule or cancel notification
    await NotificationService.scheduleReminder(newSettings.notifications, STRINGS);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <header>
        <h1 className="text-2xl font-bold text-on-surface">{STRINGS.settings.notifications}</h1>
      </header>

      {!isSupported && (
        <div className="bg-error/10 border border-error/20 rounded-2xl p-4 flex items-start space-x-3">
          <div className="p-2 bg-error/20 rounded-xl">
            <Bell className="w-5 h-5 text-error" />
          </div>
          <p className="text-sm text-error font-medium pt-1">
            {STRINGS.notifications.notSupported}
          </p>
        </div>
      )}

      <div className={cn(
        "bg-surface-variant/30 rounded-3xl border border-outline/10 p-6 space-y-6",
        !isSupported && "opacity-50 pointer-events-none"
      )}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-on-surface">{STRINGS.settings.reminderEnabled}</p>
            <p className="text-xs text-on-surface-variant opacity-60">{STRINGS.notifications.reminderDescription}</p>
          </div>
          <button
            onClick={() => updateSettings({ enabled: !settings.notifications.enabled })}
            className={cn(
              "w-12 h-6 rounded-full transition-colors relative",
              settings.notifications.enabled ? "bg-primary" : "bg-outline/30"
            )}
          >
            <div className={cn(
              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
              settings.notifications.enabled ? (STRINGS.common.arabic === "العربية (Arabic)" ? "left-1" : "right-1") : (STRINGS.common.arabic === "العربية (Arabic)" ? "right-1" : "left-1")
            )} />
          </button>
        </div>

        {settings.notifications.enabled && (
          <div className="space-y-2 pt-4 border-t border-outline/10">
            <label className="text-sm font-medium text-on-surface-variant ml-1">
              {STRINGS.settings.reminderTime}
            </label>
            <input
              type="time"
              value={settings.notifications.time}
              onChange={(e) => updateSettings({ time: e.target.value })}
              className="w-full bg-surface border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
