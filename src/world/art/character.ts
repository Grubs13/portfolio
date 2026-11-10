import { Group, LatheGeometry, Matrix4, type Object3D, SphereGeometry, Vector2 } from 'three';
import type { Vec } from './kit';
import { MergedModel } from './merged';
import { palette, type Paint } from './palette';

// Calen in turnaround gear: white hard hat with headlamp, glasses and a short
// beard, navy FR henley with hi-vis tape, jetpack harness carrying a radio and
// a gas detector, navy work pants with hi-vis shin bands and tan work boots.
// The jetpack is what carries him between islands. He faces +z.
//
// He is built from rounded, tapering parts in roughly adult proportions,
// about six and a half heads tall, so his silhouette reads as a person: a
// head on a neck, shoulders broader than the waist, arms that hang clear of
// the body and bend at the elbow, legs that bend at the knee. Coordinates
// below are measured from the soles of his feet.

export interface Character {
  root: Group;
  /** Pivots at the hips, so leaning tips the torso and not the feet. */
  body: Group;
  /** Pivot at the shoulders; each carries its forearm. */
  arms: [Group, Group];
  /** Pivot at the elbows. */
  forearms: [Group, Group];
  /** Pivot at the hips; each carries its shin. */
  legs: [Group, Group];
  /** Pivot at the knees. */
  shins: [Group, Group];
  flame: Group;
}

const HIP = 1.0;
const HIP_X = 0.105;
const THIGH = 0.47;
const SHOULDER: Vec = [0.255, 1.555, 0];
/**
 * The head, hat and hands are drawn a little larger than life, as sprite
 * artists do, so his face and hands still read when he is small on screen.
 */
const HEAD_SCALE = 1.2;
const HAND_SCALE = 1.2;
const NECK_TOP = 1.7;
const UPPER_ARM = 0.3;
/** How far the arms hang out from the body at rest, so they read apart from the torso. */
const ARM_SPLAY = 0.09;

/** The torso's outline as (radius, height) from the crotch to the base of the neck. */
const TORSO: readonly (readonly [number, number])[] = [
  [0.0, 0.9],
  [0.15, 0.92],
  [0.2, 0.98],
  [0.205, 1.05],
  [0.19, 1.14],
  [0.195, 1.24],
  [0.215, 1.36],
  [0.23, 1.46],
  [0.225, 1.54],
  [0.19, 1.6],
  [0.12, 1.64],
  [0.07, 1.66],
  [0.0, 1.665],
];
/** The torso is round in plan but flattened front to back. */
const TORSO_DEPTH = 0.62;

