import React, { useRef } from 'react';
import { AgeId, BattleUnit, FloatingText, Particle, Projectile } from '../types/game';
import { BaseOutpostSprite, UnitSprite } from './PixelSprites';
import { BACKGROUNDS, getBattleBackgroundImage } from '../assets/images';

interface BattlefieldProps {
  playerAge: AgeId;
  enemyAge: AgeId;
  playerBaseHp: number;
  playerBaseMaxHp: number;
  enemyBaseHp: number;
  enemyBaseMaxHp: number;
  units: BattleUnit[];
  projectiles: Projectile[];
  floatingTexts: FloatingText[];
  particles: Particle[];
  stasisActive: boolean;
  rallyActive: boolean;
  isPaused: boolean;
}

export const Battlefield: React.FC<BattlefieldProps> = ({
  playerAge,
  enemyAge,
  playerBaseHp,
  playerBaseMaxHp,
  enemyBaseHp,
  enemyBaseMaxHp,
  units,
  projectiles,
  floatingTexts,
  particles,
  stasisActive,
  rallyActive,
}) => {
  const poofs = useDeathPoofs(units);
  const playerBasePercent = Math.max(0, Math.min(1, playerBaseHp / playerBaseMaxHp));
  const enemyBasePercent = Math.max(0, Math.min(1, enemyBaseHp / enemyBaseMaxHp));

  const formatHp = (hp: number) => {
    if (hp >= 1000000) return `${(hp / 1000000).toFixed(1)}M`;
    if (hp >= 1000) return `${(hp / 1000).toFixed(1)}k`;
    return Math.ceil(hp).toString();
  };

  return (
    <div className="relative w-full h-full min-h-0 overflow-hidden select-none bg-slate-950 flex flex-col justify-end">
      {/* 16-bit Pixel Art Background Landscape */}
      <img
        src={getBattleBackgroundImage(enemyAge)}
        alt="Battlefield Environment"
        className="absolute inset-0 w-full h-full object-cover object-bottom pixelated pointer-events-none brightness-95"
      />

      {/* Subtle vignette and contrast gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/30 pointer-events-none" />

      {/* Stasis Ice Overlay */}
      {stasisActive && (
        <div className="absolute inset-0 bg-cyan-500/25 pointer-events-none z-20 flex items-center justify-center animate-pulse">
          <div className="text-cyan-200 font-pixel text-xs tracking-widest bg-cyan-950/90 px-3 py-1.5 rounded-lg border-2 border-cyan-400 shadow-lg">
            STASIS ICE FREEZE
          </div>
        </div>
      )}

      {/* Rally War Horn Glow */}
      {rallyActive && (
        <div className="absolute inset-0 bg-amber-500/15 pointer-events-none z-20 flex items-start justify-center pt-3">
          <div className="text-amber-300 font-pixel text-xs tracking-widest bg-amber-950/90 px-3 py-1.5 rounded-lg border-2 border-amber-400 shadow-lg">
            RALLY +45% DAMAGE
          </div>
        </div>
      )}

      {/* Bases Outposts Container (Left: Player, Right: Enemy) matching reference image layout */}
      <div className="absolute left-0 right-0 bottom-[26%] h-[32%] pointer-events-none z-10 flex justify-between items-end px-1 sm:px-2 pb-0">
        {/* Player Base (Left Outpost with Blue Heraldic Banner) */}
        <BaseOutpostSprite
          side="player"
          hpText={formatHp(playerBaseHp)}
          hpPercent={playerBasePercent}
          theme={(enemyAge === 'ancient' ? 'desert' : enemyAge === 'gunpowder' || enemyAge === 'industrial' ? 'ice' : enemyAge === 'future' ? 'hell' : 'medieval')}
        />

        {/* Enemy Base (Right Outpost with Red Heraldic Banner) */}
        <BaseOutpostSprite
          side="enemy"
          hpText={formatHp(enemyBaseHp)}
          hpPercent={enemyBasePercent}
          theme={(enemyAge === 'ancient' ? 'desert' : enemyAge === 'gunpowder' || enemyAge === 'industrial' ? 'ice' : enemyAge === 'future' ? 'hell' : 'medieval')}
        />
      </div>

      {/* Units Layer: crisp 2× pixel sprites standing on the shared ground line */}
      <div className="absolute inset-0 pointer-events-none z-15">
        {units.map((unit) => {
          const hpPercent = Math.max(0, Math.min(1, unit.hp / unit.maxHp));
          const isPlayer = unit.side === 'player';
          const unitLeftPercent = Math.max(10, Math.min(90, unit.x));
          const hash = uidHash(unit.uid);
          const depth = (hash % 4) * 3; // slight stagger so groups don't fully overlap
          const scale = unit.role === 'boss' ? 2.2 : 2;
          const big = unit.role === 'boss' || unit.role === 'hero' || unit.role === 'tank';

          return (
            <div
              key={unit.uid}
              className="absolute flex flex-col items-center"
              style={{
                left: `${unitLeftPercent}%`,
                bottom: `calc(26% - ${4 + depth}px)`,
                transform: 'translateX(-50%)',
                zIndex: 20 - (hash % 4),
              }}
            >
              <div
                className={`${big ? 'w-12' : 'w-9'} h-[5px] rounded-sm bg-black/70 p-[1px] -mb-1 relative z-10`}
              >
                <div
                  className={`h-full rounded-[1px] ${isPlayer ? 'bg-gradient-to-b from-emerald-300 to-emerald-500' : 'bg-gradient-to-b from-rose-400 to-red-600'}`}
                  style={{ width: `${hpPercent * 100}%` }}
                />
              </div>
              <div className="relative">
                <div className="absolute left-1/2 bottom-[2px] -translate-x-1/2 w-[70%] h-[7px] rounded-[50%] bg-black/35" />
                <UnitSprite
                  unitId={unit.unitDefId}
                  side={unit.side}
                  role={unit.role}
                  isWalking={unit.isWalking}
                  isAttacking={unit.isAttacking}
                  hitFlash={unit.hitFlash}
                  isStasisFrozen={unit.stasisFrozenRemaining > 0}
                  isRallyBuffed={unit.rallyBuffRemaining > 0}
                  scale={scale}
                  animDelay={(hash % 7) * 0.09}
                />
              </div>
            </div>
          );
        })}
        {poofs.map((p) => (
          <div
            key={p.id}
            className="absolute w-9 h-9 rounded-full pointer-events-none"
            style={{
              left: `${p.x}%`,
              bottom: 'calc(26% + 6px)',
              background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(214,206,190,0.75) 40%, rgba(120,110,100,0) 70%)',
              animation: 'sg-poof 0.45s ease-out forwards',
            }}
          />
        ))}
      </div>

      {/* Flying Projectiles Layer */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {projectiles.map((proj) => {
          const leftPercent = Math.max(0, Math.min(100, proj.currentX));
          const arcHeight = Math.sin(proj.progress * Math.PI) * 28;
          const bottomPercent = 28 + (arcHeight / 300) * 100;

          return (
            <div
              key={proj.id}
              className="absolute"
              style={{
                left: `${leftPercent}%`,
                bottom: `${bottomPercent}%`,
                transform: 'translate(-50%, 50%)',
              }}
            >
              {renderProjectileGraphic(proj.type, proj.side)}
            </div>
          );
        })}
      </div>

      {/* Particle Sparks Layer */}
      <div className="absolute inset-0 pointer-events-none z-25">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              bottom: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              opacity: p.alpha,
              transform: 'translate(-50%, 50%)',
            }}
          />
        ))}
      </div>

      {/* Floating Damage & Combat Text */}
      <div className="absolute inset-0 pointer-events-none z-30">
        {floatingTexts.map((txt) => (
          <div
            key={txt.id}
            className="absolute font-pixel text-xs font-black whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
            style={{
              left: `${txt.x}%`,
              bottom: `${txt.y}%`,
              color: txt.color,
              opacity: txt.opacity,
              transform: `translate(-50%, 50%) ${txt.isCrit ? 'scale(1.3)' : 'scale(1)'}`,
              transition: 'opacity 0.1s ease',
            }}
          >
            {txt.text}
          </div>
        ))}
      </div>
    </div>
  );
};

