import { describe, expect, test } from 'vitest';
import {
  collectCssSelectors,
  parseCssTheme,
  selectorToScope,
} from '../../../tools/build-theme/css-theme-parser.js';
import { applyThemePatch } from '../../../tools/build-theme/build-theme.js';
import {
  addSelectorsToReport,
  groupSelector,
  generateCssThemeReport,
} from '../../../tools/build-theme/css-theme-report.js';
import { computeStyle } from '../../../src/style.js';
import { readHighlightJsThemeCss } from '../../helpers.js';

describe('css theme converter', () => {
  test('maps highlight.js selector syntax to scope paths', () => {
    const received = [
      selectorToScope('.hljs'),
      selectorToScope('pre code.hljs'),
      selectorToScope('code.hljs'),
      selectorToScope('.hljs-keyword'),
      selectorToScope('.hljs-meta .hljs-string'),
      selectorToScope('.hljs-tag .hljs-name'),
      selectorToScope('.hljs .hljs-emphasis'),
      selectorToScope('.hljs-title.class_.inherited__'),
      selectorToScope('.hljs-variable.language_'),
      selectorToScope('.hljs-char.escape_'),
      selectorToScope('.hljs a'),
      selectorToScope('.hljs::selection'),
      selectorToScope('.hljs-meta:not(:first-child)'),
    ];
    const expected = [
      'default',
      'default',
      'default',
      'keyword',
      'meta string',
      'tag name',
      'emphasis',
      'title.class.inherited',
      'variable.language',
      'char.escape',
      null,
      null,
      null,
    ];

    expect(received).toEqual(expected);
  });

  test('converts original default.css colors and text styles', () => {
    const result = parseCssTheme(readHighlightJsThemeCss('default'), { name: 'default' });
    const warningTypes = result.warnings.map((warning) => warning.type);
    const received = {
      default: result.theme.default,
      comment: result.theme.comment,
      title: result.theme.title,
      metaString: result.theme['meta string'],
      strong: result.theme.strong,
      emphasis: result.theme.emphasis,
      hasUnsupportedAlphaColorWarning: warningTypes.includes('unsupported-alpha-color'),
      hasUnsupportedBackgroundWarning: warningTypes.includes('unsupported-background'),
    };
    const expected = {
      default: { color: '#444', background: '#F3F3F3' },
      comment: { color: '#697070' },
      title: { color: '#880000', bold: true },
      metaString: { color: '#38a' },
      strong: { bold: true },
      emphasis: { italic: true },
      hasUnsupportedAlphaColorWarning: true,
      hasUnsupportedBackgroundWarning: false,
    };

    expect(received).toEqual(expected);
  });

  test('keeps default background from root selector', () => {
    const result = parseCssTheme(readHighlightJsThemeCss('base16/xcode-dusk'), { name: 'base16-xcode-dusk' });
    const received = result.theme.default;
    const expected = {
      background: '#282B35',
      color: '#939599',
    };

    expect(received).toEqual(expected);
  });

  test('does not overwrite default style with selection pseudo selectors', () => {
    const css = `
      .hljs {
        color: white;
        background: black;
      }

      .hljs::selection,
      .hljs ::selection {
        color: black;
        background: white;
      }
    `;
    const result = parseCssTheme(css, { name: 'test' });
    const received = result.theme.default;
    const expected = {
      color: '#ffffff',
      background: '#000000',
    };

    expect(received).toEqual(expected);
  });

  test('converts VS light theme from original CSS', () => {
    const result = parseCssTheme(readHighlightJsThemeCss('vs'), { name: 'vs' });
    const warningTypes = result.warnings.map((warning) => warning.type);
    const received = {
      default: result.theme.default,
      keyword: result.theme.keyword,
      string: result.theme.string,
      emphasis: result.theme.emphasis,
      strong: result.theme.strong,
      hasUnsupportedColorWarning: warningTypes.includes('unsupported-color'),
      hasUnsupportedBackgroundWarning: warningTypes.includes('unsupported-background'),
    };
    const expected = {
      default: { background: '#ffffff', color: '#000000' },
      keyword: { color: '#00f' },
      string: { color: '#a31515' },
      emphasis: { italic: true },
      strong: { bold: true },
      hasUnsupportedColorWarning: false,
      hasUnsupportedBackgroundWarning: false,
    };

    expect(received).toEqual(expected);
  });

  test('converts VS dark theme and keeps contextual overrides', () => {
    const result = parseCssTheme(readHighlightJsThemeCss('vs2015'), { name: 'vs2015' });
    const received = {
      default: result.theme.default,
      link: result.theme.link,
      comment: result.theme.comment,
      metaString: result.theme['meta string'],
      section: result.theme.section,
      addition: result.theme.addition,
      deletion: result.theme.deletion,
    };
    const expected = {
      default: { color: '#DCDCDC', background: '#1E1E1E' },
      link: { color: '#569CD6', underline: true },
      comment: { color: '#57A64A', italic: true },
      metaString: { color: '#D69D85' },
      section: { color: '#ffd700' },
      addition: { background: '#144212' },
      deletion: { background: '#600' },
    };

    expect(received).toEqual(expected);
  });

  test('computes inherited and contextual styles', () => {
    const result = parseCssTheme(readHighlightJsThemeCss('default'), { name: 'default' });
    const received = [
      computeStyle(['meta', 'string'], result.theme),
      computeStyle(['tag', 'name'], result.theme),
    ];
    const expected = [
      { background: '#F3F3F3', color: '#38a' },
      { background: '#F3F3F3', color: '#444', bold: true },
    ];

    expect(received).toEqual(expected);
  });

  test('converts compound and descendant selectors separately', () => {
    const css = `
      .hljs-title.function_ { color: red; }
      .hljs-meta .hljs-string { color: green; }
    `;
    const result = parseCssTheme(css, { name: 'test' });
    const received = {
      titleFunction: result.theme['title.function'],
      metaString: result.theme['meta string'],
    };
    const expected = {
      titleFunction: { color: '#ff0000' },
      metaString: { color: '#008000' },
    };

    expect(received).toEqual(expected);
  });

  test('converts comma-separated selectors independently', () => {
    const css = '.hljs-attr, .hljs-attribute { color: blue; }';
    const result = parseCssTheme(css, { name: 'test' });
    const received = {
      attr: result.theme.attr,
      attribute: result.theme.attribute,
    };
    const expected = {
      attr: { color: '#0000ff' },
      attribute: { color: '#0000ff' },
    };

    expect(received).toEqual(expected);
  });

  test('resolves CSS variables from root declarations', () => {
    const css = `
      :root {
        --text: #abb2bf;
        --bg: #101010;
      }

      .hljs {
        color: var(--text);
        background: var(--bg);
      }

      .hljs-keyword {
        color: var(--text);
      }
    `;
    const result = parseCssTheme(css, { name: 'test' });
    const received = {
      default: result.theme.default,
      keyword: result.theme.keyword,
      warnings: result.warnings,
    };
    const expected = {
      default: { color: '#abb2bf', background: '#101010' },
      keyword: { color: '#abb2bf' },
      warnings: [],
    };

    expect(received).toEqual(expected);
  });

  test('converts original cybertopia theme variables', () => {
    const result = parseCssTheme(readHighlightJsThemeCss('cybertopia-cherry'), { name: 'cybertopia-cherry' });
    const received = {
      default: result.theme.default,
      keyword: result.theme.keyword,
      string: result.theme.string,
      metaKeyword: result.theme['meta keyword'],
      titleFunction: result.theme['title.function'],
    };
    const expected = {
      default: { color: '#abb2bf', background: '#101010' },
      keyword: { color: '#C50263' },
      string: { color: '#02c797' },
      metaKeyword: { color: '#C50263' },
      titleFunction: { color: '#C50253' },
    };

    expect(received).toEqual(expected);
  });
});

