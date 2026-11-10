import { ColorManagement } from 'three';

// Pixel art wants the exact palette on screen, so colors stay in display space
// end to end instead of round-tripping through linear.
ColorManagement.enabled = false;

/** A flat color. A glowing paint ignores lighting, so it reads as emitting light. */
export interface Paint {
  color: number;
  glow?: true;
}

const paint = (color: number): Paint => ({ color });
const glow = (color: number): Paint => ({ color, glow: true });

/** Every color in the world. The toon shader derives each paint's lit and shadow tones. */
export const palette = {
  rock: paint(0x5c62ac),
  grass: paint(0x5f9a45),
  stone: paint(0xb3ab98),
  stoneDark: paint(0x7d7b8c),
  concrete: paint(0xa9a69c),
  steel: paint(0x6f7891),
  steelDark: paint(0x30364a),
  refractory: paint(0xc8653f),
  safetyYellow: paint(0xf2b31b),
  tube: paint(0xe0e2e8),
  timber: paint(0xa0703f),
  crystal: paint(0x9d8cff),
  furnace: glow(0xff8a2a),
  gravel: paint(0xcdb88f),
  canola: paint(0xe8d33a),
  hay: paint(0xd9b764),
  water: paint(0x6fa6d6),
  stripeBlue: paint(0x34508f),
  railCar: paint(0x2b2f3d),
  towerTan: paint(0xd99d7f),
  towerPale: paint(0xe9c8ad),
  conveyor: paint(0xd9714c),
  steam: paint(0xf4f5fa),
  rust: paint(0x8f4f36),
  stackGrey: paint(0x9aa0ae),
  tankOrange: paint(0xf06a2b),
  tankRed: paint(0xc84a3a),
  tankOrangeDark: paint(0xb84a1f),
  fieldGreen: paint(0x7fb04e),
  road: paint(0xddd2b8),
  salt: paint(0xeeeae0),
  ballast: paint(0x8a8478),
  hopper: paint(0xa3a7b3),
  hopperDark: paint(0x5d6170),
  tubeShade: paint(0xc9ccd6),
  capGreen: paint(0x3f8f5a),
  window: paint(0x33405e),

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
