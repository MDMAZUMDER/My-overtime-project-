import { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { STRINGS_DATA } from '../constants/strings';
import { Language } from '../types/app';

export function useStrings() {
  const [language, setLanguage] = useState<Language>(StorageService.getSettings().language);

  useEffect(() => {
    const handleSettingsChange = () => {
      setLanguage(StorageService.getSettings().language);
    };

    window.addEventListener('settingsChanged', handleSettingsChange);
    return () => window.removeEventListener('settingsChanged', handleSettingsChange);
  }, []);

  return STRINGS_DATA[language] || STRINGS_DATA.en;
}
