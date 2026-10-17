// Compiled-CSS parity gate: the check a consumer runs when it upgrades @arano/design (see README, "Upgrading").
//
// Usage: node tools/css-parity.mjs <postcss-module-path> <beforeDir> <afterDir> <outDir>
// where beforeDir and afterDir are copies of a build's CSS output (for Next.js, .next/static/css) before and after.
// The tool is kept in this repository, not in the published package; a consumer copies it into its own tooling.
//
// Every .css file under each directory, at any depth, is parsed with postcss into one line per rule:
//   <at-rule context> || <selector or at-rule> { <declarations in source order> }
// Declarations keep their order inside ordinary rules (order can matter there). Inside @font-face, where descriptor
// order cannot matter, they are sorted. Values are compared exactly as compiled: no colour, quote or number rewriting.
//
// The ONLY tolerated difference is the url() inside an @font-face src. The gate FAILS, with a non-zero exit, on:
//   - an empty side: no .css files, or files with no rules;
//   - BEFORE and AFTER resolving to the same directory;
//   - a different number of files;
//   - any rule added, removed or changed;
//   - any rule moved: within a file (order is part of the cascade) or between files;
//   - a light/dark pair whose order changed, or whose order cannot be established: a .dark rule (in any context,
//     alone or in a selector list) must sit in the same file and context as the :root rule it overrides.
// gate.txt says FAIL from the moment the run starts, and is replaced only by a completed run.
//
// Outputs in <outDir>: before.normalised.css / after.normalised.css (all rules, sorted), diff.txt (the sorted views
// compared), order-before.txt / order-after.txt (each file's rules in order) and gate.txt (the verdict and findings).
// A last, explanatory section of gate.txt shows what remains when next/font class hashes are canonicalised; it
// never changes the verdict.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const [postcssPath, beforeDir, afterDir, outDir] = process.argv.slice(2)
fs.mkdirSync(outDir, { recursive: true })
const GATE = path.join(outDir, 'gate.txt')
fs.writeFileSync(GATE, 'VERDICT: FAIL - the gate did not complete; only a finished run replaces this line\n')
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

function records(dir) {
  const files = fs.readdirSync(dir, { recursive: true }).map(String).filter((f) => f.endsWith('.css')).sort()
  const all = []
  const perFile = {}
  const themeRules = []
  for (const file of files) {
    const root = postcss.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
    const seq = []
    root.walk((node) => {
      let line
      if (node.type === 'rule') {
        line = `${context(node)} || ${node.selector} { ${decls(node, false).join('; ')} }`
        const props = customProps(node)
        const selectors = node.selectors.map((s) => s.trim())
        for (const kind of ['.dark', ':root']) {
          if (props.length && selectors.includes(kind)) themeRules.push({ kind, file, index: seq.length, ctx: context(node), props })
        }
      } else if (node.type === 'atrule' && node.name === 'font-face') line = `${context(node)} || @font-face { ${decls(node, true).join('; ')} }`
      else if (node.type === 'atrule' && !node.nodes) line = `${context(node)} || @${node.name} ${node.params};`
      else if (node.type === 'atrule' && /keyframes$/.test(node.name)) line = `${context(node)} || @${node.name} ${node.params} {}`
      else if (node.type === 'atrule' && node.name === 'property') line = `${context(node)} || @property ${node.params} { ${decls(node, true).join('; ')} }`
      else if (node.type === 'decl' && node.parent.type === 'atrule' && !['font-face', 'property'].includes(node.parent.name)) line = `${context(node)} || <bare decl> ${node.prop}:${node.value}`
      if (line) {
        line = line.replace(/\n/g, '\\n')
        all.push(line)
        seq.push(line)
      }
    })
    perFile[file] = seq
  }
  return { all, perFile, files, themeRules }
}

const SRC = /url\([^)]*\)/g
const fontSrcKey = (line) => (line.includes('@font-face') ? line.replace(SRC, 'url(<font file>)') : line)
const hashKey = (line) => fontSrcKey(line).replace(/__(className|variable)_[0-9a-f]{6}/g, '__$1_<hash>')

function multiset(lines, key) {
  const m = new Map()
  for (const l of lines) m.set(key(l), (m.get(key(l)) || 0) + 1)
  return m
}

