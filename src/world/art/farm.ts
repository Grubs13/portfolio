import type { MergedModel } from './merged';
import { palette, type Paint } from './palette';
import { pipe, steam } from './props';

// Farm machinery for the prairie round the plant. Each is laid out in its own
// frame, facing +x with its left side towards -z, for placing with `model.within`.

/** A row-crop tractor about 1.9 units long, with big rear wheels and a glass cab. */
export function tractor(model: MergedModel, body: Paint, hubs: Paint = palette.deereYellow) {
  model.slab(body, [-0.3, 0.4, -0.26], [1.05, 0.82, 0.26]);
  model.slab(palette.black, [1.04, 0.46, -0.2], [1.08, 0.76, 0.2]);
  model.slab(body, [-0.8, 0.78, -0.46], [0.05, 0.9, 0.46]);
  model.slab(palette.window, [-0.72, 0.9, -0.36], [-0.02, 1.5, 0.36]);
  for (const x of [-0.72, -0.06]) for (const z of [-0.37, 0.33]) model.slab(palette.black, [x, 0.9, z], [x + 0.04, 1.5, z + 0.04]);
  model.slab(body, [-0.8, 1.5, -0.42], [0.04, 1.6, 0.42]);
  model.cylinder(palette.steelDark, [0.7, 1.1, -0.14], 0.04, 0.6, 5);
  for (const z of [-0.5, 0.5]) {
    pipe(model, palette.black, [-0.4, 0.5, z], 0.5, 0.26, false, 10);
    pipe(model, hubs, [-0.4, 0.5, z], 0.22, 0.28, false, 8);
    pipe(model, palette.black, [0.72, 0.28, z * 0.8], 0.28, 0.2, false, 8);
    pipe(model, hubs, [0.72, 0.28, z * 0.8], 0.12, 0.22, false, 6);
  }
  model.box(palette.steelDark, [-1, 0.4, 0], [0.4, 0.1, 0.12]);
}

/** A combine harvester cutting along +x, with its header down, chaff behind and the auger swung out over the cart on its left. */
export function combine(model: MergedModel, body: Paint, unloading = false) {
  model.slab(body, [-1.7, 0.5, -0.62], [0.8, 1.7, 0.62]);
  model.slab(palette.steelDark, [-1.72, 1.1, -0.64], [0.82, 1.16, 0.64]);
  model.slab(body, [-1.2, 1.7, -0.56], [0.3, 2.2, 0.56]);
  model.slab(palette.wheat, [-1.1, 2.2, -0.46], [0.2, 2.26, 0.46]);
  model.slab(palette.window, [0.35, 1.7, -0.42], [1.05, 2.35, 0.42]);
  model.slab(body, [0.3, 2.35, -0.48], [1.12, 2.45, 0.48]);
  model.slab(body, [0.8, 0.3, -0.42], [1.6, 0.9, 0.42]);
  for (const z of [-0.78, 0.78]) {
    pipe(model, palette.black, [0.3, 0.6, z], 0.6, 0.34, false, 10);
    pipe(model, palette.deereYellow, [0.3, 0.6, z], 0.26, 0.36, false, 8);
    pipe(model, palette.black, [-1.35, 0.36, z * 0.85], 0.36, 0.24, false, 8);
  }
  // The header across the front, its reel over the cutter bar and crop dividers at each end.
  model.slab(body, [1.5, 0.08, -2], [2.1, 0.5, 2]);
  model.slab(palette.steelDark, [2.1, 0.08, -2], [2.35, 0.16, 2]);
  pipe(model, palette.deereYellow, [2.05, 0.72, 0], 0.2, 3.9, false, 6);
  for (const z of [-2, 2]) model.slab(palette.deereYellow, [2.1, 0.08, z - 0.06], [2.45, 0.4, z + 0.06]);
  model.cylinder(palette.steelDark, [-0.9, 2.5, 0.35], 0.05, 0.6, 5);
  steam(model, [-2.2, 0.8, 0], 3, 0.55, palette.dust);
  if (unloading) {
    model.tube(body, [-0.9, 2, -0.5], [-0.2, 2.7, -3.2], 0.12);
    model.tube(palette.steelDark, [-0.2, 2.7, -3.2], [-0.2, 2.3, -3.25], 0.1);
  } else {
    model.tube(body, [-1.4, 2.1, -0.6], [0.4, 2.2, -0.75], 0.12);
  }
}

/** A tractor towing a grain cart, the cart behind at -x. */
export function grainCart(model: MergedModel, body: Paint) {
  tractor(model, body);
  model.box(palette.steelDark, [-1.4, 0.45, 0], [0.9, 0.1, 0.1]);
  model.slab(palette.caseRed, [-3.4, 0.6, -0.65], [-1.8, 1.6, 0.65]);
  model.frustum(palette.caseRed, [-2.6, 0.45, 0], 0.4, 0.15, 0.3, 4);
  model.slab(palette.wheat, [-3.3, 1.6, -0.55], [-1.9, 1.66, 0.55]);
  for (const z of [-0.75, 0.75]) pipe(model, palette.black, [-2.6, 0.45, z], 0.45, 0.24, false, 10);
}

