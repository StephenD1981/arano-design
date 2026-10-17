import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import postcss from 'postcss'
import { describe, expect, it } from 'vitest'
import { FONT_FAMILIES, FONT_ROLES, SUBSETS, UNICODE_RANGES, fontFaceCss, fontFaces } from '../src/fonts'

/**
 * Font parity. The fixture is the CSS next/font/google emitted for arano-ran at 0ccc0d56f (see
 * test/fixtures/README.md). The package must declare the same faces: families, weights, styles, display and
 * unicode ranges, one Geist file per subset across all weights, and the same fallback metrics. Only the file URLs
 * may differ.
 */
const require = createRequire(import.meta.url)
const GOOGLE = postcss.parse(readFileSync(join(__dirname, 'fixtures/arano-ran-next-font-google.css'), 'utf8'))

const unquote = (v: string) => v.replace(/["']/g, '').trim()

/** Unicode ranges as sorted [start, end] intervals, so `u+00??` and `U+0000-00FF` compare equal. */
function intervals(range: string): string {
  return range
    .split(',')
    .map((part) => {
      const p = part.trim().toUpperCase().replace(/^U\+/, '')
      if (p.includes('?')) return [parseInt(p.replace(/\?/g, '0'), 16), parseInt(p.replace(/\?/g, 'F'), 16)]
      const [a, b = a] = p.split('-') as [string, string?]
      return [parseInt(a, 16), parseInt(b, 16)]
    })
    .sort((x, y) => x[0]! - y[0]!)
    .map(([a, b]) => `${a}-${b}`)
    .join(',')
}

interface Face { family: string; weight: string; style: string; display: string; range: string; src: string }

function faces(root: postcss.Root): { faces: Face[]; fallbacks: Record<string, Record<string, string>> } {
  const out: Face[] = []
  const fallbacks: Record<string, Record<string, string>> = {}
  root.walkAtRules('font-face', (rule) => {
    const d: Record<string, string> = {}
    rule.walkDecls((decl) => { d[decl.prop] = decl.value })
    const family = unquote(d['font-family']!)
    if (family.endsWith(' Fallback')) {
      fallbacks[family] = d
      return
    }
    out.push({ family, weight: d['font-weight']!, style: d['font-style']!, display: d['font-display']!, range: intervals(d['unicode-range']!), src: d.src! })
  })
  return { faces: out, fallbacks }
}

const key = (f: Face) => `${f.family}|${f.weight}|${f.style}|${f.display}|${f.range}`

describe('fonts against what next/font/google served arano-ran', () => {
  const google = faces(GOOGLE)
  const ours = faces(postcss.parse(fontFaceCss()))

  it('declares the same faces: family, weight, style, display and unicode range', () => {
    expect(google.faces).toHaveLength(40)
    expect(ours.faces.map(key).sort()).toEqual(google.faces.map(key).sort())
  })

  it('declares them in the same order', () => {
    expect(ours.faces.map(key)).toEqual(google.faces.map(key))
  })

  it('uses one Geist file per subset for every weight, as Google does', () => {
    for (const set of [google.faces, ours.faces]) {
      const byRange = new Map<string, Set<string>>()
      for (const f of set.filter((x) => x.family === 'Geist')) byRange.set(f.range, (byRange.get(f.range) ?? new Set()).add(f.src))
      expect([...byRange.values()].map((s) => s.size)).toEqual([1, 1, 1, 1, 1])
    }
  })

  it("keeps Google's precalculated fallback metrics", () => {
    const strip = (d: Record<string, string>) => ({ ...d, 'font-family': unquote(d['font-family']!) })
    expect(Object.keys(ours.fallbacks).sort()).toEqual(['Geist Fallback', 'IBM Plex Mono Fallback'])
    for (const name of Object.keys(google.fallbacks)) expect(strip(ours.fallbacks[name]!)).toEqual(strip(google.fallbacks[name]!))
  })
})

describe('font files', () => {
  const SOURCES: Record<string, string> = { geist: '@fontsource-variable/geist', 'ibm-plex-mono': '@fontsource/ibm-plex-mono' }
  const pkgDir = (dir: string) => dirname(require.resolve(`${SOURCES[dir]}/package.json`))

  it('every declared face exists in its pinned @fontsource package', () => {
    for (const face of fontFaces()) {
      const [dir, file] = face.path.split('/') as [string, string]
      expect(existsSync(join(pkgDir(dir), 'files', file)), face.path).toBe(true)
    }
  })

  it("differs from fontsource's unicode.json only where Google has moved on (latin-ext to U+20C4)", () => {
    for (const dir of Object.keys(SOURCES)) {
      const theirs = JSON.parse(readFileSync(join(pkgDir(dir), 'unicode.json'), 'utf8')) as Record<string, string>
      const changed = SUBSETS.filter((s) => intervals(theirs[s]!) !== intervals(UNICODE_RANGES[s]))
      expect(changed, dir).toEqual(['latin-ext'])
      expect(theirs['latin-ext']!.replace('U+20AD-20C0', 'U+20AD-20C4')).toBe(UNICODE_RANGES['latin-ext'])
    }
  })

  it('ships each family under the SIL Open Font Licence', () => {
    for (const dir of Object.keys(SOURCES)) {
      expect(readFileSync(join(pkgDir(dir), 'LICENSE'), 'utf8')).toContain('SIL OPEN FONT LICENSE Version 1.1')
    }
  })
})

describe('fontFaceCss', () => {
  it('declares the role variables on :root only when asked', () => {
    expect(fontFaceCss()).not.toContain(':root')
    const root = postcss.parse(fontFaceCss({ rootVariables: true }))
    const vars: Record<string, string> = {}
    root.walkRules(':root', (r) => r.walkDecls((d) => { vars[d.prop] = d.value }))
    expect(vars).toEqual({
      '--font-display': "'Geist', 'Geist Fallback'",
      '--font-sans': "'Geist', 'Geist Fallback'",
      '--font-mono': "'IBM Plex Mono', 'IBM Plex Mono Fallback'",
    })
    expect(Object.keys(FONT_ROLES)).toEqual(['display', 'sans', 'mono'])
  })

  it('can leave the latin faces to next/font/local and still declare the fallbacks', () => {
    const next = faces(postcss.parse(fontFaceCss({ subsets: SUBSETS.filter((s) => s !== 'latin') })))
    expect(next.faces.some((f) => f.range === intervals(UNICODE_RANGES.latin))).toBe(false)
    expect(next.faces).toHaveLength(32)
    expect(Object.keys(next.fallbacks)).toHaveLength(2)
  })

  it('covers the weights the products use', () => {
    expect(FONT_FAMILIES.geist.weights).toEqual([300, 400, 500, 600, 700])
    expect(FONT_FAMILIES.ibmPlexMono.weights).toEqual([400, 500, 600])
  })
})
