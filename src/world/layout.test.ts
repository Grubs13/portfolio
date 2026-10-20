import { describe, expect, it } from 'vitest';
import { scenes, type Scene } from '../content/scenes';
import { ISLAND_RADIUS, MIN_SPACING, layoutScenes, pointOnSegment, segmentTangent, type Vec3 } from './layout';

const makeScenes = (n: number): Scene[] =>
  Array.from({ length: n }, (_, i) => ({ kind: 'intro', id: `s${i}`, name: '', tagline: '' }));

const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const horizontalDistance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.z - b.z);

const expectSamePoint = (a: Vec3, b: Vec3) => {
  expect(a.x).toBeCloseTo(b.x, 10);
  expect(a.y).toBeCloseTo(b.y, 10);
  expect(a.z).toBeCloseTo(b.z, 10);
};

const CASES = [scenes, makeScenes(1), makeScenes(2), makeScenes(12)];

describe('layoutScenes', () => {
  it('returns one anchor per scene and one segment between each pair', () => {
    for (const list of CASES) {
      const { anchors, segments } = layoutScenes(list);
      expect(anchors).toHaveLength(list.length);
      expect(segments).toHaveLength(list.length - 1);
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

  it('keeps every pair of islands from overlapping horizontally', () => {
    const { anchors } = layoutScenes(makeScenes(12));
    for (let i = 0; i < anchors.length; i++) {
      for (let j = i + 1; j < anchors.length; j++) {
        expect(horizontalDistance(anchors[i]!, anchors[j]!)).toBeGreaterThan(2 * ISLAND_RADIUS);
      }
    }
  });

  it('ascends with every scene', () => {
    const { anchors } = layoutScenes(makeScenes(12));
    for (let i = 1; i < anchors.length; i++) {
      expect(anchors[i]!.y).toBeGreaterThan(anchors[i - 1]!.y);
    }
  });

  it('runs the path through every anchor', () => {
    for (const list of CASES) {
      const { anchors, segments } = layoutScenes(list);
      segments.forEach((segment, i) => {
        expectSamePoint(pointOnSegment(segment, 0), anchors[i]!);
        expectSamePoint(pointOnSegment(segment, 1), anchors[i + 1]!);
      });
    }
  });

  it('arcs the path above both ends of each segment', () => {
    const { segments } = layoutScenes(scenes);
    for (const segment of segments) {
      const mid = pointOnSegment(segment, 0.5);
      expect(mid.y).toBeGreaterThan(Math.max(segment.start.y, segment.end.y));
    }
  });
});

describe('segmentTangent', () => {
  it('matches the rate of change of the path', () => {
    const [segment] = layoutScenes(scenes).segments;
    const h = 1e-6;
    for (const t of [0.1, 0.5, 0.9]) {
      const a = pointOnSegment(segment!, t - h);
      const b = pointOnSegment(segment!, t + h);
      const tangent = segmentTangent(segment!, t);
      expect(tangent.x).toBeCloseTo((b.x - a.x) / (2 * h), 4);
      expect(tangent.y).toBeCloseTo((b.y - a.y) / (2 * h), 4);
      expect(tangent.z).toBeCloseTo((b.z - a.z) / (2 * h), 4);
    }
  });
});
