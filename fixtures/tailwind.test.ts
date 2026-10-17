import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import tailwind4 from '@tailwindcss/postcss'
import postcss from 'postcss'
import { beforeAll, describe, expect, it } from 'vitest'
import { BRAND, NEUTRAL, SEVERITY, SURFACE } from '../src/tokens'

/**
 * The BUILT preset, compiled by real Tailwind 3.4 and Tailwind 4 (through @config), must GENERATE these utilities
 * with these values. A successful compile proves nothing: Tailwind silently emits nothing for an unknown key.
 */
const require = createRequire(import.meta.url)
const tailwind3 = require('tailwindcss-v3') as (config: string) => postcss.AcceptedPlugin

type Consumer = 'v3' | 'v3-esm' | 'v4'

async function compile(version: Consumer): Promise<postcss.Root> {
  const dir = join(__dirname, `tailwind-${version}`)
  const from = join(dir, 'input.css')
  const plugin =
    version === 'v3' ? tailwind3(join(dir, 'tailwind.config.cjs'))
    : version === 'v3-esm' ? tailwind3(join(dir, 'tailwind.config.mjs'))
    : tailwind4({ base: dir, optimize: false })
  const result = await postcss([plugin]).process(readFileSync(from, 'utf8'), { from })
  return postcss.parse(result.css)
}

/** The declarations of the rule for exactly `.selector`, wherever it sits (Tailwind 4 nests utilities in a layer). */
function decls(root: postcss.Root, selector: string): Record<string, string> {
  const out: Record<string, string> = {}
  root.walkRules((rule) => {
    if (rule.selector === selector) rule.walkDecls((d) => { out[d.prop] = d.value })
  })
  return out
}

/** A colour as uppercase hex, whether Tailwind wrote it as hex or as `rgb(r g b / var(--tw-...-opacity, 1))`. */
function hex(value: string | undefined): string {
  if (!value) return '(missing)'
  const rgb = /^rgb\((\d+) (\d+) (\d+)/.exec(value)
  if (rgb) return '#' + rgb.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase()
  return value.toUpperCase()
}

const families = (value: string | undefined) => (value ?? '(missing)').replace(/["']/g, '').replace(/,\s*/g, ',')

const COLOURS: [selector: string, prop: string, expected: string][] = [
  ['.bg-brand-500', 'background-color', BRAND[500]],
  ['.text-brand-ink', 'color', BRAND.ink],
  // the gray retarget: Tailwind's own gray-500 is #6B7280
  ['.text-gray-500', 'color', NEUTRAL[500]],
  ['.bg-gray-950', 'background-color', NEUTRAL[950]],
  ['.bg-surface-raised', 'background-color', SURFACE.raised],
  ['.text-severity-critical', 'color', SEVERITY.critical],
  ['.bg-severity-healthy', 'background-color', SEVERITY.healthy],
  ['.text-severity-moderate', 'color', SEVERITY.moderate],
]

const FONTS: [selector: string, expected: string][] = [
  ['.font-display', 'var(--font-display),Geist,sans-serif'],
  ['.font-sans', 'var(--font-sans),Geist,-apple-system,BlinkMacSystemFont,system-ui,sans-serif'],
  ['.font-mono', 'var(--font-mono),IBM Plex Mono,ui-monospace,SFMono-Regular,Menlo,monospace'],
]

describe.each(['v3', 'v3-esm', 'v4'] as const)('Tailwind %s consumer', (version) => {
  let root: postcss.Root
  beforeAll(async () => {
    root = await compile(version)
  })

  it('compiles the fixture', () => {
    expect(root.nodes.length).toBeGreaterThan(0)
  })

  it.each(COLOURS)('generates %s with the palette value', (selector, prop, expected) => {
    expect(hex(decls(root, selector)[prop])).toBe(expected.toUpperCase())
  })

  /**
   * The preset's keys are kebab-case, so every major generates the same class names for the camelCase constants:
   * `text-brand-on-light` and `bg-surface-border-strong`, never the camelCase spelling Tailwind 3.4 would keep.
   */
  it('generates the same kebab-case class names as every other major', () => {
    expect(hex(decls(root, '.text-brand-on-light').color)).toBe(BRAND.onLight.toUpperCase())
    expect(decls(root, '.bg-surface-border-strong')['background-color']?.replace(/\s/g, '')).toBe(SURFACE.borderStrong)
    expect(decls(root, '.text-brand-onLight')).toEqual({})
    expect(decls(root, '.bg-surface-borderStrong')).toEqual({})
  })

  it('generates the alpha hairline unchanged', () => {
    expect(decls(root, '.border-surface-border')['border-color']?.replace(/\s/g, '')).toBe(SURFACE.border)
  })

  it.each(FONTS)('generates %s from the role variable', (selector, expected) => {
    expect(families(decls(root, selector)['font-family'])).toBe(expected)
  })
})
