import { CylinderGeometry, Euler, IcosahedronGeometry, Matrix4, Quaternion, Vector3 } from 'three';
import { onScreen, type StageBuilder, stageGround, type Vec } from './kit';
import { MergedModel } from './merged';
import { palette, type Paint } from './palette';

// Nutrien Carseland Nitrogen Operations, after aerial photos and the
// satellite view: the long white urea warehouse beside the rail spur, the tan
// granulation tower feeding it by conveyor, the process units and stacks, the
// white ammonia tank, the orange tanks, the cooling tower and the ponds, on a
// gravel pad among canola and hay fields.
//
// Placements are given in screen terms by `onScreen(right, back)`. Both flight
// paths leave this stage toward screen-left, rising about one unit per unit
// travelled, so the tall landmarks stand to the right and far back and the
// left keeps low or distant parts.

/** A triangular prism along x, apex up, base at y = 0, 1 wide and 1 tall, for gable roofs. */
const gable = new CylinderGeometry(1, 1, 1, 3)
  .rotateX(-Math.PI / 2)
  .rotateY(Math.PI / 2)
  .scale(1, 1 / 1.5, 1 / Math.sqrt(3))
  .translate(0, 1 / 3, 0);

function at(right: number, back: number, y = 0): Vec {
  const { x, z } = onScreen(right, back);
  return [x, y, z];
}

/** A horizontal cylinder along x or z. */
function pipe(model: MergedModel, paint: Paint, [x, y, z]: Vec, radius: number, length: number, alongX: boolean, segments = 8) {
  const rotation = alongX ? new Euler(0, 0, Math.PI / 2) : new Euler(Math.PI / 2, 0, 0);
  model.add(
    paint,
    new CylinderGeometry(radius, radius, length, segments),
    new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromEuler(rotation), new Vector3(1, 1, 1)),
  );
}

function ground(model: MergedModel) {
  stageGround(model);
  // Fields: canola and two greens in long strips, like the prairie round the plant.
  const fields: [number, number, number, number, Paint][] = [
    [-22, 16, 20, 8, palette.canola],
    [-26, 4, 10, 14, palette.fieldGreen],
    [-8, 26, 26, 7, palette.canola],
    [18, -14, 16, 9, palette.fieldGreen],
    [-14, -20, 14, 12, palette.canola],
    [6, -26, 22, 7, palette.fieldGreen],
    [24, 4, 7, 22, palette.canola],
  ];
  for (const [x, z, w, d, paint] of fields) model.box(paint, [x, 0.01, z], [w, 0.02, d]);
  for (const [x, z] of [[-4, -22], [-8, -24], [-1, -25], [14, -22], [10, -20], [20, -9], [-24, -6]] as const) {
    pipe(model, palette.hay, [x, 0.35, z], 0.35, 0.5, false, 8);
  }

  // The gravel pad and its roads.
  model.box(palette.gravel, [1, 0.02, -2], [32, 0.04, 30]);
  model.box(palette.road, [1, 0.045, 3.2], [32, 0.01, 1.8]);
  model.box(palette.road, [-4.6, 0.045, -2], [1.8, 0.01, 30]);
  model.box(palette.road, [9.5, 0.045, -2], [1.8, 0.01, 30]);
}

/** The ponds sit off the pad toward the front-right, with salt-white shores. */
function ponds(model: MergedModel) {
  for (const [right, back, w, d] of [[11, -12, 9, 6], [4, -15, 5, 4]] as const) {
    const [x, , z] = at(right, back);
    model.box(palette.salt, [x, 0.02, z], [w + 1, 0.04, d + 1]);
    model.box(palette.water, [x, 0.05, z], [w, 0.04, d]);
  }
}

function rail(model: MergedModel, z: number, x0: number, x1: number) {
  model.box(palette.ballast, [(x0 + x1) / 2, 0.06, z], [x1 - x0, 0.12, 1.5]);
  for (let x = x0 + 0.3; x < x1; x += 0.6) model.box(palette.timber, [x, 0.14, z], [0.22, 0.06, 1.1]);
  for (const side of [-0.36, 0.36]) model.box(palette.steelDark, [(x0 + x1) / 2, 0.21, z + side], [x1 - x0, 0.08, 0.07]);
}

function hopperCar(model: MergedModel, x: number, z: number) {
  model.box(palette.hopper, [x, 0.95, z], [2.6, 1.1, 1.05]);
  model.box(palette.hopperDark, [x, 0.45, z], [2.2, 0.3, 0.8]);
  for (let i = -1; i <= 1; i++) model.box(palette.hopperDark, [x + i * 0.85, 0.95, z + 0.53], [0.06, 1.1, 0.02]);
  for (const dx of [-0.95, 0.95]) model.box(palette.black, [x + dx, 0.33, z], [0.5, 0.22, 0.9]);
}

