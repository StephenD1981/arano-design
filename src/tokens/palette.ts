/**
 * THE palette. One source for every colour in the product and the website.
 *
 * Before this file there were four: tailwind.config.ts, lib/design-tokens.ts,
 * lib/pm/colors.ts and lib/networks/graph-colors.ts. They disagreed. Charts read
 * design-tokens.ts rather than the Tailwind config, so a brand change applied to
 * the config never reached a single chart axis.
 *
 * Rules:
 *  - Every colour in the app derives from here. No literal hex in a component.
 *  - The Tailwind preset and tokens.css are built from this file, so the
 *    utility classes, the CSS variables and the TS constants cannot drift.
 *    test/preset.test.ts and test/tokens-css.test.ts enforce it.
 *  - Ratios in comments are measured to WCAG 2.1 against Graphite / ARANO Black.
 */

/** Cool neutral, anchored on the brand. 50-600 is text, 700-950 is surface. */
export const NEUTRAL = {
  50: '#F5F6F7',
  100: '#E8ECEE', // Cloud
  200: '#D4DADE',
  300: '#BBC3C9',
  400: '#A0AAB1',
  500: '#8A969E', // 6.07 / 6.59
  600: '#78848C', // 4.79 / 5.20 - AA floor for body text
  700: '#434E56',
  800: '#242C33',
  900: '#101519', // Graphite
  950: '#07090B', // ARANO Black
} as const

export const BRAND = {
  50: '#E0F8FA',
  100: '#C6F1F6',
  200: '#A7EAF1',
  300: '#8DE4ED',
  400: '#7BE0EA',
  500: '#70DDE8', // Signal Cyan. 12.53 on black
  600: '#46D3E1',
  700: '#20BBCA',
  800: '#188A95',
  900: '#105961',
  /** Signal Cyan takes BLACK ink, never white. */
  ink: '#07090B',
  /** Light contexts: Signal Cyan is 1.59:1 on white and unusable there. */
  onLight: '#157984', // 5.12 on white
} as const

/** Product state. Separate from brand, and never the only carrier of meaning. */
export const STATE = {
  validated: '#2ECC71', // 8.74 on Graphite
  investigating: '#976EF7', // 5.15
  warning: '#F5B400', // 9.98
  degraded: '#FF4D4F', // 5.62
} as const

/** Detector severity. The one vocabulary maps and charts may use for severity. */
export const SEVERITY = {
  critical: '#FF4D4F',
  major: '#FA8C16',
  moderate: '#FADB14',
  minor: '#FADB14',
  warning: '#FAAD14',
  info: '#70DDE8',
  healthy: '#2ECC71',
} as const

/**
 * Site sectors on the map. No red, amber or green (the diagnosis and severity colours drawn beside them) and no cyan or
 * teal (the roaming volume beneath them); the first three, the usual sectors, also differ in lightness, so they stay
 * apart for colour-vision deficiency. Every entry >= 4.5:1 on Graphite.
 */
export const SECTOR = [
  '#6EA8FE', //  7.61 blue
  '#E879F9', //  7.46 magenta
  '#E8EDF1', // 15.58 white
  '#B197FC', //  7.61 violet
  '#3B82F6', //  4.99 deep blue
  '#A5B4FC', //  9.21 periwinkle
] as const

/** Categorical chart series. Led by the brand, every entry >= 4.5:1 on Graphite. */
export const CHART = {
  series: [
    '#70DDE8', // 11.54
    '#2ECC71', //  8.74
    '#F5B400', //  9.98
    '#976EF7', //  5.15
    '#FF6B8A', //  6.75
    '#2DD4BF', //  9.87
    '#F472B6', //  6.93
    '#A0AAB1', //  7.77
  ],
  grid: '#242C33',
  axis: '#434E56',
  tick: '#8A969E',
  tickSecondary: '#78848C',
} as const

export const SURFACE = {
  sunken: '#050709',
  base: '#07090B',
  raised: '#101519',
  overlay: '#161C21',
  elevated: '#242C33',
  /** White hairlines at an alpha, so one value reads on every tier above. Tailwind `surface-border`. */
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.12)',
} as const

