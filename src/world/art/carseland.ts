import { Matrix4, Quaternion, Vector3 } from 'three';
import { type StageBuilder, stageGround, type Vec } from './kit';
import { MergedModel } from './merged';
import { palette, type Paint } from './palette';
import { building, deck, drum, exchangers, finFans, flare, handrail, pipeRack, quonset, shellBand, sleeperPipes, stack, structure, tank, vessel } from './plant';
import { car, fence, field, gable, hayBale, lampPost, officeTrailer, pipe, place, powerPole, rng, seaCan, slough, steam, tree, vehicle, worker, type Rect, type XZ } from './props';
import { CAR_PITCH, hopperCar, locomotive, tankCar, track } from './rail';

// Nutrien Carseland Nitrogen Operations, laid out after the satellite view and
// aerial photos. x runs east and z runs south, so the camera looks north-west
// across the site as the aerial photos do: ponds in the foreground, the white
// ammonia tank to the right, the ammonia and urea units behind the character
// and the long urea warehouse with its rail yard along the back.
//
// The character stands at the origin on the road along the south side of the
// ammonia unit. One flight path leaves west-south-west and the other
// south-south-west, each rising about one unit per unit travelled, so that
// quarter holds only tanks, ponds and other low parts.

const WAREHOUSE = { x0: -40, x1: -12, z0: -22, z1: -16.4, wall: 2.2, roof: 2 };
const TRACKS = [-23.6, -25.2, -26.8] as const;
const FENCE: readonly XZ[] = [
  [12.6, -28.4],
  [26.5, -28.4],
  [26.5, 37],
  [-7, 37],
  [-7, 24.5],
  [-18.5, 24.5],
  [-18.5, 10.8],
  [-43, 10.8],
  [-43, -28.4],
  [10.4, -28.4],
];

function countryside(model: MergedModel) {
  field(model, [-52, -46, -10, -32.5], palette.canola, palette.canolaDeep);
  field(model, [-36, -58, -10, -48], palette.fieldGreen, palette.fieldDark, false);
  field(model, [-8, -60, 26, -32.5], palette.fieldGreen);
  field(model, [31, -46, 50, -20], palette.canola, palette.canolaDeep, false);
  field(model, [42, -17, 64, 12], palette.fieldGreen, palette.fieldDark);
  field(model, [31, -17, 40, -3], palette.stubble2, palette.stubbleDark, false);
  field(model, [31, 17, 52, 46], palette.canola, palette.canolaDeep);
  field(model, [-5, 39, 27, 62], palette.fieldGreen);
  field(model, [-52, 13, -20, 44], palette.stubble2, palette.stubbleDark);
  field(model, [-36, 46, -7, 58], palette.canola, palette.canolaDeep, false);
  field(model, [-64, -24, -45, 10], palette.canola, palette.canolaDeep, false);

  const random = rng(5);
  for (const [x0, z0, x1, z1] of [[-8, -60, 26, -32.5], [-5, 39, 27, 62]] as const) {
    // Swathes left by the mower curve round the sloughs, so the bales sit in loose rows.
    for (let i = 0; i < 26; i++) hayBale(model, [x0 + 1 + random() * (x1 - x0 - 2), z0 + 1 + random() * (z1 - z0 - 2)], random() > 0.5);
  }
  for (const [x, z, r] of [[4, -44, 1.8], [18, -52, 1.3], [-2, -54, 1.1], [10, 50, 1.7], [20, 44, 1.2], [52, -4, 1.6], [-30, 28, 1.4]] as const) {
    slough(model, [x, z], r);
  }

  // The township road along the north fence and the range road to the east, with a power line.
  model.slab(palette.road, [-62, 0, -31.3], [62, 0.035, -29.7]);
  model.slab(palette.road, [28, 0, -62], [29.6, 0.035, 62]);
  model.slab(palette.road, [10.7, 0, -29.7], [12.3, 0.035, -28.4]);
  for (let x = -56; x <= 56; x += 8) powerPole(model, [x, -32], false);
  for (let z = -58; z <= 62; z += 8) powerPole(model, [30.4, z], true);
  for (let x = -50; x < -12; x += 2.3) tree(model, [x, -33.2], 1.1 + (x % 3) * 0.1);
  for (let z = -44; z < -22; z += 2.4) tree(model, [50.8, z], 1.2, true);

  // A farmyard off to the north-east: house, red barn, grain bins and a windbreak.
  building(model, [36, -52], [39, -50], 1.3, { roof: 'gableX', roofPaint: palette.stoneDark, windows: [0.8] });
  building(model, [41, -53], [44, -49], 1.8, { wall: palette.canRed, roof: 'gableZ', roofPaint: palette.galvanized, door: false });
  for (const x of [34, 32.4]) tank(model, [x, -48.6], 0.7, 1.5, { paint: palette.galvanized, stair: false, segments: 10 });
  for (let x = 31; x <= 43; x += 1.8) tree(model, [x, -54.5], 1.3, true);

  // Lined ponds of the neighbouring plant, across the range road.
  for (const [x0, z0, x1, z1] of [[31.5, 0, 40, 6.5], [31.5, 7.5, 40, 14]] as const) {
    model.slab(palette.berm, [x0, 0, z0], [x1, 0.25, z1]);
    model.slab(palette.liner, [x0 + 0.5, 0.2, z0 + 0.5], [x1 - 0.5, 0.28, z1 - 0.5]);
    model.slab(palette.pondDeep, [x0 + 1.4, 0.2, z0 + 1.4], [x1 - 1.4, 0.3, z1 - 1.4]);
  }
}

