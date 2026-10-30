import { Img } from '../img';
import { buildFrame, rotateFrame, type AnimSpec, type Pose, type RigParts } from '../rig';

export type AttackStyle = 'swing' | 'sling' | 'throw' | 'shoot' | 'thrust' | 'bow';

/** Standard animation set for a humanoid troop. Timing is tuned for the sim's 0.4 s wind-up. */
export function humanoidAnims(r: RigParts, style: AttackStyle, rest: Partial<Pose> = {}, opts: { roomyDeath?: boolean } = {}): AnimSpec[] {
  const restWeapon = rest.weapon ?? -35;
  const restArm = rest.frontArm ?? -25;
  const P = (p: Pose): Pose => ({ backArm: 10, frontArm: restArm, weapon: restWeapon, ...rest, ...p });

  const idle: Pose[] = [
    P({}),
    P({}),
    P({ body: [0, 1], frontArm: restArm + 4, weapon: restWeapon + 3 }),
    P({ body: [0, 1], frontArm: restArm + 4, weapon: restWeapon + 3 }),
  ];
  const walk: Pose[] = [
    P({ frontLeg: [2, 0], backLeg: [-2, 0], backArm: -20, frontArm: restArm + 10 }),
    P({ body: [0, -1], frontLeg: [0, -1], backLeg: [0, 0], backArm: 0, frontArm: restArm }),
    P({ frontLeg: [-2, 0], backLeg: [2, 0], backArm: 25, frontArm: restArm - 10 }),
    P({ body: [0, -1], frontLeg: [0, 0], backLeg: [0, -1], backArm: 0, frontArm: restArm }),
  ];

  let attack: Pose[];
  let hitFrame: number;
  // Attack frames never inherit a resting "weapon behind the back" pose.
  const A = (p: Pose): Pose => P({ weaponBehind: false, ...p });
  if (style === 'swing') {
    attack = [
      A({ body: [-1, 0], frontArm: -150, weapon: -70, backArm: 30, weaponBehind: true }),
      A({ body: [-1, -1], frontArm: -175, weapon: -30, backArm: 20, frontLeg: [1, 0], weaponBehind: true }),
      A({ body: [1, 0], frontArm: -95, weapon: 80, backArm: -10, frontLeg: [2, 0], backLeg: [-1, 0] }),
      A({ body: [2, 1], head: [0, 1], frontArm: -50, weapon: 125, backArm: -20, frontLeg: [2, 0], backLeg: [-2, 0] }),
      A({ body: [1, 1], frontArm: -40, weapon: 100, frontLeg: [1, 0] }),
      A({ body: [0, 0], frontArm: restArm - 5, weapon: restWeapon + 20 }),
    ];
    hitFrame = 3;
  } else if (style === 'thrust') {
    attack = [
      A({ body: [-1, 0], frontArm: -70, weapon: 80, backArm: 20 }),
      A({ body: [-2, 0], frontArm: -60, weapon: 88, backArm: 25, backLeg: [-1, 0] }),
      A({ body: [1, 0], frontArm: -88, weapon: 90, frontLeg: [2, 0], backLeg: [-1, 0] }),
      A({ body: [3, 0], frontArm: -90, weapon: 90, frontLeg: [3, 0], backLeg: [-2, 0] }),
      A({ body: [1, 0], frontArm: -80, weapon: 88 }),
      A({}),
    ];
    hitFrame = 3;
  } else if (style === 'sling') {
    // Sling strap hangs down at 0: +90 points back, 180 up, -90 forward.
    attack = [
      A({ body: [-1, 0], frontArm: -165, weapon: 90, backArm: 20 }),
      A({ body: [-1, -1], frontArm: -175, weapon: 180, backArm: 10 }),
      A({ body: [0, -1], frontArm: -170, weapon: -100, backArm: 0 }),
      A({ body: [1, 0], frontArm: -115, weapon: -60, weaponAlt: true, frontLeg: [2, 0], backLeg: [-1, 0] }),
      A({ body: [1, 0], frontArm: -70, weapon: -20, weaponAlt: true, frontLeg: [1, 0] }),
      A({ weaponAlt: true }),
    ];
    hitFrame = 3;
  } else if (style === 'bow') {
    // Bow is vertical at 0, held out front; the back hand draws the string.
    attack = [
      A({ frontArm: -90, weapon: 0, backArm: -95 }),
      A({ body: [-1, 0], frontArm: -92, weapon: 0, backArm: -70 }),
      A({ body: [-1, 0], frontArm: -92, weapon: 0, backArm: -60 }),
      A({ frontArm: -90, weapon: 0, backArm: -120 }),
      A({ frontArm: -85, weapon: 3, backArm: -100 }),
      A({ frontArm: -60, weapon: 15, backArm: 0 }),
    ];
    hitFrame = 3;
  } else if (style === 'throw') {
    attack = [
      A({ body: [-1, 0], frontArm: -160, weapon: -120, backArm: 20 }),
      A({ body: [-1, -1], frontArm: -200, weapon: -200, backArm: 10 }),
      A({ body: [0, -1], frontArm: -240, weapon: -280, backArm: 0 }),
      A({ body: [1, 0], frontArm: -110, weapon: 60, frontLeg: [2, 0], backLeg: [-1, 0] }),
      A({ body: [1, 0], frontArm: -70, weapon: 90, frontLeg: [1, 0] }),
      A({}),
    ];
    hitFrame = 3;
  } else {
    attack = [
      A({ frontArm: -90, weapon: 90 }),
      A({ frontArm: -90, weapon: 90 }),
      A({ body: [-1, 0], frontArm: -92, weapon: 88 }),
      A({ body: [-2, 0], frontArm: -100, weapon: 80 }),
      A({ body: [-1, 0], frontArm: -94, weapon: 86 }),
      A({ frontArm: -90, weapon: 90 }),
    ];
    hitFrame = 3;
  }

  const hit = [P({ body: [-2, 0], head: [-1, 0], headVariant: 'hurt', frontArm: restArm + 25, weapon: restWeapon + 25, backArm: 35 })];

  const fallBase = buildFrame(r, P({ body: [-1, 0], headVariant: 'hurt', frontArm: -120, weapon: -80, backArm: -140, frontLeg: [1, 0] }));
  const feet: [number, number] = [r.hip[0] - 2, r.frameH - 4];
  const ground = r.hip[1] + 4;
  // roomyDeath (later Ages): rotate on a padded canvas so the fallen body is never clipped by the frame edge.
  const fall = (deg: number) => {
    if (!opts.roomyDeath) return toGround(rotateFrame(fallBase, deg, feet[0], feet[1]), ground);
    const P = 20;
    const wide = new Img(r.frameW + P, r.frameH);
    wide.blit(fallBase, P, 0);
    const g = toGround(rotateFrame(wide, deg, feet[0] + P, feet[1]), ground);
    const b = g.bounds();
    return g.crop(Math.min(P, b.x - 1), 0, r.frameW, r.frameH);
  };
  const death = [buildFrame(r, hit[0]), fall(-25), fall(-60), fall(-90)];

  return [
    { name: 'idle', frames: idle.map((p) => buildFrame(r, p)), fps: 5, loop: true },
    { name: 'walk', frames: walk.map((p) => buildFrame(r, p)), fps: 8, loop: true },
    { name: 'attack', frames: attack.map((p) => buildFrame(r, p)), fps: 10, loop: false, hitFrame },
    { name: 'hit', frames: hit.map((p) => buildFrame(r, p)), fps: 8, loop: false },
    { name: 'death', frames: death, fps: 10, loop: false },
  ];
}

/** Shift a frame so its lowest opaque pixel sits on the ground line. */
export function toGround(img: Img, groundY: number): Img {
  const b = img.bounds();
  const out = new Img(img.w, img.h);
  const dx = b.x < 1 ? 1 - b.x : b.x + b.w > img.w - 1 ? img.w - 1 - (b.x + b.w) : 0;
  out.blit(img, dx, groundY - (b.y + b.h - 1));
  return out;
}
