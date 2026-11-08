import { Mesh, type Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { type Scene, scenes } from '../../content/scenes';
import { ISLAND_RADIUS } from '../layout';
import { islandFor, SCENE_ART } from '.';
import { PLACEHOLDERS } from './placeholders';

function horizontalReach(object: Object3D): number {
  object.updateMatrixWorld(true);
  let reach = 0;
  const v = new Vector3();
  object.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const position = child.geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i).applyMatrix4(child.matrixWorld);
      reach = Math.max(reach, Math.hypot(v.x, v.z));
    }
  });
  return reach;
}

describe('scene art', () => {
  it('keys art only by ids of real scenes, so none silently falls back', () => {
    const ids = new Set(scenes.map((s) => s.id));
    for (const id of Object.keys(SCENE_ART)) expect(ids).toContain(id);
  });

  it('falls back to the kind placeholder for a scene without art', () => {
    const scene: Scene = { kind: 'project', id: 'no-art-yet', title: '', org: '', summary: '', links: [] };
    expect(islandFor(scene)).toBe(PLACEHOLDERS.project);
  });

  it.each(scenes.map((s) => [s.id, s] as const))('keeps the %s island within ISLAND_RADIUS of its anchor', (_, scene) => {
    expect(horizontalReach(islandFor(scene)())).toBeLessThanOrEqual(ISLAND_RADIUS + 1e-6);
  });
});