/** The gravel the plant stands on, its roads and its fence. */
function site(model: MergedModel) {
  for (const [x0, z0, x1, z1] of [[-31.5, -28, 26, 10.4], [-42.6, -13, -31.5, 10.4], [-6.6, 10.4, 26, 36.6], [-18, 10.4, -6.6, 24]] as const) {
    model.slab(palette.gravel, [x0, 0, z0], [x1, 0.04, z1]);
  }
  const roads: readonly Rect[] = [
    [-31, -0.8, 12.3, 1.1],
    [-31, -9.9, 26, -8.5],
    [-31, -27.6, -29.4, 10],
    [10.7, -28.4, 12.3, 36.2],
    [-42, -16, -9, -14.9],
    [-6.6, 9.2, 26, 10.4],
  ];
  for (const [x0, z0, x1, z1] of roads) model.slab(palette.road, [x0, 0, z0], [x1, 0.05, z1]);
  model.slab(palette.concrete, [-24.8, 0, -8.3], [-4.9, 0.055, -1.1]);
  model.slab(palette.concrete, [-23, 0, -14.4], [-8.6, 0.055, -10.2]);

  // Patches of fresher and older gravel, so the pad reads as worked ground and not one flat fill.
  const random = rng(11);
  for (let i = 0; i < 70; i++) {
    const [x, z] = [-30 + random() * 54, -27 + random() * 62];
    if (z > 10 && x < -6) continue;
    const [w, d] = [1 + random() * 3.5, 0.8 + random() * 2.5];
    model.slab(random() > 0.5 ? palette.gravelDark : palette.gravelLight, [x, 0, z], [x + w, 0.045, z + d]);
  }

  fence(model, FENCE);
  for (let i = 0; i < 60; i++) {
    const t = random();
    const [x, z] = random() > 0.5 ? [-42.4 + t * 68, -28] : [26, -28 + t * 64];
    model.box(palette.reed, [x, 0.14, z], [0.3, 0.2, 0.3]);
  }
  for (const [x, z] of [[-27, -0.9], [-18, 1.2], [-9, -0.9], [5, 1.2], [10.5, -6], [10.5, -14], [-20, -10], [-6, -10], [12.5, 4], [12.5, 18], [-29.2, -20], [-29.2, 6]] as const) {
    lampPost(model, [x, z], 2.6);
  }
}

interface PondOptions {
  ripple?: Paint;
  /** Floating aerators throwing up spray. */
  aerators?: number;
}

/** A pond behind a berm, with a pale shoreline below the crest. */
function pond(model: MergedModel, [x0, z0, x1, z1]: Rect, water: Paint, { ripple, aerators = 0 }: PondOptions = {}) {
  model.slab(palette.berm, [x0, 0, z0], [x1, 0.3, z1]);
  model.slab(palette.gravel, [x0 + 0.3, 0.3, z0 + 0.3], [x1 - 0.3, 0.33, z1 - 0.3]);
  model.slab(palette.salt, [x0 + 0.9, 0.3, z0 + 0.9], [x1 - 0.9, 0.35, z1 - 0.9]);
  model.slab(water, [x0 + 1.15, 0.3, z0 + 1.15], [x1 - 1.15, 0.37, z1 - 1.15]);
  const random = rng(Math.round(x0 * 7 + z0 * 13 + 100));
  if (ripple) {
    for (let i = 0; i < ((x1 - x0) * (z1 - z0)) / 14; i++) {
      const [x, z] = [x0 + 1.8 + random() * (x1 - x0 - 5), z0 + 1.6 + random() * (z1 - z0 - 3.2)];
      model.slab(ripple, [x, 0.37, z], [x + 0.8 + random() * 1.2, 0.375, z + 0.12]);
    }
  }
  for (let i = 0; i < aerators; i++) {
    const [x, z] = [x0 + 2.5 + random() * (x1 - x0 - 5), z0 + 2.5 + random() * (z1 - z0 - 5)];
    model.cylinder(palette.steelDark, [x, 0.42, z], 0.3, 0.1, 6);
    model.frustum(palette.steam, [x, 0.65, z], 0.35, 0.1, 0.4, 6);
  }
}

function ponds(model: MergedModel) {
  pond(model, [-42, -12.4, -32.2, 9.6], palette.pondDeep, { ripple: palette.water, aerators: 5 });
  pond(model, [13.4, -7.6, 25.2, 8], palette.pondGreen, { ripple: palette.turquoise });
  pond(model, [-5.6, 11.4, 10.2, 35.8], palette.pondDeep, { ripple: palette.water, aerators: 6 });
  pond(model, [12.8, 11.4, 25.4, 35.8], palette.water, { ripple: palette.waterLight });

  // The salt pad between the tank and the ponds, with its two turquoise brine pits.
  model.slab(palette.salt, [1.4, 0, 3.6], [9.8, 0.1, 8.8]);
  model.slab(palette.berm, [1.9, 0.1, 4.1], [9.3, 0.16, 8.3]);
  model.slab(palette.turquoise, [2.3, 0.1, 4.5], [5.4, 0.2, 7.9]);
  model.slab(palette.turquoise, [5.9, 0.1, 4.5], [8.9, 0.2, 6]);
  model.slab(palette.tankOrange, [6.4, 0.1, 6.7], [7.8, 0.18, 7.7]);

  // Pipe bridges on sleepers along the berms, as the water lines run between ponds.
  sleeperPipes(model.within(place(-5.2, 10.9)), 30, 2);
  sleeperPipes(model.within(place(12.5, 8.7)), 13, 3);
  sleeperPipes(model.within(place(-31.8, 9.8, Math.PI / 2)), 9.5, 4);
}

