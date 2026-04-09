import { useState, useEffect, FormEvent, useMemo, useRef } from "react";
import { useStrings } from "../hooks/useStrings";
import { StorageService } from "../services/storage";
import { OvertimeEntry } from "../types/app";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, TrendingUp, BarChart3 } from "lucide-react";
import { calculateHourlyRate, getBarChartData } from "../lib/calculations";
import { useFirebase } from "../components/FirebaseProvider";
import { db, doc, setDoc, serverTimestamp, handleFirestoreError, OperationType } from "../firebase";
import { ValidationTooltip } from "../components/ui/ValidationTooltip";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function AddEntry() {
  const STRINGS = useStrings();
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, profile } = useFirebase();
  const settings = StorageService.getSettings();
  const hourlyRate = useMemo(() => calculateHourlyRate(settings), [settings]);
  const [entries, setEntries] = useState<OvertimeEntry[]>(StorageService.getEntries());

  const barData = useMemo(() => {
    return getBarChartData(entries, 7);
  }, [entries]);

  const [entry, setEntry] = useState<Partial<OvertimeEntry>>({
    date: new Date().toISOString().split('T')[0],
    hours: 0,
    note: "",
  });
  const [showValidation, setShowValidation] = useState<{ field: string | null, message: string | null }>({ field: null, message: null });
  const validationTimer = useRef<NodeJS.Timeout | null>(null);

  const triggerValidation = (field: string, message: string) => {
    setShowValidation({ field, message });
    if (validationTimer.current) clearTimeout(validationTimer.current);
    validationTimer.current = setTimeout(() => setShowValidation({ field: null, message: null }), 3000);
  };

  useEffect(() => {
    if (id) {
      const localEntries = StorageService.getEntries();
      const found = localEntries.find(e => e.id === id);
      if (found) {
        setEntry(found);
      }
    }
  }, [id]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!entry.date || !entry.hours || entry.hours <= 0) {
      alert(STRINGS.addEntry.invalidInput);
      return;
    }

    const entryId = id || crypto.randomUUID();
    const newEntry: OvertimeEntry = {
      id: entryId,
      date: entry.date,
      hours: Number(entry.hours),
      note: entry.note || "",
      status: 'pending'
    };

    await StorageService.saveEntry(newEntry, user?.uid);

    navigate("/reports");
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant hover:text-primary transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-on-surface">
          {id ? STRINGS.addEntry.editEntry : STRINGS.tabs.addEntry}
        </h1>
      </header>

      <form onSubmit={handleSave} className="space-y-4 bg-surface-variant/30 p-6 rounded-3xl border border-outline/10">
        <div className="space-y-2 relative">
          <label className="text-sm font-medium text-on-surface-variant ml-1">
            {STRINGS.addEntry.dateLabel}
          </label>
          <input
            type="date"
            required
            onInvalid={(e) => {
              e.preventDefault();
              triggerValidation('date', STRINGS.common.requiredField);
            }}
            onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
            value={entry.date}
            onChange={(e) => setEntry({ ...entry, date: e.target.value })}
            className="w-full bg-surface border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
          <ValidationTooltip 
            isVisible={showValidation.field === 'date'} 
            message={showValidation.message} 
          />
        </div>

        <div className="space-y-2 relative">
          <label className="text-sm font-medium text-on-surface-variant ml-1">
            {STRINGS.addEntry.hoursLabel}
          </label>
          <input
            type="number"
            step="0.5"
            required
            onInvalid={(e) => {
              e.preventDefault();
              triggerValidation('hours', STRINGS.common.requiredField);
            }}
            onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
            min="0.5"
            placeholder={STRINGS.addEntry.hoursPlaceholder}
            value={entry.hours || ""}
            onChange={(e) => setEntry({ ...entry, hours: parseFloat(e.target.value) || 0 })}
            className="w-full bg-surface border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
          <ValidationTooltip 
            isVisible={showValidation.field === 'hours'} 
            message={showValidation.message} 
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-on-surface-variant ml-1">
            {STRINGS.addEntry.noteLabel}
          </label>
          <input
            type="text"
            placeholder={STRINGS.addEntry.notePlaceholder}
            value={entry.note}
            onChange={(e) => setEntry({ ...entry, note: e.target.value })}
            className="w-full bg-surface border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-primary text-on-primary font-bold py-4 rounded-2xl shadow-lg hover:bg-primary/90 active:scale-95 transition-all mt-4 flex items-center justify-center space-x-2"
        >
          <Save className="w-5 h-5" />
          <span>{STRINGS.common.save}</span>
        </button>
      </form>

      {/* Weekly Performance Chart */}
      <div className="bg-surface-variant/30 p-6 rounded-3xl border border-outline/10 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-on-surface">{STRINGS.addEntry.weeklyPerformance}</h2>
        </div>
        
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-5" />
              <XAxis 
                dataKey="label" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.5 }}
              />
              <YAxis 
                hide 
              />
              <Tooltip 
                cursor={{ fill: 'currentColor', opacity: 0.05 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-surface border border-outline/20 p-3 rounded-2xl shadow-xl backdrop-blur-md">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider opacity-60 mb-1">
                          {payload[0].payload.label}
                        </p>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <p className="text-sm font-bold text-on-surface">
                            {payload[0].value} {STRINGS.dashboard.hours}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="hours" 
                radius={[6, 6, 0, 0]}
                barSize={24}
              >
                {barData.map((entry, index) => {
                  const colors = [
                    '#6366f1', // Indigo
                    '#ec4899', // Pink
                    '#f59e0b', // Amber
                    '#10b981', // Emerald
                    '#3b82f6', // Blue
                    '#8b5cf6', // Violet
                    '#f43f5e'  // Rose
                  ];
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.hours > 0 ? colors[index % colors.length] : 'var(--outline-variant)'} 
                      fillOpacity={entry.hours > 0 ? 0.9 : 0.2}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-center text-on-surface-variant opacity-50 italic">
          {STRINGS.addEntry.consistencyDesc}
        </p>
      </div>
    </div>
  );
}
