import { Matrix4, Quaternion, Vector3 } from 'three';
import { type StageBuilder, stageGround, type Vec } from './kit';
import { MergedModel } from './merged';
import { palette, type Paint } from './palette';
import { building, drum, exchangers, finFans, pipeRack, scaffold, shellBand, sleeperPipes, structure, tank, vessel } from './plant';
import { cone, dumpster, fence, field, gable, hayBale, lampPost, officeTrailer, pipe, portaPotty, rng, scaled, seaCan, slough, steam, tree, vehicle, worker } from './props';

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

function ground(model: MergedModel) {
  model.slab(palette.gravel, [-44, 0, -54], [38, 0.04, 18]);
  const random = rng(21);
  for (let i = 0; i < 130; i++) {
    const [u, v] = [-43 + random() * 76, -53 + random() * 68];
    model.slab(random() > 0.5 ? palette.gravelDark : palette.gravelLight, [u, 0, v], [u + 1.5 + random() * 4, 0.045, v + 1 + random() * 3]);
  }
  model.slab(palette.concrete, [-13.5, 0, -14.5], [12, 0.05, -2]);
  for (let u = -11; u < 12; u += 3) model.slab(palette.casingShade, [u, 0, -14.5], [u + 0.08, 0.055, -2]);
  model.slab(palette.road, [-44, 0, -1.4], [38, 0.05, 1.8]);
  model.slab(palette.roadEdge, [-44, 0, 1.8], [38, 0.055, 2.05]);
  for (const u of [-23, 24]) model.slab(palette.road, [u - 1.5, 0, -54], [u + 1.5, 0.05, 18]);
  model.slab(palette.road, [-44, 0, -33.5], [38, 0.05, -30.5]);

  // Grass beyond the pad, with a windbreak and the plant fence along the near edge.
  fence(model, [[-44, 18], [38, 18]], 1.4);
  for (let u = -42; u < 38; u += 3.4) tree(model, [u + random() * 1.2, 21 + random() * 3], 2 + random() * 0.8, random() > 0.6);
  for (let i = 0; i < 50; i++) model.box(palette.reed, [-44 + random() * 82, 0.2, 18.4 + random() * 1.2], [0.4, 0.3, 0.4]);

  // Prairie round the plant, which shows on the flights in and out.
  field(model, [42, -34, 60, -4], palette.canola, palette.canolaDeep);
  field(model, [42, 0, 60, 30], palette.fieldGreen, palette.fieldDark, false);
  field(model, [-36, 27, 30, 52], palette.fieldGreen);
  field(model, [-64, -26, -48, 12], palette.canola, palette.canolaDeep, false);
  field(model, [-24, -65, 16, -59.5], palette.stubble2, palette.stubbleDark);
  for (let i = 0; i < 24; i++) hayBale(model, [-34 + random() * 62, 28.5 + random() * 22], random() > 0.5);
  slough(model, [-10, 40], 2.2);
  slough(model, [51, 14], 1.8);
  for (let v = -32; v < 30; v += 3.6) tree(model, [40, v], 2.2, true);
}

/**
 * One long wall of the radiant box: stiffener grid with weathered panels, inspection doors,
 * two walkways with handrails, and the inlet header with a pigtail to every tube row.
 * `wall` is the wall's v and `out` the side it faces, so both long walls share the detail.
 */
function longWall(model: MergedModel, wall: number, out: 1 | -1) {
  const { u0, u1 } = RADIANT;
  const at = (d: number) => wall + out * d;
  for (let u = u0; u <= u1 + 0.01; u += 1.6) model.slab(palette.rustDark, [u - 0.07, BOX_BOTTOM, wall], [u + 0.07, BOX_TOP, at(0.1)]);
  for (const y of [3.4, 5.2]) model.slab(palette.rustDark, [u0, y - 0.07, wall], [u1, y + 0.07, at(0.1)]);
  for (let u = u0 + 0.8, i = 0; u < u1; u += 1.6, i++) {
    if (i % 3 === (out === 1 ? 1 : 2)) model.slab(palette.rustLight, [u - 0.65, 3.55, wall], [u + 0.65, 5.05, at(0.04)]);
    model.slab(palette.rustDark, [u - 0.22, BOX_BOTTOM + 0.6, wall], [u + 0.22, BOX_BOTTOM + 1.1, at(0.06)]);
  }
  for (const y of [3.4, BOX_TOP]) {
    model.slab(palette.galvanized, [u0, y - 0.08, wall], [u1 + 1.2, y, at(0.9)]);
    model.slab(palette.galvanized, [u0, y + 0.85, at(0.85)], [u1 + 1.2, y + 0.92, at(0.9)]);
    for (let u = u0; u <= u1 + 1.2; u += 1.2) model.slab(palette.galvanized, [u - 0.03, y, at(0.85)], [u + 0.03, y + 0.9, at(0.9)]);
  }
  pipe(model, palette.stainless, [(u0 + u1) / 2, BOX_TOP + 0.35, at(-0.3)], 0.2, u1 - u0, true, 8);
  for (let u = u0 + 0.4; u < u1; u += 0.7) model.slab(palette.stainless, [u - 0.04, BOX_TOP + 0.05, at(-0.5)], [u + 0.04, BOX_TOP + 0.35, at(-0.42)]);
}