/** The urea warehouse: a long white shed with a ribbed roof, a ridge gallery, a truck load-out and a rail load-out. */
function warehouse(model: MergedModel) {
  const { x0, x1, z0, z1, wall, roof } = WAREHOUSE;
  const [cz, depth] = [(z0 + z1) / 2, z1 - z0];
  model.slab(palette.tube, [x0, 0, z0], [x1, wall, z1]);
  model.slab(palette.stripeBlue, [x0, 0.3, z1], [x1, 0.65, z1 + 0.03]);
  model.slab(palette.stripeBlue, [x1, 0.3, z0], [x1 + 0.03, 0.65, z1]);
  for (let x = x0 + 1; x < x1; x += 2) model.slab(palette.tubeShade, [x - 0.06, 0, z1], [x + 0.06, wall, z1 + 0.06]);
  for (const x of [-36, -28, -20]) model.slab(palette.stoneDark, [x - 0.6, 0, z1], [x + 0.6, 1.4, z1 + 0.05]);
  const rib = 0.8;
  for (let i = 0; x0 + i * rib < x1 - 0.01; i++) {
    const paint = i % 2 ? palette.tubeShade : palette.tube;
    const at = new Vector3(x0 + (i + 0.5) * rib, wall, cz);
    model.add(paint, gable, new Matrix4().compose(at, new Quaternion(), new Vector3(rib, roof, depth + 0.3)));
  }
  // The gallery along the ridge carries the conveyor that drops product down the length of the shed.
  model.slab(palette.stoneDark, [x0 + 1.5, wall + roof - 0.1, cz - 0.3], [x1, wall + roof + 0.4, cz + 0.3]);
  for (let x = x0 + 3; x < x1; x += 4.5) model.box(palette.galvanized, [x, wall + roof + 0.5, cz], [0.4, 0.3, 0.4]);

  // Truck load-out at the west end, under its green cap.
  model.slab(palette.tube, [x0 - 2.4, 0, cz - 1.1], [x0 - 0.2, 5.6, cz + 1.1]);
  model.slab(palette.capGreen, [x0 - 2.5, 5.6, cz - 1.2], [x0 - 0.1, 6, cz + 1.2]);
  model.slab(palette.stoneDark, [x0 - 2, 0, cz + 1.1], [x0 - 0.6, 1.5, cz + 1.14]);
  model.beam(palette.stoneDark, [x0 - 0.3, 5, cz], [x0 + 2.4, wall + roof + 0.1, cz], 0.5);
  vehicle(model, [x0 - 1.3, 0, cz + 2.6], palette.carBlue, true);

  // Rail load-out: a tower straddling the first track, where hoppers fill.
  const [lx, lz] = [-33, TRACKS[0]];
  for (const dx of [-1.3, 1.3]) for (const dz of [-1, 1]) model.box(palette.tubeShade, [lx + dx, 1.3, lz + dz], [0.2, 2.6, 0.2]);
  model.slab(palette.tube, [lx - 1.5, 2.5, lz - 1.2], [lx + 1.5, 5.2, lz + 1.2]);
  model.slab(palette.capGreen, [lx - 1.6, 5.2, lz - 1.3], [lx + 1.6, 5.55, lz + 1.3]);
  model.beam(palette.stoneDark, [lx, 4.6, lz + 1.2], [lx, wall + roof, cz], 0.5);

  // The transfer tower at the east end, fed from the granulator and feeding the ridge gallery.
  model.slab(palette.tube, [-10.9, 0, -20.3], [-8.9, 6.6, -18.3]);
  model.slab(palette.stoneDark, [-11, 6.6, -20.4], [-8.8, 6.8, -18.2]);
  for (const y of [1.6, 3.4, 5.2]) model.box(palette.window, [-9.9, y, -18.28], [0.5, 0.35, 0.04]);
  model.beam(palette.conveyor, [-10.9, 6, -19.3], [-13.4, wall + roof + 0.3, cz], 0.6);
  const [from, to]: [Vec, Vec] = [[-9.9, 2.4, -11.4], [-9.9, 6, -18.3]];
  model.beam(palette.conveyor, from, to, 0.7);
  for (const t of [0.3, 0.62]) {
    const [y, z] = [from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t];
    for (const dx of [-0.35, 0.35]) model.box(palette.steelDark, [-9.9 + dx, y / 2, z], [0.12, y, 0.12]);
  }
}

