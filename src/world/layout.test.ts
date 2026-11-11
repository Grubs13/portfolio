import { describe, expect, it } from 'vitest';
import { scenes, type Scene } from '../content/scenes';
import { STAGE_RADIUS, MIN_SPACING, layoutScenes, type Vec3 } from './layout';

const makeScenes = (n: number): Scene[] =>
  Array.from({ length: n }, (_, i) => ({ kind: 'intro', id: `s${i}`, name: '', tagline: '' }));

const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const horizontalDistance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.z - b.z);

const CASES = [scenes, makeScenes(1), makeScenes(2), makeScenes(12)];

describe('layoutScenes', () => {
  it('returns one anchor per scene', () => {
    for (const list of CASES) {
      const { anchors } = layoutScenes(list);
      expect(anchors).toHaveLength(list.length);
    }
  });

  it('spaces consecutive anchors at least the minimum spacing apart', () => {
    for (const list of CASES) {
      const { anchors } = layoutScenes(list);
      for (let i = 1; i < anchors.length; i++) {
        expect(distance(anchors[i - 1]!, anchors[i]!)).toBeGreaterThanOrEqual(MIN_SPACING);
      }
    }
  });

  it('keeps every pair of stages from overlapping horizontally', () => {
    const { anchors } = layoutScenes(makeScenes(12));
    for (let i = 0; i < anchors.length; i++) {
      for (let j = i + 1; j < anchors.length; j++) {
        expect(horizontalDistance(anchors[i]!, anchors[j]!)).toBeGreaterThan(2 * STAGE_RADIUS);
      }
    }
  });

  it('ascends with every scene', () => {
    const { anchors } = layoutScenes(makeScenes(12));
    for (let i = 1; i < anchors.length; i++) {
      expect(anchors[i]!.y).toBeGreaterThan(anchors[i - 1]!.y);
    }
  });
});
