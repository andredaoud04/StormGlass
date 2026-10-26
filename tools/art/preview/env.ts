import { Img } from '../img';
import { TEAM_BLUE, TEAM_RED } from '../palette';
import { stoneEnv } from '../env/stone';
import { STONE_TROOPS, makeTroop } from '../troops/catalog';

const env = stoneEnv();
const W = 195, H = 250, GL = 170, off = Math.floor((256 - W) / 2);
const scene = new Img(W, H).fill(env.skyTop);
for (const k of ['sky', 'far', 'mid', 'ground']) {
  const l = env.layers[k];
  scene.blit(l.img, -off, GL - l.groundY);
}
scene.blit(env.clouds[0], 100, 40);
scene.blit(env.clouds[1], 20, 90);
scene.blit(env.clouds[2], 140, 100);
const extra = (process.argv[3] ?? '') === 'units';
if (extra) {
  let x = 40;
  for (const t of STONE_TROOPS) for (const [team, flip] of [[TEAM_BLUE, false], [TEAM_RED, true]] as const) {
    const m = makeTroop(t, team);
    const frame = m.anims[1].frames[0];
    const fx = flip ? 150 - (x - 40) : x;
    scene.blit(flip ? frame.flipped() : frame, fx - (flip ? m.frameW - m.anchor[0] : m.anchor[0]), GL - m.anchor[1]);
    if (!flip) x += 18;
  }
}
scene.scaled(4).save(process.argv[2]);
