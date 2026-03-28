import { Clock, TrendingUp } from "lucide-react";

interface LogoProps {
  className?: string;
  iconSize?: number;
  showText?: boolean;
  textSize?: string;
}

export default function Logo({ className = "", iconSize = 24, showText = true, textSize = "text-xl" }: LogoProps) {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="relative group transition-transform hover:scale-105 active:scale-95 duration-300">
        {/* Main Logo Container */}
        <div 
          className="rounded-2xl shadow-xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-primary to-primary-container"
          style={{ width: iconSize * 1.8, height: iconSize * 1.8 }}
        >
          <svg 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full p-2"
          >
            {/* Outer Ring */}
            <circle cx="50" cy="50" r="40" stroke="white" strokeWidth="8" strokeOpacity="0.2" />
            
            {/* Clock Hands */}
            <path d="M50 25V50L65 65" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            
            {/* Growth Arrow / OT Symbol */}
            <path 
              d="M70 30L85 15M85 15H75M85 15V25" 
              stroke="white" 
              strokeWidth="6" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="drop-shadow-sm"
            />
            
            {/* Center Dot */}
            <circle cx="50" cy="50" r="4" fill="white" />
          </svg>
        </div>
        
        {/* Accent Glow */}
        <div className="absolute inset-0 bg-primary blur-xl opacity-20 -z-10 group-hover:opacity-40 transition-opacity" />
      </div>

      {showText && (
        <div className="flex flex-col -space-y-1">
          <h1 className={`${textSize} font-black tracking-tighter text-on-surface flex items-center`}>
            OT
          </h1>
          <p className="text-[10px] font-bold tracking-[0.2em] text-on-surface-variant opacity-40 uppercase">
            Master Your Time
          </p>
        </div>
      )}
    </div>
  );
}
