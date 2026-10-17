import { expect, it } from 'vitest';
import { scenes } from './scenes';

it('gives every scene a unique id, since each becomes a page anchor', () => {
  const ids = scenes.map((s) => s.id);
  expect(new Set(ids).size).toBe(ids.length);
});
