import React, { useState } from 'react';
import { PlayerProfile } from '../types/game';
import { sound } from '../services/sound';
import { Coins, Sparkles, Tv, Check, Zap, Gem, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { RPGInnerPanel, RPGButton, RPGModalContainer } from './RPGModalFrame';

interface ShopViewProps {
  profile: PlayerProfile;
  onUpdateProfile: (updater: (prev: PlayerProfile) => PlayerProfile) => void;
}

export const ShopView: React.FC<ShopViewProps> = ({ profile, onUpdateProfile }) => {
  // Rewarded Ad state
  const [activeAdReward, setActiveAdReward] = useState<{ type: 'gems' | 'gold'; amount: number } | null>(null);
  const [adSecondsRemaining, setAdSecondsRemaining] = useState(5);
  const [adSuccessMessage, setAdSuccessMessage] = useState<string | null>(null);

  // Currency Store Packs
  const goldPacks = [
    { id: 'gold_small', name: 'Handful of Gold', goldAmount: 250, gemCost: 30, icon: '🪙' },
    { id: 'gold_med', name: 'Chest of Gold', goldAmount: 1000, gemCost: 100, icon: '💰' },
    { id: 'gold_large', name: 'Royal Vault of Gold', goldAmount: 5000, gemCost: 400, icon: '👑' },
  ];

  const gemPacks = [
    { id: 'gem_small', name: 'Pouch of Gems', gemAmount: 120, tag: 'POPULAR', icon: '💎' },
    { id: 'gem_med', name: 'Treasury Chest', gemAmount: 350, tag: 'BEST VALUE', icon: '💎' },
    { id: 'gem_large', name: 'Mountain of Gems', gemAmount: 1200, tag: 'MEGA PACK', icon: '✨' },
  ];

  // Start Rewarded Ad
  const handleStartRewardedAd = (type: 'gems' | 'gold', amount: number) => {
    sound.playChestOpen();
    setActiveAdReward({ type, amount });
    setAdSecondsRemaining(5);

    const interval = setInterval(() => {
      setAdSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleCompleteRewardedAd(type, amount);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCompleteRewardedAd = (type: 'gems' | 'gold', amount: number) => {
    sound.playVictory();
    onUpdateProfile((prev) => {
      if (type === 'gems') return { ...prev, gems: prev.gems + amount };
      return { ...prev, gold: prev.gold + amount };
    });
    setAdSuccessMessage(`Received +${amount} ${type === 'gems' ? 'Gems 💎' : 'Gold 🪙'}!`);
    setTimeout(() => {
      setActiveAdReward(null);
      setAdSuccessMessage(null);
    }, 1500);
  };

  // Buy Gold with Gems
  const handleBuyGoldWithGems = (goldAmount: number, gemCost: number) => {
    if (profile.gems < gemCost) return;
    sound.playCoin();
    onUpdateProfile((prev) => ({
      ...prev,
      gems: prev.gems - gemCost,
      gold: prev.gold + goldAmount,
    }));
  };

  // Buy Gem Pack
  const handleClaimGemPack = (gemAmount: number) => {
    sound.playCoin();
    onUpdateProfile((prev) => ({
      ...prev,
      gems: prev.gems + gemAmount,
    }));
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-stone-950 p-3 select-none overflow-y-auto">
      {/* Rewarded Ad Video Overlay Modal */}
      {activeAdReward && (
        <RPGModalContainer
          isOpen={true}
          onClose={() => {}}
          hideCloseButton={true}
          title="SPONSOR BROADCAST"
          subtitle="Support the kingdom for free currency"
          icon={<Tv className="w-5 h-5 text-amber-400" />}
          maxWidth="max-w-xs"
        >
          <div className="flex flex-col items-center text-center p-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 border-2 border-cyan-400 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(56,189,248,0.5)]">
              <Tv className="w-8 h-8 text-white animate-pulse" />
            </div>

            {adSuccessMessage ? (
              <div className="font-pixel text-sm text-emerald-400 font-bold animate-bounce my-2">
                {adSuccessMessage}
              </div>
            ) : (
              <>
                <div className="font-pixel text-xs text-stone-200 font-bold mb-1">
                  Playing Sponsor Message...
                </div>
                <div className="font-pixel text-2xl text-amber-300 font-black tabular-nums my-2">
                  {adSecondsRemaining}s
                </div>
                <div className="text-[10px] text-stone-400 font-pixel">
                  Reward on completion: +{activeAdReward.amount} {activeAdReward.type === 'gems' ? 'Gems' : 'Gold'}
                </div>
              </>
            )}
          </div>
        </RPGModalContainer>
      )}

      {/* Header Info */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <div className="font-pixel text-xs text-amber-300 font-bold tracking-wide">
            CURRENCY EXCHANGE
          </div>
          <div className="text-[10px] text-stone-400">
            Replenish Gold and Gems for battle upgrades
          </div>
        </div>

        <div className="flex items-center gap-2 font-pixel text-[11px]">
          <span className="text-amber-400 font-bold tabular-nums">🪙 {profile.gold}</span>
          <span className="text-cyan-400 font-bold tabular-nums">💎 {profile.gems}</span>
        </div>
      </div>

      <div className="space-y-3 flex-1">
        {/* ======================================================== */}
        {/* 1. REWARDED ADVERTISEMENTS SECTION */}
        {/* ======================================================== */}
        <div>
          <div className="font-pixel text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 px-1">
            <Tv className="w-3.5 h-3.5" />
            <span>FREE REWARDED SPONSORS</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Ad 1: Free Gems */}
            <RPGInnerPanel variant="amber" className="flex flex-col justify-between p-2.5">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-6 h-6 rounded bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-xs">
                    💎
                  </div>
                  <div className="font-pixel text-[10px] text-stone-100 font-bold">
                    FREE GEMS
                  </div>
                </div>
                <div className="text-[9px] text-stone-400 font-pixel mb-2">
                  Watch 5s ad for free gems
                </div>
              </div>

              <RPGButton
                variant="gold"
                size="sm"
                className="w-full"
                onClick={() => handleStartRewardedAd('gems', 45)}
                icon={<Tv className="w-3 h-3" />}
              >
                +45 GEMS
              </RPGButton>
            </RPGInnerPanel>

            {/* Ad 2: Free Gold */}
            <RPGInnerPanel variant="stone" className="flex flex-col justify-between p-2.5">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-6 h-6 rounded bg-amber-600/30 border border-amber-500/50 flex items-center justify-center text-xs">
                    🪙
                  </div>
                  <div className="font-pixel text-[10px] text-stone-100 font-bold">
                    FREE GOLD
                  </div>
                </div>
                <div className="text-[9px] text-stone-400 font-pixel mb-2">
                  Watch 5s ad for war gold
                </div>
              </div>

              <RPGButton
                variant="stone"
                size="sm"
                className="w-full text-amber-300"
                onClick={() => handleStartRewardedAd('gold', 250)}
                icon={<Tv className="w-3 h-3" />}
              >
                +250 GOLD
              </RPGButton>
            </RPGInnerPanel>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. GOLD EXCHANGE (PURCHASE GOLD WITH GEMS) */}
        {/* ======================================================== */}
        <div>
          <div className="font-pixel text-[10px] text-stone-300 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 px-1">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>WAR GOLD BUNDLES</span>
          </div>

          <div className="space-y-1.5">
            {goldPacks.map((pack) => {
              const canAfford = profile.gems >= pack.gemCost;

              return (
                <RPGInnerPanel
                  key={pack.id}
                  variant="stone"
                  className="flex items-center justify-between p-2"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-stone-900 border border-amber-600/40 flex items-center justify-center text-base">
                      {pack.icon}
                    </div>
                    <div>
                      <div className="font-pixel text-[11px] text-stone-100 font-bold">
                        {pack.name}
                      </div>
                      <div className="font-pixel text-[10px] text-amber-400 font-semibold">
                        +{pack.goldAmount} Gold
                      </div>
                    </div>
                  </div>

                  <RPGButton
                    variant={canAfford ? 'gold' : 'dark'}
                    size="sm"
                    disabled={!canAfford}
                    onClick={() => handleBuyGoldWithGems(pack.goldAmount, pack.gemCost)}
                  >
                    {pack.gemCost} GEMS
                  </RPGButton>
                </RPGInnerPanel>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. GEM VAULT (PURCHASE IN-GAME GEMS) */}
        {/* ======================================================== */}
        <div>
          <div className="font-pixel text-[10px] text-cyan-300 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 px-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>GEM STORE VAULT</span>
          </div>

          <div className="space-y-1.5">
            {gemPacks.map((pack) => (
              <RPGInnerPanel
                key={pack.id}
                variant="blue"
                className="flex items-center justify-between p-2"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-950/80 border border-blue-500/50 flex items-center justify-center text-base">
                    {pack.icon}
                  </div>
                  <div>
                    <div className="font-pixel text-[11px] text-stone-100 font-bold">
                      {pack.name}
                    </div>
                    <div className="font-pixel text-[10px] text-cyan-300 font-semibold">
                      +{pack.gemAmount} Gems
                    </div>
                  </div>
                </div>

                <RPGButton
                  variant="blue"
                  size="sm"
                  onClick={() => handleClaimGemPack(pack.gemAmount)}
                >
                  GET PACK
                </RPGButton>
              </RPGInnerPanel>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
