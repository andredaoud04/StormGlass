import { App } from './app';
import { Assets } from './engine/assets';
import { Audio } from './engine/audio';
import { Input } from './engine/input';
import { Screen } from './engine/screen';
import { BattleScene } from './scenes/battle';
import { MenuScene, type Tab } from './scenes/menu';

async function boot(): Promise<void> {
  const host = document.getElementById('game')!;
  const bar = document.querySelector<HTMLDivElement>('#boot > div');
  const screen = new Screen(host);
  const assets = new Assets();
  await assets.load('./assets/', (done, total) => {
    if (bar) bar.style.width = `${Math.round((done / total) * 100)}%`;
  });
  document.getElementById('boot')?.remove();
  const audio = new Audio();
  audio.configure(assets.manifest.sounds);
  const input = new Input(screen);
  input.onFirstGesture = () => audio.unlock();
  const app = new App(screen, assets, input, audio);
  app.register('menu', (tab) => new MenuScene(app, (tab as Tab) ?? 'battle'));
  app.register('battle', () => new BattleScene(app));
  app.go('menu');

  // Test and screenshot hook (no gameplay effect unless called).
  (window as unknown as { __sg: unknown }).__sg = { app, MenuScene, BattleScene };

  let last = performance.now();
  const loop = (now: number) => {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    app.frame(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      app.persist();
      app.scene.key?.('blur');
    }
  });
}

void boot();
