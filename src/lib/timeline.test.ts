import { describe, expect, it } from 'vitest';
import { timeline } from './timeline';

// With 3 scenes and dwellShare 0.6, each dwell is 0.2 and each travel is 0.2:
// dwell 0 [0, 0.2], travel 0->1 (0.2, 0.4), dwell 1 [0.4, 0.6],
// travel 1->2 (0.6, 0.8), dwell 2 [0.8, 1].
const N = 3;
const SHARE = 0.6;

describe('timeline', () => {
  it('dwells on the first scene at the start of the scroll', () => {
    expect(timeline(0, N, SHARE)).toEqual({ phase: 'dwell', scene: 0 });
    expect(timeline(0.1, N, SHARE)).toEqual({ phase: 'dwell', scene: 0 });
    expect(timeline(0, 6)).toEqual({ phase: 'dwell', scene: 0 });
  });

  it('dwells on the last scene at the end of the scroll', () => {
    expect(timeline(1, N, SHARE)).toEqual({ phase: 'dwell', scene: 2 });
    expect(timeline(0.9, N, SHARE)).toEqual({ phase: 'dwell', scene: 2 });
    expect(timeline(1, 6)).toEqual({ phase: 'dwell', scene: 5 });
  });

  it('dwells on a middle scene inside its window', () => {
    expect(timeline(0.5, N, SHARE)).toEqual({ phase: 'dwell', scene: 1 });
  });

  it('is halfway through travel at the midpoint between two dwell windows', () => {
    const first = timeline(0.3, N, SHARE);
    expect(first).toMatchObject({ phase: 'travel', from: 0, to: 1 });
    expect(first.phase === 'travel' && first.t).toBeCloseTo(0.5, 10);

    const second = timeline(0.7, N, SHARE);
    expect(second).toMatchObject({ phase: 'travel', from: 1, to: 2 });
    expect(second.phase === 'travel' && second.t).toBeCloseTo(0.5, 10);
  });

  it('eases travel with smoothstep', () => {
    // A quarter of the way through travel: 3(0.25)^2 - 2(0.25)^3 = 0.15625.
    const state = timeline(0.25, N, SHARE);
    expect(state).toMatchObject({ phase: 'travel', from: 0, to: 1 });
    expect(state.phase === 'travel' && state.t).toBeCloseTo(0.15625, 10);
  });

  it('clamps progress outside 0..1', () => {
    expect(timeline(-0.5, N, SHARE)).toEqual({ phase: 'dwell', scene: 0 });
    expect(timeline(1.5, N, SHARE)).toEqual({ phase: 'dwell', scene: 2 });
  });

  it('always dwells on the only scene', () => {
    for (const p of [-1, 0, 0.3, 0.5, 1, 2]) {
      expect(timeline(p, 1)).toEqual({ phase: 'dwell', scene: 0 });
    }
  });

  it('rejects an empty scene list and an out-of-range dwell share', () => {
    expect(() => timeline(0.5, 0)).toThrow(RangeError);
    expect(() => timeline(0.5, 3, 1.5)).toThrow(RangeError);
  });
});
