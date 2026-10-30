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

export function buildFrame(r: RigParts, pose: Pose): Img {
  const ink = r.outline ?? INK;
  const f = new Img(r.frameW, r.frameH);
  const [bx, by] = pose.body ?? [0, 0];
  const hip: [number, number] = [r.hip[0] + bx, r.hip[1] + by];
  const at = (o: [number, number], extra: [number, number] = [0, 0]): [number, number] => [hip[0] + o[0] + extra[0], hip[1] + o[1] + extra[1]];
  // Legs stay planted relative to the ground, not the body bob.
  const legHip = (o: [number, number], d: [number, number] = [0, 0]): [number, number] => [r.hip[0] + bx + o[0] + d[0], r.hip[1] + o[1] + d[1]];

  const fs = at(r.frontShoulder);
  const bs = at(r.backShoulder);
  const fa = pose.frontArm ?? 0;
  const ba = pose.backArm ?? 0;
  const drawWeapon = () => {
    const w = pose.weaponAlt && r.weaponAlt ? r.weaponAlt : r.weapon;
    if (w && pose.weapon !== undefined) place(f, w, pose.weapon, handPos(r.frontArm, fs, fa), ink);
  };

  if (r.back) place(f, r.back, 0, at(r.neck), ink);
  if (pose.weaponBehind) drawWeapon();
  place(f, r.backArm, ba, bs, ink);
  const drawOffhand = () => {
    if (r.offhand && pose.offhand !== undefined) place(f, r.offhand, pose.offhand, handPos(r.backArm, bs, ba), ink);
  };
  if (!r.offhandInFront) drawOffhand();
  place(f, r.backLeg, 0, legHip(r.backHip, pose.backLeg), ink);
  place(f, r.frontLeg, 0, legHip(r.frontHip, pose.frontLeg), ink);
  place(f, r.torso, 0, hip, ink);
  if (r.offhandInFront) drawOffhand();
  const head = r.heads[pose.headVariant ?? 'normal'] ?? r.heads.normal;
  place(f, head, 0, at(r.neck, pose.head), ink);
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
  return [Math.round(hand[0] + dx - r.hip[0]), Math.round(hand[1] + dy - (r.hip[1] + 4))];
}
