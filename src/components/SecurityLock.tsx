import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Fingerprint, Lock, ShieldCheck, AlertCircle } from "lucide-react";
import { StorageService } from "../services/storage";
import { useStrings } from "../hooks/useStrings";

export default function SecurityLock({ onUnlock }: { onUnlock: () => void }) {
  const settings = StorageService.getSettings();
  const STRINGS = useStrings();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [mode, setMode] = useState<"biometric" | "pin">(settings.security.biometricEnabled ? "biometric" : "pin");

  const handlePinInput = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        if (newPin === settings.security.pin) {
          onUnlock();
        } else {
          setError(true);
          setTimeout(() => {
            setPin("");
            setError(false);
          }, 1000);
        }
      }
    }
  };

  const simulateBiometric = () => {
    // Simulate biometric scan
    setTimeout(() => {
      onUnlock();
    }, 1500);
  };

  useEffect(() => {
    if (mode === "biometric") {
      simulateBiometric();
    }
  }, [mode]);

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
        {mode === "biometric" ? STRINGS.security.lockedMessageBiometric : STRINGS.security.lockedMessagePin}
      </p>

      {mode === "biometric" ? (
        <div className="flex flex-col items-center space-y-8">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center border-2 border-primary/20"
          >
            <Fingerprint className="w-12 h-12 text-primary" />
          </motion.div>
          <button
            onClick={() => setMode("pin")}
            className="text-primary font-bold text-sm uppercase tracking-wider"
          >
            {STRINGS.security.usePin}
          </button>
        </div>
      ) : (
        <div className="w-full max-w-xs space-y-8">
          <div className="flex justify-center space-x-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  error ? "bg-red-500 border-red-500" :
                  pin.length > i ? "bg-primary border-primary" : "border-outline"
                }`}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "C"].map((btn, i) => (
              <button
                key={i}
                onClick={() => {
                  if (btn === "C") setPin("");
                  else if (btn !== "") handlePinInput(btn);
                }}
                disabled={btn === ""}
                className={`h-16 rounded-2xl flex items-center justify-center text-xl font-bold transition-all active:scale-90 ${
                  btn === "" ? "opacity-0" : "bg-surface-variant/30 hover:bg-surface-variant/50 text-on-surface"
                }`}
              >
                {btn}
              </button>
            ))}
          </div>

          {settings.security.biometricEnabled && (
            <button
              onClick={() => setMode("biometric")}
              className="text-primary font-bold text-sm uppercase tracking-wider flex items-center justify-center space-x-2 mx-auto"
            >
              <Fingerprint className="w-4 h-4" />
              <span>{STRINGS.security.useBiometric}</span>
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
