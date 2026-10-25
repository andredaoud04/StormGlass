/**
 * Immediate-mode tap regions. UI code registers regions while drawing each frame; pointer
 * events are tested against the regions of the last drawn frame (topmost first).
 */
import type { Screen } from './screen';

export interface Region {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  onTap: () => void;
  /** Fire on press instead of release (troop cards, for instant response). */
  onDown?: boolean;
}

export class Input {
  private building: Region[] = [];
  private live: Region[] = [];
  pressedId: string | null = null;
  pointerInside = false;
  x = -1;
  y = -1;
  down = false;
  /** Set by any tap; used to unlock audio. */
  onFirstGesture: (() => void) | null = null;
  keys: ((key: string) => void) | null = null;

  constructor(private screen: Screen) {
    const el = screen.canvas;
    el.addEventListener('pointerdown', (e) => this.handleDown(e));
    window.addEventListener('pointermove', (e) => this.handleMove(e));
    window.addEventListener('pointerup', (e) => this.handleUp(e));
    window.addEventListener('pointercancel', () => {
      this.pressedId = null;
      this.down = false;
    });
    window.addEventListener('keydown', (e) => this.keys?.(e.key));
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Start registering regions for a new frame. */
  begin(): void {
    this.building = [];
  }
  /** Publish this frame's regions for hit testing. */
  end(): void {
    this.live = this.building;
  }

  region(r: Region): void {
    this.building.push(r);
  }

  /** True while this region is held down with the pointer still over it. */
  isPressed(id: string): boolean {
    return this.pressedId === id && this.pointerInside;
  }

  private find(x: number, y: number): Region | undefined {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const r = this.live[i];
      if (x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) return r;
    }
    return undefined;
  }

  private handleDown(e: PointerEvent): void {
    e.preventDefault();
    this.onFirstGesture?.();
    [this.x, this.y] = this.screen.toVirtual(e.clientX, e.clientY);
    this.down = true;
    const r = this.find(this.x, this.y);
    this.pressedId = r?.id ?? null;
    this.pointerInside = !!r;
    if (r?.onDown) {
      r.onTap();
      this.pressedId = r.id;
    }
  }

  private handleMove(e: PointerEvent): void {
    [this.x, this.y] = this.screen.toVirtual(e.clientX, e.clientY);
    if (this.pressedId) {
      const r = this.live.find((q) => q.id === this.pressedId);
      this.pointerInside = !!r && this.x >= r.x && this.y >= r.y && this.x < r.x + r.w && this.y < r.y + r.h;
    }
  }

  private handleUp(e: PointerEvent): void {
    [this.x, this.y] = this.screen.toVirtual(e.clientX, e.clientY);
    const id = this.pressedId;
    this.pressedId = null;
    this.down = false;
    if (!id) return;
    const r = this.find(this.x, this.y);
    if (r && r.id === id && !r.onDown) r.onTap();
  }
}
