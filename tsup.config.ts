import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/watcher.ts'],
  format: ['esm'],
  target: 'esnext',
  dts: 'src/common/types.ts',
  clean: true,
  minify: false,
  splitting: false,
});
