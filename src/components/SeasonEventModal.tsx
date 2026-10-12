import React, { useState } from 'react';
import { PlayerProfile } from '../types/game';
import { sound } from '../services/sound';
import { RPGModalContainer, RPGInnerPanel, RPGButton } from './RPGModalFrame';
import { Flag, Trophy, Check, Sparkles, Gem, Key, Award, Timer } from 'lucide-react';

interface SeasonEventModalProps {
  profile: PlayerProfile;
  onClose: () => void;
  onUpdateProfile: (updater: (prev: PlayerProfile) => PlayerProfile) => void;
}

export const SeasonEventModal: React.FC<SeasonEventModalProps> = ({
  profile,
  onClose,
  onUpdateProfile,
}) => {
  const [claimedTiers, setClaimedTiers] = useState<Record<number, boolean>>({});

  // Season tiers based on campaign stages cleared
  const tiers = [
    {
      tier: 1,
      name: 'First Blood',
      reqStages: 1,
      rewardText: '+50 Gems',
      rewardType: 'gems',
      rewardAmount: 50,
    },
    {
      tier: 2,
      name: 'Bronze Dominance',
      reqStages: 2,
      rewardText: '+1 Dungeon Key',
      rewardType: 'keys',
      rewardAmount: 1,
    },
    {
      tier: 3,
      name: 'Crusader Vanguard',
      reqStages: 3,
      rewardText: '+100 Gems',
      rewardType: 'gems',
      rewardAmount: 100,
    },
    {
      tier: 4,
      name: 'Industrial Revolution',
      reqStages: 4,
      rewardText: '+1 Rune Point',
      rewardType: 'runes',
      rewardAmount: 1,
    },
    {
      tier: 5,
      name: 'Future Sovereign',
      reqStages: 6,
      rewardText: '+250 Gems · Conqueror Crest',
      rewardType: 'gems',
      rewardAmount: 250,
    },
  ];

  const stagesCleared = profile.clearedEnemyStages.length;

  const handleClaim = (tierNum: number, type: string, amount: number) => {
    sound.playVictory();
    setClaimedTiers((prev) => ({ ...prev, [tierNum]: true }));
    onUpdateProfile((prev) => {
      if (type === 'gems') return { ...prev, gems: prev.gems + amount };
      if (type === 'keys') return { ...prev, keys: prev.keys + amount };
      if (type === 'runes') return { ...prev, runePoints: prev.runePoints + amount };
      return prev;
    });
  };

  return (
    <RPGModalContainer
      onClose={onClose}
      theme="crusader"
      title="SEASON 1: AGE OF CONQUEST"
      subtitle="Limited Event · 14 Days Remaining"
      icon={<Flag className="w-5 h-5 text-red-400" />}
      maxWidth="max-w-md"
    >
      <div className="space-y-3">
        {/* Season Banner Header */}
        <RPGInnerPanel variant="amber" className="flex items-center justify-between p-2.5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-red-600/20 border border-red-500/50 flex items-center justify-center text-red-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="font-pixel text-xs text-amber-200 font-bold">
                CAMPAIGN CONQUEST PASS
              </div>
              <div className="text-[10px] text-stone-400">
                Clear Era Bosses in Battle to unlock rewards
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="font-pixel text-xs text-amber-300 font-bold">
              {stagesCleared}/6 Cleared
            </span>
          </div>
        </RPGInnerPanel>

        {/* Milestone Progression List */}
        <div className="space-y-2 max-h-60 overflow-y-auto p-0.5">
          {tiers.map((t) => {
            const isUnlocked = stagesCleared >= t.reqStages;
            const isClaimed = claimedTiers[t.tier];

            return (
              <RPGInnerPanel
                key={t.tier}
                variant={isUnlocked && !isClaimed ? 'amber' : 'stone'}
                className="flex items-center justify-between p-2"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-stone-900 border border-stone-700 flex items-center justify-center font-pixel text-xs text-stone-300 font-bold">
                    T{t.tier}
                  </div>
                  <div>
                    <div className="font-pixel text-[11px] text-stone-200 font-bold">
                      {t.name}
                    </div>
                    <div className="text-[9px] text-stone-400 font-pixel">
                      Requires {t.reqStages} Era Clears ({Math.min(stagesCleared, t.reqStages)}/{t.reqStages})
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-pixel text-[10px] text-amber-300 font-bold">
                    {t.rewardText}
                  </span>

                  {isClaimed ? (
                    <span className="font-pixel text-[9px] text-stone-400 flex items-center gap-1 bg-black/40 px-2 py-1 rounded border border-stone-800">
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>CLAIMED</span>
                    </span>
                  ) : (
                    <RPGButton
                      variant={isUnlocked ? 'gold' : 'dark'}
                      size="sm"
                      disabled={!isUnlocked}
                      onClick={() => handleClaim(t.tier, t.rewardType, t.rewardAmount)}
                    >
                      {isUnlocked ? 'CLAIM' : 'LOCKED'}
                    </RPGButton>
                  )}
                </div>
              </RPGInnerPanel>
            );
          })}
        </div>
      </div>
    </RPGModalContainer>
  );
};
