import { useState } from "react";
import { motion } from "motion/react";
import { useStrings } from "../../hooks/useStrings";
import { StorageService } from "../../services/storage";
import { AppSettings, DateFormat, WeekStart } from "../../types/app";
import { cn } from "../../lib/utils";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TimeFormatSettings() {
  const STRINGS = useStrings();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());

  const updateSettings = (updates: Partial<AppSettings['timeFormat']>) => {
    const newSettings = {
      ...settings,
      timeFormat: { ...settings.timeFormat, ...updates }
    };
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
  };

  const dateFormats: DateFormat[] = ["DD/MM/YYYY", "MM/DD/YYYY"];
  const weekStarts: WeekStart[] = ["Sunday", "Monday"];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <header className="flex items-center space-x-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant hover:text-primary transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-on-surface">{STRINGS.settings.timeFormat}</h1>
      </header>

      <div className="bg-surface-variant/30 rounded-3xl border border-outline/10 p-6 space-y-8">
        <div className="flex items-center justify-between">
          <p className="font-medium text-on-surface">{STRINGS.settings.use24h}</p>
          <button
            onClick={() => updateSettings({ use24h: !settings.timeFormat.use24h })}
            className={cn(
              "w-12 h-6 rounded-full transition-colors relative",
              settings.timeFormat.use24h ? "bg-primary" : "bg-outline/30"
            )}
          >
            <div className={cn(
              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
              settings.timeFormat.use24h ? "right-1" : "left-1"
            )} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-on-surface-variant ml-1">
            {STRINGS.settings.dateFormat}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {dateFormats.map((format) => (
              <button
                key={format}
                onClick={() => updateSettings({ dateFormat: format })}
                className={`py-3 rounded-xl border text-sm font-medium transition-all ${
                  settings.timeFormat.dateFormat === format
                    ? "bg-primary text-on-primary border-primary"
                    : "bg-surface text-on-surface border-outline/30"
                }`}
              >
                {format}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-on-surface-variant ml-1">
            {STRINGS.settings.weekStart}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {weekStarts.map((day) => (
              <button
                key={day}
                onClick={() => updateSettings({ weekStart: day })}
                className={`py-3 rounded-xl border text-sm font-medium transition-all ${
                  settings.timeFormat.weekStart === day
                    ? "bg-primary text-on-primary border-primary"
                    : "bg-surface text-on-surface border-outline/30"
                }`}
              >
                {day === "Sunday" ? STRINGS.common.sunday : STRINGS.common.monday}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
