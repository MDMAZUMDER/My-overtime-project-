import { useState, useMemo, useEffect } from "react";
import { useStrings } from "../../hooks/useStrings";
import { StorageService } from "../../services/storage";
import { AppSettings, Language } from "../../types/app";
import { Check, ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LanguageSettings() {
  const STRINGS = useStrings();
  const navigate = useNavigate();
  const initialSettings = useMemo(() => StorageService.getSettings(), []);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setHasChanges(settings.language !== initialSettings.language);
  }, [settings.language, initialSettings.language]);

  const languages: { id: Language; label: string }[] = [
    { id: "en", label: STRINGS.common.english },
    { id: "bn", label: STRINGS.common.bengali },
    { id: "ar", label: STRINGS.common.arabic },
    { id: "ur", label: STRINGS.common.urdu },
  ];

  const handleSelect = (lang: Language) => {
    setSettings({ ...settings, language: lang });
  };

  const handleSave = () => {
    StorageService.saveSettings(settings);
    setHasChanges(false);
    navigate(-1);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant hover:text-primary transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-on-surface">{STRINGS.settings.language}</h1>
      </header>

      <div className="bg-surface-variant/30 rounded-3xl border border-outline/10 overflow-hidden">
        {languages.map((lang) => (
          <button
            key={lang.id}
            onClick={() => handleSelect(lang.id)}
            className="w-full flex items-center justify-between p-5 hover:bg-primary/5 transition-colors border-b border-outline/5 last:border-0"
          >
            <span className="font-medium text-on-surface">{lang.label}</span>
            {settings.language === lang.id && (
              <Check className="w-5 h-5 text-primary" />
            )}
          </button>
        ))}
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
