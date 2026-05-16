# ansilight

Truecolor syntax highlighting in the terminal with 256 `highlight.js` themes.

All the themes you've seen on the web are now in your terminal, looking exactly the same.

[![atom-one-dark](docs/theme-screenshots/atom-one-dark.png)](docs/theme-screenshots/atom-one-dark.png)\
_The original **highlight.js** [TypeScript sample](https://highlightjs.org/examples), rendered with **ansilight** in the terminal._


## Features

- Uses `highlight.js` for 200+ languages
- [256 truecolor themes](themes/) ported from `highlight.js` CSS themes
- Themes use the `highlight.js` style scopes: compound (`variable.constant`) and nested (`meta keyword`)
- Styling for code blocks: background, padding, and width
- Automatic color detection with fallback

## Install

```sh
npm install ansilight
```

Requires Node.js 18+. This package is ESM only.

## Quick Start

Reproduces the screenshot above using the bundled `atom-one-dark` theme.

```js
import ansilight from 'ansilight';
import theme from 'ansilight/themes/atom-one-dark';

const code =
`class MyClass {
  public static myValue: string;
  constructor(init: string) {
    this.myValue = init;
  }
}`;

const output = ansilight(code, {
  language: 'typescript',
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
