/**
 * Paper-doll rig for chibi troops. Parts are small hand-authored grids; frames are built from
 * pose parameters (offsets and limb angles). Each part is rotated with RotSprite and outlined
 * on its own before compositing, which gives the bold "sticker" outline style.
 *
 * Angles are in degrees, clockwise on screen. Arms hang down at 0 (so -90 points forward,
 * -180 points up). Weapons point up at 0 (so 90 points forward, 180 points down).
 */
import { Img, rotSprite, type Color } from './img';
import { INK } from './palette';

export interface Limb {
  img: Img;
  /** Attach point (shoulder, hip, neck, grip) in image pixels. */
  pivot: [number, number];
  /** Far end (hand) in image pixels, for arms. */
  tip?: [number, number];
}

export interface RigParts {
  frameW: number;
  frameH: number;
  /** Hip centre in the frame at rest. Torso pivot sits here. */
  hip: [number, number];
  torso: Limb;
  /** Offsets from the hip (at rest) to each attach point. */
  neck: [number, number];
  frontShoulder: [number, number];
  backShoulder: [number, number];
  frontHip: [number, number];
  backHip: [number, number];
  heads: Record<string, Limb>;
  frontArm: Limb;
  backArm: Limb;
  frontLeg: Limb;
  backLeg: Limb;
  weapon?: Limb;
  /** Alternate weapon image (e.g. an empty sling after release). */
  weaponAlt?: Limb;
  /** Optional piece worn on the back (cape, quiver), drawn behind everything. */
  back?: Limb;
  /** Optional offhand item (shield) held in the back hand, drawn above the back arm. */
  offhand?: Limb;
  /** Draw the offhand (shield) in front of the torso instead of behind it. */
  offhandInFront?: boolean;
  outline?: Color;
  /** Multiplies pose offsets (body, head, legs) for rigs drawn at a larger pixel scale (bosses). */
  poseScale?: number;
  /** Rows from the hip down to the soles (the sheet anchor). Default 4, the troop leg length. */
  footY?: number;
}

export interface Pose {
  body?: [number, number];
  head?: [number, number];
  headVariant?: string;
  frontArm?: number;
  backArm?: number;
  frontLeg?: [number, number];
  backLeg?: [number, number];
  /** Weapon angle; undefined hides the weapon. */
  weapon?: number;
  /** Draw the weapon behind the head and body (e.g. wound up behind the back). */
  weaponBehind?: boolean;
  weaponAlt?: boolean;
  /** Extra image drawn last at a frame position (smears, projectiles in hand). */
  overlay?: { img: Img; at: [number, number] };
  offhand?: number;
  /** Leg swing around the hip (negative = forward for a right-facing troop). */
  frontLegAngle?: number;
  backLegAngle?: number;
  /** Bend a leg: the shin shortens by this many pixels and the foot trails back (passing pose). */
  frontLegLift?: number;
  backLegLift?: number;
  /**
   * Lean the whole body around the feet (negative falls backward). Every part is rotated and
   * outlined on its own, so the outline stays crisp (no rotation of a finished frame).
   */
  tilt?: number;
}

const rad = (d: number) => (d * Math.PI) / 180;

function rotPoint(x: number, y: number, deg: number): [number, number] {
  const a = rad(deg);
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
}

/** Rotate a limb around its pivot and outline it; returns the image and where its pivot sits. */
function prepLimb(l: Limb, deg: number, ink: Color): { img: Img; px: number; py: number } {
  if (deg === 0) {
    const o = l.img.outlined(ink);
    return { img: o, px: l.pivot[0] + 1, py: l.pivot[1] + 1 };
  }
  const size = Math.ceil(Math.hypot(l.img.w, l.img.h)) * 2 + 4;
  const c = Math.floor(size / 2);
  const r = rotSprite(l.img, rad(deg), l.pivot[0] + 0.5, l.pivot[1] + 0.5, size, size, c + 0.5, c + 0.5);
  return { img: r.outlined(ink), px: c + 1, py: c + 1 };
}

