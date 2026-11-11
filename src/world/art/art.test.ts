import { readFile } from 'node:fs/promises';
import { Mesh, type Object3D, Triangle, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { type Scene, scenes } from '../../content/scenes';
import { STAGE_RADIUS } from '../layout';
import { stageFor, SCENE_ART } from '.';
import type { StageBuilder } from './kit';
import { PLACEHOLDERS } from './placeholders';
import { SCENE_MODELS, sceneLoader, stageFromGltf } from './sceneModel';

function meshes(object: Object3D): Mesh[] {
  object.updateMatrixWorld(true);
  const found: Mesh[] = [];
  object.traverse((child) => {
    if (child instanceof Mesh) found.push(child);
  });
  return found;
}

function triangles(object: Object3D): Triangle[] {
  return meshes(object).flatMap((m) => {
    const position = m.geometry.getAttribute('position');
    const index = m.geometry.index;
    const count = index ? index.count : position.count;
    const vertex = (k: number) =>
      new Vector3().fromBufferAttribute(position, index ? index.getX(k) : k).applyMatrix4(m.matrixWorld);
    const tris: Triangle[] = [];
    for (let k = 0; k < count; k += 3) tris.push(new Triangle(vertex(k), vertex(k + 1), vertex(k + 2)));
    return tris;
  });
}

function horizontalReach(object: Object3D): number {
  // A reduce, since a detailed stage has more vertices than a spread call can take as arguments.
  return triangles(object).reduce((reach, t) => Math.max(reach, ...[t.a, t.b, t.c].map((v) => Math.hypot(v.x, v.z))), 0);
}

/** Each scene model read from `public/`, as the browser would load it. */
async function loadFromDisk(): Promise<Partial<Record<string, StageBuilder>>> {
  const loader = await sceneLoader();
  const loaded: Partial<Record<string, StageBuilder>> = {};
  for (const [id, model] of Object.entries(SCENE_MODELS)) {
    if (!model) continue;
    const file = await readFile(new URL(`../../../public${model.url}`, import.meta.url));
    const gltf = await loader.parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '');
    loaded[id] = () => stageFromGltf(gltf.scene, model.look);
  }
  return loaded;
}

const loaded = await loadFromDisk();
const build = (scene: Scene) => stageFor(scene, loaded)();
const scenesWithArt = scenes.flatMap((scene, i) =>
  SCENE_ART[scene.id] || loaded[scene.id] ? [[`${scene.id}${loaded[scene.id] ? ' model' : ''}`, i] as const] : [],
);

describe('scene art', () => {
  it('keys art only by ids of real scenes, so none silently falls back', () => {
    const ids = new Set(scenes.map((s) => s.id));
    for (const id of Object.keys(SCENE_ART)) expect(ids).toContain(id);
  });

  it('uses a scene’s own art and falls back to the kind placeholder without it', () => {
    const withArt = scenes.find((s) => s.id === 'reformer-reharp')!;
    const without: Scene = { ...withArt, id: 'no-art-yet' };
    expect(stageFor(withArt)).toBe(SCENE_ART['reformer-reharp']);
    expect(stageFor(without)).toBe(PLACEHOLDERS[without.kind]);
  });

  it('models only real scenes', () => {
    const ids = new Set(scenes.map((s) => s.id));
    for (const id of Object.keys(SCENE_MODELS)) expect(ids).toContain(id);
  });

  it.each(scenes.map((s) => [s.id, s] as const))('keeps the %s stage within STAGE_RADIUS of its anchor', (_, scene) => {
    expect(horizontalReach(build(scene).object)).toBeLessThanOrEqual(STAGE_RADIUS + 1e-4);
  });

  it.each(scenesWithArt)('merges the %s art into one mesh per material, so it costs one draw call each', (_, i) => {
    const parts = meshes(build(scenes[i]!).object);
    expect(new Set(parts.map((m) => m.material)).size).toBe(parts.length);
  });
});
