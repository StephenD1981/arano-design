---
'@arano/design': minor
---

Font files: the 20 woff2 files under `fonts/geist/` and `fonts/ibm-plex-mono/` are now the files Google Fonts serves for Geist and IBM Plex Mono, as served on 2026-10-17 (captured byte-for-byte from a next/font/google build), unmodified; SIL OFL 1.1. They replace the fontsource 5.3.0 files, which are not Google's bytes and which Linux FreeType renders differently. File names, `fonts.css`, `next.css` and `@arano/design/fonts` are unchanged; every byte of every font file changes, so take screenshots before and after on upgrade.
