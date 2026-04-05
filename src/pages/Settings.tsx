import { useState } from "react";
import { User, Globe, Bell, Shield, Database, ChevronRight, Clock, Sun, Moon, SunMoon, ArrowLeft } from "lucide-react";
import { useStrings } from "../hooks/useStrings";
import { Link, useNavigate } from "react-router-dom";
import { StorageService } from "../services/storage";
import { Theme } from "../types/app";

const RiyalIcon = ({ className }: { className?: string }) => (
  <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
    ﷼
  </div>
);

export default function Settings() {
  const STRINGS = useStrings();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(StorageService.getSettings());

  const toggleTheme = () => {
    const themes: Theme[] = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(settings.appearance.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];

    const newSettings = {
      ...settings,
      appearance: { ...settings.appearance, theme: nextTheme }
    };
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
  };

  const getThemeIcon = () => {
    switch (settings.appearance.theme) {
      case "light": return <Sun className="w-5 h-5" />;
      case "dark": return <Moon className="w-5 h-5" />;
      case "system": return <SunMoon className="w-5 h-5" />;
      default: return <SunMoon className="w-5 h-5" />;
    }
  };

  const menuItems = [
    { icon: User, label: STRINGS.settings.profile, to: "/profile" },
    { icon: Globe, label: STRINGS.settings.language, to: "/settings/language" },
    { icon: Bell, label: STRINGS.settings.notifications, to: "/settings/notifications" },
    { icon: RiyalIcon, label: STRINGS.settings.overtimeRate, to: "/settings/overtime" },
    { icon: Clock, label: STRINGS.settings.timeFormat, to: "/settings/time-format" },
    { icon: Shield, label: STRINGS.settings.security, to: "/settings/security" },
    { icon: Database, label: STRINGS.settings.dataManagement, to: "/settings/data-management" },
  ];

  return (
    <div className="space-y-6 pb-20">
      <header className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant hover:text-primary transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-on-surface">{STRINGS.tabs.settings}</h1>
        </div>
        <button
          onClick={toggleTheme}
          className="p-3 bg-surface-variant/50 border border-outline/10 rounded-2xl text-primary hover:bg-primary/5 transition-all relative group"
          title={settings.appearance.theme}
        >
          <div key={settings.appearance.theme}>
            {getThemeIcon()}
          </div>
          <span className="absolute top-full right-0 mt-2 px-2 py-1 bg-surface border border-outline rounded-lg text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-xl">
            {settings.appearance.theme}
          </span>
        </button>
      </header>

      <div className="bg-surface-variant/30 rounded-3xl border border-outline/10 overflow-hidden">
        {menuItems.map((item, index) => (
          <Link
            key={index}
            to={item.to}
            className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors border-b border-outline/5 last:border-0"
          >
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-primary/10 rounded-xl">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium text-on-surface">{item.label}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-outline" />
          </Link>
        ))}
      </div>

      <div className="text-center pt-8 pb-4 space-y-1">
        <p className="text-xs text-on-surface-variant opacity-30 font-medium">{STRINGS.settings.version} 1.2.0</p>
        <p className="text-[10px] text-on-surface-variant opacity-40">
          {STRINGS.settings.developedBy} <a href="https://www.facebook.com/share/1StfHpX9MC/" target="_blank" rel="noopener noreferrer" className="text-primary font-bold hover:underline">MASUM</a>
        </p>
      </div>
    </div>
  );
}
