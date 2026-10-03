import React from 'react';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  variant?: 'floating' | 'inline' | 'navbar';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'floating' }) => {
  const { theme, toggleTheme, isLight } = useTheme();

  if (variant === 'navbar') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 ${
          isLight
            ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 shadow-amber-200/50'
            : 'bg-[#1C2541] text-[#D4AF37] border-[#D4AF37]/30 hover:border-[#D4AF37] hover:bg-[#253256]'
        }`}
        title={isLight ? 'Switch to Night Theme (Dark)' : 'Switch to Day Theme (Light)'}
        aria-label="Toggle Theme"
      >
        {isLight ? (
          <>
            <Sun className="w-4 h-4 text-amber-600 animate-spin-slow" />
            <span className="text-[11px] font-extrabold text-slate-800 hidden md:inline">Day</span>
          </>
        ) : (
          <>
            <Moon className="w-4 h-4 text-amber-300" />
            <span className="text-[11px] font-extrabold text-amber-200 hidden md:inline">Night</span>
          </>
        )}
      </button>
    );
  }

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
          isLight
            ? 'bg-white text-slate-800 border-slate-300 hover:border-amber-400 shadow-sm'
            : 'bg-slate-900 text-slate-200 border-slate-700 hover:border-[#D4AF37]'
        }`}
      >
        {isLight ? (
          <>
            <Sun className="w-4 h-4 text-amber-500" />
            <span>Day Mode</span>
          </>
        ) : (
          <>
            <Moon className="w-4 h-4 text-amber-300" />
            <span>Night Mode</span>
          </>
        )}
      </button>
    );
  }

  // Floating side widget (default)
  return (
    <div className="fixed right-2 sm:right-3 top-1/2 -translate-y-1/2 z-[9990] flex flex-col items-center">
      <button
        type="button"
        onClick={toggleTheme}
        className={`group relative flex flex-col items-center gap-1.5 p-2 rounded-2xl border backdrop-blur-md shadow-2xl transition-all duration-300 cursor-pointer active:scale-95 hover:scale-105 ${
          isLight
            ? 'bg-white/95 text-slate-900 border-amber-400/80 shadow-[0_10px_25px_rgba(217,119,6,0.25)]'
            : 'bg-[#0B132B]/95 text-[#D4AF37] border-[#D4AF37]/50 shadow-[0_10px_25px_rgba(0,0,0,0.8)]'
        }`}
        title={isLight ? 'Switch to Night Dark Theme (رات کا منظر)' : 'Switch to Day Light Theme (دن کا روشن منظر)'}
        aria-label="Day or Night Mode Toggle"
      >
        {/* Glowing aura */}
        <div
          className={`absolute -inset-0.5 rounded-2xl blur-xs opacity-75 group-hover:opacity-100 transition-opacity ${
            isLight ? 'bg-gradient-to-b from-amber-300 to-orange-400' : 'bg-gradient-to-b from-amber-500 to-yellow-600'
          }`}
        />

        {/* Icon & Label Container */}
        <div className="relative z-10 flex flex-col items-center">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 ${
              isLight ? 'bg-amber-100 text-amber-700 rotate-180' : 'bg-[#1C2541] text-amber-300 rotate-0'
            }`}
          >
            {isLight ? (
              <Sun className="w-4.5 h-4.5 text-amber-600 drop-shadow" />
            ) : (
              <Moon className="w-4.5 h-4.5 text-amber-300 drop-shadow" />
            )}
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider mt-1 px-1 py-0.5 rounded text-center">
            {isLight ? 'Day' : 'Night'}
          </span>
        </div>

        {/* Tooltip on hover */}
        <div className="absolute right-full mr-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          <div className="px-2.5 py-1 bg-slate-950 text-white border border-[#D4AF37]/50 rounded-xl text-[10px] font-bold shadow-xl flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#D4AF37]" />
            <span>{isLight ? 'Switch to Night Mode (Dark)' : 'Switch to Day Mode (Light)'}</span>
          </div>
        </div>
      </button>
    </div>
  );
};
