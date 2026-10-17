// Runs after tsup. Writes the non-JS artefacts from the compiled modules, so they cannot drift from the sources:
//   dist/tokens.css          the dark set, from THEME_DARK
//   fonts/<family>/*.woff2   copied unmodified from the pinned @fontsource packages, with each family's OFL text
//   fonts/fonts.css          every face, the fallback faces and the role variables (Vite, Remotion, plain CSS)
//   fonts/next.css           what next/font/local does not declare itself: the non-latin faces and fallback faces
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const { tokensCss } = await import(join(root, 'dist/tokens/index.js'))
const { FONT_FAMILIES, SUBSETS, fontFaceCss, fontFaces } = await import(join(root, 'dist/fonts/index.js'))

writeFileSync(join(root, 'dist/tokens.css'), tokensCss())

const SOURCES = {
  geist: '@fontsource-variable/geist',
  'ibm-plex-mono': '@fontsource/ibm-plex-mono',
}
const fontsDir = join(root, 'fonts')
rmSync(fontsDir, { recursive: true, force: true })
for (const family of Object.values(FONT_FAMILIES)) {
  const pkg = dirname(require.resolve(`${SOURCES[family.dir]}/package.json`))
  mkdirSync(join(fontsDir, family.dir), { recursive: true })
  copyFileSync(join(pkg, 'LICENSE'), join(fontsDir, family.dir, 'OFL.txt'))
}
for (const face of fontFaces()) {
  const [dir, file] = face.path.split('/')
  const pkg = dirname(require.resolve(`${SOURCES[dir]}/package.json`))
  copyFileSync(join(pkg, 'files', file), join(fontsDir, face.path))
}

const header = (what) => `/* @arano/design ${what}. Generated, do not edit. Fonts: SIL Open Font Licence 1.1, see */\n/* fonts/geist/OFL.txt and fonts/ibm-plex-mono/OFL.txt. */\n\n`
writeFileSync(join(fontsDir, 'fonts.css'), header('fonts.css: every face, fallback faces and role variables') + fontFaceCss({ rootVariables: true }))
writeFileSync(
  join(fontsDir, 'next.css'),
  header('next.css: companion to next/font/local, which loads the latin faces and sets the role variables') +
    fontFaceCss({ subsets: SUBSETS.filter((s) => s !== 'latin') }),
)
