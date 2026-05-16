# ansilight

Truecolor syntax highlighting in the terminal with 200+ highlight.js themes.

[![atom-one-dark](docs/theme-screenshots/atom-one-dark.png)](docs/theme-screenshots/atom-one-dark.png)

## Features

The key feature is support for all `highlight.js` themes, with visuals very close to the originals.

- Uses `highlight.js` for language highlighting
- Includes 256 truecolor ANSI themes converted from original `highlight.js` CSS themes
- Supports compound and nested theme selectors like `variable.constant` and `meta keyword`
- Supports output blocks with background, padding, and fixed/content width
- Falls back to 256 and 16 colors

## Install

```sh
npm install ansilight
```

Requires Node.js 18+. This package is ESM only.

## Quick Start

Minimal example using the bundled theme.

```js
import ansilight from 'ansilight';
import theme from 'ansilight/themes/atom-one-dark';

const code = 'const value = "Hello World!";';

const output = ansilight(code, {
  language: 'javascript',
  theme,
});

console.log(output);
```

## Theme gallery

The NPM package includes:

| Theme light                                                                                                                                                 | Theme dark                                                                                                                                             |
|-------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|
| **[default](themes/default.js)** (build-in)<br>[![default](docs/theme-screenshots/default.png)](docs/theme-screenshots/default.png)                         | **[dark](themes/dark.js)**<br>[![dark](docs/theme-screenshots/dark.png)](docs/theme-screenshots/dark.png)                                              |
| **[atom-one-light](themes/atom-one-light.js)**<br>[![atom-one-light](docs/theme-screenshots/atom-one-light.png)](docs/theme-screenshots/atom-one-light.png) | **[atom-one-dark](themes/atom-one-dark.js)**<br>[![atom-one-dark](docs/theme-screenshots/atom-one-dark.png)](docs/theme-screenshots/atom-one-dark.png) |
| **[github](themes/github.js)**<br>[![github](docs/theme-screenshots/github.png)](docs/theme-screenshots/github.png)                                         | **[github-dark](themes/github-dark.js)**<br>[![github-dark](docs/theme-screenshots/github-dark.png)](docs/theme-screenshots/github-dark.png)           |

See the [full theme gallery](docs/theme-gallery.md) with all 256 themes.

See [full documentation](https://github.com/webdiscus/ansilight).
