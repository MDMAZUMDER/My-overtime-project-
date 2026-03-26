import { motion } from "motion/react";
import { User, Globe, Bell, DollarSign, Shield, Database, ChevronRight, Palette, Clock } from "lucide-react";
import { useStrings } from "../hooks/useStrings";
import { Link } from "react-router-dom";

export default function Settings() {
  const STRINGS = useStrings();
  const menuItems = [
    { icon: User, label: STRINGS.settings.profile, to: "/profile" },
    { icon: Globe, label: STRINGS.settings.language, to: "/settings/language" },
    { icon: Bell, label: STRINGS.settings.notifications, to: "/settings/notifications" },
    { icon: DollarSign, label: STRINGS.settings.overtimeRate, to: "/settings/overtime" },
    { icon: Clock, label: "Time & Format", to: "/settings/time-format" },
    { icon: Shield, label: STRINGS.settings.security, to: "/settings/security" },
    { icon: Database, label: STRINGS.settings.dataManagement, to: "/settings/data-management" },
    { icon: Palette, label: STRINGS.settings.appearance, to: "/settings/appearance" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <header>
        <h1 className="text-2xl font-bold text-on-surface">{STRINGS.tabs.settings}</h1>
      </header>

      {/* TODO: Implement settings logic (theme switching, language selection, etc.) */}
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

      <div className="text-center pt-4">
        <p className="text-xs text-on-surface-variant opacity-50">Version 1.0.0 (Alpha)</p>
      </div>
    </motion.div>
  );
}
