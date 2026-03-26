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

  const currencies: Currency[] = ["SAR", "BDT", "USD"];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6 pb-10"
    >
      <header>
        <h1 className="text-2xl font-bold text-on-surface">{STRINGS.settings.overtimeRate}</h1>
        <p className="text-sm text-on-surface-variant opacity-70">Configure how your overtime pay is calculated</p>
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
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Current Active Rate</p>
              <p className={`text-lg font-bold ${activeRate > 0 ? "text-primary" : "text-red-500"}`}>
                {settings.overtime.currency} {activeRate.toFixed(2)} / hour
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface-variant ml-1">
              Basic Salary (Monthly)
            </label>
            <input
              type="number"
              value={settings.overtime.basicSalary || ""}
              onChange={(e) => updateSettings({ basicSalary: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
              className="w-full bg-surface border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface-variant ml-1">
                Working Days
              </label>
              <input
                type="number"
                value={settings.overtime.workingDaysPerMonth || ""}
                onChange={(e) => updateSettings({ workingDaysPerMonth: parseInt(e.target.value) || 0 })}
                placeholder="26"
                className="w-full bg-surface border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface-variant ml-1">
                Hours per Day
              </label>
              <input
                type="number"
                value={settings.overtime.workingHoursPerDay || ""}
                onChange={(e) => updateSettings({ workingHoursPerDay: parseInt(e.target.value) || 0 })}
                placeholder="8"
                className="w-full bg-surface border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
          </div>
        </div>

        <div className="h-px bg-outline/10" />

        <div className="space-y-4">
          <div className="flex items-center justify-between p-2 bg-surface/50 rounded-2xl border border-outline/5">
            <div className="flex items-center space-x-2 ml-2">
              <span className="text-sm font-medium text-on-surface">Use Manual Hourly Rate</span>
              <div className="group relative">
                <Info className="w-3.5 h-3.5 text-on-surface-variant opacity-40 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-surface border border-outline rounded-lg text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                  Enable this to ignore salary calculation and set your own rate.
                </div>
              </div>
            </div>
            <button
              onClick={() => updateSettings({ useManualHourlyRate: !settings.overtime.useManualHourlyRate })}
              className={`w-12 h-6 rounded-full transition-all relative ${
                settings.overtime.useManualHourlyRate ? "bg-primary" : "bg-outline/30"
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                settings.overtime.useManualHourlyRate ? "left-7" : "left-1"
              }`} />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface-variant ml-1">
              {settings.overtime.useManualHourlyRate ? "Manual Hourly Rate (Editable)" : "Calculated Hourly Rate (Read-only)"}
            </label>
            <input
              type="number"
              disabled={!settings.overtime.useManualHourlyRate}
              value={
                settings.overtime.useManualHourlyRate 
                  ? settings.overtime.hourlyRate 
                  : (settings.overtime.basicSalary / (settings.overtime.workingDaysPerMonth * settings.overtime.workingHoursPerDay) || 0).toFixed(2)
              }
              onChange={(e) => updateSettings({ hourlyRate: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
              className={`w-full bg-surface border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                !settings.overtime.useManualHourlyRate ? "opacity-60 cursor-not-allowed bg-surface-variant/10" : "bg-primary/5 border-primary/30"
              }`}
            />
            {!settings.overtime.useManualHourlyRate && (
              <p className="text-[10px] text-on-surface-variant opacity-60 ml-1">
                * This rate is automatically calculated from your Basic Salary.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-on-surface-variant ml-1">
            {STRINGS.settings.currency}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {currencies.map((curr) => (
              <button
                key={curr}
                onClick={() => updateSettings({ currency: curr })}
                className={`py-3 rounded-xl border font-medium transition-all ${
                  settings.overtime.currency === curr
                    ? "bg-primary text-on-primary border-primary"
                    : "bg-surface text-on-surface border-outline/30"
                }`}
              >
                {curr}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
