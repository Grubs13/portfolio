import { CylinderGeometry, Matrix4, SphereGeometry, TorusGeometry } from 'three';
import type { Vec } from './kit';
import type { MergedModel } from './merged';
import { palette, type Paint } from './palette';
import { gable, pipe, rng, type XZ } from './props';

// Process-plant equipment, the parts an ammonia or urea unit is assembled from.
// Every part faces its detail toward +x and +z, the two sides the camera sees.

/** A horizontal ring of pipe, for the handrail round a circular platform. */
export function hoop(model: MergedModel, paint: Paint, [x, y, z]: Vec, radius: number, thickness = 0.05, segments = 12) {
  model.add(paint, new TorusGeometry(radius, thickness, 4, segments).rotateX(Math.PI / 2), new Matrix4().makeTranslation(x, y, z));
}

/** A straight handrail: a top rail on posts. */
export function handrail(model: MergedModel, from: Vec, to: Vec, height = 0.45, paint: Paint = palette.safetyYellow) {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const posts = Math.max(1, Math.round(length / 0.9));
  for (let i = 0; i <= posts; i++) {
    const t = i / posts;
    const [x, y, z] = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t];
    model.box(paint, [x, y + height / 2, z], [0.08, height, 0.08]);
  }
  model.beam(paint, [from[0], from[1] + height, from[2]], [to[0], to[1] + height, to[2]], 0.08);
}

/** A grating deck with handrails along its +x and +z edges and the far two left open to view. */
export function deck(model: MergedModel, [x0, z0]: XZ, [x1, z1]: XZ, y: number, rail = 0.45, paint: Paint = palette.galvanized) {
  model.slab(paint, [x0, y - 0.1, z0], [x1, y, z1]);
  handrail(model, [x0, y, z1], [x1, y, z1], rail);
  handrail(model, [x1, y, z0], [x1, y, z1], rail);
}

export interface VesselOptions {
  paint?: Paint;
  /** Height of the vessel's foot above the ground, for one standing on a structure. */
  base?: number;
  skirt?: number;
  /** Platform heights as fractions of the vessel's height. */
  platforms?: readonly number[];
  ladder?: boolean;
  /** Paint of an overhead line that leaves the top and runs down the side. */
  overhead?: Paint;
  segments?: number;
}

/** A vertical vessel or column on a skirt, with ring platforms, a ladder and an overhead line. */
export function vessel(model: MergedModel, [x, z]: XZ, radius: number, height: number, options: VesselOptions = {}) {
  const { paint = palette.stainless, base = 0, platforms = [], ladder = true, overhead, segments = 10 } = options;
  const skirt = options.skirt ?? Math.min(0.7, height * 0.12);
  const head = radius * 0.55;
  const shell = height - skirt - head;
  if (skirt > 0) model.cylinder(palette.steelDark, [x, base + skirt / 2, z], radius * 0.92, skirt, segments);
  model.cylinder(paint, [x, base + skirt + shell / 2, z], radius, shell, segments);
  model.frustum(paint, [x, base + height - head / 2, z], radius * 0.4, radius, head, segments);
  for (const fraction of platforms) {
    const y = base + height * fraction;
    model.cylinder(palette.galvanized, [x, y, z], radius + 0.38, 0.1, segments);
    hoop(model, palette.safetyYellow, [x, y + 0.42, z], radius + 0.36, 0.05, segments);
  }
  if (ladder) {
    const d = (radius + 0.06) * Math.SQRT1_2;
    model.box(palette.galvanized, [x + d, base + skirt + shell / 2, z + d], [0.16, shell, 0.16], Math.PI / 4);
  }
  if (overhead) {
    const top = base + height;
    const out = z + radius + 0.2;
    model.tube(overhead, [x, top - 0.1, z], [x, top + 0.35, z], 0.1);
    model.tube(overhead, [x, top + 0.35, z], [x, top + 0.35, out], 0.1);
    model.tube(overhead, [x, top + 0.35, out], [x, base + height * 0.25, out], 0.1);
  }
}

