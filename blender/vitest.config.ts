import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['blender/*.test.ts'] },
});
