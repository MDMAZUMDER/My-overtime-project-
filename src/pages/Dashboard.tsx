import { useStrings } from "../hooks/useStrings";
import { useEffect, useState, useMemo } from "react";
import { StorageService } from "../services/storage";
import { UserProfile, OvertimeEntry } from "../types/app";
import { User, TrendingUp, Clock, Calendar as CalendarIcon, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { calculateTotalStats } from "../lib/calculations";
import Logo from "../components/Logo";
import { Tooltip } from "../components/ui/Tooltip";

export default function Dashboard() {
  const STRINGS = useStrings();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(StorageService.getProfile());
  const [entries, setEntries] = useState<OvertimeEntry[]>(StorageService.getEntries());
  const settings = StorageService.getSettings();

  useEffect(() => {
    const handleEntriesChange = () => setEntries(StorageService.getEntries());
    window.addEventListener("entriesChanged", handleEntriesChange);
    return () => window.removeEventListener("entriesChanged", handleEntriesChange);
  }, []);

  useEffect(() => {
    const handleProfileChange = () => setProfile(StorageService.getProfile());
    window.addEventListener("profileChanged", handleProfileChange);
    return () => window.removeEventListener("profileChanged", handleProfileChange);
  }, []);

  const stats = useMemo(() => {
    return calculateTotalStats(entries, settings);
  }, [entries, settings]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const recentEntries = useMemo(() => {
    return [...entries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4);
  }, [entries]);

  return (
    <div className="space-y-8 pb-24">
      <header className="flex items-center justify-between">
        <Logo iconSize={16} textSize="text-lg" />
        <Link to="/profile" className="flex items-center space-x-2 bg-surface-variant/50 p-1 pr-3 rounded-full border border-outline/10">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center overflow-hidden shrink-0">
            {profile?.profilePhoto ? (
              <img src={profile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-on-primary-container opacity-40" />
            )}
          </div>
          <div className="text-left min-w-0 max-w-[120px]">
            <p className="text-[10px] font-bold text-on-surface leading-tight truncate">
              {profile?.fullName || STRINGS.dashboard.guest}
            </p>
            <p className="text-[8px] text-on-surface-variant opacity-60 truncate">
              {profile?.designation || STRINGS.profile.employee}
            </p>
          </div>
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Tooltip content={STRINGS.dashboard.totalHours} position="bottom" className="w-full">
          <div className="bg-primary-container p-5 rounded-3xl shadow-sm space-y-2 w-full text-left">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <TrendingUp className="w-4 h-4 text-primary opacity-40" />
            </div>
            <div>
              <p className="text-on-primary-container text-xs font-medium opacity-70">
                {STRINGS.dashboard.totalHours}
              </p>
              <p className="text-on-primary-container text-2xl font-bold">
                {stats.totalHours.toFixed(1)}h
              </p>
            </div>
          </div>
        </Tooltip>
        <Tooltip content={STRINGS.dashboard.totalEarnings} position="bottom" className="w-full text-left">
          <div className="bg-secondary-container p-5 rounded-3xl shadow-sm space-y-2 w-full">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-secondary/10 rounded-xl flex items-center justify-center w-8 h-8 font-bold text-secondary text-sm">
                {settings.overtime.currency}
              </div>
              <TrendingUp className="w-4 h-4 text-secondary opacity-40" />
            </div>
            <div>
              <p className="text-on-secondary-container text-xs font-medium opacity-70">
                {STRINGS.dashboard.totalEarnings}
              </p>
              <p className="text-on-secondary-container text-2xl font-bold">
                 {stats.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </Tooltip>
      </div>

      {stats.hourlyRate === 0 && (
        <Link to="/settings/overtime" className="block bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center space-x-3">
          <div className="p-2 bg-amber-500/20 rounded-xl">
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-amber-500">{STRINGS.dashboard.rateNotSet}</p>
            <p className="text-[10px] text-amber-500/70">{STRINGS.dashboard.rateNotSetDesc}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-500" />
        </Link>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-on-surface">{STRINGS.dashboard.recentEntries}</h2>
          <Link to="/reports" className="text-xs font-bold text-primary uppercase tracking-wider">{STRINGS.dashboard.viewAll}</Link>
        </div>
        
        {recentEntries.length > 0 ? (
          <div className="space-y-3">
            {recentEntries.map((entry) => (
              <div key={entry.id} className="bg-surface-variant/30 border border-outline/10 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-surface rounded-xl">
                    <CalendarIcon className="w-4 h-4 text-on-surface-variant opacity-60" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">
                      {formatDate(entry.date)}
                    </p>
                    <p className="text-[10px] text-on-surface-variant opacity-50">{entry.hours} {STRINGS.dashboard.hours}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">
                    {settings.overtime.currency} {(entry.hours * (entry.rate || stats.hourlyRate)).toFixed(2)}
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
              <p className="text-sm font-bold text-on-surface opacity-60">{STRINGS.dashboard.noRecentEntries}</p>
              <p className="text-xs opacity-40 mt-1">{STRINGS.dashboard.startTracking}</p>
            </div>
            <Link 
              to="/add" 
              className="px-6 py-2 bg-primary text-on-primary text-xs font-bold rounded-full shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              {STRINGS.tabs.addEntry}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

