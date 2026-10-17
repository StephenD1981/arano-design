/**
 * The ARANO Tailwind preset: colour and font-role tokens, nothing else.
 *
 * Works as `presets: [aranoPreset]` under Tailwind 3.4 and under Tailwind 4 through `@config`.
 *
 * Deliberately absent:
 *  - radius, shadow and ring. Tailwind 4 rescaled them, so one shared value renders differently on 3 and 4. Each
 *    product keeps its own.
 *  - `content`. Each product scans its own sources.
 *  - the shadcn `hsl(var(--x))` colours. They belong to each product's component copies and read tokens.css.
 */
import { BRAND, NEUTRAL, SEVERITY, SURFACE } from '../tokens/palette'

/**
 * Typefaces by role. Components name a role, never a family, so a change of face is a change here. The first entry
 * is the variable a font loader sets (next/font, or fonts/fonts.css for everything else).
 */
export const FONT_FAMILY = {
  sans: ['var(--font-sans)', 'Geist', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
  display: ['var(--font-display)', 'Geist', 'sans-serif'],
  mono: ['var(--font-mono)', 'IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
}

/**
 * Colour keys in kebab-case, so Tailwind 3.4 and Tailwind 4 generate the SAME class names. Tailwind 3.4 keeps a
 * key as written (`onLight` would give `text-brand-onLight`) while Tailwind 4 kebab-cases it (`text-brand-on-light`).
 * The TypeScript constants stay camelCase (`BRAND.onLight`); only the preset's keys change.
 */
function kebabKeys(group: Record<string | number, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(group).map(([k, v]) => [k.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(), v]))
}

/** The shape Tailwind 3.4 and 4 both accept in `presets`, stated here so this package needs no Tailwind types. */
export interface AranoPreset {
  theme: {
    extend: {
      colors: Record<string, Record<string, string>>
      fontFamily: Record<string, string[]>
    }
  }
}

export const aranoPreset: AranoPreset = {
  theme: {
    extend: {
      colors: {
        // `gray` is retargeted to the cool ARANO neutral rather than codemodding thousands of sites: 50-600 is the
        // text tier (every key clears AA on Graphite and on ARANO Black), 700-950 the surface and border tier.
        gray: kebabKeys(NEUTRAL),
        brand: kebabKeys(BRAND),
        surface: kebabKeys(SURFACE),
        severity: kebabKeys(SEVERITY),
      },
      fontFamily: {
        sans: [...FONT_FAMILY.sans],
        display: [...FONT_FAMILY.display],
        mono: [...FONT_FAMILY.mono],
      },
    },
  },
}
