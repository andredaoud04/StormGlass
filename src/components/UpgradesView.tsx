import React, { useState } from 'react';
import { AgeId, PlayerProfile, UnitDef } from '../types/game';
import { AGES, getAgeDef, getAgeIndex, getBaseFoodRate, getFoodUpgradeCost, getBaseUpgradeCost } from '../data/gameData';
import { UnitSprite } from './PixelSprites';
import { LOADOUT_SLOTS, eligibleTroops, normalizeLoadout } from '../logic/loadout';
import { ArrowUpCircle, Sparkles, Lock, Check, Shield, Wheat, ArrowRight, Zap, Crown } from 'lucide-react';

interface UpgradesViewProps {
  profile: PlayerProfile;
  onUpgradeFood: () => void;
  onUpgradeBase: () => void;
  onUnlockTroop: (unit: UnitDef) => void;
  onEvolveAge: () => void;
  onPrestige: () => void;
  onSetLoadoutSlot: (slot: number, unitId: string) => void;
}

/**
 * Compact three-slot battle loadout (SG-PROGRESS / 1.1.2). Only owned current or
 * immediately previous Age troops are shown. When more than three are eligible,
 * tap an equipped troop to pick the slot to replace, then tap a reserve troop.
 */
const LoadoutSelector: React.FC<{ profile: PlayerProfile; onSetSlot: (slot: number, unitId: string) => void }> = ({ profile, onSetSlot }) => {
  const eligible = eligibleTroops(profile);
  const loadout = normalizeLoadout(profile);
  const [targetSlotRaw, setTargetSlot] = useState(LOADOUT_SLOTS - 1);
  const targetSlot = Math.min(targetSlotRaw, Math.max(0, loadout.length - 1));
  const canSwap = eligible.length > LOADOUT_SLOTS;
  // One row when everything fits; otherwise one row per Army Age (current, then previous).
  const rows = canSwap
    ? [eligible.filter((u) => u.ageId === profile.armyAge), eligible.filter((u) => u.ageId !== profile.armyAge)].filter((r) => r.length > 0)
    : [eligible];

  return (
    <div className="mt-2 rounded-xl border-2 border-stone-700 bg-gradient-to-b from-stone-900 via-stone-950 to-black p-1.5 shadow-md" data-testid="loadout-selector">
      <div className="flex items-center justify-between mb-2 px-0.5 gap-2">
        <span className="font-pixel text-[10px] text-amber-300 font-bold tracking-wider uppercase whitespace-nowrap">Battle Loadout</span>
        <span className="font-pixel text-[8px] text-stone-400 truncate min-w-0">
          {canSwap ? `Tap a troop to fill slot ${targetSlot + 1}` : `${loadout.length}/${LOADOUT_SLOTS} · all owned equipped`}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-3 gap-1.5">
            {row.map((unit) => {
              const slot = loadout.indexOf(unit.id);
              const equipped = slot >= 0;
              const isTarget = canSwap && equipped && slot === targetSlot;
              return (
                <button
                  key={unit.id}
                  type="button"
                  disabled={!canSwap}
                  aria-pressed={equipped}
                  aria-label={equipped ? `${unit.name}, slot ${slot + 1}` : `Equip ${unit.name} in slot ${targetSlot + 1}`}
                  onClick={() => (equipped ? setTargetSlot(slot) : onSetSlot(targetSlot, unit.id))}
                  className={`relative min-w-0 min-h-[44px] rounded-lg border-2 pl-1 pr-1 py-1 flex items-center gap-1 transition-all ${canSwap ? 'cursor-pointer active:scale-95' : 'cursor-default'} ${
                    equipped
                      ? isTarget
                        ? 'border-amber-400 bg-amber-950/50 ring-1 ring-amber-300/60'
                        : 'border-emerald-500/80 bg-emerald-950/40'
                      : 'border-stone-700 bg-stone-900/60 opacity-75 hover:opacity-100'
                  }`}
                >
                  {equipped && (
                    <span className={`absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full font-pixel text-[9px] font-black flex items-center justify-center border ${
                      isTarget ? 'bg-amber-400 text-stone-950 border-amber-200' : 'bg-emerald-500 text-stone-950 border-emerald-200'
                    }`}>{slot + 1}</span>
                  )}
                  <span className="shrink-0"><UnitSprite unitId={unit.id} size={30} /></span>
                  <span className="min-w-0 flex flex-col items-start leading-tight">
                    <span className="max-w-full font-pixel text-[9px] text-stone-100 font-bold truncate">{unit.name}</span>
                    <span className="font-pixel text-[8px] text-amber-400/90">{unit.cost} 🌾</span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export const UpgradesView: React.FC<UpgradesViewProps> = ({
  profile,
  onUpgradeFood,
  onUpgradeBase,
  onUnlockTroop,
  onEvolveAge,
  onPrestige,
  onSetLoadoutSlot,
}) => {
  const currentAge = getAgeDef(profile.armyAge);
  const currentAgeIdx = getAgeIndex(profile.armyAge);
  const nextAge = currentAgeIdx < AGES.length - 1 ? AGES[currentAgeIdx + 1] : null;

  const foodCost = getFoodUpgradeCost(profile.foodLevel);
  const baseCost = getBaseUpgradeCost(profile.baseLevel);
  const canAffordFood = profile.gold >= foodCost;
  const canAffordBase = profile.gold >= baseCost;

  const currentFoodRate = getBaseFoodRate(profile.foodLevel);
  const nextFoodRate = getBaseFoodRate(profile.foodLevel + 1);

  // Era cleared check
  const hasClearedEra = profile.clearedEnemyStages.includes(currentAge.eraNumber);
  const evolveCost = hasClearedEra ? 0 : currentAge.evolveCostGold;
  const canAffordEvolve = profile.gold >= evolveCost;

  const isFutureAge = profile.armyAge === 'future';
  const hasClearedFuture = profile.clearedEnemyStages.includes(6);

  return (
    <div className="w-full flex-1 flex flex-col justify-between bg-stone-950 p-2.5 sm:p-3 select-none overflow-hidden">
      {/* ======================================================== */}
      {/* 1. TOP: THREE HORIZONTAL UNIT CARDS [UNIT 1] [UNIT 2] [UNIT 3] */}
      {/* ======================================================== */}
      <div>
        <div className="flex items-center justify-between mb-1.5 px-0.5">
          <span className="font-pixel text-[10px] sm:text-[11px] text-amber-300 font-bold tracking-wider uppercase">
            {currentAge.name} Units
          </span>
          <span className="font-pixel text-[9px] text-stone-400">
            Gold: <span className="text-amber-400 font-bold">{profile.gold}</span>
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {currentAge.units.slice(0, 3).map((unit) => {
            const isUnlocked = profile.unlockedTroopIds.includes(unit.id) || unit.unlockCostGold === 0;
            const canAffordUnlock = profile.gold >= unit.unlockCostGold;

            return (
              <div
                key={unit.id}
                className={`rounded-xl border-2 p-1.5 flex flex-col items-center justify-between transition-all shadow-md ${
                  isUnlocked
                    ? 'border-blue-600/80 bg-gradient-to-b from-blue-950/70 via-stone-900/90 to-stone-950'
                    : 'border-stone-800 bg-stone-900/50 opacity-80'
                }`}
              >
                {/* Unit Sprite Artwork */}
                <div className="w-12 h-12 rounded-lg bg-stone-900/90 border border-stone-800 flex items-center justify-center my-0.5 shadow-inner">
                  <UnitSprite unitId={unit.id} size={40} />
                </div>

                {/* Unit Name & Role */}
                <div className="text-center w-full my-0.5">
                  <div className="font-pixel text-[10px] sm:text-[11px] text-stone-100 font-bold truncate">
                    {unit.name}
                  </div>
                  <div className="text-[8px] sm:text-[9px] text-amber-400 font-pixel uppercase font-semibold">
                    {unit.role} · {unit.cost} 🌾
                  </div>
                </div>

                {/* Stats Info */}
                <div className="w-full bg-stone-950/80 border border-stone-800/80 rounded py-0.5 px-1 my-1 flex justify-between text-[8px] sm:text-[9px] font-pixel text-stone-300">
                  <span>HP {unit.hp}</span>
                  <span>ATK {unit.damage}</span>
                </div>

                {/* Purchase / Unlocked Action */}
                {isUnlocked ? (
                  <div className="w-full py-1 rounded-md bg-emerald-950/60 border border-emerald-600/60 text-emerald-400 font-pixel text-[9px] font-bold flex items-center justify-center gap-1 shadow-sm">
                    <Check className="w-3 h-3 stroke-[2.5]" />
                    <span>UNLOCKED</span>
                  </div>
                ) : (
                  <button
                    onClick={() => onUnlockTroop(unit)}
                    disabled={!canAffordUnlock}
                    className={`w-full py-1 rounded-md font-pixel text-[9px] font-bold transition-all shadow-md active:scale-95 cursor-pointer ${
                      canAffordUnlock
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950'
                        : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                    }`}
                  >
                    UNLOCK ({unit.unlockCostGold}G)
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <LoadoutSelector profile={profile} onSetSlot={onSetLoadoutSlot} />
      </div>

      {/* ======================================================== */}
      {/* 2. MIDDLE: HORIZONTAL [FOOD PRODUCTION] [BASE HEALTH] */}
      {/* ======================================================== */}
      <div className="my-1.5 sm:my-2">
        <div className="grid grid-cols-2 gap-2">
          {/* Panel 1: Food Production */}
          <div className="rounded-xl border-2 border-amber-600/70 bg-gradient-to-b from-amber-950/50 via-stone-900/90 to-stone-950 p-2 sm:p-2.5 flex flex-col justify-between shadow-md">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0">
                <Wheat className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-pixel text-[10px] sm:text-[11px] text-amber-300 font-bold truncate">
                  FOOD PRODUCTION
                </div>
                <div className="text-[9px] text-stone-400 font-pixel">
                  Lvl {profile.foodLevel}
                </div>
              </div>
            </div>

            <div className="bg-stone-950/80 border border-stone-800 rounded p-1 my-1 flex justify-between items-center text-[9px] font-pixel">
              <span className="text-stone-400">Rate:</span>
              <span className="text-amber-300 font-bold">+{currentFoodRate.toFixed(2)}/s</span>
            </div>

            <button
              onClick={onUpgradeFood}
              disabled={!canAffordFood}
              className={`w-full py-1.5 rounded-lg font-pixel text-[10px] font-bold flex items-center justify-center gap-1 transition-all shadow-md active:scale-95 cursor-pointer ${
                canAffordFood
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
              }`}
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              <span>UPGRADE ({foodCost}G)</span>
            </button>
          </div>

          {/* Panel 2: Base Health */}
          <div className="rounded-xl border-2 border-blue-600/70 bg-gradient-to-b from-blue-950/50 via-stone-900/90 to-stone-950 p-2 sm:p-2.5 flex flex-col justify-between shadow-md">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-400 shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-pixel text-[10px] sm:text-[11px] text-blue-300 font-bold truncate">
                  BASE HEALTH
                </div>
                <div className="text-[9px] text-stone-400 font-pixel">
                  Lvl {profile.baseLevel}
                </div>
              </div>
            </div>

            <div className="bg-stone-950/80 border border-stone-800 rounded p-1 my-1 flex justify-between items-center text-[9px] font-pixel">
              <span className="text-stone-400">Bonus:</span>
              <span className="text-blue-300 font-bold">+{(profile.baseLevel - 1) * 12}% HP</span>
            </div>

            <button
              onClick={onUpgradeBase}
              disabled={!canAffordBase}
              className={`w-full py-1.5 rounded-lg font-pixel text-[10px] font-bold flex items-center justify-center gap-1 transition-all shadow-md active:scale-95 cursor-pointer ${
                canAffordBase
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 text-white'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
              }`}
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              <span>UPGRADE ({baseCost}G)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. BOTTOM: EVOLUTION (Fits in viewport without scrolling) */}
      {/* ======================================================== */}
      <div className="rounded-xl border-2 border-stone-700 bg-gradient-to-b from-stone-900 via-stone-950 to-black p-2 sm:p-2.5 shadow-xl">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="font-pixel text-[10px] sm:text-[11px] text-white font-black tracking-wider">
              ARMY EVOLUTION
            </span>
          </div>

          <div className="font-pixel text-[9px] text-stone-400">
            Era {currentAge.eraNumber}/6
          </div>
        </div>

        {nextAge ? (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 font-pixel text-[10px] text-stone-200">
                <span className="text-amber-300 font-bold">{currentAge.name}</span>
                <ArrowRight className="w-3 h-3 text-stone-500 shrink-0" />
                <span className="text-emerald-400 font-bold truncate">{nextAge.name}</span>
              </div>
              <div className="text-[9px] text-stone-400 font-pixel mt-0.5">
                {hasClearedEra ? (
                  <span className="text-emerald-400 font-bold">Era fortress defeated: FREE Evolve!</span>
                ) : (
                  <span>Cost: {evolveCost} Gold</span>
                )}
              </div>
            </div>

            <button
              onClick={onEvolveAge}
              disabled={!canAffordEvolve}
              className={`px-3 py-2 rounded-lg font-pixel text-[10px] sm:text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer whitespace-nowrap ${
                canAffordEvolve
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-stone-950'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
              }`}
            >
              {hasClearedEra ? 'EVOLVE (FREE)' : `EVOLVE (${evolveCost}G)`}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-pixel text-[10px] text-amber-300 font-bold">
                FUTURE AGE REACHED (MAX ERA)
              </div>
              <div className="text-[9px] text-stone-400 font-pixel">
                {hasClearedFuture ? 'Timeline Cleared! Ready to Prestige.' : 'Defeat Future Fortress to unlock Prestige.'}
              </div>
            </div>

            {hasClearedFuture && (
              <button
                onClick={onPrestige}
                className="px-3 py-2 rounded-lg font-pixel text-[10px] sm:text-xs font-bold bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-300 text-stone-950 shadow-[0_0_12px_rgba(245,158,11,0.6)] hover:brightness-110 active:scale-95 cursor-pointer flex items-center gap-1"
              >
                <Crown className="w-3.5 h-3.5 text-stone-950" />
                <span>PRESTIGE</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
