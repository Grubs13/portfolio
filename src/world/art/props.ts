import { CylinderGeometry, Euler, IcosahedronGeometry, Matrix4, Quaternion, Vector3 } from 'three';
import type { Vec } from './kit';
import type { MergedModel } from './merged';
import { palette, type Paint } from './palette';

// Small building blocks shared by the scenes: vehicles, people, plants and street furniture.

export type XZ = readonly [number, number];

/** A triangular prism along x, apex up, base at y = 0, 1 wide and 1 tall, for gable roofs. */
export const gable = new CylinderGeometry(1, 1, 1, 3)
  .rotateX(-Math.PI / 2)
  .rotateY(Math.PI / 2)
  .scale(1, 1 / 1.5, 1 / Math.sqrt(3))
  .translate(0, 1 / 3, 0);

/** A frame at `x`, `z` turned by `yaw`, for laying out a part in its own coordinates with `model.within`. */
export function place(x: number, z: number, yaw = 0, y = 0): Matrix4 {
  return new Matrix4().makeRotationY(yaw).setPosition(x, y, z);
}

/** `place`, with everything in the frame drawn `scale` times larger, for reusing a part at another scene's scale. */
export function scaled(x: number, z: number, scale: number, yaw = 0): Matrix4 {
  return place(x, z, yaw).multiply(new Matrix4().makeScale(scale, scale, scale));
}

/** A repeatable stream of numbers in (0, 1), so scattered details land the same on every visit. */
export function rng(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
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
const blob = new IcosahedronGeometry(0.5, 0);

function ball(model: MergedModel, paint: Paint, [x, y, z]: Vec, [sx, sy, sz]: Vec, geometry = blob) {
  model.add(paint, geometry, new Matrix4().compose(new Vector3(x, y, z), new Quaternion(), new Vector3(sx, sy, sz)));
}

/** A rising plume of faceted puffs that grow and drift as they climb. */
export function steam(model: MergedModel, [x, y, z]: Vec, puffs: number, size: number, paint: Paint = palette.steam) {
  for (let i = 0; i < puffs; i++) {
    const s = size * (1 + i * 0.15);
    ball(model, paint, [x - i * 0.4, y + i * size * 0.7, z - i * 0.25], [s, s * 0.85, s], puff);
  }
}

/** A work truck about two units long. */
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

/** A parked car, `size` units long. */
export function car(model: MergedModel, [x, z]: XZ, body: Paint, alongX: boolean, size = 1.3) {
  const along = (l: number, h: number, w: number): Vec => (alongX ? [l, h, w] : [w, h, l]);
  const w = size * 0.52;
  model.box(palette.black, [x, size * 0.09, z], along(size * 0.86, size * 0.18, w * 1.04));
  model.box(body, [x, size * 0.24, z], along(size, size * 0.22, w));
  model.box(palette.window, [x, size * 0.42, z], along(size * 0.52, size * 0.16, w * 0.92));
  model.box(body, [x, size * 0.51, z], along(size * 0.46, size * 0.04, w * 0.86));
}

export function worker(model: MergedModel, [x, y, z]: Vec, vest: Paint) {
  model.box(palette.navy, [x, y + 0.4, z], [0.32, 0.8, 0.22]);
  model.box(vest, [x, y + 1.05, z], [0.42, 0.55, 0.3]);
  model.box(palette.skin, [x, y + 1.5, z], [0.26, 0.28, 0.26]);
  model.box(palette.hardHat, [x, y + 1.7, z], [0.32, 0.14, 0.32]);
}

/** A leafy tree, or a spruce, about 1.6 `size` tall. */
export function tree(model: MergedModel, [x, z]: XZ, size = 1, spruce = false) {
  model.box(palette.timber, [x, 0.3 * size, z], [0.16 * size, 0.6 * size, 0.16 * size]);
  if (spruce) {
    for (let i = 0; i < 3; i++) {
      model.frustum(i % 2 ? palette.treeLight : palette.treeDark, [x, (0.75 + i * 0.5) * size, z], 0.03, (0.62 - i * 0.15) * size, 0.8 * size, 6);
    }
    return;
  }
  ball(model, palette.treeDark, [x, 1.05 * size, z], [1.3 * size, 1.1 * size, 1.3 * size]);
  ball(model, palette.treeLight, [x - 0.18 * size, 1.4 * size, z + 0.1 * size], [0.85 * size, 0.75 * size, 0.85 * size]);
}

export function lampPost(model: MergedModel, [x, z]: XZ, height = 3) {
  model.box(palette.steelDark, [x, height / 2, z], [0.1, height, 0.1]);
  model.box(palette.steelDark, [x + 0.2, height, z], [0.5, 0.08, 0.1]);
  model.box(palette.lamp, [x + 0.35, height - 0.08, z], [0.3, 0.1, 0.2]);
}

/** A wooden power pole with a crossarm, the arm lying along x or z. */
export function powerPole(model: MergedModel, [x, z]: XZ, armAlongX: boolean, height = 3.4) {
  model.box(palette.timber, [x, height / 2, z], [0.12, height, 0.12]);
  model.box(palette.timber, [x, height - 0.3, z], armAlongX ? [1, 0.1, 0.1] : [0.1, 0.1, 1]);
  for (const s of [-0.42, 0.42]) model.box(palette.tube, armAlongX ? [x + s, height - 0.18, z] : [x, height - 0.18, z + s], [0.1, 0.14, 0.1]);
}

/** A post-and-rail fence through `points`. */
export function fence(model: MergedModel, points: readonly XZ[], height = 0.7, paint: Paint = palette.galvanized) {
  for (let i = 0; i + 1 < points.length; i++) {
    const [ax, az] = points[i]!;
    const [bx, bz] = points[i + 1]!;
    const posts = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 2));
    for (let k = 0; k < posts; k++) {
      const t = k / posts;
      model.box(paint, [ax + (bx - ax) * t, height / 2, az + (bz - az) * t], [0.1, height, 0.1]);
    }
    model.beam(paint, [ax, height, az], [bx, height, bz], 0.08);
  }
}

