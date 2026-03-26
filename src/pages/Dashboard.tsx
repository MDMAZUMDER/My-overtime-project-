import { motion } from "motion/react";
import { useStrings } from "../hooks/useStrings";
import { useEffect, useState, useMemo } from "react";
import { StorageService } from "../services/storage";
import { UserProfile, OvertimeEntry } from "../types/app";
import { User, TrendingUp, Clock, DollarSign, Calendar, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { calculateTotalStats, getRecentSummary, getBarChartData, getPieChartData } from "../lib/calculations";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';

export default function Dashboard() {
  const STRINGS = useStrings();
  const [profile, setProfile] = useState<UserProfile | null>(StorageService.getProfile());
  const [entries, setEntries] = useState<OvertimeEntry[]>(StorageService.getEntries());
  const [chartFilter, setChartFilter] = useState<7 | 30 | 'month'>(7);
  const settings = StorageService.getSettings();

  useEffect(() => {
    const handleProfileChange = () => setProfile(StorageService.getProfile());
    const handleEntriesChange = () => setEntries(StorageService.getEntries());
    
    window.addEventListener("profileChanged", handleProfileChange);
    window.addEventListener("entriesChanged", handleEntriesChange);
    
    return () => {
      window.removeEventListener("profileChanged", handleProfileChange);
      window.removeEventListener("entriesChanged", handleEntriesChange);
    };
  }, []);

  const stats = useMemo(() => {
    return calculateTotalStats(entries, settings);
  }, [entries, settings]);

  const recentEntries = useMemo(() => {
    return getRecentSummary(entries, 7);
  }, [entries]);

  const barData = useMemo(() => {
    const days = chartFilter === 'month' ? 30 : chartFilter;
    return getBarChartData(entries, days);
  }, [entries, chartFilter]);

  const pieData = useMemo(() => {
    const days = chartFilter === 'month' ? 30 : chartFilter;
    const filtered = getRecentSummary(entries, days);
    return getPieChartData(filtered);
  }, [entries, chartFilter]);

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-20"
    >
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">{STRINGS.tabs.dashboard}</h1>
          <p className="text-sm text-on-surface-variant opacity-70">Welcome back!</p>
        </div>
        <Link to="/profile" className="flex items-center space-x-3 bg-surface-variant/50 p-2 pr-4 rounded-full border border-outline/10">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center overflow-hidden">
            {profile?.profilePhoto ? (
              <img src={profile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-on-primary-container opacity-40" />
            )}
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-on-surface leading-tight truncate max-w-[100px]">
              {profile?.fullName || "Guest"}
            </p>
            <p className="text-[10px] text-on-surface-variant opacity-60 truncate max-w-[100px]">
              {profile?.companyName || "No Company"}
            </p>
          </div>
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-primary-container p-5 rounded-3xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <TrendingUp className="w-4 h-4 text-primary opacity-40" />
          </div>
          <div>
            <p className="text-on-primary-container text-xs font-medium opacity-70">
              {STRINGS.dashboard.totalOvertime}
            </p>
            <p className="text-on-primary-container text-2xl font-bold">
              {stats.totalHours.toFixed(1)}h
            </p>
          </div>
        </div>
        <div className="bg-secondary-container p-5 rounded-3xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-secondary/10 rounded-xl">
              <DollarSign className="w-4 h-4 text-secondary" />
            </div>
            <TrendingUp className="w-4 h-4 text-secondary opacity-40" />
          </div>
          <div>
            <p className="text-on-secondary-container text-xs font-medium opacity-70">
              {STRINGS.dashboard.totalEarnings}
            </p>
            <p className="text-on-secondary-container text-2xl font-bold">
              {settings.overtime.currency} {stats.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-on-surface">Overtime Overview</h2>
          <div className="flex bg-surface-variant/50 p-1 rounded-xl border border-outline/5">
            {[7, 30].map((val) => (
              <button
                key={val}
                onClick={() => setChartFilter(val as any)}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  chartFilter === val ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant opacity-60"
                }`}
              >
                {val}D
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-surface-variant/30 border border-outline/10 p-4 rounded-3xl space-y-4">
            <h3 className="text-xs font-bold text-on-surface-variant opacity-60 uppercase tracking-wider">Daily Overtime Trend</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.4)' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.4)' }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  />
                  <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-surface-variant/30 border border-outline/10 p-4 rounded-3xl space-y-4">
            <h3 className="text-xs font-bold text-on-surface-variant opacity-60 uppercase tracking-wider">Overtime Distribution</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-on-surface">Recent (7 Days)</h2>
          <Link to="/reports" className="text-xs font-bold text-primary uppercase tracking-wider">View All</Link>
        </div>
        
        {recentEntries.length > 0 ? (
          <div className="space-y-3">
            {recentEntries.map((entry) => (
              <div key={entry.id} className="bg-surface-variant/30 border border-outline/10 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-surface rounded-xl">
                    <Calendar className="w-4 h-4 text-on-surface-variant opacity-60" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">
                      {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-[10px] text-on-surface-variant opacity-50">{entry.hours} hours</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">
                    {settings.overtime.currency} {(entry.hours * stats.hourlyRate).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface-variant/20 border border-dashed border-outline/30 p-10 rounded-[32px] flex flex-col items-center justify-center text-on-surface-variant/40 space-y-4 text-center">
            <div className="w-16 h-16 bg-surface-variant/50 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 opacity-20" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface opacity-60">No recent entries</p>
              <p className="text-xs opacity-40 mt-1">Start tracking your overtime today!</p>
            </div>
            <Link 
              to="/add" 
              className="px-6 py-2 bg-primary text-on-primary text-xs font-bold rounded-full shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              Add First Entry
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}
