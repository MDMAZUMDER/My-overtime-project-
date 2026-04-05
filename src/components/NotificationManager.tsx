import { useState, useEffect } from "react";
import { Bell, X, Clock } from "lucide-react";
import { StorageService } from "../services/storage";
import { useNavigate } from "react-router-dom";
import { useStrings } from "../hooks/useStrings";

export default function NotificationManager() {
  const navigate = useNavigate();
  const STRINGS = useStrings();
  const [showNotification, setShowNotification] = useState(false);
  const settings = StorageService.getSettings();

  useEffect(() => {
    if (!settings.notifications.enabled) return;

    const checkNotification = () => {
      const now = new Date();
      const [hours, minutes] = settings.notifications.time.split(":").map(Number);
      
      // Check if current time matches scheduled time
      if (now.getHours() === hours && now.getMinutes() === minutes) {
        // Check if user already added an entry today
        const today = now.toISOString().split('T')[0];
        const entries = StorageService.getEntries();
        const addedToday = entries.some(e => e.date === today);

        if (!addedToday) {
          setShowNotification(true);
        }
      }
    };

    const interval = setInterval(checkNotification, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [settings.notifications]);

  if (!showNotification) return null;

  return (
    <div
      className="fixed top-4 left-4 right-4 z-[200] bg-surface shadow-2xl rounded-3xl border border-outline/10 p-4 flex items-center space-x-4 max-w-lg mx-auto"
    >
      <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
        <Bell className="w-6 h-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-on-surface">{STRINGS.notifications.reminderTitle}</h4>
        <p className="text-xs text-on-surface-variant opacity-70 truncate">{STRINGS.notifications.reminderMessage}</p>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={() => {
            setShowNotification(false);
            navigate("/add");
          }}
          className="px-4 py-2 bg-primary text-on-primary text-xs font-bold rounded-xl shadow-sm active:scale-95 transition-all"
        >
          {STRINGS.notifications.addNow}
        </button>
        <button
          onClick={() => setShowNotification(false)}
          className="p-2 text-on-surface-variant hover:bg-surface-variant rounded-xl transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
