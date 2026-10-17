// Tailwind 3.4 consumer with an ESM config (`export default`), as a Vite project with "type": "module" writes it.
import { aranoPreset } from '@arano/design/tailwind-preset'

export default {
  presets: [aranoPreset],
  content: [new URL('../index.html', import.meta.url).pathname],
}
