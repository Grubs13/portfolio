// Writes the palette to blender/out for the Blender scripts, so models use the site's paints by name.
import { mkdirSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { palette } from '../src/world/art/palette';

const OUT = new URL('./out/', import.meta.url);

it('dumps the palette', () => {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(new URL('palette.json', OUT), JSON.stringify(Object.fromEntries(Object.entries(palette).map(([name, paint]) => [name, paint.color]))));
});