function radiantSection(model: MergedModel) {
  const { u0, u1 } = RADIANT;
  for (let u = u0 + 0.6; u < u1; u += 2.5) {
    for (const v of [FACE - 0.6, BACK + 0.6]) model.slab(palette.concrete, [u - 0.35, 0, v - 0.35], [u + 0.35, BOX_BOTTOM, v + 0.35]);
  }
  model.slab(palette.radiantRust, [u0, BOX_BOTTOM, BACK], [u1, BOX_TOP, FACE]);
  longWall(model, FACE, 1);
  longWall(model, BACK, -1);

  // Outlet manifolds slung under the box between the piers, where the tube rows collect.
  for (const v of [BACK + 1.5, (FACE + BACK) / 2, FACE - 1.5]) pipe(model, palette.stainless, [(u0 + u1) / 2, 0.75, v], 0.24, u1 - u0 - 0.8, true, 8);

  // Stiffeners on both end walls.
  for (let v = BACK; v <= FACE + 0.01; v += 1.5) {
    model.slab(palette.rustDark, [u1, BOX_BOTTOM, v - 0.07], [u1 + 0.1, BOX_TOP, v + 0.07]);
    model.slab(palette.rustDark, [u0 - 0.1, BOX_BOTTOM, v - 0.07], [u0, BOX_TOP, v + 0.07]);
  }
  for (const y of [3.4, 5.2]) model.slab(palette.rustDark, [u0 - 0.1, y - 0.07, BACK], [u0, y + 0.07, FACE]);

  // Tunnel burners: a row of boxes along the foot of the end wall, each with its fuel line off a common header.
  for (let v = BACK + 0.75; v < FACE - 0.3; v += 0.9) {
    model.slab(palette.rustLight, [u0 - 0.45, BOX_BOTTOM + 0.1, v - 0.28], [u0, BOX_BOTTOM + 1.7, v + 0.28]);
    model.slab(palette.rustDark, [u0 - 0.5, BOX_BOTTOM + 1.1, v - 0.16], [u0 - 0.45, BOX_BOTTOM + 1.4, v + 0.16]);
    model.slab(palette.stainless, [u0 - 0.38, BOX_BOTTOM, v + 0.36], [u0 - 0.3, BOX_BOTTOM + 1.9, v + 0.44]);
  }
  pipe(model, palette.stainless, [u0 - 0.35, BOX_BOTTOM + 2.05, (FACE + BACK) / 2], 0.09, DEPTH, false, 6);

  // Stairs zig-zagging up the other end wall.
  for (const [y0, y1, v0, v1] of [[0, 3.4, FACE - 0.2, BACK + 1.2], [3.4, BOX_TOP, BACK + 1.2, FACE - 0.2]] as const) {
    model.beam(palette.galvanized, [u1 + 0.75, y0, v0], [u1 + 0.75, y1, v1], 0.7);
  }
  model.slab(palette.galvanized, [u1 + 0.3, 3.32, BACK + 0.4], [u1 + 1.2, 3.4, FACE]);
}