export type Rect = readonly [x0: number, z0: number, x1: number, z1: number];

/** A field of crop in rows, or of mown hay when `stripe` is left out. */
export function field(model: MergedModel, [x0, z0, x1, z1]: Rect, paint: Paint, stripe?: Paint, rowsAlongX = true) {
  model.slab(paint, [x0, 0, z0], [x1, 0.02, z1]);
  if (!stripe) return;
  if (rowsAlongX) for (let z = z0 + 0.8; z < z1; z += 1.7) model.slab(stripe, [x0, 0.02, z], [x1, 0.03, z + 0.45]);
  else for (let x = x0 + 0.8; x < x1; x += 1.7) model.slab(stripe, [x, 0.02, z0], [x + 0.45, 0.03, z1]);
}

/** A round hay bale lying on its side. */
export function hayBale(model: MergedModel, [x, z]: XZ, alongX = false) {
  pipe(model, palette.hay, [x, 0.38, z], 0.36, 0.55, alongX, 8);
}

/** A prairie slough: open water ringed by reeds and a mown margin. */
export function slough(model: MergedModel, [x, z]: XZ, radius: number) {
  model.cylinder(palette.stubble2, [x, 0.03, z], radius * 1.5, 0.02, 10);
  model.cylinder(palette.reed, [x, 0.08, z], radius, 0.12, 9);
  model.cylinder(palette.water, [x, 0.1, z], radius * 0.55, 0.12, 8);
}

/** A shipping container used as a tool crib or store. */
export function seaCan(model: MergedModel, [x, z]: XZ, paint: Paint, alongX: boolean, size = 1) {
  const [l, h, w] = [2.4 * size, 1.05 * size, 1 * size];
  model.box(paint, [x, h / 2, z], alongX ? [l, h, w] : [w, h, l]);
  const ribs = Math.round(l / 0.4);
  for (let i = 1; i < ribs; i++) {
    const o = -l / 2 + (i * l) / ribs;
    if (alongX) model.box(palette.steelDark, [x + o, h / 2, z + w / 2], [0.05, h * 0.9, 0.04]);
    else model.box(palette.steelDark, [x + w / 2, h / 2, z + o], [0.04, h * 0.9, 0.05]);
  }
}

/** A site office trailer on blocks, with windows, a door and steps on its +z or +x side. */
export function officeTrailer(model: MergedModel, [x, z]: XZ, alongX: boolean, length = 3.6) {
  const [h, w] = [1.15, 1.3];
  const size: Vec = alongX ? [length, h, w] : [w, h, length];
  model.box(palette.steelDark, [x, 0.12, z], [size[0] * 0.9, 0.24, size[2] * 0.9]);
  model.box(palette.tube, [x, 0.24 + h / 2, z], size);
  model.box(palette.tubeShade, [x, 0.27 + h, z], [size[0] + 0.1, 0.07, size[2] + 0.1]);
  for (let o = -length / 2 + 0.6; o < length / 2 - 0.3; o += 0.9) {
    const door = Math.abs(o) < 0.3;
    const paint = door ? palette.stripeBlue : palette.window;
    const y = door ? 0.74 : 0.95;
    const tall = door ? 0.9 : 0.34;
    if (alongX) model.box(paint, [x + o, y, z + w / 2 + 0.02], [0.42, tall, 0.04]);
    else model.box(paint, [x + w / 2 + 0.02, y, z + o], [0.04, tall, 0.42]);
  }
  if (alongX) model.box(palette.galvanized, [x, 0.14, z + w / 2 + 0.25], [0.6, 0.28, 0.4]);
  else model.box(palette.galvanized, [x + w / 2 + 0.25, 0.14, z], [0.4, 0.28, 0.6]);
}

export function portaPotty(model: MergedModel, [x, z]: XZ) {
  model.box(palette.portaBlue, [x, 0.6, z], [0.55, 1.2, 0.55]);
  model.box(palette.tube, [x, 1.24, z], [0.6, 0.08, 0.6]);
}

export function dumpster(model: MergedModel, [x, z]: XZ, paint: Paint, alongX: boolean) {
  model.box(paint, [x, 0.4, z], alongX ? [1.8, 0.8, 0.9] : [0.9, 0.8, 1.8]);
  model.box(palette.steelDark, [x, 0.82, z], alongX ? [1.6, 0.06, 0.7] : [0.7, 0.06, 1.6]);
}

export function cone(model: MergedModel, [x, z]: XZ) {
  model.frustum(palette.tankOrange, [x, 0.25, z], 0.04, 0.16, 0.5, 6);
}
