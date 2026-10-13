import React from 'react';
import { AgeId, UnitRole } from '../../types/game';
import { toDataURL } from '../../art/pixel';
import { FRAME_COUNT, unitFrameSize, unitSheet, type Side } from '../../art/units';

interface SpriteProps {
  unitId?: string;
  role?: UnitRole;
  ageId?: AgeId;
  side?: Side;
  isWalking?: boolean;
  isAttacking?: boolean;
  hitFlash?: number;
  isStasisFrozen?: boolean;
  isRallyBuffed?: boolean;
  /** Target box height in px (legacy API); ignored when `scale` is given. */
  size?: number;
  /** Exact pixel scale (sprite px → CSS px); preferred on the battlefield for crisp pixels. */
  scale?: number;
  /** Seconds to offset animation so neighbouring units don't step in lockstep. */
  animDelay?: number;
  className?: string;
}

const HERO_GLOW: Record<string, string> = {
  crusader_champion: 'rgba(255,214,102,0.85)',
  iron_marshal: 'rgba(255,196,120,0.75)',
  nova_vanguard: 'rgba(120,236,255,0.85)',
};

const sizeCache = new Map<string, { w: number; h: number }>();
function frameSize(unitId: string) {
  let s = sizeCache.get(unitId);
  if (!s) sizeCache.set(unitId, (s = unitFrameSize(unitId)));
  return s;
}

/** Original chibi pixel-art unit with walk/attack animation from a pre-rendered sprite sheet. */
export const UnitSprite: React.FC<SpriteProps> = ({
  unitId = 'stone_clubber',
  side = 'player',
  isWalking = false,
  isAttacking = false,
  hitFlash = 0,
  isStasisFrozen = false,
  isRallyBuffed = false,
  size = 52,
  scale,
  animDelay = 0,
  className = '',
}) => {
  const { w, h } = frameSize(unitId);
  const s = scale ?? size / h;
  const fw = w * s;
  const url = toDataURL(`unit:${unitId}:${side}`, () => unitSheet(unitId, side));

  const filters: string[] = [];
  if (hitFlash > 0) filters.push('brightness(0) invert(1)');
  else if (isStasisFrozen) filters.push('sepia(1) hue-rotate(160deg) saturate(2.6) brightness(1.08)');
  const glow = HERO_GLOW[unitId];
  if (glow) filters.push(`drop-shadow(0 0 ${Math.max(2, s * 2)}px ${glow})`);
  if (isRallyBuffed) filters.push('drop-shadow(0 0 4px rgba(250,204,21,0.95))');

  const animation = isAttacking
    ? `sg-unit-attack 0.45s steps(2, jump-none) ${-animDelay}s infinite`
    : isWalking
      ? `sg-unit-walk 0.6s steps(4) ${-animDelay}s infinite`
      : undefined;

  return (
    <div
      className={`relative shrink-0 select-none ${className}`}
      style={{ width: fw, height: h * s, transform: side === 'enemy' ? 'scaleX(-1)' : undefined }}
      role="img"
      aria-label={unitId.replace(/_/g, ' ')}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundImage: url ? `url(${url})` : undefined,
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${fw * FRAME_COUNT}px ${h * s}px`,
          backgroundPosition: '0 0',
          imageRendering: 'pixelated',
          filter: filters.length ? filters.join(' ') : undefined,
          animation,
          transformOrigin: '50% 94%',
          ['--fw' as string]: `${fw}px`,
        }}
      />
    </div>
  );
};
