/**
 * Stormglass master palette (original). Ramps go highlight -> base -> shade -> deep.
 * Every generated asset draws from these ramps so the whole game reads as one set.
 */
import { hex } from './img';

export const INK = hex('#1e1526'); // universal outline
export const INK2 = hex('#3b2a40'); // soft inner line
export const WHITE = hex('#fff8ec');

export const SKIN = { hl: hex('#ffd6ac'), base: hex('#f2a97a'), shade: hex('#cc7a58'), deep: hex('#94503f') };
export const SKIN_DARK = { hl: hex('#d99a6c'), base: hex('#b3714c'), shade: hex('#8a4f36'), deep: hex('#5e3324') };
export const HAIR = { hl: hex('#9a6238'), base: hex('#6e3e24'), shade: hex('#4a2618'), deep: hex('#2e1610') };
export const HAIR_RED = { hl: hex('#e0864a'), base: hex('#b8542c'), shade: hex('#84341f'), deep: hex('#521f16') };
export const FUR = { hl: hex('#f4d494'), base: hex('#d6a160'), shade: hex('#a86e3e'), deep: hex('#734424') };
export const LEATHER = { hl: hex('#c98a52'), base: hex('#9a5c34'), shade: hex('#6e3a22'), deep: hex('#472214') };
export const WOOD = { hl: hex('#d99a5c'), base: hex('#ad6a3c'), shade: hex('#7f4428'), deep: hex('#52291b') };
export const STONE = { hl: hex('#dcd6c8'), base: hex('#aaa396'), shade: hex('#7e7770'), deep: hex('#575050'), dark: hex('#3a3338') };
export const MOSS = { hl: hex('#cfe27a'), base: hex('#93c252'), shade: hex('#5e9a40'), deep: hex('#3b6c38'), dark: hex('#264a30') };
export const BONE = { hl: hex('#fbf4e0'), base: hex('#e2d6b6'), shade: hex('#b3a486'), deep: hex('#7d705c') };
export const GOLD = { hl: hex('#fff3a8'), base: hex('#ffd03c'), shade: hex('#e09a1e'), deep: hex('#a35f16') };
export const FIRE = { hl: hex('#fff6b0'), base: hex('#ffc33a'), shade: hex('#ff7c1f'), deep: hex('#d23c1e') };
export const GEM = { hl: hex('#d6f6ff'), base: hex('#5fd8f0'), shade: hex('#2c94d0'), deep: hex('#1d528f') };
export const ROSE = hex('#f07a7a');
export const MOUTH = hex('#7c2e30');

export const TEAM_BLUE = { hl: hex('#a6e2ff'), base: hex('#4aa6ec'), shade: hex('#2d68c2'), deep: hex('#1f3f80') };
export const TEAM_RED = { hl: hex('#ffb08c'), base: hex('#e64d4d'), shade: hex('#ae2a40'), deep: hex('#6a1a33') };
export type Ramp = typeof TEAM_BLUE;
export const BRONZE = { hl: hex('#fff2a6'), base: hex('#e6b84a'), shade: hex('#b07a2c'), deep: hex('#6a3f1c') };
export const LINEN = { hl: hex('#fffaf0'), base: hex('#ece2cc'), shade: hex('#c4b494'), deep: hex('#8e7e64') };
export const SAND = { hl: hex('#fbe8b8'), base: hex('#e8c88a'), shade: hex('#c49a5e'), deep: hex('#8e6a3e'), dark: hex('#5e4430') };
export const STEEL = { hl: hex('#f2f6fa'), base: hex('#b8c2cc'), shade: hex('#7e8a96'), deep: hex('#4e5864') };

// Later Ages (Crusader to Future). Same ramp shape: highlight -> base -> shade -> deep.
export const MAIL = { hl: hex('#d6dce2'), base: hex('#9ea8b2'), shade: hex('#6e7884'), deep: hex('#474e5a') };
export const IRON = { hl: hex('#9aa2ae'), base: hex('#6a7280'), shade: hex('#4a505e'), deep: hex('#30343f') };
export const FELT = { hl: hex('#6a5a6e'), base: hex('#45384c'), shade: hex('#312838'), deep: hex('#221c28') };
export const KHAKI = { hl: hex('#d6cc96'), base: hex('#aea46c'), shade: hex('#807a4c'), deep: hex('#555234') };
export const DRAB = { hl: hex('#a8b294'), base: hex('#7c866a'), shade: hex('#5a624e'), deep: hex('#3c4236') };
export const BRICK = { hl: hex('#e28a6a'), base: hex('#b8573e'), shade: hex('#8c3d30'), deep: hex('#5e2a26') };
export const ALLOY = { hl: hex('#f2f6fb'), base: hex('#c6d0dc'), shade: hex('#8e9aae'), deep: hex('#5a6680') };
export const SUIT = { hl: hex('#5e6688'), base: hex('#404668'), shade: hex('#2c304e'), deep: hex('#1e2038') };
export const PLASMA = { hl: hex('#ffffff'), base: hex('#c4fbff'), shade: hex('#5ce6ff'), deep: hex('#2a9cf0') };