function railYard(model: MergedModel) {
  track(model, TRACKS[0], -48, 25);
  track(model, TRACKS[1], -62, 62);
  track(model, TRACKS[2], -52, 34);
  const liveries = [palette.hopper, palette.hopper, palette.hopperTan, palette.hopper, palette.hopperRust, palette.stackGrey];
  for (let i = 0; i < 11; i++) hopperCar(model, -46 + i * CAR_PITCH, TRACKS[0], liveries[i % liveries.length]);
  for (let i = 0; i < 9; i++) hopperCar(model, -40 + i * CAR_PITCH, TRACKS[2], liveries[(i + 3) % liveries.length]);
  for (let i = 0; i < 3; i++) tankCar(model, 1.4 + i * CAR_PITCH, TRACKS[0]);
  locomotive(model, 14, TRACKS[1]);
  for (let i = 0; i < 7; i++) tankCar(model, 10.4 - i * CAR_PITCH, TRACKS[1], i % 3 === 1 ? palette.tube : palette.railCar);
  for (let i = 0; i < 5; i++) tankCar(model, 12 + i * CAR_PITCH, TRACKS[2]);

  // Ammonia rail loading: a canopy over the spur with loading arms, and storage bullets behind it.
  const z = TRACKS[0];
  for (const x of [0, 4.5, 9]) for (const dz of [-0.95, 0.95]) model.box(palette.steelDark, [x, 1.2, z + dz], [0.14, 2.4, 0.14]);
  model.slab(palette.tube, [-0.4, 2.4, z - 1.15], [9.4, 2.55, z + 1.15]);
  deck(model, [-0.2, z + 0.75], [9.2, z + 1.25], 1.75, 0.4);
  for (let i = 0; i < 3; i++) model.tube(palette.hiVis, [1.4 + i * CAR_PITCH, 2.4, z + 0.9], [1.4 + i * CAR_PITCH, 1.75, z + 0.1], 0.07);
  for (let i = 0; i < 3; i++) drum(model, [1.6 + i * 3, 0.95, -20.6], 0.55, 2.3, true, palette.tube);
  pipe(model, palette.stainless, [3, 0.35, -21.6], 0.09, 8, true, 6);
}

/** The urea unit: the granulation tower with its plume, the synthesis structure, the compressor house and the shelters. */
function ureaPlant(model: MergedModel) {
  const [x, z, size, height] = [-12.6, -12.4, 3, 9.6];
  const [e, s] = [x + size / 2, z + size / 2];
  model.box(palette.towerTan, [x, height / 2, z], [size, height, size]);
  model.box(palette.towerPale, [x, height - 1.3, z], [size + 0.06, 2.2, size + 0.06]);
  model.box(palette.steelDark, [x, height - 2.5, z], [size + 0.3, 0.12, size + 0.3]);
  model.box(palette.capGreen, [x - 0.5, height - 1.2, s + 0.04], [1.1, 0.6, 0.04]);
  for (let y = 1.2; y < height - 2.8; y += 1.25) {
    for (const d of [-0.9, 0, 0.9]) {
      model.box(palette.window, [x + d, y, s + 0.02], [0.38, 0.3, 0.04]);
      model.box(palette.window, [e + 0.02, y, z + d], [0.04, 0.3, 0.38]);
    }
  }
  // Lift and stair shaft up the south-east corner, then the penthouse, its handrail and the scrubber stack.
  model.slab(palette.towerPale, [e - 0.1, 0, s - 0.9], [e + 0.6, height + 0.7, s + 0.1]);
  model.slab(palette.towerTan, [x - 1.1, height, z - 1.1], [x + 0.7, height + 1.4, z + 0.7]);
  handrail(model, [x - size / 2, height, s], [e, height, s], 0.4);
  handrail(model, [e, height, z - size / 2], [e, height, s], 0.4);
  stack(model, [x - 0.2, z - 0.2], 0.3, height + 3);
  steam(model, [x - 0.3, height + 3.6, z - 0.3], 6, 1.2);

  // The granulation building at the tower's foot, where product leaves on the conveyor.
  building(model, [-11.1, -11.9], [-8.7, -10.4], 2.4, { units: 2, windows: [1.5], door: false });

  // Synthesis: an open white structure round the high-pressure vessels, the reactor beside it.
  structure(model, [-18.2, -13.9], [-15.4, -11.4], [2.2, 4.4, 6.4], palette.tubeShade);
  vessel(model, [-17.3, -12.6], 0.55, 5.6, { ladder: false });
  drum(model, [-16.2, 4.4 + 0.45, -12.4], 0.36, 1.8, false, palette.tube, 4.4);
  vessel(model, [-14.7, -13.4], 0.5, 8.2, { platforms: [0.5, 0.9], overhead: palette.pipeGreen });
  vessel(model, [-19.3, -11.2], 0.4, 4.2, { paint: palette.tube, platforms: [0.9], overhead: palette.pipeGreen });
  exchangers(model, [-16.8, -10.8], 2, 0.26, 1.7, true);

  building(model, [-23, -14.1], [-19.8, -11.5], 2.1, { roof: 'gableX', units: 2, windows: [1.3], band: palette.stripeBlue });
  pipeRack(model.within(place(-23, -10.6)), 13.5, { width: 0.9, tiers: [1.3], bay: 2.7, seed: 4, tray: false });

  quonset(model, [-27.9, -12.6], 1.05, 4.2, false);
  quonset(model, [-25.5, -12.6], 1.05, 4.2, false);
  building(model, [-29, -7.9], [-25.6, -5.3], 1.7, { units: 2, windows: [1.05] });
}

