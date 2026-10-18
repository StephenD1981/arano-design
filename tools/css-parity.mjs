// Compiled-CSS parity gate: the check a consumer runs when it upgrades @arano/design (see README, "Upgrading").
//
// Usage: node tools/css-parity.mjs <postcss-module-path> <beforeDir> <afterDir> <outDir> [--allow-removed <selector>]...
// where beforeDir and afterDir are copies of a build's CSS output (for Next.js, .next/static/css) before and after.
// The tool is kept in this repository, not in the published package; a consumer copies it into its own tooling.
//
// Every .css file under each directory, at any depth, is parsed with postcss into one line per rule:
//   <at-rule context> || <selector or at-rule> { <declarations in source order> }
// Declarations keep their order inside ordinary rules (order can matter there). Inside @font-face, where descriptor
// order cannot matter, they are sorted. Values are compared exactly as compiled: no colour, quote or number rewriting.
//
// "Font rules" below are @font-face rules and next/font's generated class rules: a rule whose whole selector is
// `.__className_<hex>` or `.__variable_<hex>`. Ruling R18 (2026-10-18) tolerates these differences, and ONLY these;
// each one found is reported in gate.txt as "ALLOWED (R18): ...", never dropped silently:
//   a. a next/font class hash rename: font rules are compared with the hash replaced by a placeholder, so their
//      declarations must otherwise match, except (b);
//   b. a missing or added `font-style:normal` on a `.__className_<hex>` rule (no other declaration, no other rule);
//   c. the order of @font-face rules (as a multiset they must match; @font-face src url()s are normalised);
//   d. font rules moving between CSS files, including a change in the number of files, provided every file's other
//      rules are still identical, in order, to exactly one file on the other side (a file of only font rules may
//      appear or vanish);
//   e. the removal of a rule named on the command line with `--allow-removed <selector>`: one flag per rule, the
//      selector exact (no wildcard, no list), present as exactly one rule in BEFORE and absent from AFTER.
//
// Everything else FAILS, with a non-zero exit:
//   - an empty side: no .css files, or files with no rules;
//   - BEFORE and AFTER resolving to the same directory;
//   - an `--allow-removed` with no selector, a wildcard or list, or a selector that was not removed as one rule;
//   - any other rule added, removed or changed;
//   - any other rule moved: within a file (order is part of the cascade) or between files, and any change in the
//     number of files beyond (d);
//   - a light/dark pair whose order changed, or whose order cannot be established: a .dark rule (in any context,
//     alone or in a selector list) must sit in the same file and context as the :root rule it overrides.
// gate.txt says FAIL from the moment the run starts, and is replaced only by a completed run.
//
// Outputs in <outDir>: before.normalised.css / after.normalised.css (all rules, sorted), diff.txt (the sorted views
// compared, before any allowance), order-before.txt / order-after.txt (each file's rules in order) and gate.txt (the
// verdict, the allowances applied and the findings).
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const positional = []
const allowRemoved = []
const argErrors = []
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i++) {
  if (argv[i] !== '--allow-removed') {
    positional.push(argv[i])
    continue
  }
  const selector = argv[i + 1]
  if (selector === undefined || selector.startsWith('--')) {
    argErrors.push('--allow-removed needs a selector')
    continue
  }
  i++
  // A removal must name one rule: a wildcard or a selector list could hide more than the ruling allows.
  if (selector.trim() === '') argErrors.push('--allow-removed needs a selector')
  else if (/[*,]/.test(selector)) argErrors.push(`--allow-removed ${selector}: name one selector exactly (no wildcard or list)`)
  else allowRemoved.push(selector.trim())
}
const [postcssPath, beforeDir, afterDir, outDir] = positional
if (positional.length !== 4) {
  console.error('usage: node tools/css-parity.mjs <postcss-module-path> <beforeDir> <afterDir> <outDir> [--allow-removed <selector>]...')
  process.exit(2)
}
fs.mkdirSync(outDir, { recursive: true })
const GATE = path.join(outDir, 'gate.txt')
fs.writeFileSync(GATE, 'VERDICT: FAIL - the gate did not complete; only a finished run replaces this line\n')
if (argErrors.length) {
  fs.writeFileSync(GATE, `VERDICT: FAIL - ${argErrors.join('; ')}\n`)
  console.error(argErrors.join('\n'))
  process.exit(1)
}
const postcss = createRequire(import.meta.url)(postcssPath)

