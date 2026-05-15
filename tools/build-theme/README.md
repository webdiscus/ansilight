# Build Themes

Generates ANSI theme files from original highlight.js CSS themes.

Theme generation is a dev-only step. The converter reads original CSS themes
from `node_modules/highlight.js/styles/**/*.css` and writes JS themes to
`themes`.

## Usage

```sh
npm run build-theme -- --name default github vs2015
npm run build-theme -- --config tools/build-theme/theme.config.example.json
npm run build-theme -- --all
```

## Options

- `--name` - space-separated list of highlight.js theme names to convert.
- `--config` - path to a JSON config file with the same theme list.
- `--all` - convert all highlight.js themes.

## Theme Names

Theme names are highlight.js CSS filenames without the `.css` extension.

You can find theme files in:

```txt
node_modules/highlight.js/styles/
node_modules/highlight.js/styles/base16/
```

Examples:

```txt
default
github
github-dark
vs2015
atom-one-dark
base16-default-dark
```

Nested theme paths are exposed as flat names, same as on the highlight.js demo site:

```txt
node_modules/highlight.js/styles/base16/default-dark.css -> base16-default-dark
```

## Config

```json
{
  "themes": [
    "default",
    "github",
    "vs",
    "vs2015"
  ]
}
```

If a theme name is not found, the generator prints a warning and continues with
the next theme.

## Output

Converted themes will be saved into:

```txt
themes/*.js
```

CSS import report will be saved into:

```txt
reports/build-css-themes.md
```

Generated JS themes are editable. ANSI output cannot represent CSS 1:1, so
warnings are printed for CSS rules that need manual review.
