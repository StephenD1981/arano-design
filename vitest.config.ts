import { defineConfig } from 'vitest/config'

// `unit` tests the sources. `fixtures` tests the BUILT package (run `npm run build` first): the exports map, the
// generated CSS and fonts, and the preset compiled by Tailwind 3.4 and Tailwind 4.
export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', include: ['test/**/*.test.{ts,tsx}'], environment: 'node' } },
      { test: { name: 'fixtures', include: ['fixtures/**/*.test.ts'], environment: 'node' } },
    ],
  },
})
