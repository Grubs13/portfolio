import { BoxGeometry, type BufferGeometry, CylinderGeometry, Group, Mesh, type Object3D } from 'three';
import { ISLAND_RADIUS } from '../layout';
import type { PaletteMaterial } from './palette';

export type Vec = readonly [number, number, number];
/** Builds one island, centered on its scene anchor with the walkable surface at y = 0. */
export type IslandBuilder = () => Object3D;

export const box = new BoxGeometry(1, 1, 1);
/** The floating rock every island sits on, with its top face at y = 0. */
export const islandRock = new CylinderGeometry(ISLAND_RADIUS, 1.2, 2, 7);

export function mesh(geometry: BufferGeometry, material: PaletteMaterial, [x, y, z]: Vec, [sx, sy, sz]: Vec = [1, 1, 1]): Mesh {
  const m = new Mesh(geometry, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}

export function group(...children: Object3D[]): Group {
  const g = new Group();
  g.add(...children);
  return g;
}
