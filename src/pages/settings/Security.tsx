import { useState } from "react";
import { motion } from "motion/react";
import { useStrings } from "../../hooks/useStrings";
import { StorageService } from "../../services/storage";
import { AppSettings } from "../../types/app";
import { cn } from "../../lib/utils";
import { ShieldCheck } from "lucide-react";

export default function SecuritySettings() {
  const STRINGS = useStrings();
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
      <header>
        <h1 className="text-2xl font-bold text-on-surface">{STRINGS.settings.security}</h1>
      </header>

      <div className="bg-surface-variant/30 rounded-3xl border border-outline/10 p-6 space-y-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-6 bg-primary/10 rounded-full">
            <ShieldCheck className="w-12 h-12 text-primary" />
          </div>
        </div>
        
        <h2 className="text-lg font-bold text-on-surface">App Lock</h2>
        <p className="text-sm text-on-surface-variant opacity-70">
          Secure your overtime data using your device's biometric authentication (Fingerprint or Face ID).
        </p>

        <div className="space-y-6 pt-6 border-t border-outline/10">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="font-medium text-on-surface">{STRINGS.settings.appLock}</p>
              <p className="text-xs text-on-surface-variant opacity-60">Use device fingerprint, face, or passcode</p>
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
