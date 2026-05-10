import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, startOfDay, parseISO, isAfter, isBefore } from "date-fns";

interface CalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onCancel: () => void;
  onClear: () => void;
  onSet: () => void;
  highlightedDates?: string[]; // Array of YYYY-MM-DD
  STRINGS: any;
}

export default function Calendar({ 
  selectedDate, 
  onDateSelect, 
  onCancel, 
  onClear, 
  onSet, 
  highlightedDates = [], 
  STRINGS 
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate || new Date()));
  const today = startOfDay(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const weekDayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const selectedDateObj = selectedDate ? parseISO(selectedDate) : null;

  return (
    <div className="bg-[#1a1614] rounded-[28px] overflow-hidden w-full max-w-[300px] shadow-2xl flex flex-col h-auto border border-white/5">
      {/* Header with Selected Date Representation */}
      <div className="bg-primary/10 p-4 border-b border-white/5">
        <p className="text-primary/60 text-[9px] font-bold uppercase tracking-[0.2em] mb-1">
          {STRINGS.common?.selectDate || "Select Date"}
        </p>
        <h2 className="text-xl font-black text-white tracking-tight">
          {selectedDateObj ? format(selectedDateObj, "EEE, MMM d") : format(today, "EEE, MMM d")}
        </h2>
      </div>

      <div className="p-3">
        {/* Month Selector */}
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex flex-col">
            <h3 className="text-xs font-bold text-white/90 capitalize leading-none">
              {format(currentMonth, "MMMM")}
            </h3>
            <p className="text-[9px] font-medium text-white/40 mt-1">
              {format(currentMonth, "yyyy")}
            </p>
          </div>
          
          <div className="flex items-center space-x-0.5">
            <button 
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-white/60"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-white/60"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 mb-2">
          {weekDayLabels.map((day, i) => (
            <div key={i} className="text-center text-[9px] font-black text-white/20 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {days.map((day, i) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const isSelected = selectedDate === dateStr;
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isPastMonth = isBefore(startOfMonth(day), startOfMonth(today));
            const isFuture = isAfter(startOfDay(day), today);
            const isDisabled = isFuture || isPastMonth;
            const hasEntry = highlightedDates.includes(dateStr);

            return (
              <button
                key={i}
                type="button"
                disabled={isDisabled}
                onClick={() => onDateSelect(dateStr)}
                className={cn(
                  "relative h-9 w-9 flex items-center justify-center rounded-xl text-[11px] transition-all mx-auto font-bold",
                  (!isCurrentMonth || isDisabled) ? "text-white/10 pointer-events-none" : "text-white/80 hover:bg-white/5 hover:scale-105",
                  isSelected && "bg-primary text-white hover:bg-primary hover:scale-100 shadow-[0_4px_12px_-2px_rgba(var(--primary-rgb),0.3)]",
                  !isSelected && isToday(day) && "text-primary border border-primary/20"
                )}
              >
                <span className="relative z-10">{format(day, "d")}</span>
                {hasEntry && !isSelected && (
                  <div className="absolute bottom-1 w-0.5 h-0.5 rounded-full bg-primary/40" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 bg-white/[0.02] flex items-center justify-end space-x-1 border-t border-white/5">
        <button 
          onClick={onClear}
          className="px-3 py-1.5 text-primary/60 font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-white/5 mr-auto"
        >
          {STRINGS.common?.clear || "Clear"}
        </button>
        <button 
          onClick={onCancel}
          className="px-3 py-1.5 text-white/40 font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-white/5"
        >
          {STRINGS.common?.cancel || "Cancel"}
        </button>
        <button 
          onClick={onSet}
          className="px-4 py-2 bg-primary/20 text-primary border border-primary/20 font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-primary/30"
        >
          {STRINGS.common?.set || "Set"}
        </button>
      </div>
    </div>
  );
}
