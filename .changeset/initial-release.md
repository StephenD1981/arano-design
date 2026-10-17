---
'@arano/design': major
---

First release, 1.0.0. The ARANO look and feel as one package:

- `/tokens`: the palette (neutral, brand, state, severity, sector, chart, surface) and THEME_DARK, the dark theme's custom properties exactly as arano-ran ships them; the severity contract with the arano-fibre alias map.
- `/tokens.css`: the dark set as one `.dark` rule, generated from THEME_DARK.
- `/tailwind-preset`: colour and font-role tokens for Tailwind 3.4 and Tailwind 4 (through `@config`).
- `/fonts`: Geist and IBM Plex Mono files (SIL Open Font Licence 1.1), the role map, and stylesheets for Vite, Remotion and next/font/local.
- `/brand`: the symbol and ring SVGs and the mark geometry.
- `/react`: the `Wordmark` component, markup pinned to arano-ran's.
