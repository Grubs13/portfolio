import type { Scene } from '../content/scenes';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Quadratic Bézier from one anchor to the next. */
export interface Segment {
  start: Vec3;
  control: Vec3;
  end: Vec3;
}

export interface WorldLayout {
  /** One anchor per scene, in scene order. */
  anchors: Vec3[];
  /** `segments[i]` runs from `anchors[i]` to `anchors[i + 1]`. */
  segments: Segment[];
}

/** Largest horizontal extent of any island from its anchor. */
export const ISLAND_RADIUS = 3;
export const MIN_SPACING = 2 * ISLAND_RADIUS + 2;

// Horizontal axes chosen for an isometric camera looking from (+x, +y, +z):
// LATERAL runs left to right on screen and RECEDE runs away from the viewer.
const LATERAL = { x: Math.SQRT1_2, z: -Math.SQRT1_2 };
const RECEDE = { x: -Math.SQRT1_2, z: -Math.SQRT1_2 };
const SWING = 5;
const RISE = 4;
const DEPTH = 6;
const ARC = 6;

/**
 * Places scenes on an ascending zig-zag: alternating left and right while
 * rising and receding, so a new scene needs no hand-placed coordinates.
 */
export function layoutScenes(scenes: readonly Scene[]): WorldLayout {
  const anchors = scenes.map((_, i) => {
    const side = i % 2 === 0 ? -SWING : SWING;
    return {
      x: side * LATERAL.x + i * DEPTH * RECEDE.x,
      y: i * RISE,
      z: side * LATERAL.z + i * DEPTH * RECEDE.z,
    };
  });

  const segments = anchors.slice(1).map((end, i) => {
    const start = anchors[i]!;
    return {
      start,
      end,
      control: {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2 + ARC,
        z: (start.z + end.z) / 2,
      },
    };
  });

  return { anchors, segments };
}

export function pointOnSegment({ start, control, end }: Segment, t: number): Vec3 {
  const a = (1 - t) * (1 - t);
  const b = 2 * (1 - t) * t;
  const c = t * t;
  return {
    x: a * start.x + b * control.x + c * end.x,
    y: a * start.y + b * control.y + c * end.y,
    z: a * start.z + b * control.z + c * end.z,
  };
}

/** Derivative of the segment with respect to t, not normalized. */
export function segmentTangent({ start, control, end }: Segment, t: number): Vec3 {
  const a = 2 * (1 - t);
  const b = 2 * t;
  return {
    x: a * (control.x - start.x) + b * (end.x - control.x),
    y: a * (control.y - start.y) + b * (end.y - control.y),
    z: a * (control.z - start.z) + b * (end.z - control.z),
  };
}
