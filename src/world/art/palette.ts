import { ColorManagement } from 'three';

// Pixel art wants the exact palette on screen, so colors stay in display space
// end to end instead of round-tripping through linear.
ColorManagement.enabled = false;

/**
 * Pixel texture the lit shader draws over a paint, fixed in world space:
 * cladding ribs, panel seams with rust streaks, weld seams on round shells,
 * and speckle, flecks, ripples or stains on flat ground.
 */
export const SURFACE = { plain: 0, ribbed: 1, panels: 2, shell: 3, gravel: 4, grass: 5, water: 6, concrete: 7 } as const;
export type Surface = (typeof SURFACE)[keyof typeof SURFACE];

/** A flat color. A glowing paint ignores lighting, so it reads as emitting light. */
export interface Paint {
  color: number;
  glow?: true;
  surface?: Surface;
}

const paint = (color: number, surface?: Surface): Paint => (surface ? { color, surface } : { color });
const glow = (color: number): Paint => ({ color, glow: true });

/** Every color in the world. The toon shader derives each paint's lit and shadow tones. */
export const palette = {
  rock: paint(0x5c62ac),
  grass: paint(0x5f9a45, SURFACE.grass),
  stone: paint(0xb3ab98),
  stoneDark: paint(0x7d7b8c),
  concrete: paint(0xa9a69c, SURFACE.concrete),
  steel: paint(0x6f7891),
  steelDark: paint(0x30364a),
  refractory: paint(0xc8653f),
  safetyYellow: paint(0xf2b31b),
  tube: paint(0xe0e2e8, SURFACE.ribbed),
  timber: paint(0xa0703f),
  crystal: paint(0x9d8cff),
  furnace: glow(0xff8a2a),
  gravel: paint(0xcdb88f, SURFACE.gravel),
  canola: paint(0xe8d33a, SURFACE.grass),
  hay: paint(0xd9b764, SURFACE.grass),
  water: paint(0x6fa6d6, SURFACE.water),
  stripeBlue: paint(0x34508f),
  railCar: paint(0x2b2f3d),
  towerTan: paint(0xd99d7f, SURFACE.shell),
  towerPale: paint(0xe9c8ad, SURFACE.shell),
  conveyor: paint(0xd9714c),
  steam: paint(0xf4f5fa),
  rust: paint(0x8f4f36, SURFACE.panels),
  stackGrey: paint(0x9aa0ae, SURFACE.ribbed),
  tankOrange: paint(0xf06a2b, SURFACE.shell),
  tankRed: paint(0xc84a3a, SURFACE.shell),
  tankOrangeDark: paint(0xb84a1f),
  fieldGreen: paint(0x7fb04e, SURFACE.grass),
  road: paint(0xddd2b8, SURFACE.gravel),
  salt: paint(0xeeeae0, SURFACE.gravel),
  ballast: paint(0x8a8478, SURFACE.gravel),
  hopper: paint(0xa3a7b3, SURFACE.shell),
  hopperDark: paint(0x5d6170),
  tubeShade: paint(0xc9ccd6),
  capGreen: paint(0x3f8f5a),
  window: paint(0x33405e),
  roadEdge: paint(0x5c5a57),
  radiantRust: paint(0x8e5d40, SURFACE.panels),
  rustDark: paint(0x5e3a2a, SURFACE.panels),
  rustLight: paint(0xae7350, SURFACE.panels),
  stainless: paint(0xc7ccd4),
  galvanized: paint(0x8d939e),
  corrugated: paint(0xd9d4c3, SURFACE.ribbed),
  corrugatedShade: paint(0xb9b4a3, SURFACE.ribbed),
  redSteel: paint(0xa8382c),
  casing: paint(0xcfcbbb, SURFACE.panels),
  casingShade: paint(0xa9a596, SURFACE.panels),
  stackTan: paint(0xbdb5a0, SURFACE.shell),
  stackBand: paint(0x8f897a),
  treeDark: paint(0x2f6b3a),
  treeLight: paint(0x4f9a48),
  reed: paint(0x7a8f3c, SURFACE.grass),
  canolaDeep: paint(0xcfb425, SURFACE.grass),
  fieldDark: paint(0x69993f, SURFACE.grass),
  stubble2: paint(0xcbb877, SURFACE.grass),
  stubbleDark: paint(0xb5a05f, SURFACE.grass),
  berm: paint(0xb8a47c, SURFACE.gravel),
  gravelDark: paint(0xc2ad85, SURFACE.gravel),
  gravelLight: paint(0xd6c39c, SURFACE.gravel),
  pondDeep: paint(0x3f5f96, SURFACE.water),
  pondGreen: paint(0x5c9d8f, SURFACE.water),
  turquoise: paint(0x7fd8cf, SURFACE.water),
  waterLight: paint(0x9cc6e8, SURFACE.water),
  liner: paint(0x23262f),
  asphalt: paint(0x4c4e5a, SURFACE.concrete),
  paintLine: paint(0xf0ead2),
  locoRed: paint(0xc7372b),
  carBlue: paint(0x3f6fb5),
  carRed: paint(0xb8403a),
  carSilver: paint(0xc9ced6),
  carGreen: paint(0x3e7d5c),
  hopperTan: paint(0xb9a27a),
  hopperRust: paint(0x8a5a44),
  canBlue: paint(0x2f5f9f),
  canRed: paint(0x9c4634),
  canGreen: paint(0x3d7a5a),
  portaBlue: paint(0x2f86d6),
  tarp: paint(0x3d6fc4),
  plank: paint(0xc59a5c),
  pipeGreen: paint(0x4fa36a),
  pipeBlue: paint(0x4a7fd0),
  fireRed: paint(0xd23a2e),
  beacon: glow(0xff4a3a),
  arc: glow(0xd8f2ff),
  signGreen: paint(0x2f9a52),
  wheat: paint(0xdcbd5c, SURFACE.grass),
  wheatDark: paint(0xc29f45, SURFACE.grass),
  barley: paint(0xd9cc8e, SURFACE.grass),
  soil: paint(0x6e5340),
  soilDark: paint(0x58412f),
  dust: paint(0xd6c7a2, SURFACE.gravel),
  deereGreen: paint(0x3b8a3e),
  deereYellow: paint(0xf0c832),
  caseRed: paint(0xc23a2c),

  navy: paint(0x26325a),
  hiVis: paint(0xd4f03a),
  reflective: paint(0xc5ccd6),
  skin: paint(0xe3b48d),
  stubble: paint(0xb88a6a),
  hair: paint(0x4a3324),
  hardHat: paint(0xf2f1ea),
  headband: paint(0x56736e),
  black: paint(0x17191f),
  lens: paint(0x9db9dc),
  undershirt: paint(0xcdbb9c),
  boots: paint(0xa97c4e),
  pack: paint(0x4b5165),
  lamp: glow(0xfff2c2),
  detectorLed: glow(0x5cff7a),
  flame: glow(0xffa040),
} as const satisfies Record<string, Paint>;
