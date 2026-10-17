/** WCAG 2.1 relative luminance and contrast ratio for six-digit hex colours. */
export function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** WCAG AA for body text. */
export const AA_BODY = 4.5

/** WCAG 2.1 SC 1.4.11: user-interface boundaries and graphics. */
export const AA_NON_TEXT = 3

/** HSL channels as THEME_DARK holds them (`210 22% 3.5%`) to a six-digit hex, rounded per channel. */
export function hslToHex(channels: string): string {
  const [h, s, l] = channels.replace(/%/g, '').split(/\s+/).map(Number) as [number, number, number]
  const c = (1 - Math.abs((2 * l) / 100 - 1)) * (s / 100)
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l / 100 - c / 2
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()
}
