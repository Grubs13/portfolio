import type { Scene } from '../content/scenes';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface WorldLayout {
  /** One anchor per scene, in scene order. */
  anchors: Vec3[];
}

/** Largest horizontal extent of any scene's ground from its anchor. It covers the screen at every framing. */
export const STAGE_RADIUS = 75;
export const MIN_SPACING = 2 * STAGE_RADIUS + 8;

// Horizontal axes chosen for an isometric camera looking from (+x, +y, +z):
// LATERAL runs left to right on screen and RECEDE runs away from the viewer.
const LATERAL = { x: Math.SQRT1_2, z: -Math.SQRT1_2 };
const RECEDE = { x: -Math.SQRT1_2, z: -Math.SQRT1_2 };
const SWING = 70;
const RISE = 10;
const DEPTH = 80;

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

  return { anchors };
}
