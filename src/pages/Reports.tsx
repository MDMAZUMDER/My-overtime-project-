import { useState, useEffect, useMemo } from "react";
import { useStrings } from "../hooks/useStrings";
import { cn } from "../lib/utils";
import { StorageService } from "../services/storage";
import { OvertimeEntry, HistoryEntry } from "../types/app";
import { Calendar, Clock, FileText, Trash2, Edit2, AlertCircle, TrendingUp, Download, Share2, Loader2, ArrowLeft, History, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { calculateTotalStats, calculateHourlyRate } from "../lib/calculations";
import { PDFService } from "../services/pdf";
import { Tooltip } from "../components/ui/Tooltip";
import { useFirebase } from "../components/FirebaseProvider";
import { db, doc, setDoc, deleteDoc, handleFirestoreError, OperationType, collection, getDocs, query, where } from "../firebase";

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const filteredEntries = useMemo(() => {
    const now = new Date();
    const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (activeTab === "recent") {
      return sorted.slice(0, 4);
    }

    if (activeTab === "weekly") {
      // Req #5: Only show the latest week's data
      if (sorted.length === 0) return [];
      
      const latestEntryDate = new Date(sorted[0].date);
      const startOfWeek = new Date(latestEntryDate);
      startOfWeek.setDate(latestEntryDate.getDate() - 7);
      
      return sorted.filter(e => new Date(e.date) > startOfWeek);
    }

    if (activeTab === "monthly") {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);
      return sorted.filter(e => new Date(e.date) >= oneMonthAgo);
    }

    return sorted;
  }, [entries, activeTab]);

  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const stats = useMemo(() => {
    return calculateTotalStats(filteredEntries, settings);
  }, [filteredEntries, settings]);

  const overallStats = useMemo(() => {
    return calculateTotalStats(entries, settings);
  }, [entries, settings]);

  const groupedByMonth = useMemo(() => {
    const groups: { [key: string]: OvertimeEntry[] } = {};
    
    entries.forEach(entry => {
      const date = new Date(entry.date);
      const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(entry);
    });

    // Sort months by date descending
    return Object.keys(groups)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(month => ({
        month,
        entries: groups[month].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      }));
  }, [entries]);

  // Find month with highest amount of data (most entries)
  const busiestMonthData = useMemo(() => {
    if (groupedByMonth.length === 0) return null;
    return [...groupedByMonth].sort((a, b) => b.entries.length - a.entries.length)[0];
  }, [groupedByMonth]);

  const handleDelete = async () => {
    if (deleteId) {
      await StorageService.deleteEntry(deleteId, user?.uid);
      setDeleteId(null);
    }
  };

  const handleCloseCalculation = async () => {
    const historyEntry = StorageService.closeCalculation(overallStats.totalHours, overallStats.totalEarnings, user?.uid);
    
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
        // The StorageService.closeCalculation already cleared local, but we need to clear Firestore entries collection
        // In a real app, we'd move them to a history subcollection.
        // For now, let's just clear the entries collection for this user.
        const entriesRef = collection(db, `users/${user.uid}/entries`);
        const snapshot = await getDocs(entriesRef);
        const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);

        // 3. If connected to a company, also delete from company entries
        if (profile?.companyId) {
          const companyEntriesRef = collection(db, `companies/${profile.companyId}/entries`);
          const q = query(companyEntriesRef, where('userId', '==', user.uid));
          const companySnapshot = await getDocs(q);
          const companyDeletePromises = companySnapshot.docs.map(d => deleteDoc(d.ref));
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
              id="header-export-btn"
              onClick={() => handleExport('open', [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), STRINGS.reports.reportTitle)}
              disabled={isExporting || entries.length === 0}
              className="p-2 bg-surface-variant/50 text-on-surface-variant rounded-full hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-30"
            >
              {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
            </button>
          </Tooltip>
        </div>
      </header>

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

      <div className="space-y-8">
        {activeTab === 'history' ? (
          <div className="space-y-4">
            {history.length > 0 ? (
            history.map((item) => (
              <div 
                key={item.id} 
                className={cn(
                  "bg-surface-variant/30 border border-outline/10 p-4 rounded-2xl space-y-3 transition-all cursor-pointer hover:bg-surface-variant/40",
                  expandedHistoryId === item.id ? "ring-1 ring-primary/20" : ""
                )}
                onClick={() => setExpandedHistoryId(expandedHistoryId === item.id ? null : item.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-secondary/10 rounded-xl">
                      <History className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">
                        {formatDate(item.startDate)} - {formatDate(item.endDate)}
                      </p>
                      <p className="text-[10px] text-on-surface-variant opacity-50 italic">
                        {STRINGS.reports.history} • {formatDate(item.closedAt)}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleExport('open', item.entries, `${STRINGS.reports.reportTitle} ${formatDate(item.startDate)} - ${formatDate(item.endDate)}`);
                    }}
                    className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
                    title={STRINGS.reports.downloadPDF}
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

                {expandedHistoryId === item.id && (
                  <div className="pt-3 border-t border-outline/5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase opacity-40 px-1">{STRINGS.dashboard.recentEntries}</p>
                    {item.entries.map((subEntry) => (
                      <div key={subEntry.id} className="flex justify-between items-center bg-surface/30 p-2 rounded-lg text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-on-surface-variant">{formatDate(subEntry.date)}</span>
                          <span className="opacity-40">|</span>
                          <span className="text-primary font-medium">{subEntry.hours}h</span>
                        </div>
                        <span className="text-secondary opacity-80">
                          {settings.overtime.currency} {(subEntry.hours * (subEntry.rate || (item.totalEarnings / item.totalHours))).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
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
        ) : activeTab === "monthly" ? (
          <div className="space-y-8">
            {groupedByMonth.map((group) => (
              <div key={group.month} className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-sm font-black text-on-surface-variant uppercase tracking-widest">{group.month}</h3>
                  {busiestMonthData?.month === group.month && (
                    <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20">
                      {STRINGS.reports.recent || "Busiest"}
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  {group.entries.map((entry) => (
                    <EntryCard 
                      key={entry.id} 
                      entry={entry} 
                      STRINGS={STRINGS} 
                      settings={settings} 
                      onEdit={() => navigate(`/edit/${entry.id}`)}
                      onDelete={() => setDeleteId(entry.id)}
                      formatDate={formatDate}
                      hourlyRate={calculateHourlyRate(settings)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filteredEntries.length > 0 ? (
          <div className="space-y-3">
            {filteredEntries.map((entry) => (
              <EntryCard 
                key={entry.id} 
                entry={entry} 
                STRINGS={STRINGS} 
                settings={settings} 
                onEdit={() => navigate(`/edit/${entry.id}`)}
                onDelete={() => setDeleteId(entry.id)}
                formatDate={formatDate}
                hourlyRate={calculateHourlyRate(settings)}
              />
            ))}
          </div>
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

function EntryCard({ entry, STRINGS, settings, onEdit, onDelete, formatDate, hourlyRate }: any) {
  return (
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
              {formatDate(entry.date)}
            </p>
            <div className="flex items-center text-xs text-on-surface-variant opacity-70 mt-0.5">
              <Clock className="w-3 h-3 mr-1" />
              <span>{entry.hours} {STRINGS.dashboard.hours}</span>
              <span className="mx-2 opacity-30">|</span>
              <TrendingUp className="w-3 h-3 mr-1 text-primary" />
              <span className="text-primary font-medium">{settings.overtime.currency} {(entry.hours * hourlyRate).toFixed(2)}</span>
              {entry.status && (
                <>
                  <span className="mx-2 opacity-30">|</span>
                  <span className={cn(
                    "font-bold",
                    entry.status === 'approved' ? "text-green-500" :
                    entry.status === 'rejected' ? "text-red-500" :
                    "text-yellow-500"
                  )}>
                    {entry.status === 'approved' ? (STRINGS.profile.approved || 'Approved') : 
                     entry.status === 'rejected' ? (STRINGS.profile.rejected || 'Rejected') : 
                     (STRINGS.profile.pending || 'Pending')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex space-x-1">
          <button 
            onClick={onEdit}
            className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={onDelete}
            className="p-2 text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {entry.note && (
        <div className="mt-4 relative group/note">
          <div className="absolute -top-1 left-6 w-2 h-2 bg-on-surface/[0.04] border-l border-t border-on-surface/[0.08] rotate-45 z-0" />
          <div className="relative z-10 flex items-start space-x-3 bg-on-surface/[0.04] p-4 rounded-2xl border border-on-surface/[0.08] backdrop-blur-md transition-all hover:bg-on-surface/[0.06] shadow-sm overflow-hidden">
            <div className="absolute top-0 right-0 p-1 opacity-5 group-hover/note:opacity-10 transition-opacity">
               <FileText className="w-12 h-12 -mr-4 -mt-4 rotate-12" />
            </div>
            <div className="mt-0.5 p-2 bg-primary/15 rounded-xl shrink-0 shadow-inner">
              <FileText className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="space-y-1.5 relative z-10">
              <div className="flex items-center space-x-2">
                <p className="text-[10px] font-black text-primary/70 uppercase tracking-[0.15em] leading-none">
                  {STRINGS.addEntry?.noteLabel || "Journal Entry"}
                </p>
                <div className="h-[1px] w-8 bg-primary/20" />
              </div>
              <p className="text-xs text-on-surface leading-relaxed font-medium italic">
                {entry.note}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
