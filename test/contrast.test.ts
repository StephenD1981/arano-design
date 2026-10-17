import { describe, expect, it } from 'vitest'
import { BRAND, CHART, NEUTRAL, SECTOR, STATE } from '../src/tokens'
import { AA_BODY, contrast } from './wcag'

/**
 * Every foreground / background pair the palette documents a ratio for, checked two ways: the measured WCAG 2.1
 * ratio still matches the documented figure (so the comments cannot rot), and it clears AA for body text. The one
 * pair that must FAIL AA is Signal Cyan on white: it is why BRAND.onLight exists, and cyan on white uses onLight.
 */
const GRAPHITE = NEUTRAL[900]
const BLACK = NEUTRAL[950]
const WHITE = '#FFFFFF'

type Pair = [name: string, fg: string, bg: string, documented: number]

const NEUTRAL_TEXT: [key: keyof typeof NEUTRAL, onGraphite: number, onBlack: number][] = [
  [50, 16.97, 18.43],
  [100, 15.45, 16.78],
  [200, 13.02, 14.13],
  [300, 10.29, 11.17],
  [400, 7.77, 8.43],
  [500, 6.07, 6.59],
  [600, 4.79, 5.2],
]
const SECTOR_RATIOS = [7.61, 7.46, 15.58, 7.61, 4.99, 9.21]
const CHART_RATIOS = [11.54, 8.74, 9.98, 5.15, 6.75, 9.87, 6.93, 7.77]

const TEXT_PAIRS: Pair[] = [
  ...NEUTRAL_TEXT.flatMap(([k, g, b]): Pair[] => [
    [`gray-${k} on Graphite`, NEUTRAL[k], GRAPHITE, g],
    [`gray-${k} on ARANO Black`, NEUTRAL[k], BLACK, b],
  ]),
  ['Signal Cyan on ARANO Black', BRAND[500], BLACK, 12.53],
  ['BRAND.onLight on white (light contexts: email, print, PDF)', BRAND.onLight, WHITE, 5.12],
  ['STATE.validated on Graphite', STATE.validated, GRAPHITE, 8.74],
  ['STATE.investigating on Graphite', STATE.investigating, GRAPHITE, 5.15],
  ['STATE.warning on Graphite', STATE.warning, GRAPHITE, 9.98],
  ['STATE.degraded on Graphite', STATE.degraded, GRAPHITE, 5.62],
  ...SECTOR.map((hex, i): Pair => [`SECTOR[${i}] on Graphite`, hex, GRAPHITE, SECTOR_RATIOS[i] as number]),
  ...CHART.series.map((hex, i): Pair => [`CHART.series[${i}] on Graphite`, hex, GRAPHITE, CHART_RATIOS[i] as number]),
]

describe('WCAG contrast of every documented pair', () => {
  it('documents a ratio for every sector and chart colour', () => {
    expect(SECTOR_RATIOS).toHaveLength(SECTOR.length)
    expect(CHART_RATIOS).toHaveLength(CHART.series.length)
  })

  it.each(TEXT_PAIRS)('%s measures as documented and clears AA', (_name, fg, bg, documented) => {
    const measured = contrast(fg, bg)
    expect(measured).toBeCloseTo(documented, 2)
    expect(measured).toBeGreaterThanOrEqual(AA_BODY)
  })

  it('Signal Cyan on white fails AA (1.59:1), which is why cyan on white uses BRAND.onLight', () => {
    expect(contrast(BRAND[500], WHITE)).toBeCloseTo(1.59, 2)
    expect(contrast(BRAND[500], WHITE)).toBeLessThan(AA_BODY)
  })

  it('Graphite on ARANO Black is 1.09:1, which is why card borders carry the edge', () => {
    expect(contrast(GRAPHITE, BLACK)).toBeCloseTo(1.09, 2)
  })

  it('Signal Cyan carries BLACK ink at AAA, never white', () => {
    expect(contrast(BRAND.ink, BRAND[500])).toBeGreaterThanOrEqual(7)
    expect(contrast(WHITE, BRAND[500])).toBeLessThan(AA_BODY)
  })
})