export function place(frame: Img, l: Limb, deg: number, at: [number, number], ink: Color): void {
  const p = prepLimb(l, deg, ink);
  frame.blit(p.img, Math.round(at[0] - p.px), Math.round(at[1] - p.py));
}

function handPos(arm: Limb, shoulder: [number, number], deg: number): [number, number] {
  const tip = arm.tip ?? [arm.pivot[0], arm.img.h - 1];
  const [dx, dy] = rotPoint(tip[0] - arm.pivot[0], tip[1] - arm.pivot[1], deg);
  return [shoulder[0] + dx, shoulder[1] + dy];
}

/** A bent copy of a leg: drop `lift` shin rows and pull the foot back, for the passing pose. */
const bentCache = new WeakMap<Img, Map<number, Img>>();
function bentLeg(l: Limb, lift: number): Limb {
  if (!lift) return l;
  let m = bentCache.get(l.img);
  if (!m) bentCache.set(l.img, (m = new Map()));
  let img = m.get(lift);
  if (!img) {
    const src = l.img;
    const h = Math.max(2, src.h - lift);
    img = new Img(src.w + lift, h);
    // Thigh rows stay; the shin loses `lift` rows above the foot; the foot shifts back.
    const keep = h - 1;
    for (let y = 0; y < keep; y++) {
      const sy = y < keep - 1 ? y : src.h - 2;
      for (let x = 0; x < src.w; x++) img.set(x + lift, y, src.get(x, sy));
    }
    for (let x = 0; x < src.w; x++) img.set(x, h - 1, src.get(x, src.h - 1));
    m.set(lift, img);
  }
  return { ...l, img, pivot: [l.pivot[0] + lift, l.pivot[1]] };
}

export function buildFrame(r: RigParts, pose0: Pose): Img {
  const ink = r.outline ?? INK;
  const k = r.poseScale ?? 1;
  const sc = (v?: [number, number]): [number, number] | undefined => (v ? [v[0] * k, v[1] * k] : v);
  const lift = (v?: number) => (v ? v * k : v);
  const pose: Pose = k === 1 ? pose0 : { ...pose0, body: sc(pose0.body), head: sc(pose0.head), frontLeg: sc(pose0.frontLeg), backLeg: sc(pose0.backLeg), frontLegLift: lift(pose0.frontLegLift), backLegLift: lift(pose0.backLegLift) };
  const f = new Img(r.frameW, r.frameH);
  const [bx, by] = pose.body ?? [0, 0];
  const hip: [number, number] = [r.hip[0] + bx, r.hip[1] + by];
  const at = (o: [number, number], extra: [number, number] = [0, 0]): [number, number] => [hip[0] + o[0] + extra[0], hip[1] + o[1] + extra[1]];
  // Legs stay planted relative to the ground, not the body bob.
  const legHip0 = (o: [number, number], d: [number, number] = [0, 0]): [number, number] => [r.hip[0] + bx + o[0] + d[0], r.hip[1] + o[1] + d[1]];
  // Whole-body lean around the feet (death falls): rotate every attach point, add the lean to every part.
  const tilt = pose.tilt ?? 0;
  const feet: [number, number] = [r.hip[0] - 2, r.hip[1] + (r.footY ?? 4)];
  const T = (p: [number, number]): [number, number] => {
    if (!tilt) return p;
    const [dx, dy] = rotPoint(p[0] - feet[0], p[1] - feet[1], tilt);
    return [feet[0] + dx, feet[1] + dy];
  };
  const legHip = (o: [number, number], d?: [number, number]) => T(legHip0(o, d));

  const fs = T(at(r.frontShoulder));
  const bs = T(at(r.backShoulder));
  const fa = (pose.frontArm ?? 0) + tilt;
  const ba = (pose.backArm ?? 0) + tilt;
  const drawWeapon = () => {
    const w = pose.weaponAlt && r.weaponAlt ? r.weaponAlt : r.weapon;
    if (w && pose.weapon !== undefined) place(f, w, pose.weapon + tilt, handPos(r.frontArm, fs, fa), ink);
  };

  if (r.back) place(f, r.back, tilt, T(at(r.neck)), ink);
  if (pose.weaponBehind) drawWeapon();
  place(f, r.backArm, ba, bs, ink);
  const drawOffhand = () => {
    if (r.offhand && pose.offhand !== undefined) place(f, r.offhand, pose.offhand + tilt, handPos(r.backArm, bs, ba), ink);
  };
  if (!r.offhandInFront) drawOffhand();
  place(f, bentLeg(r.backLeg, pose.backLegLift ?? 0), (pose.backLegAngle ?? 0) + tilt, legHip(r.backHip, pose.backLeg), ink);
  place(f, bentLeg(r.frontLeg, pose.frontLegLift ?? 0), (pose.frontLegAngle ?? 0) + tilt, legHip(r.frontHip, pose.frontLeg), ink);
  place(f, r.torso, tilt, T(hip), ink);
  if (r.offhandInFront) drawOffhand();
  const head = r.heads[pose.headVariant ?? 'normal'] ?? r.heads.normal;
  place(f, head, tilt, T(at(r.neck, pose.head)), ink);
  if (!pose.weaponBehind) drawWeapon();
  place(f, r.frontArm, fa, fs, ink);
  if (pose.overlay) f.blit(pose.overlay.img, pose.overlay.at[0], pose.overlay.at[1]);
  return f;
}

