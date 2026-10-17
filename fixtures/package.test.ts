import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The BUILT package as a consumer meets it: every export resolves under Node's own resolver in both module
 * systems, the generated CSS matches its source, the fonts are the pinned fontsource files unmodified, and the
 * tarball holds what it should and nothing else.
 */
const ROOT = join(__dirname, '..')
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const require = createRequire(import.meta.url)
const node = (args: string[]) => execFileSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' }).trim()

const ENTRIES: Record<string, string> = {
  '@arano/design/tokens': 'THEME_DARK',
  '@arano/design/tailwind-preset': 'aranoPreset',
  '@arano/design/fonts': 'FONT_FAMILIES',
  '@arano/design/brand': 'MARK',
  '@arano/design/react': 'Wordmark',
}

describe('package manifest', () => {
  it('is publishable, public, UNLICENSED and runs on Node 20 and later', () => {
    expect(pkg.name).toBe('@arano/design')
    expect(pkg.private).toBeUndefined()
    expect(pkg.license).toBe('UNLICENSED')
    expect(pkg.engines).toEqual({ node: '>=20' })
    expect(pkg.publishConfig).toEqual({ access: 'public', provenance: true })
    expect(pkg.repository.url).toBe('git+https://github.com/StephenD1981/arano-design.git')
  })

  it('runs no install lifecycle script on a consumer', () => {
    for (const hook of ['preinstall', 'install', 'postinstall', 'prepare']) expect(pkg.scripts[hook], hook).toBeUndefined()
  })

  it('refuses to publish outside GitHub Actions', () => {
    const run = (env: NodeJS.ProcessEnv) => spawnSync('npm', ['run', '--silent', 'prepublishOnly'], { cwd: ROOT, env, encoding: 'utf8' })
    const local = { ...process.env }
    delete local.GITHUB_ACTIONS
    expect(run(local).status).not.toBe(0)
    expect(run({ ...local, GITHUB_ACTIONS: 'true' }).status).toBe(0)
  })

  it('needs React only for the /react entry', () => {
    expect(pkg.peerDependencies).toEqual({ react: '>=18' })
    expect(pkg.peerDependenciesMeta.react.optional).toBe(true)
    expect(pkg.dependencies).toBeUndefined()
  })
})

describe('exports map', () => {
  it.each(Object.entries(ENTRIES))('%s resolves and exports %s from ESM', (spec, name) => {
    expect(node(['--input-type=module', '-e', `const m = await import('${spec}'); console.log(typeof m.${name})`])).not.toBe('undefined')
  })

  it.each(Object.entries(ENTRIES))('%s resolves and exports %s from CommonJS', (spec, name) => {
    expect(node(['-e', `console.log(typeof require('${spec}').${name})`])).not.toBe('undefined')
  })

  it.each(['tokens.css', 'fonts/fonts.css', 'fonts/next.css', 'fonts/geist/OFL.txt', 'brand/arano-symbol.svg'])(
    '@arano/design/%s resolves to a file',
    (path) => {
      expect(node(['-e', `console.log(require.resolve('@arano/design/${path}'))`])).toMatch(new RegExp(`${path.replace('.', '\\.')}$`))
    },
  )
})

describe('generated artefacts', () => {
  it('dist/tokens.css is tokensCss() from the build', () => {
    const generated = node(['--input-type=module', '-e', "const { tokensCss } = await import('@arano/design/tokens'); process.stdout.write(tokensCss())"])
    expect(readFileSync(join(ROOT, 'dist/tokens.css'), 'utf8').trim()).toBe(generated)
  })

  it('ships exactly the 20 declared font files, each byte-identical to its pinned @fontsource source', () => {
    const SOURCES: Record<string, string> = { geist: '@fontsource-variable/geist', 'ibm-plex-mono': '@fontsource/ibm-plex-mono' }
    let count = 0
    for (const dir of Object.keys(SOURCES)) {
      const src = join(dirname(require.resolve(`${SOURCES[dir]}/package.json`)), 'files')
      for (const file of readdirSync(join(ROOT, 'fonts', dir)).filter((f) => f.endsWith('.woff2'))) {
        expect(readFileSync(join(ROOT, 'fonts', dir, file)).equals(readFileSync(join(src, file))), file).toBe(true)
        count++
      }
      expect(readFileSync(join(ROOT, 'fonts', dir, 'OFL.txt'), 'utf8')).toContain('SIL OPEN FONT LICENSE Version 1.1')
    }
    expect(count).toBe(20)
  })
})

describe('tarball', () => {
  const files: string[] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: ROOT, encoding: 'utf8' }))[0].files.map(
    (f: { path: string }) => f.path,
  )

  it('holds the built entries, CSS, fonts with their licences, brand files and docs', () => {
    for (const f of ['package.json', 'README.md', 'LICENSE', 'DESIGN-RULES.md', 'dist/tokens.css', 'dist/react/index.js', 'dist/react/index.d.cts', 'fonts/next.css', 'fonts/geist/OFL.txt', 'fonts/ibm-plex-mono/OFL.txt', 'brand/arano-symbol-ring.svg']) {
      expect(files, f).toContain(f)
    }
  })

  it('leaves out sources, tests, fixtures, CI and tooling', () => {
    expect(files.filter((f) => /^(src|test|fixtures|scripts|tools|\.github|\.changeset)\//.test(f))).toEqual([])
  })
})