/** A fired heater in miniature: the rust radiant box on piers under its penthouse, convection section, and stack pair. */
function primaryReformer(model: MergedModel) {
  const [x0, x1, z0, z1, bottom, top] = [-21, -16.6, -8, -5.5, 0.8, 4.2];
  for (const x of [x0 + 0.4, (x0 + x1) / 2, x1 - 0.4]) for (const z of [z0 + 0.4, z1 - 0.4]) model.box(palette.concrete, [x, bottom / 2, z], [0.4, bottom, 0.4]);
  model.slab(palette.radiantRust, [x0, bottom, z0], [x1, top, z1]);
  for (let x = x0; x <= x1 + 0.01; x += 1.1) model.slab(palette.rustDark, [x - 0.06, bottom, z1], [x + 0.06, top, z1 + 0.08]);
  for (let z = z0; z <= z1 + 0.01; z += 1.25) model.slab(palette.rustDark, [x1, bottom, z - 0.06], [x1 + 0.08, top, z + 0.06]);
  model.slab(palette.rustDark, [x0, 2.4, z1], [x1, 2.52, z1 + 0.08]);
  model.slab(palette.rustLight, [x0 + 1.2, 2.6, z1], [x0 + 2.1, 3.9, z1 + 0.04]);
  for (let x = x0 + 0.55; x < x1; x += 1.1) model.box(palette.furnace, [x, 1.25, z1 + 0.05], [0.2, 0.16, 0.04]);
  deck(model, [x0, z1], [x1 + 0.6, z1 + 0.6], 2.3, 0.4);
  // Penthouse over the tube tops, with the inlet header along its foot.
  model.slab(palette.corrugated, [x0 + 0.2, top, z0 + 0.2], [x1 - 0.2, top + 0.8, z1 - 0.2]);
  for (let x = x0 + 0.5; x < x1 - 0.2; x += 0.5) model.slab(palette.corrugatedShade, [x - 0.06, top, z1 - 0.2], [x + 0.06, top + 0.8, z1 - 0.16]);
  model.add(palette.corrugated, gable, new Matrix4().compose(new Vector3((x0 + x1) / 2, top + 0.8, (z0 + z1) / 2), new Quaternion(), new Vector3(x1 - x0 - 0.2, 0.7, z1 - z0 - 0.2)));
  pipe(model, palette.stainless, [(x0 + x1) / 2, top + 0.2, z1 - 0.05], 0.12, x1 - x0, true, 6);

  // Convection section, the duct across to the stacks and the fan at their foot.
  model.slab(palette.casing, [x1, 0.6, -7.7], [-15, 5.6, -5.8]);
  for (const y of [2.2, 3.9]) model.slab(palette.casingShade, [x1, y, -5.8], [-15, y + 0.08, -5.76]);
  for (const y of [2.2, 3.9]) model.slab(palette.casingShade, [-15, y, -7.7], [-14.96, y + 0.08, -5.8]);
  stack(model, [-15.8, -7.2], 0.42, 12.5, { platform: 0.8, beacon: true });
  stack(model, [-15.8, -6.1], 0.36, 11);
  model.slab(palette.casing, [-16.5, 0, -5.7], [-15.2, 1, -4.9]);

  // Auxiliary boiler at the west end with its own stack and steam drum.
  model.slab(palette.casing, [-24.5, 0, -7.9], [-22.2, 2.6, -5.6]);
  for (const x of [-23.7, -23]) model.slab(palette.casingShade, [x, 0, -5.6], [x + 0.08, 2.6, -5.56]);
  model.slab(palette.casingShade, [-22.2, 1.3, -7.9], [-22.16, 1.38, -5.6]);
  drum(model, [-23.3, 3, -6.4], 0.3, 1.8, true, palette.stainless, 2.6);
  stack(model, [-23.4, -7.3], 0.3, 10, { platform: 0.75 });
}

