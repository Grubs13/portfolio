import { Matrix4, Quaternion, Vector3 } from 'three';
import { type StageBuilder, stageGround, type Vec } from './kit';
import { MergedModel } from './merged';
import { palette, type Paint } from './palette';
import { gable, pipe, vehicle, worker } from './props';

// The Kellogg reformer at Carseland mid-turnaround, after site photos. Left to
// right along the row: the radiant section, a rust-panelled box on piers with
// tunnel burners across its left end wall and a corrugated penthouse over the harps;
// the grey modules of the convection section; and the banded stack with the
// F.D. fan house at its foot. One crane lifts a catalyst-tube harp out through
// the opened penthouse roof while a second sets a new convection module.
//
// The row is laid out in its own frame (u along the row, v toward the viewer,
// long front wall at v = FACE) and turned past 45 degrees so the camera sees
// the front wall and the burner end wall at u0. The character stands on the
// road in front of the row. Both flight paths leave toward screen-right,
// rising about one unit per unit travelled, so nothing tall stands near them.

const ROW_YAW = (5 * Math.PI) / 12;
const FACE = -4;
const DEPTH = 6;
const BACK = FACE - DEPTH;
const BOX_BOTTOM = 1.2;
const BOX_TOP = 7.2;
const RADIANT = { u0: -12, u1: -1 };
const OPENING = { u0: -7.4, u1: -4.4 };
/** Set back from the front wall, which leaves the outgoing flight path a clear gap before the stack. */
const CONVECTION = { u0: 0.4, u1: 5, front: FACE - 1.5 };
/** In the plant's own frame, which turns half round, so this lands behind the convection section. */
const STACK: Vec = [8.5, 0, -4];

/** A box from corner to corner, which reads more naturally for buildings than centre and size. */
function slab(model: MergedModel, paint: Paint, [x0, y0, z0]: Vec, [x1, y1, z1]: Vec) {
  model.box(paint, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)]);
}

function ground(model: MergedModel) {
  model.box(palette.gravel, [-3, 0.02, -4], [50, 0.04, 30]);
  model.box(palette.road, [0, 0.045, 0.2], [56, 0.01, 3.2]);
  model.box(palette.roadEdge, [0, 0.05, 1.9], [56, 0.01, 0.25]);
}

/**
 * One long wall of the radiant box: stiffener grid with weathered panels, inspection doors,
 * two walkways with handrails, and the inlet header with a pigtail to every tube row.
 * `wall` is the wall's v and `out` the side it faces, so both long walls share the detail.
 */
function longWall(model: MergedModel, wall: number, out: 1 | -1) {
  const { u0, u1 } = RADIANT;
  const at = (d: number) => wall + out * d;
  for (let u = u0; u <= u1 + 0.01; u += 1.6) slab(model, palette.rustDark, [u - 0.07, BOX_BOTTOM, wall], [u + 0.07, BOX_TOP, at(0.1)]);
  for (const y of [3.4, 5.2]) slab(model, palette.rustDark, [u0, y - 0.07, wall], [u1, y + 0.07, at(0.1)]);
  for (let u = u0 + 0.8, i = 0; u < u1; u += 1.6, i++) {
    if (i % 3 === (out === 1 ? 1 : 2)) slab(model, palette.rustLight, [u - 0.65, 3.55, wall], [u + 0.65, 5.05, at(0.04)]);
    slab(model, palette.rustDark, [u - 0.22, BOX_BOTTOM + 0.6, wall], [u + 0.22, BOX_BOTTOM + 1.1, at(0.06)]);
  }
  for (const y of [3.4, BOX_TOP]) {
    slab(model, palette.galvanized, [u0, y - 0.08, wall], [u1 + 1.2, y, at(0.9)]);
    slab(model, palette.galvanized, [u0, y + 0.85, at(0.85)], [u1 + 1.2, y + 0.92, at(0.9)]);
    for (let u = u0; u <= u1 + 1.2; u += 1.2) slab(model, palette.galvanized, [u - 0.03, y, at(0.85)], [u + 0.03, y + 0.9, at(0.9)]);
  }
  pipe(model, palette.stainless, [(u0 + u1) / 2, BOX_TOP + 0.35, at(-0.3)], 0.2, u1 - u0, true, 8);
  for (let u = u0 + 0.4; u < u1; u += 0.7) slab(model, palette.stainless, [u - 0.04, BOX_TOP + 0.05, at(-0.5)], [u + 0.04, BOX_TOP + 0.35, at(-0.42)]);
}

