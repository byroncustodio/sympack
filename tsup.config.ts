import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/watcher.ts'],
  format: ['esm'],
  target: 'es2022',
  publicDir: 'public',
  dts: 'src/types.ts',
  clean: true,
  minify: false,
  splitting: false,
});
