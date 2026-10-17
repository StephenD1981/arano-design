// Tailwind 3.4 consumer (the arano-fibre path): the preset in `presets`, the product's own `content`.
const { aranoPreset } = require('@arano/design/tailwind-preset')

module.exports = {
  presets: [aranoPreset],
  content: [`${__dirname}/../index.html`],
}