function radiantSection(model: MergedModel) {
  const { u0, u1 } = RADIANT;
  for (let u = u0 + 0.6; u < u1; u += 2.5) {
    for (const v of [FACE - 0.6, BACK + 0.6]) slab(model, palette.concrete, [u - 0.35, 0, v - 0.35], [u + 0.35, BOX_BOTTOM, v + 0.35]);
  }
  slab(model, palette.radiantRust, [u0, BOX_BOTTOM, BACK], [u1, BOX_TOP, FACE]);
  longWall(model, FACE, 1);
  longWall(model, BACK, -1);

  // Stiffeners on both end walls.
  for (let v = BACK; v <= FACE + 0.01; v += 1.5) {
    slab(model, palette.rustDark, [u1, BOX_BOTTOM, v - 0.07], [u1 + 0.1, BOX_TOP, v + 0.07]);
    slab(model, palette.rustDark, [u0 - 0.1, BOX_BOTTOM, v - 0.07], [u0, BOX_TOP, v + 0.07]);
  }
  for (const y of [3.4, 5.2]) slab(model, palette.rustDark, [u0 - 0.1, y - 0.07, BACK], [u0, y + 0.07, FACE]);

  // Tunnel burners: a row of boxes along the foot of the end wall, each with its fuel line off a common header.
  for (let v = BACK + 0.75; v < FACE - 0.3; v += 0.9) {
    slab(model, palette.rustLight, [u0 - 0.45, BOX_BOTTOM + 0.1, v - 0.28], [u0, BOX_BOTTOM + 1.7, v + 0.28]);
    slab(model, palette.rustDark, [u0 - 0.5, BOX_BOTTOM + 1.1, v - 0.16], [u0 - 0.45, BOX_BOTTOM + 1.4, v + 0.16]);
    slab(model, palette.stainless, [u0 - 0.38, BOX_BOTTOM, v + 0.36], [u0 - 0.3, BOX_BOTTOM + 1.9, v + 0.44]);
  }
  pipe(model, palette.stainless, [u0 - 0.35, BOX_BOTTOM + 2.05, (FACE + BACK) / 2], 0.09, DEPTH, false, 6);

  // Stairs zig-zagging up the other end wall.
  for (const [y0, y1, v0, v1] of [[0, 3.4, FACE - 0.2, BACK + 1.2], [3.4, BOX_TOP, BACK + 1.2, FACE - 0.2]] as const) {
    model.beam(palette.galvanized, [u1 + 0.75, y0, v0], [u1 + 0.75, y1, v1], 0.7);
  }
  slab(model, palette.galvanized, [u1 + 0.3, 3.32, BACK + 0.4], [u1 + 1.2, 3.4, FACE]);
}

