/**
 * Maps the viewport's vertical center to a fractional section index. `f = i`
 * exactly when section i's center sits at the viewport center, and `f`
 * interpolates linearly between neighbouring centers. Working from section
 * centers instead of raw document scroll keeps scenes aligned with their text
 * even when sections have unequal heights.
 *
 * `centers` are the sections' vertical centers in document coordinates, in
 * ascending order. The result is clamped to `0..centers.length - 1`.
 */
export function sectionProgress(centers: readonly number[], viewportCenter: number): number {
  const n = centers.length;
  if (n === 0) throw new RangeError('sectionProgress needs at least one section');

  const last = n - 1;
  if (viewportCenter <= centers[0]!) return 0;
  if (viewportCenter >= centers[last]!) return last;

  let i = 0;
  while (viewportCenter >= centers[i + 1]!) i++;
  const a = centers[i]!;
  const b = centers[i + 1]!;
  return i + (viewportCenter - a) / (b - a);
}
