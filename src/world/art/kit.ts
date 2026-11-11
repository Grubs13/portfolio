import { BoxGeometry, CylinderGeometry, Matrix4, type Object3D } from 'three';
import { STAGE_RADIUS } from '../layout';
import type { CharacterPose } from './character';
import type { MergedModel } from './merged';
import { palette, type Paint } from './palette';

export type Vec = readonly [number, number, number];
/** One scene's stage, centered on its anchor with the ground at y = 0 where the character stands. */
export interface Stage {
  object: Object3D;
  /** Where the camera aims at rest, relative to the anchor, so each scene frames its own subject. */
  look: Vec;
  /** How the character is cast at the anchor: the pose it holds and its turn about y. It stands at the stage's default turn without one, and is left out when this is null. */
  cast?: Cast | null;
  /** World units that must fit across the free part of the screen. Smaller frames the scene closer. */
  frame?: number;
}
/** The character faces (sin yaw, 0, cos yaw). */
export interface Cast {
  pose: CharacterPose;
  yaw: number;
}
export type StageBuilder = () => Stage;

/** A little above the character's head, which suits a scene whose subject is the character. */
export const DEFAULT_LOOK: Vec = [0, 5, 0];

export const box = new BoxGeometry(1, 1, 1);

/**
 * World x and z for a point `right` units to the right of the character on
 * screen and `back` units up-screen across the ground. The camera looks from
 * +x +z, so laying a scene out in these terms keeps it composed for the eye.
 */
export function onScreen(right: number, back: number): { x: number; z: number } {
  return { x: (right - back) * Math.SQRT1_2, z: (-right - back) * Math.SQRT1_2 };
}

/**
 * The ground every scene stands on: a slab of rock whose top fills the screen
 * at any framing, with a crooked crag below that shows while flying between scenes.
 */
export function stageGround(model: MergedModel, surface: Paint = palette.grass): MergedModel {
  const r = STAGE_RADIUS;
  const at = (y: number, yaw = 0) => new Matrix4().makeRotationY(yaw).setPosition(0, y, 0);
  return model
    .add(surface, new CylinderGeometry(r, r, 0.3, 9), at(-0.15))
    .add(palette.rock, new CylinderGeometry(r, r * 0.75, 4, 9), at(-2.3))
    .add(palette.rock, new CylinderGeometry(r * 0.75, r * 0.1, 18, 9), at(-13.3, Math.PI / 9));
}
