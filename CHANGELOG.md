# @arano/design

## 1.1.0

### Minor Changes

- 08b47ef: Font files: the 20 woff2 files under `fonts/geist/` and `fonts/ibm-plex-mono/` are now the files Google Fonts serves for Geist and IBM Plex Mono, as served on 2026-10-17 (captured byte-for-byte from a next/font/google build), unmodified; SIL OFL 1.1. They replace the fontsource 5.3.0 files, which are not Google's bytes and which Linux FreeType renders differently. File names, `fonts.css`, `next.css` and `@arano/design/fonts` are unchanged; every byte of every font file changes, so take screenshots before and after on upgrade.

## 1.0.0

### Major Changes

- a2ceac6: First release, 1.0.0. The ARANO look and feel as one package:
  
  - `/tokens`: the palette (neutral, brand, state, severity, sector, chart, surface) and THEME_DARK, the dark theme's custom properties exactly as arano-ran ships them; the severity contract with the arano-fibre alias map.
  - `/tokens.css`: the dark set as one `.dark` rule, generated from THEME_DARK.
  - `/tailwind-preset`: colour and font-role tokens for Tailwind 3.4 and Tailwind 4 (through `@config`).
  - `/fonts`: Geist and IBM Plex Mono files (SIL Open Font Licence 1.1), the role map, and stylesheets for Vite, Remotion and next/font/local.
  - `/brand`: the symbol and ring SVGs and the mark geometry.
  - `/react`: the `Wordmark` component, markup pinned to arano-ran's.
