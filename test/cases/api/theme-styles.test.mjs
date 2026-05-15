import { describe, expect, test } from 'vitest';

// Enable truecolor ANSI output before importing the code that loads ansis.
import '../../env/truecolor.js';
import { htmlToAnsi } from '../../../src/htmlToAnsi.js';
import { normalizeOptions } from '../../../src/options.js';
import { computeStyle } from '../../../src/style.js';

function createOptions(theme) {
  return normalizeOptions({
    background: false,
    theme,
  });
}

describe('style renderers', () => {
  test('renders color style', () => {
    const theme = {
      keyword: { color: '#ff0000' },
    };
    const received = htmlToAnsi(
      '<span class="hljs-keyword">let</span>',
      createOptions(theme)
    );
    const expected = '\u001b[38;2;255;0;0mlet\u001b[39m';

    expect(received).toBe(expected);
  });

  test('renders background style', () => {
    const theme = {
      string: { background: '#00ff00' },
    };
    const received = htmlToAnsi(
      '<span class="hljs-string">&quot;x&quot;</span>',
      createOptions(theme)
    );
    const expected = '\u001b[48;2;0;255;0m"x"\u001b[49m';

    expect(received).toBe(expected);
  });

  test('renders text styles', () => {
    const theme = {
      title: { bold: true, italic: true, underline: true },
    };
    const received = htmlToAnsi(
      '<span class="hljs-title">Name</span>',
      createOptions(theme)
    );
    const expected = '\u001b[4m\u001b[3m\u001b[1mName\u001b[22m\u001b[23m\u001b[24m';

    expect(received).toBe(expected);
  });

  test('renders combined styles', () => {
    const theme = {
      'title.function': { color: '#0000ff', bold: true },
    };
    const received = htmlToAnsi(
      '<span class="hljs-title function_">run</span>',
      createOptions(theme)
    );
    const expected = '\u001b[1m\u001b[38;2;0;0;255mrun\u001b[39m\u001b[22m';

    expect(received).toBe(expected);
  });

  test('uses custom render function', () => {
    const theme = {
      keyword: { render: (value) => `[custom:${value}]` },
    };
    const received = htmlToAnsi(
      '<span class="hljs-keyword">const</span>',
      createOptions(theme)
    );
    const expected = '[custom:const]';

    expect(received).toBe(expected);
  });
});

describe('style merge rules', () => {
  test('merges default and token styles', () => {
    const theme = {
      default: { color: '#111111', background: '#eeeeee' },
      keyword: { color: '#ff0000' },
    };
    const received = computeStyle(['keyword'], theme);
    const expected = {
      color: '#ff0000',
      background: '#eeeeee',
    };

    expect(received).toEqual(expected);
  });

  test('merges parent and nested token styles', () => {
    const theme = {
      meta: { color: '#888888', background: '#cccccc' },
      string: { color: '#0000ff' },
    };
    const received = computeStyle(['meta', 'string'], theme);
    const expected = {
      color: '#0000ff',
      background: '#cccccc',
    };

    expect(received).toEqual(expected);
  });

  test('merges parent and contextual nested token styles', () => {
    const theme = {
      meta: { color: '#888888', background: '#cccccc' },
      string: { color: '#0000ff' },
      'meta string': { color: '#00ff00', italic: true },
    };
    const received = computeStyle(['meta', 'string'], theme);
    const expected = {
      color: '#00ff00',
      background: '#cccccc',
      italic: true,
    };

    expect(received).toEqual(expected);
  });

  test('merges chained scope styles', () => {
    const theme = {
      title: { color: '#111111' },
      'title.function': { bold: true },
    };
    const received = computeStyle(['title.function'], theme);
    const expected = {
      color: '#111111',
      bold: true,
    };

    expect(received).toEqual(expected);
  });
});

describe('style override rules', () => {
  test('overrides parent background with child background', () => {
    const theme = {
      meta: { background: '#cccccc' },
      string: { background: '#00ff00' },
    };
    const received = computeStyle(['meta', 'string'], theme);
    const expected = {
      background: '#00ff00',
    };

    expect(received).toEqual(expected);
  });

  test('overrides regular token style with contextual token style', () => {
    const theme = {
      string: { color: '#0000ff' },
      'meta string': { color: '#00ff00' },
    };
    const received = computeStyle(['meta', 'string'], theme);
    const expected = {
      color: '#00ff00',
    };

    expect(received).toEqual(expected);
  });

  test('disables inherited text style with false', () => {
    const theme = {
      meta: { bold: true, color: '#888888' },
      string: { bold: false, color: '#00ff00' },
    };
    const received = computeStyle(['meta', 'string'], theme);
    const expected = {
      bold: false,
      color: '#00ff00',
    };

    expect(received).toEqual(expected);
  });
});