/** The corrugated penthouse over the harps, with roof panels off above the harp being changed. */
function penthouse(model: MergedModel) {
  const { u0, u1 } = RADIANT;
  const [wall, roof] = [1.4, 1.3];
  const top = BOX_TOP + wall;
  for (const [a, b] of [[u0, OPENING.u0], [OPENING.u1, u1]] as const) {
    model.slab(palette.corrugated, [a, BOX_TOP, BACK + 0.2], [b, top, FACE - 0.2]);
    for (let u = a + 0.2; u < b; u += 0.4) model.slab(palette.corrugatedShade, [u - 0.06, BOX_TOP, FACE - 0.2], [u + 0.06, top, FACE - 0.16]);
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
  model.slab(palette.radiantRust, [u0, 0.6, BACK + 0.3], [u1, 2.4, front - 0.3]);
  for (let u = u0 + 0.4; u < u1; u += 1.2) model.slab(palette.rustDark, [u - 0.05, 0.6, front - 0.3], [u + 0.05, 2.4, front - 0.24]);
  for (const u of [u0 + 0.4, u1 - 0.4]) {
    for (const dv of [-2.2, 2.2]) model.slab(palette.concrete, [u - 0.3, 0, v + dv - 0.3], [u + 0.3, 0.6, v + dv + 0.3]);
  }
  const columns = [u0 + MODULE[0] / 2 + 0.1, u1 - MODULE[0] / 2 - 0.1];
  columns.forEach((u, c) => {
    for (let tier = 0; tier < (c === 0 ? 3 : 2); tier++) convectionModule(model, [u, 2.4 + tier * MODULE[1], v], MODULE);
  });
  const top = 2.4 + 3 * MODULE[1];
  // Rusty transition duct across the top back to the radiant box.
  model.slab(palette.radiantRust, [RADIANT.u1 - 0.5, top, BACK + 0.6], [u0 + 3, top + 1.8, front - 1.2]);
  model.slab(palette.rustDark, [RADIANT.u1 - 0.5, top + 1.8, BACK + 0.6], [u0 + 3, top + 1.95, front - 1.2]);
  // Yellow cage ladder and the platform on top of the finished column.
  model.slab(palette.safetyYellow, [u0 - 0.6, 0, front - 0.9], [u0 - 0.5, top + 1, front - 0.4]);
  for (let y = 2; y < top + 1; y += 1) model.slab(palette.safetyYellow, [u0 - 0.95, y - 0.03, front - 1.0], [u0 - 0.5, y + 0.03, front - 0.3]);
  model.slab(palette.safetyYellow, [u0, top + 0.9, front - 1.4], [u0 + MODULE[0], top + 0.96, front - 0.3]);
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
  model.box(palette.galvanized, [u - 0.4, height / 2 - 2, v - radius - 0.2], [0.5, height - 4, 0.12]);
  model.cylinder(palette.galvanized, [u, height * 0.45, v], radius + 0.8, 0.12, 14);
  model.cylinder(palette.steelDark, [u, height - 0.1, v], radius + 0.08, 0.3, 14);
  model.cylinder(palette.black, [u, height + 0.03, v], radius - 0.3, 0.06, 14);
  for (const [du, dv] of [[0.5, 0.5], [-0.5, -0.5]] as const) model.box(palette.beacon, [u + du * radius * 1.5, height + 0.2, v + dv * radius * 1.5], [0.3, 0.3, 0.3]);
  model.slab(palette.radiantRust, [CONVECTION.u1, 0.6, v - 1.4], [u - radius + 0.2, 3, v + 1.4]);
  model.slab(palette.casing, [u - 1.6, 0, FACE + 1], [u + 1.6, 3, FACE + 3.6]);
  model.slab(palette.casingShade, [u - 0.5, 0, FACE + 3.6], [u + 0.5, 2.1, FACE + 3.64]);
  for (const du of [-1, 0, 1]) model.slab(palette.casingShade, [u + du * 0.9 - 0.04, 0, FACE + 3.62], [u + du * 0.9 + 0.04, 3, FACE + 3.66]);
}

/** A crawler crane with a lattice boom from its upper works to `tip`, the hook line hanging below. */
function crawlerCrane(model: MergedModel, [cx, , cz]: Vec, tip: Vec, hookY: number) {
  for (const side of [-1, 1]) model.slab(palette.steelDark, [cx - 2.4, 0, cz + side * 1.6 - 0.45], [cx + 2.4, 0.9, cz + side * 1.6 + 0.45]);
  model.slab(palette.steelDark, [cx - 1.4, 0.9, cz - 1.4], [cx + 1.4, 1.3, cz + 1.4]);

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
    for (const du of [-2.6, 0, 2.6]) model.slab(palette.timber, [u + du - 0.2, 0, v - 0.6], [u + du + 0.2, 0.3, v + 0.6]);
    for (let i = 0; i < 6; i++) pipe(model, palette.tube, [u, 0.42, v - 0.45 + i * 0.18], 0.07, 6.5, true, 6);
  }
  // A swapped-out convection module sitting on timbers, tubes showing at its open end.
  const [ou, ov] = [-5.5, 4.6];
  for (const du of [-1, 1]) model.slab(palette.timber, [ou + du - 0.25, 0, ov - 1.3], [ou + du + 0.25, 0.35, ov + 1.3]);
  convectionModule(model, [ou, 0.35, ov], [2.8, 2.1, 2.2]);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) model.box(palette.rustLight, [ou - 0.9 + i * 0.6, 0.75 + j * 0.6, ov + 1.12], [0.3, 0.3, 0.06]);
  }

  // A portable light tower and a boom lift.
  // Off to the character's left, so its mast never stands between him and the camera.
  const [lu, lv] = [-7.6, 3.1];
  model.slab(palette.safetyYellow, [lu - 0.8, 0.3, lv - 0.5], [lu + 0.8, 1.1, lv + 0.5]);
  model.box(palette.steelDark, [lu, 3.5, lv], [0.14, 5, 0.14]);
  model.box(palette.steelDark, [lu, 6, lv], [1.4, 0.12, 0.2]);
  for (const du of [-0.5, 0.5]) model.box(palette.lamp, [lu + du, 6.2, lv + 0.12], [0.4, 0.3, 0.1]);
  const [bu, bv] = [-13.5, 1.2];
  model.slab(palette.tankOrange, [bu - 1, 0.2, bv - 0.6], [bu + 1, 0.9, bv + 0.6]);
  model.beam(palette.tankOrange, [bu, 0.9, bv], [bu + 1.4, 5.4, FACE + 1.4], 0.25);
  model.slab(palette.tankOrange, [bu + 0.9, 5.3, FACE + 1.1], [bu + 2.1, 5.5, FACE + 1.9]);
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

