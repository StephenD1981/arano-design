# Parity fixtures

Captured from arano-ran on 2026-10-17, so the package can prove it reproduces what the product ships today. Never
edit them to make a test pass: a difference is the finding.

| File | Source |
|---|---|
| `arano-ran-globals-dark.css` | The `.dark { ... }` block of `frontend/app/globals.css` at arano-ran `0ccc0d56f`, copied verbatim with its comments. |
| `arano-ran-next-font-google.css` | The next/font/google CSS chunk from `next build` of arano-ran `0ccc0d56f` (Next 15.5.27): Geist 300 to 700 and IBM Plex Mono 400 to 600, five subsets each, plus the two fallback faces. Unmodified. |
| `wordmark-golden.json` | `renderToStaticMarkup` of arano-ran's `frontend/components/marketing/Wordmark.tsx` at `0ccc0d56f` with React 19.2.0, for the defaults, every product call site (header 26, footer 30, sidebar 30 without text, login 34) and a `className`. |
