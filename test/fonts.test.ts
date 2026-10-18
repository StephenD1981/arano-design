import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import postcss from 'postcss'
import { describe, expect, it } from 'vitest'
import { FONT_FAMILIES, FONT_ROLES, SUBSETS, UNICODE_RANGES, fontFaceCss, fontFaces } from '../src/fonts'

/**
 * Font parity. The fixture is the CSS next/font/google emitted for arano-ran at 0ccc0d56f (see
 * test/fixtures/README.md). The package must declare the same faces: families, weights, styles, display and
 * unicode ranges, one Geist file per subset across all weights, and the same fallback metrics. Only the file URLs
 * may differ.
 */
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

/**
 * SHA-256 of every shipped font file: the bytes Google Fonts served on 2026-10-17 (R17; provenance in
 * font-files/README.md). Changing a file is a minor release and must change this table in the same pull request.
 */
const FONT_SHA256: Record<string, string> = {
  'geist/geist-cyrillic-ext-wght-normal.woff2': 'b7a545bbb08256bd809f11cfe66d88da3e22d169ea4407737b1ef0ec1ed3d791',
  'geist/geist-cyrillic-wght-normal.woff2': '6129fc8571c3e0cb0a4c41f5160c974a843b055009dc4ad8858bd808e18a2d86',
  'geist/geist-vietnamese-wght-normal.woff2': 'f689f638f29fff460a2d5749edb5d5c38d7bef0389f32032d871f23fc6ebb008',
  'geist/geist-latin-ext-wght-normal.woff2': '58a6b173d5ca1dec92166ea3c6cb1a84a4144556d10928ac14e8e6b40e4787bd',
  'geist/geist-latin-wght-normal.woff2': '9b6f5ff45b278c744b5f379a2c4ecbaf858a842b8eaf82ac8d21b699ca16c608',
  'ibm-plex-mono/ibm-plex-mono-cyrillic-ext-400-normal.woff2': 'c6f09ee0e0a24b7c85ecb2a601eb99332f65b1f6b37c31e0bbe73fb307625eca',
  'ibm-plex-mono/ibm-plex-mono-cyrillic-400-normal.woff2': '7b59d6bf7f8b8408ac28f27d01dca9a890abeae77045d343b1d8ccb089a92e54',
  'ibm-plex-mono/ibm-plex-mono-vietnamese-400-normal.woff2': '0a8b854cc18641bd1b8222afa7ec82a75e59bc6501f777744ec87db1b6cd7a2c',
  'ibm-plex-mono/ibm-plex-mono-latin-ext-400-normal.woff2': 'f1050dc5317b43434c0aeda599d4624c774ffc162e87a8cf204b949b6a85816d',
  'ibm-plex-mono/ibm-plex-mono-latin-400-normal.woff2': 'c36f509c0a8f9f85f29cb44bc8701d8a9e0b14c499e77a884f789ead7093a7ac',
  'ibm-plex-mono/ibm-plex-mono-cyrillic-ext-500-normal.woff2': '311098be73eac339128f0b5a6e33d72645b6f87488541fdf467c402152d297fd',
  'ibm-plex-mono/ibm-plex-mono-cyrillic-500-normal.woff2': 'd524dc8ff6dbf7ed69772f3b2ff4affaf5a89b5762b270e36c3f21da0d4e39f5',
  'ibm-plex-mono/ibm-plex-mono-vietnamese-500-normal.woff2': 'b2529fba93fd07a50ffb8fc3d103eb04b0c298d4f6564d2833c44fde286de7e4',
  'ibm-plex-mono/ibm-plex-mono-latin-ext-500-normal.woff2': '77f03e26f981c582bdba3a7abed4baa2d3149211c01366bb3ab3ba7622ec4ae5',
  'ibm-plex-mono/ibm-plex-mono-latin-500-normal.woff2': 'a76f53ca6612e7b3828eec2311098675b7f9849ae4169a8bcef6302aec02a6c0',
  'ibm-plex-mono/ibm-plex-mono-cyrillic-ext-600-normal.woff2': 'f746246b6b0b641f99d9e26e0bf4e42197bde692126857857f0195a94362d52a',
  'ibm-plex-mono/ibm-plex-mono-cyrillic-600-normal.woff2': 'b814a03d7e57b0626a906f76911b9361d173a1aabc5544c40f72d6a35a1e4940',
  'ibm-plex-mono/ibm-plex-mono-vietnamese-600-normal.woff2': '69744cabbccc9faf77516ce9b744361e1e6be7f8081400006035a153797d2965',
  'ibm-plex-mono/ibm-plex-mono-latin-ext-600-normal.woff2': '1b6b18fd0fd240bc6d5850f4df621484722d4b5d3650ebdd1e3a8bbd81c75854',
  'ibm-plex-mono/ibm-plex-mono-latin-600-normal.woff2': 'ad4580d8cb4b5f627c2d18457656732f7f7b070f7837fbc380e08054157e6f6c',
}

describe('font files', () => {
  const SOURCE = join(__dirname, '..', 'font-files')
  const sha256 = (path: string) => createHash('sha256').update(readFileSync(join(SOURCE, path))).digest('hex')

  it('holds exactly the 20 declared faces, each file once, and nothing else', () => {
    const declared = [...new Set(fontFaces().map((f) => f.path))].sort()
    const present = Object.values(FONT_FAMILIES)
      .flatMap((f) => readdirSync(join(SOURCE, f.dir)).filter((n) => n.endsWith('.woff2')).map((n) => `${f.dir}/${n}`))
      .sort()
    expect(declared).toHaveLength(20)
    expect(present).toEqual(declared)
    expect(Object.keys(FONT_SHA256).sort()).toEqual(declared)
  })

  it.each(Object.entries(FONT_SHA256))('%s is the pinned Google file', (path, hash) => {
    expect(sha256(path)).toBe(hash)
  })

  it('ships each family under the SIL Open Font Licence', () => {
    for (const f of Object.values(FONT_FAMILIES)) {
      expect(readFileSync(join(SOURCE, f.dir, 'OFL.txt'), 'utf8')).toContain('SIL OPEN FONT LICENSE Version 1.1')
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
