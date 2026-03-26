import { useState, useEffect, FormEvent, useMemo } from "react";
import { motion } from "motion/react";
import { useStrings } from "../hooks/useStrings";
import { StorageService } from "../services/storage";
import { OvertimeEntry } from "../types/app";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, TrendingUp } from "lucide-react";
import { calculateHourlyRate } from "../lib/calculations";

export default function AddEntry() {
  const STRINGS = useStrings();
  const navigate = useNavigate();
  const { id } = useParams();
  const settings = StorageService.getSettings();
  const hourlyRate = useMemo(() => calculateHourlyRate(settings), [settings]);

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

  const estimatedEarnings = useMemo(() => {
    return (entry.hours || 0) * hourlyRate;
  }, [entry.hours, hourlyRate]);

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

        {entry.hours && entry.hours > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-primary/10 p-4 rounded-2xl border border-primary/20 flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/20 rounded-xl">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-bold text-primary">Estimated Earnings</span>
            </div>
            <span className="text-lg font-bold text-primary">
              {settings.overtime.currency} {estimatedEarnings.toFixed(2)}
            </span>
          </motion.div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-on-surface-variant ml-1">
            Note (Optional)
          </label>
          <textarea
            placeholder="Add a note..."
            value={entry.note}
            onChange={(e) => setEntry({ ...entry, note: e.target.value })}
            className="w-full bg-surface border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all min-h-[100px]"
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
    </motion.div>
  );
}