/**
 * The rest of the ammonia unit behind the reformer, built from the plant kit at this scene's
 * scale: the main pipe rack with its air coolers, then CO2 removal, the secondary reformer
 * and its steam drum, the shift converters, the compressor house and the synthesis converter.
 */
function unitBehind(row: MergedModel) {
  const yard = row.within(scaled(-34, -17, 1.8));
  pipeRack(yard, 35, { width: 1.7, tiers: [1.5, 2.2, 2.9], bay: 2.4, seed: 7 });
  finFans(yard, [15, 3.5, 0], 8, 1.8, 6);
  finFans(yard, [27, 3.5, 0], 5, 1.8, 4);

  vessel(yard, [5.2, -3.6], 0.55, 9.6, { platforms: [0.3, 0.6, 0.93], overhead: palette.stainless });
  vessel(yard, [7.2, -3.8], 0.75, 7.8, { platforms: [0.5, 0.92], overhead: palette.galvanized });
  exchangers(yard, [9.4, -3.2], 2, 0.3, 1.7, true);
  structure(yard, [11.6, -5], [14.4, -2.6], [2.2, 4.4, 6.2]);
  vessel(yard, [12.5, -4.1], 0.68, 4.8, { ladder: false });
  drum(yard, [13.2, 6.2 + 0.5, -3.8], 0.42, 2.4, true, palette.tube, 6.2);
  drum(yard, [13.5, 2.2 + 0.45, -3.2], 0.36, 1.8, true, palette.stainless, 2.2);
  vessel(yard, [16.6, -3.8], 0.8, 3.9, { platforms: [0.96] });
  vessel(yard, [18.6, -3.8], 0.8, 3.6, { ladder: false });
  building(yard, [21, -6], [26.4, -3], 2.7, { roof: 'gableX', units: 3, windows: [1.8], band: palette.stripeBlue });
  const [cx, cz] = [29, -4];
  vessel(yard, [cx, cz], 0.7, 6.8, { paint: palette.steel, platforms: [0.6, 0.97] });
  for (const dx of [-0.95, 0.95]) for (const dz of [-0.95, 0.95]) yard.box(palette.redSteel, [cx + dx, 4.2, cz + dz], [0.14, 8.4, 0.14]);
  for (const dz of [-0.95, 0.95]) yard.box(palette.redSteel, [cx, 8.4, cz + dz], [2.2, 0.16, 0.16]);
  exchangers(yard, [31.6, -3.4], 3, 0.3, 1.7, false);
  tank(yard, [2, -4.4], 1.3, 2, { bands: 1 });

  // The transfer line from the radiant box outlets across to the secondary reformer.
  row.tube(palette.stainless, [-1, 2.2, -9], [-3.4, 2.2, -9], 0.4, 8);
  row.tube(palette.stainless, [-3.4, 2.2, -9], [-3.4, 2.2, -14.5], 0.4, 8);
  row.tube(palette.stainless, [-3.4, 2.2, -14.5], [-11.5, 2.2, -23], 0.4, 8);

  // Lines on sleepers along the road shoulder, a compressor shelter up the row and tanks down it.
  sleeperPipes(row.within(scaled(-21, -2.4, 1.5, Math.PI)), 14, 5);
  sleeperPipes(row.within(scaled(12.5, -2.4, 1.5)), 6.4, 6);
  building(row.within(scaled(-40, -12, 1.7)), [0, 0], [5.4, 4.4], 2.6, { roof: 'gableZ', units: 2, windows: [1.6], band: palette.stripeBlue });
  tank(row, [31, -9], 3.2, 4.4, { bands: 2 });
  tank(row, [31, 7.5], 2.6, 3.4, { paint: palette.tankOrange, roofPaint: palette.tankOrangeDark, bands: 1, bandPaint: palette.tankOrangeDark });
  // Across the back road: the cooling tower under its plumes, the ammonia tank and the urea tower.
  const tower = row.within(scaled(-14, -42, 1.5));
  tower.box(palette.concrete, [0, 0.15, 0], [9, 0.3, 3.4]);
  tower.box(palette.stoneDark, [0, 1.5, 0], [8.4, 2.4, 2.6]);
  for (let i = 0; i < 6; i++) {
    const x = -4.2 + (i + 0.5) * 1.4;
    for (let y = 0.9; y < 2.6; y += 0.45) tower.box(palette.stackGrey, [x, y, 1.32], [1.2, 0.2, 0.05]);
    tower.frustum(palette.steel, [x, 3.1, 0], 0.55, 0.68, 0.7, 12);
    steam(tower, [x, 4, 0], 2 + (i % 2), 0.8);
  }
  tank(row, [12, -43], 6, 7, { roof: 'dome', bands: 3 });
  shellBand(row, palette.stripeBlue, [12, 4.4, -43], 6, 1);
  const [pu, pv] = [29.5, -44];
  row.box(palette.towerTan, [pu, 9, pv], [5.4, 18, 5.4]);
  row.box(palette.towerPale, [pu, 15.6, pv], [5.5, 4, 5.5]);
  row.box(palette.steelDark, [pu, 13.4, pv], [5.9, 0.2, 5.9]);
  for (let y = 2; y < 12.5; y += 2.2) for (const d of [-1.6, 0, 1.6]) row.box(palette.window, [pu + d, y, pv + 2.72], [0.7, 0.5, 0.06]);
  row.box(palette.towerTan, [pu - 0.5, 19.2, pv - 0.5], [3, 2.4, 3]);
  steam(row, [pu - 0.6, 22, pv - 0.6], 5, 2);
  for (let u = -40; u < 36; u += 5) tree(row, [u, -56.5], 2.4, true);

  for (const [u, v] of [[-26, -2.4], [-14, 2.6], [8, 2.6], [20, -2.4], [34, 2.6], [-36, 2.6]] as const) lampPost(row, [u, v], 5);
}

