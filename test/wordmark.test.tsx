import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { Wordmark, type WordmarkProps } from '../src/react'
import { NEUTRAL, THEME_DARK } from '../src/tokens'
import { hslToHex } from './wcag'

/**
 * The Wordmark contract. The golden markup is what arano-ran's original component (frontend/components/marketing/
 * Wordmark.tsx at 0ccc0d56f) rendered with React 19.2.0 for each real call site (see test/fixtures/README.md).
 *
 * The moved component differs from it in exactly two attribute strings, both chosen so arano-ran renders the same:
 *  - the stroke gains a fallback, `hsl(var(--primary, <THEME_DARK.primary>))`, used only where --primary is unset;
 *  - the wordmark text uses the preset colour text-gray-100 instead of text-foreground. In the dark theme
 *    --foreground is Cloud, #E8ECEE, which is NEUTRAL[100] exactly (asserted below), and arano-ran already
 *    generates .text-gray-100 { color: #e8ecee }, so the swap adds no CSS.
 * Nothing else may differ.
 */
const GOLDEN = JSON.parse(readFileSync(join(__dirname, 'fixtures/wordmark-golden.json'), 'utf8')) as Record<
  string,
  { props: WordmarkProps; html: string }
>

const MOVED = (html: string) =>
  html
    .replace('stroke="hsl(var(--primary))"', `stroke="hsl(var(--primary, ${THEME_DARK.primary}))"`)
    .replace('font-display font-semibold text-foreground', 'font-display font-semibold text-gray-100')

describe('Wordmark', () => {
  // Type-level only: vitest does not run this at runtime; `npm run typecheck` (tsc over test/) enforces it.
  it('has exactly the props size, className, showText, decorative and label, all optional', () => {
    expectTypeOf<WordmarkProps>().toEqualTypeOf<{
      size?: number
      className?: string
      showText?: boolean
      decorative?: boolean
      label?: string
    }>()
  })

  it.each(Object.entries(GOLDEN))('renders the %s call site as arano-ran does, apart from the two substitutions', (_site, { props, html }) => {
    const moved = MOVED(html)
    expect(moved).not.toBe(html)
    expect(renderToStaticMarkup(<Wordmark {...props} />)).toBe(moved)
  })

  it('substitutes colours that resolve the same in the dark theme', () => {
    expect(hslToHex(THEME_DARK.foreground)).toBe(NEUTRAL[100])
  })

  it('covers the defaults and every arano-ran call site', () => {
    expect(Object.keys(GOLDEN).sort()).toEqual(['className', 'default', 'footer', 'header', 'login', 'sidebar'])
  })

  it('is named ARANO for assistive technology whichever way it renders', () => {
    expect(renderToStaticMarkup(<Wordmark showText={false} />)).toContain('aria-label="ARANO"')
    const withText = renderToStaticMarkup(<Wordmark />)
    expect(withText).toContain('aria-hidden="true"')
    expect(withText).toContain('>ARANO</span>')
  })

  it('takes a custom accessible name when the mark stands alone', () => {
    expect(renderToStaticMarkup(<Wordmark showText={false} label="ARANO home" />)).toContain('aria-label="ARANO home"')
  })

  it('can be wholly decorative, beside text that already names ARANO', () => {
    const html = renderToStaticMarkup(<Wordmark showText={false} decorative />)
    expect(html.startsWith('<span class="inline-flex items-center gap-3 " aria-hidden="true">')).toBe(true)
    expect(html).not.toContain('aria-label')
  })
})
