import { Group, type Object3D } from 'three';
import { MergedModel } from './merged';
import { palette } from './palette';

// Calen in turnaround gear: white hard hat with headlamp, glasses, navy FR
// henley with hi-vis stripes, chest harness carrying a radio and a gas
// detector, navy cargo pants with hi-vis shin bands and tan work boots. The
// jetpack is what carries him between islands. He faces +z.

export interface Character {
  root: Group;
  /** Pivots at the hips, so leaning tips the torso and not the feet. */
  body: Group;
  arms: [Group, Group];
  legs: [Group, Group];
  flame: Group;
}

const HIP_HEIGHT = 0.9;

function pivot(child: Object3D, x: number, y: number, z = 0): Group {
  const g = new Group();
  g.add(child);
  g.position.set(x, y, z);
  return g;
}

/** A leg hangs from the hip so rotating its pivot swings it. */
function leg(): Object3D {
  return new MergedModel()
    .box(palette.navy, [0, -0.38, 0], [0.24, 0.78, 0.26])
    .box(palette.hiVis, [0, -0.62, 0], [0.26, 0.1, 0.28])
    .box(palette.reflective, [0, -0.62, 0], [0.265, 0.035, 0.285])
    .box(palette.boots, [0, -0.81, 0.05], [0.27, 0.18, 0.38])
    .build();
}

function arm(): Object3D {
  return new MergedModel()
    .box(palette.navy, [0, -0.24, 0], [0.18, 0.5, 0.2])
    .box(palette.hiVis, [0, -0.42, 0], [0.2, 0.08, 0.22])
    .box(palette.skin, [0, -0.55, 0], [0.16, 0.14, 0.18])
    .build();
}

function torsoAndHead(): Object3D {
  const m = new MergedModel()
    // FR henley, with the tan undershirt showing at the open placket.
    .box(palette.navy, [0, 0.31, 0], [0.62, 0.66, 0.38])
    .box(palette.undershirt, [0, 0.61, 0.19], [0.14, 0.07, 0.02]);

  // Hi-vis: two stripes over the shoulders down to a band round the waist.
  for (const x of [-0.16, 0.16]) {
    m.box(palette.hiVis, [x, 0.38, 0], [0.08, 0.56, 0.4]);
    m.box(palette.reflective, [x, 0.38, 0], [0.03, 0.56, 0.405]);
    m.box(palette.hiVis, [x, 0.655, 0], [0.08, 0.02, 0.4]);
  }
  m.box(palette.hiVis, [0, 0.11, 0], [0.64, 0.1, 0.4]);
  m.box(palette.reflective, [0, 0.11, 0], [0.645, 0.035, 0.405]);

  // Chest harness, radio on his right strap and gas detector on his left.
  for (const x of [-0.26, 0.26]) m.box(palette.black, [x, 0.36, 0], [0.07, 0.62, 0.41]);
  m.box(palette.black, [-0.27, 0.48, 0.23], [0.11, 0.17, 0.07]);
  m.box(palette.black, [0.27, 0.36, 0.23], [0.11, 0.18, 0.07]);
  m.box(palette.detectorLed, [0.27, 0.42, 0.27], [0.06, 0.05, 0.02]);

  // Head: stubble along the jaw, thick black frames, hair at the sides and back.
  m.box(palette.skin, [0, 0.87, 0], [0.42, 0.42, 0.42]);
  m.box(palette.stubble, [0, 0.71, 0.01], [0.425, 0.1, 0.42]);
  m.box(palette.hair, [0, 0.97, -0.07], [0.44, 0.18, 0.3]);
  m.box(palette.black, [0, 0.9, 0.215], [0.4, 0.1, 0.02]);
  for (const x of [-0.09, 0.09]) m.box(palette.lens, [x, 0.9, 0.222], [0.12, 0.06, 0.02]);

  // Hard hat with its headband strap and a headlamp on the front.
  m.box(palette.hardHat, [0, 1.16, 0], [0.48, 0.2, 0.48]);
  m.box(palette.hardHat, [0, 1.07, 0.04], [0.52, 0.04, 0.6]);
  m.box(palette.hardHat, [0, 1.28, 0], [0.1, 0.06, 0.44]);
  m.box(palette.headband, [0, 1.13, 0], [0.5, 0.05, 0.5]);
  m.box(palette.black, [0, 1.15, 0.27], [0.15, 0.1, 0.06]);
  m.box(palette.lamp, [0, 1.15, 0.305], [0.08, 0.06, 0.02]);

  // Jetpack.
  m.box(palette.pack, [0, 0.38, -0.28], [0.44, 0.5, 0.18]);
  m.box(palette.steelDark, [0, 0.1, -0.3], [0.18, 0.08, 0.14]);
  return m.build();
}

export function buildCharacter(): Character {
  const arms: [Group, Group] = [pivot(arm(), -0.4, 0.6), pivot(arm(), 0.4, 0.6)];
  const legs: [Group, Group] = [pivot(leg(), -0.15, 0), pivot(leg(), 0.15, 0)];
  const flame = pivot(new MergedModel().box(palette.flame, [0, -0.3, 0], [0.16, 0.6, 0.16]).build(), 0, 0.06, -0.3);
  const body = new Group();
  body.add(torsoAndHead(), flame, ...arms, ...legs);
  body.position.y = HIP_HEIGHT;
  const root = new Group();
  root.add(body);
  return { root, body, arms, legs, flame };
}