function torsoRadius(y: number): number {
  for (let i = 1; i < TORSO.length; i++) {
    const [r0, y0] = TORSO[i - 1]!;
    const [r1, y1] = TORSO[i]!;
    if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return 0;
}

/** Depth of the torso's front surface at `x` across and `y` up, so straps and tape can lie on it. */
function frontZ(x: number, y: number): number {
  const r = torsoRadius(y);
  return TORSO_DEPTH * Math.sqrt(Math.max(0, r * r - x * x));
}

const torsoMatrix = new Matrix4().makeScale(1, 1, TORSO_DEPTH);

/** A band round the torso between two heights, standing `out` proud of the cloth. */
function band(m: MergedModel, paint: Paint, y0: number, y1: number, out = 1.04): void {
  const points = [new Vector2(torsoRadius(y0) * out, y0), new Vector2(torsoRadius(y1) * out, y1)];
  m.add(paint, new LatheGeometry(points, 14), torsoMatrix);
}

/** A strip of tape or webbing that follows the front (or back) of the torso from `y0` up to `y1`. */
function onTorso(m: MergedModel, paint: Paint, x: number, y0: number, y1: number, width: number, back = false, lift = 0.008): void {
  const steps = Math.max(1, Math.round((y1 - y0) / 0.08));
  const s = back ? -1 : 1;
  for (let i = 0; i < steps; i++) {
    const a = y0 + ((y1 - y0) * i) / steps;
    const b = y0 + ((y1 - y0) * (i + 1)) / steps;
    m.strip(paint, [x, a, s * (frontZ(x, a) + lift)], [x, b, s * (frontZ(x, b) + lift)], width, 0.02);
  }
}

function pivot(child: Object3D, [x, y, z]: Vec, splay = 0): Group {
  const g = new Group();
  g.add(child);
  g.position.set(x, y, z);
  g.rotation.z = splay;
  return g;
}

function torso(m: MergedModel): void {
  m.add(palette.navy, new LatheGeometry(TORSO.map(([r, y]) => new Vector2(r, y)), 14), torsoMatrix);
  // Belt, and the hi-vis band round the shirt above it.
  band(m, palette.belt, 1.0, 1.05, 1.05);
  band(m, palette.hiVis, 1.12, 1.19);
  band(m, palette.reflective, 1.145, 1.165, 1.05);
  // Hi-vis tape up the front and back and over each shoulder.
  for (const x of [-0.085, 0.085]) {
    for (const back of [false, true]) {
      onTorso(m, palette.hiVis, x, 1.19, 1.6, 0.06, back);
      onTorso(m, palette.reflective, x, 1.19, 1.6, 0.022, back, 0.012);
    }
    m.box(palette.hiVis, [x, 1.628, 0], [0.06, 0.03, 0.2]);
  }
  // The henley's open placket shows the undershirt at the collar.
  m.strip(palette.undershirt, [0, 1.56, frontZ(0, 1.56)], [0, 1.63, frontZ(0, 1.63) - 0.01], 0.05, 0.02);
}

function harnessAndPack(m: MergedModel): void {
  // Jetpack shoulder straps run over the shoulders and down the chest.
  for (const x of [-0.155, 0.155]) {
    onTorso(m, palette.black, x, 1.34, 1.58, 0.05, false, 0.016);
    m.box(palette.black, [x, 1.6, -0.02], [0.05, 0.035, 0.22]);
  }
  // Radio on his right strap, gas detector with its live LED on his left.
  m.box(palette.black, [-0.155, 1.48, frontZ(0.155, 1.48) + 0.04], [0.075, 0.12, 0.05]);
  m.limb(palette.black, [-0.175, 1.54, frontZ(0.155, 1.48) + 0.04], [-0.175, 1.62, frontZ(0.155, 1.48) + 0.04], 0.008, 0.008, 4);
  const detector = frontZ(0.155, 1.44) + 0.04;
  m.box(palette.safetyYellow, [0.155, 1.44, detector], [0.075, 0.1, 0.045]);
  m.box(palette.detectorLed, [0.155, 1.47, detector + 0.024], [0.04, 0.025, 0.01]);

  // Jetpack: a rounded-off case with twin thrusters below it.
  m.box(palette.pack, [0, 1.36, -0.2], [0.34, 0.4, 0.15]);
  m.box(palette.pack, [0, 1.585, -0.18], [0.28, 0.05, 0.12]);
  m.box(palette.steelDark, [0, 1.36, -0.28], [0.22, 0.26, 0.02]);
  for (const x of [-0.1, 0.1]) {
    m.cylinder(palette.steelDark, [x, 1.2, -0.25], 0.05, 0.16, 8);
    m.frustum(palette.steel, [x, 1.1, -0.25], 0.04, 0.056, 0.06, 8);
  }
}

function head(m: MergedModel): void {
  m.limb(palette.skin, [0, 1.6, 0], [0, 1.75, 0.01], 0.062, 0.056);
  // Skull, then jaw and beard, which sit forward of the neck.
  m.ellipsoid(palette.skin, [0, 1.855, 0.005], [0.115, 0.135, 0.125], 10);
  m.ellipsoid(palette.stubble, [0, 1.775, 0.03], [0.1, 0.07, 0.1], 10);
  m.ellipsoid(palette.skin, [0, 1.79, 0.07], [0.07, 0.05, 0.065], 8);
  m.ellipsoid(palette.stubble, [0, 1.79, 0.105], [0.05, 0.022, 0.03], 6);
  m.box(palette.skin, [0, 1.835, 0.13], [0.032, 0.05, 0.035]);
  for (const x of [-0.115, 0.115]) m.ellipsoid(palette.skin, [x, 1.84, -0.005], [0.022, 0.038, 0.03], 6);
  // Hair at the back and sides, below the hat.
  m.ellipsoid(palette.hair, [0, 1.875, -0.025], [0.122, 0.12, 0.118], 10);
  // Thick black frames.
  m.box(palette.black, [0, 1.865, 0.122], [0.215, 0.032, 0.02]);
  for (const x of [-0.05, 0.05]) m.box(palette.lens, [x, 1.858, 0.128], [0.075, 0.035, 0.012]);
  for (const x of [-0.11, 0.11]) m.box(palette.black, [x, 1.865, 0.06], [0.012, 0.015, 0.12]);

  // Hard hat, worn high on the head with a short peak, so the camera's high
  // angle still sees the face under it: dome, brim, ridge, headband and headlamp.
  const dome = new Matrix4().makeScale(0.135, 0.115, 0.145).setPosition(0, 1.94, -0.01);
  m.add(palette.hardHat, new SphereGeometry(1, 12, 5, 0, 2 * Math.PI, 0, Math.PI / 2), dome);
  m.ellipsoid(palette.hardHat, [0, 1.944, 0.012], [0.15, 0.014, 0.165], 12);
  m.box(palette.hardHat, [0, 2.05, -0.015], [0.036, 0.026, 0.25]);
  m.ellipsoid(palette.headband, [0, 1.955, -0.01], [0.137, 0.014, 0.147], 12);
  m.box(palette.black, [0, 1.995, 0.128], [0.055, 0.04, 0.035]);
  m.box(palette.lamp, [0, 1.995, 0.147], [0.034, 0.024, 0.01]);
}

function upperArm(side: number): { arm: Group; forearm: Group } {
  const m = new MergedModel()
    // Deltoid, then a tapering upper arm with the biceps fuller at the front.
    .ellipsoid(palette.navy, [0, -0.01, 0], [0.085, 0.09, 0.085])
    .limb(palette.navy, [0, 0, 0], [0, -UPPER_ARM, 0], 0.074, 0.058)
    .ellipsoid(palette.navy, [0, -0.14, 0.018], [0.064, 0.09, 0.064]);
  const forearm = pivot(lowerArm(side), [0, -UPPER_ARM, 0]);
  const arm = pivot(m.build(), [side * SHOULDER[0], SHOULDER[1] - HIP, SHOULDER[2]], side * ARM_SPLAY);
  arm.add(forearm);
  return { arm, forearm };
}

function lowerArm(side: number): Object3D {
  const h = HAND_SCALE;
  return (
    new MergedModel()
      .ellipsoid(palette.navy, [0, 0, 0], [0.058, 0.058, 0.058])
      .limb(palette.navy, [0, 0, 0], [0, -0.25, 0], 0.058, 0.045)
      // Hi-vis band at the cuff.
      .limb(palette.hiVis, [0, -0.16, 0], [0, -0.21, 0], 0.056, 0.052)
      // Hand, with the thumb on the inside.
      .ellipsoid(palette.skin, [0, -0.25 - 0.055 * h, 0.008], [0.04 * h, 0.068 * h, 0.032 * h])
      .ellipsoid(palette.skin, [-side * 0.032 * h, -0.25 - 0.035 * h, 0.03], [0.018 * h, 0.04 * h, 0.018 * h], 6)
      .build()
  );
}

function upperLeg(side: number): { leg: Group; shin: Group } {
  const m = new MergedModel()
    .ellipsoid(palette.pants, [0, 0, 0], [0.1, 0.1, 0.105])
    .limb(palette.pants, [0, 0, 0], [0, -THIGH, 0], 0.097, 0.068)
    // Cargo pocket on the outside of the thigh.
    .box(palette.pants, [side * 0.08, -0.25, 0], [0.04, 0.12, 0.1]);
  const shin = pivot(lowerLeg(), [0, -THIGH, 0]);
  const leg = pivot(m.build(), [side * HIP_X, 0, 0]);
  leg.add(shin);
  return { leg, shin };
}

function lowerLeg(): Object3D {
  const knee = HIP - THIGH;
  return (
    new MergedModel()
      .ellipsoid(palette.pants, [0, 0, 0.005], [0.068, 0.068, 0.07])
      .limb(palette.pants, [0, 0, 0], [0, -0.36, 0], 0.066, 0.052)
      // Calf, fuller at the back.
      .ellipsoid(palette.pants, [0, -0.13, -0.015], [0.064, 0.1, 0.064])
      .limb(palette.hiVis, [0, -0.2, 0], [0, -0.26, 0], 0.07, 0.064)
      .limb(palette.reflective, [0, -0.222, 0], [0, -0.238, 0], 0.072, 0.07)
      // Work boot: collar, foot with a rounded toe, and a dark sole.
      .limb(palette.boots, [0, -0.32, 0], [0, -knee + 0.06, 0.005], 0.06, 0.064)
      .box(palette.boots, [0, -knee + 0.055, 0.035], [0.122, 0.09, 0.2])
      .ellipsoid(palette.boots, [0, -knee + 0.05, 0.13], [0.061, 0.045, 0.06])
      .box(palette.sole, [0, -knee + 0.015, 0.045], [0.132, 0.03, 0.27])
      .build()
  );
}

export function buildCharacter(): Character {
  const m = new MergedModel();
  const fromFeet = m.within(new Matrix4().makeTranslation(0, -HIP, 0));
  torso(fromFeet);
  harnessAndPack(fromFeet);
  head(
    fromFeet.within(
      new Matrix4()
        .makeTranslation(0, NECK_TOP, 0)
        .multiply(new Matrix4().makeScale(HEAD_SCALE, HEAD_SCALE, HEAD_SCALE))
        .multiply(new Matrix4().makeTranslation(0, -NECK_TOP, 0)),
    ),
  );

  const right = upperArm(-1);
  const left = upperArm(1);
  const rightLeg = upperLeg(-1);
  const leftLeg = upperLeg(1);

  // Twin flames from the thrusters, scaled from their nozzles.
  const flames = new MergedModel();
  for (const x of [-0.1, 0.1]) flames.frustum(palette.flame, [x, -0.25, 0], 0.045, 0.01, 0.5, 6);
  const flame = pivot(flames.build(), [0, 1.07 - HIP, -0.25]);

  const body = new Group();
  body.add(m.build(), flame, right.arm, left.arm, rightLeg.leg, leftLeg.leg);
  body.position.y = HIP;
  const root = new Group();
  root.add(body);
  return {
    root,
    body,
    arms: [right.arm, left.arm],
    forearms: [right.forearm, left.forearm],
    legs: [rightLeg.leg, leftLeg.leg],
    shins: [rightLeg.shin, leftLeg.shin],
    flame,
  };
}
