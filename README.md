[![npm](https://img.shields.io/npm/v/ansilight?logo=npm&color=brightgreen "npm package")](https://www.npmjs.com/package/ansilight "download npm package")
<!-- [![install size](https://packagephobia.com/badge?p=ansilight)](https://packagephobia.com/result?p=ansilight)-->

# ansilight

Truecolor syntax highlighting in the terminal with 256 `highlight.js` themes.

All the themes you've seen on the web are now in your terminal, looking exactly the same.

[![atom-one-dark](docs/theme-screenshots/atom-one-dark.png)](docs/theme-screenshots/atom-one-dark.png)\
_The original **highlight.js** [TypeScript sample](https://highlightjs.org/examples), rendered with **ansilight** in the terminal._

## Features

- Uses [`highlight.js`](https://github.com/highlightjs/highlight.js) for [200+ languages](https://github.com/highlightjs/highlight.js/blob/main/SUPPORTED_LANGUAGES.md)
- [256 truecolor themes](themes/) ported from `highlight.js` CSS themes
- Themes use the `highlight.js` [style scopes](https://highlightjs.readthedocs.io/en/latest/css-classes-reference.html#stylable-scopes): compound (`variable.constant`) and nested (`meta keyword`)
- Styling for code blocks: background, padding, and width
- Automatic [color detection](#color-support) with fallback

## Install

```sh
npm install ansilight
```

Requires Node.js 18+. This package is ESM only.

> Legacy Node.js 12+ and CommonJS support can be considered if there is sufficient demand.

## Quick Start

Reproduces the screenshot above using the bundled [`atom-one-dark`](themes/atom-one-dark.js) theme.

```js
import ansilight from 'ansilight';
import theme from 'ansilight/themes/atom-one-dark';

const code =
`class MyClass {
  public static myValue: string;
  constructor(init: string) {
    this.myValue = init;
  }
}
import fs = require("fs");
module MyModule {
  export interface MyInterface extends Other {
    myProperty: any;
  }
}
declare magicNumber number;
myArray.forEach(() => { }); // fat arrow syntax`;

const output = ansilight(code, {
  lang: 'typescript', // optional, auto-detected if omitted
  theme,              // optional, uses 'default' theme if omitted
});

console.log(output);
```

<a id="color-support"></a>
## Color support

Color detection is handled by [Ansis](https://github.com/webdiscus/ansis).

- [Auto-detection](https://github.com/webdiscus/ansis#color-support) with [fallback](https://github.com/webdiscus/ansis#fallback): Truecolor → 256 → 16 → no color
- [Environment variables](https://github.com/webdiscus/ansis#cli-vars): `NO_COLOR`, `FORCE_COLOR`, `COLORTERM`
- [CLI flags](https://github.com/webdiscus/ansis#cli-flags): `--no-color`, `--color`

## API

### `ansilight(code, options)`

Highlights source code and returns a string with ANSI escape sequences.

Arguments:

- `code` - source code to highlight
- `options` - highlighting and output options

### Options

| Option       | Type                  | Default                                    | Description                                                                                                             |
|--------------|-----------------------|--------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|
| `lang`       | `string`              | auto-detect                                | language name supported by [highlight.js](https://github.com/highlightjs/highlight.js/blob/main/SUPPORTED_LANGUAGES.md) |
| `theme`      | `object`              | bundled default theme                      | ANSI theme object                                                                                                       |
| `background` | `string \| false`     | theme background                           | Background color as a HEX value, or `false` to disable background                                                       |
| `padding`    | `number \| string`    | `0`, or `"0 1"` when background is enabled | CSS-like padding shorthand                                                                                              |
| `width`      | `number \| "content"` | `"content"`                                | Visible background width, excluding padding                                                                             |


## Themes

All 256 [`highlight.js` CSS styles](https://github.com/highlightjs/highlight.js/tree/main/src/styles) are converted into ANSI themes as plain JavaScript objects.

The NPM package includes only a small set of popular themes to keep installs lightweight.

### Bundled themes

The NPM package includes:

- `default` (light, built-in)
- `dark` (dark version of `default`)
- `atom-one-light`
- `atom-one-dark`
- `github` (light)
- `github-dark`

Import the bundled theme from the package:

```js
import ansilight from 'ansilight';
import theme from 'ansilight/themes/github-dark';

console.log(ansilight(code, { theme }));
```

### Other themes

The GitHub repository contains all 256 themes in [`themes/`](./themes).

Copy any theme, e.g. [`themes/stackoverflow-light.js`](themes/stackoverflow-light.js), into your project and import locally:

```js
import ansilight from 'ansilight';
import theme from './stackoverflow-light.js';

console.log(ansilight(code, { theme }));
```

## Theme gallery

Screenshots are captured in iTerm.

Click a theme name to view its source.\
Click on image to view full size.

| Theme light                                                                                                                                                                | Theme dark                                                                                                                                                                                                                                                 |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **[default](themes/default.js)**<br>[![default](docs/theme-screenshots/default.png)](docs/theme-screenshots/default.png)                                                   | **[dark](themes/dark.js)**<br>[![dark](docs/theme-screenshots/dark.png)](docs/theme-screenshots/dark.png)                                                                                                       |
| **[atom-one-light](themes/atom-one-light.js)**<br>[![atom-one-light](docs/theme-screenshots/atom-one-light.png)](docs/theme-screenshots/atom-one-light.png)                | **[atom-one-dark](themes/atom-one-dark.js)**<br>[![atom-one-dark](docs/theme-screenshots/atom-one-dark.png)](docs/theme-screenshots/atom-one-dark.png)                                                                                                       |
| **[github](themes/github.js)**<br>[![github](docs/theme-screenshots/github.png)](docs/theme-screenshots/github.png)                                                             | **[github-dark](themes/github-dark.js)**<br>[![github-dark](docs/theme-screenshots/github-dark.png)](docs/theme-screenshots/github-dark.png) |
| **[vs](themes/vs.js)**<br>[![vs](docs/theme-screenshots/vs.png)](docs/theme-screenshots/vs.png) | **[vs2015](themes/vs2015.js)**<br>[![vs2015](docs/theme-screenshots/vs2015.png)](docs/theme-screenshots/vs2015.png)                                                                                                    |
| **[base16-ia-light](themes/base16-ia-light.js)**<br>[![base16-ia-light](docs/theme-screenshots/base16-ia-light.png)](docs/theme-screenshots/base16-ia-light.png)           | **[base16-ia-dark](themes/base16-ia-dark.js)**<br>[![base16-ia-dark](docs/theme-screenshots/base16-ia-dark.png)](docs/theme-screenshots/base16-ia-dark.png)                                                                                                    |
| **[stackoverflow-light](themes/stackoverflow-light.js)**<br>[![stackoverflow-light](docs/theme-screenshots/stackoverflow-light.png)](docs/theme-screenshots/stackoverflow-light.png)                                                             | **[stackoverflow-dark](themes/stackoverflow-dark.js)**<br>[![stackoverflow-dark](docs/theme-screenshots/stackoverflow-dark.png)](docs/theme-screenshots/stackoverflow-dark.png) |

See the [full theme gallery](docs/theme-gallery.md) with all 256 themes.


## Examples

### Option `background`

Use `background` to keep the theme background, override it with a custom color, or disable it completely.

```js
import ansilight from 'ansilight';
import theme from 'ansilight/themes/atom-one-dark';

const code =
`function greet(name) {
  return "Hello, " + name + "!";
}`;

console.log(ansilight(code, {
  lang: 'javascript',
  // use theme background
  theme,
}), '\n');

console.log(ansilight(code, {
  lang: 'javascript',
  background: '#143757', // override theme background
  theme,
}), '\n');

console.log(ansilight(code, {
  lang: 'javascript',
  background: false, // disable background
  theme,
}), '\n');
```

[![background-option](docs/readme-examples/option-background.png)](docs/readme-examples/option-background.png)


### Option `width`

Use `width` to control the visible background width.
If the highlighted code is wider, the block expands to fit the content.

```js
import ansilight from 'ansilight';
import theme from 'ansilight/themes/atom-one-dark';

const code =
`type User = {
  id: number;
  name: string;
};`;

console.log(ansilight(code, {
  lang: 'typescript',
  // use content width
  theme,
}), '\n');

console.log(ansilight(code, {
  lang: 'typescript',
  width: 40, // set minimum background width
  theme,
}), '\n');
```

[![option-width](docs/readme-examples/option-width.png)](docs/readme-examples/option-width.png)


### Option `padding`

Use `padding` to add space inside the background block. The value uses CSS-like shorthand.

```js
import ansilight from 'ansilight';
import theme from 'ansilight/themes/atom-one-dark';

const code =
`type User = {
  id: number;
  name: string;
};`;

console.log(ansilight(code, {
  lang: 'typescript',
  // default padding
  theme,
}), '\n');

console.log(ansilight(code, {
  lang: 'typescript',
  padding: 1, // same padding on all sides
  theme,
}), '\n');

console.log(ansilight(code, {
  lang: 'typescript',
  padding: '1 4', // vertical and horizontal padding
  theme,
}), '\n');
```

[![option-padding](docs/readme-examples/option-padding.png)](docs/readme-examples/option-padding.png)


## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

[ISC](https://github.com/webdiscus/ansilight/blob/master/LICENSE)
