import type { Scene } from '../../content/scenes';
import { carseland } from './carseland';
import type { StageBuilder } from './kit';
import { PLACEHOLDERS } from './placeholders';
import { reformerReharp } from './reformerReharp';

/** Bespoke stages, keyed by scene id. */
export const SCENE_ART: Readonly<Partial<Record<string, StageBuilder>>> = {
  'reliability-engineer': carseland,
  'reformer-reharp': reformerReharp,
};

/** A scene's loaded model, else its code art, else the placeholder for its kind. */
export function stageFor(scene: Scene, loaded: Partial<Record<string, StageBuilder>> = {}): StageBuilder {
  return loaded[scene.id] ?? SCENE_ART[scene.id] ?? PLACEHOLDERS[scene.kind];
}