/** The ammonia unit, west to east along its pipe rack: reforming, shift, CO2 removal, compression, synthesis and refrigeration. */
function ammoniaPlant(model: MergedModel) {
  primaryReformer(model);

  // The spine rack with air coolers on top, the branch north to rail loading and the run east to the tank.
  pipeRack(model.within(place(-24, -4.2)), 19.6, { width: 1.5, tiers: [1.6, 2.4], seed: 1 });
  finFans(model, [-17.5, 3, -4.2], 5.6, 1.7, 5);
  finFans(model, [-9.6, 3, -4.2], 3.6, 1.7, 3);
  pipeRack(model.within(place(-4.2, -4.2, Math.PI / 2)), 17.6, { width: 1.2, tiers: [1.6, 2.2], seed: 2 });
  pipeRack(model.within(place(-4.2, -4.2)), 7.2, { width: 1.1, tiers: [1.6], seed: 3, tray: false });

  // Secondary reformer in its rust structure, the waste heat boiler under it and the steam drum on top.
  structure(model, [-14.1, -7.9], [-11.7, -5.7], [2.2, 4.4, 6.4]);
  vessel(model, [-13.3, -7.1], 0.65, 4.8, { ladder: false });
  drum(model, [-12.5, 2.2 + 0.5, -6.3], 0.38, 1.9, true, palette.stainless, 2.2);
  drum(model, [-12.9, 6.4 + 0.52, -6.8], 0.42, 2.3, true, palette.tube, 6.4);
  steam(model, [-12, 7.6, -6.8], 2, 0.5);
  model.tube(palette.stainless, [-16.6, 3.6, -6.6], [-13.9, 3.6, -7.1], 0.22);

  // High- and low-temperature shift converters.
  vessel(model, [-10.6, -7.3], 0.75, 3.7, { platforms: [0.96] });
  vessel(model, [-10.6, -5.7], 0.75, 3.4, { ladder: false });

  // Compressor house: synthesis gas, process air and refrigeration machines under one roof.
  building(model, [-9.4, -8], [-5.5, -5.4], 2.8, { roof: 'gableX', units: 3, windows: [1.9], band: palette.stripeBlue });
  model.cylinder(palette.stackGrey, [-6.3, 3.9, -7.3], 0.14, 1.2, 6);
  steam(model, [-6.3, 4.8, -7.3], 3, 0.55);

  // CO2 removal: the absorber, the fatter stripper and their reboilers.
  vessel(model, [-22.7, -2.3], 0.5, 9.2, { platforms: [0.35, 0.65, 0.93], overhead: palette.stainless });
  vessel(model, [-20.9, -2.3], 0.68, 7.4, { platforms: [0.5, 0.92], overhead: palette.galvanized });
  exchangers(model, [-19.3, -2.3], 2, 0.3, 1.6, false);
  drum(model, [-17.5, 0.8, -2.2], 0.42, 1.9, true, palette.galvanized);

  // Synthesis loop: the thick-walled converter under its catalyst gantry, loop exchangers and the separator.
  const [cx, cz] = [-15.1, -2.3];
  vessel(model, [cx, cz], 0.7, 6.8, { paint: palette.steel, platforms: [0.6, 0.97] });
  for (const dx of [-0.95, 0.95]) for (const dz of [-0.95, 0.95]) model.box(palette.redSteel, [cx + dx, 4.2, cz + dz], [0.14, 8.4, 0.14]);
  for (const dz of [-0.95, 0.95]) model.box(palette.redSteel, [cx, 8.4, cz + dz], [2.2, 0.16, 0.16]);
  model.box(palette.redSteel, [cx, 8.5, cz], [0.2, 0.2, 2.1]);
  exchangers(model, [-13.1, -2.3], 3, 0.3, 1.7, false);
  vessel(model, [-11.5, -2.2], 0.45, 3.6, { paint: palette.tube, platforms: [0.95] });

  // Refrigeration: receiver and flash drums, then the motor control and analyser building.
  drum(model, [-9.5, 0.95, -2.8], 0.5, 2.2, true, palette.tube);
  drum(model, [-9.5, 0.75, -1.7], 0.34, 2, true);
  building(model, [-7.6, -3.2], [-5.5, -1.5], 1.3, { units: 2, windows: [0.85] });

  // Pumps along the road, each a blue casing and a motor on a plinth.
  for (const x of [-23.6, -21.8, -18.4, -16.6, -12.2, -10.6]) {
    model.box(palette.concrete, [x, 0.1, -1.35], [0.9, 0.1, 0.4]);
    model.box(palette.pipeBlue, [x - 0.2, 0.3, -1.35], [0.3, 0.3, 0.3]);
    pipe(model, palette.galvanized, [x + 0.2, 0.3, -1.35], 0.13, 0.4, true, 6);
  }
}

/** The cooling tower: a row of fan cells over a basin, each with its plume, laid out along +x. */
function coolingTower(model: MergedModel) {
  const [length, depth, height, cells] = [8.4, 2.6, 2.4, 6];
  model.box(palette.concrete, [0, 0.15, 0], [length + 0.6, 0.3, depth + 0.8]);
  model.box(palette.stoneDark, [0, 0.3 + height / 2, 0], [length, height, depth]);
  model.box(palette.steelDark, [0, 0.3 + height + 0.05, 0], [length + 0.2, 0.1, depth + 0.2]);
  for (let i = 0; i < cells; i++) {
    const x = -length / 2 + (i + 0.5) * (length / cells);
    for (let y = 0.7; y < height; y += 0.45) model.box(palette.stackGrey, [x, y + 0.2, depth / 2 + 0.02], [length / cells - 0.2, 0.2, 0.05]);
    model.frustum(palette.steel, [x, 0.3 + height + 0.4, 0], 0.55, 0.68, 0.7, 12);
    model.cylinder(palette.steelDark, [x, 0.3 + height + 0.72, 0], 0.5, 0.08, 12);
    steam(model, [x, 0.3 + height + 1.3, 0], 2 + (i % 2), 0.75);
  }
  handrail(model, [-length / 2, 0.3 + height + 0.1, depth / 2], [length / 2, 0.3 + height + 0.1, depth / 2], 0.4);
  model.box(palette.galvanized, [length / 2 + 0.35, (0.3 + height) / 2, depth / 2 - 0.4], [0.5, 0.3 + height, 0.5]);
  // Circulating water pumps and their header at the east end.
  for (const z of [-0.7, 0.2]) {
    model.box(palette.pipeBlue, [length / 2 + 1.3, 0.3, z], [0.5, 0.5, 0.4]);
    pipe(model, palette.galvanized, [length / 2 + 0.8, 0.5, z], 0.14, 0.9, true, 6);
  }
  pipe(model, palette.pipeGreen, [length / 2 + 1.7, 0.6, -0.2], 0.2, 2.2, false, 8);
}

