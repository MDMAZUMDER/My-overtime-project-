import { useState } from "react";
import { motion } from "motion/react";
import { useStrings } from "../../hooks/useStrings";
import { StorageService } from "../../services/storage";
import { AppSettings, Theme } from "../../types/app";
import { Sun, Moon, Monitor, Check, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AppearanceSettings() {
  const STRINGS = useStrings();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());

  const handleSelect = (theme: Theme) => {
    const newSettings = { ...settings, appearance: { theme } };
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
  };

  const themes: { id: Theme; label: string; icon: typeof Sun }[] = [
    { id: "light", label: STRINGS.settings.light, icon: Sun },
    { id: "dark", label: STRINGS.settings.dark, icon: Moon },
    { id: "system", label: STRINGS.settings.system, icon: Monitor },
  ];

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
        <h1 className="text-2xl font-bold text-on-surface">{STRINGS.settings.appearance}</h1>
      </header>

      <div className="bg-surface-variant/30 rounded-3xl border border-outline/10 overflow-hidden">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => handleSelect(t.id)}
            className="w-full flex items-center justify-between p-5 hover:bg-primary/5 transition-colors border-b border-outline/5 last:border-0"
          >
            <div className="flex items-center space-x-4">
              <div className={`p-2 rounded-xl ${settings.appearance.theme === t.id ? 'bg-primary/10' : 'bg-outline/5'}`}>
                <t.icon className={`w-5 h-5 ${settings.appearance.theme === t.id ? 'text-primary' : 'text-outline'}`} />
              </div>
              <span className="font-medium text-on-surface">{t.label}</span>
            </div>
            {settings.appearance.theme === t.id && (
              <Check className="w-5 h-5 text-primary" />
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
