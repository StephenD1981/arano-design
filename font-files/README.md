# Font files (source)

The files Google Fonts serves for Geist and IBM Plex Mono, as served on 2026-10-17, captured byte for byte from a
next/font/google build of arano-ran `main` (`frontend/.next/static/media/`). Every file was checked SHA-256-identical
to what https://arano.ai served that day. They are unmodified; only the names are the package's own. Both families
are under the SIL Open Font Licence 1.1, whose text sits beside the files (`OFL.txt`).

These replaced the fontsource 5.3.0 files in release 1.1.0 (ruling R17, 2026-10-18): fontsource's files are not the
bytes Google serves, and Linux FreeType renders them differently.

`npm run build` copies the declared faces from here into `fonts/`, which is generated and not committed.
`test/fonts.test.ts` pins every SHA-256 below: changing a file is a minor release and needs that test updated in
the same pull request.

| Package file | next/font media file | SHA-256 |
|---|---|---|
| `geist/geist-cyrillic-ext-wght-normal.woff2` | `f639721981034f88-s.woff2` | `b7a545bbb08256bd809f11cfe66d88da3e22d169ea4407737b1ef0ec1ed3d791` |
| `geist/geist-cyrillic-wght-normal.woff2` | `9766a7e9e2e0ad5a-s.woff2` | `6129fc8571c3e0cb0a4c41f5160c974a843b055009dc4ad8858bd808e18a2d86` |
| `geist/geist-vietnamese-wght-normal.woff2` | `b66cf8e69499582a-s.woff2` | `f689f638f29fff460a2d5749edb5d5c38d7bef0389f32032d871f23fc6ebb008` |
| `geist/geist-latin-ext-wght-normal.woff2` | `aa016aab0e6d1295-s.woff2` | `58a6b173d5ca1dec92166ea3c6cb1a84a4144556d10928ac14e8e6b40e4787bd` |
| `geist/geist-latin-wght-normal.woff2` | `22a5144ee8d83bca-s.p.woff2` | `9b6f5ff45b278c744b5f379a2c4ecbaf858a842b8eaf82ac8d21b699ca16c608` |
| `ibm-plex-mono/ibm-plex-mono-cyrillic-ext-400-normal.woff2` | `58f386aa6b1a2a92-s.woff2` | `c6f09ee0e0a24b7c85ecb2a601eb99332f65b1f6b37c31e0bbe73fb307625eca` |
| `ibm-plex-mono/ibm-plex-mono-cyrillic-400-normal.woff2` | `011e180705008d6f-s.woff2` | `7b59d6bf7f8b8408ac28f27d01dca9a890abeae77045d343b1d8ccb089a92e54` |
| `ibm-plex-mono/ibm-plex-mono-vietnamese-400-normal.woff2` | `7ba5fb2a8c88521c-s.woff2` | `0a8b854cc18641bd1b8222afa7ec82a75e59bc6501f777744ec87db1b6cd7a2c` |
| `ibm-plex-mono/ibm-plex-mono-latin-ext-400-normal.woff2` | `92eeb95d069020cc-s.woff2` | `f1050dc5317b43434c0aeda599d4624c774ffc162e87a8cf204b949b6a85816d` |
| `ibm-plex-mono/ibm-plex-mono-latin-400-normal.woff2` | `d3ebbfd689654d3a-s.p.woff2` | `c36f509c0a8f9f85f29cb44bc8701d8a9e0b14c499e77a884f789ead7093a7ac` |
| `ibm-plex-mono/ibm-plex-mono-cyrillic-ext-500-normal.woff2` | `ef4d5661765d0e49-s.woff2` | `311098be73eac339128f0b5a6e33d72645b6f87488541fdf467c402152d297fd` |
| `ibm-plex-mono/ibm-plex-mono-cyrillic-500-normal.woff2` | `d29838c109ef09b4-s.woff2` | `d524dc8ff6dbf7ed69772f3b2ff4affaf5a89b5762b270e36c3f21da0d4e39f5` |
| `ibm-plex-mono/ibm-plex-mono-vietnamese-500-normal.woff2` | `e40af3453d7c920a-s.woff2` | `b2529fba93fd07a50ffb8fc3d103eb04b0c298d4f6564d2833c44fde286de7e4` |
| `ibm-plex-mono/ibm-plex-mono-latin-ext-500-normal.woff2` | `99dcf268bda04fe5-s.woff2` | `77f03e26f981c582bdba3a7abed4baa2d3149211c01366bb3ab3ba7622ec4ae5` |
| `ibm-plex-mono/ibm-plex-mono-latin-500-normal.woff2` | `98e207f02528a563-s.p.woff2` | `a76f53ca6612e7b3828eec2311098675b7f9849ae4169a8bcef6302aec02a6c0` |
| `ibm-plex-mono/ibm-plex-mono-cyrillic-ext-600-normal.woff2` | `73cb51aac9c97f90-s.woff2` | `f746246b6b0b641f99d9e26e0bf4e42197bde692126857857f0195a94362d52a` |
| `ibm-plex-mono/ibm-plex-mono-cyrillic-600-normal.woff2` | `d26bbd13d6b70f89-s.woff2` | `b814a03d7e57b0626a906f76911b9361d173a1aabc5544c40f72d6a35a1e4940` |
| `ibm-plex-mono/ibm-plex-mono-vietnamese-600-normal.woff2` | `20535187d867b7b9-s.woff2` | `69744cabbccc9faf77516ce9b744361e1e6be7f8081400006035a153797d2965` |
| `ibm-plex-mono/ibm-plex-mono-latin-ext-600-normal.woff2` | `5356a6a4f2c8c8d8-s.woff2` | `1b6b18fd0fd240bc6d5850f4df621484722d4b5d3650ebdd1e3a8bbd81c75854` |
| `ibm-plex-mono/ibm-plex-mono-latin-600-normal.woff2` | `db96af6b531dc71f-s.p.woff2` | `ad4580d8cb4b5f627c2d18457656732f7f7b070f7837fbc380e08054157e6f6c` |
