import { Clock, TrendingUp } from "lucide-react";

interface LogoProps {
  className?: string;
  iconSize?: number;
  showText?: boolean;
  textSize?: string;
}

export default function Logo({ className = "", iconSize = 24, showText = true, textSize = "text-xl" }: LogoProps) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="relative">
        <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
          <Clock size={iconSize} className="text-white" />
        </div>
        <div className="absolute -bottom-1 -right-1 bg-secondary p-1 rounded-md shadow-md border-2 border-surface">
          <TrendingUp size={iconSize * 0.4} className="text-on-secondary" />
        </div>
      </div>
      {showText && (
        <h1 className={`${textSize} font-black tracking-tighter text-on-surface`}>
          OT <span className="text-primary">TRACKER</span>
        </h1>
      )}
    </div>
  );
}