/** A horizontal drum with dished heads, on saddles that reach down to `floor`. */
export function drum(model: MergedModel, [x, y, z]: Vec, radius: number, length: number, alongX: boolean, paint: Paint = palette.stainless, floor = 0) {
  pipe(model, paint, [x, y, z], radius, length, alongX, 10);
  pipe(model, paint, [x, y, z], radius * 0.7, length + radius * 0.5, alongX, 10);
  for (const s of [-0.3, 0.3]) {
    const [sx, sz] = alongX ? [x + s * length, z] : [x, z + s * length];
    const size: Vec = alongX ? [0.2, y - floor, radius * 1.5] : [radius * 1.5, y - floor, 0.2];
    model.box(palette.concrete, [sx, (y + floor) / 2, sz], size);
  }
  model.cylinder(palette.steelDark, [x, y + radius + 0.08, z], 0.09, 0.2, 6);
}

/** Shell-and-tube exchangers stacked on one another, each with a flanged channel head at its +x or +z end. */
export function exchangers(model: MergedModel, [x, z]: XZ, count: number, radius: number, length: number, alongX: boolean, floor = 0) {
  for (let i = 0; i < count; i++) {
    const y = floor + radius + 0.25 + i * (radius * 2 + 0.2);
    drum(model, [x, y, z], radius, length, alongX, i % 2 ? palette.galvanized : palette.stainless, floor);
    const end = length / 2 - 0.25;
    const flange: Vec = alongX ? [x + end, y, z] : [x, y, z + end];
    pipe(model, palette.steelDark, flange, radius * 1.18, 0.1, alongX, 10);
    const channel: Vec = alongX ? [x + end + 0.2, y, z] : [x, y, z + end + 0.2];
    pipe(model, palette.steel, channel, radius * 1.02, 0.3, alongX, 10);
  }
}

/** A bank of fin-fan air coolers whose foot is at `y`: a finned bundle with a row of fan rings on top. */
export function finFans(model: MergedModel, [x, y, z]: Vec, length: number, depth: number, fans: number, alongX = true) {
  const size: Vec = alongX ? [length, 0.45, depth] : [depth, 0.45, length];
  model.box(palette.galvanized, [x, y + 0.23, z], size);
  model.box(palette.steelDark, [x, y + 0.06, z], [size[0] + 0.1, 0.1, size[2] + 0.1]);
  const radius = Math.min(depth, length / fans) * 0.4;
  for (let i = 0; i < fans; i++) {
    const o = -length / 2 + (i + 0.5) * (length / fans);
    const [fx, fz] = alongX ? [x + o, z] : [x, z + o];
    model.cylinder(palette.steelDark, [fx, y + 0.5, fz], radius, 0.14, 10);
    model.cylinder(palette.stackGrey, [fx, y + 0.55, fz], radius * 0.35, 0.12, 6);
  }
}

const LINES: readonly Paint[] = [
  palette.stainless,
  palette.stainless,
  palette.steel,
  palette.galvanized,
  palette.tube,
  palette.hiVis,
  palette.pipeGreen,
  palette.pipeBlue,
  palette.fireRed,
  palette.tankOrange,
];

export interface RackOptions {
  width?: number;
  /** Height of each tier of pipes. */
  tiers?: readonly number[];
  bay?: number;
  seed?: number;
  /** Lays a cable tray above the top tier. */
  tray?: boolean;
}

/**
 * A pipe rack along +x from 0 to `length`, centered on z = 0: steel bents carrying tiers
 * of lines in mixed sizes and colours. Place it with `model.within(place(...))`.
 */
export function pipeRack(model: MergedModel, length: number, options: RackOptions = {}) {
  const { width = 1.6, tiers = [1.5, 2.3], bay = 2.2, seed = 1, tray = true } = options;
  const random = rng(seed * 97 + 13);
  const half = width / 2;
  const top = tiers[tiers.length - 1]!;
  const bays = Math.max(1, Math.round(length / bay));
  for (let i = 0; i <= bays; i++) {
    const x = (i * length) / bays;
    for (const s of [-half, half]) model.box(palette.steelDark, [x, top / 2, s], [0.14, top, 0.14]);
    for (const y of tiers) model.box(palette.steelDark, [x, y, 0], [0.14, 0.12, width + 0.3]);
  }
  for (const y of tiers) {
    let z = -half + 0.12;
    while (z < half - 0.12) {
      const radius = 0.07 + random() * 0.08;
      z += radius;
      pipe(model, LINES[Math.floor(random() * LINES.length)]!, [length / 2, y + 0.06 + radius, z], radius, length, true, 6);
      z += radius + 0.05 + random() * 0.12;
    }
  }
  if (tray) model.box(palette.galvanized, [length / 2, top + 0.5, half - 0.2], [length, 0.06, 0.3]);
}

