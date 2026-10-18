// Runs after tsup. Writes the non-JS artefacts from the compiled modules, so they cannot drift from the sources:
//   dist/tokens.css          the dark set, from THEME_DARK
//   fonts/<family>/*.woff2   copied unmodified from the committed font-files/<family>/, with each family's OFL text
//   fonts/fonts.css          every face, the fallback faces and the role variables (Vite, Remotion, plain CSS)
//   fonts/next.css           what next/font/local does not declare itself: the non-latin faces and fallback faces
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { tokensCss } = await import(join(root, 'dist/tokens/index.js'))
const { FONT_FAMILIES, SUBSETS, fontFaceCss, fontFaces } = await import(join(root, 'dist/fonts/index.js'))

writeFileSync(join(root, 'dist/tokens.css'), tokensCss())

// font-files/ holds the files Google Fonts served for Geist and IBM Plex Mono on 2026-10-17, byte for byte (see
// font-files/README.md). Only the declared faces are copied, so a stray file there never reaches the tarball, and a
// declared face with no file fails the build here.
const sourceDir = join(root, 'font-files')
const fontsDir = join(root, 'fonts')
rmSync(fontsDir, { recursive: true, force: true })
for (const family of Object.values(FONT_FAMILIES)) {
  mkdirSync(join(fontsDir, family.dir), { recursive: true })
  copyFileSync(join(sourceDir, family.dir, 'OFL.txt'), join(fontsDir, family.dir, 'OFL.txt'))
}
for (const path of new Set(fontFaces().map((face) => face.path))) copyFileSync(join(sourceDir, path), join(fontsDir, path))

const header = (what) => `/* @arano/design ${what}. Generated, do not edit. Fonts: SIL Open Font Licence 1.1, see */\n/* fonts/geist/OFL.txt and fonts/ibm-plex-mono/OFL.txt. */\n\n`
writeFileSync(join(fontsDir, 'fonts.css'), header('fonts.css: every face, fallback faces and role variables') + fontFaceCss({ rootVariables: true }))
writeFileSync(
  join(fontsDir, 'next.css'),
  header('next.css: companion to next/font/local, which loads the latin faces and sets the role variables') +
    fontFaceCss({ subsets: SUBSETS.filter((s) => s !== 'latin') }),
)