function tankCar(model: MergedModel, x: number, z: number) {
  pipe(model, palette.black, [x, 0.95, z], 0.55, 2.8, true, 10);
  model.box(palette.black, [x, 0.95 + 0.6, z], [0.4, 0.15, 0.4]);
  model.box(palette.hopperDark, [x, 0.42, z], [2.9, 0.12, 0.6]);
  for (const dx of [-1.0, 1.0]) model.box(palette.black, [x + dx, 0.33, z], [0.5, 0.22, 0.9]);
}

/** The urea warehouse: a long white building with a ribbed gable roof and a blue band, trains alongside. */
function warehouse(model: MergedModel) {
  const [x0, x1, z, depth, wall, roof] = [-16, 12.5, -14.2, 6, 2.4, 2.2];
  const length = x1 - x0;
  const cx = (x0 + x1) / 2;
  model.box(palette.tube, [cx, wall / 2, z], [length, wall, depth]);
  model.box(palette.stripeBlue, [cx, 0.55, z + depth / 2 + 0.01], [length, 0.35, 0.02]);
  for (let x = x0 + 0.5; x < x1; x += 2) model.box(palette.tubeShade, [x, wall / 2, z + depth / 2 + 0.03], [0.12, wall, 0.06]);
  // Ribbed roof: alternating panels catch the light differently.
  const rib = 0.8;
  for (let i = 0; x0 + i * rib < x1; i++) {
    const paint = i % 2 ? palette.tubeShade : palette.tube;
    const x = x0 + (i + 0.5) * rib;
    model.add(paint, gable, new Matrix4().compose(new Vector3(x, wall, z), new Quaternion(), new Vector3(rib, roof, depth + 0.3)));
  }
  model.box(palette.stoneDark, [cx, wall + roof + 0.25, z], [length - 2, 0.5, 0.6]);
  // The loading tower at the west end, with its green cap.
  model.box(palette.tube, [x0 - 1.2, 2.8, z + 1], [2.2, 5.6, 2.2]);
  model.box(palette.capGreen, [x0 - 1.2, 5.75, z + 1], [2.3, 0.3, 2.3]);
  model.beam(palette.stoneDark, [x0 - 0.2, 4.6, z + 1], [x0 + 3, wall + roof, z], 0.5);

  rail(model, -9.9, -20, 19);
  rail(model, -7.9, -20, 19);
  for (let i = 0; i < 9; i++) hopperCar(model, -17 + i * 2.85, -9.9);
  for (let i = 0; i < 6; i++) tankCar(model, -4 + i * 3.1, -7.9);
}

/** The granulation tower: tall tan concrete with window bands, a pale crown, conveyors and a plume. */
function granulationTower(model: MergedModel) {
  const [x, , z] = at(3.4, 4.4);
  const [size, height] = [3.2, 8];
  model.box(palette.towerTan, [x, height / 2, z], [size, height, size]);
  model.box(palette.towerPale, [x, height - 1.1, z], [size + 0.06, 2.2, size + 0.06]);
  model.box(palette.towerTan, [x - 0.3, height + 0.8, z - 0.3], [1.8, 1.6, 1.8]);
  model.cylinder(palette.stackGrey, [x - 0.3, height + 2.2, z - 0.3], 0.3, 1.4, 8);
  for (let y = 1.2; y < height - 2.4; y += 1.3) {
    for (const d of [-0.9, 0, 0.9]) {
      model.box(palette.window, [x + d, y, z + size / 2 + 0.02], [0.4, 0.3, 0.04]);
      model.box(palette.window, [x + size / 2 + 0.02, y, z + d], [0.04, 0.3, 0.4]);
    }
  }
  model.box(palette.steelDark, [x, height - 2.3, z], [size + 0.6, 0.12, size + 0.6]);
  // A lower annex where product leaves the tower.
  model.box(palette.tube, [x + 2.6, 1.6, z - 0.6], [2, 3.2, 2.4]);
  model.box(palette.stoneDark, [x + 2.6, 3.25, z - 0.6], [2.1, 0.1, 2.5]);

  // Two salmon conveyor galleries climbing from the tower to the warehouse roof.
  for (const [dx, y0, x1] of [[-1, 6.6, -2], [0.9, 5.2, 6]] as const) {
    const from: Vec = [x + dx, y0, z - size / 2];
    const to: Vec = [x1, 4.4, -11.1];
    model.beam(palette.conveyor, from, to, 0.7);
    const legs = 3;
    for (let i = 1; i <= legs; i++) {
      const t = i / (legs + 1);
      const p: Vec = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t];
      model.box(palette.steelDark, [p[0], p[1] / 2, p[2]], [0.18, p[1], 0.18]);
    }
  }
  steam(model, [x - 0.3, height + 3.1, z - 0.3], 6, 1.2);
}

