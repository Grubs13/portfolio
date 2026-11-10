import type { MergedModel } from './merged';
import { palette, type Paint } from './palette';
import { pipe } from './props';

// Track and rolling stock, all lying along x.

export const CAR_PITCH = 2.9;

export function track(model: MergedModel, z: number, x0: number, x1: number) {
  model.box(palette.ballast, [(x0 + x1) / 2, 0.08, z], [x1 - x0, 0.1, 1.4]);
  for (let x = x0 + 0.3; x < x1; x += 0.6) model.box(palette.timber, [x, 0.15, z], [0.22, 0.06, 1.05]);
  for (const side of [-0.34, 0.34]) model.box(palette.steelDark, [(x0 + x1) / 2, 0.21, z + side], [x1 - x0, 0.08, 0.08]);
}

function trucks(model: MergedModel, x: number, z: number, spread: number) {
  for (const dx of [-spread, spread]) model.box(palette.black, [x + dx, 0.36, z], [0.55, 0.24, 0.9]);
}

/** A covered hopper: ribbed sides over sloped bays, with a walkway and hatches along the roof. */
export function hopperCar(model: MergedModel, x: number, z: number, paint: Paint = palette.hopper) {
  model.box(paint, [x, 1.15, z], [2.6, 0.9, 1.05]);
  model.box(palette.hopperDark, [x, 0.6, z], [2, 0.3, 0.85]);
  for (const dx of [-0.6, 0, 0.6]) model.frustum(palette.hopperDark, [x + dx, 0.42, z], 0.12, 0.3, 0.25, 4);
  for (let i = -3; i <= 3; i++) model.box(palette.hopperDark, [x + i * 0.4, 1.15, z + 0.53], [0.06, 0.9, 0.03]);
  model.box(palette.tubeShade, [x, 1.63, z], [2.4, 0.06, 0.35]);
  trucks(model, x, z, 0.95);
}

export function tankCar(model: MergedModel, x: number, z: number, paint: Paint = palette.railCar) {
  pipe(model, paint, [x, 1, z], 0.55, 2.6, true, 10);
  pipe(model, paint, [x, 1, z], 0.4, 2.8, true, 10);
  pipe(model, palette.tube, [x, 1, z], 0.56, 0.14, true, 10);
  model.box(palette.steelDark, [x, 1.62, z], [0.4, 0.2, 0.4]);
  model.box(palette.galvanized, [x, 1.56, z], [1, 0.05, 0.7]);
  model.box(palette.hopperDark, [x, 0.46, z], [2.8, 0.12, 0.6]);
  trucks(model, x, z, 1);
}

/** A road-switcher locomotive in red, with a cab, a long hood, a stripe and a headlight. */
export function locomotive(model: MergedModel, x: number, z: number) {
  model.box(palette.steelDark, [x, 0.55, z], [3.6, 0.2, 1.05]);
  model.box(palette.locoRed, [x - 0.5, 1.15, z], [2.4, 1, 0.8]);
  model.box(palette.locoRed, [x + 1.15, 1.3, z], [0.9, 1.3, 1]);
  model.box(palette.window, [x + 1.15, 1.6, z], [0.92, 0.3, 1.02]);
  model.box(palette.tube, [x - 0.5, 0.85, z + 0.41], [2.4, 0.12, 0.02]);
  model.box(palette.locoRed, [x + 1.7, 0.95, z], [0.2, 0.6, 0.8]);
  model.box(palette.lamp, [x + 1.81, 1.15, z], [0.02, 0.14, 0.2]);
  for (const dx of [-1.2, -0.5, 0.2]) model.cylinder(palette.steelDark, [x + dx, 1.72, z], 0.16, 0.14, 6);
  trucks(model, x, z, 1.2);
}