/** A pipe bridge: the lines of a rack carried on low sleepers, as they run along the pond berms. */
export function sleeperPipes(model: MergedModel, length: number, seed = 1) {
  const random = rng(seed * 31 + 7);
  for (let x = 0; x <= length + 0.01; x += 2.5) model.box(palette.concrete, [x, 0.2, 0], [0.25, 0.4, 1.1]);
  for (let z = -0.4; z <= 0.41; z += 0.27) {
    pipe(model, LINES[Math.floor(random() * LINES.length)]!, [length / 2, 0.5, z], 0.09, length, true, 6);
  }
}

export interface BuildingOptions {
  wall?: Paint;
  trim?: Paint;
  /** A flat roof with a parapet, or a gable with its ridge along x or z. */
  roof?: 'flat' | 'gableX' | 'gableZ';
  roofPaint?: Paint;
  /** Heights of each row of windows. */
  windows?: readonly number[];
  door?: boolean;
  /** Rooftop air handlers on a flat roof, or ridge vents on a gable. */
  units?: number;
  /** A coloured band along the foot of the walls. */
  band?: Paint;
}

/** A building from corner to corner with windows, a door, a roof and rooftop units. */
export function building(model: MergedModel, [x0, z0]: XZ, [x1, z1]: XZ, height: number, options: BuildingOptions = {}) {
  const { wall = palette.tube, trim = palette.stoneDark, roof = 'flat', roofPaint = palette.tubeShade, windows = [], door = true, units = 0, band } = options;
  const [cx, cz, w, d] = [(x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0];
  model.slab(wall, [x0, 0, z0], [x1, height, z1]);
  if (band) {
    model.slab(band, [x0, 0.15, z1], [x1, 0.45, z1 + 0.03]);
    model.slab(band, [x1, 0.15, z0], [x1 + 0.03, 0.45, z1]);
  }
  for (const y of windows) {
    for (let x = x0 + 0.45; x < x1 - 0.3; x += 0.8) model.box(palette.window, [x, y, z1 + 0.02], [0.42, 0.3, 0.04]);
    for (let z = z0 + 0.45; z < z1 - 0.3; z += 0.8) model.box(palette.window, [x1 + 0.02, y, z], [0.04, 0.3, 0.42]);
  }
  if (door) model.box(palette.stripeBlue, [x1 + 0.03, 0.38, z0 + d * 0.3], [0.04, 0.76, 0.42]);
  if (roof === 'flat') {
    model.box(trim, [cx, height + 0.06, cz], [w + 0.16, 0.12, d + 0.16]);
    for (let i = 0; i < units; i++) {
      const [ux, uz] = [x0 + ((i + 0.5) * w) / units, cz + (i % 2 ? 0.2 : -0.2) * d];
      model.box(palette.galvanized, [ux, height + 0.3, uz], [Math.min(0.7, w / units - 0.2), 0.36, 0.55]);
      model.box(palette.steelDark, [ux, height + 0.5, uz], [0.3, 0.06, 0.3]);
    }
    return;
  }
  const alongX = roof === 'gableX';
  const [run, span] = alongX ? [w, d] : [d, w];
  const rise = span * 0.28;
  const turn = new Matrix4().makeRotationY(alongX ? 0 : Math.PI / 2);
  model.add(roofPaint, gable, new Matrix4().makeTranslation(cx, height, cz).multiply(turn).multiply(new Matrix4().makeScale(run + 0.2, rise, span + 0.2)));
  for (let i = 0; i < units; i++) {
    const o = -run / 2 + ((i + 0.5) * run) / units;
    model.box(palette.galvanized, alongX ? [cx + o, height + rise, cz] : [cx, height + rise, cz + o], [0.4, 0.3, 0.4]);
  }
}

/** An arched fabric or steel shelter lying along x or z, with ribs and a door in its visible end. */
export function quonset(model: MergedModel, [x, z]: XZ, radius: number, length: number, alongX: boolean, paint: Paint = palette.tube) {
  pipe(model, paint, [x, 0, z], radius, length, alongX, 12);
  for (let o = -length / 2 + 0.5; o < length / 2; o += 1) {
    pipe(model, palette.tubeShade, alongX ? [x + o, 0, z] : [x, 0, z + o], radius + 0.03, 0.1, alongX, 12);
  }
  const end = length / 2 + 0.02;
  if (alongX) model.box(palette.stoneDark, [x + end, radius * 0.3, z], [0.04, radius * 0.6, radius * 0.7]);
  else model.box(palette.stoneDark, [x, radius * 0.3, z + end], [radius * 0.7, radius * 0.6, 0.04]);
}

export interface TankOptions {
  paint?: Paint;
  roofPaint?: Paint;
  roof?: 'dome' | 'cone' | 'flat';
  /** A stair spiralling up the shell on the camera's side. */
  stair?: boolean;
  /** Stiffening rings round the shell. */
  bands?: number;
  bandPaint?: Paint;
  segments?: number;
}

/** A storage tank standing on the ground. */
export function tank(model: MergedModel, [x, z]: XZ, radius: number, height: number, options: TankOptions = {}) {
  const { paint = palette.tube, roofPaint = paint, roof = 'cone', stair = true, bands = 0, bandPaint = palette.tubeShade, segments = 16 } = options;
  model.cylinder(palette.concrete, [x, 0.05, z], radius + 0.25, 0.1, segments);
  model.cylinder(paint, [x, height / 2, z], radius, height, segments);
  for (let i = 1; i <= bands; i++) model.cylinder(bandPaint, [x, (i * height) / (bands + 1), z], radius + 0.03, 0.08, segments);
  if (roof === 'dome') {
    const rise = radius * 0.42;
    const cap = new SphereGeometry(radius, segments, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, rise / radius, 1);
    model.add(roofPaint, cap, new Matrix4().makeTranslation(x, height, z));
    model.cylinder(palette.steelDark, [x, height + rise + 0.1, z], 0.18, 0.25, 6);
  } else if (roof === 'cone') {
    model.frustum(roofPaint, [x, height + radius * 0.09, z], radius * 0.08, radius, radius * 0.18, segments);
    model.cylinder(palette.steelDark, [x, height + radius * 0.2, z], 0.12, 0.2, 6);
  }
  hoop(model, palette.safetyYellow, [x, height + 0.3, z], radius - 0.02, 0.04, segments);
  if (!stair) return;
  // The stair climbs a third of the way round, across the side that faces the camera.
  const steps = Math.max(6, Math.round(height / 0.22));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = -0.1 * Math.PI + t * 0.75 * Math.PI;
    const r = radius + 0.14;
    model.box(palette.galvanized, [x + Math.cos(a) * r, 0.15 + t * (height - 0.1), z + Math.sin(a) * r], [0.26, 0.1, 0.26], -a);
  }
}

