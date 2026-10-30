/**
 * Biped machine rig (Steam Walker, Mech). Same sticker style as the paper-doll troops: every part
 * is outlined on its own and composited back to front. Legs are two-bone limbs solved per frame
 * (hip, knee, ankle) so the feet plant and lift through a real walk cycle.
 */
import { Img, mix, type Color } from '../img';
import { INK } from '../palette';
import { place, type AnimSpec, type Limb } from '../rig';
import { toGround } from './anims';
import { seg } from './kit';

type R4 = { hl: Color; base: Color; shade: Color; deep: Color };

export interface BipedRig {
  frameW: number;
  frameH: number;
  /** [anchor x, ground - 4]: the sheet anchor is hip + [0, 4], i.e. the ground under the body. */
  hip: [number, number];
  body: Img;
  /** Body with a hurt face (hit and death frames). */
  hurtBody?: Img;
  /** Point of the body image that sits on the pelvis. */
  bodyPivot: [number, number];
  /** Pelvis height above the ground at rest. */
  pelvisH: number;
  frontHip: number;
  backHip: number;
  thigh: number;
  shin: number;
  legW: [number, number];
  legRamp: R4;
  /** Optional second ramp for the shin (pistons, armour). */
  shinRamp?: R4;
  foot: Img;
  /** Ankle position within the foot image. */
  ankle: [number, number];
  /** Knee bends forward (+1) or back (-1). */
  knee: 1 | -1;
  /** Arm hanging down at 0 degrees from its pivot (rig convention). */
  arm: Limb;
  shoulder: [number, number];
  /** Optional rear arm/pod drawn behind the body. */
  backArm?: Limb;
  backShoulder?: [number, number];
  /** Extra decoration drawn on top of each frame (per-frame index and pelvis position). */
  stride: number;
}

export interface BipedPose {
  body?: [number, number];
  front?: [number, number];
  back?: [number, number];
  arm?: number;
  backArm?: number;
  /** Draw on top after compositing (muzzle flashes, steam, sparks). */
  fx?: (f: Img, pelvis: [number, number]) => void;
  /** Swap the body image (hurt variant). */
  bodyImg?: Img;
}

const darker = (r: R4): R4 => ({ hl: r.base, base: r.shade, shade: r.deep, deep: mix(r.deep, INK, 0.4) });

function leg(rig: BipedRig, hip: [number, number], foot: [number, number], far: boolean): Img {
  const img = new Img(rig.frameW, rig.frameH);
  const [hx, hy] = hip;
  let [fx, fy] = foot;
  const a = rig.thigh, b = rig.shin;
  let d = Math.hypot(fx - hx, fy - hy);
  if (d > a + b - 0.05) {
    const k = (a + b - 0.05) / d;
    fx = hx + (fx - hx) * k;
    fy = hy + (fy - hy) * k;
    d = a + b - 0.05;
  }
  const th = Math.atan2(fy - hy, fx - hx);
  const al = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))));
  const kx = hx + Math.cos(th - rig.knee * al) * a;
  const ky = hy + Math.sin(th - rig.knee * al) * a;
  const ramp = far ? darker(rig.legRamp) : rig.legRamp;
  const sramp = far ? darker(rig.shinRamp ?? rig.legRamp) : rig.shinRamp ?? rig.legRamp;
  seg(img, kx, ky, fx, fy, rig.legW[1], sramp);
  seg(img, hx, hy, kx, ky, rig.legW[0], ramp);
  img.ellipse(kx, ky, rig.legW[0] / 2 + 0.5, rig.legW[0] / 2 + 0.5, (_x, _y, nx, ny) => (nx + ny < -0.4 ? ramp.hl : ramp.base));
  const footImg = far ? rig.foot.clone().map((c) => (c ? mix(c, INK, 0.3) : c)) : rig.foot;
  img.blit(footImg, Math.round(fx - rig.ankle[0]), Math.round(fy - rig.ankle[1]));
  return img.outlined(INK, { pad: 0 });
}

