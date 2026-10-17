/**
 * The ARANO mark. One geometry for the SVG files in brand/ and the Wordmark component; test/brand.test.ts keeps
 * the files and this description identical.
 */

/** The master A: two strokes on a 100 x 100 grid. */
export const MARK = {
  viewBox: '0 0 100 100',
  strokeWidth: 13,
  strokeLinejoin: 'miter',
  strokeLinecap: 'butt',
  paths: ['M18 88 L50 20 L82 88', 'M49 69 H72'],
} as const

/** The validation ring drawn around the mark in brand/arano-symbol-ring.svg. */
export const RING = {
  cx: 50,
  cy: 50,
  r: 38,
  strokeWidth: 4,
  dasharray: '202 37',
  rotate: 135,
} as const

/** The files under brand/, by role. Both draw in Signal Cyan (BRAND[500]). */
export const BRAND_FILES = {
  symbol: 'arano-symbol.svg',
  symbolRing: 'arano-symbol-ring.svg',
} as const
