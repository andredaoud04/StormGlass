import React from 'react';
import { Pause, Play, LogOut } from 'lucide-react';
import { formatCompactNumber } from '../logic/formatNumber';

interface BattleHeaderProps {
  battleStageNumber: number;
  goldEarnedThisBattle: number;
  totalGems: number;
  isPaused: boolean;
  onTogglePause: () => void;
  onRetreatClick?: () => void;
  rushTimer?: number;
}

export const BattleHeader: React.FC<BattleHeaderProps> = ({
  battleStageNumber,
  goldEarnedThisBattle,
  totalGems,
  isPaused,
  onTogglePause,
  onRetreatClick,
  rushTimer,
}) => {
  return (
    <header className="w-full flex items-center justify-between px-2.5 py-1.5 bg-stone-950/95 border-b-2 border-stone-800 select-none z-30 shrink-0">
      {/* Gold Counter Pill (Left) matching reference image */}
      <div className="shrink-0 flex items-center gap-1.5 bg-stone-900 border-2 border-amber-500 rounded-md px-2 py-0.5 shadow-md">
        <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 border border-amber-300 flex items-center justify-center shadow-inner shrink-0">
          <span className="text-[9px] font-pixel text-amber-950 font-black">$</span>
        </div>
        <span className="font-pixel text-[11px] text-white font-bold tabular-nums whitespace-nowrap">
          {formatCompactNumber(goldEarnedThisBattle)}
        </span>
      </div>

      {/* Battle Stage Center Plaque matching reference image */}
      <div className="shrink-0 px-3 py-1 bg-gradient-to-b from-stone-800 via-stone-900 to-stone-950 border-2 border-stone-600 rounded-md shadow-[0_2px_4px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.15)] flex items-center justify-center">
        <span className="font-pixel text-xs sm:text-sm text-white font-black tracking-wider whitespace-nowrap drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          {rushTimer !== undefined ? `Rush ${rushTimer.toFixed(0)}s` : `Battle ${battleStageNumber}`}
        </span>
      </div>

      {/* Right side: Gem Counter Pill + Pause Button + Retreat Button */}
      <div className="shrink-0 flex items-center gap-1.5">
        {/* Gem Pill */}
        <div className="flex items-center gap-1.5 bg-stone-900 border-2 border-blue-500 rounded-md px-2 py-0.5 shadow-md">
          <div className="w-3 h-3 rotate-45 bg-gradient-to-br from-cyan-300 via-blue-500 to-indigo-700 border border-cyan-200 shadow-[0_0_6px_#38bdf8] shrink-0" />
          <span className="font-pixel text-[11px] text-white font-bold tabular-nums whitespace-nowrap">
            {formatCompactNumber(totalGems)}
          </span>
        </div>

        {/* Square Pause Button */}
        <button
          onClick={onTogglePause}
          className="w-7 h-7 rounded-md bg-stone-900 border-2 border-blue-600 hover:border-blue-400 flex items-center justify-center text-white shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
          title={isPaused ? 'Resume' : 'Pause'}
          aria-label={isPaused ? 'Resume Battle' : 'Pause Battle'}
        >
          {isPaused ? <Play className="w-3.5 h-3.5 fill-white" /> : <Pause className="w-3.5 h-3.5 fill-white" />}
        </button>

        {/* Square Unobtrusive Retreat Button */}
        <button
          onClick={onRetreatClick}
          className="w-7 h-7 rounded-md bg-stone-900 border-2 border-red-700/80 hover:border-red-500 flex items-center justify-center text-red-300 shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
          title="Retreat from Battle"
          aria-label="Retreat from Battle"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
