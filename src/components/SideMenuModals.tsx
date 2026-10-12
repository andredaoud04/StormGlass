import React, { useState, useRef } from 'react';
import { PlayerProfile } from '../types/game';
import { sound } from '../services/sound';
import { RPGModalContainer, RPGInnerPanel, RPGButton } from './RPGModalFrame';
import { Scroll, Shield, Settings, Volume2, VolumeX, Check, Sparkles } from 'lucide-react';

interface ModalProps {
  profile: PlayerProfile;
  onClose: () => void;
  onUpdateProfile: (updater: (prev: PlayerProfile) => PlayerProfile) => void;
}

// 1. MISSIONS MODAL
export const MissionsModal: React.FC<ModalProps> = ({ profile, onClose, onUpdateProfile }) => {
  const missions = [
    { id: 'm2', text: 'Reach Food Level 2 or higher', rewardGems: 30, progress: profile.foodLevel, goal: 2 },
    { id: 'm3', text: 'Destroy 1 Enemy Fortress Base', rewardGems: 50, progress: profile.clearedEnemyStages.length, goal: 1 },
    { id: 'm4', text: 'Unlock Slinger or Archer in Upgrades', rewardGems: 40, progress: profile.unlockedTroopIds.length, goal: 2 },
  ];

  const handleClaim = (id: string, gems: number) => {
    const mission = missions.find((m) => m.id === id);
    if (!mission || mission.progress < mission.goal || profile.claimedMissionIds.includes(id)) return;
    sound.playCoin();
    onUpdateProfile((prev) => prev.claimedMissionIds.includes(id) ? prev : ({
      ...prev, gems: prev.gems + gems,
      claimedMissionIds: [...prev.claimedMissionIds, id],
    }));
  };

  return (
    <RPGModalContainer
      onClose={onClose}
      theme={profile.armyAge}
      title="MILESTONES"
      subtitle="Complete quests for valuable gems"
      icon={<Scroll className="w-5 h-5 text-amber-300" />}
      maxWidth="max-w-sm"
    >
      <div className="space-y-2">
        {missions.map((m) => {
          const isCompleted = m.progress >= m.goal;
          const isClaimed = profile.claimedMissionIds.includes(m.id);

          return (
            <RPGInnerPanel
              key={m.id}
              variant={isCompleted && !isClaimed ? 'amber' : 'stone'}
              className="flex items-center justify-between p-2.5"
            >
              <div className="pr-2 min-w-0">
                <div className="text-xs text-stone-200 font-semibold truncate">{m.text}</div>
                <div className="text-[10px] text-stone-400 font-pixel mt-0.5">
                  Progress: {Math.min(m.goal, m.progress)}/{m.goal}
                </div>
              </div>

              <div className="shrink-0">
                {isClaimed ? (
                  <span className="font-pixel text-[10px] text-stone-400 flex items-center gap-1 bg-black/40 px-2 py-1 rounded border border-stone-800">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>CLAIMED</span>
                  </span>
                ) : (
                  <RPGButton
                    variant={isCompleted ? 'gold' : 'dark'}
                    size="sm"
                    disabled={!isCompleted}
                    onClick={() => handleClaim(m.id, m.rewardGems)}
                  >
                    +{m.rewardGems} 💎
                  </RPGButton>
                )}
              </div>
            </RPGInnerPanel>
          );
        })}
      </div>
    </RPGModalContainer>
  );
};

