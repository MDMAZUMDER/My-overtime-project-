export interface UserProfile {
  fullName: string;
  companyName?: string;
  employeeId?: string;
  department?: string;
  designation?: string;
  joinDate?: string;
  profilePhoto?: string; // Base64 string
}

export interface OvertimeEntry {
  id: string;
  date: string; // ISO string (YYYY-MM-DD)
  hours: number;
  note?: string;
}

export type Language = 'bn' | 'en' | 'ar';
export type Currency = 'SAR' | 'BDT' | 'USD';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY';
export type WeekStart = 'Sunday' | 'Monday';
export type Theme = 'light' | 'dark';

export interface AppSettings {
  language: Language;
  notifications: {
    enabled: boolean;
    time: string; // HH:mm
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
    pin: string;
    biometricEnabled: boolean;
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
  },
  overtime: {
    hourlyRate: 0,
    currency: 'USD',
    basicSalary: 0,
    workingDaysPerMonth: 26,
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
    pin: '1234',
    biometricEnabled: false,
  },
  appearance: {
    theme: 'light',
  },
};