const puff = new IcosahedronGeometry(0.5, 1);

/** A rising plume of faceted puffs that grow and drift as they climb. */
function steam(model: MergedModel, [x, y, z]: Vec, puffs: number, size: number) {
  for (let i = 0; i < puffs; i++) {
    const s = size * (1 + i * 0.15);
    const offset = new Vector3(x - i * 0.4, y + i * size * 0.7, z - i * 0.25);
    model.add(palette.steam, puff, new Matrix4().compose(offset, new Quaternion(), new Vector3(s, s * 0.85, s)));
  }
}

/** An open steel structure with decks and equipment, like the ammonia unit's modules. */
function structure(model: MergedModel, [x, , z]: Vec, w: number, d: number, h: number, decks: number) {
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    model.box(palette.rust, [x + (dx * w) / 2, h / 2, z + (dz * d) / 2], [0.16, h, 0.16]);
  }
  for (let i = 1; i <= decks; i++) {
    const y = (h * i) / decks;
    model.box(palette.rust, [x, y, z], [w + 0.16, 0.1, d + 0.16]);
    model.box(palette.hiVis, [x, y + 0.45, z + d / 2 + 0.05], [w, 0.05, 0.05]);
  }
  model.cylinder(palette.tube, [x - w / 4, h * 0.5, z], 0.5, h * 0.5, 10);
  pipe(model, palette.steel, [x + w / 4, h / decks + 0.5, z], 0.35, d * 0.9, false);
}

function processArea(model: MergedModel) {
  structure(model, at(-2.5, 8.5), 3, 3, 5.4, 3);
  structure(model, at(-6.5, 11.5), 3.4, 2.6, 4.2, 2);
  for (const [right, back, r, h] of [[-5, 10, 0.55, 7], [-6.8, 9.2, 0.4, 5.5], [-0.2, 11, 0.45, 6.4]] as const) {
    const [x, , z] = at(right, back);
    model.cylinder(palette.steel, [x, h / 2, z], r, h, 10);
    model.cylinder(palette.steelDark, [x, h * 0.66, z], r + 0.12, 0.12, 10);
    model.box(palette.steelDark, [x + r + 0.1, h / 2, z], [0.08, h, 0.3]);
  }
  for (const [right, back] of [[-9, 13], [-10.2, 13.6]] as const) {
    const [x, , z] = at(right, back);
    model.cylinder(palette.stackGrey, [x, 6, z], 0.4, 12, 10);
    model.cylinder(palette.steelDark, [x, 11.9, z], 0.46, 0.25, 10);
  }
  // The reformer firebox: a long box with a stack pair, glowing peepholes along one side.
  const [rx, , rz] = at(-10, 7.5);
  model.box(palette.rust, [rx, 1.6, rz], [6, 3.2, 2.6]);
  model.box(palette.steelDark, [rx, 3.3, rz], [6.2, 0.2, 2.8]);
  for (let i = 0; i < 5; i++) model.box(palette.furnace, [rx - 2.4 + i * 1.2, 0.9, rz + 1.31], [0.25, 0.18, 0.04]);

  // Control building and shops with window strips.
  for (const [right, back, w, d, h] of [[-11, 1.5, 4.5, 3.5, 2.4], [-3, 15.5, 5, 3, 3]] as const) {
    const [x, , z] = at(right, back);
    model.box(palette.tube, [x, h / 2, z], [w, h, d]);
    model.box(palette.window, [x, h * 0.62, z + d / 2 + 0.02], [w * 0.8, 0.35, 0.04]);
    model.box(palette.window, [x + w / 2 + 0.02, h * 0.62, z], [0.04, 0.35, d * 0.8]);
    model.box(palette.stoneDark, [x, h + 0.08, z], [w + 0.1, 0.16, d + 0.1]);
  }
  // Sprung tent structures, white half-cylinders.
  for (const [right, back] of [[6, 16.5], [9, 18]] as const) {
    const [x, , z] = at(right, back);
    pipe(model, palette.tube, [x, 0, z], 1.6, 4.5, true, 12);
  }
}

/** A pipe rack heading from the process area toward the tanks, with mixed-colour lines. */
function pipeRack(model: MergedModel) {
  const [x, z0, z1] = [-3.2, -12, 1.2];
  for (let z = z0; z <= z1; z += 2.2) {
    for (const dx of [-0.7, 0.7]) model.box(palette.steelDark, [x + dx, 1.1, z], [0.14, 2.2, 0.14]);
    model.box(palette.steelDark, [x, 2.2, z], [1.6, 0.14, 0.14]);
    model.box(palette.steelDark, [x, 1.4, z], [1.6, 0.1, 0.1]);
  }
  const lines: [number, number, Paint][] = [
    [-0.5, 2.38, palette.steel],
    [-0.15, 2.38, palette.hiVis],
    [0.2, 2.38, palette.capGreen],
    [0.5, 2.38, palette.stackGrey],
    [-0.3, 1.56, palette.tankOrange],
    [0.25, 1.56, palette.steel],
  ];
  for (const [dx, y, paint] of lines) pipe(model, paint, [x + dx, y, (z0 + z1) / 2], 0.13, z1 - z0, false, 6);
}

