import { describe, expect, it } from 'vitest';
import { sectionProgress } from './sectionProgress';

// Unequal sections: centers at 100, 300 and 1000 (gaps of 200 and 700).
const CENTERS = [100, 300, 1000];

describe('sectionProgress', () => {
  it('returns the exact index when a section center is at the viewport center', () => {
    expect(sectionProgress(CENTERS, 100)).toBe(0);
    expect(sectionProgress(CENTERS, 300)).toBe(1);
    expect(sectionProgress(CENTERS, 1000)).toBe(2);
  });

  it('interpolates linearly between neighbouring centers of unequal spacing', () => {
    // 150 is a quarter of the way from 100 to 300.
    expect(sectionProgress(CENTERS, 150)).toBeCloseTo(0.25, 10);
    // 475 is a quarter of the way from 300 to 1000.
    expect(sectionProgress(CENTERS, 475)).toBeCloseTo(1.25, 10);
    // 650 is halfway from 300 to 1000.
    expect(sectionProgress(CENTERS, 650)).toBeCloseTo(1.5, 10);
  });

  it('clamps before the first center and after the last', () => {
    expect(sectionProgress(CENTERS, -500)).toBe(0);
    expect(sectionProgress(CENTERS, 99)).toBe(0);
    expect(sectionProgress(CENTERS, 1001)).toBe(2);
    expect(sectionProgress(CENTERS, 5000)).toBe(2);
  });

  it('always returns 0 for a single section', () => {
    for (const v of [-100, 0, 400, 1e6]) {
      expect(sectionProgress([400], v)).toBe(0);
    }
  });

  it('rejects an empty section list', () => {
    expect(() => sectionProgress([], 0)).toThrow(RangeError);
  });
});