export function bipedFrame(rig: BipedRig, p: BipedPose): Img {
  const f = new Img(rig.frameW, rig.frameH);
  const ground = rig.hip[1] + 4;
  const [bx, by] = p.body ?? [0, 0];
  const pelvis: [number, number] = [rig.hip[0] + bx, ground - rig.pelvisH + by];
  const footY = ground - (rig.foot.h - rig.ankle[1]);
  const fp = p.front ?? [0, 0];
  const bp = p.back ?? [0, 0];
  const at = (o: [number, number]): [number, number] => [pelvis[0] + o[0], pelvis[1] + o[1]];
  if (rig.backArm && rig.backShoulder) place(f, rig.backArm, p.backArm ?? 0, at(rig.backShoulder), INK);
  f.blit(leg(rig, [pelvis[0] + rig.backHip, pelvis[1]], [rig.hip[0] + rig.backHip + bx + bp[0], footY - bp[1]], true), 0, 0);
  f.blit(leg(rig, [pelvis[0] + rig.frontHip, pelvis[1]], [rig.hip[0] + rig.frontHip + bx + fp[0], footY - fp[1]], false), 0, 0);
  const body = (p.bodyImg ?? rig.body).outlined(INK);
  f.blit(body, Math.round(pelvis[0] - rig.bodyPivot[0] - 1), Math.round(pelvis[1] - rig.bodyPivot[1] - 1));
  place(f, rig.arm, p.arm ?? 0, at(rig.shoulder), INK);
  p.fx?.(f, pelvis);
  return f;
}

/** Standard five animations for a biped machine; `attack` supplies the six attack poses. */
export function bipedAnims(rig: BipedRig, rest: number, attack: BipedPose[], hurt: BipedPose, stepFx?: (f: Img, pelvis: [number, number]) => void): AnimSpec[] {
  const s = rig.stride;
  const P = (q: BipedPose): BipedPose => ({ arm: rest, backArm: rest, ...q });
  const idle = [P({}), P({}), P({ body: [0, 1], arm: rest + 4 }), P({ body: [0, 1], arm: rest + 4 })];
  const walk = [
    P({ body: [0, 1], front: [s, 0], back: [-s, 0], arm: rest - 8, backArm: rest + 8, fx: stepFx }),
    P({ body: [0, -1], front: [0, 0], back: [0, 3], arm: rest }),
    P({ body: [0, 1], front: [-s, 0], back: [s, 0], arm: rest + 8, backArm: rest - 8, fx: stepFx }),
    P({ body: [0, -1], front: [0, 3], back: [0, 0], arm: rest }),
  ];
  const ground = rig.hip[1] + 4;
  const fallen = (dy: number, tilt: number): Img => {
    const fr = bipedFrame(rig, P({ ...hurt, body: [-1, dy], front: [2, 0], back: [-3, 0], arm: rest + tilt }));
    return toGround(fr, ground);
  };
  const death = [
    bipedFrame(rig, P(hurt)),
    fallen(3, 20),
    fallen(6, 35),
    wreck(rig, P(hurt)),
  ];
  return [
    { name: 'idle', frames: idle.map((q) => bipedFrame(rig, q)), fps: 5, loop: true },
    { name: 'walk', frames: walk.map((q) => bipedFrame(rig, q)), fps: 8, loop: true },
    { name: 'attack', frames: attack.map((q) => bipedFrame(rig, P(q))), fps: 10, loop: false, hitFrame: 3 },
    { name: 'hit', frames: [bipedFrame(rig, P(hurt))], fps: 8, loop: false },
    { name: 'death', frames: death, fps: 10, loop: false },
  ];
}

/** Collapsed wreck: legs folded flat, body slumped on the ground. */
function wreck(rig: BipedRig, hurt: BipedPose): Img {
  const f = new Img(rig.frameW, rig.frameH);
  const ground = rig.hip[1] + 4;
  const body = (hurt.bodyImg ?? rig.body).outlined(INK);
  const footY = ground - (rig.foot.h - rig.ankle[1]);
  const pelvis: [number, number] = [rig.hip[0] - 2, footY - 3];
  f.blit(leg(rig, [pelvis[0] + rig.backHip, pelvis[1]], [pelvis[0] + rig.backHip - 6, footY], true), 0, 0);
  f.blit(leg(rig, [pelvis[0] + rig.frontHip, pelvis[1]], [pelvis[0] + rig.frontHip + 7, footY], false), 0, 0);
  f.blit(body, Math.round(pelvis[0] - rig.bodyPivot[0] - 1), ground - body.h + 2);
  place(f, rig.arm, -100, [pelvis[0] + rig.shoulder[0], pelvis[1] + rig.shoulder[1] + 4], INK);
  return f;
}