describe('css theme converter warnings', () => {
  // TODO: add support rgb(), because Ansis has the functions rgb() and bgRgb()
  test('warns about unsupported color', () => {
    const css = '.hljs { color: rgb(1, 2, 3); }';
    const result = parseCssTheme(css, { name: 'test' });
    const received = result.warnings[0];
    const expected = {
      type: 'unsupported-color',
      selectors: ['.hljs'],
      property: 'color',
      value: 'rgb(1, 2, 3)',
      message: 'unsupported-color: .hljs { color: rgb(1, 2, 3) }',
    };

    expect(received).toEqual(expected);
  });

  // TODO: add support rgba()
  test('warns about unsupported rgba color', () => {
    const css = '.hljs { color: rgba(1, 2, 3, 0.8); }';
    const result = parseCssTheme(css, { name: 'test' });
    const received = result.warnings[0];
    const expected = {
      type: 'unsupported-color',
      selectors: ['.hljs'],
      property: 'color',
      value: 'rgba(1, 2, 3, 0.8)',
      message: 'unsupported-color: .hljs { color: rgba(1, 2, 3, 0.8) }',
    };

    expect(received).toEqual(expected);
  });

  test('warns about unsupported alpha color', () => {
    const css = '.hljs { color: #1234; }';
    const result = parseCssTheme(css, { name: 'test' });
    const received = result.warnings[0];
    const expected = {
      type: 'unsupported-alpha-color',
      selectors: ['.hljs'],
      property: 'color',
      value: '#1234',
      message: 'unsupported-alpha-color: .hljs { color: #1234 }',
    };

    expect(received).toEqual(expected);
  });

  test('warns about unsupported background', () => {
    const css = '.hljs { background: url(theme.png); }';
    const result = parseCssTheme(css, { name: 'test' });
    const received = result.warnings[0];
    const expected = {
      type: 'unsupported-background',
      selectors: ['.hljs'],
      property: 'background',
      value: 'url(theme.png)',
      message: 'unsupported-background: .hljs { background: url(theme.png) }',
    };

    expect(received).toEqual(expected);
  });

  test('warns about unsupported alpha background', () => {
    const css = '.hljs { background-color: #12345678; }';
    const result = parseCssTheme(css, { name: 'test' });
    const received = result.warnings[0];
    const expected = {
      type: 'unsupported-alpha-background',
      selectors: ['.hljs'],
      property: 'background-color',
      value: '#12345678',
      message: 'unsupported-alpha-background: .hljs { background-color: #12345678 }',
    };

    expect(received).toEqual(expected);
  });

  test('warns about unsupported font weight', () => {
    const css = '.hljs-title { font-weight: normal; }';
    const result = parseCssTheme(css, { name: 'test' });
    const received = result.warnings[0];
    const expected = {
      type: 'unsupported-font-weight',
      selectors: ['.hljs-title'],
      property: 'font-weight',
      value: 'normal',
      message: 'unsupported-font-weight: .hljs-title { font-weight: normal }',
    };

    expect(received).toEqual(expected);
  });

  test('warns about unsupported font style', () => {
    const css = '.hljs-emphasis { font-style: normal; }';
    const result = parseCssTheme(css, { name: 'test' });
    const received = result.warnings[0];
    const expected = {
      type: 'unsupported-font-style',
      selectors: ['.hljs-emphasis'],
      property: 'font-style',
      value: 'normal',
      message: 'unsupported-font-style: .hljs-emphasis { font-style: normal }',
    };

    expect(received).toEqual(expected);
  });

  test('warns about unsupported text decoration', () => {
    const css = '.hljs-link { text-decoration: line-through; }';
    const result = parseCssTheme(css, { name: 'test' });
    const received = result.warnings[0];
    const expected = {
      type: 'unsupported-text-decoration',
      selectors: ['.hljs-link'],
      property: 'text-decoration',
      value: 'line-through',
      message: 'unsupported-text-decoration: .hljs-link { text-decoration: line-through }',
    };

    expect(received).toEqual(expected);
  });

  test('warns about unsupported CSS combinators', () => {
    const css = `
      .hljs-meta > .hljs-string { color: green; }
      .hljs-meta + .hljs-string { color: green; }
      .hljs-meta ~ .hljs-string { color: green; }
    `;
    const result = parseCssTheme(css, { name: 'test' });
    const received = result.warnings.map((warning) => ({
      type: warning.type,
      selector: warning.selector,
    }));
    const expected = [
      {
        type: 'unsupported-selector',
        selector: '.hljs-meta > .hljs-string',
      },
      {
        type: 'unsupported-selector',
        selector: '.hljs-meta + .hljs-string',
      },
      {
        type: 'unsupported-selector',
        selector: '.hljs-meta ~ .hljs-string',
      },
    ];

    expect(received).toEqual(expected);
  });

  test('warns about unsupported pseudo selectors', () => {
    const css = `
      .hljs::selection { color: black; }
      .hljs ::selection { color: black; }
      .hljs-meta:not(:first-child) { color: black; }
    `;
    const result = parseCssTheme(css, { name: 'test' });
    const received = result.warnings.map((warning) => ({
      type: warning.type,
      selector: warning.selector,
    }));
    const expected = [
      {
        type: 'unsupported-selector',
        selector: '.hljs::selection',
      },
      {
        type: 'unsupported-selector',
        selector: '.hljs ::selection',
      },
      {
        type: 'unsupported-selector',
        selector: '.hljs-meta:not(:first-child)',
      },
    ];

    expect(received).toEqual(expected);
  });

  test('warns about unsupported non-token descendants', () => {
    const css = '.hljs a { color: red; }';
    const result = parseCssTheme(css, { name: 'test' });
    const received = {
      theme: result.theme,
      warnings: result.warnings.map((warning) => warning.type),
    };
    const expected = {
      theme: {},
      warnings: ['unsupported-selector'],
    };

    expect(received).toEqual(expected);
  });

  test('warns about missing CSS variable', () => {
    const css = '.hljs { color: var(--missing); }';
    const result = parseCssTheme(css, { name: 'test' });
    const received = result.warnings[0];
    const expected = {
      type: 'unsupported-css-variable',
      selectors: ['.hljs'],
      property: 'color',
      value: 'var(--missing)',
      variable: '--missing',
      fallback: null,
      reason: 'missing variable',
      message: 'unsupported-css-variable: .hljs { color: var(--missing) } (missing variable)',
    };

    expect(received).toEqual(expected);
  });

  test('warns about CSS variable fallback syntax', () => {
    const css = '.hljs { background: var(--missing, #ffffff); }';
    const result = parseCssTheme(css, { name: 'test' });
    const received = result.warnings[0];
    const expected = {
      type: 'unsupported-css-variable',
      selectors: ['.hljs'],
      property: 'background',
      value: 'var(--missing, #ffffff)',
      variable: '--missing',
      fallback: '#ffffff',
      reason: 'var fallback syntax is not supported',
      message: 'unsupported-css-variable: .hljs { background: var(--missing, #ffffff) } (var fallback syntax is not supported)',
    };

    expect(received).toEqual(expected);
  });
});

