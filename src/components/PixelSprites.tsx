import React from 'react';
import { AgeId, UnitRole } from '../types/game';

interface SpriteProps {
  unitId?: string;
  role?: UnitRole;
  ageId?: AgeId;
  side?: 'player' | 'enemy';
  isWalking?: boolean;
  isAttacking?: boolean;
  hitFlash?: number;
  isStasisFrozen?: boolean;
  isRallyBuffed?: boolean;
  size?: number;
  className?: string;
}

/**
 * Detailed Soda Dungeon & We Are Warriors-inspired pixel-art unit sprites.
 */
export const UnitSprite: React.FC<SpriteProps> = ({
  unitId = 'stone_clubber',
  side = 'player',
  isWalking = false,
  isAttacking = false,
  hitFlash = 0,
  isStasisFrozen = false,
  isRallyBuffed = false,
  size = 52,
  className = '',
}) => {
  const isFlipped = side === 'enemy';
  const walkBob = isWalking ? 'animate-bounce' : '';
  const flashStyle = hitFlash > 0 ? 'brightness-200 contrast-200' : '';
  const freezeStyle = isStasisFrozen ? 'hue-rotate-180 brightness-125' : '';
  const rallyStyle = isRallyBuffed ? 'drop-shadow-[0_0_8px_rgba(234,179,8,0.9)]' : '';

  return (
    <div
      className={`relative inline-flex items-center justify-center transition-transform select-none ${walkBob} ${flashStyle} ${freezeStyle} ${rallyStyle} ${className}`}
      style={{
        width: size,
        height: size,
        transform: `${isFlipped ? 'scaleX(-1)' : 'scaleX(1)'} ${isAttacking ? 'scale(1.22) translateX(4px) rotate(-6deg)' : ''}`,
        transition: 'transform 0.1s ease',
      }}
    >
      {renderUnitGraphic(unitId, side)}
    </div>
  );
};

