export type TimelineState =
  | { phase: 'dwell'; scene: number }
  | { phase: 'travel'; from: number; to: number; t: number };

export const DEFAULT_DWELL_SHARE = 0.4;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smoothstep = (x: number) => x * x * (3 - 2 * x);

/**
 * Places scene i at progress i / (sceneCount - 1) and centers a dwell window
 * on it, with travel segments between neighbouring windows. The first and last
 * scenes get half a window each, since progress cannot go past them.
 * `dwellShare` is the fraction of total progress spent dwelling, summed across
 * all scenes.
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

  const s = clamp01(progress) * (sceneCount - 1);
  const from = Math.min(Math.floor(s), sceneCount - 1);
  const local = s - from;
  const half = dwellShare / 2;

  if (local <= half) return { phase: 'dwell', scene: from };
  if (local >= 1 - half) return { phase: 'dwell', scene: from + 1 };
  return {
    phase: 'travel',
    from,
    to: from + 1,
    t: smoothstep((local - half) / (1 - dwellShare)),
  };
}