/** A painted band wrapped part of the way round a tank shell, centered on the side that faces the camera. */
export function shellBand(model: MergedModel, paint: Paint, [x, y, z]: Vec, radius: number, height: number, sweep = Math.PI / 3) {
  const arc = new CylinderGeometry(radius + 0.03, radius + 0.03, height, 8, 1, true, Math.PI / 4 - sweep / 2, sweep);
  model.add(paint, arc, new Matrix4().makeTranslation(x, y, z));
}

export interface StackOptions {
  paint?: Paint;
  bands?: number;
  /** Height of a sampling platform as a fraction of the stack. */
  platform?: number;
  /** A red aviation light at the top. */
  beacon?: boolean;
}

export function stack(model: MergedModel, [x, z]: XZ, radius: number, height: number, options: StackOptions = {}) {
  const { paint = palette.stackGrey, bands = 0, platform, beacon = false } = options;
  model.cylinder(paint, [x, height / 2, z], radius, height, 10);
  model.cylinder(palette.steelDark, [x, height - 0.1, z], radius + 0.06, 0.2, 10);
  for (let i = 1; i <= bands; i++) model.cylinder(palette.stackBand, [x, (i * height) / (bands + 1), z], radius + 0.04, 0.1, 10);
  if (platform !== undefined) {
    const y = height * platform;
    model.cylinder(palette.galvanized, [x, y, z], radius + 0.4, 0.1, 10);
    hoop(model, palette.safetyYellow, [x, y + 0.42, z], radius + 0.38, 0.05, 10);
    const d = (radius + 0.06) * Math.SQRT1_2;
    model.box(palette.galvanized, [x + d, y / 2, z + d], [0.14, y, 0.14], Math.PI / 4);
  }
  if (beacon) model.box(palette.beacon, [x, height + 0.1, z], [0.16, 0.16, 0.16]);
}

