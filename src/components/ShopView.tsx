import React from 'react';
import { PlayerProfile } from '../types/game';
import { Coins, Gem, ShieldCheck, Tv } from 'lucide-react';
import { RPGInnerPanel, RPGButton } from './RPGModalFrame';

interface ShopViewProps {
  profile: PlayerProfile;
  // Retained for compatibility with the parent component until the store adapter is integrated.
  onUpdateProfile: (updater: (prev: PlayerProfile) => PlayerProfile) => void;
}

/**
 * No real-money, rewarded-video, or ad purchase provider is integrated.
 * Never award currency through a timer or "buy" button.
 * Future payment/ad adapters must settle only after provider-verified success.
 */
export const ShopView: React.FC<ShopViewProps> = ({ profile }) => (
  <div className="w-full flex-1 min-h-0 flex flex-col overflow-y-auto bg-stone-950 p-3 select-none">
    <div className="mb-3">
      <div className="font-pixel text-xs text-amber-300 font-bold">CURRENCY SHOP</div>
      <p className="text-[11px] text-stone-400 mt-1">
        Optional currency offers will appear here when purchases and rewarded videos are available.
        Core campaign Gold remains earnable by playing battles.
      </p>
    </div>

    <RPGInnerPanel variant="amber" className="mb-3">
      <div className="flex items-center gap-2">
        <Coins className="w-5 h-5 text-amber-400" />
        <span className="font-pixel text-xs text-stone-200">GOLD</span>
        <strong className="ml-auto text-amber-300 font-pixel">{profile.gold.toLocaleString()}</strong>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Gem className="w-5 h-5 text-cyan-300" />
        <span className="font-pixel text-xs text-stone-200">GEMS</span>
        <strong className="ml-auto text-cyan-300 font-pixel">{profile.gems.toLocaleString()}</strong>
      </div>
    </RPGInnerPanel>

    <RPGInnerPanel variant="stone" className="mb-3">
      <div className="flex gap-2 items-center mb-2 text-stone-100 font-pixel text-[11px] font-bold">
        <Gem className="w-4 h-4 text-cyan-300" /> GEM PACKS
      </div>
      <p className="text-xs text-stone-400 mb-3">
        Not available in this web build. No payment will be requested or simulated.
      </p>
      <RPGButton variant="dark" size="sm" className="w-full" disabled>
        PURCHASES UNAVAILABLE
      </RPGButton>
    </RPGInnerPanel>

    <RPGInnerPanel variant="stone" className="mb-3">
      <div className="flex gap-2 items-center mb-2 text-stone-100 font-pixel text-[11px] font-bold">
        <Tv className="w-4 h-4 text-amber-300" /> REWARDED VIDEOS
      </div>
      <p className="text-xs text-stone-400 mb-3">
        Temporarily unavailable. Rewards must only be credited after a verified completed ad.
        Watching a fake countdown never grants currency.
      </p>
      <RPGButton variant="dark" size="sm" className="w-full" disabled>
        ADS UNAVAILABLE
      </RPGButton>
    </RPGInnerPanel>

    <div className="flex gap-2 items-start text-[10px] text-emerald-300/90 font-pixel">
      <ShieldCheck className="w-4 h-4 shrink-0" />
      <span>Currency integrity protected: no unverified purchases or ad rewards.</span>
    </div>
  </div>
);
