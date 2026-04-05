import { useState, useEffect, useMemo } from "react";
import { Bell, ArrowLeft, Save } from "lucide-react";
import { useStrings } from "../../hooks/useStrings";
import { StorageService } from "../../services/storage";
import { NotificationService } from "../../services/notification";
import { AppSettings } from "../../types/app";
import { cn } from "../../lib/utils";
import { useNavigate } from "react-router-dom";

export default function NotificationSettings() {
  const STRINGS = useStrings();
  const navigate = useNavigate();
  const initialSettings = useMemo(() => StorageService.getSettings(), []);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [localMessage, setLocalMessage] = useState(settings.notifications.reminderMessage || "");
  const [hasChanges, setHasChanges] = useState(false);

  const isSupported = NotificationService.isSupported();

  useEffect(() => {
    const isChanged = 
      JSON.stringify(settings.notifications) !== JSON.stringify(initialSettings.notifications) ||
      localMessage !== initialSettings.notifications.reminderMessage;
    setHasChanges(isChanged);
  }, [settings.notifications, localMessage, initialSettings.notifications]);

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

  // Debounce notification scheduling for the custom message - only update local state
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localMessage !== settings.notifications.reminderMessage) {
        setSettings(prev => ({
          ...prev,
          notifications: { ...prev.notifications, reminderMessage: localMessage }
        }));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localMessage, settings.notifications.reminderMessage]);

  const updateSettings = async (updates: Partial<AppSettings['notifications']>) => {
    const newSettings = {
      ...settings,
      notifications: { ...settings.notifications, ...updates }
    };
    
    if (updates.enabled && !permissionGranted && isSupported) {
      const granted = await NotificationService.requestPermissions();
      setPermissionGranted(granted);
      if (!granted) return;
    }

    setSettings(newSettings);
  };

  const handleSave = async () => {
    StorageService.saveSettings(settings);
    if (isSupported) {
      await NotificationService.scheduleReminder(settings.notifications, STRINGS);
    }
    setHasChanges(false);
    navigate(-1);
  };

  return (
    <div className="space-y-6 pb-10">
      <header className="flex items-center space-x-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant hover:text-primary transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-on-surface">{STRINGS.settings.notifications}</h1>
      </header>

      {!isSupported && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start space-x-3">
          <div className="p-2 bg-amber-500/20 rounded-xl">
            <Bell className="w-5 h-5 text-amber-500" />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-amber-600 font-bold">
              {STRINGS.notifications.notSupported}
            </p>
            <p className="text-[10px] text-amber-600/70 leading-tight">
              You can still configure your message here. It will work on devices that support notifications.
            </p>
          </div>
        </div>
      )}

      <div className={cn(
        "bg-surface-variant/30 rounded-[2.5rem] border border-outline/10 p-8 space-y-8",
        !isSupported && "opacity-80"
      )}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="font-bold text-on-surface text-lg">{STRINGS.settings.reminderEnabled}</p>
            <p className="text-xs text-on-surface-variant opacity-60 leading-relaxed">{STRINGS.notifications.reminderDescription}</p>
          </div>
          <button
            onClick={() => updateSettings({ enabled: !settings.notifications.enabled })}
            className={cn(
              "w-14 h-7 rounded-full transition-all duration-300 relative p-1",
              settings.notifications.enabled ? "bg-primary shadow-lg shadow-primary/20" : "bg-outline/20"
            )}
          >
            <div className={cn(
              "w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-sm",
              settings.notifications.enabled 
                ? (STRINGS.common.arabic === "العربية (Arabic)" ? "translate-x-0" : "translate-x-7") 
                : (STRINGS.common.arabic === "العربية (Arabic)" ? "translate-x-7" : "translate-x-0")
            )} />
          </button>
        </div>

        {settings.notifications.enabled && (
          <div className="space-y-8 pt-6 border-t border-outline/10">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] ml-1">
                {STRINGS.settings.reminderTime}
              </label>
              <div className="relative group">
                <input
                  type="time"
                  value={settings.notifications.time}
                  onChange={(e) => updateSettings({ time: e.target.value })}
                  className="w-full bg-surface/50 border border-outline/20 rounded-2xl px-6 py-5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-on-surface text-xl"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] ml-1">
                {STRINGS.settings.reminderCustomMessage}
              </label>
              <div className="relative">
                <textarea
                  value={localMessage}
                  onChange={(e) => setLocalMessage(e.target.value)}
                  placeholder={STRINGS.settings.reminderCustomMessagePlaceholder}
                  rows={3}
                  maxLength={100}
                  className="w-full bg-surface/50 border-2 border-outline/20 rounded-[2rem] px-8 py-7 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none text-2xl text-on-surface leading-tight font-black placeholder:font-medium placeholder:opacity-20"
                />
                <div className="absolute bottom-6 right-8 text-[12px] text-outline/40 font-black bg-surface/90 px-3 py-1.5 rounded-xl backdrop-blur-md border border-outline/10">
                  {localMessage.length} / 100
                </div>
              </div>
              <div className="flex items-start space-x-3 px-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0" />
                <p className="text-[11px] text-on-surface-variant opacity-60 leading-relaxed font-medium italic">
                  Your custom message will be displayed as the main heading of your daily reminder.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {hasChanges && (
        <div className="fixed bottom-[80px] left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-40">
          <button
            onClick={handleSave}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/30 flex items-center justify-center space-x-2 active:scale-95 transition-all"
          >
            <Save className="w-5 h-5" />
            <span>{STRINGS.common.save || "Save Changes"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