/** Tanks, the control building, water treatment and the cooling tower, south of the plant road. */
function utilities(model: MergedModel) {
  tank(model, [-5.6, 3.9], 2.2, 2, { paint: palette.tankOrange, roofPaint: palette.tankOrangeDark, bands: 1, bandPaint: palette.tankOrangeDark });
  tank(model, [-8.9, 2.7], 0.85, 4.2, { paint: palette.tankRed, stair: false, bands: 2, bandPaint: palette.rust, segments: 12 });
  vessel(model, [-8.9, 4.9], 0.32, 5.4, { paint: palette.tankOrange });
  building(model, [-14, 1.8], [-10.6, 4.2], 1.5, { units: 3, windows: [0.95], band: palette.stripeBlue });

  coolingTower(model.within(place(-17.5, 7.3, 0.45)));

  // Water treatment: a building, two clarifiers and chemical totes.
  building(model, [-25, 2], [-21.6, 4.6], 1.7, { roof: 'gableX', units: 1, windows: [1.05] });
  for (const [x, z] of [[-27.4, 3.2], [-27.4, 6.6]] as const) {
    model.cylinder(palette.concrete, [x, 0.3, z], 1.4, 0.6, 14);
    model.cylinder(palette.pondGreen, [x, 0.62, z], 1.2, 0.04, 14);
    model.box(palette.galvanized, [x, 0.75, z], [2.8, 0.08, 0.2]);
  }
  for (let i = 0; i < 4; i++) model.box(palette.tube, [-24.4 + i * 0.7, 0.3, 5.4], [0.5, 0.6, 0.5]);
}

/** The refrigerated ammonia tank in its bund: white, domed, with a spiral stair and a blue name band. */
function ammoniaTank(model: MergedModel) {
  const [x, z, radius, height] = [6.3, -4.6, 3, 3.6];
  const [x0, x1, z0, z1] = [2.6, 10, -8.3, -1];
  for (const [a, b] of [[[x0, z0], [x1, z0 + 0.3]], [[x0, z1 - 0.3], [x1, z1]], [[x0, z0], [x0 + 0.3, z1]], [[x1 - 0.3, z0], [x1, z1]]] as const) {
    model.slab(palette.berm, [a[0], 0, a[1]], [b[0], 0.35, b[1]]);
  }
  tank(model, [x, z], radius, height, { roof: 'dome', bands: 3 });
  shellBand(model, palette.stripeBlue, [x, height * 0.62, z], radius, 0.55);
  // Fill line from the rack, the boil-off compressor shed and its small flare.
  model.tube(palette.stainless, [3, 1.75, -4.2], [3.4, 1.75, -4.2], 0.12);
  model.tube(palette.stainless, [3.4, 1.75, -4.2], [3.4, 0.4, -4.2], 0.12);
  building(model, [7.8, -2.4], [9.4, -1.5], 0.9, { door: false });
  model.cylinder(palette.stackGrey, [3.3, 2.2, -7.5], 0.08, 4.4, 5);
}

/** Offices, the gatehouse, the car park and the substation in the north-east corner. */
function frontOfHouse(model: MergedModel) {
  building(model, [13.6, -21.4], [20, -18.2], 1.6, { units: 3, windows: [1], band: palette.stripeBlue });
  building(model, [21, -21], [25, -18.6], 1.4, { roof: 'gableX', windows: [0.9] });
  building(model, [8.4, -27.6], [9.8, -26.4], 1.1, { windows: [0.75], door: false });
  model.beam(palette.fireRed, [10.6, 0.7, -27.4], [12.4, 0.7, -27.4], 0.08);
  for (const [x, paint] of [[13, palette.fireRed], [13.5, palette.tube]] as const) {
    model.box(palette.galvanized, [x, 1.5, -17.6], [0.06, 3, 0.06]);
    model.box(paint, [x + 0.3, 2.8, -17.6], [0.6, 0.35, 0.04]);
  }

  model.slab(palette.asphalt, [13.4, 0, -17], [25.2, 0.055, -11]);
  const colours = [palette.carSilver, palette.carBlue, palette.tube, palette.carRed, palette.steelDark, palette.carSilver, palette.carGreen, palette.tube];
  const random = rng(3);
  for (const z of [-15.9, -12.2]) {
    for (let i = 0; i < 10; i++) {
      const x = 14.2 + i * 1.12;
      model.slab(palette.paintLine, [x - 0.58, 0.055, z - 0.8], [x - 0.52, 0.06, z + 0.8]);
      if (random() > 0.22) car(model, [x, z], colours[Math.floor(random() * colours.length)]!, false);
    }
  }

  // Substation: a fenced yard of transformers, breakers and a take-off gantry.
  const [x0, z0, x1, z1] = [18.8, -27.6, 25.6, -22.8];
  model.slab(palette.ballast, [x0, 0, z0], [x1, 0.06, z1]);
  fence(model, [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]], 0.8);
  for (const x of [20.4, 23.4]) {
    model.box(palette.stackGrey, [x, 0.7, -24.4], [1.3, 1.1, 0.9]);
    model.box(palette.steelDark, [x, 0.7, -23.9], [1.1, 0.8, 0.12]);
    for (const dx of [-0.35, 0, 0.35]) model.box(palette.tube, [x + dx, 1.5, -24.4], [0.1, 0.5, 0.1]);
  }
  for (const x of [19.6, 24.8]) model.box(palette.galvanized, [x, 1.8, -26.4], [0.14, 3.6, 0.14]);
  model.box(palette.galvanized, [22.2, 3.5, -26.4], [5.4, 0.14, 0.14]);
  for (const x of [20.6, 22.2, 23.8]) model.box(palette.tube, [x, 3.1, -26.4], [0.1, 0.6, 0.1]);
}

