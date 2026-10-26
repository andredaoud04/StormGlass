/** Reusable UI pieces drawn from the UI kit. */
import type { App } from '../app';
import type { FontKey } from '../engine/draw';

export type ButtonStyle = 'green' | 'gold' | 'red' | 'wood' | 'grey';

export interface ButtonOpts {
  style?: ButtonStyle;
  icon?: string;
  font?: FontKey;
  disabled?: boolean;
  /** Small second line under the label. */
  sub?: string;
  subIcon?: string;
  textColor?: string;
}

/** A 9-slice button with a pressed state. Returns true while held. */
export function button(app: App, id: string, x: number, y: number, w: number, h: number, label: string, onTap: () => void, o: ButtonOpts = {}): boolean {
  const d = app.draw;
  const style = o.disabled ? 'grey' : (o.style ?? 'wood');
  const pressed = !o.disabled && app.input.isPressed(id);
  const key = style === 'grey' ? 'ui.btn_grey' : `ui.btn_${style}${pressed ? '_down' : ''}`;
  d.nine(key, x, y, w, h);
  const face = h - (pressed || style === 'grey' ? 2 : 5);
  const top = y + (pressed || style === 'grey' ? 2 : 0);
  const font = o.font ?? 'big';
  const fh = d.fontHeight(font);
  const subH = o.sub ? 7 : 0;
  const contentH = fh + subH;
  let cy = Math.round(top + (face - contentH) / 2) + 1;
  const iconW = o.icon ? app.assets.image('icon.' + o.icon).w + 2 : 0;
  const tw = label ? d.measure(label, font) : 0;
  let cx = Math.round(x + (w - (iconW + tw)) / 2);
  if (o.icon) {
    const ie = app.assets.image('icon.' + o.icon);
    d.image('icon.' + o.icon, cx, Math.round(cy + fh / 2 - ie.h / 2), { alpha: o.disabled ? 0.6 : 1 });
    cx += iconW;
  }
  if (label) d.text(label, cx, cy, { font, color: o.disabled ? '#c9c2b8' : (o.textColor ?? '#fff8ec'), shadow: font === 'big' });
  if (o.sub) {
    cy += fh + 3;
    const sw = d.measure(o.sub) + (o.subIcon ? 11 : 0);
    let sx = Math.round(x + (w - sw) / 2);
    if (o.subIcon) {
      d.image('icon.' + o.subIcon, sx, cy - 2);
      sx += 11;
    }
    d.text(o.sub, sx, cy, { color: o.disabled ? '#c9c2b8' : '#fff1c0' });
  }
  if (!o.disabled) {
    app.input.region({
      id,
      x,
      y,
      w,
      h,
      onTap: () => {
        app.sfx('click', { vol: 0.6 });
        onTap();
      },
    });
  }
  return pressed;
}

/** An icon-only square button (pause, settings). */
export function iconButton(app: App, id: string, x: number, y: number, size: number, icon: string, onTap: () => void, style: ButtonStyle = 'wood'): void {
  button(app, id, x, y, size, size, '', onTap, { style, icon });
}

/** Currency counter: dark plaque with an icon and a number. */
export function counter(app: App, x: number, y: number, w: number, icon: string, value: string, color = '#fff8ec'): void {
  const d = app.draw;
  d.nine('ui.small_plaque', x, y, w, 15);
  const ie = app.assets.image('icon.' + icon);
  d.image('icon.' + icon, x - 3, y + Math.round((15 - ie.h) / 2));
  d.text(value, x + w - 4, y + 4, { color, align: 'right' });
}

/** Header plaque with a centred title (and optional small subtitle). */
export function plaque(app: App, cx: number, y: number, title: string, sub?: string): void {
  const d = app.draw;
  const tw = Math.max(d.measure(title, 'big'), sub ? d.measure(sub) : 0);
  const w = Math.max(70, tw + 30);
  const h = sub ? 30 : 24;
  d.nine('ui.plaque', Math.round(cx - w / 2), y, w, h);
  d.text(title, cx, y + 7, { font: 'big', align: 'center', color: '#fff1c0', shadow: true });
  if (sub) d.text(sub, cx, y + 18, { align: 'center', color: '#3a2a30', outline: null });
}

/** Dim the screen behind a modal. */
export function dim(app: App, alpha = 0.55): void {
  app.draw.rect(0, 0, app.w, app.h, '#120c18', alpha);
}

/** Swallow taps outside a modal. */
export function blocker(app: App, id: string, onTap: () => void = () => {}): void {
  app.input.region({ id, x: 0, y: 0, w: app.w, h: app.h, onTap });
}

export function fmt(n: number): string {
  if (n < 10000) return String(Math.floor(n));
  if (n < 1e6) return (n / 1000).toFixed(n < 1e5 ? 1 : 0).replace(/\.0$/, '') + 'K';
  if (n < 1e9) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
}
