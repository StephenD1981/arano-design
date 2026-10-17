import { describe, expect, it } from 'vitest'
import { BRAND, NEUTRAL, SEVERITY, SURFACE, THEME_DARK } from '../src/tokens'
import { AA_BODY, AA_NON_TEXT, contrast, hslToHex } from './wcag'

/**
 * The pairs DESIGN-RULES.md states as rules: severity as text and as a fill, the text tier on the raised surfaces,
 * the dark set's own foreground / background pairs, Steel as an interactive boundary, and the light context.
 */
const GRAPHITE = NEUTRAL[900]
const BLACK = NEUTRAL[950]
const WHITE = '#FFFFFF'
const severities = Object.entries(SEVERITY)

describe('severity colours', () => {
  it.each(severities)('%s reads as text on Graphite and on ARANO Black', (_k, hex) => {
    expect(contrast(hex, GRAPHITE)).toBeGreaterThanOrEqual(AA_BODY)
    expect(contrast(hex, BLACK)).toBeGreaterThanOrEqual(AA_BODY)
  })

  it.each(severities)('a %s fill takes black ink', (_k, hex) => {
    expect(contrast(BRAND.ink, hex)).toBeGreaterThanOrEqual(AA_BODY)
  })

  it('white ink fails on the critical fill, so severity fills never take white', () => {
    expect(contrast(WHITE, SEVERITY.critical)).toBeLessThan(AA_BODY)
  })

  it('every severity colour fails as text on white: 1.0.0 has no light-context severity set', () => {
    for (const [k, hex] of severities) expect(contrast(hex, WHITE), k).toBeLessThan(AA_BODY)
  })
})

describe('the text tier on raised surfaces', () => {
  for (const [name, bg] of [['overlay', SURFACE.overlay], ['elevated', SURFACE.elevated]] as const) {
    it(`gray-500 and lighter clear AA on ${name}`, () => {
      for (const k of [50, 100, 200, 300, 400, 500] as const) expect(contrast(NEUTRAL[k], bg), `gray-${k}`).toBeGreaterThanOrEqual(AA_BODY)
    })
    it(`gray-600 does not clear AA on ${name}, so it is not body text there`, () => {
      expect(contrast(NEUTRAL[600], bg)).toBeLessThan(AA_BODY)
    })
  }
})

describe('THEME_DARK foreground / background pairs, decoded from the shipped values', () => {
  const T = (k: keyof typeof THEME_DARK) => hslToHex(THEME_DARK[k])
  const pairs: [string, string, string][] = [
    ['foreground on background', T('foreground'), T('background')],
    ['foreground on muted', T('foreground'), T('muted')],
    ['cardForeground on card', T('cardForeground'), T('card')],
    ['popoverForeground on popover', T('popoverForeground'), T('popover')],
    ['secondaryForeground on secondary', T('secondaryForeground'), T('secondary')],
    ['primaryForeground on primary', T('primaryForeground'), T('primary')],
    ['accentForeground on accent', T('accentForeground'), T('accent')],
    ['mutedForeground on background', T('mutedForeground'), T('background')],
    ['mutedForeground on muted', T('mutedForeground'), T('muted')],
    ['mutedForeground on card', T('mutedForeground'), T('card')],
    ['mutedForegroundLight on background', T('mutedForegroundLight'), T('background')],
    ['mutedForegroundDark on background', T('mutedForegroundDark'), T('background')],
    ['mutedForegroundDark on card', T('mutedForegroundDark'), T('card')],
    ['primary on background', T('primary'), T('background')],
    ['primary on card', T('primary'), T('card')],
    ['primaryInk (the light-context cyan) on white', T('primaryInk'), WHITE],
  ]
  it.each(pairs)('%s clears AA', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(AA_BODY)
  })
})

describe('Steel (--border-strong) as an interactive boundary', () => {
  const steel = hslToHex(THEME_DARK.borderStrong)
  it.each([['ARANO Black', BLACK], ['Graphite', GRAPHITE], ['overlay', SURFACE.overlay]])('clears 3:1 against %s', (_n, bg) => {
    expect(contrast(steel, bg)).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })
  it('does NOT clear 3:1 on elevated, so a boundary on elevated needs a lighter stroke', () => {
    expect(contrast(steel, SURFACE.elevated)).toBeLessThan(AA_NON_TEXT)
  })
})
