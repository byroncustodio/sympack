import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/watcher.ts'],
  format: ['esm'],
  target: 'esnext',
  publicDir: 'public',
  dts: 'src/common/types.ts',
  clean: true,
  minify: false,
  splitting: false,
});