/** An open steel structure from corner to corner: columns, braced bays and railed decks at the given heights. */
export function structure(model: MergedModel, [x0, z0]: XZ, [x1, z1]: XZ, decks: readonly number[], paint: Paint = palette.rust) {
  const top = decks[decks.length - 1]!;
  const xs = [x0, ...(x1 - x0 > 3 ? [(x0 + x1) / 2] : []), x1];
  for (const x of xs) for (const z of [z0, z1]) model.box(paint, [x, top / 2, z], [0.16, top, 0.16]);
  let below = 0;
  for (const y of decks) {
    deck(model, [x0 - 0.1, z0 - 0.1], [x1 + 0.1, z1 + 0.1], y, 0.45, paint);
    model.beam(paint, [x0, below, z1], [x1, y - 0.1, z1], 0.1);
    model.beam(paint, [x1, below, z1], [x1, y - 0.1, z0], 0.1);
    below = y;
  }
}

/** A zig-zag stair up the +z face of something `width` wide whose foot is at `x`, `z`. */
export function stairs(model: MergedModel, [x, z]: XZ, width: number, landings: readonly number[], paint: Paint = palette.galvanized) {
  let below = 0;
  landings.forEach((y, i) => {
    const [a, b] = i % 2 ? [x + width, x] : [x, x + width];
    model.beam(paint, [a, below, z], [b, y, z], 0.3);
    handrail(model, [a, below + 0.1, z + 0.18], [b, y + 0.1, z + 0.18], 0.35);
    model.box(paint, [b, y, z], [0.5, 0.08, 0.5]);
    below = y;
  });
}

/** Tube-and-clamp scaffolding from corner to corner, planked at each lift with a green tag at its foot. */
export function scaffold(model: MergedModel, [x0, z0]: XZ, [x1, z1]: XZ, lifts: number, lift = 1.1) {
  const top = lifts * lift;
  const count = (span: number) => Math.max(1, Math.round(span / 1.2));
  const [nx, nz] = [count(x1 - x0), count(z1 - z0)];
  for (let i = 0; i <= nx; i++) {
    for (let k = 0; k <= nz; k++) {
      const [x, z] = [x0 + ((x1 - x0) * i) / nx, z0 + ((z1 - z0) * k) / nz];
      model.box(palette.galvanized, [x, (top + 0.5) / 2, z], [0.1, top + 0.5, 0.1]);
    }
  }
  for (let l = 1; l <= lifts; l++) {
    const y = l * lift;
    model.slab(palette.plank, [x0, y - 0.06, z0], [x1, y, z1]);
    model.beam(palette.galvanized, [x0, y + 0.45, z1], [x1, y + 0.45, z1], 0.08);
    model.beam(palette.galvanized, [x1, y + 0.45, z0], [x1, y + 0.45, z1], 0.08);
    model.beam(palette.galvanized, [x0, y - lift, z1], [x1, y, z1], 0.07);
  }
  model.box(palette.signGreen, [x1 + 0.05, 0.7, z1 + 0.05], [0.14, 0.2, 0.14]);
}

/** A flare stack held by guy wires, with a flame at its tip. */
export function flare(model: MergedModel, [x, z]: XZ, height: number) {
  model.cylinder(palette.concrete, [x, 0.15, z], 0.5, 0.3, 8);
  model.cylinder(palette.stackGrey, [x, height / 2, z], 0.14, height, 6);
  model.cylinder(palette.steelDark, [x, height - 0.3, z], 0.22, 0.6, 6);
  for (const [dx, dz] of [[2.6, 0], [-1.3, 2.2], [-1.3, -2.2]] as const) {
    model.beam(palette.steelDark, [x, height * 0.7, z], [x + dx, 0, z + dz], 0.04);
  }
  model.frustum(palette.furnace, [x, height + 0.3, z], 0.08, 0.2, 0.6, 6);
  model.frustum(palette.flame, [x - 0.1, height + 0.75, z], 0.02, 0.14, 0.5, 5);
}