/** Scaffolds up the walls being worked on, with the crews on them. */
function scaffolding(row: MergedModel) {
  scaffold(row, [6.2, -3.05], [9.6, -2.1], 5, 1.25);
  scaffold(row, [-7.4, -4.2], [-2.6, -3.2], 6, 1.3);
  row.slab(palette.tarp, [-7.4, 6.5, -3.24], [-5, 7.8, -3.18]);
  worker(row, [7.2, 3.75, -2.6], palette.hiVis);
  worker(row, [8.8, 6.25, -2.6], palette.tankOrange);
  worker(row, [-4, 5.2, -3.7], palette.hiVis);
  worker(row, [-6.4, 2.6, -3.7], palette.hiVis);
  row.box(palette.arc, [-4.4, 6.1, -3.9], [0.16, 0.16, 0.16]);
}

/** A pallet of catalyst drums. */
function drumPallet(model: MergedModel, u: number, v: number, paint: Paint) {
  model.box(palette.plank, [u, 0.1, v], [1.5, 0.2, 1.5]);
  for (const du of [-0.38, 0.38]) for (const dv of [-0.38, 0.38]) model.cylinder(paint, [u + du, 0.65, v + dv], 0.32, 0.9, 8);
}

/** A welding machine on its skid with a bottle rack, and a welder striking an arc at `work`. */
function weldingRig(model: MergedModel, [u, v]: readonly [number, number], work: Vec) {
  model.box(palette.pipeBlue, [u, 0.55, v], [1.1, 0.8, 0.7]);
  model.box(palette.steelDark, [u, 0.1, v], [1.3, 0.2, 0.8]);
  for (let i = 0; i < 3; i++) {
    model.cylinder(i === 1 ? palette.signGreen : palette.tankRed, [u + 1 + i * 0.26, 0.6, v], 0.11, 1.2, 6);
  }
  model.beam(palette.black, [u, 0.08, v], [work[0], 0.08, work[2]], 0.08);
  model.box(palette.arc, work, [0.16, 0.16, 0.16]);
}

