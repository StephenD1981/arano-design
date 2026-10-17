import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * tools/css-parity.mjs is the gate a consumer runs on upgrade. A gate must fail closed: an empty side, a different
 * file count, or any change beyond an @font-face src URL is a FAIL with a non-zero exit.
 */
const TOOL = join(__dirname, '..', 'tools', 'css-parity.mjs')
const POSTCSS = createRequire(import.meta.url).resolve('postcss')
const LIGHT_THEN_DARK = ':root{--background:40 20% 99%}.dark{--background:210 22% 3.5%}'
const FACE = (url: string) => `@font-face{font-family:Geist;font-weight:400;src:url(${url}) format("woff2")}`

function dir(files: Record<string, string>): string {
  const d = mkdtempSync(join(tmpdir(), 'css-parity-'))
  for (const [name, css] of Object.entries(files)) {
    mkdirSync(join(d, name, '..'), { recursive: true })
    writeFileSync(join(d, name), css)
  }
  return d
}

function gate(before: string, after: string, postcssPath = POSTCSS): { status: number | null; verdict: string } {
  const out = mkdtempSync(join(tmpdir(), 'css-parity-out-'))
  const run = spawnSync(process.execPath, [TOOL, postcssPath, before, after, out], { encoding: 'utf8' })
  const file = join(out, 'gate.txt')
  const verdict = existsSync(file) ? (readFileSync(file, 'utf8').split('\n').find((l) => l.startsWith('VERDICT')) ?? '') : '(no gate.txt)'
  return { status: run.status, verdict }
}

describe('css-parity gate', () => {
  const base = { 'a.css': LIGHT_THEN_DARK + FACE('/media/1.woff2'), 'b.css': '.x{color:red}' }

  it('passes identical builds', () => {
    expect(gate(dir(base), dir(base))).toEqual({ status: 0, verdict: expect.stringContaining('PASS') })
  })

  it('passes when only an @font-face src URL changed', () => {
    const after = { ...base, 'a.css': LIGHT_THEN_DARK + FACE('/media/2.woff2') }
    expect(gate(dir(base), dir(after)).status).toBe(0)
  })

  it('fails a changed value', () => {
    const after = { ...base, 'b.css': '.x{color:blue}' }
    expect(gate(dir(base), dir(after))).toEqual({ status: 1, verdict: expect.stringContaining('beyond @font-face src URLs') })
  })

  it('fails closed when both sides are empty', () => {
    const empty = mkdtempSync(join(tmpdir(), 'css-parity-empty-'))
    mkdirSync(join(empty, 'sub'))
    expect(gate(empty, empty)).toEqual({ status: 1, verdict: expect.stringContaining('no .css files in BEFORE') })
  })

  it('fails when the file count differs, even if every rule is still present', () => {
    const merged = { 'a.css': base['a.css'] + base['b.css'] }
    expect(gate(dir(base), dir(merged))).toEqual({ status: 1, verdict: expect.stringContaining('file count differs') })
  })

  it('fails when the dark set moves before the light block, which sorted rules alone would hide', () => {
    const after = { ...base, 'a.css': '.dark{--background:210 22% 3.5%}:root{--background:40 20% 99%}' + FACE('/media/1.woff2') }
    expect(gate(dir(base), dir(after))).toEqual({ status: 1, verdict: expect.stringContaining('cascade order changed') })
  })

  it('fails closed when either side has files but no rules', () => {
    const blank = { 'a.css': '/* nothing */' }
    expect(gate(dir(blank), dir(blank))).toEqual({ status: 1, verdict: expect.stringContaining('no rules') })
  })

  it('fails when BEFORE and AFTER are the same directory', () => {
    const d = dir(base)
    expect(gate(d, d)).toEqual({ status: 1, verdict: expect.stringContaining('same directory') })
  })

  it('reads nested .css files, so a change in a subdirectory is caught', () => {
    const before = { ...base, 'chunks/c.css': '.y{color:red}' }
    const after = { ...base, 'chunks/c.css': '.y{color:blue}' }
    expect(gate(dir(before), dir(after))).toEqual({ status: 1, verdict: expect.stringContaining('beyond @font-face src URLs') })
  })

  it('fails when a light/dark pair inside @layer swaps order', () => {
    const layered = (css: string) => ({ ...base, 'a.css': `@layer base{${css}}` + FACE('/media/1.woff2') })
    const before = layered(':root{--background:0}.dark{--background:1}')
    const after = layered('.dark{--background:1}:root{--background:0}')
    expect(gate(dir(before), dir(after))).toEqual({ status: 1, verdict: expect.stringContaining('cascade order changed') })
  })

  it('fails when a .dark rule in a selector list swaps order with its light block', () => {
    const before = { ...base, 'a.css': ':root{--background:0}.dark,.theme-dark{--background:1}' }
    const after = { ...base, 'a.css': '.dark,.theme-dark{--background:1}:root{--background:0}' }
    expect(gate(dir(before), dir(after))).toEqual({ status: 1, verdict: expect.stringContaining('cascade order changed') })
  })

  it('fails when the dark set and its light block end up in different files, where order is unknowable', () => {
    const before = { 'a.css': LIGHT_THEN_DARK, 'b.css': '.x{color:red}' }
    const after = { 'a.css': ':root{--background:40 20% 99%}', 'b.css': '.dark{--background:210 22% 3.5%}.x{color:red}' }
    expect(gate(dir(before), dir(after))).toEqual({ status: 1, verdict: expect.stringContaining('cannot be established') })
  })

  it('fails when a .dark rule in BEFORE has no light block to order against', () => {
    const before = { ...base, 'a.css': '.dark{--background:1}' }
    expect(gate(dir(before), dir(before)).verdict).toContain('cannot be established')
  })

  it('fails a reordering of ordinary rules that sorting alone would hide', () => {
    const before = { ...base, 'b.css': '.x{color:red}.x{color:blue}' }
    const after = { ...base, 'b.css': '.x{color:blue}.x{color:red}' }
    expect(gate(dir(before), dir(after))).toEqual({ status: 1, verdict: expect.stringContaining('rule order changed') })
  })

  it('leaves a FAIL verdict behind if it crashes part way', () => {
    const run = gate(dir(base), dir(base), '/nonexistent/postcss')
    expect(run.status).not.toBe(0)
    expect(run.verdict).toMatch(/^VERDICT: FAIL/)
  })
})