/** A tractor pulling a round baler, a fresh bale dropping out of the tailgate behind it. */
export function baler(model: MergedModel, body: Paint) {
  tractor(model, body);
  model.box(palette.steelDark, [-1.4, 0.4, 0], [0.9, 0.08, 0.08]);
  model.slab(palette.deereGreen, [-2.9, 0.25, -0.55], [-1.85, 1.1, 0.55]);
  pipe(model, palette.deereYellow, [-2.9, 0.7, 0], 0.44, 1.12, false, 8);
  model.slab(palette.steelDark, [-1.95, 0.08, -0.6], [-1.75, 0.2, 0.6]);
  for (const z of [-0.62, 0.62]) pipe(model, palette.black, [-2.4, 0.25, z], 0.25, 0.14, false, 8);
}

/** A four-wheel-drive tractor and the wide cultivator it drags across stubble, raising dust. */
export function cultivator(model: MergedModel, body: Paint, width = 6) {
  model.slab(body, [-0.5, 0.55, -0.4], [1.3, 1.05, 0.4]);
  model.slab(body, [-0.9, 1, -0.5], [0, 1.12, 0.5]);
  model.slab(palette.window, [-0.82, 1.12, -0.42], [-0.08, 1.7, 0.42]);
  model.slab(body, [-0.9, 1.7, -0.48], [0.02, 1.8, 0.48]);
  model.cylinder(palette.steelDark, [0.9, 1.4, -0.2], 0.05, 0.7, 5);
  for (const x of [-0.5, 0.95]) for (const z of [-0.65, 0.65]) pipe(model, palette.black, [x, 0.5, z], 0.5, 0.36, false, 10);
  model.beam(palette.steelDark, [-1, 0.45, 0], [-2.2, 0.45, 0], 0.12);
  model.slab(palette.deereYellow, [-2.5, 0.35, -width / 2], [-2.2, 0.55, width / 2]);
  model.slab(palette.deereYellow, [-3.1, 0.35, -width / 2], [-2.8, 0.55, width / 2]);
  for (let z = -width / 2 + 0.2; z < width / 2; z += 0.4) model.box(palette.steelDark, [-2.65, 0.2, z], [0.7, 0.3, 0.05]);
  for (let z = -width / 2 + 0.6; z < width / 2; z += 1.4) steam(model, [-3.4, 0.4, z], 2, 0.5, palette.dust);
}

/** A tandem grain truck with a tarp-ribbed box, waiting at the field edge. */
export function grainTruck(model: MergedModel, body: Paint) {
  model.slab(body, [1, 0.35, -0.5], [1.9, 1.3, 0.5]);
  model.slab(palette.window, [1.4, 0.9, -0.46], [1.92, 1.22, 0.46]);
  model.slab(palette.steelDark, [-2.2, 0.3, -0.45], [1.9, 0.42, 0.45]);
  model.slab(palette.caseRed, [-2.2, 0.42, -0.56], [0.85, 1.25, 0.56]);
  model.slab(palette.wheat, [-2.1, 1.25, -0.48], [0.75, 1.3, 0.48]);
  for (let x = -1.9; x < 0.8; x += 0.5) model.box(palette.steelDark, [x, 1.3, 0], [0.06, 0.06, 1.12]);
  for (const x of [-1.6, -0.9, 1.5]) for (const z of [-0.5, 0.5]) pipe(model, palette.black, [x, 0.25, z], 0.25, 0.16, false, 8);
}

/** A centre pivot irrigator: the pivot tower at the origin and its span out along +x on wheeled A-frame towers. */
export function pivot(model: MergedModel, radius: number, towers = 4) {
  model.frustum(palette.galvanized, [0, 1.2, 0], 0.12, 0.55, 2.4, 4);
  model.box(palette.stackGrey, [0, 2.5, 0], [0.4, 0.3, 0.4]);
  let last = 0;
  for (let k = 1; k <= towers; k++) {
    const r = (radius * k) / (towers + 0.3);
    for (const z of [-0.45, 0.45]) {
      model.beam(palette.galvanized, [r, 2.2, 0], [r, 0.3, z], 0.08);
      pipe(model, palette.black, [r, 0.3, z], 0.3, 0.14, true, 8);
    }
    model.box(palette.stackGrey, [r, 0.55, 0], [0.25, 0.2, 0.25]);
    // Truss rods hang the span between towers.
    const mid = (last + r) / 2;
    model.tube(palette.galvanized, [last, 2.3, 0], [mid, 1.7, 0], 0.035, 4);
    model.tube(palette.galvanized, [mid, 1.7, 0], [r, 2.2, 0], 0.035, 4);
    last = r;
  }
  model.tube(palette.galvanized, [0, 2.4, 0], [radius, 2.1, 0], 0.08);
  model.tube(palette.galvanized, [radius, 2.1, 0], [radius + 0.1, 1.9, 0], 0.05, 4);
}

/** A stack of big square bales, `rows` long and `tiers` high, laid along x. */
export function baleStack(model: MergedModel, rows: number, tiers = 3) {
  const [l, h, w] = [1.1, 0.45, 0.6];
  for (let t = 0; t < tiers; t++) {
    for (let i = 0; i < rows - (t % 2); i++) {
      for (const z of [-w / 2, w / 2]) {
        const x = (i - (rows - 1) / 2 + (t % 2) * 0.5) * l;
        model.box(t % 2 ? palette.hay : palette.wheat, [x, h / 2 + t * h, z], [l - 0.04, h - 0.02, w - 0.04]);
      }
    }
  }
}