/** The laydown yard south-west of the tanks, and the flare beyond it. */
function laydown(model: MergedModel) {
  quonset(model, [-15.4, 13.4], 0.95, 3.2, true);
  quonset(model, [-15.4, 16], 0.95, 3.2, true);
  for (const [x, z, paint] of [[-10, 12.4, palette.tankOrange], [-9, 13.1, palette.safetyYellow], [-10.4, 13.8, palette.tankOrange], [-8.6, 12.2, palette.tankRed]] as const) {
    model.cylinder(paint, [x, 0.4, z], 0.45, 0.8, 10);
  }
  seaCan(model, [-15.6, 19], palette.canBlue, true);
  seaCan(model, [-15.6, 20.4], palette.canRed, true);
  seaCan(model, [-12.4, 22.6], palette.canGreen, true);
  officeTrailer(model, [-9.2, 19.4], false, 3.4);
  officeTrailer(model, [-9.2, 15.4], false, 2.8);
  for (let i = 0; i < 5; i++) pipe(model, i % 2 ? palette.rust : palette.steel, [-12.4, 0.2 + (i % 2) * 0.22, 15.6 + i * 0.26], 0.12, 3.4, true, 6);
  for (let i = 0; i < 4; i++) model.box(palette.plank, [-12.6 + i * 0.1, 0.15 + i * 0.12, 18.2], [2.6, 0.12, 0.9]);
  vehicle(model, [-12.2, 0, 20.4], palette.tube, true);

  model.cylinder(palette.gravel, [-27, 0.03, 20], 3.4, 0.03, 12);
  flare(model, [-27, 20], 12);
}

function siteLife(model: MergedModel) {
  vehicle(model, [-13.5, 0, -0.2], palette.tube, true);
  vehicle(model, [4.6, 0, 0.4], palette.safetyYellow, true);
  vehicle(model, [11.5, 0, -12], palette.tube, false);
  vehicle(model, [11.5, 0, 16], palette.carRed, false);
  vehicle(model, [-22, 0, -9.2], palette.tube, true);
  vehicle(model, [-30.2, 0, -3], palette.carBlue, false);
  vehicle(model, [-20, 0, -15.4], palette.carGreen, true);
  for (const [x, z, vest] of [
    [-3.2, 0.8, palette.hiVis],
    [-2.4, 1, palette.tankOrange],
    [3, -0.4, palette.hiVis],
    [-11.4, -0.5, palette.hiVis],
    [-19.4, -0.9, palette.tankOrange],
    [-7, -9.2, palette.hiVis],
    [-25, -9.4, palette.hiVis],
    [9, 2.2, palette.tankOrange],
    [-13, 5, palette.hiVis],
    [14.6, -17.6, palette.hiVis],
    [-10.4, 17.4, palette.tankOrange],
    [-38, -15.4, palette.hiVis],
  ] as const) {
    worker(model, [x, 0, z], vest);
  }
  // Hydrants and fire monitors along the roads, bollards at the corners, drums and totes by the buildings.
  for (const [x, z] of [[-26, 1.3], [-16, -1], [-7, 1.3], [2, -1], [10.4, -3], [10.4, -12], [-12, -10.1], [-24, -10.1], [-29.2, -12], [12.6, 12], [-9, -16.2], [-30, -16.2]] as const) {
    model.box(palette.fireRed, [x, 0.25, z], [0.22, 0.5, 0.22]);
    model.box(palette.fireRed, [x, 0.4, z], [0.4, 0.12, 0.12]);
  }
  for (const [x, z] of [[-4.9, -1], [-24.9, -1], [-4.9, -8.4], [-24.9, -8.4], [2.4, -0.9], [10.2, -0.9], [-3.2, 1.3], [-8, 1.3], [-10.4, 1.5], [-14.2, 1.5]] as const) {
    model.box(palette.safetyYellow, [x, 0.25, z], [0.14, 0.5, 0.14]);
  }
  for (const [x, z, paint] of [[-5.1, -3.6, palette.pipeBlue], [-5.1, -3.1, palette.pipeBlue], [-10.2, 4.6, palette.tube], [-25.2, -5, palette.tankRed], [-21.4, 4.9, palette.pipeBlue], [9.6, -1.2, palette.safetyYellow], [-8.4, -10.2, palette.tube], [-8.4, -10.8, palette.pipeBlue]] as const) {
    model.cylinder(paint, [x, 0.25, z], 0.18, 0.5, 6);
  }
  // A windsock by the tank and the muster sign at the control building.
  model.box(palette.galvanized, [10.3, 2, -8.2], [0.08, 4, 0.08]);
  model.box(palette.tankOrange, [10.7, 3.85, -8.2], [0.8, 0.26, 0.26]);
  model.box(palette.galvanized, [-10.2, 0.6, 1.4], [0.08, 1.2, 0.08]);
  model.box(palette.signGreen, [-10.2, 1.2, 1.4], [0.5, 0.4, 0.06]);

  for (let x = -28; x <= -6; x += 4.4) tree(model, [x, -28.9], 0.9, true);
  for (const [x, z] of [[14, -22.6], [16, -22.8], [22.6, -17.6], [12.9, -10.4]] as const) tree(model, [x, z], 1);
}

export const carseland: StageBuilder = () => {
  const model = stageGround(new MergedModel());
  countryside(model);
  site(model);
  ponds(model);
  warehouse(model);
  railYard(model);
  ureaPlant(model);
  ammoniaPlant(model);
  utilities(model);
  ammoniaTank(model);
  frontOfHouse(model);
  laydown(model);
  siteLife(model);
  return { object: model.build(), look: [-2, 7, -4] };
};