function context(node) {
  const parts = []
  for (let p = node.parent; p && p.type !== 'root'; p = p.parent) {
    parts.unshift(p.type === 'atrule' ? `@${p.name} ${p.params}` : p.selector)
  }
  return parts.join(' > ')
}

function decls(node, sort) {
  const list = (node.nodes || []).filter((n) => n.type === 'decl').map((d) => `${d.prop}:${d.value}${d.important ? '!important' : ''}`)
  return sort ? list.sort() : list
}

const customProps = (rule) => (rule.nodes || []).filter((n) => n.type === 'decl' && n.prop.startsWith('--')).map((d) => d.prop)

const SRC = /url\([^)]*\)/g
const NEXT_FONT_CLASS = /^\.__(className|variable)_[0-9a-f]+$/
const FONT_STYLE_NORMAL = 'font-style:normal'

function records(dir) {
  const files = fs.readdirSync(dir, { recursive: true }).map(String).filter((f) => f.endsWith('.css')).sort()
  const all = []
  const perFile = {}
  const themeRules = []
  for (const file of files) {
    const root = postcss.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
    const seq = []
    root.walk((node) => {
      let entry
      if (node.type === 'rule') {
        const ctx = context(node)
        const list = decls(node, false)
        const selector = node.selector
        entry = { line: `${ctx} || ${selector} { ${list.join('; ')} }`, selector, kind: 'rule' }
        if (NEXT_FONT_CLASS.test(selector)) {
          const isClassName = selector.startsWith('.__className_')
          const kept = isClassName ? list.filter((d) => d !== FONT_STYLE_NORMAL) : list
          entry = {
            ...entry,
            kind: 'next-font-class',
            // (a) the hash is a placeholder; (b) font-style:normal is set aside on .__className_ rules only.
            key: `${ctx} || ${selector.replace(/_[0-9a-f]+$/, '_<hash>')} { ${kept.join('; ')} }`,
            fontStyleNormal: isClassName && kept.length !== list.length,
          }
        }
        const props = customProps(node)
        const selectors = node.selectors.map((s) => s.trim())
        for (const kind of ['.dark', ':root']) {
          if (props.length && selectors.includes(kind)) themeRules.push({ kind, file, index: seq.length, ctx, props })
        }
      } else if (node.type === 'atrule' && node.name === 'font-face') {
        const line = `${context(node)} || @font-face { ${decls(node, true).join('; ')} }`
        entry = { line, kind: 'font-face', key: line.replace(SRC, 'url(<font file>)') }
      } else if (node.type === 'atrule' && !node.nodes) entry = { line: `${context(node)} || @${node.name} ${node.params};` }
      else if (node.type === 'atrule' && /keyframes$/.test(node.name)) entry = { line: `${context(node)} || @${node.name} ${node.params} {}` }
      else if (node.type === 'atrule' && node.name === 'property') entry = { line: `${context(node)} || @property ${node.params} { ${decls(node, true).join('; ')} }` }
      else if (node.type === 'decl' && node.parent.type === 'atrule' && !['font-face', 'property'].includes(node.parent.name)) entry = { line: `${context(node)} || <bare decl> ${node.prop}:${node.value}` }
      if (entry) {
        entry.line = entry.line.replace(/\n/g, '\\n')
        if (entry.key) entry.key = entry.key.replace(/\n/g, '\\n')
        entry.key ??= entry.line
        entry.font = entry.kind === 'font-face' || entry.kind === 'next-font-class'
        entry.file = file
        all.push(entry)
        seq.push(entry)
      }
    })
    perFile[file] = seq
  }
  return { all, perFile, files, themeRules }
}

