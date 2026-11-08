import { CylinderGeometry, IcosahedronGeometry } from 'three';
import type { Scene } from '../../content/scenes';
import { box, group, type IslandBuilder, islandRock, mesh } from './kit';
import { palette } from './palette';

const platformRock = new CylinderGeometry(1.8, 1, 0.8, 6);
const orb = new IcosahedronGeometry(1, 0);

const island = () => mesh(islandRock, palette.greyDark, [0, -1, 0]);
const platform = () => mesh(platformRock, palette.greyDark, [0, -0.4, 0]);

/** Grey stand-ins for scenes that have no art of their own yet. */
// Props sit toward -x, to the character's screen-left, so they never hide it or sit on its head.
export const PLACEHOLDERS: Record<Scene['kind'], IslandBuilder> = {
  intro: platform,
  contact: platform,
  role: () =>
    group(
      island(),
      mesh(box, palette.grey, [-1.7, 0.6, 0.3], [1.2, 1.2, 1.2]),
      mesh(box, palette.greyLight, [-1.2, 0.4, -1.1], [0.8, 0.8, 0.8]),
      mesh(box, palette.grey, [-1.8, 1.5, 0.1], [0.7, 0.6, 0.7]),
    ),
  project: () => group(island(), mesh(box, palette.grey, [-1.7, 2, 0.2], [1.2, 4, 1.2])),
  interest: () => group(island(), mesh(orb, palette.greyLight, [-1.7, 1.6, 0.4])),
};
