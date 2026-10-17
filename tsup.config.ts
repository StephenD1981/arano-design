import { defineConfig } from 'tsup'

// One self-contained bundle per public entry, as ESM and CJS with types for both.
export default defineConfig({
  entry: {
    'tokens/index': 'src/tokens/index.ts',
    'tailwind-preset/index': 'src/tailwind-preset/index.ts',
    'fonts/index': 'src/fonts/index.ts',
    'brand/index': 'src/brand/index.ts',
    'react/index': 'src/react/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: false,
  target: 'es2022',
  external: ['react', 'react/jsx-runtime'],
})
