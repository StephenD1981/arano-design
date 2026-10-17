/**
 * The dark set as CSS. dist/tokens.css is this function's output, written at build time.
 */
import { THEME_DARK } from './palette'

/** `mutedForeground` is `--muted-foreground`; `shadow2xl` is the 2xl shadow. */
export function cssProperty(key: string): string {
  return `--${key.replace(/([a-z])([A-Z0-9])/g, '$1-$2').toLowerCase()}`
}

/**
 * The `.dark` rule, in THEME_DARK order. Import it AFTER any light `:root` block: both selectors match
 * `<html class="dark">` with the same specificity, so whichever comes later wins.
 */
export function tokensCss(): string {
  const lines = Object.entries(THEME_DARK).map(([key, value]) => `  ${cssProperty(key)}: ${value};`)
  return [
    '/* @arano/design tokens.css: the ARANO dark theme. Generated from THEME_DARK, do not edit. */',
    '.dark {',
    ...lines,
    '}',
    '',
  ].join('\n')
}
