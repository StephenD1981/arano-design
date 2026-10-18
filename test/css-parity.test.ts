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

function run(before: string, after: string, extra: string[] = [], postcssPath = POSTCSS): { status: number | null; verdict: string; report: string } {
  const out = mkdtempSync(join(tmpdir(), 'css-parity-out-'))
  const proc = spawnSync(process.execPath, [TOOL, postcssPath, before, after, out, ...extra], { encoding: 'utf8' })
  const file = join(out, 'gate.txt')
  const report = existsSync(file) ? readFileSync(file, 'utf8') : '(no gate.txt)'
  return { status: proc.status, verdict: report.split('\n').find((l) => l.startsWith('VERDICT')) ?? '', report }
}

function gate(before: string, after: string, postcssPath = POSTCSS): { status: number | null; verdict: string } {
  const { status, verdict } = run(before, after, [], postcssPath)
  return { status, verdict }
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

/**
 * R18 (2026-10-18): the named next/font allowances. Each must pass when it is the only difference, still fail when
 * one unrelated change rides along, and be reported as "ALLOWED (R18 ...)" rather than dropped silently.
 */
describe('css-parity gate: R18 allowances', () => {
  const face = (n: number, weight: number) => `@font-face{font-family:Geist;font-style:normal;font-weight:${weight};src:url(/media/${n}.woff2) format("woff2")}`
  const classes = (hash: string, className = `font-family:Geist,Geist Fallback;font-style:normal`) =>
    `.__variable_${hash}{--font-sans:"Geist","Geist Fallback"}.__className_${hash}{${className}}`
  const APP = LIGHT_THEN_DARK + '.x{color:red}.text-gray-500{color:#6b7280}'
  const FONTS = face(1, 400) + face(2, 500) + classes('1297e7')
  const base = { 'app.css': APP, 'font.css': FONTS }
  const UNRELATED = { 'app.css': APP.replace('color:red', 'color:blue') }
  const allowedLines = (report: string) => report.split('\n').filter((l) => l.includes('ALLOWED (R18'))

  /** Each allowance, alone: the AFTER build and the extra arguments that exercise it. */
  const CASES: Record<string, { after: Record<string, string>; args?: string[]; tag: string }> = {
    'a: next/font class hash renamed': { after: { ...base, 'font.css': face(1, 400) + face(2, 500) + classes('aa62b7') }, tag: 'R18 a' },
    'b: font-style:normal missing on .__className_': {
      after: { ...base, 'font.css': face(1, 400) + face(2, 500) + classes('1297e7', 'font-family:Geist,Geist Fallback') },
      tag: 'R18 b',
    },
    'c: @font-face order changed': { after: { ...base, 'font.css': face(2, 500) + face(1, 400) + classes('1297e7') }, tag: 'R18 c' },
    'd: font rules moved into another file, so the file count changed': { after: { 'app.css': FONTS + APP }, tag: 'R18 d' },
    'd: font rules split across more files': {
      after: { 'app.css': APP, 'f1.css': face(1, 400), 'f2.css': face(2, 500) + classes('1297e7') },
      tag: 'R18 d',
    },
    'e: a named dead utility removed': {
      after: { ...base, 'app.css': APP.replace('.text-gray-500{color:#6b7280}', '') },
      args: ['--allow-removed', '.text-gray-500'],
      tag: 'R18 e',
    },
  }

  it.each(Object.entries(CASES))('passes %s, and reports it', (_, c) => {
    const r = run(dir(base), dir(c.after), c.args)
    expect(r.status, r.report).toBe(0)
    expect(r.verdict).toContain('PASS')
    expect(allowedLines(r.report).join('\n')).toContain(`ALLOWED (${c.tag})`)
  })

  it.each(Object.entries(CASES))('still fails %s combined with one unrelated change', (_, c) => {
    const after = { ...c.after, ...(c.after['app.css'] ? { 'app.css': c.after['app.css'].replace('color:red', 'color:blue') } : UNRELATED) }
    const r = run(dir(base), dir(after), c.args)
    expect(r.status, r.report).toBe(1)
    expect(r.verdict).toContain('FAIL')
  })

  it('passes every allowance at once, as an upgrade from next/font/google to next/font/local looks', () => {
    const after = {
      'app.css': APP.replace('.text-gray-500{color:#6b7280}', ''),
      'f1.css': face(2, 500),
      'f2.css': classes('aa62b7', 'font-family:Geist,Geist Fallback') + face(1, 400),
    }
    const r = run(dir(base), dir(after), ['--allow-removed', '.text-gray-500'])
    expect(r.status, r.report).toBe(0)
    expect(allowedLines(r.report).length).toBeGreaterThanOrEqual(4)
  })

  it('reports nothing as allowed when the builds are identical', () => {
    const r = run(dir(base), dir(base))
    expect(r.status).toBe(0)
    expect(allowedLines(r.report)).toEqual([])
  })

  it('fails a hash rename whose declarations changed beyond font-style', () => {
    const after = { ...base, 'font.css': face(1, 400) + face(2, 500) + classes('aa62b7', 'font-family:Inter,Geist Fallback;font-style:normal') }
    expect(run(dir(base), dir(after)).status).toBe(1)
  })

  it('fails a hash rename whose custom property changed', () => {
    const after = { ...base, 'font.css': face(1, 400) + face(2, 500) + classes('aa62b7').replace('--font-sans', '--font-display') }
    expect(run(dir(base), dir(after)).status).toBe(1)
  })

  it('fails a font-style change other than a missing or added normal', () => {
    const after = { ...base, 'font.css': face(1, 400) + face(2, 500) + classes('1297e7', 'font-family:Geist,Geist Fallback;font-style:italic') }
    expect(run(dir(base), dir(after)).status).toBe(1)
  })

  it('fails font-style:normal removed from any rule that is not .__className_', () => {
    const before = { ...base, 'app.css': APP + '.y{font-family:Geist;font-style:normal}' }
    const after = { ...base, 'app.css': APP + '.y{font-family:Geist}' }
    expect(run(dir(before), dir(after)).status).toBe(1)
  })

  it('fails font-style:normal removed from a .__variable_ rule', () => {
    const before = { ...base, 'font.css': face(1, 400) + face(2, 500) + '.__variable_1297e7{--font-sans:Geist;font-style:normal}' }
    const after = { ...base, 'font.css': face(1, 400) + face(2, 500) + '.__variable_1297e7{--font-sans:Geist}' }
    expect(run(dir(before), dir(after)).status).toBe(1)
  })

  it('fails a changed @font-face descriptor, even when the faces are also reordered', () => {
    const after = { ...base, 'font.css': face(2, 600) + face(1, 400) + classes('1297e7') }
    expect(run(dir(base), dir(after)).status).toBe(1)
  })

  it('fails an extra @font-face rule', () => {
    const after = { ...base, 'font.css': FONTS + face(3, 700) }
    expect(run(dir(base), dir(after)).status).toBe(1)
  })

  it('fails a rule that only looks like next/font (a selector list or a descendant)', () => {
    const before = { ...base, 'font.css': FONTS + '.__className_1297e7 .y{color:red}' }
    const after = { ...base, 'font.css': FONTS + '.__className_aa62b7 .y{color:red}' }
    expect(run(dir(before), dir(after)).status).toBe(1)
  })

  it('fails when a non-font rule moves between files alongside the font rules', () => {
    const after = { 'app.css': LIGHT_THEN_DARK + '.text-gray-500{color:#6b7280}', 'font.css': FONTS + '.x{color:red}' }
    expect(run(dir(base), dir(after)).status).toBe(1)
  })

  it('fails when a file of other rules is split, even though every rule is still present', () => {
    const after = { 'app.css': LIGHT_THEN_DARK, 'b.css': '.x{color:red}.text-gray-500{color:#6b7280}', 'font.css': FONTS }
    expect(run(dir(base), dir(after))).toMatchObject({ status: 1, verdict: expect.stringContaining('file count differs') })
  })

  it('fails a removal that is not named on the command line', () => {
    const after = { ...base, 'app.css': APP.replace('.text-gray-500{color:#6b7280}', '') }
    expect(run(dir(base), dir(after)).status).toBe(1)
  })

  it('fails --allow-removed with no selector', () => {
    const after = { ...base, 'app.css': APP.replace('.text-gray-500{color:#6b7280}', '') }
    for (const args of [['--allow-removed'], ['--allow-removed', ''], ['--allow-removed', '--allow-removed', '.text-gray-500']]) {
      const r = run(dir(base), dir(after), args)
      expect(r.status, args.join(' ')).toBe(1)
      expect(r.verdict).toContain('--allow-removed needs a selector')
    }
  })

  it('fails --allow-removed with a wildcard or a selector list', () => {
    const after = { ...base, 'app.css': APP.replace('.text-gray-500{color:#6b7280}', '') }
    for (const sel of ['.text-gray-*', '*', '.text-gray-500,.x']) {
      expect(run(dir(base), dir(after), ['--allow-removed', sel]).verdict, sel).toContain('no wildcard or list')
    }
  })

  it('fails --allow-removed naming a selector that was not removed', () => {
    const still = run(dir(base), dir(base), ['--allow-removed', '.text-gray-500'])
    expect(still).toMatchObject({ status: 1, verdict: expect.stringContaining('was not removed as one rule (1 in BEFORE, 1 in AFTER)') })
    const never = run(dir(base), dir({ ...base, 'b.css': '' }), ['--allow-removed', '.never-there'])
    expect(never).toMatchObject({ status: 1, verdict: expect.stringContaining('was not removed as one rule (0 in BEFORE') })
  })

  it('fails --allow-removed when the named selector was more than one rule', () => {
    const before = { ...base, 'app.css': APP + '@media (min-width:640px){.text-gray-500{color:#000}}' }
    const after = { ...base, 'app.css': LIGHT_THEN_DARK + '.x{color:red}' }
    expect(run(dir(before), dir(after), ['--allow-removed', '.text-gray-500']).verdict).toContain('(2 in BEFORE, 0 in AFTER)')
  })

  it('still fails an empty side and the same directory twice, whatever is allowed', () => {
    const empty = mkdtempSync(join(tmpdir(), 'css-parity-empty-'))
    const args = ['--allow-removed', '.text-gray-500']
    expect(run(empty, dir(base), args)).toMatchObject({ status: 1, verdict: expect.stringContaining('no .css files in BEFORE') })
    expect(run(dir(base), empty, args)).toMatchObject({ status: 1, verdict: expect.stringContaining('no .css files in AFTER') })
    const d = dir(base)
    expect(run(d, d)).toMatchObject({ status: 1, verdict: expect.stringContaining('same directory') })
    expect(run(d, d, args)).toMatchObject({ status: 1, verdict: expect.stringContaining('same directory') })
  })
})
