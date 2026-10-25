import { Img } from '../img';
import { buildFrame, rotateFrame, type AnimSpec, type Pose, type RigParts } from '../rig';

export type AttackStyle = 'swing' | 'sling' | 'throw' | 'shoot' | 'thrust';

/** Standard animation set for a humanoid troop. Timing is tuned for the sim's 0.4 s wind-up. */
export function humanoidAnims(r: RigParts, style: AttackStyle, rest: Partial<Pose> = {}): AnimSpec[] {
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
  if (style === 'swing') {
    attack = [
      P({ body: [-1, 0], frontArm: -150, weapon: -70, backArm: 30, weaponBehind: true }),
      P({ body: [-1, -1], frontArm: -175, weapon: -30, backArm: 20, frontLeg: [1, 0], weaponBehind: true }),
      P({ body: [1, 0], frontArm: -95, weapon: 80, backArm: -10, frontLeg: [2, 0], backLeg: [-1, 0] }),
      P({ body: [2, 1], head: [0, 1], frontArm: -50, weapon: 125, backArm: -20, frontLeg: [2, 0], backLeg: [-2, 0] }),
      P({ body: [1, 1], frontArm: -40, weapon: 100, frontLeg: [1, 0] }),
      P({ body: [0, 0], frontArm: restArm - 5, weapon: restWeapon + 20 }),
    ];
    hitFrame = 3;
  } else if (style === 'thrust') {
    attack = [
      P({ body: [-1, 0], frontArm: -70, weapon: 80, backArm: 20 }),
      P({ body: [-2, 0], frontArm: -60, weapon: 88, backArm: 25, backLeg: [-1, 0] }),
      P({ body: [1, 0], frontArm: -88, weapon: 90, frontLeg: [2, 0], backLeg: [-1, 0] }),
      P({ body: [3, 0], frontArm: -90, weapon: 90, frontLeg: [3, 0], backLeg: [-2, 0] }),
      P({ body: [1, 0], frontArm: -80, weapon: 88 }),
      P({}),
    ];
    hitFrame = 3;
  } else if (style === 'sling') {
    // Sling strap hangs down at 0: +90 points back, 180 up, -90 forward.
    attack = [
      P({ body: [-1, 0], frontArm: -165, weapon: 90, backArm: 20 }),
      P({ body: [-1, -1], frontArm: -175, weapon: 180, backArm: 10 }),
      P({ body: [0, -1], frontArm: -170, weapon: -100, backArm: 0 }),
      P({ body: [1, 0], frontArm: -115, weapon: -60, weaponAlt: true, frontLeg: [2, 0], backLeg: [-1, 0] }),
      P({ body: [1, 0], frontArm: -70, weapon: -20, weaponAlt: true, frontLeg: [1, 0] }),
      P({ weaponAlt: true }),
    ];
    hitFrame = 3;
  } else if (style === 'throw') {
    attack = [
      P({ body: [-1, 0], frontArm: -160, weapon: -120, backArm: 20 }),
      P({ body: [-1, -1], frontArm: -200, weapon: -200, backArm: 10 }),
      P({ body: [0, -1], frontArm: -240, weapon: -280, backArm: 0 }),
      P({ body: [1, 0], frontArm: -110, weapon: 60, frontLeg: [2, 0], backLeg: [-1, 0] }),
      P({ body: [1, 0], frontArm: -70, weapon: 90, frontLeg: [1, 0] }),
      P({}),
    ];
    hitFrame = 3;
  } else {
    attack = [
      P({ frontArm: -90, weapon: 90 }),
      P({ frontArm: -90, weapon: 90 }),
      P({ body: [-1, 0], frontArm: -92, weapon: 88 }),
      P({ body: [-2, 0], frontArm: -100, weapon: 80 }),
      P({ body: [-1, 0], frontArm: -94, weapon: 86 }),
      P({ frontArm: -90, weapon: 90 }),
    ];
    hitFrame = 3;
  }

  const hit = [P({ body: [-2, 0], head: [-1, 0], headVariant: 'hurt', frontArm: restArm + 25, weapon: restWeapon + 25, backArm: 35 })];

  const fallBase = buildFrame(r, P({ body: [-1, 0], headVariant: 'hurt', frontArm: -120, weapon: -80, backArm: -140, frontLeg: [1, 0] }));
  const feet: [number, number] = [r.hip[0] - 2, r.frameH - 4];
  const ground = r.hip[1] + 4;
  const death = [
    buildFrame(r, hit[0]),
    toGround(rotateFrame(fallBase, -25, feet[0], feet[1]), ground),
    toGround(rotateFrame(fallBase, -60, feet[0], feet[1]), ground),
    toGround(rotateFrame(fallBase, -90, feet[0], feet[1]), ground),
  ];

  return [
    { name: 'idle', frames: idle.map((p) => buildFrame(r, p)), fps: 5, loop: true },
    { name: 'walk', frames: walk.map((p) => buildFrame(r, p)), fps: 8, loop: true },
    { name: 'attack', frames: attack.map((p) => buildFrame(r, p)), fps: 10, loop: false, hitFrame },
    { name: 'hit', frames: hit.map((p) => buildFrame(r, p)), fps: 8, loop: false },
    { name: 'death', frames: death, fps: 10, loop: false },
  ];
}

/** Shift a frame so its lowest opaque pixel sits on the ground line. */
function toGround(img: Img, groundY: number): Img {
  const b = img.bounds();
  const out = new Img(img.w, img.h);
  const dx = b.x < 1 ? 1 - b.x : b.x + b.w > img.w - 1 ? img.w - 1 - (b.x + b.w) : 0;
  out.blit(img, dx, groundY - (b.y + b.h - 1));
  return out;
}
