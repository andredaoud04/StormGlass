import React from 'react';
import { BattleSessionStats } from '../types/game';
import { RPGModalContainer, RPGInnerPanel, RPGStatRow, RPGButton } from './RPGModalFrame';
import { Coins, Skull, Trophy, RotateCcw, ArrowRight, ShieldCheck, Swords } from 'lucide-react';

interface VictoryDefeatModalProps {
  isVictory: boolean;
  battleType: 'campaign' | 'rush' | 'legends' | 'bosses' | 'survival' | 'hell';
  sessionStats: BattleSessionStats;
  onRetry: () => void;
  onContinue: () => void;
  onOpenUpgrades: () => void;
  onExit: () => void;
  // Survival cashout
  onCashoutSurvival?: () => void;
  carriedBaseHp?: number;
}

export const VictoryDefeatModal: React.FC<VictoryDefeatModalProps> = ({
  isVictory,
  battleType,
  sessionStats,
  onRetry,
  onContinue,
  onOpenUpgrades,
  onExit,
  onCashoutSurvival,
  carriedBaseHp,
}) => {
  const isSurvival = battleType === 'survival';
  const totalEnemiesDefeated = sessionStats.normalKills + sessionStats.tankKills;

  const getSubtitle = () => {
    if (isVictory) {
      if (battleType === 'rush') return 'Surviving the 45-second onslaught!';
      if (battleType === 'legends') return 'Chapter conquered! Rune point claimed!';
      if (battleType === 'bosses') return 'Gate Colossus crushed! Skill copy gained!';
      if (battleType === 'hell') return 'The Broker’s demonic legion purged!';
      return 'Enemy fortress base obliterated!';
    }
    return 'Your fortress has fallen. Regroup and upgrade!';
  };

  const bannerIcon = isVictory ? (
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 border-4 border-amber-200 flex items-center justify-center text-stone-950 shadow-[0_8px_20px_rgba(245,158,11,0.6),inset_0_2px_4px_rgba(255,255,255,0.8)]">
      <Trophy className="w-9 h-9 stroke-[2.2] drop-shadow" />
    </div>
  ) : (
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-red-600 via-red-800 to-stone-950 border-4 border-red-500 flex items-center justify-center text-white shadow-[0_8px_20px_rgba(220,38,38,0.6),inset_0_2px_4px_rgba(255,255,255,0.4)]">
      <Skull className="w-9 h-9 stroke-[2.2] drop-shadow" />
    </div>
  );

  return (
    <RPGModalContainer
      isOpen={true}
      variant={isVictory ? 'victory' : 'defeat'}
      hideCloseButton={true}
      maxWidth="max-w-sm"
      title={isVictory ? 'VICTORY!' : 'DEFEAT'}
      subtitle={getSubtitle()}
      icon={isVictory ? <Trophy className="w-5 h-5 text-amber-300" /> : <Skull className="w-5 h-5 text-red-300" />}
      headerBanner={bannerIcon}
    >
      <div className="space-y-3">
        {/* Battle Performance Stats Panel */}
        <RPGInnerPanel variant={isVictory ? 'amber' : 'red'}>
          <div className="text-[10px] font-pixel text-stone-400 mb-2 uppercase tracking-wider flex items-center justify-between">
            <span>BATTLE LOG RESULTS</span>
            <span className="text-stone-300 font-bold capitalize">{battleType}</span>
          </div>

          <div className="space-y-1.5">
            <RPGStatRow
              icon={<Skull className="w-4 h-4 text-stone-400" />}
              label="ENEMIES DEFEATED"
              value={totalEnemiesDefeated}
              valueColor="text-stone-100"
            />

            <RPGStatRow
              icon={<Coins className="w-4 h-4 text-amber-400" />}
              label="GOLD SECURED"
              value={`+${sessionStats.goldEarnedInBattle}`}
              highlight={true}
              valueColor="text-amber-300"
            />

            {isSurvival && isVictory && (
              <RPGStatRow
                icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
                label="BASE HP CARRIED"
                value={`${Math.ceil(carriedBaseHp || 0)} HP`}
                valueColor="text-emerald-300"
              />
            )}
          </div>

          {!isVictory && (
            <div className="text-[10px] text-emerald-400 font-pixel mt-2 pt-1.5 border-t border-stone-800/80 text-center">
              All combat gold earned is permanently kept!
            </div>
          )}
        </RPGInnerPanel>

        {/* Action Controls */}
        <div className="space-y-2 pt-1">
          {isVictory ? (
            isSurvival ? (
              <>
                <RPGButton
                  variant="gold"
                  size="md"
                  className="w-full"
                  icon={<ArrowRight className="w-4 h-4" />}
                  onClick={onContinue}
                >
                  CONTINUE SURVIVAL (RISK HP)
                </RPGButton>

                {onCashoutSurvival && (
                  <RPGButton
                    variant="green"
                    size="md"
                    className="w-full"
                    icon={<ShieldCheck className="w-4 h-4" />}
                    onClick={onCashoutSurvival}
                  >
                    CASH OUT & BANK REWARDS
                  </RPGButton>
                )}
              </>
            ) : (
              <RPGButton
                variant="gold"
                size="lg"
                className="w-full"
                icon={<ArrowRight className="w-5 h-5" />}
                onClick={onContinue}
              >
                CLAIM REWARDS & ADVANCE
              </RPGButton>
            )
          ) : (
            <>
              <RPGButton
                variant="red"
                size="md"
                className="w-full"
                icon={<RotateCcw className="w-4 h-4" />}
                onClick={onRetry}
              >
                RETRY BATTLE
              </RPGButton>

              <RPGButton
                variant="blue"
                size="md"
                className="w-full"
                icon={<Coins className="w-4 h-4 text-amber-300" />}
                onClick={onOpenUpgrades}
              >
                SPEND GOLD ON UPGRADES
              </RPGButton>

              <RPGButton
                variant="dark"
                size="sm"
                className="w-full"
                onClick={onExit}
              >
                RETURN TO CAMP
              </RPGButton>
            </>
          )}
        </div>
      </div>
    </RPGModalContainer>
  );
};