/**
 * The dark theme's custom properties, exactly as arano-ran's `app/globals.css` declared them in `.dark` when they
 * moved here (2026-10-17), in the same order. tokens.css is generated from this.
 * Most are HSL channels for the shadcn form `hsl(var(--x))`; the shadows are full values.
 *
 * Keyed in camelCase, like the rest of this file: the property is the key in kebab-case with a leading `--`, so
 * `mutedForeground` is `--muted-foreground`. Do not key it by the property name. Tailwind's source scan reads the
 * string literals of any file it scans, and while this file lived in arano-ran, kebab-case keys emitted a stray
 * utility and `--` keys kept otherwise unused theme variables, both visible in the compiled CSS.
 *
 * Held VERBATIM, not converted from the hexes above. They were rounded by hand, and a uniform hex-to-HSL conversion
 * reproduces only seven of the fifteen distinct colours (#8A969E converts to `204 9% 58%`, globals.css says `203`),
 * so converting would change today's rendering. test/tokens-css.test.ts asserts tokens.css declares exactly the
 * arano-ran set, and that each colour naming a palette entry decodes to within two RGB steps of it.
 *
 * Two naming notes, because the names predate this file and arano-ran's CSS uses them:
 *  - `primaryInk` (`--primary-ink`) is the LIGHT-CONTEXT cyan for email, print and PDF, the CSS twin of
 *    BRAND.onLight. It is not ink for text on the primary colour; that is `primaryForeground`. It keeps its name
 *    because the property is part of the dark set consumers already ship.
 *  - `-light` and `-dark` suffixes (`mutedForegroundLight`, `borderDark`, `primaryLight`) mean lighter and darker
 *    VARIANTS within this dark theme, not a light theme and a dark theme.
 *
 * Not in the hex palette: the border alphas (white at 0.08, 0.15 and 0.04), Steel `--border-strong` (borders and
 * icons only; it fails AA as body text on both backgrounds), the `--primary-dark` / `--primary-light` hover steps, and
 * the dark elevation shadows.
 */
export const THEME_DARK = {
  background: '210 22% 3.5%',
  foreground: '200 15% 92%',
  muted: '207 22% 8%',
  mutedForeground: '203 9% 58%',
  mutedForegroundLight: '203 10% 66%',
  mutedForegroundDark: '203 8% 51%',
  card: '207 22% 8%',
  cardForeground: '200 15% 92%',
  popover: '207 22% 8%',
  popoverForeground: '200 15% 92%',
  primary: '185.5 72% 67.5%',
  primaryForeground: '210 22% 3.5%',
  primaryDark: '185.5 72% 57%',
  primaryLight: '185.5 72% 78%',
  primaryInk: '187 73% 30%',
  secondary: '207 22% 8%',
  secondaryForeground: '200 15% 92%',
  accent: '185.5 72% 67.5%',
  accentForeground: '210 22% 3.5%',
  border: '0 0% 100% / 0.08',
  borderLight: '0 0% 100% / 0.15',
  borderDark: '0 0% 100% / 0.04',
  borderStrong: '203 8% 44%',
  ring: '185.5 72% 67.5%',
  success: '145 63% 49%',
  warning: '44 100% 48%',
  error: '359 100% 65%',
  investigating: '258 90% 70%',
  shadowSm: '0 1px 2px 0 rgb(0 0 0 / 0.4)',
  shadowMd: '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
  shadowLg: '0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
  shadowXl: '0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.3)',
  shadow2xl: '0 25px 50px -12px rgb(0 0 0 / 0.6)',
} as const

export type NeutralKey = keyof typeof NEUTRAL
export type BrandKey = keyof typeof BRAND
export type StateKey = keyof typeof STATE
export type SeverityKey = keyof typeof SEVERITY

/** Stable series colour for an unbounded set (agents, node types, operators). */
export function seriesColour(index: number): string {
  // A fractional, NaN or infinite index would otherwise read past the array and return undefined.
  const i = Number.isFinite(index) ? Math.abs(Math.trunc(index)) : 0
  return CHART.series[i % CHART.series.length]
}
