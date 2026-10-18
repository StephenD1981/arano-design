/**
 * ARANO typefaces: the role map, the shipped files, and the @font-face rules for them.
 *
 * The files under fonts/ are copied unmodified from @fontsource-variable/geist and @fontsource/ibm-plex-mono
 * (SIL Open Font Licence 1.1; each family's licence text sits beside its files). No consumer fetches from Google
 * at build or run time.
 *
 * The descriptors reproduce what next/font/google emitted for arano-ran on 2026-10-17, measured from its compiled
 * CSS (test/fixtures/arano-ran-next-font-google.css): the same five unicode-range subsets, the variable Geist file
 * declared once per weight, and Google's precalculated fallback metrics. The one place this departs from
 * fontsource's own unicode.json is latin-ext, which Google now ends at U+20C4 where fontsource says U+20C0.
 */

/** Google's subset order, which is the order the faces are declared in. */
export const SUBSETS = ['cyrillic-ext', 'cyrillic', 'vietnamese', 'latin-ext', 'latin'] as const
export type Subset = (typeof SUBSETS)[number]

export const UNICODE_RANGES: Record<Subset, string> = {
  'cyrillic-ext': 'U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F',
  cyrillic: 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116',
  vietnamese:
    'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB',
  'latin-ext':
    'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C4,U+2113,U+2C60-2C7F,U+A720-A7FF',
  latin:
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
}

export interface FallbackMetrics {
  font: string
  ascentOverride: string
  descentOverride: string
  lineGapOverride: string
  sizeAdjust: string
}

export interface FontFamily {
  family: string
  fallbackFamily: string
  /** Directory under fonts/. */
  dir: string
  weights: readonly number[]
  /** The file for a subset and weight, relative to `dir`. */
  file: (subset: Subset, weight: number) => string
  /** Google's precalculated metrics for the local fallback face, which keep layout still while the font loads. */
  fallback: FallbackMetrics
}

export const FONT_FAMILIES = {
  geist: {
    family: 'Geist',
    fallbackFamily: 'Geist Fallback',
    dir: 'geist',
    weights: [300, 400, 500, 600, 700],
    // One variable file per subset covers every weight, exactly as Google serves Geist.
    file: (subset) => `geist-${subset}-wght-normal.woff2`,
    fallback: { font: 'Arial', ascentOverride: '95.94%', descentOverride: '28.16%', lineGapOverride: '0.00%', sizeAdjust: '104.76%' },
  },
  ibmPlexMono: {
    family: 'IBM Plex Mono',
    fallbackFamily: 'IBM Plex Mono Fallback',
    dir: 'ibm-plex-mono',
    weights: [400, 500, 600],
    file: (subset, weight) => `ibm-plex-mono-${subset}-${weight}-normal.woff2`,
    fallback: { font: 'Arial', ascentOverride: '76.16%', descentOverride: '20.43%', lineGapOverride: '0.00%', sizeAdjust: '134.59%' },
  },
} as const satisfies Record<string, FontFamily>

/** Which family each typographic role uses, and the CSS variable that carries it (see the Tailwind preset). */
export const FONT_ROLES = {
  display: { variable: '--font-display', family: FONT_FAMILIES.geist },
  sans: { variable: '--font-sans', family: FONT_FAMILIES.geist },
  mono: { variable: '--font-mono', family: FONT_FAMILIES.ibmPlexMono },
} as const

export interface FontFaceSpec {
  family: string
  weight: number
  style: 'normal'
  subset: Subset
  /** Path under fonts/, e.g. `geist/geist-latin-wght-normal.woff2`. */
  path: string
  unicodeRange: string
}

/** Every face, in declaration order: per family, per weight, per subset. */
export function fontFaces(subsets: readonly Subset[] = SUBSETS): FontFaceSpec[] {
  return Object.values(FONT_FAMILIES).flatMap((f: FontFamily) =>
    f.weights.flatMap((weight) =>
      subsets.map((subset) => ({
        family: f.family,
        weight,
        style: 'normal' as const,
        subset,
        path: `${f.dir}/${f.file(subset, weight)}`,
        unicodeRange: UNICODE_RANGES[subset],
      })),
    ),
  )
}

export interface FontFaceCssOptions {
  /** Subsets to declare. Default: all five. */
  subsets?: readonly Subset[]
  /** Also declare the role variables on :root. Leave off where a loader such as next/font sets them. */
  rootVariables?: boolean
}

/** @font-face rules for the faces, the fallback faces and, optionally, the role variables. URLs are relative to fonts/. */
export function fontFaceCss({ subsets = SUBSETS, rootVariables = false }: FontFaceCssOptions = {}): string {
  const faces = fontFaces(subsets).map((face) =>
    [
      '@font-face {',
      `  font-family: '${face.family}';`,
      `  font-style: ${face.style};`,
      `  font-weight: ${face.weight};`,
      '  font-display: swap;',
      `  src: url(./${face.path}) format('woff2');`,
      `  unicode-range: ${face.unicodeRange};`,
      '}',
    ].join('\n'),
  )
  const fallbacks = Object.values(FONT_FAMILIES).map((f: FontFamily) =>
    [
      '@font-face {',
      `  font-family: '${f.fallbackFamily}';`,
      `  src: local("${f.fallback.font}");`,
      `  ascent-override: ${f.fallback.ascentOverride};`,
      `  descent-override: ${f.fallback.descentOverride};`,
      `  line-gap-override: ${f.fallback.lineGapOverride};`,
      `  size-adjust: ${f.fallback.sizeAdjust};`,
      '}',
    ].join('\n'),
  )
  const root = rootVariables
    ? [
        ':root {',
        ...Object.values(FONT_ROLES).map((r) => `  ${r.variable}: '${r.family.family}', '${r.family.fallbackFamily}';`),
        '}',
      ].join('\n')
    : null
  return [...faces, ...fallbacks, ...(root ? [root] : [])].join('\n\n') + '\n'
}
