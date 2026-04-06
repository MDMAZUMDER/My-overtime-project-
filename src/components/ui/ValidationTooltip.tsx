import { motion, AnimatePresence } from "motion/react";
import { AlertCircle } from "lucide-react";

interface ValidationTooltipProps {
  message: string | null;
  isVisible: boolean;
}

export function ValidationTooltip({ message, isVisible }: ValidationTooltipProps) {
  return (
    <AnimatePresence>
      {isVisible && message && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="absolute z-50 left-1/2 -translate-x-1/2 -top-12"
        >
          <div className="bg-white text-black px-4 py-2 rounded-xl shadow-2xl flex items-center space-x-2 border border-outline/10 whitespace-nowrap">
            <div className="bg-amber-500 p-1 rounded-md">
              <AlertCircle className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold">{message}</span>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-r border-b border-outline/10" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
