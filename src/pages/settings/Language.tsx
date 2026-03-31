import { useState } from "react";
import { motion } from "motion/react";
import { useStrings } from "../../hooks/useStrings";
import { StorageService } from "../../services/storage";
import { AppSettings, Language } from "../../types/app";
import { Check, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LanguageSettings() {
  const STRINGS = useStrings();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());

  const languages: { id: Language; label: string }[] = [
    { id: "en", label: STRINGS.common.english },
    { id: "bn", label: STRINGS.common.bengali },
    { id: "ar", label: STRINGS.common.arabic },
  ];

  const handleSelect = (lang: Language) => {
    const newSettings = { ...settings, language: lang };
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
    </motion.div>
  );
}