/** The corrugated penthouse over the harps, with roof panels off above the harp being changed. */
function penthouse(model: MergedModel) {
  const { u0, u1 } = RADIANT;
  const [wall, roof] = [1.4, 1.3];
  const top = BOX_TOP + wall;
  for (const [a, b] of [[u0, OPENING.u0], [OPENING.u1, u1]] as const) {
    slab(model, palette.corrugated, [a, BOX_TOP, BACK + 0.2], [b, top, FACE - 0.2]);
    for (let u = a + 0.2; u < b; u += 0.4) slab(model, palette.corrugatedShade, [u - 0.06, BOX_TOP, FACE - 0.2], [u + 0.06, top, FACE - 0.16]);
    const length = b - a;
    model.add(
      palette.corrugated,
      gable,
      new Matrix4().compose(new Vector3((a + b) / 2, top, (FACE + BACK) / 2), new Quaternion(), new Vector3(length, roof, DEPTH)),
    );
  }
  // Harps still in the box show through the opening as rows of tube tops.
  for (let v = BACK + 0.8; v < FACE - 0.6; v += 0.6) {
    if (Math.abs(v - (BACK + FACE) / 2) < 0.4) continue;
    for (let u = OPENING.u0 + 0.35; u < OPENING.u1; u += 0.6) model.cylinder(palette.tube, [u, BOX_TOP + 0.45, v], 0.14, 0.9, 6);
  }
  // The red lifting frame on the roof, with its windsock.
  const [fu, fv] = [u1 - 2.5, (FACE + BACK) / 2];
  for (const du of [-1.2, 1.2]) {
    for (const dv of [-1.2, 1.2]) model.beam(palette.redSteel, [fu + du, top + 0.6, fv + dv], [fu + du, top + 3.2, fv + dv], 0.2);
  }
  for (const dv of [-1.2, 1.2]) model.beam(palette.redSteel, [fu - 1.3, top + 3.2, fv + dv], [fu + 1.3, top + 3.2, fv + dv], 0.22);
  model.beam(palette.galvanized, [fu + 1.6, top + 0.6, fv], [fu + 1.6, top + 4.6, fv], 0.08);
  model.box(palette.tankOrange, [fu + 2.05, top + 4.45, fv], [0.8, 0.28, 0.28]);
}

/** A catalyst-tube harp: a row of tubes hung from a header, rigged to a spreader bar. It faces the viewer, spread along the row. */
function liftedHarp(model: MergedModel, hook: Vec) {
  const [u, hookY, v] = hook;
  const width = OPENING.u1 - OPENING.u0 - 0.4;
  const top = hookY - 2.6;
  const length = 6.5;
  // Tubes are drawn thicker than life so each stays at least an art pixel wide.
  for (let i = 0; i < 6; i++) {
    const tu = u - width / 2 + (i * width) / 5;
    model.cylinder(palette.tube, [tu, top - length / 2, v], 0.18, length, 6);
  }
  model.box(palette.tube, [u, top + 0.1, v], [width + 0.3, 0.25, 0.3]);
  model.box(palette.tube, [u, top - length - 0.1, v], [width + 0.3, 0.22, 0.35]);
  model.box(palette.safetyYellow, [u, top + 1.2, v], [width - 0.4, 0.25, 0.25]);
  for (const s of [-1, 1]) model.beam(palette.black, [u + s * (width / 2), top + 0.2, v], [u + s * (width / 2 - 0.2), top + 1.2, v], 0.05);
  for (const s of [-1, 1]) model.beam(palette.black, [u + s * (width / 2 - 0.2), top + 1.3, v], [u, hookY - 0.6, v], 0.05);
  model.box(palette.safetyYellow, [u, hookY - 0.35, v], [0.4, 0.6, 0.35]);
}

/** One insulated convection-coil module: grey casing with a panel grid. */
function convectionModule(model: MergedModel, [u, y, v]: Vec, size: Vec) {
  const [w, h, d] = size;
  model.box(palette.casing, [u, y + h / 2, v], [w, h, d]);
  for (let i = 1; i < 3; i++) model.box(palette.casingShade, [u - w / 2 + (i * w) / 3, y + h / 2, v + d / 2 + 0.02], [0.08, h, 0.04]);
  model.box(palette.casingShade, [u, y + h / 2, v + d / 2 + 0.02], [w, 0.08, 0.04]);
  for (let i = 1; i < 3; i++) model.box(palette.casingShade, [u + w / 2 + 0.02, y + h / 2, v - d / 2 + (i * d) / 3], [0.04, h, 0.08]);
}

const MODULE: Vec = [2.1, 2.3, CONVECTION.front - BACK - 0.6];

