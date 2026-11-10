import { IcosahedronGeometry, Matrix4 } from 'three';
import type { Scene } from '../../content/scenes';
import { DEFAULT_LOOK, type StageBuilder, stageGround } from './kit';
import { MergedModel } from './merged';
import { palette } from './palette';

const orb = new IcosahedronGeometry(1, 0);
const PROP_SCALE = 2.5;

/** Bare ground plus props laid out at character scale and enlarged to stage scale. */
function stage(props: (model: MergedModel) => MergedModel = (m) => m) {
  const ground = stageGround(new MergedModel());
  props(ground.within(new Matrix4().makeScale(PROP_SCALE, PROP_SCALE, PROP_SCALE)));
  return { object: ground.build(), look: DEFAULT_LOOK };
}

/** Stand-ins for scenes that have no art of their own yet. */
// Props sit toward -x, to the character's screen-left, so they never hide it or sit on its head.
export const PLACEHOLDERS: Record<Scene['kind'], StageBuilder> = {
  intro: () => stage(),
  contact: () => stage(),
  role: () =>
    stage((m) =>
      m
        .box(palette.stone, [-1.7, 0.6, 0.3], [1.2, 1.2, 1.2])
        .box(palette.stoneDark, [-1.2, 0.4, -1.1], [0.8, 0.8, 0.8])
        .box(palette.stone, [-1.8, 1.5, 0.1], [0.7, 0.6, 0.7]),
    ),
  project: () => stage((m) => m.box(palette.stone, [-1.7, 2, 0.2], [1.2, 4, 1.2])),
  interest: () => stage((m) => m.add(palette.crystal, orb, new Matrix4().makeTranslation(-1.7, 1.6, 0.4))),
};
