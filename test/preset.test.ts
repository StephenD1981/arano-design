import { describe, expect, it } from 'vitest'
import { BRAND, NEUTRAL, SEVERITY, SURFACE } from '../src/tokens'
import { FONT_FAMILY, aranoPreset } from '../src/tailwind-preset'

/**
 * Palette to preset. The preset is the palette, not a copy: a token change must reach the utilities. The font
 * stacks are arano-ran's tailwind.config.ts values at 0ccc0d56f, pinned literally so a change is deliberate.
 */
describe('Tailwind preset', () => {
  const { colors, fontFamily } = aranoPreset.theme.extend

  const kebab = (k: string) => k.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()

  it('carries the palette for gray, brand, surface and severity, value for value', () => {
    for (const [name, group] of [['gray', NEUTRAL], ['brand', BRAND], ['surface', SURFACE], ['severity', SEVERITY]] as const) {
      expect(colors[name], name).toEqual(Object.fromEntries(Object.entries(group).map(([k, v]) => [kebab(k), v])))
    }
  })

  it('keys every colour in kebab-case, so Tailwind 3.4 and 4 generate the same class names', () => {
    for (const group of Object.values(colors)) for (const key of Object.keys(group)) expect(key).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    expect(colors.brand?.['on-light']).toBe(BRAND.onLight)
    expect(colors.surface?.['border-strong']).toBe(SURFACE.borderStrong)
  })

  it('carries colour and font roles ONLY: no content, radius, shadow or ring', () => {
    expect(Object.keys(aranoPreset)).toEqual(['theme'])
    expect(Object.keys(aranoPreset.theme)).toEqual(['extend'])
    expect(Object.keys(aranoPreset.theme.extend).sort()).toEqual(['colors', 'fontFamily'])
    expect(Object.keys(colors).sort()).toEqual(['brand', 'gray', 'severity', 'surface'])
  })

  it('names fonts by role, through the loader variable first', () => {
    expect(fontFamily).toEqual({
      sans: ['var(--font-sans)', 'Geist', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      display: ['var(--font-display)', 'Geist', 'sans-serif'],
      mono: ['var(--font-mono)', 'IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
    })
    expect(fontFamily).toEqual(FONT_FAMILY)
  })

  it('hands each consumer its own copy, so a consumer mutating it cannot change the palette', () => {
    expect(colors.brand).not.toBe(BRAND)
    expect(fontFamily.sans).not.toBe(FONT_FAMILY.sans)
  })
})
