/**
 * The ARANO lockup: master A geometry plus the wordmark set in the site face.
 *
 * Rendered inline rather than as an image file. The previous asset was a 201 KB
 * PNG with no vector original, shipped twice per page (header and footer), and
 * it could not survive a favicon. Inline SVG scales, follows the accent token,
 * and the wordmark uses the real display face rather than a raster of one.
 *
 * Moved from arano-ran frontend/components/marketing/Wordmark.tsx. Its props and
 * markup are pinned by test/wordmark.test.tsx, because product sign-in and
 * navigation depend on them. The classes it uses must be in the consumer's
 * Tailwind sources (see the README, "Wordmark and Tailwind sources").
 *
 * The one inline style is deliberate: the wordmark's size and tracking are
 * computed from `size`, which no utility class can express (DESIGN-RULES.md, 2).
 */
import { MARK } from '../brand'
import { THEME_DARK } from '../tokens/palette'

export interface WordmarkProps {
  /** Height and width of the mark in pixels; the wordmark is set at 0.55 of it. Default 26. */
  size?: number
  /** Extra classes for the outer span. */
  className?: string
  /** Show "ARANO" beside the mark. Default true. */
  showText?: boolean
  /** Hide the whole lockup from assistive technology, for use beside text that already names ARANO. Default false. */
  decorative?: boolean
  /** The accessible name of the mark when it stands alone (`showText={false}`). Default "ARANO". */
  label?: string
}

// The mark follows the product's primary colour, and still draws in Signal Cyan where no theme is loaded.
const STROKE = `hsl(var(--primary, ${THEME_DARK.primary}))`

export function Wordmark({ size = 26, className = "", showText = true, decorative = false, label = "ARANO" }: WordmarkProps) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`} aria-hidden={decorative || undefined}>
      <svg
        width={size}
        height={size}
        viewBox={MARK.viewBox}
        role="img"
        aria-label={showText || decorative ? undefined : label}
        aria-hidden={showText || decorative || undefined}
        className="flex-none"
      >
        <g
          fill="none"
          stroke={STROKE}
          strokeWidth={String(MARK.strokeWidth)}
          strokeLinejoin={MARK.strokeLinejoin}
          strokeLinecap={MARK.strokeLinecap}
        >
          {MARK.paths.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </svg>
      {showText && (
        // text-gray-100 is Cloud, the colour --foreground resolves to in the dark theme (#E8ECEE).
        <span
          className="font-display font-semibold text-gray-100"
          style={{ fontSize: size * 0.55, letterSpacing: "0.3em" }}
        >
          ARANO
        </span>
      )}
    </span>
  )
}
