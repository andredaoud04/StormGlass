import React, { useState } from 'react';
import { PlayerProfile } from '../types/game';
import { UnitSprite } from './PixelSprites';
import { RPGModalContainer, RPGInnerPanel, RPGButton } from './RPGModalFrame';
import { Flame, AlertTriangle, Trophy } from 'lucide-react';

interface HomeBaseModalProps {
  profile: PlayerProfile;
  onClose: () => void;
  onStartHellSiege: (stakeGold: number, rewardGems: number, rewardRunes: number) => void;
}

export const HomeBaseModal: React.FC<HomeBaseModalProps> = ({
  profile,
  onClose,
  onStartHellSiege,
}) => {
  const [showBrokerDeal, setShowBrokerDeal] = useState(false);


  return (
    <RPGModalContainer
      onClose={onClose}
      theme={profile.armyAge}
      title="CITADEL HOME BASE"
      subtitle={`Timeline ${profile.timeline} · Sanctuary across all Eras`}
      icon={<Trophy className="w-5 h-5 text-amber-400" />}
      maxWidth="max-w-md"
    >
      <div>
        {/* Camp Visual Showcase */}
        <div className="relative h-40 rounded-xl bg-gradient-to-b from-stone-950 via-slate-900 to-amber-950/60 border-2 border-stone-800 overflow-hidden mb-3 p-2 flex items-end justify-around shadow-inner">
          {/* Campfire in center */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="w-6 h-6 rounded-full bg-amber-500/40 animate-ping absolute -top-1" />
            <Flame className="w-7 h-7 text-amber-500 animate-pulse relative z-10" />
            <div className="w-8 h-2 bg-stone-950 rounded-full" />
          </div>

          {/* Patrolling Hero if unlocked */}
          {profile.heroesUnlocked.length > 0 ? (
            <div className="flex flex-col items-center z-10">
              <UnitSprite unitId="crusader_champion" size={50} isWalking />
              <span className="font-pixel text-[8px] text-amber-300 mt-1">
                HERO PATROL
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center z-10 opacity-70">
              <UnitSprite unitId="stone_clubber" size={40} isWalking />
              <span className="font-pixel text-[8px] text-stone-400 mt-1">
                VANGUARD
              </span>
            </div>
          )}

          {/* Mysterious Broker NPC */}
          <div
            onClick={() => setShowBrokerDeal(true)}
            className="flex flex-col items-center z-10 cursor-pointer group"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-red-950/70 border-2 border-red-500/60 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_12px_rgba(239,68,68,0.6)]">
                <Flame className="w-5 h-5 text-red-400" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping" />
            </div>
            <span className="font-pixel text-[8px] text-red-400 mt-1 group-hover:text-red-300">
              THE BROKER
            </span>
          </div>
        </div>

        {/* Broker High-Stakes Deal Dialog */}
        {showBrokerDeal ? (
          <RPGInnerPanel variant="red" className="mb-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-red-400 font-pixel text-xs font-bold mb-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>THE BROKER'S HELL SIEGE</span>
            </div>

            <p className="text-xs text-stone-200 leading-relaxed mb-3">
              The Broker is preparing an optional Hell Siege. Risk limits, rewards and recovery rules are not finalized; this challenge cannot take any of your resources yet.
            </p>

            <div className="flex items-center justify-between text-[11px] font-pixel text-stone-300 bg-stone-950/90 border border-stone-800 p-2 rounded-lg mb-3">
              <div>
                <span className="text-emerald-400 font-bold">NO RESOURCES AT RISK</span>
              </div>
              <div>
                <span className="text-stone-400">COMING SOON</span>
              </div>
            </div>

            <div className="flex gap-2">
              <RPGButton
                variant="red"
                size="md"
                className="flex-1"
                disabled
              >
                CHALLENGE NOT YET AVAILABLE
              </RPGButton>
              <RPGButton
                variant="dark"
                size="md"
                onClick={() => setShowBrokerDeal(false)}
              >
                DECLINE
              </RPGButton>
            </div>
          </RPGInnerPanel>
        ) : (
          <RPGInnerPanel variant="stone" className="text-center p-3">
            <div className="font-pixel text-xs text-amber-300 font-bold mb-1">
              CAMP STATUS: SECURED
            </div>
            <p className="text-xs text-stone-400">
              Tap the mysterious Broker above to review optional high-stakes Hell Siege challenges.
            </p>
          </RPGInnerPanel>
        )}
      </div>
    </RPGModalContainer>
  );
};
