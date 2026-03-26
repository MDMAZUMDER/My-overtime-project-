import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";
import { useEffect, useState } from "react";
import { StorageService } from "../services/storage";
import { AnimatePresence, motion } from "motion/react";
import SplashScreen from "./SplashScreen";
import SecurityLock from "./SecurityLock";
import NotificationManager from "./NotificationManager";

export default function Layout() {
  const settings = StorageService.getSettings();
  const [theme, setTheme] = useState(settings.appearance.theme);
  const [hasUnlocked, setHasUnlocked] = useState(false);
  const [isLocked, setIsLocked] = useState(settings.security.enabled);
  const [showSplash, setShowSplash] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

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

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        const currentSettings = StorageService.getSettings();
        if (currentSettings.security.enabled) {
          setIsLocked(true);
          setHasUnlocked(false);
        }
      }
    };

    window.addEventListener("settingsChanged", handleSettingsChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      window.removeEventListener("settingsChanged", handleSettingsChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasUnlocked]);

  const handleUnlock = () => {
    setHasUnlocked(true);
    setIsLocked(false);
  };

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-lg mx-auto shadow-xl relative overflow-hidden transition-colors duration-300">
      <AnimatePresence>
        {showSplash && <SplashScreen />}
        {isLocked && !showSplash && (
          <SecurityLock onUnlock={handleUnlock} />
        )}
      </AnimatePresence>

      {!showSplash && !isLocked && (
        <>
          <NotificationManager />
          <main className="flex-1 overflow-y-auto pb-20 px-4 pt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={window.location.pathname}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
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
