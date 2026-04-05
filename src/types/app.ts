export interface UserProfile {
  fullName: string;
  companyName?: string;
  employeeId?: string;
  department?: string;
  designation?: string;
  joinDate?: string;
  profilePhoto?: string; // Base64 string
  companyId?: string;
  role?: 'admin' | 'user';
}

export interface OvertimeEntry {
  id: string;
  date: string; // ISO string (YYYY-MM-DD)
  hours: number;
  note?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface HistoryEntry {
  id: string;
  startDate: string;
  endDate: string;
  totalHours: number;
  totalEarnings: number;
  entries: OvertimeEntry[];
  closedAt: string;
}

export type Language = 'bn' | 'en' | 'ar';
export type Currency = 'SAR';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY';
export type WeekStart = 'Sunday' | 'Monday';
export type Theme = 'light' | 'dark' | 'system';

export interface AppSettings {
  language: Language;
  notifications: {
    enabled: boolean;
    time: string; // HH:mm
    reminderMessage?: string;
  };
  overtime: {
    hourlyRate: number;
    currency: Currency;
    basicSalary: number;
    workingDaysPerMonth: number;
    workingHoursPerDay: number;
    useManualHourlyRate: boolean;
  };
  timeFormat: {
    use24h: boolean;
    dateFormat: DateFormat;
    weekStart: WeekStart;
  };
  security: {
    enabled: boolean;
  };
  appearance: {
    theme: Theme;
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  notifications: {
    enabled: false,
    time: '20:00',
    reminderMessage: '',
  },
  overtime: {
    hourlyRate: 0,
    currency: 'SAR',
    basicSalary: 0,
    workingDaysPerMonth: 30,
    workingHoursPerDay: 8,
    useManualHourlyRate: false,
  },
  timeFormat: {
    use24h: true,
    dateFormat: 'DD/MM/YYYY',
    weekStart: 'Monday',
  },
  security: {
    enabled: false,
  },
  appearance: {
    theme: 'system',
  },
};
