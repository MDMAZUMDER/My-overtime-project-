import { useState } from "react";
import { motion } from "motion/react";
import { useStrings } from "../../hooks/useStrings";
import { StorageService } from "../../services/storage";
import { AppSettings } from "../../types/app";
import { cn } from "../../lib/utils";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SecuritySettings() {
  const STRINGS = useStrings();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());

  const updateSettings = (updates: Partial<AppSettings['security']>) => {
    const newSettings = {
      ...settings,
      security: { ...settings.security, ...updates }
    };
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
  };

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
        <h1 className="text-2xl font-bold text-on-surface">{STRINGS.settings.security}</h1>
      </header>

      <div className="bg-surface-variant/30 rounded-3xl border border-outline/10 p-6 space-y-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-6 bg-primary/10 rounded-full">
            <ShieldCheck className="w-12 h-12 text-primary" />
          </div>
        </div>
        
        <h2 className="text-lg font-bold text-on-surface">{STRINGS.security.appLock}</h2>
        <p className="text-sm text-on-surface-variant opacity-70">
          {STRINGS.security.appLockDescription}
        </p>

        <div className="space-y-6 pt-6 border-t border-outline/10">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="font-medium text-on-surface">{STRINGS.settings.appLock}</p>
              <p className="text-xs text-on-surface-variant opacity-60">{STRINGS.security.biometricDescription}</p>
            </div>
            <button
              onClick={() => updateSettings({ enabled: !settings.security.enabled })}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                settings.security.enabled ? "bg-primary" : "bg-outline/30"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                settings.security.enabled ? "right-1" : "left-1"
              )} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