function convectionSection(model: MergedModel) {
  const { u0, u1, front } = CONVECTION;
  const v = (front + BACK) / 2;
  // Rusty casing below, then two columns of modules, the right one still a tier short.
  slab(model, palette.radiantRust, [u0, 0.6, BACK + 0.3], [u1, 2.4, front - 0.3]);
  for (let u = u0 + 0.4; u < u1; u += 1.2) slab(model, palette.rustDark, [u - 0.05, 0.6, front - 0.3], [u + 0.05, 2.4, front - 0.24]);
  for (const u of [u0 + 0.4, u1 - 0.4]) {
    for (const dv of [-2.2, 2.2]) slab(model, palette.concrete, [u - 0.3, 0, v + dv - 0.3], [u + 0.3, 0.6, v + dv + 0.3]);
  }
  const columns = [u0 + MODULE[0] / 2 + 0.1, u1 - MODULE[0] / 2 - 0.1];
  columns.forEach((u, c) => {
    for (let tier = 0; tier < (c === 0 ? 3 : 2); tier++) convectionModule(model, [u, 2.4 + tier * MODULE[1], v], MODULE);
  });
  const top = 2.4 + 3 * MODULE[1];
  // Rusty transition duct across the top back to the radiant box.
  slab(model, palette.radiantRust, [RADIANT.u1 - 0.5, top, BACK + 0.6], [u0 + 3, top + 1.8, front - 1.2]);
  slab(model, palette.rustDark, [RADIANT.u1 - 0.5, top + 1.8, BACK + 0.6], [u0 + 3, top + 1.95, front - 1.2]);
  // Yellow cage ladder and the platform on top of the finished column.
  slab(model, palette.safetyYellow, [u0 - 0.6, 0, front - 0.9], [u0 - 0.5, top + 1, front - 0.4]);
  for (let y = 2; y < top + 1; y += 1) slab(model, palette.safetyYellow, [u0 - 0.95, y - 0.03, front - 1.0], [u0 - 0.5, y + 0.03, front - 0.3]);
  slab(model, palette.safetyYellow, [u0, top + 0.9, front - 1.4], [u0 + MODULE[0], top + 0.96, front - 0.3]);
  // Insulated stainless piping up the gap between the columns.
  model.cylinder(palette.stainless, [(u0 + u1) / 2, top / 2 + 0.4, front + 0.05], 0.22, top - 1, 8);
  model.cylinder(palette.stainless, [(u0 + u1) / 2 + 0.55, top / 2 + 0.2, front + 0.05], 0.14, top - 1.4, 8);
}

/** The stack: banded, with a ladder, a platform ring near the top, and the breeching and F.D. fan house at its foot. */
function stack(model: MergedModel) {
  const [u, , v] = STACK;
  const [radius, height] = [1.3, 24];
  model.cylinder(palette.stackTan, [u, height / 2, v], radius, height, 14);
  for (let y = 2.5; y < height; y += 2.6) model.cylinder(palette.stackBand, [u, y, v], radius + 0.04, 0.12, 14);
  model.cylinder(palette.galvanized, [u, height - 4, v], radius + 0.9, 0.12, 14);
  model.cylinder(palette.galvanized, [u, height - 3.1, v], radius + 0.9, 0.06, 14);
  model.box(palette.galvanized, [u + 0.4, height / 2 - 2, v + radius + 0.2], [0.5, height - 4, 0.12]);
  slab(model, palette.radiantRust, [CONVECTION.u1, 0.6, v - 1.4], [u - radius + 0.2, 3, v + 1.4]);
  slab(model, palette.casing, [u - 1.6, 0, FACE + 1], [u + 1.6, 3, FACE + 3.6]);
  slab(model, palette.casingShade, [u - 0.5, 0, FACE + 3.6], [u + 0.5, 2.1, FACE + 3.64]);
  for (const du of [-1, 0, 1]) slab(model, palette.casingShade, [u + du * 0.9 - 0.04, 0, FACE + 3.62], [u + du * 0.9 + 0.04, 3, FACE + 3.66]);
}

