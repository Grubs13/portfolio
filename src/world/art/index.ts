import type { Scene } from '../../content/scenes';
import type { IslandBuilder } from './kit';
import { PLACEHOLDERS } from './placeholders';
import { reformerReharp } from './reformerReharp';

/** Bespoke islands, keyed by scene id. */
export const SCENE_ART: Readonly<Partial<Record<string, IslandBuilder>>> = {
  'reformer-reharp': reformerReharp,
};

/** A scene's own art when it has some, otherwise the placeholder for its kind. */
export function islandFor(scene: Scene): IslandBuilder {
  return SCENE_ART[scene.id] ?? PLACEHOLDERS[scene.kind];
}
