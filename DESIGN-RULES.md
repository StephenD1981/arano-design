# ARANO design rules

The product-agnostic part of the ARANO design standard. It applies to every ARANO surface: arano-ran, arano-fibre
and the website. Each product's own design skill links here and adds only what is specific to that product (its
shared components, its persona layouts, its file paths).

British English throughout. No em-dashes in user-facing copy.

Stack: functional React components with hooks, TypeScript strict (no `any` escape hatches), Tailwind utility
tokens only, single-file modules with one clear responsibility.

## 1. One home per vocabulary

- **Colour comes from `@arano/design` and nowhere else.** Components use the Tailwind tokens the preset provides
  (`brand-*`, `gray-*`, `surface-*`, `severity-*`) or the shadcn colours that read `tokens.css`. Code that needs a
  real colour string (map paint, canvas, charts) imports it from `@arano/design/tokens`. Never a raw hex in a
  component.
- **A new value goes into the package,** in a pull request to `arano-design`, never into a private palette in a
  product. Copies drift: that is how one product ended up with Ant blue beside Signal Cyan.
- **Severity has one vocabulary:** `critical`, `major`, `moderate`, `minor`, `warning`, `info`, `healthy`. Maps and
  charts use the same `SEVERITY` values the badges use. A product with another vocabulary maps onto these keys (see
  `FIBRE_SEVERITY_ALIASES`) rather than keeping its own colours.
- **Typefaces by role, never by family.** Use `font-display`, `font-sans` and `font-mono`. No component names Geist
  or IBM Plex Mono, so a change of face is a change in the package and nothing else.

## 2. Tokens, not literals

- No inline styles and no arbitrary values where a token exists. Spacing, radius and type come from the product's
  Tailwind scale; colour from the package.
- **The one inline-style exception** is a value computed at run time that no utility can express, such as the
  `Wordmark`'s type size and tracking, derived from its `size` prop. Colour is never one of them.
- Radius, shadow and ring are per product on purpose: Tailwind 4 rescaled them, so one shared value would render
  differently on Tailwind 3.4 and 4.
- Class names are kebab-case on every Tailwind major: `text-brand-on-light`, `bg-surface-border-strong`. The
  TypeScript constants they come from are camelCase (`BRAND.onLight`, `SURFACE.borderStrong`).

## 3. Contrast and colour

Every ratio below is measured to WCAG 2.1 and enforced by the package's tests.

- **Body text uses the text tier only:** `gray-50` to `gray-600` clear AA on Graphite and on ARANO Black.
  `gray-700` to `gray-950` are surfaces and borders, never text.
- **Signal Cyan takes black ink** (`BRAND.ink`), never white.
- **Never Signal Cyan on white.** It measures 1.59:1. Light contexts (email, print, PDF) use `BRAND.onLight`
  (5.12:1 on white).
- **Steel (`--border-strong`) is for borders and icons only.** It fails AA as body text on both backgrounds.
- **Interactive boundaries use Steel,** which clears the 3:1 non-text minimum (WCAG 2.1 SC 1.4.11) on ARANO Black,
  Graphite and overlay. It does not on elevated (2.87:1), so a control boundary on an elevated surface needs a
  lighter stroke.
- **On overlay and elevated surfaces, body text is `gray-500` or lighter.** `gray-600` clears AA on Graphite and
  Black only.
- **Severity colours read as text on Graphite and Black, and a severity fill takes black ink** (`BRAND.ink`), never
  white.
- **Light contexts (email, print, PDF):** every severity colour fails AA on white, and 1.0.0 has no light-context
  severity set. Pair severity with a label and an icon there, and add an on-light set to this package before
  relying on colour.
- **Colour is never the only signal.** Pair a state or severity colour with a label, an icon or a shape.
- **Graphite on ARANO Black is 1.09:1,** so card borders carry the edge. Do not remove them for a "cleaner" look.

## 4. Theme

- ARANO is dark. Products pin the dark theme (`class="dark"` on `<html>`); the website is dark only.
- `tokens.css` is one `.dark` rule. Import it AFTER any light `:root` block: both match `<html class="dark">` with
  the same specificity, so whichever comes later wins.

## 5. Components

- **Reuse before you build.** Look for an existing shared primitive first. A new component is justified only when
  nothing composes to the need, and then it goes where the next author will find it.
- **One file, one job.** Presentational components fetch nothing and hold no store. Pure logic (scoring, formatting,
  conflict rules) has no React or DOM imports.
- **The brand mark is the `Wordmark` component** from `@arano/design/react`, or the SVGs in `brand/`. Never a raster
  copy, never a redrawn A.

## 6. Accessibility floor

- **Tablists and wizards:** `role="tablist"` with a roving `tabIndex` and Arrow, Home and End keys. Steps already
  reached are focusable; steps ahead are disabled.
- **Dialogs and drawers:** focus-trapped, closable with Escape, `role="dialog"`.
- **Live regions:** async transitions announce through `aria-live`: `role="status"` (polite) for empty and loading,
  `role="alert"` (assertive) for errors.
- **Charts and maps are `role="img"`** with a text label that describes the data.
- **Keyboard-complete:** anything built on a spatial canvas also offers a keyboard path, such as an outline list.
- **Every control has an accessible name and a visible focus ring** (`focus-visible:ring-2
  focus-visible:ring-brand-500`, or the global `:focus-visible` outline). Never `aria-hidden` on a focusable element.

## 7. States

Every data-driven surface ships all four states, plus a fifth where entitlements apply. Never a bare spinner for a
panel load, and never a focusable shell with no action in it.

- **Empty:** calm, `role="status"`, saying what is empty and why. Never a bare "No data".
- **Loading:** a skeleton, not a spinner.
- **Error:** `role="alert"`, with a Retry button only when retrying can work, so no dead button is ever shown.
- **Degraded entitlement:** an upgrade prompt in place of the locked feature, failing closed while entitlements
  resolve so protected interface never flashes.

## 8. Maps

- **A continuous gradient where heat is the message;** pins only for discrete, countable objects.
- **Map colour comes from the severity vocabulary,** never a private ramp.
- **Split maps share one viewport:** one source of pan and zoom state, never two independent maps side by side.
- **Layer toggles are explicit segmented controls,** and the choice persists.

## 9. Honesty

- **Gated features degrade, they do not go dead.** Explain what is locked and why; never an unexplained disabled
  control.
- **Label projections as projections.** A modelled or simulated result is not a measured one: until the change has
  been made, its outcome is "awaiting", not a delta. Never present a projection as realised, and never attribute an
  unrelated real-world change to it.
- **State the limits inline,** next to the feature, not in a help page.
- **No affordance implies an automatic change to a live network.** A recommendation that would change a network
  carries its approval gate, visibly.

## 10. Review checklist

- [ ] No raw hex, no inline styles; colour from the package's tokens.
- [ ] One vocabulary per concern: severity, state and brand from the package; typefaces by role.
- [ ] Contrast: body text in the text tier, cyan with black ink, `BRAND.onLight` on white, colour never alone.
- [ ] `tokens.css` imported after any light block.
- [ ] Shared primitives reused; new components single-purpose.
- [ ] Accessibility floor: tablists, dialogs, live regions, labelled charts and maps, keyboard paths, focus rings.
- [ ] All four states, plus the degraded entitlement where it applies.
- [ ] Maps: gradient for heat, severity colours, one viewport, explicit layer toggles.
- [ ] Honesty: degraded not dead, projections labelled and never shown as realised, limits stated, no implied live
      change.
- [ ] No bare spinner, no focusable shell without an action; inline style only for run-time computed values.
- [ ] British English, no em-dashes.