function tanks(model: MergedModel) {
  // The white ammonia storage tank with its domed roof, ladder cage and ring walkway.
  const [ax, , az] = at(8.2, -2.6);
  model.cylinder(palette.tube, [ax, 1.7, az], 3, 3.4, 16);
  model.add(palette.tube, new CylinderGeometry(1.8, 3, 1, 16), new Matrix4().makeTranslation(ax, 3.9, az));
  model.add(palette.tubeShade, new CylinderGeometry(0.6, 1.8, 0.45, 16), new Matrix4().makeTranslation(ax, 4.62, az));
  model.cylinder(palette.steelDark, [ax, 3.45, az], 3.08, 0.1, 16);
  model.box(palette.steelDark, [ax + 3.05, 1.8, az], [0.12, 3.6, 0.5]);
  model.box(palette.stripeBlue, [ax + 2.1, 1.6, az + 2.1], [1.8, 0.4, 0.05], -Math.PI / 4);

  // The big low orange tank out front, a tall red one and a slim orange column behind.
  const [ox, , oz] = at(-3.5, -6.5);
  model.cylinder(palette.tankOrange, [ox, 1, oz], 2.3, 2, 16);
  model.cylinder(palette.tankOrangeDark, [ox, 2.02, oz], 2.3, 0.06, 16);
  model.box(palette.steelDark, [ox + 2.32, 1, oz], [0.1, 2, 0.4]);
  const [tx, , tz] = at(-1.6, 4.6);
  model.cylinder(palette.tankRed, [tx, 2.2, tz], 0.9, 4.4, 12);
  const [sx, , sz] = at(-0.4, 6.6);
  model.cylinder(palette.tankOrange, [sx, 3, sz], 0.35, 6, 8);
}

/** The cooling tower: a long grey block of fan cells, each with its own plume. */
function coolingTower(model: MergedModel) {
  const [x, , z] = at(-8.5, -1.6);
  const [length, depth, height, cells] = [8, 2.8, 2.6, 5];
  model.box(palette.stoneDark, [x, height / 2, z], [length, height, depth]);
  for (let i = 0; i < cells; i++) {
    const cx = x - length / 2 + (i + 0.5) * (length / cells);
    model.box(palette.stackGrey, [cx, height / 2, z + depth / 2 + 0.02], [length / cells - 0.15, height - 0.4, 0.04]);
    model.cylinder(palette.steel, [cx, height + 0.3, z], 0.65, 0.6, 12);
    steam(model, [cx, height + 1.0, z], 2, 0.7);
  }
}

function vehicle(model: MergedModel, [x, , z]: Vec, body: Paint, alongX: boolean) {
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

function worker(model: MergedModel, [x, , z]: Vec, vest: Paint) {
  model.box(palette.navy, [x, 0.4, z], [0.32, 0.8, 0.22]);
  model.box(vest, [x, 1.05, z], [0.42, 0.55, 0.3]);
  model.box(palette.skin, [x, 1.5, z], [0.26, 0.28, 0.26]);
  model.box(palette.hardHat, [x, 1.7, z], [0.32, 0.14, 0.32]);
}

function siteLife(model: MergedModel) {
  vehicle(model, at(3.5, -3.6), palette.tube, true);
  vehicle(model, at(5.8, -5.4), palette.tube, true);
  vehicle(model, at(-5.6, 3.2), palette.safetyYellow, false);
  vehicle(model, at(12, 3), palette.tankRed, true);
  worker(model, at(5.2, -1.2), palette.hiVis);
  worker(model, at(6, -0.4), palette.tankOrange);
  worker(model, at(-2.2, 2.6), palette.hiVis);
  for (const [right, back] of [[2, -8], [14, 6], [-7, 6], [1.5, 13]] as const) {
    const [x, , z] = at(right, back);
    model.box(palette.steelDark, [x, 2.5, z], [0.12, 5, 0.12]);
    model.box(palette.lamp, [x + 0.25, 4.9, z], [0.5, 0.12, 0.25]);
  }
}

export const carseland: StageBuilder = () => {
  const model = new MergedModel();
  ground(model);
  ponds(model);
  warehouse(model);
  granulationTower(model);
  processArea(model);
  pipeRack(model);
  tanks(model);
  coolingTower(model);
  siteLife(model);
  return model.build();
};