/** A crawler crane with a lattice boom from its upper works to `tip`, the hook line hanging below. */
function crawlerCrane(model: MergedModel, [cx, , cz]: Vec, tip: Vec, hookY: number) {
  for (const side of [-1, 1]) slab(model, palette.steelDark, [cx - 2.4, 0, cz + side * 1.6 - 0.45], [cx + 2.4, 0.9, cz + side * 1.6 + 0.45]);
  slab(model, palette.steelDark, [cx - 1.4, 0.9, cz - 1.4], [cx + 1.4, 1.3, cz + 1.4]);

  const yaw = Math.atan2(-(tip[2] - cz), tip[0] - cx);
  const [c, s] = [Math.cos(yaw), Math.sin(yaw)];
  const at = (forward: number, up: number, side: number): Vec => [cx + forward * c + side * s, up, cz - forward * s + side * c];
  model.box(palette.safetyYellow, at(-0.4, 2.2, 0), [3.4, 1.8, 2.4], yaw);
  model.box(palette.safetyYellow, at(1.3, 2.3, 1.3), [1.2, 1.6, 0.9], yaw);
  model.box(palette.window, at(1.92, 2.5, 1.3), [0.04, 0.7, 0.7], yaw);
  model.box(palette.steelDark, at(-2.5, 2.1, 0), [1.0, 1.6, 2.4], yaw);
  const gantry = at(-1.6, 5.2, 0);
  for (const side of [-0.7, 0.7]) model.beam(palette.safetyYellow, at(-0.8, 3.1, side), gantry, 0.16);
  model.beam(palette.steelDark, gantry, tip, 0.06);

  // Lattice boom: two chords in the boom's vertical plane, laced in a zig-zag so it reads side-on.
  const foot = new Vector3(...at(1.2, 2.6, 0));
  const end = new Vector3(...tip);
  const dir = end.clone().sub(foot).normalize();
  const normal = new Vector3(0, 1, 0).addScaledVector(dir, -dir.y).normalize().multiplyScalar(0.5);
  const chord = (sign: number, t: number): Vec => {
    const p = foot.clone().lerp(end, t).addScaledVector(normal, sign * (1 - 0.7 * t));
    return [p.x, p.y, p.z];
  };
  for (const sign of [-1, 1]) model.beam(palette.safetyYellow, chord(sign, 0), chord(sign, 1), 0.2);
  const bays = 16;
  for (let i = 0; i < bays; i++) {
    model.beam(palette.safetyYellow, chord(i % 2 ? 1 : -1, i / bays), chord(i % 2 ? -1 : 1, (i + 1) / bays), 0.09);
  }
  model.box(palette.safetyYellow, tip, [0.7, 0.7, 0.6], yaw);
  model.beam(palette.black, [tip[0], tip[1] - 0.3, tip[2]], [tip[0], hookY, tip[2]], 0.06);
}

/** The turnaround laydown in front of the burners: new tubes, the old coil, a light tower, a lift, people. */
function laydown(model: MergedModel) {
  // New harps waiting on cribbing.
  for (const [u, v] of [[-11, 3.6], [-11, 5]] as const) {
    for (const du of [-2.6, 0, 2.6]) slab(model, palette.timber, [u + du - 0.2, 0, v - 0.6], [u + du + 0.2, 0.3, v + 0.6]);
    for (let i = 0; i < 6; i++) pipe(model, palette.tube, [u, 0.42, v - 0.45 + i * 0.18], 0.07, 6.5, true, 6);
  }
  // A swapped-out convection module sitting on timbers, tubes showing at its open end.
  const [ou, ov] = [-5.5, 4.6];
  for (const du of [-1, 1]) slab(model, palette.timber, [ou + du - 0.25, 0, ov - 1.3], [ou + du + 0.25, 0.35, ov + 1.3]);
  convectionModule(model, [ou, 0.35, ov], [2.8, 2.1, 2.2]);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) model.box(palette.rustLight, [ou - 0.9 + i * 0.6, 0.75 + j * 0.6, ov + 1.12], [0.3, 0.3, 0.06]);
  }

  // A portable light tower and a boom lift.
  const [lu, lv] = [-1.8, 3.4];
  slab(model, palette.safetyYellow, [lu - 0.8, 0.3, lv - 0.5], [lu + 0.8, 1.1, lv + 0.5]);
  model.box(palette.steelDark, [lu, 3.5, lv], [0.14, 5, 0.14]);
  model.box(palette.steelDark, [lu, 6, lv], [1.4, 0.12, 0.2]);
  for (const du of [-0.5, 0.5]) model.box(palette.lamp, [lu + du, 6.2, lv + 0.12], [0.4, 0.3, 0.1]);
  const [bu, bv] = [-13.5, 1.2];
  slab(model, palette.tankOrange, [bu - 1, 0.2, bv - 0.6], [bu + 1, 0.9, bv + 0.6]);
  model.beam(palette.tankOrange, [bu, 0.9, bv], [bu + 1.4, 5.4, FACE + 1.4], 0.25);
  slab(model, palette.tankOrange, [bu + 0.9, 5.3, FACE + 1.1], [bu + 2.1, 5.5, FACE + 1.9]);
  worker(model, [bu + 1.5, 5.5, FACE + 1.5], palette.hiVis);

  // Barricade posts, cones and the crew.
  for (const u of [-9, -3.5, 2]) {
    model.box(palette.black, [u, 0.5, 2.3], [0.08, 1, 0.08]);
    model.box(palette.tube, [u, 1.05, 2.3], [0.3, 0.3, 0.04]);
  }
  for (const [u, v] of [[-7.6, 2.4], [0.5, 2.5], [-15.5, 2.2]] as const) model.cylinder(palette.tankOrange, [u, 0.3, v], 0.16, 0.6, 6);
  worker(model, [-8.2, 0, 2.9], palette.hiVis);
  worker(model, [-4.2, 0, 2.8], palette.tankOrange);
  worker(model, [-9.6, 0, -2.6], palette.hiVis);
  vehicle(model, [-17.5, 0, 0.4], palette.tube, true);
}

