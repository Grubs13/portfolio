import { MeshBasicMaterial, MeshLambertMaterial } from 'three';

const flat = (color: number) => new MeshLambertMaterial({ color, flatShading: true });

/** The one look every island shares. Reuse these instances so each material compiles once. */
export const palette = {
  greyDark: flat(0x4a4e58),
  grey: flat(0x7a7f8a),
  greyLight: flat(0xa9adb6),
  concrete: flat(0x7f838c),
  steel: flat(0x66707f),
  steelDark: flat(0x343a46),
  refractory: flat(0xb0573a),
  safetyYellow: flat(0xf2b31b),
  tube: flat(0xd8dde6),
  timber: flat(0x8a6644),
  /** Unlit, so it reads as emitting light against the dark sky. */
  glow: new MeshBasicMaterial({ color: 0xff8a2a }),
} as const;

export type PaletteMaterial = (typeof palette)[keyof typeof palette];
