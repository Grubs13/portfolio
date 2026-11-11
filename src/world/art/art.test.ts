import { Box3, Mesh, type Object3D, Triangle, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { type Scene, scenes } from '../../content/scenes';
import { STAGE_RADIUS, layoutScenes, pointOnSegment } from '../layout';
import { stageFor, SCENE_ART } from '.';
import { CHARACTER_SCALE } from './character';
import { PLACEHOLDERS } from './placeholders';

// Generous bounds of the character in any travel pose, measured from its feet.
const BODY_HALF_WIDTH = 0.45 * CHARACTER_SCALE;
const BODY_HEIGHT = 2.3 * CHARACTER_SCALE;

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

const scenesWithArt = scenes.flatMap((scene, i) => (SCENE_ART[scene.id] ? [[scene.id, i] as const] : []));

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

  it.each(scenes.map((s) => [s.id, s] as const))('keeps the %s stage within STAGE_RADIUS of its anchor', (_, scene) => {
    expect(horizontalReach(stageFor(scene)().object)).toBeLessThanOrEqual(STAGE_RADIUS + 1e-4);
  });

  it.each(scenesWithArt)('merges the %s art into one mesh per material, so it costs one draw call each', (_, i) => {
    const parts = meshes(stageFor(scenes[i]!)().object);
    expect(new Set(parts.map((m) => m.material)).size).toBe(parts.length);
  });

  it.each(scenesWithArt)('keeps the travel paths into and out of %s clear of its art', (_, i) => {
    const layout = layoutScenes(scenes);
    const anchor = layout.anchors[i]!;
    const stage = stageFor(scenes[i]!)().object;
    stage.position.set(anchor.x, anchor.y, anchor.z);
    // The path rises out of the rock below, so only parts above the walkable surface count.
    const props = triangles(stage).filter((t) => Math.max(t.a.y, t.b.y, t.c.y) > anchor.y + 0.01);
    const segments = [layout.segments[i - 1], layout.segments[i]].filter((s) => s !== undefined);
    for (const segment of segments) {
      for (let step = 1; step < 100; step++) {
        const p = pointOnSegment(segment, step / 100);
        const body = new Box3(
          new Vector3(p.x - BODY_HALF_WIDTH, p.y + 0.05, p.z - BODY_HALF_WIDTH),
          new Vector3(p.x + BODY_HALF_WIDTH, p.y + BODY_HEIGHT, p.z + BODY_HALF_WIDTH),
        );
        const where = [p.x - anchor.x, p.y - anchor.y, p.z - anchor.z].map((n) => n.toFixed(1)).join(', ');
        expect(props.some((t) => body.intersectsTriangle(t)), `collides at t = ${step / 100}, (${where}) from the anchor`).toBe(false);
      }
    }
  });
});
