import React, { useState } from 'react';
import { CardDef, HeroDef, PlayerProfile, RuneNode, SkillDef } from '../types/game';
import { CARDS, HEROES, RUNES, SKILLS } from '../data/gameData';
import { UnitSprite } from './PixelSprites';
import { RPGModalContainer, RPGInnerPanel, RPGButton } from './RPGModalFrame';
import { sound } from '../services/sound';
import { Sparkles, Shield, Sword, Crown, Wheat, Castle, Snowflake, Target, Flame, Lock, CheckCircle2, ArrowUpCircle, Gift, Check } from 'lucide-react';

interface CardsViewProps {
  profile: PlayerProfile;
  onUpgradeCard: (cardId: string) => void;
  onDiscoverSkill: () => void;
  onUpgradeSkill: (skillId: 'stasis' | 'volley' | 'rally') => void;
  onEquipSkill: (skillId: 'stasis' | 'volley' | 'rally', slotIndex: number) => void;
  onUpgradeRune: (nodeId: string) => void;
  onEquipHero: (heroId: string) => void;
  onSummonCards?: (count: number, costGems: number) => void;
  recentPulls?: CardDef[] | null;
  onClosePulls?: () => void;
}

export const CardsView: React.FC<CardsViewProps> = ({
  profile,
  onUpgradeCard,
  onDiscoverSkill,
  onUpgradeSkill,
  onEquipSkill,
  onUpgradeRune,
  onEquipHero,
  onSummonCards,
  recentPulls,
  onClosePulls,
}) => {
  const [subTab, setSubTab] = useState<'cards' | 'skills' | 'runes' | 'hero'>('cards');

  // Cumulative bonuses
  let totalDmgBonus = 0;
  let totalHpBonus = 0;
  let totalBaseBonus = 0;
  let totalFoodBonus = 0;

  Object.values(profile.cards).forEach((c) => {
    const def = CARDS.find((card) => card.id === c.cardId);
    if (!def || c.level <= 0) return;
    const bonus = c.level * def.valuePerLevel;
    if (def.type === 'damage') totalDmgBonus += bonus;
    else if (def.type === 'health') totalHpBonus += bonus;
    else if (def.type === 'base_hp') totalBaseBonus += bonus;
    else if (def.type === 'food') totalFoodBonus += bonus;
  });

  return (
    <div className="w-full flex-1 flex flex-col bg-slate-950 overflow-y-auto p-3">
      {/* 4 Sub-Tabs: Cards | Skills | Runes | Hero */}
      <div className="flex items-center gap-1 p-1 bg-stone-900 rounded-lg mb-3 border border-stone-800 shrink-0">
        {(['cards', 'skills', 'runes', 'hero'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`flex-1 py-1.5 text-[10px] md:text-xs font-pixel font-bold rounded uppercase transition-colors ${
              subTab === tab
                ? 'bg-amber-500 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* --- CARDS SUB-TAB --- */}
      {subTab === 'cards' && (
        <div className="space-y-2.5 flex-1 flex flex-col justify-between">
          <div>
            {/* Passive Bonus Header Summary */}
            <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-2.5 mb-2.5 shadow-sm">
              <div className="flex items-center justify-between text-[10px] font-pixel text-stone-400 mb-1">
                <span className="text-amber-400 font-bold uppercase tracking-wider">PERMANENT CARD STATS</span>
                <span>DISCOVERED: {Object.keys(profile.cards).length}/{CARDS.length}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-[9px] font-pixel text-stone-300">
                <div className="bg-stone-950/80 rounded px-1.5 py-0.5 border border-stone-800">
                  ATK: <span className="text-amber-300 font-bold">+{totalDmgBonus.toFixed(1)}%</span>
                </div>
                <div className="bg-stone-950/80 rounded px-1.5 py-0.5 border border-stone-800">
                  HP: <span className="text-blue-300 font-bold">+{totalHpBonus.toFixed(1)}%</span>
                </div>
                <div className="bg-stone-950/80 rounded px-1.5 py-0.5 border border-stone-800">
                  BASE: <span className="text-emerald-300 font-bold">+{totalBaseBonus.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CARDS.map((card) => {
                const owned = profile.cards[card.id];
                const level = owned?.level || 0;
                const copies = owned?.copies || 0;
                const copiesNeeded = level > 0 ? level * 3 : 1;
                const canUpgrade = copies >= copiesNeeded;
                const totalBonus = (level * card.valuePerLevel).toFixed(1);

                return (
                  <div
                    key={card.id}
                    className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                      level > 0
                        ? getCardRarityBorder(card.rarity)
                        : 'bg-stone-950/60 border-stone-850 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-stone-900 border border-stone-700 flex items-center justify-center">
                          {getCardIcon(card.iconName)}
                        </div>
                        <div>
                          <div className="font-pixel text-xs text-stone-100 font-bold flex items-center gap-1.5">
                            <span>{card.name}</span>
                            <span className={`text-[8px] uppercase px-1 py-0.2 rounded font-pixel ${getRarityTagStyle(card.rarity)}`}>
                              {card.rarity}
                            </span>
                          </div>
                          <div className="text-[10px] text-stone-400">
                            {level > 0 ? `Level ${level}` : 'Undiscovered'}
                          </div>
                        </div>
                      </div>

                      {level > 0 && (
                        <div className="font-pixel text-xs text-amber-300 font-bold">
                          +{totalBonus}%
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-stone-300 mb-2">
                      {card.description}
                    </p>

                    {level > 0 ? (
                      <div className="flex items-center justify-between pt-1 border-t border-stone-800/60">
                        <div className="text-[10px] font-pixel text-stone-400">
                          Copies: {copies}/{copiesNeeded}
                        </div>

                        <button
                          onClick={() => onUpgradeCard(card.id)}
                          disabled={!canUpgrade}
                          className={`px-3 py-1 rounded font-pixel text-[10px] font-bold transition-all ${
                            canUpgrade
                              ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 active:scale-95'
                              : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                          }`}
                        >
                          UPGRADE
                        </button>
                      </div>
                    ) : (
                      <div className="text-[10px] text-amber-500/80 font-pixel">
                        Undiscovered · Summon below
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* DOCKED SUMMON BAR (At bottom of cards screen) */}
          <div className="sticky bottom-0 z-20 mt-3 pt-2.5 pb-1 bg-stone-950/95 border-t-2 border-stone-800 backdrop-blur-md">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="font-pixel text-[10px] text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> SUMMON TACTICAL CARDS
              </span>
              <span className="font-pixel text-[10px] text-cyan-300 font-bold tabular-nums">
                💎 {profile.gems} GEMS
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Summon x1 */}
              <button
                onClick={() => onSummonCards && onSummonCards(1, 20)}
                disabled={profile.gems < 20}
                className={`py-2 px-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                  profile.gems >= 20
                    ? 'bg-gradient-to-b from-stone-800 to-stone-900 border-stone-600 hover:border-amber-400 active:scale-95 text-stone-100 shadow-md cursor-pointer'
                    : 'bg-stone-900/60 border-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                <span className="font-pixel text-[10px] font-bold">SUMMON x1</span>
                <span className="font-pixel text-[11px] text-cyan-400 font-black flex items-center gap-0.5 mt-0.5">
                  💎 20 GEMS
                </span>
              </button>

              {/* Summon x10 */}
              <button
                onClick={() => onSummonCards && onSummonCards(10, 180)}
                disabled={profile.gems < 180}
                className={`relative py-2 px-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                  profile.gems >= 180
                    ? 'bg-gradient-to-b from-amber-950/70 via-stone-900 to-stone-950 border-amber-500 hover:border-amber-400 active:scale-95 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)] cursor-pointer'
                    : 'bg-stone-900/60 border-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                <div className="absolute -top-2 right-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-stone-950 font-pixel text-[7.5px] font-black px-1.5 py-0.2 rounded-full border border-amber-300 shadow-sm">
                  SAVE 10%
                </div>
                <span className="font-pixel text-[10px] font-bold text-amber-200">SUMMON x10</span>
                <span className="font-pixel text-[11px] text-cyan-300 font-black flex items-center gap-0.5 mt-0.5">
                  💎 180 GEMS
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SKILLS SUB-TAB --- */}
      {subTab === 'skills' && (
        <div className="space-y-4">
          {/* Equipped 3 Slots */}
          <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-3">
            <div className="font-pixel text-xs text-stone-300 font-bold mb-2">
              EQUIPPED SKILL LOADOUT (3 SLOTS)
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((slotIdx) => {
                const equippedSkillId = profile.equippedSkills[slotIdx];
                const skillDef = SKILLS.find((s) => s.id === equippedSkillId);

                return (
                  <div
                    key={slotIdx}
                    className="p-2 rounded-lg border border-dashed border-stone-700 bg-stone-950 flex flex-col items-center justify-center min-h-[70px]"
                  >
                    {skillDef ? (
                      <div className="text-center">
                        <div
                          className="w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1"
                          style={{ backgroundColor: `${skillDef.color}20`, borderColor: skillDef.color, borderWidth: 1 }}
                        >
                          {getSkillIcon(skillDef.id)}
                        </div>
                        <div className="font-pixel text-[9px] text-stone-200">
                          {skillDef.name}
                        </div>
                      </div>
                    ) : (
                      <span className="font-pixel text-[9px] text-stone-600">
                        SLOT {slotIdx + 1}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Random Skill Discovery */}
          <div className="bg-gradient-to-r from-blue-950/60 to-stone-900 border border-blue-600/40 rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="font-pixel text-xs text-blue-300 font-bold">
                SKILL DISCOVERY
              </div>
              <div className="text-[10px] text-stone-400">
                Unlock new tactical skills or gain duplicate upgrade copies
              </div>
            </div>

            <button
              onClick={onDiscoverSkill}
              disabled={profile.gems < 80}
              className={`px-3 py-2 rounded-lg font-pixel text-xs font-bold transition-all ${
                profile.gems >= 80
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow active:scale-95'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed'
              }`}
            >
              80 GEMS
            </button>
          </div>

          {/* All Skills List */}
          <div className="space-y-2">
            {SKILLS.map((skill) => {
              const state = profile.skills[skill.id];
              const isUnlocked = state?.unlocked;
              const level = state?.level || 1;
              const copies = state?.copies || 0;
              const copiesNeeded = Math.max(2, level * 2);
              const canUpgrade = copies >= copiesNeeded;
              const isEquipped = profile.equippedSkills.includes(skill.id);

              return (
                <div
                  key={skill.id}
                  className="bg-stone-900/70 border border-stone-800 rounded-xl p-3 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center border"
                        style={{ backgroundColor: `${skill.color}25`, borderColor: skill.color }}
                      >
                        {getSkillIcon(skill.id)}
                      </div>
                      <div>
                        <div className="font-pixel text-xs text-stone-200 font-bold flex items-center gap-2">
                          <span>{skill.name}</span>
                          {isUnlocked && (
                            <span className="text-[9px] text-amber-400">Lvl {level}</span>
                          )}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          Cooldown: {skill.cooldown}s
                        </div>
                      </div>
                    </div>

                    {isUnlocked ? (
                      <div className="flex items-center gap-1.5">
                        {/* Equip buttons for slot 1, 2, 3 */}
                        {[0, 1, 2].map((slotIdx) => (
                          <button
                            key={slotIdx}
                            onClick={() => onEquipSkill(skill.id, slotIdx)}
                            className={`w-6 h-6 rounded text-[9px] font-pixel font-bold flex items-center justify-center border transition-all ${
                              profile.equippedSkills[slotIdx] === skill.id
                                ? 'bg-amber-500 border-amber-400 text-stone-950'
                                : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200'
                            }`}
                          >
                            {slotIdx + 1}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="font-pixel text-[10px] text-stone-600 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> LOCKED
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-stone-300">
                    {skill.description}
                  </p>

                  {isUnlocked && (
                    <div className="flex items-center justify-between pt-1 border-t border-stone-800/80">
                      <span className="text-[10px] font-pixel text-stone-400">
                        Copies: {copies}/{copiesNeeded}
                      </span>

                      <button
                        onClick={() => onUpgradeSkill(skill.id)}
                        disabled={!canUpgrade}
                        className={`px-3 py-1 rounded font-pixel text-[10px] font-bold ${
                          canUpgrade
                            ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                            : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                        }`}
                      >
                        UPGRADE
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- RUNES SUB-TAB --- */}
      {subTab === 'runes' && (
        <div className="space-y-3">
          {/* Rune Points Banner */}
          <div className="bg-stone-900/80 border border-amber-900/40 rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="font-pixel text-xs text-amber-300 font-bold">
                AVAILABLE RUNE POINTS: {profile.runePoints}
              </div>
              <div className="text-[10px] text-stone-400">
                Earn Rune Points from Timeline Prestige and Legends story clears
              </div>
            </div>
          </div>

          {/* Rune Nodes Tree */}
          <div className="space-y-2">
            {RUNES.map((rune) => {
              const currentRank = profile.runes[rune.id] || 0;
              const parentRank = rune.parentId ? profile.runes[rune.parentId] || 0 : 1;
              const isUnlocked = parentRank > 0;
              const isMaxed = currentRank >= rune.maxRank;
              const canPurchase = isUnlocked && !isMaxed && profile.runePoints >= 1;

              return (
                <div
                  key={rune.id}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    isUnlocked
                      ? 'bg-stone-900/80 border-stone-800'
                      : 'bg-stone-950/40 border-stone-900 opacity-50'
                  }`}
                >
                  <div>
                    <div className="font-pixel text-xs text-stone-200 font-bold flex items-center gap-2">
                      <span>{rune.name}</span>
                      <span className="text-[10px] text-amber-400">
                        {currentRank}/{rune.maxRank}
                      </span>
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      {rune.description}
                    </div>
                    {rune.parentId && !isUnlocked && (
                      <div className="text-[9px] text-red-400/80 mt-1">
                        Requires 1 point in {rune.parentId}
                      </div>
                    )}
                  </div>

                  <div>
                    {isMaxed ? (
                      <span className="font-pixel text-[10px] text-emerald-400">MAX</span>
                    ) : (
                      <button
                        onClick={() => onUpgradeRune(rune.id)}
                        disabled={!canPurchase}
                        className={`px-3 py-1.5 rounded-lg font-pixel text-xs font-bold transition-all ${
                          canPurchase
                            ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 active:scale-95'
                            : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                        }`}
                      >
                        +1 PT
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- HERO SUB-TAB --- */}
      {subTab === 'hero' && (
        <div className="space-y-3">
          <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-3">
            <div className="font-pixel text-xs text-stone-200 font-bold mb-1">
              LEGENDARY HERO DEPLOYMENT
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              Heroes are massive battlefield leaders deployable once per battle. Unlocked permanently after your first complete 6-Age Timeline Prestige!
            </p>
          </div>

          <div className="space-y-3">
            {HEROES.map((hero) => {
              const isUnlocked = profile.heroesUnlocked.includes(hero.id);
              const isEquipped = profile.equippedHeroId === hero.id;

              return (
                <div
                  key={hero.id}
                  className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                    isUnlocked
                      ? 'bg-stone-900/90 border-amber-500/60 shadow-md'
                      : 'bg-stone-950/60 border-stone-850 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-stone-950 border border-amber-500/40 flex items-center justify-center">
                        <UnitSprite unitId={hero.id} size={42} />
                      </div>
                      <div>
                        <div className="font-pixel text-xs text-stone-100 font-bold">
                          {hero.name}
                        </div>
                        <div className="text-[10px] text-amber-400 font-pixel">
                          {hero.title}
                        </div>
                        <div className="text-[10px] text-stone-400 mt-0.5">
                          HP: ×{hero.baseMultiplierHp} · DMG: ×{hero.baseMultiplierDmg}
                        </div>
                      </div>
                    </div>

                    <div>
                      {isUnlocked ? (
                        <button
                          onClick={() => onEquipHero(hero.id)}
                          className={`px-3 py-1.5 rounded-lg font-pixel text-xs font-bold transition-all ${
                            isEquipped
                              ? 'bg-amber-500 text-stone-950'
                              : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                          }`}
                        >
                          {isEquipped ? 'EQUIPPED' : 'EQUIP'}
                        </button>
                      ) : (
                        <div className="font-pixel text-[9px] text-stone-500 flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5" />
                          <span>PRESTIGE 1</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-stone-300">
                    {hero.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUMMON REVEAL MODAL */}
      {recentPulls && onClosePulls && (
        <RPGModalContainer
          isOpen={true}
          onClose={onClosePulls}
          title="CARDS SUMMONED!"
          subtitle={`${recentPulls.length} tactical cards added to your collection`}
          icon={<Sparkles className="w-5 h-5 text-amber-400" />}
          maxWidth="max-w-md"
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto p-1">
              {recentPulls.map((card, idx) => {
                const owned = profile.cards[card.id];
                const level = owned?.level || 1;
                const copies = owned?.copies || 1;
                const isNew = copies === 1 && level === 1;

                return (
                  <div
                    key={`${card.id}-${idx}`}
                    className={`rounded-xl border-2 p-2.5 flex flex-col items-center text-center relative ${getCardRarityBorder(
                      card.rarity
                    )} bg-stone-900/90 shadow-md`}
                  >
                    {isNew && (
                      <span className="absolute -top-1.5 right-1 px-1 py-0.2 bg-emerald-500 text-stone-950 font-pixel text-[7px] font-black rounded border border-emerald-300">
                        NEW!
                      </span>
                    )}
                    <div className="w-10 h-10 rounded-lg bg-stone-950 border border-stone-700 flex items-center justify-center my-1">
                      {getCardIcon(card.iconName)}
                    </div>
                    <span className="font-pixel text-[10px] text-white font-bold truncate w-full">
                      {card.name}
                    </span>
                    <span className={`text-[7.5px] uppercase font-pixel px-1 py-0.2 rounded mt-0.5 ${getRarityTagStyle(card.rarity)}`}>
                      {card.rarity}
                    </span>
                    <span className="font-pixel text-[9px] text-amber-300 font-bold mt-1">
                      +{card.valuePerLevel}% {card.type.replace('_', ' ')}
                    </span>
                    <span className="text-[8px] text-stone-400 font-pixel mt-0.5">
                      Copies: {copies}
                    </span>
                  </div>
                );
              })}
            </div>

            <RPGButton
              variant="gold"
              onClick={onClosePulls}
              className="w-full flex items-center justify-center gap-1.5 py-2 font-pixel text-xs tracking-wider"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>COLLECT ALL</span>
            </RPGButton>
          </div>
        </RPGModalContainer>
      )}
    </div>
  );
};

function getCardIcon(iconName: string) {
  switch (iconName) {
    case 'sword':
      return <Sword className="w-5 h-5 text-red-400" />;
    case 'shield':
      return <Shield className="w-5 h-5 text-emerald-400" />;
    case 'wheat':
      return <Wheat className="w-5 h-5 text-amber-400" />;
    case 'castle':
      return <Castle className="w-5 h-5 text-blue-400" />;
    case 'crown':
      return <Crown className="w-5 h-5 text-yellow-400" />;
    case 'sparkles':
      return <Sparkles className="w-5 h-5 text-purple-400" />;
    default:
      return <Sparkles className="w-5 h-5 text-white" />;
  }
}

function getCardRarityBorder(rarity: string) {
  switch (rarity) {
    case 'common':
      return 'bg-stone-900/80 border-slate-700';
    case 'rare':
      return 'bg-blue-950/40 border-blue-600/70 shadow-[0_0_8px_rgba(37,99,235,0.2)]';
    case 'epic':
      return 'bg-purple-950/40 border-purple-600/70 shadow-[0_0_8px_rgba(147,51,234,0.2)]';
    case 'legendary':
      return 'bg-amber-950/40 border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.3)]';
    default:
      return 'bg-stone-900 border-stone-800';
  }
}

function getRarityTagStyle(rarity: string) {
  switch (rarity) {
    case 'common':
      return 'bg-slate-800 text-slate-300';
    case 'rare':
      return 'bg-blue-900 text-blue-300';
    case 'epic':
      return 'bg-purple-900 text-purple-300';
    case 'legendary':
      return 'bg-amber-900 text-amber-300';
    default:
      return 'bg-stone-800 text-stone-300';
  }
}

function getSkillIcon(skillId: string) {
  switch (skillId) {
    case 'stasis':
      return <Snowflake className="w-4 h-4 text-cyan-300" />;
    case 'volley':
      return <Target className="w-4 h-4 text-orange-400" />;
    case 'rally':
      return <Flame className="w-4 h-4 text-amber-400" />;
    default:
      return <Sparkles className="w-4 h-4 text-white" />;
  }
}