/** The turnaround camp across the road: tube and catalyst laydown, tool cribs, offices, the lunch tent and the crews. */
function camp(model: MergedModel) {
  // Spent harps, cut out and stacked for scrap.
  for (const v of [7.4, 8.9]) {
    for (const du of [-2.6, 0, 2.6]) model.slab(palette.timber, [-11 + du - 0.2, 0, v - 0.6], [-11 + du + 0.2, 0.3, v + 0.6]);
    for (let i = 0; i < 6; i++) pipe(model, i % 3 ? palette.rustLight : palette.rustDark, [-11, 0.42, v - 0.45 + i * 0.18], 0.08, 6.5, true, 6);
  }
  // A flatbed backed in with the next harp, its tractor still coupled.
  const [fu, fv] = [-19.5, 5.2];
  model.slab(palette.steelDark, [fu - 3.6, 0.75, fv - 0.75], [fu + 3.6, 0.95, fv + 0.75]);
  for (const du of [-2.9, -2.2, 2.6]) model.box(palette.black, [fu + du, 0.38, fv], [0.6, 0.6, 1.6]);
  for (let i = 0; i < 6; i++) pipe(model, palette.tube, [fu, 1.1, fv - 0.45 + i * 0.18], 0.08, 6.6, true, 6);
  for (const du of [-2.4, 2.4]) model.box(palette.safetyYellow, [fu + du, 1.2, fv], [0.12, 0.12, 1.5]);
  vehicle(model.within(scaled(fu + 5.2, fv, 1.3)), [0, 0, 0], palette.carRed, true);

  // New catalyst in drums on pallets, and spent catalyst bagged for disposal.
  for (const [u, v, paint] of [[7, 4.6, palette.pipeBlue], [8.8, 4.6, palette.pipeBlue], [7, 6.4, palette.pipeBlue], [8.8, 6.4, palette.stainless]] as const) drumPallet(model, u, v, paint);
  for (const [u, v] of [[11.4, 4.6], [12.6, 4.7], [11.5, 5.9], [12.8, 6], [12.1, 7.2]] as const) {
    model.box(palette.tube, [u, 0.5, v], [1, 1, 1]);
    model.box(palette.tubeShade, [u, 1.05, v], [0.5, 0.1, 0.5]);
  }
  // Tube crates and insulation.
  for (const [u, v, n] of [[-6.5, 8.4, 3], [-4.4, 8.6, 2], [-2.4, 8.4, 1]] as const) {
    for (let i = 0; i < n; i++) model.box(i % 2 ? palette.timber : palette.plank, [u, 0.3 + i * 0.6, v], [1.7, 0.56, 1.1]);
  }
  for (const [u, v] of [[2.4, 4.4], [3.3, 4.7], [2.8, 5.5]] as const) model.box(palette.casing, [u, 0.35, v], [0.8, 0.7, 0.8]);

  weldingRig(model, [-14.6, 4], [-12.6, 0.6, 3.6]);
  weldingRig(model, [-14.6, 6.2], [-12.4, 0.6, 5]);
  weldingRig(model, [4.6, -2.6], [5.6, 1.2, -3.6]);

  // Tool cribs in a row, site offices, the lunch tent, washrooms and bins.
  seaCan(model.within(scaled(-18, 13, 1.7)), [0, 0], palette.canBlue, true);
  seaCan(model.within(scaled(-13.4, 13, 1.7)), [0, 0], palette.canRed, true);
  seaCan(model.within(scaled(-8.8, 13, 1.7)), [0, 0], palette.canGreen, true);
  seaCan(model.within(scaled(-13.4, 15, 1.7)), [0, 0], palette.stackGrey, true);
  officeTrailer(model.within(scaled(-1.6, 13.4, 1.6)), [0, 0], true, 3.6);
  officeTrailer(model.within(scaled(-1.6, 16, 1.6)), [0, 0], true, 3.6);
  const tent = model.within(scaled(12, 14, 2.1));
  pipe(tent, palette.tube, [0, 0, 0], 1, 3.2, true, 12);
  for (const o of [-1.2, -0.4, 0.4, 1.2]) pipe(tent, palette.tubeShade, [o, 0, 0], 1.03, 0.08, true, 12);
  for (let i = 0; i < 3; i++) model.box(palette.plank, [9.6 + i * 1.8, 0.45, 11.2], [1.4, 0.12, 0.7]);
  for (let i = 0; i < 5; i++) portaPotty(model.within(scaled(18.6 + i * 1.05, 10.4, 1.5)), [0, 0]);
  dumpster(model.within(scaled(-1, 9, 1.4)), [0, 0], palette.canGreen, true);
  dumpster(model.within(scaled(2, 9, 1.4)), [0, 0], palette.canBlue, true);

  // A telehandler carrying a crate, light plants, and pickups nosed in along the shoulder.
  const [tu, tv] = [1.4, 6.6];
  model.box(palette.tankOrange, [tu, 0.8, tv], [2.2, 0.9, 1.3]);
  for (const du of [-0.75, 0.75]) model.box(palette.black, [tu + du, 0.4, tv], [0.7, 0.8, 1.5]);
  model.box(palette.window, [tu - 0.3, 1.5, tv + 0.2], [0.8, 0.7, 0.7]);
  model.beam(palette.tankOrange, [tu - 0.8, 1.3, tv - 0.3], [tu + 2.4, 2.2, tv - 0.3], 0.25);
  model.box(palette.plank, [tu + 2.7, 2.1, tv - 0.3], [0.9, 0.7, 0.9]);
  for (const [u, v] of [[16, 4], [-25.6, 8]] as const) {
    model.box(palette.safetyYellow, [u, 0.7, v], [1.6, 0.8, 1]);
    model.box(palette.steelDark, [u, 3.5, v], [0.14, 5, 0.14]);
    model.box(palette.steelDark, [u, 6, v], [1.4, 0.12, 0.2]);
    for (const du of [-0.5, 0.5]) model.box(palette.lamp, [u + du, 6.2, v + 0.12], [0.4, 0.3, 0.1]);
  }
  for (const [u, paint] of [[18.4, palette.tube], [21, palette.carSilver], [-27.4, palette.tube], [-30, palette.carBlue], [-32.6, palette.tube]] as const) {
    vehicle(model, [u, 0, 3.6], paint, false);
  }

  // Barricade tape between the posts, more cones, and the rest of the crew.
  model.beam(palette.safetyYellow, [-9, 0.9, 2.3], [2, 0.9, 2.3], 0.08);
  for (const [u, v] of [[-16, 2.3], [-20, 2.4], [5, 2.4], [9.5, 2.5], [14, 2.4], [-2, 7.6], [4.4, 3.4]] as const) cone(model, [u, v]);
  for (const [u, v, vest] of [
    [-12.8, 3.1, palette.hiVis],
    [-12.2, 5.6, palette.tankOrange],
    [-17, 7, palette.hiVis],
    [-6, 6.6, palette.hiVis],
    [3.4, 7.8, palette.tankOrange],
    [8, 8, palette.hiVis],
    [10.4, 5.4, palette.hiVis],
    [0.8, 11.6, palette.tankOrange],
    [9.4, 12, palette.hiVis],
    [11, 12.2, palette.hiVis],
    [-10.8, 11.2, palette.hiVis],
    [6.4, -2.4, palette.tankOrange],
    [-9.4, -1.9, palette.hiVis],
    [14.6, -1.8, palette.hiVis],
    [-21.6, 3.4, palette.tankOrange],
  ] as const) {
    worker(model, [u, 0, v], vest);
  }
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
  unitBehind(row);
  laydown(row);
  camp(row);
  scaffolding(row);
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
