import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Lock, Fingerprint, ShieldAlert } from "lucide-react";
import { NativeBiometric } from "capacitor-native-biometric";
import { useStrings } from "../hooks/useStrings";
import { Capacitor } from "@capacitor/core";

export default function SecurityLock({ onUnlock }: { onUnlock: () => void }) {
  const STRINGS = useStrings();
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const authenticate = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    setError(null);

    try {
      if (Capacitor.isNativePlatform()) {
        const result = await NativeBiometric.isAvailable();
        
        if (result.isAvailable) {
          await NativeBiometric.verifyIdentity({
            reason: STRINGS.security.lockedMessageBiometric,
            title: STRINGS.security.lockedTitle,
            subtitle: STRINGS.security.lockedMessageBiometric,
            description: "Please authenticate to continue",
            useFallback: true, // This allows falling back to device passcode/pattern
          });
          onUnlock();
        } else {
          // If biometrics not available, we might just have to unlock or show error
          // Usually, if the user enabled it, it should be available.
          setError("Biometric authentication not available on this device.");
        }
      } else {
        // Fallback for web/preview
        setTimeout(() => {
          onUnlock();
        }, 1000);
      }
    } catch (err: any) {
      console.error("Authentication failed", err);
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    authenticate();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-surface flex flex-col items-center justify-center p-8 text-center"
    >
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <Lock className="w-10 h-10 text-primary" />
      </div>
      
      <h2 className="text-2xl font-bold text-on-surface mb-2">{STRINGS.security.lockedTitle}</h2>
      <p className="text-on-surface-variant opacity-70 mb-12">
        {error ? error : STRINGS.security.lockedMessageBiometric}
      </p>

      <div className="flex flex-col items-center space-y-8">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={authenticate}
          disabled={isAuthenticating}
          className={`w-24 h-24 rounded-full flex items-center justify-center border-2 transition-all ${
            error ? "bg-red-500/10 border-red-500/50" : "bg-primary/5 border-primary/20"
          }`}
        >
          {error ? (
            <ShieldAlert className="w-12 h-12 text-red-500" />
          ) : (
            <Fingerprint className={`w-12 h-12 text-primary ${isAuthenticating ? "animate-pulse" : ""}`} />
          )}
        </motion.button>
        
        <button
          onClick={authenticate}
          disabled={isAuthenticating}
          className="text-primary font-bold text-sm uppercase tracking-wider"
        >
          {isAuthenticating ? "Authenticating..." : error ? "Try Again" : "Tap to Unlock"}
        </button>
      </div>
    </motion.div>
  );
}
