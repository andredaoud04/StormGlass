/** Short counters keep currency and food legible in the narrow portrait HUD.
 * Values are rounded for display only; game economy retains exact quantities.
 */
export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  const magnitude = abs >= 1e9 ? 1e9 : abs >= 1e6 ? 1e6 : abs >= 1e3 ? 1e3 : 0;
  if (!magnitude) return Math.floor(value).toString();
  const suffix = magnitude === 1e9 ? 'b' : magnitude === 1e6 ? 'm' : 'k';
  const scaled = value / magnitude;
  const fractionDigits = Math.abs(scaled) < 10 ? 2 : Math.abs(scaled) < 100 ? 1 : 0;
  return scaled.toFixed(fractionDigits).replace(/\.0+$|(?<=\.[0-9]*?)0+$/g, '').replace(/\.$/, '') + suffix;
}
