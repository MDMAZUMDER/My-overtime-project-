import { Outlet, useNavigate, useLocation } from "react-router-dom";
import BottomNav from "./BottomNav";
import { useEffect, useState } from "react";
import { StorageService } from "../services/storage";
import SplashScreen from "./SplashScreen";
import SecurityLock from "./SecurityLock";
import NotificationManager from "./NotificationManager";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const settings = StorageService.getSettings();
  const [theme, setTheme] = useState(settings.appearance.theme);
  const [hasUnlocked, setHasUnlocked] = useState(false);
  const [isLocked, setIsLocked] = useState(settings.security.enabled);
  const [showSplash, setShowSplash] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Handle security lock when returning from background
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        const currentSettings = StorageService.getSettings();
        if (currentSettings.security.enabled) {
          setIsLocked(true);
          setHasUnlocked(false);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const applyTheme = (currentTheme: string) => {
      let themeToApply = currentTheme;
      if (currentTheme === "system") {
        themeToApply = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }

      if (themeToApply === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    applyTheme(theme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, [theme]);

  useEffect(() => {
    const handleSettingsChange = () => {
      const newSettings = StorageService.getSettings();
      setTheme(newSettings.appearance.theme);
      
      // If security is disabled, always unlock
      if (!newSettings.security.enabled) {
        setIsLocked(false);
        setHasUnlocked(false);
      } else if (!hasUnlocked) {
        // Only lock if we haven't unlocked in this session
        setIsLocked(true);
      }
    };

    window.addEventListener("settingsChanged", handleSettingsChange);
    
    return () => {
      window.removeEventListener("settingsChanged", handleSettingsChange);
    };
  }, [hasUnlocked]);

  const handleUnlock = () => {
    setHasUnlocked(true);
    setIsLocked(false);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-lg mx-auto shadow-xl relative overflow-hidden transition-colors duration-300">
      {showSplash && <SplashScreen />}
      {isLocked && !showSplash && (
        <SecurityLock onUnlock={handleUnlock} />
      )}

      {!showSplash && !isLocked && (
        <>
          <NotificationManager />
          <main className="flex-1 overflow-y-auto pb-20 px-4 pt-6">
            <Outlet />
          </main>
          <BottomNav />
        </>
      )}
      
      {isLoading && (
        <div className="fixed inset-0 z-[300] bg-black/20 backdrop-blur-[2px] flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
