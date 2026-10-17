# @arano/design

The ARANO look and feel as one versioned package: the colour tokens, the dark theme, a Tailwind preset, the fonts
and the brand mark. arano-ran, arano-fibre and the arano.ai website consume it, so they match by construction
instead of by copying.

All rights reserved. Fonts are bundled under their own SIL Open Font Licence; see fonts/.

The rules for using it are in [DESIGN-RULES.md](./DESIGN-RULES.md). Licence terms are in [LICENSE](./LICENSE).

## What is in it

| Import | What you get |
|---|---|
| `@arano/design/tokens` | The palette (`NEUTRAL`, `BRAND`, `STATE`, `SEVERITY`, `SECTOR`, `CHART`, `SURFACE`), `THEME_DARK` (the dark theme's custom properties), the severity contract (`SEVERITY_KEYS`, `FIBRE_SEVERITY_TERMS`, `FIBRE_SEVERITY_ALIASES`), `seriesColour`, `cssProperty`, `tokensCss` |
| `@arano/design/tokens.css` | The dark theme as one `.dark` rule, generated from `THEME_DARK` |
| `@arano/design/tailwind-preset` | `aranoPreset`: colour and font-role tokens for Tailwind 3.4 and 4 (`gray` retargeted, `brand-*`, `surface-*`, `severity-*`, `font-display`, `font-sans`, `font-mono`) |
| `@arano/design/fonts` | `FONT_ROLES`, `FONT_FAMILIES`, `UNICODE_RANGES`, `fontFaces()`, `fontFaceCss()` |
| `@arano/design/fonts/*` | The font files, their licences, `fonts.css` and `next.css` |
| `@arano/design/brand` | `MARK` and `RING` (the mark's geometry) and `BRAND_FILES` |
| `@arano/design/brand/*` | `arano-symbol.svg`, `arano-symbol-ring.svg` |
| `@arano/design/react` | `Wordmark` (`size`, `className`, `showText`, `decorative`, `label`); React 18 or later |

Every JavaScript entry ships as ESM and CommonJS with types for both. The preset carries no radius, shadow, ring or
`content`: those stay with each product, because Tailwind 4 rescaled them.

## Using it

### Next.js with Tailwind 4 (arano-ran, the website)

`tailwind.config.ts`:

```ts
import { aranoPreset } from '@arano/design/tailwind-preset'

export default {
  presets: [aranoPreset],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  // the product's own shadcn colours, radius, shadows and animations stay here
}
```

`app/globals.css`:

```css
@import 'tailwindcss';
@config '../tailwind.config.ts';

/* a light :root block, if the product has one, goes here */

@import '@arano/design/tokens.css';
```

The `tokens.css` import must come AFTER any light `:root` block. `:root` and `.dark` both match
`<html class="dark">` with the same specificity, so the later one wins. Tailwind 4 inlines an `@import` where it
stands, so this position is kept in the compiled CSS. Pin the theme to dark (`class="dark"` on `<html>`, or
next-themes `forcedTheme="dark"`).

### Vite with Tailwind 3.4 (arano-fibre)

```js
// tailwind.config.js, in a package with "type": "module"
import { aranoPreset } from '@arano/design/tailwind-preset'

export default {
  presets: [aranoPreset],
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}', './node_modules/@arano/design/dist/react/*.js'],
}
```

A CommonJS config works the same way: `const { aranoPreset } = require('@arano/design/tailwind-preset')` and
`module.exports = { ... }`. The fixtures compile both.

```ts
// main.tsx
import '@arano/design/tokens.css'
import '@arano/design/fonts/fonts.css'
```

Before adopting it, know what it changes:

- **`gray` is retargeted.** Every `gray-*` utility changes colour, to the cool ARANO neutral. That is the point,
  but it is a visible change on every page: take screenshots before and after.
- **Pin the theme to dark:** `class="dark"` on `<html>`. `tokens.css` is a `.dark` rule and does nothing without it.
- **Ant Design ignores Tailwind.** Ant components take their colours from Ant's own theme, so they stay Ant blue
  until its `ConfigProvider` theme is pointed at the same tokens (`BRAND[500]` from `@arano/design/tokens`).
- **Rename any existing `brand-*` scale first:** the preset's `brand` would collide with it.
- **Wordmark** needs React 18 or later, and its classes in your Tailwind sources (the `content` glob above).

### Class names are the same on Tailwind 3.4 and 4

The preset's colour keys are kebab-case, so both majors generate the same class names: `BRAND.onLight` is
`text-brand-on-light` and `SURFACE.borderStrong` is `bg-surface-border-strong` everywhere. (Left camelCase,
Tailwind 3.4 would have kept `text-brand-onLight` while Tailwind 4 kebab-cases it.) The TypeScript constants stay
camelCase. The fixtures pin this on Tailwind 3.4 (CommonJS and ESM configs) and Tailwind 4.

### Wordmark and Tailwind sources

`Wordmark` is styled with utility classes (`inline-flex items-center gap-3 flex-none font-display font-semibold
text-gray-100`), all from Tailwind's defaults or this preset. Tailwind does not scan `node_modules`, so a product
that does not already use those classes must add the package to its sources:

- Tailwind 4: `@source '../node_modules/@arano/design/dist/react';` in the CSS entry.
- Tailwind 3.4: the `content` glob shown above.

The mark strokes in `hsl(var(--primary))` and falls back to Signal Cyan where no theme is loaded. Pass
`decorative` when text beside it already names ARANO, and `label` to change the mark's accessible name when it
stands alone.

### Fonts

The package ships Geist (the variable file, as Google Fonts serves it) and IBM Plex Mono 400, 500 and 600, in the
five Google subsets (cyrillic-ext, cyrillic, vietnamese, latin-ext, latin). Nothing is fetched from Google at build
or run time, which also keeps air-gapped builds working.

- `fonts/fonts.css` declares every face, a fallback face per family (`Geist Fallback`, `IBM Plex Mono Fallback`,
  with Google's precalculated metrics so text does not jump while the font loads) and the role variables
  (`--font-display`, `--font-sans`, `--font-mono`) on `:root`. Use it anywhere that is not next/font.
- `fonts/next.css` is the companion for next/font/local: the non-latin faces and the fallback faces, without the
  role variables, because next/font sets those itself.

**Next.js (next/font/local).** next/font accepts only literal arguments, so the latin faces are written out in
the root layout, with paths relative to it, and the unicode range is pasted in as a string (copy it from
`UNICODE_RANGES.latin`). `declarations` keeps the family name `Geist`. The fallback face comes from `next.css` with
Google's metrics, so next/font's own fallback calculation is switched off:

```tsx
import localFont from 'next/font/local'
import '@arano/design/fonts/next.css'

const geistSans = localFont({
  src: [
    { path: '../node_modules/@arano/design/fonts/geist/geist-latin-wght-normal.woff2', weight: '300' },
    { path: '../node_modules/@arano/design/fonts/geist/geist-latin-wght-normal.woff2', weight: '400' },
    // the same file again for 500, 600 and 700: Geist is one variable file per subset
  ],
  variable: '--font-sans',
  display: 'swap',
  style: 'normal',
  adjustFontFallback: false,
  fallback: ["'Geist Fallback'"],
  declarations: [
    { prop: 'font-family', value: 'Geist' },
    { prop: 'unicode-range', value: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD' },
  ],
})
```

The `path` is relative to the file that calls `localFont`, so it depends on where `node_modules` is. In an npm
workspaces repository the package is hoisted to the ROOT `node_modules`: from `site/app/layout.tsx` the path is
`../../node_modules/@arano/design/fonts/...`. This is the recipe arano-ran's adoption measures against the
next/font/google output it replaces; arano-ran's `app/layout.tsx` is the worked example once that lands.

**Vite.** `import '@arano/design/fonts/fonts.css'` once, at the entry. Vite resolves the `url()`s and bundles the
files.

**Remotion.** Import the files from the package, which Remotion's bundler turns into URLs, and load them with
`@remotion/fonts`. Nothing is copied into `public/`:

```ts
import { loadFont } from '@remotion/fonts'
import geistLatin from '@arano/design/fonts/geist/geist-latin-wght-normal.woff2'
import plexLatin400 from '@arano/design/fonts/ibm-plex-mono/ibm-plex-mono-latin-400-normal.woff2'

export const fontsLoaded = Promise.all([
  loadFont({ family: 'Geist', url: geistLatin, weight: '300 700' }),
  loadFont({ family: 'IBM Plex Mono', url: plexLatin400, weight: '400' }),
])
```

Declare the module type once (`declare module '*.woff2' { const url: string; export default url }`). Use the
`FONT_ROLES` family names, so the video names the same faces as the products.

**Attribution.** Geist: Copyright 2024 The Geist Project Authors (https://github.com/vercel/geist-font). IBM Plex
Mono: Copyright 2017 IBM Corp. Both under the SIL Open Font Licence 1.1, whose text ships beside the files
(`fonts/geist/OFL.txt`, `fonts/ibm-plex-mono/OFL.txt`). The files are copied unmodified from
`@fontsource-variable/geist` 5.3.0 and `@fontsource/ibm-plex-mono` 5.3.0.

### Severity

`SEVERITY_KEYS` is the canonical vocabulary: `critical`, `major`, `moderate`, `minor`, `warning`, `info`,
`healthy`. `FIBRE_SEVERITY_ALIASES` maps every term arano-fibre uses (`FIBRE_SEVERITY_TERMS`) onto it for its
migration, as a total map: `cleared` reads as healthy, `degraded` as major (never critical), the anomaly scale's
`high`, `medium` and `low` as major, moderate and minor. Retire the alias once Fibre uses the canonical keys.

## Upgrading: the rule

- **A token value change is a minor release.** That includes a changed colour, font file or brand SVG.
- **A renamed or removed token, entry or export is a major release.**
- **A new token is a minor release.**
- **Every consumer upgrades by pull request, with the CSS-diff gate:** build before and after, run
  `tools/css-parity.mjs` over the two CSS outputs, and review every difference it reports. It fails closed: an empty
  side, the same directory twice, a different file count, any rule added, removed, changed or moved (within a file
  or between files), and any light/dark pair whose order changed or cannot be established. The only tolerated
  difference is an `@font-face` src URL. The website adds its screenshot check. A consumer pins the version in its
  lockfile; nothing updates silently.

## Releasing

Releases come from CI only, through Changesets. Nobody publishes from a laptop: `prepublishOnly` refuses unless it
runs in GitHub Actions.

1. A pull request that changes the package adds a changeset: `npx changeset` (Node 22 or later), choosing patch,
   minor or major by the rule above.
2. On `main`, `.github/workflows/release.yml` opens or updates the "Release: version packages" pull request, which
   bumps `package.json` and writes the changelog.
3. Merging that pull request releases. An ungated job checks whether the version is already on npm, so a push that
   publishes nothing never asks for an approval. A build job with no credentials runs every check and packs the
   tarball; the publish job, in the `npm-publish` environment, publishes that tarball with provenance and runs no
   install; a last job tags `vX.Y.Z`, idempotently.

Every release job runs on Node 24 (Changesets 3 and trusted publishing both need Node 22 or later). The package
itself supports Node 20 and later; CI tests it on 20, 22 and 24.

Version 1.0.0 is prepared: `.changeset/initial-release.md` bumps 0.0.0 to 1.0.0 in the first version pull request.

## Publishing: what has to be set up first (Stephen)

Checked against npm's documentation on 2026-10-17:
[Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers) (last edited 2026-10-06),
[npm trust](https://docs.npmjs.com/cli/v11/commands/npm-trust) (last edited 2026-06-02) and
[Creating and viewing access tokens](https://docs.npmjs.com/creating-and-viewing-access-tokens) (last edited
2026-09-10).

What those pages establish:

- Trusted publishing (OIDC from GitHub Actions) needs npm 11.5.1 or later and Node 22.14.0 or later. The release
  workflow runs on Node 24 and checks the npm version.
- **A trusted publisher can only be attached to a package that already exists.** The website setup starts from
  "your package settings", and `npm trust` lists "Package must exist" as a prerequisite. So the FIRST publish of
  `@arano/design` cannot use trusted publishing; it uses a one-day granular token, which is then revoked.
- **Provenance is not generated for private repositories,** even for a public package. The `arano-design` GitHub
  repository must be public for the package to carry provenance.
- `repository.url` in package.json must match the GitHub repository exactly (it is set to
  `git+https://github.com/StephenD1981/arano-design.git`).
- Trusted publisher configurations created after 2026-09-03 allow `npm stage publish` by default; direct
  `npm publish` must be ticked explicitly.
- A new trusted publisher configuration must complete a publish within 2 days, or it expires.

Steps, in order:

1. **npm organisation:** `@arano` exists (created 2026-10-17, 2FA on). Keep 2FA required for the organisation.
2. **GitHub repository:** create `StephenD1981/arano-design` as a **public** repository, empty. Do not push yet.
3. **Repository settings, BEFORE the first push** (the first push to `main` runs the release workflow):
   - Environments: create `npm-publish`, with yourself as required reviewer. Leave "Prevent self-review" OFF:
     you are the only reviewer, so turning it on would block every release. Deployment branches: `main` only.
     Do NOT allow administrators to bypass the protection.
   - Actions, General: tick "Allow GitHub Actions to create and approve pull requests" (Changesets opens the
     version pull request), and require approval for workflows from fork pull requests for all outside
     contributors.
4. **Push** this repository's `main`. CI runs; the release workflow opens the "Release: version packages" pull
   request.
5. **Bootstrap token, for 1.0.0 only:** on npmjs.com, Access Tokens, Generate New Token (granular):
   - Permissions: Read and write (publish and stage); Packages and scopes: only the `@arano` scope.
   - Tick "Bypass two-factor authentication", because CI cannot answer a 2FA prompt.
   - Expiration: 1 day (the minimum).
   - Save it as the secret `NPM_TOKEN` of the `npm-publish` ENVIRONMENT, not as a repository secret.
6. **Release 1.0.0:** merge the version pull request, then approve the `npm-publish` deployment. CI publishes
   `@arano/design@1.0.0` with provenance and tags `v1.0.0`.
7. **Trusted publisher:** on npmjs.com, `@arano/design`, Settings, Trusted Publisher, GitHub Actions:
   - Organization or user `StephenD1981`, Repository `arano-design`, Workflow filename `release.yml`,
     Environment name `npm-publish`.
   - Allowed actions: tick `npm publish`.
   - It must complete a publish within 2 days to stay valid. If no release is due, let it expire and recreate it
     when one is.
8. **Remove the token, and record it:** delete the `NPM_TOKEN` environment secret and revoke the token on
   npmjs.com; then, in a follow-up pull request, delete the `NODE_AUTH_TOKEN` line from the publish step of
   `release.yml`. In the package settings choose "Require two-factor authentication and disallow tokens". Record
   the revocation (date, token name) in that pull request's description. From here on CI publishes through OIDC
   only and no long-lived credential exists anywhere.

### Air-gapped and mirrored registries

Air-gapped builds install from a mirror (Verdaccio, Artifactory, Nexus) like any other public package.

- **Verify before ingesting:** on the connected side, `npm audit signatures` against registry.npmjs.org checks the
  registry signature and the provenance attestation of `@arano/design` before it crosses the gap.
- **Re-publishing into a private registry** cannot carry npm provenance, which is bound to the public registry and
  to this repository's workflow: publish the verified tarball there with `npm publish --provenance=false`.

## Development

```bash
nvm use            # Node 24 (.nvmrc); the package supports Node 20 and later
npm ci
npm run lint
npm run typecheck
npm test           # unit tests against the sources
npm run build      # tsup, then dist/tokens.css and fonts/
npm run test:fixtures  # the built package: Tailwind 3.4 (CJS and ESM configs) and 4, exports map, tarball
```

CI runs all of it on Node 20, 22 and 24.

### Test-only advisories

`npm audit` reports advisories that never reach a consumer: they sit in development tooling, and the package has
no runtime dependencies.

- `tailwindcss-v3` (Tailwind 3.4.19, the fixture that proves the preset on Tailwind 3.4) pulls in `braces`,
  `chokidar`, `micromatch`, `fast-glob`, `postcss-nested` and `postcss-selector-parser` with advisories (denial of
  service through crafted globs or selectors). The fixture compiles only this repository's own files. The only
  "fix" npm offers is Tailwind 4, which would remove the 3.4 proof.
- `esbuild` under tsup 8.5.1: a file-read advisory for esbuild's development server on Windows. The build never
  starts that server.