function multiset(keys) {
  const m = new Map()
  for (const k of keys) m.set(k, (m.get(k) || 0) + 1)
  return m
}

function unmatched(a, b) {
  const [ma, mb] = [multiset(a), multiset(b)]
  const onlyA = []
  const onlyB = []
  for (const [k, n] of ma) for (let i = 0; i < n - (mb.get(k) || 0); i++) onlyA.push(k)
  for (const [k, n] of mb) for (let i = 0; i < n - (ma.get(k) || 0); i++) onlyB.push(k)
  return { onlyA, onlyB }
}

function sortedDiff(a, b) {
  // Both sides are sorted, so a merge walk is exact.
  const out = []
  let i = 0
  let j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { i++; j++; continue }
    if (j >= b.length || (i < a.length && a[i] < b[j])) out.push(`- ${a[i++]}`)
    else out.push(`+ ${b[j++]}`)
  }
  return out
}

/**
 * Pair files by their NON-font rules, which must be identical in order (R18 d lets font rules move between files).
 * A file holding only font rules takes no part: it may appear or vanish. Describe every file left without a partner.
 */
function orderFindings(before, after, kept) {
  const others = (rec, f) => rec.perFile[f].filter((e) => !e.font && kept(e)).map((e) => e.key)
  const pairable = (rec) => rec.files.filter((f) => !(rec.perFile[f].length && rec.perFile[f].every((e) => e.font)))
  const seqKey = (rec, f) => others(rec, f).join('\n')
  const bagKey = (rec, f) => others(rec, f).sort().join('\n')
  const freeAfter = new Set(pairable(after))
  const freeBefore = []
  const pairs = []
  for (const f of pairable(before)) {
    const match = [...freeAfter].find((g) => seqKey(after, g) === seqKey(before, f))
    if (match) {
      freeAfter.delete(match)
      pairs.push([f, match])
    } else freeBefore.push(f)
  }
  const findings = []
  for (const f of freeBefore) {
    const sameRules = [...freeAfter].find((g) => bagKey(after, g) === bagKey(before, f))
    if (sameRules) {
      freeAfter.delete(sameRules)
      const [x, y] = [others(before, f), others(after, sameRules)]
      const at = x.findIndex((l, i) => l !== y[i])
      findings.push(`rule order changed in ${f} -> ${sameRules} at rule ${at}: before "${x[at]}", after "${y[at]}"`)
    } else findings.push(`${f}: no AFTER file holds the same rules (rules moved between files)`)
  }
  for (const g of freeAfter) findings.push(`${g}: no BEFORE file holds the same rules (rules moved between files)`)
  return { findings, pairs }
}

/** For every .dark rule declaring custom properties: is the :root rule it overrides before it, in the same file and context? */
function cascade(rec) {
  return rec.themeRules
    .filter((r) => r.kind === '.dark')
    .map((dark) => {
      const shares = (r) => r.kind === ':root' && r.props.some((p) => dark.props.includes(p))
      const same = rec.themeRules.filter((r) => shares(r) && r.file === dark.file && r.ctx === dark.ctx)
      const where = `${dark.file}${dark.ctx ? ` in ${dark.ctx}` : ''}`
      if (!same.length) {
        const elsewhere = rec.themeRules.filter(shares).map((r) => `${r.file}${r.ctx ? ` in ${r.ctx}` : ''}`)
        return { where, status: `cannot be established (light :root ${elsewhere.length ? `only in ${elsewhere.join(', ')}` : 'not found'})` }
      }
      const lightFirst = same.every((r) => r.index < dark.index)
      const darkFirst = same.every((r) => r.index > dark.index)
      return { where, status: lightFirst ? 'light before dark' : darkFirst ? 'dark before light' : 'light on both sides of dark' }
    })
}

