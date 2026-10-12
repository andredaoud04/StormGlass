import React from 'react';
import { HeroDef, SkillDef, UnitDef } from '../types/game';
import { EnvironmentTheme, ThemedWall } from './ThemedWall';
import { Pause, Play } from 'lucide-react';

interface BattleHUDProps {
  battleStageNumber: number;
  goldEarnedThisBattle: number;
  totalGems: number;
  theme: EnvironmentTheme;
  food: number;
  foodRate: number;
  availableUnits: UnitDef[];
  onDeployUnit: (unit: UnitDef) => void;
  equippedHero: HeroDef | null;
  heroUsed: boolean;
  onDeployHero: () => void;
  equippedSkills: (SkillDef | null)[];
  skillCooldowns: { stasis: number; volley: number; rally: number };
  onActivateSkill: (skillId: 'stasis' | 'volley' | 'rally') => void;
  isPaused: boolean;
  onTogglePause: () => void;
  rushTimer?: number;
}

export const BattleHUD: React.FC<BattleHUDProps> = ({
  battleStageNumber,
  goldEarnedThisBattle,
  totalGems,
  theme,
  food,
  foodRate,
  availableUnits,
  onDeployUnit,
  equippedHero,
  heroUsed,
  onDeployHero,
  equippedSkills,
  skillCooldowns,
  onActivateSkill,
  isPaused,
  onTogglePause,
  rushTimer,
}) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return Math.floor(num).toString();
  };

  return (
    <div className="w-full flex flex-col justify-between select-none">
      {/* --- IN-BATTLE TOP HEADER BAR (Exact match to Image 1) --- */}
      <div className="flex items-center justify-between px-3 py-2 bg-stone-950/90 border-b-2 border-stone-800">
        {/* Gold Pill (Left) */}
        <div className="flex items-center gap-1.5 bg-stone-900 border-2 border-amber-600/80 rounded-lg px-2.5 py-1 shadow-md">
          {/* Gold Coin Icon */}
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 border border-amber-300 flex items-center justify-center shadow-inner">
            <span className="text-[10px] font-pixel text-amber-950 font-black">$</span>
          </div>
          <span className="font-pixel text-xs text-white font-bold tabular-nums">
            {formatNumber(goldEarnedThisBattle)}
          </span>
        </div>

        {/* Battle Stage Center Banner */}
        <div className="relative px-5 py-1 bg-gradient-to-b from-stone-800 to-stone-950 border-2 border-stone-600 rounded-lg shadow-lg flex items-center justify-center">
          <div className="font-pixel text-xs text-white font-black tracking-wider">
            {rushTimer !== undefined ? `Rush ${rushTimer.toFixed(0)}s` : `Battle ${battleStageNumber}`}
          </div>
        </div>

        {/* Right side: Gem Pill + Pause Button */}
        <div className="flex items-center gap-2">
          {/* Gem Pill */}
          <div className="flex items-center gap-1.5 bg-stone-900 border-2 border-blue-500/80 rounded-lg px-2.5 py-1 shadow-md">
            {/* Cyan Gem Diamond */}
            <div className="w-4 h-4 rotate-45 bg-gradient-to-br from-cyan-300 via-blue-500 to-indigo-700 border border-cyan-200 shadow-[0_0_6px_#38bdf8]" />
            <span className="font-pixel text-xs text-white font-bold tabular-nums">
              {formatNumber(totalGems)}
            </span>
          </div>

          {/* Square Pause Button */}
          <button
            onClick={onTogglePause}
            className="w-8 h-8 rounded-lg bg-stone-900 border-2 border-blue-600/70 hover:border-blue-400 flex items-center justify-center text-white shadow-md active:scale-95 transition-all"
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4 fill-white" />}
          </button>
        </div>
      </div>

      {/* --- THEMED FORTRESS BARRICADE WALL (Exact match to Image 1) --- */}
      <ThemedWall
        theme={theme}
        food={food}
        foodRate={foodRate}
        availableUnits={availableUnits}
        onDeployUnit={onDeployUnit}
        equippedHero={equippedHero}
        heroUsed={heroUsed}
        onDeployHero={onDeployHero}
        equippedSkills={equippedSkills}
        skillCooldowns={skillCooldowns}
        onActivateSkill={onActivateSkill}
      />
    </div>
  );
};
