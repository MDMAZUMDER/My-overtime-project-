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
