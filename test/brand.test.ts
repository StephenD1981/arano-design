import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BRAND_FILES, MARK, RING } from '../src/brand'
import { BRAND } from '../src/tokens'

/** The SVG files in brand/ (copied from arano-ran frontend/public) and the MARK description must agree. */
const svg = (file: string) => readFileSync(join(__dirname, '..', 'brand', file), 'utf8')

describe('brand files', () => {
  it.each(Object.values(BRAND_FILES))('%s draws the master A from MARK, in Signal Cyan', (file) => {
    const text = svg(file)
    expect([...text.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1])).toEqual([...MARK.paths])
    expect(text).toContain(`viewBox="${MARK.viewBox}"`)
    expect(text).toContain(`stroke-width="${MARK.strokeWidth}"`)
    expect(text).toContain(`stroke-linejoin="${MARK.strokeLinejoin}" stroke-linecap="${MARK.strokeLinecap}"`)
    const strokes = [...text.matchAll(/stroke="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1])
    expect(strokes.length, 'at least one stroke colour').toBeGreaterThan(0)
    expect(strokes.every((c) => c === BRAND[500])).toBe(true)
    expect(text).toMatch(/role="img" aria-label="ARANO/)
  })

  it('the ring file draws RING', () => {
    const circle = /<circle ([^>]+)\/>/.exec(svg(BRAND_FILES.symbolRing))?.[1] ?? ''
    expect(circle, 'the ring has a circle').not.toBe('')
    expect(circle).toContain(`cx="${RING.cx}" cy="${RING.cy}" r="${RING.r}"`)
    expect(circle).toContain(`stroke-width="${RING.strokeWidth}" stroke-dasharray="${RING.dasharray}"`)
    expect(circle).toContain(`transform="rotate(${RING.rotate} 50 50)"`)
  })
})