function renderUnitGraphic(unitId: string, side: 'player' | 'enemy') {
  const isEnemy = side === 'enemy';
  const shirtColor = isEnemy ? '#dc2626' : '#2563eb';
  const accentColor = isEnemy ? '#991b1b' : '#1d4ed8';
  const armorColor = isEnemy ? '#450a0a' : '#1e3a8a';

  switch (unitId) {
    // --- 1. CLUBBER (Stone Melee) ---
    case 'stone_clubber':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full pixelated" shapeRendering="crispEdges">
          {/* Hair & Headband */}
          <rect x="11" y="4" width="10" height="4" fill="#451a03" />
          <rect x="10" y="6" width="3" height="4" fill="#451a03" />
          <rect x="11" y="7" width="10" height="2" fill={isEnemy ? '#ef4444' : '#38bdf8'} />
          <rect x="12" y="8" width="9" height="7" fill="#fed7aa" />
          {/* Eyes */}
          <rect x="17" y="10" width="2" height="2" fill="#0f172a" />
          {/* Body / Fur Tunic */}
          <rect x="11" y="15" width="9" height="7" fill={shirtColor} />
          <rect x="12" y="17" width="7" height="4" fill="#78350f" />
          {/* Legs & Boots */}
          <rect x="12" y="22" width="3" height="5" fill="#334155" />
          <rect x="17" y="22" width="3" height="5" fill="#334155" />
          <rect x="11" y="26" width="4" height="3" fill="#1e293b" />
          <rect x="17" y="26" width="4" height="3" fill="#1e293b" />
          {/* Big Wooden Club */}
          <rect x="20" y="7" width="5" height="13" fill="#92400e" rx="1" />
          <rect x="21" y="5" width="3" height="4" fill="#78350f" />
          <rect x="19" y="16" width="2" height="5" fill="#451a03" />
        </svg>
      );

    // --- 2. SLINGER & ARCHER (Ranged) ---
    case 'stone_slinger':
    case 'ancient_archer':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full pixelated" shapeRendering="crispEdges">
          {/* Archer Cap with Plume */}
          <polygon points="10,6 18,3 23,6 19,8 10,8" fill={isEnemy ? '#991b1b' : '#15803d'} />
          <rect x="9" y="2" width="3" height="4" fill="#fbbf24" />
          {/* Face */}
          <rect x="12" y="8" width="8" height="7" fill="#fed7aa" />
          <rect x="17" y="10" width="2" height="2" fill="#0f172a" />
          {/* Tunic */}
          <rect x="11" y="15" width="9" height="7" fill={isEnemy ? '#7f1d1d' : '#166534'} />
          <rect x="13" y="17" width="5" height="4" fill="#a16207" />
          {/* Legs & Boots */}
          <rect x="12" y="22" width="3" height="5" fill="#3f3f46" />
          <rect x="17" y="22" width="3" height="5" fill="#3f3f46" />
          <rect x="11" y="26" width="4" height="3" fill="#1c1917" />
          <rect x="17" y="26" width="4" height="3" fill="#1c1917" />
          {/* Wooden Recurve Bow & Arrow */}
          <path d="M 21 6 Q 28 16 21 26" stroke="#78350f" strokeWidth="2.5" fill="none" />
          <line x1="21" y1="6" x2="21" y2="26" stroke="#f1f5f9" strokeWidth="1" />
          <line x1="15" y1="16" x2="25" y2="16" stroke="#fbbf24" strokeWidth="1.5" />
          <polygon points="26,16 23,14 23,18" fill="#e2e8f0" />
        </svg>
      );

    // --- 3. BRUTE / GUARDIAN (Tank) ---
    case 'stone_brute':
    case 'ancient_guardian':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full pixelated" shapeRendering="crispEdges">
          {/* Horned Helmet */}
          <polygon points="6,5 10,8 9,11" fill="#f8fafc" />
          <polygon points="26,5 22,8 23,11" fill="#f8fafc" />
          <rect x="9" y="7" width="14" height="8" fill="#475569" />
          <rect x="12" y="10" width="8" height="2" fill="#0f172a" />
          {/* Heavy Beard */}
          <rect x="10" y="12" width="12" height="4" fill="#78350f" />
          {/* Torso Armor */}
          <rect x="7" y="15" width="18" height="8" fill={armorColor} />
          <rect x="5" y="15" width="3" height="7" fill={accentColor} />
          {/* Heavy Round Shield */}
          <circle cx="5" cy="19" r="6" fill={shirtColor} stroke="#e2e8f0" strokeWidth="1.5" />
          <circle cx="5" cy="19" r="2.5" fill="#f59e0b" />
          {/* Battle Greataxe */}
          <rect x="23" y="9" width="2.5" height="17" fill="#78350f" />
          <path d="M 23 7 L 30 11 L 23 15 Z" fill="#94a3b8" stroke="#475569" strokeWidth="0.5" />
          {/* Heavy Boots */}
          <rect x="8" y="23" width="5" height="6" fill="#1c1917" />
          <rect x="18" y="23" width="5" height="6" fill="#1c1917" />
        </svg>
      );

    // --- 4. HOPLITE (Ancient Melee) ---
    case 'ancient_hoplite':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full pixelated" shapeRendering="crispEdges">
          {/* Corinthian Bronze Helmet with Crest */}
          <polygon points="12,1 18,1 15,5" fill={isEnemy ? '#ef4444' : '#0284c7'} />
          <rect x="11" y="4" width="10" height="9" fill="#d97706" />
          <rect x="13" y="7" width="6" height="2" fill="#0f172a" />
          {/* Bronze Cuirass */}
          <rect x="10" y="13" width="11" height="9" fill="#b45309" />
          <rect x="12" y="15" width="7" height="6" fill={shirtColor} />
          {/* Bronze Hoplon Shield */}
          <circle cx="6" cy="18" r="6.5" fill="#d97706" stroke="#78350f" strokeWidth="1" />
          <circle cx="6" cy="18" r="2" fill={isEnemy ? '#dc2626' : '#2563eb'} />
          {/* Long Spear / Dory */}
          <line x1="16" y1="2" x2="26" y2="28" stroke="#78350f" strokeWidth="2" />
          <polygon points="16,0 14,3 18,3" fill="#e2e8f0" />
          {/* Greaves */}
          <rect x="11" y="22" width="3" height="6" fill="#d97706" />
          <rect x="16" y="22" width="3" height="6" fill="#d97706" />
        </svg>
      );

    // --- 5. SWORDSMAN & KNIGHT (Crusader) ---
    case 'crusader_swordsman':
    case 'crusader_knight':
    case 'gunpowder_bayonet':
    default:
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full pixelated" shapeRendering="crispEdges">
          {/* Great Helm with Red Plume */}
          <rect x="14" y="1" width="3" height="4" fill={isEnemy ? '#ef4444' : '#eab308'} />
          <rect x="11" y="4" width="10" height="9" fill="#64748b" />
          <rect x="13" y="7" width="6" height="2" fill="#0f172a" />
          <rect x="15" y="6" width="2" height="6" fill="#cbd5e1" />
          {/* Surcoat over Chainmail */}
          <rect x="10" y="13" width="11" height="9" fill={shirtColor} />
          <rect x="13" y="14" width="5" height="7" fill={isEnemy ? '#991b1b' : '#1d4ed8'} />
          {/* Steel Broadsword */}
          <rect x="22" y="4" width="2" height="17" fill="#f1f5f9" />
          <rect x="20" y="15" width="6" height="2" fill="#eab308" />
          {/* Heater Shield */}
          <path d="M 5 12 L 13 12 L 12 23 Q 9 26 5 21 Z" fill={shirtColor} stroke="#eab308" strokeWidth="1" />
          <circle cx="8" cy="16" r="1.5" fill="#ffffff" />
          {/* Steel Greaves */}
          <rect x="11" y="22" width="3" height="6" fill="#475569" />
          <rect x="16" y="22" width="3" height="6" fill="#475569" />
        </svg>
      );

    // --- 6. HERO (King / Champion) ---
    case 'crusader_champion':
    case 'hero':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full pixelated" shapeRendering="crispEdges">
          {/* Golden Crown with Rubies */}
          <polygon points="10,5 12,1 14,4 16,0 18,4 20,1 22,5" fill="#f59e0b" />
          <circle cx="12" cy="4" r="1" fill="#ef4444" />
          <circle cx="16" cy="3" r="1" fill="#38bdf8" />
          <circle cx="20" cy="4" r="1" fill="#ef4444" />
          {/* Face */}
          <rect x="11" y="6" width="10" height="8" fill="#fed7aa" />
          <rect x="10" y="6" width="2" height="5" fill="#78350f" />
          <rect x="16" y="9" width="2" height="2" fill="#0f172a" />
          {/* Royal Cape & Golden Plate Armor */}
          <rect x="8" y="14" width="16" height="10" fill={shirtColor} />
          <rect x="12" y="14" width="8" height="8" fill="#f59e0b" />
          {/* Gleaming Holy Broadsword */}
          <rect x="23" y="1" width="3" height="22" fill="#fef08a" stroke="#d97706" strokeWidth="0.5" />
          <rect x="20" y="16" width="9" height="2" fill="#f59e0b" />
          {/* Royal Armored Greaves */}
          <rect x="10" y="24" width="4" height="6" fill="#d97706" />
          <rect x="18" y="24" width="4" height="6" fill="#d97706" />
        </svg>
      );

    // --- 7. BOSS (Gate Colossus) ---
    case 'boss':
      return (
        <svg viewBox="0 0 32 32" className="w-full h-full pixelated" shapeRendering="crispEdges">
          {/* Colossal Obsidian Golem Horns & Brow */}
          <polygon points="4,2 8,6 6,9" fill="#991b1b" />
          <polygon points="28,2 24,6 26,9" fill="#991b1b" />
          <rect x="8" y="5" width="16" height="10" fill="#1c1917" stroke="#dc2626" strokeWidth="0.5" />
          {/* Glowing Lava Eyes */}
          <rect x="11" y="8" width="3" height="2" fill="#f97316" />
          <rect x="18" y="8" width="3" height="2" fill="#f97316" />
          {/* Massive Volcanic Chest with Magma Core */}
          <rect x="5" y="14" width="22" height="12" fill="#0c0a09" stroke="#b91c1c" strokeWidth="0.5" />
          <circle cx="16" cy="19" r="3.5" fill="#ea580c" />
          <circle cx="16" cy="19" r="1.5" fill="#fef08a" />
          {/* Giant Spiked Fists */}
          <rect x="2" y="17" width="5" height="9" fill="#1c1917" />
          <rect x="25" y="17" width="5" height="9" fill="#1c1917" />
          {/* Massive Legs */}
          <rect x="9" y="25" width="6" height="6" fill="#0c0a09" />
          <rect x="17" y="25" width="6" height="6" fill="#0c0a09" />
        </svg>
      );
  }
}

