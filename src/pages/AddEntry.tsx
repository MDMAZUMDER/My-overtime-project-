import { useState, useEffect, FormEvent, useMemo } from "react";
import { motion } from "motion/react";
import { useStrings } from "../hooks/useStrings";
import { StorageService } from "../services/storage";
import { OvertimeEntry } from "../types/app";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, TrendingUp, BarChart3 } from "lucide-react";
import { calculateHourlyRate, getBarChartData } from "../lib/calculations";
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

  useEffect(() => {
    if (id) {
      const existing = StorageService.getEntries().find(e => e.id === id);
      if (existing) {
        setEntry(existing);
      }
    }
  }, [id]);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!entry.date || !entry.hours || entry.hours <= 0) {
      alert("Please enter a valid date and hours.");
      return;
    }

    const newEntry: OvertimeEntry = {
      id: entry.id || crypto.randomUUID(),
      date: entry.date,
      hours: Number(entry.hours),
      note: entry.note || "",
    };

    StorageService.saveEntry(newEntry);
    navigate("/reports");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <header className="flex items-center space-x-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-surface-variant rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-on-surface">
          {id ? "Edit Entry" : STRINGS.tabs.addEntry}
        </h1>
      </header>

      <form onSubmit={handleSave} className="space-y-4 bg-surface-variant/30 p-6 rounded-3xl border border-outline/10">
        <div className="space-y-2">
          <label className="text-sm font-medium text-on-surface-variant ml-1">
            {STRINGS.addEntry.dateLabel}
          </label>
          <input
            type="date"
            required
            value={entry.date}
            onChange={(e) => setEntry({ ...entry, date: e.target.value })}
            className="w-full bg-surface border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-on-surface-variant ml-1">
            {STRINGS.addEntry.hoursLabel}
          </label>
          <input
            type="number"
            step="0.5"
            required
            min="0.5"
            placeholder={STRINGS.addEntry.hoursPlaceholder}
            value={entry.hours || ""}
            onChange={(e) => setEntry({ ...entry, hours: parseFloat(e.target.value) || 0 })}
            className="w-full bg-surface border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-on-surface-variant ml-1">
            Note (Optional)
          </label>
          <textarea
            placeholder="Add a note..."
            value={entry.note}
            onChange={(e) => setEntry({ ...entry, note: e.target.value })}
            className="w-full bg-surface border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all min-h-[60px] h-20"
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
          <h2 className="text-lg font-bold text-on-surface">Weekly Performance</h2>
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
                contentStyle={{ 
                  backgroundColor: 'var(--surface)', 
                  border: '1px solid var(--outline-variant)',
                  borderRadius: '12px',
                  fontSize: '12px'
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
          Track your daily overtime consistency over the last 7 days.
        </p>
      </div>
    </motion.div>
  );
}
