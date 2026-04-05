import Logo from "./Logo";
import { useStrings } from "../hooks/useStrings";

export default function SplashScreen() {
  const STRINGS = useStrings();

  return (
    <div
      className="fixed inset-0 z-[100] bg-primary flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-24 -left-24 w-96 h-96 bg-white rounded-full blur-3xl opacity-10"
        />
        <div 
          className="absolute -bottom-24 -right-24 w-96 h-96 bg-secondary rounded-full blur-3xl opacity-10"
        />
      </div>

      <div
        className="relative"
      >
        <div className="relative z-10 bg-white/10 p-10 rounded-[48px] backdrop-blur-md border border-white/20 shadow-2xl">
          <Logo iconSize={80} showText={false} />
        </div>
        
        {/* Glow effect */}
        <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full -z-10 scale-75" />
      </div>

      <div
        className="mt-12 text-center relative z-10"
      >
        <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
          OverTime
        </h1>
        <div className="flex items-center justify-center space-x-2 mt-3">
          <div className="h-[1px] w-8 bg-white/30" />
          <p className="text-white/80 text-[10px] font-bold uppercase tracking-[0.3em]">{STRINGS.splash.tagline}</p>
          <div className="h-[1px] w-8 bg-white/30" />
        </div>
      </div>
      
      <div className="absolute bottom-16">
        <div className="flex space-x-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 bg-white rounded-full shadow-sm opacity-50"
            />
          ))}
        </div>
      </div>
    </div>
  );
}


