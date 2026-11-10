import { CylinderGeometry, Matrix4, Quaternion, Vector3 } from 'three';
import { floatingRock, type IslandBuilder, type Vec } from './kit';
import { MergedModel } from './merged';
import { palette } from './palette';

// Nutrien Carseland Nitrogen Operations in miniature, after aerial photos and
// the satellite view: the long white urea warehouse beside the rail spur, the
// tan granulation tower feeding it by conveyor, the process units and stacks,
// the white ammonia tank, the orange tanks, the cooling tower and the ponds,
// on gravel ringed by grass, canola and hay.
//
// The camera looks from +x +z, so whatever stands behind the character on the
// x = z diagonal hides behind him. That corridor holds only ponds. The
// landmarks flank him instead: warehouse and tower to screen-right, process
// units and ammonia tank to screen-left. He arrives low from the front (+z)
// and leaves rising to the left (-x), so only low parts sit near those paths.

const GRAVEL = 0.12;
const NO_ROTATION = new Quaternion();

/** A triangular prism along z, apex up, with its base at y = 0 and 1.5 tall, for gable roofs. */
const prism = new CylinderGeometry(1, 1, 1, 3).rotateX(-Math.PI / 2).translate(0, 0.5, 0);

function ground(model: MergedModel) {
  floatingRock(model, -GRAVEL);
  model.add(palette.gravel, new CylinderGeometry(2.45, 2.45, GRAVEL, 7), new Matrix4().makeTranslation(0, -GRAVEL / 2, 0));
  // Canola and hay on the grass rim.
  model.box(palette.canola, [0.9, -GRAVEL + 0.01, 2.2], [0.9, 0.03, 0.5], -0.35);
  model.box(palette.canola, [-1.2, -GRAVEL + 0.01, -2.2], [0.9, 0.03, 0.4], -0.45);
  for (const [x, z] of [[-0.3, 2.45], [-0.6, 2.35], [2.3, -1.2]] as const) {
    model.add(palette.hay, new CylinderGeometry(0.07, 0.07, 0.09, 6).rotateX(Math.PI / 2), new Matrix4().makeTranslation(x, -GRAVEL + 0.045, z));
  }
  model.box(palette.water, [-1.15, 0.004, -1.25], [0.9, 0.008, 0.6], Math.PI / 4);
  model.box(palette.water, [-0.2, 0.004, -1.75], [0.55, 0.008, 0.4], 0.3);
}

/** The urea warehouse: a long white gable with a blue stripe, rail cars alongside. */
function warehouse(model: MergedModel) {
  const [x, z0, z1, width, wall, roof] = [2.0, -1.3, 1.0, 0.62, 0.3, 0.32];
  const length = z1 - z0;
  const cz = (z0 + z1) / 2;
  model.box(palette.tube, [x, wall / 2, cz], [width, wall, length]);
  model.box(palette.stripeBlue, [x - width / 2 - 0.005, 0.07, cz], [0.01, 0.05, length]);
  model.add(
    palette.tube,
    prism,
    new Matrix4().compose(new Vector3(x, wall, cz), NO_ROTATION, new Vector3(width / 1.732 + 0.02, roof / 1.5, length + 0.04)),
  );
  for (const z of [-0.7, 0.3]) model.box(palette.steelDark, [x - width / 2 - 0.05, 0.3, z], [0.08, 0.6, 0.08]);
  model.box(palette.steelDark, [1.45, 0.008, -0.15], [0.2, 0.016, 2.3]);
  for (let i = 0; i < 5; i++) model.box(palette.railCar, [1.45, 0.1, -1.1 + i * 0.45], [0.16, 0.16, 0.38]);
}

/** The granulation tower: tall tan concrete with a lighter crown, steam and two conveyors to the warehouse. */
function granulationTower(model: MergedModel) {
  const [x, z, size, height] = [1.45, -1.85, 0.46, 2.3];
  model.box(palette.towerTan, [x, height / 2, z], [size, height, size]);
  model.box(palette.towerPale, [x, height - 0.35, z], [size + 0.02, 0.5, size + 0.02]);
  model.box(palette.towerTan, [x - 0.05, height + 0.12, z], [0.24, 0.24, 0.24]);
  model.box(palette.tube, [x - 0.35, 0.28, z + 0.1], [0.35, 0.56, 0.4]);
  for (const [up, side] of [[0.95, -0.1], [1.55, 0.12]] as const) {
    model.beam(palette.conveyor, [x + 0.2, up, z + side], [1.95, 0.55, -1.15 + side], 0.08);
  }
  steam(model, [x - 0.05, height + 0.3, z], 4, 0.2);
}

