// Writes the palette and every scene's flight paths to blender/out for the Blender scripts,
// so models use the site's paints by name and keep clear of the paths the character flies.
import { mkdirSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { scenes } from '../src/content/scenes';
import { palette } from '../src/world/art/palette';
import { layoutScenes, pointOnSegment } from '../src/world/layout';

const OUT = new URL('./out/', import.meta.url);

it('dumps the palette and flight paths', () => {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(new URL('palette.json', OUT), JSON.stringify(Object.fromEntries(Object.entries(palette).map(([name, paint]) => [name, paint.color]))));

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
