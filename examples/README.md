# Preview Examples

`preview.js` displays samples from `snippets.json` with ANSI themes.

## Usage

```sh
node examples/preview.js --width=80 --theme github
node examples/preview.js --width=80 --theme github --limit=30
node examples/preview.js --width=80 --theme github vs2015 --limit=60
node examples/preview.js --width=80 --theme github --lang css
node examples/preview.js --width=80 --theme github --lang css typescript
node examples/preview.js --width=80 --theme github github-dark --lang css typescript --group theme
node examples/preview.js --width=80 --theme github github-dark --lang css typescript --group lang
node examples/preview.js --width=80 --lang typescript --limit=10 --start=0
node examples/preview.js --width=80 --lang typescript --limit=10 --start=100
```

## Options

- `--theme` - space-separated list of theme names from `/themes`.
- `--lang` - space-separated list of snippet language ids from `/examples/snippets.json`.
- `--group` - output grouping mode: `lang` or `theme`.
- `--width` - minimum rendered block width. Affects the colored background width.
- `--padding` - CSS-like block padding: `1`, `1 2`, `1 2 3`, or `1 2 3 4`. Useful for colored background.
- `--no-header` - hide the theme/language header above each sample block.
- `--no-footer` - hide the pagination summary below samples.
- `--start` - zero-based preview sample offset.
- `--limit` - maximum number of preview samples.

Default grouping is selected automatically:

- `--theme` without `--lang` uses `--group theme`.
- `--lang` without `--theme` uses `--group lang`.
- `--theme` with `--lang` uses `--group lang`.

At least one of `--theme` or `--lang` is required.

If only `--theme` is provided, all samples are displayed with the selected themes.

If only `--lang` is provided, the selected samples are displayed with all themes.

Pagination is applied after grouping and ordering. `--start` defaults to `0`.

If either `--theme` or `--lang` is omitted, `--limit` defaults to `10`.

If both `--theme` and `--lang` are explicitly provided, output is not limited unless `--limit` is set.

## Grouping

Group by language:

```sh
node examples/preview.js --theme github vs2015 --lang css typescript --group lang
```

Output order:

```txt
Lang: SCSS
  Theme: github
  Theme: vs2015

Lang: JavaScript
  Theme: github
  Theme: vs2015
```

Group by theme:

```sh
node examples/preview.js --theme github vs2015 --lang scss javascript --group theme
```

Output order:

```txt
Theme: github
  Lang: SCSS
  Lang: JavaScript

Theme: vs2015
  Lang: SCSS
  Lang: JavaScript
```

## Snippets

Snippet ids are taken from `snippets.json`.

Examples:

```sh
node examples/preview.js --lang css
node examples/preview.js --lang css typescript
node examples/preview.js --lang extra-css extra-typescript
```

Regular snippets are stored in:

```txt
examples/snippets/<language>.txt
```

Custom extra snippets are stored in:

```txt
examples/snippets/extra/<language>.txt
```