const before = records(beforeDir)
const after = records(afterDir)
const lines = (rec) => rec.all.map((e) => e.line)
const sortedBefore = lines(before).sort()
const sortedAfter = lines(after).sort()
fs.writeFileSync(path.join(outDir, 'before.normalised.css'), sortedBefore.join('\n') + '\n')
fs.writeFileSync(path.join(outDir, 'after.normalised.css'), sortedAfter.join('\n') + '\n')
const diff = sortedDiff(sortedBefore, sortedAfter)
fs.writeFileSync(path.join(outDir, 'diff.txt'), diff.length ? diff.join('\n') + '\n' : '(no differences)\n')
for (const [name, rec] of [['before', before], ['after', after]]) {
  fs.writeFileSync(path.join(outDir, `order-${name}.txt`), rec.files.map((f) => `### ${f}\n${rec.perFile[f].map((e) => e.line).join('\n')}`).join('\n\n') + '\n')
}

const failures = []
const allowed = []
for (const [label, dir, rec] of [['BEFORE', beforeDir, before], ['AFTER', afterDir, after]]) {
  if (rec.files.length === 0) failures.push(`no .css files in ${label} (${dir})`)
  else if (rec.all.length === 0) failures.push(`no rules in ${label} (${dir})`)
}
if (fs.realpathSync(beforeDir) === fs.realpathSync(afterDir)) failures.push(`BEFORE and AFTER are the same directory (${fs.realpathSync(beforeDir)})`)

// (e) Each named removal must be exactly one ordinary rule in BEFORE and none in AFTER; only then is it set aside.
const removed = new Set()
for (const selector of allowRemoved) {
  const isNamed = (e) => e.kind === 'rule' && e.selector === selector
  const [inBefore, inAfter] = [before.all.filter(isNamed), after.all.filter(isNamed)]
  if (inBefore.length !== 1 || inAfter.length !== 0) {
    failures.push(`--allow-removed ${selector} was not removed as one rule (${inBefore.length} in BEFORE, ${inAfter.length} in AFTER)`)
    continue
  }
  removed.add(inBefore[0])
  allowed.push(`ALLOWED (R18 e): named rule removed: ${inBefore[0].line}`)
}
const kept = (e) => !removed.has(e)

// Every rule, font rules by their R18 key, must match as a multiset.
const strict = unmatched(before.all.filter(kept).map((e) => e.key), after.all.map((e) => e.key))
const rulesMatch = strict.onlyA.length === 0 && strict.onlyB.length === 0
if (!rulesMatch) failures.push('differences beyond @font-face src URLs and the R18 allowances')

// (a) and (b): report what the placeholders and the font-style set-aside absorbed.
const classes = (rec) => [...new Set(rec.all.filter((e) => e.kind === 'next-font-class').map((e) => e.selector))].sort()
const [classesBefore, classesAfter] = [classes(before), classes(after)]
if (classesBefore.join() !== classesAfter.join()) {
  allowed.push(`ALLOWED (R18 a): next/font class hashes renamed: before [${classesBefore.join(' ')}], after [${classesAfter.join(' ')}]`)
}
const styled = (rec) => rec.all.filter((e) => e.fontStyleNormal).map((e) => e.key)
const fontStyle = unmatched(styled(before), styled(after))
for (const k of fontStyle.onlyA) allowed.push(`ALLOWED (R18 b): font-style:normal missing in AFTER on ${k}`)
for (const k of fontStyle.onlyB) allowed.push(`ALLOWED (R18 b): font-style:normal added in AFTER on ${k}`)

