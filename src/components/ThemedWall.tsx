import React from 'react';
import { HeroDef, SkillDef, UnitDef } from '../types/game';
import { UnitSprite } from './PixelSprites';
import { Crown, Snowflake, Flame, Wind, Plus } from 'lucide-react';

export type EnvironmentTheme = 'medieval' | 'desert' | 'ice' | 'hell';

interface ThemedWallProps {
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
}

export const ThemedWall: React.FC<ThemedWallProps> = ({
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
}) => {
  const themeStyles = getThemeBarricadeStyles(theme);

  const formatCompact = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return Math.floor(num).toString();
  };

  return (
    <div
      className={`relative w-full ${themeStyles.wallBg} border-t-4 ${themeStyles.wallBorder} p-2 sm:p-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] select-none shadow-[0_-8px_20px_rgba(0,0,0,0.8)] shrink-0 z-20`}
    >
      {/* Decorative environment elements on top of the wall matching reference image */}
      {renderWallAccents(theme)}

      {/* --- UPPER ROW: HERO (LEFT) + 3 SKILLS (RIGHT) --- */}
      <div className="flex items-center justify-between mb-2 sm:mb-2.5 px-1 sm:px-2 pt-1">
        {/* Raised Hero Circle on Left with Crown Ornament */}
        <div className="relative flex flex-col items-center">
          {/* Golden Crown Ornament perched on top-left of Hero Circle */}
          <div className="absolute -top-2 -left-1 z-20 pointer-events-none drop-shadow-md">
            <Crown className="w-5 h-5 text-amber-400 fill-amber-300 stroke-amber-700" />
          </div>

          {equippedHero ? (
            <button
              onClick={onDeployHero}
              disabled={heroUsed}
              title={equippedHero.name}
              aria-label={`Deploy ${equippedHero.name}`}
              className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-4 flex items-center justify-center transition-all ${
                heroUsed
                  ? 'border-stone-700 bg-stone-900 opacity-50 cursor-not-allowed'
                  : 'border-amber-400 bg-gradient-to-b from-blue-700 via-stone-900 to-amber-950 shadow-[0_0_14px_rgba(245,158,11,0.6)] hover:scale-105 active:scale-95 cursor-pointer'
              }`}
            >
              {equippedHero.id === 'crusader_champion' ? (
                <UnitSprite unitId={equippedHero.id} size={38} />
              ) : (
                <div className="flex flex-col items-center justify-center gap-0.5" aria-hidden="true">
                  <Crown className="w-5 h-5 text-amber-200" />
                  <span className="font-pixel text-[5px] text-amber-100">{equippedHero.id === 'iron_marshal' ? 'IRON' : 'NOVA'}</span>
                </div>
              )}
              {/* Golden Status / Readiness Bar underneath */}
              <div className="absolute -bottom-2 w-9 sm:w-11 h-2 bg-stone-950 rounded-full border border-stone-700 p-0.5 overflow-hidden shadow">
                <div
                  className={`h-full ${heroUsed ? 'bg-stone-600' : 'bg-gradient-to-r from-amber-400 to-yellow-300'} rounded-full transition-all`}
                  style={{ width: heroUsed ? '0%' : '100%' }}
                />
              </div>
            </button>
          ) : (
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-4 border-stone-700 bg-gradient-to-b from-stone-800 to-stone-950 flex items-center justify-center shadow-inner">
              <Crown className="w-5 h-5 text-stone-600" />
              {/* Golden Status placeholder bar */}
              <div className="absolute -bottom-2 w-9 sm:w-11 h-2 bg-stone-950 rounded-full border border-stone-800" />
            </div>
          )}
        </div>

        {/* 3 Raised Skill Circles on Right */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {[0, 1, 2].map((slotIdx) => {
            const skill = equippedSkills[slotIdx];
            if (!skill) {
              return (
                <div
                  key={`empty-${slotIdx}`}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-3 border-stone-700 bg-gradient-to-b from-stone-800 via-stone-900 to-stone-950 flex items-center justify-center shadow-inner"
                >
                  <Plus className="w-4 h-4 text-stone-600" />
                </div>
              );
            }

            const cd = skillCooldowns[skill.id] || 0;
            const isOnCd = cd > 0;

            return (
              <button
                key={skill.id}
                onClick={() => onActivateSkill(skill.id)}
                disabled={isOnCd}
                className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full border-3 sm:border-4 flex items-center justify-center transition-all cursor-pointer ${
                  isOnCd
                    ? 'border-stone-700 bg-stone-900 opacity-60 cursor-not-allowed'
                    : getSkillBorderGlow(skill.id)
                }`}
              >
                {renderSkillIcon(skill.id)}
                {isOnCd && (
                  <div className="absolute inset-0 rounded-full bg-black/75 flex items-center justify-center">
                    <span className="font-pixel text-[10px] text-white font-black">
                      {Math.ceil(cd)}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* --- LOWER ROW: FOOD CARD (LEFT) + 3 TROOP DEPLOYMENT CARDS (CENTER/RIGHT) --- */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Food Status Card with Golden Wheat Sheaf */}
        <div
          className={`w-[92px] sm:w-28 h-[76px] sm:h-[88px] rounded-xl border-2 ${themeStyles.cardBorder} ${themeStyles.cardBg} p-2 flex flex-col justify-between shadow-lg shrink-0`}
        >
          <div className="flex items-center gap-1.5">
            <WheatIcon className="w-5 h-5" />
            <span className="font-pixel text-xs sm:text-sm font-black text-amber-200 tabular-nums drop-shadow-sm">
              {formatCompact(food)}
            </span>
          </div>
          <div className="font-pixel text-[9px] sm:text-[10px] text-cyan-400 font-bold tabular-nums">
            +{foodRate.toFixed(1)}/s
          </div>
        </div>

        {/* 3 Troop Cards (Slots 1, 2, 3) matching illustrated reference cards */}
        <div className="flex-1 grid grid-cols-3 gap-1.5 sm:gap-2">
          {[0, 1, 2].map((slotIdx) => {
            const unit = availableUnits[slotIdx];

            if (!unit) {
              return (
                <div
                  key={`empty-unit-${slotIdx}`}
                  className="h-[84px] sm:h-[92px] rounded-xl border-2 border-stone-800 bg-stone-950/80 flex items-center justify-center shadow-inner"
                >
                  <Plus className="w-5 h-5 text-stone-600" />
                </div>
              );
            }

            const canAfford = food >= unit.cost;
            const progress = Math.min(1, food / unit.cost);

            return (
              <button
                key={unit.id}
                onClick={() => onDeployUnit(unit)}
                disabled={!canAfford}
                className={`relative h-[84px] sm:h-[92px] rounded-xl border-2 flex flex-col items-center justify-between p-1 transition-all overflow-hidden cursor-pointer ${
                  canAfford
                    ? 'border-blue-500 bg-gradient-to-b from-blue-900/70 via-blue-950/90 to-stone-950 shadow-[0_4px_10px_rgba(37,99,235,0.35)] hover:border-blue-400 active:scale-95'
                    : 'border-stone-800 bg-stone-950/80 opacity-60 cursor-not-allowed'
                }`}
              >
                {/* Visual Fill Progress Overlay */}
                <div
                  className="absolute bottom-0 left-0 right-0 bg-blue-500/20 pointer-events-none transition-all duration-100"
                  style={{ height: `${progress * 100}%` }}
                />

                {/* Troop Sprite Portrait */}
                <div className="relative z-10 w-8 h-8 flex items-center justify-center mt-0.5">
                  <UnitSprite unitId={unit.id} size={32} />
                </div>

                {/* Cost Pill Badge at bottom with Wheat Icon + Number */}
                <div className="relative z-10 w-full bg-stone-950/90 border border-amber-600/50 rounded py-0.5 flex items-center justify-center gap-1 font-pixel text-[9px] sm:text-[10px] text-amber-300 font-bold shadow-inner">
                  <WheatIcon className="w-3 h-3" />
                  <span>{unit.cost}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Golden Wheat Sheaf SVG Icon matching reference art
function WheatIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path d="M4 21 16 9" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M6 13l2-2 1.5 1.5a3 3 0 0 1 0 4.2L8 18l-2-2a3 3 0 0 1 0-4.2Z"
        fill="#f59e0b"
        stroke="#b45309"
        strokeWidth="1"
      />
      <path
        d="M10 9l2-2 1.5 1.5a3 3 0 0 1 0 4.2L12 14l-2-2a3 3 0 0 1 0-4.2Z"
        fill="#fbbf24"
        stroke="#d97706"
        strokeWidth="1"
      />
      <path
        d="M14 5l2-2 1.5 1.5a3 3 0 0 1 0 4.2L16 10l-2-2a3 3 0 0 1 0-4.2Z"
        fill="#fef08a"
        stroke="#d97706"
        strokeWidth="1"
      />
    </svg>
  );
}

function renderSkillIcon(skillId: string) {
  switch (skillId) {
    case 'stasis':
      return (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-cyan-950 flex items-center justify-center shadow-[0_0_12px_#38bdf8]">
          <Snowflake className="w-5 h-5 text-cyan-300 animate-spin-slow" />
        </div>
      );
    case 'volley':
      return (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-950 flex items-center justify-center shadow-[0_0_12px_#ef4444]">
          <Flame className="w-5 h-5 text-orange-400 animate-pulse" />
        </div>
      );
    case 'rally':
    default:
      return (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-950 flex items-center justify-center shadow-[0_0_12px_#f59e0b]">
          <Wind className="w-5 h-5 text-amber-300" />
        </div>
      );
  }
}

function getSkillBorderGlow(skillId: string) {
  switch (skillId) {
    case 'stasis':
      return 'border-cyan-400 bg-slate-900 shadow-[0_0_14px_rgba(56,189,248,0.8)] hover:scale-105 active:scale-95';
    case 'volley':
      return 'border-orange-500 bg-slate-900 shadow-[0_0_14px_rgba(249,115,22,0.8)] hover:scale-105 active:scale-95';
    case 'rally':
    default:
      return 'border-amber-400 bg-slate-900 shadow-[0_0_14px_rgba(245,158,11,0.8)] hover:scale-105 active:scale-95';
  }
}

function getThemeBarricadeStyles(theme: EnvironmentTheme) {
  switch (theme) {
    case 'medieval':
      return {
        wallBg: 'bg-gradient-to-b from-stone-800 via-stone-900 to-stone-950',
        wallBorder: 'border-stone-700',
        cardBg: 'bg-stone-950/90',
        cardBorder: 'border-stone-700',
      };
    case 'desert':
      return {
        wallBg: 'bg-gradient-to-b from-amber-900 via-amber-950 to-stone-950',
        wallBorder: 'border-amber-800',
        cardBg: 'bg-stone-950/90',
        cardBorder: 'border-amber-700',
      };
    case 'ice':
      return {
        wallBg: 'bg-gradient-to-b from-slate-700 via-slate-900 to-slate-950',
        wallBorder: 'border-cyan-800',
        cardBg: 'bg-slate-950/90',
        cardBorder: 'border-cyan-700',
      };
    case 'hell':
      return {
        wallBg: 'bg-gradient-to-b from-stone-800 via-stone-950 to-black',
        wallBorder: 'border-red-900',
        cardBg: 'bg-stone-950/90',
        cardBorder: 'border-red-800',
      };
  }
}

function renderWallAccents(theme: EnvironmentTheme) {
  switch (theme) {
    case 'medieval':
      return (
        <div className="absolute -top-3.5 left-0 right-0 flex justify-between px-3 pointer-events-none">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-0 h-0 border-x-4 border-x-transparent border-b-6 border-b-amber-800" />
              <div className="w-2.5 h-2 bg-amber-900 border-x border-amber-950" />
            </div>
          ))}
        </div>
      );
    case 'desert':
      return (
        <div className="absolute -top-3 left-0 right-0 flex justify-between px-3 pointer-events-none">
          <div className="w-4 h-4 rounded-sm bg-amber-700/80 border border-amber-950" />
          <div className="w-12 h-3 bg-gradient-to-b from-amber-500 to-amber-900 border-x border-b border-stone-900 rounded-b shadow-sm" />
          <div className="w-4 h-4 rounded-sm bg-amber-700/80 border border-amber-950" />
        </div>
      );
    case 'ice':
      return (
        <div className="absolute -top-3 left-0 right-0 flex justify-between px-2.5 pointer-events-none">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-3 h-1 bg-cyan-100 rounded-t border-t border-cyan-300" />
              <div className="w-0.5 h-3 bg-cyan-200/90 shadow-[0_0_4px_#38bdf8]" />
            </div>
          ))}
        </div>
      );
    case 'hell':
      return (
        <div className="absolute -top-3 left-0 right-0 flex justify-between px-3 pointer-events-none">
          <div className="w-0 h-0 border-x-4 border-x-transparent border-b-6 border-b-stone-900" />
          <div className="w-14 h-1.5 bg-gradient-to-r from-orange-600 via-red-500 to-orange-600 rounded-full animate-pulse shadow-[0_0_8px_#ef4444]" />
          <div className="w-0 h-0 border-x-4 border-x-transparent border-b-6 border-b-stone-900" />
        </div>
      );
  }
}
