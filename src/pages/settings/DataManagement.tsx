import { motion } from "motion/react";
import { useStrings } from "../../hooks/useStrings";
import { StorageService } from "../../services/storage";
import { Download, Upload, Trash2, AlertTriangle } from "lucide-react";

export default function DataManagement() {
  const STRINGS = useStrings();
  const handleClearData = () => {
    if (window.confirm(STRINGS.settings.clearDataConfirm)) {
      StorageService.clearAllData();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <header>
        <h1 className="text-2xl font-bold text-on-surface">{STRINGS.settings.dataManagement}</h1>
      </header>

      <div className="space-y-4">
        <button
          onClick={() => StorageService.exportData()}
          className="w-full flex items-center space-x-4 p-5 bg-surface-variant/30 rounded-2xl border border-outline/10 hover:bg-primary/5 transition-colors"
        >
          <div className="p-2 bg-primary/10 rounded-xl">
            <Download className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-medium text-on-surface">{STRINGS.settings.exportData}</p>
            <p className="text-xs text-on-surface-variant opacity-60">Save your data to a JSON file</p>
          </div>
        </button>

        <button className="w-full flex items-center space-x-4 p-5 bg-surface-variant/30 rounded-2xl border border-outline/10 opacity-50 cursor-not-allowed">
          <div className="p-2 bg-secondary/10 rounded-xl">
            <Upload className="w-5 h-5 text-secondary" />
          </div>
          <div className="text-left">
            <p className="font-medium text-on-surface">{STRINGS.settings.importData}</p>
            <p className="text-xs text-on-surface-variant opacity-60">Restore data from a backup file</p>
          </div>
        </button>

        <div className="pt-8">
          <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6 space-y-4">
            <div className="flex items-center space-x-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              <p className="font-bold uppercase tracking-wider text-xs">Danger Zone</p>
            </div>
            <p className="text-sm text-on-surface-variant">
              Clearing all data will permanently remove your profile, settings, and all overtime entries.
            </p>
            <button
              onClick={handleClearData}
              className="w-full flex items-center justify-center space-x-2 p-4 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 active:scale-95 transition-all"
            >
              <Trash2 className="w-5 h-5" />
              <span>{STRINGS.settings.clearData}</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
