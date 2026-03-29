import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { useStrings } from "../../hooks/useStrings";
import { StorageService } from "../../services/storage";
import { AppSettings, Currency } from "../../types/app";
import { Info, CheckCircle2, AlertCircle } from "lucide-react";
import { calculateHourlyRate } from "../../lib/calculations";

export default function OvertimeSettings() {
  const STRINGS = useStrings();
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());

  const activeRate = useMemo(() => calculateHourlyRate(settings), [settings]);

  const updateSettings = (updates: Partial<AppSettings['overtime']>) => {
    const newSettings = {
      ...settings,
      overtime: { ...settings.overtime, ...updates }
    };
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
  };

  const currencies: Currency[] = ["SAR"];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6 pb-10"
    >
      <header>
        <h1 className="text-2xl font-bold text-on-surface">{STRINGS.settings.overtimeRate}</h1>
        <p className="text-sm text-on-surface-variant opacity-70">{STRINGS.settings.overtimeRateDescription}</p>
      </header>

      <div className="bg-surface-variant/30 rounded-3xl border border-outline/10 p-6 space-y-6">
        {/* Active Rate Summary */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          activeRate > 0 ? "bg-primary/5 border-primary/20" : "bg-red-500/5 border-red-500/20"
        }`}>
          <div className="flex items-center space-x-3">
            {activeRate > 0 ? (
              <CheckCircle2 className="w-5 h-5 text-primary" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">{STRINGS.settings.currentActiveRate}</p>
              <p className={`text-lg font-bold ${activeRate > 0 ? "text-primary" : "text-red-500"}`}>
                {settings.overtime.currency} {activeRate.toFixed(2)} / {STRINGS.common.hour}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface-variant ml-1">
              {STRINGS.settings.basicSalary}
            </label>
            <input
              type="number"
              value={settings.overtime.basicSalary || ""}
              onChange={(e) => updateSettings({ basicSalary: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
              className="w-full bg-surface border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
        </div>

        <div className="h-px bg-outline/10" />

        {/* Currency is now fixed to SAR */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-on-surface-variant ml-1">
            {STRINGS.settings.currency}
          </label>
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-center font-bold text-primary">
            SAR (Saudi Riyal)
          </div>
        </div>
      </div>
    </motion.div>
  );
}