/**
 * TEMPORARY code-drawn fortress fallback until approved transparent base sprites ship.
 * The structure and roof are identical for ally and enemy within each era.
 * No unapproved faction flags, coloured architectural accents or hanging banners.
 * HP is an independent interface overlay, never baked into the artwork.
 */
export const BaseOutpostSprite: React.FC<{
  side: 'player' | 'enemy';
  hpText: string;
  hpPercent: number;
  theme?: 'medieval' | 'desert' | 'ice' | 'hell';
}> = ({ side, hpText, hpPercent, theme = 'medieval' }) => {
  const player = side === 'player';
  const stone = theme === 'desert' ? '#b98b55' : theme === 'ice' ? '#748caa' : theme === 'hell' ? '#51414a' : '#837b70';
  const stoneLight = theme === 'desert' ? '#e9bf7c' : theme === 'ice' ? '#c4ddec' : theme === 'hell' ? '#a26863' : '#c4b69a';
  const stoneDark = theme === 'desert' ? '#775038' : theme === 'ice' ? '#465976' : theme === 'hell' ? '#292633' : '#524c4b';
  const roof = theme === 'desert' ? '#dba45b' : theme === 'ice' ? '#dceaf0' : theme === 'hell' ? '#35363f' : '#86583e';
  const percent = Math.max(0, Math.min(100, hpPercent * 100));
  return (
    <div className="flex flex-col items-center shrink-0 select-none w-[clamp(94px,26vw,142px)] drop-shadow-[0_4px_3px_rgba(0,0,0,.7)]">
      <div className="w-[92%] flex flex-col items-center gap-0.5 mb-1">
        <span className="font-pixel text-[10px] sm:text-xs font-bold text-white whitespace-nowrap drop-shadow-[0_2px_2px_#000]">{hpText}</span>
        <div className="w-full h-2.5 bg-stone-950 rounded border-2 border-stone-950 overflow-hidden">
          <div className={`h-full ${player ? 'bg-emerald-400' : 'bg-rose-500'}`} style={{ width: `${percent}%` }} />
        </div>
      </div>
      <svg viewBox="0 0 112 134" width="100%" role="img" aria-label={`${theme} ${side} fortress`} style={{imageRendering:'pixelated',overflow:'visible'}}>
        <ellipse cx="56" cy="129" rx="53" ry="5" fill="#10131b" opacity=".6"/>
        {/* Defensive towers, heavy masonry and crenellations */}
        <path d="M5 126V37h7V27h8v10h8V27h8v10h7v89Z M69 126V37h7V27h8v10h8V27h8v10h7v89Z" fill={stoneDark} stroke="#231e24" strokeWidth="3"/>
        <path d="M10 124V42h28v82Z M74 124V42h28v82Z" fill={stone} stroke="#2b2527" strokeWidth="2"/>
        <path d="M13 44h9v15h-9Zm12 0h10v15H25Zm52 0h9v15h-9Zm12 0h10v15H89Z" fill={stoneLight} opacity=".6"/>
        <path d="M28 126V62h56v64Z" fill={stoneDark} stroke="#29232a" strokeWidth="3"/>
        <path d="M32 120V67h48v53Z" fill={stone} />
        <path d="M30 63h54V51H30Z" fill={roof} stroke="#32262a" strokeWidth="3"/>
        <path d="M25 53 56 24l31 29Z" fill={roof} stroke="#2e242a" strokeWidth="3"/>
        <path d="M34 49 56 30l22 19Z" fill={stoneLight} opacity=".65"/>
        {/* Shaded doorway and timber gate */}
        <path d="M43 126V95a13 13 0 0 1 26 0v31Z" fill="#21191c" stroke="#35252a" strokeWidth="3"/>
        <path d="M48 126V96a8 8 0 0 1 16 0v30Z" fill="#553626"/>
        <path d="M54 95v31m6-30v30" stroke="#8e5b36" strokeWidth="2"/>
        {/* Defensive slit windows */}
        <path d="M19 75v18m74-18v18" stroke="#191a22" strokeWidth="5"/>
        <path d="M19 75v10m74-10v10" stroke={theme === 'hell' ? '#e98b45' : '#e9d4aa'} strokeWidth="2"/>
        {/* Roof tiles and masonry details */}
        <path d="M12 103h25m39 0h25M33 82h14m18 0h15M11 115h21m48 0h21" stroke={stoneDark} strokeWidth="2"/>
        <path d="M14 65h18m48 0h18M31 72h12m26 0h11" stroke={stoneLight} strokeWidth="2"/>
        {/* Neutral structural roof detail — no faction standards. */}
        <path d="M34 47h44m-38-7h33m-25-7h17" stroke={stoneDark} strokeWidth="1.7" opacity=".7" />
        {theme === 'hell' && <g fill="#d9b88e" stroke="#332c32" strokeWidth="2"><path d="M7 37 Q 2 29 8 20 Q 9 30 18 31 L 18 38 Z"/><path d="M105 37 Q 110 29 104 20 Q 103 30 94 31 L 94 38 Z"/></g>}
        {theme === 'ice' && <g fill="#e9f7ff"><path d="M25 53h62l-9 8-11-4-12 5-11-5-10 4Z"/><path d="M6 38h38l-7 8-10-3-9 4Z"/></g>}
        {theme === 'desert' && <path d="M31 54h52v8H31Z" fill="#efce8a" opacity=".7"/>}
        {theme === 'hell' && <g fill="#fa792f"><path d="M14 119h5v-13h4v13h4v7H14ZM91 119h4v-16h4v16h4v7H91Z"/></g>}
      </svg>
    </div>
  );
};