/** Rotate a whole finished frame around a point (used for death falls). */
export function rotateFrame(src: Img, deg: number, px: number, py: number): Img {
  return rotSprite(src, rad(deg), px, py, src.w, src.h, px, py);
}

export interface AnimSpec {
  name: string;
  frames: Img[];
  fps: number;
  loop: boolean;
  /** Frame index where the hit lands or the projectile leaves. */
  hitFrame?: number;
}

/** Pack animations as rows of a sheet. */
export function packSheet(anims: AnimSpec[], fw: number, fh: number): { sheet: Img; rows: Record<string, { row: number; frames: number; fps: number; loop: boolean; hitFrame?: number }> } {
  const cols = Math.max(...anims.map((a) => a.frames.length));
  const sheet = new Img(cols * fw, anims.length * fh);
  const rows: Record<string, { row: number; frames: number; fps: number; loop: boolean; hitFrame?: number }> = {};
  anims.forEach((a, row) => {
    a.frames.forEach((fr, i) => sheet.blit(fr, i * fw, row * fh));
    rows[a.name] = { row, frames: a.frames.length, fps: a.fps, loop: a.loop, ...(a.hitFrame !== undefined ? { hitFrame: a.hitFrame } : {}) };
  });
  return { sheet, rows };
}

/**
 * Where the weapon's tip sits for a pose, relative to the sheet anchor (feet), facing right.
 * Used to place the projectile release point exactly at the muzzle.
 */
export function weaponTip(r: RigParts, pose: Pose): [number, number] {
  const [bx, by] = pose.body ?? [0, 0];
  const fs: [number, number] = [r.hip[0] + bx + r.frontShoulder[0], r.hip[1] + by + r.frontShoulder[1]];
  const hand = handPos(r.frontArm, fs, pose.frontArm ?? 0);
  const w = r.weapon;
  if (!w) return [hand[0] - r.hip[0], hand[1] - r.hip[1] - 4];
  const tip = w.tip ?? [w.pivot[0], 0];
  const [dx, dy] = rotPoint(tip[0] - w.pivot[0], tip[1] - w.pivot[1], pose.weapon ?? 0);
  return [Math.round(hand[0] + dx - r.hip[0]), Math.round(hand[1] + dy - (r.hip[1] + (r.footY ?? 4)))];
}
