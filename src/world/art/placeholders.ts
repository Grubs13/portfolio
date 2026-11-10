import { IcosahedronGeometry, Matrix4 } from 'three';
import type { Scene } from '../../content/scenes';
import { floatingRock, type IslandBuilder } from './kit';
import { MergedModel } from './merged';
import { palette } from './palette';

const orb = new IcosahedronGeometry(1, 0);

const island = () => floatingRock(new MergedModel(), 0);

/** Stand-ins for scenes that have no art of their own yet. */
// Props sit toward -x, to the character's screen-left, so they never hide it or sit on its head.
export const PLACEHOLDERS: Record<Scene['kind'], IslandBuilder> = {
  intro: () => floatingRock(new MergedModel(), 0, 1.8).build(),
  contact: () => floatingRock(new MergedModel(), 0, 1.8).build(),
  role: () =>
    island()
      .box(palette.stone, [-1.7, 0.6, 0.3], [1.2, 1.2, 1.2])
      .box(palette.stoneDark, [-1.2, 0.4, -1.1], [0.8, 0.8, 0.8])
      .box(palette.stone, [-1.8, 1.5, 0.1], [0.7, 0.6, 0.7])
      .build(),
  project: () => island().box(palette.stone, [-1.7, 2, 0.2], [1.2, 4, 1.2]).build(),
  interest: () => island().add(palette.crystal, orb, new Matrix4().makeTranslation(-1.7, 1.6, 0.4)).build(),
};
