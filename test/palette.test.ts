import { describe, expect, it } from 'vitest'
import { BRAND, CHART, NEUTRAL, SECTOR, SEVERITY, STATE, SURFACE, seriesColour } from '../src/tokens'
import { AA_BODY, contrast } from './wcag'

/**
 * The palette contract, moved from arano-ran test/palette-contract.test.ts. The contrast assertions are the part
 * that makes the brand un-regressable: they would have caught text-gray-500 sitting at 3.80:1.
 */
const GRAPHITE = NEUTRAL[900]
const BLACK = NEUTRAL[950]

describe('palette', () => {
  it('the retired brand blue appears nowhere', () => {
    const all = JSON.stringify({ BRAND, NEUTRAL, STATE, SEVERITY, CHART, SURFACE, SECTOR }).toLowerCase()
    expect(all).not.toContain('2d7aff')
    expect(all).not.toContain('5b9aff')
  })

  it('the neutral text tier clears WCAG AA on both grounds', () => {
    for (const key of [50, 100, 200, 300, 400, 500, 600] as const) {
      expect(contrast(NEUTRAL[key], GRAPHITE), `gray-${key} on Graphite`).toBeGreaterThanOrEqual(AA_BODY)
      expect(contrast(NEUTRAL[key], BLACK), `gray-${key} on ARANO Black`).toBeGreaterThanOrEqual(AA_BODY)
    }
  })

  it('the neutral surface tier stays a surface, never mistaken for text', () => {
    for (const key of [700, 800, 900, 950] as const) {
      expect(contrast(NEUTRAL[key], GRAPHITE), `gray-${key}`).toBeLessThan(AA_BODY)
    }
  })

  it('Signal Cyan takes black ink, and has a usable light-context variant', () => {
    expect(contrast(BRAND.ink, BRAND[500])).toBeGreaterThanOrEqual(7)
    // the reason onLight exists at all
    expect(contrast(BRAND[500], '#FFFFFF')).toBeLessThan(AA_BODY)
    expect(contrast(BRAND.onLight, '#FFFFFF')).toBeGreaterThanOrEqual(AA_BODY)
  })

  it('every chart series colour is distinct, and seriesColour cycles through them', () => {
    expect(new Set(CHART.series).size).toBe(CHART.series.length)
    expect(seriesColour(0)).toBe(CHART.series[0])
    expect(seriesColour(CHART.series.length)).toBe(CHART.series[0])
    expect(seriesColour(-1)).toBe(CHART.series[1])
    for (const odd of [1.5, Number.NaN, Number.POSITIVE_INFINITY, -2.9]) expect(CHART.series, String(odd)).toContain(seriesColour(odd))
    expect(seriesColour(1.9)).toBe(CHART.series[1])
  })

  it('every value is a full six-digit hex, so string maths on it is safe', () => {
    const { border, borderStrong, ...surfaceTiers } = SURFACE
    const values = [
      ...Object.values(NEUTRAL),
      ...Object.values(BRAND),
      ...Object.values(STATE),
      ...Object.values(SEVERITY),
      ...Object.values(surfaceTiers),
      ...CHART.series,
      ...SECTOR,
    ]
    for (const v of values) expect(v, v).toMatch(/^#[0-9A-Fa-f]{6}$/)
    // The two hairlines are white at an alpha, the only non-hex SURFACE entries.
    expect([border, borderStrong]).toEqual(['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.12)'])
  })
})
