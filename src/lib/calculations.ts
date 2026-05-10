import { AppSettings, OvertimeEntry } from "../types/app";

export const calculateHourlyRate = (settings: AppSettings): number => {
  if (settings.overtime.useManualHourlyRate) {
    return settings.overtime.hourlyRate;
  }
  
  const { basicSalary, workingDaysPerMonth, workingHoursPerDay } = settings.overtime;
  if (!basicSalary || !workingDaysPerMonth || !workingHoursPerDay) return 0;
  
  // Basic hourly rate + 50% (1.5x)
  return (basicSalary / (workingDaysPerMonth * workingHoursPerDay)) * 1.5;
};

export const calculateEntryEarnings = (entry: OvertimeEntry, hourlyRate: number): number => {
  return entry.hours * hourlyRate;
};

export const calculateTotalStats = (entries: OvertimeEntry[], settings: AppSettings) => {
  const currentHourlyRate = calculateHourlyRate(settings);
  
  let totalHours = 0;
  let totalEarnings = 0;
  
  entries.forEach(entry => {
    totalHours += entry.hours;
    totalEarnings += entry.hours * (entry.rate || currentHourlyRate);
  });
  
  return {
    totalHours,
    totalEarnings,
    hourlyRate: currentHourlyRate
  };
};

export const calculateMonthlyStats = (entries: OvertimeEntry[], settings: AppSettings) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const thisMonthEntries = entries.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const lastMonthEntries = entries.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
  });

  // Group by month-year string for all entries
  const grouped: Record<string, { entries: OvertimeEntry[], stats: any }> = {};
  entries.forEach(e => {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    if (!grouped[key]) {
      grouped[key] = { entries: [], stats: null };
    }
    grouped[key].entries.push(e);
  });

  Object.keys(grouped).forEach(key => {
    grouped[key].stats = calculateTotalStats(grouped[key].entries, settings);
  });

  // Find busiest month
  let busiestKey = "";
  let maxHours = 0;
  Object.keys(grouped).forEach(key => {
    if (grouped[key].stats.totalHours > maxHours) {
      maxHours = grouped[key].stats.totalHours;
      busiestKey = key;
    }
  });

  let busiestMonth = null;
  if (busiestKey) {
    const [year, month] = busiestKey.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    const locale = settings.language === 'bn' ? 'bn-BD' : settings.language === 'ar' ? 'ar-SA' : 'en-US';
    busiestMonth = {
      name: date.toLocaleString(locale, { month: 'long' }),
      year,
      stats: grouped[busiestKey].stats,
      count: grouped[busiestKey].entries.length
    };
  }

  return {
    thisMonth: calculateTotalStats(thisMonthEntries, settings),
    lastMonth: calculateTotalStats(lastMonthEntries, settings),
    thisMonthEntriesCount: thisMonthEntries.length,
    lastMonthEntriesCount: lastMonthEntries.length,
    busiestMonth,
    grouped
  };
};

export const getRecentSummary = (entries: OvertimeEntry[], days: number = 7) => {
  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(now.getDate() - days);
  
  return entries
    .filter(e => new Date(e.date) >= cutoff)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getBarChartData = (entries: OvertimeEntry[], days: number = 7) => {
  const data = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    const dayEntries = entries.filter(e => e.date === dateStr);
    const totalHours = dayEntries.reduce((acc, curr) => acc + curr.hours, 0);
    
    data.push({
      date: dateStr,
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      hours: totalHours
    });
  }
  
  return data;
};

export const getPieChartData = (entries: OvertimeEntry[]) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const distribution = days.map(day => ({ name: day, value: 0 }));
  
  entries.forEach(entry => {
    const d = new Date(entry.date);
    const dayIndex = d.getDay();
    distribution[dayIndex].value += entry.hours;
  });
  
  return distribution.filter(d => d.value > 0);
};