// 2. LUCKY SPIN WHEEL MODAL
export const SpinWheelModal: React.FC<ModalProps> = ({ profile, onClose, onUpdateProfile }) => {
  const [spinning, setSpinning] = useState(false);
  const [wonPrize, setWonPrize] = useState<string | null>(null);
  const spinLockRef = useRef(false);
  const todayUtc = new Date().toISOString().slice(0, 10);
  const alreadySpunToday = profile.lastDailySpinDate === todayUtc;

  const prizes = [
    { text: '50 GEMS', type: 'gems', amount: 50 },
    { text: '1 KEY', type: 'keys', amount: 1 },
    { text: '25 GEMS', type: 'gems', amount: 25 },
    { text: '15 GEMS', type: 'gems', amount: 15 },
    { text: '2 KEYS', type: 'keys', amount: 2 },
    { text: '3 KEYS', type: 'keys', amount: 3 },
    { text: '80 GEMS', type: 'gems', amount: 80 },
    { text: '1 RUNE PT', type: 'rune', amount: 1 },
  ];

  const handleSpin = () => {
    if (spinning || spinLockRef.current || alreadySpunToday) return;
    spinLockRef.current = true;
    setSpinning(true);
    sound.playChestOpen();

    setTimeout(() => {
      const idx = Math.floor(Math.random() * prizes.length);
      const prize = prizes[idx];
      setWonPrize(prize.text);
      setSpinning(false);
      spinLockRef.current = false;
      sound.playVictory();

      onUpdateProfile((prev) => {
        if (prev.lastDailySpinDate === todayUtc) return prev;
        const stamped = { ...prev, lastDailySpinDate: todayUtc };
        if (prize.type === 'gems') return { ...stamped, gems: prev.gems + prize.amount };
        if (prize.type === 'keys') return { ...stamped, keys: prev.keys + prize.amount };
        if (prize.type === 'rune') return { ...stamped, runePoints: prev.runePoints + prize.amount };
        return stamped;
      });
    }, 2000);
  };

  return (
    <RPGModalContainer
      onClose={onClose}
      theme={profile.armyAge}
      title="LUCKY SPIN"
      subtitle="Free daily prize wheel"
      icon={<Shield className="w-5 h-5 text-amber-300" />}
      maxWidth="max-w-sm"
    >
      <div className="flex flex-col items-center text-center">
        {/* Wheel Graphic */}
        <div
          className={`relative w-36 h-36 sm:w-40 sm:h-40 rounded-full border-4 border-amber-500 bg-stone-950 flex items-center justify-center my-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] ${
            spinning ? 'animate-spin' : ''
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-amber-400 border-2 border-stone-950 z-10 shadow-md" />
          <div className="absolute inset-2 rounded-full border-2 border-dashed border-amber-600/60" />
          <span className="font-pixel text-[10px] text-amber-300 font-black">SPIN</span>
        </div>

        {wonPrize && (
          <RPGInnerPanel variant="amber" className="my-2 py-1.5 px-4 animate-bounce">
            <span className="font-pixel text-xs text-amber-300 font-bold">
              WON: {wonPrize}!
            </span>
          </RPGInnerPanel>
        )}

        <RPGButton
          variant="gold"
          size="md"
          className="w-full mt-2"
          disabled={spinning || alreadySpunToday}
          onClick={handleSpin}
        >
          {spinning ? 'SPINNING...' : alreadySpunToday ? 'COME BACK TOMORROW' : 'FREE DAILY SPIN!'}
        </RPGButton>
      </div>
    </RPGModalContainer>
  );
};

// 3. SETTINGS MODAL
export const SettingsModal: React.FC<{
  profile: PlayerProfile;
  onClose: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
}> = ({ profile, onClose, soundOn, onToggleSound }) => {
  return (
    <RPGModalContainer
      onClose={onClose}
      theme={profile.armyAge}
      title="SETTINGS"
      subtitle="Game configuration"
      icon={<Settings className="w-5 h-5 text-stone-300" />}
      maxWidth="max-w-sm"
    >
      <div className="space-y-3">
        <RPGInnerPanel variant="stone" className="flex items-center justify-between p-3">
          <span className="font-pixel text-xs text-stone-200">SOUND EFFECTS</span>
          <RPGButton
            variant={soundOn ? 'gold' : 'dark'}
            size="sm"
            onClick={onToggleSound}
            icon={soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          >
            {soundOn ? 'ON' : 'OFF'}
          </RPGButton>
        </RPGInnerPanel>

        <div className="text-[10px] text-stone-400 text-center font-pixel pt-2 border-t border-stone-800/80">
          STORMGLASS · WE ARE WARRIORS RPG EDITION
        </div>
      </div>
    </RPGModalContainer>
  );
};
