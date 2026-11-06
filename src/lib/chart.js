// Chart helpers.

/** Round axis bounds and 3–5 ticks on a 1/2/2.5/5 × 10^n step, so every label is a value people recognise. */
export function niceScale(lo, hi) {
  if (lo === hi) { lo -= 5; hi += 5; }
  const raw = (hi - lo) / 3, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const min = Math.max(0, Math.floor(lo / step) * step), max = Math.ceil(hi / step) * step;
  const ticks = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { min, max, ticks };
}
