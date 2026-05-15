# Tools

Internal development tools for generating themes and analyzing example snippets.

## Build Themes

See `tools/build-theme/README.md`.

## Analyze code examples

Collects highlight.js theme token scopes and checks which scopes are covered by the example snippets.

```sh
npm run analyze-theme-scopes
npm run analyze-snippets-coverage
npm run analyze-snippets
```

Output:

```txt
reports/theme-scopes.json
reports/theme-scopes.md
reports/snippets-coverage.json
reports/snippets-coverage.md
```

## Update Test Fixtures

Generates ANSI expected output for markup fixtures.

```sh
npm run update-test-expects
```

See `tools/UPDATE_TEST_FIXTURES.md` for the full workflow.

## Screenshot Themes

Creates local iTerm screenshots for generated theme previews and writes a markdown gallery.

```sh
node tools/screenshot-themes/screenshot-themes.js \
  --config tools/screenshot-themes/screenshot-themes.config.example.json
```

Output:

```txt
docs/theme-screenshots/*.png
docs/theme-gallery.md
```

This tool is macOS and iTerm only. See `tools/screenshot-themes/README.md`.
