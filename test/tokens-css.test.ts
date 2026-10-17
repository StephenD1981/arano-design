import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BRAND, NEUTRAL, STATE, THEME_DARK, cssProperty, tokensCss } from '../src/tokens'
import { AA_BODY, contrast } from './wcag'

/**
 * tokens.css parity. The fixture is the `.dark` block of arano-ran frontend/app/globals.css at 0ccc0d56f, copied
 * verbatim (see test/fixtures/README.md). Every generated variable must equal today's value, in today's order,
 * so a product that swaps its own block for this file renders the same.
 */
const FIXTURE = readFileSync(join(__dirname, 'fixtures/arano-ran-globals-dark.css'), 'utf8')

function declarations(css: string): [string, string][] {
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const block = /\.dark\s*\{([\s\S]*?)\}/.exec(body)
  expect(block, 'a .dark rule').not.toBeNull()
  return [...(block as RegExpExecArray)[1]!.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()])
}

describe('tokens.css', () => {
  it('declares exactly the dark set arano-ran ships today: same variables, order and values', () => {
    const today = declarations(FIXTURE)
    expect(today).toHaveLength(33)
    expect(declarations(tokensCss())).toEqual(today)
  })

  it('is a single .dark rule and nothing else', () => {
    const rules = tokensCss().replace(/\/\*[\s\S]*?\*\//g, '').match(/[^{}]+\{/g) ?? []
    expect(rules.map((r) => r.trim())).toEqual(['.dark {'])
  })

  it('maps camelCase keys to their custom property', () => {
    expect(cssProperty('background')).toBe('--background')
    expect(cssProperty('mutedForegroundLight')).toBe('--muted-foreground-light')
    expect(cssProperty('shadow2xl')).toBe('--shadow-2xl')
    expect(cssProperty('shadowSm')).toBe('--shadow-sm')
  })
})

/**
 * THEME_DARK holds hand-rounded HSL channels, so they are tied back to the palette here: each colour that names a
 * palette entry decodes to within two RGB steps of it. `--primary-ink` is the widest (#157784 against
 * BRAND.onLight #157984). Not listed, because no palette hex exists for them: the border alphas, `--border-strong`,
 * `--primary-dark`, `--primary-light` and the shadows.
 */
describe('THEME_DARK against the palette', () => {
  const NAMES_PALETTE: Partial<Record<keyof typeof THEME_DARK, string>> = {
    background: NEUTRAL[950],
    foreground: NEUTRAL[100],
    muted: NEUTRAL[900],
    mutedForeground: NEUTRAL[500],
    mutedForegroundLight: NEUTRAL[400],
    mutedForegroundDark: NEUTRAL[600],
    card: NEUTRAL[900],
    cardForeground: NEUTRAL[100],
    popover: NEUTRAL[900],
    popoverForeground: NEUTRAL[100],
    primary: BRAND[500],
    primaryForeground: BRAND.ink,
    primaryInk: BRAND.onLight,
    secondary: NEUTRAL[900],
    secondaryForeground: NEUTRAL[100],
    accent: BRAND[500],
    accentForeground: BRAND.ink,
    ring: BRAND[500],
    success: STATE.validated,
    warning: STATE.warning,
    error: STATE.degraded,
    investigating: STATE.investigating,
  }

  function hslToRgb(channels: string): number[] {
    const [h, s, l] = channels.replace(/%/g, '').split(/\s+/).map(Number) as [number, number, number]
    const c = (1 - Math.abs((2 * l) / 100 - 1)) * (s / 100)
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = l / 100 - c / 2
    const [r, g, b] =
      h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
    return [r, g, b].map((v) => Math.round((v + m) * 255))
  }
  const hexToRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

  it('every colour that names a palette entry decodes to within two RGB steps of it', () => {
    for (const [key, hex] of Object.entries(NAMES_PALETTE) as [keyof typeof THEME_DARK, string][]) {
      const value = THEME_DARK[key]
      const steps = hslToRgb(value).map((v, i) => Math.abs(v - hexToRgb(hex)[i]!))
      expect(Math.max(...steps), `${cssProperty(key)}: ${value} against ${hex}`).toBeLessThanOrEqual(2)
    }
  })

  it('Steel (--border-strong) fails AA as body text on both grounds, so it stays on borders and icons', () => {
    const steel = '#' + hslToRgb(THEME_DARK.borderStrong).map((v) => v.toString(16).padStart(2, '0')).join('')
    expect(contrast(steel, NEUTRAL[900])).toBeLessThan(AA_BODY)
    expect(contrast(steel, NEUTRAL[950])).toBeLessThan(AA_BODY)
  })

  it('the border alphas are white, so they read on every surface tier', () => {
    for (const key of ['border', 'borderLight', 'borderDark'] as const) {
      expect(THEME_DARK[key], cssProperty(key)).toMatch(/^0 0% 100% \/ 0\.\d+$/)
    }
  })
})
