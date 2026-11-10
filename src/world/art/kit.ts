import { BoxGeometry, CylinderGeometry, Matrix4, type Object3D } from 'three';
import { ISLAND_RADIUS } from '../layout';
import type { MergedModel } from './merged';
import { palette } from './palette';

export type Vec = readonly [number, number, number];
/** Builds one island, centered on its scene anchor with the walkable surface at y = 0. */
export type IslandBuilder = () => Object3D;

export const box = new BoxGeometry(1, 1, 1);

/**
 * A floating rock with a grass cap whose top face sits at `top`: a wide crust
 * over a crooked spike, so the underside reads as a hanging crag.
 */
export function floatingRock(model: MergedModel, top: number, radius = ISLAND_RADIUS): MergedModel {
  const cap = 0.14;
  const crust = 0.8 * (radius / ISLAND_RADIUS);
  const spike = 1.7 * (radius / ISLAND_RADIUS);
  const at = (y: number, yaw = 0) => new Matrix4().makeRotationY(yaw).setPosition(0, y, 0);
  return model
    .add(palette.grass, new CylinderGeometry(radius, radius, cap, 7), at(top - cap / 2))
    .add(palette.rock, new CylinderGeometry(radius, radius * 0.7, crust, 7), at(top - cap - crust / 2))
    .add(palette.rock, new CylinderGeometry(radius * 0.7, radius * 0.15, spike, 7), at(top - cap - crust - spike / 2, Math.PI / 7));
}
