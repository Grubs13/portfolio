import { CylinderGeometry, Matrix4, Vector3 } from 'three';
import { type StageBuilder, stageGround, type Vec } from './kit';
import { MergedModel } from './merged';
import { palette } from './palette';

// A Kellogg top-fired reformer mid-turnaround: a crawler crane lifts one tube
// harp out of the radiant box while a swapped-out convection coil waits on
// cribbing. The character stands at the origin and arrives and leaves across
// the screen-right side (+x and -z), so that wedge stays empty. Tall parts sit
// behind or left of the character, and only low parts come toward the camera.

const PAD = 0.16;
const BOX = { x0: -2.35, x1: -1.15, z0: -1.4, z1: 1.1, height: 1.3 };
const ROOF = BOX.height + 0.08;
const ROW_Z = [-1.18, -0.75, -0.32, 0.11, 0.54, 0.97];
const LIFTED_ROW = 0;
const TUBE_X = [-2.15, -1.95, -1.75, -1.55, -1.35];
const ROW_MID_X = -1.75;
const HARP_SPAN = 0.92;
const LIFT_BOTTOM = 2.15;
const LIFT_TUBE = 0.9;
const BOOM_TIP: Vec = [ROW_MID_X, 4.05, ROW_Z[LIFTED_ROW]!];
const CRANE: Vec = [-0.6, 0, -2.15];

function pad(model: MergedModel) {
  model.add(palette.concrete, new CylinderGeometry(2.6, 2.6, PAD, 7), new Matrix4().makeTranslation(0, -PAD / 2 + 0.02, 0));
}

/** One row of catalyst tubes joined by a header across their tops. */
function harp(model: MergedModel, z: number, bottom: number, length: number) {
  for (const x of TUBE_X) model.cylinder(palette.tube, [x, bottom + length / 2, z], 0.05, length, 6);
  model.box(palette.tube, [ROW_MID_X, bottom + length + 0.05, z], [HARP_SPAN, 0.1, 0.12]);
}

function radiantBox(model: MergedModel) {
  const { x0, x1, z0, z1, height } = BOX;
  const column: Vec = [0.1, height + 0.06, 0.1];
  model.box(palette.steel, [(x0 + x1) / 2, height / 2, (z0 + z1) / 2], [x1 - x0, height, z1 - z0]);
  model.box(palette.refractory, [(x0 + x1) / 2, height + 0.04, (z0 + z1) / 2], [x1 - x0 + 0.06, 0.08, z1 - z0 + 0.06]);
  const bay = (z1 - z0) / 4;
  for (let i = 0; i <= 4; i++) {
    model.box(palette.steelDark, [x1 + 0.02, column[1] / 2, z0 + i * bay], column);
    if (i < 4) model.box(palette.furnace, [x1 + 0.01, 0.45, z0 + (i + 0.5) * bay], [0.03, 0.09, 0.14]);
  }
  model.box(palette.steelDark, [x0, column[1] / 2, z1 + 0.02], column);

  ROW_Z.forEach((z, i) => {
    if (i === LIFTED_ROW) model.box(palette.steelDark, [ROW_MID_X, ROOF + 0.005, z], [HARP_SPAN - 0.04, 0.02, 0.22]);
    else harp(model, z, ROOF, 0.38);
  });
}

function liftedHarp(model: MergedModel) {
  const [x, tipY, z] = BOOM_TIP;
  harp(model, z, LIFT_BOTTOM, LIFT_TUBE);
  model.box(palette.tube, [x, LIFT_BOTTOM, z], [HARP_SPAN, 0.08, 0.1]);
  const header = LIFT_BOTTOM + LIFT_TUBE + 0.1;
  const spreader = header + 0.35;
  model.box(palette.steelDark, [x, spreader, z], [0.8, 0.06, 0.06]);
  for (const side of [-1, 1]) {
    model.beam(palette.steelDark, [x + side * 0.45, header, z], [x + side * 0.38, spreader, z], 0.025);
  }
  model.box(palette.safetyYellow, [x, spreader + 0.15, z], [0.12, 0.18, 0.14]);
  model.beam(palette.steelDark, [x, spreader + 0.24, z], [x, tipY, z], 0.03);
}

function convectionAndStack(model: MergedModel) {
  const [x0, x1, z0, z1, bottom, top] = [-1.9, -1.4, BOX.z1, 2.3, 0.5, 1.15];
  const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
  model.box(palette.tube, [cx, (bottom + top) / 2, cz], [x1 - x0, top - bottom, z1 - z0]);
  for (const x of [x0 + 0.06, x1 - 0.06]) model.box(palette.steelDark, [x, bottom / 2, z1 - 0.08], [0.08, bottom, 0.08]);
  for (const z of [z0 + 0.35, z0 + 0.7]) model.box(palette.steelDark, [cx, (bottom + top) / 2, z], [x1 - x0 + 0.02, top - bottom + 0.02, 0.03]);
  for (const y of [0.68, 0.97]) {
    for (const x of [cx - 0.12, cx + 0.12]) model.box(palette.steelDark, [x, y, z1 + 0.03], [0.07, 0.18, 0.06]);
  }
  const stackTop = 5.1;
  model.cylinder(palette.tube, [cx, (top + stackTop) / 2, 2.0], 0.24, stackTop - top, 8);
  for (const y of [2.4, 3.7]) model.cylinder(palette.steelDark, [cx, y, 2.0], 0.26, 0.08, 8);
  model.cylinder(palette.refractory, [cx, stackTop - 0.15, 2.0], 0.25, 0.3, 8);
}