describe('css theme selector report', () => {
  test('collects selectors from CSS rules', () => {
    const css = `
      .hljs,
      .hljs-keyword { color: red; }

      .hljs-meta .hljs-string { color: green; }

      .hljs-code
      .hljs-selector-class { color: blue; }

      :root {
        --hljs-bg: #101010;
      }
    `;
    const received = collectCssSelectors(css);
    const expected = [
      '.hljs',
      '.hljs-keyword',
      '.hljs-meta .hljs-string',
      '.hljs-code .hljs-selector-class',
    ];

    expect(received).toEqual(expected);
  });

  test('classifies supported and unsupported selectors', () => {
    const received = [
      groupSelector('.hljs'),
      groupSelector('.hljs-keyword'),
      groupSelector('.hljs-title.function_'),
      groupSelector('.hljs-meta .hljs-string'),
      groupSelector(':root'),
      groupSelector('.hljs-function > .hljs-title'),
      groupSelector('.language-cpp .hljs-meta .hljs-string'),
      groupSelector('.hljs a'),
    ];
    const expected = [
      'SUPPORTED: root selectors',
      'SUPPORTED: token selectors',
      'SUPPORTED: compound selectors',
      'SUPPORTED: nested selectors',
      'UNSUPPORTED: ignored pseudo selectors',
      'UNSUPPORTED: compound selectors',
      'UNSUPPORTED: external language context selectors',
      'UNSUPPORTED: non-token selectors',
    ];

    expect(received).toEqual(expected);
  });

  test('generates markdown grouped by selector support status', () => {
    const report = {
      selectors: new Map(),
      imageBackgrounds: [],
      cssVariables: [],
    };

    addSelectorsToReport(report, [
      '.hljs',
      '.hljs',
      '.hljs-keyword',
      '.hljs-title.function_',
      '.hljs-meta .hljs-string',
      '.hljs::selection',
      '.hljs-function > .hljs-title',
      '.language-cpp .hljs-meta .hljs-string',
      '.hljs a',
    ]);
    report.imageBackgrounds.push(...[
      {
        theme: 'brown-paper',
        selector: '.hljs',
        property: 'background',
        value: '#b7a68e url(./brown-papersq.png)',
        image: 'node_modules/highlight.js/styles/brown-papersq.png',
        fallbackBackground: '#b7a68e',
      },
      {
        theme: 'texture',
        selector: '.hljs',
        property: 'background',
        value: 'url(./texture.png)',
        image: 'node_modules/highlight.js/styles/texture.png',
        fallbackBackground: null,
      },
    ]);
    report.cssVariables.push(...[
      {
        theme: 'test-theme',
        selector: '.hljs',
        property: 'color',
        value: 'var(--missing)',
        variable: '--missing',
        fallback: null,
        reason: 'missing variable',
      },
    ]);

    const received = generateCssThemeReport(report);
    const expected = `# Theme CSS Selectors

Generated during import of highlight.js CSS themes.

Supported CSS selectors are converted into ANSI theme rules.
Unsupported selectors are ignored and listed here for review.

## SUPPORTED: root selectors

- \`.hljs\` (2)

## SUPPORTED: token selectors

- \`.hljs-keyword\` (1)

## SUPPORTED: compound selectors

- \`.hljs-title.function_\` (1)

## SUPPORTED: nested selectors

- \`.hljs-meta .hljs-string\` (1)

## UNSUPPORTED: ignored pseudo selectors

- \`.hljs::selection\` (1)

## UNSUPPORTED: compound selectors

- \`.hljs-function > .hljs-title\` (1)

## UNSUPPORTED: external language context selectors

- \`.language-cpp .hljs-meta .hljs-string\` (1)

## UNSUPPORTED: non-token selectors

- \`.hljs a\` (1)

## WARNING: image backgrounds

- \`brown-paper\`: \`.hljs\` { background: \`#b7a68e url(./brown-papersq.png)\` }
  - image: \`node_modules/highlight.js/styles/brown-papersq.png\`
  - fallback background: \`#b7a68e\`

## UNSUPPORTED: image backgrounds

- \`texture\`: \`.hljs\` { background: \`url(./texture.png)\` }
  - image: \`node_modules/highlight.js/styles/texture.png\`

## UNSUPPORTED: CSS variables

- \`test-theme\`: \`.hljs\` { color: \`var(--missing)\` }
  - variable: \`--missing\`
  - reason: missing variable
`;

    expect(received).toBe(expected);
  });
});