function renderProjectileGraphic(type: string, side: 'player' | 'enemy') {
  const isFlipped = side === 'enemy';

  switch (type) {
    case 'arrow':
      return (
        <div
          className="w-5 h-1.5 bg-amber-200 border-r-2 border-stone-500 relative"
          style={{ transform: isFlipped ? 'scaleX(-1)' : 'none' }}
        >
          <div className="absolute -left-1 -top-0.5 w-1.5 h-2 bg-emerald-500" />
        </div>
      );
    case 'rock':
      return <div className="w-2.5 h-2.5 bg-stone-300 rounded-full border border-stone-600 shadow" />;
    case 'bolt':
      return <div className="w-4 h-1.5 bg-slate-300 border-r-2 border-slate-500" />;
    case 'bullet':
      return <div className="w-2.5 h-1 bg-yellow-300 rounded-full shadow-[0_0_6px_#facc15]" />;
    case 'plasma':
      return <div className="w-3.5 h-3.5 bg-cyan-300 rounded-full shadow-[0_0_8px_#06b6d4] animate-pulse" />;
    case 'slash':
      return <div className="w-4 h-4 border-t-2 border-r-2 border-cyan-400 rounded-tr-full animate-spin" />;
    default:
      return <div className="w-2 h-2 bg-white rounded-full" />;
  }
}

function uidHash(uid: string) {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Remembers units that just left the lane (died) so a short dust poof plays where they fell. */
function useDeathPoofs(units: BattleUnit[]) {
  const last = useRef(new Map<string, number>());
  const active = useRef<{ id: string; x: number; until: number }[]>([]);
  const now = Date.now();
  const present = new Set(units.map((u) => u.uid));
  for (const [uid, x] of last.current) {
    if (!present.has(uid)) active.current.push({ id: `poof-${uid}`, x: Math.max(10, Math.min(90, x)), until: now + 450 });
  }
  last.current = new Map(units.map((u) => [u.uid, u.x]));
  active.current = active.current.filter((p) => p.until > now).slice(-12);
  return active.current;
}
