/** App shell: owns the engine pieces, the save, and the current scene. */
import type { Assets } from './engine/assets';
import type { Audio } from './engine/audio';
import { Draw } from './engine/draw';
import type { Input } from './engine/input';
import type { Screen } from './engine/screen';
import { loadSave, writeSave, type SaveData, type Storage } from './game/save';

export interface Scene {
  update(dt: number): void;
  draw(): void;
  /** Called when the virtual screen size changes. */
  resize?(): void;
  key?(k: string): void;
}

export class App {
  readonly draw: Draw;
  save: SaveData;
  scene!: Scene;
  /** Seconds since start, for UI animation. */
  time = 0;
  private store: Storage | null;
  private sceneFactories: Record<string, (arg?: unknown) => Scene> = {};

  constructor(
    readonly screen: Screen,
    readonly assets: Assets,
    readonly input: Input,
    readonly audio: Audio,
  ) {
    this.draw = new Draw(screen.ctx, assets);
    this.store = safeStorage();
    this.save = loadSave(this.store);
    audio.muted = !this.save.settings.sound;
    input.keys = (k) => this.scene?.key?.(k);
    screen.onResize = () => this.scene?.resize?.();
  }

  get w(): number {
    return this.screen.size.w;
  }
  get h(): number {
    return this.screen.size.h;
  }
  get reducedMotion(): boolean {
    return this.save.settings.reducedMotion;
  }

  register(name: string, factory: (arg?: unknown) => Scene): void {
    this.sceneFactories[name] = factory;
  }

  go(name: string, arg?: unknown): void {
    const f = this.sceneFactories[name];
    if (!f) throw new Error(`No scene ${name}`);
    this.scene = f(arg);
  }

  persist(): void {
    writeSave(this.store, this.save);
  }

  frame(dt: number): void {
    this.time += dt;
    this.input.begin();
    this.scene.update(dt);
    this.screen.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.scene.draw();
    this.input.end();
    this.screen.present();
  }

  sfx(name: string, opts?: Parameters<Audio['play']>[1]): void {
    this.audio.play(name, opts);
  }
}

function safeStorage(): Storage | null {
  try {
    const s = window.localStorage;
    s.setItem('stormglass.probe', '1');
    s.removeItem('stormglass.probe');
    return s;
  } catch {
    return null;
  }
}