describe('css theme image backgrounds', () => {
  test('uses fallback color from image background before url', () => {
    const css = '.hljs { color: #222; background: #b7a68e url(./brown-papersq.png); }';
    const result = parseCssTheme(css, {
      name: 'brown-paper',
      sourceDir: 'node_modules/highlight.js/styles',
    });
    const received = result.theme.default;
    const expected = {
      color: '#222',
      background: '#b7a68e',
    };

    expect(received).toEqual(expected);
  });

  test('uses fallback color from image background after url', () => {
    const css = '.hljs { color: #dccf8f; background: url(./pojoaque.jpg) repeat scroll left top #181914; }';
    const result = parseCssTheme(css, {
      name: 'pojoaque',
      sourceDir: 'node_modules/highlight.js/styles',
    });
    const received = result.theme.default;
    const expected = {
      color: '#dccf8f',
      background: '#181914',
    };

    expect(received).toEqual(expected);
  });

  test('collects image backgrounds for manual review', () => {
    const css = '.hljs { background: #b7a68e url(./brown-papersq.png); }';
    const result = parseCssTheme(css, {
      name: 'brown-paper',
      sourceDir: 'node_modules/highlight.js/styles',
    });
    const received = {
      imageBackgrounds: result.imageBackgrounds,
      warnings: result.warnings.map((warning) => warning.type),
    };
    const expected = {
      imageBackgrounds: [
        {
          theme: 'brown-paper',
          selector: '.hljs',
          property: 'background',
          value: '#b7a68e url(./brown-papersq.png)',
          image: 'node_modules/highlight.js/styles/brown-papersq.png',
          fallbackBackground: '#b7a68e',
        },
      ],
      warnings: ['unsupported-background'],
    };

    expect(received).toEqual(expected);
  });
});

describe('css theme patch', () => {
  test('merges manual theme patch declarations', () => {
    const theme = {
      default: { color: '#111111' },
    };
    const patch = {
      default: { background: '#b7a68e' },
    };
    const received = applyThemePatch(theme, patch);
    const expected = {
      default: { color: '#111111', background: '#b7a68e' },
    };

    expect(received).toEqual(expected);
  });

  test('removes declarations with null patch values', () => {
    const theme = {
      default: { color: '#111111', background: '#ffffff' },
    };
    const patch = {
      default: { background: null },
    };
    const received = applyThemePatch(theme, patch);
    const expected = {
      default: { color: '#111111' },
    };

    expect(received).toEqual(expected);
  });
});
