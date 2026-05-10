import React from "react";
import { useStrings } from "../hooks/useStrings";
import { StorageService } from "../services/storage";
import { Language } from "../types/app";
import { Globe, Check } from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface LanguageSelectorProps {
  onSelect: () => void;
  key?: string;
}

export default function LanguageSelector({ onSelect }: LanguageSelectorProps) {
  const settings = StorageService.getSettings();
  const languages: { id: Language; label: string; sub: string }[] = [
    { id: "bn", label: "বাংলা", sub: "Bengali" },
    { id: "en", label: "English", sub: "English" },
    { id: "ar", label: "العربية", sub: "Arabic" },
    { id: "ur", label: "اردو", sub: "Urdu" },
  ];

  const handleSelect = (lang: Language) => {
    const newSettings = {
      ...settings,
      language: lang,
      hasSetLanguage: true,
    };
    StorageService.saveSettings(newSettings);
    onSelect();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-surface flex flex-col p-8"
    >
      <div className="flex-1 flex flex-col items-center justify-center space-y-12">
        <div className="space-y-4 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-[32px] flex items-center justify-center mx-auto mb-6">
            <Globe className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight">
            Choose Language
          </h1>
          <p className="text-on-surface-variant opacity-60 font-medium">
            Select your preferred language to continue
          </p>
        </div>

        <div className="w-full max-w-sm grid grid-cols-1 gap-3">
          {languages.map((lang) => (
            <button
              key={lang.id}
              onClick={() => handleSelect(lang.id)}
              className={cn(
                "group relative w-full flex items-center justify-between p-5 rounded-3xl border-2 transition-all duration-300 active:scale-[0.98]",
                settings.language === lang.id
                  ? "bg-primary border-primary shadow-xl shadow-primary/20 scale-[1.02]"
                  : "bg-surface-variant/30 border-outline/10 hover:border-primary/30"
              )}
            >
              <div className="flex flex-col items-start">
                <span className={cn(
                  "text-lg font-bold",
                  settings.language === lang.id ? "text-on-primary" : "text-on-surface"
                )}>
                  {lang.label}
                </span>
                <span className={cn(
                  "text-xs font-medium opacity-60",
                  settings.language === lang.id ? "text-on-primary/70" : "text-on-surface-variant"
                )}>
                  {lang.sub}
                </span>
              </div>
              
              {settings.language === lang.id && (
                <div className="bg-white/20 p-1.5 rounded-full">
                  <Check className="w-5 h-5 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
      
      <p className="text-center text-[10px] text-on-surface-variant opacity-30 font-bold uppercase tracking-[0.2em] pb-4">
        Overtime App • Language Setup
      </p>
    </motion.div>
  );
}
