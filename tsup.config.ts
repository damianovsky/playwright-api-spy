import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    reporter: 'src/reporter.ts',
    cli: 'src/cli.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node18',
  outDir: 'dist',
  splitting: false,
  treeshake: true,
  minify: false,
  external: ['@playwright/test', 'chalk'],
});