/** The middle of the row's footprint, which the plant turns about to show its far side. */
const ROW_CENTER = new Vector3(-1, 0, (FACE + BACK) / 2);
/** Turns the plant half a turn about its middle, so the camera sees the far wall and the stair end. */
const FAR_SIDE = new Matrix4()
  .makeTranslation(ROW_CENTER.x, 0, ROW_CENTER.z)
  .multiply(new Matrix4().makeRotationY(Math.PI))
  .multiply(new Matrix4().makeTranslation(-ROW_CENTER.x, 0, -ROW_CENTER.z));

const turned = ([u, y, v]: Vec): Vec => {
  const p = new Vector3(u, y, v).applyMatrix4(FAR_SIDE);
  return [p.x, p.y, p.z];
};

export const reformerReharp: StageBuilder = () => {
  const stage = stageGround(new MergedModel());
  const row = stage.within(new Matrix4().makeRotationY(ROW_YAW));
  const plant = row.within(FAR_SIDE);
  // The road, laydown and cranes stay on the camera's side; only the plant itself turns.
  ground(row);
  laydown(row);
  radiantSection(plant);
  penthouse(plant);
  const harpHook: Vec = [(OPENING.u0 + OPENING.u1) / 2, 17.5, (FACE + BACK) / 2];
  liftedHarp(plant, harpHook);
  convectionSection(plant);
  // The new module hangs above its empty slot at the top of its column.
  const [mu, mv, mBottom] = [CONVECTION.u1 - MODULE[0] / 2 - 0.1, (CONVECTION.front + BACK) / 2, 11];
  const moduleHook: Vec = [mu, mBottom + MODULE[1] + 1.6, mv];
  convectionModule(plant, [mu, mBottom, mv], MODULE);
  for (const s of [-1, 1]) plant.beam(palette.black, [mu, mBottom + MODULE[1], mv + s * 1.8], moduleHook, 0.05);
  stack(plant);
  // The cranes stand off the two ends of the plant, so their booms show side-on as they reach in.
  const harpTip = turned([harpHook[0], harpHook[1] + 3, harpHook[2]]);
  crawlerCrane(row, [harpTip[0] + 14, 0, harpTip[2] - 1], harpTip, harpHook[1]);
  const moduleTip = turned([moduleHook[0], moduleHook[1] + 5, moduleHook[2]]);
  crawlerCrane(row, [moduleTip[0] - 13, 0, moduleTip[2] - 2], moduleTip, moduleHook[1]);
  // Aim between the character and the cranes, so the plant, both lifts and the stack share the frame.
  const look = new Vector3(-2, 7, -6).applyAxisAngle(new Vector3(0, 1, 0), ROW_YAW);
  return { object: stage.build(), look: [look.x, look.y, look.z] };
};