/** A rising plume of shrinking puffs. */
function steam(model: MergedModel, [x, y, z]: Vec, puffs: number, size: number) {
  for (let i = 0; i < puffs; i++) {
    const s = size * (1 - i * 0.13);
    model.box(palette.steam, [x - i * 0.05, y + i * size * 0.9, z - i * 0.04], [s, s, s], i * 0.5);
  }
}

/** Ammonia and utilities: steel frame, columns, stacks, a white building and the pipe rack. */
function processArea(model: MergedModel) {
  model.box(palette.tube, [-1.35, 0.2, 0.4], [0.5, 0.4, 0.55]);
  model.box(palette.stripeBlue, [-1.35, 0.2, 0.68], [0.3, 0.12, 0.01]);

  // An open steel structure with three decks.
  const [fx, fz, fw, fh] = [-1.6, -0.15, 0.42, 0.95];
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    model.box(palette.rust, [fx + (dx * fw) / 2, fh / 2, fz + (dz * fw) / 2], [0.04, fh, 0.04]);
  }
  for (const y of [0.32, 0.64, fh]) model.box(palette.rust, [fx, y, fz], [fw + 0.04, 0.03, fw + 0.04]);
  model.box(palette.tube, [fx, 0.48, fz], [0.22, 0.22, 0.22]);

  for (const [x, z, r, h] of [[-2.15, 0.15, 0.08, 1.3], [-2.1, -0.35, 0.06, 1.0]] as const) {
    model.cylinder(palette.steel, [x, h / 2, z], r, h, 8);
  }
  for (const [x, z] of [[-1.65, -0.75], [-1.95, -0.6]] as const) {
    model.cylinder(palette.stackGrey, [x, 0.9, z], 0.07, 1.8, 8);
    model.cylinder(palette.steelDark, [x, 1.78, z], 0.08, 0.06, 8);
  }

  // Pipe rack from the process area toward the tanks.
  for (const z of [-0.8, -0.3, 0.2, 0.7]) {
    for (const x of [-1.07, -0.93]) model.box(palette.steelDark, [x, 0.15, z], [0.03, 0.3, 0.03]);
  }
  for (const [y, paint] of [[0.3, palette.steel], [0.24, palette.steelDark]] as const) {
    model.box(paint, [-1.0, y, -0.05], [0.18, 0.03, 1.6]);
  }
}

function tanks(model: MergedModel) {
  // The white ammonia storage tank with its domed roof.
  const [ax, az] = [-1.85, 1.05];
  model.cylinder(palette.tube, [ax, 0.25, az], 0.5, 0.5, 10);
  model.add(palette.tube, new CylinderGeometry(0.25, 0.5, 0.16, 10), new Matrix4().makeTranslation(ax, 0.58, az));
  model.box(palette.stripeBlue, [ax + 0.36, 0.3, az + 0.36], [0.12, 0.08, 0.01], -Math.PI / 4);

  // The big low orange tank out front, a tall red one and a slim orange one by the rail spur.
  model.cylinder(palette.tankOrange, [0.75, 0.17, 1.45], 0.32, 0.34, 10);
  model.cylinder(palette.tankRed, [0.95, 0.32, -0.95], 0.14, 0.64, 8);
  model.cylinder(palette.tankOrange, [1.0, 0.35, -0.5], 0.05, 0.7, 6);
}

/** The cooling tower: a long grey multi-cell block with fan stacks and steam. */
function coolingTower(model: MergedModel) {
  const [x0, x1, z, depth, height] = [-1.3, -0.45, 1.8, 0.36, 0.3];
  model.box(palette.stoneDark, [(x0 + x1) / 2, height / 2, z], [x1 - x0, height, depth]);
  for (let i = 0; i < 4; i++) {
    const x = x0 + 0.11 + i * 0.21;
    model.cylinder(palette.steel, [x, height + 0.04, z], 0.08, 0.08, 8);
    steam(model, [x, height + 0.17, z], 2, 0.12);
  }
}

export const carseland: IslandBuilder = () => {
  const model = new MergedModel();
  ground(model);
  warehouse(model);
  granulationTower(model);
  processArea(model);
  tanks(model);
  coolingTower(model);
  return model.build();
};