// (c) and (d): non-font rules must pair file to file, in order; font rules may reorder or move between files.
const order = rulesMatch ? orderFindings(before, after, kept) : { findings: [], pairs: [] }
if (order.findings.length) {
  if (before.files.length !== after.files.length) failures.push(`file count differs: ${before.files.length} before, ${after.files.length} after, and not only by files of font rules`)
  failures.push('rule order changed (or rules moved between files)')
} else if (rulesMatch) {
  // Every file with non-font rules is now paired; files of font rules only are unpaired. Compare where the font
  // rules sit (as bags) to tell (d) chunking from (c) a pure reordering, and report whichever happened.
  const fonts = (rec, f, inOrder) => {
    const keys = rec.perFile[f].filter((e) => e.font).map((e) => e.key)
    return (inOrder ? keys : keys.sort()).join('\n')
  }
  const unpaired = (rec, paired, inOrder) =>
    rec.files.filter((f) => !paired.has(f)).map((f) => fonts(rec, f, inOrder)).sort().join('\n\n')
  const [pairedBefore, pairedAfter] = [new Set(order.pairs.map(([f]) => f)), new Set(order.pairs.map(([, g]) => g))]
  const placed = (inOrder) =>
    order.pairs.every(([f, g]) => fonts(before, f, inOrder) === fonts(after, g, inOrder)) &&
    unpaired(before, pairedBefore, inOrder) === unpaired(after, pairedAfter, inOrder)
  if (before.files.length !== after.files.length) {
    allowed.push(`ALLOWED (R18 d): file count changed, ${before.files.length} before, ${after.files.length} after, by files of font rules only`)
  }
  if (!placed(false)) allowed.push('ALLOWED (R18 d): font rules moved between files (chunking)')
  else if (!placed(true)) allowed.push('ALLOWED (R18 c): @font-face / next/font class rules reordered within a file')
}

const [cascadeBefore, cascadeAfter] = [cascade(before), cascade(after)]
const unknown = [...cascadeBefore.map((c) => ['BEFORE', c]), ...cascadeAfter.map((c) => ['AFTER', c])].filter(([, c]) => c.status.startsWith('cannot'))
if (unknown.length) failures.push(`cascade order cannot be established: ${unknown.map(([side, c]) => `${side} ${c.where}: ${c.status}`).join('; ')}`)
const statuses = (list) => list.map((c) => c.status).sort().join(',')
if (cascadeBefore.length && statuses(cascadeBefore) !== statuses(cascadeAfter)) {
  failures.push(`cascade order changed: before [${statuses(cascadeBefore)}], after [${statuses(cascadeAfter) || 'no .dark rule'}]`)
}
const pass = failures.length === 0

const report = [
  `VERDICT: ${pass ? `PASS - no differences beyond @font-face src URLs${allowed.length ? ` and ${allowed.length} R18 allowance(s), listed below` : ''}` : `FAIL - ${failures.join('; ')}`}`,
  '',
  `before: ${before.files.length} files, ${before.all.length} rules; after: ${after.files.length} files, ${after.all.length} rules`,
  `files identical by name (content hash): ${before.files.filter((f) => after.files.includes(f)).length} of ${before.files.length}`,
  `sorted diff lines: ${diff.length} (of which touch @font-face: ${diff.filter((l) => l.includes('@font-face')).length})`,
  `cascade before: ${cascadeBefore.map((c) => `${c.where}: ${c.status}`).join('; ') || 'no .dark rule'}`,
  `cascade after:  ${cascadeAfter.map((c) => `${c.where}: ${c.status}`).join('; ') || 'no .dark rule'}`,
  '',
  `R18 allowances applied: ${allowed.length}`,
  ...allowed.map((l) => `  ${l}`),
  `Rules only in BEFORE (font rules by their R18 key): ${strict.onlyA.length}`,
  ...strict.onlyA.map((l) => `  - ${l}`),
  `Rules only in AFTER (font rules by their R18 key): ${strict.onlyB.length}`,
  ...strict.onlyB.map((l) => `  + ${l}`),
  `Order findings: ${order.findings.length}`,
  ...order.findings.map((l) => `  ${l}`),
]
fs.writeFileSync(GATE, report.join('\n') + '\n')
console.log(report.slice(0, 7).join('\n'))
for (const l of allowed) console.log(l)
process.exit(pass ? 0 : 1)
