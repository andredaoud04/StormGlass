import React from 'react';

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
    <div className="flex flex-col items-center shrink-0 select-none w-[109px] drop-shadow-[0_4px_3px_rgba(0,0,0,.7)]">
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
