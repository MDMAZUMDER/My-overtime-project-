import React from "react";
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

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const success = await StorageService.importData(file);
    if (!success) {
      alert("Failed to import data. Please ensure the file is a valid backup.");
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
            <p className="text-xs text-on-surface-variant opacity-60">{STRINGS.settings.exportDataDescription}</p>
          </div>
        </button>

        <label className="w-full flex items-center space-x-4 p-5 bg-surface-variant/30 rounded-2xl border border-outline/10 hover:bg-secondary/5 transition-colors cursor-pointer">
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <div className="p-2 bg-secondary/10 rounded-xl">
            <Upload className="w-5 h-5 text-secondary" />
          </div>
          <div className="text-left">
            <p className="font-medium text-on-surface">{STRINGS.settings.importData}</p>
            <p className="text-xs text-on-surface-variant opacity-60">{STRINGS.settings.importDataDescription}</p>
          </div>
        </label>

        <div className="pt-8">
          <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6 space-y-4">
            <div className="flex items-center space-x-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              <p className="font-bold uppercase tracking-wider text-xs">{STRINGS.settings.dangerZone}</p>
            </div>
            <p className="text-sm text-on-surface-variant">
              {STRINGS.settings.clearDataDescription}
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
