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
    <div className="bg-[#241d1a] rounded-[28px] overflow-hidden w-full max-w-[320px] shadow-2xl flex flex-col">
      {/* Header with Selected Date Representation */}
      <div className="bg-[#3e3835] p-4">
        <h2 className="text-xl font-bold text-white">
          {selectedDateObj ? format(selectedDateObj, "EEE, MMM d, yyyy") : format(today, "EEE, MMM d, yyyy")}
        </h2>
      </div>

      <div className="p-4 flex-1">
        {/* Month Selector */}
        <div className="flex items-center justify-between mb-6 px-2">
          <button 
            type="button"
            onClick={handlePrevMonth}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-white text-sm">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <button 
            type="button"
            onClick={handleNextMonth}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDayLabels.map((day, i) => (
            <div key={i} className="text-center text-[10px] font-bold text-white/40 h-8 flex items-center justify-center">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const isSelected = selectedDate === dateStr;
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isPastMonth = isBefore(startOfMonth(day), startOfMonth(today));
            const isFuture = isAfter(startOfDay(day), today);
            const isDisabled = isFuture || isPastMonth;

            return (
              <button
                key={i}
                type="button"
                disabled={isDisabled}
                onClick={() => onDateSelect(dateStr)}
                className={cn(
                  "relative h-10 w-10 flex items-center justify-center rounded-full text-xs transition-all mx-auto",
                  (!isCurrentMonth || isDisabled) ? "text-white/30 pointer-events-none" : "text-white hover:bg-white/10",
                  isSelected && "bg-[#2196f3] text-white hover:bg-[#2196f3] shadow-md",
                )}
              >
                <span className="relative z-10">{format(day, "d")}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between p-4 bg-transparent border-t border-white/5">
        <button 
          onClick={onClear}
          className="px-4 py-2 text-[#f48fb1] font-bold text-sm uppercase tracking-wider rounded-lg hover:bg-white/5"
        >
          {STRINGS.common?.clear || "Clear"}
        </button>
        <div className="flex space-x-2">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-[#f48fb1] font-bold text-sm uppercase tracking-wider rounded-lg hover:bg-white/5"
          >
            {STRINGS.common?.cancel || "Cancel"}
          </button>
          <button 
            onClick={onSet}
            className="px-4 py-2 text-[#f48fb1] font-bold text-sm uppercase tracking-wider rounded-lg hover:bg-white/5"
          >
            {STRINGS.common?.set || "Set"}
          </button>
        </div>
      </div>
    </div>
  );
}
