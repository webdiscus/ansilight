# Store and update markup fixtures for final ANSI output tests

## Fixture layout

Use highlight.js upstream snippets as source fixtures, but generate our own expected ANSI output.

```txt
test/
  markup/
    javascript/
      comments.txt
      comments.expect.txt
      regex.txt
      regex.expect.txt
      template-strings.txt
      template-strings.expect.txt
    sql/
      default.txt
      default.expect.txt
    xml/
      default.txt
      default.expect.txt
```

The `*.txt` files contain source code snippets.

The `*.expect.txt` files contain the final ANSI output produced by `ansilight`.

## Test options

Markup tests must use fixed options so expected output does not depend on the terminal.

```js
ansilight(source, {
  language,
  theme: DEFAULT_THEME,
  background: false,
  padding: 0,
  width: 'content',
});
```

## Update fixtures

Expected files are generated only as a manual update step.

```sh
npm run update-test-expects
```

This command should:

- find `test/markup/**/<name>.txt` files;
- ignore existing `*.expect.txt` files;
- detect the language from the parent folder name;
- run `ansilight()` with fixed test options;
- write `<name>.expect.txt` next to the source file.

> [!IMPORTANT]
> 
> Use the update command only when the output change is intentional, 
> then review the terminal preview or diff before committing the updated `*.expect.txt` files.

## Test

Normal tests must not regenerate expected files.

They only compare current output with already saved expected output.

```js
const actual = ansilight(source, fixedOptions);
const expected = fs.readFileSync(expectPath, 'utf8');

expect(actual).toBe(expected);
```

If a refactor changes or breaks output, `actual !== expected` and the test fails.
