// Writes every scene's parts and flight paths to blender/out for the Blender build.
// The code-built scenes stay the source of layout; Blender rebuilds and dresses them.
import { mkdirSync, writeFileSync } from 'node:fs';
import { Matrix4 } from 'three';
import { it } from 'vitest';
import { scenes } from '../src/content/scenes';
import { carseland } from '../src/world/art/carseland';
import { MergedModel } from '../src/world/art/merged';
import { palette } from '../src/world/art/palette';
import { reformerReharp } from '../src/world/art/reformerReharp';
import { layoutScenes, pointOnSegment } from '../src/world/layout';

const OUT = new URL('./out/', import.meta.url);
const names = new Map<number, string>();
for (const [name, paint] of Object.entries(palette)) if (!names.has(paint.color)) names.set(paint.color, name);

it('dumps scene parts and flight paths', () => {
  mkdirSync(OUT, { recursive: true });
  const colors = Object.fromEntries(Object.entries(palette).map(([name, paint]) => [name, paint.color]));
  for (const [name, build] of [['reformer', reformerReharp], ['carseland', carseland]] as const) {
    const parts: unknown[] = [];
    const add = MergedModel.prototype.add;
    MergedModel.prototype.add = function (paint, geometry, matrix) {
      const base = (this as unknown as { base: Matrix4 }).base;
      const parameters = (geometry as unknown as { parameters?: unknown }).parameters ?? null;
      const m = new Matrix4().multiplyMatrices(base, matrix).elements.map((e) => +e.toFixed(5));
      parts.push({ p: names.get(paint.color) ?? paint.color, g: paint.glow ? 1 : 0, t: geometry.type, a: parameters, m });
      return add.call(this, paint, geometry, matrix);
    };
    try {
      writeFileSync(new URL(`${name}.json`, OUT), JSON.stringify({ look: build().look, colors, parts }));
    } finally {
      MergedModel.prototype.add = add;
    }
  }

  const layout = layoutScenes(scenes);
  const paths: Record<string, number[][]> = {};
  scenes.forEach((scene, i) => {
    const anchor = layout.anchors[i]!;
    paths[scene.id] = [layout.segments[i - 1], layout.segments[i]].flatMap((segment) => {
      if (!segment) return [];
      return Array.from({ length: 201 }, (_, k) => {
        const p = pointOnSegment(segment, k / 200);
        return [p.x - anchor.x, p.y - anchor.y, p.z - anchor.z].map((n) => +n.toFixed(3));
      });
    });
  });
  writeFileSync(new URL('paths.json', OUT), JSON.stringify(paths));
});
