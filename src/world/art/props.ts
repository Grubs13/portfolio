import { CylinderGeometry, Euler, IcosahedronGeometry, Matrix4, Quaternion, Vector3 } from 'three';
import { onScreen, type Vec } from './kit';
import type { MergedModel } from './merged';
import { palette, type Paint } from './palette';

// Small building blocks shared by the scenes.

/** A triangular prism along x, apex up, base at y = 0, 1 wide and 1 tall, for gable roofs. */
export const gable = new CylinderGeometry(1, 1, 1, 3)
  .rotateX(-Math.PI / 2)
  .rotateY(Math.PI / 2)
  .scale(1, 1 / 1.5, 1 / Math.sqrt(3))
  .translate(0, 1 / 3, 0);

export function at(right: number, back: number, y = 0): Vec {
  const { x, z } = onScreen(right, back);
  return [x, y, z];
}

/** A horizontal cylinder along x or z. */
export function pipe(model: MergedModel, paint: Paint, [x, y, z]: Vec, radius: number, length: number, alongX: boolean, segments = 8) {
  const rotation = alongX ? new Euler(0, 0, Math.PI / 2) : new Euler(Math.PI / 2, 0, 0);
  model.add(
    paint,
    new CylinderGeometry(radius, radius, length, segments),
    new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromEuler(rotation), new Vector3(1, 1, 1)),
  );
}

const puff = new IcosahedronGeometry(0.5, 1);

/** A rising plume of faceted puffs that grow and drift as they climb. */
export function steam(model: MergedModel, [x, y, z]: Vec, puffs: number, size: number) {
  for (let i = 0; i < puffs; i++) {
    const s = size * (1 + i * 0.15);
    const offset = new Vector3(x - i * 0.4, y + i * size * 0.7, z - i * 0.25);
    model.add(palette.steam, puff, new Matrix4().compose(offset, new Quaternion(), new Vector3(s, s * 0.85, s)));
  }
}

export function vehicle(model: MergedModel, [x, , z]: Vec, body: Paint, alongX: boolean) {
  const [l, w] = alongX ? [2, 1] : [1, 2];
  model.box(body, [x, 0.45, z], [l, 0.5, w]);
  const cab = alongX ? [x + 0.35, z] : [x, z + 0.35];
  model.box(body, [cab[0]!, 0.9, cab[1]!], alongX ? [0.9, 0.45, 0.95] : [0.95, 0.45, 0.9]);
  model.box(palette.window, [cab[0]!, 0.92, cab[1]!], alongX ? [0.92, 0.25, 0.97] : [0.97, 0.25, 0.92]);
  for (const s of [-1, 1]) {
    for (const e of [-0.6, 0.6]) {
      const [wx, wz] = alongX ? [x + e, z + (s * w) / 2] : [x + (s * w) / 2, z + e];
      model.box(palette.black, [wx, 0.2, wz], [0.35, 0.35, 0.35]);
    }
  }
}

export function worker(model: MergedModel, [x, , z]: Vec, vest: Paint) {
  model.box(palette.navy, [x, 0.4, z], [0.32, 0.8, 0.22]);
  model.box(vest, [x, 1.05, z], [0.42, 0.55, 0.3]);
  model.box(palette.skin, [x, 1.5, z], [0.26, 0.28, 0.26]);
  model.box(palette.hardHat, [x, 1.7, z], [0.32, 0.14, 0.32]);
}
