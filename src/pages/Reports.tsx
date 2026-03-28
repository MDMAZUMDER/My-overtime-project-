import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useStrings } from "../hooks/useStrings";
import { cn } from "../lib/utils";
import { StorageService } from "../services/storage";
import { OvertimeEntry } from "../types/app";
import { Calendar, Clock, FileText, Trash2, Edit2, AlertCircle, TrendingUp, DollarSign, Download, Share2, Loader2, Facebook } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { calculateTotalStats } from "../lib/calculations";
import { PDFService } from "../services/pdf";

export default function Reports() {
  const STRINGS = useStrings();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("daily");
  const [entries, setEntries] = useState<OvertimeEntry[]>(StorageService.getEntries());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const settings = StorageService.getSettings();

  useEffect(() => {
    const handleEntriesChange = () => {
      setEntries(StorageService.getEntries());
    };
    window.addEventListener("entriesChanged", handleEntriesChange);
    return () => window.removeEventListener("entriesChanged", handleEntriesChange);
  }, []);

  const filteredEntries = useMemo(() => {
    const now = new Date();
    const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (activeTab === "daily") {
      const today = now.toISOString().split('T')[0];
      return sorted.filter(e => e.date === today);
    }

    if (activeTab === "weekly") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return sorted.filter(e => new Date(e.date) >= oneWeekAgo);
    }

    if (activeTab === "monthly") {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);
      return sorted.filter(e => new Date(e.date) >= oneMonthAgo);
    }

    return sorted;
  }, [entries, activeTab]);

  const stats = useMemo(() => {
    return calculateTotalStats(filteredEntries, settings);
  }, [filteredEntries, settings]);

  const handleDelete = () => {
    if (deleteId) {
      StorageService.deleteEntry(deleteId);
      setDeleteId(null);
    }
  };

  const handleExport = async (action: 'download' | 'share') => {
    if (filteredEntries.length === 0) return;
    setIsExporting(true);
    try {
      const profile = StorageService.getProfile();
      const title = `${STRINGS.reports[activeTab as keyof typeof STRINGS.reports] || activeTab} ${STRINGS.reports.reportTitle}`;
      const { blob, filename } = await PDFService.generateReport(filteredEntries, profile, settings, title, STRINGS);
      
      if (action === 'download') {
        await PDFService.downloadPDF(blob, filename);
      } else {
        await PDFService.sharePDF(blob, filename);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const tabs = [
    { id: "daily", label: STRINGS.reports.daily },
    { id: "weekly", label: STRINGS.reports.weekly },
    { id: "monthly", label: STRINGS.reports.monthly },
    { id: "all", label: STRINGS.reports.all },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-20"
    >
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">{STRINGS.tabs.reports}</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => handleExport('download')}
            disabled={isExporting || filteredEntries.length === 0}
            className="p-2 bg-surface-variant/50 text-on-surface-variant rounded-full hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-30"
            title={STRINGS.reports.downloadPDF}
          >
            {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
          </button>
          <button
            onClick={() => handleExport('share')}
            disabled={isExporting || filteredEntries.length === 0}
            className="p-2 bg-surface-variant/50 text-on-surface-variant rounded-full hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-30"
            title={STRINGS.reports.sharePDF}
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider opacity-60">{STRINGS.dashboard.totalHours}</p>
            <p className="text-sm font-bold text-on-surface">{stats.totalHours.toFixed(1)}h</p>
          </div>
        </div>
        <div className="bg-secondary/5 border border-secondary/10 p-4 rounded-2xl flex items-center space-x-3">
          <div className="p-2 bg-secondary/10 rounded-xl">
            <DollarSign className="w-4 h-4 text-secondary" />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider opacity-60">{STRINGS.reports.otEarnings}</p>
            <p className="text-sm font-bold text-on-surface">{settings.overtime.currency} {stats.totalEarnings.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-surface-variant/30 border border-outline/10 p-4 rounded-2xl flex items-center space-x-3">
          <div className="p-2 bg-surface rounded-xl">
            <TrendingUp className="w-4 h-4 text-on-surface-variant opacity-60" />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider opacity-60">{STRINGS.reports.basicSalary}</p>
            <p className="text-sm font-bold text-on-surface">{settings.overtime.currency} {settings.overtime.basicSalary.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-primary-container p-4 rounded-2xl flex items-center space-x-3 shadow-sm border border-primary/10">
          <div className="p-2 bg-primary/10 rounded-xl">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] text-primary uppercase font-bold tracking-wider opacity-60">{STRINGS.reports.totalPayout}</p>
            <p className="text-sm font-bold text-primary">{settings.overtime.currency} {(settings.overtime.basicSalary + stats.totalEarnings).toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="flex bg-surface-variant rounded-full p-1 sticky top-0 z-10 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 py-2 text-xs font-medium rounded-full transition-all duration-200",
              activeTab === tab.id
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant hover:bg-primary/10"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredEntries.length > 0 ? (
          filteredEntries.map((entry) => (
            <motion.div
              key={entry.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-surface-variant/30 border border-outline/10 p-4 rounded-2xl space-y-3 relative group"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">
                      {new Date(entry.date).toLocaleDateString(undefined, { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                    <div className="flex items-center text-xs text-on-surface-variant opacity-70 mt-0.5">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>{entry.hours} {STRINGS.dashboard.hours}</span>
                      <span className="mx-2 opacity-30">|</span>
                      <TrendingUp className="w-3 h-3 mr-1 text-primary" />
                      <span className="text-primary font-medium">{settings.overtime.currency} {(entry.hours * stats.hourlyRate).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button 
                    onClick={() => navigate(`/edit/${entry.id}`)}
                    className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDeleteId(entry.id)}
                    className="p-2 text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {entry.note && (
                <div className="flex items-start space-x-2 bg-surface/50 p-3 rounded-xl border border-outline/5">
                  <FileText className="w-3.5 h-3.5 text-on-surface-variant opacity-50 mt-0.5" />
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {entry.note}
                  </p>
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <div className="bg-surface-variant/20 border border-dashed border-outline/30 rounded-[32px] p-12 flex flex-col items-center justify-center text-on-surface-variant/40 space-y-4 text-center">
            <div className="w-16 h-16 bg-surface-variant/50 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 opacity-20" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface opacity-60">{STRINGS.common.noData}</p>
              <p className="text-xs opacity-40 mt-1">{STRINGS.reports.noEntriesForPeriod.replace('{period}', activeTab)}</p>
            </div>
            <button 
              onClick={() => navigate("/add")}
              className="px-6 py-2 bg-primary text-on-primary text-xs font-bold rounded-full shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              {STRINGS.tabs.addEntry}
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-surface p-6 rounded-3xl shadow-2xl max-w-sm w-full space-y-4"
            >
              <div className="flex items-center space-x-3 text-red-500">
                <AlertCircle className="w-6 h-6" />
                <h3 className="text-lg font-bold">{STRINGS.reports.deleteEntryTitle}</h3>
              </div>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                {STRINGS.reports.deleteEntryConfirm}
              </p>
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-on-surface-variant hover:bg-surface-variant transition-colors"
                >
                  {STRINGS.common.cancel}
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3 px-4 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all active:scale-95"
                >
                  {STRINGS.common.delete}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
