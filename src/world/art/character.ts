import { type BufferGeometry, CapsuleGeometry, CylinderGeometry, Euler, Group, Matrix4, type Object3D, Quaternion, SphereGeometry, Vector3 } from 'three';
import type { Vec } from './kit';
import { MergedModel } from './merged';
import { palette, type Paint } from './palette';

// Calen in turnaround gear: white hard hat with headlamp, glasses, navy FR
// henley with hi-vis stripes, chest harness carrying a radio and a gas
// detector, navy cargo pants with hi-vis shin bands and tan work boots. He
// faces +z.
//
// Rounded parts with smooth shading stand in until a sculpted model replaces
// them (see `model.ts`); both satisfy `Character`.

/** The poses the modelled character is exported in, as `pose_<name>` groups of `calen.glb`. */
export const CHARACTER_POSES = ['stand', 'inspect'] as const;
export type CharacterPose = (typeof CHARACTER_POSES)[number];

export interface Character {
  root: Group;
  /** Shows the character in pose `name`. */
  pose(name: CharacterPose): void;
}

/** Drawn larger than the workers around him, so he reads at a glance and his gear shows. */
export const CHARACTER_SCALE = 1.3;
const HIP_HEIGHT = 0.9;

function pivot(child: Object3D, x: number, y: number, z = 0): Group {
  const g = new Group();
  g.add(child);
  g.position.set(x, y, z);
  return g;
}

const capsule = (radius: number, length: number) => new CapsuleGeometry(radius, length, 4, 10);
const sphere = (radius: number) => new SphereGeometry(radius, 14, 10);
const dome = (radius: number) => new SphereGeometry(radius, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2);
const band = (radius: number, height: number) => new CylinderGeometry(radius, radius, height, 14);

function shape(m: MergedModel, paint: Paint, geometry: BufferGeometry, [x, y, z]: Vec, [sx, sy, sz]: Vec = [1, 1, 1], tilt = 0) {
  m.add(paint, geometry, new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromEuler(new Euler(tilt, 0, 0)), new Vector3(sx, sy, sz)));
}

/** A leg hangs from the hip so rotating its pivot swings it. */
function leg(): Object3D {
  const m = new MergedModel(true);
  shape(m, palette.navy, capsule(0.125, 0.5), [0, -0.36, 0]);
  shape(m, palette.hiVis, band(0.135, 0.09), [0, -0.58, 0]);
  shape(m, palette.reflective, band(0.137, 0.03), [0, -0.58, 0]);
  shape(m, palette.boots, sphere(0.16), [0, -0.78, 0.05], [0.95, 0.7, 1.35]);
  m.box(palette.black, [0, -0.875, 0.05], [0.28, 0.05, 0.4]);
  return m.build();
}

function arm(): Object3D {
  const m = new MergedModel(true);
  shape(m, palette.navy, capsule(0.095, 0.32), [0, -0.22, 0]);
  shape(m, palette.hiVis, band(0.102, 0.07), [0, -0.38, 0]);
  shape(m, palette.skin, sphere(0.09), [0, -0.5, 0.01], [1, 1.1, 1.1]);
  return m.build();
}

function torsoAndHead(): Object3D {
  const m = new MergedModel(true);
  // FR henley over a broad chest, the tan undershirt showing at the open placket.
  shape(m, palette.navy, capsule(0.3, 0.2), [0, 0.34, 0], [1, 1, 0.68]);
  shape(m, palette.navy, sphere(0.15), [0, 0.62, 0], [1.9, 0.6, 1.2]);
  m.box(palette.undershirt, [0, 0.58, 0.19], [0.1, 0.08, 0.04]);

  // Hi-vis: two stripes over the shoulders down to a band round the waist.
  for (const x of [-0.15, 0.15]) {
    m.box(palette.hiVis, [x, 0.38, 0.17], [0.08, 0.46, 0.06]);
    m.box(palette.reflective, [x, 0.38, 0.2], [0.03, 0.46, 0.02]);
    m.box(palette.hiVis, [x, 0.38, -0.17], [0.08, 0.46, 0.06]);
  }
  shape(m, palette.hiVis, band(0.305, 0.1), [0, 0.12, 0], [1, 1, 0.7]);
  shape(m, palette.reflective, band(0.308, 0.035), [0, 0.12, 0], [1, 1, 0.71]);

  // Chest harness, radio on his right strap and gas detector on his left.
  for (const x of [-0.24, 0.24]) m.box(palette.black, [x, 0.38, 0.13], [0.06, 0.5, 0.06]);
  m.box(palette.black, [-0.25, 0.46, 0.2], [0.1, 0.16, 0.07]);
  m.box(palette.steelDark, [-0.27, 0.58, 0.2], [0.025, 0.1, 0.025]);
  m.box(palette.black, [0.25, 0.36, 0.2], [0.1, 0.16, 0.07]);
  m.box(palette.detectorLed, [0.25, 0.41, 0.24], [0.05, 0.04, 0.02]);

  // A big head on a short neck, so the face reads under the hat: stubble round the jaw, a nose,
  // thick black frames, hair at the sides and back.
  shape(m, palette.skin, band(0.1, 0.12), [0, 0.7, 0]);
  shape(m, palette.skin, sphere(0.24), [0, 0.9, 0.01], [1, 1.05, 1]);
  shape(m, palette.stubble, new SphereGeometry(0.245, 14, 10, 0, Math.PI * 2, Math.PI * 0.66, Math.PI * 0.34), [0, 0.9, 0.015], [1, 1.05, 1]);
  shape(m, palette.skin, sphere(0.05), [0, 0.88, 0.245]);
  shape(m, palette.hair, new SphereGeometry(0.25, 14, 10, Math.PI * 1.15, Math.PI * 0.7, Math.PI * 0.2, Math.PI * 0.45), [0, 0.91, 0], [1, 1.05, 1]);
  m.box(palette.black, [0, 0.95, 0.225], [0.42, 0.08, 0.05]);
  for (const x of [-0.1, 0.1]) m.box(palette.lens, [x, 0.95, 0.252], [0.12, 0.05, 0.01]);
  for (const x of [-0.225, 0.225]) m.box(palette.black, [x, 0.96, 0.1], [0.03, 0.03, 0.24]);

  // Hard hat on the crown: a low dome with a ridge, the brim longer at the front, a headband and a headlamp.
  shape(m, palette.hardHat, dome(0.27), [0, 1.08, -0.01], [1, 0.78, 1.06]);
  shape(m, palette.hardHat, band(0.31, 0.035), [0, 1.09, 0.03], [1, 1, 1.12]);
  shape(m, palette.hardHat, capsule(0.04, 0.34), [0, 1.28, -0.01], [1, 1, 1], Math.PI / 2);
  shape(m, palette.headband, band(0.272, 0.05), [0, 1.12, -0.01], [1, 1, 1.06]);
  m.box(palette.black, [0, 1.15, 0.28], [0.13, 0.09, 0.06]);
  m.box(palette.lamp, [0, 1.15, 0.313], [0.08, 0.055, 0.015]);
  return m.build();
}

export function buildCharacter(): Character {
  const body = new Group();
  body.add(torsoAndHead(), pivot(arm(), -0.39, 0.58), pivot(arm(), 0.39, 0.58), pivot(leg(), -0.14, 0), pivot(leg(), 0.14, 0));
  body.position.y = HIP_HEIGHT;
  const root = new Group();
  root.add(body);
  root.scale.setScalar(CHARACTER_SCALE);

  // The stand-in only stands.
  return { root, pose() {} };
}