function unmatched(a, b, key) {
  const [ma, mb] = [multiset(a, key), multiset(b, key)]
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

/** Pair files whose rules are identical IN ORDER; describe every file that has no such partner. */
function orderFindings(before, after) {
  const seqKey = (rec, f) => rec.perFile[f].map(fontSrcKey).join('\n')
  const bagKey = (rec, f) => rec.perFile[f].map(fontSrcKey).sort().join('\n')
  const freeAfter = new Set(after.files)
  const freeBefore = []
  for (const f of before.files) {
    const match = [...freeAfter].find((g) => seqKey(after, g) === seqKey(before, f))
    if (match) freeAfter.delete(match)
    else freeBefore.push(f)
  }
  const findings = []
  for (const f of freeBefore) {
    const sameRules = [...freeAfter].find((g) => bagKey(after, g) === bagKey(before, f))
    if (sameRules) {
      freeAfter.delete(sameRules)
      const [x, y] = [before.perFile[f].map(fontSrcKey), after.perFile[sameRules].map(fontSrcKey)]
      const at = x.findIndex((l, i) => l !== y[i])
      findings.push(`rule order changed in ${f} -> ${sameRules} at rule ${at}: before "${x[at]}", after "${y[at]}"`)
    } else findings.push(`${f}: no AFTER file holds the same rules (rules moved between files)`)
  }
  for (const g of freeAfter) findings.push(`${g}: no BEFORE file holds the same rules (rules moved between files)`)
  return findings
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
const sortedBefore = [...before.all].sort()
const sortedAfter = [...after.all].sort()
fs.writeFileSync(path.join(outDir, 'before.normalised.css'), sortedBefore.join('\n') + '\n')
fs.writeFileSync(path.join(outDir, 'after.normalised.css'), sortedAfter.join('\n') + '\n')
const diff = sortedDiff(sortedBefore, sortedAfter)
fs.writeFileSync(path.join(outDir, 'diff.txt'), diff.length ? diff.join('\n') + '\n' : '(no differences)\n')
for (const [name, rec] of [['before', before], ['after', after]]) {
  fs.writeFileSync(path.join(outDir, `order-${name}.txt`), rec.files.map((f) => `### ${f}\n${rec.perFile[f].join('\n')}`).join('\n\n') + '\n')
}

const strict = unmatched(before.all, after.all, fontSrcKey)
const explained = unmatched(before.all, after.all, hashKey)
const rulesMatch = strict.onlyA.length === 0 && strict.onlyB.length === 0

const failures = []
for (const [label, dir, rec] of [['BEFORE', beforeDir, before], ['AFTER', afterDir, after]]) {
  if (rec.files.length === 0) failures.push(`no .css files in ${label} (${dir})`)
  else if (rec.all.length === 0) failures.push(`no rules in ${label} (${dir})`)
}
if (fs.realpathSync(beforeDir) === fs.realpathSync(afterDir)) failures.push(`BEFORE and AFTER are the same directory (${fs.realpathSync(beforeDir)})`)
if (before.files.length !== after.files.length) failures.push(`file count differs: ${before.files.length} before, ${after.files.length} after`)
if (!rulesMatch) failures.push('differences beyond @font-face src URLs')
const order = rulesMatch ? orderFindings(before, after) : []
if (order.length) failures.push('rule order changed (or rules moved between files)')

const [cascadeBefore, cascadeAfter] = [cascade(before), cascade(after)]
const unknown = [...cascadeBefore.map((c) => ['BEFORE', c]), ...cascadeAfter.map((c) => ['AFTER', c])].filter(([, c]) => c.status.startsWith('cannot'))
if (unknown.length) failures.push(`cascade order cannot be established: ${unknown.map(([side, c]) => `${side} ${c.where}: ${c.status}`).join('; ')}`)
const statuses = (list) => list.map((c) => c.status).sort().join(',')
if (cascadeBefore.length && statuses(cascadeBefore) !== statuses(cascadeAfter)) {
  failures.push(`cascade order changed: before [${statuses(cascadeBefore)}], after [${statuses(cascadeAfter) || 'no .dark rule'}]`)
}
const pass = failures.length === 0

const report = [
  `VERDICT: ${pass ? 'PASS - the only differences are @font-face src URLs' : `FAIL - ${failures.join('; ')}`}`,
  '',
  `before: ${before.files.length} files, ${before.all.length} rules; after: ${after.files.length} files, ${after.all.length} rules`,
  `files identical by name (content hash): ${before.files.filter((f) => after.files.includes(f)).length} of ${before.files.length}`,
  `sorted diff lines: ${diff.length} (of which touch @font-face: ${diff.filter((l) => l.includes('@font-face')).length})`,
  `cascade before: ${cascadeBefore.map((c) => `${c.where}: ${c.status}`).join('; ') || 'no .dark rule'}`,
  `cascade after:  ${cascadeAfter.map((c) => `${c.where}: ${c.status}`).join('; ') || 'no .dark rule'}`,
  '',
  `Rules only in BEFORE (font src URLs canonicalised): ${strict.onlyA.length}`,
  ...strict.onlyA.map((l) => `  - ${l}`),
  `Rules only in AFTER (font src URLs canonicalised): ${strict.onlyB.length}`,
  ...strict.onlyB.map((l) => `  + ${l}`),
  `Order findings: ${order.length}`,
  ...order.map((l) => `  ${l}`),
  '',
  'Explanatory only, does not change the verdict: what remains when next/font class hashes are also canonicalised',
  `  only in BEFORE: ${explained.onlyA.length}`,
  ...explained.onlyA.map((l) => `    - ${l}`),
  `  only in AFTER: ${explained.onlyB.length}`,
  ...explained.onlyB.map((l) => `    + ${l}`),
]
fs.writeFileSync(GATE, report.join('\n') + '\n')
console.log(report.slice(0, 7).join('\n'))
process.exit(pass ? 0 : 1)
