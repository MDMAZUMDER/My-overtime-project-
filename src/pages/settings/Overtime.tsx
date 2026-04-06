import { useState, useMemo, useEffect, useRef } from "react";
import { useStrings } from "../../hooks/useStrings";
import { StorageService } from "../../services/storage";
import { AppSettings, Currency } from "../../types/app";
import { Info, CheckCircle2, AlertCircle, ArrowLeft, Save } from "lucide-react";
import { calculateHourlyRate } from "../../lib/calculations";
import { useNavigate } from "react-router-dom";
import { ValidationTooltip } from "../../components/ui/ValidationTooltip";

export default function OvertimeSettings() {
  const STRINGS = useStrings();
  const navigate = useNavigate();
  const initialSettings = useMemo(() => StorageService.getSettings(), []);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [activeRate, setActiveRate] = useState(calculateHourlyRate(settings));
  const [hasChanges, setHasChanges] = useState(false);
  const [showValidation, setShowValidation] = useState<{ field: string | null, message: string | null }>({ field: null, message: null });
  const validationTimer = useRef<NodeJS.Timeout | null>(null);

  const triggerValidation = (field: string, message: string) => {
    setShowValidation({ field, message });
    if (validationTimer.current) clearTimeout(validationTimer.current);
    validationTimer.current = setTimeout(() => setShowValidation({ field: null, message: null }), 3000);
  };

  useEffect(() => {
    const isChanged = JSON.stringify(settings.overtime) !== JSON.stringify(initialSettings.overtime);
    setHasChanges(isChanged);
    setActiveRate(calculateHourlyRate(settings));
  }, [settings, initialSettings]);

  const updateSettings = (updates: Partial<AppSettings['overtime']>) => {
    const newSettings = {
      ...settings,
      overtime: { ...settings.overtime, ...updates }
    };
    setSettings(newSettings);
  };

  const handleSave = () => {
    StorageService.saveSettings(settings);
    setHasChanges(false);
    navigate(-1);
  };

  const currencies: Currency[] = ["SAR"];

  return (
    <div className="space-y-6 pb-10">
      <header className="flex items-center space-x-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant hover:text-primary transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-on-surface">{STRINGS.settings.overtimeRate}</h1>
          <p className="text-sm text-on-surface-variant opacity-70">{STRINGS.settings.overtimeRateDescription}</p>
        </div>
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
          <div className="space-y-2 relative">
            <label className="text-sm font-medium text-on-surface-variant ml-1">
              {STRINGS.settings.basicSalary}
            </label>
            <input
              type="number"
              required
              onInvalid={(e) => {
                e.preventDefault();
                triggerValidation('basicSalary', STRINGS.common.requiredField);
              }}
              onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
              value={settings.overtime.basicSalary || ""}
              onChange={(e) => updateSettings({ basicSalary: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
              className="w-full bg-surface border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
            <ValidationTooltip 
              isVisible={showValidation.field === 'basicSalary'} 
              message={showValidation.message} 
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
