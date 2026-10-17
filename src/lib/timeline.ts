export type TimelineState =
  | { phase: 'dwell'; scene: number }
  | { phase: 'travel'; from: number; to: number; t: number };

export const DEFAULT_DWELL_SHARE = 0.4;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smoothstep = (x: number) => x * x * (3 - 2 * x);

/**
 * Splits scroll progress into `sceneCount` equal dwell windows with equal
 * travel segments between them. `dwellShare` is the fraction of total
 * progress spent dwelling, summed across all scenes.
 */
export function timeline(
  progress: number,
  sceneCount: number,
  dwellShare: number = DEFAULT_DWELL_SHARE,
): TimelineState {
  if (!Number.isInteger(sceneCount) || sceneCount < 1) {
    throw new RangeError(`sceneCount must be a positive integer, got ${sceneCount}`);
  }
  if (!(dwellShare >= 0 && dwellShare <= 1)) {
    throw new RangeError(`dwellShare must be within 0..1, got ${dwellShare}`);
  }
  if (sceneCount === 1) return { phase: 'dwell', scene: 0 };

  const p = clamp01(progress);
  const dwell = dwellShare / sceneCount;
  const travel = (1 - dwellShare) / (sceneCount - 1);
  const period = dwell + travel;
  // Float error can push p / period past the last index at p = 1.
  const scene = Math.min(Math.floor(p / period), sceneCount - 1);
  const local = p - scene * period;

  if (scene === sceneCount - 1 || local <= dwell) return { phase: 'dwell', scene };
  return {
    phase: 'travel',
    from: scene,
    to: scene + 1,
    t: smoothstep(clamp01((local - dwell) / travel)),
  };
}
