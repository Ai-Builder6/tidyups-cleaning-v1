import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  withText?: boolean;
  theme?: 'dark' | 'light';
  projectId?: 'dispatchgeeni' | 'tidyups';
}

export const BookMyCleaningLogo: React.FC<LogoProps> = ({
  className = '',
  size = 36,
  withText = true,
  theme = 'light',
  projectId = 'dispatchgeeni',
}) => {
  const isTidyups = projectId === 'tidyups';
  const brandTitle = isTidyups ? 'TidyUps Operations' : 'Dispatch Genie';
  const brandBadge = isTidyups ? 'Official' : 'Pro';
  const brandDomain = isTidyups ? 'app.tidyupscleaning.com' : 'dispatchgeeni.com';
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Icon Squircle Motif */}
      <div 
        className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#120e18] to-[#251636] border border-fuchsia-500/30 shadow-sm flex-shrink-0 group overflow-hidden"
        style={{ width: size, height: size }}
      >
        {/* Glow backdrop */}
        <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/20 via-fuchsia-500/30 to-purple-600/20 opacity-90 group-hover:opacity-100 transition-opacity" />
        
        {/* SVG Sparkle Icon */}
        <svg 
          viewBox="0 0 200 200" 
          className="relative z-10 w-3/4 h-3/4 drop-shadow-[0_2px_8px_rgba(236,72,153,0.5)]" 
          fill="none"
        >
          <defs>
            <linearGradient id="logoStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF7B54" />
              <stop offset="50%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          <path 
            d="M100 30 C100 68.6 68.6 100 30 100 C68.6 100 100 131.4 100 170 C100 131.4 131.4 100 170 100 C131.4 100 100 68.6 100 30 Z" 
            fill="url(#logoStarGrad)" 
          />
          <circle cx="145" cy="52" r="13" fill="#ec4899" opacity="0.85" />
          <circle cx="55" cy="148" r="9" fill="#a855f7" opacity="0.75" />
          <circle cx="100" cy="100" r="10" fill="#ffffff" opacity="0.9" />
        </svg>
      </div>

      {/* Typography */}
      {withText && (
        <div className="flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-extrabold tracking-tight text-sm sm:text-base ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              {brandTitle}
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider border ${
              isTidyups
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                : 'bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-pink-600 border-pink-500/20'
            }`}>
              {brandBadge}
            </span>
          </div>
          <span className={`text-[10px] font-medium tracking-tight ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
          }`}>
            {brandDomain}
          </span>
        </div>
      )}
    </div>
  );
};
