import { readFile } from 'node:fs/promises';
import { Box3, Mesh, type Object3D, Triangle, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { type Scene, scenes } from '../../content/scenes';
import { STAGE_RADIUS } from '../layout';
import { stageFor, SCENE_ART } from '.';
import type { StageBuilder } from './kit';
import { CHARACTER_MODEL, characterFromGltf } from './model';
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

/** A model read from `public/`, as the browser would load it. */
async function parseFromDisk(url: string) {
  const file = await readFile(new URL(`../../../public${url}`, import.meta.url));
  return (await sceneLoader()).parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '');
}

async function loadFromDisk(): Promise<Partial<Record<string, StageBuilder>>> {
  const loaded: Partial<Record<string, StageBuilder>> = {};
  for (const [id, model] of Object.entries(SCENE_MODELS)) {
    if (!model) continue;
    const gltf = await parseFromDisk(model.url);
    loaded[id] = () => stageFromGltf(gltf.scene, model);
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

describe('character model', () => {
  const shown = (o: Object3D | null): boolean => !o || (o.visible && shown(o.parent));
  const poseOf = (o: Object3D | null): string | undefined => (!o ? undefined : o.name.startsWith('pose_') ? o.name.slice(5) : poseOf(o.parent));

  it('shows only the named pose, sized by the standing one', async () => {
    const model = CHARACTER_MODEL!;
    const character = characterFromGltf((await parseFromDisk(model.url)).scene, model);
    const visible = () => meshes(character.root).filter(shown);
    const height = () => visible().reduce((box, m) => box.expandByObject(m), new Box3()).getSize(new Vector3()).y;

    character.pose('inspect');
    expect(visible().length).toBeGreaterThan(0);
    expect(new Set(visible().map(poseOf))).toEqual(new Set(['inspect']));
    expect(height()).toBeLessThan(model.height * 0.85);

    character.pose('stand');
    expect(new Set(visible().map(poseOf))).toEqual(new Set(['stand']));
    expect(height()).toBeCloseTo(model.height, 5);
  });
});