/** The swapped-out serpentine coil module, resting on timber cribbing. */
function oldCoil(model: MergedModel) {
  const [cx, z0, z1] = [0.35, 1.05, 1.95];
  for (const z of [z0 + 0.15, z1 - 0.15]) model.box(palette.timber, [cx, 0.06, z], [0.8, 0.12, 0.16]);
  for (const x of [cx - 0.25, cx + 0.25]) model.box(palette.timber, [x, 0.18, (z0 + z1) / 2], [0.14, 0.12, 0.9]);
  for (const z of [z0 + 0.05, z1 - 0.05]) model.box(palette.steel, [cx, 0.52, z], [0.62, 0.56, 0.05]);
  for (const y of [0.36, 0.52, 0.68]) {
    for (const x of [cx - 0.18, cx, cx + 0.18]) model.beam(palette.tube, [x, y, z0], [x, y, z1], 0.08);
  }
  for (const [z, y] of [[z0 - 0.02, 0.44], [z1 + 0.02, 0.6]] as const) {
    for (const x of [cx - 0.18, cx, cx + 0.18]) model.box(palette.tube, [x, y, z], [0.08, 0.24, 0.06]);
  }
}

function crawlerCrane(model: MergedModel) {
  const [cx, , cz] = CRANE;
  for (const side of [-1, 1]) model.box(palette.steelDark, [cx, 0.12, cz + side * 0.27], [0.9, 0.24, 0.24]);
  model.box(palette.steelDark, [cx, 0.3, cz], [0.5, 0.12, 0.5]);

  const yaw = Math.atan2(-(BOOM_TIP[2] - cz), BOOM_TIP[0] - cx);
  const [c, s] = [Math.cos(yaw), Math.sin(yaw)];
  // Upper works are laid out in the crane's own frame: forward toward the boom
  // tip and side toward the camera, so the operator cab is never hidden.
  const toCamera = s + c >= 0 ? 1 : -1;
  const at = (forward: number, up: number, side: number): Vec => [
    cx + forward * c + side * toCamera * s,
    up,
    cz - forward * s + side * toCamera * c,
  ];
  model.box(palette.safetyYellow, at(-0.1, 0.6, 0), [0.85, 0.45, 0.55], yaw);
  model.box(palette.safetyYellow, at(0.3, 0.62, 0.34), [0.32, 0.38, 0.2], yaw);
  model.box(palette.steelDark, at(0.47, 0.68, 0.34), [0.02, 0.18, 0.16], yaw);
  model.box(palette.steelDark, at(-0.55, 0.6, 0), [0.22, 0.42, 0.55], yaw);
  const gantry = at(-0.45, 1.35, 0);
  for (const side of [-0.2, 0.2]) model.beam(palette.safetyYellow, at(-0.3, 0.82, side), gantry, 0.05);
  model.beam(palette.steelDark, gantry, BOOM_TIP, 0.025);

  // Lattice boom: two chords in the boom's vertical plane with zig-zag lacing, so it reads side-on.
  const foot = new Vector3(...at(0.3, 0.8, 0));
  const tip = new Vector3(...BOOM_TIP);
  const dir = tip.clone().sub(foot).normalize();
  const normal = new Vector3(0, 1, 0).addScaledVector(dir, -dir.y).normalize().multiplyScalar(0.11);
  const chord = (sign: number, t: number): Vec => {
    const p = foot.clone().lerp(tip, t).addScaledVector(normal, sign * (1 - 0.6 * t));
    return [p.x, p.y, p.z];
  };
  for (const sign of [-1, 1]) model.beam(palette.safetyYellow, chord(sign, 0), chord(sign, 1), 0.06);
  const bays = 9;
  for (let i = 0; i < bays; i++) {
    model.beam(palette.safetyYellow, chord(i % 2 ? 1 : -1, i / bays), chord(i % 2 ? -1 : 1, (i + 1) / bays), 0.03);
  }
  model.box(palette.safetyYellow, [tip.x, tip.y, tip.z], [0.16, 0.16, 0.12], yaw);
}

/** The diorama is laid out at character scale and enlarged to plant scale on its stage. */
const PLANT_SCALE = 2.5;

export const reformerReharp: StageBuilder = () => {
  const ground = stageGround(new MergedModel());
  const model = ground.scaled(PLANT_SCALE);
  pad(model);
  radiantBox(model);
  liftedHarp(model);
  convectionAndStack(model);
  oldCoil(model);
  crawlerCrane(model);
  return ground.build();
};
