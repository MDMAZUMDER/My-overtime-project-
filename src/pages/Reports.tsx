import { useState, useEffect, useMemo } from "react";
import { useStrings } from "../hooks/useStrings";
import { cn } from "../lib/utils";
import { StorageService } from "../services/storage";
import { OvertimeEntry, HistoryEntry } from "../types/app";
import { Calendar, Clock, FileText, Trash2, Edit2, AlertCircle, TrendingUp, Download, Share2, Loader2, ArrowLeft, History, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { calculateTotalStats } from "../lib/calculations";
import { PDFService } from "../services/pdf";
import { Tooltip } from "../components/ui/Tooltip";
import { useFirebase } from "../components/FirebaseProvider";
import { db, doc, setDoc, deleteDoc, handleFirestoreError, OperationType } from "../firebase";

export default function Reports() {
  const STRINGS = useStrings();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("recent");
  const [entries, setEntries] = useState<OvertimeEntry[]>(StorageService.getEntries());
  const [history, setHistory] = useState<HistoryEntry[]>(StorageService.getHistory());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const { user, profile } = useFirebase();
  const settings = StorageService.getSettings();

  useEffect(() => {
    const handleEntriesChange = () => setEntries(StorageService.getEntries());
    const handleHistoryChange = () => setHistory(StorageService.getHistory());
    window.addEventListener("entriesChanged", handleEntriesChange);
    window.addEventListener("historyChanged", handleHistoryChange);
    return () => {
      window.removeEventListener("entriesChanged", handleEntriesChange);
      window.removeEventListener("historyChanged", handleHistoryChange);
    };
  }, []);

  const filteredEntries = useMemo(() => {
    const now = new Date();
    const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (activeTab === "recent") {
      return sorted.slice(0, 4);
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

  const overallStats = useMemo(() => {
    return calculateTotalStats(entries, settings);
  }, [entries, settings]);

  const handleDelete = () => {
    if (deleteId) {
      StorageService.deleteEntry(deleteId);
      setDeleteId(null);
    }
  };

  const handleCloseCalculation = async () => {
    const historyEntry = StorageService.closeCalculation(overallStats.totalHours, overallStats.totalEarnings);
    
    if (historyEntry && user) {
      try {
        // 1. Save history to Firebase
        await setDoc(doc(db, 'history', historyEntry.id), {
          ...historyEntry,
          userId: user.uid,
          userEmail: user.email,
          userName: profile?.fullName,
        });

        // 2. Delete current entries from Firebase (since they are now in history)
        // We do this one by one or we could mark them as closed. 
        // For simplicity, let's delete them from the main collection.
        const deletePromises = historyEntry.entries.map(e => deleteDoc(doc(db, 'entries', e.id)));
        await Promise.all(deletePromises);

        // 3. If connected to a company, also delete from company entries
        if (profile?.companyId) {
          const companyDeletePromises = historyEntry.entries.map(e => 
            deleteDoc(doc(db, 'companies', profile.companyId!, 'entries', e.id))
          );
          await Promise.all(companyDeletePromises);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'history');
      }
    }

    setShowCloseConfirm(false);
    setActiveTab("history");
  };

  const handleExport = async (action: 'open' | 'share', customEntries?: OvertimeEntry[], customTitle?: string) => {
    const targetEntries = customEntries || filteredEntries;
    if (targetEntries.length === 0) return;
    
    setIsExporting(true);
    try {
      const profile = StorageService.getProfile();
      const title = customTitle || `${STRINGS.reports[activeTab as keyof typeof STRINGS.reports] || activeTab} ${STRINGS.reports.reportTitle}`;
      const { blob, filename } = await PDFService.generateReport(targetEntries, profile, settings, title, STRINGS);
      
      if (action === 'open') {
        await PDFService.openPDF(blob, filename);
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
    { id: "recent", label: STRINGS.reports.recent },
    { id: "weekly", label: STRINGS.reports.weekly },
    { id: "monthly", label: STRINGS.reports.monthly },
    { id: "history", label: STRINGS.reports.history },
  ];

  return (
    <div className="space-y-6 pb-20">
      <header className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant hover:text-primary transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-on-surface">{STRINGS.tabs.reports}</h1>
        </div>
        <div className="flex items-center space-x-2">
          {entries.length > 0 && (
            <button
              onClick={() => setShowCloseConfirm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary/10 text-primary text-xs font-bold rounded-full hover:bg-primary/20 transition-all active:scale-95 border border-primary/20"
              title={STRINGS.settings.closeCalculation}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{STRINGS.settings.closeCalculation}</span>
            </button>
          )}
          <Tooltip content={STRINGS.reports.downloadPDF} position="bottom">
            <button
              onClick={() => handleExport('open')}
              disabled={isExporting || (activeTab !== 'history' && filteredEntries.length === 0)}
              className="p-2 bg-surface-variant/50 text-on-surface-variant rounded-full hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-30"
            >
              {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
            </button>
          </Tooltip>
        </div>
      </header>

      {/* Summary Card with integrated Close Action */}
      {activeTab !== 'history' && (
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-surface to-secondary/5 border border-outline/10 rounded-[32px] p-6 shadow-sm">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-secondary/5 rounded-full blur-2xl" />
          
          <div className="relative space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-1">{STRINGS.reports.otEarnings}</p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-sm font-bold text-primary/60">{settings.overtime.currency}</span>
                  <span className="text-3xl font-black text-on-surface tracking-tight">{overallStats.totalEarnings.toFixed(2)}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] mb-1 opacity-60">{STRINGS.dashboard.totalHours}</p>
                <p className="text-xl font-bold text-on-surface">{overallStats.totalHours.toFixed(1)}<span className="text-xs ml-0.5 opacity-40">h</span></p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-outline/5">
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider opacity-50 mb-1">{STRINGS.reports.basicSalary}</p>
                <p className="text-sm font-bold text-on-surface/80">{settings.overtime.currency} {settings.overtime.basicSalary.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider opacity-50 mb-1">{STRINGS.reports.totalPayout}</p>
                <p className="text-sm font-bold text-primary">
                  {settings.overtime.currency} {(settings.overtime.basicSalary + overallStats.totalEarnings).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex bg-surface-variant rounded-full p-1 sticky top-0 z-10 shadow-sm overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 py-2 px-4 text-xs font-medium rounded-full transition-all duration-200 whitespace-nowrap",
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
        {activeTab === 'history' ? (
          <div className="space-y-4">
            {history.length > 0 ? (
            history.map((item) => (
              <div key={item.id} className="bg-surface-variant/30 border border-outline/10 p-4 rounded-2xl space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-secondary/10 rounded-xl">
                      <History className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">
                        {new Date(item.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(item.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-[10px] text-on-surface-variant opacity-50 italic">
                        Closed on {new Date(item.closedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleExport('open', item.entries, `Report ${new Date(item.startDate).toLocaleDateString()} - ${new Date(item.endDate).toLocaleDateString()}`)}
                    className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-surface/50 p-2 rounded-xl text-center">
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold opacity-60">{STRINGS.dashboard.totalHours}</p>
                    <p className="text-sm font-bold text-primary">{item.totalHours.toFixed(1)}h</p>
                  </div>
                  <div className="bg-surface/50 p-2 rounded-xl text-center">
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold opacity-60">{STRINGS.reports.otEarnings}</p>
                    <p className="text-sm font-bold text-secondary">{settings.overtime.currency} {item.totalEarnings.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-surface-variant/20 border border-dashed border-outline/30 rounded-[32px] p-12 flex flex-col items-center justify-center text-on-surface-variant/40 space-y-4 text-center">
              <div className="w-16 h-16 bg-surface-variant/50 rounded-full flex items-center justify-center">
                <History className="w-8 h-8 opacity-20" />
              </div>
              <p className="text-sm font-bold text-on-surface opacity-60">{STRINGS.common.noData}</p>
            </div>
            )}
          </div>
        ) : filteredEntries.length > 0 ? (
          filteredEntries.map((entry) => (
            <div
              key={entry.id}
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
                      {entry.status && (
                        <>
                          <span className="mx-2 opacity-30">|</span>
                          <span className={cn(
                            "font-bold",
                            entry.status === 'approved' ? "text-green-500" :
                            entry.status === 'rejected' ? "text-red-500" :
                            "text-yellow-500"
                          )}>
                            {entry.status === 'approved' ? 'অনুমোদিত' : entry.status === 'rejected' ? 'প্রত্যাখ্যাত' : 'অপেক্ষমান'}
                          </span>
                        </>
                      )}
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
            </div>
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
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setDeleteId(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div
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
          </div>
        </div>
      )}

      {/* Close Calculation Confirmation Dialog */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowCloseConfirm(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div
            className="relative bg-surface p-6 rounded-3xl shadow-2xl max-w-sm w-full space-y-4"
          >
            <div className="flex items-center space-x-3 text-primary">
              <CheckCircle2 className="w-6 h-6" />
              <h3 className="text-lg font-bold">{STRINGS.settings.closeCalculation}</h3>
            </div>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              {STRINGS.settings.closeCalculationConfirm}
            </p>
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-on-surface-variant hover:bg-surface-variant transition-colors"
              >
                {STRINGS.common.cancel}
              </button>
              <button
                onClick={handleCloseCalculation}
                className="flex-1 py-3 px-4 rounded-xl font-bold bg-primary text-on-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                {STRINGS.settings.closeCalculation}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
